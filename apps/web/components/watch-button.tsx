"use client";

import { useState } from "react";

export function WatchButton({
  label = "Watch lot",
  lotId,
}: {
  readonly label?: string;
  readonly lotId: string;
}) {
  const [watched, setWatched] = useState(() =>
    typeof window === "undefined"
      ? false
      : localStorage.getItem(storageKey(lotId)) === "1",
  );

  return (
    <button
      className={`m3-icon-button ${watched ? "is-watched" : ""}`}
      type="button"
      aria-label={label}
      aria-pressed={watched}
      onClick={() => {
        const next = !watched;
        setWatched(next);
        if (next) {
          localStorage.setItem(storageKey(lotId), "1");
        } else {
          localStorage.removeItem(storageKey(lotId));
        }
      }}
    >
      {watched ? "★" : "☆"}
    </button>
  );
}

function storageKey(lotId: string): string {
  return `pioneer.watch.${lotId}`;
}
