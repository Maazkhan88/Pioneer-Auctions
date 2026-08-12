import { BadRequestException } from "@nestjs/common";
import { z } from "zod";

export const auctionControlSchema = z.object({
  note: z.string().trim().max(500).optional(),
  reason: z.string().trim().min(1).max(200),
});

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

export interface AuctionControlInput {
  readonly note: string | null;
  readonly reason: string;
}

export interface AdminAuctionView {
  readonly id: string;
  readonly titleEn: string;
  readonly titleAr: string;
  readonly lifecycle: string;
  readonly startsAt: string;
  readonly closesAt: string;
}

export interface AdminAuctionControlResult {
  readonly auctionId: string;
  readonly contractVersion: 1;
  readonly decidedAt: string;
  readonly decision: "CANCELLED" | "PAUSED" | "RESUMED";
  readonly lifecycle: string;
}

export function parseAuctionControlInput(input: unknown): AuctionControlInput {
  const parsed = parseWithBadRequest(auctionControlSchema, input);
  return {
    note: parsed.note ?? null,
    reason: parsed.reason,
  };
}

export function parseCreateAuctionInput(input: unknown): CreateAuctionInput {
  const parsed = parseWithBadRequest(createAuctionSchema, input);
  return {
    closesAt: new Date(parsed.closesAt),
    startsAt: new Date(parsed.startsAt),
    titleAr: parsed.titleAr,
    titleEn: parsed.titleEn,
  };
}

function parseWithBadRequest<TSchema extends z.ZodType>(
  schema: TSchema,
  input: unknown,
): z.infer<TSchema> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    throw new BadRequestException({
      code: "VALIDATION_FAILED",
      issues: z.treeifyError(parsed.error),
    });
  }
  return parsed.data;
}
