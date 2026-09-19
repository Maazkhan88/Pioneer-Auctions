export type { DevicePlatform, NotificationItem } from "@pioneer/contracts";

export type NotificationChannel = "IN_APP" | "PUSH" | "EMAIL" | "SMS";

export type NotificationEventType =
  | "BID_CONFIRMED"
  | "OUTBID"
  | "PROXY_EXCEEDED"
  | "ENDING_SOON"
  | "AUCTION_EXTENDED"
  | "WINNER_PENDING_APPROVAL"
  | "BID_APPROVED"
  | "BID_REJECTED"
  | "DEPOSIT_CREDITED"
  | "REFUND_PROCESSED"
  | "REFUND_REJECTED";

export interface NotificationPayload {
  readonly eventType: NotificationEventType;
  readonly lotId?: string;
  readonly lotNumber?: string;
  readonly titleEn?: string;
  readonly titleAr?: string;
  readonly amountFils?: number;
  readonly currentBidFils?: number;
  readonly nextBidFils?: number;
  readonly timeRemaining?: string;
  readonly reason?: string;
  readonly deepLink?: string;
}

export interface RenderedTemplate {
  readonly titleEn: string;
  readonly titleAr: string;
  readonly bodyEn: string;
  readonly bodyAr: string;
  readonly lockScreenBody: string;
  readonly deepLink: string;
}

export interface InAppNotificationRow {
  readonly id: string;
  readonly account_id: string;
  readonly type: NotificationEventType;
  readonly title_en: string;
  readonly title_ar: string;
  readonly body_en: string;
  readonly body_ar: string;
  readonly deep_link: string | null;
  readonly read_at: string | null;
  readonly created_at: string;
  readonly dedupe_key: string;
}

export interface NotificationIntentRow {
  readonly id: string;
  readonly account_id: string;
  readonly channel: NotificationChannel;
  readonly event_type: NotificationEventType;
  readonly status: "PENDING" | "SENT" | "FAILED" | "SUPPRESSED";
  readonly attempts: number;
  readonly last_error: string | null;
  readonly dedupe_key: string;
  readonly payload_json: Record<string, unknown>;
  readonly created_at: string;
  readonly sent_at: string | null;
}

export interface UserPreferencesRow {
  readonly account_id: string;
  readonly push_enabled: boolean;
  readonly email_enabled: boolean;
  readonly sms_enabled: boolean;
  readonly notify_outbid: boolean;
  readonly notify_ending_soon: boolean;
  readonly notify_deposits: boolean;
  readonly notify_marketing: boolean;
  readonly quiet_hours_enabled: boolean;
  readonly quiet_hours_start: string;
  readonly quiet_hours_end: string;
  readonly updated_at: string;
}

export interface DeviceTokenRow {
  readonly id: string;
  readonly account_id: string;
  readonly token: string;
  readonly platform: "ANDROID" | "IOS" | "WEB";
  readonly created_at: string;
  readonly last_active_at: string;
}
