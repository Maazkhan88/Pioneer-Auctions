import {
  Body,
  Controller,
  Headers,
  Inject,
  Param,
  Post,
  Req,
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type { Request } from "express";

import { SessionService } from "../identity/session.service.js";
import { parsePlaceBidInput, type PlaceBidAck } from "./bid.dto.js";
import { BiddingService } from "./bidding.service.js";

@Controller("/api/v1/lots/:lotId/bids")
export class BiddingController {
  constructor(
    @Inject(BiddingService)
    private readonly bidding: BiddingService,
    @Inject(SessionService)
    private readonly session: SessionService,
  ) {}

  @Post()
  async placeBid(
    @Param("lotId") lotId: string,
    @Body() body: unknown,
    @Req() request: Request,
    @Headers("idempotency-key") commandId: string | undefined,
    @Headers("x-correlation-id") correlationId = "missing-correlation-id",
  ): Promise<PlaceBidAck> {
    const account = await this.session.requireTestHeaderAccount(request);
    return this.bidding.placeManualBid({
      accountId: account.id,
      commandId: commandId ?? randomUUID(),
      correlationId,
      input: parsePlaceBidInput(body),
      lotId,
    });
  }
}
