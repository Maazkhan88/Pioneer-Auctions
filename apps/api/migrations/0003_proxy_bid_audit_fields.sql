ALTER TABLE proxy_bids
  ADD COLUMN command_id uuid,
  ADD COLUMN correlation_id text;

UPDATE proxy_bids
SET
  command_id = gen_random_uuid(),
  correlation_id = 'migration-backfill'
WHERE command_id IS NULL OR correlation_id IS NULL;

ALTER TABLE proxy_bids
  ALTER COLUMN command_id SET NOT NULL,
  ALTER COLUMN correlation_id SET NOT NULL;

