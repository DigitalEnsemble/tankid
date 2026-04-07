#!/usr/bin/env node

// Quick syntax check for the API
try {
  require('./index.js');
  console.log('✓ API syntax check passed');
} catch (error) {
  console.error('✗ API syntax error:', error.message);
  process.exit(1);
}