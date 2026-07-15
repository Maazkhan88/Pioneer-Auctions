export const locales = ["en", "ar"] as const;
export type Locale = (typeof locales)[number];

export interface PreviewLot {
  readonly category: string;
  readonly imageClass: string;
  readonly lotNumber: string;
  readonly price: string;
  readonly time: string;
  readonly title: string;
  readonly bids: number;
  readonly increment: string;
}

export interface Messages {
  readonly auctionNumber: string;
  readonly bidAction: string;
  readonly brand: string;
  readonly brandArabic: string;
  readonly categories: string;
  readonly regions: string;
  readonly currentBid: string;
  readonly endingSoon: string;
  readonly endsIn: string;
  readonly eyebrow: string;
  readonly heading: string;
  readonly subtitle: string;
  readonly searchPlaceholder: string;
  readonly signin: string;
  readonly contact: string;
  readonly minIncrement: string;
  readonly lotNumberLabel: string;
  readonly phoneLabel: string;
  readonly addressLabel: string;
  readonly aboutUs: string;
  readonly sell: string;
  readonly quickLinks: string;
  readonly followUs: string;
  readonly downloadApp: string;
  readonly copyright: string;
  readonly localeSwitch: string;
  readonly localeSwitchHref: string;
  readonly lots: readonly PreviewLot[];
}

const messages: Record<Locale, Messages> = {
  ar: {
    auctionNumber: "مزاد #AU-2048",
    bidAction: "زايد الآن",
    brand: "بايونير للمزادات",
    brandArabic: "بايونير للمزادات",
    categories: "الفئات",
    regions: "المناطق",
    currentBid: "المزايدة الحالية",
    endingSoon: "ينتهي قريباً",
    endsIn: "ينتهي خلال",
    eyebrow: "وجهة المزايدات الموثوقة في الإمارات",
    heading: "بوابتك الموثوقة للمزادات في الإمارات",
    subtitle: "هاتف: 8007466337 • شارع المطار، دبي",
    searchPlaceholder: "البحث في المركبات والمعدات...",
    signin: "تسجيل الدخول",
    contact: "اتصل بنا",
    minIncrement: "الحد الأدنى للزيادة",
    lotNumberLabel: "قطعة #",
    phoneLabel: "8007466337",
    addressLabel: "شارع المطار، دبي",
    aboutUs: "من نحن",
    sell: "بيع",
    quickLinks: "روابط سريعة",
    followUs: "تابعنا على",
    downloadApp: "تحميل التطبيق الخاص بنا",
    copyright: "حقوق الطبع والنشر © 2026 بايونير للمزادات. جميع الحقوق محفوظة.",
    localeSwitch: "English",
    localeSwitchHref: "/en",
    lots: [
      {
        category: "سيارات",
        imageClass: "lot-image-car",
        lotNumber: "564886",
        price: "5,000 د.إ",
        time: "6 أيام : 5 ساعات",
        title: "مرسيدس بنتلي جي تي • 2023",
        bids: 12,
        increment: "500 د.إ",
      },
      {
        category: "قطع غيار ومواد عامة",
        imageClass: "lot-image-equipment",
        lotNumber: "563567",
        price: "25,000 د.إ",
        time: "6 ساعات",
        title: "صمام ومشبك مقاوم للحريق",
        bids: 6,
        increment: "500 د.إ",
      },
      {
        category: "معدات ثقيلة",
        imageClass: "lot-image-caterpillar",
        lotNumber: "566785",
        price: "1,250,000 د.إ",
        time: "4 أيام : ساعتان",
        title: "حفار كتربيلر 214BFT موديل 1998",
        bids: 42,
        increment: "500 د.إ",
      },
      {
        category: "سيارات",
        imageClass: "lot-image-ferrari",
        lotNumber: "564458",
        price: "3,500,000 د.إ",
        time: "6 أيام : 5 ساعات",
        title: "فيراري لافيراري موديل 2025",
        bids: 18,
        increment: "1,000 د.إ",
      },
    ],
  },
  en: {
    auctionNumber: "Auction #AU-2048",
    bidAction: "Bid now",
    brand: "Pioneer Auctions",
    brandArabic: "بايونير للمزادات",
    categories: "Categories",
    regions: "Regions",
    currentBid: "Current Bid",
    endingSoon: "Ending soon",
    endsIn: "Ends in",
    eyebrow: "UAE's Trusted Auction Destination.",
    heading: "UAE's Trusted Auction Destination.",
    subtitle: "8007466337 • Airport Rd. Dubai",
    searchPlaceholder: "Search in Vehicles and Machinery",
    signin: "Sign In",
    contact: "Contact",
    minIncrement: "Minimum bid increment",
    lotNumberLabel: "Lot # ",
    phoneLabel: "8007466337",
    addressLabel: "Airport Rd. Dubai",
    aboutUs: "About Us",
    sell: "Sell",
    quickLinks: "Quick Links",
    followUs: "Follow Us",
    downloadApp: "Download Our App",
    copyright: "© 2026 Pioneer Auctions. All rights reserved.",
    localeSwitch: "العربية",
    localeSwitchHref: "/ar",
    lots: [
      {
        category: "Automotive",
        imageClass: "lot-image-car",
        lotNumber: "564886",
        price: "AED 5,000",
        time: "6D : 5H",
        title: "Car Name XYZ",
        bids: 12,
        increment: "AED 500",
      },
      {
        category: "General Material",
        imageClass: "lot-image-equipment",
        lotNumber: "563567",
        price: "AED 25,000",
        time: "6H",
        title: "Fire Rated Spare Parts",
        bids: 6,
        increment: "AED 500",
      },
      {
        category: "Heavy equipment",
        imageClass: "lot-image-caterpillar",
        lotNumber: "566785",
        price: "AED 1,250,000",
        time: "4D : 2H",
        title: "Caterpillar 214BFT 1998",
        bids: 42,
        increment: "AED 500",
      },
      {
        category: "Automotive",
        imageClass: "lot-image-ferrari",
        lotNumber: "564458",
        price: "AED 3,500,000",
        time: "6D : 5H",
        title: "Ferrari 2025",
        bids: 18,
        increment: "AED 1,000",
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
