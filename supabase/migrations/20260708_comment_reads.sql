-- Suivi de lecture des fils de commentaires (pastilles "non lu").
-- Une ligne par (utilisateur, document) : "j'ai lu ce fil jusqu'à cette date".
-- À exécuter dans Supabase Dashboard → SQL Editor

CREATE TABLE IF NOT EXISTS public.comment_reads (
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_type   text NOT NULL CHECK (target_type IN ('devis', 'order')),
  target_number text NOT NULL,
  last_read_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, target_type, target_number)
);

-- Accès uniquement via l'API (service_role + gardes applicatives)
ALTER TABLE public.comment_reads ENABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE public.comment_reads TO service_role;
