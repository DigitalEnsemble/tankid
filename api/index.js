const express = require('express');
const { Pool } = require('pg');

const app = express();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Add CORS middleware for local development
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

// Load sample data using integer IDs
app.get('/load-sample-data', async (req, res) => {
  try {
    // Insert sample facility
    await pool.query(`
      INSERT INTO facilities (id, name, city, state, created_at)
      VALUES ($1, $2, $3, $4, NOW())
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        city = EXCLUDED.city,
        state = EXCLUDED.state
    `, [1, 'Test Gas Station', 'Anytown', 'TX']);
    
    // Insert sample tank model
    await pool.query(`
      INSERT INTO tank_models (id, manufacturer, model_name, capacity_gallons, created_at)
      VALUES ($1, $2, $3, $4, NOW())
      ON CONFLICT (id) DO UPDATE SET
        manufacturer = EXCLUDED.manufacturer,
        model_name = EXCLUDED.model_name,
        capacity_gallons = EXCLUDED.capacity_gallons
    `, [1, 'Xerxes', 'FRP-2000', 10000]);
    
    // Insert sample tanks
    const tanks = [
      { id: 1, serial_number: 'ABC123456' },
      { id: 2, serial_number: 'DEF789012' },
      { id: 3, serial_number: 'GHI345678' }
    ];
    
    for (const tank of tanks) {
      await pool.query(`
        INSERT INTO tanks (id, facility_id, model_id, serial_number, created_at)
        VALUES ($1, $2, $3, $4, NOW())
        ON CONFLICT (id) DO UPDATE SET
          facility_id = EXCLUDED.facility_id,
          model_id = EXCLUDED.model_id,
          serial_number = EXCLUDED.serial_number
      `, [tank.id, 1, 1, tank.serial_number]);
    }
    
    // Insert sample chart readings for tank 1
    const chartData = [
      { height_inches: 0, volume_gallons: 0 },
      { height_inches: 6, volume_gallons: 750 },
      { height_inches: 12, volume_gallons: 1500 },
      { height_inches: 18, volume_gallons: 2250 },
      { height_inches: 24, volume_gallons: 3000 },
      { height_inches: 30, volume_gallons: 3750 },
      { height_inches: 36, volume_gallons: 4500 },
      { height_inches: 42, volume_gallons: 5250 },
      { height_inches: 48, volume_gallons: 6000 },
      { height_inches: 54, volume_gallons: 6750 },
      { height_inches: 60, volume_gallons: 7500 },
      { height_inches: 66, volume_gallons: 8250 },
      { height_inches: 72, volume_gallons: 9000 },
      { height_inches: 78, volume_gallons: 9500 },
      { height_inches: 84, volume_gallons: 9800 },
      { height_inches: 90, volume_gallons: 9950 }
    ];
    
    for (const reading of chartData) {
      await pool.query(`
        INSERT INTO tank_chart_readings (tank_id, height_inches, volume_gallons, created_at)
        VALUES ($1, $2, $3, NOW())
        ON CONFLICT (tank_id, height_inches) DO UPDATE SET
          volume_gallons = EXCLUDED.volume_gallons
      `, [1, reading.height_inches, reading.volume_gallons]);
    }
    
    res.json({ 
      success: true, 
      message: 'Sample data loaded successfully!',
      facility_url: '/facility/1',
      tank_url: '/tank/1',
      note: 'Database uses integer IDs, not UUIDs'
    });
    
  } catch (err) {
    console.error('Error loading sample data:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'tankid-api' });
});

app.get('/facility/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const facilityId = parseInt(id);
    
    if (isNaN(facilityId)) {
      return res.status(400).json({ error: 'Invalid facility ID format' });
    }
    
    const fac = await pool.query('SELECT * FROM facilities WHERE id = $1', [facilityId]);
    if (fac.rows.length === 0) {
      return res.status(404).json({ error: 'Facility not found' });
    }
    
    const tanks = await pool.query(`
      SELECT t.id, t.serial_number, m.manufacturer, m.model_name, m.capacity_gallons
      FROM tanks t
      LEFT JOIN tank_models m ON m.id = t.model_id
      WHERE t.facility_id = $1 ORDER BY t.id ASC
    `, [facilityId]);
    
    // Format response to match frontend expectations
    const facility = {
      id: fac.rows[0].id,
      name: fac.rows[0].name,
      city: fac.rows[0].city,
      state: fac.rows[0].state
    };
    
    const tanksFormatted = tanks.rows.map(t => ({
      id: t.id,
      tank_number: t.id.toString(),
      serial_number: t.serial_number,
      product_grade: `Tank ${t.id}`, // Simple labeling
      manufacturer: t.manufacturer,
      model_name: t.model_name,
      nominal_capacity_gal: t.capacity_gallons,
      access_level: 'public'
    }));
    
    res.json({ facility, tanks: tanksFormatted });
  } catch (err) { 
    console.error(err.message); 
    res.status(500).json({ error: 'Internal server error' }); 
  }
});

app.get('/tank/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const tankId = parseInt(id);
    
    if (isNaN(tankId)) {
      return res.status(400).json({ error: 'Invalid tank ID format' });
    }

    const t = await pool.query(`
      SELECT t.id, t.serial_number, t.facility_id,
             f.name AS facility_name, f.city, f.state,
             m.manufacturer, m.model_name, m.capacity_gallons
      FROM tanks t
      JOIN facilities f ON f.id = t.facility_id
      LEFT JOIN tank_models m ON m.id = t.model_id
      WHERE t.id = $1
    `, [tankId]);
    
    if (t.rows.length === 0) {
      return res.status(404).json({ error: 'Tank not found' });
    }
    
    const tankRow = t.rows[0];
    
    // Format tank data to match frontend expectations
    const tank = {
      id: tankRow.id,
      tank_number: tankRow.id.toString(),
      serial_number: tankRow.serial_number,
      facility_id: tankRow.facility_id,
      facility_name: tankRow.facility_name,
      city: tankRow.city,
      state: tankRow.state,
      manufacturer: tankRow.manufacturer,
      model_name: tankRow.model_name,
      nominal_capacity_gal: tankRow.capacity_gallons,
      product_grade: `Tank ${tankRow.id}`,
      access_level: 'public',
      // Mock additional fields for display
      install_date: '2020-03-15',
      install_contractor: 'Tank Pro Services',
      atg_brand: 'Veeder-Root',
      atg_model: 'TLS-350',
      octane: 87,
      ethanol_pct: 10
    };
    
    // Get chart readings
    const c = await pool.query(
      'SELECT height_inches as dipstick_in, volume_gallons as gallons FROM tank_chart_readings WHERE tank_id=$1 ORDER BY height_inches ASC',
      [tankId]
    );
    
    res.json({ tank, chart: c.rows });
  } catch (err) { 
    console.error(err.message); 
    res.status(500).json({ error: 'Internal server error' }); 
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`TankID API running on port ${PORT}`);
});