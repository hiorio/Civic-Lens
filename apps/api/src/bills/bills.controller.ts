import { Controller, Get, NotFoundException, Param } from "@nestjs/common";
import { BillsService } from "./bills.service";

@Controller("bills")
export class BillsController {
  constructor(private readonly billsService: BillsService) {}

  @Get()
  listBills() {
    return this.billsService.listBills();
  }

  @Get(":id")
  async getBill(@Param("id") id: string) {
    const bill = await this.billsService.getBill(id);

    if (!bill) {
      throw new NotFoundException("Bill not found");
    }

    return bill;
  }
}
