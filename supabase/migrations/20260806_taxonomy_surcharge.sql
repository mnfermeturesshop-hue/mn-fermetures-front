-- Surcharge temporaire (%) par nœud de nomenclature — appliquée au prix des
-- produits de la gamme/famille/sous-famille, avec héritage (la plus précise
-- l'emporte), à la manière des remises client mais GLOBALE (pas par client).
-- À exécuter dans Supabase Dashboard → SQL Editor.

ALTER TABLE public.taxonomy_nodes
  ADD COLUMN IF NOT EXISTS surcharge numeric NOT NULL DEFAULT 0;
