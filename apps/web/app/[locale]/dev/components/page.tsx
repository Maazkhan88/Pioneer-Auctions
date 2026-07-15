"use client";

import { use, useState } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { isLocale, messagesFor } from "../../../i18n/messages";
import {
  Button,
  IconButton,
  Field,
  MoneyDisplay,
  CountdownDisplay,
  StatusBadge,
  Card,
  Skeleton,
  LotCard,
  BidStateBanner,
  BidCTA,
  DepositChip,
  FeeBreakdown,
  ReserveState,
  ExtensionNotice,
} from "../../../components/ui";

interface DevComponentsPageProperties {
  readonly params: Promise<{ readonly locale: string }>;
}

export default function DevComponentsPage({ params }: DevComponentsPageProperties) {
  const { locale } = use(params);
  if (!isLocale(locale)) {
    notFound();
  }

  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [inputValue, setInputValue] = useState("");
  const messages = messagesFor(locale);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  const heartIcon = (
    <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
    </svg>
  );

  return (
    <div className={theme === "dark" ? "theme-dark" : ""}>
      <div style={{ background: "var(--pa-color-background)", color: "var(--pa-color-ink)", minHeight: "100vh", padding: "2rem", transition: "background 0.2s, color 0.2s" }}>
        
        {/* Header toolbar */}
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--pa-color-border)", paddingBottom: "1rem", marginBottom: "2rem" }}>
          <div>
            <h1 style={{ fontSize: "2rem", margin: 0 }}>
              {locale === "en" ? "Design System Primitives Catalogue" : "دليل عناصر نظام التصميم"}
            </h1>
            <p style={{ color: "var(--pa-color-muted)", margin: "0.25rem 0 0" }}>
              {locale === "en" ? "Component Matrix & Visual Regression Catalog" : "مصفوفة العناصر ودليل التحقق البصري"}
            </p>
          </div>
          <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
            <button
              onClick={toggleTheme}
              style={{
                background: "var(--pa-color-brand)",
                color: "#fff",
                border: 0,
                borderRadius: "8px",
                padding: "0.5rem 1rem",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              {theme === "light" ? "🌙 Dark Mode" : "☀️ Light Mode"}
            </button>
            <Link
              href={locale === "en" ? "/ar/dev/components" : "/en/dev/components"}
              style={{
                color: "var(--pa-color-brand)",
                fontWeight: "bold",
                textDecoration: "none",
              }}
            >
              {locale === "en" ? "العربية 🇦🇪" : "English 🇬🇧"}
            </Link>
          </div>
        </header>

        {/* Primitive grid */}
        <section style={{ marginBottom: "3rem" }}>
          <h2 style={{ fontSize: "1.5rem", borderBottom: "2px solid var(--pa-color-brand)", paddingBottom: "0.5rem", marginBottom: "1.5rem" }}>
            {locale === "en" ? "1. Primitives (Atomic UI)" : "١. العناصر الأساسية (العناصر البرمجية)"}
          </h2>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "2rem" }}>
            
            {/* Buttons Card */}
            <Card>
              <h3>Buttons & Icon Buttons</h3>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", marginBlock: "1rem" }}>
                <Button variant="primary">Primary Button</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="danger">Danger Action</Button>
                <Button variant="success">Success Action</Button>
                <Button variant="primary" disabled>Disabled State</Button>
              </div>
              <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                <span>Icon button:</span>
                <IconButton icon={heartIcon} ariaLabel="Add to Watchlist" />
                <IconButton icon={heartIcon} disabled ariaLabel="Disabled Watchlist" />
              </div>
            </Card>

            {/* Inputs & Fields Card */}
            <Card>
              <h3>Fields & Inputs</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <Field
                  id="demo-field"
                  label="Manual Bid Amount (AED)"
                  value={inputValue}
                  onChange={setInputValue}
                  placeholder="Enter custom bid..."
                />
                <Field
                  id="error-field"
                  label="Deposit Increment"
                  value="150"
                  error="Validation error: Minimum increment required is 500 fils."
                />
              </div>
            </Card>

            {/* Indicators & Badges */}
            <Card>
              <h3>Status Badges & Displays</h3>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "1rem" }}>
                <StatusBadge text="Live now" variant="info" />
                <StatusBadge text="Winning" variant="success" />
                <StatusBadge text="Warning state" variant="warning" />
                <StatusBadge text="Outbid alert" variant="danger" />
              </div>
              <div style={{ marginBottom: "1rem" }}>
                <span style={{ display: "block", fontSize: "0.85rem", color: "var(--pa-color-muted)", marginBottom: "0.25rem" }}>
                  MoneyDisplay (Integer Fils to Local Format):
                </span>
                <MoneyDisplay amountFils={18400000} locale={locale} />
              </div>
              <div>
                <span style={{ display: "block", fontSize: "0.85rem", color: "var(--pa-color-muted)", marginBottom: "0.25rem" }}>
                  Countdown Timer:
                </span>
                <CountdownDisplay hours={0} minutes={12} seconds={48} />
              </div>
            </Card>

            {/* Skeletons & Cards */}
            <Card>
              <h3>Skeletons & Placeholders</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <Skeleton style={{ height: "1.25rem", width: "70%" }} />
                <Skeleton style={{ height: "4rem" }} />
                <Skeleton style={{ height: "1rem", width: "40%" }} />
              </div>
            </Card>

          </div>
        </section>

        {/* Complex components */}
        <section style={{ marginBottom: "3rem" }}>
          <h2 style={{ fontSize: "1.5rem", borderBottom: "2px solid var(--pa-color-brand)", paddingBottom: "0.5rem", marginBottom: "1.5rem" }}>
            {locale === "en" ? "2. Auction Components" : "٢. عناصر المزاد"}
          </h2>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))", gap: "2rem" }}>
            
            {/* Bid Banners */}
            <Card>
              <h3>Bid State Banners</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <BidStateBanner status="winning" message={locale === "en" ? "You’re the highest bidder" : "أنت المزايد الأعلى"} />
                <BidStateBanner status="outbid" message={locale === "en" ? "Outbid! Place a higher bid to stay in the lead." : "تم تجاوز مزايدتك! يرجى تقديم سعر أعلى للبقاء في الصدارة."} />
              </div>
            </Card>

            {/* CTA & Chips */}
            <Card>
              <h3>Bid Action Callouts</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                <BidCTA nextBidFils={18600000} incrementFils={200000} locale={locale} bidText={messages.bidAction.split(" ")[0]} />
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <DepositChip eligible={true} depositAmountFils={0} locale={locale} />
                  <DepositChip eligible={false} depositAmountFils={500000} locale={locale} />
                </div>
              </div>
            </Card>

            {/* Fee Breakdown & Reserve */}
            <Card>
              <h3>Fee Breakdown & Reserve Status</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div style={{ display: "flex", gap: "1rem" }}>
                  <ReserveState status="MET" locale={locale} />
                  <ReserveState status="NOT_MET" locale={locale} />
                </div>
                <FeeBreakdown hammerPriceFils={18400000} buyerPremiumFils={1840000} vatFils={92000} locale={locale} />
              </div>
            </Card>

            {/* extension notices */}
            <Card style={{ gridColumn: "span 1" }}>
              <h3>Soft Close Alert Notices</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <ExtensionNotice minutes={2} seconds={0} locale={locale} />
              </div>
            </Card>

          </div>
        </section>

        {/* Real Cards Showcase */}
        <section style={{ marginBottom: "3rem" }}>
          <h2 style={{ fontSize: "1.5rem", borderBottom: "2px solid var(--pa-color-brand)", paddingBottom: "0.5rem", marginBottom: "1.5rem" }}>
            {locale === "en" ? "3. Rendered Lot Cards Showcase" : "٣. عرض بطاقات السلع المتاحة"}
          </h2>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 320px))", gap: "2rem" }}>
            <LotCard
              lotNumber="Lot #214"
              title="Toyota Land Cruiser GR Sport • 2023"
              category="Cars"
              priceFils={18400000}
              timeLeft="00:12:48"
              imageClass="lot-image-car"
              locale={locale}
            />
            <LotCard
              lotNumber="Lot #88"
              title="Contemporary villa • Dubai Hills"
              category="Real Estate"
              priceFils={485000000}
              timeLeft="00:42:10"
              imageClass="lot-image-property"
              locale={locale}
            />
          </div>
        </section>

      </div>
    </div>
  );
}
