const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function simpleUploadDocs() {
  console.log('📄 Starting simple document upload...');
  
  try {
    // First check if documents table exists
    const tableCheck = await pool.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'documents'
    `);
    
    if (tableCheck.rows.length === 0) {
      console.log('📋 Creating documents table...');
      await pool.query(`
        CREATE TABLE documents (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          filename VARCHAR(255) NOT NULL,
          original_filename VARCHAR(255) NOT NULL,
          doc_type VARCHAR(100) NOT NULL,
          description TEXT,
          file_path VARCHAR(500) NOT NULL,
          file_size INTEGER,
          mime_type VARCHAR(100),
          linked_tanks UUID[] DEFAULT '{}',
          facility_id UUID,
          uploaded_by VARCHAR(255) DEFAULT 'system',
          is_public BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
      `);
      console.log('✅ Documents table created');
    } else {
      console.log('✅ Documents table already exists');
    }
    
    // Get 1643 facility
    const facility = await pool.query(`
      SELECT id FROM facilities WHERE ops_facility_id = '1643'
    `);
    
    if (facility.rows.length === 0) {
      throw new Error('1643 facility not found');
    }
    
    const facilityId = facility.rows[0].id;
    console.log(`✅ Found 1643 facility: ${facilityId}`);
    
    // Get tanks
    const tanks = await pool.query(`
      SELECT id, tank_number FROM tanks WHERE facility_id = $1 ORDER BY tank_number
    `, [facilityId]);
    
    console.log(`✅ Found ${tanks.rows.length} tanks`);
    
    return {
      success: true,
      message: 'Ready to upload documents',
      facilityId,
      tanks: tanks.rows
    };
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

module.exports = { simpleUploadDocs };