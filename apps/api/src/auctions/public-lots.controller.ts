import {
  Controller,
  Get,
  Inject,
  NotFoundException,
  Param,
  Query,
} from "@nestjs/common";
import { SearchLotsQuerySchema } from "@pioneer/contracts";
import type { SearchLotsResponse } from "@pioneer/contracts";

import type { AdminLotView } from "./lot.dto.js";
import { LotsRepository } from "./lots.repository.js";

export interface PublicLotCard {
  readonly auctionId: string;
  readonly closesAt: string;
  readonly contractVersion: 1;
  readonly currentBid: {
    readonly amountFils: number;
    readonly currency: "AED";
  };
  readonly lifecycle: string;
  readonly lotId: string;
  readonly lotNumber: string;
  readonly nextMinimumBid: {
    readonly amountFils: number;
    readonly currency: "AED";
  };
  readonly reserveStatus: string;
  readonly titleAr: string;
  readonly titleEn: string;
}

export interface PublicLotsResponse {
  readonly contractVersion: 1;
  readonly items: readonly PublicLotCard[];
  readonly limit?: number;
  readonly offset?: number;
  readonly total?: number;
}

@Controller("/api/v1/lots")
export class PublicLotsController {
  constructor(
    @Inject(LotsRepository)
    private readonly lots: LotsRepository,
  ) {}

  @Get()
  async list(
    @Query() rawQuery?: Record<string, unknown>,
  ): Promise<SearchLotsResponse> {
    const parsed = SearchLotsQuerySchema.safeParse(rawQuery ?? {});
    const query = parsed.success
      ? parsed.data
      : { limit: 50, offset: 0, sort: "ending_soon" as const };

    const { items, total } = await this.lots.search(query);
    return {
      contractVersion: 1,
      items: items.map(toPublicLotCard),
      limit: query.limit,
      offset: query.offset,
      total,
    };
  }

  @Get(":lotId")
  async getById(@Param("lotId") lotId: string): Promise<PublicLotCard> {
    const lot = await this.lots.findById(lotId);
    if (lot === null || lot.lifecycle === "DRAFT") {
      throw new NotFoundException({
        code: "LOT_NOT_FOUND",
        contractVersion: 1,
        message: "Lot not found",
      });
    }
    return toPublicLotCard(lot);
  }
}

function toPublicLotCard(lot: AdminLotView): PublicLotCard {
  return {
    auctionId: lot.auctionId,
    closesAt: lot.closesAt,
    contractVersion: 1,
    currentBid: {
      amountFils: lot.currentBidFils ?? lot.startingBidFils,
      currency: "AED",
    },
    lifecycle: lot.lifecycle,
    lotId: lot.id,
    lotNumber: lot.lotNumber,
    nextMinimumBid: {
      amountFils: lot.nextMinimumBidFils,
      currency: "AED",
    },
    reserveStatus: lot.reserveStatus,
    titleAr: lot.titleAr,
    titleEn: lot.titleEn,
  };
}
