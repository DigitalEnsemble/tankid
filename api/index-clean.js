const express = require('express');
const { Pool } = require('pg');

const app = express();

// Add CORS middleware for local development
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'tankid-api' });
});

app.get('/facility/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!UUID.test(id)) {
      return res.status(400).json({ error: 'Invalid facility ID format' });
    }
    
    const fac = await pool.query('SELECT * FROM facilities WHERE id = $1', [id]);
    if (fac.rows.length === 0) {
      return res.status(404).json({ error: 'Facility not found' });
    }
    
    const tanks = await pool.query(`
      SELECT t.id, t.tank_number, t.serial_number, t.product_grade,
             t.octane, t.ethanol_pct, t.atg_brand, t.atg_model, t.access_level,
             m.manufacturer, m.model_name, m.nominal_capacity_gal
      FROM tanks t
      LEFT JOIN tank_models m ON m.id = t.tank_model_id
      WHERE t.facility_id = $1 ORDER BY t.tank_number ASC`, [id]);
    
    res.json({ facility: fac.rows[0], tanks: tanks.rows });
  } catch (err) { 
    console.error(err.message); 
    res.status(500).json({ error: 'Internal server error' }); 
  }
});

app.get('/tank/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!UUID.test(id)) {
      return res.status(400).json({ error: 'Invalid tank ID format' });
    }

    const t = await pool.query(`
      SELECT t.id, t.tank_number, t.serial_number, t.install_depth_inches,
             t.install_date, t.install_contractor, t.atg_brand, t.atg_model,
             t.atg_last_calibration, t.product_grade, t.octane, t.ethanol_pct,
             t.tank_model_id, t.access_level,
             f.id AS facility_id, f.name AS facility_name, f.address, f.city, f.state, f.zip,
             m.manufacturer, m.model_name, m.nominal_capacity_gal, m.actual_capacity_gal,
             m.diameter_ft, m.wall_type, m.material, m.chart_notes
      FROM tanks t
      JOIN facilities f ON f.id = t.facility_id
      LEFT JOIN tank_models m ON m.id = t.tank_model_id
      WHERE t.id = $1`, [id]);
    
    if (t.rows.length === 0) {
      return res.status(404).json({ error: 'Tank not found' });
    }
    
    const tank = t.rows[0];
    let chart = [];
    if (tank.tank_model_id) {
      const c = await pool.query(
        'SELECT dipstick_in, gallons FROM tank_chart_readings WHERE tank_model_id=$1 ORDER BY dipstick_in ASC',
        [tank.tank_model_id]);
      chart = c.rows;
    }
    res.json({ tank, chart });
  } catch (err) { 
    console.error(err.message); 
    res.status(500).json({ error: 'Internal server error' }); 
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`TankID API running on port ${PORT}`);
});