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

export const updateLotSchema = z
  .object({
    closesAt: z.iso.datetime().optional(),
    lotNumber: z.string().trim().min(1).optional(),
    softCloseExtensionMs: z.number().int().positive().optional(),
    softCloseMaximumExtensions: z.number().int().positive().optional(),
    softCloseWindowMs: z.number().int().positive().optional(),
    startsAt: z.iso.datetime().optional(),
    titleAr: z.string().trim().min(1).optional(),
    titleEn: z.string().trim().min(1).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "at least one field is required",
  });

/**
 * Deliberately excludes startingBidFils/reservePriceFils/increment fields:
 * those interact with derived state (`next_minimum_bid_fils`,
 * `reserve_status`) and, once a lot has a live bid, with bid-integrity
 * invariants this pass has no product decision for (e.g. lowering the
 * starting price below an existing current bid). Money/increment stay
 * create-only until that rule is defined.
 */
export interface UpdateLotInput {
  readonly closesAt?: Date;
  readonly lotNumber?: string;
  readonly softCloseExtensionMs?: number;
  readonly softCloseMaximumExtensions?: number;
  readonly softCloseWindowMs?: number;
  readonly startsAt?: Date;
  readonly titleAr?: string;
  readonly titleEn?: string;
}

export function parseUpdateLotInput(input: unknown): UpdateLotInput {
  const parsedResult = updateLotSchema.safeParse(input);
  if (!parsedResult.success) {
    throw new BadRequestException({
      code: "VALIDATION_FAILED",
      issues: z.treeifyError(parsedResult.error),
    });
  }
  const parsed = parsedResult.data;
  return {
    ...(parsed.closesAt !== undefined
      ? { closesAt: new Date(parsed.closesAt) }
      : {}),
    ...(parsed.lotNumber !== undefined ? { lotNumber: parsed.lotNumber } : {}),
    ...(parsed.softCloseExtensionMs !== undefined
      ? { softCloseExtensionMs: parsed.softCloseExtensionMs }
      : {}),
    ...(parsed.softCloseMaximumExtensions !== undefined
      ? { softCloseMaximumExtensions: parsed.softCloseMaximumExtensions }
      : {}),
    ...(parsed.softCloseWindowMs !== undefined
      ? { softCloseWindowMs: parsed.softCloseWindowMs }
      : {}),
    ...(parsed.startsAt !== undefined
      ? { startsAt: new Date(parsed.startsAt) }
      : {}),
    ...(parsed.titleAr !== undefined ? { titleAr: parsed.titleAr } : {}),
    ...(parsed.titleEn !== undefined ? { titleEn: parsed.titleEn } : {}),
  };
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
  const result = validateCreateLotRow(input);
  if (!result.ok) {
    throw new BadRequestException({
      code: "VALIDATION_FAILED",
      issues: result.errors,
    });
  }
  return result.input;
}

export type ValidateLotRowResult =
  | { readonly input: CreateLotInput; readonly ok: true }
  | { readonly errors: unknown; readonly ok: false };

export function validateCreateLotRow(input: unknown): ValidateLotRowResult {
  const parsedResult = createLotSchema.safeParse(input);
  if (!parsedResult.success) {
    return { errors: z.treeifyError(parsedResult.error), ok: false };
  }
  const parsed = parsedResult.data;
  const increment = resolveMinimumIncrement(parsed);
  return {
    input: {
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
    },
    ok: true,
  };
}

export const bulkImportLotsSchema = z.object({
  dryRun: z.boolean(),
  rows: z.array(z.unknown()).min(1).max(200),
});

export interface BulkImportRequest {
  readonly dryRun: boolean;
  readonly rows: readonly unknown[];
}

export function parseBulkImportInput(input: unknown): BulkImportRequest {
  const parsedResult = bulkImportLotsSchema.safeParse(input);
  if (!parsedResult.success) {
    throw new BadRequestException({
      code: "VALIDATION_FAILED",
      issues: z.treeifyError(parsedResult.error),
    });
  }
  return {
    dryRun: parsedResult.data.dryRun,
    rows: parsedResult.data.rows,
  };
}

export interface BulkImportRowResult {
  readonly errors?: unknown;
  readonly index: number;
  readonly lot?: AdminLotView;
  readonly ok: boolean;
}

export interface BulkImportResult {
  readonly committed: boolean;
  readonly contractVersion: 1;
  readonly results: readonly BulkImportRowResult[];
  readonly rowCount: number;
  readonly validCount: number;
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
