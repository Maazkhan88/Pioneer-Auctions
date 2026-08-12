import Link from "next/link";
import { notFound } from "next/navigation";

import { isLocale, messagesFor } from "../../i18n/messages";
import { loadAdminOperationsData } from "../../lib/admin-data";

interface LocalePageProperties {
  readonly params: Promise<{ readonly locale: string }>;
}

export default async function LocalePage({ params }: LocalePageProperties) {
  const { locale } = await params;
  if (!isLocale(locale)) {
    notFound();
  }

  const messages = messagesFor(locale);
  const operationsData = await loadAdminOperationsData(locale, messages);

  return (
    <section className="workspace">
      <aside className="rail" aria-label={messages.shellLabel}>
        <div>
          <strong className="brand-mark">{messages.brand}</strong>
          <p>{messages.adminRole}</p>
        </div>
        <nav aria-label={messages.dashboardTitle}>
          <a href="#dashboard">{messages.dashboardTitle}</a>
          <a href="#lots">{messages.lotsTitle}</a>
          <a href="#auctions">{messages.auctionsTitle}</a>
          <a href="#approvals">{messages.approvalsTitle}</a>
          <a href="#audit">{messages.auditTitle}</a>
        </nav>
        <Link className="locale-link" href={messages.localeSwitchHref}>
          {messages.localeSwitch}
        </Link>
      </aside>

      <div className="content">
        <header className="hero" id="dashboard">
          <p className="eyebrow">{messages.eyebrow}</p>
          <h1>{messages.heading}</h1>
          <p>{messages.status}</p>
        </header>

        <section className="metric-grid" aria-label={messages.dashboardTitle}>
          {operationsData.metrics.map((metric) => (
            <article
              className={`metric-card tone-${metric.tone}`}
              key={metric.label}
            >
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
            </article>
          ))}
        </section>

        <div className="operations-grid">
          <section className="panel" id="lots">
            <div className="panel-heading">
              <p className="eyebrow">{messages.actionRequired}</p>
              <h2>{messages.lotsTitle}</h2>
            </div>
            <div className="action-list">
              {messages.lotsActions.map((action) => (
                <article className="action-card" key={action.label}>
                  <h3>{action.label}</h3>
                  <p>{action.description}</p>
                </article>
              ))}
            </div>
            <div className="backend-lots">
              <h3>{messages.lotListTitle}</h3>
              {operationsData.lots.length === 0 ? (
                <p>{messages.lotListEmpty}</p>
              ) : (
                <div className="lot-list">
                  {operationsData.lots.map((lot) => (
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
            <form className="lot-form" aria-label={messages.lotFormTitle}>
              <h3>{messages.lotFormTitle}</h3>
              <div className="form-grid">
                {messages.lotFormFields.map((field) => (
                  <label
                    className={field.type === "checkbox" ? "check-field" : ""}
                    key={field.name}
                  >
                    <span>{field.label}</span>
                    {field.type === "select" ? (
                      <select disabled name={field.name}>
                        <option>{field.placeholder}</option>
                        <option>Custom lot increment</option>
                      </select>
                    ) : (
                      <input
                        disabled
                        name={field.name}
                        placeholder={field.placeholder}
                        type={field.type}
                      />
                    )}
                  </label>
                ))}
              </div>
              <div className="form-footer">
                <p>{messages.lotFormStaticNotice}</p>
                <button disabled type="button">
                  {messages.lotFormSaveButton}
                </button>
              </div>
            </form>
          </section>

          <section className="panel" id="auctions">
            <div className="panel-heading">
              <p className="eyebrow">{messages.actionRequired}</p>
              <h2>{messages.auctionsTitle}</h2>
            </div>
            <div className="action-list">
              {messages.auctionsActions.map((action) => (
                <article className="action-card" key={action.label}>
                  <h3>{action.label}</h3>
                  <p>{action.description}</p>
                </article>
              ))}
            </div>
          </section>
        </div>

        <section className="panel" id="approvals">
          <div className="panel-heading horizontal">
            <div>
              <p className="eyebrow">{messages.actionRequired}</p>
              <h2>{messages.approvalsTitle}</h2>
            </div>
          </div>
          <div className="queue-list">
            {operationsData.queue.map((item) => (
              <article
                className="queue-item"
                key={`${item.title}-${item.meta}`}
              >
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.meta}</p>
                </div>
                <div className="queue-meta">
                  <strong>{item.amount}</strong>
                  <span>{item.sla}</span>
                </div>
                <form
                  className="decision-controls"
                  data-approve-endpoint={item.approveEndpoint ?? ""}
                  data-reject-endpoint={item.rejectEndpoint ?? ""}
                >
                  <label>
                    <span>{messages.rejectionReasonLabel}</span>
                    <select disabled name="reasonCode">
                      {messages.rejectionReasons.map((reason) => (
                        <option key={reason.label}>{reason.label}</option>
                      ))}
                    </select>
                  </label>
                  <div className="decision-buttons">
                    <button disabled type="button">
                      {messages.approveButton}
                    </button>
                    <button className="button-secondary" disabled type="button">
                      {messages.rejectButton}
                    </button>
                  </div>
                  <p>{messages.staticPreviewActionNotice}</p>
                </form>
              </article>
            ))}
          </div>
        </section>

        <section className="panel audit-panel" id="audit">
          <div className="panel-heading">
            <p className="eyebrow">{messages.actionRequired}</p>
            <h2>{messages.auditTitle}</h2>
          </div>
          <ol>
            {messages.auditEvents.map((event) => (
              <li key={event}>{event}</li>
            ))}
          </ol>
        </section>
      </div>
    </section>
  );
}
