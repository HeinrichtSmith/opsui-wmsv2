# Quick Reference for GLM 4.7 in Cline

**Purpose**: Fast lookup guide for GLM 4.7 to understand user intent and project context.

---

## Intent Recognition Patterns

### When User Says... | They Mean... | GLM Should...

-------------------|--------------|---------------
"add feature" | Implement new functionality | Follow feature development pattern from APPROVED_PATTERNS.md
"fix bug" | Something is broken | Use debugging protocol; check tests; identify root cause
"optimize" | Make it faster | Profile first, then optimize; measure before/after
"refactor" | Improve structure | Maintain behavior; improve readability/reusability
"clean up" | Remove technical debt | Remove unused code; organize imports; apply consistent formatting
"test this" | Generate tests | Auto-generate comprehensive tests with coverage
"explain" | Teach me | Layered explanation: overview → details → implications
"review" | Check quality | Check against rules; verify patterns; suggest improvements
"run this" | Start servers | Use `npm run dev` (foolproof startup)
"start servers" | Start servers | Use `npm run dev` (handles everything)
"stop servers" | Stop servers | Use Ctrl+C or `npm run dev:stop`
"restart servers" | Clean restart | Use `npm run dev:restart` (kills all + starts fresh)
"reset data" | Fresh database | Use `npm run db:reset` (auto-backup included)
"how do I" | Question about patterns | Search patterns library; show examples
"make it work like" | Copy pattern from elsewhere | Extract pattern; apply to new context

---

## Critical Rules Summary

### 🚫 NEVER DO (Immutable Laws)

- Modify files outside owned paths without coordination
- Use string literals for enums (import from shared)
- Skip transactions for multi-step operations
- Add business logic to frontend components
- Expose database errors to API clients
- Bypass database constraints
- Delete from audit trail tables

### ✅ ALWAYS DO (Mandatory Practices)

- Check file ownership before modifying
- Import types from `@wms/shared/types`
- Wrap multi-step operations in transactions
- Validate state transitions before changing
- Run tests before proposing changes
- Follow existing patterns in codebase
- Use parameterized queries (SQL injection prevention)
- Make every user action reversible

---

## State Machine (MEMORIZE)

```
PENDING ──────→ PICKING ──→ PICKED ──→ PACKING ──→ PACKED ──→ SHIPPED
   │              │
   ↓              ↓
CANCELLED     CANCELLED

PENDING ──────→ BACKORDER ──→ PENDING
```

### Valid Transitions Only

- `PENDING → PICKING, CANCELLED, BACKORDER`
- `PICKING → PICKED, CANCELLED`
- `PICKED → PACKING`
- `PACKING → PACKED`
- `PACKED → SHIPPED`
- `BACKORDER → PENDING`

**Terminal states**: SHIPPED, CANCELLED

---

## Critical Files by Category

### Rules & Context

- `.clinerules.md` - Supreme ruleset (2,494 lines)
- `AI_RULES.md` - Agent boundaries
- `prompts/CONTEXT_HEADER.md` - Project context template
- `patterns/APPROVED_PATTERNS.md` - Code pattern library

### Architecture

- `docs/DECISIONS.md` - Architectural decision log
- `docs/ARCHITECTURE.md` - System architecture
- `docs/CODE_ORGANIZATION.md` - File structure conventions

### Database

- `packages/backend/src/db/schema.sql` - Authoritative schema
- `packages/backend/src/db/client.ts` - Database connection
- `packages/backend/src/db/migrate.js` - Migration runner

### Core Services

- `packages/backend/src/services/OrderService.ts` - Order lifecycle
- `packages/backend/src/services/InventoryService.ts` - Inventory management
- `packages/backend/src/services/AuthService.ts` - Authentication
- `packages/backend/src/services/MetricsService.ts` - Dashboard data

---

## Common Commands

### Server Management (USE THESE)

```bash
npm run dev            # Start all servers (foolproof startup)
npm run dev:stop       # Stop all servers gracefully
npm run dev:restart    # Kill all + start fresh (when things break)

# NEVER use these (kept for backward compatibility):
npm run dev:smart      # Advanced monitoring (use npm run dev instead)
npm run dev:safe       # Safe mode (use npm run dev instead)
```

### Testing

```bash
npm test               # Run all tests
npm run test:all       # All tests + validation
npm run test:watch     # Watch mode for development
npm run test:coverage  # Coverage report
```

### Database

```bash
npm run db:status      # Show database state
npm run db:seed        # Add sample data (safe)
npm run db:reset       # Complete reset (auto-backup)
npm run db:clean       # Remove all data (auto-backup)
npm run db:migrate     # Run database migrations
```

### Code Quality

```bash
npm run lint:fix       # Fix linting issues
npm run format         # Format code
npm run type-check     # Type checking
npm run build          # Build all packages
```

---

## Domain-Specific Knowledge

### Order Lifecycle

1. **Created** → Inventory reserved
2. **Claimed** → Picker assigned (max 10 per picker)
3. **Picking** → Items scanned and picked
4. **Picked** → All items confirmed
5. **Packing** → Packer prepares shipment
6. **Shipped** → Order completed

### Inventory Rules

- **Never negative**: Check before deducting
- **Reserved ≤ Total**: Enforced invariant
- **Available = Total - Reserved**: Computed column
- **All changes audited**: Transaction log

### User Roles

- **PICKER**: Claims and picks orders
- **PACKER**: Packs and ships orders
- **SUPERVISOR**: Views dashboard and metrics
- **ADMIN**: Full system access

---

## Error Types & When to Use

```typescript
// Import from shared types
import {
  ValidationError, // 400 - Invalid input
  UnauthorizedError, // 401 - Not authenticated
  ForbiddenError, // 403 - No permission
  NotFoundError, // 404 - Resource missing
  ConflictError, // 409 - Resource exists / constraint violation
  InventoryError, // 409 - Insufficient inventory
  WMSError, // Base error class
} from '@wms/shared/types';
```

---

## Code Patterns by Task Type

### Adding an API Endpoint

1. Create validation schema (Joi)
2. Add route in `packages/backend/src/routes/`
3. Add service method in `packages/backend/src/services/`
4. Add repository method if needed
5. Add types in `packages/shared/src/types/`
6. Add tests
7. Extract pattern if reusable

### Modifying State Machine

1. Check `docs/DECISIONS.md` ADR-009 first
2. Update workflow types in shared
3. Add transition validation
4. Update all affected services
5. Add tests for new transitions
6. Update documentation

### Database Schema Change

1. Modify `packages/backend/src/db/schema.sql`
2. Create migration in `packages/backend/src/db/migrations/`
3. Update TypeScript types
4. Run migration
5. Test with sample data
6. Document in DECISIONS.md

---

## Debugging Protocol

### When Something Breaks

1. **Check tests** - `npm test` to see failures
2. **Check build** - `npm run build` for TypeScript errors
3. **Check logs** - Backend logs often show the issue
4. **Check database** - `npm run db status` for data issues
5. **Check recent changes** - What was just modified?

### Common Issues

- **Port in use** → Use `npm run dev:restart`
- **Database connection refused** → Check PostgreSQL running
- **Type errors** → Run `npm run build` for details
- **Tests failing** → Check if data needs seeding
- **Inventory going negative** → Missing invariant check

---

## Performance Considerations

### Before Optimizing

1. **Measure first** - Never optimize without profiling
2. **Identify bottleneck** - What's ACTUALLY slow?
3. **Set baseline** - Current performance metrics
4. **Define target** - What's "fast enough"?

### Common Optimizations

- **N+1 queries** → Use eager loading (JOIN/include)
- **Missing indexes** → Add database indexes
- **No caching** → Add Redis for frequently accessed data
- **Sequential operations** → Use `Promise.all()` for parallel
- **Large responses** → Implement pagination

---

## Security Checklist

Before completing ANY feature:

- [ ] All inputs validated with Joi?
- [ ] All queries parameterized?
- [ ] Authentication required?
- [ ] Authorization checked?
- [ ] No sensitive data logged?
- [ ] Secrets in environment variables?
- [ ] Rate limiting applied?

---

## Testing Targets

### Coverage Requirements

- **Critical paths**: 100% coverage
- **Business logic**: 90%+ coverage
- **Utilities**: 95%+ coverage
- **UI components**: 80%+ coverage

### Test Structure

```typescript
describe('Service/Component', () => {
  describe('method/feature', () => {
    it('should work with valid input', () => {
      /* ... */
    });
    it('should handle edge case', () => {
      /* ... */
    });
    it('should throw on invalid input', () => {
      /* ... */
    });
  });
});
```

---

## Git Workflow

### Before Committing

1. Tests pass: `npm test`
2. Build succeeds: `npm run build`
3. Lint clean: `npm run lint:fix`
4. Format applied: `npm run format`
5. Types check: `npm run type-check`

### Commit Message Format

```
type(scope): description

Examples:
feat(order): add batch claim feature
fix(inventory): prevent negative quantities
refactor(auth): simplify token refresh
docs(readme): update setup instructions
```

---

## MCP Tools Available

- `pattern_extract` - Save code patterns
- `pattern_search` - Find similar patterns
- `generate_tests` - Auto-generate tests
- `context_compress` - Compress repetitive code
- `analyze_coverage` - Check test coverage

---

## Project Index Reference

Full project structure available in `.project-index.json`:

- Domain mappings (orders, inventory, auth, etc.)
- File locations by function
- State machine definitions
- Configuration locations
- Tool references

---

## Quick Help Commands

```bash
# Check what you own
npx ts-node scripts/check-ownership.ts <user-id> <file>

# Find patterns
npm run pattern search "<keyword>"

# Analyze code
npm run analyze:code

# Monitor performance
npm run perf
```

---

## Emergency Protocols

### If You Break Something

1. **STOP** - Don't make more changes
2. **ASSESS** - What changed?
3. **REVERT** - Go back to last working state
4. **ANALYZE** - What went wrong?
5. **FIX** - Smaller, safer changes
6. **TEST** - Verify before reapplying

### If You Don't Understand

1. **Read** the relevant files
2. **Search** for similar patterns
3. **Check** APPROVED_PATTERNS.md
4. **Ask** for clarification
5. **Never** guess

---

## Current Session Context

This file is automatically loaded by GLM 4.7 to establish:

1. **Project understanding** - What we're building
2. **Intent recognition** - What user wants
3. **Protocol knowledge** - How to work safely
4. **Pattern awareness** - What approaches work
5. **Command knowledge** - How to operate system

---

**Last Updated**: 2025-01-19
**Version**: 1.0.0
**Maintained By**: Development Team with AI assistance
