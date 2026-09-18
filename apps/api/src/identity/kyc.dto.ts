import { BadRequestException } from "@nestjs/common";
import { EmiratesIdNumberSchema } from "@pioneer/contracts";
import { z } from "zod";

export const IsoCalendarDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD format")
  .refine((dateStr) => {
    const parsed = new Date(dateStr);
    return !isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === dateStr;
  }, "Invalid calendar date");

export const SubmitKycPayloadSchema = z.object({
  cardBackRef: z.string().trim().min(1, "cardBackRef is required").max(256),
  cardFrontRef: z.string().trim().min(1, "cardFrontRef is required").max(256),
  dateOfBirth: IsoCalendarDateSchema.refine((dob) => {
    return new Date(dob) < new Date();
  }, "Date of birth must be in the past"),
  emiratesIdNumber: EmiratesIdNumberSchema,
  expiryDate: IsoCalendarDateSchema.refine((exp) => {
    const today = new Date().toISOString().slice(0, 10);
    return exp > today;
  }, "Document expiry date must be in the future"),
  fullNameAr: z.string().trim().max(128).optional(),
  fullNameEn: z.string().trim().min(2, "fullNameEn must be at least 2 characters").max(128),
  nationality: z.string().trim().min(2, "nationality must be at least 2 characters").max(64),
  selfieRef: z.string().trim().max(256).optional(),
});

export type SubmitKycPayload = z.infer<typeof SubmitKycPayloadSchema>;

export function parseSubmitKycPayload(input: unknown): SubmitKycPayload {
  const result = SubmitKycPayloadSchema.safeParse(input);
  if (!result.success) {
    throw new BadRequestException({
      code: "VALIDATION_FAILED",
      fieldErrors: result.error.issues.map((issue) => ({
        code: issue.code,
        field: issue.path.join("."),
        message: issue.message,
      })),
      message: "KYC verification payload validation failed",
    });
  }
  return result.data;
}
