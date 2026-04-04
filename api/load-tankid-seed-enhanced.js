const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function loadEnhancedTankIDSeedData() {
  console.log('🚀 Loading enhanced TankID seed data...');
  
  try {
    await pool.query('BEGIN');
    
    // Step 1: Enhanced Facilities
    console.log('🏢 Creating enhanced facilities...');
    
    const facilityInsert = `
      INSERT INTO facilities (id, name, address, city, state, zip, created_at, updated_at) VALUES 
      ('defbe304-0b20-4832-9985-2d2df0946e64', 'Test Gas Station', '1234 Main Street', 'Anytown', 'TX', '75001', NOW(), NOW())
      ON CONFLICT (id) DO NOTHING;
    `;
    await pool.query(facilityInsert);
    
    // Step 2: Enhanced Tank Models with comprehensive specs
    console.log('🛠️ Creating enhanced tank models...');
    
    const modelInsert = `
      INSERT INTO tank_models (id, manufacturer, model_name, capacity_gallons, actual_capacity_gal, diameter_ft, wall_type, material, chart_notes, created_at, updated_at) VALUES 
      (gen_random_uuid(), 'Xerxes', 'FRP-2000', 10000, 9850, 8.0, 'Double Wall', 'Fiberglass Reinforced Plastic', 'Calibrated for unleaded gasoline at 60°F', NOW(), NOW()),
      (gen_random_uuid(), 'CSI', 'UL-8000', 8000, 7920, 7.5, 'Double Wall', 'Steel with FRP Coating', 'Premium unleaded specification', NOW(), NOW()),
      (gen_random_uuid(), 'Highland Tank', 'UL-6000', 6000, 5940, 7.0, 'Double Wall', 'Steel Composite', 'Diesel fuel compatible', NOW(), NOW())
      ON CONFLICT DO NOTHING;
    `;
    await pool.query(modelInsert);
    
    // Get model IDs for tank insertion
    const models = await pool.query('SELECT id, model_name, capacity_gallons FROM tank_models ORDER BY capacity_gallons DESC LIMIT 3');
    
    if (models.rows.length < 3) {
      throw new Error('Tank models not created properly');
    }
    
    // Step 3: Enhanced Tanks with detailed specifications
    console.log('⛽ Creating enhanced tanks...');
    
    const tanksInsert = `
      INSERT INTO tanks (
        id, serial_number, facility_id, model_id,
        install_depth_inches, install_date, install_contractor,
        atg_brand, atg_model, atg_last_calibration,
        product_grade, octane, ethanol_pct, access_level,
        created_at, updated_at
      ) VALUES 
      (
        '84db4c98-e625-4429-928e-268655d8503c', 
        'ABC123456', 
        'defbe304-0b20-4832-9985-2d2df0946e64',
        $1,
        96, 
        '2023-03-15', 
        'Petroleum Systems Inc',
        'Veeder-Root', 
        'TLS-350', 
        '2024-01-15',
        'Regular Unleaded', 
        87, 
        10, 
        'Public',
        NOW(), 
        NOW()
      ),
      (
        'eb1f77c9-19c1-47d9-8968-cc76aa67757e', 
        'DEF789012', 
        'defbe304-0b20-4832-9985-2d2df0946e64',
        $2,
        84, 
        '2023-03-15', 
        'Petroleum Systems Inc',
        'Veeder-Root', 
        'TLS-350', 
        '2024-01-15',
        'Premium Unleaded', 
        93, 
        10, 
        'Public',
        NOW(), 
        NOW()
      ),
      (
        '21b3306b-ccbb-4fa3-b6ca-a08894648e48', 
        'GHI345678', 
        'defbe304-0b20-4832-9985-2d2df0946e64',
        $3,
        72, 
        '2023-03-15', 
        'Petroleum Systems Inc',
        'Veeder-Root', 
        'TLS-350', 
        '2024-01-15',
        'Diesel #2', 
        null, 
        null, 
        'Public',
        NOW(), 
        NOW()
      )
      ON CONFLICT (id) DO NOTHING;
    `;
    
    await pool.query(tanksInsert, [models.rows[0].id, models.rows[1].id, models.rows[2].id]);
    
    await pool.query('COMMIT');
    
    // Verify the data
    const verification = await pool.query(`
      SELECT 
        t.id, t.serial_number, t.product_grade, t.octane, t.install_date, t.install_contractor,
        tm.manufacturer, tm.model_name, tm.capacity_gallons, tm.diameter_ft, tm.wall_type, tm.material,
        f.name as facility_name, f.address, f.city, f.state, f.zip
      FROM tanks t
      JOIN tank_models tm ON t.model_id = tm.id
      JOIN facilities f ON t.facility_id = f.id
      ORDER BY t.serial_number;
    `);
    
    console.log('✅ Enhanced seed data loaded successfully!');
    console.log(`Created ${verification.rows.length} tanks with full specifications:`);
    
    verification.rows.forEach(tank => {
      console.log(`  🛢️  ${tank.serial_number}: ${tank.product_grade} ${tank.octane ? tank.octane + ' octane' : ''}`);
      console.log(`      ${tank.manufacturer} ${tank.model_name} (${tank.capacity_gallons} gal, ${tank.diameter_ft}ft)`);
      console.log(`      Installed: ${tank.install_date} by ${tank.install_contractor}`);
      console.log(`      ${tank.wall_type} ${tank.material}`);
      console.log('');
    });
    
    return {
      success: true,
      message: 'Enhanced tank data loaded successfully',
      tanks: verification.rows.map(tank => ({
        id: tank.id,
        serial_number: tank.serial_number,
        product_grade: tank.product_grade,
        octane: tank.octane,
        manufacturer: tank.manufacturer,
        model_name: tank.model_name,
        capacity_gallons: tank.capacity_gallons,
        install_date: tank.install_date,
        install_contractor: tank.install_contractor
      }))
    };
    
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('❌ Error loading enhanced seed data:', error);
    throw error;
  }
}

module.exports = { loadEnhancedTankIDSeedData };