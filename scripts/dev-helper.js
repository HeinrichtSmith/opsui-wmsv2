#!/usr/bin/env node

/**
 * Development Helper - One-Command Development Setup
 *
 * Automates common development tasks:
 * - Kills processes on occupied ports
 * - Starts all services in correct order
 * - Waits for services to be ready
 * - Opens browser to correct URLs
 * - Monitors health status
 *
 * Usage:
 *   node scripts/dev-helper.js
 *   node scripts/dev-helper.js --no-browser
 *   node scripts/dev-helper.js --setup
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
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

// ============================================================================
// PORT MANAGEMENT
// ============================================================================

async function killPort(port) {
  return new Promise((resolve) => {
    if (process.platform === 'win32') {
      exec(`netstat -ano | findstr :${port}`, (error, stdout) => {
        if (!stdout) {
          resolve();
          return;
        }

        const lines = stdout.trim().split('\n');
        const pids = new Set();

        for (const line of lines) {
          const parts = line.trim().split(/\s+/);
          if (parts.length >= 5) {
            pids.add(parts[4]); // PID is usually the 5th column
          }
        }

        if (pids.size === 0) {
          resolve();
          return;
        }

        log(`  Killing ${pids.size} process(es) on port ${port}...`, colors.yellow);

        let killed = 0;
        for (const pid of pids) {
          exec(`taskkill /F /PID ${pid} > nul 2>&1`, () => {
            killed++;
            if (killed === pids.size) {
              resolve();
            }
          });
        }
      });
    } else {
      // Unix-like systems
      exec(`lsof -ti:${port} | xargs kill -9 2>/dev/null`, () => {
        resolve();
      });
    }
  });
}

async function cleanupPorts() {
  log('\n🔧 Cleaning up ports...', colors.cyan);

  await killPort(3001); // Backend
  await killPort(5173); // Frontend
  await killPort(5174); // Frontend HMR

  log('  ✅ Ports cleaned\n', colors.green);
}

// ============================================================================
// HEALTH CHECKS
// ============================================================================

async function checkHealth(url, timeout = 5000) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      resolve(false);
    }, timeout);

    http.get(url, (res) => {
      clearTimeout(timer);
      resolve(res.statusCode === 200);
    }).on('error', () => {
      clearTimeout(timer);
      resolve(false);
    });
  });
}

async function waitForService(url, name, maxWait = 30000) {
  log(`  Waiting for ${name}...`, colors.cyan);

  const start = Date.now();
  while (Date.now() - start < maxWait) {
    const healthy = await checkHealth(url);
    if (healthy) {
      log(`  ✅ ${name} is ready`, colors.green);
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  log(`  ❌ ${name} failed to start`, colors.red);
  return false;
}

// ============================================================================
// SERVICE MANAGEMENT
// ============================================================================

class ServiceManager {
  constructor() {
    this.services = [];
  }

  start(name, command, options = {}) {
    const cwd = options.cwd || path.join(__dirname, '..');
    const service = spawn(command.cmd, command.args, {
      cwd,
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      ...options,
    });

    service.name = name;
    service.ready = false;

    // Pipe output
    service.stdout.on('data', (data) => {
      const output = data.toString();
      if (output.includes('ready') || output.includes('listening')) {
        service.ready = true;
      }
      if (options.logOutput !== false) {
        process.stdout.write(`[${name}] ${output}`);
      }
    });

    service.stderr.on('data', (data) => {
      const output = data.toString();
      if (options.logOutput !== false) {
        process.stderr.write(`[${name}] ${output}`);
      }
    });

    service.on('error', (error) => {
      log(`❌ ${name} failed to start: ${error.message}`, colors.red);
    });

    service.on('exit', (code) => {
      if (code !== 0 && code !== null) {
        log(`⚠️  ${name} exited with code ${code}`, colors.yellow);
      }
    });

    this.services.push(service);
    return service;
  }

  async stopAll() {
    log('\n🛑 Stopping all services...', colors.cyan);

    for (const service of this.services) {
      service.kill('SIGTERM');
    }

    await new Promise(resolve => setTimeout(resolve, 2000));

    for (const service of this.services) {
      if (!service.killed) {
        service.kill('SIGKILL');
      }
    }

    log('✅ All services stopped\n', colors.green);
  }

  getBackend() {
    return this.services.find(s => s.name === 'backend');
  }

  getFrontend() {
    return this.services.find(s => s.name === 'frontend');
  }
}

// ============================================================================
// MAIN FLOW
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  const noBrowser = args.includes('--no-browser');
  const setupMode = args.includes('--setup');

  if (setupMode) {
    log('\n╔════════════════════════════════════════════════════════════╗', colors.cyan);
    log('║       DEVELOPMENT ENVIRONMENT SETUP                         ║', colors.cyan);
    log('╚════════════════════════════════════════════════════════════╝\n', colors.cyan);

    log('Step 1: Installing dependencies...', colors.cyan);
    await new Promise(resolve => {
      const npm = spawn('npm', ['install'], {
        cwd: path.join(__dirname, '..'),
        stdio: 'inherit',
      });
      npm.on('close', resolve);
    });

    log('\n✅ Dependencies installed\n', colors.green);
    return;
  }

  log('\n╔════════════════════════════════════════════════════════════╗', colors.cyan);
  log('║       DEVELOPMENT HELPER - ONE-COMMAND SETUP               ║', colors.cyan);
  log('╚════════════════════════════════════════════════════════════╝\n', colors.cyan);

  const manager = new ServiceManager();

  // Handle shutdown
  process.on('SIGINT', async () => {
    await manager.stopAll();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    await manager.stopAll();
    process.exit(0);
  });

  try {
    // Step 1: Clean up ports
    await cleanupPorts();

    // Step 2: Start backend
    log('▶ Starting backend...', colors.cyan);
    manager.start('backend', {
      cmd: 'npm',
      args: ['run', 'dev:backend'],
      cwd: path.join(__dirname, '..', 'packages', 'backend'),
    });

    // Wait for backend
    const backendReady = await waitForService('http://localhost:3001/health', 'Backend');
    if (!backendReady) {
      throw new Error('Backend failed to start');
    }

    // Step 3: Start frontend
    log('\n▶ Starting frontend...', colors.cyan);
    manager.start('frontend', {
      cmd: 'npm',
      args: ['run', 'dev:frontend'],
      cwd: path.join(__dirname, '..', 'packages', 'frontend'),
    });

    // Wait for frontend
    const frontendReady = await waitForService('http://localhost:5173/', 'Frontend', 15000);
    if (!frontendReady) {
      throw new Error('Frontend failed to start');
    }

    // Step 4: Open browser
    if (!noBrowser) {
      log('\n🌐 Opening browser...', colors.cyan);
      const { exec } = require('child_process');

      if (process.platform === 'win32') {
        exec('start http://localhost:5173');
      } else if (process.platform === 'darwin') {
        exec('open http://localhost:5173');
      } else {
        exec('xdg-open http://localhost:5173');
      }
    }

    // Step 5: Show status
    log('\n╔════════════════════════════════════════════════════════════╗', colors.cyan);
    log('║                    🚀 READY TO DEVELOP                     ║', colors.cyan);
    log('╚════════════════════════════════════════════════════════════╝\n', colors.cyan);

    log('Services running:', colors.bright);
    log(`  • Backend API:  ${colors.green}http://localhost:3001${colors.reset}`);
    log(`  • Frontend:      ${colors.green}http://localhost:5173${colors.reset}`);
    log(`  • API Docs:      ${colors.green}http://localhost:3001/api/docs${colors.reset}`);
    log(`  • Health Check:  ${colors.green}http://localhost:3001/health${colors.reset}\n`);

    log('Press Ctrl+C to stop all services\n', colors.yellow);

    // Keep running
    await new Promise(() => {});

  } catch (error) {
    log(`\n❌ Error: ${error.message}`, colors.red);
    await manager.stopAll();
    process.exit(1);
  }
}

main().catch(error => {
  log(`\n❌ Fatal error: ${error.message}`, colors.red);
  console.error(error);
  process.exit(1);
});
