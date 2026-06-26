-- ============================================================
-- MN FERMETURES — Schéma Supabase
-- À exécuter dans : SQL Editor de votre projet Supabase
-- ============================================================

-- ============================================================
-- PROFILES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id             UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name           TEXT NOT NULL DEFAULT '',
  role           TEXT NOT NULL DEFAULT 'b2c'
    CHECK (role IN ('b2c', 'b2b', 'admin')),
  company        TEXT,
  pro_discount_pct INT NOT NULL DEFAULT 0 CHECK (pro_discount_pct BETWEEN 0 AND 50),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Admin peut voir tous les profils
CREATE POLICY "profiles_admin_all" ON public.profiles
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data ->> 'role', 'b2c')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- CATEGORIES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.categories (
  slug   TEXT PRIMARY KEY,
  name   TEXT NOT NULL,
  icon   TEXT,
  sort   INT NOT NULL DEFAULT 0
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Lecture publique
CREATE POLICY "categories_public_select" ON public.categories
  FOR SELECT USING (true);

-- Écriture admin uniquement
CREATE POLICY "categories_admin_write" ON public.categories
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- Données initiales
INSERT INTO public.categories (slug, name, icon, sort) VALUES
  ('tabliers',        'Tabliers',            '▤', 1),
  ('kits-axes',       'Kits axes',           '⚙', 2),
  ('motorisations',   'Motorisations',       '⊙', 3),
  ('commandes',       'Commandes',           '⎚', 4),
  ('profils',         'Profils',             '▬', 5),
  ('consoles',        'Consoles & flasques', '◳', 6),
  ('embouts',         'Embouts',             '◖', 7),
  ('verrouillages',   'Verrouillages',       '⛓', 8),
  ('pieces-detachees','Pièces détachées',    '🔩', 9)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- BRANDS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.brands (
  slug     TEXT PRIMARY KEY,
  name     TEXT NOT NULL,
  logo_url TEXT
);

ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;

CREATE POLICY "brands_public_select" ON public.brands
  FOR SELECT USING (true);

CREATE POLICY "brands_admin_write" ON public.brands
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

INSERT INTO public.brands (slug, name) VALUES
  ('somfy', 'Somfy'),
  ('mn',    'MN'),
  ('bubendorff', 'Bubendorff'),
  ('came',  'Came'),
  ('nice',  'Nice')
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- PRODUCTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.products (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug         TEXT UNIQUE NOT NULL,
  name         TEXT NOT NULL,
  description  TEXT,
  category_slug TEXT NOT NULL REFERENCES public.categories(slug),
  brand_slug   TEXT REFERENCES public.brands(slug),
  pricing_type TEXT NOT NULL CHECK (pricing_type IN ('unit', 'matrix', 'kit')),
  pro_only     BOOLEAN NOT NULL DEFAULT false,
  specs        JSONB,
  -- Champs type unit
  variants     JSONB,
  -- Champs type matrix
  matrix_prices JSONB,
  matrix_options JSONB,
  matrix_min_h  NUMERIC(6,0),
  matrix_max_h  NUMERIC(6,0),
  matrix_min_w  NUMERIC(6,0),
  matrix_max_w  NUMERIC(6,0),
  -- Champs type kit
  configs      JSONB,
  -- Image principale
  image_url    TEXT,
  -- Statut
  active       BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Lecture publique des produits actifs
CREATE POLICY "products_public_select" ON public.products
  FOR SELECT USING (active = true);

-- Admin voit tout et peut tout modifier
CREATE POLICY "products_admin_all" ON public.products
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- ORDERS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.orders (
  id             TEXT PRIMARY KEY,
  user_id        UUID REFERENCES auth.users(id),
  lines          JSONB NOT NULL,
  total_ht       NUMERIC(10,2) NOT NULL,
  total_ttc      NUMERIC(10,2) NOT NULL,
  frais_ht       NUMERIC(10,2) NOT NULL DEFAULT 0,
  shipping_addr  JSONB NOT NULL,
  shipping_method TEXT NOT NULL,
  payment_method TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','paid','processing','shipped','delivered','cancelled')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "orders_select_own" ON public.orders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "orders_insert_own" ON public.orders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "orders_admin_all" ON public.orders
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- ============================================================
-- PRO REQUESTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.pro_requests (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company     TEXT NOT NULL,
  siret       TEXT NOT NULL,
  name        TEXT NOT NULL,
  email       TEXT NOT NULL,
  phone       TEXT,
  status      TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','rejected')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.pro_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pro_requests_insert" ON public.pro_requests
  FOR INSERT WITH CHECK (true);

CREATE POLICY "pro_requests_admin_all" ON public.pro_requests
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- ============================================================
-- SUPABASE STORAGE — bucket product-images
-- ============================================================
-- À exécuter dans Storage > New bucket :
--   Nom : product-images
--   Public : true
--
-- Ou via SQL :
INSERT INTO storage.buckets (id, name, public)
  VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "product_images_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'product-images');

CREATE POLICY "product_images_admin_write" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'product-images' AND
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY "product_images_admin_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'product-images' AND
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );
