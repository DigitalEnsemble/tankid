const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function quickFix1643() {
  console.log('🔧 Quick fix for 1643 facility...');
  
  try {
    await pool.query('BEGIN');
    
    // Step 1: Add ops_facility_id column if it doesn't exist
    try {
      await pool.query('ALTER TABLE facilities ADD COLUMN ops_facility_id VARCHAR(20)');
      console.log('✅ Added ops_facility_id column');
    } catch (err) {
      console.log('⚠️  ops_facility_id column already exists');
    }
    
    // Step 2: Update the Denver facility to be our 1643 facility
    const updateResult = await pool.query(`
      UPDATE facilities SET 
        name = $1,
        ops_facility_id = $2,
        updated_at = NOW()
      WHERE city = 'Denver' OR name LIKE '%Generic%' OR name LIKE '%Denver%'
      RETURNING id, name, ops_facility_id;
    `, [
      'Generic Maintenance Support Center - Fueling Island',
      '1643'
    ]);
    
    if (updateResult.rows.length > 0) {
      const facility = updateResult.rows[0];
      console.log(`✅ Updated facility: ${facility.name} (ops_facility_id: ${facility.ops_facility_id})`);
      
      // Step 3: Add tank_number column if it doesn't exist
      try {
        await pool.query('ALTER TABLE tanks ADD COLUMN tank_number VARCHAR(10)');
        console.log('✅ Added tank_number column');
      } catch (err) {
        console.log('⚠️  tank_number column already exists');
      }
      
      // Step 4: Update existing tanks to have proper tank numbers
      await pool.query(`
        UPDATE tanks SET 
          tank_number = '1',
          updated_at = NOW()
        WHERE facility_id = $1 AND tank_number IS NULL
      `, [facility.id]);
      
      console.log('✅ Updated tank numbers');
      
    } else {
      console.log('❌ No Denver facility found to update');
    }
    
    await pool.query('COMMIT');
    console.log('✅ Quick fix completed!');
    
    return { success: true };
    
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('❌ Error in quick fix:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  quickFix1643().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { quickFix1643 };