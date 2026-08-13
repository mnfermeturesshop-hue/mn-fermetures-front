-- Ajoute les deux rubriques de menu « Manœuvres manuelles » et « Aide à la pose »
-- dans la table categories (référencée par products.category_slug). Sans ces lignes,
-- la création d'un produit positionné sur l'une de ces rubriques échoue avec
-- « products_category_slug_fkey ». Les slugs correspondent à lib/catalog/mock.ts.
INSERT INTO public.categories (slug, name, icon, sort) VALUES
  ('manoeuvres-manuelles', 'Manœuvres manuelles', '🔧', 10),
  ('aide-a-la-pose',       'Aide à la pose',       '🛠', 11)
ON CONFLICT (slug) DO NOTHING;
