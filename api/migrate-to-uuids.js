const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function migrateToUUIDs() {
  console.log('🔄 Starting migration from integer IDs to UUIDs...');
  
  try {
    // Step 1: Add UUID columns alongside existing integer columns
    console.log('📝 Adding UUID columns...');
    
    await pool.query(`
      -- Add UUID extension if not exists
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
      
      -- Add UUID columns to each table
      ALTER TABLE tank_models ADD COLUMN IF NOT EXISTS uuid_id UUID DEFAULT uuid_generate_v4();
      ALTER TABLE facilities ADD COLUMN IF NOT EXISTS uuid_id UUID DEFAULT uuid_generate_v4();
      ALTER TABLE tanks ADD COLUMN IF NOT EXISTS uuid_id UUID DEFAULT uuid_generate_v4();
      ALTER TABLE tanks ADD COLUMN IF NOT EXISTS facility_uuid UUID;
      ALTER TABLE tanks ADD COLUMN IF NOT EXISTS model_uuid UUID;
    `);
    
    // Step 2: Populate the UUID foreign keys in tanks table
    console.log('🔗 Populating UUID foreign keys...');
    
    await pool.query(`
      -- Link tank facility_uuid to facilities.uuid_id
      UPDATE tanks 
      SET facility_uuid = f.uuid_id 
      FROM facilities f 
      WHERE tanks.facility_id = f.id;
      
      -- Link tank model_uuid to tank_models.uuid_id  
      UPDATE tanks 
      SET model_uuid = tm.uuid_id 
      FROM tank_models tm 
      WHERE tanks.model_id = tm.id;
    `);
    
    // Step 3: Create backup tables
    console.log('💾 Creating backup tables...');
    
    await pool.query(`
      -- Backup existing data
      DROP TABLE IF EXISTS tank_models_backup, facilities_backup, tanks_backup;
      
      CREATE TABLE tank_models_backup AS SELECT * FROM tank_models;
      CREATE TABLE facilities_backup AS SELECT * FROM facilities;  
      CREATE TABLE tanks_backup AS SELECT * FROM tanks;
    `);
    
    // Step 4: Recreate tables with UUID primary keys
    console.log('🗂️  Recreating tables with UUID primary keys...');
    
    await pool.query(`
      -- Drop existing tables (foreign key constraints will be dropped too)
      DROP TABLE tanks CASCADE;
      DROP TABLE tank_models CASCADE;
      DROP TABLE facilities CASCADE;
      
      -- Recreate with UUID primary keys
      CREATE TABLE tank_models (
        id UUID PRIMARY KEY,
        manufacturer VARCHAR(255) NOT NULL,
        model_name VARCHAR(255) NOT NULL,
        capacity_gallons INTEGER,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE facilities (
        id UUID PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        city VARCHAR(100),
        state CHAR(2),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE tanks (
        id UUID PRIMARY KEY,
        facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
        model_id UUID REFERENCES tank_models(id) ON DELETE SET NULL,
        serial_number VARCHAR(100),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Step 5: Restore data using UUID IDs
    console.log('📊 Restoring data with UUID IDs...');
    
    await pool.query(`
      -- Restore tank_models using uuid_id as new primary key
      INSERT INTO tank_models (id, manufacturer, model_name, capacity_gallons, created_at)
      SELECT uuid_id, manufacturer, model_name, capacity_gallons, created_at 
      FROM tank_models_backup;
      
      -- Restore facilities using uuid_id as new primary key  
      INSERT INTO facilities (id, name, city, state, created_at)
      SELECT uuid_id, name, city, state, created_at 
      FROM facilities_backup;
      
      -- Restore tanks using uuid_id as primary key and UUID foreign keys
      INSERT INTO tanks (id, facility_id, model_id, serial_number, created_at)
      SELECT uuid_id, facility_uuid, model_uuid, serial_number, created_at 
      FROM tanks_backup;
    `);
    
    // Step 6: Create indexes
    console.log('🔍 Creating indexes...');
    
    await pool.query(`
      CREATE INDEX idx_tanks_facility_id ON tanks(facility_id);
      CREATE INDEX idx_tanks_model_id ON tanks(model_id);
      CREATE INDEX idx_facilities_name ON facilities(name);
    `);
    
    // Step 7: Verify migration
    console.log('✅ Verifying migration...');
    
    const facilityCount = await pool.query('SELECT COUNT(*) FROM facilities');
    const tankCount = await pool.query('SELECT COUNT(*) FROM tanks');
    const modelCount = await pool.query('SELECT COUNT(*) FROM tank_models');
    
    const sampleData = await pool.query(`
      SELECT f.id as facility_uuid, f.name,
             t.id as tank_uuid, t.serial_number,
             tm.id as model_uuid, tm.manufacturer, tm.model_name
      FROM facilities f
      JOIN tanks t ON f.id = t.facility_id
      LEFT JOIN tank_models tm ON t.model_id = tm.id
      LIMIT 3;
    `);
    
    console.log(`Migration complete!`);
    console.log(`- ${facilityCount.rows[0].count} facilities`);
    console.log(`- ${tankCount.rows[0].count} tanks`);  
    console.log(`- ${modelCount.rows[0].count} tank models`);
    console.log('Sample UUIDs:');
    sampleData.rows.forEach(row => {
      console.log(`  Facility: ${row.facility_uuid} (${row.name})`);
      console.log(`  Tank: ${row.tank_uuid} (${row.serial_number})`);
      console.log(`  Model: ${row.model_uuid} (${row.manufacturer} ${row.model_name})`);
    });
    
    return {
      success: true,
      facilities: facilityCount.rows[0].count,
      tanks: tankCount.rows[0].count,
      models: modelCount.rows[0].count,
      sampleData: sampleData.rows,
      message: 'Successfully migrated to UUID primary keys'
    };
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.log('🔄 Attempting to restore from backup...');
    
    try {
      await pool.query(`
        DROP TABLE IF EXISTS tank_models, facilities, tanks;
        ALTER TABLE tank_models_backup RENAME TO tank_models;
        ALTER TABLE facilities_backup RENAME TO facilities;
        ALTER TABLE tanks_backup RENAME TO tanks;
      `);
      console.log('✅ Restored from backup');
    } catch (restoreError) {
      console.error('❌ Failed to restore from backup:', restoreError);
    }
    
    throw error;
  }
}

module.exports = { migrateToUUIDs };

// If running directly
if (require.main === module) {
  migrateToUUIDs()
    .then(result => {
      console.log('Migration result:', JSON.stringify(result, null, 2));
      process.exit(0);
    })
    .catch(error => {
      console.error('Migration failed:', error.message);
      process.exit(1);
    });
}