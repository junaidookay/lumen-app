-- Add landing_spots column for pinning items to specific landing page sections
-- This is separate from `tags` (which are genre/content categories)
-- landing_spots: hero, trending, popular_movies, popular_tv, top_rated, coming_soon, in_theaters, on_the_air

ALTER TABLE public.media_items
  ADD COLUMN IF NOT EXISTS landing_spots text[] DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_media_items_landing_spots ON public.media_items USING gin (landing_spots);
