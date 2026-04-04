const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function loadTankIDSeedData() {
  console.log('🚀 Starting TankID seed data load...');
  
  try {
    // Step 1: Check existing data first
    console.log('🔍 Checking existing data...');
    
    const existingFacilities = await pool.query('SELECT * FROM facilities LIMIT 5');
    const existingModels = await pool.query('SELECT * FROM tank_models LIMIT 5');  
    const existingTanks = await pool.query('SELECT * FROM tanks LIMIT 5');
    
    console.log(`Found: ${existingFacilities.rows.length} facilities, ${existingModels.rows.length} models, ${existingTanks.rows.length} tanks`);
    
    // If there's already data, just return what exists
    if (existingFacilities.rows.length > 0 && existingTanks.rows.length > 0) {
      console.log('ℹ️  Data already exists. Returning existing data...');
      
      const facilityData = await pool.query(`
        SELECT f.id, f.name, f.city, f.state,
               COUNT(t.id) as tank_count
        FROM facilities f
        LEFT JOIN tanks t ON f.id = t.facility_id
        GROUP BY f.id, f.name, f.city, f.state
        LIMIT 1;
      `);
      
      const tankData = await pool.query(`
        SELECT t.id, t.serial_number, tm.manufacturer, tm.model_name, tm.capacity_gallons,
               f.name as facility_name
        FROM tanks t
        LEFT JOIN tank_models tm ON t.model_id = tm.id
        JOIN facilities f ON t.facility_id = f.id
        LIMIT 10;
      `);
      
      console.log('Existing facility:', facilityData.rows[0]);
      console.log('Existing tanks:');
      tankData.rows.forEach(tank => {
        console.log(`  ${tank.serial_number || 'No serial'}: ${tank.manufacturer || 'Unknown'} ${tank.model_name || 'model'} at ${tank.facility_name}`);
      });
      
      return {
        success: true,
        existed: true,
        facilityId: facilityData.rows[0]?.id,
        tanks: tankData.rows,
        facility: facilityData.rows[0],
        message: `Found existing data: ${existingFacilities.rows.length} facilities, ${existingTanks.rows.length} tanks`
      };
    }
    
    // If no data exists, proceed with inserting seed data
    console.log('📦 No existing data found. Creating seed data...');
    
    // Step 2: Insert tank model
    const modelResult = await pool.query(`
      INSERT INTO tank_models (manufacturer, model_name, capacity_gallons)
      VALUES ('Eaton Metals', 'Fireguard 12000', 12000)
      RETURNING id;
    `);
    const eatonModelId = modelResult.rows[0].id;
    console.log(`✅ Tank model created: ${eatonModelId}`);

    // Step 3: Insert facility
    const facilityResult = await pool.query(`
      INSERT INTO facilities (name, city, state)
      VALUES ('Generic Maintenance Support Center - Fueling Island', 'Denver', 'CO')
      RETURNING id;
    `);
    const facilityId = facilityResult.rows[0].id;
    console.log(`✅ Facility created: ${facilityId}`);

    // Step 4: Insert tanks (let PostgreSQL auto-generate UUIDs)
    const tankSerials = ['Tank-4', 'Tank-5', '204030-51304', '204031-51305'];
    const tankIds = [];

    for (const serial of tankSerials) {
      const tankResult = await pool.query(`
        INSERT INTO tanks (facility_id, model_id, serial_number)
        VALUES ($1, $2, $3)
        RETURNING id;
      `, [facilityId, eatonModelId, serial]);
      
      tankIds.push(tankResult.rows[0].id);
      console.log(`✅ Tank ${serial} created: ${tankResult.rows[0].id}`);
    }

    console.log('🎉 TankID seed data created successfully!');
    console.log(`Test your API with facility UUID: ${facilityId}`);
    
    return {
      success: true,
      created: true,
      facilityId,
      eatonModelId,
      tankIds,
      message: 'TankID seed data created successfully'
    };

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Full error:', error);
    throw error;
  }
}

module.exports = { loadTankIDSeedData };

// If running directly
if (require.main === module) {
  loadTankIDSeedData()
    .then(result => {
      console.log('Result:', JSON.stringify(result, null, 2));
      process.exit(0);
    })
    .catch(error => {
      console.error('Failed:', error.message);
      process.exit(1);
    });
}