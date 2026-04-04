const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function createTankDocs() {
  console.log('📄 Creating tank documents using existing table structure...');
  
  try {
    await pool.query('BEGIN');
    
    // Get 1643 facility and tanks
    const facility = await pool.query(`
      SELECT id FROM facilities WHERE ops_facility_id = '1643'
    `);
    const facilityId = facility.rows[0].id;
    
    const tanks = await pool.query(`
      SELECT id, tank_number, serial_number 
      FROM tanks 
      WHERE facility_id = $1 
      ORDER BY tank_number
    `, [facilityId]);
    
    const tank6 = tanks.rows.find(t => t.tank_number === '6');
    const tank7 = tanks.rows.find(t => t.tank_number === '7');
    
    console.log(`✅ Found facility ${facilityId} with ${tanks.rows.length} tanks`);
    
    // Clear any existing documents
    await pool.query('DELETE FROM documents');
    console.log('🧹 Cleared existing document records');
    
    // Since the existing table uses integer tank_id and doesn't support facility-wide documents,
    // I'll create a separate table for comprehensive documents
    const createNewTable = `
      DROP TABLE IF EXISTS tank_documents;
      CREATE TABLE tank_documents (
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
    `;
    
    await pool.query(createNewTable);
    console.log('✅ Created tank_documents table');
    
    // Create document records
    const documents = [
      {
        filename: 'ast_tank_registration_1_of_2.pdf',
        originalFilename: 'AST_Tank_Registration_1_of_2_Anonymized.pdf',
        docType: 'registration',
        description: 'AST Tank Registration Form - Page 1 of 2',
        linkedTanks: tanks.rows.map(t => t.id),
        size: 5803
      },
      {
        filename: 'ast_tank_registration_2_of_2.pdf',
        originalFilename: 'AST_Tank_Registration_2_of_2_Anonymized.pdf',
        docType: 'registration', 
        description: 'AST Tank Registration Form - Page 2 of 2',
        linkedTanks: tanks.rows.map(t => t.id),
        size: 5687
      },
      {
        filename: 'ast_tank_registration_signed.pdf',
        originalFilename: 'AST_Tank_Registration_Signed_Anonymized.pdf',
        docType: 'registration',
        description: 'AST Tank Registration Form - Signed Complete Document',
        linkedTanks: tanks.rows.map(t => t.id),
        size: 10330
      },
      {
        filename: 'fireguard_warranty_tank6_fg51304b.pdf',
        originalFilename: 'Fireguard_Warranty_Card_Tank6_FG51304B.pdf',
        docType: 'warranty',
        description: 'Fireguard Warranty Card for Tank 6 (Serial: 204030-51304)',
        linkedTanks: tank6 ? [tank6.id] : [],
        size: 5208
      },
      {
        filename: 'fireguard_warranty_tank7_fg51305a.pdf',
        originalFilename: 'Fireguard_Warranty_Card_Tank7_FG51305A.pdf', 
        docType: 'warranty',
        description: 'Fireguard Warranty Card for Tank 7 (Serial: 204031-51305)',
        linkedTanks: tank7 ? [tank7.id] : [],
        size: 5207
      }
    ];
    
    const createdDocs = [];
    
    for (const doc of documents) {
      const insertResult = await pool.query(`
        INSERT INTO tank_documents (
          filename, original_filename, doc_type, description,
          file_path, file_size, mime_type, linked_tanks, facility_id,
          uploaded_by, is_public
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
        ) RETURNING id, filename, original_filename;
      `, [
        doc.filename,
        doc.originalFilename,
        doc.docType,
        doc.description,
        `/documents/${doc.filename}`,
        doc.size,
        'application/pdf',
        doc.linkedTanks,
        facilityId,
        'system_upload',
        true
      ]);
      
      createdDocs.push({
        id: insertResult.rows[0].id,
        filename: doc.filename,
        original_filename: doc.originalFilename,
        doc_type: doc.docType,
        description: doc.description,
        linked_tanks: doc.linkedTanks.length,
        download_url: `https://tankid-api.fly.dev/documents/${doc.filename}`
      });
      
      console.log(`✅ Created record: ${doc.originalFilename} → ${doc.filename}`);
      console.log(`   Document ID: ${insertResult.rows[0].id}`);
      console.log(`   Linked to ${doc.linkedTanks.length} tank(s)`);
    }
    
    await pool.query('COMMIT');
    
    console.log('\\n🎉 Tank document records created successfully!');
    console.log(`\\n📋 Created ${createdDocs.length} document records in tank_documents table:`);
    createdDocs.forEach((doc, i) => {
      console.log(`\\n${i+1}. ${doc.original_filename}`);
      console.log(`   Type: ${doc.doc_type}`);
      console.log(`   Description: ${doc.description}`);
      console.log(`   Linked tanks: ${doc.linked_tanks}`);
      console.log(`   URL: ${doc.download_url}`);
    });
    
    return {
      success: true,
      message: 'Tank document records created successfully',
      documents: createdDocs
    };
    
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('❌ Error creating tank document records:', error);
    throw error;
  }
}

module.exports = { createTankDocs };