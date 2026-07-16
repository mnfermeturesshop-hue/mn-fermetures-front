-- Historique des tarifs de configurateur (filet de sécurité / rollback).
-- Avant chaque import admin, la définition précédente est archivée ici. Permet
-- de retrouver un tarif antérieur (ex. 2026) si un import (ex. 2027) est erroné.
-- À exécuter dans Supabase Dashboard → SQL Editor.

CREATE TABLE IF NOT EXISTS public.configurator_versions (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  slug         text NOT NULL,
  name         text NOT NULL,
  famille      text NOT NULL,
  definition   jsonb NOT NULL,
  archived_at  timestamptz NOT NULL DEFAULT now(),
  archived_by  uuid
);

CREATE INDEX IF NOT EXISTS configurator_versions_slug_idx
  ON public.configurator_versions (slug, archived_at DESC);

ALTER TABLE public.configurator_versions ENABLE ROW LEVEL SECURITY;
GRANT ALL ON TABLE public.configurator_versions TO service_role;
