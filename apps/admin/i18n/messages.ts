export const locales = ["en", "ar"] as const;
export type Locale = (typeof locales)[number];

export interface QueueItem {
  readonly approveEndpoint?: string;
  readonly amount: string;
  readonly lotId?: string;
  readonly meta: string;
  readonly rejectEndpoint?: string;
  readonly sla: string;
  readonly title: string;
}

export interface Metric {
  readonly label: string;
  readonly tone: "brand" | "danger" | "success" | "warning";
  readonly value: string;
}

export interface ActionItem {
  readonly description: string;
  readonly label: string;
}

export interface LotFormField {
  readonly label: string;
  readonly name: string;
  readonly placeholder: string;
  readonly type: "checkbox" | "number" | "select" | "text";
}

export interface AdminLotItem {
  readonly amount: string;
  readonly increment: string;
  readonly lifecycle: string;
  readonly lotNumber: string;
  readonly title: string;
}

export interface Messages {
  readonly actionRequired: string;
  readonly adminRole: string;
  readonly approveButton: string;
  readonly approvalQueue: readonly QueueItem[];
  readonly approvalsTitle: string;
  readonly auditEvents: readonly string[];
  readonly auditTitle: string;
  readonly auctionsActions: readonly ActionItem[];
  readonly auctionsTitle: string;
  readonly brand: string;
  readonly dashboardTitle: string;
  readonly eyebrow: string;
  readonly finalBidApprovalTitle: string;
  readonly heading: string;
  readonly localeSwitch: string;
  readonly localeSwitchHref: string;
  readonly lotFormFields: readonly LotFormField[];
  readonly lotFormSaveButton: string;
  readonly lotFormStaticNotice: string;
  readonly lotFormTitle: string;
  readonly lotListEmpty: string;
  readonly lotListTitle: string;
  readonly lotsActions: readonly ActionItem[];
  readonly lotsTitle: string;
  readonly metrics: readonly Metric[];
  readonly reviewButton: string;
  readonly rejectButton: string;
  readonly rejectionReasonLabel: string;
  readonly rejectionReasons: readonly ActionItem[];
  readonly reserveMetApprovalTitle: string;
  readonly shellLabel: string;
  readonly staticPreviewActionNotice: string;
  readonly status: string;
}

const lotFormFieldsEn: readonly LotFormField[] = [
  {
    label: "Title English",
    name: "titleEn",
    placeholder: "Toyota Land Cruiser 2019",
    type: "text",
  },
  {
    label: "Title Arabic",
    name: "titleAr",
    placeholder: "تويوتا لاند كروزر 2019",
    type: "text",
  },
  { label: "Lot #", name: "lotNumber", placeholder: "214", type: "text" },
  {
    label: "Starting bid AED",
    name: "startingBid",
    placeholder: "500000",
    type: "number",
  },
  {
    label: "Reserve AED",
    name: "reservePrice",
    placeholder: "540000",
    type: "number",
  },
  {
    label: "Bid increment mode",
    name: "incrementMode",
    placeholder: "Default percentage of starting price",
    type: "select",
  },
  {
    label: "Custom increment AED",
    name: "customIncrement",
    placeholder: "1000",
    type: "number",
  },
  {
    label: "Soft-close extension minutes",
    name: "softCloseExtensionMinutes",
    placeholder: "2",
    type: "number",
  },
  {
    label: "Featured lot",
    name: "featured",
    placeholder: "Promote on homepage",
    type: "checkbox",
  },
];

const lotFormFieldsAr: readonly LotFormField[] = [
  {
    label: "العنوان بالإنجليزية",
    name: "titleEn",
    placeholder: "Toyota Land Cruiser 2019",
    type: "text",
  },
  {
    label: "العنوان بالعربية",
    name: "titleAr",
    placeholder: "تويوتا لاند كروزر 2019",
    type: "text",
  },
  { label: "رقم القطعة", name: "lotNumber", placeholder: "214", type: "text" },
  {
    label: "سعر البداية AED",
    name: "startingBid",
    placeholder: "500000",
    type: "number",
  },
  {
    label: "الاحتياطي AED",
    name: "reservePrice",
    placeholder: "540000",
    type: "number",
  },
  {
    label: "طريقة زيادة المزايدة",
    name: "incrementMode",
    placeholder: "النسبة الافتراضية من سعر البداية",
    type: "select",
  },
  {
    label: "زيادة مخصصة AED",
    name: "customIncrement",
    placeholder: "1000",
    type: "number",
  },
  {
    label: "تمديد الإغلاق بالدقائق",
    name: "softCloseExtensionMinutes",
    placeholder: "2",
    type: "number",
  },
  {
    label: "قطعة مميزة",
    name: "featured",
    placeholder: "عرض في الواجهة",
    type: "checkbox",
  },
];

const messages: Record<Locale, Messages> = {
  ar: {
    actionRequired: "يتطلب سبباً وتأكيداً وسجل تدقيق",
    adminRole: "مدير العمليات",
    approveButton: "اعتماد",
    approvalQueue: [
      {
        amount: "AED 560,000",
        meta: "Lot #214 · Toyota Land Cruiser 2019",
        sla: "متبقٍ 42 دقيقة",
        title: "اعتماد عرض نهائي",
      },
      {
        amount: "AED 2,400,000",
        meta: "Lot #88 · Dubai Marina apartment",
        sla: "متبقٍ ساعتان",
        title: "الاحتياطي تحقق",
      },
      {
        amount: "AED 185,000",
        meta: "Lot #331 · Caterpillar excavator",
        sla: "متأخر 12 دقيقة",
        title: "مراجعة إيداع المشتري",
      },
    ],
    approvalsTitle: "قائمة الاعتمادات",
    auditEvents: [
      "تم إنشاء مزاد السيارات الأسبوعي بواسطة ops.admin",
      "تم تعديل زيادة المزايدة للقطعة #214 مع سبب موثق",
      "تم رفض عرض نهائي للقطعة #103 بسبب عدم تحقق الاحتياطي",
    ],
    auditTitle: "سجل التدقيق",
    auctionsActions: [
      {
        description:
          "نافذة التمديد الافتراضية دقيقتان، ويمكن تعديلها لكل قطعة.",
        label: "جدولة مزاد",
      },
      {
        description: "الإيقاف والاستئناف والإلغاء تتطلب سبباً ومعرف ارتباط.",
        label: "تحكم مباشر",
      },
    ],
    auctionsTitle: "إدارة المزادات",
    brand: "بايونير للمزادات",
    dashboardTitle: "لوحة العمليات",
    eyebrow: "مساحة إدارة المزادات",
    finalBidApprovalTitle: "اعتماد عرض نهائي",
    heading: "تحكم آمن في المزادات والقطع والاعتمادات.",
    localeSwitch: "English",
    localeSwitchHref: "/en",
    lotFormFields: lotFormFieldsAr,
    lotFormSaveButton: "حفظ كمسودة",
    lotFormStaticNotice:
      "نموذج القطعة معطل في المعاينة حتى يتم توصيل جلسة إدارة موثقة.",
    lotFormTitle: "نموذج إنشاء / تعديل قطعة",
    lotListEmpty: "لا توجد قطع من واجهة API بعد.",
    lotListTitle: "قطع من الخلفية",
    lotsActions: [
      {
        description: "حقول عربية وإنجليزية، صور، مستندات، سعر بداية واحتياطي.",
        label: "إنشاء قطعة",
      },
      {
        description:
          "زيادة افتراضية كنسبة من سعر البداية أو قيمة مخصصة لكل قطعة.",
        label: "قواعد المزايدة",
      },
      {
        description: "الاستيراد الجماعي يبدأ بفحص جاف وتقرير أخطاء قبل الحفظ.",
        label: "استيراد جماعي",
      },
    ],
    lotsTitle: "إدارة القطع",
    metrics: [
      { label: "مزادات مباشرة", tone: "success", value: "3" },
      { label: "اعتمادات معلقة", tone: "warning", value: "18" },
      { label: "قطع مميزة", tone: "brand", value: "42" },
      { label: "تنبيهات عالية الخطورة", tone: "danger", value: "2" },
    ],
    reviewButton: "مراجعة",
    rejectButton: "رفض",
    rejectionReasonLabel: "سبب الرفض",
    rejectionReasons: [
      {
        description: "لم يجتز المشتري متطلبات الأهلية.",
        label: "أهلية المشتري",
      },
      { description: "المستندات المطلوبة غير مكتملة.", label: "المستندات" },
      { description: "لم يتحقق سعر الاحتياطي.", label: "الاحتياطي" },
      { description: "تم سحب الأصل من البائع.", label: "سحب البائع" },
      { description: "سبب تشغيلي آخر مع ملاحظة.", label: "أخرى" },
    ],
    reserveMetApprovalTitle: "الاحتياطي تحقق",
    shellLabel: "لوحة إدارة بايونير",
    staticPreviewActionNotice:
      "الأزرار معطلة في المعاينة الثابتة حتى يتم تفعيل جلسة إدارة موثقة.",
    status:
      "هذه واجهة تشغيل أولية تعمل ببيانات نموذجية حتى تتوفر قاعدة PostgreSQL.",
  },
  en: {
    actionRequired: "Requires reason, confirmation, and audit record",
    adminRole: "Operations admin",
    approveButton: "Approve",
    approvalQueue: [
      {
        amount: "AED 560,000",
        meta: "Lot #214 · Toyota Land Cruiser 2019",
        sla: "42 min remaining",
        title: "Final-bid approval",
      },
      {
        amount: "AED 2,400,000",
        meta: "Lot #88 · Dubai Marina apartment",
        sla: "2 h remaining",
        title: "Reserve met",
      },
      {
        amount: "AED 185,000",
        meta: "Lot #331 · Caterpillar excavator",
        sla: "12 min overdue",
        title: "Buyer deposit review",
      },
    ],
    approvalsTitle: "Approval queue",
    auditEvents: [
      "Weekly car auction created by ops.admin",
      "Lot #214 bid increment changed with documented reason",
      "Final bid rejected for Lot #103 because reserve was not met",
    ],
    auditTitle: "Audit trail",
    auctionsActions: [
      {
        description:
          "Default soft-close window is 2 minutes, with per-lot override support.",
        label: "Schedule auction",
      },
      {
        description:
          "Pause, resume, and cancel require reason and correlation ID.",
        label: "Live controls",
      },
    ],
    auctionsTitle: "Auction operations",
    brand: "Pioneer Auctions",
    dashboardTitle: "Operations dashboard",
    eyebrow: "Auction admin workspace",
    finalBidApprovalTitle: "Final-bid approval",
    heading: "Safe control for auctions, lots, and approvals.",
    localeSwitch: "العربية",
    localeSwitchHref: "/ar",
    lotFormFields: lotFormFieldsEn,
    lotFormSaveButton: "Save draft",
    lotFormStaticNotice:
      "Lot form is disabled in the static preview until an authenticated admin runtime session is connected.",
    lotFormTitle: "Create / edit lot form",
    lotListEmpty: "No backend lots returned yet.",
    lotListTitle: "Backend lots",
    lotsActions: [
      {
        description:
          "English and Arabic fields, media, documents, starting price, and reserve.",
        label: "Create lot",
      },
      {
        description:
          "Default increment as a percentage of starting price or a custom lot value.",
        label: "Bidding rules",
      },
      {
        description:
          "Bulk import starts with dry-run validation and an error report.",
        label: "Bulk import",
      },
    ],
    lotsTitle: "Lot management",
    metrics: [
      { label: "Live auctions", tone: "success", value: "3" },
      { label: "Pending approvals", tone: "warning", value: "18" },
      { label: "Featured lots", tone: "brand", value: "42" },
      { label: "High-risk alerts", tone: "danger", value: "2" },
    ],
    reviewButton: "Review",
    rejectButton: "Reject",
    rejectionReasonLabel: "Rejection reason",
    rejectionReasons: [
      {
        description: "Buyer did not pass final eligibility checks.",
        label: "Buyer eligibility",
      },
      {
        description: "Required documents are incomplete.",
        label: "Documentation",
      },
      { description: "Reserve price was not met.", label: "Reserve not met" },
      { description: "Seller withdrew the asset.", label: "Seller withdrawn" },
      { description: "Other operational reason with note.", label: "Other" },
    ],
    reserveMetApprovalTitle: "Reserve met",
    shellLabel: "Pioneer admin console",
    staticPreviewActionNotice:
      "Actions are disabled in the static preview until an authenticated admin runtime session is available.",
    status:
      "This is a first operations UI slice using seed-style data until PostgreSQL is available.",
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
