#!/usr/bin/env node
/**
 * Smart Test Watcher
 *
 * Runs tests in watch mode with intelligent file watching:
 * - Watches both backend and frontend
 * - Shows clear, formatted output
 * - Displays coverage summary
 * - Exit on any key press
 *
 * Usage:
 *   node scripts/test-watch.js              # Watch all
 *   node scripts/test-watch.js backend      # Watch backend only
 *   node scripts/test-watch.js frontend     # Watch frontend only
 */

const { spawn } = require('child_process');
const path = require('path');
const readline = require('readline');

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// ============================================================================
// TEST WATCHER
// ============================================================================

class TestWatcher {
  constructor(target = 'all') {
    this.target = target;
    this.processes = [];
    this.running = true;
  }

  start() {
    this.printHeader();

    if (this.target === 'all' || this.target === 'backend') {
      this.startBackendTests();
    }

    if (this.target === 'all' || this.target === 'frontend') {
      setTimeout(() => this.startFrontendTests(), 1000);
    }

    this.setupExitHandler();
  }

  printHeader() {
    console.clear();
    log('='.repeat(70), 'cyan');
    log('🧪 SMART TEST WATCHER', 'green');
    log('='.repeat(70), 'cyan');
    log('');
    log('Features:', 'yellow');
    log('  ✓ Instant test results on file changes', 'reset');
    log('  ✓ Backend: Jest with TypeScript', 'reset');
    log('  ✓ Frontend: Vitest with React Testing Library', 'reset');
    log('  ✓ Coverage tracking enabled', 'reset');
    log('  ✓ Typeahead navigation', 'reset');
    log('');
    log(`Watching: ${this.target === 'all' ? 'Backend + Frontend' : this.target}`, 'cyan');
    log('');
    log('Press any key to exit', 'yellow');
    log('='.repeat(70), 'cyan');
    log('');
  }

  startBackendTests() {
    log('🔧 Starting Backend Test Watcher...', 'blue');

    const backend = spawn('npm', ['run', 'test:watch'], {
      cwd: path.join(__dirname, '..', 'packages', 'backend'),
      shell: true,
      stdio: 'pipe',
    });

    backend.stdout.on('data', (data) => {
      const output = data.toString();
      if (output.includes('PASS') || output.includes('FAIL')) {
        // Highlight test results
        log(output, output.includes('PASS') ? 'green' : 'red');
      } else {
        process.stdout.write(output);
      }
    });

    backend.stderr.on('data', (data) => {
      process.stderr.write(colors.yellow + data.toString() + colors.reset);
    });

    backend.on('error', (err) => {
      log(`Backend watcher error: ${err.message}`, 'red');
    });

    backend.on('exit', (code) => {
      log(`Backend watcher exited (code: ${code})`, 'yellow');
    });

    this.processes.push(backend);
  }

  startFrontendTests() {
    log('⚛️  Starting Frontend Test Watcher...', 'blue');

    const frontend = spawn('npm', ['run', 'test:watch'], {
      cwd: path.join(__dirname, '..', 'packages', 'frontend'),
      shell: true,
      stdio: 'pipe',
    });

    frontend.stdout.on('data', (data) => {
      const output = data.toString();
      if (output.includes('PASS') || output.includes('FAIL')) {
        // Highlight test results
        log(output, output.includes('PASS') ? 'green' : 'red');
      } else {
        process.stdout.write(output);
      }
    });

    frontend.stderr.on('data', (data) => {
      process.stderr.write(colors.yellow + data.toString() + colors.reset);
    });

    frontend.on('error', (err) => {
      log(`Frontend watcher error: ${err.message}`, 'red');
    });

    frontend.on('exit', (code) => {
      log(`Frontend watcher exited (code: ${code})`, 'yellow');
    });

    this.processes.push(frontend);
  }

  setupExitHandler() {
    // Handle key press to exit
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');

    process.stdin.on('data', () => {
      this.shutdown();
    });

    // Handle SIGINT
    process.on('SIGINT', () => {
      this.shutdown();
    });

    // Handle SIGTERM
    process.on('SIGTERM', () => {
      this.shutdown();
    });
  }

  shutdown() {
    if (!this.running) return;

    this.running = false;

    log('\n' + '='.repeat(70), 'yellow');
    log('🛑 Shutting down test watchers...', 'yellow');
    log('='.repeat(70), 'yellow');

    this.processes.forEach(proc => {
      if (proc && !proc.killed) {
        proc.kill('SIGTERM');
      }
    });

    // Force kill after 5 seconds
    setTimeout(() => {
      this.processes.forEach(proc => {
        if (proc && !proc.killed) {
          proc.kill('SIGKILL');
        }
      });
      process.exit(0);
    }, 5000);
  }
}

// ============================================================================
// MAIN
// ============================================================================

const target = process.argv[2] || 'all';

const validTargets = ['all', 'backend', 'frontend'];

if (!validTargets.includes(target)) {
  log('\n❌ Invalid target:', 'red');
  log(`   Valid targets: ${validTargets.join(', ')}`, 'yellow');
  log('\nUsage:', 'cyan');
  log('  node scripts/test-watch.js              # Watch all', 'reset');
  log('  node scripts/test-watch.js backend      # Watch backend only', 'reset');
  log('  node scripts/test-watch.js frontend     # Watch frontend only', 'reset');
  log('');
  process.exit(1);
}

const watcher = new TestWatcher(target);
watcher.start();
