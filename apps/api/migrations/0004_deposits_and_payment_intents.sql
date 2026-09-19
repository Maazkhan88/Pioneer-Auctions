ALTER TABLE lots
  ADD COLUMN required_deposit_fils bigint,
  ADD CONSTRAINT lots_required_deposit_positive CHECK (
    required_deposit_fils IS NULL OR required_deposit_fils > 0
  );

CREATE TABLE payment_intents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts (id),
  amount_fils bigint NOT NULL,
  currency text NOT NULL DEFAULT 'AED',
  purpose text NOT NULL DEFAULT 'DEPOSIT',
  provider text NOT NULL,
  provider_intent_id text,
  status text NOT NULL DEFAULT 'REQUIRES_ACTION',
  redirect_url text NOT NULL,
  return_url text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  correlation_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT payment_intents_amount_positive CHECK (amount_fils > 0)
);

CREATE TABLE payment_webhook_inbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  event_id text NOT NULL,
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  status text NOT NULL DEFAULT 'PROCESSED',
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, event_id)
);

CREATE TABLE deposit_refund_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts (id),
  amount_fils bigint NOT NULL,
  status text NOT NULL DEFAULT 'REQUESTED',
  reason text,
  processed_at timestamptz,
  processed_by uuid REFERENCES accounts (id),
  rejection_reason text,
  correlation_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT deposit_refund_amount_positive CHECK (amount_fils > 0)
);

CREATE INDEX payment_intents_account_idx ON payment_intents (account_id);
CREATE INDEX deposit_ledger_account_idx ON deposit_ledger (account_id);
CREATE INDEX deposit_refund_requests_account_idx ON deposit_refund_requests (account_id);
