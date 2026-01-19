#!/usr/bin/env node

/**
 * MCP Auto-Recovery Test Script
 *
 * Simulates MCP server failures and verifies auto-recovery works correctly.
 * This is a TESTING script - do not run in production!
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

async function runTest(testName, testFn) {
  log(`\n▶ Testing: ${testName}`, colors.cyan);
  try {
    await testFn();
    log(`✓ PASSED: ${testName}`, colors.green);
    return true;
  } catch (error) {
    log(`✗ FAILED: ${testName}`, colors.red);
    log(`  Error: ${error.message}`, colors.red);
    return false;
  }
}

async function test1_BuildMCP() {
  log('  Step 1: Building MCP server...', colors.blue);

  const build = spawn('npm', ['run', 'mcp:build'], {
    cwd: path.join(__dirname, '..'),
    stdio: 'pipe',
  });

  await new Promise((resolve, reject) => {
    build.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Build failed with code ${code}`));
    });
  });

  log('  Step 2: Verifying build output exists...', colors.blue);

  const fs = await import('fs');
  const distPath = path.join(__dirname, '..', 'tools', 'mcp-server', 'dist', 'index.js');

  if (!fs.existsSync(distPath)) {
    throw new Error('Build output not found');
  }

  log('  ✓ MCP server built successfully', colors.green);
}

async function test2_StartMCP() {
  log('  Step 1: Starting MCP health monitor...', colors.blue);

  const monitor = spawn('node', ['scripts/mcp-health-monitor.js'], {
    cwd: path.join(__dirname, '..'),
    stdio: 'pipe',
  });

  let started = false;
  let output = '';

  monitor.stdout.on('data', (data) => {
    output += data.toString();
    if (output.includes('WMS MCP (Local)') && output.includes('RUNNING')) {
      started = true;
    }
  });

  monitor.stderr.on('data', (data) => {
    const text = data.toString();
    if (text.includes('WMS MCP (Local)') && text.includes('started successfully')) {
      started = true;
    }
  });

  // Wait up to 15 seconds for server to start
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      monitor.kill();
      reject(new Error('Server did not start within 15 seconds'));
    }, 15000);

    const checkInterval = setInterval(() => {
      if (started) {
        clearTimeout(timeout);
        clearInterval(checkInterval);
        monitor.kill();
        resolve();
      }
    }, 500);
  });

  log('  ✓ MCP server started and detected as RUNNING', colors.green);
}

async function test3_KillAndRecover() {
  log('  Step 1: Starting MCP health monitor...', colors.blue);

  const monitor = spawn('node', ['scripts/mcp-health-monitor.js'], {
    cwd: path.join(__dirname, '..'),
    stdio: 'pipe',
  });

  let mcpPid = null;
  let recovered = false;
  let restartCount = 0;

  monitor.stdout.on('data', (data) => {
    const text = data.toString();

    // Extract PID from output
    const pidMatch = text.match(/PID:(\d+)/);
    if (pidMatch) mcpPid = parseInt(pidMatch[1]);

    // Check for recovery
    if (text.includes('RUNNING') && restartCount > 0) {
      recovered = true;
    }

    // Count restarts
    if (text.includes('Scheduling restart')) {
      restartCount++;
    }
  });

  monitor.stderr.on('data', (data) => {
    const text = data.toString();

    // Extract PID from stderr
    const pidMatch = text.match(/PID:(\d+)/);
    if (pidMatch) mcpPid = parseInt(pidMatch[1]);
  });

  // Wait for initial start
  log('  Step 2: Waiting for MCP server to start...', colors.blue);
  await new Promise(resolve => setTimeout(resolve, 5000));

  if (!mcpPid) {
    monitor.kill();
    throw new Error('Could not find MCP server PID');
  }

  log(`  Found MCP server PID: ${mcpPid}`, colors.green);

  // Kill the MCP server
  log('  Step 3: Killing MCP server to simulate crash...', colors.yellow);
  process.kill(mcpPid, 'SIGKILL');

  // Wait for recovery
  log('  Step 4: Waiting for auto-recovery (max 30s)...', colors.blue);

  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      monitor.kill();
      reject(new Error('Server did not recover within 30 seconds'));
    }, 30000);

    const checkInterval = setInterval(() => {
      if (recovered) {
        clearTimeout(timeout);
        clearInterval(checkInterval);
        monitor.kill();
        resolve();
      }
    }, 1000);
  });

  log(`  ✓ Server recovered after ${restartCount} restart attempt(s)`, colors.green);
}

async function runAllTests() {
  log('\n╔════════════════════════════════════════════════════════════╗', colors.cyan);
  log('║     MCP AUTO-RECOVERY SYSTEM TEST SUITE                    ║', colors.cyan);
  log('╚════════════════════════════════════════════════════════════╝\n', colors.cyan);

  const results = [];

  // Run tests
  results.push(await runTest('Test 1: Build MCP Server', test1_BuildMCP));
  results.push(await runTest('Test 2: Start MCP Server', test2_StartMCP));
  results.push(await runTest('Test 3: Kill and Auto-Recover', test3_KillAndRecover));

  // Summary
  log('\n╔════════════════════════════════════════════════════════════╗', colors.cyan);
  log('║                    TEST SUMMARY                             ║', colors.cyan);
  log('╚════════════════════════════════════════════════════════════╝\n', colors.cyan);

  const passed = results.filter(r => r).length;
  const total = results.length;

  results.forEach((result, i) => {
    const status = result ? '✓ PASSED' : '✗ FAILED';
    const color = result ? colors.green : colors.red;
    log(`Test ${i + 1}: ${color}${status}${colors.reset}`);
  });

  log(`\nTotal: ${passed}/${total} tests passed`, colors.cyan);

  if (passed === total) {
    log('\n✓ All tests passed! MCP auto-recovery is working perfectly.', colors.green);
    process.exit(0);
  } else {
    log('\n✗ Some tests failed. Please review the errors above.', colors.red);
    process.exit(1);
  }
}

// Run tests
runAllTests().catch(error => {
  log(`\n✗ Fatal error: ${error.message}`, colors.red);
  console.error(error);
  process.exit(1);
});
