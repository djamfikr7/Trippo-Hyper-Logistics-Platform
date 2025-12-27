-- =============================================
-- TRIPPO PLATFORM DATABASE SCHEMA
-- Version: 1.0
-- PostgreSQL 15 + PostGIS
-- =============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- =============================================
-- ENUM TYPES
-- =============================================

CREATE TYPE user_gender AS ENUM ('male', 'female', 'other', 'prefer_not_say');
CREATE TYPE user_role AS ENUM ('rider', 'driver', 'restaurant', 'merchant', 'admin', 'support');
CREATE TYPE verification_level AS ENUM ('unverified', 'basic', 'full', 'premium');
CREATE TYPE trust_tier AS ENUM ('restricted', 'bronze', 'silver', 'gold', 'platinum');
CREATE TYPE loyalty_tier AS ENUM ('basic', 'bronze', 'silver', 'gold', 'platinum');

CREATE TYPE vehicle_type AS ENUM ('bicycle', 'motorcycle', 'scooter', 'car', 'van', 'truck_small', 'truck_medium', 'truck_large');
CREATE TYPE driver_status AS ENUM ('offline', 'available', 'busy', 'in_ride', 'on_delivery', 'break');

CREATE TYPE service_type AS ENUM ('ride', 'food', 'freight', 'rescue', 'fix', 'money', 'courier');
CREATE TYPE request_status AS ENUM ('pending', 'searching', 'driver_assigned', 'accepted', 'arrived', 'started', 'in_progress', 'completed', 'cancelled', 'rejected', 'expired', 'disputed');
CREATE TYPE payment_method AS ENUM ('cash', 'card', 'wallet', 'corporate');
CREATE TYPE payment_status AS ENUM ('pending', 'authorized', 'paid', 'failed', 'refunded', 'partially_refunded');

CREATE TYPE notification_type AS ENUM ('push', 'sms', 'email', 'in_app');
CREATE TYPE ad_type AS ENUM ('banner', 'interstitial', 'video', 'native', 'notification');
CREATE TYPE pricing_model AS ENUM ('cpm', 'cpc', 'cpa');

CREATE TYPE fraud_anomaly_type AS ENUM ('gps_off', 'jump_detected', 'speed_exceeded', 'altitude_change', 'signal_loss', 'mock_location');
CREATE TYPE money_delivery_status AS ENUM ('pending', 'collected', 'in_transit', 'delivered', 'cancelled', 'disputed');

-- =============================================
-- CORE TABLES
-- =============================================

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Authentication
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    phone_verified BOOLEAN DEFAULT FALSE,
    email_verified BOOLEAN DEFAULT FALSE,
    
    -- Personal Information
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    display_name VARCHAR(100),
    gender user_gender,
    date_of_birth DATE,
    profile_image_url TEXT,
    cover_image_url TEXT,
    
    -- Language Preferences
    language_code VARCHAR(10) DEFAULT 'en',
    supported_languages VARCHAR(10)[] DEFAULT '{en}',
    
    -- Location (using PostGIS)
    current_location GEOMETRY(Point, 4326),
    current_address TEXT,
    home_address JSONB,
    work_address JSONB,
    
    -- Verification & Trust
    verification_level verification_level DEFAULT 'unverified',
    trust_score INTEGER DEFAULT 100 CHECK (trust_score BETWEEN 0 AND 100),
    trust_tier trust_tier DEFAULT 'bronze',
    is_blacklisted BOOLEAN DEFAULT FALSE,
    blacklist_reason TEXT,
    
    -- Financial
    wallet_balance DECIMAL(12, 2) DEFAULT 0.00,
    total_earnings DECIMAL(12, 2) DEFAULT 0.00,
    total_spent DECIMAL(12, 2) DEFAULT 0.00,
    currency VARCHAR(3) DEFAULT 'USD',
    
    -- Loyalty
    loyalty_points INTEGER DEFAULT 0,
    loyalty_tier loyalty_tier DEFAULT 'basic',
    referral_code VARCHAR(20) UNIQUE,
    referred_by UUID REFERENCES users(id),
    
    -- Settings
    notification_preferences JSONB DEFAULT '{"push": true, "email": true, "sms": false}',
    privacy_settings JSONB DEFAULT '{"share_location": true, "show_profile": true}',
    app_settings JSONB DEFAULT '{}',
    
    -- Statistics
    total_trips INTEGER DEFAULT 0,
    total_orders INTEGER DEFAULT 0,
    total_deliveries INTEGER DEFAULT 0,
    avg_rating DECIMAL(3, 2) DEFAULT 5.00 CHECK (avg_rating BETWEEN 0 AND 5),
    
    -- Security
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    two_factor_method VARCHAR(20),
    last_login TIMESTAMP WITH TIME ZONE,
    failed_login_attempts INTEGER DEFAULT 0,
    account_locked_until TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- User Roles (RBAC)
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    permissions JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE user_roles (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
    granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    granted_by UUID REFERENCES users(id),
    PRIMARY KEY (user_id, role_id)
);

-- User Sessions
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    refresh_token VARCHAR(500) NOT NULL,
    device_info JSONB,
    ip_address INET,
    user_agent TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Driver Profiles
CREATE TABLE driver_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    
    -- Driver Status
    is_online BOOLEAN DEFAULT FALSE,
    current_status driver_status DEFAULT 'offline',
    last_online TIMESTAMP WITH TIME ZONE,
    
    -- Vehicle Information
    vehicle_type vehicle_type NOT NULL,
    vehicle_make VARCHAR(100),
    vehicle_model VARCHAR(100),
    vehicle_year INTEGER CHECK (vehicle_year > 1900 AND vehicle_year <= EXTRACT(YEAR FROM NOW()) + 1),
    vehicle_color VARCHAR(50),
    license_plate VARCHAR(50) UNIQUE,
    vehicle_image_urls TEXT[],
    
    -- Service Capabilities
    enabled_services service_type[] DEFAULT '{ride}',
    
    -- Special Permissions
    can_do_money_delivery BOOLEAN DEFAULT FALSE,
    money_delivery_verified BOOLEAN DEFAULT FALSE,
    can_do_long_trips BOOLEAN DEFAULT FALSE,
    can_do_female_only BOOLEAN DEFAULT FALSE,
    
    -- Capacity
    max_passengers INTEGER DEFAULT 4 CHECK (max_passengers > 0),
    max_weight_kg DECIMAL(10, 2),
    vehicle_features TEXT[],
    
    -- Documents
    driver_license_number VARCHAR(100),
    driver_license_expiry DATE,
    license_image_url TEXT,
    insurance_url TEXT,
    registration_url TEXT,
    
    -- Work Preferences
    work_schedule JSONB,
    preferred_areas TEXT[],
    avoid_areas TEXT[],
    minimum_fare DECIMAL(10, 2) DEFAULT 0.00,
    
    -- Earnings
    today_earnings DECIMAL(10, 2) DEFAULT 0.00,
    weekly_earnings DECIMAL(10, 2) DEFAULT 0.00,
    monthly_earnings DECIMAL(10, 2) DEFAULT 0.00,
    total_earnings DECIMAL(12, 2) DEFAULT 0.00,
    commission_rate DECIMAL(5, 2) DEFAULT 15.00 CHECK (commission_rate BETWEEN 0 AND 100),
    
    -- Statistics
    total_trips INTEGER DEFAULT 0,
    total_rides INTEGER DEFAULT 0,
    total_deliveries INTEGER DEFAULT 0,
    acceptance_rate DECIMAL(5, 2) DEFAULT 100.00 CHECK (acceptance_rate BETWEEN 0 AND 100),
    cancellation_rate DECIMAL(5, 2) DEFAULT 0.00 CHECK (cancellation_rate BETWEEN 0 AND 100),
    avg_rating DECIMAL(3, 2) DEFAULT 5.00 CHECK (avg_rating BETWEEN 0 AND 5),
    
    -- Verification
    is_verified BOOLEAN DEFAULT FALSE,
    verified_at TIMESTAMP WITH TIME ZONE,
    
    -- Settings
    auto_accept BOOLEAN DEFAULT FALSE,
    accept_shared_rides BOOLEAN DEFAULT TRUE,
    accept_scheduled_rides BOOLEAN DEFAULT TRUE,
    
    -- Location Tracking
    last_location GEOMETRY(Point, 4326),
    last_location_time TIMESTAMP WITH TIME ZONE,
    location_history_enabled BOOLEAN DEFAULT TRUE,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- SERVICE REQUEST TABLES
-- =============================================

-- Main Service Requests Table
CREATE TABLE service_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_number VARCHAR(50) UNIQUE NOT NULL,
    
    -- Service Type
    service_type service_type NOT NULL,
    service_subtype VARCHAR(50),
    
    -- Users
    customer_id UUID REFERENCES users(id) NOT NULL,
    driver_id UUID REFERENCES users(id),
    dispatcher_id UUID REFERENCES users(id),
    
    -- Locations (PostGIS)
    pickup_location GEOMETRY(Point, 4326) NOT NULL,
    pickup_address TEXT NOT NULL,
    pickup_instructions TEXT,
    dropoff_location GEOMETRY(Point, 4326),
    dropoff_address TEXT,
    dropoff_instructions TEXT,
    
    -- For multiple stops
    waypoints JSONB[],
    
    -- Service Details
    details JSONB NOT NULL DEFAULT '{}',
    
    -- Pricing
    estimated_price DECIMAL(10, 2) NOT NULL,
    final_price DECIMAL(10, 2),
    price_breakdown JSONB,
    surge_multiplier DECIMAL(4, 2) DEFAULT 1.00,
    discount_amount DECIMAL(10, 2) DEFAULT 0.00,
    discount_code VARCHAR(50),
    
    -- Payment
    payment_method payment_method DEFAULT 'cash',
    payment_status payment_status DEFAULT 'pending',
    transaction_id VARCHAR(100),
    
    -- Status Tracking
    status request_status NOT NULL DEFAULT 'pending',
    status_history JSONB[] DEFAULT ARRAY[]::JSONB[],
    
    -- Timing
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    scheduled_for TIMESTAMP WITH TIME ZONE,
    accepted_at TIMESTAMP WITH TIME ZONE,
    arrived_at TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    
    -- Cancellation
    cancelled_by VARCHAR(20),
    cancellation_reason VARCHAR(255),
    cancellation_fee DECIMAL(10, 2) DEFAULT 0.00,
    
    -- Ratings
    customer_rating INTEGER CHECK (customer_rating BETWEEN 1 AND 5),
    customer_review TEXT,
    driver_rating INTEGER CHECK (driver_rating BETWEEN 1 AND 5),
    driver_review TEXT,
    
    -- Route Information
    route_polyline TEXT,
    distance_km DECIMAL(8, 2),
    duration_minutes INTEGER,
    traffic_delay_minutes INTEGER DEFAULT 0,
    
    -- Fraud Detection
    fraud_score DECIMAL(5, 2) DEFAULT 0.00,
    fraud_flags TEXT[] DEFAULT ARRAY[]::TEXT[],
    integrity_checked BOOLEAN DEFAULT FALSE,
    
    -- Negotiation (for long trips)
    is_negotiable BOOLEAN DEFAULT FALSE,
    negotiated_price DECIMAL(10, 2),
    negotiation_history JSONB[],
    
    -- Ads
    ad_shown BOOLEAN DEFAULT FALSE,
    ad_revenue DECIMAL(10, 2) DEFAULT 0.00,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Food Orders
CREATE TABLE food_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id UUID UNIQUE REFERENCES service_requests(id) ON DELETE CASCADE,
    restaurant_id UUID REFERENCES users(id) NOT NULL,
    
    -- Order Details
    items JSONB NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL,
    tax DECIMAL(10, 2) DEFAULT 0.00,
    delivery_fee DECIMAL(10, 2) NOT NULL,
    tip DECIMAL(10, 2) DEFAULT 0.00,
    total DECIMAL(10, 2) NOT NULL,
    
    -- Preparation Status
    restaurant_status VARCHAR(20) DEFAULT 'received' CHECK (
        restaurant_status IN ('received', 'preparing', 'ready', 'delayed', 'cancelled')
    ),
    estimated_prep_time INTEGER,
    ready_at TIMESTAMP WITH TIME ZONE,
    
    -- Special Instructions
    customer_instructions TEXT,
    restaurant_instructions TEXT,
    packaging_requirements TEXT[],
    
    -- Ratings
    food_rating INTEGER CHECK (food_rating BETWEEN 1 AND 5),
    food_review TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Money Deliveries
CREATE TABLE money_deliveries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id UUID UNIQUE REFERENCES service_requests(id) ON DELETE CASCADE,
    
    -- Money Details
    amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) DEFAULT 'USD',
    purpose VARCHAR(100),
    
    -- Security
    security_code VARCHAR(10) NOT NULL,
    security_code_expiry TIMESTAMP WITH TIME ZONE,
    recipient_phone VARCHAR(20) NOT NULL,
    recipient_name VARCHAR(100),
    recipient_id_type VARCHAR(50),
    recipient_id_number VARCHAR(100),
    
    -- Verification
    sender_verified BOOLEAN DEFAULT FALSE,
    recipient_verified BOOLEAN DEFAULT FALSE,
    verification_method VARCHAR(50),
    
    -- Fees
    transfer_fee DECIMAL(10, 2) NOT NULL,
    platform_fee DECIMAL(10, 2) NOT NULL,
    insurance_fee DECIMAL(10, 2) DEFAULT 0.00,
    
    -- Status
    money_status money_delivery_status DEFAULT 'pending',
    
    -- Audit Trail
    collected_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    collected_signature_url TEXT,
    delivered_signature_url TEXT,
    
    -- Security Logs
    verification_attempts INTEGER DEFAULT 0,
    last_verification_attempt TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Negotiations (For Long Trips)
CREATE TABLE negotiations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id UUID REFERENCES service_requests(id) NOT NULL,
    
    -- Parties
    initiator_id UUID REFERENCES users(id) NOT NULL,
    responder_id UUID REFERENCES users(id) NOT NULL,
    
    -- Negotiation Details
    initial_price DECIMAL(10, 2) NOT NULL,
    counter_price DECIMAL(10, 2),
    final_price DECIMAL(10, 2),
    
    -- Terms
    proposed_terms JSONB,
    accepted_terms JSONB,
    
    -- Status
    status VARCHAR(20) DEFAULT 'pending' CHECK (
        status IN ('pending', 'countered', 'accepted', 'rejected', 'expired')
    ),
    
    -- Communication
    messages JSONB[],
    expires_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- LOYALTY & REWARDS TABLES
-- =============================================

-- Loyalty Program
CREATE TABLE loyalty_program (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    
    -- Points
    total_points INTEGER DEFAULT 0,
    available_points INTEGER DEFAULT 0,
    used_points INTEGER DEFAULT 0,
    expired_points INTEGER DEFAULT 0,
    
    -- Tiers
    current_tier loyalty_tier DEFAULT 'bronze',
    tier_points INTEGER DEFAULT 0,
    next_tier_points INTEGER,
    
    -- Rewards
    unlocked_rewards UUID[],
    pending_rewards JSONB[],
    
    -- Statistics
    rides_this_month INTEGER DEFAULT 0,
    deliveries_this_month INTEGER DEFAULT 0,
    money_spent_this_month DECIMAL(10, 2) DEFAULT 0.00,
    
    -- Referrals
    total_referrals INTEGER DEFAULT 0,
    successful_referrals INTEGER DEFAULT 0,
    referral_earnings DECIMAL(10, 2) DEFAULT 0.00,
    
    -- Streaks
    login_streak INTEGER DEFAULT 0,
    last_login_date DATE,
    ride_streak INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    tier_updated_at TIMESTAMP WITH TIME ZONE
);

-- Loyalty Rewards Catalog
CREATE TABLE loyalty_rewards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    
    -- Cost
    points_cost INTEGER NOT NULL,
    tier_required loyalty_tier DEFAULT 'bronze',
    
    -- Reward Details
    reward_type VARCHAR(30) NOT NULL CHECK (
        reward_type IN ('discount', 'free_ride', 'cashback', 'product', 'vip_access', 'subscription', 'upgrade')
    ),
    reward_value DECIMAL(10, 2),
    reward_details JSONB,
    
    -- Availability
    is_active BOOLEAN DEFAULT TRUE,
    stock_quantity INTEGER,
    claim_limit_per_user INTEGER DEFAULT 1,
    
    -- Timing
    valid_from DATE,
    valid_until DATE,
    
    -- Redemption
    redemption_code VARCHAR(50),
    redemption_instructions TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Points Transactions
CREATE TABLE loyalty_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    
    -- Transaction
    points INTEGER NOT NULL,
    transaction_type VARCHAR(20) NOT NULL CHECK (
        transaction_type IN ('earned', 'spent', 'expired', 'bonus', 'refund')
    ),
    
    -- Reference
    reference_type VARCHAR(50),
    reference_id UUID,
    description TEXT,
    
    -- Balance
    balance_after INTEGER NOT NULL,
    
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- ADVERTISEMENT TABLES
-- =============================================

-- Advertisements
CREATE TABLE advertisements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Ad Details
    title VARCHAR(200) NOT NULL,
    description TEXT,
    ad_type ad_type NOT NULL,
    
    -- Content
    image_url TEXT,
    video_url TEXT,
    click_url TEXT NOT NULL,
    display_text TEXT,
    
    -- Targeting
    target_audience JSONB DEFAULT '{}',
    target_languages VARCHAR(10)[] DEFAULT '{en}',
    target_devices VARCHAR(20)[],
    min_user_tier loyalty_tier,
    
    -- Budget & Pricing
    budget DECIMAL(10, 2) NOT NULL,
    spent DECIMAL(10, 2) DEFAULT 0.00,
    pricing_model pricing_model DEFAULT 'cpm',
    price DECIMAL(10, 4) NOT NULL,
    
    -- Limits
    daily_budget DECIMAL(10, 2),
    max_impressions INTEGER,
    max_clicks INTEGER,
    
    -- Scheduling
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE,
    display_times JSONB,
    
    -- Performance
    total_impressions INTEGER DEFAULT 0,
    total_clicks INTEGER DEFAULT 0,
    total_conversions INTEGER DEFAULT 0,
    ctr DECIMAL(5, 2) DEFAULT 0.00,
    
    -- Status
    status VARCHAR(20) DEFAULT 'pending' CHECK (
        status IN ('pending', 'active', 'paused', 'completed', 'cancelled')
    ),
    
    -- Advertiser
    advertiser_id UUID REFERENCES users(id),
    advertiser_name VARCHAR(100),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ad Events (Impressions, Clicks, Conversions)
CREATE TABLE ad_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ad_id UUID REFERENCES advertisements(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES users(id),
    
    event_type VARCHAR(20) NOT NULL CHECK (event_type IN ('impression', 'click', 'conversion')),
    event_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Context
    app_screen VARCHAR(100),
    device_info JSONB,
    location JSONB,
    
    -- Revenue
    revenue_earned DECIMAL(10, 4) DEFAULT 0.00
);

-- =============================================
-- FRAUD DETECTION TABLES
-- =============================================

-- GPS Anomalies
CREATE TABLE gps_anomalies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) NOT NULL,
    request_id UUID REFERENCES service_requests(id),
    
    -- Anomaly Details
    anomaly_type fraud_anomaly_type NOT NULL,
    
    -- GPS Data
    expected_location GEOMETRY(Point, 4326),
    actual_location GEOMETRY(Point, 4326),
    distance_diff_meters DECIMAL(10, 2),
    time_diff_seconds INTEGER,
    
    -- Device Info
    device_id VARCHAR(100),
    gps_provider VARCHAR(50),
    location_accuracy DECIMAL(10, 2),
    
    -- Detection
    confidence_score DECIMAL(5, 2) DEFAULT 0.00 CHECK (confidence_score BETWEEN 0 AND 100),
    detection_method VARCHAR(50),
    is_confirmed_fraud BOOLEAN DEFAULT FALSE,
    
    -- Actions Taken
    auto_actions TEXT[],
    manual_review_status VARCHAR(20) DEFAULT 'pending',
    reviewer_notes TEXT,
    reviewed_by UUID REFERENCES users(id),
    
    -- Timing
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- Trust Score History
CREATE TABLE trust_score_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    
    previous_score INTEGER NOT NULL,
    new_score INTEGER NOT NULL,
    change_reason VARCHAR(255) NOT NULL,
    reference_type VARCHAR(50),
    reference_id UUID,
    
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    changed_by UUID REFERENCES users(id)
);

-- =============================================
-- CHAT & NOTIFICATIONS
-- =============================================

-- Chat Conversations
CREATE TABLE chat_conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id UUID REFERENCES service_requests(id),
    
    participants UUID[] NOT NULL,
    conversation_type VARCHAR(20) DEFAULT 'trip' CHECK (
        conversation_type IN ('trip', 'support', 'group', 'direct')
    ),
    
    last_message_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chat Messages
CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID REFERENCES chat_conversations(id) ON DELETE CASCADE NOT NULL,
    sender_id UUID REFERENCES users(id) NOT NULL,
    
    message_type VARCHAR(20) DEFAULT 'text' CHECK (
        message_type IN ('text', 'image', 'audio', 'location', 'system')
    ),
    content TEXT NOT NULL,
    media_url TEXT,
    
    -- Read receipts
    read_by UUID[] DEFAULT ARRAY[]::UUID[],
    
    -- Fraud detection
    flagged_for_review BOOLEAN DEFAULT FALSE,
    flag_reason TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notifications
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    
    notification_type notification_type NOT NULL,
    title VARCHAR(200) NOT NULL,
    body TEXT NOT NULL,
    data JSONB,
    
    -- Delivery
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    read_at TIMESTAMP WITH TIME ZONE,
    
    -- Status
    is_read BOOLEAN DEFAULT FALSE,
    is_archived BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- WALLET & TRANSACTIONS
-- =============================================

-- Wallet Transactions
CREATE TABLE wallet_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    
    transaction_type VARCHAR(20) NOT NULL CHECK (
        transaction_type IN ('credit', 'debit', 'hold', 'release', 'refund')
    ),
    
    amount DECIMAL(12, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    
    -- Reference
    reference_type VARCHAR(50),
    reference_id UUID,
    description TEXT,
    
    -- Balance
    balance_before DECIMAL(12, 2) NOT NULL,
    balance_after DECIMAL(12, 2) NOT NULL,
    
    -- Status
    status VARCHAR(20) DEFAULT 'completed' CHECK (
        status IN ('pending', 'completed', 'failed', 'reversed')
    ),
    
    -- External references
    external_transaction_id VARCHAR(100),
    payment_gateway VARCHAR(50),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payment Methods
CREATE TABLE payment_methods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    
    method_type VARCHAR(20) NOT NULL CHECK (
        method_type IN ('card', 'bank_account', 'mobile_money', 'crypto')
    ),
    
    -- Card Details (encrypted/tokenized)
    card_last_four VARCHAR(4),
    card_brand VARCHAR(20),
    card_expiry_month INTEGER,
    card_expiry_year INTEGER,
    
    -- Bank Details
    bank_name VARCHAR(100),
    account_last_four VARCHAR(4),
    
    -- Token
    gateway_token VARCHAR(255),
    gateway VARCHAR(50),
    
    -- Status
    is_default BOOLEAN DEFAULT FALSE,
    is_verified BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- RESTAURANT & MERCHANT TABLES
-- =============================================

-- Restaurant Profiles
CREATE TABLE restaurant_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    
    -- Business Info
    business_name VARCHAR(200) NOT NULL,
    business_type VARCHAR(50),
    description TEXT,
    logo_url TEXT,
    cover_image_url TEXT,
    
    -- Location
    address TEXT NOT NULL,
    location GEOMETRY(Point, 4326) NOT NULL,
    delivery_radius_km DECIMAL(5, 2) DEFAULT 5.00,
    
    -- Contact
    phone VARCHAR(20),
    email VARCHAR(255),
    website VARCHAR(255),
    
    -- Hours
    operating_hours JSONB,
    is_open BOOLEAN DEFAULT FALSE,
    
    -- Pricing
    minimum_order DECIMAL(10, 2) DEFAULT 0.00,
    delivery_fee DECIMAL(10, 2) DEFAULT 0.00,
    avg_prep_time_minutes INTEGER DEFAULT 30,
    
    -- Categories & Tags
    cuisine_types TEXT[],
    tags TEXT[],
    
    -- Ratings
    avg_rating DECIMAL(3, 2) DEFAULT 5.00,
    total_reviews INTEGER DEFAULT 0,
    total_orders INTEGER DEFAULT 0,
    
    -- Status
    is_verified BOOLEAN DEFAULT FALSE,
    is_featured BOOLEAN DEFAULT FALSE,
    commission_rate DECIMAL(5, 2) DEFAULT 20.00,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Menu Categories
CREATE TABLE menu_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID REFERENCES restaurant_profiles(id) ON DELETE CASCADE NOT NULL,
    
    name VARCHAR(100) NOT NULL,
    description TEXT,
    image_url TEXT,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Menu Items
CREATE TABLE menu_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID REFERENCES restaurant_profiles(id) ON DELETE CASCADE NOT NULL,
    category_id UUID REFERENCES menu_categories(id) ON DELETE SET NULL,
    
    name VARCHAR(200) NOT NULL,
    description TEXT,
    image_url TEXT,
    
    -- Pricing
    price DECIMAL(10, 2) NOT NULL,
    discounted_price DECIMAL(10, 2),
    
    -- Options
    options JSONB,
    addons JSONB,
    
    -- Dietary Info
    is_vegetarian BOOLEAN DEFAULT FALSE,
    is_vegan BOOLEAN DEFAULT FALSE,
    is_halal BOOLEAN DEFAULT FALSE,
    allergens TEXT[],
    
    -- Availability
    is_available BOOLEAN DEFAULT TRUE,
    available_from TIME,
    available_until TIME,
    preparation_time INTEGER,
    
    -- Stats
    total_orders INTEGER DEFAULT 0,
    avg_rating DECIMAL(3, 2),
    
    display_order INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- PRICING TABLES
-- =============================================

-- Pricing Rules
CREATE TABLE pricing_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    service_type service_type NOT NULL,
    vehicle_type vehicle_type,
    
    -- Base Pricing
    base_fare DECIMAL(10, 2) NOT NULL,
    per_km_rate DECIMAL(10, 2) NOT NULL,
    per_minute_rate DECIMAL(10, 2) NOT NULL,
    minimum_fare DECIMAL(10, 2) NOT NULL,
    
    -- Surge Pricing
    surge_enabled BOOLEAN DEFAULT TRUE,
    max_surge_multiplier DECIMAL(4, 2) DEFAULT 3.00,
    
    -- Time-based Pricing
    peak_hours JSONB,
    peak_multiplier DECIMAL(4, 2) DEFAULT 1.5,
    
    -- Geographic
    applicable_zones TEXT[],
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Promo Codes
CREATE TABLE promo_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    
    -- Discount
    discount_type VARCHAR(20) NOT NULL CHECK (
        discount_type IN ('percentage', 'fixed', 'free_delivery')
    ),
    discount_value DECIMAL(10, 2) NOT NULL,
    max_discount DECIMAL(10, 2),
    minimum_order DECIMAL(10, 2) DEFAULT 0.00,
    
    -- Applicability
    applies_to service_type[],
    user_tier_required loyalty_tier,
    first_order_only BOOLEAN DEFAULT FALSE,
    
    -- Usage Limits
    max_uses INTEGER,
    max_uses_per_user INTEGER DEFAULT 1,
    current_uses INTEGER DEFAULT 0,
    
    -- Validity
    valid_from TIMESTAMP WITH TIME ZONE NOT NULL,
    valid_until TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- INDEXES
-- =============================================

-- Users indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_referral_code ON users(referral_code);
CREATE INDEX idx_users_trust_score ON users(trust_score DESC);
CREATE INDEX idx_users_location ON users USING GIST(current_location);
CREATE INDEX idx_users_created_at ON users(created_at DESC);

-- Driver indexes
CREATE INDEX idx_driver_user_id ON driver_profiles(user_id);
CREATE INDEX idx_driver_status ON driver_profiles(current_status) WHERE is_online = TRUE;
CREATE INDEX idx_driver_location ON driver_profiles USING GIST(last_location);
CREATE INDEX idx_driver_services ON driver_profiles USING GIN(enabled_services);
CREATE INDEX idx_driver_vehicle_type ON driver_profiles(vehicle_type);

-- Service requests indexes
CREATE INDEX idx_request_customer ON service_requests(customer_id);
CREATE INDEX idx_request_driver ON service_requests(driver_id);
CREATE INDEX idx_request_status ON service_requests(status);
CREATE INDEX idx_request_type ON service_requests(service_type);
CREATE INDEX idx_request_created ON service_requests(created_at DESC);
CREATE INDEX idx_request_pickup ON service_requests USING GIST(pickup_location);
CREATE INDEX idx_request_dropoff ON service_requests USING GIST(dropoff_location);

-- Loyalty indexes
CREATE INDEX idx_loyalty_user ON loyalty_program(user_id);
CREATE INDEX idx_loyalty_tier ON loyalty_program(current_tier);
CREATE INDEX idx_loyalty_tx_user ON loyalty_transactions(user_id);

-- Advertisement indexes
CREATE INDEX idx_ads_status ON advertisements(status);
CREATE INDEX idx_ads_dates ON advertisements(start_date, end_date);
CREATE INDEX idx_ad_events_ad ON ad_events(ad_id);
CREATE INDEX idx_ad_events_time ON ad_events(event_time DESC);

-- Fraud indexes
CREATE INDEX idx_gps_anomalies_user ON gps_anomalies(user_id);
CREATE INDEX idx_gps_anomalies_type ON gps_anomalies(anomaly_type);
CREATE INDEX idx_gps_anomalies_time ON gps_anomalies(detected_at DESC);

-- Chat indexes
CREATE INDEX idx_chat_participants ON chat_conversations USING GIN(participants);
CREATE INDEX idx_chat_request ON chat_conversations(request_id);
CREATE INDEX idx_messages_conversation ON chat_messages(conversation_id);
CREATE INDEX idx_messages_created ON chat_messages(created_at DESC);

-- Notification indexes
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id) WHERE is_read = FALSE;

-- Restaurant indexes
CREATE INDEX idx_restaurant_location ON restaurant_profiles USING GIST(location);
CREATE INDEX idx_restaurant_open ON restaurant_profiles(is_open) WHERE is_open = TRUE;
CREATE INDEX idx_menu_restaurant ON menu_items(restaurant_id);

-- =============================================
-- FUNCTIONS & TRIGGERS
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all tables
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        AND table_name NOT IN ('spatial_ref_sys')
    LOOP
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = t AND column_name = 'updated_at'
        ) THEN
            EXECUTE format('
                DROP TRIGGER IF EXISTS trigger_update_%I ON %I;
                CREATE TRIGGER trigger_update_%I
                BEFORE UPDATE ON %I
                FOR EACH ROW
                EXECUTE FUNCTION update_updated_at_column();
            ', t, t, t, t);
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to update trust tier based on trust score
CREATE OR REPLACE FUNCTION update_trust_tier()
RETURNS TRIGGER AS $$
BEGIN
    NEW.trust_tier = CASE
        WHEN NEW.trust_score >= 90 THEN 'platinum'::trust_tier
        WHEN NEW.trust_score >= 75 THEN 'gold'::trust_tier
        WHEN NEW.trust_score >= 60 THEN 'silver'::trust_tier
        WHEN NEW.trust_score >= 40 THEN 'bronze'::trust_tier
        ELSE 'restricted'::trust_tier
    END;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_trust_tier
BEFORE INSERT OR UPDATE OF trust_score ON users
FOR EACH ROW
EXECUTE FUNCTION update_trust_tier();

-- Function to update loyalty tier based on points
CREATE OR REPLACE FUNCTION update_loyalty_tier()
RETURNS TRIGGER AS $$
BEGIN
    NEW.current_tier = CASE
        WHEN NEW.total_points >= 20000 THEN 'platinum'::loyalty_tier
        WHEN NEW.total_points >= 5000 THEN 'gold'::loyalty_tier
        WHEN NEW.total_points >= 1000 THEN 'silver'::loyalty_tier
        WHEN NEW.total_points >= 100 THEN 'bronze'::loyalty_tier
        ELSE 'basic'::loyalty_tier
    END;
    
    NEW.next_tier_points = CASE
        WHEN NEW.total_points >= 20000 THEN NULL
        WHEN NEW.total_points >= 5000 THEN 20000
        WHEN NEW.total_points >= 1000 THEN 5000
        WHEN NEW.total_points >= 100 THEN 1000
        ELSE 100
    END;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_loyalty_tier
BEFORE INSERT OR UPDATE OF total_points ON loyalty_program
FOR EACH ROW
EXECUTE FUNCTION update_loyalty_tier();

-- Function to generate request number
CREATE OR REPLACE FUNCTION generate_request_number()
RETURNS TRIGGER AS $$
BEGIN
    NEW.request_number = 'TR' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || 
                         UPPER(SUBSTRING(NEW.id::TEXT FROM 1 FOR 8));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_request_number
BEFORE INSERT ON service_requests
FOR EACH ROW
EXECUTE FUNCTION generate_request_number();

-- Function to generate referral code
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.referral_code IS NULL THEN
        NEW.referral_code = UPPER(
            SUBSTRING(NEW.first_name FROM 1 FOR 3) || 
            SUBSTRING(MD5(NEW.id::TEXT || NOW()::TEXT) FROM 1 FOR 5)
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_referral_code
BEFORE INSERT ON users
FOR EACH ROW
EXECUTE FUNCTION generate_referral_code();

-- =============================================
-- INITIAL DATA
-- =============================================

-- Insert default roles
INSERT INTO roles (name, description, permissions) VALUES
('rider', 'Regular rider/customer', '{"can_book": true, "can_rate": true}'),
('driver', 'Driver/delivery partner', '{"can_accept_rides": true, "can_deliver": true}'),
('restaurant', 'Restaurant owner', '{"can_manage_menu": true, "can_accept_orders": true}'),
('merchant', 'Merchant/shop owner', '{"can_list_products": true}'),
('admin', 'System administrator', '{"all": true}'),
('support', 'Customer support', '{"can_view_users": true, "can_resolve_issues": true}');

-- Insert default pricing rules
INSERT INTO pricing_rules (service_type, vehicle_type, base_fare, per_km_rate, per_minute_rate, minimum_fare) VALUES
('ride', 'car', 2.50, 1.50, 0.25, 5.00),
('ride', 'motorcycle', 1.50, 1.00, 0.15, 3.00),
('ride', 'scooter', 1.00, 0.75, 0.10, 2.50),
('ride', 'van', 5.00, 2.50, 0.40, 10.00),
('food', NULL, 1.00, 0.50, 0.10, 2.00),
('freight', 'motorcycle', 3.00, 1.50, 0.20, 5.00),
('freight', 'van', 10.00, 3.00, 0.50, 15.00),
('freight', 'truck_small', 15.00, 4.00, 0.60, 25.00),
('freight', 'truck_medium', 25.00, 5.00, 0.80, 40.00),
('freight', 'truck_large', 40.00, 7.00, 1.00, 60.00),
('rescue', NULL, 20.00, 2.00, 0.50, 30.00),
('fix', NULL, 15.00, 1.00, 0.50, 25.00),
('money', NULL, 5.00, 0.50, 0.10, 10.00),
('courier', 'motorcycle', 2.00, 1.00, 0.15, 4.00),
('courier', 'car', 3.00, 1.25, 0.20, 6.00);

-- Insert default loyalty rewards
INSERT INTO loyalty_rewards (name, description, points_cost, tier_required, reward_type, reward_value) VALUES
('Free Ride $5', 'Get $5 off your next ride', 500, 'bronze', 'discount', 5.00),
('Free Ride $10', 'Get $10 off your next ride', 900, 'silver', 'discount', 10.00),
('Free Delivery', 'Free delivery on your next order', 300, 'bronze', 'free_ride', 0.00),
('Priority Support', 'Jump to the front of support queue', 300, 'silver', 'vip_access', NULL),
('Double Points Day', 'Earn 2x points for 24 hours', 1000, 'gold', 'bonus', 2.00),
('Premium Upgrade', 'Upgrade to premium vehicle at standard price', 2000, 'platinum', 'upgrade', NULL),
('5% Cashback', 'Get 5% cashback on your next 5 trips', 750, 'silver', 'cashback', 5.00),
('10% Cashback', 'Get 10% cashback on your next 3 trips', 1500, 'gold', 'cashback', 10.00);

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO trippo;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO trippo;
