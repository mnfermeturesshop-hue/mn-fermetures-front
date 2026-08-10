-- Configurateur « Volet roulant rénovation » (démarré par Minibox 1.2.1) rattaché
-- à la FAMILLE Reno (1.2). Le nœud de remise/surcharge/éco est choisi dynamiquement
-- via le champ `sous_famille`. À exécuter dans Supabase Dashboard → SQL Editor.

UPDATE public.taxonomy_nodes
   SET generator_slug = 'volet-roulant-renovation'
 WHERE slug = 'reno';
