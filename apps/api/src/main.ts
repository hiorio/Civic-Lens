import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const port = config.get<number>("PORT", 4000);
  const apiPrefix = config.get<string>("API_PREFIX", "v1").trim();
  const webOrigins = config
    .get<string>("WEB_ORIGIN", "http://localhost:3000,http://127.0.0.1:3000")
    .split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);

  app.enableCors({
    origin: webOrigins
  });
  if (apiPrefix.length > 0) {
    app.setGlobalPrefix(apiPrefix);
  }
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));

  await app.listen(port);
}

void bootstrap();
