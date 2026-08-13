"use client";

import { useState } from "react";

import type { Messages, QueueItem } from "../i18n/messages";
import {
  submitFinalBidDecision,
  type FinalBidDecisionCommand,
  type FinalBidRejectionReasonCode,
} from "../lib/admin-actions";
import type { AdminSessionConfig } from "../lib/admin-session";

type DecisionState =
  | { readonly status: "idle" }
  | { readonly status: "pending" }
  | { readonly status: "error"; readonly message: string }
  | { readonly decision: "APPROVED" | "REJECTED"; readonly status: "done" };

interface ApprovalQueuePanelProperties {
  readonly initialQueue: readonly QueueItem[];
  readonly messages: Messages;
  readonly session: AdminSessionConfig | null;
}

export function ApprovalQueuePanel({
  initialQueue,
  messages,
  session,
}: ApprovalQueuePanelProperties) {
  const [queue, setQueue] = useState(initialQueue);
  const [reasonByLot, setReasonByLot] = useState<
    Record<string, FinalBidRejectionReasonCode>
  >({});
  const [noteByLot, setNoteByLot] = useState<Record<string, string>>({});
  const [stateByLot, setStateByLot] = useState<Record<string, DecisionState>>(
    {},
  );

  const defaultReasonCode = messages.rejectionReasons[0]?.code ?? "OTHER";

  function stateFor(lotId: string | undefined): DecisionState {
    if (lotId === undefined) {
      return { status: "idle" };
    }
    return stateByLot[lotId] ?? { status: "idle" };
  }

  async function decide(item: QueueItem, type: "approve" | "reject") {
    const lotId = item.lotId;
    const endpoint =
      type === "approve" ? item.approveEndpoint : item.rejectEndpoint;
    if (session === null || lotId === undefined || endpoint === undefined) {
      return;
    }

    setStateByLot((current) => ({
      ...current,
      [lotId]: { status: "pending" },
    }));

    try {
      const runtime = {
        apiBaseUrl: session.apiBaseUrl,
        correlationId: crypto.randomUUID(),
        endpoint,
        testAccountId: session.testAccountId,
      };
      const note = noteByLot[lotId];
      const command: FinalBidDecisionCommand =
        type === "approve"
          ? { ...runtime, type: "approve" }
          : {
              ...runtime,
              reasonCode: reasonByLot[lotId] ?? defaultReasonCode,
              type: "reject",
              ...(note !== undefined && note.trim().length > 0
                ? { note: note.trim() }
                : {}),
            };

      const result = await submitFinalBidDecision(command);
      setStateByLot((current) => ({
        ...current,
        [lotId]: { decision: result.decision, status: "done" },
      }));
      setQueue((current) => current.filter((entry) => entry.lotId !== lotId));
    } catch (error) {
      setStateByLot((current) => ({
        ...current,
        [lotId]: {
          message: error instanceof Error ? error.message : "failed",
          status: "error",
        },
      }));
    }
  }

  return (
    <div className="queue-list">
      {queue.map((item) => {
        const lotId = item.lotId;
        const state = stateFor(lotId);
        const disabled =
          session === null || lotId === undefined || state.status === "pending";

        return (
          <article className="queue-item" key={`${item.title}-${item.meta}`}>
            <div>
              <h3>{item.title}</h3>
              <p>{item.meta}</p>
            </div>
            <div className="queue-meta">
              <strong>{item.amount}</strong>
              <span>{item.sla}</span>
            </div>
            <div className="decision-controls">
              <label>
                <span>{messages.rejectionReasonLabel}</span>
                <select
                  disabled={disabled}
                  onChange={(event) => {
                    if (lotId === undefined) {
                      return;
                    }
                    const code = event.target
                      .value as FinalBidRejectionReasonCode;
                    setReasonByLot((current) => ({
                      ...current,
                      [lotId]: code,
                    }));
                  }}
                  value={
                    lotId !== undefined
                      ? (reasonByLot[lotId] ?? defaultReasonCode)
                      : defaultReasonCode
                  }
                >
                  {messages.rejectionReasons.map((reason) => (
                    <option key={reason.code} value={reason.code}>
                      {reason.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>{messages.decisionNoteLabel}</span>
                <input
                  disabled={disabled}
                  onChange={(event) => {
                    if (lotId === undefined) {
                      return;
                    }
                    const value = event.target.value;
                    setNoteByLot((current) => ({ ...current, [lotId]: value }));
                  }}
                  placeholder={messages.decisionNotePlaceholder}
                  type="text"
                  value={lotId !== undefined ? (noteByLot[lotId] ?? "") : ""}
                />
              </label>
              <div className="decision-buttons">
                <button
                  disabled={disabled}
                  onClick={() => {
                    void decide(item, "approve");
                  }}
                  type="button"
                >
                  {messages.approveButton}
                </button>
                <button
                  className="button-secondary"
                  disabled={disabled}
                  onClick={() => {
                    void decide(item, "reject");
                  }}
                  type="button"
                >
                  {messages.rejectButton}
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
                  {messages.actionErrorLabel}
                </p>
              ) : state.status === "done" ? (
                <p className="m3-live-status is-success">
                  {state.decision === "APPROVED"
                    ? messages.approveSuccessLabel
                    : messages.rejectSuccessLabel}
                </p>
              ) : null}
            </div>
          </article>
        );
      })}
    </div>
  );
}
