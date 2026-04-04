const express = require('express');
const { Pool } = require('pg');

const app = express();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Add CORS middleware for local development
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

// Check database schema
app.get('/check-schema', async (req, res) => {
  try {
    // Check what tables exist
    const tables = await pool.query(`
      SELECT tablename FROM pg_tables 
      WHERE schemaname = 'public' 
      ORDER BY tablename
    `);
    
    let schemaInfo = { tables: {} };
    
    for (const table of tables.rows) {
      const tableName = table.tablename;
      
      // Get columns for each table
      const columns = await pool.query(`
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = $1 AND table_schema = 'public'
        ORDER BY ordinal_position
      `, [tableName]);
      
      schemaInfo.tables[tableName] = columns.rows;
    }
    
    res.json(schemaInfo);
    
  } catch (err) {
    console.error('Error checking schema:', err);
    res.status(500).json({ error: err.message });
  }
});

// Simple data loader that adapts to existing schema
app.get('/load-simple-data', async (req, res) => {
  try {
    // Check if tables exist first
    const tableCheck = await pool.query(`
      SELECT tablename FROM pg_tables 
      WHERE schemaname = 'public' AND tablename IN ('facilities', 'tanks', 'tank_models', 'tank_chart_readings')
      ORDER BY tablename
    `);
    
    const existingTables = tableCheck.rows.map(r => r.tablename);
    
    let results = { created: [], errors: [] };
    
    // Try to create minimal sample data based on what tables exist
    if (existingTables.includes('facilities')) {
      try {
        // Get facility columns first
        const facCols = await pool.query(`
          SELECT column_name FROM information_schema.columns 
          WHERE table_name = 'facilities' AND table_schema = 'public'
          ORDER BY ordinal_position
        `);
        
        const hasName = facCols.rows.some(r => r.column_name === 'name');
        
        if (hasName) {
          await pool.query(`
            INSERT INTO facilities (id, name) 
            VALUES ($1, $2)
            ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name
          `, ['00000000-0000-0000-0000-000000000000', 'Test Gas Station']);
          results.created.push('Sample facility');
        }
      } catch (err) {
        results.errors.push(`Facility: ${err.message}`);
      }
    }
    
    if (existingTables.includes('tanks')) {
      try {
        // Get tank columns
        const tankCols = await pool.query(`
          SELECT column_name FROM information_schema.columns 
          WHERE table_name = 'tanks' AND table_schema = 'public'
          ORDER BY ordinal_position
        `);
        
        const colNames = tankCols.rows.map(r => r.column_name);
        
        // Build insert based on available columns
        let insertCols = ['id'];
        let insertVals = ['$1'];
        let values = ['11111111-1111-1111-1111-111111111111'];
        let paramIndex = 2;
        
        if (colNames.includes('facility_id')) {
          insertCols.push('facility_id');
          insertVals.push(`$${paramIndex++}`);
          values.push('00000000-0000-0000-0000-000000000000');
        }
        if (colNames.includes('tank_number')) {
          insertCols.push('tank_number');
          insertVals.push(`$${paramIndex++}`);
          values.push('1');
        }
        if (colNames.includes('product_grade')) {
          insertCols.push('product_grade');
          insertVals.push(`$${paramIndex++}`);
          values.push('Regular Unleaded');
        }
        
        const query = `
          INSERT INTO tanks (${insertCols.join(', ')}) 
          VALUES (${insertVals.join(', ')})
          ON CONFLICT (id) DO UPDATE SET 
          ${insertCols.slice(1).map(col => `${col} = EXCLUDED.${col}`).join(', ')}
        `;
        
        await pool.query(query, values);
        results.created.push('Sample tank');
        
      } catch (err) {
        results.errors.push(`Tank: ${err.message}`);
      }
    }
    
    res.json({
      success: true,
      message: 'Simple data loaded based on available schema',
      tables: existingTables,
      results: results
    });
    
  } catch (err) {
    console.error('Error loading simple data:', err);
    res.status(500).json({ error: err.message });
  }
});

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
    
    const tanks = await pool.query('SELECT * FROM tanks WHERE facility_id = $1', [id]);
    
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

    const tank = await pool.query('SELECT * FROM tanks WHERE id = $1', [id]);
    
    if (tank.rows.length === 0) {
      return res.status(404).json({ error: 'Tank not found' });
    }
    
    res.json({ tank: tank.rows[0], chart: [] });
  } catch (err) { 
    console.error(err.message); 
    res.status(500).json({ error: 'Internal server error' }); 
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`TankID API running on port ${PORT}`);
});