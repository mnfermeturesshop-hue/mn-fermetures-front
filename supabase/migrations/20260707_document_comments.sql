-- Fils de commentaires client <-> commercial rattachés aux devis
-- et aux bons de commande.
-- À exécuter dans Supabase Dashboard → SQL Editor

CREATE TABLE IF NOT EXISTS public.document_comments (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  target_type   text NOT NULL CHECK (target_type IN ('devis', 'order')),
  target_number text NOT NULL,             -- devis_number ou order_number
  author_id     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  author_role   text NOT NULL CHECK (author_role IN ('client', 'commercial', 'admin')),
  author_name   text NOT NULL,
  body          text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS document_comments_target_idx
  ON public.document_comments (target_type, target_number, created_at);

-- Aucune policy volontairement : lecture/écriture uniquement via l'API
-- (service_role + gardes applicatives : propriétaire, commercial assigné, admin)
ALTER TABLE public.document_comments ENABLE ROW LEVEL SECURITY;
