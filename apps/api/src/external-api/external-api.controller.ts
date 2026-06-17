import { Controller, Get, Query } from "@nestjs/common";
import { ExternalApiService } from "./external-api.service";

@Controller("external-api")
export class ExternalApiController {
  constructor(private readonly externalApiService: ExternalApiService) {}

  @Get("national-assembly/bills/poc")
  collectNationalAssemblyBills(
    @Query("includeCoactors") includeCoactors?: string,
    @Query("includeDetails") includeDetails?: string,
    @Query("limit") limit?: string
  ) {
    const parsedLimit = limit ? Number(limit) : undefined;

    return this.externalApiService.collectRecentBillEventsPoc({
      includeCoactors: includeCoactors !== "false",
      includeDetails: includeDetails !== "false",
      limit: Number.isFinite(parsedLimit) ? parsedLimit : undefined
    });
  }

  @Get("national-assembly/members/poc")
  collectNationalAssemblyMembers() {
    return this.externalApiService.collectCurrentMembersPoc();
  }
}
