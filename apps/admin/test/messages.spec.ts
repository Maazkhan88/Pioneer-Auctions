import { describe, expect, it } from "vitest";

import { directionFor, messagesFor } from "../i18n/messages";

describe("localized admin shell", () => {
  it("uses first-class RTL direction for Arabic", () => {
    expect(directionFor("ar")).toBe("rtl");
    expect(messagesFor("ar").heading).not.toBe("");
    expect(messagesFor("ar").approvalQueue).toHaveLength(3);
  });

  it("uses LTR direction for English", () => {
    expect(directionFor("en")).toBe("ltr");
    expect(messagesFor("en").heading).not.toBe("");
    expect(messagesFor("en").lotsActions.map((action) => action.label)).toEqual(
      ["Create lot", "Bidding rules", "Bulk import"],
    );
  });

  it("keeps high-risk admin actions explicit", () => {
    const messages = messagesFor("en");

    expect(messages.actionRequired).toContain("audit");
    expect(messages.auctionsActions[1]?.description).toContain("reason");
    expect(messages.approvalQueue[0]?.title).toContain("Final-bid");
    expect(messages.rejectionReasons.map((reason) => reason.label)).toEqual([
      "Buyer eligibility",
      "Documentation",
      "Reserve not met",
      "Seller withdrawn",
      "Other",
    ]);
    expect(messages.staticPreviewActionNotice).toContain("disabled");
    expect(messages.lotFormTitle).toContain("lot");
    expect(messages.lotFormStaticNotice).toContain("disabled");
    expect(messages.lotFormFields.map((field) => field.name)).toEqual([
      "titleEn",
      "titleAr",
      "lotNumber",
      "startingBid",
      "reservePrice",
      "incrementMode",
      "customIncrement",
      "softCloseExtensionMinutes",
      "featured",
    ]);
  });
});
