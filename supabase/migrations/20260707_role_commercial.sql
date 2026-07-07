-- Rôle "commercial" : admin restreint à ses propres clients
-- + rattachement client -> commercial référent.
-- À exécuter dans Supabase Dashboard → SQL Editor

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('b2c', 'b2b', 'admin', 'pending', 'commercial'));

-- Commercial référent d'un client pro (NULL = non assigné).
-- ON DELETE SET NULL : supprimer un commercial désassigne proprement ses clients.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS commercial_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS profiles_commercial_id_idx ON public.profiles (commercial_id);
