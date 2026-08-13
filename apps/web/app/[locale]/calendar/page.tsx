import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { isLocale, locales, messagesFor } from "../../../i18n/messages";
import {
  groupByClosingDate,
  loadCalendarLots,
} from "../../../lib/calendar-data";

export const dynamicParams = false;

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

interface CalendarPageProperties {
  readonly params: Promise<{ readonly locale: string }>;
}

export async function generateMetadata({
  params,
}: CalendarPageProperties): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) {
    return {};
  }
  const messages = messagesFor(locale);
  const title = `${messages.calendarHeading} — Pioneer Auctions`;

  return {
    alternates: {
      languages: { ar: "/ar/calendar", en: "/en/calendar" },
      canonical: `/${locale}/calendar`,
    },
    description: messages.calendarSubtitle,
    openGraph: {
      description: messages.calendarSubtitle,
      locale: locale === "ar" ? "ar_AE" : "en_AE",
      title,
      type: "website",
      url: `/${locale}/calendar`,
    },
    title,
  };
}

export default async function CalendarPage({ params }: CalendarPageProperties) {
  const { locale } = await params;
  if (!isLocale(locale)) {
    notFound();
  }

  const messages = messagesFor(locale);
  const lots = await loadCalendarLots(locale);
  const groups = groupByClosingDate(lots, locale);

  return (
    <main className="m3-shell">
      <header className="m3-topbar">
        <Link href={`/${locale}`} className="m3-brand">
          <span className="m3-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="m14 4 6 6M12 6l6 6M6 10l8 8M4 20h9M3 21h11" />
              <path d="m15 3-4 4 6 6 4-4-6-6ZM5 11l-2 2 6 6 2-2-6-6Z" />
            </svg>
          </span>
          <span>Pioneer Auctions</span>
        </Link>
        <Link href={`/${locale}`}>{messages.calendarBackToLots}</Link>
      </header>

      <section className="m3-calendar-page">
        <span className="m3-eyebrow">{messages.activeLots}</span>
        <h1>{messages.calendarHeading}</h1>
        <p>{messages.calendarSubtitle}</p>

        {groups.length === 0 ? (
          <p className="m3-empty-state">{messages.calendarEmptyState}</p>
        ) : (
          groups.map((group) => (
            <div className="m3-calendar-group" key={group.isoDate}>
              <h2>{group.dateLabel}</h2>
              <ul>
                {group.lots.map((lot) => (
                  <li key={lot.lotId}>
                    <Link
                      href={`/${locale}/lots/${encodeURIComponent(lot.lotId)}`}
                    >
                      <span className="m3-calendar-lot-number">
                        {lot.lotNumber}
                      </span>
                      <span className="m3-calendar-lot-title">{lot.title}</span>
                      <strong dir="ltr">{lot.currentBid}</strong>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </section>
    </main>
  );
}
