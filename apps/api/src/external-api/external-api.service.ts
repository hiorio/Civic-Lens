import { Inject, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { ActivitiesService } from "../activities/activities.service";
import { MembersService } from "../members/members.service";
import { SyncLogsService } from "../sync-logs/sync-logs.service";
import { NationalAssemblyClient } from "./national-assembly.client";

@Injectable()
export class ExternalApiService {
  constructor(
    @Inject(NationalAssemblyClient)
    private readonly nationalAssemblyClient: NationalAssemblyClient,
    @Inject(ActivitiesService)
    private readonly activitiesService: ActivitiesService,
    @Inject(MembersService)
    private readonly membersService: MembersService,
    @Inject(SyncLogsService)
    private readonly syncLogsService: SyncLogsService
  ) {}

  async collectRecentBillEventsPoc(input: {
    includeCoactors?: boolean;
    includeDetails?: boolean;
    limit?: number;
  }) {
    const limit = input.limit ?? 100;
    const includeCoactors = input.includeCoactors ?? true;
    const includeDetails = input.includeDetails ?? true;
    const syncLog = await this.syncLogsService.startBillSync({ limit });
    let coactorListFailedCount = 0;
    let coactorListFetchedCount = 0;
    let coSponsorCount = 0;
    let fetchedCount = 0;
    let detailFetchedCount = 0;
    let storedCount = 0;

    try {
      const rows = await this.nationalAssemblyClient.fetchRecentBills(limit);
      fetchedCount = rows.length;
      const events = [];

      for (const row of rows) {
        const detail = includeDetails
          ? await this.nationalAssemblyClient.fetchBillDetailRow(row.billNo)
          : null;
        const mergedRow = this.nationalAssemblyClient.mergeBillRows(row, detail);

        if (detail) {
          detailFetchedCount += 1;
        }

        const coactors =
          includeCoactors && getRawString(mergedRow.raw, "MEMBER_LIST")
            ? await this.fetchCoactorsSafely(
                getRawString(mergedRow.raw, "MEMBER_LIST") as string
              )
            : [];

        if (includeCoactors && getRawString(mergedRow.raw, "MEMBER_LIST")) {
          if (coactors) {
            coactorListFetchedCount += 1;
            coSponsorCount += Math.max(coactors.length - 1, 0);
          } else {
            coactorListFailedCount += 1;
          }
        }

        events.push(
          ...(await this.activitiesService.upsertBillActivityEvents(
            mergedRow,
            coactors ?? []
          ))
        );
      }

      storedCount = rows.length;
      const metadata = {
        endpoint: this.nationalAssemblyClient.billListEndpoint,
        detailEndpoint: includeDetails
          ? this.nationalAssemblyClient.billDetailEndpoint
          : null,
        coSponsorCount,
        coactorListFailedCount,
        coactorListFetchedCount,
        detailFetchedCount,
        eventCount: events.length,
        includeCoactors,
        includeDetails,
        responseType: "xml",
        limit
      } satisfies Prisma.InputJsonObject;
      const finishedSyncLog = await this.syncLogsService.markSuccess({
        id: syncLog.id,
        fetchedCount,
        storedCount,
        metadata
      });

      return {
        source: "NATIONAL_ASSEMBLY_API",
        fetched: fetchedCount,
        stored: storedCount,
        syncLog: finishedSyncLog,
        events
      };
    } catch (error) {
      await this.syncLogsService.markFailure({
        id: syncLog.id,
        fetchedCount,
        storedCount,
        error,
        metadata: {
          endpoint: this.nationalAssemblyClient.billListEndpoint,
          detailEndpoint: includeDetails
            ? this.nationalAssemblyClient.billDetailEndpoint
            : null,
          coSponsorCount,
          coactorListFailedCount,
          coactorListFetchedCount,
          detailFetchedCount,
          includeCoactors,
          includeDetails,
          responseType: "xml",
          limit
        }
      });

      throw error;
    }
  }

  private async fetchCoactorsSafely(memberListUrl: string) {
    try {
      return await this.nationalAssemblyClient.fetchBillCoactors(memberListUrl);
    } catch {
      return null;
    }
  }

  async collectCurrentMembersPoc() {
    const syncLog = await this.syncLogsService.startMemberSync();
    let fetchedCount = 0;
    let storedCount = 0;

    try {
      const rows = await this.nationalAssemblyClient.fetchAssemblyMembers();
      const currentRows = rows.filter((row) =>
        row.electionUnits?.includes("제22대")
      );

      fetchedCount = rows.length;

      for (const row of currentRows) {
        const member = await this.membersService.upsertOfficialNationalAssemblyMember(
          row
        );

        if (member) {
          storedCount += 1;
        }
      }

      const reconciledEventCount =
        await this.membersService.reconcileAllMemberActivityTargets();
      const metadata = {
        endpoint: this.nationalAssemblyClient.memberEndpoint,
        fetchedTotalCount: fetchedCount,
        currentAssembly: "제22대",
        currentMemberCount: currentRows.length,
        reconciledEventCount,
        responseType: "xml"
      } satisfies Prisma.InputJsonObject;
      const finishedSyncLog = await this.syncLogsService.markSuccess({
        id: syncLog.id,
        fetchedCount,
        storedCount,
        metadata
      });

      return {
        source: "NATIONAL_ASSEMBLY_API",
        fetched: fetchedCount,
        stored: storedCount,
        syncLog: finishedSyncLog
      };
    } catch (error) {
      await this.syncLogsService.markFailure({
        id: syncLog.id,
        fetchedCount,
        storedCount,
        error,
        metadata: {
          endpoint: this.nationalAssemblyClient.memberEndpoint,
          responseType: "xml"
        }
      });

      throw error;
    }
  }
}

function getRawString(
  raw: Record<string, unknown>,
  fieldName: string
): string | null {
  const value = raw[fieldName];

  return typeof value === "string" && value.trim().length > 0 ? value : null;
}
