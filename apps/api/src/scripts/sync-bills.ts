import { NestFactory } from "@nestjs/core";
import { AppModule } from "../app.module";
import { ExternalApiService } from "../external-api/external-api.service";

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ["error", "warn", "log"]
  });

  try {
    const externalApiService = app.get(ExternalApiService);
    const result = await externalApiService.collectRecentBillEventsPoc({
      includeCoactors: getIncludeCoactors(),
      includeDetails: getIncludeDetails(),
      limit: getLimit()
    });

    console.log(
      JSON.stringify(
        {
          source: result.source,
          fetched: result.fetched,
          stored: result.stored,
          syncLog: result.syncLog
        },
        null,
        2
      )
    );
  } finally {
    await app.close();
  }
}

function getLimit(): number {
  const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
  const rawLimit = limitArg?.split("=")[1];
  const parsedLimit = rawLimit ? Number(rawLimit) : 100;

  if (!Number.isFinite(parsedLimit) || parsedLimit < 1) {
    return 100;
  }

  return Math.min(Math.floor(parsedLimit), 100);
}

function getIncludeDetails(): boolean {
  return !process.argv.includes("--skip-details");
}

function getIncludeCoactors(): boolean {
  return !process.argv.includes("--skip-coactors");
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
