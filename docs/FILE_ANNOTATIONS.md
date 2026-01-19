# File Purpose Annotation Template

**Purpose**: Standard template for documenting file purpose, complexity, and metadata for GLM 4.7 context.

---

## Header Template

Add this header to key files (services, repositories, controllers):

```typescript
/**
 * @file {filename}
 * @purpose {Brief description of what this file does}
 * @complexity low|medium|high
 * @tested yes|no|partial (coverage %)
 * @last-change YYYY-MM-DD (brief description)
 * @dependencies {list of key dependencies}
 * @domain {orders|inventory|auth|users|metrics|etc}
 *
 * @description
 * {Detailed description of 2-3 sentences explaining:
 *  - What problem this solves
 *  - How it fits into the architecture
 *  - Key patterns or algorithms used}
 *
 * @invariants
 * - {List of critical invariants this file maintains}
 *
 * @performance
 * - {Known performance characteristics or bottlenecks}
 *
 * @security
 * - {Security considerations for this file}
 *
 * @see {@link {related_file}} for {description}
 */
```

---

## Examples by File Type

### Service Layer Example

```typescript
/**
 * @file OrderService.ts
 * @purpose Manages order lifecycle including claiming, picking, and state transitions
 * @complexity high (multiple state validations, transaction coordination)
 * @tested yes (90% coverage)
 * @last-change 2025-01-12 (added undo support for state transitions)
 * @dependencies OrderRepository, InventoryService, UserService, db.transaction
 * @domain orders
 *
 * @description
 * Handles all order state transitions following the strict state machine:
 * PENDING → PICKING → PICKED → PACKING → PACKED → SHIPPED.
 * Coordinates with inventory service for reservations and deductions.
 * Enforces picker capacity limits and pick timeout constraints.
 *
 * @invariants
 * - Order status must follow valid state transitions only
 * - All multi-step operations are atomic (wrapped in transactions)
 * - Picker cannot exceed MAX_ORDERS_PER_PICKER (10) active orders
 * - Inventory reservations are made atomically with order creation
 *
 * @performance
 * - Uses database indexes for order queries
 * - Transaction overhead ~50ms for state changes
 * - N+1 query risk: avoid looping through orders without eager loading
 *
 * @security
 * - All methods require authentication context
 * - Pickers can only access orders they have claimed
 * - State transitions validated before execution
 *
 * @see {@link OrderRepository} for data access methods
 * @see {@link InventoryService} for reservation logic
 * @see {@link packages/shared/src/types/workflow.ts} for state machine definition
 */
import { Order, OrderStatus } from '@wms/shared/types';
// ... rest of implementation
```

### Repository Layer Example

```typescript
/**
 * @file OrderRepository.ts
 * @purpose Data access layer for orders and order items
 * @complexity medium (SQL query optimization, transaction support)
 * @tested yes (95% coverage)
 * @last-change 2025-01-10 (added query indexes for status filtering)
 * @dependencies db (Knex instance)
 * @domain orders
 *
 * @description
 * Provides CRUD operations for orders with optimized queries.
 * Supports transaction context for atomic operations.
 * All queries use parameterized inputs (SQL injection safe).
 *
 * @invariants
 * - All queries are parameterized (never interpolate values)
 * - Transactions are passed through for atomic operations
 * - Foreign key relationships enforced by database
 *
 * @performance
 * - Uses database indexes on status, created_at
 * - JOIN queries optimized to prevent N+1
 * - Typical query time: ~20ms
 *
 * @security
 * - All queries parameterized (SQL injection prevention)
 * - No raw SQL with user input
 * - Database enforces foreign key constraints
 */
import { db } from './client';
// ... rest of implementation
```

### Controller Layer Example

```typescript
/**
 * @file orders.ts (routes)
 * @purpose HTTP endpoints for order management
 * @complexity low (thin layer, delegates to service)
 * @tested yes (85% coverage)
 * @last-change 2025-01-08 (added rate limiting for claim endpoint)
 * @dependencies OrderService, auth middleware, validation schemas
 * @domain orders
 *
 * @description
 * HTTP route handlers for order operations.
 * Delegates all business logic to OrderService.
 * Validates input with Joi schemas before processing.
 *
 * @invariants
 * - All endpoints (except login) require authentication
 * - Input validation before calling service methods
 * - Errors mapped to domain errors (no database exposure)
 *
 * @performance
 * - Rate limiting: 100 req/min per user
 * - Response time depends on service layer
 *
 * @security
 * - Authentication required for all endpoints
 * - Authorization checked (role-based)
 * - Input validation with Joi schemas
 * - Rate limiting on claim endpoint
 */
import { Router } from 'express';
// ... rest of implementation
```

### React Component Example

```typescript
/**
 * @file PickingPage.tsx
 * @purpose Main picking interface with barcode scanning
 * @complexity medium (state management, barcode input handling)
 * @tested yes (80% coverage with React Testing Library)
 * @last-change 2025-01-15 (added undo support for scanned items)
 * @dependencies useOrderQuery, usePickMutation, ScanInput component
 * @domain picking
 *
 * @description
 * Primary interface for pickers to claim and fulfill orders.
 * Real-time barcode scanning with validation.
 * Shows progress and remaining items to pick.
 *
 * @invariants
 * - All state managed by React Query (server state)
 * - UI state only for modals and input focus
 * - Optimistic updates rolled back on error
 *
 * @performance
 * - React Query caching reduces API calls
 * - Barcode input debounced to 300ms
 * - Re-renders optimized with useMemo
 *
 * @accessibility
 * - Keyboard shortcuts (Enter to scan, Escape to cancel)
 * - ARIA labels on all interactive elements
 * - Focus management for barcode input
 */
import { useOrderQuery } from '@/api/orders';
// ... rest of implementation
```

---

## Annotation Guidelines

### @purpose
- Keep it brief (one sentence)
- Describe WHAT, not HOW
- Start with a strong verb: "Manages", "Provides", "Handles", "Implements"

### @complexity
- **low**: Simple CRUD, straightforward logic (< 100 lines)
- **medium**: Some business logic, conditional flows (100-300 lines)
- **high**: Multiple responsibilities, complex algorithms, transaction coordination (300+ lines)

### @tested
- **yes**: > 80% coverage, all critical paths covered
- **no**: No tests (should be rare)
- **partial**: < 80% coverage, add percentage

### @last-change
- Format: YYYY-MM-DD
- Brief description in parentheses
- Keep it to one line

### @dependencies
- List key dependencies only
- Don't include standard library
- Focus on project dependencies

### @domain
- One of: orders, inventory, auth, users, metrics, picking, packing, shipping, etc.
- Helps with file organization and ownership

---

## Progressive Annotation Strategy

### Priority 1 (Annotate First)
- All service layer files
- Repository files with complex queries
- Main page components (PickingPage, PackingPage, DashboardPage)

### Priority 2 (Annotate Next)
- Controller/route files
- Repository files with simple queries
- Reusable components (Button, Card, etc.)

### Priority 3 (Annotate If Time)
- Utility functions
- Type definition files
- Test files

---

## Usage for GLM 4.7

When GLM 4.7 reads a file with annotations, it understands:
1. **Purpose** - What problem this solves
2. **Complexity** - How careful to be when modifying
3. **Test Coverage** - How risky changes are
4. **Dependencies** - What might break
5. **Domain** - Where it fits in the system
6. **Performance** - What to optimize
7. **Security** - What to watch for

This context helps GLM 4.7:
- Make better decisions about changes
- Anticipate side effects
- Suggest appropriate optimizations
- Catch security issues early

---

## MCP Integration (Future)

Automatic annotation extractor could:
1. Scan new files for missing annotations
2. Suggest annotations based on code analysis
3. Update @last-change automatically on commit
4. Track complexity changes over time

---

## Template Copy-Paste

### Quick Template (Minimal)

```typescript
/**
 * @file {filename}
 * @purpose {what it does}
 * @complexity low|medium|high
 * @tested yes|no|partial
 * @last-change YYYY-MM-DD ({brief description})
 * @domain {domain}
 */
```

### Full Template (Comprehensive)

```typescript
/**
 * @file {filename}
 * @purpose {what it does}
 * @complexity low|medium|high
 * @tested yes|no|partial (coverage %)
 * @last-change YYYY-MM-DD ({brief description})
 * @dependencies {key deps}
 * @domain {domain}
 *
 * @description
 * {2-3 sentence detailed description}
 *
 * @invariants
 * - {critical invariant 1}
 * - {critical invariant 2}
 *
 * @performance
 * - {performance characteristics}
 *
 * @security
 * - {security considerations}
 *
 * @see {@link {related_file}}
 */
```

---

**Version**: 1.0.0
**Last Updated**: 2025-01-19
**Status**: Ready for use
