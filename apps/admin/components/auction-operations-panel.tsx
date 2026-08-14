"use client";

import { useState } from "react";

import type { AdminAuctionItem, Locale, Messages } from "../i18n/messages";
import {
  submitAuctionControl,
  submitCreateAuction,
  submitUpdateAuction,
} from "../lib/admin-actions";
import type { AdminSessionConfig } from "../lib/admin-session";

type ControlType = "cancel" | "pause" | "resume";

type ActionState =
  | { readonly status: "idle" }
  | { readonly status: "pending" }
  | { readonly status: "error"; readonly message: string }
  | { readonly status: "done" };

interface EditFormState {
  readonly closesAt: string;
  readonly startsAt: string;
  readonly titleAr: string;
  readonly titleEn: string;
}

const NON_CANCELLABLE_LIFECYCLES = new Set(["CANCELLED", "CLOSED"]);

interface AuctionOperationsPanelProperties {
  readonly initialAuctions: readonly AdminAuctionItem[];
  readonly locale: Locale;
  readonly messages: Messages;
  readonly session: AdminSessionConfig | null;
}

export function AuctionOperationsPanel({
  initialAuctions,
  locale,
  messages,
  session,
}: AuctionOperationsPanelProperties) {
  const [auctions, setAuctions] = useState(initialAuctions);
  const [reasonById, setReasonById] = useState<Record<string, string>>({});
  const [noteById, setNoteById] = useState<Record<string, string>>({});
  const [controlStateById, setControlStateById] = useState<
    Record<string, ActionState>
  >({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditFormState>({
    closesAt: "",
    startsAt: "",
    titleAr: "",
    titleEn: "",
  });
  const [editStateById, setEditStateById] = useState<
    Record<string, ActionState>
  >({});
  const [createForm, setCreateForm] = useState({
    closesAt: "",
    startsAt: "",
    titleAr: "",
    titleEn: "",
  });
  const [createState, setCreateState] = useState<ActionState>({
    status: "idle",
  });

  function startEdit(auction: AdminAuctionItem) {
    setEditingId(auction.id);
    setEditForm({
      closesAt: toDatetimeLocal(auction.closesAt),
      startsAt: toDatetimeLocal(auction.startsAt),
      titleAr: auction.titleAr,
      titleEn: auction.titleEn,
    });
  }

  function cancelEdit() {
    setEditingId(null);
  }

  async function saveEdit(auctionId: string) {
    if (session === null) {
      return;
    }
    if (
      editForm.titleEn.trim().length === 0 ||
      editForm.titleAr.trim().length === 0 ||
      editForm.startsAt.length === 0 ||
      editForm.closesAt.length === 0
    ) {
      setEditStateById((current) => ({
        ...current,
        [auctionId]: { message: messages.formValidationError, status: "error" },
      }));
      return;
    }
    const startsAtIso = new Date(editForm.startsAt).toISOString();
    const closesAtIso = new Date(editForm.closesAt).toISOString();
    if (new Date(startsAtIso) >= new Date(closesAtIso)) {
      setEditStateById((current) => ({
        ...current,
        [auctionId]: { message: messages.formValidationError, status: "error" },
      }));
      return;
    }

    setEditStateById((current) => ({
      ...current,
      [auctionId]: { status: "pending" },
    }));
    try {
      const updated = await submitUpdateAuction({
        apiBaseUrl: session.apiBaseUrl,
        auctionId,
        closesAt: closesAtIso,
        correlationId: crypto.randomUUID(),
        startsAt: startsAtIso,
        testAccountId: session.testAccountId,
        titleAr: editForm.titleAr.trim(),
        titleEn: editForm.titleEn.trim(),
      });
      setAuctions((current) =>
        current.map((entry) =>
          entry.id === auctionId
            ? {
                ...entry,
                closesAt: updated.closesAt,
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
        [auctionId]: { status: "done" },
      }));
      setEditingId(null);
    } catch (error) {
      setEditStateById((current) => ({
        ...current,
        [auctionId]: {
          message: error instanceof Error ? error.message : "failed",
          status: "error",
        },
      }));
    }
  }

  async function runControl(auction: AdminAuctionItem, type: ControlType) {
    if (session === null) {
      return;
    }
    const reason = (reasonById[auction.id] ?? "").trim();
    if (reason.length === 0) {
      setControlStateById((current) => ({
        ...current,
        [auction.id]: {
          message: messages.formValidationError,
          status: "error",
        },
      }));
      return;
    }

    setControlStateById((current) => ({
      ...current,
      [auction.id]: { status: "pending" },
    }));

    try {
      const note = (noteById[auction.id] ?? "").trim();
      const result = await submitAuctionControl({
        apiBaseUrl: session.apiBaseUrl,
        auctionId: auction.id,
        correlationId: crypto.randomUUID(),
        reason,
        testAccountId: session.testAccountId,
        type,
        ...(note.length > 0 ? { note } : {}),
      });
      setAuctions((current) =>
        current.map((entry) =>
          entry.id === auction.id
            ? { ...entry, lifecycle: result.lifecycle }
            : entry,
        ),
      );
      setControlStateById((current) => ({
        ...current,
        [auction.id]: { status: "done" },
      }));
    } catch (error) {
      setControlStateById((current) => ({
        ...current,
        [auction.id]: {
          message: error instanceof Error ? error.message : "failed",
          status: "error",
        },
      }));
    }
  }

  async function runCreate() {
    if (session === null) {
      return;
    }
    const { closesAt, startsAt, titleAr, titleEn } = createForm;
    if (
      titleEn.trim().length === 0 ||
      titleAr.trim().length === 0 ||
      startsAt.length === 0 ||
      closesAt.length === 0
    ) {
      setCreateState({
        message: messages.formValidationError,
        status: "error",
      });
      return;
    }
    const startsAtIso = new Date(startsAt).toISOString();
    const closesAtIso = new Date(closesAt).toISOString();
    if (new Date(startsAtIso) >= new Date(closesAtIso)) {
      setCreateState({
        message: messages.formValidationError,
        status: "error",
      });
      return;
    }

    setCreateState({ status: "pending" });
    try {
      const created = await submitCreateAuction({
        apiBaseUrl: session.apiBaseUrl,
        closesAt: closesAtIso,
        correlationId: crypto.randomUUID(),
        startsAt: startsAtIso,
        testAccountId: session.testAccountId,
        titleAr: titleAr.trim(),
        titleEn: titleEn.trim(),
      });
      setAuctions((current) => [
        ...current,
        {
          closesAt: created.closesAt,
          id: created.id,
          lifecycle: created.lifecycle,
          startsAt: created.startsAt,
          title: locale === "ar" ? created.titleAr : created.titleEn,
          titleAr: created.titleAr,
          titleEn: created.titleEn,
        },
      ]);
      setCreateForm({ closesAt: "", startsAt: "", titleAr: "", titleEn: "" });
      setCreateState({ status: "done" });
    } catch (error) {
      setCreateState({
        message: error instanceof Error ? error.message : "failed",
        status: "error",
      });
    }
  }

  const disabled = session === null;

  return (
    <div className="auction-operations">
      <div className="backend-lots">
        <h3>{messages.auctionListTitle}</h3>
        {auctions.length === 0 ? (
          <p>{messages.auctionListEmpty}</p>
        ) : (
          <div className="lot-list">
            {auctions.map((auction) => {
              const state = controlStateById[auction.id] ?? { status: "idle" };
              const rowDisabled = disabled || state.status === "pending";
              const isEditing = editingId === auction.id;
              const editState = editStateById[auction.id] ?? { status: "idle" };

              return (
                <article className="auction-row" key={auction.id}>
                  <div className="lot-row">
                    <div>
                      <strong>{auction.title}</strong>
                      <span>
                        {formatDateTime(locale, auction.startsAt)} –{" "}
                        {formatDateTime(locale, auction.closesAt)}
                      </span>
                    </div>
                    <div>
                      <strong>{auction.lifecycle}</strong>
                    </div>
                  </div>

                  {isEditing ? (
                    <div className="decision-controls">
                      <div className="form-grid">
                        <label>
                          <span>{messages.auctionTitleEnLabel}</span>
                          <input
                            disabled={rowDisabled}
                            onChange={(event) => {
                              const value = event.target.value;
                              setEditForm((current) => ({
                                ...current,
                                titleEn: value,
                              }));
                            }}
                            type="text"
                            value={editForm.titleEn}
                          />
                        </label>
                        <label>
                          <span>{messages.auctionTitleArLabel}</span>
                          <input
                            disabled={rowDisabled}
                            onChange={(event) => {
                              const value = event.target.value;
                              setEditForm((current) => ({
                                ...current,
                                titleAr: value,
                              }));
                            }}
                            type="text"
                            value={editForm.titleAr}
                          />
                        </label>
                        <label>
                          <span>{messages.auctionStartsAtLabel}</span>
                          <input
                            disabled={rowDisabled}
                            onChange={(event) => {
                              const value = event.target.value;
                              setEditForm((current) => ({
                                ...current,
                                startsAt: value,
                              }));
                            }}
                            type="datetime-local"
                            value={editForm.startsAt}
                          />
                        </label>
                        <label>
                          <span>{messages.auctionClosesAtLabel}</span>
                          <input
                            disabled={rowDisabled}
                            onChange={(event) => {
                              const value = event.target.value;
                              setEditForm((current) => ({
                                ...current,
                                closesAt: value,
                              }));
                            }}
                            type="datetime-local"
                            value={editForm.closesAt}
                          />
                        </label>
                      </div>
                      <div className="decision-buttons">
                        <button
                          disabled={rowDisabled}
                          onClick={() => {
                            void saveEdit(auction.id);
                          }}
                          type="button"
                        >
                          {messages.saveButton}
                        </button>
                        <button
                          className="button-secondary"
                          disabled={rowDisabled}
                          onClick={cancelEdit}
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
                    <div className="decision-controls">
                      <label>
                        <span>{messages.auctionReasonLabel}</span>
                        <input
                          disabled={rowDisabled}
                          onChange={(event) => {
                            const value = event.target.value;
                            setReasonById((current) => ({
                              ...current,
                              [auction.id]: value,
                            }));
                          }}
                          placeholder={messages.auctionReasonPlaceholder}
                          type="text"
                          value={reasonById[auction.id] ?? ""}
                        />
                      </label>
                      <label>
                        <span>{messages.auctionNoteLabel}</span>
                        <input
                          disabled={rowDisabled}
                          onChange={(event) => {
                            const value = event.target.value;
                            setNoteById((current) => ({
                              ...current,
                              [auction.id]: value,
                            }));
                          }}
                          type="text"
                          value={noteById[auction.id] ?? ""}
                        />
                      </label>
                      <div className="decision-buttons">
                        <button
                          disabled={rowDisabled}
                          onClick={() => {
                            startEdit(auction);
                          }}
                          type="button"
                        >
                          {messages.editButton}
                        </button>
                        <button
                          disabled={rowDisabled || auction.lifecycle !== "LIVE"}
                          onClick={() => {
                            void runControl(auction, "pause");
                          }}
                          type="button"
                        >
                          {messages.pauseButton}
                        </button>
                        <button
                          disabled={
                            rowDisabled || auction.lifecycle !== "PAUSED"
                          }
                          onClick={() => {
                            void runControl(auction, "resume");
                          }}
                          type="button"
                        >
                          {messages.resumeButton}
                        </button>
                        <button
                          className="button-secondary"
                          disabled={
                            rowDisabled ||
                            NON_CANCELLABLE_LIFECYCLES.has(auction.lifecycle)
                          }
                          onClick={() => {
                            void runControl(auction, "cancel");
                          }}
                          type="button"
                        >
                          {messages.cancelAuctionButton}
                        </button>
                      </div>
                      {session === null ? (
                        <p>{messages.staticPreviewActionNotice}</p>
                      ) : state.status === "pending" ? (
                        <p className="m3-live-status is-pending">
                          {messages.actionPendingLabel}
                        </p>
                      ) : state.status === "error" ? (
                        <p className="m3-live-status is-error">
                          {state.message}
                        </p>
                      ) : null}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>

      <form
        aria-label={messages.auctionCreateTitle}
        className="lot-form"
        onSubmit={(event) => {
          event.preventDefault();
          void runCreate();
        }}
      >
        <h3>{messages.auctionCreateTitle}</h3>
        <div className="form-grid">
          <label>
            <span>{messages.auctionTitleEnLabel}</span>
            <input
              disabled={disabled}
              onChange={(event) => {
                const value = event.target.value;
                setCreateForm((current) => ({ ...current, titleEn: value }));
              }}
              type="text"
              value={createForm.titleEn}
            />
          </label>
          <label>
            <span>{messages.auctionTitleArLabel}</span>
            <input
              disabled={disabled}
              onChange={(event) => {
                const value = event.target.value;
                setCreateForm((current) => ({ ...current, titleAr: value }));
              }}
              type="text"
              value={createForm.titleAr}
            />
          </label>
          <label>
            <span>{messages.auctionStartsAtLabel}</span>
            <input
              disabled={disabled}
              onChange={(event) => {
                const value = event.target.value;
                setCreateForm((current) => ({ ...current, startsAt: value }));
              }}
              type="datetime-local"
              value={createForm.startsAt}
            />
          </label>
          <label>
            <span>{messages.auctionClosesAtLabel}</span>
            <input
              disabled={disabled}
              onChange={(event) => {
                const value = event.target.value;
                setCreateForm((current) => ({ ...current, closesAt: value }));
              }}
              type="datetime-local"
              value={createForm.closesAt}
            />
          </label>
        </div>
        <div className="form-footer">
          {session === null ? (
            <p>{messages.lotFormStaticNotice}</p>
          ) : createState.status === "pending" ? (
            <p className="m3-live-status is-pending">
              {messages.actionPendingLabel}
            </p>
          ) : createState.status === "error" ? (
            <p className="m3-live-status is-error">{createState.message}</p>
          ) : createState.status === "done" ? (
            <p className="m3-live-status is-success">
              {messages.lotCreateSuccess}
            </p>
          ) : (
            <p />
          )}
          <button
            disabled={disabled || createState.status === "pending"}
            type="submit"
          >
            {messages.auctionCreateButton}
          </button>
        </div>
      </form>
    </div>
  );
}

function formatDateTime(locale: Locale, iso: string): string {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-AE" : "en-AE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

function toDatetimeLocal(iso: string): string {
  const date = new Date(iso);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
