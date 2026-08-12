import { BadRequestException } from "@nestjs/common";
import { z } from "zod";

const moneyFilsSchema = z.number().int().nonnegative();

export const createLotSchema = z
  .object({
    auctionId: z.uuid(),
    closesAt: z.iso.datetime(),
    lotNumber: z.string().trim().min(1),
    minimumIncrementFils: z.number().int().positive().optional(),
    minimumIncrementPercentBps: z
      .number()
      .int()
      .positive()
      .max(10000)
      .optional(),
    reservePriceFils: moneyFilsSchema.optional(),
    softCloseExtensionMs: z.number().int().positive().optional(),
    softCloseMaximumExtensions: z.number().int().positive().optional(),
    softCloseWindowMs: z.number().int().positive().optional(),
    startingBidFils: moneyFilsSchema,
    startsAt: z.iso.datetime(),
    titleAr: z.string().trim().min(1),
    titleEn: z.string().trim().min(1),
  })
  .refine((value) => new Date(value.startsAt) < new Date(value.closesAt), {
    message: "startsAt must be before closesAt",
    path: ["closesAt"],
  })
  .refine(
    (value) =>
      value.minimumIncrementFils !== undefined ||
      value.minimumIncrementPercentBps !== undefined,
    {
      message: "minimumIncrementFils or minimumIncrementPercentBps is required",
      path: ["minimumIncrementFils"],
    },
  )
  .refine(
    (value) =>
      value.minimumIncrementFils === undefined ||
      value.minimumIncrementPercentBps === undefined,
    {
      message:
        "minimumIncrementFils and minimumIncrementPercentBps cannot both be supplied",
      path: ["minimumIncrementPercentBps"],
    },
  )
  .refine((value) => value.minimumIncrementFils !== 0, {
    message: "minimumIncrementFils must be positive",
    path: ["minimumIncrementFils"],
  });

export interface CreateLotInput {
  readonly auctionId: string;
  readonly closesAt: Date;
  readonly lotNumber: string;
  readonly minimumIncrementSource: "PERCENT_OF_STARTING_PRICE" | "CUSTOM";
  readonly minimumIncrementFils: number;
  readonly minimumIncrementPercentBps: number | null;
  readonly reservePriceFils: number | null;
  readonly softCloseExtensionMs: number | null;
  readonly softCloseMaximumExtensions: number | null;
  readonly softCloseWindowMs: number | null;
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
  readonly minimumIncrementPercentBps: number | null;
  readonly minimumIncrementSource: "PERCENT_OF_STARTING_PRICE" | "CUSTOM";
  readonly reservePriceFils: number | null;
  readonly reserveStatus: string;
  readonly sequence: number;
  readonly softCloseExtensionMs: number | null;
  readonly softCloseMaximumExtensions: number | null;
  readonly softCloseWindowMs: number | null;
}

export function parseCreateLotInput(input: unknown): CreateLotInput {
  const parsedResult = createLotSchema.safeParse(input);
  if (!parsedResult.success) {
    throw new BadRequestException({
      code: "VALIDATION_FAILED",
      issues: z.treeifyError(parsedResult.error),
    });
  }
  const parsed = parsedResult.data;
  const increment = resolveMinimumIncrement(parsed);
  return {
    auctionId: parsed.auctionId,
    closesAt: new Date(parsed.closesAt),
    lotNumber: parsed.lotNumber,
    minimumIncrementFils: increment.minimumIncrementFils,
    minimumIncrementPercentBps: increment.minimumIncrementPercentBps,
    minimumIncrementSource: increment.minimumIncrementSource,
    reservePriceFils: parsed.reservePriceFils ?? null,
    softCloseExtensionMs: parsed.softCloseExtensionMs ?? null,
    softCloseMaximumExtensions: parsed.softCloseMaximumExtensions ?? null,
    softCloseWindowMs: parsed.softCloseWindowMs ?? null,
    startingBidFils: parsed.startingBidFils,
    startsAt: new Date(parsed.startsAt),
    titleAr: parsed.titleAr,
    titleEn: parsed.titleEn,
  };
}

function resolveMinimumIncrement(
  parsed: z.infer<typeof createLotSchema>,
): Pick<
  CreateLotInput,
  | "minimumIncrementFils"
  | "minimumIncrementPercentBps"
  | "minimumIncrementSource"
> {
  if (parsed.minimumIncrementFils !== undefined) {
    return {
      minimumIncrementFils: parsed.minimumIncrementFils,
      minimumIncrementPercentBps: null,
      minimumIncrementSource: "CUSTOM",
    };
  }

  const percentBps = parsed.minimumIncrementPercentBps;
  if (percentBps === undefined) {
    throw new Error("validated increment policy missing");
  }

  return {
    minimumIncrementFils: Math.max(
      1,
      Math.ceil((parsed.startingBidFils * percentBps) / 10000),
    ),
    minimumIncrementPercentBps: percentBps,
    minimumIncrementSource: "PERCENT_OF_STARTING_PRICE",
  };
}
