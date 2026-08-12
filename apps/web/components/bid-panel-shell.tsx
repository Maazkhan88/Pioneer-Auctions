"use client";

import { useId, useState } from "react";

export function BidPanelShell({
  currentBid,
  lotId,
  nextBid,
}: {
  readonly currentBid: string;
  readonly lotId: string;
  readonly nextBid: string;
}) {
  const customBidId = useId();
  const [mode, setMode] = useState<"custom" | "quick">("quick");

  return (
    <section
      className="m3-live-bid-shell"
      aria-label="Bid panel shell"
      data-command-shape="POST /api/v1/lots/:lotId/bids"
      data-lot-id={lotId}
    >
      <div className="m3-live-bid-status" role="status" aria-live="polite">
        Backend command shape ready · authentication and deposit gate pending
      </div>
      <div className="m3-cost-stack">
        <div>
          <span>Current bid</span>
          <strong dir="ltr">{currentBid}</strong>
        </div>
        <div>
          <span>Next valid bid</span>
          <strong dir="ltr">{nextBid}</strong>
        </div>
      </div>
      <div className="m3-bid-mode-row">
        <button
          className={mode === "quick" ? "is-selected" : ""}
          type="button"
          onClick={() => setMode("quick")}
        >
          Quick bid
        </button>
        <button
          className={mode === "custom" ? "is-selected" : ""}
          type="button"
          onClick={() => setMode("custom")}
        >
          Custom bid
        </button>
      </div>
      <label className="m3-custom-bid-field" htmlFor={customBidId}>
        Custom amount AED
        <input
          disabled={mode !== "custom"}
          id={customBidId}
          inputMode="numeric"
          placeholder="561000"
        />
      </label>
      <button className="m3-bid-button large" disabled type="button">
        Connect account to bid
      </button>
    </section>
  );
}
