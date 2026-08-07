-- Éco-contribution (loi AGEC / éco-organisme Valobat) par nœud de nomenclature —
-- montant en euros (avec décimales), fixé PAR SOUS-FAMILLE, mis à jour chaque année.
-- Ajouté une fois par produit sur les devis/bons de commande (non remisable, non
-- surchargeable). Résolution EXACTE (pas d'héritage), comme la surcharge.
-- À exécuter dans Supabase Dashboard → SQL Editor.

ALTER TABLE public.taxonomy_nodes
  ADD COLUMN IF NOT EXISTS eco_contribution numeric NOT NULL DEFAULT 0;
