#!/usr/bin/env node

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Get DATABASE_URL from Doppler
async function runMigration() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('🔗 Connecting to database...');
    
    // Read the migration SQL
    const migrationSQL = fs.readFileSync(
      path.join(__dirname, '../migrations/add_r2_key_column.sql'),
      'utf8'
    );
    
    console.log('📄 Executing migration: add_r2_key_column.sql');
    console.log('SQL:');
    console.log(migrationSQL);
    
    // Execute the migration
    const result = await pool.query(migrationSQL);
    
    console.log('✅ Migration completed successfully!');
    console.log('📊 Result:', result);
    
    // Verify the column was added
    const verifyResult = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'tank_documents' AND column_name = 'r2_key'
    `);
    
    if (verifyResult.rows.length > 0) {
      console.log('✅ Verification: r2_key column added successfully');
      console.log('Column details:', verifyResult.rows[0]);
    } else {
      console.log('❌ Verification failed: r2_key column not found');
    }
    
  } catch (error) {
    console.error('💥 Migration failed:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  } finally {
    await pool.end();
    console.log('🔌 Database connection closed');
  }
}

if (require.main === module) {
  runMigration();
}

module.exports = { runMigration };