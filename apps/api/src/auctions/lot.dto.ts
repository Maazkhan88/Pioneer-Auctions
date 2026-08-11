import { z } from "zod";

const moneyFilsSchema = z.number().int().nonnegative();

export const createLotSchema = z
  .object({
    auctionId: z.uuid(),
    closesAt: z.iso.datetime(),
    lotNumber: z.string().trim().min(1),
    minimumIncrementFils: z.number().int().positive(),
    reservePriceFils: moneyFilsSchema.optional(),
    startingBidFils: moneyFilsSchema,
    startsAt: z.iso.datetime(),
    titleAr: z.string().trim().min(1),
    titleEn: z.string().trim().min(1),
  })
  .refine((value) => new Date(value.startsAt) < new Date(value.closesAt), {
    message: "startsAt must be before closesAt",
    path: ["closesAt"],
  });

export interface CreateLotInput {
  readonly auctionId: string;
  readonly closesAt: Date;
  readonly lotNumber: string;
  readonly minimumIncrementFils: number;
  readonly reservePriceFils: number | null;
  readonly startingBidFils: number;
  readonly startsAt: Date;
  readonly titleAr: string;
  readonly titleEn: string;
}

export interface AdminLotView {
  readonly id: string;
  readonly auctionId: string;
  readonly lotNumber: string;
  readonly titleEn: string;
  readonly titleAr: string;
  readonly lifecycle: string;
  readonly startsAt: string;
  readonly closesAt: string;
  readonly startingBidFils: number;
  readonly currentBidFils: number | null;
  readonly nextMinimumBidFils: number;
  readonly minimumIncrementFils: number;
  readonly reservePriceFils: number | null;
  readonly reserveStatus: string;
  readonly sequence: number;
}

export function parseCreateLotInput(input: unknown): CreateLotInput {
  const parsed = createLotSchema.parse(input);
  return {
    auctionId: parsed.auctionId,
    closesAt: new Date(parsed.closesAt),
    lotNumber: parsed.lotNumber,
    minimumIncrementFils: parsed.minimumIncrementFils,
    reservePriceFils: parsed.reservePriceFils ?? null,
    startingBidFils: parsed.startingBidFils,
    startsAt: new Date(parsed.startsAt),
    titleAr: parsed.titleAr,
    titleEn: parsed.titleEn,
  };
}
