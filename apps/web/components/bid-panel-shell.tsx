"use client";

import type { Money } from "@pioneer/contracts";
import { useEffect, useId, useRef, useState } from "react";
import type { ReactNode } from "react";

import type { Locale } from "../i18n/messages";
import {
  classifyRejectionStatus,
  fetchAuthoritativeLotState,
  isBidGateReason,
  isLotLive,
  normalizeBidAck,
  submitPlaceBidCommand,
  type BidPanelState,
} from "../lib/bid-command";
import type { BuyerBidSessionConfig } from "../lib/bid-session";
import { LotSocketClient } from "../lib/lot-socket";
import {
  normalizeProxyAck,
  submitSetProxyBidCommand,
  type ProxyBidPanelState,
} from "../lib/proxy-bid-command";

interface PanelCopy {
  readonly bidNow: string;
  readonly cancel: string;
  readonly confirmBid: string;
  readonly confirmHeading: string;
  readonly confirmProxyBid: string;
  readonly confirmProxyHeading: string;
  readonly connectAccount: string;
  readonly customBidLabel: string;
  readonly customBidPlaceholder: string;
  readonly customMode: string;
  readonly gateReason: Record<string, string>;
  readonly invalidAmount: string;
  readonly maxBidLabel: string;
  readonly newBid: string;
  readonly preparing: string;
  readonly proxyMode: string;
  readonly quickMode: string;
  readonly refreshFailed: string;
  readonly retry: string;
  readonly statusAccepted: string;
  readonly statusClosed: (lifecycle: string) => string;
  readonly statusIdle: string;
  readonly statusOutbid: string;
  readonly statusPending: string;
  readonly statusPendingUnknown: string;
  readonly statusProxyAccepted: string;
  readonly statusProxyNotBidding: string;
  readonly statusProxyOutbid: string;
  readonly statusProxyPending: string;
  readonly statusProxyPendingUnknown: string;
  readonly termsLabel: string;
  readonly viewLot: string;
}

const copy: Record<Locale, PanelCopy> = {
  ar: {
    bidNow: "زايد الآن",
    cancel: "إلغاء",
    confirmBid: "تأكيد المزايدة",
    confirmHeading: "راجع مزايدتك",
    confirmProxyBid: "تعيين الحد الأقصى",
    confirmProxyHeading: "راجع الحد الأقصى لمزايدتك",
    connectAccount: "اتصل بحسابك للمزايدة",
    customBidLabel: "مبلغ مخصص بالدرهم",
    customBidPlaceholder: "561000",
    customMode: "مزايدة مخصصة",
    gateReason: {
      ACCOUNT_RESTRICTED: "حسابك مقيد حالياً. تواصل مع الدعم.",
      DEPOSIT_INSUFFICIENT: "وديعتك الحالية غير كافية لهذا المبلغ.",
      DEPOSIT_REQUIRED: "يلزم إيداع وديعة قبل المزايدة على هذه القطعة.",
      KYC_PENDING: "التحقق من الهوية قيد المراجعة.",
      KYC_REQUIRED: "يلزم التحقق من الهوية قبل المزايدة.",
      PROXY_MAX_TOO_LOW: "يجب أن يكون الحد الأقصى أعلى من الحالي.",
      TERMS_ACCEPTANCE_REQUIRED: "يلزم قبول شروط المزاد قبل المزايدة.",
    },
    invalidAmount: "أدخل مبلغاً صحيحاً بالدرهم.",
    maxBidLabel: "الحد الأقصى للمزايدة بالدرهم",
    newBid: "مزايدة جديدة",
    preparing: "جارٍ تحديث السعر الحالي…",
    proxyMode: "أعلى سعر لدي",
    quickMode: "مزايدة سريعة",
    refreshFailed: "تعذّر تحديث السعر الحالي. حاول مرة أخرى.",
    retry: "إعادة المحاولة",
    statusAccepted: "تم قبول مزايدتك — أنت الأعلى حالياً.",
    statusClosed: (lifecycle) =>
      `هذه القطعة غير متاحة للمزايدة (${lifecycle}).`,
    statusIdle: "جاهز لتقديم شكل الأمر · بانتظار المصادقة ووديعة الأهلية",
    statusOutbid: "تم تسجيل مزايدتك لكن تم تجاوزها فوراً.",
    statusPending: "جارٍ إرسال المزايدة…",
    statusPendingUnknown:
      "لم يصل تأكيد الخادم بعد. لم تُرفض مزايدتك — أعد المحاولة بنفس الأمر.",
    statusProxyAccepted: "الحد الأقصى فعّال — أنت الأعلى حالياً.",
    statusProxyNotBidding: "تم حفظ الحد الأقصى. لا حاجة لمزايدة جديدة الآن.",
    statusProxyOutbid: "تم حفظ الحد الأقصى لكن تم تجاوزك فوراً.",
    statusProxyPending: "جارٍ تعيين الحد الأقصى…",
    statusProxyPendingUnknown:
      "لم يصل تأكيد الخادم بعد. لم يُرفض طلبك — أعد المحاولة بنفس الأمر.",
    termsLabel: "أوافق على شروط هذا المزاد (نسخة المعاينة)",
    viewLot: "عرض السعر الحالي",
  },
  en: {
    bidNow: "Bid now",
    cancel: "Cancel",
    confirmBid: "Confirm bid",
    confirmHeading: "Review your bid",
    confirmProxyBid: "Set maximum bid",
    confirmProxyHeading: "Review your maximum bid",
    connectAccount: "Connect account to bid",
    customBidLabel: "Custom amount AED",
    customBidPlaceholder: "561000",
    customMode: "Custom bid",
    gateReason: {
      ACCOUNT_RESTRICTED:
        "Your account is currently restricted. Contact support.",
      DEPOSIT_INSUFFICIENT:
        "Your current deposit is not enough for this amount.",
      DEPOSIT_REQUIRED: "A deposit is required before bidding on this lot.",
      KYC_PENDING: "Identity verification is still under review.",
      KYC_REQUIRED: "Identity verification is required before bidding.",
      PROXY_MAX_TOO_LOW: "Your maximum must be higher than it is now.",
      TERMS_ACCEPTANCE_REQUIRED: "Accept the auction terms before bidding.",
    },
    invalidAmount: "Enter a valid AED amount.",
    maxBidLabel: "Maximum bid AED",
    newBid: "Place another bid",
    preparing: "Refreshing the current price…",
    proxyMode: "Max bid",
    quickMode: "Quick bid",
    refreshFailed: "Could not refresh the current price. Try again.",
    retry: "Retry",
    statusAccepted: "Bid accepted — you are currently winning.",
    statusClosed: (lifecycle) =>
      `This lot cannot take bids right now (${lifecycle}).`,
    statusIdle:
      "Backend command shape ready · authentication and deposit gate pending",
    statusOutbid: "Your bid was recorded but was immediately outbid.",
    statusPending: "Sending your bid…",
    statusPendingUnknown:
      "No confirmation from the server yet. Your bid was not rejected — retry the same command.",
    statusProxyAccepted: "Your maximum bid is active — you are winning.",
    statusProxyNotBidding: "Maximum bid saved. No new bid was needed.",
    statusProxyOutbid:
      "Your maximum bid was saved but you were immediately outbid.",
    statusProxyPending: "Setting your maximum bid…",
    statusProxyPendingUnknown:
      "No confirmation from the server yet. Your maximum was not rejected — retry the same command.",
    termsLabel: "I accept this auction's terms (preview version)",
    viewLot: "View current price",
  },
};

export function BidPanelShell({
  currentBid,
  locale,
  lotId,
  nextBid,
  session: sessionProperty,
}: {
  readonly currentBid: string;
  readonly locale: Locale;
  readonly lotId: string;
  readonly nextBid: string;
  readonly session: BuyerBidSessionConfig | null;
}) {
  const customBidId = useId();
  const termsId = useId();
  const text = copy[locale];

  const [mode, setMode] = useState<"custom" | "proxy" | "quick">("quick");
  const [customAmountText, setCustomAmountText] = useState("");
  const [proxyAmountText, setProxyAmountText] = useState("");
  const [termsChecked, setTermsChecked] = useState(false);
  const [state, setState] = useState<BidPanelState>({ status: "idle" });
  const [proxyState, setProxyState] = useState<ProxyBidPanelState>({
    status: "idle",
  });
  const [beginError, setBeginError] = useState<string | null>(null);
  // `undefined` = no realtime update received yet (show the static server-rendered
  // prop); `null` currentBid = the socket confirmed there is genuinely no bid yet.
  const [liveCurrentBidFils, setLiveCurrentBidFils] = useState<
    number | null | undefined
  >(undefined);
  const [liveNextMinimumBidFils, setLiveNextMinimumBidFils] = useState<
    number | undefined
  >(undefined);
  const attemptRef = useRef<{
    readonly amount: Money;
    readonly commandId: string;
  } | null>(null);
  const proxyAttemptRef = useRef<{
    readonly commandId: string;
    readonly maximum: Money;
  } | null>(null);
  const socketClientRef = useRef<LotSocketClient | null>(null);

  // Hooks must run unconditionally on every render (React rules of hooks),
  // so this effect -- unlike the rest of the component's logic -- sits
  // above the `sessionProperty === null` early return and checks for null
  // itself. Only one live connection is ever open per mounted panel;
  // `dispose()` unsubscribes and disconnects on unmount or lot/session change.
  useEffect(() => {
    if (sessionProperty === null) {
      return undefined;
    }
    const client = new LotSocketClient(sessionProperty, lotId, {
      onBidAccepted: (event) => {
        setLiveCurrentBidFils(event.data.currentBid.amountFils);
        setLiveNextMinimumBidFils(event.data.nextMinimumBid.amountFils);
      },
      onSnapshot: (snapshot) => {
        setLiveCurrentBidFils(snapshot.state.currentBid?.amountFils ?? null);
        setLiveNextMinimumBidFils(snapshot.state.nextMinimumBid.amountFils);
      },
    });
    client.connect();
    socketClientRef.current = client;
    return () => {
      client.dispose();
      socketClientRef.current = null;
    };
  }, [sessionProperty, lotId]);

  const displayCurrentBid =
    liveCurrentBidFils === undefined || liveCurrentBidFils === null
      ? currentBid
      : formatAedAmount(liveCurrentBidFils, locale);
  const displayNextBid =
    liveNextMinimumBidFils === undefined
      ? nextBid
      : formatAedAmount(liveNextMinimumBidFils, locale);

  if (sessionProperty === null) {
    return (
      <ShellFrame lotId={lotId}>
        <StatusRegion text={text.statusIdle} tone="idle" />
        <CostStack currentBid={displayCurrentBid} nextBid={displayNextBid} />
        <button className="m3-bid-button large" disabled type="button">
          {text.connectAccount}
        </button>
      </ShellFrame>
    );
  }

  // Rebind as a `const` so the null-check narrowing above holds inside the
  // nested closures below -- TypeScript does not propagate narrowing of a
  // function *parameter* into nested function bodies, only of `const`
  // bindings (parameters are treated as potentially reassignable).
  const session = sessionProperty;

  const bothIdle =
    (state.status === "idle" || state.status === "closed") &&
    (proxyState.status === "idle" || proxyState.status === "closed");

  async function beginBidAttempt() {
    setBeginError(null);

    let customAmount: Money | null = null;
    if (mode === "custom") {
      customAmount = parseAedAmount(customAmountText);
      if (customAmount === null) {
        setBeginError(text.invalidAmount);
        return;
      }
    }

    const authoritative = await fetchAuthoritativeLotState(session, lotId);
    if (authoritative === null) {
      setBeginError(text.refreshFailed);
      return;
    }
    if (!isLotLive(authoritative.lifecycle)) {
      setState({ lifecycle: authoritative.lifecycle, status: "closed" });
      return;
    }

    setState({
      amount: customAmount ?? authoritative.nextMinimumBid,
      closesAt: authoritative.closesAt,
      commandId: cryptoRandomUuid(),
      lifecycle: authoritative.lifecycle,
      nextMinimumBid: authoritative.nextMinimumBid,
      status: "confirming",
      termsAccepted: termsChecked,
    });
  }

  async function confirmBidAttempt(
    confirming: Extract<BidPanelState, { status: "confirming" }>,
  ) {
    if (!termsChecked) {
      return;
    }
    attemptRef.current = {
      amount: confirming.amount,
      commandId: confirming.commandId,
    };
    setState({
      amount: confirming.amount,
      commandId: confirming.commandId,
      status: "pending",
      unknown: false,
    });
    await runSubmit(confirming.amount, confirming.commandId);
  }

  async function retryPendingAttempt() {
    const attempt = attemptRef.current;
    if (attempt === null) {
      return;
    }
    setState({
      amount: attempt.amount,
      commandId: attempt.commandId,
      status: "pending",
      unknown: false,
    });
    await runSubmit(attempt.amount, attempt.commandId);
  }

  /**
   * Prefers the live socket connection when it's up (`docs/api-contracts.md`
   * §4: "Socket commands are preferred while connected"); falls back to the
   * REST path when there's no connection or the socket attempt itself times
   * out unresolved. Either transport's acknowledgement is reduced to the
   * same `NormalizedBidOutcome` shape so the ACCEPTED/REJECTED ->
   * `BidPanelState` classification below only has to exist once.
   */
  async function runSubmit(amount: Money, commandId: string) {
    const socketClient = socketClientRef.current;
    if (socketClient !== null && socketClient.isConnected()) {
      const socketOutcome = await socketClient.placeBid({
        amount,
        commandId,
        expectedSequence: 0,
      });
      if (socketOutcome.outcome === "ack") {
        applyNormalizedOutcome(
          amount,
          commandId,
          normalizeBidAck(socketOutcome.ack),
        );
        return;
      }
      // "not-connected" (lost between the isConnected() check and emit) or
      // "unknown" (ack timed out): fall through to REST rather than leaving
      // the bid attempt stranded.
    }

    const result = await submitPlaceBidCommand({
      amount,
      commandId,
      correlationId: cryptoRandomUuid(),
      expectedSequence: 0,
      lotId,
      session,
    });

    if (result.outcome === "unknown") {
      setState({ amount, commandId, status: "pending", unknown: true });
      return;
    }

    applyNormalizedOutcome(amount, commandId, normalizeBidAck(result.ack));
  }

  function applyNormalizedOutcome(
    amount: Money,
    commandId: string,
    normalized: ReturnType<typeof normalizeBidAck>,
  ) {
    if (normalized === null) {
      // Ack parsed structurally but didn't carry the fields its own
      // `status` requires -- treat like an unparseable response: safe to
      // retry the same command, never silently drop the outcome.
      setState({ amount, commandId, status: "pending", unknown: true });
      return;
    }
    if (normalized.kind === "accepted") {
      if (normalized.myBidStatus === "OUTBID") {
        setState({
          amount,
          closesAt: normalized.closesAt,
          currentBid: normalized.currentBid,
          nextMinimumBid: normalized.nextMinimumBid,
          status: "outbid",
        });
        return;
      }
      setState({
        amount,
        closesAt: normalized.closesAt,
        currentBid: normalized.currentBid,
        extended: normalized.extended,
        nextMinimumBid: normalized.nextMinimumBid,
        status: "accepted",
      });
      return;
    }

    const classified = classifyRejectionStatus(normalized.code);
    if (classified === "closed") {
      setState({ lifecycle: "CLOSED", status: "closed" });
      return;
    }
    if (classified === "gated" && isBidGateReason(normalized.code)) {
      setState({
        amount,
        message: text.gateReason[normalized.code] ?? normalized.message,
        reason: normalized.code,
        status: "gated",
      });
      return;
    }
    setState({
      amount,
      code: normalized.code,
      latest: normalized.latest,
      message: normalized.message,
      retryable: normalized.retryable,
      status: "rejected",
    });
  }

  async function beginProxyAttempt() {
    setBeginError(null);

    const maximum = parseAedAmount(proxyAmountText);
    if (maximum === null) {
      setBeginError(text.invalidAmount);
      return;
    }

    const authoritative = await fetchAuthoritativeLotState(session, lotId);
    if (authoritative === null) {
      setBeginError(text.refreshFailed);
      return;
    }
    if (!isLotLive(authoritative.lifecycle)) {
      setProxyState({ lifecycle: authoritative.lifecycle, status: "closed" });
      return;
    }

    setProxyState({
      closesAt: authoritative.closesAt,
      commandId: cryptoRandomUuid(),
      lifecycle: authoritative.lifecycle,
      maximum,
      nextMinimumBid: authoritative.nextMinimumBid,
      status: "confirming",
    });
  }

  async function confirmProxyAttempt(
    confirming: Extract<ProxyBidPanelState, { status: "confirming" }>,
  ) {
    if (!termsChecked) {
      return;
    }
    proxyAttemptRef.current = {
      commandId: confirming.commandId,
      maximum: confirming.maximum,
    };
    setProxyState({
      commandId: confirming.commandId,
      maximum: confirming.maximum,
      status: "pending",
      unknown: false,
    });
    await runProxySubmit(confirming.maximum, confirming.commandId);
  }

  async function retryPendingProxyAttempt() {
    const attempt = proxyAttemptRef.current;
    if (attempt === null) {
      return;
    }
    setProxyState({
      commandId: attempt.commandId,
      maximum: attempt.maximum,
      status: "pending",
      unknown: false,
    });
    await runProxySubmit(attempt.maximum, attempt.commandId);
  }

  async function runProxySubmit(maximum: Money, commandId: string) {
    const socketClient = socketClientRef.current;
    if (socketClient !== null && socketClient.isConnected()) {
      const socketOutcome = await socketClient.setProxyBid({
        commandId,
        expectedSequence: 0,
        maximum,
      });
      if (socketOutcome.outcome === "ack") {
        applyNormalizedProxyOutcome(
          maximum,
          commandId,
          normalizeProxyAck(socketOutcome.ack),
        );
        return;
      }
    }

    const result = await submitSetProxyBidCommand({
      commandId,
      correlationId: cryptoRandomUuid(),
      expectedSequence: 0,
      lotId,
      maximum,
      session,
    });

    if (result.outcome === "unknown") {
      setProxyState({ commandId, maximum, status: "pending", unknown: true });
      return;
    }

    applyNormalizedProxyOutcome(
      maximum,
      commandId,
      normalizeProxyAck(result.ack),
    );
  }

  function applyNormalizedProxyOutcome(
    maximum: Money,
    commandId: string,
    normalized: ReturnType<typeof normalizeProxyAck>,
  ) {
    if (normalized === null) {
      // Ack parsed structurally but didn't carry the fields its own
      // `status` requires -- safe to retry the same command, same fallback
      // as the manual-bid path.
      setProxyState({ commandId, maximum, status: "pending", unknown: true });
      return;
    }

    if (normalized.kind === "accepted") {
      if (normalized.myBidStatus === "NOT_BIDDING") {
        setProxyState({
          activeProxyMaximum: normalized.activeProxyMaximum,
          maximum,
          status: "not-bidding",
        });
        return;
      }
      const shared = {
        activeProxyMaximum: normalized.activeProxyMaximum,
        closesAt: normalized.closesAt,
        currentBid: normalized.currentBid,
        maximum,
        nextMinimumBid: normalized.nextMinimumBid,
      };
      setProxyState(
        normalized.myBidStatus === "OUTBID"
          ? { ...shared, status: "outbid" }
          : { ...shared, status: "accepted" },
      );
      return;
    }

    const classified = classifyRejectionStatus(normalized.code);
    if (classified === "closed") {
      setProxyState({ lifecycle: "CLOSED", status: "closed" });
      return;
    }
    if (classified === "gated" && isBidGateReason(normalized.code)) {
      setProxyState({
        maximum,
        message: text.gateReason[normalized.code] ?? normalized.message,
        reason: normalized.code,
        status: "gated",
      });
      return;
    }
    setProxyState({
      code: normalized.code,
      latest: normalized.latest,
      maximum,
      message: normalized.message,
      retryable: normalized.retryable,
      status: "rejected",
    });
  }

  function resetToIdle() {
    attemptRef.current = null;
    proxyAttemptRef.current = null;
    setTermsChecked(false);
    setBeginError(null);
    setState({ status: "idle" });
    setProxyState({ status: "idle" });
  }

  return (
    <ShellFrame lotId={lotId}>
      <StatusRegionForState
        beginError={beginError}
        proxyState={proxyState}
        state={state}
        text={text}
      />
      <CostStack currentBid={displayCurrentBid} nextBid={displayNextBid} />

      {bothIdle ? (
        <>
          <div className="m3-bid-mode-row">
            <button
              className={mode === "quick" ? "is-selected" : ""}
              type="button"
              onClick={() => {
                setMode("quick");
              }}
            >
              {text.quickMode}
            </button>
            <button
              className={mode === "custom" ? "is-selected" : ""}
              type="button"
              onClick={() => {
                setMode("custom");
              }}
            >
              {text.customMode}
            </button>
            <button
              className={mode === "proxy" ? "is-selected" : ""}
              type="button"
              onClick={() => {
                setMode("proxy");
              }}
            >
              {text.proxyMode}
            </button>
          </div>
          {mode === "proxy" ? (
            <>
              <label className="m3-custom-bid-field" htmlFor={customBidId}>
                {text.maxBidLabel}
                <input
                  id={customBidId}
                  inputMode="numeric"
                  placeholder={text.customBidPlaceholder}
                  value={proxyAmountText}
                  onChange={(event) => {
                    setProxyAmountText(event.target.value);
                  }}
                />
              </label>
              <button
                className="m3-bid-button large"
                type="button"
                onClick={() => {
                  void beginProxyAttempt();
                }}
              >
                {proxyState.status === "closed" ? text.viewLot : text.proxyMode}
              </button>
            </>
          ) : (
            <>
              <label className="m3-custom-bid-field" htmlFor={customBidId}>
                {text.customBidLabel}
                <input
                  disabled={mode !== "custom"}
                  id={customBidId}
                  inputMode="numeric"
                  placeholder={text.customBidPlaceholder}
                  value={customAmountText}
                  onChange={(event) => {
                    setCustomAmountText(event.target.value);
                  }}
                />
              </label>
              <button
                className="m3-bid-button large"
                type="button"
                onClick={() => {
                  void beginBidAttempt();
                }}
              >
                {state.status === "closed" ? text.viewLot : text.bidNow}
              </button>
            </>
          )}
        </>
      ) : null}

      {state.status === "confirming" ? (
        <div className="m3-bid-confirm">
          <p>{text.confirmHeading}</p>
          <strong dir="ltr">
            {formatAedAmount(state.amount.amountFils, locale)}
          </strong>
          <label htmlFor={termsId}>
            <input
              checked={termsChecked}
              id={termsId}
              type="checkbox"
              onChange={(event) => {
                setTermsChecked(event.target.checked);
              }}
            />
            {text.termsLabel}
          </label>
          <div className="m3-bid-mode-row">
            <button
              className="m3-bid-button"
              type="button"
              onClick={resetToIdle}
            >
              {text.cancel}
            </button>
            <button
              className="m3-bid-button large"
              disabled={!termsChecked}
              type="button"
              onClick={() => {
                void confirmBidAttempt(state);
              }}
            >
              {text.confirmBid}
            </button>
          </div>
        </div>
      ) : null}

      {proxyState.status === "confirming" ? (
        <div className="m3-bid-confirm">
          <p>{text.confirmProxyHeading}</p>
          <strong dir="ltr">
            {formatAedAmount(proxyState.maximum.amountFils, locale)}
          </strong>
          <label htmlFor={termsId}>
            <input
              checked={termsChecked}
              id={termsId}
              type="checkbox"
              onChange={(event) => {
                setTermsChecked(event.target.checked);
              }}
            />
            {text.termsLabel}
          </label>
          <div className="m3-bid-mode-row">
            <button
              className="m3-bid-button"
              type="button"
              onClick={resetToIdle}
            >
              {text.cancel}
            </button>
            <button
              className="m3-bid-button large"
              disabled={!termsChecked}
              type="button"
              onClick={() => {
                void confirmProxyAttempt(proxyState);
              }}
            >
              {text.confirmProxyBid}
            </button>
          </div>
        </div>
      ) : null}

      {state.status === "pending" && state.unknown ? (
        <button
          className="m3-bid-button large"
          type="button"
          onClick={() => {
            void retryPendingAttempt();
          }}
        >
          {text.retry}
        </button>
      ) : null}

      {proxyState.status === "pending" && proxyState.unknown ? (
        <button
          className="m3-bid-button large"
          type="button"
          onClick={() => {
            void retryPendingProxyAttempt();
          }}
        >
          {text.retry}
        </button>
      ) : null}

      {state.status === "accepted" ||
      state.status === "outbid" ||
      state.status === "rejected" ||
      state.status === "gated" ||
      proxyState.status === "accepted" ||
      proxyState.status === "outbid" ||
      proxyState.status === "not-bidding" ||
      proxyState.status === "rejected" ||
      proxyState.status === "gated" ? (
        <button
          className="m3-bid-button large"
          type="button"
          onClick={resetToIdle}
        >
          {text.newBid}
        </button>
      ) : null}
    </ShellFrame>
  );
}

function ShellFrame({
  children,
  lotId,
}: {
  readonly children: ReactNode;
  readonly lotId: string;
}) {
  return (
    <section
      aria-label="Bid panel shell"
      className="m3-live-bid-shell"
      data-command-shape="POST /api/v1/lots/:lotId/bids"
      data-lot-id={lotId}
    >
      {children}
    </section>
  );
}

function CostStack({
  currentBid,
  nextBid,
}: {
  readonly currentBid: string;
  readonly nextBid: string;
}) {
  return (
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
  );
}

function StatusRegion({
  text,
  tone,
}: {
  readonly text: string;
  readonly tone: "danger" | "idle" | "success" | "warning";
}) {
  return (
    <div
      aria-live="polite"
      className={`m3-live-bid-status is-${tone}`}
      role="status"
    >
      {text}
    </div>
  );
}

/**
 * Only one of `state`/`proxyState` is ever mid-flow at a time (the mode
 * tabs in the main render are hidden once either leaves "idle"/"closed"),
 * so this prefers whichever one is not idle; if both are idle it shows the
 * manual-bid idle/error copy, which also covers the shared `beginError`
 * (set by either `beginBidAttempt` or `beginProxyAttempt`).
 */
function StatusRegionForState({
  beginError,
  proxyState,
  state,
  text,
}: {
  readonly beginError: string | null;
  readonly proxyState: ProxyBidPanelState;
  readonly state: BidPanelState;
  readonly text: PanelCopy;
}) {
  if (proxyState.status !== "idle" && proxyState.status !== "closed") {
    return <ProxyStatusRegion proxyState={proxyState} text={text} />;
  }
  if (proxyState.status === "closed" && state.status === "idle") {
    return (
      <StatusRegion
        text={text.statusClosed(proxyState.lifecycle)}
        tone="idle"
      />
    );
  }

  switch (state.status) {
    case "idle": {
      return (
        <StatusRegion
          text={beginError ?? text.statusIdle}
          tone={beginError === null ? "idle" : "warning"}
        />
      );
    }
    case "confirming": {
      return <StatusRegion text={text.preparing} tone="idle" />;
    }
    case "pending": {
      return (
        <StatusRegion
          text={state.unknown ? text.statusPendingUnknown : text.statusPending}
          tone={state.unknown ? "warning" : "idle"}
        />
      );
    }
    case "accepted": {
      return <StatusRegion text={text.statusAccepted} tone="success" />;
    }
    case "outbid": {
      return <StatusRegion text={text.statusOutbid} tone="danger" />;
    }
    case "rejected": {
      return <StatusRegion text={state.message} tone="danger" />;
    }
    case "gated": {
      return <StatusRegion text={state.message} tone="warning" />;
    }
    case "closed": {
      return (
        <StatusRegion text={text.statusClosed(state.lifecycle)} tone="idle" />
      );
    }
    default: {
      return null;
    }
  }
}

function ProxyStatusRegion({
  proxyState,
  text,
}: {
  readonly proxyState: ProxyBidPanelState;
  readonly text: PanelCopy;
}) {
  switch (proxyState.status) {
    case "confirming": {
      return <StatusRegion text={text.preparing} tone="idle" />;
    }
    case "pending": {
      return (
        <StatusRegion
          text={
            proxyState.unknown
              ? text.statusProxyPendingUnknown
              : text.statusProxyPending
          }
          tone={proxyState.unknown ? "warning" : "idle"}
        />
      );
    }
    case "accepted": {
      return <StatusRegion text={text.statusProxyAccepted} tone="success" />;
    }
    case "outbid": {
      return <StatusRegion text={text.statusProxyOutbid} tone="danger" />;
    }
    case "not-bidding": {
      return <StatusRegion text={text.statusProxyNotBidding} tone="success" />;
    }
    case "rejected": {
      return <StatusRegion text={proxyState.message} tone="danger" />;
    }
    case "gated": {
      return <StatusRegion text={proxyState.message} tone="warning" />;
    }
    default: {
      return null;
    }
  }
}

function parseAedAmount(value: string): Money | null {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }
  const parsedAed = Number(trimmed);
  if (!Number.isFinite(parsedAed) || parsedAed <= 0) {
    return null;
  }
  return { amountFils: Math.round(parsedAed * 100), currency: "AED" };
}

function cryptoRandomUuid(): string {
  return crypto.randomUUID();
}

/** Matches `formatAed` in `apps/web/lib/home-data.ts` and `apps/admin/lib/admin-data.ts`. */
function formatAedAmount(amountFils: number, locale: Locale): string {
  return new Intl.NumberFormat(locale === "ar" ? "ar-AE" : "en-AE", {
    currency: "AED",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(amountFils / 100);
}
