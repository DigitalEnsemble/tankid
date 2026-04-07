const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function debugSchemaDetails() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Debugging schema details...');
    
    // Get detailed column info for each table
    const tablesResult = await client.query(`
      SELECT 
        t.table_name,
        c.column_name,
        c.data_type,
        c.is_nullable,
        c.column_default
      FROM information_schema.tables t
      JOIN information_schema.columns c ON c.table_name = t.table_name
      WHERE t.table_schema = 'public' 
      AND t.table_type = 'BASE TABLE'
      AND t.table_name IN ('facilities', 'tanks', 'tank_models', 'site_locations', 'tank_documents', 'documents')
      ORDER BY t.table_name, c.ordinal_position
    `);
    
    // Group by table
    const tableStructures = {};
    tablesResult.rows.forEach(row => {
      if (!tableStructures[row.table_name]) {
        tableStructures[row.table_name] = [];
      }
      tableStructures[row.table_name].push({
        column: row.column_name,
        type: row.data_type,
        nullable: row.is_nullable === 'YES',
        default: row.column_default
      });
    });
    
    // Get sample data from each table
    const sampleData = {};
    for (const tableName of Object.keys(tableStructures)) {
      try {
        const sampleResult = await client.query(`SELECT * FROM ${tableName} LIMIT 1`);
        sampleData[tableName] = sampleResult.rows[0] || null;
      } catch (e) {
        sampleData[tableName] = `ERROR: ${e.message}`;
      }
    }
    
    return {
      success: true,
      table_structures: tableStructures,
      sample_data: sampleData
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  } finally {
    client.release();
  }
}

module.exports = { debugSchemaDetails };