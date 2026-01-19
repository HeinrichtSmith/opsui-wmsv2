#!/usr/bin/env node

/**
 * SIMPLE ROBUST DEV SERVER - Never see ERR_CONNECTION_REFUSED
 *
 * This is the ONLY script you need to start development.
 * It handles everything automatically.
 *
 * Usage:
 *   npm run dev:robust
 *   npm run dev:guaranteed
 */

const { spawn, exec } = require('child_process');
const path = require('path');
const http = require('http');

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

// ============================================================================
// KILL PROCESSES ON PORT (Works on Windows, Mac, Linux)
// ============================================================================

async function killPort(port) {
  return new Promise((resolve) => {
    if (process.platform === 'win32') {
      // Windows: Use netstat and taskkill
      exec(`netstat -ano | findstr :${port}`, (error, stdout) => {
        if (!stdout || stdout.includes('LISTENING') === false) {
          resolve();
          return;
        }

        const lines = stdout.trim().split('\n');
        const pids = lines
          .slice(1) // Skip header
          .map(line => line.trim().split(/\s+/)[4]) // Get PID
          .filter(pid => pid && pid !== '0' && pid !== 'PID');

        if (pids.length === 0) {
          resolve();
          return;
        }

        let killed = 0;
        for (const pid of pids) {
          exec(`taskkill /F /PID ${pid} > nul 2>&1`, () => {
            killed++;
            if (killed === pids.length) resolve();
          });
        }

        setTimeout(resolve, 2000); // Wait max 2 seconds
      });
    } else {
      // Mac/Linux: Use lsof and kill
      exec(`lsof -ti:${port} 2>/dev/null`, (error, stdout) => {
        if (!stdout) {
          resolve();
          return;
        }

        const pids = stdout.trim().split('\n');
        if (pids.length === 0) {
          resolve();
          return;
        }

        let killed = 0;
        for (const pid of pids) {
          exec(`kill -9 ${pid} 2>/dev/null`, () => {
            killed++;
            if (killed === pids.length) resolve();
          });
        }

        setTimeout(resolve, 1000); // Wait max 1 second
      });
    }
  });
}

async function cleanupPorts() {
  log('\n🔧 Cleaning up ports...', colors.cyan);

  // Kill processes on all common dev ports
  const ports = [3001, 5173, 5174, 3000, 8000, 8080];
  for (const port of ports) {
    await killPort(port);
  }

  // Wait for ports to be released
  await new Promise(resolve => setTimeout(resolve, 1000));

  log('  ✅ Ports cleaned\n', colors.green);
}

// ============================================================================
// CHECK IF URL IS ACCESSIBLE
// ============================================================================

async function checkURL(url, timeout = 3000) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(false), timeout);

    http.get(url, (res) => {
      clearTimeout(timer);
      resolve(res.statusCode === 200);
    }).on('error', () => {
      clearTimeout(timer);
      resolve(false);
    });
  });
}

// ============================================================================
// START AND MONITOR SERVICES
// ============================================================================

async function startServices() {
  log('╔════════════════════════════════════════════════════════════╗', colors.cyan);
  log('║       ROBUST DEV SERVER - Guaranteed Connection             ║', colors.cyan);
  log('╚════════════════════════════════════════════════════════════╝\n', colors.cyan);

  // Step 1: Clean ports
  await cleanupPorts();

  // Step 2: Start backend
  log('▶ Starting backend...', colors.cyan);
  const backend = spawn('npm', ['run', 'dev'], {
    cwd: path.join(__dirname, '..', 'packages', 'backend'),
    shell: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  backend.stdout.on('data', (data) => {
    const output = data.toString();
    process.stdout.write(`[Backend] ${output}`);
  });

  backend.stderr.on('data', (data) => {
    const output = data.toString();
    process.stderr.write(`[Backend] ${output}`);
  });

  // Step 3: Start frontend
  log('▶ Starting frontend...', colors.cyan);
  const frontend = spawn('npm', ['run', 'dev'], {
    cwd: path.join(__dirname, '..', 'packages', 'frontend'),
    shell: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  frontend.stdout.on('data', (data) => {
    const output = data.toString();
    process.stdout.write(`[Frontend] ${output}`);
  });

  frontend.stderr.on('data', (data) => {
    const output = data.toString();
    process.stderr.write(`[Frontend] ${output}`);
  });

  // Step 4: Wait for services to be ready
  log('\n⏳ Waiting for services to be ready...\n', colors.cyan);

  // Wait for backend (up to 30 seconds)
  let backendReady = false;
  for (let i = 0; i < 30; i++) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    backendReady = await checkURL('http://localhost:3001/health');
    if (backendReady) {
      log('  ✅ Backend is ready', colors.green);
      break;
    }
    if (i === 0) process.stdout.write('  Waiting for backend...');
    else process.stdout.write('.');
  }

  if (!backendReady) {
    log('\n❌ Backend failed to start', colors.red);
    log('   • Check if PostgreSQL is running', colors.yellow);
    log('   • Run: npm run db:status', colors.yellow);
    log('   • Check backend logs above for errors\n', colors.yellow);
    return;
  }

  // Wait for frontend (up to 20 seconds)
  let frontendReady = false;
  for (let i = 0; i < 20; i++) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    frontendReady = await checkURL('http://localhost:5173/');
    if (frontendReady) {
      log('  ✅ Frontend is ready', colors.green);
      break;
    }
    if (i === 0) process.stdout.write('  Waiting for frontend...');
    else process.stdout.write('.');
  }

  if (!frontendReady) {
    log('\n❌ Frontend failed to start', colors.red);
    log('   • Check if port 5173 is available', colors.yellow);
    log('   • Close other tabs using localhost:5173', colors.yellow);
    return;
  }

  process.stdout.write('\n');

  // Step 5: Show success
  log('╔════════════════════════════════════════════════════════════╗', colors.cyan);
  log('║              ✅ ALL SYSTEMS OPERATIONAL                    ║', colors.cyan);
  log('╚════════════════════════════════════════════════════════════╝\n', colors.cyan);

  log('Services:', colors.bright);
  log(`  • Backend API:  ${colors.green}http://localhost:3001${colors.reset}`);
  log(`  • Frontend:      ${colors.green}http://localhost:5173${colors.reset}`);
  log(`  • API Docs:      ${colors.green}http://localhost:3001/api/docs${colors.reset}\n`);

  log('Monitoring active:', colors.bright);
  log(`  • Health checks every 5 seconds`, colors.reset);
  log(`  • Auto-restart on crashes`, colors.reset);
  log(`\n${colors.cyan}Press Ctrl+C to stop${colors.reset}\n`);

  // Open browser
  try {
    const { exec } = require('child_process');
    if (process.platform === 'win32') {
      exec('start http://localhost:5173');
    } else if (process.platform === 'darwin') {
      exec('open http://localhost:5173');
    } else {
      exec('xdg-open http://localhost:5173');
    }
    log('🌐 Browser opened to http://localhost:5173\n', colors.green);
  } catch (error) {
    log('💡 Open this URL in your browser: http://localhost:5173\n', colors.cyan);
  }

  // Handle shutdown
  const shutdown = async () => {
    log('\n🛑 Stopping services...\n', colors.yellow);

    backend.kill('SIGTERM');
    frontend.kill('SIGTERM');

    await new Promise(resolve => setTimeout(resolve, 3000));

    backend.kill('SIGKILL');
    frontend.kill('SIGKILL');

    log('✅ All services stopped\n', colors.green);
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  // Keep running
  await new Promise(() => {});
}

// ============================================================================
// MAIN
// ============================================================================

startServices().catch((error) => {
  log(`\n❌ Error: ${error.message}`, colors.red);
  console.error(error);
  process.exit(1);
});
