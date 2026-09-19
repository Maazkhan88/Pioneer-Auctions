import { BadRequestException } from "@nestjs/common";
import type { Request } from "express";
import { describe, expect, it } from "vitest";

import type { SessionService } from "../src/auth/session.service.js";
import type { DatabasePool } from "../src/database/database.pool.js";
import { DeviceTokensController } from "../src/notifications/device-tokens.controller.js";
import { NotificationsController } from "../src/notifications/notifications.controller.js";
import { NotificationsRepository } from "../src/notifications/notifications.repository.js";
import {
  isTimeInQuietHours,
  NotificationsService,
} from "../src/notifications/notifications.service.js";
import { PreferencesController } from "../src/notifications/preferences.controller.js";
import { DevelopmentEmailProvider } from "../src/notifications/providers/development-email.provider.js";
import { DevelopmentPushProvider } from "../src/notifications/providers/development-push.provider.js";
import { TemplateEngineService } from "../src/notifications/template-engine.service.js";

describe("Task 010 — Transactional Notifications and Preferences", () => {
  const accountId = "bd44b2e8-5e31-4e04-b0bf-cf5b2146192f";

  const createMockDb = () => {
    const notifications: Array<{
      id: string;
      account_id: string;
      type: string;
      title_en: string;
      title_ar: string;
      body_en: string;
      body_ar: string;
      deep_link: string | null;
      read_at: Date | null;
      created_at: Date;
      dedupe_key: string;
    }> = [];

    const intents: Array<{
      id: string;
      account_id: string;
      channel: string;
      event_type: string;
      status: string;
      attempts: number;
      last_error: string | null;
      dedupe_key: string;
      payload_json: Record<string, unknown>;
      created_at: Date;
      sent_at: Date | null;
    }> = [];

    let preferences: {
      account_id: string;
      push_enabled: boolean;
      email_enabled: boolean;
      sms_enabled: boolean;
      notify_outbid: boolean;
      notify_ending_soon: boolean;
      notify_deposits: boolean;
      notify_marketing: boolean;
      quiet_hours_enabled: boolean;
      quiet_hours_start: string;
      quiet_hours_end: string;
      updated_at: string;
    } | null = null;

    const deviceTokens = new Map<string, { token: string; platform: string }>();
    const outboxEvents: unknown[][] = [];

    const mockPool = {
      connect: async () => ({
        query: async (sql: string, params: unknown[] = []) =>
          mockPool.query(sql, params),
        release: () => {},
      }),
      query: async (sql: string, params: unknown[] = []) => {
        const normalized = sql.replace(/\s+/g, " ").trim();

        if (normalized.includes("INSERT INTO notifications")) {
          const dedupeKey = params[7] as string;
          const exists = notifications.some(
            (n) => n.account_id === params[0] && n.dedupe_key === dedupeKey,
          );
          if (exists) {
            return { rowCount: 0, rows: [] };
          }
          const row = {
            account_id: params[0] as string,
            body_ar: params[5] as string,
            body_en: params[4] as string,
            created_at: new Date(),
            dedupe_key: dedupeKey,
            deep_link: (params[6] as string) || null,
            id: `notif-${notifications.length + 1}`,
            read_at: null,
            title_ar: params[3] as string,
            title_en: params[2] as string,
            type: params[1] as string,
          };
          notifications.push(row);
          return { rowCount: 1, rows: [row] };
        }

        if (normalized.includes("SELECT id, type, title_en, title_ar, body_en, body_ar, deep_link, read_at, created_at FROM notifications")) {
          const userNotifs = notifications
            .filter((n) => n.account_id === params[0])
            .sort((a, b) => b.created_at.getTime() - a.created_at.getTime());
          return { rowCount: userNotifs.length, rows: userNotifs };
        }

        if (normalized.includes("SELECT COUNT(*)::text as count FROM notifications WHERE account_id = $1 AND read_at IS NULL")) {
          const count = notifications.filter(
            (n) => n.account_id === params[0] && n.read_at === null,
          ).length;
          return { rowCount: 1, rows: [{ count: String(count) }] };
        }

        if (normalized.includes("UPDATE notifications SET read_at = now() WHERE account_id = $1 AND id = $2 AND read_at IS NULL")) {
          const notif = notifications.find(
            (n) => n.account_id === params[0] && n.id === params[1] && n.read_at === null,
          );
          if (notif) {
            notif.read_at = new Date();
            return { rowCount: 1, rows: [{ read_at: notif.read_at.toISOString() }] };
          }
          return { rowCount: 0, rows: [] };
        }

        if (normalized.includes("SELECT read_at FROM notifications WHERE account_id = $1 AND id = $2")) {
          const notif = notifications.find(
            (n) => n.account_id === params[0] && n.id === params[1],
          );
          return {
            rowCount: notif ? 1 : 0,
            rows: notif ? [{ read_at: notif.read_at ? notif.read_at.toISOString() : null }] : [],
          };
        }

        if (normalized.includes("UPDATE notifications SET read_at = now() WHERE account_id = $1 AND read_at IS NULL")) {
          let count = 0;
          for (const n of notifications) {
            if (n.account_id === params[0] && n.read_at === null) {
              n.read_at = new Date();
              count++;
            }
          }
          return { rowCount: count, rows: [] };
        }

        if (normalized.includes("INSERT INTO notification_intents")) {
          const intentDedupe = params[3] as string;
          const exists = intents.some(
            (i) => i.account_id === params[0] && i.channel === params[1] && i.dedupe_key === intentDedupe,
          );
          if (exists) {
            return { rowCount: 0, rows: [] };
          }
          const row = {
            account_id: params[0] as string,
            attempts: 0,
            channel: params[1] as string,
            created_at: new Date(),
            dedupe_key: intentDedupe,
            event_type: params[2] as string,
            id: `intent-${intents.length + 1}`,
            last_error: null,
            payload_json: JSON.parse(params[4] as string),
            sent_at: null,
            status: "PENDING",
          };
          intents.push(row);
          return { rowCount: 1, rows: [{ id: row.id }] };
        }

        if (normalized.includes("UPDATE notification_intents SET status = $2")) {
          const intent = intents.find((i) => i.id === params[0]);
          if (intent) {
            intent.status = params[1] as string;
            intent.last_error = (params[2] as string) || null;
            if (params[1] === "SENT") {
              intent.sent_at = new Date();
            }
          }
          return { rowCount: 1, rows: [] };
        }

        if (normalized.includes("SELECT account_id, push_enabled, email_enabled, sms_enabled")) {
          if (preferences) {
            return { rowCount: 1, rows: [preferences] };
          }
          return { rowCount: 0, rows: [] };
        }

        if (normalized.includes("INSERT INTO user_notification_preferences")) {
          preferences = {
            account_id: params[0] as string,
            email_enabled: Boolean(params[2]),
            notify_deposits: Boolean(params[6]),
            notify_ending_soon: Boolean(params[5]),
            notify_marketing: Boolean(params[7]),
            notify_outbid: Boolean(params[4]),
            push_enabled: Boolean(params[1]),
            quiet_hours_enabled: Boolean(params[8]),
            quiet_hours_end: params[10] as string,
            quiet_hours_start: params[9] as string,
            sms_enabled: Boolean(params[3]),
            updated_at: new Date().toISOString(),
          };
          return { rowCount: 1, rows: [preferences] };
        }

        if (normalized.includes("INSERT INTO device_tokens")) {
          deviceTokens.set(params[1] as string, {
            platform: params[2] as string,
            token: params[1] as string,
          });
          return { rowCount: 1, rows: [] };
        }

        if (normalized.includes("DELETE FROM device_tokens WHERE account_id = $1 AND token = $2")) {
          const existed = deviceTokens.delete(params[1] as string);
          return { rowCount: existed ? 1 : 0, rows: [] };
        }

        if (normalized.includes("SELECT token FROM device_tokens WHERE account_id = $1")) {
          return {
            rowCount: deviceTokens.size,
            rows: Array.from(deviceTokens.values()).map((v) => ({ token: v.token })),
          };
        }

        if (normalized.includes("SELECT email FROM accounts WHERE id = $1")) {
          return { rowCount: 1, rows: [{ email: "buyer@pioneer.ae" }] };
        }

        if (normalized.includes("INSERT INTO outbox_events")) {
          outboxEvents.push(params);
          return { rowCount: 1, rows: [] };
        }

        return { rowCount: 0, rows: [] };
      },
    };

    return { deviceTokens, intents, mockPool, notifications, outboxEvents };
  };

  const createMockSession = (): SessionService =>
    ({
      requireTestHeaderAccount: async () => ({
        email: "buyer@pioneer.ae",
        id: accountId,
        roles: ["BUYER"],
        status: "ACTIVE",
      }),
    }) as unknown as SessionService;

  describe("TemplateEngineService", () => {
    const engine = new TemplateEngineService();

    it("renders BID_CONFIRMED with fils preservation and Arabic BiDi isolation", () => {
      const rendered = engine.render({
        amountFils: 5200050,
        eventType: "BID_CONFIRMED",
        lotId: "11111111-1111-4111-8111-111111111111",
        lotNumber: "101",
      });

      expect(rendered.titleEn).toBe("Bid Confirmed");
      expect(rendered.titleAr).toBe("تم تأكيد المزايدة");
      expect(rendered.bodyEn).toContain("AED 52,000.50");
      expect(rendered.bodyEn).toContain("Lot #101");
      expect(rendered.bodyAr).toContain("\u206652,000.50 د.إ\u2069");
      expect(rendered.deepLink).toBe("/lot/11111111-1111-4111-8111-111111111111");
    });

    it("renders OUTBID with lock-screen body that avoids leaking private proxy maximums", () => {
      const rendered = engine.render({
        currentBidFils: 8500000,
        eventType: "OUTBID",
        lotId: "11111111-1111-4111-8111-111111111111",
        lotNumber: "42",
        nextBidFils: 8600000,
      });

      expect(rendered.titleEn).toBe("You've been outbid!");
      expect(rendered.titleAr).toBe("تمت المزايدة عليك!");
      expect(rendered.bodyEn).toContain("AED 85,000");
      expect(rendered.bodyEn).toContain("AED 86,000");
      expect(rendered.lockScreenBody).toBe(
        "Someone placed a higher bid on Lot #42. Tap to bid again.",
      );
    });

    it("renders ENDING_SOON and AUCTION_EXTENDED", () => {
      const endingSoon = engine.render({
        eventType: "ENDING_SOON",
        lotNumber: "205",
        timeRemaining: "5 minutes",
      });
      expect(endingSoon.titleEn).toBe("Auction Ending Soon");
      expect(endingSoon.bodyEn).toContain("5 minutes");

      const extended = engine.render({
        eventType: "AUCTION_EXTENDED",
        lotNumber: "205",
      });
      expect(extended.titleEn).toBe("Auction Extended");
      expect(extended.bodyEn).toContain("extended by 2 minutes");
    });

    it("renders DEPOSIT_CREDITED and deep links to /account/deposits", () => {
      const rendered = engine.render({
        amountFils: 500000,
        eventType: "DEPOSIT_CREDITED",
      });
      expect(rendered.titleEn).toBe("Deposit Credited");
      expect(rendered.bodyEn).toContain("AED 5,000");
      expect(rendered.deepLink).toBe("/account/deposits");
    });
  });

  describe("Quiet Hours Time Check", () => {
    it("detects whether a time falls within quiet hours across midnight in Asia/Dubai", () => {
      // 23:30 Dubai time is inside 22:00-07:00
      const nightTime = new Date("2026-07-14T19:30:00.000Z"); // UTC 19:30 is Dubai 23:30 (+4)
      expect(isTimeInQuietHours("22:00", "07:00", nightTime)).toBe(true);

      // 14:00 Dubai time is outside 22:00-07:00
      const dayTime = new Date("2026-07-14T10:00:00.000Z"); // UTC 10:00 is Dubai 14:00 (+4)
      expect(isTimeInQuietHours("22:00", "07:00", dayTime)).toBe(false);

      // 03:00 Dubai time is inside 22:00-07:00
      const earlyMorning = new Date("2026-07-14T23:00:00.000Z"); // UTC 23:00 is Dubai 03:00 (+4 next day)
      expect(isTimeInQuietHours("22:00", "07:00", earlyMorning)).toBe(true);
    });
  });

  describe("NotificationsService Dispatch & Deduplication", () => {
    it("dispatches in-app, push, and email notifications and emits socket outbox event", async () => {
      const { mockPool, notifications, outboxEvents } = createMockDb();
      const repository = new NotificationsRepository(
        mockPool as unknown as DatabasePool,
      );
      const templateEngine = new TemplateEngineService();
      const pushProvider = new DevelopmentPushProvider();
      const emailProvider = new DevelopmentEmailProvider();
      const service = new NotificationsService(
        repository,
        templateEngine,
        pushProvider,
        emailProvider,
        mockPool as unknown as DatabasePool,
      );

      // Register device token
      await service.registerDeviceToken(accountId, "fcm-token-12345", "ANDROID");

      const result = await service.dispatchNotification(
        accountId,
        {
          currentBidFils: 5500000,
          eventType: "OUTBID",
          lotId: "11111111-1111-4111-8111-111111111111",
          lotNumber: "101",
          nextBidFils: 5600000,
        },
        "seq-1",
      );

      expect(result.inAppId).not.toBeNull();
      expect(result.pushSentCount).toBe(1);
      expect(result.emailSent).toBe(true);

      expect(notifications).toHaveLength(1);
      expect(notifications[0]?.type).toBe("OUTBID");
      expect(pushProvider.sentPushes).toHaveLength(1);
      expect(pushProvider.sentPushes[0]?.token).toBe("fcm-token-12345");
      expect(emailProvider.sentEmails).toHaveLength(1);
      expect(emailProvider.sentEmails[0]?.to).toBe("buyer@pioneer.ae");

      // Verify outbox event written for realtime socket broadcast
      expect(outboxEvents).toHaveLength(1);
      expect(outboxEvents[0]?.[2]).toBe("notification:created");
    });

    it("deduplicates identical notifications exactly once per dedupe key", async () => {
      const { mockPool, notifications, intents } = createMockDb();
      const repository = new NotificationsRepository(
        mockPool as unknown as DatabasePool,
      );
      const templateEngine = new TemplateEngineService();
      const pushProvider = new DevelopmentPushProvider();
      const emailProvider = new DevelopmentEmailProvider();
      const service = new NotificationsService(
        repository,
        templateEngine,
        pushProvider,
        emailProvider,
        mockPool as unknown as DatabasePool,
      );

      await service.registerDeviceToken(accountId, "fcm-token-1", "ANDROID");

      // First delivery
      await service.dispatchNotification(
        accountId,
        {
          eventType: "OUTBID",
          lotId: "lot-1",
          lotNumber: "101",
        },
        "seq-10",
      );

      // Duplicate delivery attempt with identical dedupeSuffix
      const dupResult = await service.dispatchNotification(
        accountId,
        {
          eventType: "OUTBID",
          lotId: "lot-1",
          lotNumber: "101",
        },
        "seq-10",
      );

      expect(dupResult.inAppId).toBeNull();
      expect(dupResult.pushSentCount).toBe(0);
      expect(notifications).toHaveLength(1);
      expect(intents).toHaveLength(2); // 1 push + 1 email, no duplicates added
    });

    it("bypasses quiet hours for time-critical OUTBID events while suppressing non-critical reminders", async () => {
      const { mockPool, intents } = createMockDb();
      const repository = new NotificationsRepository(
        mockPool as unknown as DatabasePool,
      );
      const templateEngine = new TemplateEngineService();
      const pushProvider = new DevelopmentPushProvider();
      const emailProvider = new DevelopmentEmailProvider();
      const service = new NotificationsService(
        repository,
        templateEngine,
        pushProvider,
        emailProvider,
        mockPool as unknown as DatabasePool,
      );

      // Enable quiet hours: 00:00 to 23:59 (always active)
      await service.updatePreferences(accountId, {
        quietHoursEnabled: true,
        quietHoursEnd: "23:59",
        quietHoursStart: "00:00",
      });

      await service.registerDeviceToken(accountId, "token-quiet", "ANDROID");

      // 1. Time-critical OUTBID: MUST BYPASS and send
      const outbidResult = await service.dispatchNotification(
        accountId,
        { eventType: "OUTBID", lotId: "lot-1", lotNumber: "101" },
        "outbid-bypass",
      );
      expect(outbidResult.pushSentCount).toBe(1);
      expect(pushProvider.sentPushes).toHaveLength(1);

      // 2. Non-critical ENDING_SOON: MUST BE SUPPRESSED during quiet hours
      const reminderResult = await service.dispatchNotification(
        accountId,
        { eventType: "ENDING_SOON", lotId: "lot-1", lotNumber: "101", timeRemaining: "5m" },
        "reminder-suppress",
      );
      expect(reminderResult.pushSentCount).toBe(0);
      expect(pushProvider.sentPushes).toHaveLength(1); // Unchanged

      const reminderIntent = intents.find((i) => i.dedupe_key.includes("reminder-suppress"));
      expect(reminderIntent?.payload_json["reason"]).toBe("quiet_hours_suppressed");
    });
  });

  describe("NotificationsController & PreferencesController", () => {
    it("lists notifications, unread count, marks read, and marks all read", async () => {
      const { mockPool } = createMockDb();
      const repository = new NotificationsRepository(
        mockPool as unknown as DatabasePool,
      );
      const templateEngine = new TemplateEngineService();
      const pushProvider = new DevelopmentPushProvider();
      const emailProvider = new DevelopmentEmailProvider();
      const service = new NotificationsService(
        repository,
        templateEngine,
        pushProvider,
        emailProvider,
        mockPool as unknown as DatabasePool,
      );
      const session = createMockSession();
      const controller = new NotificationsController(service, session);

      // Create 2 notifications
      await service.dispatchNotification(
        accountId,
        { eventType: "BID_CONFIRMED", lotNumber: "1", amountFils: 100000 },
        "k1",
      );
      await service.dispatchNotification(
        accountId,
        { eventType: "OUTBID", lotNumber: "2" },
        "k2",
      );

      const listResponse = (await controller.listNotifications(
        {} as unknown as Request,
      )) as {
        contractVersion: number;
        items: Array<{ id: string }>;
        unreadCount: number;
      };
      expect(listResponse.contractVersion).toBe(1);
      expect(listResponse.items).toHaveLength(2);
      expect(listResponse.unreadCount).toBe(2);

      // Mark single as read
      const markResult = (await controller.markNotificationRead(
        {} as unknown as Request,
        listResponse.items[0]?.id ?? "",
      )) as { isRead: boolean };
      expect(markResult.isRead).toBe(true);

      const afterOneRead = (await controller.listNotifications(
        {} as unknown as Request,
      )) as { unreadCount: number };
      expect(afterOneRead.unreadCount).toBe(1);

      // Mark all read
      const markAllResult = (await controller.markAllRead(
        {} as unknown as Request,
      )) as { markedCount: number };
      expect(markAllResult.markedCount).toBe(1);

      const afterAllRead = (await controller.listNotifications(
        {} as unknown as Request,
      )) as { unreadCount: number };
      expect(afterAllRead.unreadCount).toBe(0);
    });

    it("gets and updates user notification preferences with validation", async () => {
      const { mockPool } = createMockDb();
      const repository = new NotificationsRepository(
        mockPool as unknown as DatabasePool,
      );
      const templateEngine = new TemplateEngineService();
      const pushProvider = new DevelopmentPushProvider();
      const emailProvider = new DevelopmentEmailProvider();
      const service = new NotificationsService(
        repository,
        templateEngine,
        pushProvider,
        emailProvider,
        mockPool as unknown as DatabasePool,
      );
      const session = createMockSession();
      const controller = new PreferencesController(service, session);

      const initial = (await controller.getPreferences(
        {} as unknown as Request,
      )) as { pushEnabled: boolean; notifyMarketing: boolean };
      expect(initial.pushEnabled).toBe(true);
      expect(initial.notifyMarketing).toBe(false);

      const updated = (await controller.updatePreferences(
        {} as unknown as Request,
        {
          notifyMarketing: true,
          quietHoursEnabled: true,
          quietHoursEnd: "08:00",
          quietHoursStart: "23:00",
        },
      )) as {
        notifyMarketing: boolean;
        quietHoursEnabled: boolean;
        quietHoursEnd: string;
        quietHoursStart: string;
      };

      expect(updated.notifyMarketing).toBe(true);
      expect(updated.quietHoursEnabled).toBe(true);
      expect(updated.quietHoursStart).toBe("23:00");
      expect(updated.quietHoursEnd).toBe("08:00");

      // Validation failure for invalid time format
      await expect(
        controller.updatePreferences({} as unknown as Request, {
          quietHoursStart: "invalid-time",
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("registers and unregisters device tokens via DeviceTokensController", async () => {
      const { mockPool } = createMockDb();
      const repository = new NotificationsRepository(
        mockPool as unknown as DatabasePool,
      );
      const templateEngine = new TemplateEngineService();
      const pushProvider = new DevelopmentPushProvider();
      const emailProvider = new DevelopmentEmailProvider();
      const service = new NotificationsService(
        repository,
        templateEngine,
        pushProvider,
        emailProvider,
        mockPool as unknown as DatabasePool,
      );
      const session = createMockSession();
      const controller = new DeviceTokensController(service, session);

      const regResult = (await controller.registerToken(
        {} as unknown as Request,
        {
          platform: "ANDROID",
          token: "fcm-device-token-12345",
        },
      )) as { registered: boolean };
      expect(regResult.registered).toBe(true);

      const unregResult = (await controller.unregisterToken(
        {} as unknown as Request,
        "fcm-device-token-12345",
      )) as { registered: boolean };
      expect(unregResult.registered).toBe(false);
    });
  });
});
