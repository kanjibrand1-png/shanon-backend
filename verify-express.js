// Verify Express installation
try {
  const express = require('express');
  const router = require('express/lib/router');
  console.log('✓ Express installation verified');
  console.log('✓ Express router module found');
} catch (error) {
  console.error('✗ Express installation verification failed:', error.message);
  console.error('⚠ Express router module is missing - this will cause runtime errors');
  console.error('⚠ The build script should reinstall Express');
  // Don't exit with error in postinstall to allow build script to fix it
  if (process.env.NODE_ENV === 'production' || process.argv.includes('--strict')) {
    process.exit(1);
  }
}

