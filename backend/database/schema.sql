-- Users Table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Farms Table
CREATE TABLE farms (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    location VARCHAR(255) NOT NULL,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    area DECIMAL(10, 2)
);

CREATE TABLE objects (
    id SERIAL PRIMARY KEY,
    farm_id INTEGER NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    object_name VARCHAR(100) NOT NULL, 
    category VARCHAR(100) NOT NULL,   
    position_x NUMERIC(10, 4) NOT NULL,
    position_y NUMERIC(10, 4) NOT NULL,
    position_z NUMERIC(10, 4) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);


--Please try to run these sql in the command before u start

-- Historical logging table for dashboard analytics
-- CREATE TABLE IF NOT EXISTS sensor_logs (
--     id SERIAL PRIMARY KEY,
--     object_id INTEGER NOT NULL REFERENCES objects(id) ON DELETE CASCADE,
--     sensor_type VARCHAR(50) NOT NULL, -- e.g., 'moisture', 'temperature', 'growth'
--     value NUMERIC NOT NULL,
--     recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
-- );

-- ALTER TABLE objects ADD COLUMN growth NUMERIC DEFAULT 0.4;
-- ALTER TABLE objects ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;


-- Indexes for better performance
CREATE INDEX idx_farms_user_id ON farms(user_id);
CREATE INDEX idx_objects_farm_id ON objects(farm_id);
CREATE INDEX idx_users_email ON users(email);