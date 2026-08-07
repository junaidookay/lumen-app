-- Add tags to media_items for organizing content into landing page sections
-- Tags: "featured", "trending", "new", "action", "drama", etc.
ALTER TABLE media_items ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- Index for fast tag-based queries
CREATE INDEX IF NOT EXISTS idx_media_items_tags ON media_items USING GIN (tags);
