-- Ajout du rôle 'pending' dans le CHECK de profiles.role
-- À exécuter dans Supabase Dashboard → SQL Editor

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('b2c', 'b2b', 'admin', 'pending'));
