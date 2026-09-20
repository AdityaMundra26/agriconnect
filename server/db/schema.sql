-- AgriConnect database schema (PostgreSQL)

CREATE TYPE user_role AS ENUM ('farmer', 'buyer', 'admin');
CREATE TYPE irrigation_access AS ENUM ('none', 'rainfed', 'canal', 'borewell', 'drip', 'sprinkler');
CREATE TYPE crop_cycle_status AS ENUM ('planned', 'sown', 'growing', 'harvested', 'failed');
CREATE TYPE listing_status AS ENUM ('active', 'sold_out', 'closed');
CREATE TYPE order_status AS ENUM ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled');
CREATE TYPE report_severity AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE report_status AS ENUM ('open', 'in_progress', 'resolved', 'rejected');

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(160) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'farmer',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE farm_profiles (
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

CREATE TABLE plots (
    id SERIAL PRIMARY KEY,
    farm_profile_id INTEGER NOT NULL REFERENCES farm_profiles(id) ON DELETE CASCADE,
    name VARCHAR(120) NOT NULL,
    area NUMERIC(10,2), -- in acres
    crop_history TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE crop_cycles (
    id SERIAL PRIMARY KEY,
    plot_id INTEGER NOT NULL REFERENCES plots(id) ON DELETE CASCADE,
    crop_name VARCHAR(100) NOT NULL,
    sown_date DATE,
    expected_harvest_date DATE,
    status crop_cycle_status NOT NULL DEFAULT 'planned',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE listings (
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

CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    listing_id INTEGER NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    buyer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    quantity NUMERIC(10,2) NOT NULL,
    total_price NUMERIC(10,2) NOT NULL,
    status order_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE field_reports (
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

CREATE TABLE report_status_history (
    id SERIAL PRIMARY KEY,
    report_id INTEGER NOT NULL REFERENCES field_reports(id) ON DELETE CASCADE,
    status report_status NOT NULL,
    changed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_farm_profiles_user_id ON farm_profiles(user_id);
CREATE INDEX idx_plots_farm_profile_id ON plots(farm_profile_id);
CREATE INDEX idx_crop_cycles_plot_id ON crop_cycles(plot_id);
CREATE INDEX idx_listings_farmer_id ON listings(farmer_id);
CREATE INDEX idx_listings_status ON listings(status);
CREATE INDEX idx_orders_listing_id ON orders(listing_id);
CREATE INDEX idx_orders_buyer_id ON orders(buyer_id);
CREATE INDEX idx_field_reports_user_id ON field_reports(user_id);
CREATE INDEX idx_field_reports_status ON field_reports(status);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
