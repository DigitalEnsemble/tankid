#!/usr/bin/env node

// Simple script to test the seed data loading locally
// Run with: node test-seed-local.js

const { loadTankIDSeedData } = require('./load-tankid-seed');

console.log('Testing TankID seed data loading locally...');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Set ✅' : 'Missing ❌');

if (!process.env.DATABASE_URL) {
  console.error('Please set DATABASE_URL environment variable');
  process.exit(1);
}

loadTankIDSeedData()
  .then(result => {
    console.log('\n🎉 SUCCESS!');
    console.log('Result:', JSON.stringify(result, null, 2));
  })
  .catch(error => {
    console.error('\n❌ FAILED!');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  });