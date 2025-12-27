-- =============================================
-- TRIPPO PLATFORM SEED DATA
-- Development & Testing Data
-- =============================================

-- Create admin user (password: Admin@123)
INSERT INTO users (
    id, email, phone, password_hash, 
    first_name, last_name, display_name,
    phone_verified, email_verified, verification_level, trust_score
) VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'admin@trippo.com', '+1234567890',
    '$2b$10$rqHRJfJpT3vfB9UjCnLmMuOGWZzjnP5q9iMxlQqMxM3sL3Dq5lXeO',
    'Admin', 'User', 'Trippo Admin',
    TRUE, TRUE, 'premium', 100
);

-- Assign admin role
INSERT INTO user_roles (user_id, role_id)
SELECT 'a0000000-0000-0000-0000-000000000001', id FROM roles WHERE name = 'admin';

-- Create test rider (password: Rider@123)
INSERT INTO users (
    id, email, phone, password_hash,
    first_name, last_name, display_name,
    phone_verified, email_verified,
    current_location, current_address,
    wallet_balance, loyalty_points
) VALUES (
    'b0000000-0000-0000-0000-000000000001',
    'rider@test.com', '+1234567891',
    '$2b$10$dI0Qb7V5wN0HzJ0CqMmBiuAQ3OjnLpY4K8P1S2X4M5N6O7P8Q9R0',
    'Test', 'Rider', 'Test Rider',
    TRUE, TRUE,
    ST_SetSRID(ST_MakePoint(-6.8498, 33.9716), 4326),
    'Rabat, Morocco',
    100.00, 500
);

INSERT INTO user_roles (user_id, role_id)
SELECT 'b0000000-0000-0000-0000-000000000001', id FROM roles WHERE name = 'rider';

-- Create loyalty program for test rider
INSERT INTO loyalty_program (user_id, total_points, available_points, current_tier)
VALUES ('b0000000-0000-0000-0000-000000000001', 500, 500, 'bronze');

-- Create test driver (password: Driver@123)
INSERT INTO users (
    id, email, phone, password_hash,
    first_name, last_name, display_name,
    phone_verified, email_verified,
    current_location, current_address,
    trust_score
) VALUES (
    'c0000000-0000-0000-0000-000000000001',
    'driver@test.com', '+1234567892',
    '$2b$10$eJ1Rb8W6xO1IaK1DrNmCjvBR4PknMqZ5L9Q2T3Y5N6O7P8Q9R0S1',
    'Test', 'Driver', 'Test Driver',
    TRUE, TRUE,
    ST_SetSRID(ST_MakePoint(-6.8400, 33.9800), 4326),
    'Rabat, Morocco',
    85
);

INSERT INTO user_roles (user_id, role_id)
SELECT 'c0000000-0000-0000-0000-000000000001', id FROM roles WHERE name = 'driver';

-- Create driver profile
INSERT INTO driver_profiles (
    user_id, is_online, current_status,
    vehicle_type, vehicle_make, vehicle_model, vehicle_year, vehicle_color, license_plate,
    enabled_services, max_passengers,
    driver_license_number, is_verified,
    last_location, auto_accept
) VALUES (
    'c0000000-0000-0000-0000-000000000001',
    TRUE, 'available',
    'car', 'Toyota', 'Corolla', 2020, 'White', 'ABC-1234',
    ARRAY['ride', 'food', 'courier']::service_type[], 4,
    'DL123456789', TRUE,
    ST_SetSRID(ST_MakePoint(-6.8400, 33.9800), 4326),
    FALSE
);

-- Create test restaurant user (password: Restaurant@123)
INSERT INTO users (
    id, email, phone, password_hash,
    first_name, last_name, display_name,
    phone_verified, email_verified
) VALUES (
    'd0000000-0000-0000-0000-000000000001',
    'restaurant@test.com', '+1234567893',
    '$2b$10$fK2Sc9X7yP2JbL2EsOmDkwCS5QloNrA6M0R3U4Z6O7P8Q9R0S1T2',
    'Restaurant', 'Owner', 'Test Restaurant',
    TRUE, TRUE
);

INSERT INTO user_roles (user_id, role_id)
SELECT 'd0000000-0000-0000-0000-000000000001', id FROM roles WHERE name = 'restaurant';

-- Create restaurant profile
INSERT INTO restaurant_profiles (
    user_id, business_name, business_type, description,
    address, location, delivery_radius_km,
    phone, email,
    operating_hours, is_open,
    minimum_order, delivery_fee, avg_prep_time_minutes,
    cuisine_types, is_verified
) VALUES (
    'd0000000-0000-0000-0000-000000000001',
    'Test Restaurant', 'Fast Food',
    'A great place for delicious food delivered to your door!',
    '123 Main Street, Rabat, Morocco',
    ST_SetSRID(ST_MakePoint(-6.8550, 33.9700), 4326),
    10.00,
    '+1234567893', 'restaurant@test.com',
    '{"monday": ["09:00-22:00"], "tuesday": ["09:00-22:00"], "wednesday": ["09:00-22:00"], "thursday": ["09:00-22:00"], "friday": ["09:00-23:00"], "saturday": ["10:00-23:00"], "sunday": ["10:00-21:00"]}',
    TRUE,
    10.00, 2.50, 25,
    ARRAY['Fast Food', 'Burgers', 'Pizza'],
    TRUE
);

-- Get restaurant profile id for menu items
DO $$
DECLARE
    restaurant_profile_id UUID;
    category_id UUID;
BEGIN
    SELECT id INTO restaurant_profile_id FROM restaurant_profiles WHERE business_name = 'Test Restaurant';
    
    -- Create menu categories
    INSERT INTO menu_categories (id, restaurant_id, name, description, display_order)
    VALUES 
        (uuid_generate_v4(), restaurant_profile_id, 'Burgers', 'Delicious handcrafted burgers', 1),
        (uuid_generate_v4(), restaurant_profile_id, 'Pizza', 'Fresh baked Italian pizzas', 2),
        (uuid_generate_v4(), restaurant_profile_id, 'Drinks', 'Refreshing beverages', 3),
        (uuid_generate_v4(), restaurant_profile_id, 'Desserts', 'Sweet treats', 4);
    
    -- Get burgers category
    SELECT id INTO category_id FROM menu_categories WHERE restaurant_id = restaurant_profile_id AND name = 'Burgers';
    
    -- Insert burgers
    INSERT INTO menu_items (restaurant_id, category_id, name, description, price, is_halal)
    VALUES 
        (restaurant_profile_id, category_id, 'Classic Burger', 'Beef patty with lettuce, tomato, and special sauce', 8.99, TRUE),
        (restaurant_profile_id, category_id, 'Cheese Burger', 'Classic burger with melted cheddar cheese', 9.99, TRUE),
        (restaurant_profile_id, category_id, 'Double Burger', 'Two beef patties with all the toppings', 12.99, TRUE),
        (restaurant_profile_id, category_id, 'Chicken Burger', 'Grilled chicken breast with fresh vegetables', 9.49, TRUE);
    
    -- Get pizza category
    SELECT id INTO category_id FROM menu_categories WHERE restaurant_id = restaurant_profile_id AND name = 'Pizza';
    
    -- Insert pizzas
    INSERT INTO menu_items (restaurant_id, category_id, name, description, price, is_vegetarian, is_halal)
    VALUES 
        (restaurant_profile_id, category_id, 'Margherita', 'Classic tomato, mozzarella, and basil', 11.99, TRUE, TRUE),
        (restaurant_profile_id, category_id, 'Pepperoni', 'Loaded with halal pepperoni', 13.99, FALSE, TRUE),
        (restaurant_profile_id, category_id, 'Vegetarian', 'Mixed vegetables with cheese', 12.99, TRUE, TRUE),
        (restaurant_profile_id, category_id, 'BBQ Chicken', 'Grilled chicken with BBQ sauce', 14.99, FALSE, TRUE);
    
    -- Get drinks category
    SELECT id INTO category_id FROM menu_categories WHERE restaurant_id = restaurant_profile_id AND name = 'Drinks';
    
    -- Insert drinks
    INSERT INTO menu_items (restaurant_id, category_id, name, description, price, is_vegetarian, is_vegan)
    VALUES 
        (restaurant_profile_id, category_id, 'Cola', 'Classic cola drink', 2.49, TRUE, TRUE),
        (restaurant_profile_id, category_id, 'Orange Juice', 'Fresh squeezed orange juice', 3.99, TRUE, TRUE),
        (restaurant_profile_id, category_id, 'Water', 'Still mineral water', 1.49, TRUE, TRUE),
        (restaurant_profile_id, category_id, 'Lemonade', 'Homemade lemonade', 2.99, TRUE, TRUE);
END;
$$;

-- Create sample promo codes
INSERT INTO promo_codes (code, description, discount_type, discount_value, max_discount, minimum_order, applies_to, max_uses, valid_from, valid_until)
VALUES 
    ('WELCOME10', 'Welcome discount for new users', 'percentage', 10.00, 5.00, 10.00, ARRAY['ride', 'food']::service_type[], 1000, NOW(), NOW() + INTERVAL '1 year'),
    ('FREEDELIVER', 'Free delivery on your order', 'free_delivery', 0.00, NULL, 15.00, ARRAY['food']::service_type[], 500, NOW(), NOW() + INTERVAL '6 months'),
    ('RIDE5', '$5 off your next ride', 'fixed', 5.00, NULL, 10.00, ARRAY['ride']::service_type[], 200, NOW(), NOW() + INTERVAL '3 months');

-- Create sample advertisement
INSERT INTO advertisements (
    title, description, ad_type,
    image_url, click_url, display_text,
    target_languages, budget, pricing_model, price,
    start_date, status
) VALUES (
    'Download Trippo App', 
    'Get exclusive deals when you download our app!',
    'banner',
    'https://via.placeholder.com/728x90',
    'https://trippo.com/download',
    'Download now and get 20% off your first ride!',
    ARRAY['en', 'ar', 'fr'],
    1000.00, 'cpm', 2.50,
    NOW(), 'active'
);

-- Log successful seeding
DO $$
BEGIN
    RAISE NOTICE 'Seed data inserted successfully!';
    RAISE NOTICE 'Test Users Created:';
    RAISE NOTICE '  Admin: admin@trippo.com / Admin@123';
    RAISE NOTICE '  Rider: rider@test.com / Rider@123';
    RAISE NOTICE '  Driver: driver@test.com / Driver@123';
    RAISE NOTICE '  Restaurant: restaurant@test.com / Restaurant@123';
END;
$$;
