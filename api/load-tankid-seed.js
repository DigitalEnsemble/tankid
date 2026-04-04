const { Pool } = require('pg');
const fs = require('fs');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function loadTankIDSeedData() {
  console.log('🚀 Starting TankID seed data load...');
  
  try {
    // Step 1: Insert tank model and get ID
    console.log('📦 Inserting tank model...');
    const modelResult = await pool.query(`
      INSERT INTO tank_models (
        manufacturer,
        model_name,
        diameter_ft,
        nominal_capacity_gal,
        actual_capacity_gal,
        wall_type,
        material,
        chart_notes
      ) VALUES (
        'Eaton Metals',
        'Fireguard 12000',
        NULL,
        12000,
        NULL,
        'double',
        'steel',
        'Fireguard STI-P3 listed double-wall aboveground tank. Chart data needed from Eaton Metals spec sheet.'
      )
      ON CONFLICT DO NOTHING
      RETURNING id;
    `);
    
    let eatonModelId;
    if (modelResult.rows.length > 0) {
      eatonModelId = modelResult.rows[0].id;
      console.log(`✅ Tank model created: ${eatonModelId}`);
    } else {
      // Model already exists, get its ID
      const existingModel = await pool.query(`
        SELECT id FROM tank_models 
        WHERE manufacturer = 'Eaton Metals' AND model_name = 'Fireguard 12000'
      `);
      eatonModelId = existingModel.rows[0].id;
      console.log(`ℹ️  Tank model exists: ${eatonModelId}`);
    }

    // Step 2: Insert facility and get ID
    console.log('🏢 Inserting facility...');
    const facilityResult = await pool.query(`
      INSERT INTO facilities (
        name,
        address,
        city,
        state,
        zip,
        county,
        facility_type,
        owner_name
      ) VALUES (
        'Generic Maintenance Support Center - Fueling Island',
        '12345 Facility Drive',
        'Denver',
        'CO',
        '80200',
        'Denver',
        'airport',
        'Generic Aviation Department'
      )
      ON CONFLICT DO NOTHING
      RETURNING id;
    `);
    
    let facilityId;
    if (facilityResult.rows.length > 0) {
      facilityId = facilityResult.rows[0].id;
      console.log(`✅ Facility created: ${facilityId}`);
    } else {
      // Facility already exists, get its ID
      const existingFacility = await pool.query(`
        SELECT id FROM facilities 
        WHERE name = 'Generic Maintenance Support Center - Fueling Island'
      `);
      facilityId = existingFacility.rows[0].id;
      console.log(`ℹ️  Facility exists: ${facilityId}`);
    }

    // Step 3: Insert 4 tanks and collect IDs
    console.log('⛽ Inserting tanks...');
    const tankNumbers = [4, 5, 6, 7];
    const serialNumbers = [null, null, '204030-51304', '204031-51305'];
    const tankIds = [];

    for (let i = 0; i < 4; i++) {
      const tankResult = await pool.query(`
        INSERT INTO tanks (
          facility_id,
          tank_model_id,
          tank_number,
          serial_number,
          install_depth_inches,
          install_date,
          install_contractor,
          atg_brand,
          atg_model,
          atg_last_calibration,
          product_grade,
          octane,
          ethanol_pct,
          access_level
        ) VALUES (
          $1, $2, $3, $4, NULL, '2025-03-07', 'UST Installer Inc.',
          NULL, NULL, NULL, 'Jet Fuel', NULL, NULL, 'public'
        )
        ON CONFLICT (facility_id, tank_number) DO UPDATE SET
          tank_model_id = EXCLUDED.tank_model_id
        RETURNING id;
      `, [facilityId, eatonModelId, tankNumbers[i], serialNumbers[i]]);
      
      if (tankResult.rows.length > 0) {
        tankIds[i] = tankResult.rows[0].id;
        console.log(`✅ Tank ${tankNumbers[i]} created/updated: ${tankIds[i]}`);
      } else {
        // Get existing tank ID
        const existingTank = await pool.query(`
          SELECT id FROM tanks WHERE facility_id = $1 AND tank_number = $2
        `, [facilityId, tankNumbers[i]]);
        tankIds[i] = existingTank.rows[0].id;
        console.log(`ℹ️  Tank ${tankNumbers[i]} exists: ${tankIds[i]}`);
      }
    }

    // Step 4: Run additional schema changes and updates
    console.log('🔧 Running schema updates...');
    await pool.query(`
      ALTER TABLE facilities
        ADD COLUMN IF NOT EXISTS ops_facility_id VARCHAR(20),
        ADD COLUMN IF NOT EXISTS company_id VARCHAR(50),
        ADD COLUMN IF NOT EXISTS first_fuel_delivery DATE,
        ADD COLUMN IF NOT EXISTS financial_resp_type VARCHAR(50),
        ADD COLUMN IF NOT EXISTS state_reg_submitted DATE,
        ADD COLUMN IF NOT EXISTS state_reg_confirmed DATE,
        ADD COLUMN IF NOT EXISTS facility_contact_name VARCHAR(255),
        ADD COLUMN IF NOT EXISTS facility_contact_phone VARCHAR(20),
        ADD COLUMN IF NOT EXISTS facility_contact_email VARCHAR(255),
        ADD COLUMN IF NOT EXISTS owner_mailing_address VARCHAR(255),
        ADD COLUMN IF NOT EXISTS owner_mailing_city VARCHAR(100),
        ADD COLUMN IF NOT EXISTS owner_mailing_state CHAR(2),
        ADD COLUMN IF NOT EXISTS owner_mailing_zip VARCHAR(10),
        ADD COLUMN IF NOT EXISTS owner_phone VARCHAR(20),
        ADD COLUMN IF NOT EXISTS owner_cell VARCHAR(20),
        ADD COLUMN IF NOT EXISTS owner_email VARCHAR(255);
    `);

    await pool.query(`
      ALTER TABLE tanks
        ADD COLUMN IF NOT EXISTS ops_tank_id VARCHAR(20),
        ADD COLUMN IF NOT EXISTS tank_release_detection VARCHAR(100),
        ADD COLUMN IF NOT EXISTS piping_release_detection VARCHAR(100),
        ADD COLUMN IF NOT EXISTS tank_corrosion_protection VARCHAR(100),
        ADD COLUMN IF NOT EXISTS piping_corrosion_protection VARCHAR(100),
        ADD COLUMN IF NOT EXISTS warranty_validated_date DATE,
        ADD COLUMN IF NOT EXISTS warranty_validated_by VARCHAR(255),
        ADD COLUMN IF NOT EXISTS fireguard_label VARCHAR(50),
        ADD COLUMN IF NOT EXISTS sti_warranted_date DATE;
    `);
    console.log('✅ Schema updates complete');

    // Step 5: Update facility with regulatory data
    console.log('📋 Updating facility regulatory data...');
    await pool.query(`
      UPDATE facilities SET
        ops_facility_id = '1643',
        company_id = 'ACCT-04380',
        first_fuel_delivery = '2025-02-26',
        financial_resp_type = 'Commercial Insurance',
        state_reg_submitted = '2025-03-13',
        state_reg_confirmed = '2025-03-14',
        facility_contact_name = 'Generic Facility Contact',
        facility_contact_phone = '303-000-0000',
        facility_contact_email = 'contact@genericfacility.com',
        owner_mailing_address = '12345 Owner Blvd, Suite 100',
        owner_mailing_city = 'Denver',
        owner_mailing_state = 'CO',
        owner_mailing_zip = '80200',
        owner_phone = '303-000-0000',
        owner_cell = '303-000-0001',
        owner_email = 'owner@genericfacility.com'
      WHERE id = $1;
    `, [facilityId]);
    console.log('✅ Facility regulatory data updated');

    // Step 6: Update tank compliance data
    console.log('⛽ Updating tank compliance data...');
    const tankOpsIds = ['1643-4', '1643-5', '1643-6', '1643-7'];
    const fireguardLabels = [null, null, '204030-51304', '204031-51305'];
    
    for (let i = 0; i < 4; i++) {
      const updateQuery = `
        UPDATE tanks SET
          ops_tank_id = $1,
          tank_release_detection = 'T11: Monthly Visual Inspection',
          piping_release_detection = 'L11: Monthly Visual Inspection',
          tank_corrosion_protection = 'AST - N/A - Tank',
          piping_corrosion_protection = 'AST - N/A - Piping'
          ${i >= 2 ? `, warranty_validated_date = '2025-03-07',
            sti_warranted_date = '2025-03-07',
            fireguard_label = $3,
            warranty_validated_by = 'Generic Installer Contact, UST Installer Inc.'` : ''}
        WHERE id = $2;
      `;
      
      const params = [tankOpsIds[i], tankIds[i]];
      if (i >= 2) params.push(fireguardLabels[i]);
      
      await pool.query(updateQuery, params);
      console.log(`✅ Tank ${tankNumbers[i]} compliance data updated`);
    }

    // Step 7: Insert document records
    console.log('📄 Inserting document records...');
    
    // Warranty cards for tanks 6 and 7
    await pool.query(`
      INSERT INTO documents (tank_id, doc_type, file_url, original_name) 
      VALUES 
        ($1, 'warranty', NULL, 'Fireguard_Warranty_Card_204031-51305_signed.pdf'),
        ($2, 'warranty', NULL, 'Fireguard_Warranty_Card_204030-51304_signed.pdf')
      ON CONFLICT DO NOTHING;
    `, [tankIds[3], tankIds[2]]); // tanks 7 and 6

    // Registration forms
    await pool.query(`
      INSERT INTO documents (tank_id, doc_type, file_url, original_name) 
      VALUES 
        ($1, 'registration', NULL, 'AST_Tank_Registration_1_of_2_2025-03-05.pdf'),
        ($2, 'registration', NULL, 'AST_Tank_Registration_1_of_2_2025-03-05.pdf'),
        ($3, 'registration', NULL, 'AST_Tank_Registration_1_of_2_2025-03-05.pdf'),
        ($4, 'registration', NULL, 'AST_Tank_Registration_2_of_2_2025-03-05.pdf')
      ON CONFLICT DO NOTHING;
    `, tankIds);

    // Signed registration for all tanks
    await pool.query(`
      INSERT INTO documents (tank_id, doc_type, file_url, original_name) 
      VALUES 
        ($1, 'registration_signed', NULL, 'AST_Tank_Registration_Signed.pdf'),
        ($2, 'registration_signed', NULL, 'AST_Tank_Registration_Signed.pdf'),
        ($3, 'registration_signed', NULL, 'AST_Tank_Registration_Signed.pdf'),
        ($4, 'registration_signed', NULL, 'AST_Tank_Registration_Signed.pdf')
      ON CONFLICT DO NOTHING;
    `, tankIds);
    
    console.log('✅ Document records inserted');

    // Step 8: Verification
    console.log('🔍 Running verification queries...');
    
    const facilityCheck = await pool.query(`
      SELECT name, ops_facility_id, company_id, first_fuel_delivery,
        state_reg_submitted, state_reg_confirmed, financial_resp_type
      FROM facilities
      WHERE name LIKE '%Generic Maintenance%';
    `);
    console.log('Facility:', facilityCheck.rows[0]);

    const tankCheck = await pool.query(`
      SELECT t.tank_number, t.ops_tank_id, t.serial_number,
        t.tank_release_detection, t.tank_corrosion_protection,
        t.warranty_validated_date, t.fireguard_label
      FROM tanks t
      JOIN facilities f ON t.facility_id = f.id
      WHERE f.name LIKE '%Generic Maintenance%'
      ORDER BY t.tank_number;
    `);
    console.log('Tanks:');
    tankCheck.rows.forEach(row => console.log(`  Tank ${row.tank_number}: ${row.ops_tank_id}, Serial: ${row.serial_number || 'N/A'}`));

    const docCheck = await pool.query(`
      SELECT t.ops_tank_id, d.doc_type, d.original_name
      FROM documents d
      JOIN tanks t ON d.tank_id = t.id
      JOIN facilities f ON t.facility_id = f.id
      WHERE f.name LIKE '%Generic Maintenance%'
      ORDER BY t.tank_number, d.doc_type;
    `);
    console.log(`Documents: ${docCheck.rows.length} records`);

    console.log('🎉 TankID seed data load complete!');
    console.log('Generated IDs:');
    console.log(`  Facility: ${facilityId}`);
    console.log(`  Tank Model: ${eatonModelId}`);
    tankIds.forEach((id, i) => console.log(`  Tank ${tankNumbers[i]}: ${id}`));

    return {
      success: true,
      facilityId,
      eatonModelId,
      tankIds,
      message: 'TankID seed data loaded successfully'
    };

  } catch (error) {
    console.error('❌ Error loading seed data:', error);
    throw error;
  }
}

module.exports = { loadTankIDSeedData };

// If running directly
if (require.main === module) {
  loadTankIDSeedData()
    .then(result => {
      console.log('Result:', result);
      process.exit(0);
    })
    .catch(error => {
      console.error('Failed:', error.message);
      process.exit(1);
    });
}