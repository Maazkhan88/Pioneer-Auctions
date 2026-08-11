import { z } from "zod";

export const createAuctionSchema = z
  .object({
    closesAt: z.iso.datetime(),
    startsAt: z.iso.datetime(),
    titleAr: z.string().trim().min(1),
    titleEn: z.string().trim().min(1),
  })
  .refine((value) => new Date(value.startsAt) < new Date(value.closesAt), {
    message: "startsAt must be before closesAt",
    path: ["closesAt"],
  });

export interface CreateAuctionInput {
  readonly closesAt: Date;
  readonly startsAt: Date;
  readonly titleAr: string;
  readonly titleEn: string;
}

export interface AdminAuctionView {
  readonly id: string;
  readonly titleEn: string;
  readonly titleAr: string;
  readonly lifecycle: string;
  readonly startsAt: string;
  readonly closesAt: string;
}

export function parseCreateAuctionInput(input: unknown): CreateAuctionInput {
  const parsed = createAuctionSchema.parse(input);
  return {
    closesAt: new Date(parsed.closesAt),
    startsAt: new Date(parsed.startsAt),
    titleAr: parsed.titleAr,
    titleEn: parsed.titleEn,
  };
}
