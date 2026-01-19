#!/usr/bin/env node
/**
 * Performance Monitoring Dashboard
 *
 * Real-time monitoring of:
 * - API response times
 * - Error rates
 * - Memory usage
 * - Active connections
 * - Database query performance
 *
 * Usage:
 *   node scripts/perf-monitor.js
 */

const http = require('http');

const BACKEND_URL = 'http://localhost:3001';
const FRONTEND_URL = 'http://localhost:5173';

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  gray: '\x1b[90m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// ============================================================================
// METRICS COLLECTION
// ============================================================================

class MetricsCollector {
  constructor() {
    this.metrics = {
      api: {
        responseTimes: [],
        errorCount: 0,
        successCount: 0,
        lastCheck: null,
      },
      frontend: {
        responseTimes: [],
        errorCount: 0,
        successCount: 0,
        lastCheck: null,
      },
      system: {
        memoryUsage: [],
        activeConnections: [],
      },
    };
    this.startTime = Date.now();
  }

  async checkBackendHealth() {
    return new Promise(resolve => {
      const start = Date.now();
      const options = {
        method: 'GET',
        timeout: 5000,
        hostname: 'localhost',
        port: 3001,
        path: '/health',
      };

      const req = http.request(options, res => {
        const duration = Date.now() - start;
        this.metrics.api.responseTimes.push(duration);
        if (this.metrics.api.responseTimes.length > 100) {
          this.metrics.api.responseTimes.shift();
        }

        if (res.statusCode === 200) {
          this.metrics.api.successCount++;
        } else {
          this.metrics.api.errorCount++;
        }

        this.metrics.api.lastCheck = new Date();
        resolve({ status: res.statusCode, duration });
      });

      req.on('error', () => {
        this.metrics.api.errorCount++;
        this.metrics.api.lastCheck = new Date();
        resolve({ status: 'DOWN', duration: Date.now() - start });
      });

      req.on('timeout', () => {
        req.destroy();
        this.metrics.api.errorCount++;
        this.metrics.api.lastCheck = new Date();
        resolve({ status: 'TIMEOUT', duration: 5000 });
      });

      req.end();
    });
  }

  async checkFrontendHealth() {
    return new Promise(resolve => {
      const start = Date.now();
      const options = {
        method: 'GET',
        timeout: 5000,
        hostname: 'localhost',
        port: 5173,
        path: '/',
      };

      const req = http.request(options, res => {
        const duration = Date.now() - start;
        this.metrics.frontend.responseTimes.push(duration);
        if (this.metrics.frontend.responseTimes.length > 100) {
          this.metrics.frontend.responseTimes.shift();
        }

        if (res.statusCode === 200) {
          this.metrics.frontend.successCount++;
        } else {
          this.metrics.frontend.errorCount++;
        }

        this.metrics.frontend.lastCheck = new Date();
        resolve({ status: res.statusCode, duration });
      });

      req.on('error', () => {
        this.metrics.frontend.errorCount++;
        this.metrics.frontend.lastCheck = new Date();
        resolve({ status: 'DOWN', duration: Date.now() - start });
      });

      req.on('timeout', () => {
        req.destroy();
        this.metrics.frontend.errorCount++;
        this.metrics.frontend.lastCheck = new Date();
        resolve({ status: 'TIMEOUT', duration: 5000 });
      });

      req.end();
    });
  }

  async checkBackendStats() {
    return new Promise(resolve => {
      const options = {
        method: 'GET',
        timeout: 5000,
        hostname: 'localhost',
        port: 3001,
        path: '/health',
      };

      const req = http.request(options, res => {
        let data = '';
        res.on('data', chunk => {
          data += chunk;
        });
        res.on('end', () => {
          try {
            const body = JSON.parse(data);
            this.metrics.system.activeConnections.push(body.activeConnections || 0);
            if (this.metrics.system.activeConnections.length > 100) {
              this.metrics.system.activeConnections.shift();
            }
            resolve(body);
          } catch {
            resolve({});
          }
        });
      });

      req.on('error', () => resolve({}));
      req.on('timeout', () => {
        req.destroy();
        resolve({});
      });
      req.end();
    });
  }

  getAverage(arr) {
    if (arr.length === 0) return 0;
    return Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
  }

  getMedian(arr) {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
  }

  getP95(arr) {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const idx = Math.floor(sorted.length * 0.95);
    return sorted[idx] || 0;
  }

  getUptime() {
    const elapsed = Date.now() - this.startTime;
    const seconds = Math.floor(elapsed / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  getErrorRate(type) {
    const total = this.metrics[type].successCount + this.metrics[type].errorCount;
    if (total === 0) return 0;
    return ((this.metrics[type].errorCount / total) * 100).toFixed(1);
  }
}

// ============================================================================
// DASHBOARD RENDERING
// ============================================================================

class Dashboard {
  constructor(collector) {
    this.collector = collector;
    this.running = false;
  }

  clearScreen() {
    console.clear();
  }

  renderHeader() {
    log('='.repeat(80), 'cyan');
    log('📊 PERFORMANCE MONITORING DASHBOARD', 'cyan');
    log('='.repeat(80), 'cyan');
    log(`Uptime: ${this.collector.getUptime()}  |  Refresh: 2s  |  Press Ctrl+C to exit`, 'gray');
    log('='.repeat(80), 'cyan');
    log('');
  }

  renderSection(title, color) {
    log(`\n${title}`, color);
    log('─'.repeat(title.length), color);
  }

  renderMetrics() {
    const apiMetrics = this.collector.metrics.api;
    const frontendMetrics = this.collector.metrics.frontend;
    const systemMetrics = this.collector.metrics.system;

    // Backend Status
    this.renderSection('🔧 BACKEND API', 'blue');
    log(
      `Status:      ${apiMetrics.lastCheck ? (apiMetrics.responseTimes[apiMetrics.responseTimes.length - 1] < 1000 ? '✅ UP' : '⚠️ SLOW') : '❓ UNKNOWN'}`,
      apiMetrics.responseTimes[apiMetrics.responseTimes.length - 1] < 1000 ? 'green' : 'yellow'
    );
    log(`Avg:        ${this.collector.getAverage(apiMetrics.responseTimes)}ms`, 'reset');
    log(`Median:     ${this.collector.getMedian(apiMetrics.responseTimes)}ms`, 'reset');
    log(`P95:        ${this.collector.getP95(apiMetrics.responseTimes)}ms`, 'reset');
    log(
      `Error Rate:  ${this.collector.getErrorRate('api')}%`,
      parseFloat(this.collector.getErrorRate('api')) > 5 ? 'red' : 'green'
    );
    log(`Requests:   ${apiMetrics.successCount} success, ${apiMetrics.errorCount} errors`, 'reset');

    // Frontend Status
    this.renderSection('\n⚛️  FRONTEND', 'cyan');
    log(
      `Status:      ${frontendMetrics.lastCheck ? (frontendMetrics.responseTimes[frontendMetrics.responseTimes.length - 1] < 1000 ? '✅ UP' : '⚠️ SLOW') : '❓ UNKNOWN'}`,
      frontendMetrics.responseTimes[frontendMetrics.responseTimes.length - 1] < 1000
        ? 'green'
        : 'yellow'
    );
    log(`Avg:        ${this.collector.getAverage(frontendMetrics.responseTimes)}ms`, 'reset');
    log(`Median:     ${this.collector.getMedian(frontendMetrics.responseTimes)}ms`, 'reset');
    log(`P95:        ${this.collector.getP95(frontendMetrics.responseTimes)}ms`, 'reset');
    log(
      `Error Rate:  ${this.collector.getErrorRate('frontend')}%`,
      parseFloat(this.collector.getErrorRate('frontend')) > 5 ? 'red' : 'green'
    );
    log(
      `Requests:   ${frontendMetrics.successCount} success, ${frontendMetrics.errorCount} errors`,
      'reset'
    );

    // System Status
    this.renderSection('\n💻 SYSTEM', 'magenta');
    log(
      `Memory:     ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1)} MB / ${(process.memoryUsage().heapTotal / 1024 / 1024).toFixed(1)} MB`,
      'reset'
    );
    log(
      `Active:     ${systemMetrics.activeConnections[systemMetrics.activeConnections.length - 1] || 0} connections`,
      'reset'
    );

    // Health Indicators
    this.renderSection('\n❤️  HEALTH', 'green');

    const apiHealthy =
      apiMetrics.lastCheck && apiMetrics.responseTimes[apiMetrics.responseTimes.length - 1] < 1000;
    const frontendHealthy =
      frontendMetrics.lastCheck &&
      frontendMetrics.responseTimes[frontendMetrics.responseTimes.length - 1] < 1000;
    const errorRateHealthy = parseFloat(this.collector.getErrorRate('api')) < 5;

    log(
      `API Response:    ${apiHealthy ? '✅ Good' : '⚠️ Degraded'}`,
      apiHealthy ? 'green' : 'yellow'
    );
    log(
      `Error Rate:      ${errorRateHealthy ? '✅ Normal' : '⚠️ Elevated'}`,
      errorRateHealthy ? 'green' : 'yellow'
    );
    log(
      `Frontend:        ${frontendHealthy ? '✅ Good' : '⚠️ Degraded'}`,
      frontendHealthy ? 'green' : 'yellow'
    );

    // Performance Tips
    if (this.collector.getAverage(apiMetrics.responseTimes) > 500) {
      log('\n⚠️  API response times are elevated. Check for slow queries or N+1 issues.', 'yellow');
    }
    if (parseFloat(this.collector.getErrorRate('api')) > 5) {
      log('\n⚠️  High error rate detected. Check logs for errors.', 'red');
    }

    log('\n' + '='.repeat(80), 'cyan');
  }

  async start() {
    this.running = true;
    log('Starting Performance Monitor...', 'blue');
    log('Waiting for first data collection...\n', 'gray');

    await new Promise(r => setTimeout(r, 2000));

    while (this.running) {
      this.clearScreen();
      this.renderHeader();

      // Collect metrics
      await Promise.all([
        this.collector.checkBackendHealth(),
        this.collector.checkFrontendHealth(),
        this.collector.checkBackendStats(),
      ]);

      this.renderMetrics();

      // Wait 2 seconds before next refresh
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  stop() {
    this.running = false;
    log('\n🛑 Performance Monitor stopped', 'yellow');
  }
}

// ============================================================================
// MAIN
// ============================================================================

const collector = new MetricsCollector();
const dashboard = new Dashboard(collector);

// Handle exit
process.on('SIGINT', () => {
  dashboard.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  dashboard.stop();
  process.exit(0);
});

// Start dashboard
dashboard.start().catch(err => {
  console.error('Failed to start performance monitor:', err);
  process.exit(1);
});
