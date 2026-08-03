-- ============================================================
-- Per-season RD support for TV series
-- Adds media_item_seasons table + tmdb_id on media_items
-- ============================================================

-- 1. Add tmdb_id to media_items (if not already present from earlier RD migration)
ALTER TABLE public.media_items ADD COLUMN IF NOT EXISTS tmdb_id INTEGER;
CREATE INDEX IF NOT EXISTS idx_media_items_tmdb_id ON media_items(tmdb_id) WHERE tmdb_id IS NOT NULL;

-- 2. Per-season RD data table
CREATE TABLE IF NOT EXISTS media_item_seasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  media_item_id UUID NOT NULL REFERENCES media_items(id) ON DELETE CASCADE,
  season_number INTEGER NOT NULL,
  name TEXT,
  overview TEXT,
  poster_path TEXT,
  air_date DATE,
  rd_torrent_id TEXT,
  rd_info_hash TEXT,
  episodes JSONB NOT NULL DEFAULT '[]'::jsonb,
  rd_resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(media_item_id, season_number)
);

CREATE INDEX IF NOT EXISTS idx_mis_media_item ON media_item_seasons(media_item_id);
CREATE INDEX IF NOT EXISTS idx_mis_torrent ON media_item_seasons(rd_torrent_id) WHERE rd_torrent_id IS NOT NULL;

-- 3. Enable RLS
ALTER TABLE media_item_seasons ENABLE ROW LEVEL SECURITY;

-- 4. Published seasons are publicly readable
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public read published seasons' AND tablename = 'media_item_seasons') THEN
    CREATE POLICY "Public read published seasons" ON media_item_seasons
      FOR SELECT USING (
        EXISTS (SELECT 1 FROM media_items WHERE id = media_item_id AND status = 'published')
      );
  END IF;
END $$;

-- 5. Staff can manage seasons
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Staff manage seasons' AND tablename = 'media_item_seasons') THEN
    CREATE POLICY "Staff manage seasons" ON media_item_seasons
      FOR ALL USING (
        EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'moderator'))
        OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
      );
  END IF;
END $$;

-- 6. updated_at trigger
CREATE OR REPLACE FUNCTION public.set_media_item_seasons_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS media_item_seasons_updated_at ON media_item_seasons;
CREATE TRIGGER media_item_seasons_updated_at
  BEFORE UPDATE ON media_item_seasons
  FOR EACH ROW EXECUTE FUNCTION public.set_media_item_seasons_updated_at();
