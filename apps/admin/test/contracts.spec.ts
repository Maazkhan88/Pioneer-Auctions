import { MoneySchema } from "@pioneer/contracts";
import goldenFixtures from "@pioneer/contracts/fixtures/v1/golden-fixtures.json" with { type: "json" };
import { describe, expect, it } from "vitest";

describe("admin contract consumer", () => {
  it("consumes the shared v1 money fixture", () => {
    expect(MoneySchema.parse(goldenFixtures.money)).toEqual({
      amountFils: 5_200_000,
      currency: "AED",
    });
  });
});
