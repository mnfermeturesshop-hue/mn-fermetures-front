-- Références client / chantier sur les devis (lisibilité côté pro)
-- Le professionnel peut saisir SA référence (n° de commande/dossier interne)
-- et/ou la référence du chantier ; elles s'affichent sur le devis et le PDF.
-- À exécuter dans Supabase Dashboard → SQL Editor.
--
-- Le code est tolérant : tant que ces colonnes n'existent pas, l'enregistrement
-- d'un devis fonctionne quand même (les références sont simplement ignorées).

alter table public.devis
  add column if not exists reference_client   text,
  add column if not exists reference_chantier text;
