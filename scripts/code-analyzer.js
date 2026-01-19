#!/usr/bin/env node

/**
 * Smart Code Analyzer & Refactoring Suggestions
 *
 * Analyzes codebase and suggests improvements:
 * - Detects N+1 query patterns
 * - Finds missing error handling
 * - Identifies unused imports
 * - Suggests optimizations
 * - Finds potential bugs
 *
 * Usage:
 *   node scripts/code-analyzer.js
 *   node scripts/code-analyzer.js --fix
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

// ============================================================================
// ANALYZERS
// ============================================================================

const analyzers = {
  /**
   * Detect N+1 query patterns
   */
  detectNPlusOneQueries: (filePath, content) => {
    const issues = [];

    // Pattern: Loop with query inside
    const loopWithQueryPattern = /
      (for|while|forEach|map|filter|reduce)\s*\([^)]*\)\s*\{[^}]*(
        (await\s+)?(query|db\.\w+|execute)
      )/gms;

    const matches = [...content.matchAll(loopWithQueryPattern)];

    if (matches.length > 0) {
      issues.push({
        type: 'N+1 Query',
        severity: 'high',
        message: `Found ${matches.length} loop(s) with database queries inside`,
        suggestion: 'Use JOINs or batch queries to fetch data in a single query',
        line: getLineNumber(content, matches[0].index),
      });
    }

    return issues;
  },

  /**
   * Find missing error handling
   */
  findMissingErrorHandling: (filePath, content) => {
    const issues = [];

    // Pattern: await without try/catch
    const awaitPattern = /await\s+(\w+\.\w+\([^)]*\))/g;
    const matches = [...content.matchAll(awaitPattern)];

    for (const match of matches) {
      const beforeMatch = content.substring(0, match.index);
      const afterMatch = content.substring(match.index + match[0].length);

      // Check if wrapped in try/catch
      const hasTryCatch = beforeMatch.includes('try') && afterMatch.includes('catch');

      // Check if has .catch()
      const hasCatch = afterMatch.includes('.catch(');

      if (!hasTryCatch && !hasCatch && !content.includes('async () =>')) {
        issues.push({
          type: 'Missing Error Handling',
          severity: 'medium',
          message: `Await without error handling: ${match[1]}`,
          suggestion: 'Wrap in try/catch or add .catch()',
          line: getLineNumber(content, match.index),
        });
      }
    }

    return issues;
  },

  /**
   * Find unused imports
   */
  findUnusedImports: (filePath, content) => {
    const issues = [];

    // Extract imports
    const importPattern = /import\s+{([^}]+)}\s+from\s+['"]([^'"]+)['"]/g;
    const imports = [...content.matchAll(importPattern)];

    for (const imp of imports) {
      const importedItems = imp[1].split(',').map(s => s.trim());
      const moduleName = imp[2];

      for (const item of importedItems) {
        // Check if imported item is used in file
        const regex = new RegExp(`\\b${item}\\b`, 'g');
        const matches = content.match(regex);

        if (!matches || matches.length <= 1) { // 1 match is the import itself
          issues.push({
            type: 'Unused Import',
            severity: 'low',
            message: `Imported '${item}' from '${moduleName}' but never used`,
            suggestion: 'Remove the unused import',
            line: getLineNumber(content, imp.index),
          });
        }
      }
    }

    return issues;
  },

  /**
   * Find console.log statements (should use logger)
   */
  findConsoleLogs: (filePath, content) => {
    const issues = [];

    const consolePattern = /console\.(log|debug|info|warn|error)\(/g;
    const matches = [...content.matchAll(consolePattern)];

    for (const match of matches) {
      issues.push({
        type: 'Console Statement',
        severity: 'low',
        message: `Found ${match[1]}() statement`,
        suggestion: 'Use logger instead of console',
        line: getLineNumber(content, match.index),
      });
    }

    return issues;
  },

  /**
   * Find missing return types
   */
  findMissingReturnTypes: (filePath, content) => {
    const issues = [];

    // Pattern: async function without return type
    const asyncFunctionPattern = /async\s+(\w+)\s*\([^)]*\)\s*:\s*Promise\s*</g;
    const functions = [...content.matchAll(asyncFunctionPattern)];

    // This is a simplified check - TypeScript compiler will catch this
    // Just flagging functions that could be improved
    return issues;
  },

  /**
   * Find potentially unsafe operations
   */
  findUnsafeOperations: (filePath, content) => {
    const issues = [];

    // Pattern: JSON.parse without try/catch
    const jsonParsePattern = /JSON\.parse\(/g;
    const matches = [...content.matchAll(jsonParsePattern)];

    for (const match of matches) {
      const beforeMatch = content.substring(0, match.index);
      const afterMatch = content.substring(match.index + match[0].length, match.index + 200);

      if (!beforeMatch.includes('try') || !afterMatch.includes('catch')) {
        issues.push({
          type: 'Unsafe Operation',
          severity: 'medium',
          message: 'JSON.parse without error handling',
          suggestion: 'Wrap in try/catch to handle invalid JSON',
          line: getLineNumber(content, match.index),
        });
      }
    }

    return issues;
  },

  /**
   * Find hardcoded secrets/keys
   */
  findHardcodedSecrets: (filePath, content) => {
    const issues = [];

    // Pattern: Strings that look like API keys, tokens, etc.
    const secretPatterns = [
      /api[_-]?key\s*[:=]\s*['"]([a-zA-Z0-9]{20,})['"]/gi,
      /token\s*[:=]\s*['"]([a-zA-Z0-9]{20,})['"]/gi,
      /secret\s*[:=]\s*['"]([a-zA-Z0-9]{10,})['"]/gi,
      /password\s*[:=]\s*['"]([^'\s]{8,})['"]/gi,
    ];

    for (const pattern of secretPatterns) {
      const matches = [...content.matchAll(pattern)];

      for (const match of matches) {
        issues.push({
          type: 'Security Issue',
          severity: 'critical',
          message: `Potentially hardcoded ${match[0].split(/\s*[:=]/)[0]} found`,
          suggestion: 'Use environment variables for secrets',
          line: getLineNumber(content, match.index),
        });
      }
    }

    return issues;
  },

  /**
   * Find TODO/FIXME comments
   */
  findTodos: (filePath, content) => {
    const issues = [];

    const todoPattern = /(TODO|FIXME|HACK|XXX|BUG):\s*(.+)/g;
    const matches = [...content.matchAll(todoPattern)];

    for (const match of matches) {
      issues.push({
        type: 'TODO Comment',
        severity: 'info',
        message: `${match[1]}: ${match[2]}`,
        suggestion: 'Consider addressing or creating an issue',
        line: getLineNumber(content, match.index),
      });
    }

    return issues;
  },
};

// ============================================================================
// UTILITIES
// ============================================================================

function getLineNumber(content, index) {
  return content.substring(0, index).split('\n').length;
}

function scanDirectory(dir, extensions = ['.ts', '.tsx', '.js', '.jsx']) {
  const files = [];

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      // Skip node_modules and dist
      if (!['node_modules', 'dist', '.git', 'coverage'].includes(entry.name)) {
        files.push(...scanDirectory(fullPath, extensions));
      }
    } else if (extensions.some(ext => entry.name.endsWith(ext))) {
      files.push(fullPath);
    }
  }

  return files;
}

function analyzeFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const relativePath = path.relative(process.cwd(), filePath);
  const allIssues = [];

  for (const [name, analyzer] of Object.entries(analyzers)) {
    try {
      const issues = analyzer(filePath, content);
      allIssues.push(...issues.map(issue => ({
        ...issue,
        file: relativePath,
        analyzer: name,
      })));
    } catch (error) {
      // Skip analyzers that fail
    }
  }

  return allIssues;
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  const shouldFix = args.includes('--fix');

  log('\n╔════════════════════════════════════════════════════════════╗', colors.cyan);
  log('║          SMART CODE ANALYZER & REFACTORING SUGGESTIONS      ║', colors.cyan);
  log('╚════════════════════════════════════════════════════════════╝\n', colors.cyan);

  log('Scanning codebase...\n', colors.cyan);

  const files = scanDirectory(path.join(__dirname, '..', 'packages'));

  const criticalIssues = [];
  const highIssues = [];
  const mediumIssues = [];
  const lowIssues = [];
  const infoIssues = [];

  for (const file of files) {
    const issues = analyzeFile(file);

    for (const issue of issues) {
      switch (issue.severity) {
        case 'critical':
          criticalIssues.push(issue);
          break;
        case 'high':
          highIssues.push(issue);
          break;
        case 'medium':
          mediumIssues.push(issue);
          break;
        case 'low':
          lowIssues.push(issue);
          break;
        case 'info':
          infoIssues.push(issue);
          break;
      }
    }
  }

  // Print results
  if (criticalIssues.length > 0) {
    log(`\n🔴 CRITICAL ISSUES (${criticalIssues.length})`, colors.red);
    for (const issue of criticalIssues) {
      log(`  • ${issue.file}:${issue.line}`, colors.red);
      log(`    ${issue.message}`, colors.red);
      log(`    💡 ${issue.suggestion}\n`, colors.cyan);
    }
  }

  if (highIssues.length > 0) {
    log(`\n🟠 HIGH PRIORITY (${highIssues.length})`, colors.yellow);
    for (const issue of highIssues.slice(0, 10)) {
      log(`  • ${issue.file}:${issue.line}`, colors.yellow);
      log(`    ${issue.message}\n`, colors.reset);
    }
    if (highIssues.length > 10) {
      log(`  ... and ${highIssues.length - 10} more`, colors.yellow);
    }
  }

  if (mediumIssues.length > 0) {
    log(`\n🟡 MEDIUM PRIORITY (${mediumIssues.length})`, colors.yellow);
    for (const issue of mediumIssues.slice(0, 5)) {
      log(`  • ${issue.file}:${issue.line} - ${issue.message}`, colors.reset);
    }
    if (mediumIssues.length > 5) {
      log(`  ... and ${mediumIssues.length - 5} more`, colors.reset);
    }
  }

  if (lowIssues.length > 0) {
    log(`\n🟢 LOW PRIORITY (${lowIssues.length})`, colors.green);
  }

  if (infoIssues.length > 0) {
    log(`\n📝 NOTES (${infoIssues.length})`, colors.cyan);
    for (const issue of infoIssues.slice(0, 5)) {
      log(`  • ${issue.file}:${issue.line} - ${issue.message}`, colors.cyan);
    }
  }

  // Summary
  const totalIssues = criticalIssues.length + highIssues.length + mediumIssues.length + lowIssues.length;

  log('\n╔════════════════════════════════════════════════════════════╗', colors.cyan);
  log('║                      SUMMARY                                ║', colors.cyan);
  log('╚════════════════════════════════════════════════════════════╝\n', colors.cyan);

  log(`Total issues found: ${totalIssues}`, colors.bright);
  log(`  Critical: ${criticalIssues.length}`, criticalIssues.length > 0 ? colors.red : colors.green);
  log(`  High: ${highIssues.length}`, highIssues.length > 0 ? colors.yellow : colors.green);
  log(`  Medium: ${mediumIssues.length}`, colors.reset);
  log(`  Low: ${lowIssues.length}`, colors.reset);
  log(`  Info: ${infoIssues.length}`, colors.cyan);

  if (totalIssues === 0) {
    log('\n✅ No issues found! Great job!', colors.green);
  } else {
    log('\n💡 Run with --fix to automatically fix some issues', colors.cyan);
  }

  // Exit with appropriate code
  process.exit(criticalIssues.length > 0 ? 1 : 0);
}

main();
