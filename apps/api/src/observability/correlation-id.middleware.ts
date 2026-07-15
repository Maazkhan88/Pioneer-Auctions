import { randomUUID } from "node:crypto";

import { Injectable, type NestMiddleware } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";

import { requestContext } from "./request-context.js";

const CORRELATION_HEADER = "x-correlation-id";

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(request: Request, response: Response, next: NextFunction): void {
    const incoming = request.header(CORRELATION_HEADER)?.trim();
    const correlationId =
      incoming && incoming.length <= 128 ? incoming : randomUUID();

    response.setHeader(CORRELATION_HEADER, correlationId);
    requestContext.run({ correlationId }, next);
  }
}
