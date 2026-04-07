const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');

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
    
    // Read and execute the migration script
    const migrationPath = path.join(__dirname, '..', 'db', 'migrate_v1_to_v2.sql');
    
    try {
      const migrationSQL = await fs.readFile(migrationPath, 'utf8');
      console.log('📄 Migration script loaded successfully');
      
      // Execute the migration (it's wrapped in BEGIN/COMMIT)
      await client.query(migrationSQL);
      
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

module.exports = { migrateToV2Schema };