"use client";

import { useEffect } from "react";

/**
 * Keeps the real `<html lang>`/`<html dir>` attributes in sync with the
 * active locale. Same fix as `apps/web/components/html-attributes-sync.tsx`:
 * `app/layout.tsx` sits above the `[locale]` route segment and hardcodes
 * `lang="en"`, so `/ar/*` routes render with the wrong `<html>` attributes
 * even though the inner `<main dir="rtl" lang="ar">` is correct. Confirmed
 * in a real browser: `document.documentElement.lang` stayed `"en"` and
 * `dir` stayed empty on `/ar` before this fix.
 */
export function HtmlAttributesSync({
  dir,
  lang,
}: {
  readonly dir: "ltr" | "rtl";
  readonly lang: string;
}) {
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
  }, [dir, lang]);

  return null;
}
