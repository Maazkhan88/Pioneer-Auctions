import { Inject, Injectable, type LoggerService } from "@nestjs/common";
import { trace } from "@opentelemetry/api";
import pino, { type Logger } from "pino";

import { EnvironmentService } from "../config/environment.service.js";
import { requestContext } from "./request-context.js";

@Injectable()
export class StructuredLogger implements LoggerService {
  private readonly logger: Logger;

  constructor(@Inject(EnvironmentService) environment: EnvironmentService) {
    this.logger = pino({
      level: environment.values.logLevel,
      redact: {
        paths: [
          "authorization",
          "cookie",
          "req.headers.authorization",
          "req.headers.cookie",
        ],
        remove: true,
      },
    });
  }

  debug(message: unknown, ...optionalParameters: unknown[]): void {
    this.write("debug", message, optionalParameters);
  }

  error(message: unknown, ...optionalParameters: unknown[]): void {
    this.write("error", message, optionalParameters);
  }

  fatal(message: unknown, ...optionalParameters: unknown[]): void {
    this.write("fatal", message, optionalParameters);
  }

  log(message: unknown, ...optionalParameters: unknown[]): void {
    this.write("info", message, optionalParameters);
  }

  verbose(message: unknown, ...optionalParameters: unknown[]): void {
    this.write("trace", message, optionalParameters);
  }

  warn(message: unknown, ...optionalParameters: unknown[]): void {
    this.write("warn", message, optionalParameters);
  }

  private write(
    level: "debug" | "error" | "fatal" | "info" | "trace" | "warn",
    message: unknown,
    optionalParameters: unknown[],
  ): void {
    const spanContext = trace.getActiveSpan()?.spanContext();
    const context = requestContext.getStore();
    const attributes = {
      correlationId: context?.correlationId,
      parameters:
        optionalParameters.length > 0 ? optionalParameters : undefined,
      spanId: spanContext?.spanId,
      traceId: spanContext?.traceId,
    };

    this.logger[level](attributes, normalizeMessage(message));
  }
}

function normalizeMessage(message: unknown): string {
  return typeof message === "string" ? message : JSON.stringify(message);
}
