import Link from "next/link";
import { notFound } from "next/navigation";

import { isLocale, messagesFor } from "../../i18n/messages";

interface LocalePageProperties {
  readonly params: Promise<{ readonly locale: string }>;
}

export default async function LocalePage({ params }: LocalePageProperties) {
  const { locale } = await params;
  if (!isLocale(locale)) {
    notFound();
  }

  const messages = messagesFor(locale);

  return (
    <section className="hero">
      <nav className="navigation" aria-label={messages.brand}>
        <strong className="brand">{messages.brand}</strong>
        <Link className="locale-switch" href={messages.localeSwitchHref}>
          {messages.localeSwitch}
        </Link>
      </nav>
      <div className="hero-copy">
        <p className="eyebrow">{messages.eyebrow}</p>
        <h1>{messages.heading}</h1>
        <p className="status">{messages.status}</p>
      </div>
    </section>
  );
}
