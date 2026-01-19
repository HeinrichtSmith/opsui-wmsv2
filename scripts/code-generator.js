#!/usr/bin/env node

/**
 * WMS Code Generator
 *
 * Automatically generates boilerplate code for common patterns:
 * - React components with hooks and types
 * - API routes with validation
 * - Service layers with repositories
 * - Test files
 * - Database migrations
 *
 * Usage:
 *   node scripts/code-generator.js component --name UserProfile --type page
 *   node scripts/code-generator.js api --resource Product
 *   node scripts/code-generator.js service --name OrderService
 *   node scripts/code-generator.js test --file packages/backend/src/services/OrderService.ts
 */

const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

// ============================================================================
// TEMPLATES
// ============================================================================

const templates = {
  component: ({
    name,
    type,
    hooks = [],
    hasState = false,
  }) => `/**
 * ${name} Component
 *
 * ${type === 'page' ? 'Page component for ' : 'Component for '}${name}
 */

import React, { useState, useEffect } from 'react';
${type === 'page' ? "import { useParams, useNavigate } from 'react-router-dom';\n" : ''}${hooks.includes('query') ? "import { useQuery } from '@tanstack/react-query';\n" : ''}${hooks.includes('mutation') ? "import { useMutation } from '@tanstack/react-query';\n" : ''}

interface ${name}Props {
  // TODO: Define props
}

export function ${name}({ props }: ${name}Props) {
  ${type === 'page' ? 'const navigate = useNavigate();\n  ' : ''}${hasState ? '// State\n  const [state, setState] = useState(null);\n  ' : ''}// TODO: Add your logic here

  return (
    <div className="${name.toLowerCase()}">
      <h1>${name}</h1>
      {/* TODO: Add your component content */}
    </div>
  );
}

export default ${name};
`,

  apiRoute: ({
    resource,
    routes,
  }) => `/**
 * ${resource} API Routes
 *
 * RESTful endpoints for ${resource.toLowerCase()} management
 */

import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { authMiddleware } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import * as ${resource.toLowerCase()}Service from '../services/${resource}Service';

const router = Router();

// ============================================================================
// ROUTES
// ============================================================================

${routes.map(route => {
  if (route.method === 'GET' && route.path === '/') {
    return `/**
 * GET /api/${resource.toLowerCase()}
 * List all ${resource.toLowerCase()} items with pagination and filtering
 */
router.get('/',
  authMiddleware,
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('sort').optional().isIn(['created_at', 'name', 'status']),
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const { page = 1, limit = 20, sort = 'created_at' } = req.query;
      const result = await ${resource.toLowerCase()}Service.findAll({
        page: Number(page),
        limit: Number(limit),
        sort,
      });
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);`;
  }
  return '';
}).join('\n\n')}

/**
 * GET /api/${resource.toLowerCase()}/:id
 * Get a specific ${resource.toLowerCase()} by ID
 */
router.get('/:id',
  authMiddleware,
  [param('id').notEmpty()],
  validateRequest,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const result = await ${resource.toLowerCase()}Service.findById(id);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/${resource.toLowerCase()}
 * Create a new ${resource.toLowerCase()}
 */
router.post('/',
  authMiddleware,
  [
    // TODO: Add validation rules
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const result = await ${resource.toLowerCase()}Service.create(req.body);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /api/${resource.toLowerCase()}/:id
 * Update a ${resource.toLowerCase()}
 */
router.put('/:id',
  authMiddleware,
  [
    param('id').notEmpty(),
    // TODO: Add validation rules
  ],
  validateRequest,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const result = await ${resource.toLowerCase()}Service.update(id, req.body);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/${resource.toLowerCase()}/:id
 * Delete a ${resource.toLowerCase()}
 */
router.delete('/:id',
  authMiddleware,
  [param('id').notEmpty()],
  validateRequest,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      await ${resource.toLowerCase()}Service.delete(id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

export default router;
`,

  service: ({
    name,
    resource,
  }) => `/**
 * ${name} Service
 *
 * Business logic for ${resource.toLowerCase()} management
 */

import { query } from '../db/client';
import { ${resource}Repository } from '../repositories/${resource}Repository';
import { NotFoundError, ConflictError } from '@wms/shared';

// ============================================================================
// SERVICE
// ============================================================================

class ${name} {
  /**
   * Find all ${resource.toLowerCase()} items with pagination
   */
  async findAll(options: {
    page?: number;
    limit?: number;
    sort?: string;
    filters?: Record<string, any>;
  } = {}) {
    const { page = 1, limit = 20, sort = 'created_at', filters = {} } = options;

    // Build query
    const conditions = [];
    const params = [];
    let paramIndex = 1;

    // Add filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        conditions.push(\`\${key} = $\${paramIndex++}\`);
        params.push(value);
      }
    });

    const whereClause = conditions.length > 0
      ? \`WHERE \${conditions.join(' AND ')}\`
      : '';

    // Get total count
    const countResult = await query(
      \`SELECT COUNT(*) FROM \${this.tableName} \${whereClause}\`,
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);

    // Get paginated results
    const offset = (page - 1) * limit;
    const dataResult = await query(
      \`SELECT * FROM \${this.tableName}
       \${whereClause}
       ORDER BY \${sort} DESC
       LIMIT $\${paramIndex++} OFFSET $\${paramIndex++}\`,
      [...params, limit, offset]
    );

    return {
      data: dataResult.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Find a ${resource.toLowerCase()} by ID
   */
  async findById(id: string) {
    const result = await query(
      \`SELECT * FROM \${this.tableName} WHERE id = $1\`,
      [id]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('${resource}', id);
    }

    return result.rows[0];
  }

  /**
   * Create a new ${resource.toLowerCase()}
   */
  async create(data: any) {
    // TODO: Add business logic validation
    return ${resource.toLowerCase()}Repository.create(data);
  }

  /**
   * Update a ${resource.toLowerCase()}
   */
  async update(id: string, data: any) {
    // TODO: Add business logic validation
    return ${resource.toLowerCase()}Repository.update(id, data);
  }

  /**
   * Delete a ${resource.toLowerCase()}
   */
  async delete(id: string) {
    await this.findById(id); // Check exists
    return ${resource.toLowerCase()}Repository.delete(id);
  }
}

export default new ${name}();
`,

  test: ({
    name,
    type,
  }) => `/**
 * Tests for ${name}
 *
 * ${type} test suite
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
${type === 'component' ? "import { renderWithProviders, screen } from '@/test/utils';" : ''}

describe('${name}', () => {
  ${type === 'component' ? `  it('renders correctly', () => {
      renderWithProviders(<${name} />);
      expect(screen.getByText('${name}')).toBeInTheDocument();
    });

    it('handles user interaction', async () => {
      // TODO: Add interaction tests
    });` : `  it('should work correctly', async () => {
      // TODO: Add test cases
      expect(true).toBe(true);
    });}
});
`,
};

// ============================================================================
// GENERATORS
// ============================================================================

async function generateComponent(args) {
  const { name, type = 'component' } = args;
  const componentName = name.endsWith('Component') ? name : `${name}Component`;

  const componentPath = path.join(process.cwd(), 'packages', 'frontend', 'src', 'components', type === 'page' ? 'pages' : type === 'layout' ? 'layouts' : '');
  const filePath = path.join(componentPath, `${componentName}.tsx`);

  if (fs.existsSync(filePath)) {
    log(`⚠️  Component already exists: ${filePath}`, colors.yellow);
    return;
  }

  const content = templates.component({
    name: componentName,
    type,
    hooks: args.hooks ? args.hooks.split(',') : [],
    hasState: args.state,
  });

  fs.mkdirSync(componentPath, { recursive: true });
  fs.writeFileSync(filePath, content);

  log(`✅ Generated component: ${filePath}`, colors.green);
}

async function generateAPI(args) {
  const { resource } = args;
  const resourceName = resource.charAt(0).toUpperCase() + resource.slice(1);

  const routePath = path.join(process.cwd(), 'packages', 'backend', 'src', 'routes', `${resourceName}.ts`);
  const servicePath = path.join(process.cwd(), 'packages', 'backend', 'src', 'services', `${resourceName}Service.ts`);
  const repositoryPath = path.join(process.cwd(), 'packages', 'backend', 'src', 'repositories', `${resourceName}Repository.ts`);

  // Generate route
  const routeContent = templates.apiRoute({
    resource: resourceName,
    routes: [{ method: 'GET', path: '/' }],
  });
  fs.writeFileSync(routePath, routeContent);
  log(`✅ Generated route: ${routePath}`, colors.green);

  // Generate service
  const serviceContent = templates.service({
    name: `${resourceName}Service`,
    resource: resourceName,
  });
  fs.writeFileSync(servicePath, serviceContent);
  log(`✅ Generated service: ${servicePath}`, colors.green);

  // Generate repository placeholder
  const repositoryContent = templates.service({
    name: `${resourceName}Repository`,
    resource: resourceName,
  });
  fs.writeFileSync(repositoryPath, repositoryContent);
  log(`✅ Generated repository: ${repositoryPath}`, colors.green);
}

async function generateTest(args) {
  const { file } = args;
  const testPath = file.replace(/\.ts$/, '.test.ts').replace(/\.tsx$/, '.test.tsx');

  if (fs.existsSync(testPath)) {
    log(`⚠️  Test file already exists: ${testPath}`, colors.yellow);
    return;
  }

  const name = path.basename(file, path.extname(file));
  const type = file.includes('frontend') ? 'component' : 'service';

  const content = templates.test({
    name,
    type,
  });

  fs.writeFileSync(testPath, content);
  log(`✅ Generated test: ${testPath}`, colors.green);
}

// ============================================================================
// CLI
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  const [command, ...options] = args;

  log('\n╔════════════════════════════════════════════════════════════╗', colors.cyan);
  log('║              WMS CODE GENERATOR                             ║', colors.cyan);
  log('╚════════════════════════════════════════════════════════════╝\n', colors.cyan);

  const parsedOptions = {};
  for (let i = 0; i < options.length; i++) {
    if (options[i].startsWith('--')) {
      const key = options[i].slice(2);
      const value = options[i + 1]?.startsWith('--') ? true : options[++i];
      parsedOptions[key] = value;
    }
  }

  try {
    switch (command) {
      case 'component':
        await generateComponent(parsedOptions);
        break;
      case 'api':
        await generateAPI(parsedOptions);
        break;
      case 'test':
        await generateTest(parsedOptions);
        break;
      default:
        log('Usage:', colors.cyan);
        log('  node scripts/code-generator.js component --name UserProfile --type page', colors.reset);
        log('  node scripts/code-generator.js api --resource Product', colors.reset);
        log('  node scripts/code-generator.js test --file packages/backend/src/services/OrderService.ts', colors.reset);
    }
  } catch (error) {
    log(`\n❌ Error: ${error.message}`, colors.red);
    process.exit(1);
  }
}

main();
