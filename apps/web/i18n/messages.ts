export const locales = ["en", "ar"] as const;
export type Locale = (typeof locales)[number];

export interface Messages {
  readonly brand: string;
  readonly eyebrow: string;
  readonly heading: string;
  readonly localeSwitch: string;
  readonly localeSwitchHref: string;
  readonly status: string;
}

const messages: Record<Locale, Messages> = {
  ar: {
    brand: "بايونير للمزادات",
    eyebrow: "منصة مزادات إماراتية موثوقة",
    heading: "تجربة المزايدة الجديدة قيد الإنشاء.",
    localeSwitch: "English",
    localeSwitchHref: "/en",
    status: "تم تجهيز أساس الويب باللغتين العربية والإنجليزية.",
  },
  en: {
    brand: "Pioneer Auctions",
    eyebrow: "A trusted UAE auction platform",
    heading: "The new bidding experience is being built.",
    localeSwitch: "العربية",
    localeSwitchHref: "/ar",
    status: "The web foundation is ready in English and Arabic.",
  },
};

export function isLocale(value: string): value is Locale {
  return locales.some((locale) => locale === value);
}

export function directionFor(locale: Locale): "ltr" | "rtl" {
  return locale === "ar" ? "rtl" : "ltr";
}

export function messagesFor(locale: Locale): Messages {
  return messages[locale];
}
