# Architectural Decision Log

**Purpose**: Track significant architectural decisions and their rationale for future reference and AI context.

---

## Decision Format

Each decision follows this structure:

- **Date**: When the decision was made
- **Status**: Proposed | Accepted | Deprecated | Superseded
- **Context**: What problem or situation led to this decision
- **Decision**: What was decided
- **Rationale**: Why this decision was made
- **Impact**: What consequences this decision has
- **Alternatives Considered**: What other options were evaluated

---

## Database & Data Layer

### ADR-001: Use PostgreSQL with Triggers for Audit Trail

- **Date**: 2024-11-15
- **Status**: Accepted
- **Context**: Need to track all state changes for compliance and debugging
- **Decision**: Use database triggers to automatically log state changes to `order_state_changes` table
- **Rationale**: Audit trail cannot be bypassed by application code; automatic and reliable
- **Impact**: All state transitions are logged with timestamps; legal compliance assured
- **Alternatives**: Application-level logging (can be bypassed), Change Data Capture (more complex)

### ADR-002: Database Transactions for All State Changes

- **Date**: 2024-11-20
- **Status**: Accepted
- **Context**: Race conditions causing inventory corruption during concurrent order claiming
- **Decision**: All multi-step database operations must be wrapped in transactions
- **Rationale**: Ensures atomicity - either all changes succeed or all fail together
- **Impact**: Eliminated data corruption; added complexity to service layer
- **Alternatives**: Application-level locking (prone to deadlocks), Optimistic locking (requires retry logic)

### ADR-003: SELECT FOR UPDATE for Inventory Reservations

- **Date**: 2024-12-05
- **Status**: Accepted
- **Context**: Multiple pickers trying to reserve same inventory simultaneously
- **Decision**: Use `SELECT FOR UPDATE` to lock inventory rows during reservation
- **Rationale**: Prevents race conditions at database level; reliable serialization
- **Impact**: Slight performance impact; eliminates overselling
- **Alternatives**: Application-level mutex (doesn't scale), Version column (requires retry logic)

---

## Architecture Patterns

### ADR-004: Service-Oriented Architecture (Controller → Service → Repository)

- **Date**: 2024-11-01
- **Status**: Accepted
- **Context**: Need clear separation of concerns and testable business logic
- **Decision**: Enforce layered architecture with Controllers (HTTP), Services (business logic), Repositories (data access)
- **Rationale**: Clear boundaries; easy to test; reusable business logic
- **Impact**: More files but better organization; requires discipline to maintain
- **Alternatives**: MVC (less separation), Anemic domain model (logic in controllers)

### ADR-005: Shared Types Package

- **Date**: 2024-11-10
- **Status**: Accepted
- **Context**: Types drifting between frontend and backend; integration bugs
- **Decision**: Single source of truth for types in `packages/shared/src/types/`
- **Rationale**: Guaranteed consistency; single place to update
- **Impact**: Type safety across monorepo; requires rebuild of dependent packages
- **Alternatives**: Duplicate types (drifts over time), Code generation (complex tooling)

### ADR-006: Result Type for Error Handling

- **Date**: 2024-12-01
- **Status**: Accepted
- **Context**: Need consistent error handling without throwing exceptions
- **Decision**: Use Result<T> type with `{ success, data?, error? }` structure
- **Rationale**: Explicit error handling; no try-catch needed; better type inference
- **Impact**: Slightly more verbose; much safer error handling
- **Alternatives**: Exceptions (can be missed), Error codes (no type safety)

---

## Frontend & State Management

### ADR-007: React Query for Server State

- **Date**: 2024-11-15
- **Status**: Accepted
- **Context**: Manual state management causing stale data and synchronization issues
- **Decision**: Use React Query for all server state with automatic refetching
- **Rationale**: Automatic background updates; cache management; optimistic updates
- **Impact**: Less manual state code; dependency on library
- **Alternatives**: Redux (too much boilerplate), Manual useEffect (error-prone)

### ADR-008: Zustand for UI-Only State

- **Date**: 2024-11-16
- **Status**: Accepted
- **Context**: Need simple state management for UI-only state (modals, forms)
- **Decision**: Use Zustand stores for local UI state
- **Rationale**: Simple API; no boilerplate; good TypeScript support
- **Impact**: Clear separation: server state (React Query) vs UI state (Zustand)
- **Alternatives**: Context API (verbose), Redux (overkill)

---

## State Machine & Workflow

### ADR-009: Strict State Machine with Validation

- **Date**: 2024-11-25
- **Status**: Accepted
- **Context**: Invalid state transitions causing order flow corruption
- **Decision**: Enforce state machine with pre-transition validation
- **Rationale**: Catches invalid transitions before they corrupt data
- **Impact**: Added validation step; prevents many bugs
- **Alternatives**: Permissive transitions (dangerous), Event sourcing (complex)

### ADR-010: Undo/Revert for All User Actions

- **Date**: 2025-01-10
- **Status**: Accepted
- **Context**: Users make mistakes; permanent actions cause frustration
- **Decision**: Every user action must be reversible (soft delete, history recording)
- **Rationale**: Users can recover from mistakes; better UX
- **Impact**: More complex code; soft deletes; history tables
- **Alternatives**: Permanent actions (bad UX), Confirmation dialogs (still mistakes)

---

## Security

### ADR-011: JWT with Refresh Token Rotation

- **Date**: 2024-11-20
- **Status**: Accepted
- **Context**: Need secure authentication without forcing frequent logins
- **Decision**: JWT access tokens (short-lived) with refresh token rotation
- **Rationale**: Balance security (short-lived tokens) with UX (no frequent re-login)
- **Impact**: Slightly complex token management; good security
- **Alternatives**: Long-lived tokens (security risk), Sessions only (no scalability)

### ADR-012: Role-Based Access Control (RBAC)

- **Date**: 2024-11-22
- **Status**: Accepted
- **Context**: Different user types need different permissions
- **Decision**: Implement RBAC with roles: PICKER, PACKER, SUPERVISOR, ADMIN
- **Rationale**: Clear permission boundaries; easy to understand
- **Impact**: Authorization checks on all endpoints; potential for missed checks
- **Alternatives**: Attribute-based access control (more complex), No permissions (insecure)

---

## Testing Strategy

### ADR-013: Three-Level Testing Pyramid

- **Date**: 2024-12-10
- **Status**: Accepted
- **Context**: Need comprehensive testing without excessive test maintenance
- **Decision**: Unit tests (60%), Integration tests (30%), E2E tests (10%)
- **Rationale**: Fast feedback from unit tests; coverage from integration; critical path from E2E
- **Impact**: Balanced test suite; manageable maintenance
- **Alternatives**: Mostly E2E (slow, brittle), Mostly unit (misses integration bugs)

### ADR-014: Auto-Generated Tests for New Code

- **Date**: 2025-01-12
- **Status**: Accepted
- **Context**: Manual test writing is tedious and often forgotten
- **Decision**: Use MCP tool to auto-generate tests for new code
- **Rationale**: Tests get written; consistent coverage; faster development
- **Impact**: Better coverage; some generated tests may need review
- **Alternatives**: Manual only (forgotten), No tests (disaster)

---

## Development Workflow

### ADR-015: AI-First Development with Guardrails

- **Date**: 2024-12-01
- **Status**: Accepted
- **Context**: Want to leverage AI for development speed while maintaining quality
- **Decision**: Use AI agents with comprehensive rules and guardrails
- **Rationale**: AI accelerates development; rules prevent mistakes
- **Impact**: Much faster development; requires good rule maintenance
- **Alternatives**: Manual only (slower), AI without rules (risky)

### ADR-016: Pattern Library for Code Consistency

- **Date**: 2025-01-05
- **Status**: Accepted
- **Context**: Similar problems solved repeatedly; inconsistent patterns
- **Decision**: Extract and maintain pattern library via MCP tools
- **Rationale**: Reuse proven solutions; consistency across codebase
- **Impact**: Faster development; better code quality
- **Alternatives**: Ad-hoc solutions (inconsistent), Over-engineering (too complex)

---

## Performance & Scalability

### ADR-017: Database Indexes for Common Queries

- **Date**: 2024-12-15
- **Status**: Accepted
- **Context**: Queries slowing down as data grows
- **Decision**: Add indexes for foreign keys, status columns, and common filters
- **Rationale**: Orders of magnitude performance improvement
- **Impact**: Faster queries; slight write performance impact
- **Alternatives**: No indexes (too slow), Full-text search (overkill for simple queries)

### ADR-018: Connection Pooling for Database

- **Date**: 2024-12-20
- **Status**: Accepted
- **Context**: New connection per request causing performance issues
- **Decision**: Use connection pool (pg) with max 20 connections
- **Rationale**: Reuses connections; much better performance
- **Impact**: Better performance; need to tune pool size
- **Alternatives**: Single connection (no concurrency), Unlimited (database exhaustion)

---

## Deployment & Operations

### ADR-019: Graceful Shutdown with Connection Draining

- **Date**: 2025-01-08
- **Status**: Accepted
- **Context**: Hot reload dropping connections; incomplete requests
- **Decision**: Implement graceful shutdown with connection draining
- **Rationale**: No dropped connections; clean shutdown
- **Impact**: Better UX during deployments; slightly complex shutdown logic
- **Alternatives**: Immediate shutdown (drops connections), No hot reload (slow dev)

### ADR-020: Environment-Based Configuration

- **Date**: 2024-11-25
- **Status**: Accepted
- **Context**: Different configs needed for dev/staging/production
- **Decision**: Use environment variables with `.env` files; never commit `.env`
- **Rationale**: Standard practice; secure; flexible
- **Impact**: Requires environment setup; secure defaults
- **Alternatives**: Config files (risk of committing secrets), Hard-coded (no flexibility)

---

## Future Decisions (Pending)

### ADR-021: Real-Time Updates via WebSocket

- **Date**: 2025-01-19
- **Status**: Proposed
- **Context**: Dashboard needs real-time picker activity updates
- **Proposed Decision**: Implement Socket.io for WebSocket connections
- **Rationale**: True real-time; proven technology
- **Impact**: Real-time updates; additional infrastructure
- **Alternatives**: Polling (wasteful), Server-Sent Events (one-way only)

### ADR-022: Redis Caching Layer

- **Date**: 2025-01-19
- **Status**: Proposed
- **Context**: Frequently accessed data (SKUs, users) queried repeatedly
- **Proposed Decision**: Add Redis caching layer with TTL
- **Rationale**: Reduced database load; faster responses
- **Impact**: Better performance; additional infrastructure
- **Alternatives**: In-memory cache (no sharing), No cache (current state)

---

## Decision Review Process

**When to Review Decisions**:

- Annually for stable decisions
- When requirements significantly change
- When technology stack evolves
- When pain points emerge

**How to Challenge a Decision**:

1. Document the problem with current approach
2. Propose alternative with rationale
3. Assess impact of change
4. Create new ADR referencing the old one
5. Mark old ADR as "Superseded by ADR-XXX"

---

## Related Documentation

- [Architecture Overview](../ARCHITECTURE.md)
- [Approved Patterns](../patterns/APPROVED_PATTERNS.md)
- [Code Organization](../docs/CODE_ORGNIZATION.md)
- [Project Index](../.project-index.json)

---

**Last Updated**: 2025-01-19
**Maintained By**: Development Team (with AI assistance)
