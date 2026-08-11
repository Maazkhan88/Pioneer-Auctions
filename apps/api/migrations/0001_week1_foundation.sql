CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

CREATE TYPE account_status AS ENUM (
  'ACTIVE',
  'PENDING_VERIFICATION',
  'RESTRICTED',
  'DISABLED'
);

CREATE TYPE kyc_status AS ENUM (
  'NOT_STARTED',
  'PENDING',
  'VERIFIED',
  'REJECTED',
  'EXPIRED'
);

CREATE TYPE auction_lifecycle AS ENUM (
  'DRAFT',
  'SCHEDULED',
  'LIVE',
  'PAUSED',
  'CLOSING',
  'CLOSED',
  'PENDING_APPROVAL',
  'APPROVED',
  'REJECTED',
  'CANCELLED'
);

CREATE TYPE reserve_status AS ENUM (
  'NOT_APPLICABLE',
  'NOT_MET',
  'MET'
);

CREATE TYPE bid_kind AS ENUM (
  'MANUAL',
  'PROXY'
);

CREATE TYPE ledger_entry_direction AS ENUM (
  'DEBIT',
  'CREDIT'
);

CREATE TABLE accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email citext UNIQUE,
  phone_e164 text UNIQUE,
  display_name text NOT NULL,
  preferred_locale text NOT NULL DEFAULT 'en',
  preferred_timezone text NOT NULL DEFAULT 'Asia/Dubai',
  status account_status NOT NULL DEFAULT 'PENDING_VERIFICATION',
  kyc_status kyc_status NOT NULL DEFAULT 'NOT_STARTED',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT accounts_contact_required CHECK (
    email IS NOT NULL OR phone_e164 IS NOT NULL
  )
);

CREATE TABLE roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  description text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  description text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE account_roles (
  account_id uuid NOT NULL REFERENCES accounts (id),
  role_id uuid NOT NULL REFERENCES roles (id),
  granted_at timestamptz NOT NULL DEFAULT now(),
  granted_by uuid REFERENCES accounts (id),
  PRIMARY KEY (account_id, role_id)
);

CREATE TABLE role_permissions (
  role_id uuid NOT NULL REFERENCES roles (id),
  permission_id uuid NOT NULL REFERENCES permissions (id),
  granted_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE auctions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title_en text NOT NULL,
  title_ar text NOT NULL,
  lifecycle auction_lifecycle NOT NULL DEFAULT 'DRAFT',
  starts_at timestamptz NOT NULL,
  closes_at timestamptz NOT NULL,
  soft_close_enabled boolean NOT NULL DEFAULT true,
  soft_close_window_ms integer NOT NULL DEFAULT 120000,
  soft_close_extension_ms integer NOT NULL DEFAULT 120000,
  soft_close_maximum_extensions integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT auctions_time_order CHECK (starts_at < closes_at),
  CONSTRAINT auctions_soft_close_positive CHECK (
    soft_close_window_ms > 0 AND soft_close_extension_ms > 0
  )
);

CREATE TABLE lots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id uuid NOT NULL REFERENCES auctions (id),
  lot_number text NOT NULL,
  title_en text NOT NULL,
  title_ar text NOT NULL,
  lifecycle auction_lifecycle NOT NULL DEFAULT 'DRAFT',
  starts_at timestamptz NOT NULL,
  closes_at timestamptz NOT NULL,
  starting_bid_fils bigint NOT NULL,
  current_bid_fils bigint,
  next_minimum_bid_fils bigint NOT NULL,
  minimum_increment_fils bigint NOT NULL,
  reserve_price_fils bigint,
  reserve_status reserve_status NOT NULL DEFAULT 'NOT_APPLICABLE',
  sequence integer NOT NULL DEFAULT 0,
  bid_count integer NOT NULL DEFAULT 0,
  soft_close_extension_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (auction_id, lot_number),
  CONSTRAINT lots_money_non_negative CHECK (
    starting_bid_fils >= 0
    AND minimum_increment_fils > 0
    AND next_minimum_bid_fils >= starting_bid_fils
    AND (current_bid_fils IS NULL OR current_bid_fils >= 0)
    AND (reserve_price_fils IS NULL OR reserve_price_fils >= 0)
  ),
  CONSTRAINT lots_time_order CHECK (starts_at < closes_at)
);

CREATE TABLE terms_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope text NOT NULL,
  version text NOT NULL,
  body_en text NOT NULL,
  body_ar text NOT NULL,
  effective_at timestamptz NOT NULL DEFAULT now(),
  retired_at timestamptz,
  UNIQUE (scope, version)
);

CREATE TABLE terms_acceptances (
  account_id uuid NOT NULL REFERENCES accounts (id),
  terms_version_id uuid NOT NULL REFERENCES terms_versions (id),
  accepted_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (account_id, terms_version_id)
);

CREATE TABLE bid_commands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  command_id uuid NOT NULL,
  account_id uuid NOT NULL REFERENCES accounts (id),
  lot_id uuid NOT NULL REFERENCES lots (id),
  command_type text NOT NULL,
  request_payload jsonb NOT NULL,
  result_payload jsonb NOT NULL,
  status text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (account_id, command_id)
);

CREATE TABLE proxy_bids (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lot_id uuid NOT NULL REFERENCES lots (id),
  account_id uuid NOT NULL REFERENCES accounts (id),
  maximum_fils bigint NOT NULL,
  status text NOT NULL DEFAULT 'ACTIVE',
  priority_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (lot_id, account_id),
  CONSTRAINT proxy_bids_positive CHECK (maximum_fils > 0)
);

CREATE TABLE bid_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lot_id uuid NOT NULL REFERENCES lots (id),
  auction_id uuid NOT NULL REFERENCES auctions (id),
  account_id uuid NOT NULL REFERENCES accounts (id),
  command_id uuid NOT NULL,
  sequence integer NOT NULL,
  bid_kind bid_kind NOT NULL,
  amount_fils bigint NOT NULL,
  reserve_status reserve_status NOT NULL,
  accepted_at timestamptz NOT NULL DEFAULT now(),
  correlation_id text NOT NULL,
  UNIQUE (lot_id, sequence),
  UNIQUE (account_id, command_id, sequence),
  CONSTRAINT bid_ledger_amount_positive CHECK (amount_fils > 0)
);

CREATE TABLE deposit_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts (id),
  lot_id uuid REFERENCES lots (id),
  amount_fils bigint NOT NULL,
  direction ledger_entry_direction NOT NULL,
  reason_code text NOT NULL,
  correlation_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT deposit_ledger_amount_positive CHECK (amount_fils > 0)
);

CREATE TABLE audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_account_id uuid REFERENCES accounts (id),
  action text NOT NULL,
  subject_type text NOT NULL,
  subject_id uuid,
  reason_code text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  correlation_id text NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE outbox_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aggregate_type text NOT NULL,
  aggregate_id uuid NOT NULL,
  event_name text NOT NULL,
  payload jsonb NOT NULL,
  correlation_id text NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz
);

CREATE INDEX bid_ledger_lot_sequence_idx ON bid_ledger (lot_id, sequence);
CREATE INDEX outbox_events_unpublished_idx ON outbox_events (occurred_at)
WHERE
  published_at IS NULL;
CREATE INDEX audit_events_subject_idx ON audit_events (subject_type, subject_id);
