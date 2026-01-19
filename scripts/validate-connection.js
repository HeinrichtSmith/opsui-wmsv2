#!/usr/bin/env node

/**
 * Connection Validator
 *
 * Automated validation that frontend and backend are properly connected
 * before marking a task as complete. This ensures the system is fully functional.
 *
 * Usage:
 *   node scripts/validate-connection.js
 */

const http = require('http');
const https = require('https');

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

async function checkHTTP(url, timeout = 3000) {
  const start = Date.now();

  return new Promise(resolve => {
    const client = url.startsWith('https') ? https : http;

    const req = client.get(url, res => {
      const responseTime = Date.now() - start;
      resolve({
        service: new URL(url).hostname,
        url,
        status: res.statusCode === 200 ? 'pass' : 'fail',
        responseTime,
      });
    });

    req.on('error', error => {
      const responseTime = Date.now() - start;
      resolve({
        service: new URL(url).hostname,
        url,
        status: 'fail',
        responseTime,
        error: error.message,
      });
    });

    req.on('timeout', () => {
      req.destroy();
      const responseTime = Date.now() - start;
      resolve({
        service: new URL(url).hostname,
        url,
        status: 'fail',
        responseTime,
        error: 'Timeout',
      });
    });

    req.setTimeout(timeout);
  });
}

async function validateBackend() {
  log('\n🔍 Checking Backend API...', colors.cyan);
  const result = await checkHTTP('http://localhost:3001/health');

  if (result.status === 'pass') {
    log(`  ✅ Backend API is UP (${result.responseTime}ms)`, colors.green);
  } else {
    log(`  ❌ Backend API is DOWN: ${result.error}`, colors.red);
  }

  return result;
}

async function validateFrontend() {
  log('\n🔍 Checking Frontend Dev Server...', colors.cyan);
  const result = await checkHTTP('http://localhost:5173/', 5000);

  if (result.status === 'pass') {
    log(`  ✅ Frontend is UP (${result.responseTime}ms)`, colors.green);
  } else {
    log(`  ❌ Frontend is DOWN: ${result.error}`, colors.red);
  }

  return result;
}

async function validateDatabaseConnection() {
  log('\n🔍 Checking Database Connectivity...', colors.cyan);

  try {
    const result = await checkHTTP('http://localhost:3001/health');
    if (result.status === 'fail') {
      log('  ❌ Cannot check database - backend is down', colors.red);
      return false;
    }

    // Parse health check response
    const healthResult = await fetch('http://localhost:3001/health').then(r => r.json());

    if (healthResult.database?.status === 'connected') {
      log(`  ✅ Database is connected`, colors.green);
      return true;
    } else {
      log(`  ❌ Database is not connected`, colors.red);
      return false;
    }
  } catch (error) {
    log(`  ❌ Database check failed: ${error.message}`, colors.red);
    return false;
  }
}

async function validateWebSocket() {
  log('\n🔍 Checking WebSocket Endpoint...', colors.cyan);

  try {
    const result = await fetch('http://localhost:3001/health').then(r => r.json());

    if (result.websocket?.enabled === true) {
      log(`  ✅ WebSocket is available on port ${result.websocket.port || 3001}`, colors.green);
      return true;
    } else {
      log(`  ⚠️  WebSocket status unknown`, colors.yellow);
      return true; // Not a hard failure
    }
  } catch (error) {
    log(`  ⚠️  Cannot verify WebSocket status`, colors.yellow);
    return true; // Not a hard failure
  }
}

async function validateAPICommunication() {
  log('\n🔍 Checking API Communication...', colors.cyan);

  try {
    // Try to authenticate
    const response = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'john.picker@wms.local',
        password: 'password123',
      }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.token) {
        log('  ✅ API authentication works', colors.green);

        // Try authenticated request
        const ordersResponse = await fetch('http://localhost:3001/api/orders', {
          headers: { Authorization: `Bearer ${data.token}` },
        });

        if (ordersResponse.ok) {
          log('  ✅ API data fetching works', colors.green);
          return true;
        }
      }
    }

    log('  ❌ API communication failed', colors.red);
    return false;
  } catch (error) {
    log(`  ❌ API communication failed: ${error.message}`, colors.red);
    return false;
  }
}

async function runValidation() {
  log('\n╔════════════════════════════════════════════════════════════╗', colors.cyan);
  log('║       SYSTEM CONNECTION VALIDATOR                          ║', colors.cyan);
  log('╚════════════════════════════════════════════════════════════╝\n', colors.cyan);

  const results = {
    backend: null,
    frontend: null,
    database: false,
    websocket: false,
    api: false,
  };

  // Run all validations
  results.backend = await validateBackend();
  results.frontend = await validateFrontend();
  results.database = await validateDatabaseConnection();
  results.websocket = await validateWebSocket();
  results.api = await validateAPICommunication();

  // Summary
  log('\n╔════════════════════════════════════════════════════════════╗', colors.cyan);
  log('║                      SUMMARY                                ║', colors.cyan);
  log('╚════════════════════════════════════════════════════════════╝\n', colors.cyan);

  const allPassed =
    results.backend?.status === 'pass' &&
    results.frontend?.status === 'pass' &&
    results.database &&
    results.api;

  if (allPassed) {
    log('✅ ALL VALIDATIONS PASSED', colors.green);
    log('✅ System is fully connected and operational\n', colors.green);
    process.exit(0);
  } else {
    log('❌ SOME VALIDATIONS FAILED\n', colors.red);

    if (results.backend?.status === 'fail') {
      log('  • Backend API is not responding', colors.red);
    }
    if (results.frontend?.status === 'fail') {
      log('  • Frontend dev server is not responding', colors.red);
    }
    if (!results.database) {
      log('  • Database is not connected', colors.red);
    }
    if (!results.api) {
      log('  • API communication is not working', colors.red);
    }

    log('\n⚠️  Please ensure all services are running before completing the task\n', colors.yellow);
    process.exit(1);
  }
}

// Run validation
runValidation().catch(error => {
  log(`\n❌ Fatal error: ${error.message}`, colors.red);
  console.error(error);
  process.exit(1);
});
