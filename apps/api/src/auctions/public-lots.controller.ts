import { Controller, Get, Inject } from "@nestjs/common";

import { LotsRepository } from "./lots.repository.js";

interface PublicLotCard {
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

interface PublicLotsResponse {
  readonly contractVersion: 1;
  readonly items: readonly PublicLotCard[];
}

@Controller("/api/v1/lots")
export class PublicLotsController {
  constructor(
    @Inject(LotsRepository)
    private readonly lots: LotsRepository,
  ) {}

  @Get()
  async list(): Promise<PublicLotsResponse> {
    const lots = await this.lots.list();
    return {
      contractVersion: 1,
      items: lots
        .filter((lot) => lot.lifecycle !== "DRAFT")
        .map((lot) => ({
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
        })),
    };
  }
}
