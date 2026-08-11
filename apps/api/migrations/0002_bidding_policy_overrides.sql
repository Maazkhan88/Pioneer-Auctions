CREATE TYPE bid_increment_source AS ENUM ('PERCENT_OF_STARTING_PRICE', 'CUSTOM');

ALTER TABLE lots
  ADD COLUMN bid_increment_source bid_increment_source NOT NULL DEFAULT 'CUSTOM',
  ADD COLUMN minimum_increment_percent_bps integer,
  ADD COLUMN soft_close_window_ms integer,
  ADD COLUMN soft_close_extension_ms integer,
  ADD COLUMN soft_close_maximum_extensions integer;

ALTER TABLE lots
  ADD CONSTRAINT lots_increment_percent_valid CHECK (
    minimum_increment_percent_bps IS NULL
    OR (minimum_increment_percent_bps > 0 AND minimum_increment_percent_bps <= 10000)
  ),
  ADD CONSTRAINT lots_soft_close_override_positive CHECK (
    (soft_close_window_ms IS NULL OR soft_close_window_ms > 0)
    AND (soft_close_extension_ms IS NULL OR soft_close_extension_ms > 0)
    AND (
      soft_close_maximum_extensions IS NULL
      OR soft_close_maximum_extensions > 0
    )
  );
