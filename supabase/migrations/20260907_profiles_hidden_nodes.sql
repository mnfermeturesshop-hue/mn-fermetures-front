-- Masquage de produits PAR CLIENT (demande PDG). Liste de slugs de nœuds de
-- nomenclature masqués pour ce client — hérités comme les remises (masquer une
-- famille masque ses sous-familles/produits). Lu côté serveur (source de vérité,
-- jamais le client). Défaut = aucun masquage.
-- À exécuter dans Supabase Dashboard → SQL Editor.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS hidden_nodes jsonb NOT NULL DEFAULT '[]'::jsonb;
