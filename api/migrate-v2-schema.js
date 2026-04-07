const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function migrateToV2Schema() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Starting TankID v1 to v2 schema migration...');
    
    // Check if we're already on v2 schema
    const schemaCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'site_locations'
      ) as has_site_locations,
      EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'facilities' AND column_name = 'state_code'
      ) as has_state_code
    `);
    
    const { has_site_locations, has_state_code } = schemaCheck.rows[0];
    
    if (has_site_locations && has_state_code) {
      return {
        success: true,
        message: 'Database is already using v2 schema',
        details: {
          has_site_locations: true,
          has_state_code: true,
          migration_needed: false
        }
      };
    }
    
    console.log('📊 Current schema state:', { has_site_locations, has_state_code });
    
    // Execute the migration SQL directly (embedded)
    console.log('📄 Running embedded v2 migration script...');
    
    try {
      // Execute the migration (embedded SQL from migrate_v1_to_v2.sql)
      await client.query(getV2MigrationSQL());
      
      console.log('✅ v2 schema migration completed successfully');
      
      // Verify the migration worked
      const verifyResult = await client.query(`
        SELECT 
          (SELECT COUNT(*) FROM facilities) as facility_count,
          (SELECT COUNT(*) FROM site_locations) as site_count,
          (SELECT COUNT(*) FROM tanks) as tank_count,
          (SELECT COUNT(*) FROM tank_documents) as document_count
      `);
      
      const counts = verifyResult.rows[0];
      
      return {
        success: true,
        message: 'v2 schema migration completed successfully',
        details: {
          migration_applied: true,
          facilities_migrated: parseInt(counts.facility_count),
          site_locations_created: parseInt(counts.site_count),
          tanks_migrated: parseInt(counts.tank_count),
          documents_migrated: parseInt(counts.document_count)
        }
      };
      
    } catch (fileError) {
      if (fileError.code === 'ENOENT') {
        return {
          success: false,
          message: 'Migration script not found',
          error: 'The v2 migration script (db/migrate_v1_to_v2.sql) was not found. Please ensure it exists.',
          details: {
            expected_path: migrationPath,
            file_error: fileError.message
          }
        };
      }
      throw fileError;
    }
    
  } catch (error) {
    console.error('❌ v2 schema migration failed:', error);
    
    return {
      success: false,
      message: 'v2 schema migration failed',
      error: error.message,
      details: {
        error_type: error.constructor.name,
        hint: 'Check if database is accessible and migration script is valid'
      }
    };
  } finally {
    client.release();
  }
}

// Embedded v2 migration SQL (from db/migrate_v1_to_v2.sql)
function getV2MigrationSQL() {
  return `
-- TankID Database Schema Migration: v1 to v2
-- Date: 2026-04-07 
-- Based on: Task 001 Database Addendum v2
-- This script migrates from v1 (simple serial IDs) to v2 (composite keys + site_locations)
-- IMPORTANT: Run this against a backup first - this transforms existing data

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

BEGIN;

-- =============================================================================
-- STEP 1: Backup existing data to temporary tables
-- =============================================================================

-- Backup current facilities data
CREATE TEMPORARY TABLE facilities_backup AS 
SELECT * FROM facilities;

-- Backup current tanks data  
CREATE TEMPORARY TABLE tanks_backup AS
SELECT * FROM tanks;

-- Backup current documents data (handle missing table gracefully)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'documents') THEN
    CREATE TEMPORARY TABLE documents_backup AS SELECT * FROM documents;
  ELSE
    CREATE TEMPORARY TABLE documents_backup (id UUID, tank_id UUID, document_type TEXT, file_path TEXT, created_at TIMESTAMPTZ);
  END IF;
END
$$;

-- =============================================================================
-- STEP 2: Drop existing tables and recreate with v2 schema
-- =============================================================================

-- Drop existing tables (cascade to handle foreign key constraints)
DROP TABLE IF EXISTS documents CASCADE;
DROP TABLE IF EXISTS tank_chart_readings CASCADE;
DROP TABLE IF EXISTS tanks CASCADE;
DROP TABLE IF EXISTS facilities CASCADE;

-- =============================================================================
-- STEP 3: Create v2 schema - facilities table
-- =============================================================================

CREATE TABLE facilities (
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
-- STEP 4: Create v2 schema - site_locations table
-- =============================================================================

CREATE TABLE site_locations (
  id           UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  facility_id  UUID          NOT NULL REFERENCES facilities(id),
  site_name    VARCHAR(255)  NOT NULL,
  site_code    VARCHAR(50),
  description  TEXT,
  created_at   TIMESTAMPTZ   DEFAULT NOW()
);

-- =============================================================================
-- STEP 5: Create v2 schema - tanks table
-- =============================================================================

CREATE TABLE tanks (
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
-- STEP 6: Update tank_models to use UUID (if needed)
-- =============================================================================

-- Check if tank_models exists and update if using SERIAL
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tank_models') THEN
    -- Add UUID column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tank_models' AND column_name = 'uuid_id') THEN
      ALTER TABLE tank_models ADD COLUMN uuid_id UUID DEFAULT uuid_generate_v4();
      -- Create mapping for later use
      CREATE TEMPORARY TABLE tank_model_id_mapping AS
      SELECT id as old_id, uuid_id as new_id FROM tank_models;
    END IF;
  END IF;
END
$$;

-- =============================================================================
-- STEP 7: Recreate tank_chart_readings table
-- =============================================================================

CREATE TABLE tank_chart_readings (
  id              UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  tank_model_id   UUID          NOT NULL REFERENCES tank_models(uuid_id),
  height_inches   DECIMAL(10,2) NOT NULL,
  volume_gallons  INTEGER       NOT NULL,
  created_at      TIMESTAMPTZ   DEFAULT NOW()
);

-- =============================================================================
-- STEP 8: Create v2 schema - tank_documents table (replaces documents)
-- =============================================================================

CREATE TABLE tank_documents (
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
-- STEP 9: Migrate existing data from v1 to v2
-- =============================================================================

-- Create facility ID mapping table for data migration
CREATE TEMPORARY TABLE facility_id_mapping AS
SELECT 
  old.id as old_id,
  uuid_generate_v4() as new_id,
  COALESCE(old.state, 'CO') as state_code,  -- Default to CO if null
  old.id::text as state_facility_id         -- Convert old ID to string for state_facility_id
FROM facilities_backup old;

-- Insert migrated facilities data
INSERT INTO facilities (
  id, state_code, state_facility_id, name, 
  address, city, state, facility_type, owner_name, created_at
)
SELECT 
  map.new_id,
  map.state_code,
  map.state_facility_id,
  old.name,
  COALESCE(old.name, 'Address Required'),  -- Default address if null
  COALESCE(old.city, 'Unknown City'),
  map.state_code,
  old.facility_type,
  old.owner_name,
  old.created_at
FROM facilities_backup old
JOIN facility_id_mapping map ON old.id = map.old_id;

-- Create default site_locations for each facility
INSERT INTO site_locations (facility_id, site_name, created_at)
SELECT 
  f.id,
  COALESCE(f.name, 'Main Site') || ' - Primary Location',
  NOW()
FROM facilities f;

-- Create tank ID mapping
CREATE TEMPORARY TABLE tank_id_mapping AS
SELECT 
  old.id as old_id,
  uuid_generate_v4() as new_id
FROM tanks_backup old;

-- Insert migrated tanks data
INSERT INTO tanks (
  id, site_location_id, tank_model_id, tank_type, 
  serial_number, install_date, install_contractor,
  access_level, created_at
)
SELECT 
  tmap.new_id,
  sl.id,  -- site_location_id from the default site we created
  tmmap.new_id,  -- new UUID from tank_models
  'AST',  -- Default to AST - will need manual correction for UST tanks
  old.serial_number,
  old.install_date,
  old.install_contractor,
  old.access_level,
  old.created_at
FROM tanks_backup old
JOIN tank_id_mapping tmap ON old.id = tmap.old_id
JOIN facility_id_mapping fmap ON old.facility_id = fmap.old_id
JOIN site_locations sl ON sl.facility_id = fmap.new_id
LEFT JOIN tank_model_id_mapping tmmap ON old.model_id = tmmap.old_id;

-- Migrate documents to tank_documents (if any exist)
INSERT INTO tank_documents (
  tank_id, doc_type, storage_key, original_filename, uploaded_at
)
SELECT 
  tmap.new_id,
  CASE 
    WHEN old.document_type ILIKE '%chart%' THEN 'tank_chart'
    WHEN old.document_type ILIKE '%drawing%' THEN 'tank_drawing'
    WHEN old.document_type ILIKE '%permit%' THEN 'installation_permit'
    WHEN old.document_type ILIKE '%inspection%' THEN 'inspection_report'
    WHEN old.document_type ILIKE '%spec%' THEN 'manufacturer_spec'
    WHEN old.document_type ILIKE '%warranty%' THEN 'warranty'
    ELSE 'other'
  END,
  -- Convert file_path to R2 storage key format
  'migrated/' || old.id::text || '/' || COALESCE(old.document_type, 'unknown') || '.pdf',
  old.file_path,
  old.created_at
FROM documents_backup old
JOIN tank_id_mapping tmap ON old.tank_id = tmap.old_id
WHERE old.file_path IS NOT NULL AND old.id IS NOT NULL;

-- =============================================================================
-- STEP 10: Create indexes for performance
-- =============================================================================

-- Facilities indexes
CREATE INDEX idx_facilities_state_facility
  ON facilities(state_code, state_facility_id);

CREATE INDEX idx_facilities_client_id
  ON facilities(client_facility_id);

CREATE INDEX idx_facilities_installer_id
  ON facilities(installer_facility_id);

-- Site locations indexes  
CREATE INDEX idx_site_locations_facility
  ON site_locations(facility_id);

-- Tanks indexes
CREATE INDEX idx_tanks_site_location
  ON tanks(site_location_id);

CREATE INDEX idx_tanks_model
  ON tanks(tank_model_id);

CREATE INDEX idx_tanks_serial
  ON tanks(serial_number);

CREATE INDEX idx_tanks_type
  ON tanks(tank_type);

-- Tank documents indexes
CREATE INDEX idx_tank_documents_tank
  ON tank_documents(tank_id);

CREATE INDEX idx_tank_documents_type
  ON tank_documents(doc_type);

-- Tank chart readings indexes
CREATE INDEX idx_chart_model
  ON tank_chart_readings(tank_model_id);

-- =============================================================================
-- STEP 11: Clean up temporary tables and finalize
-- =============================================================================

-- Update tank_models to use the new UUID as primary key (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tank_models') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tank_models' AND column_name = 'uuid_id') THEN
      -- Drop old id column and rename uuid_id to id
      ALTER TABLE tank_models DROP COLUMN IF EXISTS id CASCADE;
      ALTER TABLE tank_models RENAME COLUMN uuid_id TO id;
      ALTER TABLE tank_models ADD PRIMARY KEY (id);
    END IF;
  END IF;
END
$$;

-- Drop temporary mapping tables
DROP TABLE IF EXISTS facility_id_mapping;
DROP TABLE IF EXISTS tank_id_mapping;
DROP TABLE IF EXISTS tank_model_id_mapping;

COMMIT;

-- Display migration summary
DO $$
DECLARE
  facility_count integer;
  site_count integer; 
  tank_count integer;
  doc_count integer;
BEGIN
  SELECT COUNT(*) INTO facility_count FROM facilities;
  SELECT COUNT(*) INTO site_count FROM site_locations;
  SELECT COUNT(*) INTO tank_count FROM tanks;
  SELECT COUNT(*) INTO doc_count FROM tank_documents;
  
  RAISE NOTICE 'TankID v1 to v2 Migration Complete!';
  RAISE NOTICE 'Migrated % facilities', facility_count;
  RAISE NOTICE 'Created % site locations', site_count;  
  RAISE NOTICE 'Migrated % tanks', tank_count;
  RAISE NOTICE 'Migrated % documents', doc_count;
  RAISE NOTICE '';
  RAISE NOTICE 'IMPORTANT: Manual steps required:';
  RAISE NOTICE '1. Update tank_type from AST to UST for underground tanks';
  RAISE NOTICE '2. Add proper state_code and state_facility_id values';
  RAISE NOTICE '3. Set up Cloudflare R2 for document storage';
  RAISE NOTICE '4. Migrate actual document files to R2';
END
$$;
`;
}

module.exports = { migrateToV2Schema };