const { Pool } = require('pg');

// Use the same database connection as the API
const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function loadSampleData() {
  const client = await pool.connect();
  
  try {
    console.log('Connected to database');
    
    // Insert sample facility
    const facilityId = '00000000-0000-0000-0000-000000000000';
    await client.query(`
      INSERT INTO facilities (id, name, address, city, state, zip, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        address = EXCLUDED.address,
        city = EXCLUDED.city,
        state = EXCLUDED.state,
        zip = EXCLUDED.zip,
        updated_at = NOW()
    `, [facilityId, 'Test Gas Station', '123 Main Street', 'Anytown', 'TX', '75001']);
    
    console.log('✅ Facility inserted');
    
    // Insert sample tank model
    const tankModelId = 'aaaa0000-bbbb-1111-cccc-222222222222';
    await client.query(`
      INSERT INTO tank_models (id, manufacturer, model_name, nominal_capacity_gal, actual_capacity_gal, diameter_ft, wall_type, material, chart_notes, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET
        manufacturer = EXCLUDED.manufacturer,
        model_name = EXCLUDED.model_name,
        nominal_capacity_gal = EXCLUDED.nominal_capacity_gal,
        actual_capacity_gal = EXCLUDED.actual_capacity_gal,
        diameter_ft = EXCLUDED.diameter_ft,
        wall_type = EXCLUDED.wall_type,
        material = EXCLUDED.material,
        chart_notes = EXCLUDED.chart_notes,
        updated_at = NOW()
    `, [tankModelId, 'Xerxes', 'FRP-2000', 10000, 9850, 10, 'Double Wall', 'Fiberglass', 'Calibrated to bottom of tank']);
    
    console.log('✅ Tank model inserted');
    
    // Insert sample tanks
    const tanks = [
      {
        id: '11111111-1111-1111-1111-111111111111',
        tank_number: '1',
        serial_number: 'ABC123456',
        product_grade: 'Regular Unleaded',
        octane: 87,
        ethanol_pct: 10
      },
      {
        id: '22222222-2222-2222-2222-222222222222',
        tank_number: '2', 
        serial_number: 'DEF789012',
        product_grade: 'Mid-Grade',
        octane: 89,
        ethanol_pct: 10
      },
      {
        id: '33333333-3333-3333-3333-333333333333',
        tank_number: '3',
        serial_number: 'GHI345678', 
        product_grade: 'Premium',
        octane: 93,
        ethanol_pct: 10
      }
    ];
    
    for (const tank of tanks) {
      await client.query(`
        INSERT INTO tanks (
          id, facility_id, tank_model_id, tank_number, serial_number, 
          install_depth_inches, install_date, install_contractor,
          atg_brand, atg_model, atg_last_calibration,
          product_grade, octane, ethanol_pct, access_level, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET
          facility_id = EXCLUDED.facility_id,
          tank_model_id = EXCLUDED.tank_model_id,
          tank_number = EXCLUDED.tank_number,
          serial_number = EXCLUDED.serial_number,
          install_depth_inches = EXCLUDED.install_depth_inches,
          install_date = EXCLUDED.install_date,
          install_contractor = EXCLUDED.install_contractor,
          atg_brand = EXCLUDED.atg_brand,
          atg_model = EXCLUDED.atg_model,
          atg_last_calibration = EXCLUDED.atg_last_calibration,
          product_grade = EXCLUDED.product_grade,
          octane = EXCLUDED.octane,
          ethanol_pct = EXCLUDED.ethanol_pct,
          access_level = EXCLUDED.access_level,
          updated_at = NOW()
      `, [
        tank.id, facilityId, tankModelId, tank.tank_number, tank.serial_number,
        72, '2020-03-15', 'Tank Pro Services',
        'Veeder-Root', 'TLS-350', '2023-06-15',
        tank.product_grade, tank.octane, tank.ethanol_pct, 'public'
      ]);
    }
    
    console.log('✅ Tanks inserted');
    
    // Insert sample chart readings
    const chartData = [
      { dipstick_in: 0, gallons: 0 },
      { dipstick_in: 6, gallons: 750 },
      { dipstick_in: 12, gallons: 1500 },
      { dipstick_in: 18, gallons: 2250 },
      { dipstick_in: 24, gallons: 3000 },
      { dipstick_in: 30, gallons: 3750 },
      { dipstick_in: 36, gallons: 4500 },
      { dipstick_in: 42, gallons: 5250 },
      { dipstick_in: 48, gallons: 6000 },
      { dipstick_in: 54, gallons: 6750 },
      { dipstick_in: 60, gallons: 7500 },
      { dipstick_in: 66, gallons: 8250 },
      { dipstick_in: 72, gallons: 9000 },
      { dipstick_in: 78, gallons: 9500 },
      { dipstick_in: 84, gallons: 9800 },
      { dipstick_in: 90, gallons: 9950 }
    ];
    
    for (const reading of chartData) {
      await client.query(`
        INSERT INTO tank_chart_readings (tank_model_id, dipstick_in, gallons, created_at, updated_at)
        VALUES ($1, $2, $3, NOW(), NOW())
        ON CONFLICT (tank_model_id, dipstick_in) DO UPDATE SET
          gallons = EXCLUDED.gallons,
          updated_at = NOW()
      `, [tankModelId, reading.dipstick_in, reading.gallons]);
    }
    
    console.log('✅ Chart readings inserted');
    console.log('\n🎉 Sample data loaded successfully!');
    console.log('\nTest URLs:');
    console.log('- Facility: https://tankid-api.fly.dev/facility/00000000-0000-0000-0000-000000000000');
    console.log('- Tank: https://tankid-api.fly.dev/tank/11111111-1111-1111-1111-111111111111');
    
  } catch (err) {
    console.error('Error loading sample data:', err);
  } finally {
    client.release();
    pool.end();
  }
}

loadSampleData();