-- Add provider_reference to payment_history for webhook matching
-- Stores the PawaPay depositId, Stripe payment intent, etc.
ALTER TABLE payment_history ADD COLUMN IF NOT EXISTS provider_reference TEXT;

-- Index for fast webhook lookups
CREATE INDEX IF NOT EXISTS idx_payment_history_provider_ref
  ON payment_history (provider_reference)
  WHERE provider_reference IS NOT NULL;
