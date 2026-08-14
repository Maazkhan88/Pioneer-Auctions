"use client";

import { useState } from "react";

import type { Messages } from "../i18n/messages";
import {
  submitBulkImportLots,
  type BulkImportLotsResponse,
} from "../lib/admin-actions";
import type { AdminSessionConfig } from "../lib/admin-session";

type PanelState =
  | { readonly status: "idle" }
  | { readonly status: "pending" }
  | { readonly status: "parse-error" }
  | { readonly status: "error"; readonly message: string }
  | { readonly status: "result"; readonly response: BulkImportLotsResponse };

interface BulkImportPanelProperties {
  readonly messages: Messages;
  readonly session: AdminSessionConfig | null;
}

export function BulkImportPanel({
  messages,
  session,
}: BulkImportPanelProperties) {
  const [rowsText, setRowsText] = useState("");
  const [state, setState] = useState<PanelState>({ status: "idle" });

  function parseRows(): readonly unknown[] | null {
    try {
      const parsed: unknown = JSON.parse(rowsText);
      return Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  async function run(dryRun: boolean) {
    if (session === null) {
      return;
    }
    const rows = parseRows();
    if (rows === null || rows.length === 0) {
      setState({ status: "parse-error" });
      return;
    }

    setState({ status: "pending" });
    try {
      const response = await submitBulkImportLots({
        apiBaseUrl: session.apiBaseUrl,
        correlationId: crypto.randomUUID(),
        dryRun,
        rows,
        testAccountId: session.testAccountId,
      });
      setState({ response, status: "result" });
    } catch (error) {
      setState({
        message: error instanceof Error ? error.message : "failed",
        status: "error",
      });
    }
  }

  const disabled = session === null || state.status === "pending";

  return (
    <div className="lot-form">
      <h3>{messages.bulkImportTitle}</h3>
      <label>
        <span>{messages.bulkImportRowsLabel}</span>
        <textarea
          disabled={disabled}
          onChange={(event) => {
            setRowsText(event.target.value);
          }}
          placeholder={messages.bulkImportPlaceholder}
          rows={8}
          value={rowsText}
        />
      </label>
      <div className="decision-buttons">
        <button
          disabled={disabled}
          onClick={() => {
            void run(true);
          }}
          type="button"
        >
          {messages.bulkImportPreviewButton}
        </button>
        <button
          disabled={disabled}
          onClick={() => {
            void run(false);
          }}
          type="button"
        >
          {messages.bulkImportCommitButton}
        </button>
      </div>

      {session === null ? (
        <p>{messages.staticPreviewActionNotice}</p>
      ) : state.status === "pending" ? (
        <p className="m3-live-status is-pending">
          {messages.actionPendingLabel}
        </p>
      ) : state.status === "parse-error" ? (
        <p className="m3-live-status is-error">
          {messages.bulkImportParseError}
        </p>
      ) : state.status === "error" ? (
        <p className="m3-live-status is-error">{state.message}</p>
      ) : state.status === "result" ? (
        <div className="bulk-import-results">
          <p
            className={`m3-live-status ${state.response.committed ? "is-success" : "is-pending"}`}
          >
            {state.response.committed
              ? messages.bulkImportCommittedLabel
              : messages.bulkImportNotCommittedLabel}
          </p>
          <ul>
            {state.response.results.map((row) => (
              <li key={row.index}>
                #{row.index}: {row.ok ? "OK" : JSON.stringify(row.errors)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
