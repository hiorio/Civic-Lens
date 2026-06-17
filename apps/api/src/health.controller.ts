import { Controller, Get } from "@nestjs/common";
import { PrismaService } from "./prisma/prisma.service";

@Controller("health")
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  getHealth() {
    return { status: "ok", service: "civic-lens-api" };
  }

  @Get("db")
  async getDatabaseHealth() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;

      return {
        status: "ok",
        service: "civic-lens-api",
        database: "reachable"
      };
    } catch (error) {
      return {
        status: "error",
        service: "civic-lens-api",
        database: "unreachable",
        message: error instanceof Error ? error.message : "Unknown database error"
      };
    }
  }
}
