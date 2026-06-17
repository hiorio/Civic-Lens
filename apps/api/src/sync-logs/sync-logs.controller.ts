import { Controller, Get } from "@nestjs/common";
import { SyncLogsService } from "./sync-logs.service";

@Controller("sync-logs")
export class SyncLogsController {
  constructor(private readonly syncLogsService: SyncLogsService) {}

  @Get()
  listSyncLogs() {
    return this.syncLogsService.listRecent();
  }
}
