import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { BidPanelShell } from "../../../../components/bid-panel-shell";
import { WatchButton } from "../../../../components/watch-button";
import { isLocale, messagesFor } from "../../../../i18n/messages";
import { getBuyerBidSessionConfig } from "../../../../lib/bid-session";
import { loadLotDetailData } from "../../../../lib/lot-detail-data";

const previewLotIds = [
  "11111111-1111-4111-8111-111111111111",
  "44444444-4444-4444-8444-444444444444",
  "66666666-6666-4666-8666-666666666666",
] as const;

/**
 * Next.js requires this to be a literal boolean (its route-segment-config
 * parser statically analyzes the export and rejects any computed
 * expression, even one that would resolve to a constant at build time),
 * so it cannot vary by `CLOUDFLARE_PAGES`/`output: "export"` the way
 * `next.config.ts`'s own settings do. `true` (the Next.js default; kept
 * explicit here for clarity) lets a real lot ID from a live API render on
 * demand in `next dev` and a real Next.js server deployment, instead of
 * 404ing for anything outside the three dummy IDs below -- confirmed live
 * that this was previously a real, blocking gap: the underlying bidding
 * REST/Socket.IO engine worked correctly for a real lot when called
 * directly, but this page 404'd for that same lot with `dynamicParams:
 * false`. The Cloudflare static export build (`output: "export"`) still
 * only ever serves the three pre-generated dummy pages regardless of this
 * setting, since there is no server there to render anything on demand.
 */
export const dynamicParams = true;

export function generateStaticParams() {
  return ["en", "ar"].flatMap((locale) =>
    previewLotIds.map((lotId) => ({ locale, lotId })),
  );
}

interface LotDetailPageProperties {
  readonly params: Promise<{
    readonly locale: string;
    readonly lotId: string;
  }>;
}

export async function generateMetadata({
  params,
}: LotDetailPageProperties): Promise<Metadata> {
  const { locale, lotId } = await params;
  if (!isLocale(locale)) {
    return {};
  }
  const detail = await loadLotDetailData(locale, decodeURIComponent(lotId));
  if (detail === null) {
    return {};
  }

  const title = `${detail.lot.title} — ${detail.lot.lotNumber}`;
  const description = detail.description;
  const path = `/${locale}/lots/${encodeURIComponent(detail.lot.lotId)}`;

  return {
    alternates: {
      languages: {
        ar: `/ar/lots/${encodeURIComponent(detail.lot.lotId)}`,
        en: `/en/lots/${encodeURIComponent(detail.lot.lotId)}`,
      },
      canonical: path,
    },
    description,
    openGraph: {
      description,
      locale: locale === "ar" ? "ar_AE" : "en_AE",
      title,
      type: "website",
      url: path,
    },
    title,
    twitter: {
      card: "summary",
      description,
      title,
    },
  };
}

export default async function LotDetailPage({
  params,
}: LotDetailPageProperties) {
  const { locale, lotId } = await params;
  if (!isLocale(locale)) {
    notFound();
  }

  const messages = messagesFor(locale);
  const detail = await loadLotDetailData(locale, decodeURIComponent(lotId));
  if (detail === null) {
    notFound();
  }
  const session = getBuyerBidSessionConfig();

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
        <Link className="m3-language" href={messages.localeSwitchHref}>
          {messages.localeSwitch}
        </Link>
      </header>

      <section className="m3-detail-page">
        <div className="m3-detail-gallery">
          <div className={`m3-gallery-main ${detail.lot.imageClass}`}>
            <WatchButton lotId={detail.lot.lotId} />
          </div>
          <div className="m3-gallery-thumbs">
            <span className="m3-lot-equipment" />
            <span className="m3-lot-material" />
            <span className="m3-lot-car" />
          </div>
        </div>
        <article className="m3-detail-panel">
          <span className="m3-eyebrow">{messages.lotDetail}</span>
          <div>
            <p className="m3-lot-kicker">{detail.lot.lotNumber}</p>
            <h1>{detail.lot.title}</h1>
          </div>
          <p>{detail.description}</p>
          <div className="m3-reserve-pill">{detail.lot.reserve}</div>
          <BidPanelShell
            currentBid={detail.lot.price}
            locale={locale}
            lotId={detail.lot.lotId}
            nextBid={detail.lot.increment}
            session={session}
          />
        </article>
      </section>

      <section className="m3-detail-support">
        <article>
          <h2>Specs</h2>
          <dl>
            {detail.specs.map((spec) => (
              <div key={spec.label}>
                <dt>{spec.label}</dt>
                <dd>{spec.value}</dd>
              </div>
            ))}
          </dl>
        </article>
        <article>
          <h2>Documents</h2>
          <ul>
            {detail.documents.map((document) => (
              <li key={document}>{document}</li>
            ))}
          </ul>
        </article>
        <article>
          <h2>Fees</h2>
          <dl>
            {detail.feeLines.map((fee) => (
              <div key={fee.label}>
                <dt>{fee.label}</dt>
                <dd>{fee.value}</dd>
              </div>
            ))}
          </dl>
        </article>
      </section>
    </main>
  );
}
