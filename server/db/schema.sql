-- AgriConnect database schema (PostgreSQL)
--
-- Idempotent: safe to run repeatedly against an existing database. New columns
-- are added with ADD COLUMN IF NOT EXISTS so older databases upgrade in place
-- without losing data.

DO $$ BEGIN CREATE TYPE user_role AS ENUM ('farmer', 'buyer', 'admin'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE irrigation_access AS ENUM ('none', 'rainfed', 'canal', 'borewell', 'drip', 'sprinkler'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE crop_cycle_status AS ENUM ('planned', 'sown', 'growing', 'harvested', 'failed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE listing_status AS ENUM ('active', 'sold_out', 'closed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE order_status AS ENUM ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE report_severity AS ENUM ('low', 'medium', 'high', 'critical'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE report_status AS ENUM ('open', 'in_progress', 'resolved', 'rejected'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(160) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'farmer',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
-- Opt-in SMS / voice alert preferences
ALTER TABLE users ADD COLUMN IF NOT EXISTS sms_alerts BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS voice_alerts BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS farm_profiles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    location VARCHAR(200) NOT NULL,
    latitude NUMERIC(9,6),
    longitude NUMERIC(9,6),
    soil_type VARCHAR(80),
    irrigation_access irrigation_access NOT NULL DEFAULT 'rainfed',
    land_size NUMERIC(10,2), -- in acres
    preferred_crops TEXT[],
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS plots (
    id SERIAL PRIMARY KEY,
    farm_profile_id INTEGER NOT NULL REFERENCES farm_profiles(id) ON DELETE CASCADE,
    name VARCHAR(120) NOT NULL,
    area NUMERIC(10,2), -- in acres
    crop_history TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS crop_cycles (
    id SERIAL PRIMARY KEY,
    plot_id INTEGER NOT NULL REFERENCES plots(id) ON DELETE CASCADE,
    crop_name VARCHAR(100) NOT NULL,
    sown_date DATE,
    expected_harvest_date DATE,
    status crop_cycle_status NOT NULL DEFAULT 'planned',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Yield tracking (powers /analytics/yield)
ALTER TABLE crop_cycles ADD COLUMN IF NOT EXISTS harvest_date DATE;
ALTER TABLE crop_cycles ADD COLUMN IF NOT EXISTS harvested_quantity NUMERIC(10,2);
ALTER TABLE crop_cycles ADD COLUMN IF NOT EXISTS yield_unit VARCHAR(20) NOT NULL DEFAULT 'kg';
ALTER TABLE crop_cycles ADD COLUMN IF NOT EXISTS notes TEXT;

CREATE TABLE IF NOT EXISTS listings (
    id SERIAL PRIMARY KEY,
    farmer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    crop_name VARCHAR(100) NOT NULL,
    quantity NUMERIC(10,2) NOT NULL,
    unit VARCHAR(20) NOT NULL DEFAULT 'kg',
    unit_price NUMERIC(10,2) NOT NULL,
    quality_notes TEXT,
    status listing_status NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE listings ADD COLUMN IF NOT EXISTS location VARCHAR(200);

CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    listing_id INTEGER NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    buyer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    quantity NUMERIC(10,2) NOT NULL,
    total_price NUMERIC(10,2) NOT NULL,
    status order_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_address TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE TABLE IF NOT EXISTS field_reports (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plot_id INTEGER REFERENCES plots(id) ON DELETE SET NULL,
    description TEXT NOT NULL,
    category VARCHAR(80),
    severity report_severity,
    status report_status NOT NULL DEFAULT 'open',
    location VARCHAR(200),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE field_reports ADD COLUMN IF NOT EXISTS ai_classified BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS report_status_history (
    id SERIAL PRIMARY KEY,
    report_id INTEGER NOT NULL REFERENCES field_reports(id) ON DELETE CASCADE,
    status report_status NOT NULL,
    changed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE report_status_history ADD COLUMN IF NOT EXISTS note TEXT;

CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS type VARCHAR(40) NOT NULL DEFAULT 'info';
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS link VARCHAR(200);

-- Every SMS / voice alert attempt (sent, simulated or failed), for auditing.
CREATE TABLE IF NOT EXISTS alert_log (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    channel VARCHAR(10) NOT NULL,          -- 'sms' | 'voice'
    to_number VARCHAR(20) NOT NULL,
    message TEXT NOT NULL,
    provider VARCHAR(20) NOT NULL,         -- 'twilio' | 'simulated'
    status VARCHAR(20) NOT NULL,           -- 'sent' | 'simulated' | 'failed'
    error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_alert_log_created_at ON alert_log(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_farm_profiles_user_id ON farm_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_plots_farm_profile_id ON plots(farm_profile_id);
CREATE INDEX IF NOT EXISTS idx_crop_cycles_plot_id ON crop_cycles(plot_id);
CREATE INDEX IF NOT EXISTS idx_listings_farmer_id ON listings(farmer_id);
CREATE INDEX IF NOT EXISTS idx_listings_status ON listings(status);
CREATE INDEX IF NOT EXISTS idx_orders_listing_id ON orders(listing_id);
CREATE INDEX IF NOT EXISTS idx_orders_buyer_id ON orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_field_reports_user_id ON field_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_field_reports_status ON field_reports(status);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
