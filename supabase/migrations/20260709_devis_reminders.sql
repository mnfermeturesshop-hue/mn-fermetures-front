-- Rappel automatique à 15 jours sur les devis (opt-in client) :
-- email envoyé par le cron quotidien pour penser à convertir le devis
-- en bon de commande / relancer le client final.
-- À exécuter dans Supabase Dashboard → SQL Editor

ALTER TABLE public.devis
  ADD COLUMN IF NOT EXISTS reminder_at      timestamptz,  -- échéance du rappel (NULL = désactivé)
  ADD COLUMN IF NOT EXISTS reminder_sent_at timestamptz;  -- envoi effectué

CREATE INDEX IF NOT EXISTS devis_reminder_idx ON public.devis (reminder_at)
  WHERE reminder_at IS NOT NULL AND reminder_sent_at IS NULL;
