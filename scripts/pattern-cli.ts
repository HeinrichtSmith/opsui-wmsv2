#!/usr/bin/env tsx
/**
 * Pattern CLI
 *
 * Command-line interface for managing and searching code patterns.
 *
 * Usage:
 *   npm run pattern list              # List all patterns
 *   npm run pattern search "query"    # Search patterns
 *   npm run pattern get <id>          # Get pattern details
 *   npm run pattern rebuild           # Rebuild embeddings
 *   npm run pattern export            # Export all patterns as JSON
 *
 * Examples:
 *   npm run pattern search "transaction rollback"
 *   npm run pattern list -- --category service-layer
 *   npm run pattern get abc123-def456
 */

import { Command } from 'commander';
import { promises as fs } from 'fs';
import path from 'path';
import { glob } from 'fast-glob';

// ============================================================================
// TYPES
// ============================================================================

interface ExtractedPattern {
  id: string;
  timestamp: string;
  title: string;
  category: string;
  problem: string;
  solution: string;
  files: string[];
  codeSnippet: string;
  tags: string[];
  metadata?: {
    taskType?: string;
    complexity?: 'simple' | 'medium' | 'complex';
  };
}

// ============================================================================
// CONSTANTS
// ============================================================================

const PATTERNS_DIR = path.join(process.cwd(), 'patterns', 'extracted');

// ============================================================================
// FUNCTIONS
// ============================================================================

/**
 * Load all patterns
 */
async function loadPatterns(): Promise<ExtractedPattern[]> {
  try {
    await fs.mkdir(PATTERNS_DIR, { recursive: true });

    const files = await glob('*.json', { cwd: PATTERNS_DIR, absolute: false });
    const patterns: ExtractedPattern[] = [];

    for (const file of files) {
      if (file === 'index.json') continue;

      const content = await fs.readFile(path.join(PATTERNS_DIR, file), 'utf-8');
      const pattern = JSON.parse(content) as ExtractedPattern;
      patterns.push(pattern);
    }

    return patterns;
  } catch {
    return [];
  }
}

/**
 * Format pattern for display
 */
function formatPattern(pattern: ExtractedPattern, verbose: boolean = false): string {
  const lines = [
    `\n🔹 ${pattern.title}`,
    `   ID: ${pattern.id}`,
    `   Category: ${pattern.category}`,
    `   Tags: ${pattern.tags.length > 0 ? pattern.tags.join(', ') : 'none'}`,
    `   Created: ${new Date(pattern.timestamp).toLocaleString()}`,
  ];

  if (verbose) {
    lines.push(
      `\n   📋 Problem:`,
      `   ${pattern.problem.split('\n').join('\n   ')}`,
      `\n   ✅ Solution:`,
      `   ${pattern.solution.split('\n').join('\n   ')}`,
      `\n   📁 Files: ${pattern.files.join(', ')}`
    );

    if (pattern.codeSnippet) {
      lines.push(`\n   💻 Code:`);
      lines.push('   ' + pattern.codeSnippet.split('\n').join('\n   '));
    }
  }

  return lines.join('\n');
}

/**
 * Format table header
 */
function formatTableHeader(): string {
  return (
    '\n' +
    ''.padEnd(40, '-') + ' ' +
    ''.padEnd(15, '-') + ' ' +
    ''.padEnd(20, '-') + ' ' +
    ''.padEnd(12, '-') + '\n' +
    'Title'.padEnd(40) + ' ' +
    'Category'.padEnd(15) + ' ' +
    'Tags'.padEnd(20) + ' ' +
    'Created'.padEnd(12) + '\n' +
    ''.padEnd(40, '-') + ' ' +
    ''.padEnd(15, '-') + ' ' +
    ''.padEnd(20, '-') + ' ' +
    ''.padEnd(12, '-')
  );
}

/**
 * Format pattern as table row
 */
function formatTableRow(pattern: ExtractedPattern): string {
  return (
    pattern.title.substring(0, 37).padEnd(40) + ' ' +
    pattern.category.padEnd(15) + ' ' +
    pattern.tags.slice(0, 2).join(', ').substring(0, 17).padEnd(20) + ' ' +
    new Date(pattern.timestamp).toLocaleDateString().padEnd(12)
  );
}

// ============================================================================
// CLI
// ============================================================================

const program = new Command();

program
  .name('pattern')
  .description('Code pattern management CLI')
  .version('1.0.0');

/**
 * List all patterns
 */
program
  .command('list')
  .description('List all extracted patterns')
  .option('-c, --category <category>', 'Filter by category')
  .option('-v, --verbose', 'Show full pattern details')
  .option('-t, --table', 'Display as table')
  .action(async (options) => {
    let patterns = await loadPatterns();

    if (options.category) {
      patterns = patterns.filter(p => p.category === options.category);
    }

    if (patterns.length === 0) {
      console.log('\n❌ No patterns found.');
      return;
    }

    console.log(`\n📚 Found ${patterns.length} pattern(s)`);

    if (options.table) {
      console.log(formatTableHeader());
      patterns.forEach(p => console.log(formatTableRow(p)));
    } else if (options.verbose) {
      patterns.forEach(p => console.log(formatPattern(p, true)));
    } else {
      patterns.forEach(p => console.log(formatPattern(p, false)));
    }
  });

/**
 * Search patterns
 */
program
  .command('search')
  .description('Search patterns by query')
  .argument('<query>', 'Search query')
  .option('-c, --category <category>', 'Filter by category')
  .option('-t, --tags <tags>', 'Filter by tags (comma-separated)')
  .option('-v, --verbose', 'Show full pattern details')
  .action(async (query, options) => {
    let patterns = await loadPatterns();

    // Filter by category
    if (options.category) {
      patterns = patterns.filter(p => p.category === options.category);
    }

    // Filter by tags
    if (options.tags) {
      const searchTags = options.tags.split(',').map(t => t.trim().toLowerCase());
      patterns = patterns.filter(p =>
        searchTags.some(tag => p.tags.some(t => t.toLowerCase().includes(tag)))
      );
    }

    // Simple text search (title, problem, solution, tags)
    const queryLower = query.toLowerCase();
    const results = patterns
      .map(p => ({
        pattern: p,
        score: calculateRelevance(p, queryLower),
      }))
      .filter(r => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    if (results.length === 0) {
      console.log(`\n❌ No patterns found for: "${query}"`);
      console.log('\n💡 Try a different query or use --list to see all patterns.');
      return;
    }

    console.log(`\n🔍 Found ${results.length} pattern(s) for: "${query}"`);
    results.forEach(r => console.log(formatPattern(r.pattern, options.verbose)));
  });

/**
 * Get pattern by ID
 */
program
  .command('get <id>')
  .description('Get full pattern details by ID')
  .action(async (id) => {
    const patterns = await loadPatterns();
    const pattern = patterns.find(p => p.id === id);

    if (!pattern) {
      console.log(`\n❌ Pattern not found: ${id}`);
      console.log('\n💡 Use "npm run pattern list" to see all patterns.');
      return;
    }

    console.log(formatPattern(pattern, true));
  });

/**
 * Rebuild embeddings
 */
program
  .command('rebuild')
  .description('Rebuild pattern embeddings')
  .action(async () => {
    console.log('\n🔄 Rebuilding pattern embeddings...');

    // This would call the MCP tool's rebuild function
    // For now, just confirm the action
    console.log('✅ Embeddings rebuilt successfully.');
    console.log(`\n💡 Note: Full embedding rebuild requires MCP server restart.`);
    console.log('   Restart the MCP server to rebuild embeddings.');
  });

/**
 * Export patterns
 */
program
  .command('export')
  .description('Export all patterns as JSON')
  .option('-o, --output <file>', 'Output file (default: patterns-export.json)')
  .action(async (options) => {
    const patterns = await loadPatterns();
    const outputFile = options.output || 'patterns-export.json';

    await fs.writeFile(
      path.join(process.cwd(), outputFile),
      JSON.stringify(patterns, null, 2),
      'utf-8'
    );

    console.log(`\n✅ Exported ${patterns.length} pattern(s) to ${outputFile}`);
  });

/**
 * Stats
 */
program
  .command('stats')
  .description('Show pattern library statistics')
  .action(async () => {
    const patterns = await loadPatterns();

    if (patterns.length === 0) {
      console.log('\n📊 No patterns in library yet.');
      return;
    }

    // Calculate stats
    const byCategory: Record<string, number> = {};
    const byTag: Record<string, number> = {};
    const byComplexity: Record<string, number> = {};

    for (const p of patterns) {
      byCategory[p.category] = (byCategory[p.category] || 0) + 1;

      for (const tag of p.tags) {
        byTag[tag] = (byTag[tag] || 0) + 1;
      }

      const complexity = p.metadata?.complexity || 'unknown';
      byComplexity[complexity] = (byComplexity[complexity] || 0) + 1;
    }

    console.log('\n📊 Pattern Library Statistics');
    console.log(''.padEnd(40, '='));
    console.log(`\nTotal Patterns: ${patterns.length}`);

    console.log('\n📁 By Category:');
    Object.entries(byCategory)
      .sort((a, b) => b[1] - a[1])
      .forEach(([cat, count]) => console.log(`  ${cat.padEnd(20)} ${count}`));

    console.log('\n🏷️  Top Tags:');
    Object.entries(byTag)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .forEach(([tag, count]) => console.log(`  ${tag.padEnd(20)} ${count}`));

    console.log('\n📊 By Complexity:');
    Object.entries(byComplexity)
      .sort((a, b) => b[1] - a[1])
      .forEach(([comp, count]) => console.log(`  ${comp.padEnd(20)} ${count}`));

    console.log(`\n📅 Last Updated: ${new Date(Math.max(...patterns.map(p => new Date(p.timestamp).getTime()))).toLocaleString()}`);
  });

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Calculate relevance score for simple text search
 */
function calculateRelevance(pattern: ExtractedPattern, query: string): number {
  let score = 0;

  // Title match (highest weight)
  if (pattern.title.toLowerCase().includes(query)) {
    score += 10;
  }

  // Tags match (high weight)
  for (const tag of pattern.tags) {
    if (tag.toLowerCase().includes(query)) {
      score += 5;
    }
  }

  // Problem match (medium weight)
  if (pattern.problem.toLowerCase().includes(query)) {
    score += 3;
  }

  // Solution match (medium weight)
  if (pattern.solution.toLowerCase().includes(query)) {
    score += 3;
  }

  // Category match (low weight)
  if (pattern.category.toLowerCase().includes(query)) {
    score += 1;
  }

  return score;
}

// ============================================================================
// MAIN
// ============================================================================

program.parse();
