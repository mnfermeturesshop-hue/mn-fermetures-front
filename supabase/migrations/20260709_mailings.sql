-- Mailings commerciaux : opt-out par profil + historique des envois.
-- À exécuter dans Supabase Dashboard → SQL Editor

-- Désinscription des emails COMMERCIAUX (les transactionnels ne sont pas concernés)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email_optout boolean NOT NULL DEFAULT false;

-- Historique des mailings (traçabilité : qui a envoyé quoi, à combien de clients)
CREATE TABLE IF NOT EXISTS public.mailings (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id        uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  sender_name      text NOT NULL,
  subject          text NOT NULL,
  body             text NOT NULL,
  recipients_count int  NOT NULL,
  created_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.mailings ENABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE public.mailings TO service_role;
