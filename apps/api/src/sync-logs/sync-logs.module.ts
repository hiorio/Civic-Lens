import { Module } from "@nestjs/common";
import { SyncLogsController } from "./sync-logs.controller";
import { SyncLogsService } from "./sync-logs.service";

@Module({
  controllers: [SyncLogsController],
  providers: [SyncLogsService],
  exports: [SyncLogsService]
})
export class SyncLogsModule {}
