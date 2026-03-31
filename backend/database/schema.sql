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

-- Plants Table
CREATE TABLE plants (
    id SERIAL PRIMARY KEY,
    farm_id INTEGER NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
    plant_name VARCHAR(100) NOT NULL,
    plant_type VARCHAR(50) NOT NULL,
    quantity INTEGER DEFAULT 1,
    position_x DECIMAL(10, 2) DEFAULT 0,
    position_y DECIMAL(10, 2) DEFAULT 0,
    position_z DECIMAL(10, 2) DEFAULT 0,
    health_status VARCHAR(20) DEFAULT 'healthy'
);

-- Indexes for better performance
CREATE INDEX idx_farms_user_id ON farms(user_id);
CREATE INDEX idx_plants_farm_id ON plants(farm_id);
CREATE INDEX idx_users_email ON users(email);