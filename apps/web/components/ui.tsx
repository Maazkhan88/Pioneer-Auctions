import type { ReactNode } from "react";
import { formatMoney } from "@pioneer/contracts";

// Primitives

export function Button({
  children,
  onClick,
  variant = "primary",
  disabled = false,
  className = "",
  ariaLabel,
}: {
  readonly children: ReactNode;
  readonly onClick?: () => void;
  readonly variant?: "primary" | "secondary" | "danger" | "success";
  readonly disabled?: boolean;
  readonly className?: string;
  readonly ariaLabel?: string;
}) {
  return (
    <button
      className={`btn btn-${variant} ${className}`}
      onClick={onClick}
      disabled={disabled}
      type="button"
      aria-label={ariaLabel}
    >
      {children}
    </button>
  );
}

export function IconButton({
  icon,
  onClick,
  disabled = false,
  ariaLabel,
  className = "",
}: {
  readonly icon: ReactNode;
  readonly onClick?: () => void;
  readonly disabled?: boolean;
  readonly ariaLabel: string;
  readonly className?: string;
}) {
  return (
    <button
      className={`icon-btn ${className}`}
      onClick={onClick}
      disabled={disabled}
      type="button"
      aria-label={ariaLabel}
    >
      {icon}
    </button>
  );
}

export function Field({
  label,
  value,
  onChange,
  placeholder = "",
  disabled = false,
  error,
  id,
}: {
  readonly label: string;
  readonly value: string;
  readonly onChange?: (val: string) => void;
  readonly placeholder?: string;
  readonly disabled?: boolean;
  readonly error?: string;
  readonly id: string;
}) {
  return (
    <div className={`field-container ${error ? "has-error" : ""}`}>
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
      />
      {error && (
        <span className="field-error" id={`${id}-error`} role="alert">
          {error}
        </span>
      )}
    </div>
  );
}

export function MoneyDisplay({
  amountFils,
  locale,
  className = "",
}: {
  readonly amountFils: number;
  readonly locale: "en" | "ar";
  readonly className?: string;
}) {
  return (
    <bdi className={`money-display ${className}`} dir="ltr">
      {formatMoney(amountFils, locale)}
    </bdi>
  );
}

export function CountdownDisplay({
  hours,
  minutes,
  seconds,
  className = "",
}: {
  readonly hours: number;
  readonly minutes: number;
  readonly seconds: number;
  readonly className?: string;
}) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    <bdi className={`countdown-display ${className}`} dir="ltr">
      {pad(hours)} : {pad(minutes)} : {pad(seconds)}
    </bdi>
  );
}

export function StatusBadge({
  text,
  variant = "info",
  className = "",
}: {
  readonly text: string;
  readonly variant?: "info" | "success" | "warning" | "danger";
  readonly className?: string;
}) {
  return (
    <span className={`badge badge-${variant} ${className}`}>
      {text}
    </span>
  );
}

export function Card({
  children,
  className = "",
}: {
  readonly children: ReactNode;
  readonly className?: string;
}) {
  return <div className={`card ${className}`}>{children}</div>;
}

export function Skeleton({
  className = "",
}: {
  readonly className?: string;
}) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />;
}

// Auction Components

export function LotCard({
  lotNumber,
  title,
  category,
  priceFils,
  timeLeft,
  imageClass,
  locale,
}: {
  readonly lotNumber: string;
  readonly title: string;
  readonly category: string;
  readonly priceFils: number;
  readonly timeLeft: string;
  readonly imageClass: string;
  readonly locale: "en" | "ar";
}) {
  return (
    <article className="lot-card">
      <div className={`lot-image ${imageClass}`}>
        <span>{category}</span>
      </div>
      <div className="lot-card-body">
        <span className="lot-number">{lotNumber}</span>
        <h3>{title}</h3>
        <div className="lot-card-footer">
          <MoneyDisplay amountFils={priceFils} locale={locale} />
          <span className="lot-timer">
            <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
            <bdi dir="ltr">{timeLeft}</bdi>
          </span>
        </div>
      </div>
    </article>
  );
}

export function BidStateBanner({
  status,
  message,
}: {
  readonly status: "winning" | "outbid";
  readonly message: string;
}) {
  return (
    <div className={`bid-state-banner state-${status}`} role="status">
      <span className="banner-icon">
        {status === "winning" ? (
          <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        ) : (
          <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        )}
      </span>
      <span>{message}</span>
    </div>
  );
}

export function BidCTA({
  nextBidFils,
  incrementFils,
  onClick,
  disabled = false,
  locale,
  bidText = "Bid",
}: {
  readonly nextBidFils: number;
  readonly incrementFils: number;
  readonly onClick?: () => void;
  readonly disabled?: boolean;
  readonly locale: "en" | "ar";
  readonly bidText?: string;
}) {
  return (
    <div className="bid-cta-container">
      <button
        className="bid-button"
        onClick={onClick}
        disabled={disabled}
        type="button"
      >
        <span>
          {bidText} <MoneyDisplay amountFils={nextBidFils} locale={locale} />
        </span>
        <svg className="icon icon-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M5 12h14M12 5l7 7-7 7" />
        </svg>
      </button>
      <p className="fee-note">
        {locale === "en"
          ? `Next bid includes a AED ${(incrementFils / 100).toLocaleString()} increment.`
          : `يُضاف للطلب التالي زيادة بمبلغ ${(incrementFils / 100).toLocaleString()} د.إ.`}
      </p>
    </div>
  );
}

export function DepositChip({
  eligible,
  depositAmountFils,
  locale,
}: {
  readonly eligible: boolean;
  readonly depositAmountFils: number;
  readonly locale: "en" | "ar";
}) {
  return (
    <div className={`deposit-chip ${eligible ? "eligible" : "ineligible"}`}>
      <span className="dot" />
      <span>
        {locale === "en"
          ? eligible
            ? "Deposit eligible"
            : `Required Deposit: `
          : eligible
            ? "مؤهل للمزايدة"
            : `الضمان المطلوب: `}
        {!eligible && <MoneyDisplay amountFils={depositAmountFils} locale={locale} />}
      </span>
    </div>
  );
}

export function FeeBreakdown({
  hammerPriceFils,
  buyerPremiumFils,
  vatFils,
  locale,
}: {
  readonly hammerPriceFils: number;
  readonly buyerPremiumFils: number;
  readonly vatFils: number;
  readonly locale: "en" | "ar";
}) {
  const totalFils = hammerPriceFils + buyerPremiumFils + vatFils;
  const labels = {
    en: { hammer: "Hammer Price", premium: "Buyer Premium (10%)", vat: "VAT (5%)", total: "Total Amount" },
    ar: { hammer: "سعر المطرقة", premium: "عمولة المشتري (10%)", vat: "ضريبة القيمة المضافة (5%)", total: "المبلغ الإجمالي" },
  }[locale];

  return (
    <div className="fee-breakdown">
      <div className="row">
        <span>{labels.hammer}</span>
        <MoneyDisplay amountFils={hammerPriceFils} locale={locale} />
      </div>
      <div className="row">
        <span>{labels.premium}</span>
        <MoneyDisplay amountFils={buyerPremiumFils} locale={locale} />
      </div>
      <div className="row">
        <span>{labels.vat}</span>
        <MoneyDisplay amountFils={vatFils} locale={locale} />
      </div>
      <div className="row total-row">
        <span>{labels.total}</span>
        <MoneyDisplay amountFils={totalFils} locale={locale} />
      </div>
    </div>
  );
}

export function ReserveState({
  status,
  locale,
}: {
  readonly status: "NOT_APPLICABLE" | "NOT_MET" | "MET";
  readonly locale: "en" | "ar";
}) {
  if (status === "NOT_APPLICABLE") return null;

  const config = {
    MET: {
      text: locale === "en" ? "Reserve Met" : "تم بلوغ السعر الاحتياطي",
      variant: "success" as const,
    },
    NOT_MET: {
      text: locale === "en" ? "Reserve Not Met" : "لم يتم بلوغ السعر الاحتياطي",
      variant: "warning" as const,
    },
  }[status];

  return <StatusBadge text={config.text} variant={config.variant} />;
}

export function ExtensionNotice({
  minutes,
  seconds,
  locale,
}: {
  readonly minutes: number;
  readonly seconds: number;
  readonly locale: "en" | "ar";
}) {
  const timeStr = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  return (
    <div className="extension-notice" role="alert">
      <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01" />
      </svg>
      <span>
        {locale === "en"
          ? `Auction closes soon! Soft-close extended by ${timeStr} due to active bidding.`
          : `أوشك المزاد على الانتهاء! تم تمديد الإغلاق التلقائي بمقدار ${timeStr} دقيقة بسبب النشاط الحاصل.`}
      </span>
    </div>
  );
}
