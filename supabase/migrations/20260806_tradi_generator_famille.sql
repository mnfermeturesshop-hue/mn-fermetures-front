-- Le configurateur `volet-roulant-traditionnel` sert désormais TOUTE la famille
-- Tradi (1.1) : le nœud de surcharge/remise est choisi dynamiquement via le champ
-- `sous_famille` (tradi-std 1.1.1 / tradi-coffre 1.1.2 / coffre-seul 1.1.3).
-- On déplace donc le generator_slug de la sous-famille `tradi-std` vers la
-- famille `tradi`. À exécuter dans Supabase Dashboard → SQL Editor.

UPDATE public.taxonomy_nodes
   SET generator_slug = NULL
 WHERE slug = 'tradi-std'
   AND generator_slug = 'volet-roulant-traditionnel';

UPDATE public.taxonomy_nodes
   SET generator_slug = 'volet-roulant-traditionnel'
 WHERE slug = 'tradi';
