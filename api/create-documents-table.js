const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function createDocumentsTable() {
  console.log('📄 Creating documents table and uploading tank documents...');
  
  try {
    await pool.query('BEGIN');
    
    // Create documents table
    const createTable = `
      CREATE TABLE IF NOT EXISTS documents (
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
    
    await pool.query(createTable);
    console.log('✅ Created documents table');
    
    // Create documents directory if it doesn't exist
    const docsDir = path.join(__dirname, 'public', 'documents');
    if (!fs.existsSync(path.join(__dirname, 'public'))) {
      fs.mkdirSync(path.join(__dirname, 'public'));
    }
    if (!fs.existsSync(docsDir)) {
      fs.mkdirSync(docsDir);
    }
    console.log('✅ Created documents directory');
    
    // Get facility and tank IDs for 1643
    const facilityResult = await pool.query(`
      SELECT id FROM facilities WHERE ops_facility_id = '1643'
    `);
    
    if (facilityResult.rows.length === 0) {
      throw new Error('1643 facility not found');
    }
    
    const facilityId = facilityResult.rows[0].id;
    
    const tanksResult = await pool.query(`
      SELECT id, tank_number, serial_number 
      FROM tanks 
      WHERE facility_id = $1 
      ORDER BY tank_number
    `, [facilityId]);
    
    console.log(`✅ Found facility ${facilityId} with ${tanksResult.rows.length} tanks`);
    
    // Get tank IDs for linking
    const tank6 = tanksResult.rows.find(t => t.tank_number === '6');
    const tank7 = tanksResult.rows.find(t => t.tank_number === '7');
    const allTankIds = tanksResult.rows.map(t => t.id);
    
    // Define documents to upload
    const sourceDir = '/Users/charlesroehrig/Public/Tank info';
    const documents = [
      {
        sourceFile: 'AST_Tank_Registration_1_of_2_Anonymized.pdf',
        docType: 'registration',
        description: 'AST Tank Registration Form - Page 1 of 2',
        linkedTanks: allTankIds // All tanks
      },
      {
        sourceFile: 'AST_Tank_Registration_2_of_2_Anonymized.pdf',
        docType: 'registration', 
        description: 'AST Tank Registration Form - Page 2 of 2',
        linkedTanks: allTankIds // All tanks
      },
      {
        sourceFile: 'AST_Tank_Registration_Signed_Anonymized.pdf',
        docType: 'registration',
        description: 'AST Tank Registration Form - Signed Complete Document',
        linkedTanks: allTankIds // All tanks
      },
      {
        sourceFile: 'Fireguard_Warranty_Card_Tank6_FG51304B.pdf',
        docType: 'warranty',
        description: 'Fireguard Warranty Card for Tank 6 (Serial: 204030-51304)',
        linkedTanks: tank6 ? [tank6.id] : [] // Tank 6 only
      },
      {
        sourceFile: 'Fireguard_Warranty_Card_Tank7_FG51305A.pdf', 
        docType: 'warranty',
        description: 'Fireguard Warranty Card for Tank 7 (Serial: 204031-51305)',
        linkedTanks: tank7 ? [tank7.id] : [] // Tank 7 only
      }
    ];
    
    // Upload and register each document
    for (const doc of documents) {
      const sourcePath = path.join(sourceDir, doc.sourceFile);
      
      if (!fs.existsSync(sourcePath)) {
        console.log(`⚠️  Skipping ${doc.sourceFile} - file not found`);
        continue;
      }
      
      // Generate safe filename
      const timestamp = Date.now();
      const safeFilename = `${timestamp}_${doc.sourceFile.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const destPath = path.join(docsDir, safeFilename);
      
      // Copy file to documents directory
      fs.copyFileSync(sourcePath, destPath);
      
      // Get file stats
      const stats = fs.statSync(destPath);
      
      // Insert document record
      const insertResult = await pool.query(`
        INSERT INTO documents (
          filename, original_filename, doc_type, description,
          file_path, file_size, mime_type, linked_tanks, facility_id,
          uploaded_by, is_public
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
        ) RETURNING id, filename;
      `, [
        safeFilename,
        doc.sourceFile,
        doc.docType,
        doc.description,
        `/documents/${safeFilename}`,
        stats.size,
        'application/pdf',
        doc.linkedTanks,
        facilityId,
        'system_upload',
        true
      ]);
      
      console.log(`✅ Uploaded ${doc.sourceFile} → ${safeFilename}`);
      console.log(`   Linked to ${doc.linkedTanks.length} tank(s)`);
      console.log(`   Document ID: ${insertResult.rows[0].id}`);
      console.log(`   File size: ${Math.round(stats.size/1024)} KB`);
    }
    
    await pool.query('COMMIT');
    
    // Verification query
    const verification = await pool.query(`
      SELECT 
        d.filename, d.original_filename, d.doc_type, d.description,
        d.file_size, d.file_path,
        array_length(d.linked_tanks, 1) as linked_tank_count
      FROM documents d 
      WHERE d.facility_id = $1
      ORDER BY d.doc_type, d.created_at;
    `, [facilityId]);
    
    console.log('\\n🎉 Document upload completed successfully!');
    console.log(`\\n📋 Uploaded ${verification.rows.length} documents:`);
    verification.rows.forEach((doc, i) => {
      console.log(`\\n${i+1}. ${doc.original_filename}`);
      console.log(`   Type: ${doc.doc_type}`);
      console.log(`   Description: ${doc.description}`);
      console.log(`   Size: ${Math.round(doc.file_size/1024)} KB`);
      console.log(`   Linked tanks: ${doc.linked_tank_count || 0}`);
      console.log(`   URL: https://tankid-api.fly.dev${doc.file_path}`);
    });
    
    return {
      success: true,
      message: 'Documents uploaded and linked successfully',
      documents: verification.rows
    };
    
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('❌ Error creating documents table:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  createDocumentsTable().then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { createDocumentsTable };