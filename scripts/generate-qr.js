#!/usr/bin/env node

const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

// Check command line argument
if (process.argv.length !== 3) {
    console.log('Usage: node scripts/generate-qr.js [FACILITY_ID]');
    console.log('Example: node scripts/generate-qr.js 1643');
    process.exit(1);
}

const facilityId = process.argv[2];
const baseUrl = 'https://tankid.io/facility';
const qrUrl = `${baseUrl}/${facilityId}`;

// Create qr-codes directory if it doesn't exist
const outputDir = 'qr-codes';
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
}

// Generate filename
const filename = `facility-${facilityId}.png`;
const outputPath = path.join(outputDir, filename);

// QR code options matching spec requirements
const options = {
    errorCorrectionLevel: 'H',  // Highest level - survives up to 30% damage
    type: 'png',
    quality: 0.92,
    margin: 2,                  // 2 modules margin
    color: {
        dark: '#000000',        // Black QR code
        light: '#FFFFFF'        // White background
    },
    width: 1200                 // 1200 pixels - sharp at 2x2 inches at 600 DPI
};

// Generate QR code
QRCode.toFile(outputPath, qrUrl, options, (err) => {
    if (err) {
        console.error('Error generating QR code:', err);
        process.exit(1);
    }
    
    console.log('✓ QR code generated successfully!');
    console.log(`  File: ${outputPath}`);
    console.log(`  URL encoded: ${qrUrl}`);
    console.log(`  Size: 1200x1200 pixels`);
    console.log(`  Error correction: Level H (30% damage tolerance)`);
    console.log('');
    console.log('Next steps:');
    console.log('1. Scan the PNG with iPhone camera to verify URL');
    console.log('2. Test navigation to facility page');
    console.log('3. Generate print label');
});