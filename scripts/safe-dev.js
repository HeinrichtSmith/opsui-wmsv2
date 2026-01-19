#!/usr/bin/env node
/**
 * Safe Development Mode
 *
 * Runs backend with nodemon for smart restarts that don't kill connections.
 * Prevents "localhost refused to connect" errors during development.
 *
 * Usage: node scripts/safe-dev.js
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('='.repeat(70));
console.log('🚀 SAFE DEVELOPMENT MODE');
console.log('='.repeat(70));
console.log();
console.log('Backend: nodemon with smart restart');
console.log('  - Ignores test files');
console.log('  - 2s restart delay');
console.log('  - Graceful shutdown');
console.log();
console.log('Frontend: Vite with HMR');
console.log('  - Hot module replacement');
console.log('  - No full reloads');
console.log();
console.log('This prevents "localhost refused to connect" errors!');
console.log('='.repeat(70));
console.log();

const backend = spawn('npm', ['run', 'dev'], {
  cwd: path.join(__dirname, '..', 'packages', 'backend'),
  shell: true,
  stdio: 'inherit',
});

const frontend = spawn('npm', ['run', 'dev'], {
  cwd: path.join(__dirname, '..', 'packages', 'frontend'),
  shell: true,
  stdio: 'inherit',
});

// Handle errors gracefully
backend.on('error', err => {
  console.error('❌ Backend error:', err.message);
});

frontend.on('error', err => {
  console.error('❌ Frontend error:', err.message);
});

// Handle shutdown
function shutdown() {
  console.log('\n' + '='.repeat(70));
  console.log('🛑 SHUTTING DOWN');
  console.log('='.repeat(70));

  backend.kill('SIGTERM');
  frontend.kill('SIGTERM');

  setTimeout(() => {
    process.exit(0);
  }, 5000);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

console.log('✅ Both servers started');
console.log('   Backend:  http://localhost:3001');
console.log('   Frontend: http://localhost:5173');
console.log();
console.log('Press Ctrl+C to stop all servers\n');
