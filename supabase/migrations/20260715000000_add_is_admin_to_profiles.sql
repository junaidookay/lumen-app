-- Add is_admin toggle to profiles for quick admin management
ALTER TABLE public.profiles ADD COLUMN is_admin BOOLEAN NOT NULL DEFAULT false;

-- Allow admins to update is_admin on any profile
CREATE POLICY "admins toggle is_admin" ON public.profiles
  FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- First user (by created_at) gets auto-promoted
UPDATE public.profiles SET is_admin = true
WHERE id = (SELECT id FROM public.profiles ORDER BY created_at ASC LIMIT 1);
