"use client";

import { useEffect } from "react";

/**
 * Keeps the real `<html lang>`/`<html dir>` attributes in sync with the
 * active locale. `app/[locale]/layout.tsx` cannot set these directly:
 * Next.js App Router requires the single `<html>` element to live in the
 * top-level `app/layout.tsx`, which sits *above* the `[locale]` route
 * segment and so has no access to `params.locale` -- only nested
 * layouts/pages under `[locale]` do. `app/layout.tsx` hardcodes
 * `lang="en"` as a result, which is wrong for `/ar/*` routes: confirmed in
 * a real browser that `document.documentElement.lang` stayed `"en"` and
 * `dir` stayed empty on `/ar`, even though the inner `<main dir="rtl"
 * lang="ar">` (already present) was correct. Screen readers and search
 * engines key off `<html lang>`/`<html dir>` specifically, not an inner
 * element, so that inner-only attribute was not sufficient.
 *
 * This client-side sync on mount/locale-change is a pragmatic fix within
 * that structural constraint rather than restructuring the root layout
 * (which also serves a separate non-locale `app/page.tsx` redirect and
 * would be a much larger, riskier change for a "UI shells" pass). It does
 * not affect the very first server-rendered paint's `<html>` attributes,
 * but corrects them before the page is interactive.
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
