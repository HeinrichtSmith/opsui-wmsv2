# Code Dependency Graph

**Purpose**: Semantic graph showing file relationships and dependencies for GLM 4.7 context understanding.

**Version**: 1.0.0
**Last Updated**: 2025-01-19
**Auto-Generated**: No (manually maintained for now)

---

## Graph Format

Each node represents a file/component with:
- **File**: Path to the file
- **Type**: service | repository | route | component | type | util
- **Domain**: Business domain (orders, inventory, auth, etc.)
- **Depends On**: Files this file imports
- **Impacts**: Files that depend on this file
- **Shared Types**: Types from shared package used
- **API Contracts**: API endpoints defined (for routes)

---

## Domain: Orders

### OrderService.ts
```yaml
File: packages/backend/src/services/OrderService.ts
Type: service
Domain: orders
Complexity: high

Depends On:
  - packages/backend/src/repositories/OrderRepository.ts
  - packages/backend/src/repositories/PickTaskRepository.ts
  - packages/backend/src/repositories/InventoryRepository.ts
  - packages/shared/src/types/order.ts (OrderStatus, OrderPriority)
  - packages/shared/src/types/workflow.ts (validateTransition)

Impacts:
  - packages/backend/src/routes/orders.ts
  - packages/backend/src/services/MetricsService.ts
  - packages/frontend/src/pages/picking/PickingPage.tsx
  - packages/frontend/src/pages/packing/PackingPage.tsx

Shared Types:
  - Order, OrderStatus, OrderPriority
  - CreateOrderDTO, ClaimOrderDTO, PickItemDTO
  - NotFoundError, ConflictError, ValidationError

API Contracts:
  - POST /api/orders (create order)
  - GET /api/orders/:id (get order details)
  - POST /api/orders/:id/claim (claim order)
  - POST /api/orders/:id/pick (pick item)
  - POST /api/orders/:id/complete (complete order)
  - POST /api/orders/:id/cancel (cancel order)

Critical Paths:
  - Order claiming → Inventory reservation
  - Item picking → Progress tracking
  - Order completion → State transition validation
```

### OrderRepository.ts
```yaml
File: packages/backend/src/repositories/OrderRepository.ts
Type: repository
Domain: orders
Complexity: medium

Depends On:
  - packages/backend/src/db/client.ts (database connection)
  - packages/shared/src/types/order.ts

Impacts:
  - packages/backend/src/services/OrderService.ts
  - packages/backend/src/services/MetricsService.ts

Database Tables:
  - orders (primary)
  - order_items (via join)
  - order_state_changes (audit trail)

Indexes Used:
  - idx_orders_status (for filtering by status)
  - idx_orders_created_at (for sorting)
  - idx_orders_picker_id (for picker's active orders)
```

---

## Domain: Inventory

### InventoryService.ts
```yaml
File: packages/backend/src/services/InventoryService.ts
Type: service
Domain: inventory
Complexity: high

Depends On:
  - packages/backend/src/repositories/InventoryRepository.ts
  - packages/backend/src/repositories/SKURepository.ts
  - packages/shared/src/types/inventory.ts
  - packages/backend/src/db/client.ts (for transactions)

Impacts:
  - packages/backend/src/routes/inventory.ts
  - packages/backend/src/services/OrderService.ts
  - packages/frontend/src/pages/inventory/InventoryPage.tsx

Shared Types:
  - InventoryUnit, TransactionType
  - InventoryTransaction
  - NotFoundError, ConflictError

API Contracts:
  - GET /api/inventory/sku/:sku (get inventory by SKU)
  - GET /api/inventory/bin/:location (get inventory by bin)
  - POST /api/inventory/adjust (manual adjustment)
  - GET /api/inventory/alerts/low-stock (low stock alerts)
  - POST /api/inventory/reconcile (reconcile inventory)

Critical Paths:
  - Inventory reservation (atomic with SELECT FOR UPDATE)
  - Inventory deduction (on shipping)
  - Low stock alerts (threshold checking)

Invariants Enforced:
  - quantity >= 0 (never negative)
  - reserved <= quantity (never over-reserve)
  - All changes logged to inventory_transactions
```

### InventoryRepository.ts
```yaml
File: packages/backend/src/repositories/InventoryRepository.ts
Type: repository
Domain: inventory
Complexity: medium

Depends On:
  - packages/backend/src/db/client.ts

Impacts:
  - packages/backend/src/services/InventoryService.ts
  - packages/backend/src/services/OrderService.ts

Database Tables:
  - inventory (primary)
  - inventory_transactions (audit log)
  - skus (via join for SKU info)

Indexes Used:
  - idx_inventory_sku (for SKU lookups)
  - idx_inventory_bin_location (for bin lookups)
  - idx_inventory_sku_bin (composite for reservations)
```

---

## Domain: Authentication

### AuthService.ts
```yaml
File: packages/backend/src/services/AuthService.ts
Type: service
Domain: auth
Complexity: medium

Depends On:
  - packages/backend/src/repositories/UserRepository.ts
  - packages/backend/src/middleware/auth.ts (JWT functions)
  - packages/shared/src/types/user.ts (UserRole)

Impacts:
  - packages/backend/src/routes/auth.ts
  - packages/backend/src/middleware/auth.ts
  - packages/frontend/src/stores/authStore.ts

Shared Types:
  - User, UserRole
  - NotFoundError, UnauthorizedError

API Contracts:
  - POST /api/auth/login (user login)
  - POST /api/auth/logout (user logout)
  - POST /api/auth/refresh (refresh access token)
  - GET /api/auth/me (get current user)
  - POST /api/auth/change-password (change password)

Critical Paths:
  - Login validation → JWT generation
  - Token refresh → Refresh token rotation
  - Password change → Bcrypt rehashing

Security:
  - Bcrypt with 10 rounds
  - Access token TTL: 15 minutes
  - Refresh token rotation on every refresh
  - Rate limiting required on login
```

---

## Domain: Metrics & Dashboard

### MetricsService.ts
```yaml
File: packages/backend/src/services/MetricsService.ts
Type: service
Domain: metrics
Complexity: medium

Depends On:
  - packages/backend/src/repositories/OrderRepository.ts
  - packages/backend/src/repositories/PickTaskRepository.ts
  - packages/backend/src/repositories/UserRepository.ts
  - packages/shared/src/types/metrics.ts

Impacts:
  - packages/backend/src/routes/metrics.ts
  - packages/frontend/src/pages/dashboard/DashboardPage.tsx

Shared Types:
  - DashboardMetricsResponse
  - PickerPerformance
  - OrderMetrics

API Contracts:
  - GET /api/metrics/dashboard (dashboard metrics)
  - GET /api/metrics/picker-activity (real-time activity)
  - GET /api/metrics/pickers (picker performance)

Performance:
  - Dashboard queries can be slow (optimize with caching)
  - Consider Redis for metrics caching
  - Real-time updates planned via WebSocket
```

---

## Frontend Dependencies

### PickingPage.tsx
```yaml
File: packages/frontend/src/pages/picking/PickingPage.tsx
Type: component
Domain: picking
Complexity: medium

Depends On:
  - packages/frontend/src/api/orders.ts (React Query hooks)
  - packages/frontend/src/components/ScanInput.tsx
  - packages/shared/src/types/order.ts

Impacts:
  - None (leaf component)

API Calls:
  - GET /api/orders/:id (fetch order details)
  - POST /api/orders/:id/pick (pick item)
  - POST /api/orders/:id/complete (complete order)

State Management:
  - Server state: React Query
  - UI state: Local component state

User Interactions:
  - Barcode scanning (keyboard + barcode scanner)
  - Quantity entry
  - Undo last pick
```

---

## Shared Types Package

### packages/shared/src/types/order.ts
```yaml
File: packages/shared/src/types/order.ts
Type: type definitions
Domain: shared
Complexity: low

Depends On:
  - None (foundational types)

Impacts:
  - packages/backend/src/services/OrderService.ts
  - packages/backend/src/repositories/OrderRepository.ts
  - packages/frontend/src/pages/picking/PickingPage.tsx
  - packages/frontend/src/pages/packing/PackingPage.tsx
  - ALL order-related files

Exports:
  - Order, OrderItem
  - OrderStatus (enum)
  - OrderPriority (enum)
  - CreateOrderDTO, ClaimOrderDTO, PickItemDTO
  - Order-related error types

Critical: This is the SINGLE SOURCE OF TRUTH for order types.
```

### packages/shared/src/types/workflow.ts
```yaml
File: packages/shared/src/types/workflow.ts
Type: type definitions + validation logic
Domain: shared
Complexity: high (state machine validation)

Depends On:
  - packages/shared/src/types/order.ts
  - packages/shared/src/types/inventory.ts
  - packages/shared/types/user.ts

Impacts:
  - packages/backend/src/services/OrderService.ts (all state transitions)
  - Any file that changes order status

Exports:
  - validateTransition() (CRITICAL FUNCTION)
  - isValidTransition()
  - getNextStates()
  - isTerminalState()
  - All state machine invariants

Critical: All state transitions MUST go through validateTransition().
```

---

## Cross-Cutting Concerns

### Database Client
```yaml
File: packages/backend/src/db/client.ts
Type: infrastructure
Domain: database
Complexity: low

Depends On:
  - pg (PostgreSQL driver)
  - knex (query builder)

Impacts:
  - ALL repository files
  - ALL service files (for transactions)

Features:
  - Connection pooling (max 20 connections)
  - Transaction support
  - Query logging in development

Configuration:
  - DATABASE_URL from environment
  - Pool size: 20 (configurable)
```

### Logger
```yaml
File: packages/backend/src/config/logger.ts
Type: infrastructure
Domain: logging
Complexity: low

Depends On:
  - winston (logging library)

Impacts:
  - ALL service files
  - ALL route files

Usage:
  - logger.info() for informational messages
  - logger.error() for errors
  - logger.warn() for warnings
  - Structured logging with context objects
```

---

## Dependency Heat Map

**High coupling areas** (be careful when changing):
1. **OrderStatus enum** - Used in 50+ files across backend/frontend
2. **validateTransition()** - All state transitions go through this
3. **Order type** - Core domain type used everywhere
4. **Database client** - All data access depends on this
5. **Auth middleware** - Protects all API routes

**Medium coupling areas**:
1. Service layer files (OrderService, InventoryService, etc.)
2. Repository layer files
3. Shared utility functions

**Low coupling areas** (safe to change):
1. Frontend components (leaf nodes)
2. Utility functions
3. Test files
4. Documentation

---

## Circular Dependencies

**Currently: None detected** ✅

The architecture successfully avoids circular dependencies by:
- Services depend on repositories, NOT vice versa
- Routes depend on services, NOT vice versa
- Frontend depends on backend types via shared, NOT vice versa
- Shared types have NO dependencies on other packages

---

## Impact Analysis Guide

When changing a file, check its **Impacts** list to understand:
1. What will break if you change the API
2. What needs to be updated if you change types
3. What tests need to be rerun
4. What documentation needs updating

**Example**: Changing `OrderService.ts`
- Check `routes/orders.ts` for API contract changes
- Check `PickingPage.tsx` for frontend assumptions
- Check `MetricsService.ts` for dashboard dependencies
- Run tests for orders, picking, and dashboard

---

## Future Enhancements

1. **Auto-generation**: Script to scan imports and build this graph
2. **Visualization**: Tool to render dependency graph visually
3. **Impact calculator**: Auto-calculate impact when files change
4. **Circular dependency detection**: Automated detection
5. **Type usage tracking**: Where each type is used

---

## Usage for GLM 4.7

Before making changes, GLM 4.7 should:
1. **Look up the file** in this graph
2. **Check dependencies** to understand what it needs
3. **Check impacts** to understand what will break
4. **Check shared types** to understand type usage
5. **Check API contracts** if modifying routes/services

This context helps GLM 4.7:
- Predict side effects of changes
- Update all affected files
- Run appropriate tests
- Update documentation

---

**Maintenance**: Update this graph when:
- Adding new major files
- Changing file dependencies
- Refactoring architecture
- Adding new domains

**Version**: 1.0.0
**Last Updated**: 2025-01-19
**Maintained By**: Development Team with AI assistance
