/**
 * Project Management Tools
 * Tools for project analysis, structure validation, and workspace operations
 */

import { promises as fs } from 'fs';
import path from 'path';
import fastGlob from 'fast-glob';
import type { ToolMetadata, ToolContext, ToolArgs } from '../types/index.js';

export const projectTools: ToolMetadata[] = [
  {
    name: 'analyze_project_structure',
    description: 'Analyze the project structure and identify the tech stack, architecture patterns, and potential issues',
    inputSchema: {
      type: 'object',
      properties: {
        projectPath: {
          type: 'string',
          description: 'Path to analyze (defaults to workspace root)',
        },
        includeTests: {
          type: 'boolean',
          description: 'Include test files in analysis',
        },
        includeDependencies: {
          type: 'boolean',
          description: 'Include dependency analysis',
        },
      },
    },
    handler: async (args: ToolArgs, context: ToolContext) => {
      const projectPath = (args.projectPath as string) || context.workspaceRoot;
      const includeTests = args.includeTests !== false;
      const includeDependencies = args.includeDependencies !== false;

      // Analyze project structure
      const structure = await analyzeStructure(projectPath, includeTests);

      // Detect framework and language
      const detection = await detectFramework(projectPath);

      // Analyze dependencies if requested
      let dependencies = null;
      if (includeDependencies) {
        dependencies = await analyzeDependencies(projectPath);
      }

      // Identify potential issues
      const issues = await identifyIssues(projectPath, structure);

      return {
        structure,
        detection,
        dependencies,
        issues,
        summary: {
          totalFiles: structure.fileCount,
          languages: structure.languages,
          framework: detection.framework,
          testFramework: detection.testFramework,
          issueCount: issues.length,
        },
      };
    },
    options: {
      cacheable: true,
      cacheTTL: 30000, // 30 seconds
      timeout: 15000,
    },
  },

  {
    name: 'validate_project_structure',
    description: 'Validate that the project follows the established conventions and patterns',
    inputSchema: {
      type: 'object',
      properties: {
        projectPath: {
          type: 'string',
          description: 'Path to validate',
        },
        conventions: {
          type: 'array',
          description: 'Specific conventions to validate (defaults to all)',
          items: {
            type: 'string',
            enum: [
              'file-naming',
              'directory-structure',
              'import-order',
              'typescript-config',
              'testing-structure',
            ],
          },
        },
      },
    },
    handler: async (args: ToolArgs, context: ToolContext) => {
      const projectPath = (args.projectPath as string) || context.workspaceRoot;
      const conventions = (args.conventions as string[]) || [
        'file-naming',
        'directory-structure',
        'typescript-config',
      ];

      const validations: Array<{
        convention: string;
        valid: boolean;
        issues: string[];
      }> = [];

      for (const convention of conventions) {
        const result = await validateConvention(projectPath, convention);
        validations.push(result);
      }

      const allValid = validations.every((v) => v.valid);
      const totalIssues = validations.reduce((sum, v) => sum + v.issues.length, 0);

      return {
        valid: allValid,
        validations,
        summary: {
          totalValidations: validations.length,
          passed: validations.filter((v) => v.valid).length,
          failed: validations.filter((v) => !v.valid).length,
          totalIssues,
        },
        message: allValid
          ? 'All validations passed'
          : `Found ${totalIssues} issue(s) across ${validations.filter((v) => !v.valid).length} convention(s)`,
      };
    },
    options: {
      cacheable: true,
      cacheTTL: 20000,
    },
  },

  {
    name: 'find_related_files',
    description: 'Find files related to a given file (imports, dependencies, test files)',
    inputSchema: {
      type: 'object',
      properties: {
        filePath: {
          type: 'string',
          description: 'Path to the file to analyze',
        },
        includeTests: {
          type: 'boolean',
          description: 'Include related test files',
        },
      },
      required: ['filePath'],
    },
    handler: async (args: ToolArgs, context: ToolContext) => {
      const { filePath, includeTests = true } = args as {
        filePath: string;
        includeTests?: boolean;
      };

      const fullPath = path.resolve(context.workspaceRoot, filePath);

      // Check if file exists
      try {
        await fs.access(fullPath);
      } catch {
        return {
          error: 'File not found',
          filePath: fullPath,
        };
      }

      const content = await fs.readFile(fullPath, 'utf-8');
      const dirname = path.dirname(fullPath);

      // Find imports
      const imports: string[] = [];
      const importRegex = /import.*?from\s+['"]([^'"]+)['"]/g;
      let match;

      while ((match = importRegex.exec(content)) !== null) {
        imports.push(match[1]);
      }

      // Resolve import paths to actual files
      const relatedFiles: string[] = [];

      for (const imp of imports) {
        // Skip node_modules and absolute imports
        if (imp.startsWith('node_modules') || imp.startsWith('/') || imp.startsWith('@types/')) {
          continue;
        }

        // Handle relative imports
        if (imp.startsWith('.')) {
          const resolved = path.resolve(dirname, imp);
          const possibleExtensions = ['.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.js'];

          for (const ext of possibleExtensions) {
            try {
              await fs.access(resolved + ext);
              relatedFiles.push(path.relative(context.workspaceRoot, resolved + ext));
              break;
            } catch {
              // Try adding .ts or .js
            }
          }
        }
      }

      // Find test files
      let testFiles: string[] = [];
      if (includeTests) {
        const basename = path.basename(fullPath, path.extname(fullPath));
        const testPatterns = [
          `**/${basename}.test.ts`,
          `**/${basename}.spec.ts`,
          `**/${basename}.test.tsx`,
          `**/${basename}.spec.tsx`,
          `**/__tests__/**/${basename}*.ts`,
        ];

        for (const pattern of testPatterns) {
          const matches = await fastGlob(pattern, {
            cwd: context.workspaceRoot,
            absolute: false,
          });
          testFiles.push(...matches);
        }

        testFiles = [...new Set(testFiles)]; // Deduplicate
      }

      return {
        file: filePath,
        imports: imports,
        relatedFiles,
        testFiles,
        summary: {
          importCount: imports.length,
          relatedFileCount: relatedFiles.length,
          testFileCount: testFiles.length,
        },
      };
    },
    options: {
      cacheable: true,
      cacheTTL: 10000,
    },
  },
];

/**
 * Helper: Analyze project structure
 */
async function analyzeStructure(rootPath: string, includeTests: boolean) {
  const patterns = ['**/*.{ts,tsx,js,jsx,json}'];

  if (!includeTests) {
    patterns.push('!**/*.test.{ts,tsx,js,jsx}');
    patterns.push('!**/*.spec.{ts,tsx,js,jsx}');
    patterns.push('!**/__tests__/**');
  }

  const files = await fastGlob(patterns, {
    cwd: rootPath,
    absolute: false,
    ignore: ['**/node_modules/**', '**/dist/**', '**/build/**'],
  });

  const languages = new Set<string>();
  const extensions = new Set<string>();

  for (const file of files) {
    const ext = path.extname(file);
    extensions.add(ext);

    if (ext === '.ts' || ext === '.tsx') {
      languages.add('TypeScript');
    } else if (ext === '.js' || ext === '.jsx') {
      languages.add('JavaScript');
    }
  }

  return {
    fileCount: files.length,
    languages: Array.from(languages),
    extensions: Array.from(extensions),
    directories: await getDirectoryStructure(rootPath),
  };
}

/**
 * Helper: Detect framework and tools
 */
async function detectFramework(rootPath: string) {
  const detection = {
    framework: 'Unknown',
    testFramework: 'Unknown',
    buildTool: 'Unknown',
    language: 'Unknown',
  };

  // Check package.json
  const pkgPath = path.join(rootPath, 'package.json');
  try {
    const pkgContent = await fs.readFile(pkgPath, 'utf-8');
    const pkg = JSON.parse(pkgContent);

    // Detect language
    if (pkgContent.includes('typescript') || pkg.devDependencies?.typescript) {
      detection.language = 'TypeScript';
    } else {
      detection.language = 'JavaScript';
    }

    // Detect framework
    if (pkg.dependencies?.react || pkg.dependencies?.['@types/react']) {
      detection.framework = 'React';
    } else if (pkg.dependencies?.vue) {
      detection.framework = 'Vue';
    } else if (pkg.dependencies?.angular) {
      detection.framework = 'Angular';
    } else if (pkg.dependencies?.express) {
      detection.framework = 'Express';
    } else if (pkg.dependencies?.['@nestjs/core']) {
      detection.framework = 'NestJS';
    }

    // Detect test framework
    if (pkg.devDependencies?.jest || pkg.dependencies?.jest) {
      detection.testFramework = 'Jest';
    } else if (pkg.devDependencies?.vitest) {
      detection.testFramework = 'Vitest';
    } else if (pkg.devDependencies?.mocha) {
      detection.testFramework = 'Mocha';
    }

    // Detect build tool
    if (pkg.devDependencies?.webpack || pkg.dependencies?.webpack) {
      detection.buildTool = 'Webpack';
    } else if (pkg.devDependencies?.vite) {
      detection.buildTool = 'Vite';
    } else if (pkg.devDependencies?.['@tanstack/router-vite-cli']) {
      detection.buildTool = 'Vite';
    } else if (pkg.devDependencies?.esbuild) {
      detection.buildTool = 'esbuild';
    }
  } catch {
    // package.json not found or invalid
  }

  return detection;
}

/**
 * Helper: Analyze dependencies
 */
async function analyzeDependencies(rootPath: string) {
  const pkgPath = path.join(rootPath, 'package.json');

  try {
    const pkgContent = await fs.readFile(pkgPath, 'utf-8');
    const pkg = JSON.parse(pkgContent);

    return {
      total: Object.keys(pkg.dependencies || {}).length,
      devTotal: Object.keys(pkg.devDependencies || {}).length,
      hasTypeScript: !!(pkg.devDependencies?.typescript),
      hasTesting: !!(
        pkg.devDependencies?.jest ||
        pkg.devDependencies?.vitest ||
        pkg.devDependencies?.mocha
      ),
      outdated: await checkOutdated(rootPath),
    };
  } catch {
    return null;
  }
}

/**
 * Helper: Identify issues
 */
async function identifyIssues(rootPath: string, structure: any) {
  const issues: string[] = [];

  // Check for missing files
  if (structure.languages.includes('TypeScript')) {
    try {
      await fs.access(path.join(rootPath, 'tsconfig.json'));
    } catch {
      issues.push('Missing tsconfig.json');
    }
  }

  // Check for common bad patterns
  const gitignorePath = path.join(rootPath, '.gitignore');
  try {
    await fs.access(gitignorePath);
    const gitignore = await fs.readFile(gitignorePath, 'utf-8');

    if (!gitignore.includes('node_modules')) {
      issues.push('.gitignore missing node_modules');
    }
    if (!gitignore.includes('.env')) {
      issues.push('.gitignore missing .env (potential security risk)');
    }
  } catch {
    issues.push('Missing .gitignore');
  }

  // Check for .env.example
  try {
    await fs.access(path.join(rootPath, '.env.example'));
  } catch {
    try {
      await fs.access(path.join(rootPath, '.env'));
      issues.push('Has .env file but no .env.example (security risk)');
    } catch {
      // No .env file, so this is okay
    }
  }

  return issues;
}

/**
 * Helper: Check for outdated dependencies (simplified)
 */
async function checkOutdated(rootPath: string) {
  // In a real implementation, this would check against npm registry
  // For now, return a placeholder
  return {
    count: 0,
    packages: [],
  };
}

/**
 * Helper: Get directory structure
 */
async function getDirectoryStructure(rootPath: string) {
  const dirs = await fastGlob('*/', {
    cwd: rootPath,
    absolute: false,
    onlyDirectories: true,
    ignore: ['**/node_modules/**', '**/dist/**', '**/build/**'],
  });

  return dirs.sort();
}

/**
 * Helper: Validate specific convention
 */
async function validateConvention(
  rootPath: string,
  convention: string
): Promise<{ convention: string; valid: boolean; issues: string[] }> {
  const issues: string[] = [];

  switch (convention) {
    case 'file-naming':
      // Check for files with spaces or uppercase
      const files = await fastGlob('**/*.{ts,tsx,js,jsx}', {
        cwd: rootPath,
        ignore: ['**/node_modules/**', '**/dist/**'],
      });

      for (const file of files) {
        const parts = file.split('/');
        const filename = parts[parts.length - 1];

        // Check for spaces in filename
        if (filename.includes(' ')) {
          issues.push(`File with spaces: ${file}`);
        }

        // Check for non-kebab-case in certain directories
        if (parts.includes('src') || parts.includes('components')) {
          if (/[A-Z]/.test(filename)) {
            issues.push(`Non-kebab-case file: ${file}`);
          }
        }
      }

      break;

    case 'typescript-config':
      try {
        await fs.access(path.join(rootPath, 'tsconfig.json'));
      } catch {
        issues.push('Missing tsconfig.json');
      }

      // Check for strict mode
      try {
        const tsconfigContent = await fs.readFile(
          path.join(rootPath, 'tsconfig.json'),
          'utf-8'
        );
        if (!tsconfigContent.includes('"strict": true')) {
          issues.push('TypeScript strict mode not enabled');
        }
      } catch {
        // File not found, already reported
      }

      break;

    case 'directory-structure':
      // Check for expected directories
      const expectedDirs = ['src', 'tests'];
      for (const dir of expectedDirs) {
        try {
          await fs.access(path.join(rootPath, dir));
        } catch {
          issues.push(`Missing expected directory: ${dir}`);
        }
      }

      break;

    default:
      issues.push(`Unknown convention: ${convention}`);
  }

  return {
    convention,
    valid: issues.length === 0,
    issues,
  };
}
