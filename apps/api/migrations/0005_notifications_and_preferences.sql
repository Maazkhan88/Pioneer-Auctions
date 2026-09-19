CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts (id) ON DELETE CASCADE,
  type text NOT NULL,
  title_en text NOT NULL,
  title_ar text NOT NULL,
  body_en text NOT NULL,
  body_ar text NOT NULL,
  deep_link text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  dedupe_key text NOT NULL,
  CONSTRAINT notifications_account_dedupe_unique UNIQUE (account_id, dedupe_key)
);

CREATE TABLE notification_intents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts (id) ON DELETE CASCADE,
  channel text NOT NULL CHECK (channel IN ('IN_APP', 'PUSH', 'EMAIL', 'SMS')),
  event_type text NOT NULL,
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SENT', 'FAILED', 'SUPPRESSED')),
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  dedupe_key text NOT NULL,
  payload_json jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  CONSTRAINT notification_intents_dedupe_unique UNIQUE (account_id, channel, dedupe_key)
);

CREATE TABLE user_notification_preferences (
  account_id uuid PRIMARY KEY REFERENCES accounts (id) ON DELETE CASCADE,
  push_enabled boolean NOT NULL DEFAULT true,
  email_enabled boolean NOT NULL DEFAULT true,
  sms_enabled boolean NOT NULL DEFAULT false,
  notify_outbid boolean NOT NULL DEFAULT true,
  notify_ending_soon boolean NOT NULL DEFAULT true,
  notify_deposits boolean NOT NULL DEFAULT true,
  notify_marketing boolean NOT NULL DEFAULT false,
  quiet_hours_enabled boolean NOT NULL DEFAULT false,
  quiet_hours_start text DEFAULT '22:00',
  quiet_hours_end text DEFAULT '07:00',
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE device_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts (id) ON DELETE CASCADE,
  token text NOT NULL,
  platform text NOT NULL CHECK (platform IN ('ANDROID', 'IOS', 'WEB')),
  created_at timestamptz NOT NULL DEFAULT now(),
  last_active_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT device_tokens_account_token_unique UNIQUE (account_id, token)
);

CREATE INDEX notifications_account_created_idx ON notifications (account_id, created_at DESC);
CREATE INDEX notification_intents_status_idx ON notification_intents (status, created_at);
CREATE INDEX device_tokens_account_idx ON device_tokens (account_id);
