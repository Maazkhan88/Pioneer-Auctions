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
    brand: "بايونير للمزادات — الإدارة",
    eyebrow: "مساحة عمل العمليات",
    heading: "أساس لوحة الإدارة جاهز.",
    localeSwitch: "English",
    localeSwitchHref: "/en",
    status: "ستُضاف وحدات التشغيل والمالية في مهام لاحقة.",
  },
  en: {
    brand: "Pioneer Auctions — Admin",
    eyebrow: "Operations workspace",
    heading: "The admin foundation is ready.",
    localeSwitch: "العربية",
    localeSwitchHref: "/ar",
    status: "Operations and finance modules will arrive in later tasks.",
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
