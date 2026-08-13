"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import type { Locale, Messages, PreviewLot } from "../i18n/messages";
import { WatchButton } from "./watch-button";

/**
 * Client-side search/category filtering over the lots already fetched for
 * the homepage (`apps/web/lib/home-data.ts`). There is no server-side
 * search/filter/category endpoint yet -- `PublicLotsController.list()`
 * (`apps/api/src/auctions/public-lots.controller.ts`) takes no query
 * parameters at all, and `GET /categories` from `docs/api-contracts.md` is
 * not implemented anywhere in `apps/api/src` (confirmed by grepping every
 * `@Controller`). Filtering the already-loaded list client-side is honest
 * given that reality and reasonable at preview scale; a real category
 * taxonomy and server-side search should replace this once those endpoints
 * exist.
 */
export function LotBrowser({
  locale,
  lots,
  messages,
}: {
  readonly locale: Locale;
  readonly lots: readonly PreviewLot[];
  readonly messages: Messages;
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const filteredLots = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return lots.filter((lot) => {
      const matchesSearch =
        term.length === 0 ||
        [lot.title, lot.lotNumber, lot.category].some((field) =>
          field.toLowerCase().includes(term),
        );
      const matchesCategory =
        selectedCategory === null || lot.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [lots, searchTerm, selectedCategory]);

  return (
    <>
      <div className="m3-search-card">
        <input
          aria-label={messages.searchPlaceholder}
          placeholder={messages.searchPlaceholder}
          value={searchTerm}
          onChange={(event) => {
            setSearchTerm(event.target.value);
          }}
        />
        <div className="m3-chip-row">
          {messages.categories.map((category, index) => {
            const isAllChip = index === 0;
            const isSelected = isAllChip
              ? selectedCategory === null
              : selectedCategory === category;
            return (
              <button
                key={category}
                aria-pressed={isSelected}
                className={isSelected ? "is-selected" : ""}
                type="button"
                onClick={() => {
                  setSelectedCategory(isAllChip ? null : category);
                }}
              >
                {category}
              </button>
            );
          })}
        </div>
      </div>

      <div className="m3-lot-grid">
        {filteredLots.length === 0 ? (
          <p className="m3-empty-state">{messages.noResults}</p>
        ) : (
          filteredLots.map((lot) => (
            <LotCard
              key={lot.lotId}
              bidNow={messages.bidNow}
              currentBid={messages.currentBid}
              locale={locale}
              lot={lot}
              nextBid={messages.nextBid}
            />
          ))
        )}
      </div>
    </>
  );
}

function LotCard({
  bidNow,
  currentBid,
  locale,
  lot,
  nextBid,
}: {
  readonly bidNow: string;
  readonly currentBid: string;
  readonly locale: Locale;
  readonly lot: PreviewLot;
  readonly nextBid: string;
}) {
  const detailHref = `/${locale}/lots/${encodeURIComponent(lot.lotId)}`;

  return (
    <article className={`m3-lot-card ${lot.status}`}>
      <div className={`m3-lot-media ${lot.imageClass}`}>
        <span className="m3-live-chip">{lot.badge}</span>
        <WatchButton lotId={lot.lotId} />
      </div>
      <div className="m3-lot-body">
        <div className="m3-meta-row">
          <span>{lot.lotNumber}</span>
          <span>{lot.category}</span>
        </div>
        <h2>
          <Link href={detailHref}>{lot.title}</Link>
        </h2>
        <div className="m3-status-row">
          <span className="m3-timer" dir="ltr">
            {lot.closesIn}
          </span>
          <span>{lot.bids}</span>
          <span>{lot.reserve}</span>
        </div>
        <div className="m3-bid-panel">
          <div>
            <span>{currentBid}</span>
            <strong dir="ltr">{lot.price}</strong>
          </div>
          <div>
            <span>{nextBid}</span>
            <strong dir="ltr">{lot.increment}</strong>
          </div>
        </div>
        <Link className="m3-bid-button" href={detailHref}>
          {bidNow}
        </Link>
      </div>
    </article>
  );
}
