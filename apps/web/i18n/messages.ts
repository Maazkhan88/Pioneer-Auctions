export const locales = ["en", "ar"] as const;
export type Locale = (typeof locales)[number];

export interface PreviewLot {
  readonly badge: string;
  readonly bids: string;
  readonly category: string;
  readonly closesIn: string;
  readonly imageClass: string;
  readonly increment: string;
  readonly lotId: string;
  readonly lotNumber: string;
  readonly price: string;
  readonly reserve: string;
  readonly status: "winning" | "outbid" | "neutral";
  readonly title: string;
}

export interface Messages {
  readonly activeLots: string;
  readonly adminPreview: string;
  readonly auctionNumber: string;
  readonly bidNow: string;
  readonly bidAction: string;
  readonly browseAll: string;
  readonly categories: readonly string[];
  readonly currentBid: string;
  readonly depositReady: string;
  readonly eyebrow: string;
  readonly featured: string;
  readonly heading: string;
  readonly heroCta: string;
  readonly heroSecondary: string;
  readonly localeSwitch: string;
  readonly localeSwitchHref: string;
  readonly lotDetail: string;
  readonly lots: readonly PreviewLot[];
  readonly navCalendar: string;
  readonly navSell: string;
  readonly nextBid: string;
  readonly reserveMet: string;
  readonly searchPlaceholder: string;
  readonly softClose: string;
  readonly subtitle: string;
  readonly trustedStats: readonly {
    readonly label: string;
    readonly value: string;
  }[];
  readonly watchlist: string;
}

const messages: Record<Locale, Messages> = {
  ar: {
    activeLots: "مزادات نشطة",
    adminPreview: "معاينة لوحة الإدارة",
    auctionNumber: "مزاد #AU-2048",
    bidNow: "زايد الآن",
    bidAction: "زايد الآن",
    browseAll: "تصفح الكل",
    categories: ["الكل", "سيارات", "معدات", "عقارات", "بحري"],
    currentBid: "المزايدة الحالية",
    depositReady: "وديعتك جاهزة للمزايدة",
    eyebrow: "منصة مزادات إماراتية فورية وشفافة",
    featured: "مختارات مباشرة",
    heading: "مزادات فاخرة بسرعة Material 3 ووضوح مالي كامل.",
    heroCta: "ابدأ المزايدة",
    heroSecondary: "شاهد التفاصيل",
    localeSwitch: "English",
    localeSwitchHref: "/en",
    lotDetail: "تفاصيل القطعة",
    nextBid: "المزايدة التالية",
    navCalendar: "تقويم المزادات",
    navSell: "بيع",
    reserveMet: "تم بلوغ السعر الاحتياطي",
    searchPlaceholder: "ابحث عن سيارة، معدة، عقار أو رقم قطعة",
    softClose: "إغلاق مرن: أي مزايدة في آخر دقيقتين تمدد الوقت للجميع.",
    subtitle:
      "واجهة جديدة تضع الصور الكبيرة، أرقام الدرهم، حالة الاحتياطي، والزر التالي في المقدمة بدون ازدحام.",
    trustedStats: [
      { label: "تأكيد المزايدة", value: "< 500ms" },
      { label: "عملة المنصة", value: "AED" },
      { label: "دعم اللغة", value: "EN / AR" },
    ],
    watchlist: "المفضلة",
    lots: [
      {
        badge: "مباشر",
        bids: "42 مزايدة",
        category: "سيارات",
        closesIn: "00:08:41",
        imageClass: "m3-lot-car",
        increment: "AED 1,000",
        lotId: "11111111-1111-4111-8111-111111111111",
        lotNumber: "Lot #564458",
        price: "AED 3,500,000",
        reserve: "تم بلوغ الاحتياطي",
        status: "winning",
        title: "Ferrari LaFerrari 2025",
      },
      {
        badge: "ينتهي قريباً",
        bids: "18 مزايدة",
        category: "معدات ثقيلة",
        closesIn: "00:21:03",
        imageClass: "m3-lot-equipment",
        increment: "AED 500",
        lotId: "66666666-6666-4666-8666-666666666666",
        lotNumber: "Lot #566785",
        price: "AED 1,250,000",
        reserve: "لم يبلغ الاحتياطي",
        status: "outbid",
        title: "Caterpillar 214BFT 1998",
      },
      {
        badge: "جديد",
        bids: "6 مزايدات",
        category: "مواد عامة",
        closesIn: "06:04:19",
        imageClass: "m3-lot-material",
        increment: "AED 250",
        lotId: "77777777-7777-4777-8777-777777777777",
        lotNumber: "Lot #563567",
        price: "AED 25,000",
        reserve: "بدون احتياطي",
        status: "neutral",
        title: "Fire-rated spare parts package",
      },
    ],
  },
  en: {
    activeLots: "Active lots",
    adminPreview: "Admin preview",
    auctionNumber: "Auction #AU-2048",
    bidNow: "Bid now",
    bidAction: "Bid now",
    browseAll: "Browse all",
    categories: ["All", "Cars", "Equipment", "Real Estate", "Marine"],
    currentBid: "Current bid",
    depositReady: "Deposit ready to bid",
    eyebrow: "Real-time UAE auction platform",
    featured: "Live featured lots",
    heading: "Premium auctions with Material 3 speed and financial clarity.",
    heroCta: "Start bidding",
    heroSecondary: "View lot detail",
    localeSwitch: "العربية",
    localeSwitchHref: "/ar",
    lotDetail: "Lot detail",
    nextBid: "Next valid bid",
    navCalendar: "Auction calendar",
    navSell: "Sell",
    reserveMet: "Reserve met",
    searchPlaceholder: "Search cars, equipment, property or lot number",
    softClose:
      "Soft close: any bid in the final 2 minutes extends time for everyone.",
    subtitle:
      "A new expressive interface with big photography, AED-first numerals, transparent reserve state, and one clear next bid action.",
    trustedStats: [
      { label: "Bid confirmation", value: "< 500ms" },
      { label: "Currency", value: "AED" },
      { label: "Language", value: "EN / AR" },
    ],
    watchlist: "Watchlist",
    lots: [
      {
        badge: "Live",
        bids: "42 bids",
        category: "Automotive",
        closesIn: "00:08:41",
        imageClass: "m3-lot-car",
        increment: "AED 1,000",
        lotId: "11111111-1111-4111-8111-111111111111",
        lotNumber: "Lot #564458",
        price: "AED 3,500,000",
        reserve: "Reserve met",
        status: "winning",
        title: "Ferrari LaFerrari 2025",
      },
      {
        badge: "Ending soon",
        bids: "18 bids",
        category: "Heavy equipment",
        closesIn: "00:21:03",
        imageClass: "m3-lot-equipment",
        increment: "AED 500",
        lotId: "66666666-6666-4666-8666-666666666666",
        lotNumber: "Lot #566785",
        price: "AED 1,250,000",
        reserve: "Reserve not met",
        status: "outbid",
        title: "Caterpillar 214BFT 1998",
      },
      {
        badge: "New",
        bids: "6 bids",
        category: "General material",
        closesIn: "06:04:19",
        imageClass: "m3-lot-material",
        increment: "AED 250",
        lotId: "77777777-7777-4777-8777-777777777777",
        lotNumber: "Lot #563567",
        price: "AED 25,000",
        reserve: "No reserve",
        status: "neutral",
        title: "Fire-rated spare parts package",
      },
    ],
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
