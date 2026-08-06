-- Enforce at most one current verification row per rental + stage.
CREATE UNIQUE INDEX IF NOT EXISTS idx_rental_verifications_one_current_per_stage
  ON rental_verifications (rental_id, stage)
  WHERE is_current = true;
