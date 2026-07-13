-- Configurateurs produit (prix instantané f(pose, lame, motorisation, L×H,
-- coloris, options)). La définition complète (grilles, moins-values,
-- options, coloris, limites) est stockée en jsonb, alimentée par l'import
-- Excel admin. Lue côté serveur (service_role) par l'API et la
-- re-tarification devis.
-- À exécuter dans Supabase Dashboard → SQL Editor

CREATE TABLE IF NOT EXISTS public.configurators (
  slug        text PRIMARY KEY,
  name        text NOT NULL,
  famille     text NOT NULL,
  definition  jsonb NOT NULL,
  active      boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.configurators ENABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE public.configurators TO service_role;
