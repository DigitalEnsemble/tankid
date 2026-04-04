const express = require('express');
const { Pool } = require('pg');
const { loadTankIDSeedData } = require('./load-tankid-seed');
const { migrateToUUIDs } = require('./migrate-to-uuids');

const app = express();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'tankid-api' });
});

// Load TankID seed data endpoint
app.get('/load-tankid-seed', async (req, res) => {
  try {
    const result = await loadTankIDSeedData();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to load TankID seed data'
    });
  }
});

// Migrate to UUIDs endpoint
app.get('/migrate-to-uuids', async (req, res) => {
  try {
    const result = await migrateToUUIDs();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to migrate to UUIDs'
    });
  }
});

console.log('About to register facility route...');

app.get('/facility/:id', async (req, res) => {
  console.log('Facility route called!');
  try {
    const { id } = req.params;
    if (!UUID.test(id)) return res.status(400).json({ error: 'Invalid facility ID format' });
    
    const fac = await pool.query('SELECT * FROM facilities WHERE id = $1', [id]);
    if (!fac.rows.length) return res.status(404).json({ error: 'Facility not found' });
    
    const tanks = await pool.query(`
      SELECT t.id, t.serial_number, m.manufacturer, m.model_name, m.capacity_gallons
      FROM tanks t
      LEFT JOIN tank_models m ON m.id = t.model_id
      WHERE t.facility_id = $1 ORDER BY t.id ASC
    `, [id]);
    
    res.json({ facility: fac.rows[0], tanks: tanks.rows });
  } catch (err) { 
    console.error(err.message); 
    res.status(500).json({ error: 'Internal server error' }); 
  }
});

app.get('/tank/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!UUID.test(id)) return res.status(400).json({ error: 'Invalid tank ID format' });

    const t = await pool.query(`
      SELECT t.id, t.serial_number, t.facility_id,
             f.name AS facility_name, f.city, f.state,
             m.manufacturer, m.model_name, m.capacity_gallons
      FROM tanks t
      JOIN facilities f ON f.id = t.facility_id
      LEFT JOIN tank_models m ON m.id = t.model_id
      WHERE t.id = $1
    `, [id]);
    
    if (!t.rows.length) return res.status(404).json({ error: 'Tank not found' });
    
    const tankRow = t.rows[0];
    
    // Format tank data to match frontend expectations
    const tank = {
      id: tankRow.id,
      serial_number: tankRow.serial_number,
      facility: {
        id: tankRow.facility_id,
        name: tankRow.facility_name,
        city: tankRow.city,
        state: tankRow.state
      },
      model: {
        manufacturer: tankRow.manufacturer,
        model_name: tankRow.model_name,
        capacity_gallons: tankRow.capacity_gallons
      }
    };
    
    // For now, return empty chart (can add later if needed)
    const chart = [];
    
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