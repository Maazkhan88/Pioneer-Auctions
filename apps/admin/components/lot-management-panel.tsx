"use client";

import { useState } from "react";

import type {
  AdminAuctionItem,
  AdminLotItem,
  Locale,
  Messages,
} from "../i18n/messages";
import {
  submitCreateLot,
  submitUpdateLot,
  type CreateLotIncrement,
} from "../lib/admin-actions";
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

interface LotEditFormState {
  readonly closesAt: string;
  readonly lotNumber: string;
  readonly softCloseExtensionMinutes: string;
  readonly softCloseMaximumExtensions: string;
  readonly softCloseWindowMinutes: string;
  readonly startsAt: string;
  readonly titleAr: string;
  readonly titleEn: string;
}

const emptyEditForm: LotEditFormState = {
  closesAt: "",
  lotNumber: "",
  softCloseExtensionMinutes: "",
  softCloseMaximumExtensions: "",
  softCloseWindowMinutes: "",
  startsAt: "",
  titleAr: "",
  titleEn: "",
};

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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<LotEditFormState>(emptyEditForm);
  const [editStateById, setEditStateById] = useState<
    Record<string, ActionState>
  >({});

  const disabled = session === null || auctions.length === 0;

  function updateField<TKey extends keyof LotFormState>(
    key: TKey,
    value: LotFormState[TKey],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updateEditField<TKey extends keyof LotEditFormState>(
    key: TKey,
    value: LotEditFormState[TKey],
  ) {
    setEditForm((current) => ({ ...current, [key]: value }));
  }

  function startLotEdit(lot: AdminLotItem) {
    setEditingId(lot.id);
    setEditForm({
      closesAt: toDatetimeLocal(lot.closesAt),
      lotNumber: lot.lotNumber,
      softCloseExtensionMinutes: msToMinutes(lot.softCloseExtensionMs),
      softCloseMaximumExtensions:
        lot.softCloseMaximumExtensions?.toString() ?? "",
      softCloseWindowMinutes: msToMinutes(lot.softCloseWindowMs),
      startsAt: toDatetimeLocal(lot.startsAt),
      titleAr: lot.titleAr,
      titleEn: lot.titleEn,
    });
  }

  function cancelLotEdit() {
    setEditingId(null);
  }

  async function saveLotEdit(lotId: string) {
    if (session === null) {
      return;
    }
    if (
      editForm.lotNumber.trim().length === 0 ||
      editForm.titleEn.trim().length === 0 ||
      editForm.titleAr.trim().length === 0 ||
      editForm.startsAt.length === 0 ||
      editForm.closesAt.length === 0
    ) {
      setEditStateById((current) => ({
        ...current,
        [lotId]: { message: messages.formValidationError, status: "error" },
      }));
      return;
    }
    const startsAtIso = new Date(editForm.startsAt).toISOString();
    const closesAtIso = new Date(editForm.closesAt).toISOString();
    if (new Date(startsAtIso) >= new Date(closesAtIso)) {
      setEditStateById((current) => ({
        ...current,
        [lotId]: { message: messages.formValidationError, status: "error" },
      }));
      return;
    }

    const softCloseWindowMs = toMs(editForm.softCloseWindowMinutes);
    const softCloseExtensionMs = toMs(editForm.softCloseExtensionMinutes);
    const softCloseMaximumExtensions = toInt(
      editForm.softCloseMaximumExtensions,
    );

    setEditStateById((current) => ({
      ...current,
      [lotId]: { status: "pending" },
    }));
    try {
      const updated = await submitUpdateLot({
        apiBaseUrl: session.apiBaseUrl,
        closesAt: closesAtIso,
        correlationId: crypto.randomUUID(),
        lotId,
        lotNumber: editForm.lotNumber.trim(),
        startsAt: startsAtIso,
        testAccountId: session.testAccountId,
        titleAr: editForm.titleAr.trim(),
        titleEn: editForm.titleEn.trim(),
        ...(softCloseWindowMs !== null ? { softCloseWindowMs } : {}),
        ...(softCloseExtensionMs !== null ? { softCloseExtensionMs } : {}),
        ...(softCloseMaximumExtensions !== null
          ? { softCloseMaximumExtensions }
          : {}),
      });
      setLots((current) =>
        current.map((entry) =>
          entry.id === lotId
            ? {
                ...entry,
                closesAt: updated.closesAt,
                lotNumber: updated.lotNumber,
                softCloseExtensionMs: updated.softCloseExtensionMs,
                softCloseMaximumExtensions: updated.softCloseMaximumExtensions,
                softCloseWindowMs: updated.softCloseWindowMs,
                startsAt: updated.startsAt,
                title: locale === "ar" ? updated.titleAr : updated.titleEn,
                titleAr: updated.titleAr,
                titleEn: updated.titleEn,
              }
            : entry,
        ),
      );
      setEditStateById((current) => ({
        ...current,
        [lotId]: { status: "done" },
      }));
      setEditingId(null);
    } catch (error) {
      setEditStateById((current) => ({
        ...current,
        [lotId]: {
          message: error instanceof Error ? error.message : "failed",
          status: "error",
        },
      }));
    }
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
          closesAt: created.closesAt,
          id: created.id,
          increment: formatAedFils(locale, created.minimumIncrementFils),
          lifecycle: created.lifecycle,
          lotNumber: created.lotNumber,
          softCloseExtensionMs: created.softCloseExtensionMs,
          softCloseMaximumExtensions: created.softCloseMaximumExtensions,
          softCloseWindowMs: created.softCloseWindowMs,
          startsAt: created.startsAt,
          titleAr: created.titleAr,
          titleEn: created.titleEn,
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
            {lots.map((lot) => {
              const isEditing = editingId === lot.id;
              const editState = editStateById[lot.id] ?? { status: "idle" };
              const rowDisabled =
                session === null || editState.status === "pending";

              return (
                <article className="auction-row" key={lot.id}>
                  <div className="lot-row">
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
                  </div>

                  {isEditing ? (
                    <div className="decision-controls">
                      <p>{messages.lotEditMoneyNotice}</p>
                      <div className="form-grid">
                        <label>
                          <span>{fieldLabel(messages, "lotNumber")}</span>
                          <input
                            disabled={rowDisabled}
                            onChange={(event) => {
                              const value = event.target.value;
                              updateEditField("lotNumber", value);
                            }}
                            type="text"
                            value={editForm.lotNumber}
                          />
                        </label>
                        <label>
                          <span>{fieldLabel(messages, "titleEn")}</span>
                          <input
                            disabled={rowDisabled}
                            onChange={(event) => {
                              const value = event.target.value;
                              updateEditField("titleEn", value);
                            }}
                            type="text"
                            value={editForm.titleEn}
                          />
                        </label>
                        <label>
                          <span>{fieldLabel(messages, "titleAr")}</span>
                          <input
                            disabled={rowDisabled}
                            onChange={(event) => {
                              const value = event.target.value;
                              updateEditField("titleAr", value);
                            }}
                            type="text"
                            value={editForm.titleAr}
                          />
                        </label>
                        <label>
                          <span>{fieldLabel(messages, "startsAt")}</span>
                          <input
                            disabled={rowDisabled}
                            onChange={(event) => {
                              const value = event.target.value;
                              updateEditField("startsAt", value);
                            }}
                            type="datetime-local"
                            value={editForm.startsAt}
                          />
                        </label>
                        <label>
                          <span>{fieldLabel(messages, "closesAt")}</span>
                          <input
                            disabled={rowDisabled}
                            onChange={(event) => {
                              const value = event.target.value;
                              updateEditField("closesAt", value);
                            }}
                            type="datetime-local"
                            value={editForm.closesAt}
                          />
                        </label>
                        <label>
                          <span>
                            {fieldLabel(messages, "softCloseWindowMinutes")}
                          </span>
                          <input
                            disabled={rowDisabled}
                            onChange={(event) => {
                              const value = event.target.value;
                              updateEditField("softCloseWindowMinutes", value);
                            }}
                            type="number"
                            value={editForm.softCloseWindowMinutes}
                          />
                        </label>
                        <label>
                          <span>
                            {fieldLabel(messages, "softCloseExtensionMinutes")}
                          </span>
                          <input
                            disabled={rowDisabled}
                            onChange={(event) => {
                              const value = event.target.value;
                              updateEditField(
                                "softCloseExtensionMinutes",
                                value,
                              );
                            }}
                            type="number"
                            value={editForm.softCloseExtensionMinutes}
                          />
                        </label>
                        <label>
                          <span>
                            {fieldLabel(messages, "softCloseMaximumExtensions")}
                          </span>
                          <input
                            disabled={rowDisabled}
                            onChange={(event) => {
                              const value = event.target.value;
                              updateEditField(
                                "softCloseMaximumExtensions",
                                value,
                              );
                            }}
                            type="number"
                            value={editForm.softCloseMaximumExtensions}
                          />
                        </label>
                      </div>
                      <div className="decision-buttons">
                        <button
                          disabled={rowDisabled}
                          onClick={() => {
                            void saveLotEdit(lot.id);
                          }}
                          type="button"
                        >
                          {messages.saveButton}
                        </button>
                        <button
                          className="button-secondary"
                          disabled={rowDisabled}
                          onClick={cancelLotEdit}
                          type="button"
                        >
                          {messages.cancelButton}
                        </button>
                      </div>
                      {editState.status === "error" ? (
                        <p className="m3-live-status is-error">
                          {editState.message}
                        </p>
                      ) : editState.status === "pending" ? (
                        <p className="m3-live-status is-pending">
                          {messages.actionPendingLabel}
                        </p>
                      ) : null}
                    </div>
                  ) : (
                    <div className="decision-buttons">
                      <button
                        disabled={session === null}
                        onClick={() => {
                          startLotEdit(lot);
                        }}
                        type="button"
                      >
                        {messages.editButton}
                      </button>
                    </div>
                  )}
                </article>
              );
            })}
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

function fieldLabel(messages: Messages, name: string): string {
  return (
    messages.lotFormFields.find((field) => field.name === name)?.label ?? name
  );
}

function msToMinutes(valueMs: number | null): string {
  return valueMs === null ? "" : String(Math.round(valueMs / 60_000));
}

function toDatetimeLocal(iso: string): string {
  const date = new Date(iso);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
