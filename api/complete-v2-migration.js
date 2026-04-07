const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function completeV2Migration() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Completing partial v2 migration...');
    
    // Start transaction
    await client.query('BEGIN');
    
    // Step 1: Add missing columns to facilities if they don't exist
    console.log('📊 Adding missing columns to facilities...');
    await client.query(`
      DO $$
      BEGIN
        -- Add state_code if missing
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'facilities' AND column_name = 'state_code') THEN
          ALTER TABLE facilities ADD COLUMN state_code CHAR(2);
          UPDATE facilities SET state_code = COALESCE(state, 'CO');
          ALTER TABLE facilities ALTER COLUMN state_code SET NOT NULL;
        END IF;
        
        -- Add state_facility_id if missing
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'facilities' AND column_name = 'state_facility_id') THEN
          ALTER TABLE facilities ADD COLUMN state_facility_id VARCHAR(50);
          UPDATE facilities SET state_facility_id = id::text;
          ALTER TABLE facilities ALTER COLUMN state_facility_id SET NOT NULL;
        END IF;
        
        -- Add other missing v2 columns to facilities
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'facilities' AND column_name = 'client_facility_id') THEN
          ALTER TABLE facilities ADD COLUMN client_facility_id VARCHAR(50);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'facilities' AND column_name = 'installer_facility_id') THEN
          ALTER TABLE facilities ADD COLUMN installer_facility_id VARCHAR(50);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'facilities' AND column_name = 'address') THEN
          ALTER TABLE facilities ADD COLUMN address VARCHAR(255);
          UPDATE facilities SET address = COALESCE(name, 'Address Required');
          ALTER TABLE facilities ALTER COLUMN address SET NOT NULL;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'facilities' AND column_name = 'county') THEN
          ALTER TABLE facilities ADD COLUMN county VARCHAR(100);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'facilities' AND column_name = 'facility_type') THEN
          ALTER TABLE facilities ADD COLUMN facility_type VARCHAR(50);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'facilities' AND column_name = 'owner_name') THEN
          ALTER TABLE facilities ADD COLUMN owner_name VARCHAR(255);
        END IF;
      END
      $$;
    `);
    
    // Step 2: Create site_locations table if missing
    console.log('🏗️ Creating site_locations table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS site_locations (
        id           UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
        facility_id  UUID          NOT NULL REFERENCES facilities(id),
        site_name    VARCHAR(255)  NOT NULL,
        site_code    VARCHAR(50),
        description  TEXT,
        created_at   TIMESTAMPTZ   DEFAULT NOW()
      );
    `);
    
    // Step 3: Create default site_locations for facilities without them
    console.log('📍 Creating default site locations...');
    await client.query(`
      INSERT INTO site_locations (facility_id, site_name, created_at)
      SELECT f.id, COALESCE(f.name, 'Unnamed Facility') || ' - Primary Location', NOW()
      FROM facilities f
      WHERE NOT EXISTS (
        SELECT 1 FROM site_locations sl WHERE sl.facility_id = f.id
      );
    `);
    
    // Step 4: Add missing columns to tanks
    console.log('⛽ Adding missing columns to tanks...');
    await client.query(`
      DO $$
      BEGIN
        -- Add site_location_id if missing  
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'tanks' AND column_name = 'site_location_id') THEN
          ALTER TABLE tanks ADD COLUMN site_location_id UUID;
          
          -- Link tanks to their facility's default site_location
          UPDATE tanks SET site_location_id = (
            SELECT sl.id 
            FROM site_locations sl
            JOIN facilities f ON f.id = sl.facility_id
            WHERE EXISTS (
              SELECT 1 FROM tanks t2 WHERE t2.facility_id = f.id AND t2.id = tanks.id
            )
            LIMIT 1
          ) WHERE EXISTS (SELECT 1 FROM information_schema.columns 
                         WHERE table_name = 'tanks' AND column_name = 'facility_id');
          
          -- If no facility_id column exists, link to first site_location
          UPDATE tanks SET site_location_id = (
            SELECT id FROM site_locations LIMIT 1
          ) WHERE site_location_id IS NULL;
          
          ALTER TABLE tanks ALTER COLUMN site_location_id SET NOT NULL;
          ALTER TABLE tanks ADD CONSTRAINT fk_tanks_site_location 
            FOREIGN KEY (site_location_id) REFERENCES site_locations(id);
        END IF;
        
        -- Add other v2 columns to tanks
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'tanks' AND column_name = 'tank_type') THEN
          ALTER TABLE tanks ADD COLUMN tank_type VARCHAR(10) DEFAULT 'AST';
          ALTER TABLE tanks ALTER COLUMN tank_type SET NOT NULL;
          ALTER TABLE tanks ADD CONSTRAINT check_tank_type 
            CHECK (tank_type IN ('AST','UST'));
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'tanks' AND column_name = 'tank_subtype') THEN
          ALTER TABLE tanks ADD COLUMN tank_subtype VARCHAR(30);
          ALTER TABLE tanks ADD CONSTRAINT check_tank_subtype
            CHECK (tank_subtype IN ('fuel_storage','death_tank','oil_water_separator'));
        END IF;
        
        -- Add other missing tank columns
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'tanks' AND column_name = 'state_tank_id') THEN
          ALTER TABLE tanks ADD COLUMN state_tank_id VARCHAR(50);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'tanks' AND column_name = 'facility_tank_id') THEN
          ALTER TABLE tanks ADD COLUMN facility_tank_id VARCHAR(50);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'tanks' AND column_name = 'installer_tank_id') THEN
          ALTER TABLE tanks ADD COLUMN installer_tank_id VARCHAR(50);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'tanks' AND column_name = 'install_depth_inches') THEN
          ALTER TABLE tanks ADD COLUMN install_depth_inches NUMERIC(6,2);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'tanks' AND column_name = 'install_contractor') THEN
          ALTER TABLE tanks ADD COLUMN install_contractor VARCHAR(255);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'tanks' AND column_name = 'last_inspection_date') THEN
          ALTER TABLE tanks ADD COLUMN last_inspection_date DATE;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'tanks' AND column_name = 'atg_brand') THEN
          ALTER TABLE tanks ADD COLUMN atg_brand VARCHAR(100);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'tanks' AND column_name = 'atg_model') THEN
          ALTER TABLE tanks ADD COLUMN atg_model VARCHAR(100);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'tanks' AND column_name = 'atg_last_calibration') THEN
          ALTER TABLE tanks ADD COLUMN atg_last_calibration DATE;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'tanks' AND column_name = 'product_grade') THEN
          ALTER TABLE tanks ADD COLUMN product_grade VARCHAR(50);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'tanks' AND column_name = 'octane') THEN
          ALTER TABLE tanks ADD COLUMN octane INTEGER;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'tanks' AND column_name = 'ethanol_pct') THEN
          ALTER TABLE tanks ADD COLUMN ethanol_pct INTEGER;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'tanks' AND column_name = 'access_level') THEN
          ALTER TABLE tanks ADD COLUMN access_level VARCHAR(20) DEFAULT 'public';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'tanks' AND column_name = 'updated_at') THEN
          ALTER TABLE tanks ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
        END IF;
      END
      $$;
    `);
    
    // Step 5: Add unique constraint to facilities if missing
    console.log('🔗 Adding unique constraints...');
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint 
                      WHERE conname = 'facilities_state_code_state_facility_id_key') THEN
          ALTER TABLE facilities ADD CONSTRAINT facilities_state_code_state_facility_id_key
            UNIQUE (state_code, state_facility_id);
        END IF;
      END
      $$;
    `);
    
    // Step 6: Create indexes
    console.log('📊 Creating performance indexes...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_facilities_state_facility
        ON facilities(state_code, state_facility_id);
      CREATE INDEX IF NOT EXISTS idx_site_locations_facility
        ON site_locations(facility_id);
      CREATE INDEX IF NOT EXISTS idx_tanks_site_location
        ON tanks(site_location_id);
      CREATE INDEX IF NOT EXISTS idx_tanks_type
        ON tanks(tank_type);
      -- tank_documents uses linked_tanks array, not tank_id
      CREATE INDEX IF NOT EXISTS idx_tank_documents_facility
        ON tank_documents(facility_id);
      CREATE INDEX IF NOT EXISTS idx_tank_documents_linked_tanks
        ON tank_documents USING gin(linked_tanks);
    `);
    
    // Step 7: Clean up old facility_id column from tanks if it exists
    await client.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'tanks' AND column_name = 'facility_id') THEN
          ALTER TABLE tanks DROP COLUMN facility_id;
        END IF;
      END
      $$;
    `);
    
    await client.query('COMMIT');
    
    // Verify final state
    const verifyResult = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM facilities) as facility_count,
        (SELECT COUNT(*) FROM site_locations) as site_count,
        (SELECT COUNT(*) FROM tanks) as tank_count,
        (SELECT COUNT(*) FROM tank_documents) as document_count,
        (SELECT COUNT(*) FROM information_schema.columns 
         WHERE table_name = 'facilities' AND column_name = 'state_code') as has_state_code
    `);
    
    const counts = verifyResult.rows[0];
    
    return {
      success: true,
      message: 'v2 migration recovery completed successfully',
      details: {
        facilities_updated: parseInt(counts.facility_count),
        site_locations_ensured: parseInt(counts.site_count),
        tanks_updated: parseInt(counts.tank_count), 
        documents_preserved: parseInt(counts.document_count),
        has_v2_schema: parseInt(counts.has_state_code) > 0
      }
    };
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ v2 migration recovery failed:', error);
    
    return {
      success: false,
      message: 'v2 migration recovery failed',
      error: error.message
    };
  } finally {
    client.release();
  }
}

module.exports = { completeV2Migration };