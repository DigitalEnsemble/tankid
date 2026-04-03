const express = require('express');
const { Pool } = require('pg');

const app = express();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'tankid-api' });
});

// Tank profile — single route
app.get('/tank/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Validate integer ID format
    const tankId = parseInt(id);
    if (isNaN(tankId) || tankId <= 0) {
      return res.status(400).json({ error: 'Invalid tank ID format' });
    }

    const tankResult = await pool.query(`
      SELECT
        t.id, t.serial_number, t.created_at as tank_created,
        f.name AS facility_name, f.city, f.state,
        m.manufacturer, m.model_name, m.capacity_gallons
      FROM tanks t
      JOIN facilities f ON f.id = t.facility_id
      JOIN tank_models m ON m.id = t.model_id
      WHERE t.id = $1
    `, [tankId]);

    if (tankResult.rows.length === 0) {
      return res.status(404).json({ error: 'Tank not found' });
    }

    const tank = tankResult.rows[0];

    // Get chart readings for this specific tank
    const chartResult = await pool.query(`
      SELECT height_inches as dipstick_in, volume_gallons as gallons
      FROM tank_chart_readings
      WHERE tank_id = $1
      ORDER BY height_inches ASC
    `, [tankId]);

    const chart = chartResult.rows;

    res.json({ tank, chart });

  } catch (err) {
    console.error('Tank query error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`TankID API running on port ${PORT}`);
});