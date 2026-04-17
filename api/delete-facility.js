const { Pool } = require('pg');
const { S3Client, DeleteObjectCommand } = require('@aws-sdk/client-s3');

// Database connection
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// R2 client configuration
const r2Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY,
    secretAccessKey: process.env.R2_SECRET_KEY,
  },
});

const config = {
  bucketName: process.env.R2_BUCKET || 'tankid-docs',
  // Production safeguards
  requireConfirmation: process.env.NODE_ENV === 'production',
  allowedEnvironments: ['development', 'staging', 'production'],
  confirmationPhrase: 'DELETE_FACILITY_CONFIRMED'
};

/**
 * Extract R2 key from file URL
 * @param {string} fileUrl - Full URL to R2 file
 * @returns {string|null} - R2 object key or null if invalid
 */
function extractR2Key(fileUrl) {
  if (!fileUrl) return null;
  
  // Handle different URL formats:
  // https://bucket.r2.dev/documents/... -> documents/...
  // https://custom-domain.com/documents/... -> documents/...
  try {
    const url = new URL(fileUrl);
    let path = url.pathname;
    
    // Remove leading slash
    if (path.startsWith('/')) {
      path = path.substring(1);
    }
    
    return path;
  } catch (error) {
    console.error('Invalid file URL:', fileUrl);
    return null;
  }
}

/**
 * Delete a file from R2 storage
 * @param {string} fileKey - R2 object key
 * @returns {Promise<boolean>} - Success status
 */
async function deleteFileFromR2(fileKey) {
  try {
    const command = new DeleteObjectCommand({
      Bucket: config.bucketName,
      Key: fileKey,
    });
    
    await r2Client.send(command);
    console.log(`✓ Deleted file from R2: ${fileKey}`);
    return true;
  } catch (error) {
    console.error(`✗ Failed to delete file from R2: ${fileKey}`, error.message);
    return false;
  }
}

/**
 * Get all data that will be deleted for a facility (for preview/confirmation)
 * @param {string} facilityId - UUID of facility to delete
 * @returns {Promise<Object>} - Summary of what will be deleted
 */
async function getFacilityDeletionPreview(facilityId) {
  const client = await pool.connect();
  
  try {
    // Get facility info
    const facilityResult = await client.query(
      'SELECT id, name, address, city, state FROM facilities WHERE id = $1',
      [facilityId]
    );
    
    if (!facilityResult.rows.length) {
      throw new Error('Facility not found');
    }
    
    const facility = facilityResult.rows[0];
    
    // Get tanks
    const tanksResult = await client.query(
      'SELECT id, tank_number, serial_number FROM tanks WHERE facility_id = $1',
      [facilityId]
    );
    
    // Get documents
    const documentsResult = await client.query(`
      SELECT d.id, d.doc_type, d.file_url, d.original_name, t.tank_number
      FROM documents d
      JOIN tanks t ON t.id = d.tank_id
      WHERE t.facility_id = $1
    `, [facilityId]);
    
    return {
      facility,
      tanks: tanksResult.rows,
      documents: documentsResult.rows,
      summary: {
        tanksCount: tanksResult.rows.length,
        documentsCount: documentsResult.rows.length
      }
    };
    
  } finally {
    client.release();
  }
}

/**
 * Delete facility and all associated data
 * @param {string} facilityId - UUID of facility to delete
 * @param {Object} options - Deletion options
 * @returns {Promise<Object>} - Deletion result
 */
async function deleteFacility(facilityId, options = {}) {
  const {
    confirmationPhrase,
    dryRun = false,
    skipR2Cleanup = false
  } = options;
  
  // Production safety checks
  if (config.requireConfirmation && confirmationPhrase !== config.confirmationPhrase) {
    throw new Error(`Production deletion requires confirmation phrase: "${config.confirmationPhrase}"`);
  }
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Get preview of what will be deleted
    const preview = await getFacilityDeletionPreview(facilityId);
    
    let deletionResult = {
      facility: preview.facility,
      deletedTanks: [],
      deletedDocuments: [],
      failedR2Deletions: [],
      summary: {
        tanksDeleted: 0,
        documentsDeleted: 0,
        r2FilesDeleted: 0,
        r2FilesFailed: 0
      }
    };
    
    if (dryRun) {
      await client.query('ROLLBACK');
      return {
        dryRun: true,
        preview,
        message: 'Dry run completed. No data was actually deleted.'
      };
    }
    
    // Delete files from R2 first (before database deletion)
    if (!skipR2Cleanup && preview.documents.length > 0) {
      console.log(`Deleting ${preview.documents.length} files from R2...`);
      
      for (const doc of preview.documents) {
        const r2Key = extractR2Key(doc.file_url);
        if (r2Key) {
          const success = await deleteFileFromR2(r2Key);
          if (success) {
            deletionResult.summary.r2FilesDeleted++;
          } else {
            deletionResult.summary.r2FilesFailed++;
            deletionResult.failedR2Deletions.push({
              documentId: doc.id,
              fileUrl: doc.file_url,
              r2Key
            });
          }
        }
      }
    }
    
    // Delete from database (CASCADE will handle relationships)
    console.log('Deleting facility from database...');
    const deleteResult = await client.query(
      'DELETE FROM facilities WHERE id = $1 RETURNING id, name',
      [facilityId]
    );
    
    if (!deleteResult.rows.length) {
      throw new Error('Facility not found or already deleted');
    }
    
    deletionResult.summary.tanksDeleted = preview.tanks.length;
    deletionResult.summary.documentsDeleted = preview.documents.length;
    deletionResult.deletedTanks = preview.tanks;
    deletionResult.deletedDocuments = preview.documents;
    
    await client.query('COMMIT');
    
    console.log(`✓ Successfully deleted facility: ${preview.facility.name} (${facilityId})`);
    console.log(`   • Tanks deleted: ${deletionResult.summary.tanksDeleted}`);
    console.log(`   • Documents deleted: ${deletionResult.summary.documentsDeleted}`);
    console.log(`   • R2 files deleted: ${deletionResult.summary.r2FilesDeleted}`);
    
    if (deletionResult.summary.r2FilesFailed > 0) {
      console.warn(`   ⚠ R2 files failed: ${deletionResult.summary.r2FilesFailed}`);
    }
    
    return deletionResult;
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error during facility deletion:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  getFacilityDeletionPreview,
  deleteFacility,
  extractR2Key,
  deleteFileFromR2,
  config
};