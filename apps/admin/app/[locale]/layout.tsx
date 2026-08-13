import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { HtmlAttributesSync } from "../../components/html-attributes-sync";
import { directionFor, isLocale, locales } from "../../i18n/messages";

interface LocaleLayoutProperties {
  readonly children: ReactNode;
  readonly params: Promise<{ readonly locale: string }>;
}

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: LocaleLayoutProperties) {
  const { locale } = await params;
  if (!isLocale(locale)) {
    notFound();
  }

  return (
    <main className="locale-shell" dir={directionFor(locale)} lang={locale}>
      <HtmlAttributesSync dir={directionFor(locale)} lang={locale} />
      {children}
    </main>
  );
}
