import { z } from "zod";

import {
  BidCommandAckSchema,
  KycStatusResponseSchema,
  PlaceBidCommandSchema,
  SubmitKycResponseSchema,
  SubmitKycRestRequestSchema,
} from "./commands.js";
import { MoneySchema } from "./core.js";
import { LotSnapshotSchema } from "./events.js";

export const GoldenFixturesSchema = z.strictObject({
  commandAck: BidCommandAckSchema,
  kycStatusResponse: KycStatusResponseSchema,
  lotSnapshot: LotSnapshotSchema,
  money: MoneySchema,
  placeBidCommand: PlaceBidCommandSchema,
  submitKycRequest: SubmitKycRestRequestSchema,
  submitKycResponse: SubmitKycResponseSchema,
});

export type GoldenFixtures = z.infer<typeof GoldenFixturesSchema>;
