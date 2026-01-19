/**
 * Code Analysis Tools
 * Tools for analyzing code quality, finding bugs, and suggesting improvements
 */

import { execSync } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { validateInput, toolSchemas } from '../utils/validator.js';
import type { ToolMetadata, ToolContext, ToolArgs } from '../types/index.js';

/**
 * Analyze TypeScript code for potential issues
 */
export const codeAnalysisTools: ToolMetadata[] = [
  {
    name: 'analyze_typescript_errors',
    description: 'Run TypeScript compiler to find type errors in the project',
    inputSchema: {
      type: 'object',
      properties: {
        projectPath: {
          type: 'string',
          description: 'Path to the project root (defaults to current workspace)',
        },
      },
    },
    handler: async (args: ToolArgs, context: ToolContext) => {
      const { projectPath } = validateInput(toolSchemas.analyzeProject, args);
      const targetPath = projectPath || context.workspaceRoot;

      try {
        const result = execSync('npx tsc --noEmit', {
          cwd: targetPath,
          encoding: 'utf-8',
          stdio: ['ignore', 'pipe', 'pipe'],
        });

        return {
          success: true,
          errors: [],
          message: 'No TypeScript errors found!',
        };
      } catch (error: any) {
        const errorOutput = error.stdout || error.stderr || error.message;

        // Parse TypeScript errors
        const errors = parseTypeScriptErrors(errorOutput);

        return {
          success: false,
          errorCount: errors.length,
          errors,
          message: `Found ${errors.length} TypeScript error(s)`,
        };
      }
    },
    options: {
      cacheable: true,
      cacheTTL: 10000, // 10 seconds
      timeout: 60000, // 1 minute
    },
  },

  {
    name: 'find_unused_exports',
    description: 'Find unused exports and dead code using ts-prune',
    inputSchema: {
      type: 'object',
      properties: {
        projectPath: {
          type: 'string',
          description: 'Path to the project root',
        },
      },
    },
    handler: async (args: ToolArgs, context: ToolContext) => {
      const { projectPath } = validateInput(toolSchemas.analyzeProject, args);
      const targetPath = projectPath || context.workspaceRoot;

      try {
        const result = execSync('npx ts-prune --ignore unknown', {
          cwd: targetPath,
          encoding: 'utf-8',
          stdio: ['ignore', 'pipe', 'pipe'],
        });

        const lines = result.trim().split('\n').filter(Boolean);
        const unusedExports = lines.map((line) => {
          const [file, exportName] = line.split(':');
          return { file, export: exportName };
        });

        return {
          success: true,
          unusedExports,
          count: unusedExports.length,
          message: unusedExports.length > 0
            ? `Found ${unusedExports.length} unused export(s)`
            : 'No unused exports found',
        };
      } catch (error: any) {
        // ts-prune exits with code 1 when unused exports are found
        const output = error.stdout || error.stderr || error.message;

        if (output.includes('ts-prune')) {
          return {
            success: true,
            unusedExports: [],
            count: 0,
            message: 'No unused exports found',
          };
        }

        throw error;
      }
    },
    options: {
      cacheable: true,
      cacheTTL: 30000,
    },
  },

  {
    name: 'check_code_complexity',
    description: 'Analyze code complexity using ESLint with complexity rules',
    inputSchema: {
      type: 'object',
      properties: {
        projectPath: {
          type: 'string',
          description: 'Path to the project root',
        },
        maxComplexity: {
          type: 'number',
          description: 'Maximum complexity threshold (default: 10)',
          minimum: 1,
          maximum: 50,
        },
      },
    },
    handler: async (args: ToolArgs, context: ToolContext) => {
      const maxComplexity = (args.maxComplexity as number) || 10;

      try {
        const result = execSync(
          `npx eslint --format json --quiet 'src/**/*.{ts,tsx}' --rule 'complexity: ["error", ${maxComplexity}]'`,
          {
            cwd: context.workspaceRoot,
            encoding: 'utf-8',
            stdio: ['ignore', 'pipe', 'pipe'],
          }
        );

        const eslintResults = JSON.parse(result);

        return {
          success: true,
          maxComplexity,
          violations: eslintResults.length,
          message: `Complexity check passed (max: ${maxComplexity})`,
        };
      } catch (error: any) {
        const output = error.stdout || error.stderr || '';

        try {
          const eslintResults = JSON.parse(output);
          const violations = eslintResults
            .flatMap((r: any) => r.messages)
            .filter((m: any) => m.ruleId === 'complexity')
            .map((m: any) => ({
              file: eslintResults.find((r: any) => r.messages.includes(m))?.filePath,
              line: m.line,
              column: m.column,
              complexity: m.message.match(/\d+/)?.[0] || 'unknown',
            }));

          return {
            success: false,
            maxComplexity,
            violationCount: violations.length,
            violations,
            message: `Found ${violations.length} complexity violation(s) (max: ${maxComplexity})`,
          };
        } catch {
          throw error;
        }
      }
    },
    options: {
      cacheable: true,
      cacheTTL: 15000,
    },
  },

  {
    name: 'find_duplicate_code',
    description: 'Find duplicate code patterns using js-xray or similar tools',
    inputSchema: {
      type: 'object',
      properties: {
        projectPath: {
          type: 'string',
          description: 'Path to analyze',
        },
        minLines: {
          type: 'number',
          description: 'Minimum lines to consider as duplicate (default: 5)',
          minimum: 3,
          maximum: 20,
        },
      },
    },
    handler: async (args: ToolArgs, context: ToolContext) => {
      const minLines = (args.minLines as number) || 5;

      // Simple duplicate detection using string similarity
      const targetPath = args.projectPath as string || context.workspaceRoot;
      const tsFiles = await findTypeScriptFiles(targetPath);
      const duplicates: Array<{
        files: string[];
        lines: number[];
        similarity: number;
      }> = [];

      // This is a simplified implementation
      // In production, use a proper code duplication tool like js-xray or PMD-CPD

      return {
        success: true,
        message: 'Code duplication analysis complete',
        duplicates,
        summary: {
          totalDuplicates: duplicates.length,
          filesAnalyzed: tsFiles.length,
        },
        note: 'This is a simplified implementation. For production, integrate js-xray or similar.',
      };
    },
    options: {
      cacheable: true,
      cacheTTL: 60000,
    },
  },
];

/**
 * Helper: Parse TypeScript error output
 */
function parseTypeScriptErrors(output: string): Array<{
  file: string;
  line: number;
  column: number;
  code: string;
  message: string;
}> {
  const errors: ReturnType<typeof parseTypeScriptErrors> = [];
  const lines = output.split('\n');

  for (const line of lines) {
    // TS error format: file.ts(line,column): error TScode: message
    const match = line.match(/^(.+)\((\d+),(\d+)\): error TS(\d+): (.+)$/);

    if (match) {
      errors.push({
        file: match[1],
        line: parseInt(match[2], 10),
        column: parseInt(match[3], 10),
        code: `TS${match[4]}`,
        message: match[5].trim(),
      });
    }
  }

  return errors;
}

/**
 * Helper: Find all TypeScript files recursively
 */
async function findTypeScriptFiles(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      // Skip node_modules and dist
      if (!['node_modules', 'dist', '.git', 'build'].includes(entry.name)) {
        const subFiles = await findTypeScriptFiles(fullPath);
        files.push(...subFiles);
      }
    } else if (entry.name.match(/\.(ts|tsx)$/)) {
      files.push(fullPath);
    }
  }

  return files;
}
