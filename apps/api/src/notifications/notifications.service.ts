import { Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { randomUUID } from "node:crypto";

import type { UpdateNotificationPreferencesRequest } from "@pioneer/contracts";

import { DatabasePool } from "../database/database.pool.js";
import type {
  DevicePlatform,
  NotificationItem,
  NotificationPayload,
  UserPreferencesRow,
} from "./notification.types.js";
import { NotificationsRepository } from "./notifications.repository.js";
import {
  EMAIL_PROVIDER,
  type EmailNotificationProvider,
} from "./providers/email-provider.interface.js";
import {
  PUSH_PROVIDER,
  type PushNotificationProvider,
} from "./providers/push-provider.interface.js";
import { TemplateEngineService } from "./template-engine.service.js";

const TIME_CRITICAL_EVENT_TYPES = new Set([
  "OUTBID",
  "PROXY_EXCEEDED",
  "WINNER_PENDING_APPROVAL",
  "AUCTION_EXTENDED",
]);

export function isTimeInQuietHours(
  startHHMM: string,
  endHHMM: string,
  now = new Date(),
): boolean {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      hour: "2-digit",
      hour12: false,
      minute: "2-digit",
      timeZone: "Asia/Dubai",
    });
    const parts = formatter.formatToParts(now);
    const hour = Number.parseInt(
      parts.find((p) => p.type === "hour")?.value ?? "0",
      10,
    );
    const minute = Number.parseInt(
      parts.find((p) => p.type === "minute")?.value ?? "0",
      10,
    );
    const currentMinutes = hour * 60 + minute;

    const [startH = 22, startM = 0] = startHHMM.split(":").map(Number);
    const [endH = 7, endM = 0] = endHHMM.split(":").map(Number);

    const startMinutes = (startH ?? 22) * 60 + (startM ?? 0);
    const endMinutes = (endH ?? 7) * 60 + (endM ?? 0);

    if (startMinutes <= endMinutes) {
      return currentMinutes >= startMinutes && currentMinutes < endMinutes;
    }
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  } catch {
    return false;
  }
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @Inject(NotificationsRepository)
    private readonly repository: NotificationsRepository,
    @Inject(TemplateEngineService)
    private readonly templateEngine: TemplateEngineService,
    @Inject(PUSH_PROVIDER)
    private readonly pushProvider: PushNotificationProvider,
    @Inject(EMAIL_PROVIDER)
    private readonly emailProvider: EmailNotificationProvider,
    @Inject(DatabasePool)
    private readonly database: DatabasePool,
  ) {}

  async dispatchNotification(
    accountId: string,
    payload: NotificationPayload,
    dedupeSuffix?: string,
  ): Promise<{
    inAppId: string | null;
    pushSentCount: number;
    emailSent: boolean;
  }> {
    const preferences = await this.repository.getPreferences(accountId);
    const rendered = this.templateEngine.render(payload);
    const dedupeKey = `${payload.eventType}:${payload.lotId ?? "general"}:${dedupeSuffix ?? randomUUID()}`;

    // 1. In-App Notification
    const inApp = await this.repository.createNotification({
      accountId,
      bodyAr: rendered.bodyAr,
      bodyEn: rendered.bodyEn,
      dedupeKey,
      deepLink: rendered.deepLink,
      titleAr: rendered.titleAr,
      titleEn: rendered.titleEn,
      type: payload.eventType,
    });

    if (inApp) {
      // Record in central outbox_events for socket dispatch
      await this.database.query(
        `
          INSERT INTO outbox_events (
            aggregate_type,
            aggregate_id,
            event_name,
            payload,
            correlation_id
          )
          VALUES ($1, $2, $3, $4::jsonb, $5)
        `,
        [
          "account",
          accountId,
          "notification:created",
          JSON.stringify({
            contractVersion: 1,
            correlationId: `corr-${randomUUID()}`,
            data: {
              deepLink: inApp.deepLink,
              notificationId: inApp.id,
            },
            event: "notification:created",
            serverTime: inApp.createdAt,
          }),
          `corr-${randomUUID()}`,
        ],
      );
    }

    // Check quiet hours
    const inQuietHours =
      preferences.quiet_hours_enabled &&
      isTimeInQuietHours(
        preferences.quiet_hours_start,
        preferences.quiet_hours_end,
      );
    const isTimeCritical = TIME_CRITICAL_EVENT_TYPES.has(payload.eventType);
    const suppressByQuietHours = inQuietHours && !isTimeCritical;

    // Check category preferences
    const categoryAllowed = this.isCategoryAllowed(
      payload.eventType,
      preferences,
    );

    let pushSentCount = 0;
    // 2. Push Notification
    if (preferences.push_enabled && categoryAllowed) {
      const tokens = await this.repository.getDeviceTokens(accountId);
      for (const token of tokens) {
        const intentDedupe = `${dedupeKey}:push:${token.slice(0, 16)}`;
        if (suppressByQuietHours) {
          await this.repository.createIntent({
            accountId,
            channel: "PUSH",
            dedupeKey: intentDedupe,
            eventType: payload.eventType,
            payload: { reason: "quiet_hours_suppressed", token },
          });
          continue;
        }

        const intentId = await this.repository.createIntent({
          accountId,
          channel: "PUSH",
          dedupeKey: intentDedupe,
          eventType: payload.eventType,
          payload: { body: rendered.lockScreenBody, title: rendered.titleEn, token },
        });

        if (intentId) {
          try {
            const pushResult = await this.pushProvider.sendPush({
              body: rendered.lockScreenBody,
              deepLink: rendered.deepLink,
              title: rendered.titleEn,
              token,
            });
            if (pushResult.success) {
              await this.repository.updateIntentStatus(intentId, "SENT");
              pushSentCount++;
            } else {
              await this.repository.updateIntentStatus(
                intentId,
                "FAILED",
                pushResult.error,
              );
            }
          } catch (err) {
            await this.repository.updateIntentStatus(
              intentId,
              "FAILED",
              err instanceof Error ? err.message : String(err),
            );
          }
        }
      }
    }

    // 3. Email Notification
    let emailSent = false;
    if (preferences.email_enabled && categoryAllowed) {
      const email = await this.repository.getAccountEmail(accountId);
      if (email) {
        const intentDedupe = `${dedupeKey}:email`;
        if (suppressByQuietHours) {
          await this.repository.createIntent({
            accountId,
            channel: "EMAIL",
            dedupeKey: intentDedupe,
            eventType: payload.eventType,
            payload: { email, reason: "quiet_hours_suppressed" },
          });
        } else {
          const intentId = await this.repository.createIntent({
            accountId,
            channel: "EMAIL",
            dedupeKey: intentDedupe,
            eventType: payload.eventType,
            payload: { email, subject: rendered.titleEn },
          });

          if (intentId) {
            try {
              const emailResult = await this.emailProvider.sendEmail({
                html: `<p>${rendered.bodyEn}</p><p dir="rtl">${rendered.bodyAr}</p>`,
                subject: rendered.titleEn,
                text: `${rendered.bodyEn}\n\n${rendered.bodyAr}`,
                to: email,
              });
              if (emailResult.success) {
                await this.repository.updateIntentStatus(intentId, "SENT");
                emailSent = true;
              } else {
                await this.repository.updateIntentStatus(
                  intentId,
                  "FAILED",
                  emailResult.error,
                );
              }
            } catch (err) {
              await this.repository.updateIntentStatus(
                intentId,
                "FAILED",
                err instanceof Error ? err.message : String(err),
              );
            }
          }
        }
      }
    }

    return {
      emailSent,
      inAppId: inApp?.id ?? null,
      pushSentCount,
    };
  }

  private isCategoryAllowed(
    eventType: string,
    preferences: UserPreferencesRow,
  ): boolean {
    switch (eventType) {
      case "OUTBID":
      case "PROXY_EXCEEDED":
        return preferences.notify_outbid;
      case "ENDING_SOON":
      case "AUCTION_EXTENDED":
        return preferences.notify_ending_soon;
      case "DEPOSIT_CREDITED":
      case "REFUND_PROCESSED":
      case "REFUND_REJECTED":
        return preferences.notify_deposits;
      case "WINNER_PENDING_APPROVAL":
      case "BID_APPROVED":
      case "BID_REJECTED":
      case "BID_CONFIRMED":
        return true; // Core transactional
      default:
        return preferences.notify_marketing;
    }
  }

  async listNotifications(
    accountId: string,
    limit = 50,
  ): Promise<{ contractVersion: 1; items: NotificationItem[]; unreadCount: number }> {
    const { items, unreadCount } = await this.repository.listNotifications(
      accountId,
      limit,
    );
    return {
      contractVersion: 1,
      items,
      unreadCount,
    };
  }

  async markNotificationRead(
    accountId: string,
    notificationId: string,
  ): Promise<{
    contractVersion: 1;
    notificationId: string;
    isRead: boolean;
    readAt: string;
  }> {
    const readAt = await this.repository.markNotificationRead(
      accountId,
      notificationId,
    );
    if (!readAt) {
      throw new NotFoundException("Notification not found");
    }
    return {
      contractVersion: 1,
      isRead: true,
      notificationId,
      readAt,
    };
  }

  async markAllNotificationsRead(
    accountId: string,
  ): Promise<{ contractVersion: 1; markedCount: number }> {
    const markedCount =
      await this.repository.markAllNotificationsRead(accountId);
    return {
      contractVersion: 1,
      markedCount,
    };
  }

  async markAllRead(
    accountId: string,
  ): Promise<{ contractVersion: 1; markedCount: number }> {
    return this.markAllNotificationsRead(accountId);
  }

  async getPreferences(accountId: string): Promise<{
    contractVersion: 1;
    pushEnabled: boolean;
    emailEnabled: boolean;
    smsEnabled: boolean;
    notifyOutbid: boolean;
    notifyEndingSoon: boolean;
    notifyDeposits: boolean;
    notifyMarketing: boolean;
    quietHoursEnabled: boolean;
    quietHoursStart: string;
    quietHoursEnd: string;
  }> {
    const pref = await this.repository.getPreferences(accountId);
    return {
      contractVersion: 1,
      emailEnabled: pref.email_enabled,
      notifyDeposits: pref.notify_deposits,
      notifyEndingSoon: pref.notify_ending_soon,
      notifyMarketing: pref.notify_marketing,
      notifyOutbid: pref.notify_outbid,
      pushEnabled: pref.push_enabled,
      quietHoursEnabled: pref.quiet_hours_enabled,
      quietHoursEnd: pref.quiet_hours_end,
      quietHoursStart: pref.quiet_hours_start,
      smsEnabled: pref.sms_enabled,
    };
  }

  async updatePreferences(
    accountId: string,
    patch: UpdateNotificationPreferencesRequest,
  ): Promise<{
    contractVersion: 1;
    pushEnabled: boolean;
    emailEnabled: boolean;
    smsEnabled: boolean;
    notifyOutbid: boolean;
    notifyEndingSoon: boolean;
    notifyDeposits: boolean;
    notifyMarketing: boolean;
    quietHoursEnabled: boolean;
    quietHoursStart: string;
    quietHoursEnd: string;
  }> {
    const updated = await this.repository.upsertPreferences(accountId, patch);
    return {
      contractVersion: 1,
      emailEnabled: updated.email_enabled,
      notifyDeposits: updated.notify_deposits,
      notifyEndingSoon: updated.notify_ending_soon,
      notifyMarketing: updated.notify_marketing,
      notifyOutbid: updated.notify_outbid,
      pushEnabled: updated.push_enabled,
      quietHoursEnabled: updated.quiet_hours_enabled,
      quietHoursEnd: updated.quiet_hours_end,
      quietHoursStart: updated.quiet_hours_start,
      smsEnabled: updated.sms_enabled,
    };
  }

  async registerDeviceToken(
    accountId: string,
    token: string,
    platform: DevicePlatform,
  ): Promise<{ contractVersion: 1; registered: boolean }> {
    const registered = await this.repository.registerDeviceToken(
      accountId,
      token,
      platform,
    );
    return {
      contractVersion: 1,
      registered,
    };
  }

  async unregisterDeviceToken(
    accountId: string,
    token: string,
  ): Promise<{ contractVersion: 1; registered: boolean }> {
    const deleted = await this.repository.unregisterDeviceToken(
      accountId,
      token,
    );
    return {
      contractVersion: 1,
      registered: !deleted,
    };
  }
}
