/**
 * Module Ownership Checker
 *
 * This utility checks if a file path belongs to a specific module owner.
 * It can be used by AI agents to verify they're not crossing boundaries.
 *
 * Usage:
 *   import { checkOwnership, getOwner, canModify } from './check-ownership';
 *
 *   // Check if I can modify this file
 *   if (!canModify('/path/to/file.ts', 'friend1')) {
 *     console.error('❌ Cannot modify - outside owned module');
 *   }
 */

import { readFileSync } from 'fs';
import { join } from 'path';

interface ModuleOwnershipConfig {
  version: string;
  lastUpdated: string;
  team: {
    members: Record<string, {
      name: string;
      role: string;
      email: string;
      timezone: string;
    }>;
  };
  modules: Record<string, {
    owner: string;
    name: string;
    description: string;
    ownedPaths: string[];
    sharedDependencies: string[];
    apiContracts: string[];
  }>;
  shared: {
    description: string;
    paths: string[];
    approvalRequired: boolean;
    minApprovers: number;
  };
  rules: {
    ownership: {
      canModifyOwnModule: boolean;
      canModifySharedWithApproval: boolean;
      canModifyOtherModule: boolean;
      canCreateFilesInOwnModule: boolean;
      canCreateFilesInShared: boolean;
    };
    coordination: {
      beforeChangingShared: string;
      beforeChangingDependency: string;
      mergeConflictInOwnModule: string;
      mergeConflictInShared: string;
      mergeConflictInOtherModule: string;
    };
    branches: {
      [key: string]: string;
    };
  };
}

// Load configuration
let config: ModuleOwnershipConfig | null = null;

function loadConfig(): ModuleOwnershipConfig {
  if (!config) {
    try {
      const configPath = join(process.cwd(), 'MODULE_OWNERSHIP.json');
      const configContent = readFileSync(configPath, 'utf-8');
      config = JSON.parse(configContent);
    } catch (error) {
      console.warn('⚠️  Could not load MODULE_OWNERSHIP.json, using defaults');
      config = {
        version: '1.0.0',
        lastUpdated: new Date().toISOString().split('T')[0],
        team: { members: {} },
        modules: {},
        shared: {
          description: 'Shared code',
          paths: ['packages/shared/', 'packages/backend/src/db/'],
          approvalRequired: true,
          minApprovers: 2
        },
        rules: {
          ownership: {
            canModifyOwnModule: true,
            canModifySharedWithApproval: true,
            canModifyOtherModule: false,
            canCreateFilesInOwnModule: true,
            canCreateFilesInShared: false
          },
          coordination: {
            beforeChangingShared: 'Post in team chat',
            beforeChangingDependency: 'Notify owners',
            mergeConflictInOwnModule: 'Resolve yourself',
            mergeConflictInShared: 'Discuss with team',
            mergeConflictInOtherModule: 'Ask owner to resolve'
          },
          branches: {
            main: 'Production',
            picking: 'friend1',
            packing: 'friend2',
            admin: 'you'
          }
        }
      };
    }
  }
  return config;
}

/**
 * Normalize a file path for comparison
 */
function normalizePath(filePath: string): string {
  return filePath.replace(/\\/g, '/').toLowerCase();
}

/**
 * Check if a path matches a pattern (supports wildcards)
 */
function pathMatches(filePath: string, pattern: string): boolean {
  const normalizedPath = normalizePath(filePath);
  const normalizedPattern = normalizePath(pattern);

  // Convert wildcard pattern to regex
  const regexPattern = normalizedPattern
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.');

  const regex = new RegExp(`^${regexPattern}`);
  return regex.test(normalizedPath);
}

/**
 * Get the owner of a file path
 *
 * @param filePath - The file path to check
 * @returns The owner ID or 'shared' if shared code, or null if unknown
 */
export function getOwner(filePath: string): string | null {
  const cfg = loadConfig();

  // Check shared paths first
  for (const sharedPath of cfg.shared.paths) {
    if (filePath.startsWith(sharedPath) || pathMatches(filePath, sharedPath)) {
      return 'shared';
    }
  }

  // Check each module
  for (const [moduleId, module] of Object.entries(cfg.modules)) {
    for (const ownedPath of module.ownedPaths) {
      if (filePath.startsWith(ownedPath) || pathMatches(filePath, ownedPath)) {
        return module.owner;
      }
    }
  }

  return null; // Unknown file
}

/**
 * Get the module ID for a file path
 */
export function getModule(filePath: string): string | null {
  const cfg = loadConfig();

  // Skip shared paths
  for (const sharedPath of cfg.shared.paths) {
    if (filePath.startsWith(sharedPath) || pathMatches(filePath, sharedPath)) {
      return null;
    }
  }

  // Check each module
  for (const [moduleId, module] of Object.entries(cfg.modules)) {
    for (const ownedPath of module.ownedPaths) {
      if (filePath.startsWith(ownedPath) || pathMatches(filePath, ownedPath)) {
        return moduleId;
      }
    }
  }

  return null;
}

/**
 * Check if a user can modify a file
 *
 * @param filePath - The file path to check
 * @param userId - The user ID (e.g., 'you', 'friend1', 'friend2')
 * @returns Object with permission status and reason
 */
export function canModify(
  filePath: string,
  userId: string
): {
  allowed: boolean;
  reason: string;
  requiresCoordination: boolean;
  owner?: string;
} {
  const cfg = loadConfig();
  const owner = getOwner(filePath);

  // Shared code
  if (owner === 'shared') {
    return {
      allowed: cfg.rules.ownership.canModifySharedWithApproval,
      reason: cfg.shared.description + ' - requires team coordination',
      requiresCoordination: true
    };
  }

  // Other person's module
  if (owner && owner !== userId) {
    const module = Object.values(cfg.modules).find(m => m.owner === owner);
    return {
      allowed: cfg.rules.ownership.canModifyOtherModule,
      reason: `Owned by ${module?.name || owner} - contact ${owner} for changes`,
      requiresCoordination: true,
      owner
    };
  }

  // Your own module
  if (owner === userId) {
    return {
      allowed: cfg.rules.ownership.canModifyOwnModule,
      reason: 'Within owned module',
      requiresCoordination: false
    };
  }

  // Unknown file
  return {
    allowed: false,
    reason: 'File not owned by any module - coordinate with team',
    requiresCoordination: true
  };
}

/**
 * Check multiple files and return ownership report
 */
export function checkOwnership(filePaths: string[], userId: string): {
  canProceed: boolean;
  owned: string[];
  shared: string[];
  otherModules: string[];
  unknown: string[];
  requiresCoordination: boolean;
  warnings: string[];
} {
  const owned: string[] = [];
  const shared: string[] = [];
  const otherModules: string[] = [];
  const unknown: string[] = [];
  const warnings: string[] = [];

  for (const filePath of filePaths) {
    const check = canModify(filePath, userId);

    if (check.requiresCoordination) {
      const owner = getOwner(filePath);
      if (owner === 'shared') {
        shared.push(filePath);
      } else if (owner) {
        otherModules.push(filePath);
      } else {
        unknown.push(filePath);
      }
      warnings.push(`⚠️  ${filePath}: ${check.reason}${check.owner ? ' (owner: ' + check.owner + ')' : ''}`);
    } else {
      owned.push(filePath);
    }
  }

  const requiresCoordination = shared.length > 0 || otherModules.length > 0 || unknown.length > 0;

  return {
    canProceed: !requiresCoordination || warnings.length === 0,
    owned,
    shared,
    otherModules,
    unknown,
    requiresCoordination,
    warnings
  };
}

/**
 * Get shared dependencies for a module
 */
export function getSharedDependencies(moduleId: string): string[] {
  const cfg = loadConfig();
  return cfg.modules[moduleId]?.sharedDependencies || [];
}

/**
 * Get modules that depend on a shared file
 */
export function getDependentModules(sharedFilePath: string): string[] {
  const cfg = loadConfig();
  const dependents: string[] = [];

  for (const [moduleId, module] of Object.entries(cfg.modules)) {
    if (module.sharedDependencies.some(dep => sharedFilePath.includes(dep))) {
      dependents.push(moduleId);
    }
  }

  return dependents;
}

/**
 * Generate a coordination message for team chat
 */
export function generateCoordinationMessage(
  filePaths: string[],
  userId: string,
  taskDescription: string
): string {
  const check = checkOwnership(filePaths, userId);

  if (!check.requiresCoordination) {
    return `✅ Working on: ${taskDescription}\nAll files within owned module.`;
  }

  let message = `🔄 Planning changes that require coordination:\n`;
  message += `👤 @${userId}\n`;
  message += `📝 Task: ${taskDescription}\n\n`;

  if (check.shared.length > 0) {
    message += `🔗 Shared code affected:\n`;
    for (const file of check.shared) {
      const dependents = getDependentModules(file);
      message += `  - ${file}\n`;
      if (dependents.length > 0) {
        message += `    Depends on: ${dependents.join(', ')}\n`;
      }
    }
  }

  if (check.otherModules.length > 0) {
    message += `\n⚠️  Other modules affected:\n`;
    for (const file of check.otherModules) {
      const owner = getOwner(file);
      message += `  - ${file} (owner: @${owner})\n`;
    }
  }

  message += `\n👀 Anyone working on dependent code?`;

  return message;
}

/**
 * CLI-style output for AI agents
 */
export function formatOwnershipReport(check: ReturnType<typeof checkOwnership>, userId: string): string {
  let output = '';

  output += `📊 Ownership Report for @${userId}\n`;
  output += `${'='.repeat(50)}\n\n`;

  if (check.owned.length > 0) {
    output += `✅ Owned Files (${check.owned.length}):\n`;
    for (const file of check.owned) {
      output += `  ✓ ${file}\n`;
    }
    output += `\n`;
  }

  if (check.shared.length > 0) {
    output += `🔗 Shared Code (${check.shared.length}):\n`;
    output += `  ⚠️  Requires team coordination\n`;
    for (const file of check.shared) {
      output += `  - ${file}\n`;
    }
    output += `\n`;
  }

  if (check.otherModules.length > 0) {
    output += `🚫 Other Modules (${check.otherModules.length}):\n`;
    output += `  ⚠️  Contact module owners before modifying\n`;
    for (const file of check.otherModules) {
      const owner = getOwner(file);
      output += `  - ${file} (owner: @${owner})\n`;
    }
    output += `\n`;
  }

  if (check.unknown.length > 0) {
    output += `❓ Unknown Files (${check.unknown.length}):\n`;
    output += `  ⚠️  Not owned by any module - coordinate with team\n`;
    for (const file of check.unknown) {
      output += `  - ${file}\n`;
    }
    output += `\n`;
  }

  if (check.requiresCoordination) {
    output += `⚠️  ACTION REQUIRED:\n`;
    output += generateCoordinationMessage(
      [...check.shared, ...check.otherModules, ...check.unknown],
      userId,
      '[your task description]'
    );
  } else {
    output += `✅ All files within owned module. Safe to proceed.\n`;
  }

  return output;
}

/**
 * Main function for AI agents to call
 */
export function checkFilesForAI(filePaths: string[], userId: string): void {
  const check = checkOwnership(filePaths, userId);
  const report = formatOwnershipReport(check, userId);

  console.log(report);

  if (check.requiresCoordination) {
    console.log(`\n❌ STOP: These changes require team coordination before proceeding.\n`);
    console.log(`Post this message in your team chat:\n`);
    console.log(`---\n${generateCoordinationMessage(filePaths, userId, '[describe your task]')}\n---\n`);
    // In a real implementation, you might throw an error here
    // throw new Error('Team coordination required');
  }
}

// Export for CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.log('Usage: check-ownership.ts <userId> <file1> [file2] ...');
    console.log('Example: check-ownership.ts you packages/shared/src/types/index.ts');
    process.exit(1);
  }

  const userId = args[0];
  const files = args.slice(1);

  checkFilesForAI(files, userId);
}
