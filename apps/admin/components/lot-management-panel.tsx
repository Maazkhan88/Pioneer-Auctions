"use client";

import { useState } from "react";

import type {
  AdminAuctionItem,
  AdminLotItem,
  Locale,
  Messages,
} from "../i18n/messages";
import { submitCreateLot, type CreateLotIncrement } from "../lib/admin-actions";
import type { AdminSessionConfig } from "../lib/admin-session";

type ActionState =
  | { readonly status: "idle" }
  | { readonly status: "pending" }
  | { readonly status: "error"; readonly message: string }
  | { readonly status: "done" };

interface LotFormState {
  readonly auctionId: string;
  readonly closesAt: string;
  readonly incrementMode: "custom" | "percent";
  readonly incrementValue: string;
  readonly lotNumber: string;
  readonly reservePrice: string;
  readonly softCloseExtensionMinutes: string;
  readonly softCloseMaximumExtensions: string;
  readonly softCloseWindowMinutes: string;
  readonly startingBid: string;
  readonly startsAt: string;
  readonly titleAr: string;
  readonly titleEn: string;
}

const emptyForm: LotFormState = {
  auctionId: "",
  closesAt: "",
  incrementMode: "percent",
  incrementValue: "",
  lotNumber: "",
  reservePrice: "",
  softCloseExtensionMinutes: "",
  softCloseMaximumExtensions: "",
  softCloseWindowMinutes: "",
  startingBid: "",
  startsAt: "",
  titleAr: "",
  titleEn: "",
};

interface LotManagementPanelProperties {
  readonly auctions: readonly AdminAuctionItem[];
  readonly initialLots: readonly AdminLotItem[];
  readonly locale: Locale;
  readonly messages: Messages;
  readonly session: AdminSessionConfig | null;
}

export function LotManagementPanel({
  auctions,
  initialLots,
  locale,
  messages,
  session,
}: LotManagementPanelProperties) {
  const [lots, setLots] = useState(initialLots);
  const [form, setForm] = useState<LotFormState>(emptyForm);
  const [state, setState] = useState<ActionState>({ status: "idle" });

  const disabled = session === null || auctions.length === 0;

  function updateField<TKey extends keyof LotFormState>(
    key: TKey,
    value: LotFormState[TKey],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit() {
    if (session === null) {
      return;
    }

    const startingBidFils = toFils(form.startingBid);
    const incrementValue = Number(form.incrementValue);
    const requiredFieldsPresent =
      form.auctionId.length > 0 &&
      form.lotNumber.trim().length > 0 &&
      form.titleEn.trim().length > 0 &&
      form.titleAr.trim().length > 0 &&
      form.startsAt.length > 0 &&
      form.closesAt.length > 0 &&
      startingBidFils !== null &&
      Number.isFinite(incrementValue) &&
      incrementValue > 0;

    if (!requiredFieldsPresent || startingBidFils === null) {
      setState({ message: messages.formValidationError, status: "error" });
      return;
    }

    const startsAtIso = new Date(form.startsAt).toISOString();
    const closesAtIso = new Date(form.closesAt).toISOString();
    if (new Date(startsAtIso) >= new Date(closesAtIso)) {
      setState({ message: messages.formValidationError, status: "error" });
      return;
    }

    const increment: CreateLotIncrement =
      form.incrementMode === "custom"
        ? { minimumIncrementFils: Math.round(incrementValue), mode: "custom" }
        : {
            minimumIncrementPercentBps: Math.round(incrementValue),
            mode: "percent",
          };

    const reservePriceFils = toFils(form.reservePrice);
    const softCloseWindowMs = toMs(form.softCloseWindowMinutes);
    const softCloseExtensionMs = toMs(form.softCloseExtensionMinutes);
    const softCloseMaximumExtensions = toInt(form.softCloseMaximumExtensions);

    setState({ status: "pending" });
    try {
      const created = await submitCreateLot({
        apiBaseUrl: session.apiBaseUrl,
        auctionId: form.auctionId,
        closesAt: closesAtIso,
        correlationId: crypto.randomUUID(),
        increment,
        lotNumber: form.lotNumber.trim(),
        startingBidFils,
        startsAt: startsAtIso,
        testAccountId: session.testAccountId,
        titleAr: form.titleAr.trim(),
        titleEn: form.titleEn.trim(),
        ...(reservePriceFils !== null ? { reservePriceFils } : {}),
        ...(softCloseWindowMs !== null ? { softCloseWindowMs } : {}),
        ...(softCloseExtensionMs !== null ? { softCloseExtensionMs } : {}),
        ...(softCloseMaximumExtensions !== null
          ? { softCloseMaximumExtensions }
          : {}),
      });

      setLots((current) => [
        ...current,
        {
          amount: formatAedFils(
            locale,
            created.currentBidFils ?? created.startingBidFils,
          ),
          increment: formatAedFils(locale, created.minimumIncrementFils),
          lifecycle: created.lifecycle,
          lotNumber: created.lotNumber,
          title: locale === "ar" ? created.titleAr : created.titleEn,
        },
      ]);
      setForm(emptyForm);
      setState({ status: "done" });
    } catch (error) {
      setState({
        message: error instanceof Error ? error.message : "failed",
        status: "error",
      });
    }
  }

  return (
    <>
      <div className="backend-lots">
        <h3>{messages.lotListTitle}</h3>
        {lots.length === 0 ? (
          <p>{messages.lotListEmpty}</p>
        ) : (
          <div className="lot-list">
            {lots.map((lot) => (
              <article className="lot-row" key={lot.lotNumber}>
                <div>
                  <strong>Lot #{lot.lotNumber}</strong>
                  <span>{lot.title}</span>
                </div>
                <div>
                  <strong>{lot.amount}</strong>
                  <span>
                    {lot.lifecycle} · +{lot.increment}
                  </span>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      <form
        aria-label={messages.lotFormTitle}
        className="lot-form"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <h3>{messages.lotFormTitle}</h3>
        {auctions.length === 0 && session !== null ? (
          <p>{messages.lotNoAuctionsNotice}</p>
        ) : null}
        <div className="form-grid">
          <label>
            <span>{messages.lotAuctionLabel}</span>
            <select
              disabled={disabled}
              onChange={(event) => {
                updateField("auctionId", event.target.value);
              }}
              value={form.auctionId}
            >
              <option value="">{messages.lotAuctionPlaceholder}</option>
              {auctions.map((auction) => (
                <option key={auction.id} value={auction.id}>
                  {auction.title}
                </option>
              ))}
            </select>
          </label>
          {messages.lotFormFields.map((field) => (
            <label key={field.name}>
              <span>{field.label}</span>
              <input
                disabled={disabled}
                onChange={(event) => {
                  updateField(
                    field.name as keyof LotFormState,
                    event.target.value,
                  );
                }}
                placeholder={field.placeholder}
                type={field.type}
                value={form[field.name as keyof LotFormState]}
              />
            </label>
          ))}
          <label>
            <span>{messages.lotIncrementModeLabel}</span>
            <select
              disabled={disabled}
              onChange={(event) => {
                updateField(
                  "incrementMode",
                  event.target.value as "custom" | "percent",
                );
              }}
              value={form.incrementMode}
            >
              <option value="percent">
                {messages.lotIncrementModePercentLabel}
              </option>
              <option value="custom">
                {messages.lotIncrementModeCustomLabel}
              </option>
            </select>
          </label>
          <label>
            <span>{messages.lotIncrementValueLabel}</span>
            <input
              disabled={disabled}
              onChange={(event) => {
                updateField("incrementValue", event.target.value);
              }}
              placeholder={form.incrementMode === "percent" ? "500" : "100000"}
              type="number"
              value={form.incrementValue}
            />
          </label>
        </div>
        <div className="form-footer">
          {session === null ? (
            <p>{messages.lotFormStaticNotice}</p>
          ) : state.status === "pending" ? (
            <p className="m3-live-status is-pending">
              {messages.actionPendingLabel}
            </p>
          ) : state.status === "error" ? (
            <p className="m3-live-status is-error">{state.message}</p>
          ) : state.status === "done" ? (
            <p className="m3-live-status is-success">
              {messages.lotCreateSuccess}
            </p>
          ) : (
            <p />
          )}
          <button
            disabled={disabled || state.status === "pending"}
            type="submit"
          >
            {messages.lotFormSaveButton}
          </button>
        </div>
      </form>
    </>
  );
}

function toFils(rawAed: string): number | null {
  if (rawAed.trim().length === 0) {
    return null;
  }
  const value = Number(rawAed);
  if (!Number.isFinite(value) || value < 0) {
    return null;
  }
  return Math.round(value * 100);
}

function toMs(rawMinutes: string): number | null {
  if (rawMinutes.trim().length === 0) {
    return null;
  }
  const value = Number(rawMinutes);
  if (!Number.isFinite(value) || value <= 0) {
    return null;
  }
  return Math.round(value * 60_000);
}

function toInt(rawValue: string): number | null {
  if (rawValue.trim().length === 0) {
    return null;
  }
  const value = Number(rawValue);
  if (!Number.isFinite(value) || value <= 0) {
    return null;
  }
  return Math.round(value);
}

function formatAedFils(locale: Locale, amountFils: number): string {
  return new Intl.NumberFormat(locale === "ar" ? "ar-AE" : "en-AE", {
    currency: "AED",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(amountFils / 100);
}
