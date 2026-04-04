const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function checkDocsTable() {
  console.log('🔍 Checking documents table structure...');
  
  try {
    // Check if table exists and its structure
    const tableInfo = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'documents' 
      AND table_schema = 'public'
      ORDER BY ordinal_position;
    `);
    
    if (tableInfo.rows.length === 0) {
      console.log('❌ Documents table does not exist');
      return { exists: false, columns: [] };
    }
    
    console.log('✅ Documents table exists with columns:');
    tableInfo.rows.forEach(col => {
      console.log(`   ${col.column_name} (${col.data_type}, nullable: ${col.is_nullable})`);
    });
    
    // Also check for any existing documents
    const docCount = await pool.query('SELECT COUNT(*) FROM documents');
    console.log(`📄 Current document count: ${docCount.rows[0].count}`);
    
    return {
      exists: true,
      columns: tableInfo.rows,
      count: parseInt(docCount.rows[0].count)
    };
    
  } catch (error) {
    console.error('❌ Error checking documents table:', error);
    throw error;
  }
}

module.exports = { checkDocsTable };