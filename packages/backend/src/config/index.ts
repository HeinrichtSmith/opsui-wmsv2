/**
 * Configuration module
 *
 * Centralizes all configuration values from environment variables
 */

export default {
  // Server
  port: parseInt(process.env.PORT || '3001', 10),
  host: process.env.HOST || '0.0.0.0',
  nodeEnv: process.env.NODE_ENV || 'development',

  // Database
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    name: process.env.DB_NAME || 'wms_db',
    user: process.env.DB_USER || 'wms_user',
    password: process.env.DB_PASSWORD || 'wms_password',
    ssl: process.env.DB_SSL === 'true',
    poolMin: parseInt(process.env.DB_POOL_MIN || '2', 10),
    poolMax: parseInt(process.env.DB_POOL_MAX || '10', 10),
  },

  // Redis
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || '0', 10),
    ttl: parseInt(process.env.REDIS_TTL || '3600', 10),
    enabled: process.env.ENABLE_REDIS_CACHE !== 'false',
  },

  // JWT
  jwt: {
    get secret(): string {
      const secret = process.env.JWT_SECRET;
      if (!secret) {
        if (process.env.NODE_ENV === 'production') {
          throw new Error('JWT_SECRET environment variable must be set in production');
        }
        // Only allow fallback in development
        console.warn('⚠️  Using insecure default JWT secret. Set JWT_SECRET environment variable!');
        return 'dev-secret-change-in-production';
      }
      // Validate minimum secret length
      if (secret.length < 32) {
        throw new Error('JWT_SECRET must be at least 32 characters long');
      }
      return secret;
    },
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  // Bcrypt
  bcrypt: {
    rounds: parseInt(process.env.BCRYPT_ROUNDS || '10', 10),
  },

  // Rate limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  },

  // CORS
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  },

  // Application
  app: {
    defaultPickerCapacity: parseInt(process.env.DEFAULT_PICKER_CAPACITY || '5', 10),
    maxOrdersPerPicker: parseInt(process.env.MAX_ORDERS_PER_PICKER || '10', 10),
    pickTimeoutMinutes: parseInt(process.env.PICK_TIMEOUT_MINUTES || '30', 10),
  },

  // WebSocket
  websocket: {
    enabled: process.env.ENABLE_WEBSOCKET === 'true',
    port: parseInt(process.env.WS_PORT || '3002', 10),
  },

  // Health check
  health: {
    checkInterval: parseInt(process.env.HEALTH_CHECK_INTERVAL || '30000', 10),
  },

  // Feature flags
  features: {
    websocket: process.env.ENABLE_WEBSOCKET === 'true',
    redisCache: process.env.ENABLE_REDIS_CACHE !== 'false',
    auditLog: process.env.ENABLE_AUDIT_LOG !== 'false',
  },

  // Check if all required env vars are set
  isProduction(): boolean {
    return this.nodeEnv === 'production';
  },

  isDevelopment(): boolean {
    return this.nodeEnv === 'development';
  },

  isTest(): boolean {
    return this.nodeEnv === 'test';
  },
};
