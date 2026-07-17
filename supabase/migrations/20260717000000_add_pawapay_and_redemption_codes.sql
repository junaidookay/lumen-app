-- ============================================================
-- PawaPay + Manual Redemption Codes + Download Tracking
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Add payment_method column to subscriptions
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'stripe';
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS pawapay_subscription_id TEXT;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS code_id UUID;
COMMENT ON COLUMN subscriptions.payment_method IS 'Payment provider: stripe, pawapay, or code';
COMMENT ON COLUMN subscriptions.pawapay_subscription_id IS 'PawaPay subscription ID for mobile money payments';
COMMENT ON COLUMN subscriptions.code_id IS 'FK to redemption_codes if subscription was activated by code';

-- 2. Add downloads_today and downloads_reset_at to subscriptions
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS downloads_today INTEGER DEFAULT 0;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS downloads_reset_at TIMESTAMPTZ DEFAULT now();

-- 3. Create redemption_codes table
CREATE TABLE IF NOT EXISTS redemption_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  created_by UUID REFERENCES profiles(id),
  duration_days INTEGER NOT NULL,
  max_downloads_per_day INTEGER DEFAULT 3,
  max_redemptions INTEGER,
  current_redemptions INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
COMMENT ON TABLE redemption_codes IS 'Admin-generated codes for premium access. Users redeem to get a subscription period.';

-- 4. Create user_code_redemptions table
CREATE TABLE IF NOT EXISTS user_code_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  code_id UUID REFERENCES redemption_codes(id) ON DELETE CASCADE,
  redeemed_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, code_id)
);
COMMENT ON TABLE user_code_redemptions IS 'Tracks which users have redeemed which codes.';

-- 5. Add code_id to payment_history for tracking
ALTER TABLE payment_history ADD COLUMN IF NOT EXISTS code_id UUID;
ALTER TABLE payment_history ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'stripe';

-- 6. Enable RLS
ALTER TABLE redemption_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_code_redemptions ENABLE ROW LEVEL SECURITY;

-- 7. RLS policies for redemption_codes (drop first if they exist, then create)
DROP POLICY IF EXISTS "Admins manage redemption codes" ON redemption_codes;
CREATE POLICY "Admins manage redemption codes"
  ON redemption_codes FOR ALL
  USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

DROP POLICY IF EXISTS "Anyone can read active codes" ON redemption_codes;
CREATE POLICY "Anyone can read active codes"
  ON redemption_codes FOR SELECT
  USING (is_active = true AND (expires_at IS NULL OR expires_at > now()));

-- 8. RLS policies for user_code_redemptions
DROP POLICY IF EXISTS "Users see own redemptions" ON user_code_redemptions;
CREATE POLICY "Users see own redemptions"
  ON user_code_redemptions FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can redeem codes" ON user_code_redemptions;
CREATE POLICY "Users can redeem codes"
  ON user_code_redemptions FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins see all redemptions" ON user_code_redemptions;
CREATE POLICY "Admins see all redemptions"
  ON user_code_redemptions FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- 9. Create index for fast code lookups
CREATE INDEX IF NOT EXISTS idx_redemption_codes_code ON redemption_codes(code);
CREATE INDEX IF NOT EXISTS idx_user_code_redemptions_user ON user_code_redemptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_code_redemptions_code ON user_code_redemptions(code_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_payment_method ON subscriptions(payment_method);

-- 10. Create download_tracker table for daily limit enforcement
CREATE TABLE IF NOT EXISTS download_tracker (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  download_date DATE DEFAULT CURRENT_DATE,
  download_count INTEGER DEFAULT 1,
  UNIQUE(user_id, download_date)
);
COMMENT ON TABLE download_tracker IS 'Tracks daily download counts per user for code-based subscriptions.';

ALTER TABLE download_tracker ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own downloads" ON download_tracker;
CREATE POLICY "Users see own downloads"
  ON download_tracker FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can track downloads" ON download_tracker;
CREATE POLICY "Users can track downloads"
  ON download_tracker FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own downloads" ON download_tracker;
CREATE POLICY "Users can update own downloads"
  ON download_tracker FOR UPDATE
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins see all downloads" ON download_tracker;
CREATE POLICY "Admins see all downloads"
  ON download_tracker FOR ALL
  USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- 11. Update ad_placements CHECK constraint to allow new slot types
DO $$
BEGIN
  -- Drop old constraint if it exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ad_placements_slot_check' AND conrelid = 'ad_placements'::regclass
  ) THEN
    ALTER TABLE ad_placements DROP CONSTRAINT ad_placements_slot_check;
  END IF;
END $$;

-- Allow both old and new slot values
ALTER TABLE ad_placements ADD CONSTRAINT ad_placements_slot_check
  CHECK (slot IN ('social_bar', 'banner_top', 'banner_inline', 'interstitial', 'popunder', 'pre_roll', 'mid_roll', 'rewarded'));

-- 12. Seed ad placements for new slot types (ignore duplicates)
INSERT INTO ad_placements (slot, provider, is_enabled, config) VALUES
  ('social_bar', 'none', false, '{}'),
  ('interstitial', 'none', false, '{}'),
  ('popunder', 'none', false, '{}')
ON CONFLICT (slot) DO NOTHING;

-- Update existing slots to use adsterra provider option
UPDATE ad_placements SET provider = 'none' WHERE slot IN ('banner_top', 'banner_inline') AND provider = 'house';
