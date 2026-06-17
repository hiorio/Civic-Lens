import { Module } from "@nestjs/common";
import { BillsModule } from "../bills/bills.module";
import { MembersModule } from "../members/members.module";
import { ActivitiesService } from "./activities.service";

@Module({
  imports: [BillsModule, MembersModule],
  providers: [ActivitiesService],
  exports: [ActivitiesService]
})
export class ActivitiesModule {}
