import { Controller, Get, NotFoundException, Param } from "@nestjs/common";
import { MembersService } from "./members.service";

@Controller("members")
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  @Get()
  listMembers() {
    return this.membersService.listMembers();
  }

  @Get(":id")
  async getMember(@Param("id") id: string) {
    const member = await this.membersService.getMember(id);

    if (!member) {
      throw new NotFoundException("Member not found");
    }

    return member;
  }
}
