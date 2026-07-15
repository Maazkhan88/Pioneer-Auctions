import Link from "next/link";
import { notFound } from "next/navigation";

import { isLocale, messagesFor } from "../../i18n/messages";

interface LocalePageProperties {
  readonly params: Promise<{ readonly locale: string }>;
}

function Icon({
  name,
  className = "",
}: {
  readonly name: "gavel" | "clock" | "share" | "search" | "grid" | "list" | "phone" | "pin" | "bookmark" | "facebook" | "twitter" | "instagram" | "linkedin";
  readonly className?: string;
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
    share: <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13" />,
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
    phone: <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />,
    pin: (
      <>
        <path d="M20 10c0 4.42-8 11-8 11s-8-6.58-8-11a8 8 0 1 1 16 0z" />
        <circle cx="12" cy="10" r="3" />
      </>
    ),
    bookmark: <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />,
    facebook: <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />,
    twitter: <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />,
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
  } as const;

  return (
    <svg className={`icon icon-${name} ${className}`} viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {paths[name]}
    </svg>
  );
}

export default async function LocalePage({ params }: LocalePageProperties) {
  const { locale } = await params;
  if (!isLocale(locale)) {
    notFound();
  }

  const messages = messagesFor(locale);

  const categories = [
    { name: locale === "en" ? "All" : "الكل", count: 86, active: true },
    { name: locale === "en" ? "General Material" : "مواد عامة", count: 12 },
    { name: locale === "en" ? "Automotive" : "سيارات", count: 18 },
    { name: locale === "en" ? "Electronics" : "إلكترونيات", count: 2 },
    { name: locale === "en" ? "Furniture" : "أثاث", count: 1 },
  ];

  const regions = [
    { name: locale === "en" ? "Abu Dhabi" : "أبوظبي", count: 1 },
    { name: locale === "en" ? "Dubai" : "دبي", count: 27 },
    { name: locale === "en" ? "Sharjah" : "الشارقة", count: 1 },
    { name: locale === "en" ? "Ajman" : "عجمان", count: 1 },
    { name: locale === "en" ? "Umm Al Quwain" : "أم القيوين", count: 1 },
  ];

  return (
    <div className="pioneer-ref-shell">
      
      {/* Dark Purple Top Header */}
      <header className="ref-header">
        <div className="ref-header-container">
          <Link href={`/${locale}`} className="ref-brand-lockup">
            <span className="ref-brand-logo">
              <Icon name="gavel" />
            </span>
            <div className="ref-brand-text">
              <span className="logo-en">{messages.brand}</span>
              <span className="logo-ar">{messages.brandArabic}</span>
            </div>
          </Link>

          <nav className="ref-menu">
            <a href="#lots">{messages.categories}</a>
            <a href="#sell">{messages.sell}</a>
            <a href="#about">{messages.aboutUs}</a>
          </nav>

          <div className="ref-actions">
            <Link href={`/${locale}`} className="ref-signin">
              {messages.signin}
            </Link>
            <Link href={`/${locale}`} className="ref-btn-contact">
              {messages.contact}
            </Link>
            <Link href={messages.localeSwitchHref} className="ref-lang-switch">
              {messages.localeSwitch}
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Banner Section */}
      <section className="ref-banner">
        <div className="ref-banner-content">
          <span className="banner-badge">{locale === "en" ? "WELCOME" : "مرحباً بكم"}</span>
          <h1>{messages.heading}</h1>
          <div className="banner-details">
            <span className="detail-item">
              <Icon name="phone" />
              <span>{messages.phoneLabel}</span>
            </span>
            <span className="detail-item">
              <Icon name="pin" />
              <span>{messages.addressLabel}</span>
            </span>
          </div>
        </div>
      </section>

      {/* Main Two-Column Viewport */}
      <main className="ref-main-container">
        
        {/* Left column: Side filters */}
        <aside className="ref-sidebar">
          
          {/* Categories */}
          <div className="sidebar-group">
            <h2>{messages.categories}</h2>
            <ul>
              {categories.map((cat) => (
                <li key={cat.name} className={cat.active ? "active" : ""}>
                  <span>{cat.name}</span>
                  <span className="badge">{cat.count}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Regions */}
          <div className="sidebar-group" style={{ marginTop: "2rem" }}>
            <h2>{messages.regions}</h2>
            <ul>
              {regions.map((reg) => (
                <li key={reg.name}>
                  <span>{reg.name}</span>
                  <span className="badge">{reg.count}</span>
                </li>
              ))}
            </ul>
          </div>

        </aside>

        {/* Right column: Lot matrix list */}
        <section className="ref-content">
          
          {/* Filters Bar */}
          <div className="ref-filters-bar">
            <div className="search-wrapper">
              <Icon name="search" className="search-input-icon" />
              <input
                type="text"
                placeholder={messages.searchPlaceholder}
                className="search-input"
              />
            </div>
            
            <div className="filter-controls">
              <select className="ref-select">
                <option>{locale === "en" ? "Year" : "السنة"}</option>
                <option>{locale === "en" ? "Price: Low to High" : "السعر: من الأقل للأعلى"}</option>
              </select>
              <div className="view-toggles">
                <button className="view-toggle-btn active" type="button" aria-label="Grid View">
                  <Icon name="grid" />
                </button>
                <button className="view-toggle-btn" type="button" aria-label="List View">
                  <Icon name="list" />
                </button>
              </div>
            </div>
          </div>

          {/* Lot Cards Grid */}
          <div className="ref-lot-grid" id="lots">
            {messages.lots.map((lot) => (
              <article key={lot.lotNumber} className="ref-lot-card">
                <div className={`lot-card-media ${lot.imageClass}`}>
                  <span className="category-tag">{lot.category}</span>
                  <button className="favorite-btn" type="button" aria-label="Add to Watchlist">
                    <Icon name="bookmark" />
                  </button>
                </div>
                <div className="lot-card-body">
                  <div className="lot-number-row">
                    <span className="lot-number">
                      {messages.lotNumberLabel}
                      {lot.lotNumber}
                    </span>
                    <button className="share-btn" type="button" aria-label="Share">
                      <Icon name="share" />
                    </button>
                  </div>
                  <h3>{lot.title}</h3>
                  <div className="lot-metrics">
                    <span className="metric-item">
                      <Icon name="gavel" />
                      <span>{lot.bids}</span>
                    </span>
                    <span className="metric-divider">|</span>
                    <span className="metric-item timer-item">
                      <Icon name="clock" />
                      <bdi dir="ltr">{lot.time}</bdi>
                    </span>
                  </div>
                  <div className="lot-card-footer">
                    <div className="price-col">
                      <span className="price-label">{messages.currentBid}</span>
                      <span className="price-val">
                        <bdi dir="ltr">{lot.price}</bdi>
                      </span>
                    </div>
                    <div className="bid-btn-col">
                      <button className="bid-action-btn" type="button">
                        <span>{messages.bidAction}</span>
                        <span className="btn-subtext">
                          {locale === "en" ? "Min inc " : "زيادة "}
                          <bdi dir="ltr">{lot.increment}</bdi>
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>

        </section>

      </main>

      {/* Dark Purple Footer */}
      <footer className="ref-footer">
        <div className="ref-footer-grid">
          
          <div className="footer-brand-col">
            <Link href={`/${locale}`} className="ref-brand-lockup">
              <span className="ref-brand-logo">
                <Icon name="gavel" />
              </span>
              <div className="ref-brand-text">
                <span className="logo-en">{messages.brand}</span>
                <span className="logo-ar">{messages.brandArabic}</span>
              </div>
            </Link>
            <p className="brand-desc">
              {locale === "en"
                ? "Features diverse auction categories which include automobiles, building & construction material, IT equipment, marine equipment, horses, heavy machinery and much more."
                : "نتميز بتوفير فئات مزادات متنوعة تشمل السيارات، مواد البناء والإنشاءات، أجهزة تكنولوجيا المعلومات، المعدات البحرية، الخيول، الآليات الثقيلة وغيرها الكثير."}
            </p>
            <div className="brand-contacts">
              <div className="contact-row">
                <Icon name="phone" />
                <span>{messages.phoneLabel}</span>
              </div>
              <div className="contact-row">
                <Icon name="pin" />
                <span>{messages.addressLabel}</span>
              </div>
            </div>
          </div>

          <div className="footer-links-col">
            <h3>{messages.quickLinks}</h3>
            <ul>
              <li><a href="#lots">{messages.categories}</a></li>
              <li><a href="#sell">{messages.sell}</a></li>
              <li><a href="#about">{messages.aboutUs}</a></li>
              <li><a href="#contact">{messages.contact}</a></li>
            </ul>
          </div>

          <div className="footer-social-col">
            <h3>{messages.followUs}</h3>
            <div className="social-icons">
              <a href="#fb" aria-label="Facebook"><Icon name="facebook" /></a>
              <a href="#tw" aria-label="Twitter"><Icon name="twitter" /></a>
              <a href="#ig" aria-label="Instagram"><Icon name="instagram" /></a>
              <a href="#in" aria-label="LinkedIn"><Icon name="linkedin" /></a>
            </div>
          </div>

          <div className="footer-app-col">
            <h3>{messages.downloadApp}</h3>
            <div className="app-download-buttons">
              <div className="store-badge mock-play" style={{ background: "#000", border: "1px solid #555", borderRadius: "6px", height: "40px", width: "135px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.68rem", fontWeight: "bold", color: "#fff", cursor: "pointer" }}>
                GET IT ON Google Play
              </div>
              <div className="store-badge mock-apple" style={{ background: "#000", border: "1px solid #555", borderRadius: "6px", height: "40px", width: "135px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.68rem", fontWeight: "bold", color: "#fff", cursor: "pointer", marginTop: "0.5rem" }}>
                Download on the App Store
              </div>
            </div>
          </div>

        </div>
        
        <div className="footer-copyright">
          <p>{messages.copyright}</p>
        </div>
      </footer>

    </div>
  );
}
