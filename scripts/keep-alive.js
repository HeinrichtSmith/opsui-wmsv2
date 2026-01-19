#!/usr/bin/env node
/**
 * Keep-Alive Monitor
 *
 * Monitors development servers and restarts them if they stop.
 * Run this in a separate terminal to keep servers alive even after sleep.
 *
 * Usage: node scripts/keep-alive.js
 */

const { spawn } = require('child_process');
const http = require('http');

const BACKEND_URL = 'http://localhost:3001/health';
const FRONTEND_URL = 'http://localhost:5173';
const CHECK_INTERVAL = 10000; // Check every 10 seconds
const MAX_RESTARTS = 10;
const RESTART_DELAY = 5000; // Wait 5 seconds before restart

let backendRestarts = 0;
let frontendRestarts = 0;

/**
 * Check if a URL is reachable
 */
async function checkUrl(url) {
  return new Promise(resolve => {
    const options = {
      method: 'GET',
      timeout: 5000,
      hostname: url.split(':')[1].replace('//', '').split('/')[0],
      port: parseInt(url.split(':')[2].split('/')[0]),
      path: url.includes('/health') ? '/health' : '/',
    };

    const req = http.request(options, res => {
      resolve(res.statusCode < 500);
    });

    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });

    req.end();
  });
}

/**
 * Restart servers
 */
function restartServers() {
  console.log('\n' + '='.repeat(70));
  console.log('🔄 RESTARTING SERVERS');
  console.log('='.repeat(70));

  // Kill existing processes on both ports
  const killBackend = spawn('taskkill', ['/F', '/PID', '3001', '/T'], { shell: true });
  const killFrontend = spawn('taskkill', ['/F', '/PID', '5173', '/T'], { shell: true });

  killBackend.on('close', () => {
    killFrontend.on('close', () => {
      console.log('✓ Old processes terminated');

      // Wait a moment then restart
      setTimeout(() => {
        console.log('\n🚀 Starting new server instances...\n');
        const devProcess = spawn('npm', ['run', 'dev'], {
          shell: true,
          cwd: __dirname + '/..',
          stdio: 'inherit',
        });

        devProcess.on('error', err => {
          console.error('❌ Failed to start servers:', err.message);
        });

        console.log('✓ Servers restarted\n');
        backendRestarts++;
        frontendRestarts++;
      }, RESTART_DELAY);
    });
  });
}

/**
 * Monitor servers
 */
async function monitor() {
  console.log('🔍 Keep-Alive Monitor Started');
  console.log('   Checking servers every', CHECK_INTERVAL / 1000, 'seconds');
  console.log('   Backend:', BACKEND_URL);
  console.log('   Frontend:', FRONTEND_URL);
  console.log('   Press Ctrl+C to stop monitor\n');

  let consecutiveFailures = 0;
  let wasRunning = true;

  setInterval(async () => {
    const backendUp = await checkUrl(BACKEND_URL);
    const frontendUp = await checkUrl(FRONTEND_URL);

    if (backendUp && frontendUp) {
      if (!wasRunning) {
        console.log('✅ Servers are back online');
        wasRunning = true;
      }
      consecutiveFailures = 0;
      return;
    }

    consecutiveFailures++;

    if (consecutiveFailures >= 2) {
      console.log('\n' + '❌'.repeat(35));
      console.log('DETECTED SERVER FAILURE');
      console.log('   Backend:', backendUp ? '✓' : '✗');
      console.log('   Frontend:', frontendUp ? '✓' : '✗');
      console.log('   Consecutive failures:', consecutiveFailures);
      console.log('   Backend restarts:', backendRestarts);
      console.log('   Frontend restarts:', frontendRestarts);
      console.log('❌'.repeat(35));

      if (backendRestarts >= MAX_RESTARTS || frontendRestarts >= MAX_RESTARTS) {
        console.log('\n⚠️  MAX RESTART LIMIT REACHED. Stopping monitor.');
        process.exit(1);
      }

      consecutiveFailures = 0;
      wasRunning = false;
      await restartServers();
    }
  }, CHECK_INTERVAL);
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n🛑 Keep-alive monitor stopped');
  process.exit(0);
});

// Start monitoring
monitor().catch(err => {
  console.error('❌ Monitor failed:', err);
  process.exit(1);
});
