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
    <section className="workspace">
      <aside className="rail" aria-label={messages.brand}>
        <strong>{messages.brand}</strong>
        <Link href={messages.localeSwitchHref}>{messages.localeSwitch}</Link>
      </aside>
      <div className="content">
        <p className="eyebrow">{messages.eyebrow}</p>
        <h1>{messages.heading}</h1>
        <p>{messages.status}</p>
      </div>
    </section>
  );
}
