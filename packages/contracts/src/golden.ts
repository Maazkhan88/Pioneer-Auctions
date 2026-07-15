import { z } from "zod";

import { PlaceBidCommandSchema, BidCommandAckSchema } from "./commands.js";
import { MoneySchema } from "./core.js";
import { LotSnapshotSchema } from "./events.js";

export const GoldenFixturesSchema = z.strictObject({
  commandAck: BidCommandAckSchema,
  lotSnapshot: LotSnapshotSchema,
  money: MoneySchema,
  placeBidCommand: PlaceBidCommandSchema,
});

export type GoldenFixtures = z.infer<typeof GoldenFixturesSchema>;
