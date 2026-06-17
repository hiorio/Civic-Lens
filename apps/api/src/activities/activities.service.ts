import { Inject, Injectable } from "@nestjs/common";
import { ActivityEvent, Member, Prisma } from "@prisma/client";
import type {
  NationalAssemblyBillRow,
  NationalAssemblyCoactorRow
} from "@civic-lens/types";
import {
  createActivityEventDedupeKey,
  extractPrimarySponsorName,
  formatActivityTitle,
  normalizeAssemblyMemberName
} from "@civic-lens/utils";
import { BillsService } from "../bills/bills.service";
import { MembersService } from "../members/members.service";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class ActivitiesService {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
    @Inject(BillsService)
    private readonly billsService: BillsService,
    @Inject(MembersService)
    private readonly membersService: MembersService
  ) {}

  async upsertBillRegisteredEvent(row: NationalAssemblyBillRow) {
    const [event] = await this.upsertBillActivityEvents(row);

    return event;
  }

  async upsertBillActivityEvents(
    row: NationalAssemblyBillRow,
    coactors: NationalAssemblyCoactorRow[] = []
  ) {
    const bill = await this.billsService.upsertFromNationalAssembly(row);
    const occurredAt = bill.proposedAt ?? new Date();
    const events: ActivityEvent[] = [];

    events.push(
      await this.prisma.activityEvent.upsert({
        where: {
          dedupeKey: createActivityEventDedupeKey({
            source: "NATIONAL_ASSEMBLY_API",
            type: "BILL_REGISTERED",
            targetKind: "BILL",
            targetId: bill.billNo,
            occurredAt
          })
        },
        update: {
          title: formatActivityTitle({
            type: "BILL_REGISTERED",
            title: bill.title
          }),
          summary: row.proposer ? `제안자: ${row.proposer}` : null,
          url: row.detailUrl,
          rawData: row.raw as Prisma.InputJsonValue,
          billId: bill.id
        },
        create: {
          source: "NATIONAL_ASSEMBLY_API",
          type: "BILL_REGISTERED",
          occurredAt,
          title: formatActivityTitle({
            type: "BILL_REGISTERED",
            title: bill.title
          }),
          summary: row.proposer ? `제안자: ${row.proposer}` : null,
          url: row.detailUrl,
          targetKind: "BILL",
          targetId: bill.billNo,
          dedupeKey: createActivityEventDedupeKey({
            source: "NATIONAL_ASSEMBLY_API",
            type: "BILL_REGISTERED",
            targetKind: "BILL",
            targetId: bill.billNo,
            occurredAt
          }),
          rawData: row.raw as Prisma.InputJsonValue,
          billId: bill.id
        }
      })
    );

    const primarySponsorName = extractPrimarySponsorName({
      primaryName: getRawString(row.raw, "RST_PROPOSER"),
      proposerText:
        getRawString(row.raw, "PROPOSER") ?? getRawString(row.raw, "PPSR_NM")
    });
    const primaryMember = primarySponsorName
      ? await this.membersService.upsertNationalAssemblyMemberByName(
          primarySponsorName
        )
      : null;

    if (primaryMember) {
      events.push(
        await this.upsertSponsorActivity({
          billId: bill.id,
          billNo: bill.billNo,
          billTitle: bill.title,
          member: primaryMember,
          occurredAt,
          role: "PRIMARY_SPONSOR",
          rawData: row.raw as Prisma.InputJsonValue,
          url: row.detailUrl
        })
      );
    }

    const primarySponsorNormalizedName = primarySponsorName
      ? normalizeAssemblyMemberName(primarySponsorName)
      : null;

    for (const coactor of uniqueCoactors(coactors)) {
      const coactorName = normalizeAssemblyMemberName(coactor.name);

      if (!coactorName || coactorName === primarySponsorNormalizedName) {
        continue;
      }

      const member = await this.membersService.upsertNationalAssemblyMember({
        name: coactor.name,
        partyName: coactor.partyName
      });

      if (!member) {
        continue;
      }

      events.push(
        await this.upsertSponsorActivity({
          billId: bill.id,
          billNo: bill.billNo,
          billTitle: bill.title,
          member,
          occurredAt,
          role: "CO_SPONSOR",
          rawData: {
            bill: row.raw,
            coactor: coactor.raw
          } as Prisma.InputJsonValue,
          url: row.detailUrl
        })
      );
    }

    return events;
  }

  private async upsertSponsorActivity(input: {
    billId: string;
    billNo: string;
    billTitle: string;
    member: Member;
    occurredAt: Date;
    role: "PRIMARY_SPONSOR" | "CO_SPONSOR";
    rawData: Prisma.InputJsonValue;
    url?: string | null;
  }) {
    await this.prisma.billMember.upsert({
      where: {
        billId_memberId_role: {
          billId: input.billId,
          memberId: input.member.id,
          role: input.role
        }
      },
      update: {},
      create: {
        billId: input.billId,
        memberId: input.member.id,
        role: input.role
      }
    });

    const type =
      input.role === "PRIMARY_SPONSOR"
        ? "BILL_PRIMARY_SPONSORED"
        : "BILL_CO_SPONSORED";
    const dedupeKey = createActivityEventDedupeKey({
      source: "NATIONAL_ASSEMBLY_API",
      type,
      targetKind: "MEMBER",
      targetId: input.member.externalId,
      subjectId: input.billNo,
      occurredAt: input.occurredAt
    });

    return this.prisma.activityEvent.upsert({
      where: { dedupeKey },
      update: {
        title: formatActivityTitle({
          type,
          title: input.billTitle
        }),
        summary:
          input.role === "PRIMARY_SPONSOR"
            ? `${input.member.name} 의원 대표발의`
            : `${input.member.name} 의원 공동발의`,
        url: input.url,
        rawData: input.rawData,
        billId: input.billId,
        memberId: input.member.id
      },
      create: {
        source: "NATIONAL_ASSEMBLY_API",
        type,
        occurredAt: input.occurredAt,
        title: formatActivityTitle({
          type,
          title: input.billTitle
        }),
        summary:
          input.role === "PRIMARY_SPONSOR"
            ? `${input.member.name} 의원 대표발의`
            : `${input.member.name} 의원 공동발의`,
        url: input.url,
        targetKind: "MEMBER",
        targetId: input.member.externalId,
        dedupeKey,
        rawData: input.rawData,
        billId: input.billId,
        memberId: input.member.id
      }
    });
  }
}

function getRawString(
  raw: Record<string, unknown>,
  fieldName: string
): string | null {
  const value = raw[fieldName];

  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function uniqueCoactors(
  coactors: NationalAssemblyCoactorRow[]
): NationalAssemblyCoactorRow[] {
  const seenNames = new Set<string>();
  const uniqueRows: NationalAssemblyCoactorRow[] = [];

  for (const coactor of coactors) {
    const name = normalizeAssemblyMemberName(coactor.name);

    if (!name || seenNames.has(name)) {
      continue;
    }

    seenNames.add(name);
    uniqueRows.push(coactor);
  }

  return uniqueRows;
}
