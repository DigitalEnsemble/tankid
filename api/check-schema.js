const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function checkSchemaState() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Checking current database schema state...');
    
    // Check what tables exist
    const tablesResult = await client.query(`
      SELECT table_name, 
             (SELECT COUNT(*) FROM information_schema.columns 
              WHERE table_name = t.table_name AND column_name = 'state_code') as has_state_code,
             (SELECT COUNT(*) FROM information_schema.columns 
              WHERE table_name = t.table_name AND column_name = 'id' 
              AND data_type = 'uuid') as has_uuid_id
      FROM information_schema.tables t
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      AND table_name IN ('facilities', 'tanks', 'tank_models', 'site_locations', 'tank_documents', 'documents')
      ORDER BY table_name
    `);
    
    // Check data counts
    const counts = {};
    for (const table of tablesResult.rows) {
      try {
        const countResult = await client.query(`SELECT COUNT(*) as count FROM ${table.table_name}`);
        counts[table.table_name] = parseInt(countResult.rows[0].count);
      } catch (e) {
        counts[table.table_name] = 'ERROR';
      }
    }
    
    // Determine schema version
    const hasV1Features = tablesResult.rows.some(row => 
      row.table_name === 'facilities' && row.has_state_code === '0'
    );
    
    const hasV2Features = tablesResult.rows.some(row => 
      row.table_name === 'site_locations'
    ) || tablesResult.rows.some(row =>
      row.table_name === 'tank_documents'
    );
    
    let schemaStatus;
    if (hasV1Features && hasV2Features) {
      schemaStatus = 'MIXED - Partial migration state (needs cleanup)';
    } else if (hasV2Features) {
      schemaStatus = 'V2 - Modern composite key schema';
    } else if (hasV1Features) {
      schemaStatus = 'V1 - Original serial ID schema';
    } else {
      schemaStatus = 'UNKNOWN - Unexpected schema state';
    }
    
    return {
      success: true,
      schema_status: schemaStatus,
      tables: tablesResult.rows.map(row => ({
        name: row.table_name,
        record_count: counts[row.table_name],
        has_state_code: row.has_state_code === '1',
        has_uuid_id: row.has_uuid_id === '1'
      })),
      recommendations: getRecommendations(schemaStatus, tablesResult.rows, counts)
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.message,
      schema_status: 'ERROR - Cannot determine schema state'
    };
  } finally {
    client.release();
  }
}

function getRecommendations(status, tables, counts) {
  if (status.includes('MIXED')) {
    return [
      'Database is in partial migration state',
      'Run schema cleanup to reset to v1, then retry v2 migration',
      'Or run v2 migration recovery to complete the partial migration'
    ];
  } else if (status.includes('V1')) {
    return [
      'Ready for v2 migration',
      'Current data will be preserved and transformed'
    ];
  } else if (status.includes('V2')) {
    return [
      'Already on v2 schema',
      'No migration needed'
    ];
  } else {
    return [
      'Schema state unclear - manual investigation needed'
    ];
  }
}

module.exports = { checkSchemaState };