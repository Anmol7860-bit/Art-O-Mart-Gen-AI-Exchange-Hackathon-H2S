-- Development Seed Data for Art-O-Mart Database
-- This file contains sample data for development and testing
-- DO NOT run in production environments

-- 10. Mock Data with complete auth.users
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
         'ravi.kumar@gmail.com', crypt('customer123', gen_salt('bf', 10)), now(), now(), now(),
         '{"full_name": "Ravi Kumar", "role": "customer"}'::jsonb,
         '{"provider": "email", "providers": ["email"]}'::jsonb,
         false, false, '', null, '', null, '', '', null, '', 0, '', null, null, '', '', null);

    -- Categories
    INSERT INTO public.categories (id, name, slug, description, image_url, is_active) VALUES
        (category1_uuid, 'Textiles', 'textiles', 'Handwoven fabrics, sarees, dupattas and traditional clothing', 
         'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=300&h=300&fit=crop', true),
        (category2_uuid, 'Woodwork', 'woodwork', 'Hand-carved sculptures, furniture and decorative items',
         'https://images.pexels.com/photos/1094767/pexels-photo-1094767.jpeg?w=300&h=300&fit=crop', true),
        (category3_uuid, 'Pottery', 'pottery', 'Hand-thrown ceramics, vases and decorative pottery',
         'https://images.pixabay.com/photo/2017/08/01/11/48/blue-2564660_1280.jpg?w=300&h=300&fit=crop', true),
        (category4_uuid, 'Jewelry', 'jewelry', 'Traditional and contemporary handmade jewelry',
         'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=300&h=300&fit=crop', true)
    ON CONFLICT (id) DO NOTHING;

    -- Artisan Profiles
    INSERT INTO public.artisan_profiles (
        id, user_id, business_name, craft_specialty, bio, years_of_experience, 
        region, trust_score, is_verified, verification_date
    ) VALUES
        (artisan_profile1_uuid, artisan1_uuid, 'Rajasthani Heritage Crafts', 'Bandhani and Block Printing',
         'Master craftsperson specializing in traditional Rajasthani Bandhani tie-dye and block printing techniques. Our family has been preserving these ancient arts for over four generations.',
         15, 'Rajasthan', 4.8, true, now()),
        (artisan_profile2_uuid, artisan2_uuid, 'Gujarat Wood Artistry', 'Wood Carving and Sculpture',
         'Skilled woodworker creating intricate sculptures and decorative items using traditional Gujarati carving techniques passed down through generations.',
         12, 'Gujarat', 4.9, true, now())
    ON CONFLICT (id) DO NOTHING;

    -- Products
    INSERT INTO public.products (
        id, artisan_id, category_id, title, description, price, original_price, 
        status, stock_quantity, images, tags, is_featured, materials
    ) VALUES
        (product1_uuid, artisan_profile1_uuid, category1_uuid, 
         'Royal Bandhani Dupatta', 
         'Exquisite handwoven Bandhani dupatta featuring traditional Rajasthani patterns passed down through generations. Each piece is individually crafted using ancient tie-dye techniques.',
         2850, 3200, 'active'::public.product_status, 5,
         ARRAY['https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=400&fit=crop',
               'https://images.unsplash.com/photo-1594736797933-d0401ba2fe65?w=400&h=400&fit=crop'],
         ARRAY['handwoven', 'traditional', 'eco-friendly', 'bandhani'], true,
         ARRAY['Pure Silk', 'Natural Dyes']),
        (product2_uuid, artisan_profile2_uuid, category2_uuid,
         'Ganesha Wooden Sculpture',
         'Masterfully carved Ganesha sculpture using traditional Gujarati woodworking techniques and premium teak wood. Perfect for home temples and spiritual spaces.',
         4200, null, 'active'::public.product_status, 3,
         ARRAY['https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400&h=400&fit=crop',
               'https://images.pexels.com/photos/1094767/pexels-photo-1094767.jpeg?w=400&h=400&fit=crop'],
         ARRAY['handcarved', 'spiritual', 'premium', 'teak'], true,
         ARRAY['Teak Wood', 'Natural Finish']),
        (product3_uuid, artisan_profile1_uuid, category3_uuid,
         'Hand-painted Ceramic Vase',
         'Beautiful ceramic vase featuring intricate hand-painted designs inspired by ancient Indian folklore and mythology.',
         1650, 1950, 'active'::public.product_status, 8,
         ARRAY['https://images.pexels.com/photos/1094767/pexels-photo-1094767.jpeg?w=400&h=400&fit=crop',
               'https://images.pixabay.com/photo/2017/08/01/11/48/blue-2564660_1280.jpg?w=400&h=400&fit=crop'],
         ARRAY['handpainted', 'ceramic', 'decorative', 'folklore'], false,
         ARRAY['Ceramic', 'Natural Pigments']),
        (product4_uuid, artisan_profile2_uuid, category4_uuid,
         'Silver Filigree Earrings',
         'Exquisite silver filigree earrings showcasing the delicate artistry of Bengali metalwork traditions.',
         3200, null, 'active'::public.product_status, 12,
         ARRAY['https://images.pixabay.com/photo/2017/08/01/11/48/blue-2564660_1280.jpg?w=400&h=400&fit=crop',
               'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400&h=400&fit=crop'],
         ARRAY['silver', 'filigree', 'traditional', 'bengali'], true,
         ARRAY['Sterling Silver', 'Handcrafted'])
    ON CONFLICT (id) DO NOTHING;

    -- Product Reviews
    INSERT INTO public.product_reviews (product_id, reviewer_id, rating, review_text, is_verified_purchase) VALUES
        (product1_uuid, customer1_uuid, 5, 'Absolutely stunning dupatta! The craftsmanship is exceptional and the colors are vibrant.', true),
        (product1_uuid, customer2_uuid, 4, 'Beautiful traditional work. Shipping was fast and packaging was excellent.', true),
        (product2_uuid, customer1_uuid, 5, 'This sculpture is a masterpiece! The detail work is incredible.', true),
        (product3_uuid, customer2_uuid, 4, 'Lovely vase with beautiful paintings. Perfect for my living room.', false),
        (product4_uuid, customer1_uuid, 5, 'Elegant earrings with intricate filigree work. Great quality!', true)
    ON CONFLICT (id) DO NOTHING;

EXCEPTION
    WHEN foreign_key_violation THEN
        RAISE NOTICE 'Foreign key error during mock data insertion: %', SQLERRM;
    WHEN unique_violation THEN
        RAISE NOTICE 'Unique constraint error during mock data insertion: %', SQLERRM;
    WHEN OTHERS THEN
        RAISE NOTICE 'Unexpected error during mock data insertion: %', SQLERRM;
END $$;