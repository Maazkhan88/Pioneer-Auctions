import type { FinalBidRejectionReasonCode } from "../lib/admin-actions";

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

export interface RejectionReasonOption {
  readonly code: FinalBidRejectionReasonCode;
  readonly description: string;
  readonly label: string;
}

export interface LotFormField {
  readonly label: string;
  readonly name: string;
  readonly optional?: boolean;
  readonly placeholder: string;
  readonly type: "datetime-local" | "number" | "text";
}

export interface AdminLotItem {
  readonly amount: string;
  readonly closesAt: string;
  readonly id: string;
  readonly increment: string;
  readonly lifecycle: string;
  readonly lotNumber: string;
  readonly softCloseExtensionMs: number | null;
  readonly softCloseMaximumExtensions: number | null;
  readonly softCloseWindowMs: number | null;
  readonly startsAt: string;
  readonly title: string;
  readonly titleAr: string;
  readonly titleEn: string;
}

export interface AdminAuditEventItem {
  readonly action: string;
  readonly actorAccountId: string | null;
  readonly id: string;
  readonly occurredAt: string;
  readonly subjectId: string | null;
  readonly subjectType: string;
}

export interface AdminAuctionItem {
  readonly closesAt: string;
  readonly id: string;
  readonly lifecycle: string;
  readonly startsAt: string;
  readonly title: string;
  readonly titleAr: string;
  readonly titleEn: string;
}

export interface Messages {
  readonly actionErrorLabel: string;
  readonly actionPendingLabel: string;
  readonly actionRequired: string;
  readonly adminRole: string;
  readonly approveButton: string;
  readonly approveSuccessLabel: string;
  readonly approvalQueue: readonly QueueItem[];
  readonly approvalsTitle: string;
  readonly auctionClosesAtLabel: string;
  readonly auctionCreateButton: string;
  readonly auctionCreateTitle: string;
  readonly auctionListEmpty: string;
  readonly auctionListTitle: string;
  readonly auctionNoteLabel: string;
  readonly auctionReasonLabel: string;
  readonly auctionReasonPlaceholder: string;
  readonly auctionStartsAtLabel: string;
  readonly auctionTitleArLabel: string;
  readonly auctionTitleEnLabel: string;
  readonly auditEvents: readonly string[];
  readonly auditTitle: string;
  readonly auctionsActions: readonly ActionItem[];
  readonly auctionsTitle: string;
  readonly brand: string;
  readonly bulkImportCommitButton: string;
  readonly bulkImportCommittedLabel: string;
  readonly bulkImportNotCommittedLabel: string;
  readonly bulkImportParseError: string;
  readonly bulkImportPlaceholder: string;
  readonly bulkImportPreviewButton: string;
  readonly bulkImportRowsLabel: string;
  readonly bulkImportTitle: string;
  readonly cancelAuctionButton: string;
  readonly cancelButton: string;
  readonly dashboardTitle: string;
  readonly decisionNoteLabel: string;
  readonly decisionNotePlaceholder: string;
  readonly editButton: string;
  readonly eyebrow: string;
  readonly finalBidApprovalTitle: string;
  readonly formValidationError: string;
  readonly heading: string;
  readonly localeSwitch: string;
  readonly localeSwitchHref: string;
  readonly lotAuctionLabel: string;
  readonly lotAuctionPlaceholder: string;
  readonly lotCreateSuccess: string;
  readonly lotEditMoneyNotice: string;
  readonly lotFormFields: readonly LotFormField[];
  readonly lotFormSaveButton: string;
  readonly lotFormStaticNotice: string;
  readonly lotFormTitle: string;
  readonly lotIncrementModeCustomLabel: string;
  readonly lotIncrementModeLabel: string;
  readonly lotIncrementModePercentLabel: string;
  readonly lotIncrementValueLabel: string;
  readonly lotListEmpty: string;
  readonly lotNoAuctionsNotice: string;
  readonly lotListTitle: string;
  readonly lotsActions: readonly ActionItem[];
  readonly lotsTitle: string;
  readonly metrics: readonly Metric[];
  readonly pauseButton: string;
  readonly resumeButton: string;
  readonly reviewButton: string;
  readonly rejectButton: string;
  readonly rejectSuccessLabel: string;
  readonly rejectionReasonLabel: string;
  readonly rejectionReasons: readonly RejectionReasonOption[];
  readonly reserveMetApprovalTitle: string;
  readonly saveButton: string;
  readonly shellLabel: string;
  readonly staticPreviewActionNotice: string;
  readonly status: string;
}

const lotFormFieldsEn: readonly LotFormField[] = [
  { label: "Lot #", name: "lotNumber", placeholder: "214", type: "text" },
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
  {
    label: "Starts at",
    name: "startsAt",
    placeholder: "2026-09-08T14:00",
    type: "datetime-local",
  },
  {
    label: "Closes at",
    name: "closesAt",
    placeholder: "2026-09-08T18:00",
    type: "datetime-local",
  },
  {
    label: "Starting bid AED",
    name: "startingBid",
    placeholder: "500000",
    type: "number",
  },
  {
    label: "Reserve AED",
    name: "reservePrice",
    optional: true,
    placeholder: "540000",
    type: "number",
  },
  {
    label: "Soft-close window minutes",
    name: "softCloseWindowMinutes",
    optional: true,
    placeholder: "2",
    type: "number",
  },
  {
    label: "Soft-close extension minutes",
    name: "softCloseExtensionMinutes",
    optional: true,
    placeholder: "2",
    type: "number",
  },
  {
    label: "Maximum soft-close extensions",
    name: "softCloseMaximumExtensions",
    optional: true,
    placeholder: "5",
    type: "number",
  },
];

const lotFormFieldsAr: readonly LotFormField[] = [
  { label: "رقم القطعة", name: "lotNumber", placeholder: "214", type: "text" },
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
  {
    label: "وقت البدء",
    name: "startsAt",
    placeholder: "2026-09-08T14:00",
    type: "datetime-local",
  },
  {
    label: "وقت الإغلاق",
    name: "closesAt",
    placeholder: "2026-09-08T18:00",
    type: "datetime-local",
  },
  {
    label: "سعر البداية AED",
    name: "startingBid",
    placeholder: "500000",
    type: "number",
  },
  {
    label: "الاحتياطي AED",
    name: "reservePrice",
    optional: true,
    placeholder: "540000",
    type: "number",
  },
  {
    label: "نافذة الإغلاق الناعم بالدقائق",
    name: "softCloseWindowMinutes",
    optional: true,
    placeholder: "2",
    type: "number",
  },
  {
    label: "تمديد الإغلاق بالدقائق",
    name: "softCloseExtensionMinutes",
    optional: true,
    placeholder: "2",
    type: "number",
  },
  {
    label: "الحد الأقصى لعدد التمديدات",
    name: "softCloseMaximumExtensions",
    optional: true,
    placeholder: "5",
    type: "number",
  },
];

const messages: Record<Locale, Messages> = {
  ar: {
    actionErrorLabel: "فشل الإجراء. حاول مرة أخرى.",
    actionPendingLabel: "جارٍ الإرسال…",
    actionRequired: "يتطلب سبباً وتأكيداً وسجل تدقيق",
    adminRole: "مدير العمليات",
    approveButton: "اعتماد",
    approveSuccessLabel: "تم الاعتماد",
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
    auctionClosesAtLabel: "وقت الإغلاق",
    auctionCreateButton: "جدولة",
    auctionCreateTitle: "جدولة مزاد جديد",
    auctionListEmpty: "لا توجد مزادات من واجهة API بعد.",
    auctionListTitle: "المزادات المباشرة",
    auctionNoteLabel: "ملاحظة (اختياري)",
    auctionReasonLabel: "السبب",
    auctionReasonPlaceholder: "سبب تشغيلي موثق",
    auctionStartsAtLabel: "وقت البدء",
    auctionTitleArLabel: "العنوان بالعربية",
    auctionTitleEnLabel: "العنوان بالإنجليزية",
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
    bulkImportCommitButton: "استيراد",
    bulkImportCommittedLabel: "تم إنشاء جميع القطع",
    bulkImportNotCommittedLabel:
      "لم يتم إنشاء أي قطعة. أصلح الصفوف التي بها أخطاء وحاول مرة أخرى.",
    bulkImportParseError: "يجب أن يكون النص مصفوفة JSON صالحة من صفوف القطع.",
    bulkImportPlaceholder:
      '[\n  {\n    "auctionId": "...",\n    "lotNumber": "301",\n    "titleEn": "...",\n    "titleAr": "...",\n    "startsAt": "2026-09-08T14:00:00.000Z",\n    "closesAt": "2026-09-08T18:00:00.000Z",\n    "startingBidFils": 5000000,\n    "minimumIncrementPercentBps": 500\n  }\n]',
    bulkImportPreviewButton: "معاينة (فحص جاف)",
    bulkImportRowsLabel: "صفوف القطع (مصفوفة JSON)",
    bulkImportTitle: "استيراد جماعي",
    cancelAuctionButton: "إلغاء",
    cancelButton: "إلغاء الأمر",
    dashboardTitle: "لوحة العمليات",
    decisionNoteLabel: "ملاحظة (اختياري)",
    decisionNotePlaceholder: "سياق إضافي للقرار",
    editButton: "تعديل",
    eyebrow: "مساحة إدارة المزادات",
    finalBidApprovalTitle: "اعتماد عرض نهائي",
    formValidationError: "تحقق من الحقول المطلوبة وحاول مرة أخرى.",
    heading: "تحكم آمن في المزادات والقطع والاعتمادات.",
    localeSwitch: "English",
    localeSwitchHref: "/en",
    lotAuctionLabel: "المزاد",
    lotAuctionPlaceholder: "اختر مزاداً",
    lotCreateSuccess: "تم إنشاء القطعة",
    lotEditMoneyNotice:
      "لا يمكن تعديل سعر البداية والاحتياطي وطريقة الزيادة بعد الإنشاء في هذه النسخة.",
    lotFormFields: lotFormFieldsAr,
    lotFormSaveButton: "إنشاء القطعة",
    lotFormStaticNotice:
      "نموذج القطعة معطل في المعاينة حتى يتم توصيل جلسة إدارة موثقة.",
    lotFormTitle: "نموذج إنشاء قطعة",
    lotIncrementModeCustomLabel: "قيمة مخصصة (fils)",
    lotIncrementModeLabel: "طريقة زيادة المزايدة",
    lotIncrementModePercentLabel: "نسبة من سعر البداية (basis points)",
    lotIncrementValueLabel: "قيمة الزيادة",
    lotListEmpty: "لا توجد قطع من واجهة API بعد.",
    lotNoAuctionsNotice:
      "أنشئ مزاداً أولاً — يجب أن تنتمي القطعة إلى مزاد قائم.",
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
    pauseButton: "إيقاف",
    resumeButton: "استئناف",
    reviewButton: "مراجعة",
    rejectButton: "رفض",
    rejectSuccessLabel: "تم الرفض",
    rejectionReasonLabel: "سبب الرفض",
    rejectionReasons: [
      {
        code: "BUYER_ELIGIBILITY_FAILED",
        description: "لم يجتز المشتري متطلبات الأهلية.",
        label: "أهلية المشتري",
      },
      {
        code: "DOCUMENTATION_INCOMPLETE",
        description: "المستندات المطلوبة غير مكتملة.",
        label: "المستندات",
      },
      {
        code: "RESERVE_NOT_MET",
        description: "لم يتحقق سعر الاحتياطي.",
        label: "الاحتياطي",
      },
      {
        code: "SELLER_WITHDRAWN",
        description: "تم سحب الأصل من البائع.",
        label: "سحب البائع",
      },
      {
        code: "OTHER",
        description: "سبب تشغيلي آخر مع ملاحظة.",
        label: "أخرى",
      },
    ],
    reserveMetApprovalTitle: "الاحتياطي تحقق",
    saveButton: "حفظ",
    shellLabel: "لوحة إدارة بايونير",
    staticPreviewActionNotice:
      "الأزرار معطلة في المعاينة الثابتة حتى يتم تفعيل جلسة إدارة موثقة.",
    status:
      "هذه واجهة تشغيل أولية تعمل ببيانات نموذجية حتى تتوفر قاعدة PostgreSQL.",
  },
  en: {
    actionErrorLabel: "Action failed. Try again.",
    actionPendingLabel: "Submitting…",
    actionRequired: "Requires reason, confirmation, and audit record",
    adminRole: "Operations admin",
    approveButton: "Approve",
    approveSuccessLabel: "Approved",
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
    auctionClosesAtLabel: "Closes at",
    auctionCreateButton: "Schedule",
    auctionCreateTitle: "Schedule a new auction",
    auctionListEmpty: "No backend auctions returned yet.",
    auctionListTitle: "Live auctions",
    auctionNoteLabel: "Note (optional)",
    auctionReasonLabel: "Reason",
    auctionReasonPlaceholder: "Documented operational reason",
    auctionStartsAtLabel: "Starts at",
    auctionTitleArLabel: "Title Arabic",
    auctionTitleEnLabel: "Title English",
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
    bulkImportCommitButton: "Import",
    bulkImportCommittedLabel: "All lots were created",
    bulkImportNotCommittedLabel:
      "No lots were created. Fix the rows with errors and try again.",
    bulkImportParseError: "Text must be a valid JSON array of lot rows.",
    bulkImportPlaceholder:
      '[\n  {\n    "auctionId": "...",\n    "lotNumber": "301",\n    "titleEn": "...",\n    "titleAr": "...",\n    "startsAt": "2026-09-08T14:00:00.000Z",\n    "closesAt": "2026-09-08T18:00:00.000Z",\n    "startingBidFils": 5000000,\n    "minimumIncrementPercentBps": 500\n  }\n]',
    bulkImportPreviewButton: "Preview (dry run)",
    bulkImportRowsLabel: "Lot rows (JSON array)",
    bulkImportTitle: "Bulk import",
    cancelAuctionButton: "Cancel",
    cancelButton: "Cancel",
    dashboardTitle: "Operations dashboard",
    decisionNoteLabel: "Note (optional)",
    decisionNotePlaceholder: "Additional context for this decision",
    editButton: "Edit",
    eyebrow: "Auction admin workspace",
    finalBidApprovalTitle: "Final-bid approval",
    formValidationError: "Check the required fields and try again.",
    heading: "Safe control for auctions, lots, and approvals.",
    localeSwitch: "العربية",
    localeSwitchHref: "/ar",
    lotAuctionLabel: "Auction",
    lotAuctionPlaceholder: "Select an auction",
    lotCreateSuccess: "Lot created",
    lotEditMoneyNotice:
      "Starting bid, reserve, and increment cannot be edited after creation yet.",
    lotFormFields: lotFormFieldsEn,
    lotFormSaveButton: "Create lot",
    lotFormStaticNotice:
      "Lot form is disabled in the static preview until an authenticated admin runtime session is connected.",
    lotFormTitle: "Create lot form",
    lotIncrementModeCustomLabel: "Custom value (fils)",
    lotIncrementModeLabel: "Bid increment mode",
    lotIncrementModePercentLabel: "Percentage of starting price (basis points)",
    lotIncrementValueLabel: "Increment value",
    lotListEmpty: "No backend lots returned yet.",
    lotNoAuctionsNotice:
      "Create an auction first — a lot must belong to an existing auction.",
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
    pauseButton: "Pause",
    resumeButton: "Resume",
    reviewButton: "Review",
    rejectButton: "Reject",
    rejectSuccessLabel: "Rejected",
    rejectionReasonLabel: "Rejection reason",
    rejectionReasons: [
      {
        code: "BUYER_ELIGIBILITY_FAILED",
        description: "Buyer did not pass final eligibility checks.",
        label: "Buyer eligibility",
      },
      {
        code: "DOCUMENTATION_INCOMPLETE",
        description: "Required documents are incomplete.",
        label: "Documentation",
      },
      {
        code: "RESERVE_NOT_MET",
        description: "Reserve price was not met.",
        label: "Reserve not met",
      },
      {
        code: "SELLER_WITHDRAWN",
        description: "Seller withdrew the asset.",
        label: "Seller withdrawn",
      },
      {
        code: "OTHER",
        description: "Other operational reason with note.",
        label: "Other",
      },
    ],
    reserveMetApprovalTitle: "Reserve met",
    saveButton: "Save",
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
