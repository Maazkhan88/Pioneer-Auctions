import Link from "next/link";
import { notFound } from "next/navigation";

import { isLocale, messagesFor } from "../../i18n/messages";

interface LocalePageProperties {
  readonly params: Promise<{ readonly locale: string }>;
}

function Icon({
  name,
}: {
  readonly name:
    | "arrow"
    | "bell"
    | "check"
    | "clock"
    | "gavel"
    | "heart"
    | "pin"
    | "search"
    | "user";
}) {
  const paths = {
    arrow: <path d="m9 18 6-6-6-6" />,
    bell: <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />,
    check: <path d="m5 12 4 4L19 6" />,
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    gavel: (
      <>
        <path d="m14 4 6 6M12 6l6 6M6 10l8 8M4 20h9M3 21h11" />
        <path d="m15 3-4 4 6 6 4-4-6-6ZM5 11l-2 2 6 6 2-2-6-6Z" />
      </>
    ),
    heart: (
      <path d="M20.8 4.6a5.4 5.4 0 0 0-7.6 0L12 5.8l-1.2-1.2a5.4 5.4 0 0 0-7.6 7.6L12 21l8.8-8.8a5.4 5.4 0 0 0 0-7.6Z" />
    ),
    pin: (
      <>
        <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
        <circle cx="12" cy="10" r="2.5" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </>
    ),
    user: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </>
    ),
  } as const;

  return (
    <svg className={`icon icon-${name}`} viewBox="0 0 24 24" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

export default async function LocalePage({ params }: LocalePageProperties) {
  const { locale } = await params;
  if (!isLocale(locale)) {
    notFound();
  }

  const messages = messagesFor(locale);

  return (
    <div className="auction-preview">
      <header className="topbar">
        <Link
          className="brand-lockup"
          href={`/${locale}`}
          aria-label={messages.brand}
        >
          <span className="brand-mark">
            <Icon name="gavel" />
          </span>
          <span>{messages.brand}</span>
        </Link>
        <nav className="primary-nav" aria-label={messages.brand}>
          <a href="#live">{messages.liveAuctions}</a>
          <a href="#lots">{messages.categories}</a>
          <a href="#how">{messages.howItWorks}</a>
        </nav>
        <div className="topbar-actions">
          <button
            className="icon-button search-button"
            type="button"
            aria-label={messages.search}
          >
            <Icon name="search" />
          </button>
          <button
            className="icon-button"
            type="button"
            aria-label={messages.notifications}
          >
            <Icon name="bell" />
          </button>
          <button
            className="profile-button"
            type="button"
            aria-label={messages.profile}
          >
            <Icon name="user" />
          </button>
          <Link className="locale-switch" href={messages.localeSwitchHref}>
            {messages.localeSwitch}
          </Link>
        </div>
      </header>

      <main>
        <section className="intro" id="live">
          <div>
            <p className="eyebrow">
              <span className="live-dot" />
              {messages.eyebrow}
            </p>
            <h1>{messages.heading}</h1>
          </div>
          <p className="intro-copy">{messages.subtitle}</p>
        </section>

        <section className="featured-lot" aria-labelledby="featured-title">
          <div className="featured-media">
            <div className="media-topline">
              <span className="featured-pill">{messages.featured}</span>
              <button
                className="media-heart"
                type="button"
                aria-label={messages.notifications}
              >
                <Icon name="heart" />
              </button>
            </div>
            <div className="media-caption">
              <span>
                <Icon name="pin" />
                {messages.location}
              </span>
              <span className="verified">
                <Icon name="check" />
                {messages.verified}
              </span>
            </div>
          </div>

          <aside className="bid-panel">
            <div className="lot-meta">
              <span>{messages.lotNumber}</span>
              <span>{messages.auctionNumber}</span>
            </div>
            <h2 id="featured-title">{messages.title}</h2>
            <div className="bid-status">
              <span className="status-icon">
                <Icon name="check" />
              </span>
              <span>
                <strong>{messages.highestBidder}</strong>
                <small>{messages.reserveMet}</small>
              </span>
            </div>
            <div className="price-grid">
              <div>
                <span>{messages.currentBid}</span>
                <bdi dir="ltr">AED 184,000</bdi>
              </div>
              <div>
                <span>{messages.nextBid}</span>
                <bdi dir="ltr">AED 186,000</bdi>
              </div>
            </div>
            <div className="countdown-block">
              <span>
                <Icon name="clock" />
                {messages.endsIn}
              </span>
              <bdi dir="ltr">00 : 12 : 48</bdi>
              <small>{messages.watchers}</small>
            </div>
            <button className="bid-button" type="button">
              <span>{messages.bidAction}</span>
              <Icon name="arrow" />
            </button>
            <p className="fee-note">{messages.feeNote}</p>
          </aside>
        </section>

        <section className="ending-section" id="lots">
          <div className="section-heading">
            <div>
              <p className="section-kicker">{messages.status}</p>
              <h2>{messages.endingSoon}</h2>
              <p>{messages.endingSoonIntro}</p>
            </div>
            <a href="#lots">
              {messages.viewAll}
              <Icon name="arrow" />
            </a>
          </div>
          <div className="lot-grid">
            {messages.lots.map((lot) => (
              <article className="lot-card" key={lot.lotNumber}>
                <div className={`lot-image ${lot.imageClass}`}>
                  <span>{lot.category}</span>
                  <button type="button" aria-label={messages.notifications}>
                    <Icon name="heart" />
                  </button>
                </div>
                <div className="lot-card-body">
                  <span className="lot-number">{lot.lotNumber}</span>
                  <h3>{lot.title}</h3>
                  <div className="lot-card-footer">
                    <bdi dir="ltr">{lot.price}</bdi>
                    <span>
                      <Icon name="clock" />
                      <bdi dir="ltr">{lot.time}</bdi>
                    </span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
