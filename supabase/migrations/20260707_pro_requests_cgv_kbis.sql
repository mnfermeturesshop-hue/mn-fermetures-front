-- Acceptation des CGV (clickwrap horodaté) + upload Kbis optionnel
-- à l'ouverture de compte pro.
-- À exécuter dans Supabase Dashboard → SQL Editor

ALTER TABLE public.pro_requests
  ADD COLUMN IF NOT EXISTS cgv_accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS cgv_version     text,
  ADD COLUMN IF NOT EXISTS cgv_ip          text,
  ADD COLUMN IF NOT EXISTS kbis_path       text;

-- Bucket privé pour les Kbis (accès admin via URL signée uniquement)
INSERT INTO storage.buckets (id, name, public)
  VALUES ('kbis-documents', 'kbis-documents', false)
  ON CONFLICT (id) DO NOTHING;
