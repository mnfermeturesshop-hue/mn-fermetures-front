-- Colonne documents par commande (ARC, facture, suivi de livraison uploadés depuis ERP)
-- À exécuter dans Supabase Dashboard → SQL Editor

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS documents jsonb DEFAULT '{}'::jsonb;

-- Bucket privé pour stocker les documents ERP (non accessible directement par URL)
INSERT INTO storage.buckets (id, name, public)
  VALUES ('order-documents', 'order-documents', false)
  ON CONFLICT (id) DO NOTHING;
