const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function migrateComprehensiveSchema() {
  console.log('🚀 Migrating to comprehensive TankID schema...');
  
  try {
    await pool.query('BEGIN');
    
    // Step 1: Expand FACILITIES table
    console.log('🏢 Expanding facilities table...');
    
    const facilityColumns = [
      'address TEXT',
      'zip VARCHAR(10)',
      'county VARCHAR(100)',
      'facility_type VARCHAR(50)',
      'owner_name TEXT',
      'ops_facility_id VARCHAR(20)',
      'company_id VARCHAR(50)',
      'first_fuel_delivery DATE',
      'financial_resp_type VARCHAR(100)',
      'state_reg_submitted DATE',
      'state_reg_confirmed DATE',
      'facility_contact_name TEXT',
      'facility_contact_phone VARCHAR(20)',
      'facility_contact_email VARCHAR(255)',
      'owner_mailing_address TEXT',
      'owner_mailing_city VARCHAR(100)',
      'owner_mailing_state VARCHAR(5)',
      'owner_mailing_zip VARCHAR(10)',
      'owner_phone VARCHAR(20)',
      'owner_cell VARCHAR(20)',
      'owner_email VARCHAR(255)'
    ];
    
    for (const columnDef of facilityColumns) {
      const columnName = columnDef.split(' ')[0];
      try {
        await pool.query(`ALTER TABLE facilities ADD COLUMN IF NOT EXISTS ${columnDef}`);
        console.log(`  ✅ Added facilities.${columnName}`);
      } catch (err) {
        console.log(`  ⚠️  facilities.${columnName} might already exist: ${err.message.substring(0, 50)}...`);
      }
    }
    
    // Step 2: Expand TANK_MODELS table  
    console.log('🛠️ Expanding tank_models table...');
    
    const modelColumns = [
      'diameter_ft DECIMAL(4,1)',
      'wall_type VARCHAR(50)',
      'material VARCHAR(100)',
      'chart_notes TEXT',
      'actual_capacity_gal INTEGER'
    ];
    
    for (const columnDef of modelColumns) {
      const columnName = columnDef.split(' ')[0];
      try {
        await pool.query(`ALTER TABLE tank_models ADD COLUMN IF NOT EXISTS ${columnDef}`);
        console.log(`  ✅ Added tank_models.${columnName}`);
      } catch (err) {
        console.log(`  ⚠️  tank_models.${columnName} might already exist: ${err.message.substring(0, 50)}...`);
      }
    }
    
    // Step 3: Expand TANKS table
    console.log('⛽ Expanding tanks table...');
    
    const tankColumns = [
      'tank_number VARCHAR(10)',
      'ops_tank_id VARCHAR(20)', 
      'fireguard_label VARCHAR(50)',
      'initial_work_date DATE',
      'tank_release_detection TEXT',
      'piping_release_detection TEXT',
      'tank_corrosion_protection TEXT',
      'piping_corrosion_protection TEXT',
      'sti_warranted_date DATE',
      'warranty_validated_date DATE',
      'warranty_validated_by TEXT'
    ];
    
    for (const columnDef of tankColumns) {
      const columnName = columnDef.split(' ')[0];
      try {
        await pool.query(`ALTER TABLE tanks ADD COLUMN IF NOT EXISTS ${columnDef}`);
        console.log(`  ✅ Added tanks.${columnName}`);
      } catch (err) {
        console.log(`  ⚠️  tanks.${columnName} might already exist: ${err.message.substring(0, 50)}...`);
      }
    }
    
    // Step 4: Create DOCUMENTS table
    console.log('📄 Creating documents table...');
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS documents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        doc_type VARCHAR(50) NOT NULL,
        original_filename VARCHAR(255) NOT NULL,
        file_path TEXT,
        linked_tanks TEXT[], -- Array of tank IDs/ops_tank_ids
        file_size INTEGER,
        mime_type VARCHAR(100),
        upload_date TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('  ✅ Created documents table');
    
    // Step 5: Create indexes for performance
    console.log('📇 Creating indexes...');
    
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_facilities_ops_facility_id ON facilities(ops_facility_id)',
      'CREATE INDEX IF NOT EXISTS idx_tanks_ops_tank_id ON tanks(ops_tank_id)',
      'CREATE INDEX IF NOT EXISTS idx_documents_doc_type ON documents(doc_type)',
      'CREATE INDEX IF NOT EXISTS idx_documents_linked_tanks ON documents USING GIN(linked_tanks)'
    ];
    
    for (const indexSQL of indexes) {
      try {
        await pool.query(indexSQL);
        console.log(`  ✅ Created index: ${indexSQL.match(/idx_\w+/)[0]}`);
      } catch (err) {
        console.log(`  ⚠️  Index might already exist: ${err.message.substring(0, 50)}...`);
      }
    }
    
    await pool.query('COMMIT');
    console.log('✅ Comprehensive schema migration completed successfully!');
    
    // Verify the new schema
    const facilityColumns_check = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'facilities' AND table_schema = 'public'
      ORDER BY ordinal_position;
    `);
    
    const tankColumns_check = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'tanks' AND table_schema = 'public'
      ORDER BY ordinal_position;
    `);
    
    console.log('\n📋 Updated Schema Summary:');
    console.log(`🏢 Facilities: ${facilityColumns_check.rows.length} columns`);
    console.log(`⛽ Tanks: ${tankColumns_check.rows.length} columns`);
    console.log('📄 Documents: New table created');
    
    return {
      success: true,
      message: 'Comprehensive schema migration completed',
      facilityColumns: facilityColumns_check.rows.length,
      tankColumns: tankColumns_check.rows.length,
      documentsTableCreated: true
    };
    
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('❌ Error in comprehensive schema migration:', error);
    throw error;
  }
}

module.exports = { migrateComprehensiveSchema };