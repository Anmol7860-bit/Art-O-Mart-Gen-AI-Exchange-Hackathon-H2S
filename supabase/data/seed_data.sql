-- Seed Data for Art-O-Mart Database
-- This file contains sample data extracted from the main migration
-- Use: supabase db seed apply seed_data.sql

DO $$
DECLARE
    admin_uuid UUID := gen_random_uuid();
    artisan1_uuid UUID := gen_random_uuid();
    artisan2_uuid UUID := gen_random_uuid();
    customer1_uuid UUID := gen_random_uuid();
    customer2_uuid UUID := gen_random_uuid();
    
    category1_uuid UUID := gen_random_uuid();
    category2_uuid UUID := gen_random_uuid();
    category3_uuid UUID := gen_random_uuid();
    category4_uuid UUID := gen_random_uuid();
    
    artisan_profile1_uuid UUID := gen_random_uuid();
    artisan_profile2_uuid UUID := gen_random_uuid();
    
    product1_uuid UUID := gen_random_uuid();
    product2_uuid UUID := gen_random_uuid();
    product3_uuid UUID := gen_random_uuid();
    product4_uuid UUID := gen_random_uuid();
    
BEGIN
    -- Create complete auth users with all required fields
    INSERT INTO auth.users (
        id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
        created_at, updated_at, raw_user_meta_data, raw_app_meta_data,
        is_sso_user, is_anonymous, confirmation_token, confirmation_sent_at,
        recovery_token, recovery_sent_at, email_change_token_new, email_change,
        email_change_sent_at, email_change_token_current, email_change_confirm_status,
        reauthentication_token, reauthentication_sent_at, phone, phone_change,
        phone_change_token, phone_change_sent_at
    ) VALUES
        (admin_uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
         'admin@artomart.com', crypt('admin123', gen_salt('bf', 10)), now(), now(), now(),
         '{"full_name": "Admin User", "role": "admin"}'::jsonb, 
         '{"provider": "email", "providers": ["email"]}'::jsonb,
         false, false, '', null, '', null, '', '', null, '', 0, '', null, null, '', '', null),
        (artisan1_uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
         'priya.sharma@artomart.com', crypt('artisan123', gen_salt('bf', 10)), now(), now(), now(),
         '{"full_name": "Priya Sharma", "role": "artisan"}'::jsonb,
         '{"provider": "email", "providers": ["email"]}'::jsonb,
         false, false, '', null, '', null, '', '', null, '', 0, '', null, null, '', '', null),
        (artisan2_uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
         'arjun.patel@artomart.com', crypt('artisan123', gen_salt('bf', 10)), now(), now(), now(),
         '{"full_name": "Arjun Patel", "role": "artisan"}'::jsonb,
         '{"provider": "email", "providers": ["email"]}'::jsonb,
         false, false, '', null, '', null, '', '', null, '', 0, '', null, null, '', '', null),
        (customer1_uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
         'meera.devi@gmail.com', crypt('customer123', gen_salt('bf', 10)), now(), now(), now(),
         '{"full_name": "Meera Devi", "role": "customer"}'::jsonb,
         '{"provider": "email", "providers": ["email"]}'::jsonb,
         false, false, '', null, '', null, '', '', null, '', 0, '', null, null, '', '', null),
        (customer2_uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
         'raj.kumar@gmail.com', crypt('customer123', gen_salt('bf', 10)), now(), now(), now(),
         '{"full_name": "Raj Kumar", "role": "customer"}'::jsonb,
         '{"provider": "email", "providers": ["email"]}'::jsonb,
         false, false, '', null, '', null, '', '', null, '', 0, '', null, null, '', '', null);

    INSERT INTO public.user_profiles (id, email, full_name, role)
    VALUES 
        (admin_uuid, 'admin@artomart.com', 'Admin User', 'admin'),
        (artisan1_uuid, 'priya.sharma@artomart.com', 'Priya Sharma', 'artisan'),
        (artisan2_uuid, 'arjun.patel@artomart.com', 'Arjun Patel', 'artisan'),
        (customer1_uuid, 'meera.devi@gmail.com', 'Meera Devi', 'customer'),
        (customer2_uuid, 'raj.kumar@gmail.com', 'Raj Kumar', 'customer');

    INSERT INTO public.categories (id, name, slug, description, image_url, is_active) VALUES
        (category1_uuid, 'Pottery & Ceramics', 'pottery-ceramics', 'Traditional and modern pottery pieces', 'https://example.com/pottery.jpg', true),
        (category2_uuid, 'Textiles & Fabrics', 'textiles-fabrics', 'Handwoven fabrics and textile art', 'https://example.com/textiles.jpg', true),
        (category3_uuid, 'Woodcraft', 'woodcraft', 'Hand-carved wooden items and furniture', 'https://example.com/woodcraft.jpg', true),
        (category4_uuid, 'Jewelry & Accessories', 'jewelry-accessories', 'Traditional and contemporary jewelry', 'https://example.com/jewelry.jpg', true);

    INSERT INTO public.artisan_profiles (
        id, user_id, business_name, craft_specialty, bio, years_of_experience, region, trust_score
    ) VALUES 
        (artisan_profile1_uuid, artisan1_uuid, 'Priya Ceramics Studio', 'Pottery & Ceramics', 'Master potter with traditional techniques passed down through generations', 15, 'Rajasthan', 4.8),
        (artisan_profile2_uuid, artisan2_uuid, 'Arjun Wood Works', 'Woodcraft', 'Specializing in intricate wood carvings and sustainable furniture', 12, 'Karnataka', 4.7);

    INSERT INTO public.products (
        id, artisan_id, category_id, name, description, price, status, images, quantity_available
    ) VALUES 
        (product1_uuid, artisan_profile1_uuid, category1_uuid, 'Traditional Clay Pot Set', 'Handcrafted clay pots perfect for traditional cooking', 2500.00, 'active', 
         '["https://example.com/pot1.jpg", "https://example.com/pot2.jpg"]'::jsonb, 20),
        (product2_uuid, artisan_profile1_uuid, category1_uuid, 'Decorative Ceramic Vase', 'Beautiful handpainted ceramic vase with traditional motifs', 1800.00, 'active',
         '["https://example.com/vase1.jpg", "https://example.com/vase2.jpg"]'::jsonb, 15),
        (product3_uuid, artisan_profile2_uuid, category3_uuid, 'Carved Wooden Jewelry Box', 'Intricately carved wooden jewelry box with velvet interior', 3200.00, 'active',
         '["https://example.com/box1.jpg", "https://example.com/box2.jpg"]'::jsonb, 8),
        (product4_uuid, artisan_profile2_uuid, category3_uuid, 'Hand-carved Wall Art', 'Traditional wooden wall art depicting Indian mythology', 4500.00, 'active',
         '["https://example.com/wall1.jpg", "https://example.com/wall2.jpg"]'::jsonb, 5);

    INSERT INTO public.product_reviews (product_id, reviewer_id, rating, review_text, is_verified_purchase) VALUES
        (product1_uuid, customer1_uuid, 5, 'Excellent quality pots! Perfect for my kitchen.', true),
        (product1_uuid, customer2_uuid, 4, 'Good craftsmanship, slightly expensive but worth it.', true),
        (product2_uuid, customer1_uuid, 5, 'Beautiful vase, exactly as described.', true),
        (product3_uuid, customer2_uuid, 5, 'Stunning workmanship! My wife loves it.', true);

EXCEPTION
    WHEN foreign_key_violation THEN
        RAISE NOTICE 'Foreign key error during seed data insertion: %', SQLERRM;
    WHEN unique_violation THEN
        RAISE NOTICE 'Unique constraint error during seed data insertion: %', SQLERRM;
    WHEN OTHERS THEN
        RAISE NOTICE 'Unexpected error during seed data insertion: %', SQLERRM;
END $$;