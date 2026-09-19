import { Inject, Injectable } from "@nestjs/common";
import type { PoolClient, QueryResult, QueryResultRow } from "pg";

import type { UpdateNotificationPreferencesRequest } from "@pioneer/contracts";

import { DatabasePool } from "../database/database.pool.js";
import type {
  DevicePlatform,
  NotificationChannel,
  NotificationEventType,
  NotificationItem,
  UserPreferencesRow,
} from "./notification.types.js";

interface CreateInAppRow {
  readonly accountId: string;
  readonly type: NotificationEventType;
  readonly titleEn: string;
  readonly titleAr: string;
  readonly bodyEn: string;
  readonly bodyAr: string;
  readonly deepLink?: string | null;
  readonly dedupeKey: string;
}

interface CreateIntentRow {
  readonly accountId: string;
  readonly channel: NotificationChannel;
  readonly eventType: NotificationEventType;
  readonly dedupeKey: string;
  readonly payload: Record<string, unknown>;
}

@Injectable()
export class NotificationsRepository {
  constructor(
    @Inject(DatabasePool)
    private readonly database: DatabasePool,
  ) {}

  private async executeQuery<T extends QueryResultRow = QueryResultRow>(
    sql: string,
    params: readonly unknown[] = [],
    client?: PoolClient,
  ): Promise<QueryResult<T>> {
    if (client) {
      return client.query<T>(sql, params as unknown[]);
    }
    return this.database.query<T>(sql, params);
  }

  async createNotification(
    row: CreateInAppRow,
    client?: PoolClient,
  ): Promise<NotificationItem | null> {
    const result = await this.executeQuery<{
      id: string;
      type: NotificationEventType;
      title_en: string;
      title_ar: string;
      body_en: string;
      body_ar: string;
      deep_link: string | null;
      read_at: string | null;
      created_at: string;
    }>(
      `
        INSERT INTO notifications (
          account_id,
          type,
          title_en,
          title_ar,
          body_en,
          body_ar,
          deep_link,
          dedupe_key
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (account_id, dedupe_key) DO NOTHING
        RETURNING id, type, title_en, title_ar, body_en, body_ar, deep_link, read_at, created_at
      `,
      [
        row.accountId,
        row.type,
        row.titleEn,
        row.titleAr,
        row.bodyEn,
        row.bodyAr,
        row.deepLink ?? null,
        row.dedupeKey,
      ],
      client,
    );

    const inserted = result.rows[0];
    if (!inserted) {
      return null;
    }

    return {
      bodyAr: inserted.body_ar,
      bodyEn: inserted.body_en,
      createdAt: new Date(inserted.created_at).toISOString(),
      deepLink: inserted.deep_link,
      id: inserted.id,
      isRead: inserted.read_at !== null,
      readAt: inserted.read_at ? new Date(inserted.read_at).toISOString() : null,
      titleAr: inserted.title_ar,
      titleEn: inserted.title_en,
      type: inserted.type,
    };
  }

  async listNotifications(
    accountId: string,
    limit = 50,
  ): Promise<{ items: NotificationItem[]; unreadCount: number }> {
    const listResult = await this.database.query<{
      id: string;
      type: NotificationEventType;
      title_en: string;
      title_ar: string;
      body_en: string;
      body_ar: string;
      deep_link: string | null;
      read_at: string | null;
      created_at: string;
    }>(
      `
        SELECT id, type, title_en, title_ar, body_en, body_ar, deep_link, read_at, created_at
        FROM notifications
        WHERE account_id = $1
        ORDER BY created_at DESC
        LIMIT $2
      `,
      [accountId, limit],
    );

    const countResult = await this.database.query<{ count: string }>(
      `
        SELECT COUNT(*)::text as count
        FROM notifications
        WHERE account_id = $1 AND read_at IS NULL
      `,
      [accountId],
    );

    const unreadCount = Number.parseInt(countResult.rows[0]?.count ?? "0", 10);
    const items = listResult.rows.map((row) => ({
      bodyAr: row.body_ar,
      bodyEn: row.body_en,
      createdAt: new Date(row.created_at).toISOString(),
      deepLink: row.deep_link,
      id: row.id,
      isRead: row.read_at !== null,
      readAt: row.read_at ? new Date(row.read_at).toISOString() : null,
      titleAr: row.title_ar,
      titleEn: row.title_en,
      type: row.type,
    }));

    return { items, unreadCount };
  }

  async markNotificationRead(
    accountId: string,
    notificationId: string,
  ): Promise<string | null> {
    const result = await this.database.query<{ read_at: string }>(
      `
        UPDATE notifications
        SET read_at = now()
        WHERE account_id = $1 AND id = $2 AND read_at IS NULL
        RETURNING read_at
      `,
      [accountId, notificationId],
    );

    if (result.rows.length === 0) {
      // Check if already read
      const existing = await this.database.query<{ read_at: string | null }>(
        `SELECT read_at FROM notifications WHERE account_id = $1 AND id = $2`,
        [accountId, notificationId],
      );
      return existing.rows[0]?.read_at
        ? new Date(existing.rows[0].read_at).toISOString()
        : null;
    }

    return new Date(result.rows[0]!.read_at).toISOString();
  }

  async markAllNotificationsRead(accountId: string): Promise<number> {
    const result = await this.database.query(
      `
        UPDATE notifications
        SET read_at = now()
        WHERE account_id = $1 AND read_at IS NULL
      `,
      [accountId],
    );
    return result.rowCount ?? 0;
  }

  async createIntent(
    row: CreateIntentRow,
    client?: PoolClient,
  ): Promise<string | null> {
    const result = await this.executeQuery<{ id: string }>(
      `
        INSERT INTO notification_intents (
          account_id,
          channel,
          event_type,
          dedupe_key,
          payload_json
        )
        VALUES ($1, $2, $3, $4, $5::jsonb)
        ON CONFLICT (account_id, channel, dedupe_key) DO NOTHING
        RETURNING id
      `,
      [
        row.accountId,
        row.channel,
        row.eventType,
        row.dedupeKey,
        JSON.stringify(row.payload),
      ],
      client,
    );
    return result.rows[0]?.id ?? null;
  }

  async getPendingIntents(
    limit = 50,
  ): Promise<
    Array<{
      id: string;
      accountId: string;
      channel: NotificationChannel;
      eventType: NotificationEventType;
      payload: Record<string, unknown>;
      attempts: number;
    }>
  > {
    const result = await this.database.query<{
      id: string;
      account_id: string;
      channel: NotificationChannel;
      event_type: NotificationEventType;
      payload_json: Record<string, unknown>;
      attempts: number;
    }>(
      `
        SELECT id, account_id, channel, event_type, payload_json, attempts
        FROM notification_intents
        WHERE status = 'PENDING'
        ORDER BY created_at ASC
        LIMIT $1
      `,
      [limit],
    );

    return result.rows.map((r) => ({
      accountId: r.account_id,
      attempts: r.attempts,
      channel: r.channel,
      eventType: r.event_type,
      id: r.id,
      payload: r.payload_json,
    }));
  }

  async updateIntentStatus(
    id: string,
    status: "SENT" | "FAILED" | "SUPPRESSED",
    error?: string,
  ): Promise<void> {
    await this.database.query(
      `
        UPDATE notification_intents
        SET
          status = $2,
          attempts = attempts + 1,
          last_error = $3,
          sent_at = CASE WHEN $2 = 'SENT' THEN now() ELSE sent_at END
        WHERE id = $1
      `,
      [id, status, error ?? null],
    );
  }

  async getPreferences(accountId: string): Promise<UserPreferencesRow> {
    const result = await this.database.query<UserPreferencesRow>(
      `
        SELECT
          account_id,
          push_enabled,
          email_enabled,
          sms_enabled,
          notify_outbid,
          notify_ending_soon,
          notify_deposits,
          notify_marketing,
          quiet_hours_enabled,
          quiet_hours_start,
          quiet_hours_end,
          updated_at
        FROM user_notification_preferences
        WHERE account_id = $1
      `,
      [accountId],
    );

    if (result.rows[0]) {
      return result.rows[0];
    }

    // Default row
    return {
      account_id: accountId,
      email_enabled: true,
      notify_deposits: true,
      notify_ending_soon: true,
      notify_marketing: false,
      notify_outbid: true,
      push_enabled: true,
      quiet_hours_enabled: false,
      quiet_hours_end: "07:00",
      quiet_hours_start: "22:00",
      sms_enabled: false,
      updated_at: new Date().toISOString(),
    };
  }

  async upsertPreferences(
    accountId: string,
    patch: UpdateNotificationPreferencesRequest,
  ): Promise<UserPreferencesRow> {
    const current = await this.getPreferences(accountId);
    const updated = {
      email_enabled: patch.emailEnabled ?? current.email_enabled,
      notify_deposits: patch.notifyDeposits ?? current.notify_deposits,
      notify_ending_soon: patch.notifyEndingSoon ?? current.notify_ending_soon,
      notify_marketing: patch.notifyMarketing ?? current.notify_marketing,
      notify_outbid: patch.notifyOutbid ?? current.notify_outbid,
      push_enabled: patch.pushEnabled ?? current.push_enabled,
      quiet_hours_enabled: patch.quietHoursEnabled ?? current.quiet_hours_enabled,
      quiet_hours_end: patch.quietHoursEnd ?? current.quiet_hours_end,
      quiet_hours_start: patch.quietHoursStart ?? current.quiet_hours_start,
      sms_enabled: patch.smsEnabled ?? current.sms_enabled,
    };

    const result = await this.database.query<UserPreferencesRow>(
      `
        INSERT INTO user_notification_preferences (
          account_id,
          push_enabled,
          email_enabled,
          sms_enabled,
          notify_outbid,
          notify_ending_soon,
          notify_deposits,
          notify_marketing,
          quiet_hours_enabled,
          quiet_hours_start,
          quiet_hours_end,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, now())
        ON CONFLICT (account_id) DO UPDATE SET
          push_enabled = EXCLUDED.push_enabled,
          email_enabled = EXCLUDED.email_enabled,
          sms_enabled = EXCLUDED.sms_enabled,
          notify_outbid = EXCLUDED.notify_outbid,
          notify_ending_soon = EXCLUDED.notify_ending_soon,
          notify_deposits = EXCLUDED.notify_deposits,
          notify_marketing = EXCLUDED.notify_marketing,
          quiet_hours_enabled = EXCLUDED.quiet_hours_enabled,
          quiet_hours_start = EXCLUDED.quiet_hours_start,
          quiet_hours_end = EXCLUDED.quiet_hours_end,
          updated_at = now()
        RETURNING *
      `,
      [
        accountId,
        updated.push_enabled,
        updated.email_enabled,
        updated.sms_enabled,
        updated.notify_outbid,
        updated.notify_ending_soon,
        updated.notify_deposits,
        updated.notify_marketing,
        updated.quiet_hours_enabled,
        updated.quiet_hours_start,
        updated.quiet_hours_end,
      ],
    );

    return result.rows[0]!;
  }

  async registerDeviceToken(
    accountId: string,
    token: string,
    platform: DevicePlatform,
  ): Promise<boolean> {
    await this.database.query(
      `
        INSERT INTO device_tokens (account_id, token, platform, last_active_at)
        VALUES ($1, $2, $3, now())
        ON CONFLICT (account_id, token) DO UPDATE SET
          platform = EXCLUDED.platform,
          last_active_at = now()
      `,
      [accountId, token, platform],
    );
    return true;
  }

  async unregisterDeviceToken(
    accountId: string,
    token: string,
  ): Promise<boolean> {
    const result = await this.database.query(
      `DELETE FROM device_tokens WHERE account_id = $1 AND token = $2`,
      [accountId, token],
    );
    return (result.rowCount ?? 0) > 0;
  }

  async getDeviceTokens(accountId: string): Promise<string[]> {
    const result = await this.database.query<{ token: string }>(
      `SELECT token FROM device_tokens WHERE account_id = $1`,
      [accountId],
    );
    return result.rows.map((r) => r.token);
  }

  async getAccountEmail(accountId: string): Promise<string | null> {
    const result = await this.database.query<{ email: string | null }>(
      `SELECT email FROM accounts WHERE id = $1`,
      [accountId],
    );
    return result.rows[0]?.email ?? null;
  }
}
