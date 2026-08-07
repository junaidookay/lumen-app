ALTER TABLE public.media_items
ADD COLUMN IF NOT EXISTS rd_links JSONB;

ALTER TABLE public.media_item_seasons
ADD COLUMN IF NOT EXISTS rd_links JSONB;

COMMENT ON COLUMN public.media_items.rd_links IS 'Pre-resolved RD unrestricted download links (array of {index, filename, download, filesize, mimeType, streamable, season, episode})';
COMMENT ON COLUMN public.media_item_seasons.rd_links IS 'Pre-resolved RD unrestricted download links for this season';
