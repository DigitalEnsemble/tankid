const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function simpleComprehensiveMigration() {
  console.log('🚀 Running simple comprehensive migration...');
  
  try {
    await pool.query('BEGIN');
    
    // Step 1: Add essential facility columns one by one
    console.log('🏢 Adding essential facility columns...');
    
    const facilityColumns = [
      'address TEXT',
      'zip VARCHAR(10)',
      'facility_type VARCHAR(50)',
      'owner_name TEXT',
      'ops_facility_id VARCHAR(20)'
    ];
    
    for (const columnDef of facilityColumns) {
      const columnName = columnDef.split(' ')[0];
      try {
        const checkColumn = await pool.query(`
          SELECT column_name FROM information_schema.columns 
          WHERE table_name = 'facilities' AND column_name = $1
        `, [columnName]);
        
        if (checkColumn.rows.length === 0) {
          await pool.query(`ALTER TABLE facilities ADD COLUMN ${columnDef}`);
          console.log(`  ✅ Added facilities.${columnName}`);
        } else {
          console.log(`  ⚠️  facilities.${columnName} already exists`);
        }
      } catch (err) {
        console.log(`  ❌ Error adding facilities.${columnName}: ${err.message}`);
      }
    }
    
    // Step 2: Add essential tank columns
    console.log('⛽ Adding essential tank columns...');
    
    const tankColumns = [
      'tank_number VARCHAR(10)',
      'ops_tank_id VARCHAR(20)',
      'fireguard_label VARCHAR(50)',
      'initial_work_date DATE'
    ];
    
    for (const columnDef of tankColumns) {
      const columnName = columnDef.split(' ')[0];
      try {
        const checkColumn = await pool.query(`
          SELECT column_name FROM information_schema.columns 
          WHERE table_name = 'tanks' AND column_name = $1
        `, [columnName]);
        
        if (checkColumn.rows.length === 0) {
          await pool.query(`ALTER TABLE tanks ADD COLUMN ${columnDef}`);
          console.log(`  ✅ Added tanks.${columnName}`);
        } else {
          console.log(`  ⚠️  tanks.${columnName} already exists`);
        }
      } catch (err) {
        console.log(`  ❌ Error adding tanks.${columnName}: ${err.message}`);
      }
    }
    
    await pool.query('COMMIT');
    console.log('✅ Simple comprehensive migration completed!');
    
    return {
      success: true,
      message: 'Simple comprehensive migration completed'
    };
    
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('❌ Error in simple comprehensive migration:', error);
    throw error;
  }
}

module.exports = { simpleComprehensiveMigration };