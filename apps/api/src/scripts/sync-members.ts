import { NestFactory } from "@nestjs/core";
import { AppModule } from "../app.module";
import { ExternalApiService } from "../external-api/external-api.service";

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ["error", "warn", "log"]
  });

  try {
    const externalApiService = app.get(ExternalApiService);
    const result = await externalApiService.collectCurrentMembersPoc();

    console.log(JSON.stringify(result, null, 2));
  } finally {
    await app.close();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
