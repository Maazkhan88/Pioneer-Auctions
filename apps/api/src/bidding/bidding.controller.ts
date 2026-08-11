import {
  Body,
  Controller,
  Headers,
  Inject,
  Param,
  Post,
  Put,
  Req,
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type { Request } from "express";

import { SessionService } from "../identity/session.service.js";
import {
  parsePlaceBidInput,
  parseSetProxyBidInput,
  type PlaceBidAck,
  type SetProxyBidAck,
} from "./bid.dto.js";
import { BiddingService } from "./bidding.service.js";

@Controller("/api/v1/lots/:lotId")
export class BiddingController {
  constructor(
    @Inject(BiddingService)
    private readonly bidding: BiddingService,
    @Inject(SessionService)
    private readonly session: SessionService,
  ) {}

  @Post("bids")
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

  @Put("proxy-bid")
  async setProxyBid(
    @Param("lotId") lotId: string,
    @Body() body: unknown,
    @Req() request: Request,
    @Headers("idempotency-key") commandId: string | undefined,
    @Headers("x-correlation-id") correlationId = "missing-correlation-id",
  ): Promise<SetProxyBidAck> {
    const account = await this.session.requireTestHeaderAccount(request);
    return this.bidding.setProxyBid({
      accountId: account.id,
      commandId: commandId ?? randomUUID(),
      correlationId,
      input: parseSetProxyBidInput(body),
      lotId,
    });
  }
}
