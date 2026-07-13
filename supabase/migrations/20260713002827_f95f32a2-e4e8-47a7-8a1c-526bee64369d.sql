
ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS subtitle_language TEXT NOT NULL DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS subtitles_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS audio_language TEXT NOT NULL DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS playback_speed NUMERIC(3,2) NOT NULL DEFAULT 1.00,
  ADD COLUMN IF NOT EXISTS preferred_provider TEXT NOT NULL DEFAULT 'sample';

ALTER TABLE public.continue_watching
  ADD COLUMN IF NOT EXISTS source_id TEXT,
  ADD COLUMN IF NOT EXISTS completed BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS continue_watching_completed_idx
  ON public.continue_watching(user_id, completed, updated_at DESC);
