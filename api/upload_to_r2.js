#!/usr/bin/env node

const { S3Client, PutObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Initialize R2 client
const s3Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY,
    secretAccessKey: process.env.R2_SECRET_KEY,
  },
});

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Map of database filenames to actual local files
const fileMapping = {
  'AST_Tank_Registration_1_of_2_Anonymized.pdf': 'ast_tank_registration_1_of_2.pdf',
  'AST_Tank_Registration_2_of_2_Anonymized.pdf': 'ast_tank_registration_2_of_2.pdf', 
  'AST_Tank_Registration_Signed_Anonymized.pdf': 'ast_tank_registration_signed.pdf',
  'Fireguard_Warranty_Card_Tank6_FG51304B.pdf': 'fireguard_warranty_tank6_fg51304b.pdf',
  'Fireguard_Warranty_Card_Tank7_FG51305A.pdf': 'fireguard_warranty_tank7_fg51305a.pdf'
};

async function uploadDocumentsToR2() {
  try {
    console.log('🚀 Starting document upload to R2...');
    
    // Get all documents with r2_key
    const documentsResult = await pool.query(`
      SELECT id, original_filename, r2_key, mime_type, file_path
      FROM tank_documents 
      WHERE r2_key IS NOT NULL
      ORDER BY original_filename
    `);
    
    console.log(`📄 Found ${documentsResult.rows.length} documents to upload`);
    
    let successCount = 0;
    let errorCount = 0;
    const results = [];
    
    for (const doc of documentsResult.rows) {
      try {
        console.log(`\n📤 Processing: ${doc.original_filename}`);
        console.log(`   R2 Key: ${doc.r2_key}`);
        
        // Find local file
        const localFileName = fileMapping[doc.original_filename];
        if (!localFileName) {
          throw new Error(`No local file mapping found for ${doc.original_filename}`);
        }
        
        const localFilePath = path.join(__dirname, 'public/documents', localFileName);
        console.log(`   Local file: ${localFilePath}`);
        
        // Check if local file exists
        if (!fs.existsSync(localFilePath)) {
          throw new Error(`Local file not found: ${localFilePath}`);
        }
        
        // Read file content
        const fileBuffer = fs.readFileSync(localFilePath);
        const fileSize = fileBuffer.length;
        console.log(`   File size: ${fileSize} bytes`);
        
        // Upload to R2
        const uploadCommand = new PutObjectCommand({
          Bucket: process.env.R2_BUCKET,
          Key: doc.r2_key,
          Body: fileBuffer,
          ContentType: doc.mime_type || 'application/pdf',
          Metadata: {
            'original-filename': doc.original_filename,
            'document-id': doc.id,
            'uploaded-at': new Date().toISOString()
          }
        });
        
        await s3Client.send(uploadCommand);
        console.log(`   ✅ Uploaded to R2: ${doc.r2_key}`);
        
        // Verify upload
        const headCommand = new HeadObjectCommand({
          Bucket: process.env.R2_BUCKET,
          Key: doc.r2_key,
        });
        
        const headResult = await s3Client.send(headCommand);
        console.log(`   ✅ Verified: ${headResult.ContentLength} bytes`);
        
        results.push({
          id: doc.id,
          filename: doc.original_filename,
          r2_key: doc.r2_key,
          local_file: localFileName,
          size: fileSize,
          status: 'success'
        });
        successCount++;
        
      } catch (error) {
        console.error(`   ❌ Failed to upload ${doc.original_filename}:`, error.message);
        results.push({
          id: doc.id,
          filename: doc.original_filename,
          r2_key: doc.r2_key,
          error: error.message,
          status: 'failed'
        });
        errorCount++;
      }
    }
    
    console.log(`\n🎉 Upload completed!`);
    console.log(`   Success: ${successCount}/${documentsResult.rows.length}`);
    console.log(`   Failed: ${errorCount}/${documentsResult.rows.length}`);
    
    // Print summary
    console.log(`\n📊 Upload Summary:`);
    results.forEach(result => {
      if (result.status === 'success') {
        console.log(`✅ ${result.filename} → ${result.r2_key}`);
      } else {
        console.log(`❌ ${result.filename} → ${result.error}`);
      }
    });
    
    return {
      success: errorCount === 0,
      total: documentsResult.rows.length,
      successful: successCount,
      failed: errorCount,
      results: results
    };
    
  } catch (error) {
    console.error('💥 Upload failed:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  uploadDocumentsToR2()
    .then(result => {
      if (result.success) {
        console.log('\n🎉 All documents uploaded successfully to R2!');
        process.exit(0);
      } else {
        console.log(`\n⚠️ Upload completed with ${result.failed} errors`);
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('💥 Upload script failed:', error);
      process.exit(1);
    });
}

module.exports = { uploadDocumentsToR2 };