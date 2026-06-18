import { Inject, Injectable } from "@nestjs/common";
import { BillStatus, Prisma } from "@prisma/client";
import type { NationalAssemblyBillRow } from "@civic-lens/types";
import { createExternalId } from "@civic-lens/utils";
import { PrismaService } from "../prisma/prisma.service";

const BILL_LIST_LIMIT = 500;

@Injectable()
export class BillsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  listBills() {
    return this.prisma.bill.findMany({
      orderBy: [{ proposedAt: "desc" }, { createdAt: "desc" }],
      take: BILL_LIST_LIMIT,
      select: {
        id: true,
        externalId: true,
        billNo: true,
        title: true,
        status: true,
        proposedAt: true,
        committeeName: true,
        detailUrl: true,
        updatedAt: true,
        billMembers: {
          select: {
            role: true,
            member: {
              select: {
                id: true,
                externalId: true,
                name: true,
                partyName: true,
                districtName: true,
                photoUrl: true
              }
            }
          }
        },
        statusHistories: {
          orderBy: { changedAt: "desc" },
          take: 5,
          select: {
            id: true,
            toStatus: true,
            rawStatus: true,
            changedAt: true
          }
        }
      }
    });
  }

  getBill(id: string) {
    return this.prisma.bill.findFirst({
      where: {
        OR: [{ id }, { billNo: id }, { externalId: id }]
      },
      select: {
        id: true,
        externalId: true,
        billNo: true,
        title: true,
        status: true,
        proposedAt: true,
        committeeName: true,
        detailUrl: true,
        createdAt: true,
        updatedAt: true,
        billMembers: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            role: true,
            member: {
              select: {
                id: true,
                externalId: true,
                name: true,
                partyName: true,
                districtName: true,
                profileUrl: true,
                photoUrl: true
              }
            }
          }
        },
        statusHistories: {
          orderBy: { changedAt: "desc" },
          select: {
            id: true,
            fromStatus: true,
            toStatus: true,
            rawStatus: true,
            description: true,
            changedAt: true
          }
        },
        activityEvents: {
          orderBy: { occurredAt: "desc" },
          take: 30,
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
            member: {
              select: {
                id: true,
                name: true,
                partyName: true,
                districtName: true
              }
            }
          }
        }
      }
    });
  }

  async upsertFromNationalAssembly(row: NationalAssemblyBillRow) {
    const proposedAt = parseDate(row.proposeDate);
    const status = mapBillStatus(row.status);
    const externalId = createExternalId("NATIONAL_ASSEMBLY_API", row.billNo);
    const existing = await this.prisma.bill.findUnique({
      where: { billNo: row.billNo },
      select: { id: true, status: true }
    });

    const bill = await this.prisma.bill.upsert({
      where: { billNo: row.billNo },
      update: {
        title: row.billName,
        status,
        proposedAt,
        committeeName: row.committee,
        detailUrl: row.detailUrl,
        rawData: row.raw as Prisma.InputJsonValue
      },
      create: {
        externalId,
        billNo: row.billNo,
        title: row.billName,
        status,
        proposedAt,
        committeeName: row.committee,
        detailUrl: row.detailUrl,
        rawData: row.raw as Prisma.InputJsonValue
      }
    });

    if (!existing || existing.status !== status) {
      await this.prisma.billStatusHistory.create({
        data: {
          billId: bill.id,
          fromStatus: existing?.status,
          toStatus: status,
          source: "NATIONAL_ASSEMBLY_API",
          changedAt: proposedAt ?? new Date(),
          rawStatus: row.status,
          rawData: row.raw as Prisma.InputJsonValue
        }
      });
    }

    return bill;
  }
}

function parseDate(value: string | null | undefined): Date | null {
  if (!value) {
    return null;
  }

  const normalized = value.includes("-")
    ? value
    : value.replace(/^(\d{4})(\d{2})(\d{2})$/, "$1-$2-$3");
  const date = new Date(normalized);

  return Number.isNaN(date.getTime()) ? null : date;
}

function mapBillStatus(value: string | null | undefined): BillStatus {
  if (!value) {
    return BillStatus.UNKNOWN;
  }

  if (value.includes("접수")) {
    return BillStatus.RECEIVED;
  }

  if (value.includes("위원회") && value.includes("회부")) {
    return BillStatus.REFERRED_TO_COMMITTEE;
  }

  if (value.includes("위원회") && value.includes("심사")) {
    return BillStatus.UNDER_COMMITTEE_REVIEW;
  }

  if (value.includes("위원회") && value.includes("통과")) {
    return BillStatus.PASSED_COMMITTEE;
  }

  if (value.includes("본회의") && value.includes("통과")) {
    return BillStatus.PASSED_PLENARY;
  }

  if (value.includes("가결")) {
    return BillStatus.PASSED_PLENARY;
  }

  if (value.includes("공포")) {
    return BillStatus.PROMULGATED;
  }

  if (value.includes("폐기") || value.includes("임기만료")) {
    return BillStatus.DISCARDED;
  }

  if (value.includes("철회")) {
    return BillStatus.WITHDRAWN;
  }

  return BillStatus.UNKNOWN;
}
