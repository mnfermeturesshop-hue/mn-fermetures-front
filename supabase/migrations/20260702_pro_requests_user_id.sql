-- Lier pro_requests à l'utilisateur auth créé lors de l'inscription
-- À exécuter dans Supabase Dashboard → SQL Editor

ALTER TABLE public.pro_requests
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
