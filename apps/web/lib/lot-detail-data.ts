import type { Locale, PreviewLot } from "../i18n/messages";
import { loadBuyerHomeData } from "./home-data";
import { messagesFor } from "../i18n/messages";

export interface LotDetailData {
  readonly description: string;
  readonly documents: readonly string[];
  readonly feeLines: readonly {
    readonly label: string;
    readonly value: string;
  }[];
  readonly lot: PreviewLot;
  readonly specs: readonly { readonly label: string; readonly value: string }[];
}

export async function loadLotDetailData(
  locale: Locale,
  lotId: string,
): Promise<LotDetailData | null> {
  const homeData = await loadBuyerHomeData(locale, messagesFor(locale));
  const lot = homeData.lots.find(
    (candidate) =>
      candidate.lotId === lotId ||
      candidate.lotNumber.replace(/[^0-9]/g, "") === lotId,
  );
  if (lot === undefined) {
    return null;
  }

  return {
    description:
      locale === "ar"
        ? "معاينة تفصيلية للقطعة مع حالة الاحتياطي، الزيادة التالية، والمستندات الأساسية. هذه صفحة اختبار حتى يتم ربط بيانات التفاصيل الكاملة."
        : "Detailed lot preview with reserve state, next valid bid, and core documents. This is a test detail page until full detail data is connected.",
    documents:
      locale === "ar"
        ? ["تقرير الفحص", "مستند الملكية", "شروط المزاد"]
        : ["Inspection report", "Ownership document", "Auction terms"],
    feeLines:
      locale === "ar"
        ? [
            { label: "وديعة اختبار", value: "AED 5,000" },
            { label: "رسوم المشتري", value: "تظهر قبل تأكيد المزايدة" },
          ]
        : [
            { label: "Test deposit", value: "AED 5,000" },
            { label: "Buyer premium", value: "Shown before bid confirmation" },
          ],
    lot,
    specs:
      locale === "ar"
        ? [
            { label: "رقم القطعة", value: lot.lotNumber },
            { label: "الفئة", value: lot.category },
            { label: "الحالة", value: lot.badge },
          ]
        : [
            { label: "Lot number", value: lot.lotNumber },
            { label: "Category", value: lot.category },
            { label: "Status", value: lot.badge },
          ],
  };
}
