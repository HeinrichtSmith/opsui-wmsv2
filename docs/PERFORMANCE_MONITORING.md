# Performance Monitoring Integration Guide

**Purpose**: Integrate performance monitoring into GLM 4.7 workflow for optimization-aware development.

**Version**: 1.0.0
**Last Updated**: 2025-01-19

---

## Current Performance Baseline

### Backend Performance
```yaml
API Response Times:
  - Average: ~100ms
  - P50: ~80ms
  - P95: ~500ms
  - P99: ~1200ms

Database Query Times:
  - Average: ~50ms
  - P95: ~200ms
  - Slow queries (>500ms): Order listing, dashboard metrics

Transaction Overhead:
  - Simple transaction: ~40ms
  - Complex transaction (multiple tables): ~100ms

Authentication:
  - Login (bcrypt): ~250ms (intentionally slow)
  - Token validation: ~10ms
  - Token generation: ~5ms
```

### Frontend Performance
```yaml
Load Times:
  - Initial page load: ~2s
  - Subsequent navigations: ~500ms
  - API response to UI: ~100ms

Bundle Sizes:
  - Main bundle: ~500KB (gzipped)
  - Vendor chunk: ~300KB (gzipped)
  - Total: ~800KB (gzipped)
```

### Test Performance
```yaml
Test Suite Runtime:
  - Unit tests: ~15 seconds
  - Integration tests: ~10 seconds
  - E2E tests: ~5 seconds (minimal coverage)
  - Total: ~30 seconds

Build Times:
  - Backend build: ~20 seconds
  - Frontend build: ~30 seconds
  - Full build: ~50 seconds
```

---

## Performance Monitoring Commands

### Check Current Performance

```bash
# Run performance monitoring script
npm run perf

# Expected output:
# ├─ API Response Time: 95ms (avg)
# ├─ Database Query Time: 45ms (avg)
# ├─ Slow Queries: 3 found (>500ms)
# └─ Recommendations: Add indexes for order filtering
```

### Profile Database Queries

```bash
# Enable query logging (development only)
export DB_QUERY_LOGGING=true
npm run dev:backend

# Check logs for slow queries
# Look for: "SLOW QUERY" warnings
```

### Profile API Endpoints

```bash
# Run load test (requires apache bench)
ab -n 1000 -c 10 http://localhost:3001/api/orders

# Expected results:
# - Requests per second: >100
# - 95% of requests: <500ms
# - Failed requests: 0
```

---

## Performance Guidelines for GLM 4.7

### Before Optimizing

**CRITICAL**: Never optimize without measuring first.

```
1. Measure baseline performance
2. Identify actual bottleneck
3. Set optimization target
4. Implement optimization
5. Measure again
6. Verify improvement
```

### When to Optimize

**Optimize when**:
- User reports slowness
- Metrics show degradation (>20% slower than baseline)
- P95 response time > 500ms
- Database queries > 200ms
- Frontend load time > 3s

**Don't optimize when**:
- Code looks "messy" but performs fine
- Micro-optimizations that save <10ms
- Premature optimization without measurements
- At expense of readability (unless critical path)

---

## Common Performance Patterns

### Pattern 1: N+1 Query Problem

**Symptom**: Slow page loads, many database queries

**Detection**:
```typescript
// ❌ N+1 queries (100+ queries for 100 orders)
const orders = await db('orders').select('*');
for (const order of orders) {
  order.items = await db('order_items').where({ order_id: order.id });
}
```

**Solution**:
```typescript
// ✅ Single query with join
const orders = await db('orders')
  .join('order_items', 'orders.id', 'order_items.order_id')
  .select('orders.*', db.raw('json_agg(order_items.*) as items'))
  .groupBy('orders.id');
```

**Improvement**: 100 queries → 1 query (~2x faster)

---

### Pattern 2: Missing Database Indexes

**Symptom**: Slow queries on large tables

**Detection**:
```bash
# Check query execution plan
EXPLAIN ANALYZE SELECT * FROM orders WHERE status = 'PENDING';

# Look for "Seq Scan" (bad) vs "Index Scan" (good)
```

**Solution**:
```sql
-- Add index for filtered columns
CREATE INDEX idx_orders_status ON orders(status);

-- Add composite index for multiple filters
CREATE INDEX idx_orders_status_priority ON orders(status, priority);
```

**Improvement**: 500ms → 50ms (10x faster)

---

### Pattern 3: Unnecessary Serial Operations

**Symptom**: Slow operations that could be parallel

**Detection**:
```typescript
// ❌ Serial operations (slow)
const user = await fetchUser(id);
const orders = await fetchOrders(id);
const recommendations = await fetchRecommendations(id);
```

**Solution**:
```typescript
// ✅ Parallel operations
const [user, orders, recommendations] = await Promise.all([
  fetchUser(id),
  fetchOrders(id),
  fetchRecommendations(id)
]);
```

**Improvement**: 300ms → 100ms (3x faster)

---

### Pattern 4: Large Response Payloads

**Symptom**: Slow API responses, large network transfers

**Detection**:
```bash
# Check response size
curl -s http://localhost:3001/api/orders | wc -c

# If >100KB, consider pagination
```

**Solution**:
```typescript
// ✅ Paginated responses
async getOrders(page: number, limit: number) {
  const offset = (page - 1) * limit;

  const [orders, total] = await Promise.all([
    db('orders').limit(limit).offset(offset),
    db('orders').count('* as count').first()
  ]);

  return {
    data: orders,
    pagination: {
      page,
      limit,
      total: total.count,
      totalPages: Math.ceil(total.count / limit)
    }
  };
}
```

**Improvement**: 500KB → 10KB per request

---

### Pattern 5: Inefficient Caching Strategy

**Symptom**: Repeated expensive operations

**Detection**:
```typescript
// ❌ No caching - recalculates every time
async function getDashboardMetrics() {
  // Expensive aggregation queries
  const orderCount = await db('orders').count();
  const pickRate = await calculatePickRate();
  const inventoryValue = await calculateInventoryValue();
  return { orderCount, pickRate, inventoryValue };
}
```

**Solution**:
```typescript
// ✅ Cached with TTL
const cache = new Map<string, { data: any; expiry: number }>();

async function getDashboardMetrics() {
  const cached = cache.get('dashboard');
  if (cached && cached.expiry > Date.now()) {
    return cached.data;
  }

  const metrics = await calculateMetrics();
  cache.set('dashboard', {
    data: metrics,
    expiry: Date.now() + 60000 // 1 minute TTL
  });

  return metrics;
}
```

**Improvement**: 500ms → 5ms (cached)

---

## Performance Checklist for GLM 4.7

### Before Implementing a Feature

**Database Operations**:
- [ ] Will this query use existing indexes?
- [ ] Is there risk of N+1 queries?
- [ ] Can operations be parallelized with Promise.all?
- [ ] Should this be cached? If yes, for how long?

**API Operations**:
- [ ] Is the response paginated?
- [ ] Are we only returning required fields?
- [ ] Is there input validation to prevent unnecessary work?
- [ ] Are we using compression for large responses?

**Frontend Operations**:
- [ ] Are we using React Query's caching?
- [ ] Are we loading data in parallel?
- [ ] Are we memoizing expensive calculations?
- [ ] Are we lazy-loading components/routes?

---

## Performance Monitoring in Development

### Enable Monitoring

```typescript
// packages/backend/src/middleware/performance.ts
import { Request, Response, NextFunction } from 'express';

export function performanceMiddleware(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;

    if (duration > 500) {
      console.warn(`⚠️  SLOW REQUEST: ${req.method} ${req.path} took ${duration}ms`);
    }

    // Log to metrics system
    metrics.recordApiResponseTime(req.path, duration);
  });

  next();
}
```

### Database Query Logging

```typescript
// packages/backend/src/db/client.ts
const knex = require('knex')({
  // ... configuration
  debug: process.env.DB_QUERY_LOGGING === 'true',
  log: {
    warn(message) {
      if (message.includes('SLOW QUERY')) {
        console.warn(message);
      }
    }
  }
});
```

---

## Performance Goals

### Current Baseline → Target

```yaml
API Response Times:
  Current P95: 500ms
  Target P95: <200ms
  Action: Add caching, optimize queries

Database Queries:
  Current P95: 200ms
  Target P95: <100ms
  Action: Add indexes, optimize joins

Frontend Load:
  Current: 2s
  Target: <1s
  Action: Code splitting, lazy loading

Test Suite:
  Current: 30s
  Target: <60s
  Action: Parallel test execution
```

---

## Performance Troubleshooting

### Slow API Endpoint

1. **Check database queries** - Enable query logging
2. **Check for N+1 queries** - Look for queries in loops
3. **Check indexes** - Run EXPLAIN ANALYZE
4. **Check response size** - Could be over-fetching data
5. **Check caching** - Should this be cached?

### Slow Frontend

1. **Check bundle size** - Run npm run build:analyze
2. **Check for re-renders** - Use React DevTools Profiler
3. **Check for large components** - Split into smaller pieces
4. **Check for missing memoization** - Use useMemo/useCallback
5. **Check for missing lazy loading** - Use React.lazy()

### Slow Tests

1. **Check for database operations** - Use test database with indexes
2. **Check for unnecessary setup** - Only setup what's needed
3. **Check for serial operations** - Parallelize where possible
4. **Check for redundant tests** - Remove duplicate coverage

---

## Performance Budgets

### Set Limits

```yaml
API Endpoints:
  Max response time: 500ms (P95)
  Max response size: 100KB
  Max database queries: 5 per request

Frontend:
  Max bundle size: 1MB (gzipped)
  Max initial load: 3s
  Max interaction time: 100ms

Database:
  Max query time: 100ms (P95)
  Max transaction time: 200ms
  Max rows returned: 1000 (use pagination)
```

---

## Integration with Existing Tools

### npm run perf

Currently exists in package.json - use it to check performance.

### Custom Scripts

```bash
# Profile specific endpoint
node scripts/profile-endpoint.js GET /api/orders

# Check database performance
node scripts/db-performance.js

# Analyze bundle size
npm run analyze

# Check for performance regressions
npm run perf:compare
```

---

## Continuous Performance Monitoring

### What to Monitor

```typescript
interface PerformanceMetrics {
  // API Performance
  apiResponseTime: {
    p50: number;
    p95: number;
    p99: number;
  };

  // Database Performance
  dbQueryTime: {
    p50: number;
    p95: number;
    slowQueries: number;
  };

  // Frontend Performance
  pageLoadTime: number;
  interactionTime: number;

  // Business Metrics
  ordersPerSecond: number;
  activePickers: number;
}
```

### Alerting Thresholds

```yaml
Alert when:
  - API P95 > 500ms for 5 minutes
  - Database P95 > 200ms for 5 minutes
  - Error rate > 1% for 1 minute
  - Active pickers = 0 during business hours
```

---

## Performance Optimization Workflow for GLM 4.7

### Step 1: Identify Slowness

User says: "This is slow"

**GLM should**:
1. Ask what specifically is slow
2. Run performance checks
3. Identify bottleneck
4. Propose optimization

### Step 2: Measure Baseline

```bash
# Run performance monitoring
npm run perf

# Profile specific endpoint
ab -n 100 -c 10 http://localhost:3001/api/orders
```

### Step 3: Implement Optimization

Choose appropriate pattern from common patterns above.

### Step 4: Verify Improvement

```bash
# Run performance monitoring again
npm run perf

# Compare with baseline
# Should show improvement
```

### Step 5: Document Decision

Add to docs/DECISIONS.md:
```markdown
### ADR-XXX: Performance Optimization for [Feature]
- **Date**: 2025-01-19
- **Context**: [What was slow]
- **Solution**: [What was done]
- **Impact**: [Improvement measured]
```

---

## Quick Reference for GLM 4.7

### Performance Commands

```bash
npm run perf              # Check overall performance
npm run analyze           # Analyze bundle size
npm run db:status         # Check database performance
```

### Performance Patterns

| Pattern | When to Use | Improvement |
|---------|-------------|-------------|
| Eager loading | N+1 queries | 10x faster |
| Add index | Slow queries | 10x faster |
| Parallel ops | Serial operations | 3x faster |
| Pagination | Large responses | 50x smaller |
| Caching | Repeated calculations | 100x faster |

---

**Version**: 1.0.0
**Last Updated**: 2025-01-19
**Status**: Ready for implementation
