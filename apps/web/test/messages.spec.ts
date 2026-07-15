import { describe, expect, it } from "vitest";

import { directionFor, messagesFor } from "../i18n/messages";

describe("localized web shell", () => {
  it("uses first-class RTL direction for Arabic", () => {
    expect(directionFor("ar")).toBe("rtl");
    expect(messagesFor("ar").heading).not.toBe("");
  });

  it("uses LTR direction for English", () => {
    expect(directionFor("en")).toBe("ltr");
    expect(messagesFor("en").heading).not.toBe("");
  });
});
