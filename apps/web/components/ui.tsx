import type { CSSProperties, ReactNode } from "react";

function formatMoney(amountFils: number, locale: "en" | "ar"): string {
  return new Intl.NumberFormat(locale === "ar" ? "ar-AE" : "en-AE", {
    currency: "AED",
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
    style: "currency",
  }).format(amountFils / 100);
}

// Icon Component
function Icon({
  name,
  className = "",
  style,
}: {
  readonly name:
    | "gavel"
    | "clock"
    | "share"
    | "search"
    | "grid"
    | "list"
    | "phone"
    | "pin"
    | "bookmark"
    | "facebook"
    | "twitter"
    | "instagram"
    | "linkedin"
    | "chevron-right";
  readonly className?: string;
  readonly style?: CSSProperties;
}) {
  const paths = {
    gavel: (
      <>
        <path d="m14 4 6 6M12 6l6 6M6 10l8 8M4 20h9M3 21h11" />
        <path d="m15 3-4 4 6 6 4-4-6-6ZM5 11l-2 2 6 6 2-2-6-6Z" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    share: (
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13" />
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.3-4.3" />
      </>
    ),
    grid: (
      <>
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
      </>
    ),
    list: (
      <>
        <line x1="3" x2="21" y1="6" y2="6" />
        <line x1="3" x2="21" y1="12" y2="12" />
        <line x1="3" x2="21" y1="18" y2="18" />
      </>
    ),
    phone: (
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    ),
    pin: (
      <>
        <path d="M20 10c0 4.42-8 11-8 11s-8-6.58-8-11a8 8 0 1 1 16 0z" />
        <circle cx="12" cy="10" r="3" />
      </>
    ),
    bookmark: <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />,
    facebook: (
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    ),
    twitter: (
      <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
    ),
    instagram: (
      <>
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37zM17.5 6.5h.01" />
      </>
    ),
    linkedin: (
      <>
        <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
        <rect x="2" y="9" width="4" height="12" />
        <circle cx="4" cy="4" r="2" />
      </>
    ),
    "chevron-right": <path d="m9 18 6-6-6-6" />,
  } as const;

  return (
    <svg
      className={`icon icon-${name} ${className}`}
      style={style}
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  );
}

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
      className={`ref-btn-primary ${variant === "secondary" ? "ref-btn-secondary" : ""} ${className}`}
      onClick={onClick}
      disabled={disabled}
      type="button"
      aria-label={ariaLabel}
      style={
        variant === "primary"
          ? {
              background: "var(--pa-color-brand-purple)",
              color: "#fff",
              border: "0",
              borderRadius: "8px",
              height: "46px",
              paddingInline: "1.5rem",
              fontWeight: "600",
              cursor: "pointer",
            }
          : {
              background: "transparent",
              border: "1px solid var(--pa-color-card-border)",
              color: "var(--pa-color-text-dark)",
              borderRadius: "8px",
              height: "46px",
              paddingInline: "1.5rem",
              fontWeight: "600",
              cursor: "pointer",
            }
      }
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
      className={`favorite-btn ${className}`}
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
    <div
      className={`field-container ${error ? "has-error" : ""}`}
      style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}
    >
      <label
        htmlFor={id}
        style={{
          fontSize: "0.88rem",
          fontWeight: "600",
          color: "var(--pa-color-text-dark)",
        }}
      >
        {label}
      </label>
      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        style={{
          height: "42px",
          borderRadius: "8px",
          border: "1px solid var(--pa-color-card-border)",
          paddingInline: "1rem",
          outline: "none",
          fontSize: "0.92rem",
        }}
      />
      {error && (
        <span
          className="field-error"
          id={`${id}-error`}
          role="alert"
          style={{ fontSize: "0.75rem", color: "red", fontWeight: "500" }}
        >
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
    <bdi
      className={`countdown-display ${className}`}
      dir="ltr"
      style={{ fontWeight: "700" }}
    >
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
  const colorMap = {
    info: { bg: "#E0F2FE", text: "#0369A1" },
    success: { bg: "#DCFCE7", text: "#15803D" },
    warning: { bg: "#FEF3C7", text: "#B45309" },
    danger: { bg: "#FEE2E2", text: "#B91C1C" },
  }[variant];

  return (
    <span
      className={`badge ${className}`}
      style={{
        background: colorMap.bg,
        color: colorMap.text,
        borderRadius: "4px",
        fontSize: "0.72rem",
        fontWeight: "800",
        letterSpacing: "0.02em",
        padding: "0.35rem 0.6rem",
        display: "inline-block",
        textTransform: "uppercase",
      }}
    >
      {text}
    </span>
  );
}

export function Card({
  children,
  className = "",
  style,
}: {
  readonly children: ReactNode;
  readonly className?: string;
  readonly style?: CSSProperties;
}) {
  return (
    <div
      className={`card ${className}`}
      style={{
        background: "#fff",
        border: "1px solid var(--pa-color-card-border)",
        borderRadius: "12px",
        padding: "1.5rem",
        boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function Skeleton({
  className = "",
  style,
}: {
  readonly className?: string;
  readonly style?: CSSProperties;
}) {
  return (
    <div
      className={`skeleton ${className}`}
      aria-hidden="true"
      style={{
        background:
          "linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%)",
        backgroundSize: "200% 100%",
        animation: "shimmer 1.5s infinite",
        borderRadius: "8px",
        height: "20px",
        width: "100%",
        ...style,
      }}
    />
  );
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
    <article className="ref-lot-card">
      <div className={`lot-card-media ${imageClass}`}>
        <span className="category-tag">{category}</span>
        <button
          className="favorite-btn"
          type="button"
          aria-label="Add to Watchlist"
        >
          <Icon name="bookmark" />
        </button>
      </div>
      <div className="lot-card-body">
        <div className="lot-number-row">
          <span className="lot-number">
            {locale === "en" ? "Lot # " : "قطعة # "}
            {lotNumber}
          </span>
          <button className="share-btn" type="button" aria-label="Share">
            <Icon name="share" />
          </button>
        </div>
        <h3>{title}</h3>
        <div className="lot-metrics">
          <span className="metric-item">
            <Icon name="gavel" />
            <span>12</span>
          </span>
          <span className="metric-divider">|</span>
          <span className="metric-item timer-item">
            <Icon name="clock" />
            <bdi dir="ltr">{timeLeft}</bdi>
          </span>
        </div>
        <div className="lot-card-footer">
          <div className="price-col">
            <span className="price-label">
              {locale === "en" ? "Current Bid" : "المزايدة الحالية"}
            </span>
            <span className="price-val">
              <MoneyDisplay amountFils={priceFils} locale={locale} />
            </span>
          </div>
          <div className="bid-btn-col">
            <button className="bid-action-btn" type="button">
              <span>{locale === "en" ? "Bid now" : "زايد الآن"}</span>
              <span className="btn-subtext">
                {locale === "en" ? "Min inc " : "زيادة "}
                <bdi dir="ltr">{locale === "en" ? "AED 500" : "500 د.إ"}</bdi>
              </span>
            </button>
          </div>
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
    <div
      className={`bid-state-banner state-${status}`}
      role="status"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
        padding: "1rem 1.25rem",
        borderRadius: "8px",
        fontWeight: "600",
        fontSize: "0.92rem",
        background: status === "winning" ? "#DCFCE7" : "#FEE2E2",
        color: status === "winning" ? "#15803D" : "#B91C1C",
        border: `1px solid ${status === "winning" ? "#BBF7D0" : "#FECACA"}`,
      }}
    >
      <span className="banner-icon">
        {status === "winning" ? (
          <Icon name="gavel" />
        ) : (
          <svg
            className="icon"
            style={{ height: "18px", width: "18px" }}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
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
    <div
      className="bid-cta-container"
      style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
    >
      {/* Bid Details Card mimicking Reference Mockup 02 */}
      <div
        className="ref-bid-card"
        style={{
          border: "1px solid var(--pa-color-card-border)",
          borderRadius: "12px",
          padding: "1.5rem",
          background: "#fff",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: "1.5rem",
          }}
        >
          <div>
            <div
              style={{
                fontSize: "0.75rem",
                fontWeight: "600",
                color: "var(--pa-color-text-muted)",
              }}
            >
              Time remaining
            </div>
            <div
              style={{
                fontSize: "1.25rem",
                fontWeight: "800",
                color: "var(--pa-color-text-dark)",
                marginTop: "0.25rem",
              }}
            >
              6D, 12H
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div
              style={{
                fontSize: "0.75rem",
                fontWeight: "600",
                color: "var(--pa-color-text-muted)",
                display: "flex",
                alignItems: "center",
                gap: "0.25rem",
                justifyContent: "flex-end",
              }}
            >
              <span>Total Bids</span>
              <Icon name="gavel" style={{ height: "14px", width: "14px" }} />
            </div>
            <div
              style={{
                fontSize: "1.25rem",
                fontWeight: "800",
                color: "var(--pa-color-text-dark)",
                marginTop: "0.25rem",
              }}
            >
              12
            </div>
          </div>
        </div>

        <div style={{ marginBottom: "1.5rem" }}>
          <div
            style={{
              fontSize: "2.2rem",
              fontWeight: "800",
              color: "var(--pa-color-text-dark)",
              display: "flex",
              alignItems: "baseline",
              gap: "0.5rem",
            }}
          >
            <span style={{ fontSize: "1.5rem", fontWeight: "700" }}>AED</span>
            <span>
              {(nextBidFils / 100).toLocaleString(
                locale === "ar" ? "ar-AE" : "en-AE",
              )}
            </span>
          </div>
          <div
            style={{
              fontSize: "0.75rem",
              color: "var(--pa-color-text-muted)",
              marginTop: "0.25rem",
            }}
          >
            + 3.00% -5.00% Buyer Fee{" "}
            <span style={{ textDecoration: "underline", cursor: "pointer" }}>
              Buyer&apos;s T&amp;C
            </span>
          </div>
        </div>

        <button
          className="bid-action-btn"
          onClick={onClick}
          disabled={disabled}
          type="button"
          style={{
            width: "100%",
            height: "50px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span style={{ fontSize: "0.95rem", fontWeight: "700" }}>
            {bidText} Now
          </span>
          <span className="btn-subtext" style={{ fontSize: "0.68rem" }}>
            Minimum bid increment AED{" "}
            {(incrementFils / 100).toLocaleString(
              locale === "ar" ? "ar-AE" : "en-AE",
            )}
          </span>
        </button>

        {/* Auto Bid Input Section */}
        <div
          style={{
            borderTop: "1px solid #f3f4f6",
            marginTop: "1.5rem",
            paddingTop: "1.5rem",
          }}
        >
          <div
            style={{
              fontSize: "0.85rem",
              fontWeight: "700",
              color: "var(--pa-color-text-dark)",
              marginBottom: "0.75rem",
            }}
          >
            Auto Bid Placement
          </div>
          <div
            style={{
              display: "flex",
              border: "1px solid var(--pa-color-card-border)",
              borderRadius: "8px",
              overflow: "hidden",
              height: "42px",
              background: "#f9fafb",
              marginBottom: "0.75rem",
            }}
          >
            <span
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                paddingInline: "0.85rem",
                borderRight: "1px solid var(--pa-color-card-border)",
                fontSize: "0.9rem",
                fontWeight: "bold",
              }}
            >
              AED
            </span>
            <input
              type="number"
              placeholder="Enter max bid amount"
              style={{
                flex: "1",
                border: "0",
                background: "transparent",
                paddingInline: "0.75rem",
                fontSize: "0.9rem",
                outline: "none",
              }}
            />
          </div>
          <button
            type="button"
            style={{
              width: "100%",
              height: "42px",
              background: "var(--pa-color-brand-orange)",
              border: "0",
              borderRadius: "8px",
              color: "#fff",
              fontWeight: "700",
              fontSize: "0.9rem",
              cursor: "pointer",
            }}
          >
            Auto Bid
          </button>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBlock: "1rem",
            color: "var(--pa-color-text-muted)",
            fontSize: "0.75rem",
          }}
        >
          Or
        </div>

        <button
          type="button"
          style={{
            width: "100%",
            height: "42px",
            background: "transparent",
            border: "1px solid var(--pa-color-card-border)",
            borderRadius: "8px",
            color: "var(--pa-color-text-dark)",
            fontWeight: "700",
            fontSize: "0.9rem",
            cursor: "pointer",
          }}
        >
          Make an Offer
        </button>
      </div>
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
    <div
      className={`deposit-chip ${eligible ? "eligible" : "ineligible"}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.5rem",
        padding: "0.4rem 0.85rem",
        borderRadius: "999px",
        fontSize: "0.82rem",
        fontWeight: "600",
        background: eligible ? "#DCFCE7" : "#FEF3C7",
        color: eligible ? "#15803D" : "#B45309",
        border: `1px solid ${eligible ? "#BBF7D0" : "#FDE68A"}`,
      }}
    >
      <span
        className="dot"
        style={{
          height: "8px",
          width: "8px",
          borderRadius: "50%",
          background: "currentColor",
        }}
      />
      <span>
        {locale === "en"
          ? eligible
            ? "Deposit eligible"
            : `Required Deposit: `
          : eligible
            ? "مؤهل للمزايدة"
            : `الضمان المطلوب: `}
        {!eligible && (
          <MoneyDisplay amountFils={depositAmountFils} locale={locale} />
        )}
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
    en: {
      hammer: "Hammer Price",
      premium: "Buyer Premium (10%)",
      vat: "VAT (5%)",
      total: "Total Amount",
    },
    ar: {
      hammer: "سعر المطرقة",
      premium: "عمولة المشتري (10%)",
      vat: "ضريبة القيمة المضافة (5%)",
      total: "المبلغ الإجمالي",
    },
  }[locale];

  return (
    <div
      className="fee-breakdown"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.75rem",
        fontSize: "0.88rem",
      }}
    >
      <div
        className="row"
        style={{
          display: "flex",
          justifyContent: "space-between",
          color: "var(--pa-color-text-muted)",
        }}
      >
        <span>{labels.hammer}</span>
        <MoneyDisplay amountFils={hammerPriceFils} locale={locale} />
      </div>
      <div
        className="row"
        style={{
          display: "flex",
          justifyContent: "space-between",
          color: "var(--pa-color-text-muted)",
        }}
      >
        <span>{labels.premium}</span>
        <MoneyDisplay amountFils={buyerPremiumFils} locale={locale} />
      </div>
      <div
        className="row"
        style={{
          display: "flex",
          justifyContent: "space-between",
          color: "var(--pa-color-text-muted)",
        }}
      >
        <span>{labels.vat}</span>
        <MoneyDisplay amountFils={vatFils} locale={locale} />
      </div>
      <div
        className="row total-row"
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontWeight: "800",
          color: "var(--pa-color-text-dark)",
          borderTop: "1px solid #f3f4f6",
          paddingTop: "0.75rem",
          fontSize: "1rem",
        }}
      >
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
    <div
      className="extension-notice"
      role="alert"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
        padding: "1rem 1.25rem",
        borderRadius: "8px",
        background: "#FFF7ED",
        color: "#C2410C",
        border: "1px solid #FED7AA",
        fontSize: "0.88rem",
        fontWeight: "600",
      }}
    >
      <Icon name="clock" style={{ height: "18px", width: "18px" }} />
      <span>
        {locale === "en"
          ? `Auction closes soon! Soft-close extended by ${timeStr} due to active bidding.`
          : `أوشك المزاد على الانتهاء! تم تمديد الإغلاق التلقائي بمقدار ${timeStr} دقيقة بسبب النشاط الحاصل.`}
      </span>
    </div>
  );
}
