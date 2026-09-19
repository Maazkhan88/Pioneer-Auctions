import { Injectable } from "@nestjs/common";
import { formatMoney } from "@pioneer/contracts";

import type {
  NotificationPayload,
  RenderedTemplate,
} from "./notification.types.js";

function isolateAr(text: string): string {
  return `\u2066${text}\u2069`;
}

@Injectable()
export class TemplateEngineService {
  render(payload: NotificationPayload): RenderedTemplate {
    const lotNumber = payload.lotNumber ?? "—";
    const defaultLotLink = payload.lotId ? `/lot/${payload.lotId}` : "/lots";
    const deepLink = payload.deepLink ?? defaultLotLink;

    switch (payload.eventType) {
      case "BID_CONFIRMED": {
        const amountEn = payload.amountFils
          ? formatMoney(payload.amountFils, "en")
          : "AED —";
        const amountAr = payload.amountFils
          ? isolateAr(formatMoney(payload.amountFils, "ar"))
          : "د.إ —";
        return {
          bodyAr: `تم تسجيل وتأكيد عرضك بقيمة ${amountAr} على اللوت #${lotNumber} بنجاح.`,
          bodyEn: `Your bid of ${amountEn} on Lot #${lotNumber} has been recorded and confirmed.`,
          deepLink,
          lockScreenBody: `Bid confirmed: ${amountEn} on Lot #${lotNumber}`,
          titleAr: "تم تأكيد المزايدة",
          titleEn: "Bid Confirmed",
        };
      }

      case "OUTBID": {
        const nextMinEn = payload.nextBidFils
          ? formatMoney(payload.nextBidFils, "en")
          : "higher amount";
        const nextMinAr = payload.nextBidFils
          ? isolateAr(formatMoney(payload.nextBidFils, "ar"))
          : "مبلغ أعلى";
        const currentEn = payload.currentBidFils
          ? formatMoney(payload.currentBidFils, "en")
          : "";
        const currentAr = payload.currentBidFils
          ? isolateAr(formatMoney(payload.currentBidFils, "ar"))
          : "";
        return {
          bodyAr: `قام مزايد آخر بتقديم عرض أعلى${currentAr ? ` بقيمة ${currentAr}` : ""}. الحد الأدنى للمزايدة القادمة هو ${nextMinAr}.`,
          bodyEn: `Another bidder placed a higher bid${currentEn ? ` of ${currentEn}` : ""}. The next minimum bid is ${nextMinEn}.`,
          deepLink,
          lockScreenBody: `Someone placed a higher bid on Lot #${lotNumber}. Tap to bid again.`,
          titleAr: "تمت المزايدة عليك!",
          titleEn: "You've been outbid!",
        };
      }

      case "PROXY_EXCEEDED": {
        return {
          bodyAr: `وصل المزاد على اللوت #${lotNumber} إلى حد المزايدة التلقائية الخاص بك. يمكنك رفع الحد للمتابعة.`,
          bodyEn: `The bidding on Lot #${lotNumber} reached your maximum proxy bid. Increase your max bid to stay in the lead.`,
          deepLink,
          lockScreenBody: `Your maximum bid on Lot #${lotNumber} was reached. Tap to raise it.`,
          titleAr: "تم تجاوز حد المزايدة التلقائية",
          titleEn: "Proxy Max Bid Reached",
        };
      }

      case "ENDING_SOON": {
        const timeRemaining = payload.timeRemaining ?? "soon";
        return {
          bodyAr: `سينتهي المزاد على اللوت #${lotNumber} خلال ${isolateAr(timeRemaining)}. لا تفوت الفرصة!`,
          bodyEn: `Bidding on Lot #${lotNumber} will close in ${timeRemaining}. Don't miss out!`,
          deepLink,
          lockScreenBody: `Lot #${lotNumber} is closing ${timeRemaining}. Tap to view.`,
          titleAr: "المزاد ينتهي قريباً",
          titleEn: "Auction Ending Soon",
        };
      }

      case "AUCTION_EXTENDED": {
        return {
          bodyAr: `تم تمديد اللوت #${lotNumber} لمدة دقيقتين إضافيتين بسبب مزايدة في اللحظات الأخيرة (تمديد تلقائي).`,
          bodyEn: `Lot #${lotNumber} was extended by 2 minutes due to last-minute bidding (soft-close).`,
          deepLink,
          lockScreenBody: `Lot #${lotNumber} extended by 2 minutes (soft-close).`,
          titleAr: "تم تمديد وقت المزاد",
          titleEn: "Auction Extended",
        };
      }

      case "WINNER_PENDING_APPROVAL": {
        return {
          bodyAr: `أُغلق المزاد وأنت صاحب أعلى عرض على اللوت #${lotNumber}. جارٍ انتظار مراجعة المزايدة النهائية.`,
          bodyEn: `The auction has closed and you are the highest bidder on Lot #${lotNumber}. Final-bid approval is pending.`,
          deepLink,
          lockScreenBody: `You are the highest bidder on Lot #${lotNumber}. Approval pending.`,
          titleAr: "أعلى عرض — بانتظار الموافقة",
          titleEn: "Highest Bidder — Approval Pending",
        };
      }

      case "BID_APPROVED": {
        return {
          bodyAr: `تمت الموافقة الرسمية على فوزك باللوت #${lotNumber}. يُرجى استكمال إجراءات الدفع والاستلام.`,
          bodyEn: `Your winning bid on Lot #${lotNumber} has been approved! Please proceed with payment and collection.`,
          deepLink,
          lockScreenBody: `Winning bid approved for Lot #${lotNumber}!`,
          titleAr: "تمت الموافقة على المزايدة الفائزة",
          titleEn: "Winning Bid Approved!",
        };
      }

      case "BID_REJECTED": {
        const reason = payload.reason ? ` (${payload.reason})` : "";
        return {
          bodyAr: `لم تتم الموافقة على العرض النهائي على اللوت #${lotNumber}${reason}. تم تحرير أي تأمين محجوز.`,
          bodyEn: `The final bid on Lot #${lotNumber} was not approved${reason}. Any reserved deposit hold has been released.`,
          deepLink,
          lockScreenBody: `Final bid on Lot #${lotNumber} was not approved.`,
          titleAr: "لم تتم الموافقة على العرض النهائي",
          titleEn: "Final Bid Not Approved",
        };
      }

      case "DEPOSIT_CREDITED": {
        const amountEn = payload.amountFils
          ? formatMoney(payload.amountFils, "en")
          : "AED —";
        const amountAr = payload.amountFils
          ? isolateAr(formatMoney(payload.amountFils, "ar"))
          : "د.إ —";
        return {
          bodyAr: `تم إيداع مبلغ التأمين ${amountAr} في حسابك بنجاح. أصبحت مؤهلاً للمزايدة.`,
          bodyEn: `A security deposit of ${amountEn} has been credited to your account. You are eligible to bid.`,
          deepLink: "/account/deposits",
          lockScreenBody: `Security deposit of ${amountEn} credited.`,
          titleAr: "تم إيداع التأمين بنجاح",
          titleEn: "Deposit Credited",
        };
      }

      case "REFUND_PROCESSED": {
        const amountEn = payload.amountFils
          ? formatMoney(payload.amountFils, "en")
          : "AED —";
        const amountAr = payload.amountFils
          ? isolateAr(formatMoney(payload.amountFils, "ar"))
          : "د.إ —";
        return {
          bodyAr: `تمت الموافقة على طلب استرداد مبلغ ${amountAr} وإرساله إلى وسيلة الدفع الأصلية (خلال 3-5 أيام عمل).`,
          bodyEn: `Your refund request for ${amountEn} has been processed and sent to your original payment method (3-5 business days).`,
          deepLink: "/account/deposits",
          lockScreenBody: `Refund of ${amountEn} has been processed.`,
          titleAr: "تمت معالجة استرداد التأمين",
          titleEn: "Deposit Refund Processed",
        };
      }

      case "REFUND_REJECTED": {
        const reason = payload.reason ? `: ${payload.reason}` : "";
        return {
          bodyAr: `تم رفض طلب استرداد مبلغ التأمين${reason}. يُرجى مراجعة إدارة العمليات.`,
          bodyEn: `Your deposit refund request was rejected${reason}. Please contact operations support for assistance.`,
          deepLink: "/account/deposits",
          lockScreenBody: "Deposit refund request was rejected.",
          titleAr: "تم رفض طلب استرداد التأمين",
          titleEn: "Deposit Refund Rejected",
        };
      }
    }
  }
}
