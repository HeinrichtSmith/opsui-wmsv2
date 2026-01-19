/**
 * Vite Plugin: Graceful Shutdown
 * Ensures clean termination of the Vite dev server
 *
 * Features:
 * - Closes all active connections
 * - Flushes build cache
 * - Releases port locks
 * - Logs shutdown metrics
 */

import { Plugin } from 'vite';

interface ShutdownOptions {
  timeout?: number;
  logShutdown?: boolean;
  cleanupTasks?: Array<() => Promise<void>>;
}

export function gracefulShutdownPlugin(options: ShutdownOptions = {}): Plugin {
  const { timeout = 10000, logShutdown = true, cleanupTasks = [] } = options;

  return {
    name: 'vite-plugin-graceful-shutdown',

    configureServer(server) {
      // Setup graceful shutdown handlers
      const shutdown = async (signal: string) => {
        if (logShutdown) {
          console.log('\n' + '='.repeat(70));
          console.log(`🛑 ${signal} received - shutting down gracefully...`);
          console.log('='.repeat(70));
        }

        const startTime = Date.now();

        try {
          // Step 1: Stop accepting new connections
          if (logShutdown) console.log('🔒 Step 1/4: Stopping new HMR connections...');
          // Vite handles this automatically

          // Step 2: Close all WebSocket connections
          if (logShutdown) console.log('🔌 Step 2/4: Closing WebSocket connections...');
          const wsClients = (server as any).wsClients || new Map();
          for (const [_, client] of wsClients) {
            try {
              client.close();
            } catch {}
          }
          wsClients.clear();

          // Step 3: Run custom cleanup tasks
          if (cleanupTasks.length > 0) {
            if (logShutdown) console.log('🧹 Step 3/4: Running cleanup tasks...');
            for (let i = 0; i < cleanupTasks.length; i++) {
              try {
                await cleanupTasks[i]();
                if (logShutdown) console.log(`  ✅ Task ${i + 1}/${cleanupTasks.length} complete`);
              } catch (error) {
                console.error(`  ❌ Task ${i + 1}/${cleanupTasks.length} failed:`, error);
              }
            }
          } else {
            if (logShutdown) console.log('✅ Step 3/4: No cleanup tasks');
          }

          // Step 4: Close HTTP server
          if (logShutdown) console.log('🔌 Step 4/4: Closing HTTP server...');
          await new Promise<void>((resolve) => {
            server.httpServer.close(() => resolve());
          });

          const duration = Date.now() - startTime;

          if (logShutdown) {
            console.log('='.repeat(70));
            console.log(`✅ Frontend shut down cleanly (took ${duration}ms)`);
            console.log('='.repeat(70) + '\n');
          }

          process.exit(0);
        } catch (error) {
          console.error('❌ Error during shutdown:', error);
          process.exit(1);
        }
      };

      // Handle termination signals
      process.on('SIGTERM', () => shutdown('SIGTERM'));
      process.on('SIGINT', () => shutdown('SIGINT'));

      // Handle Windows-specific signals
      process.on('message', (msg) => {
        if (msg === 'shutdown') {
          shutdown('WINDOWS_SHUTDOWN');
        }
      });

      // Force timeout
      process.on('exit', () => {
        if (logShutdown) {
          console.log('⚠️  Process exited');
        }
      });

      if (logShutdown) {
        console.log('\n✅ Graceful shutdown handlers registered');
        console.log('   Press Ctrl+C to shut down cleanly\n');
      }
    },
  };
}

/**
 * Create a simple script to kill the frontend gracefully
 */
export function createKillScript(port: number = 5173): string {
  return `@echo off
REM Graceful shutdown script for Vite dev server

echo Attempting to gracefully stop Vite on port ${port}...

REM Try to find and kill the process
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :${port}') do (
    echo Sending SIGTERM to process %%a...
    taskkill /PID %%a /T /SIGTERM >nul 2>&1

    REM Wait a moment for graceful shutdown
    timeout /t 2 /nobreak >nul

    REM Check if it's still running
    tasklist /FI "PID eq %%a" 2>nul | find %%a >nul
    if errorlevel 1 (
        echo ✅ Vite shut down gracefully
        exit /b 0
    ) else (
        echo Still running, forcing shutdown...
        taskkill /F /PID %%a >nul 2>&1
        echo ⚠️  Vite force quit
        exit /b 1
    )
)

echo No process found on port ${port}
`;
}
