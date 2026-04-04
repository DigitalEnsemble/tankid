const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function addComprehensiveTanks() {
  console.log('⛽ Adding comprehensive tanks to 1643 facility...');
  
  try {
    await pool.query('BEGIN');
    
    // Get the 1643 facility ID
    const facilityResult = await pool.query(`
      SELECT id FROM facilities WHERE ops_facility_id = '1643'
    `);
    
    if (facilityResult.rows.length === 0) {
      throw new Error('1643 facility not found');
    }
    
    const facilityId = facilityResult.rows[0].id;
    console.log(`✅ Found 1643 facility: ${facilityId}`);
    
    // Get or create Eaton Metals tank model
    let tankModelResult = await pool.query(`
      SELECT id FROM tank_models WHERE manufacturer = 'Eaton Metals' AND model_name = 'Fireguard 12000'
    `);
    
    let tankModelId;
    if (tankModelResult.rows.length === 0) {
      const newModel = await pool.query(`
        INSERT INTO tank_models (manufacturer, model_name, capacity_gallons, created_at, updated_at)
        VALUES ('Eaton Metals', 'Fireguard 12000', 12000, NOW(), NOW())
        RETURNING id;
      `);
      tankModelId = newModel.rows[0].id;
      console.log('✅ Created Eaton Metals Fireguard 12000 tank model');
    } else {
      tankModelId = tankModelResult.rows[0].id;
      console.log('✅ Found existing Eaton Metals tank model');
    }
    
    // Clear any existing tanks for this facility
    await pool.query('DELETE FROM tanks WHERE facility_id = $1', [facilityId]);
    console.log('🧹 Cleared existing tanks');
    
    // Add 4 comprehensive jet fuel tanks
    const tanks = [
      {
        tank_number: '4',
        serial_number: 'Unknown',
        product_grade: 'Jet Fuel'
      },
      {
        tank_number: '5',
        serial_number: 'Unknown',
        product_grade: 'Jet Fuel'
      },
      {
        tank_number: '6',
        serial_number: '204030-51304',
        product_grade: 'Jet Fuel'
      },
      {
        tank_number: '7',
        serial_number: '204031-51305',
        product_grade: 'Jet Fuel'
      }
    ];
    
    for (const tank of tanks) {
      const newTank = await pool.query(`
        INSERT INTO tanks (
          id, tank_number, serial_number, facility_id, model_id, product_grade, 
          install_date, install_contractor, access_level, created_at, updated_at
        ) VALUES (
          gen_random_uuid(), $1, $2, $3, $4, $5, '2025-03-07', 'UST Installer Inc.', 'public', NOW(), NOW()
        ) RETURNING id, tank_number;
      `, [
        tank.tank_number, tank.serial_number, facilityId, tankModelId, tank.product_grade
      ]);
      
      console.log(`✅ Added tank ${tank.tank_number}: ${tank.product_grade} (Serial: ${tank.serial_number})`);
    }
    
    await pool.query('COMMIT');
    
    // Verification
    const verification = await pool.query(`
      SELECT 
        t.tank_number, t.serial_number, t.product_grade,
        m.manufacturer, m.model_name, m.capacity_gallons
      FROM tanks t
      JOIN tank_models m ON t.model_id = m.id
      WHERE t.facility_id = $1
      ORDER BY t.tank_number;
    `, [facilityId]);
    
    console.log('\\n🎉 Comprehensive tanks added successfully!');
    console.log('\\n📋 Tank Summary:');
    verification.rows.forEach(tank => {
      console.log(`   Tank ${tank.tank_number}: ${tank.product_grade}`);
      console.log(`     ${tank.manufacturer} ${tank.model_name} (${tank.capacity_gallons} gal)`);
      console.log(`     Serial: ${tank.serial_number}`);
      console.log('');
    });
    
    return {
      success: true,
      message: 'Comprehensive tanks added successfully',
      tanks: verification.rows
    };
    
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('❌ Error adding comprehensive tanks:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  addComprehensiveTanks().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { addComprehensiveTanks };