#!/usr/bin/env node

const { getFacilityDeletionPreview, deleteFacility, config } = require('./delete-facility');
const { Pool } = require('pg');

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

function colorize(text, color) {
  return colors[color] + text + colors.reset;
}

function printUsage() {
  console.log(colorize('\nTankID Facility Deletion CLI', 'cyan'));
  console.log(colorize('================================', 'cyan'));
  console.log('\nUsage:');
  console.log('  node delete-facility-cli.js <command> <facility-id> [options]');
  console.log('\nCommands:');
  console.log(colorize('  preview', 'green') + '  <facility-id>           Show what will be deleted');
  console.log(colorize('  delete', 'red') + '   <facility-id> [options]  Delete facility and all data');
  console.log(colorize('  list', 'blue') + '                            List all facilities');
  console.log('\nOptions for delete:');
  console.log('  --dry-run                  Preview deletion without actually deleting');
  console.log('  --skip-r2                  Skip R2 file cleanup (database only)');
  console.log('  --confirm <phrase>         Production confirmation phrase');
  console.log('\nExamples:');
  console.log('  node delete-facility-cli.js list');
  console.log('  node delete-facility-cli.js preview 123e4567-e89b-12d3-a456-426614174000');
  console.log('  node delete-facility-cli.js delete 123e4567-e89b-12d3-a456-426614174000 --dry-run');
  console.log('  node delete-facility-cli.js delete 123e4567-e89b-12d3-a456-426614174000 --confirm DELETE_FACILITY_CONFIRMED');
  console.log('');
}

async function listFacilities() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  
  try {
    const result = await client.query(`
      SELECT f.id, f.name, f.city, f.state,
             COUNT(t.id) as tank_count
      FROM facilities f
      LEFT JOIN tanks t ON t.facility_id = f.id
      GROUP BY f.id, f.name, f.city, f.state
      ORDER BY f.name
    `);
    
    console.log(colorize('\nFacilities in TankID Database:', 'cyan'));
    console.log(colorize('='.repeat(80), 'cyan'));
    
    if (result.rows.length === 0) {
      console.log(colorize('No facilities found.', 'yellow'));
      return;
    }
    
    result.rows.forEach(facility => {
      const location = [facility.city, facility.state].filter(Boolean).join(', ');
      console.log(`${colorize(facility.name, 'white')} (${facility.tank_count} tanks)`);
      console.log(`  ID: ${colorize(facility.id, 'blue')}`);
      if (location) console.log(`  Location: ${location}`);
    });
    
  } finally {
    client.release();
    await pool.end();
  }
}

async function previewDeletion(facilityId) {
  try {
    const preview = await getFacilityDeletionPreview(facilityId);
    
    console.log(colorize('\nFacility Deletion Preview:', 'yellow'));
    console.log(colorize('='.repeat(50), 'yellow'));
    
    console.log(colorize('\nFacility:', 'cyan'));
    console.log(`  Name: ${preview.facility.name}`);
    console.log(`  ID: ${preview.facility.id}`);
    console.log(`  Address: ${preview.facility.address}, ${preview.facility.city}, ${preview.facility.state}`);
    
    console.log(colorize('\nTanks to be deleted:', 'magenta'));
    if (preview.tanks.length === 0) {
      console.log('  (None)');
    } else {
      preview.tanks.forEach(tank => {
        console.log(`  • Tank #${tank.tank_number} (ID: ${tank.id})`);
        if (tank.serial_number) console.log(`    Serial: ${tank.serial_number}`);
      });
    }
    
    console.log(colorize('\nDocuments to be deleted:', 'magenta'));
    if (preview.documents.length === 0) {
      console.log('  (None)');
    } else {
      preview.documents.forEach(doc => {
        console.log(`  • ${doc.original_name || doc.doc_type} (Tank #${doc.tank_number})`);
        console.log(`    File: ${doc.file_url}`);
      });
    }
    
    console.log(colorize('\nSummary:', 'white'));
    console.log(`  Tanks: ${preview.summary.tanksCount}`);
    console.log(`  Documents: ${preview.summary.documentsCount}`);
    
    if (config.requireConfirmation) {
      console.log(colorize('\n⚠️  Production mode - Confirmation required for deletion!', 'red'));
      console.log(`Required phrase: "${config.confirmationPhrase}"`);
    }
    
  } catch (error) {
    console.error(colorize('Error:', 'red'), error.message);
    process.exit(1);
  }
}

async function performDeletion(facilityId, options) {
  try {
    console.log(colorize('\nStarting facility deletion...', 'yellow'));
    
    const result = await deleteFacility(facilityId, options);
    
    if (result.dryRun) {
      console.log(colorize('\n✓ Dry run completed successfully!', 'green'));
      console.log('  Preview of what would be deleted:');
      console.log(`    Facility: ${result.preview.facility.name}`);
      console.log(`    Tanks: ${result.preview.summary.tanksCount}`);
      console.log(`    Documents: ${result.preview.summary.documentsCount}`);
    } else {
      console.log(colorize('\n✓ Facility deletion completed!', 'green'));
      console.log(`  Facility: ${result.facility.name}`);
      console.log(`  Tanks deleted: ${result.summary.tanksDeleted}`);
      console.log(`  Documents deleted: ${result.summary.documentsDeleted}`);
      console.log(`  R2 files deleted: ${result.summary.r2FilesDeleted}`);
      
      if (result.summary.r2FilesFailed > 0) {
        console.log(colorize(`  ⚠️  R2 files failed: ${result.summary.r2FilesFailed}`, 'yellow'));
        result.failedR2Deletions.forEach(failure => {
          console.log(`    • ${failure.fileUrl}`);
        });
      }
    }
    
  } catch (error) {
    console.error(colorize('Error:', 'red'), error.message);
    process.exit(1);
  }
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    printUsage();
    return;
  }
  
  const command = args[0].toLowerCase();
  const facilityId = args[1];
  
  // Parse options
  const options = {};
  for (let i = 2; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--skip-r2') {
      options.skipR2Cleanup = true;
    } else if (arg === '--confirm' && i + 1 < args.length) {
      options.confirmationPhrase = args[i + 1];
      i++; // Skip next arg since we consumed it
    }
  }
  
  try {
    switch (command) {
      case 'list':
        await listFacilities();
        break;
        
      case 'preview':
        if (!facilityId) {
          console.error(colorize('Error: Facility ID required for preview', 'red'));
          printUsage();
          process.exit(1);
        }
        await previewDeletion(facilityId);
        break;
        
      case 'delete':
        if (!facilityId) {
          console.error(colorize('Error: Facility ID required for deletion', 'red'));
          printUsage();
          process.exit(1);
        }
        await performDeletion(facilityId, options);
        break;
        
      default:
        console.error(colorize(`Error: Unknown command '${command}'`, 'red'));
        printUsage();
        process.exit(1);
    }
  } catch (error) {
    console.error(colorize('Fatal error:', 'red'), error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  listFacilities,
  previewDeletion,
  performDeletion
};