-- Devis générés depuis l'ERP, uploadés manuellement par les admins
-- et rattachés à un client pro (convertibles en bon de commande).
-- À exécuter dans Supabase Dashboard → SQL Editor

ALTER TABLE public.devis
  ADD COLUMN IF NOT EXISTS source   text NOT NULL DEFAULT 'site'
    CHECK (source IN ('site', 'erp')),
  ADD COLUMN IF NOT EXISTS pdf_path text;

-- Bucket privé pour les PDF de devis ERP (accès via URL signée uniquement,
-- même modèle que order-documents)
INSERT INTO storage.buckets (id, name, public)
  VALUES ('devis-documents', 'devis-documents', false)
  ON CONFLICT (id) DO NOTHING;
