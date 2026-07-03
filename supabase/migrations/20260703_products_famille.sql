-- Ajout colonne famille sur products pour les remises B2B
-- À exécuter dans Supabase Dashboard → SQL Editor

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS famille TEXT;

-- Auto-remplissage pour les produits existants selon leur menu_path
UPDATE public.products SET famille = 'volet-roulant'  WHERE menu_path LIKE '/catalogue/tabliers%'         AND famille IS NULL;
UPDATE public.products SET famille = 'volet-roulant'  WHERE menu_path LIKE '/catalogue/kits-axes%'        AND famille IS NULL;
UPDATE public.products SET famille = 'volet-battant'  WHERE menu_path LIKE '/catalogue/volets-battants%'  AND famille IS NULL;
UPDATE public.products SET famille = 'porte-garage'   WHERE menu_path LIKE '/catalogue/portes-de-garage%' AND famille IS NULL;
UPDATE public.products SET famille = 'portail'        WHERE menu_path LIKE '/catalogue/portails%'         AND famille IS NULL;
UPDATE public.products SET famille = 'accessoires'    WHERE menu_path LIKE '/catalogue/accessoires%'      AND famille IS NULL;
UPDATE public.products SET famille = 'accessoires'    WHERE menu_path LIKE '/catalogue/pieces-detachees%' AND famille IS NULL;
