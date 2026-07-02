-- Adresses et téléphone par défaut sur les profils clients
-- À exécuter dans Supabase Dashboard → SQL Editor

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone             text,
  ADD COLUMN IF NOT EXISTS shipping_address  jsonb DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS billing_address   jsonb DEFAULT NULL;
