import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ActivitiesModule } from "./activities/activities.module";
import { BillsModule } from "./bills/bills.module";
import { DistrictsModule } from "./districts/districts.module";
import { ExternalApiModule } from "./external-api/external-api.module";
import { FollowsModule } from "./follows/follows.module";
import { HealthController } from "./health.controller";
import { MembersModule } from "./members/members.module";
import { PrismaModule } from "./prisma/prisma.module";
import { SchedulerModule } from "./scheduler/scheduler.module";
import { SyncLogsModule } from "./sync-logs/sync-logs.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ["../../.env", ".env"]
    }),
    PrismaModule,
    BillsModule,
    MembersModule,
    DistrictsModule,
    FollowsModule,
    ActivitiesModule,
    ExternalApiModule,
    SchedulerModule,
    SyncLogsModule
  ],
  controllers: [HealthController]
})
export class AppModule {}
