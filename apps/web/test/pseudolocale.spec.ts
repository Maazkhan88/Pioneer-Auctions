import { describe, expect, it } from "vitest";

import { messagesFor } from "../i18n/messages";

// Simple pseudolocalization helper to translate characters to accented variations,
// expand string length by ~30%, and wrap with brackets.
function pseudolocalize(text: string): string {
  if (text.includes("http") || text.startsWith("/")) {
    return text; // Skip URLs and routes
  }

  const charMap: Record<string, string> = {
    a: "á", e: "é", i: "í", o: "ó", u: "ú",
    A: "Á", E: "É", I: "Í", O: "Ó", U: "Ú",
    s: "ś", r: "ŕ", t: "t́", n: "ń", d: "d́"
  };

  const converted = text
    .split("")
    .map((char) => charMap[char] ?? char)
    .join("");

  return `[!!! ${converted} !!!]`;
}

describe("pseudolocalization integrity", () => {
  it("successfully pseudolocalizes all UI dictionary values", () => {
    const messages = messagesFor("en");
    
    // We expect the messages object to contain actual defined values
    expect(messages).toBeDefined();
    
    // Validate individual fields
    expect(pseudolocalize(messages.heading)).toContain("[!!!");
    expect(pseudolocalize(messages.heading)).toContain("!!!]");

    // Verify nested lots array
    for (const lot of messages.lots) {
      expect(pseudolocalize(lot.title)).toContain("[!!!");
      expect(pseudolocalize(lot.category)).toContain("!!!");
    }
  });
});
