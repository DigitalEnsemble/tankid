const express = require('express');
const { Pool } = require('pg');
const { loadTankIDSeedData } = require('./load-tankid-seed');
const { migrateToUUIDs } = require('./migrate-to-uuids');
const { loadEnhancedTankIDSeedData } = require('./load-tankid-seed-enhanced');
const { enhanceExistingTanks } = require('./enhance-existing-tanks');
const { migrateComprehensiveSchema } = require('./migrate-comprehensive-schema');
const { loadComprehensiveData } = require('./load-comprehensive-data');

const app = express();

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'tankid-api' });
});

// List all facilities with tank counts
app.get('/facilities', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT f.*, COUNT(t.id) as tank_count
      FROM facilities f
      LEFT JOIN tanks t ON t.facility_id = f.id
      GROUP BY f.id
      ORDER BY tank_count DESC, f.name ASC
    `);

    const facilities = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      city: row.city,
      state: row.state,
      tank_count: parseInt(row.tank_count)
    }));

    res.json({ facilities });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper endpoint to lookup facilities by any ID format
app.get('/lookup/facility/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let facility;

    // If it looks like a UUID, query directly
    if (UUID.test(id)) {
      const result = await pool.query('SELECT * FROM facilities WHERE id = $1', [id]);
      facility = result.rows[0];
    } else {
      // If it's numeric or other format, prefer facilities with tanks
      const result = await pool.query(`
        SELECT f.*, COUNT(t.id) as tank_count
        FROM facilities f
        LEFT JOIN tanks t ON t.facility_id = f.id
        GROUP BY f.id
        ORDER BY tank_count DESC, f.created_at ASC
        LIMIT 1
      `);
      facility = result.rows[0];
    }

    if (!facility) {
      return res.status(404).json({ error: 'No facilities found' });
    }

    const tankCount = facility.tank_count || 0;
    delete facility.tank_count; // Remove count from response

    res.json({
      message: `Found facility: ${facility.name} (${tankCount} tanks)`,
      facilityId: facility.id,
      facility: facility,
      tankCount: tankCount,
      redirectUrl: `/facility/${facility.id}`
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
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

// Migrate to comprehensive schema
app.get('/migrate-comprehensive', async (req, res) => {
  try {
    const result = await migrateComprehensiveSchema();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to migrate comprehensive schema'
    });
  }
});

// Load comprehensive data
app.get('/load-comprehensive', async (req, res) => {
  try {
    const result = await loadComprehensiveData();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to load comprehensive data'
    });
  }
});

// Enhance existing tanks with detailed specifications
app.get('/enhance-tanks', async (req, res) => {
  try {
    const result = await enhanceExistingTanks();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to enhance tanks'
    });
  }
});

// Load enhanced TankID seed data with full specifications
app.get('/load-enhanced-seed', async (req, res) => {
  try {
    const result = await loadEnhancedTankIDSeedData();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to load enhanced seed data'
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
      SELECT t.*, m.manufacturer, m.model_name, m.capacity_gallons, m.wall_type, m.material
      FROM tanks t
      LEFT JOIN tank_models m ON m.id = t.model_id
      WHERE t.facility_id = $1
      ORDER BY t.tank_number ASC, t.ops_tank_id ASC
    `, [id]);

    // Get document counts by type
    const documents = await pool.query(`
      SELECT doc_type, COUNT(*) as count
      FROM documents
      WHERE linked_tanks && ARRAY[(SELECT ops_facility_id FROM facilities WHERE id = $1)]
      GROUP BY doc_type
    `, [id]);

    const facility = {
      ...fac.rows[0],
      document_summary: documents.rows.reduce((acc, doc) => {
        acc[doc.doc_type] = parseInt(doc.count);
        return acc;
      }, {})
    };

    res.json({ facility, tanks: tanks.rows });
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
      SELECT t.*,
             f.name AS facility_name, f.address, f.city, f.state, f.zip,
             f.facility_type, f.owner_name, f.ops_facility_id,
             m.manufacturer, m.model_name, m.capacity_gallons, m.actual_capacity_gal,
             m.diameter_ft, m.wall_type, m.material, m.chart_notes
      FROM tanks t
      JOIN facilities f ON f.id = t.facility_id
      LEFT JOIN tank_models m ON m.id = t.model_id
      WHERE t.id = $1
    `, [id]);

    if (!t.rows.length) return res.status(404).json({ error: 'Tank not found' });

    const tankRow = t.rows[0];

    // Format comprehensive tank data
    const tank = {
      id: tankRow.id,
      tank_number: tankRow.tank_number || '1',
      ops_tank_id: tankRow.ops_tank_id,
      serial_number: tankRow.serial_number,
      fireguard_label: tankRow.fireguard_label,

      // Installation details
      install_depth_inches: tankRow.install_depth_inches,
      install_date: tankRow.install_date,
      initial_work_date: tankRow.initial_work_date,
      install_contractor: tankRow.install_contractor,

      // ATG system info
      atg_brand: tankRow.atg_brand || 'Veeder-Root',
      atg_model: tankRow.atg_model || 'TLS-350',
      atg_last_calibration: tankRow.atg_last_calibration,

      // Product info
      product_grade: tankRow.product_grade || 'Regular Unleaded',
      octane: tankRow.octane || 87,
      ethanol_pct: tankRow.ethanol_pct || 10,

      // Compliance and warranty
      tank_release_detection: tankRow.tank_release_detection,
      piping_release_detection: tankRow.piping_release_detection,
      tank_corrosion_protection: tankRow.tank_corrosion_protection,
      piping_corrosion_protection: tankRow.piping_corrosion_protection,
      sti_warranted_date: tankRow.sti_warranted_date,
      warranty_validated_date: tankRow.warranty_validated_date,
      warranty_validated_by: tankRow.warranty_validated_by,

      // Access and IDs
      tank_model_id: tankRow.model_id,
      access_level: tankRow.access_level || 'Public',

      // Facility info
      facility_id: tankRow.facility_id,
      facility_name: tankRow.facility_name,
      facility_type: tankRow.facility_type,
      facility_owner: tankRow.owner_name,
      ops_facility_id: tankRow.ops_facility_id,
      address: tankRow.address,
      city: tankRow.city,
      state: tankRow.state,
      zip: tankRow.zip,

      // Tank model info
      manufacturer: tankRow.manufacturer,
      model_name: tankRow.model_name,
      nominal_capacity_gal: tankRow.capacity_gallons,
      actual_capacity_gal: tankRow.actual_capacity_gal || tankRow.capacity_gallons,
      diameter_ft: tankRow.diameter_ft,
      wall_type: tankRow.wall_type,
      material: tankRow.material,
      chart_notes: tankRow.chart_notes
    };

    // Generate sample calibration chart data
    const chart = [];
    if (tank.nominal_capacity_gal) {
      const capacity = tank.nominal_capacity_gal;
      const depth = tank.install_depth_inches || 96; // Default 8 feet

      // Generate calibration points (every 6 inches)
      for (let i = 0; i <= depth; i += 6) {
        const percentage = Math.pow(i / depth, 1.2); // Curved relationship
        const gallons = Math.round(capacity * percentage);
        chart.push({
          dipstick_in: i,
          gallons: gallons
        });
      }
    }

    // Get linked documents for this tank
    const documents = await pool.query(`
      SELECT doc_type, original_filename, file_path, upload_date
      FROM documents 
      WHERE linked_tanks && ARRAY[$1]
      ORDER BY doc_type, original_filename
    `, [tank.ops_tank_id]);
    
    res.json({ tank, chart, documents: documents.rows });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get documents for a facility or tank
app.get('/documents/:entityType/:entityId', async (req, res) => {
  try {
    const { entityType, entityId } = req.params;
    
    let query, params;
    
    if (entityType === 'facility') {
      // Get documents for all tanks in facility
      query = `
        SELECT d.*, 
               ARRAY_AGG(DISTINCT unnest(d.linked_tanks)) as tanks
        FROM documents d,
             facilities f
        WHERE f.ops_facility_id = $1
        AND d.linked_tanks && ARRAY[f.ops_facility_id]
        GROUP BY d.id, d.doc_type, d.original_filename, d.file_path, d.upload_date
        ORDER BY d.doc_type, d.original_filename
      `;
      params = [entityId];
    } else if (entityType === 'tank') {
      // Get documents for specific tank
      query = `
        SELECT * FROM documents 
        WHERE linked_tanks && ARRAY[$1]
        ORDER BY doc_type, original_filename
      `;
      params = [entityId];
    } else {
      return res.status(400).json({ error: 'Invalid entity type. Use facility or tank.' });
    }
    
    const result = await pool.query(query, params);
    res.json({ documents: result.rows });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`TankID API running on port ${PORT}`);
});