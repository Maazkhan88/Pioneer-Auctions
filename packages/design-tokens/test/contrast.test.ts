import assert from "node:assert";
import { test } from "node:test";
import tokens from "../src/tokens.json" with { type: "json" };

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace("#", "");
  const num = parseInt(clean, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

function relativeLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r / 255, g / 255, b / 255].map((val) => {
    return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function contrastRatio(color1: string, color2: string): number {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);

  const l1 = relativeLuminance(rgb1.r, rgb1.g, rgb1.b);
  const l2 = relativeLuminance(rgb2.r, rgb2.g, rgb2.b);

  const bright = Math.max(l1, l2);
  const dark = Math.min(l1, l2);

  return (bright + 0.05) / (dark + 0.05);
}

test("WCAG contrast checks", async (t) => {
  const themes = ["light", "dark"] as const;

  for (const theme of themes) {
    const palette = tokens.theme[theme];

    await t.test(`contrast for theme: ${theme}`, () => {
      const bg = palette.background;
      const paper = palette.paper;

      // Text contrast on background
      const textOnBg = contrastRatio(palette.ink, bg);
      assert.ok(
        textOnBg >= 4.5,
        `Text contrast on background (${palette.ink} vs ${bg}) is ${textOnBg.toFixed(2)}, expected >= 4.5`
      );

      // Text contrast on paper
      const textOnPaper = contrastRatio(palette.ink, paper);
      assert.ok(
        textOnPaper >= 4.5,
        `Text contrast on paper (${palette.ink} vs ${paper}) is ${textOnPaper.toFixed(2)}, expected >= 4.5`
      );

      // Brand on background
      const brandOnBg = contrastRatio(palette.brand, bg);
      assert.ok(
        brandOnBg >= 3.0,
        `Brand contrast on background (${palette.brand} vs ${bg}) is ${brandOnBg.toFixed(2)}, expected >= 3.0 (large/ui)`
      );

      // Brand deep on background
      const brandDeepOnBg = contrastRatio(palette.brandDeep, bg);
      assert.ok(
        brandDeepOnBg >= 4.5,
        `BrandDeep contrast on background (${palette.brandDeep} vs ${bg}) is ${brandDeepOnBg.toFixed(2)}, expected >= 4.5`
      );

      // Success/Danger/Warning/Info on background
      const successOnBg = contrastRatio(palette.success, bg);
      assert.ok(
        successOnBg >= 3.0,
        `Success contrast on background (${palette.success} vs ${bg}) is ${successOnBg.toFixed(2)}, expected >= 3.0 (large/ui)`
      );

      const dangerOnBg = contrastRatio(palette.danger, bg);
      assert.ok(
        dangerOnBg >= 3.0,
        `Danger contrast on background (${palette.danger} vs ${bg}) is ${dangerOnBg.toFixed(2)}, expected >= 3.0 (large/ui)`
      );

      const warningOnBg = contrastRatio(palette.warning, bg);
      assert.ok(
        warningOnBg >= 3.0,
        `Warning contrast on background (${palette.warning} vs ${bg}) is ${warningOnBg.toFixed(2)}, expected >= 3.0 (large/ui)`
      );
    });
  }
});
