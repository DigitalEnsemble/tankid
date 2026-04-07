#!/usr/bin/env node

const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// R2 Configuration
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

async function migrateDocumentsToR2() {
  try {
    console.log('🚀 Starting document migration to R2...');
    
    // Get all documents that need migration (no r2_key yet)
    const documentsResult = await pool.query(`
      SELECT id, original_filename, file_path, mime_type
      FROM tank_documents 
      WHERE r2_key IS NULL
      ORDER BY created_at
    `);
    
    console.log(`📄 Found ${documentsResult.rows.length} documents to migrate`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const doc of documentsResult.rows) {
      try {
        console.log(`📤 Uploading: ${doc.original_filename}`);
        
        // Generate R2 key (folder structure: documents/YYYY/MM/filename)
        const uploadDate = new Date();
        const year = uploadDate.getFullYear();
        const month = String(uploadDate.getMonth() + 1).padStart(2, '0');
        const r2Key = `documents/${year}/${month}/${doc.id}_${doc.original_filename}`;
        
        // Read the local file
        const localPath = path.join(process.cwd(), 'public', doc.file_path);
        if (!fs.existsSync(localPath)) {
          console.error(`❌ Local file not found: ${localPath}`);
          errorCount++;
          continue;
        }
        
        const fileContent = fs.readFileSync(localPath);
        
        // Upload to R2
        const uploadCommand = new PutObjectCommand({
          Bucket: process.env.R2_BUCKET,
          Key: r2Key,
          Body: fileContent,
          ContentType: doc.mime_type || 'application/octet-stream',
          Metadata: {
            originalFilename: doc.original_filename,
            documentId: doc.id,
            migratedAt: new Date().toISOString()
          }
        });
        
        await s3Client.send(uploadCommand);
        
        // Update database with R2 key
        await pool.query(`
          UPDATE tank_documents 
          SET r2_key = $1, updated_at = NOW()
          WHERE id = $2
        `, [r2Key, doc.id]);
        
        console.log(`✅ Migrated: ${doc.original_filename} → ${r2Key}`);
        successCount++;
        
      } catch (error) {
        console.error(`❌ Failed to migrate ${doc.original_filename}:`, error.message);
        errorCount++;
      }
    }
    
    console.log(`\n🎉 Migration completed!`);
    console.log(`✅ Success: ${successCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    
    if (successCount > 0) {
      console.log('\n📊 Verifying R2 integration...');
      
      // Test signed URL generation
      const testResult = await pool.query(`
        SELECT id, original_filename, r2_key
        FROM tank_documents 
        WHERE r2_key IS NOT NULL
        LIMIT 1
      `);
      
      if (testResult.rows.length > 0) {
        const testDoc = testResult.rows[0];
        console.log(`🧪 Test document: ${testDoc.original_filename}`);
        console.log(`🔑 R2 key: ${testDoc.r2_key}`);
        
        // Test API endpoint
        console.log('\n🌐 Test the API now:');
        console.log(`curl "https://tankid-api.fly.dev/tank/{tank-id}/documents"`);
      }
    }
    
  } catch (error) {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  migrateDocumentsToR2();
}

module.exports = { migrateDocumentsToR2 };