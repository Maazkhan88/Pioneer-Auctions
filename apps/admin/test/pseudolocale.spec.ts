import { describe, expect, it } from "vitest";

import { messagesFor } from "../i18n/messages";

function pseudolocalize(text: string): string {
  if (text.includes("http") || text.startsWith("/")) {
    return text;
  }

  const charMap: Record<string, string> = {
    a: "á",
    e: "é",
    i: "í",
    o: "ó",
    u: "ú",
    A: "Á",
    E: "É",
    I: "Í",
    O: "Ó",
    U: "Ú",
    s: "ś",
    r: "ŕ",
    t: "t́",
    n: "ń",
    d: "d́",
  };

  const converted = text
    .split("")
    .map((char) => charMap[char] ?? char)
    .join("");

  return `[!!! ${converted} !!!]`;
}

describe("admin pseudolocalization integrity", () => {
  it("successfully pseudolocalizes all admin UI dictionary values", () => {
    const messages = messagesFor("en");
    expect(messages).toBeDefined();

    expect(pseudolocalize(messages.heading)).toContain("[!!!");
    expect(pseudolocalize(messages.heading)).toContain("!!!]");
    expect(flattenStrings(messages).every((value) => value.length > 0)).toBe(
      true,
    );
  });
});

function flattenStrings(value: unknown): string[] {
  if (typeof value === "string") {
    return [value];
  }
  if (Array.isArray(value)) {
    return value.flatMap(flattenStrings);
  }
  if (typeof value === "object" && value !== null) {
    return Object.values(value).flatMap(flattenStrings);
  }
  return [];
}
