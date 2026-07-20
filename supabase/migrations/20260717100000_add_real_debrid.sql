-- ============================================================
-- Real Debrid integration — media_items table + RD columns
-- Run this in Supabase SQL Editor AFTER the PawaPay migration
-- ============================================================

-- 1. Create media_items table for storing content with RD metadata
CREATE TABLE IF NOT EXISTS media_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tmdb_id INTEGER,
  kind TEXT NOT NULL CHECK (kind IN ('movie', 'tv')),
  title TEXT NOT NULL,
  overview TEXT,
  poster_path TEXT,
  backdrop_path TEXT,
  year INTEGER,
  rd_torrent_id TEXT,
  rd_info_hash TEXT,
  episodes JSONB DEFAULT '[]',
  video_url TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(tmdb_id, kind)
);
COMMENT ON TABLE media_items IS 'Content items with optional Real Debrid metadata';

-- 2. Create rd_hash_cache table for instant availability caching
CREATE TABLE IF NOT EXISTS rd_hash_cache (
  info_hash TEXT PRIMARY KEY,
  is_cached BOOLEAN DEFAULT false,
  files JSONB,
  checked_at TIMESTAMPTZ DEFAULT now()
);
COMMENT ON TABLE rd_hash_cache IS 'Cache for Real Debrid instant availability checks (24h TTL)';

-- 3. Create resolver_jobs table for batch resolution tracking
CREATE TABLE IF NOT EXISTS resolver_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type TEXT NOT NULL,
  input_query TEXT,
  cursor_index INTEGER DEFAULT 0,
  batch_size INTEGER DEFAULT 50,
  status TEXT DEFAULT 'pending',
  stats JSONB DEFAULT '{}',
  results JSONB DEFAULT '[]',
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
COMMENT ON TABLE resolver_jobs IS 'Tracks batch torrent resolution jobs';

-- 4. Enable RLS
ALTER TABLE media_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE rd_hash_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE resolver_jobs ENABLE ROW LEVEL SECURITY;

-- 5. RLS policies for media_items
-- Published content is publicly readable
DROP POLICY IF EXISTS "Published media readable" ON media_items;
CREATE POLICY "Published media readable"
  ON media_items FOR SELECT
  USING (status = 'published');

-- Admins can do everything
DROP POLICY IF EXISTS "Admins manage media" ON media_items;
CREATE POLICY "Admins manage media"
  ON media_items FOR ALL
  USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- 6. RLS policies for rd_hash_cache
DROP POLICY IF EXISTS "Admins manage rd_hash_cache" ON rd_hash_cache;
CREATE POLICY "Admins manage rd_hash_cache"
  ON rd_hash_cache FOR ALL
  USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- 7. RLS policies for resolver_jobs
DROP POLICY IF EXISTS "Admins manage resolver_jobs" ON resolver_jobs;
CREATE POLICY "Admins manage resolver_jobs"
  ON resolver_jobs FOR ALL
  USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- 8. Indexes
CREATE INDEX IF NOT EXISTS idx_media_items_tmdb ON media_items(tmdb_id, kind);
CREATE INDEX IF NOT EXISTS idx_media_items_status ON media_items(status);
CREATE INDEX IF NOT EXISTS idx_media_items_rd_torrent ON media_items(rd_torrent_id);
CREATE INDEX IF NOT EXISTS idx_rd_hash_cache_checked ON rd_hash_cache(checked_at);
