import "./observability/instrumentation.js";
import "reflect-metadata";

import { NestFactory } from "@nestjs/core";

import { AppModule } from "./app.module.js";
import { EnvironmentService } from "./config/environment.service.js";
import { StructuredLogger } from "./observability/structured-logger.service.js";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const environment = app.get(EnvironmentService).values;
  const logger = app.get(StructuredLogger);

  app.useLogger(logger);
  app.enableCors({
    credentials: true,
    origin: [environment.webBaseUrl, environment.adminBaseUrl],
  });
  app.enableShutdownHooks();

  await app.listen(environment.apiPort);
  logger.log(`API listening on port ${environment.apiPort}`);
}

await bootstrap();
