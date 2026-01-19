#!/usr/bin/env node
/**
 * STOP ALL DEV SERVERS
 *
 * Clean shutdown of all development servers.
 * This is the safe way to stop servers.
 *
 * Usage: node scripts/stop-dev.js
 * Or: npm run dev:stop
 */

const { exec } = require('child_process');

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function killProcessOnPort(port) {
  return new Promise(resolve => {
    const isWindows = process.platform === 'win32';

    if (isWindows) {
      exec(`netstat -ano | findstr :${port}`, (error, stdout) => {
        if (!stdout || !stdout.trim()) {
          resolve(false);
          return;
        }

        const lines = stdout.trim().split('\n');
        const pids = new Set();

        for (const line of lines) {
          const parts = line.trim().split(/\s+/);
          const pid = parts[parts.length - 1];
          if (pid && pid !== 'PID') {
            pids.add(pid);
          }
        }

        if (pids.size === 0) {
          resolve(false);
          return;
        }

        let killed = 0;
        const killPromises = Array.from(pids).map(
          pid =>
            new Promise(killResolve => {
              exec(`taskkill /F /PID ${pid}`, { windowsHide: true }, () => {
                killed++;
                killResolve();
              });
            })
        );

        Promise.all(killPromises).then(() => {
          if (killed > 0) {
            log(`Stopped process on port ${port} (PIDs: ${Array.from(pids).join(', ')})`, 'green');
          }
          resolve(true);
        });
      });
    } else {
      exec(`lsof -ti:${port} | xargs kill -9 2>/dev/null`, () => resolve(true));
    }
  });
}

async function main() {
  console.log('\n' + '='.repeat(70));
  log('🛑 STOPPING DEVELOPMENT SERVERS', 'yellow');
  console.log('='.repeat(70) + '\n');

  const ports = [3001, 5173];
  let stopped = 0;

  for (const port of ports) {
    log(`Checking port ${port}...`, 'blue');
    const wasKilled = await killProcessOnPort(port);
    if (wasKilled) stopped++;
  }

  if (stopped === 0) {
    log('\n✅ No servers were running', 'green');
  } else {
    log(`\n✅ Stopped ${stopped} server(s)`, 'green');
  }

  console.log('');
}

main();
