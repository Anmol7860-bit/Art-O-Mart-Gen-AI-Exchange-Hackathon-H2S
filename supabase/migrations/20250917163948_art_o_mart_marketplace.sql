-- Location: supabase/migrations/20250917163948_art_o_mart_marketplace.sql
-- Schema Analysis: Fresh project with no existing tables
-- Integration Type: Complete e-commerce marketplace with auth
-- Dependencies: None (first migration)

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Types and Enums
CREATE TYPE public.user_role AS ENUM ('customer', 'artisan', 'admin');
CREATE TYPE public.product_status AS ENUM ('draft', 'active', 'inactive', 'sold_out');
CREATE TYPE public.order_status AS ENUM ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded');
CREATE TYPE public.payment_status AS ENUM ('pending', 'completed', 'failed', 'refunded');

-- 2. Core Tables (no foreign keys)
CREATE TABLE public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    role public.user_role DEFAULT 'customer'::public.user_role,
    avatar_url TEXT,
    phone TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    image_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. Dependent tables (with foreign keys)
CREATE TABLE public.artisan_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    business_name TEXT NOT NULL,
    craft_specialty TEXT NOT NULL,
    bio TEXT,
    years_of_experience INTEGER DEFAULT 0,
    region TEXT,
    workshop_address TEXT,
    website_url TEXT,
    social_media JSONB DEFAULT '{}',
    trust_score DECIMAL(2,1) DEFAULT 5.0 CHECK (trust_score >= 0 AND trust_score <= 5),
    is_verified BOOLEAN DEFAULT false,
    verification_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

CREATE TABLE public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    artisan_id UUID NOT NULL REFERENCES public.artisan_profiles(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    price DECIMAL(10,2) NOT NULL CHECK (price > 0),
    original_price DECIMAL(10,2) CHECK (original_price IS NULL OR original_price > price),
    status public.product_status DEFAULT 'draft'::public.product_status,
    stock_quantity INTEGER DEFAULT 0 CHECK (stock_quantity >= 0),
    images TEXT[] DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',
    is_featured BOOLEAN DEFAULT false,
    weight_grams INTEGER,
    dimensions JSONB,
    materials TEXT[],
    care_instructions TEXT,
    shipping_info TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.product_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    is_verified_purchase BOOLEAN DEFAULT false,
    helpful_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(product_id, reviewer_id)
);

CREATE TABLE public.carts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    added_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, product_id)
);

CREATE TABLE public.addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('shipping', 'billing')),
    full_name TEXT NOT NULL,
    address_line_1 TEXT NOT NULL,
    address_line_2 TEXT,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    postal_code TEXT NOT NULL,
    country TEXT DEFAULT 'India',
    phone TEXT,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    order_number TEXT NOT NULL UNIQUE,
    status public.order_status DEFAULT 'pending'::public.order_status,
    payment_status public.payment_status DEFAULT 'pending'::public.payment_status,
    total_amount DECIMAL(10,2) NOT NULL CHECK (total_amount > 0),
    shipping_amount DECIMAL(10,2) DEFAULT 0,
    tax_amount DECIMAL(10,2) DEFAULT 0,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    shipping_address JSONB NOT NULL,
    billing_address JSONB,
    payment_method TEXT,
    payment_transaction_id TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    artisan_id UUID NOT NULL REFERENCES public.artisan_profiles(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price > 0),
    total_price DECIMAL(10,2) NOT NULL CHECK (total_price > 0),
    product_title TEXT NOT NULL,
    product_image TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE public.wishlists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    added_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, product_id)
);

-- 4. Essential Indexes
CREATE INDEX idx_user_profiles_email ON public.user_profiles(email);
CREATE INDEX idx_user_profiles_role ON public.user_profiles(role);
CREATE INDEX idx_artisan_profiles_user_id ON public.artisan_profiles(user_id);
CREATE INDEX idx_artisan_profiles_verified ON public.artisan_profiles(is_verified);
CREATE INDEX idx_products_artisan_id ON public.products(artisan_id);
CREATE INDEX idx_products_category_id ON public.products(category_id);
CREATE INDEX idx_products_status ON public.products(status);
CREATE INDEX idx_products_featured ON public.products(is_featured);
CREATE INDEX idx_product_reviews_product_id ON public.product_reviews(product_id);
CREATE INDEX idx_product_reviews_rating ON public.product_reviews(rating);
CREATE INDEX idx_carts_user_id ON public.carts(user_id);
CREATE INDEX idx_orders_customer_id ON public.orders(customer_id);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX idx_order_items_artisan_id ON public.order_items(artisan_id);
CREATE INDEX idx_wishlists_user_id ON public.wishlists(user_id);

-- 5. Storage Buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
    ('product-images', 'product-images', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg']),
    ('profile-images', 'profile-images', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg']),
    ('category-images', 'category-images', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg'])
ON CONFLICT (id) DO NOTHING;

-- 6. Functions (BEFORE RLS policies)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO public.user_profiles (id, email, full_name, role)
    VALUES (
        NEW.id, 
        NEW.email, 
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'role', 'customer')::public.user_role
    );
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_product_stats()
RETURNS TRIGGER
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Update product review count and average rating
    UPDATE public.products 
    SET updated_at = CURRENT_TIMESTAMP
    WHERE id = COALESCE(NEW.product_id, OLD.product_id);
    RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    order_num TEXT;
BEGIN
    order_num := 'AOM-' || TO_CHAR(CURRENT_TIMESTAMP, 'YYYYMMDD') || '-' || LPAD(floor(random() * 10000)::TEXT, 4, '0');
    RETURN order_num;
END;
$$;

-- Generic updated_at function
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

-- 7. Enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artisan_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;

-- 8. RLS Policies
-- Pattern 1: Core user tables - simple ownership
CREATE POLICY "users_manage_own_user_profiles"
ON public.user_profiles
FOR ALL
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Pattern 2: Simple user ownership
CREATE POLICY "users_manage_own_artisan_profiles"
ON public.artisan_profiles
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "users_manage_own_carts"
ON public.carts
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "users_manage_own_addresses"
ON public.addresses
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "users_manage_own_orders"
ON public.orders
FOR ALL
TO authenticated
USING (customer_id = auth.uid())
WITH CHECK (customer_id = auth.uid());

CREATE POLICY "users_manage_own_wishlists"
ON public.wishlists
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "users_manage_own_reviews"
ON public.product_reviews
FOR ALL
TO authenticated
USING (reviewer_id = auth.uid())
WITH CHECK (reviewer_id = auth.uid());

-- Pattern 4: Public read, private write
CREATE POLICY "public_can_read_categories"
ON public.categories
FOR SELECT
TO public
USING (is_active = true);

CREATE POLICY "authenticated_users_manage_categories"
ON public.categories
FOR ALL
TO authenticated
USING (EXISTS (
    SELECT 1 FROM auth.users au 
    WHERE au.id = auth.uid() 
    AND (au.raw_user_meta_data->>'role' = 'admin')
))
WITH CHECK (EXISTS (
    SELECT 1 FROM auth.users au 
    WHERE au.id = auth.uid() 
    AND (au.raw_user_meta_data->>'role' = 'admin')
));

CREATE POLICY "public_can_read_active_products"
ON public.products
FOR SELECT
TO public
USING (status = 'active'::public.product_status);

CREATE POLICY "artisans_manage_own_products"
ON public.products
FOR ALL
TO authenticated
USING (artisan_id IN (
    SELECT ap.id FROM public.artisan_profiles ap 
    WHERE ap.user_id = auth.uid()
))
WITH CHECK (artisan_id IN (
    SELECT ap.id FROM public.artisan_profiles ap 
    WHERE ap.user_id = auth.uid()
));

CREATE POLICY "public_can_read_product_reviews"
ON public.product_reviews
FOR SELECT
TO public
USING (true);

CREATE POLICY "authenticated_users_view_order_items"
ON public.order_items
FOR SELECT
TO authenticated
USING (
    order_id IN (SELECT id FROM public.orders WHERE customer_id = auth.uid())
    OR artisan_id IN (
        SELECT ap.id FROM public.artisan_profiles ap 
        WHERE ap.user_id = auth.uid()
    )
);

-- Storage policies
CREATE POLICY "public_can_view_product_images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'product-images');

CREATE POLICY "artisans_upload_product_images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'product-images'
    AND EXISTS (
        SELECT 1 FROM public.artisan_profiles ap 
        WHERE ap.user_id = auth.uid()
    )
);

CREATE POLICY "artisans_manage_product_images"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'product-images' AND owner = auth.uid());

CREATE POLICY "public_can_view_profile_images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'profile-images');

CREATE POLICY "users_upload_profile_images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'profile-images');

CREATE POLICY "users_manage_profile_images"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'profile-images' AND owner = auth.uid());

CREATE POLICY "public_can_view_category_images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'category-images');

CREATE POLICY "admins_manage_category_images"
ON storage.objects
FOR ALL
TO authenticated
USING (
    bucket_id = 'category-images'
    AND EXISTS (
        SELECT 1 FROM auth.users au
        WHERE au.id = auth.uid() 
        AND (au.raw_user_meta_data->>'role' = 'admin')
    )
)
WITH CHECK (
    bucket_id = 'category-images'
    AND EXISTS (
        SELECT 1 FROM auth.users au
        WHERE au.id = auth.uid() 
        AND (au.raw_user_meta_data->>'role' = 'admin')
    )
);

-- 9. Triggers
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER on_product_review_change
    AFTER INSERT OR UPDATE OR DELETE ON public.product_reviews
    FOR EACH ROW EXECUTE FUNCTION public.update_product_stats();

-- Add updated_at triggers for tables with updated_at columns
CREATE TRIGGER set_updated_at_user_profiles
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_updated_at_artisan_profiles
    BEFORE UPDATE ON public.artisan_profiles
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_updated_at_products
    BEFORE UPDATE ON public.products
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_updated_at_orders
    BEFORE UPDATE ON public.orders
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 10. Mock Data has been moved to supabase/seed/dev_seed.sql
-- Run separately for development environments only

-- 9. Health Check Function (for backend health route)
-- Creates a simple RPC function that returns database status and version information
-- Can be called by authenticated users to check database connectivity
CREATE OR REPLACE FUNCTION public.health_check()
RETURNS JSON
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT json_build_object(
    'status', 'healthy',
    'timestamp', CURRENT_TIMESTAMP,
    'version', version(),
    'database', current_database(),
    'user', current_user,
    'tables_count', (
      SELECT COUNT(*)
      FROM information_schema.tables
      WHERE table_schema = 'public'
    ),
    'connection_info', json_build_object(
      'server_version', current_setting('server_version'),
      'client_encoding', current_setting('client_encoding'),
      'timezone', current_setting('timezone')
    )
  );
$$;

-- Helper functions for test schema access
CREATE OR REPLACE FUNCTION public.get_public_tables()
RETURNS JSON
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT json_agg(table_name)
  FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE';
$$;

CREATE OR REPLACE FUNCTION public.get_table_columns(table_name_param TEXT)
RETURNS JSON
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT json_agg(json_build_object(
    'column_name', column_name,
    'data_type', data_type,
    'is_nullable', is_nullable
  ))
  FROM information_schema.columns
  WHERE table_schema = 'public'
  AND table_name = table_name_param;
$$;

CREATE OR REPLACE FUNCTION public.get_foreign_keys()
RETURNS JSON
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT json_agg(json_build_object(
    'constraint_name', constraint_name,
    'table_name', table_name,
    'constraint_type', constraint_type
  ))
  FROM information_schema.table_constraints
  WHERE constraint_type = 'FOREIGN KEY'
  AND table_schema = 'public';
$$;

CREATE OR REPLACE FUNCTION public.get_enum_types()
RETURNS JSON
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT json_agg(typname)
  FROM pg_type
  WHERE typtype = 'e'
  AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
$$;

CREATE OR REPLACE FUNCTION public.get_table_indexes(table_name_param TEXT)
RETURNS JSON
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT json_agg(json_build_object(
    'indexname', indexname,
    'tablename', tablename
  ))
  FROM pg_indexes
  WHERE schemaname = 'public'
  AND tablename = table_name_param;
$$;

CREATE OR REPLACE FUNCTION public.get_tables_with_rls()
RETURNS JSON
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT json_agg(json_build_object(
    'tablename', c.relname,
    'rowsecurity', c.relrowsecurity
  ))
  FROM pg_catalog.pg_class c
  JOIN pg_catalog.pg_namespace n ON c.relnamespace = n.oid
  WHERE n.nspname = 'public'
  AND c.relkind = 'r';
$$;

CREATE OR REPLACE FUNCTION public.get_public_functions()
RETURNS JSON
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT json_agg(routine_name)
  FROM information_schema.routines
  WHERE routine_schema = 'public'
  AND routine_type = 'FUNCTION';
$$;

CREATE OR REPLACE FUNCTION public.get_triggers()
RETURNS JSON
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT json_agg(json_build_object(
    'trigger_name', trigger_name,
    'event_object_table', event_object_table
  ))
  FROM information_schema.triggers
  WHERE trigger_schema = 'public';
$$;