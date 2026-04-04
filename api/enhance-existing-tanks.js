const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function enhanceExistingTanks() {
  console.log('🔧 Enhancing existing tanks with detailed specifications...');
  
  try {
    await pool.query('BEGIN');
    
    // First, let's check what columns exist in the tanks table
    const tankColumns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'tanks' AND table_schema = 'public'
      ORDER BY ordinal_position;
    `);
    
    console.log('🏗️ Available tank columns:');
    tankColumns.rows.forEach(col => {
      console.log(`  ${col.column_name}: ${col.data_type}`);
    });
    
    // Add new columns if they don't exist
    const columnsToAdd = [
      'install_depth_inches INTEGER',
      'install_date DATE',
      'install_contractor TEXT',
      'atg_brand TEXT',
      'atg_model TEXT',
      'atg_last_calibration DATE',
      'product_grade TEXT',
      'octane INTEGER',
      'ethanol_pct INTEGER',
      'access_level TEXT'
    ];
    
    for (const columnDef of columnsToAdd) {
      const columnName = columnDef.split(' ')[0];
      const existing = tankColumns.rows.find(col => col.column_name === columnName);
      
      if (!existing) {
        console.log(`➕ Adding column: ${columnName}`);
        try {
          await pool.query(`ALTER TABLE tanks ADD COLUMN IF NOT EXISTS ${columnDef}`);
        } catch (err) {
          console.log(`   (Column ${columnName} might already exist: ${err.message})`);
        }
      } else {
        console.log(`✅ Column exists: ${columnName}`);
      }
    }
    
    // Update the existing tanks with detailed specifications
    const updates = [
      {
        id: '84db4c98-e625-4429-928e-268655d8503c',
        serial: 'ABC123456',
        specs: {
          install_depth_inches: 96,
          install_date: '2023-03-15',
          install_contractor: 'Petroleum Systems Inc',
          atg_brand: 'Veeder-Root',
          atg_model: 'TLS-350',
          atg_last_calibration: '2024-01-15',
          product_grade: 'Regular Unleaded',
          octane: 87,
          ethanol_pct: 10,
          access_level: 'Public'
        }
      },
      {
        id: 'eb1f77c9-19c1-47d9-8968-cc76aa67757e',
        serial: 'DEF789012',
        specs: {
          install_depth_inches: 84,
          install_date: '2023-03-15',
          install_contractor: 'Petroleum Systems Inc',
          atg_brand: 'Veeder-Root',
          atg_model: 'TLS-350',
          atg_last_calibration: '2024-01-15',
          product_grade: 'Premium Unleaded',
          octane: 93,
          ethanol_pct: 10,
          access_level: 'Public'
        }
      },
      {
        id: '21b3306b-ccbb-4fa3-b6ca-a08894648e48',
        serial: 'GHI345678',
        specs: {
          install_depth_inches: 72,
          install_date: '2023-03-15',
          install_contractor: 'Petroleum Systems Inc',
          atg_brand: 'Veeder-Root',
          atg_model: 'TLS-350',
          atg_last_calibration: '2024-01-15',
          product_grade: 'Diesel #2',
          octane: null,
          ethanol_pct: null,
          access_level: 'Public'
        }
      }
    ];
    
    console.log('🛢️ Updating tank specifications...');
    
    for (const tank of updates) {
      console.log(`  Updating ${tank.serial}...`);
      
      await pool.query(`
        UPDATE tanks SET 
          install_depth_inches = $1,
          install_date = $2,
          install_contractor = $3,
          atg_brand = $4,
          atg_model = $5,
          atg_last_calibration = $6,
          product_grade = $7,
          octane = $8,
          ethanol_pct = $9,
          access_level = $10,
          updated_at = NOW()
        WHERE id = $11
      `, [
        tank.specs.install_depth_inches,
        tank.specs.install_date,
        tank.specs.install_contractor,
        tank.specs.atg_brand,
        tank.specs.atg_model,
        tank.specs.atg_last_calibration,
        tank.specs.product_grade,
        tank.specs.octane,
        tank.specs.ethanol_pct,
        tank.specs.access_level,
        tank.id
      ]);
    }
    
    await pool.query('COMMIT');
    
    // Verify the enhanced data
    const verification = await pool.query(`
      SELECT 
        t.id, t.serial_number, t.product_grade, t.octane, t.install_date, t.install_contractor,
        t.atg_brand, t.atg_model, t.install_depth_inches,
        tm.manufacturer, tm.model_name, tm.capacity_gallons,
        f.name as facility_name
      FROM tanks t
      JOIN tank_models tm ON t.model_id = tm.id
      JOIN facilities f ON t.facility_id = f.id
      ORDER BY t.serial_number;
    `);
    
    console.log('✅ Tank enhancements completed!');
    console.log(`Enhanced ${verification.rows.length} tanks:`);
    
    verification.rows.forEach(tank => {
      console.log(`  🛢️  ${tank.serial_number}: ${tank.product_grade} ${tank.octane ? tank.octane + ' octane' : ''}`);
      console.log(`      ${tank.manufacturer} ${tank.model_name} (${tank.capacity_gallons} gal)`);
      console.log(`      Installed: ${tank.install_date} by ${tank.install_contractor}`);
      console.log(`      ATG: ${tank.atg_brand} ${tank.atg_model} (${tank.install_depth_inches}" deep)`);
      console.log('');
    });
    
    return {
      success: true,
      message: 'Tanks enhanced with detailed specifications',
      tanks: verification.rows
    };
    
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('❌ Error enhancing tanks:', error);
    throw error;
  }
}

module.exports = { enhanceExistingTanks };