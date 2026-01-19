/**
 * Port Locking Utility
 * Prevents duplicate server instances by acquiring exclusive port locks
 *
 * This ensures only ONE instance of each service can run on its designated port,
 * preventing conflicts, data races, and duplicate processes.
 */

import { promises as fs } from 'fs';
import path from 'path';
import { logger } from '../config/logger';

interface PortLockFile {
  port: number;
  pid: number;
  host: string;
  acquiredAt: string;
  serviceName: string;
}

interface PortLockResult {
  acquired: boolean;
  port: number;
  reason?: string;
}

const LOCK_DIR = path.join(process.cwd(), '.port-locks');

/**
 * Ensure lock directory exists
 */
async function ensureLockDir(): Promise<void> {
  try {
    await fs.mkdir(LOCK_DIR, { recursive: true });
  } catch (error) {
    // Directory might already exist, ignore
  }
}

/**
 * Get lock file path for a port
 */
function getLockFilePath(port: number): string {
  return path.join(LOCK_DIR, `port-${port}.lock`);
}

/**
 * Check if a port is already locked
 */
async function isPortLocked(port: number): Promise<boolean> {
  const lockFile = getLockFilePath(port);
  try {
    const content = await fs.readFile(lockFile, 'utf-8');
    const lock: PortLockFile = JSON.parse(content);

    // Check if the process is still running
    try {
      process.kill(lock.pid, 0); // Signal 0 checks if process exists
      return true; // Process still running, port is locked
    } catch {
      // Process is dead, clean up the stale lock
      await fs.unlink(lockFile);
      return false;
    }
  } catch {
    return false; // No lock file
  }
}

/**
 * Acquire a lock on a port
 */
export async function acquirePortLock(
  port: number,
  serviceName: string,
  host: string = '0.0.0.0'
): Promise<PortLockResult> {
  // Check if port locking is enabled
  if (process.env.ENABLE_PORT_LOCK !== 'true') {
    logger.info('Port locking disabled - allowing multiple instances');
    return { acquired: true, port };
  }

  await ensureLockDir();

  // Check if port is already locked
  if (await isPortLocked(port)) {
    const lockFile = getLockFilePath(port);
    const content = await fs.readFile(lockFile, 'utf-8');
    const lock: PortLockFile = JSON.parse(content);

    logger.error('Port already locked by another instance', {
      port,
      existingPid: lock.pid,
      existingService: lock.serviceName,
      currentPid: process.pid,
      currentService: serviceName,
    });

    return {
      acquired: false,
      port,
      reason: `Port ${port} is already in use by ${lock.serviceName} (PID ${lock.pid})`,
    };
  }

  // Acquire the lock
  const lock: PortLockFile = {
    port,
    pid: process.pid,
    host,
    acquiredAt: new Date().toISOString(),
    serviceName,
  };

  const lockFile = getLockFilePath(port);
  try {
    await fs.writeFile(lockFile, JSON.stringify(lock, null, 2));
    logger.info('Port lock acquired', { port, pid: process.pid, serviceName });
    return { acquired: true, port };
  } catch (error) {
    logger.error('Failed to write port lock file', { error });
    return {
      acquired: false,
      port,
      reason: 'Failed to acquire port lock',
    };
  }
}

/**
 * Release a port lock
 */
export async function releasePortLock(port: number): Promise<void> {
  const lockFile = getLockFilePath(port);
  try {
    await fs.unlink(lockFile);
    logger.info('Port lock released', { port });
  } catch (error) {
    // Lock file might not exist, ignore
  }
}

/**
 * Release all port locks for this process
 */
export async function releaseAllPortLocks(): Promise<void> {
  try {
    const files = await fs.readdir(LOCK_DIR);
    for (const file of files) {
      if (!file.endsWith('.lock')) continue;

      const lockFile = path.join(LOCK_DIR, file);
      try {
        const content = await fs.readFile(lockFile, 'utf-8');
        const lock: PortLockFile = JSON.parse(content);

        // Only release locks owned by this process
        if (lock.pid === process.pid) {
          await fs.unlink(lockFile);
        }
      } catch {
        // Skip invalid lock files
      }
    }
  } catch {
    // Lock directory might not exist
  }
}

/**
 * Setup port lock cleanup on process exit
 */
export function setupPortLockCleanup(port: number): void {
  const cleanup = async () => {
    await releasePortLock(port);
    await releaseAllPortLocks();
  };

  // Clean up on normal exit
  process.on('exit', cleanup);

  // Clean up on signals
  process.on('SIGINT', async () => {
    await cleanup();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    await cleanup();
    process.exit(0);
  });

  // Clean up on uncaught exceptions
  process.on('uncaughtException', async error => {
    if (error.message.includes('EADDRINUSE')) {
      logger.error('Port already in use - exiting');
      await cleanup();
    }
    process.exit(1);
  });
}

/**
 * Check if a port is available before attempting to use it
 */
export async function checkPortAvailable(port: number): Promise<boolean> {
  if (await isPortLocked(port)) {
    return false;
  }

  // Try to create a server to test the port
  return new Promise(resolve => {
    const net = require('net');
    const tester = net
      .createServer()
      .once('error', () => {
        resolve(false);
      })
      .once('listening', () => {
        tester.once('close', () => resolve(true));
        tester.close();
      })
      .listen(port, '0.0.0.0');
  });
}

/**
 * Get list of all locked ports
 */
export async function getLockedPorts(): Promise<PortLockFile[]> {
  try {
    const files = await fs.readdir(LOCK_DIR);
    const locks: PortLockFile[] = [];

    for (const file of files) {
      if (!file.endsWith('.lock')) continue;

      const lockFile = path.join(LOCK_DIR, file);
      try {
        const content = await fs.readFile(lockFile, 'utf-8');
        const lock: PortLockFile = JSON.parse(content);

        // Verify the process is still alive
        try {
          process.kill(lock.pid, 0);
          locks.push(lock);
        } catch {
          // Clean up stale lock
          await fs.unlink(lockFile);
        }
      } catch {
        // Invalid lock file, clean up
        await fs.unlink(lockFile);
      }
    }

    return locks;
  } catch {
    return [];
  }
}

/**
 * Kill process holding a port lock (DANGEROUS - use with caution)
 */
export async function forceReleasePortLock(port: number): Promise<boolean> {
  const lockFile = getLockFilePath(port);
  try {
    const content = await fs.readFile(lockFile, 'utf-8');
    const lock: PortLockFile = JSON.parse(content);

    logger.warn('Force releasing port lock', {
      port,
      pid: lock.pid,
      serviceName: lock.serviceName,
    });

    // Kill the process holding the lock
    try {
      process.kill(lock.pid, 'SIGTERM');
      // Give it time to exit gracefully
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch {
      // Process might already be dead
    }

    // Remove the lock file
    await fs.unlink(lockFile);
    return true;
  } catch {
    return false;
  }
}

/**
 * Port registry - all service ports in one place
 * This is the SINGLE SOURCE OF TRUTH for port assignments
 */
export const SERVICE_PORTS = {
  // Application Servers
  BACKEND_API: 3001,
  FRONTEND_DEV: 5173,
  WEBSOCKET: 3002,

  // ML Services
  ML_API: 8001,
  MLFLOW: 5000,

  // Databases
  POSTGRESQL: 5432,
  REDIS: 6379,

  // Monitoring
  PROMETHEUS: 9090,
  GRAFANA: 3000,
  JAEGER: 16686,

  // Development Tools
  STORYBOOK: 6006,
  CYPRESS: 8080,
} as const;

export type ServicePort = keyof typeof SERVICE_PORTS;
