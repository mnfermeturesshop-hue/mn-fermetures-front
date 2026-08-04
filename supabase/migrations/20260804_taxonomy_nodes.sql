-- Nomenclature produits (Gamme › Famille › Sous‑famille) — éditable admin.
-- Pilote la navigation, le rattachement des produits/configurateurs et les
-- remises B2B héritées. Liste d'adjacence (parent_slug). Lecture publique
-- (navigation) ; écriture réservée au service_role (back-office).
-- À exécuter dans Supabase Dashboard → SQL Editor.

CREATE TABLE IF NOT EXISTS public.taxonomy_nodes (
  slug           text PRIMARY KEY,
  parent_slug    text REFERENCES public.taxonomy_nodes(slug) ON DELETE CASCADE,
  level          text NOT NULL CHECK (level IN ('gamme', 'famille', 'sous_famille')),
  code           text NOT NULL,
  name           text NOT NULL,
  sort_order     integer NOT NULL DEFAULT 0,
  active         boolean NOT NULL DEFAULT true,
  generator_slug text,
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS taxonomy_nodes_parent_idx ON public.taxonomy_nodes (parent_slug, sort_order);

ALTER TABLE public.taxonomy_nodes ENABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE public.taxonomy_nodes TO service_role;
GRANT SELECT ON TABLE public.taxonomy_nodes TO anon, authenticated;

-- Lecture publique (méga-menu / catalogue) ; écriture via service_role uniquement.
DROP POLICY IF EXISTS taxonomy_read ON public.taxonomy_nodes;
CREATE POLICY taxonomy_read ON public.taxonomy_nodes FOR SELECT USING (true);
