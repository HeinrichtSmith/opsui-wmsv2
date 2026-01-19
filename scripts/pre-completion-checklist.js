#!/usr/bin/env node

/**
 * Pre-Task Completion Validation System
 *
 * This script runs a comprehensive checklist before marking a task as complete.
 * It ensures:
 * - Frontend tests pass
 * - Backend tests pass
 * - Services are connected
 * - No console errors
 * - Build succeeds
 * - TypeScript checks pass
 * - Code is properly formatted
 *
 * Usage:
 *   node scripts/pre-completion-checklist.js
 */

const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

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

const checklist = [
  // TypeScript Checks
  {
    name: 'Backend Type Check',
    category: 'TypeScript',
    required: true,
    check: async () => {
      try {
        await execAsync('npm run typecheck --workspace=packages/backend', {
          cwd: process.cwd(),
        });
        return true;
      } catch {
        return false;
      }
    },
  },
  {
    name: 'Frontend Type Check',
    category: 'TypeScript',
    required: true,
    check: async () => {
      try {
        await execAsync('npm run typecheck --workspace=packages/frontend', {
          cwd: process.cwd(),
        });
        return true;
      } catch {
        return false;
      }
    },
  },

  // Tests
  {
    name: 'Backend Unit Tests',
    category: 'Testing',
    required: true,
    check: async () => {
      try {
        await execAsync('npm run test --workspace=packages/backend -- --run --silent', {
          cwd: process.cwd(),
          timeout: 60000,
        });
        return true;
      } catch {
        return false;
      }
    },
  },
  {
    name: 'Frontend Component Tests',
    category: 'Testing',
    required: true,
    check: async () => {
      try {
        await execAsync('npm run test --workspace=packages/frontend -- --run --silent', {
          cwd: process.cwd(),
          timeout: 60000,
        });
        return true;
      } catch {
        return false;
      }
    },
  },
  {
    name: 'Integration Tests',
    category: 'Testing',
    required: true,
    check: async () => {
      try {
        await execAsync('node scripts/validate-connection.js', {
          cwd: process.cwd(),
          timeout: 15000,
        });
        return true;
      } catch {
        return false;
      }
    },
  },

  // Build
  {
    name: 'Backend Build',
    category: 'Build',
    required: true,
    check: async () => {
      try {
        await execAsync('npm run build --workspace=packages/backend', {
          cwd: process.cwd(),
          timeout: 60000,
        });
        return true;
      } catch {
        return false;
      }
    },
  },
  {
    name: 'Frontend Build',
    category: 'Build',
    required: true,
    check: async () => {
      try {
        await execAsync('npm run build --workspace=packages/frontend', {
          cwd: process.cwd(),
          timeout: 60000,
        });
        return true;
      } catch {
        return false;
      }
    },
  },

  // Code Quality
  {
    name: 'Linting',
    category: 'Code Quality',
    required: true,
    check: async () => {
      try {
        await execAsync('npm run lint --workspaces', {
          cwd: process.cwd(),
          timeout: 30000,
        });
        return true;
      } catch {
        return false;
      }
    },
  },
  {
    name: 'Format Check',
    category: 'Code Quality',
    required: false,
    check: async () => {
      try {
        await execAsync('npm run format:check', {
          cwd: process.cwd(),
          timeout: 30000,
        });
        return true;
      } catch {
        return false;
      }
    },
  },
];

async function runChecklistItem(item) {
  log(`\n▶ Checking: ${item.name}...`, colors.cyan);

  try {
    const startTime = Date.now();
    const passed = await item.check();
    const duration = Date.now() - startTime;

    if (passed) {
      log(`  ✅ PASSED (${duration}ms)`, colors.green);
      return { item, passed: true };
    } else {
      if (item.required) {
        log(`  ❌ FAILED (required)`, colors.red);
      } else {
        log(`  ⚠️  FAILED (optional)`, colors.yellow);
      }
      return { item, passed: false };
    }
  } catch (error) {
    log(`  ❌ ERROR: ${error.message}`, colors.red);
    return { item, passed: false };
  }
}

async function runChecklist() {
  log('\n╔════════════════════════════════════════════════════════════╗', colors.cyan);
  log('║       PRE-TASK COMPLETION VALIDATION SYSTEM               ║', colors.cyan);
  log('╚════════════════════════════════════════════════════════════╝\n', colors.cyan);

  const results = [];

  // Group by category
  const categories = Array.from(new Set(checklist.map((item) => item.category)));

  for (const category of categories) {
    log(`\n${colors.bright}${colors.blue}Category: ${category}${colors.reset}`);

    const categoryItems = checklist.filter((item) => item.category === category);

    for (const item of categoryItems) {
      const result = await runChecklistItem(item);
      results.push(result);
    }
  }

  // Summary
  log('\n╔════════════════════════════════════════════════════════════╗', colors.cyan);
  log('║                      SUMMARY                                ║', colors.cyan);
  log('╚════════════════════════════════════════════════════════════╝\n', colors.cyan);

  const requiredPassed = results.filter(
    (r) => r.item.required && r.passed
  ).length;
  const requiredTotal = results.filter((r) => r.item.required).length;

  const optionalPassed = results.filter(
    (r) => !r.item.required && r.passed
  ).length;
  const optionalTotal = results.filter((r) => !r.item.required).length;

  log(`${colors.bright}Required Checks:${colors.reset} ${requiredPassed}/${requiredTotal}`, colors.reset);
  log(`${colors.bright}Optional Checks:${colors.reset} ${optionalPassed}/${optionalTotal}\n`, colors.reset);

  // Details
  for (const result of results) {
    const icon = result.passed ? '✅' : '❌';
    const color = result.passed ? colors.green : colors.red;
    const required = result.item.required ? '(required)' : '(optional)';

    log(`  ${icon} ${result.item.name} ${required}`, color);
  }

  // Final verdict
  log('\n');

  if (requiredPassed === requiredTotal) {
    log('✅ ALL REQUIRED CHECKS PASSED', colors.green);
    log('✅ Task can be marked as complete\n', colors.green);
    process.exit(0);
  } else {
    log('❌ SOME REQUIRED CHECKS FAILED\n', colors.red);

    const failedRequired = results.filter(
      (r) => r.item.required && !r.passed
    );

    log('Failed required checks:', colors.red);
    for (const result of failedRequired) {
      log(`  • ${result.item.name}`, colors.red);
    }

    log('\n⚠️  Please fix the failing checks before completing the task\n', colors.yellow);
    process.exit(1);
  }
}

// Run checklist
runChecklist().catch((error) => {
  log(`\n❌ Fatal error: ${error.message}`, colors.red);
  console.error(error);
  process.exit(1);
});
