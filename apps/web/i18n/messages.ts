export const locales = ["en", "ar"] as const;
export type Locale = (typeof locales)[number];

export interface PreviewLot {
  readonly category: string;
  readonly imageClass: string;
  readonly lotNumber: string;
  readonly price: string;
  readonly time: string;
  readonly title: string;
}

export interface Messages {
  readonly auctionNumber: string;
  readonly bidAction: string;
  readonly brand: string;
  readonly categories: string;
  readonly currentBid: string;
  readonly endingSoon: string;
  readonly endingSoonIntro: string;
  readonly endsIn: string;
  readonly eyebrow: string;
  readonly feeNote: string;
  readonly featured: string;
  readonly heading: string;
  readonly highestBidder: string;
  readonly howItWorks: string;
  readonly liveAuctions: string;
  readonly localeSwitch: string;
  readonly localeSwitchHref: string;
  readonly location: string;
  readonly lotNumber: string;
  readonly lots: readonly PreviewLot[];
  readonly nextBid: string;
  readonly notifications: string;
  readonly profile: string;
  readonly reserveMet: string;
  readonly search: string;
  readonly status: string;
  readonly subtitle: string;
  readonly title: string;
  readonly verified: string;
  readonly viewAll: string;
  readonly watchers: string;
}

const messages: Record<Locale, Messages> = {
  ar: {
    auctionNumber: "مزاد #AU-2048",
    bidAction: "زايد بمبلغ 186,000 د.إ",
    brand: "بايونير للمزادات",
    categories: "الفئات",
    currentBid: "المزايدة الحالية",
    endingSoon: "ينتهي قريباً",
    endingSoonIntro: "فرص مختارة تقترب من لحظة الحسم.",
    endsIn: "ينتهي خلال",
    eyebrow: "مزاد مباشر • دبي",
    feeNote:
      "يشمل العرض التالي زيادة قدرها 2,000 د.إ. ستظهر الرسوم كاملة قبل التأكيد.",
    featured: "مميز",
    heading: "اعثر على الصفقة التي تستحق الفوز.",
    highestBidder: "أنت صاحب أعلى مزايدة",
    howItWorks: "كيف يعمل المزاد",
    liveAuctions: "المزادات المباشرة",
    localeSwitch: "English",
    localeSwitchHref: "/en",
    location: "القوز، دبي",
    lotNumber: "قطعة #214",
    lots: [
      {
        category: "سيارات",
        imageClass: "lot-image-car",
        lotNumber: "قطعة #219",
        price: "328,000 د.إ",
        time: "18 د 24 ث",
        title: "مرسيدس-AMG G 63 • 2022",
      },
      {
        category: "عقارات",
        imageClass: "lot-image-property",
        lotNumber: "قطعة #88",
        price: "4,850,000 د.إ",
        time: "42 د 10 ث",
        title: "فيلا معاصرة • دبي هيلز",
      },
      {
        category: "معدات ثقيلة",
        imageClass: "lot-image-equipment",
        lotNumber: "قطعة #301",
        price: "146,000 د.إ",
        time: "1 س 08 د",
        title: "حفارة كاتربيلر 320 • 2021",
      },
    ],
    nextBid: "المزايدة التالية",
    notifications: "الإشعارات",
    profile: "الملف الشخصي",
    reserveMet: "تم بلوغ السعر الاحتياطي",
    search: "البحث في القطع",
    status: "مباشر الآن",
    subtitle:
      "مزادات موثوقة في الإمارات، بمعلومات واضحة ومزايدات لحظية دون مفاجآت.",
    title: "تويوتا لاند كروزر GR Sport • 2023",
    verified: "تم التحقق",
    viewAll: "عرض كل القطع",
    watchers: "47 متابعاً الآن",
  },
  en: {
    auctionNumber: "Auction #AU-2048",
    bidAction: "Bid AED 186,000",
    brand: "Pioneer Auctions",
    categories: "Categories",
    currentBid: "Current bid",
    endingSoon: "Ending soon",
    endingSoonIntro:
      "A considered edit of lots approaching the decisive moment.",
    endsIn: "Ends in",
    eyebrow: "Live auction • Dubai",
    feeNote:
      "Next bid includes a AED 2,000 increment. Full fees are shown before confirmation.",
    featured: "Featured",
    heading: "Find the one worth winning.",
    highestBidder: "You’re the highest bidder",
    howItWorks: "How auctions work",
    liveAuctions: "Live auctions",
    localeSwitch: "العربية",
    localeSwitchHref: "/ar",
    location: "Al Quoz, Dubai",
    lotNumber: "Lot #214",
    lots: [
      {
        category: "Cars",
        imageClass: "lot-image-car",
        lotNumber: "Lot #219",
        price: "AED 328,000",
        time: "18m 24s",
        title: "Mercedes-AMG G 63 • 2022",
      },
      {
        category: "Real estate",
        imageClass: "lot-image-property",
        lotNumber: "Lot #88",
        price: "AED 4,850,000",
        time: "42m 10s",
        title: "Contemporary villa • Dubai Hills",
      },
      {
        category: "Heavy equipment",
        imageClass: "lot-image-equipment",
        lotNumber: "Lot #301",
        price: "AED 146,000",
        time: "1h 08m",
        title: "Caterpillar 320 excavator • 2021",
      },
    ],
    nextBid: "Next valid bid",
    notifications: "Notifications",
    profile: "Profile",
    reserveMet: "Reserve met",
    search: "Search lots",
    status: "Live now",
    subtitle:
      "Trusted UAE auctions with clear information, real-time bidding, and no surprises.",
    title: "Toyota Land Cruiser GR Sport • 2023",
    verified: "Verified",
    viewAll: "View all lots",
    watchers: "47 watching now",
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
