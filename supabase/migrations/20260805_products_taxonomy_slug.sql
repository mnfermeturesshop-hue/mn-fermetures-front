-- Rattachement d'un produit à un nœud de la nomenclature (Gamme › Famille ›
-- Sous‑famille). Pilote la remise B2B héritée et le placement catalogue.
-- Remplace à terme la colonne `famille` (repli conservé le temps de la migration).
-- À exécuter dans Supabase Dashboard → SQL Editor.

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS taxonomy_slug text
    REFERENCES public.taxonomy_nodes(slug) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS products_taxonomy_idx ON public.products (taxonomy_slug);
