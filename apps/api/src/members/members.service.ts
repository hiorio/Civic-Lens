import { Inject, Injectable } from "@nestjs/common";
import { ActivityEventType, Member, Prisma } from "@prisma/client";
import type { NationalAssemblyMemberRow } from "@civic-lens/types";
import {
  createActivityEventDedupeKey,
  createExternalId,
  normalizeAssemblyMemberName
} from "@civic-lens/utils";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class MembersService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  listMembers() {
    return this.prisma.member.findMany({
      orderBy: [{ name: "asc" }],
      take: 500,
      select: {
        id: true,
        externalId: true,
        name: true,
        partyName: true,
        districtName: true,
        profileUrl: true,
        photoUrl: true,
        updatedAt: true,
        billMembers: {
          take: 5,
          select: {
            role: true,
            bill: {
              select: {
                id: true,
                billNo: true,
                detailUrl: true,
                title: true,
                proposedAt: true,
                status: true
              }
            }
          },
          orderBy: {
            createdAt: "desc"
          }
        }
      }
    });
  }

  getMember(id: string) {
    return this.prisma.member.findFirst({
      where: {
        OR: [{ id }, { externalId: id }, { name: id }]
      },
      select: {
        id: true,
        externalId: true,
        name: true,
        partyName: true,
        districtName: true,
        profileUrl: true,
        photoUrl: true,
        createdAt: true,
        updatedAt: true,
        billMembers: {
          select: {
            id: true,
            role: true,
            createdAt: true,
            bill: {
              select: {
                id: true,
                externalId: true,
                billNo: true,
                title: true,
                status: true,
                proposedAt: true,
                committeeName: true,
                detailUrl: true
              }
            }
          },
          orderBy: {
            createdAt: "desc"
          }
        },
        activityEvents: {
          orderBy: {
            occurredAt: "desc"
          },
          take: 50,
          select: {
            id: true,
            type: true,
            title: true,
            summary: true,
            url: true,
            targetKind: true,
            targetId: true,
            occurredAt: true,
            collectedAt: true,
            bill: {
              select: {
                id: true,
                billNo: true,
                title: true,
                status: true
              }
            }
          }
        }
      }
    });
  }

  async upsertNationalAssemblyMember(input: {
    name: string;
    partyName?: string | null;
  }) {
    const normalizedName = normalizeAssemblyMemberName(input.name);

    if (!normalizedName) {
      return null;
    }

    const officialMember = await this.prisma.member.findFirst({
      where: {
        name: normalizedName,
        externalId: { startsWith: "NATIONAL_ASSEMBLY_API:NAAS:" }
      }
    });

    if (officialMember) {
      return this.prisma.member.update({
        where: { id: officialMember.id },
        data: {
          partyName: input.partyName ?? officialMember.partyName
        }
      });
    }

    const externalId = createExternalId(
      "NATIONAL_ASSEMBLY_API",
      `MEMBER:${normalizedName}`
    );

    return this.prisma.member.upsert({
      where: { externalId },
      update: {
        name: normalizedName,
        partyName: input.partyName
      },
      create: {
        externalId,
        name: normalizedName,
        partyName: input.partyName
      }
    });
  }

  async upsertNationalAssemblyMemberByName(name: string) {
    return this.upsertNationalAssemblyMember({ name });
  }

  async upsertOfficialNationalAssemblyMember(row: NationalAssemblyMemberRow) {
    const normalizedName = normalizeAssemblyMemberName(row.name);

    if (!row.memberCode || !normalizedName) {
      return null;
    }

    const officialExternalId = createExternalId(
      "NATIONAL_ASSEMBLY_API",
      `NAAS:${row.memberCode}`
    );
    const existingOfficial = await this.prisma.member.findUnique({
      where: { externalId: officialExternalId }
    });
    const member = existingOfficial
      ? await this.updateOfficialMember(existingOfficial, row, officialExternalId)
      : await this.promoteOrCreateOfficialMember(row, officialExternalId);

    await this.reconcileMemberActivityTargets(member);

    return member;
  }

  async reconcileAllMemberActivityTargets() {
    const events = await this.prisma.activityEvent.findMany({
      where: {
        targetKind: "MEMBER",
        memberId: { not: null },
        billId: { not: null }
      },
      include: {
        bill: true,
        member: true
      }
    });
    let updatedCount = 0;

    for (const event of events) {
      if (!event.bill || !event.member) {
        continue;
      }

      const dedupeKey = createMemberActivityDedupeKey({
        type: event.type,
        member: event.member,
        billNo: event.bill.billNo,
        occurredAt: event.occurredAt
      });

      if (event.targetId === event.member.externalId && event.dedupeKey === dedupeKey) {
        continue;
      }

      await this.prisma.activityEvent.update({
        where: { id: event.id },
        data: {
          targetId: event.member.externalId,
          dedupeKey
        }
      });
      updatedCount += 1;
    }

    return updatedCount;
  }

  private updateOfficialMember(
    member: Member,
    row: NationalAssemblyMemberRow,
    officialExternalId: string
  ) {
    return this.prisma.member.update({
      where: { id: member.id },
      data: this.toOfficialMemberUpdate(row, officialExternalId)
    });
  }

  private async promoteOrCreateOfficialMember(
    row: NationalAssemblyMemberRow,
    officialExternalId: string
  ) {
    const normalizedName = normalizeAssemblyMemberName(row.name);
    const nameBasedExternalId = createExternalId(
      "NATIONAL_ASSEMBLY_API",
      `MEMBER:${normalizedName}`
    );
    const existingNameBased = await this.prisma.member.findUnique({
      where: { externalId: nameBasedExternalId }
    });

    if (existingNameBased) {
      return this.prisma.member.update({
        where: { id: existingNameBased.id },
        data: this.toOfficialMemberUpdate(row, officialExternalId)
      });
    }

    return this.prisma.member.create({
      data: {
        ...this.toOfficialMemberUpdate(row, officialExternalId),
        name: normalizedName
      }
    });
  }

  private toOfficialMemberUpdate(
    row: NationalAssemblyMemberRow,
    officialExternalId: string
  ) {
    return {
      externalId: officialExternalId,
      name: normalizeAssemblyMemberName(row.name),
      partyName: latestSlashSeparatedValue(row.partyName),
      districtName: latestSlashSeparatedValue(row.districtName),
      profileUrl: row.profileUrl,
      photoUrl: row.photoUrl,
      rawData: row.raw as Prisma.InputJsonValue
    };
  }

  private async reconcileMemberActivityTargets(member: Member) {
    const events = await this.prisma.activityEvent.findMany({
      where: {
        targetKind: "MEMBER",
        memberId: member.id,
        billId: { not: null }
      },
      include: {
        bill: true,
        member: true
      }
    });

    for (const event of events) {
      if (!event.bill || !event.member) {
        continue;
      }

      await this.prisma.activityEvent.update({
        where: { id: event.id },
        data: {
          targetId: member.externalId,
          dedupeKey: createMemberActivityDedupeKey({
            type: event.type,
            member,
            billNo: event.bill.billNo,
            occurredAt: event.occurredAt
          })
        }
      });
    }
  }
}

function latestSlashSeparatedValue(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const parts = value
    .split("/")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);

  return parts.at(-1) ?? null;
}

function createMemberActivityDedupeKey(input: {
  type: ActivityEventType;
  member: Member;
  billNo: string;
  occurredAt: Date;
}): string {
  return createActivityEventDedupeKey({
    source: "NATIONAL_ASSEMBLY_API",
    type: input.type,
    targetKind: "MEMBER",
    targetId: input.member.externalId,
    subjectId: input.billNo,
    occurredAt: input.occurredAt
  });
}
