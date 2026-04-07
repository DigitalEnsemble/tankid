-- TankID Database Schema v2
-- Date: 2026-04-07
-- Based on: Task 001 Database Addendum v2
-- PostgreSQL 15.x+

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- FACILITIES TABLE - v2 with composite unique key
-- =============================================================================

CREATE TABLE IF NOT EXISTS facilities (
  id                    UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  state_code            CHAR(2)       NOT NULL,
  state_facility_id     VARCHAR(50)   NOT NULL,
  client_facility_id    VARCHAR(50),
  installer_facility_id VARCHAR(50),
  name                  VARCHAR(255),
  address               VARCHAR(255)  NOT NULL,
  city                  VARCHAR(100)  NOT NULL,
  state                 CHAR(2)       NOT NULL,
  zip                   VARCHAR(10),
  county                VARCHAR(100),
  facility_type         VARCHAR(50),
  owner_name            VARCHAR(255),
  created_at            TIMESTAMPTZ   DEFAULT NOW(),
  UNIQUE (state_code, state_facility_id)
);

-- =============================================================================
-- SITE_LOCATIONS TABLE - New in v2
-- =============================================================================

CREATE TABLE IF NOT EXISTS site_locations (
  id           UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  facility_id  UUID          NOT NULL REFERENCES facilities(id),
  site_name    VARCHAR(255)  NOT NULL,
  site_code    VARCHAR(50),
  description  TEXT,
  created_at   TIMESTAMPTZ   DEFAULT NOW()
);

-- =============================================================================
-- TANK_MODELS TABLE - Updated to use UUID
-- =============================================================================

CREATE TABLE IF NOT EXISTS tank_models (
  id                UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  manufacturer      VARCHAR(255)  NOT NULL,
  model_name        VARCHAR(255)  NOT NULL,
  capacity_gallons  INTEGER       NOT NULL,
  created_at        TIMESTAMPTZ   DEFAULT NOW()
);

-- =============================================================================
-- TANKS TABLE - v2 with site_locations relationship and new fields  
-- =============================================================================

CREATE TABLE IF NOT EXISTS tanks (
  id                    UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  site_location_id      UUID          NOT NULL REFERENCES site_locations(id),
  tank_model_id         UUID          REFERENCES tank_models(id),
  tank_type             VARCHAR(10)   NOT NULL CHECK (tank_type IN ('AST','UST')),
  tank_subtype          VARCHAR(30)   CHECK (tank_subtype IN ('fuel_storage','death_tank','oil_water_separator')),
  state_tank_id         VARCHAR(50),
  facility_tank_id      VARCHAR(50),
  installer_tank_id     VARCHAR(50),
  serial_number         VARCHAR(100),
  install_depth_inches  NUMERIC(6,2),
  install_date          DATE,
  install_contractor    VARCHAR(255),
  last_inspection_date  DATE,
  atg_brand             VARCHAR(100),
  atg_model             VARCHAR(100),
  atg_last_calibration  DATE,
  product_grade         VARCHAR(50),
  octane                INTEGER,
  ethanol_pct           INTEGER,
  access_level          VARCHAR(20)   DEFAULT 'public',
  created_at            TIMESTAMPTZ   DEFAULT NOW(),
  updated_at            TIMESTAMPTZ   DEFAULT NOW()
);

-- =============================================================================
-- TANK_CHART_READINGS TABLE - Updated for tank_models UUID
-- =============================================================================

CREATE TABLE IF NOT EXISTS tank_chart_readings (
  id              UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  tank_model_id   UUID          NOT NULL REFERENCES tank_models(id),
  height_inches   DECIMAL(10,2) NOT NULL,
  volume_gallons  INTEGER       NOT NULL,
  created_at      TIMESTAMPTZ   DEFAULT NOW()
);

-- =============================================================================
-- TANK_DOCUMENTS TABLE - v2 with R2 storage (replaces documents)
-- =============================================================================

CREATE TABLE IF NOT EXISTS tank_documents (
  id                UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  tank_id           UUID          NOT NULL REFERENCES tanks(id),
  doc_type          VARCHAR(50)   NOT NULL
                    CHECK (doc_type IN (
                      'tank_chart','tank_drawing','installation_permit',
                      'inspection_report','manufacturer_spec','warranty','other')),
  storage_key       TEXT          NOT NULL,
  original_filename VARCHAR(255),
  file_size_bytes   INTEGER,
  uploaded_by       VARCHAR(100),
  uploaded_at       TIMESTAMPTZ   DEFAULT NOW()
);

-- =============================================================================
-- INDEXES FOR PERFORMANCE
-- =============================================================================

-- Facilities indexes
CREATE INDEX IF NOT EXISTS idx_facilities_state_facility
  ON facilities(state_code, state_facility_id);

CREATE INDEX IF NOT EXISTS idx_facilities_client_id
  ON facilities(client_facility_id);

CREATE INDEX IF NOT EXISTS idx_facilities_installer_id
  ON facilities(installer_facility_id);

-- Site locations indexes
CREATE INDEX IF NOT EXISTS idx_site_locations_facility
  ON site_locations(facility_id);

-- Tanks indexes
CREATE INDEX IF NOT EXISTS idx_tanks_site_location
  ON tanks(site_location_id);

CREATE INDEX IF NOT EXISTS idx_tanks_model
  ON tanks(tank_model_id);

CREATE INDEX IF NOT EXISTS idx_tanks_serial
  ON tanks(serial_number);

CREATE INDEX IF NOT EXISTS idx_tanks_type
  ON tanks(tank_type);

-- Tank documents indexes
CREATE INDEX IF NOT EXISTS idx_tank_documents_tank
  ON tank_documents(tank_id);

CREATE INDEX IF NOT EXISTS idx_tank_documents_type
  ON tank_documents(doc_type);

-- Tank chart readings indexes
CREATE INDEX IF NOT EXISTS idx_chart_model
  ON tank_chart_readings(tank_model_id);