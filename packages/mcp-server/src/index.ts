/**
 * WMS MCP Dev Accelerator Server
 *
 * A high-performance Model Context Protocol server that provides AI agents
 * with efficient, safe, and validated access to WMS operations.
 *
 * Features:
 * - Connection pooling for PostgreSQL and Redis
 * - Response caching with TTL
 * - Parallel query execution
 * - Idempotent operations
 * - Comprehensive error handling
 * - Full audit logging
 * - Input validation with Joi
 * - Transaction management
 *
 * @version 1.0.0
 */

import { MCPServer } from './server/MCPServer.js';
import { registerOrderTools } from './tools/orders/index.js';
import { registerInventoryTools } from './tools/inventory/index.js';
import { registerPickerTools } from './tools/picking/index.js';
import { registerPackerTools } from './tools/packing/index.js';
import { registerAdminTools } from './tools/admin/index.js';
import { registerQueryTools } from './tools/queries/index.js';
import { logger } from './utils/logger.js';

/**
 * Main entry point for the WMS MCP Server
 */
async function main() {
  try {
    logger.info('Starting WMS MCP Dev Accelerator...', {
      version: '1.0.0',
      nodeVersion: process.version,
      platform: process.platform
    });

    const server = new MCPServer({
      name: 'wms-dev-accelerator',
      version: '1.0.0',
      maxConnections: 20,
      connectionTimeout: 30000,
      requestTimeout: 60000,
      enableCache: true,
      cacheTTL: 5000,
      enableMetrics: true
    });

    // Register all tool categories
    await registerOrderTools(server);
    await registerInventoryTools(server);
    await registerPickerTools(server);
    await registerPackerTools(server);
    await registerAdminTools(server);
    await registerQueryTools(server);

    // Start the server
    await server.start();

    logger.info('WMS MCP Dev Accelerator started successfully', {
      toolsRegistered: server.toolCount,
      uptime: process.uptime()
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      logger.info('Received SIGTERM, shutting down gracefully...');
      await server.stop();
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      logger.info('Received SIGINT, shutting down gracefully...');
      await server.stop();
      process.exit(0);
    });

  } catch (error) {
    logger.error('Failed to start WMS MCP Server', { error });
    process.exit(1);
  }
}

// Start the server
main();
