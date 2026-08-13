import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { LotBrowser } from "../../components/lot-browser";
import { isLocale, messagesFor } from "../../i18n/messages";
import { loadBuyerHomeData } from "../../lib/home-data";

interface LocalePageProperties {
  readonly params: Promise<{ readonly locale: string }>;
}

function GavelMark() {
  return (
    <span className="m3-mark" aria-hidden="true">
      <svg viewBox="0 0 24 24">
        <path d="m14 4 6 6M12 6l6 6M6 10l8 8M4 20h9M3 21h11" />
        <path d="m15 3-4 4 6 6 4-4-6-6ZM5 11l-2 2 6 6 2-2-6-6Z" />
      </svg>
    </span>
  );
}

export async function generateMetadata({
  params,
}: LocalePageProperties): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) {
    return {};
  }
  const messages = messagesFor(locale);

  return {
    alternates: {
      languages: { ar: "/ar", en: "/en" },
      canonical: `/${locale}`,
    },
    description: messages.siteDescription,
    openGraph: {
      description: messages.siteDescription,
      locale: locale === "ar" ? "ar_AE" : "en_AE",
      title: "Pioneer Auctions",
      type: "website",
      url: `/${locale}`,
    },
    title: "Pioneer Auctions",
    twitter: {
      card: "summary",
      description: messages.siteDescription,
      title: "Pioneer Auctions",
    },
  };
}

export default async function LocalePage({ params }: LocalePageProperties) {
  const { locale } = await params;
  if (!isLocale(locale)) {
    notFound();
  }

  const messages = messagesFor(locale);
  const homeData = await loadBuyerHomeData(locale, messages);

  return (
    <div className="m3-shell">
      <header className="m3-topbar">
        <Link href={`/${locale}`} className="m3-brand">
          <GavelMark />
          <span>Pioneer Auctions</span>
        </Link>
        <nav className="m3-nav" aria-label="Primary">
          <a href="#lots">{messages.activeLots}</a>
          <a href="#detail">{messages.lotDetail}</a>
          <Link href={`/${locale}/calendar`}>{messages.navCalendar}</Link>
          <a href="#admin">{messages.adminPreview}</a>
        </nav>
        <Link className="m3-language" href={messages.localeSwitchHref}>
          {messages.localeSwitch}
        </Link>
      </header>

      <main>
        <section className="m3-hero">
          <div className="m3-hero-copy">
            <span className="m3-eyebrow">{messages.eyebrow}</span>
            <h1>{messages.heading}</h1>
            <p>{messages.subtitle}</p>
            <div className="m3-actions">
              <a className="m3-primary-action" href="#lots">
                {messages.heroCta}
              </a>
              <a className="m3-secondary-action" href="#detail">
                {messages.heroSecondary}
              </a>
            </div>
          </div>

          <aside className="m3-phone-frame" aria-label="Mobile bid preview">
            <div className="m3-phone-toolbar">
              <GavelMark />
              <span>{messages.auctionNumber}</span>
            </div>
            <div className="m3-feature-image m3-lot-car" />
            <div className="m3-floating-bid">
              <span>{messages.currentBid}</span>
              <strong dir="ltr">AED 3,500,000</strong>
              <button type="button">{messages.bidNow}</button>
            </div>
          </aside>
        </section>

        <section className="m3-trust-strip" aria-label="Platform metrics">
          {messages.trustedStats.map((stat) => (
            <div key={stat.label}>
              <strong dir="ltr">{stat.value}</strong>
              <span>{stat.label}</span>
            </div>
          ))}
        </section>

        <section className="m3-market" id="lots">
          <div className="m3-section-heading">
            <div>
              <span className="m3-eyebrow">{messages.featured}</span>
              <h2>{messages.activeLots}</h2>
            </div>
            <a href="#all">{messages.browseAll}</a>
          </div>

          <LotBrowser
            locale={locale}
            lots={homeData.lots}
            messages={messages}
          />
        </section>

        <section className="m3-detail" id="detail">
          <div className="m3-detail-gallery">
            <div className="m3-gallery-main m3-lot-car" />
            <div className="m3-gallery-thumbs">
              <span className="m3-lot-equipment" />
              <span className="m3-lot-material" />
              <span className="m3-lot-car" />
            </div>
          </div>
          <div className="m3-detail-panel">
            <span className="m3-eyebrow">{messages.lotDetail}</span>
            <h2>Ferrari LaFerrari 2025</h2>
            <p>{messages.softClose}</p>
            <div className="m3-reserve-pill">{messages.reserveMet}</div>
            <div className="m3-cost-stack">
              <div>
                <span>{messages.currentBid}</span>
                <strong dir="ltr">AED 3,500,000</strong>
              </div>
              <div>
                <span>{messages.nextBid}</span>
                <strong dir="ltr">AED 3,501,000</strong>
              </div>
              <div>
                <span>{messages.depositReady}</span>
                <strong dir="ltr">AED 5,000</strong>
              </div>
            </div>
            <button className="m3-bid-button large" type="button">
              {messages.bidNow}
            </button>
          </div>
        </section>

        <section className="m3-admin-preview" id="admin">
          <div>
            <span className="m3-eyebrow">{messages.adminPreview}</span>
            <h2>Ops queue with expressive clarity</h2>
          </div>
          <div className="m3-admin-grid">
            <div>
              <strong>12</strong>
              <span>Final bid approvals</span>
            </div>
            <div>
              <strong>4</strong>
              <span>Offers pending</span>
            </div>
            <div>
              <strong>AED 8.4M</strong>
              <span>Live GMV</span>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
