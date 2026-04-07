const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { loadTankIDSeedData } = require('./load-tankid-seed');
const { migrateToUUIDs } = require('./migrate-to-uuids');
const { loadEnhancedTankIDSeedData } = require('./load-tankid-seed-enhanced');
const { enhanceExistingTanks } = require('./enhance-existing-tanks');
const { migrateComprehensiveSchema } = require('./migrate-comprehensive-schema');
const { loadComprehensiveData } = require('./load-comprehensive-data');
// Temporarily disabled: migration endpoints
// const { simpleComprehensiveMigration } = require('./simple-comprehensive-migration');
// const { loadSimpleComprehensive } = require('./load-simple-comprehensive');
const { quickFix1643 } = require('./quick-fix-1643');
const { addComprehensiveTanks } = require('./add-comprehensive-tanks');
const { createDocumentsTable } = require('./create-documents-table');
const { simpleUploadDocs } = require('./simple-upload-docs');
const { createDocRecords } = require('./create-doc-records');
const { checkDocsTable } = require('./check-docs-table');
const { createTankDocs } = require('./create-tank-docs');
const { migrateToV2Schema } = require('./migrate-v2-schema');
const { checkSchemaState } = require('./check-schema');
const { completeV2Migration } = require('./complete-v2-migration');
const { debugSchemaDetails } = require('./debug-schema');

const app = express();

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// R2/S3 client configuration
const s3Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  forcePathStyle: true, // Use path-style URLs for R2 compatibility
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY,
    secretAccessKey: process.env.R2_SECRET_KEY,
  },
});

// Serve static documents
app.use('/documents', express.static(path.join(__dirname, 'public', 'documents')));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'tankid-api' });
});

// Debug endpoint to check environment variables
app.get('/debug/env', (req, res) => {
  res.json({
    r2_config: {
      endpoint: process.env.R2_ENDPOINT ? '✅ Set' : '❌ Missing',
      bucket: process.env.R2_BUCKET ? '✅ Set' : '❌ Missing', 
      access_key: process.env.R2_ACCESS_KEY ? '✅ Set' : '❌ Missing',
      secret_key: process.env.R2_SECRET_KEY ? '✅ Set' : '❌ Missing'
    },
    database_url: process.env.DATABASE_URL ? '✅ Set' : '❌ Missing',
    doppler_project: process.env.DOPPLER_PROJECT || '❌ Missing',
    doppler_config: process.env.DOPPLER_CONFIG || '❌ Missing'
  });
});

// Test R2 signed URL generation
app.get('/debug/r2-test/:document_id', async (req, res) => {
  try {
    const { document_id } = req.params;
    
    // Get document by ID
    const docResult = await pool.query('SELECT * FROM tank_documents WHERE id = $1', [document_id]);
    
    if (docResult.rows.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    const doc = docResult.rows[0];
    
    // Test signed URL generation
    const signed_url = await generateSignedUrl(doc.r2_key);
    
    res.json({
      document: {
        id: doc.id,
        original_filename: doc.original_filename,
        r2_key: doc.r2_key
      },
      signed_url_result: signed_url || 'Failed to generate',
      r2_config: {
        endpoint: process.env.R2_ENDPOINT,
        bucket: process.env.R2_BUCKET,
        access_key_length: process.env.R2_ACCESS_KEY?.length || 0,
        secret_key_length: process.env.R2_SECRET_KEY?.length || 0
      }
    });
    
  } catch (error) {
    res.status(500).json({
      error: error.message,
      stack: error.stack
    });
  }
});

// List all facilities with tank counts (v2 schema)
app.get('/facilities', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT f.*, COUNT(t.id) as tank_count
      FROM facilities f
      LEFT JOIN site_locations sl ON sl.facility_id = f.id
      LEFT JOIN tanks t ON t.site_location_id = sl.id
      GROUP BY f.id
      ORDER BY tank_count DESC, f.name ASC
    `);

    const facilities = result.rows.map(row => ({
      id: row.id,
      state_code: row.state_code,
      state_facility_id: row.state_facility_id,
      name: row.name,
      address: row.address,
      city: row.city,
      state: row.state,
      tank_count: parseInt(row.tank_count)
    }));

    res.json({ facilities });
  } catch (err) {
    console.error('Facilities API error:', err.message);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

// Helper endpoint to lookup facilities by any ID format
app.get('/lookup/facility/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let facility;

    // If it looks like a UUID, query directly
    if (UUID.test(id)) {
      const result = await pool.query('SELECT * FROM facilities WHERE id = $1', [id]);
      facility = result.rows[0];
    } else {
      // Search for facility by ops_facility_id, name, or other identifiers (v2 schema)
      const result = await pool.query(`
        SELECT f.*, COUNT(t.id) as tank_count
        FROM facilities f
        LEFT JOIN site_locations sl ON sl.facility_id = f.id
        LEFT JOIN tanks t ON t.site_location_id = sl.id
        WHERE f.ops_facility_id = $1
           OR f.state_facility_id = $1
           OR f.name ILIKE '%' || $1 || '%'
           OR f.city ILIKE '%' || $1 || '%'
        GROUP BY f.id
        ORDER BY
          CASE WHEN f.ops_facility_id = $1 OR f.state_facility_id = $1 THEN 1 ELSE 2 END,
          tank_count DESC,
          f.created_at ASC
        LIMIT 1
      `, [id]);
      facility = result.rows[0];
    }

    if (!facility) {
      return res.status(404).json({ error: 'No facilities found' });
    }

    const tankCount = facility.tank_count || 0;
    delete facility.tank_count; // Remove count from response

    res.json({
      message: `Found facility: ${facility.name} (${tankCount} tanks)`,
      facilityId: facility.id,
      facility: facility,
      tankCount: tankCount,
      redirectUrl: `/facility/${facility.id}`
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Load TankID seed data endpoint
app.get('/load-tankid-seed', async (req, res) => {
  try {
    const result = await loadTankIDSeedData();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to load TankID seed data'
    });
  }
});

// Debug detailed schema structures  
app.get('/debug-schema', async (req, res) => {
  try {
    const result = await debugSchemaDetails();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to debug schema'
    });
  }
});

// Check current schema state
app.get('/check-schema', async (req, res) => {
  try {
    const result = await checkSchemaState();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to check schema state'
    });
  }
});

// Complete partial v2 migration (recovery)
app.get('/complete-v2-migration', async (req, res) => {
  try {
    const result = await completeV2Migration();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to complete v2 migration'
    });
  }
});

// Migrate to v2 schema endpoint (full migration from v1)
app.get('/migrate-v2-schema', async (req, res) => {
  try {
    const result = await migrateToV2Schema();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to migrate to v2 schema'
    });
  }
});

// Quick fix for 1643 facility
app.get('/quick-fix-1643', async (req, res) => {
  try {
    const result = await quickFix1643();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to run quick fix for 1643'
    });
  }
});

// Add comprehensive tanks to 1643 facility
app.get('/add-comprehensive-tanks', async (req, res) => {
  try {
    const result = await addComprehensiveTanks();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to add comprehensive tanks'
    });
  }
});

// Create documents table and upload tank documents
app.get('/upload-tank-documents', async (req, res) => {
  try {
    const result = await createDocumentsTable();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to upload tank documents'
    });
  }
});

// Simple document setup check
app.get('/setup-documents', async (req, res) => {
  try {
    const result = await simpleUploadDocs();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to setup documents'
    });
  }
});

// Create document records
app.get('/create-doc-records', async (req, res) => {
  try {
    const result = await createDocRecords();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to create document records'
    });
  }
});

// Check documents table structure
app.get('/check-docs-table', async (req, res) => {
  try {
    const result = await checkDocsTable();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to check documents table'
    });
  }
});

// Create tank documents with proper table
app.get('/create-tank-docs', async (req, res) => {
  try {
    const result = await createTankDocs();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to create tank documents'
    });
  }
});

// Simple migration endpoints temporarily disabled
// Will be re-enabled after fixing module loading issues

// Migrate to comprehensive schema
app.get('/migrate-comprehensive', async (req, res) => {
  try {
    const result = await migrateComprehensiveSchema();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to migrate comprehensive schema'
    });
  }
});

// Load comprehensive data
app.get('/load-comprehensive', async (req, res) => {
  try {
    const result = await loadComprehensiveData();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to load comprehensive data'
    });
  }
});

// Enhance existing tanks with detailed specifications
app.get('/enhance-tanks', async (req, res) => {
  try {
    const result = await enhanceExistingTanks();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to enhance tanks'
    });
  }
});

// Load enhanced TankID seed data with full specifications
app.get('/load-enhanced-seed', async (req, res) => {
  try {
    const result = await loadEnhancedTankIDSeedData();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to load enhanced seed data'
    });
  }
});

// Migrate to UUIDs endpoint
app.get('/migrate-to-uuids', async (req, res) => {
  try {
    const result = await migrateToUUIDs();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to migrate to UUIDs'
    });
  }
});

// Run R2 database migration
app.post('/migrate/add-r2-key', async (req, res) => {
  try {
    console.log('🚀 Starting R2 migration: add r2_key column');
    
    // Migration SQL
    const migrationSQL = `
      BEGIN;
      
      -- Add r2_key column to tank_documents table
      ALTER TABLE tank_documents 
      ADD COLUMN r2_key VARCHAR(512) NULL;
      
      -- Add comment for documentation
      COMMENT ON COLUMN tank_documents.r2_key IS 'Cloudflare R2 object key for document storage';
      
      -- Create index for faster R2 key lookups
      CREATE INDEX idx_tank_documents_r2_key ON tank_documents(r2_key) WHERE r2_key IS NOT NULL;
      
      COMMIT;
    `;
    
    console.log('📄 Executing migration SQL...');
    await pool.query(migrationSQL);
    
    // Verify the column was added
    const verifyResult = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'tank_documents' AND column_name = 'r2_key'
    `);
    
    if (verifyResult.rows.length > 0) {
      console.log('✅ Migration successful: r2_key column added');
      res.json({
        success: true,
        message: 'R2 migration completed successfully',
        column_details: verifyResult.rows[0]
      });
    } else {
      throw new Error('Migration verification failed: r2_key column not found');
    }
    
  } catch (error) {
    console.error('💥 R2 migration failed:', error.message);
    
    // Check if column already exists
    if (error.message.includes('already exists')) {
      res.json({
        success: true,
        message: 'R2 migration skipped: r2_key column already exists',
        already_exists: true
      });
    } else {
      res.status(500).json({
        success: false,
        error: error.message,
        message: 'R2 migration failed'
      });
    }
  }
});

// Upload documents to R2 endpoint  
app.post('/migrate/upload-to-r2', async (req, res) => {
  try {
    console.log('🚀 Starting file upload to R2...');
    
    const { uploadDocumentsToR2 } = require('./upload_to_r2');
    const result = await uploadDocumentsToR2();
    
    res.json({
      success: true,
      message: 'Document upload to R2 completed',
      ...result
    });
    
  } catch (error) {
    console.error('💥 Document upload to R2 failed:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Document upload to R2 failed'
    });
  }
});

// Documents migration to R2 endpoint
app.post('/migrate/documents-to-r2', async (req, res) => {
  try {
    console.log('🚀 Starting document migration to R2...');
    
    // Check R2 configuration
    if (!process.env.R2_ENDPOINT || !process.env.R2_BUCKET || !process.env.R2_ACCESS_KEY || !process.env.R2_SECRET_KEY) {
      throw new Error('R2 configuration incomplete. Check R2_ENDPOINT, R2_BUCKET, R2_ACCESS_KEY, R2_SECRET_KEY');
    }
    
    // Get all documents that need migration (no r2_key yet)
    const documentsResult = await pool.query(`
      SELECT id, original_filename, file_path, mime_type, file_size
      FROM tank_documents 
      WHERE r2_key IS NULL
      ORDER BY created_at
    `);
    
    console.log(`📄 Found ${documentsResult.rows.length} documents to migrate`);
    
    let successCount = 0;
    let errorCount = 0;
    const results = [];
    
    for (const doc of documentsResult.rows) {
      try {
        console.log(`📤 Processing: ${doc.original_filename}`);
        
        // Generate R2 key (folder structure: documents/YYYY/MM/filename)
        const uploadDate = new Date();
        const year = uploadDate.getFullYear();
        const month = String(uploadDate.getMonth() + 1).padStart(2, '0');
        const r2Key = `documents/${year}/${month}/${doc.id}_${doc.original_filename}`;
        
        // For now, just update the database with the R2 key
        // (actual file upload would happen separately)
        await pool.query(`
          UPDATE tank_documents 
          SET r2_key = $1, updated_at = NOW()
          WHERE id = $2
        `, [r2Key, doc.id]);
        
        console.log(`✅ Updated database: ${doc.original_filename} → ${r2Key}`);
        results.push({ id: doc.id, filename: doc.original_filename, r2_key: r2Key, status: 'success' });
        successCount++;
        
      } catch (error) {
        console.error(`❌ Failed to process ${doc.original_filename}:`, error.message);
        results.push({ id: doc.id, filename: doc.original_filename, error: error.message, status: 'failed' });
        errorCount++;
      }
    }
    
    console.log(`🎉 Migration completed! Success: ${successCount}, Errors: ${errorCount}`);
    
    res.json({
      success: true,
      message: 'Document migration completed',
      statistics: {
        total_processed: documentsResult.rows.length,
        successful: successCount,
        failed: errorCount
      },
      results: results
    });
    
  } catch (error) {
    console.error('💥 Document migration failed:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Document migration to R2 failed'
    });
  }
});

console.log('About to register facility route...');

// Helper function to generate signed URL
async function generateSignedUrl(r2Key) {
  if (!r2Key || !process.env.R2_BUCKET) return null;
  
  try {
    const command = new GetObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key: r2Key,
    });
    
    return await getSignedUrl(s3Client, command, { expiresIn: 900 }); // 15 minutes
  } catch (error) {
    console.error('Error generating signed URL for', r2Key, ':', error.message);
    return null;
  }
}

// OLD ROUTE REMOVED - moved to proper location after search routes

// UPDATED: GET /tank/:id - Enhanced with site_location joins
app.get('/tank/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!UUID.test(id)) return res.status(400).json({ error: 'Invalid tank ID format' });

    const t = await pool.query(`
      SELECT t.*, 
             sl.site_name, sl.site_code,
             f.name AS facility_name, f.city, f.state,
             f.state_code, f.state_facility_id, f.client_facility_id, f.installer_facility_id,
             m.manufacturer, m.model_name, m.capacity_gallons
      FROM tanks t
      JOIN site_locations sl ON sl.id = t.site_location_id
      JOIN facilities f ON f.id = sl.facility_id
      LEFT JOIN tank_models m ON m.id = t.model_id
      WHERE t.id = $1
    `, [id]);

    if (!t.rows.length) return res.status(404).json({ error: 'Tank not found' });

    const tankRow = t.rows[0];

    // Format comprehensive tank data with site location context
    const tank = {
      id: tankRow.id,
      tank_number: tankRow.tank_number || '1',
      state_tank_id: tankRow.state_tank_id,
      facility_tank_id: tankRow.facility_tank_id,
      installer_tank_id: tankRow.installer_tank_id,
      serial_number: tankRow.serial_number,
      fireguard_label: tankRow.fireguard_label,

      // Site location context
      site_location_id: tankRow.site_location_id,
      site_name: tankRow.site_name,
      site_code: tankRow.site_code,

      // Tank type specific fields
      tank_type: tankRow.tank_type || 'AST',
      installed_depth_inches: tankRow.tank_type === 'UST' ? tankRow.installed_depth_inches : null,

      // Installation details
      install_date: tankRow.install_date,
      initial_work_date: tankRow.initial_work_date,
      install_contractor: tankRow.install_contractor,
      last_inspection_date: tankRow.last_inspection_date,

      // ATG system info
      atg_brand: tankRow.atg_brand || 'Veeder-Root',
      atg_model: tankRow.atg_model || 'TLS-350',
      atg_last_calibration: tankRow.atg_last_calibration,

      // Product info
      product_grade: tankRow.product_grade || 'Regular Unleaded',
      octane: tankRow.octane || 87,
      ethanol_pct: tankRow.ethanol_pct || 10,

      // Facility context
      facility_id: tankRow.facility_id,
      facility_name: tankRow.facility_name,
      state_code: tankRow.state_code,
      state_facility_id: tankRow.state_facility_id,
      client_facility_id: tankRow.client_facility_id,
      installer_facility_id: tankRow.installer_facility_id,
      city: tankRow.city,
      state: tankRow.state,

      // Tank model info
      manufacturer: tankRow.manufacturer,
      model_name: tankRow.model_name,
      nominal_capacity_gal: tankRow.capacity_gallons,
      actual_capacity_gal: tankRow.capacity_gallons
    };

    res.json({ tank });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// NEW: GET /facility/search - Search by state + facility number
app.get('/facility/search', async (req, res) => {
  try {
    const { state, q } = req.query;
    
    if (!state) {
      return res.status(400).json({ error: 'State parameter is required' });
    }

    if (!q) {
      return res.status(400).json({ error: 'Query parameter q (facility number) is required' });
    }

    // Search across all three facility ID columns
    const result = await pool.query(`
      SELECT f.*
      FROM facilities f
      WHERE f.state_code = $1 
        AND (f.state_facility_id = $2 
             OR f.client_facility_id = $2 
             OR f.installer_facility_id = $2)
      LIMIT 1
    `, [state.toUpperCase(), q]);

    if (!result.rows.length) {
      return res.status(404).json({ 
        error: `Not found in ${state.toUpperCase()}. Try a different state or check the facility number.`
      });
    }

    const facility = result.rows[0];

    // Get site locations with tank counts
    const sitesResult = await pool.query(`
      SELECT sl.id, sl.site_name, sl.site_code,
             COUNT(t.id) as tank_count
      FROM site_locations sl
      LEFT JOIN tanks t ON t.site_location_id = sl.id
      WHERE sl.facility_id = $1
      GROUP BY sl.id, sl.site_name, sl.site_code
      ORDER BY sl.site_name
    `, [facility.id]);

    const site_locations = sitesResult.rows.map(row => ({
      id: row.id,
      site_name: row.site_name,
      site_code: row.site_code,
      tank_count: parseInt(row.tank_count)
    }));

    res.json({ 
      facility: {
        id: facility.id,
        name: facility.name,
        state_code: facility.state_code,
        state_facility_id: facility.state_facility_id,
        client_facility_id: facility.client_facility_id,
        installer_facility_id: facility.installer_facility_id,
        address: facility.address,
        city: facility.city,
        state: facility.state,
        zip: facility.zip
      },
      site_locations
    });
  } catch (err) {
    console.error('Facility search error:', err.message);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

// NEW: GET /facility/:id/sites - Get all site locations for a facility
app.get('/facility/:id/sites', async (req, res) => {
  try {
    const { id } = req.params;
    if (!UUID.test(id)) return res.status(400).json({ error: 'Invalid facility ID format' });

    const result = await pool.query(`
      SELECT sl.id, sl.site_name, sl.site_code,
             COUNT(t.id) as tank_count
      FROM site_locations sl
      LEFT JOIN tanks t ON t.site_location_id = sl.id
      WHERE sl.facility_id = $1
      GROUP BY sl.id, sl.site_name, sl.site_code
      ORDER BY sl.site_name
    `, [id]);

    const sites = result.rows.map(row => ({
      id: row.id,
      site_name: row.site_name,
      site_code: row.site_code,
      tank_count: parseInt(row.tank_count)
    }));

    res.json({ sites });
  } catch (err) {
    console.error('Facility sites error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// UPDATED: GET /facility/:id - Now works with v2 schema (via site_locations)
app.get('/facility/:id', async (req, res) => {
  console.log('Facility detail route called!');
  try {
    const { id } = req.params;
    if (!UUID.test(id)) return res.status(400).json({ error: 'Invalid facility ID format' });

    const fac = await pool.query('SELECT * FROM facilities WHERE id = $1', [id]);
    if (!fac.rows.length) return res.status(404).json({ error: 'Facility not found' });

    // Get tanks through site_locations (v2 schema)
    const tanks = await pool.query(`
      SELECT t.*, m.manufacturer, m.model_name, m.capacity_gallons,
             sl.site_name, sl.site_code
      FROM tanks t
      JOIN site_locations sl ON sl.id = t.site_location_id
      LEFT JOIN tank_models m ON m.id = t.model_id
      WHERE sl.facility_id = $1
      ORDER BY sl.site_name ASC, t.tank_number ASC, t.id ASC
    `, [id]);

    // Get site locations with tank counts
    const sites = await pool.query(`
      SELECT sl.id, sl.site_name, sl.site_code,
             COUNT(t.id) as tank_count
      FROM site_locations sl
      LEFT JOIN tanks t ON t.site_location_id = sl.id
      WHERE sl.facility_id = $1
      GROUP BY sl.id, sl.site_name, sl.site_code
      ORDER BY sl.site_name
    `, [id]);

    const facility = {
      ...fac.rows[0],
      site_locations: sites.rows.map(row => ({
        id: row.id,
        site_name: row.site_name,
        site_code: row.site_code,
        tank_count: parseInt(row.tank_count)
      })),
      total_tank_count: tanks.rows.length
    };

    res.json({ facility, tanks: tanks.rows });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// NEW: GET /site/:id/tanks - Get all tanks for a site location
app.get('/site/:id/tanks', async (req, res) => {
  try {
    const { id } = req.params;
    if (!UUID.test(id)) return res.status(400).json({ error: 'Invalid site ID format' });

    const result = await pool.query(`
      SELECT t.id, t.tank_number, t.state_tank_id, t.facility_tank_id, t.installer_tank_id,
             t.product_grade, t.serial_number,
             m.manufacturer, m.model_name, m.capacity_gallons
      FROM tanks t
      LEFT JOIN tank_models m ON m.id = t.model_id
      WHERE t.site_location_id = $1
      ORDER BY t.tank_number ASC, t.id ASC
    `, [id]);

    const tanks = result.rows;

    res.json({ tanks });
  } catch (err) {
    console.error('Site tanks error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// UPDATED: GET /tank/:id/documents - Return document metadata with signed URLs
app.get('/tank/:id/documents', async (req, res) => {
  try {
    const { id } = req.params;
    if (!UUID.test(id)) return res.status(400).json({ error: 'Invalid tank ID format' });

    // Query for documents related to this tank (R2 integration enabled)
    const documentsResult = await pool.query(`
      SELECT 
        id, original_filename, doc_type, description, 
        file_path, r2_key, file_size, created_at
      FROM tank_documents 
      WHERE $1 = ANY(linked_tanks)
      ORDER BY doc_type, original_filename
    `, [id]);

    const documents = [];
    
    for (const doc of documentsResult.rows) {
      let signed_url = null;
      let expires_at = null;

      // Prefer R2 signed URLs, fallback to legacy file_path
      if (doc.r2_key) {
        signed_url = await generateSignedUrl(doc.r2_key);
        if (signed_url) {
          expires_at = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 minutes from now
        }
      }
      
      // Fallback to legacy file_path if R2 failed or not available
      if (!signed_url && doc.file_path) {
        signed_url = `https://tankid-api.fly.dev${doc.file_path}`;
        expires_at = null; // Legacy URLs don't expire
      }

      documents.push({
        id: doc.id,
        doc_type: doc.doc_type,
        original_filename: doc.original_filename,
        signed_url,
        expires_at
      });
    }

    res.json({ documents });
  } catch (err) {
    console.error('Tank documents error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// LEGACY: Keep existing documents endpoint for backward compatibility
app.get('/documents/:entityType/:entityId', async (req, res) => {
  try {
    const { entityType, entityId } = req.params;

    let query, params;

    if (entityType === 'facility') {
      // Get documents for facility 
      query = `
        SELECT d.*, d.r2_key
        FROM tank_documents d
        WHERE d.facility_id = $1
        ORDER BY d.doc_type, d.original_filename
      `;
      params = [entityId];
    } else if (entityType === 'tank') {
      // Get documents for specific tank (by tank UUID)
      query = `
        SELECT *, r2_key FROM tank_documents
        WHERE $1 = ANY(linked_tanks)
        ORDER BY doc_type, original_filename
      `;
      params = [entityId];
    } else {
      return res.status(400).json({ error: 'Invalid entity type. Use facility or tank.' });
    }

    const result = await pool.query(query, params);
    
    // Add signed URLs to legacy endpoint with R2 support
    const documents = [];
    for (const doc of result.rows) {
      let signed_url = null;
      let expires_at = null;
      
      // Prefer R2 signed URLs, fallback to legacy file_path
      if (doc.r2_key) {
        signed_url = await generateSignedUrl(doc.r2_key);
        if (signed_url) {
          expires_at = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 minutes from now
        }
      }
      
      // Fallback to legacy file_path if R2 failed or not available
      if (!signed_url && doc.file_path) {
        signed_url = `https://tankid-api.fly.dev${doc.file_path}`;
        expires_at = null;
      }
      
      documents.push({
        ...doc,
        signed_url,
        expires_at
      });
    }
    
    res.json({ documents });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`TankID API running on port ${PORT}`);
  console.log('R2 Configuration:', {
    endpoint: process.env.R2_ENDPOINT ? '✓ Set' : '✗ Missing',
    bucket: process.env.R2_BUCKET ? '✓ Set' : '✗ Missing',
    accessKey: process.env.R2_ACCESS_KEY ? '✓ Set' : '✗ Missing',
    secretKey: process.env.R2_SECRET_KEY ? '✓ Set' : '✗ Missing'
  });
});