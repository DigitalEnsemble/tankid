-- TankID Database Schema
-- Created: 2026-04-02
-- PostgreSQL 15.x+

-- Create facilities table
CREATE TABLE IF NOT EXISTS facilities (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  city VARCHAR(100),
  state VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create tank_models table
CREATE TABLE IF NOT EXISTS tank_models (
  id SERIAL PRIMARY KEY,
  manufacturer VARCHAR(255) NOT NULL,
  model_name VARCHAR(255) NOT NULL,
  capacity_gallons INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create tanks table
CREATE TABLE IF NOT EXISTS tanks (
  id SERIAL PRIMARY KEY,
  facility_id INTEGER NOT NULL REFERENCES facilities(id),
  model_id INTEGER NOT NULL REFERENCES tank_models(id),
  serial_number VARCHAR(255) UNIQUE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create tank_chart_readings table
CREATE TABLE IF NOT EXISTS tank_chart_readings (
  id SERIAL PRIMARY KEY,
  tank_id INTEGER NOT NULL REFERENCES tanks(id),
  height_inches DECIMAL(10, 2) NOT NULL,
  volume_gallons INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create documents table
CREATE TABLE IF NOT EXISTS documents (
  id SERIAL PRIMARY KEY,
  tank_id INTEGER NOT NULL REFERENCES tanks(id),
  document_type VARCHAR(100),
  file_path VARCHAR(512),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_facilities_state_city ON facilities(state, city);
CREATE INDEX IF NOT EXISTS idx_tanks_facility ON tanks(facility_id);
CREATE INDEX IF NOT EXISTS idx_tanks_serial ON tanks(serial_number);
CREATE INDEX IF NOT EXISTS idx_chart_model ON tank_chart_readings(tank_id);
