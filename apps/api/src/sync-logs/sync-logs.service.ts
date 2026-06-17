import { Inject, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class SyncLogsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  listRecent() {
    return this.prisma.syncLog.findMany({
      orderBy: { startedAt: "desc" },
      take: 50
    });
  }

  startBillSync(input: { limit: number }) {
    return this.prisma.syncLog.create({
      data: {
        source: "NATIONAL_ASSEMBLY_API",
        jobName: "sync:bills",
        status: "PARTIAL",
        metadata: input as Prisma.InputJsonValue
      }
    });
  }

  startMemberSync() {
    return this.prisma.syncLog.create({
      data: {
        source: "NATIONAL_ASSEMBLY_API",
        jobName: "sync:members",
        status: "PARTIAL"
      }
    });
  }

  markSuccess(input: {
    id: string;
    fetchedCount: number;
    storedCount: number;
    metadata?: Prisma.InputJsonValue;
  }) {
    return this.prisma.syncLog.update({
      where: { id: input.id },
      data: {
        status: "SUCCESS",
        finishedAt: new Date(),
        fetchedCount: input.fetchedCount,
        storedCount: input.storedCount,
        metadata: input.metadata
      }
    });
  }

  markFailure(input: {
    id: string;
    fetchedCount?: number;
    storedCount?: number;
    error: unknown;
    metadata?: Prisma.InputJsonValue;
  }) {
    return this.prisma.syncLog.update({
      where: { id: input.id },
      data: {
        status: "FAILED",
        finishedAt: new Date(),
        fetchedCount: input.fetchedCount ?? 0,
        storedCount: input.storedCount ?? 0,
        errorMessage: toErrorMessage(input.error),
        metadata: input.metadata
      }
    });
  }
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}
