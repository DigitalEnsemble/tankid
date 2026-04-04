const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function loadComprehensiveData() {
  console.log('🚀 Loading comprehensive TankID data...');
  
  try {
    await pool.query('BEGIN');
    
    // Step 1: Clear existing data and load real facilities
    console.log('🏢 Loading real facility data...');
    
    // Delete existing basic test data
    await pool.query('DELETE FROM tanks WHERE facility_id IN (SELECT id FROM facilities WHERE name IN ($1, $2))', 
      ['Test Gas Station', 'Chicago Distribution']);
    await pool.query('DELETE FROM facilities WHERE name IN ($1, $2)', 
      ['Test Gas Station', 'Chicago Distribution']);
    
    // Insert comprehensive facility data
    const facilityId = '4e0e1b69-2d6e-4841-a3c1-0594815f1aa4'; // Use existing UUID
    
    await pool.query(`
      INSERT INTO facilities (
        id, name, address, city, state, zip, county, facility_type, owner_name,
        ops_facility_id, company_id, first_fuel_delivery, financial_resp_type,
        state_reg_submitted, state_reg_confirmed, facility_contact_name,
        facility_contact_phone, facility_contact_email, owner_mailing_address,
        owner_mailing_city, owner_mailing_state, owner_mailing_zip,
        owner_phone, owner_cell, owner_email, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, NOW(), NOW()
      ) ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        address = EXCLUDED.address,
        city = EXCLUDED.city,
        state = EXCLUDED.state,
        zip = EXCLUDED.zip,
        county = EXCLUDED.county,
        facility_type = EXCLUDED.facility_type,
        owner_name = EXCLUDED.owner_name,
        ops_facility_id = EXCLUDED.ops_facility_id,
        company_id = EXCLUDED.company_id,
        first_fuel_delivery = EXCLUDED.first_fuel_delivery,
        financial_resp_type = EXCLUDED.financial_resp_type,
        state_reg_submitted = EXCLUDED.state_reg_submitted,
        state_reg_confirmed = EXCLUDED.state_reg_confirmed,
        facility_contact_name = EXCLUDED.facility_contact_name,
        facility_contact_phone = EXCLUDED.facility_contact_phone,
        facility_contact_email = EXCLUDED.facility_contact_email,
        owner_mailing_address = EXCLUDED.owner_mailing_address,
        owner_mailing_city = EXCLUDED.owner_mailing_city,
        owner_mailing_state = EXCLUDED.owner_mailing_state,
        owner_mailing_zip = EXCLUDED.owner_mailing_zip,
        owner_phone = EXCLUDED.owner_phone,
        owner_cell = EXCLUDED.owner_cell,
        owner_email = EXCLUDED.owner_email,
        updated_at = NOW()
    `, [
      facilityId,
      'Generic Maintenance Support Center - Fueling Island',
      '12345 Facility Drive',
      'Denver',
      'CO',
      '80200',
      'Denver',
      'airport',
      'Generic Aviation Department',
      '1643',
      'ACCT-04380',
      '2025-02-26',
      'Commercial Insurance',
      '2025-03-13',
      '2025-03-14',
      'Generic Facility Contact',
      '303-000-0000',
      'contact@genericfacility.com',
      '12345 Owner Blvd, Suite 100',
      'Denver',
      'CO',
      '80200',
      '303-000-0000',
      '303-000-0001',
      'owner@genericfacility.com'
    ]);
    
    console.log('  ✅ Loaded comprehensive facility: Generic Maintenance Support Center - Fueling Island');
    
    // Step 2: Create comprehensive tank model
    console.log('🛠️ Loading comprehensive tank model...');
    
    const tankModelId = 'a1b2c3d4-5e6f-7890-ab12-cd34ef567890';
    
    await pool.query(`
      INSERT INTO tank_models (
        id, manufacturer, model_name, capacity_gallons, actual_capacity_gal,
        diameter_ft, wall_type, material, chart_notes, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW()
      ) ON CONFLICT (id) DO UPDATE SET
        manufacturer = EXCLUDED.manufacturer,
        model_name = EXCLUDED.model_name,
        capacity_gallons = EXCLUDED.capacity_gallons,
        actual_capacity_gal = EXCLUDED.actual_capacity_gal,
        diameter_ft = EXCLUDED.diameter_ft,
        wall_type = EXCLUDED.wall_type,
        material = EXCLUDED.material,
        chart_notes = EXCLUDED.chart_notes,
        updated_at = NOW()
    `, [
      tankModelId,
      'Eaton Metals',
      'Fireguard 12000',
      12000,
      12000, // Assuming actual matches nominal for now
      null, // Unknown — request from Eaton Metals
      'double',
      'steel',
      'Fireguard STI-P3 listed double-wall aboveground tank'
    ]);
    
    console.log('  ✅ Loaded tank model: Eaton Metals Fireguard 12000');
    
    // Step 3: Load comprehensive tank data
    console.log('⛽ Loading comprehensive tank data...');
    
    const tanks = [
      {
        id: 'tank-1643-4-uuid-1234567890123456',
        tank_number: '4',
        ops_tank_id: '1643-4',
        serial_number: 'Unknown',
        fireguard_label: 'Unknown',
        product_grade: 'Jet Fuel',
        install_date: '2025-03-07',
        initial_work_date: '2024-10-28',
        install_contractor: 'UST Installer Inc.',
        install_depth_inches: null,
        atg_brand: 'Unknown',
        atg_model: 'Unknown',
        atg_last_calibration: null,
        tank_release_detection: 'T11: Monthly Visual Inspection',
        piping_release_detection: 'L11: Monthly Visual Inspection',
        tank_corrosion_protection: 'AST - N/A - Tank',
        piping_corrosion_protection: 'AST - N/A - Piping',
        sti_warranted_date: null,
        warranty_validated_date: null,
        warranty_validated_by: null,
        access_level: 'public'
      },
      {
        id: 'tank-1643-5-uuid-2345678901234567',
        tank_number: '5',
        ops_tank_id: '1643-5',
        serial_number: 'Unknown',
        fireguard_label: 'Unknown',
        product_grade: 'Jet Fuel',
        install_date: '2025-03-07',
        initial_work_date: '2024-10-28',
        install_contractor: 'UST Installer Inc.',
        install_depth_inches: null,
        atg_brand: 'Unknown',
        atg_model: 'Unknown',
        atg_last_calibration: null,
        tank_release_detection: 'T11: Monthly Visual Inspection',
        piping_release_detection: 'L11: Monthly Visual Inspection',
        tank_corrosion_protection: 'AST - N/A - Tank',
        piping_corrosion_protection: 'AST - N/A - Piping',
        sti_warranted_date: null,
        warranty_validated_date: null,
        warranty_validated_by: null,
        access_level: 'public'
      },
      {
        id: 'tank-1643-6-uuid-3456789012345678',
        tank_number: '6',
        ops_tank_id: '1643-6',
        serial_number: '204030-51304',
        fireguard_label: '204030-51304',
        product_grade: 'Jet Fuel',
        install_date: '2025-03-07',
        initial_work_date: '2024-10-28',
        install_contractor: 'UST Installer Inc.',
        install_depth_inches: null,
        atg_brand: 'Unknown',
        atg_model: 'Unknown',
        atg_last_calibration: null,
        tank_release_detection: 'T11: Monthly Visual Inspection',
        piping_release_detection: 'L11: Monthly Visual Inspection',
        tank_corrosion_protection: 'AST - N/A - Tank',
        piping_corrosion_protection: 'AST - N/A - Piping',
        sti_warranted_date: '2025-03-07',
        warranty_validated_date: '2025-03-07',
        warranty_validated_by: 'Generic Installer Contact, UST Installer Inc.',
        access_level: 'public'
      },
      {
        id: 'tank-1643-7-uuid-4567890123456789',
        tank_number: '7',
        ops_tank_id: '1643-7',
        serial_number: '204031-51305',
        fireguard_label: '204031-51305',
        product_grade: 'Jet Fuel',
        install_date: '2025-03-07',
        initial_work_date: '2024-10-28',
        install_contractor: 'UST Installer Inc.',
        install_depth_inches: null,
        atg_brand: 'Unknown',
        atg_model: 'Unknown',
        atg_last_calibration: null,
        tank_release_detection: 'T11: Monthly Visual Inspection',
        piping_release_detection: 'L11: Monthly Visual Inspection',
        tank_corrosion_protection: 'AST - N/A - Tank',
        piping_corrosion_protection: 'AST - N/A - Piping',
        sti_warranted_date: '2025-03-07',
        warranty_validated_date: '2025-03-07',
        warranty_validated_by: 'Generic Installer Contact, UST Installer Inc.',
        access_level: 'public'
      }
    ];
    
    for (const tank of tanks) {
      await pool.query(`
        INSERT INTO tanks (
          id, tank_number, ops_tank_id, serial_number, fireguard_label,
          facility_id, model_id, product_grade, install_date, initial_work_date,
          install_contractor, install_depth_inches, atg_brand, atg_model,
          atg_last_calibration, tank_release_detection, piping_release_detection,
          tank_corrosion_protection, piping_corrosion_protection,
          sti_warranted_date, warranty_validated_date, warranty_validated_by,
          access_level, octane, ethanol_pct, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, NOW(), NOW()
        ) ON CONFLICT (id) DO UPDATE SET
          tank_number = EXCLUDED.tank_number,
          ops_tank_id = EXCLUDED.ops_tank_id,
          serial_number = EXCLUDED.serial_number,
          fireguard_label = EXCLUDED.fireguard_label,
          product_grade = EXCLUDED.product_grade,
          install_date = EXCLUDED.install_date,
          initial_work_date = EXCLUDED.initial_work_date,
          install_contractor = EXCLUDED.install_contractor,
          install_depth_inches = EXCLUDED.install_depth_inches,
          atg_brand = EXCLUDED.atg_brand,
          atg_model = EXCLUDED.atg_model,
          atg_last_calibration = EXCLUDED.atg_last_calibration,
          tank_release_detection = EXCLUDED.tank_release_detection,
          piping_release_detection = EXCLUDED.piping_release_detection,
          tank_corrosion_protection = EXCLUDED.tank_corrosion_protection,
          piping_corrosion_protection = EXCLUDED.piping_corrosion_protection,
          sti_warranted_date = EXCLUDED.sti_warranted_date,
          warranty_validated_date = EXCLUDED.warranty_validated_date,
          warranty_validated_by = EXCLUDED.warranty_validated_by,
          access_level = EXCLUDED.access_level,
          updated_at = NOW()
      `, [
        tank.id, tank.tank_number, tank.ops_tank_id, tank.serial_number,
        tank.fireguard_label, facilityId, tankModelId, tank.product_grade,
        tank.install_date, tank.initial_work_date, tank.install_contractor,
        tank.install_depth_inches, tank.atg_brand, tank.atg_model,
        tank.atg_last_calibration, tank.tank_release_detection,
        tank.piping_release_detection, tank.tank_corrosion_protection,
        tank.piping_corrosion_protection, tank.sti_warranted_date,
        tank.warranty_validated_date, tank.warranty_validated_by,
        tank.access_level, null, null // Jet fuel doesn't have octane/ethanol
      ]);
      
      console.log(`  ✅ Loaded tank: ${tank.ops_tank_id} (${tank.product_grade})`);
    }
    
    // Step 4: Load document records (PDFs will be uploaded separately)
    console.log('📄 Loading document records...');
    
    const documents = [
      {
        doc_type: 'warranty',
        original_filename: 'Fireguard_Warranty_Card_204031-51305_signed.pdf',
        linked_tanks: ['1643-7']
      },
      {
        doc_type: 'warranty',
        original_filename: 'Fireguard_Warranty_Card_204030-51304_signed.pdf',
        linked_tanks: ['1643-6']
      },
      {
        doc_type: 'registration',
        original_filename: 'AST_Tank_Registration_1_of_2_2025-03-05.pdf',
        linked_tanks: ['1643-4', '1643-5', '1643-6']
      },
      {
        doc_type: 'registration',
        original_filename: 'AST_Tank_Registration_2_of_2_2025-03-05.pdf',
        linked_tanks: ['1643-7']
      },
      {
        doc_type: 'registration_signed',
        original_filename: 'AST_Tank_Registration_Signed.pdf',
        linked_tanks: ['1643-4', '1643-5', '1643-6', '1643-7']
      }
    ];
    
    for (const doc of documents) {
      await pool.query(`
        INSERT INTO documents (
          doc_type, original_filename, linked_tanks, file_path, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, NOW(), NOW()
        )
      `, [
        doc.doc_type,
        doc.original_filename,
        doc.linked_tanks,
        `/uploads/${doc.original_filename}` // Placeholder path
      ]);
      
      console.log(`  ✅ Loaded document: ${doc.original_filename} (${doc.doc_type})`);
    }
    
    await pool.query('COMMIT');
    
    // Verification
    const verification = await pool.query(`
      SELECT 
        f.name as facility_name, f.ops_facility_id, f.city, f.state, f.facility_type,
        COUNT(t.id) as tank_count,
        COUNT(d.id) as document_count
      FROM facilities f
      LEFT JOIN tanks t ON f.id = t.facility_id
      LEFT JOIN documents d ON d.linked_tanks && ARRAY[f.ops_facility_id]
      WHERE f.ops_facility_id = '1643'
      GROUP BY f.id, f.name, f.ops_facility_id, f.city, f.state, f.facility_type;
    `);
    
    console.log('✅ Comprehensive data loading completed!');
    console.log('\n📋 Loaded Data Summary:');
    
    if (verification.rows.length > 0) {
      const facility = verification.rows[0];
      console.log(`🏢 Facility: ${facility.facility_name}`);
      console.log(`📍 Location: ${facility.city}, ${facility.state}`);
      console.log(`🏷️  Type: ${facility.facility_type}`);
      console.log(`⛽ Tanks: ${facility.tank_count}`);
      console.log(`📄 Documents: ${facility.document_count}`);
    }
    
    return {
      success: true,
      message: 'Comprehensive data loaded successfully',
      facility: verification.rows[0] || null
    };
    
  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('❌ Error loading comprehensive data:', error);
    throw error;
  }
}

module.exports = { loadComprehensiveData };