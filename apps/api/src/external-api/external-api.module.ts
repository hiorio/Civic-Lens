import { HttpModule } from "@nestjs/axios";
import { Module } from "@nestjs/common";
import { ActivitiesModule } from "../activities/activities.module";
import { MembersModule } from "../members/members.module";
import { SyncLogsModule } from "../sync-logs/sync-logs.module";
import { ExternalApiController } from "./external-api.controller";
import { ExternalApiService } from "./external-api.service";
import { NationalAssemblyClient } from "./national-assembly.client";

@Module({
  imports: [HttpModule, ActivitiesModule, MembersModule, SyncLogsModule],
  controllers: [ExternalApiController],
  providers: [ExternalApiService, NationalAssemblyClient],
  exports: [ExternalApiService, NationalAssemblyClient]
})
export class ExternalApiModule {}
