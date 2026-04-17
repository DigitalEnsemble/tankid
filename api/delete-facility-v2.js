// TankID Facility Deletion API - V2 Schema Compatible
// Supports the current TankID database schema with site_locations and tank_documents

const { Pool } = require('pg');
const { S3Client, DeleteObjectCommand } = require('@aws-sdk/client-s3');

// Database connection
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// R2 configuration
const r2Config = {
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT || 'https://your-account-id.r2.cloudflarestorage.com',
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || ''
  }
};

const r2Client = new S3Client(r2Config);
const R2_BUCKET = process.env.R2_BUCKET || 'tankid-docs';

/**
 * Extract R2 key from a file path or URL
 * @param {string} pathOrUrl - File path or full URL
 * @returns {string|null} - R2 key or null if invalid
 */
function extractR2Key(pathOrUrl) {
  if (!pathOrUrl || typeof pathOrUrl !== 'string') {
    return null;
  }

  // If it's already just a key (no protocol), return as-is
  if (!pathOrUrl.includes('://')) {
    // Remove leading slash if present
    return pathOrUrl.startsWith('/') ? pathOrUrl.substring(1) : pathOrUrl;
  }

  try {
    const url = new URL(pathOrUrl);
    // Extract path and remove leading slash
    let key = url.pathname.startsWith('/') ? url.pathname.substring(1) : url.pathname;
    return key || null;
  } catch {
    return null;
  }
}

/**
 * Get deletion preview for a facility
 * @param {string} facilityId - UUID of the facility to delete
 * @returns {Object} - Preview of what will be deleted
 */
async function getFacilityDeletionPreview(facilityId) {
  const client = await pool.connect();
  
  try {
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(facilityId)) {
      throw new Error(`Invalid UUID format: ${facilityId}`);
    }

    // Get facility details
    const facilityResult = await client.query(
      'SELECT * FROM facilities WHERE id = $1',
      [facilityId]
    );
    
    if (facilityResult.rows.length === 0) {
      throw new Error(`Facility not found: ${facilityId}`);
    }
    
    const facility = facilityResult.rows[0];

    // Get site locations for this facility
    const siteLocationsResult = await client.query(
      'SELECT * FROM site_locations WHERE facility_id = $1 ORDER BY created_at',
      [facilityId]
    );
    
    const siteLocations = siteLocationsResult.rows;

    // Get all tanks associated with this facility through site locations
    const tanksResult = await client.query(`
      SELECT t.*, sl.site_name, tm.manufacturer, tm.model_name, tm.capacity_gallons
      FROM tanks t
      JOIN site_locations sl ON t.site_location_id = sl.id
      LEFT JOIN tank_models tm ON t.model_id = tm.id
      WHERE sl.facility_id = $1
      ORDER BY t.created_at
    `, [facilityId]);
    
    const tanks = tanksResult.rows;
    const tankIds = tanks.map(tank => tank.id);

    // Get tank documents linked to this facility or specific tanks
    const documentsResult = await client.query(`
      SELECT * FROM tank_documents 
      WHERE facility_id = $1 
         OR linked_tanks && $2::uuid[]
      ORDER BY created_at
    `, [facilityId, tankIds]);
    
    const documents = documentsResult.rows;

    // Extract R2 keys from document paths
    const r2Files = [];
    documents.forEach(doc => {
      if (doc.r2_key) {
        r2Files.push({
          document_id: doc.id,
          filename: doc.original_filename || doc.filename,
          r2_key: doc.r2_key,
          doc_type: doc.doc_type
        });
      } else if (doc.file_path) {
        const key = extractR2Key(doc.file_path);
        if (key) {
          r2Files.push({
            document_id: doc.id,
            filename: doc.original_filename || doc.filename,
            r2_key: key,
            doc_type: doc.doc_type
          });
        }
      }
    });

    // Build comprehensive preview
    const preview = {
      facility: {
        id: facility.id,
        name: facility.name,
        address: facility.address,
        city: facility.city,
        state: facility.state,
        state_code: facility.state_code,
        facility_type: facility.facility_type
      },
      site_locations: siteLocations.map(site => ({
        id: site.id,
        site_name: site.site_name,
        site_code: site.site_code,
        description: site.description
      })),
      tanks: tanks.map(tank => ({
        id: tank.id,
        site_name: tank.site_name,
        tank_number: tank.tank_number,
        serial_number: tank.serial_number,
        manufacturer: tank.manufacturer,
        model_name: tank.model_name,
        capacity_gallons: tank.capacity_gallons,
        product_grade: tank.product_grade,
        octane: tank.octane,
        tank_type: tank.tank_type
      })),
      documents: documents.map(doc => ({
        id: doc.id,
        filename: doc.original_filename || doc.filename,
        doc_type: doc.doc_type,
        file_path: doc.file_path,
        r2_key: doc.r2_key,
        linked_tanks: doc.linked_tanks,
        file_size: doc.file_size
      })),
      r2_files: r2Files,
      deletion_summary: {
        facilities: 1,
        site_locations: siteLocations.length,
        tanks: tanks.length,
        documents: documents.length,
        r2_files: r2Files.length
      },
      safety_checks: {
        valid_uuid: true,
        facility_exists: true,
        schema_v2_compatible: true
      }
    };

    return preview;
    
  } finally {
    client.release();
  }
}

/**
 * Delete a facility and all associated data
 * @param {string} facilityId - UUID of the facility to delete
 * @param {Object} options - Deletion options
 * @returns {Object} - Deletion results
 */
async function deleteFacility(facilityId, options = {}) {
  const {
    dryRun = false,
    confirmationPhrase = '',
    skipR2Cleanup = false
  } = options;

  // Production safety check
  if (process.env.NODE_ENV === 'production' && !dryRun) {
    if (confirmationPhrase !== 'DELETE_FACILITY_CONFIRMED') {
      throw new Error('Production deletion requires confirmation phrase: DELETE_FACILITY_CONFIRMED');
    }
  }

  // Get preview first to validate and show what will be deleted
  const preview = await getFacilityDeletionPreview(facilityId);
  
  if (dryRun) {
    return {
      success: true,
      dry_run: true,
      message: `DRY RUN: Would delete facility "${preview.facility.name}"`,
      preview: preview,
      actions_that_would_be_performed: [
        `Delete ${preview.r2_files.length} R2 files`,
        `Delete ${preview.documents.length} document records`,
        `Delete ${preview.tanks.length} tank records`,
        `Delete ${preview.site_locations.length} site location records`,
        `Delete 1 facility record`
      ]
    };
  }

  const client = await pool.connect();
  const deletionResults = {
    success: false,
    facility_id: facilityId,
    facility_name: preview.facility.name,
    r2_deletions: [],
    r2_errors: [],
    database_deletions: {},
    errors: []
  };

  try {
    // Step 1: Delete R2 files (if not skipped)
    if (!skipR2Cleanup && preview.r2_files.length > 0) {
      console.log(`Deleting ${preview.r2_files.length} R2 files...`);
      
      for (const file of preview.r2_files) {
        try {
          await r2Client.send(new DeleteObjectCommand({
            Bucket: R2_BUCKET,
            Key: file.r2_key
          }));
          
          deletionResults.r2_deletions.push({
            r2_key: file.r2_key,
            filename: file.filename,
            doc_type: file.doc_type,
            success: true
          });
          
          console.log(`✓ Deleted R2 file: ${file.filename} (${file.r2_key})`);
        } catch (r2Error) {
          console.error(`✗ Failed to delete R2 file: ${file.filename}`, r2Error.message);
          deletionResults.r2_errors.push({
            r2_key: file.r2_key,
            filename: file.filename,
            error: r2Error.message
          });
          // Continue with database deletion even if some R2 files fail
        }
      }
    }

    // Step 2: Database transaction for all database deletions
    await client.query('BEGIN');

    try {
      // Delete tank documents
      if (preview.documents.length > 0) {
        const documentDeleteResult = await client.query(
          'DELETE FROM tank_documents WHERE facility_id = $1 OR linked_tanks && $2::uuid[]',
          [facilityId, preview.tanks.map(t => t.id)]
        );
        deletionResults.database_deletions.tank_documents = documentDeleteResult.rowCount;
      }

      // Delete tanks (through site locations)
      if (preview.tanks.length > 0) {
        const tankDeleteResult = await client.query(`
          DELETE FROM tanks 
          WHERE site_location_id IN (
            SELECT id FROM site_locations WHERE facility_id = $1
          )
        `, [facilityId]);
        deletionResults.database_deletions.tanks = tankDeleteResult.rowCount;
      }

      // Delete site locations
      if (preview.site_locations.length > 0) {
        const siteLocationDeleteResult = await client.query(
          'DELETE FROM site_locations WHERE facility_id = $1',
          [facilityId]
        );
        deletionResults.database_deletions.site_locations = siteLocationDeleteResult.rowCount;
      }

      // Delete any remaining documents linked to this facility
      const documentsDeleteResult = await client.query(
        'DELETE FROM documents WHERE facility_id = $1',
        [facilityId]
      );
      if (documentsDeleteResult.rowCount > 0) {
        deletionResults.database_deletions.legacy_documents = documentsDeleteResult.rowCount;
      }

      // Finally, delete the facility itself
      const facilityDeleteResult = await client.query(
        'DELETE FROM facilities WHERE id = $1',
        [facilityId]
      );
      deletionResults.database_deletions.facilities = facilityDeleteResult.rowCount;

      if (facilityDeleteResult.rowCount === 0) {
        throw new Error('Facility not found or already deleted');
      }

      await client.query('COMMIT');
      
      deletionResults.success = true;
      deletionResults.message = `Successfully deleted facility "${preview.facility.name}" and all associated data`;
      
      console.log(`✓ Facility deletion completed: ${preview.facility.name}`);
      return deletionResults;

    } catch (dbError) {
      await client.query('ROLLBACK');
      throw dbError;
    }

  } catch (error) {
    deletionResults.errors.push(error.message);
    deletionResults.message = `Deletion failed: ${error.message}`;
    throw error;
    
  } finally {
    client.release();
  }
}

module.exports = {
  getFacilityDeletionPreview,
  deleteFacility,
  extractR2Key
};