const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function loadSimpleComprehensive() {
  console.log('🚀 Loading simple comprehensive data...');
  
  try {
    await pool.query('BEGIN');
    
    // Step 1: Update existing facilities with essential info
    console.log('🏢 Updating facility with comprehensive info...');
    
    // Find and update the existing facility 
    const facilityUpdate = await pool.query(`
      UPDATE facilities SET 
        name = $1,
        address = $2,
        city = $3,
        state = $4,
        zip = $5,
        facility_type = $6,
        owner_name = $7,
        ops_facility_id = $8,
        updated_at = NOW()
      WHERE city = 'Chicago' OR city = 'Denver' OR name LIKE '%Distribution%' OR name LIKE '%Generic%'
      RETURNING id, name;
    `, [
      'Generic Maintenance Support Center - Fueling Island',
      '12345 Facility Drive',
      'Denver',
      'CO',
      '80200',
      'airport',
      'Generic Aviation Department',
      '1643'
    ]);
    
    let facilityId;
    if (facilityUpdate.rows.length > 0) {
      facilityId = facilityUpdate.rows[0].id;
      console.log(`  ✅ Updated facility: ${facilityUpdate.rows[0].name} (${facilityId})`);
    } else {
      // Create new facility
      const newFacility = await pool.query(`
        INSERT INTO facilities (
          name, address, city, state, zip, facility_type, owner_name, ops_facility_id, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW()
        ) RETURNING id, name;
      `, [
        'Generic Maintenance Support Center - Fueling Island',
        '12345 Facility Drive',
        'Denver',
        'CO',
        '80200',
        'airport',
        'Generic Aviation Department',
        '1643'
      ]);
      facilityId = newFacility.rows[0].id;
      console.log(`  ✅ Created facility: ${newFacility.rows[0].name} (${facilityId})`);
    }
    
    // Step 2: Clear existing tanks and create comprehensive jet fuel tanks
    console.log('⛽ Clearing old tanks and creating jet fuel tanks...');
    
    await pool.query('DELETE FROM tanks WHERE facility_id = $1', [facilityId]);
    
    // Create Eaton Metals tank model if it doesn't exist
    const tankModelResult = await pool.query(`
      SELECT id FROM tank_models WHERE manufacturer = 'Eaton Metals' AND model_name = 'Fireguard 12000'
    `);
    
    let tankModelId;
    if (tankModelResult.rows.length > 0) {
      tankModelId = tankModelResult.rows[0].id;
    } else {
      const newModel = await pool.query(`
        INSERT INTO tank_models (manufacturer, model_name, capacity_gallons, created_at, updated_at)
        VALUES ('Eaton Metals', 'Fireguard 12000', 12000, NOW(), NOW())
        RETURNING id;
      `);
      tankModelId = newModel.rows[0].id;
    }
    
    // Create 4 comprehensive jet fuel tanks
    const tanks = [
      {
        tank_number: '4',
        ops_tank_id: '1643-4',
        serial_number: 'Unknown',
        fireguard_label: 'Unknown',
        product_grade: 'Jet Fuel',
        install_date: '2025-03-07',
        initial_work_date: '2024-10-28',
        install_contractor: 'UST Installer Inc.'
      },
      {
        tank_number: '5',
        ops_tank_id: '1643-5',
        serial_number: 'Unknown',
        fireguard_label: 'Unknown',
        product_grade: 'Jet Fuel',
        install_date: '2025-03-07',
        initial_work_date: '2024-10-28',
        install_contractor: 'UST Installer Inc.'
      },
      {
        tank_number: '6',
        ops_tank_id: '1643-6',
        serial_number: '204030-51304',
        fireguard_label: '204030-51304',
        product_grade: 'Jet Fuel',
        install_date: '2025-03-07',
        initial_work_date: '2024-10-28',
        install_contractor: 'UST Installer Inc.'
      },
      {
        tank_number: '7',
        ops_tank_id: '1643-7',
        serial_number: '204031-51305',
        fireguard_label: '204031-51305',
        product_grade: 'Jet Fuel',
        install_date: '2025-03-07',
        initial_work_date: '2024-10-28',
        install_contractor: 'UST Installer Inc.'
      }
    ];\n    \n    for (const tank of tanks) {\n      const newTank = await pool.query(`\n        INSERT INTO tanks (\n          tank_number, ops_tank_id, serial_number, fireguard_label,\n          facility_id, model_id, product_grade, install_date, initial_work_date,\n          install_contractor, access_level, created_at, updated_at\n        ) VALUES (\n          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'public', NOW(), NOW()\n        ) RETURNING id, ops_tank_id;\n      `, [\n        tank.tank_number, tank.ops_tank_id, tank.serial_number, tank.fireguard_label,\n        facilityId, tankModelId, tank.product_grade, tank.install_date,\n        tank.initial_work_date, tank.install_contractor\n      ]);\n      \n      console.log(`  ✅ Created tank: ${newTank.rows[0].ops_tank_id} (${tank.product_grade})`);\n    }\n    \n    await pool.query('COMMIT');\n    \n    // Verification\n    const verification = await pool.query(`\n      SELECT \n        f.name as facility_name, f.ops_facility_id, f.city, f.state, f.facility_type,\n        COUNT(t.id) as tank_count\n      FROM facilities f\n      LEFT JOIN tanks t ON f.id = t.facility_id\n      WHERE f.id = $1\n      GROUP BY f.id, f.name, f.ops_facility_id, f.city, f.state, f.facility_type;\n    `, [facilityId]);\n    \n    const tanks_details = await pool.query(`\n      SELECT t.ops_tank_id, t.product_grade, t.serial_number, m.manufacturer, m.model_name\n      FROM tanks t\n      JOIN tank_models m ON t.model_id = m.id\n      WHERE t.facility_id = $1\n      ORDER BY t.tank_number;\n    `, [facilityId]);\n    \n    console.log('✅ Simple comprehensive data loading completed!');\n    console.log('\\n📋 Loaded Data Summary:');\n    \n    if (verification.rows.length > 0) {\n      const facility = verification.rows[0];\n      console.log(`🏢 Facility: ${facility.facility_name}`);\n      console.log(`📍 Location: ${facility.city}, ${facility.state}`);\n      console.log(`🏷️  Type: ${facility.facility_type}`);\n      console.log(`⛽ Tanks: ${facility.tank_count}`);\n      console.log('\\n🛢️  Tank Details:');\n      tanks_details.rows.forEach(tank => {\n        console.log(`   ${tank.ops_tank_id}: ${tank.product_grade} (${tank.manufacturer} ${tank.model_name})`);\n        console.log(`     Serial: ${tank.serial_number}`);\n      });\n    }\n    \n    return {\n      success: true,\n      message: 'Simple comprehensive data loaded successfully',\n      facility: verification.rows[0] || null,\n      tanks: tanks_details.rows\n    };\n    \n  } catch (error) {\n    await pool.query('ROLLBACK');\n    console.error('❌ Error loading simple comprehensive data:', error);\n    throw error;\n  }\n}\n\nmodule.exports = { loadSimpleComprehensive };