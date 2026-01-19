/**
 * Pattern Index Watcher
 *
 * Automatically rebuilds pattern embeddings when pattern files change.
 * Run with: tsx scripts/watch-patterns.ts
 *
 * This watches the patterns/extracted directory and rebuilds the
 * semantic search index whenever patterns are added, modified, or deleted.
 */

import { watch } from 'chokidar';
import { pathToFileURL } from 'url';
import { pathToFileURL as ptfu } from 'url';
import { execSync } from 'child_process';

// Configuration
const PATTERNS_DIR = 'patterns/extracted';
const DEBOUNCE_MS = 500; // Wait 500ms after changes before rebuilding

console.log('[Pattern Watcher] Starting...');
console.log(`[Pattern Watcher] Watching: ${PATTERNS_DIR}`);

let debounceTimer: NodeJS.Timeout | null = null;

/**
 * Rebuild pattern embeddings by calling the MCP tool
 */
function rebuildIndex(): void {
  console.log('[Pattern Watcher] 🔄 Rebuilding pattern index...');

  try {
    // Call the pattern_rebuild MCP tool via node
    // We use a direct import and call since we're in the same process
    execSync(
      'node -e "import(`file://${process.cwd()}/tools/mcp-server/dist/tools/pattern-extraction.js`).then(m => m.rebuildEmbeddings?.())"',
      {
        stdio: 'inherit',
        cwd: process.cwd(),
      }
    );

    console.log('[Pattern Watcher] ✅ Index rebuilt successfully');
  } catch (error) {
    console.error('[Pattern Watcher] ❌ Failed to rebuild index:', error);
  }
}

/**
 * Debounced rebuild to avoid multiple rebuilds in quick succession
 */
function scheduleRebuild(): void {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  debounceTimer = setTimeout(() => {
    rebuildIndex();
    debounceTimer = null;
  }, DEBOUNCE_MS);
}

// Initialize watcher
const watcher = watch(PATTERNS_DIR, {
  persistent: true,
  ignoreInitial: true,
  awaitWriteFinish: {
    stabilityThreshold: 200,
    pollInterval: 100,
  },
});

// Watch for changes
watcher
  .on('add', path => {
    console.log(`[Pattern Watcher] ➕ New pattern: ${path}`);
    scheduleRebuild();
  })
  .on('change', path => {
    console.log(`[Pattern Watcher] ✏️  Modified: ${path}`);
    scheduleRebuild();
  })
  .on('unlink', path => {
    console.log(`[Pattern Watcher] 🗑️  Deleted: ${path}`);
    scheduleRebuild();
  })
  .on('error', error => {
    console.error('[Pattern Watcher] ❌ Watcher error:', error);
  })
  .on('ready', () => {
    console.log('[Pattern Watcher] ✅ Ready. Watching for pattern changes...');
    console.log('[Pattern Watcher] Press Ctrl+C to stop');
  });

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[Pattern Watcher] Shutting down...');
  watcher.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n[Pattern Watcher] Shutting down...');
  watcher.close();
  process.exit(0);
});
