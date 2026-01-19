# Progressive Context Loading System

**Purpose**: Layer-based context loading for GLM 4.7 to balance speed with comprehension.

**Version**: 1.0.0
**Last Updated**: 2025-01-19

---

## Concept

Instead of loading all context at once, load progressively based on task complexity:

```
L1: Immediate Context (5 seconds)   → File being edited + immediate dependencies
L2: Module Context (2 minutes)      → Full module understanding + related services
L3: Architecture Context (5 minutes) → State machine, patterns, invariants
L4: Historical Context (10 minutes)  → Decisions, technical debt, domain knowledge
```

---

## Layer Definitions

### Layer 1: Immediate Context (Fast Start)

**Load Time**: ~5 seconds
**Purpose**: Quick understanding of current file

**What to Load**:
1. The file being edited/worked on
2. Direct imports (first-level dependencies)
3. File annotations (if present)
4. Related test file

**When to Use**:
- Quick fixes
- Small refactorings
- Adding a simple function
- Fixing a typo

**Example**: Adding a new method to OrderService.ts
```typescript
// Load these files:
1. packages/backend/src/services/OrderService.ts (the file itself)
2. packages/backend/src/repositories/OrderRepository.ts (direct import)
3. packages/shared/src/types/order.ts (types used)
4. packages/backend/src/services/OrderService.test.ts (related tests)
```

---

### Layer 2: Module Context (Working Understanding)

**Load Time**: ~2 minutes
**Purpose**: Understand the module and its relationships

**What to Load**:
- Everything from Layer 1
- All files in the same directory
- Related services and repositories
- API routes for the module
- Frontend components that use this module

**When to Use**:
- Adding features
- Refactoring within a module
- Understanding module interactions
- Bug fixing in complex areas

**Example**: Adding batch order claiming feature
```typescript
// Load these files:
From Layer 1:
- packages/backend/src/services/OrderService.ts
- packages/backend/src/repositories/OrderRepository.ts
- packages/shared/src/types/order.ts

Additional Layer 2:
- packages/backend/src/services/index.ts (module exports)
- packages/backend/src/repositories/PickTaskRepository.ts (related)
- packages/backend/src/routes/orders.ts (API contract)
- packages/frontend/src/pages/picking/ (UI components)
- patterns/APPROVED_PATTERNS.md (service transaction pattern)
```

---

### Layer 3: Architecture Context (Deep Understanding)

**Load Time**: ~5 minutes
**Purpose**: Understand system architecture and patterns

**What to Load**:
- Everything from Layer 2
- State machine definition
- Approved patterns library
- Database schema (relevant parts)
- Critical invariants and business rules
- Security requirements

**When to Use**:
- Cross-module changes
- Architectural decisions
- State transitions
- Complex feature implementation

**Example**: Implementing order cancellation with inventory release
```typescript
// Load these files:
From Layer 2:
- All order-related files
- All inventory-related files
- Frontend components

Additional Layer 3:
- packages/shared/src/types/workflow.ts (state machine)
- packages/backend/src/db/schema.sql (constraints)
- AI_RULES.md (transaction requirements)
- docs/DECISIONS.md (ADR-002: Database Transactions)
- docs/CODE_GRAPH.md (dependency impacts)
```

---

### Layer 4: Historical Context (Complete Understanding)

**Load Time**: ~10 minutes total
**Purpose**: Full project context with historical decisions

**What to Load**:
- Everything from Layer 3
- Architectural decision log
- Project memory (recent decisions)
- Technical debt log
- Domain knowledge base
- Known issues and workarounds

**When to Use**:
- Major refactoring
- Breaking changes
- Performance optimization
- Security improvements
- Planning future work

**Example**: Redesigning the order fulfillment workflow
```typescript
// Load these files:
From Layer 3:
- All architecture and patterns

Additional Layer 4:
- docs/DECISIONS.md (all relevant ADRs)
- .cline-memory.md (recent decisions, technical debt)
- docs/QUICK_REFERENCE.md (complete reference)
- .project-index.json (full project structure)
- Performance benchmarks
- Known issues in this area
```

---

## Loading Protocol for GLM 4.7

### Step 1: Assess Task Complexity

```
Task Complexity Matrix:
┌─────────────────────┬──────────────────┬─────────────────┐
│ Task Type           │ Complexity       │ Context Layer    │
├─────────────────────┼──────────────────┼─────────────────┤
│ Fix typo            │ Trivial          │ L1 (5 sec)      │
│ Add simple function │ Low              │ L1 (5 sec)      │
│ Fix bug             │ Low-Medium       │ L2 (2 min)      │
│ Add feature         │ Medium           │ L2 (2 min)      │
│ Refactor module     │ Medium-High      │ L3 (5 min)      │
│ State transition    │ High             │ L3 (5 min)      │
│ Cross-module change │ High             │ L3 (5 min)      │
│ Breaking change     │ Very High        │ L4 (10 min)     │
│ Major refactoring   │ Very High        │ L4 (10 min)     │
└─────────────────────┴──────────────────┴─────────────────┘
```

### Step 2: Load Appropriate Layer

**For L1 Tasks** (Trivial/Low complexity):
1. Read the target file
2. Read direct imports
3. Check for file annotations
4. Make the change

**For L2 Tasks** (Low-Medium complexity):
1. Everything from L1
2. Read all files in module directory
3. Read related services/repositories
4. Check approved patterns
5. Make the change

**For L3 Tasks** (Medium-High complexity):
1. Everything from L2
2. Read state machine definition
3. Read approved patterns
4. Read database schema
5. Review code graph for impacts
6. Make the change

**For L4 Tasks** (Very High complexity):
1. Everything from L3
2. Read architectural decisions
3. Read project memory
4. Review technical debt
5. Consider alternatives
6. Plan the change
7. Make the change

### Step 3: Verify Context Sufficiency

Before making changes, ask:
- [ ] Do I understand the file's purpose?
- [ ] Do I understand its dependencies?
- [ ] Do I understand what will break?
- [ ] Do I know the patterns to follow?
- [ ] Do I know the invariants to enforce?

If NO to any question → Load next layer

---

## Quick Reference Commands

### For GLM 4.7

```bash
# Load Layer 1 (immediate context)
"Read the file I'm editing and its direct imports"

# Load Layer 2 (module context)
"Read all files in this module and related services"

# Load Layer 3 (architecture context)
"Read state machine, patterns, and database schema for this domain"

# Load Layer 4 (full context)
"Load full project context including decisions and technical debt"
```

### For Users

```bash
# Quick task (L1)
"Add a logging statement to this function"

# Medium task (L2)
"Add a new API endpoint for batch operations"

# Complex task (L3)
"Implement undo support for order state transitions"

# Major task (L4)
"Redesign the inventory reservation system for better concurrency"
```

---

## Performance Considerations

### Token Usage by Layer

```
L1: ~2,000 tokens  (immediate file + imports)
L2: ~8,000 tokens  (module + related files)
L3: ~20,000 tokens (architecture + patterns)
L4: ~40,000 tokens (full context + history)

Total L4 load: ~70,000 tokens (within most context windows)
```

### Time Estimates

```
L1: 5 seconds   - Fast start for quick edits
L2: 2 minutes   - Most common development tasks
L3: 5 minutes   - Complex features and refactoring
L4: 10 minutes  - Major architectural work
```

---

## Context Persistence

### What to Remember Across Sessions

Store in memory between sessions:
1. **File summaries** - Brief description of each file read
2. **Pattern matches** - What patterns were seen where
3. **Dependencies discovered** - Import relationships found
4. **Decisions made** - What was decided and why

### What to Re-Load Each Session

Always load fresh:
1. **Current file state** - Files may have changed
2. **Recent decisions** - `.cline-memory.md`
3. **Test status** - What's currently passing/failing
4. **Branch context** - What branch is active

---

## Progressive Loading Example

### Scenario: Adding Undo Support for Order Picking

**Step 1**: Start with L1 (5 seconds)
```typescript
// Read:
- packages/backend/src/services/OrderService.ts (current file)
- packages/backend/src/repositories/OrderRepository.ts
- packages/shared/src/types/order.ts

// Learn:
- Current pick implementation
- How items are tracked
- What needs to be undone
```

**Step 2**: Upgrade to L2 (2 minutes)
```typescript
// Additional files:
- packages/backend/src/repositories/PickTaskRepository.ts
- packages/backend/src/routes/orders.ts
- packages/frontend/src/pages/picking/PickingPage.tsx
- packages/backend/src/services/OrderService.test.ts

// Learn:
- How pick tasks are managed
- API contract for picking
- Frontend expectations
- Test coverage
```

**Step 3**: Upgrade to L3 (5 minutes)
```typescript
// Additional files:
- packages/shared/src/types/workflow.ts (state transitions)
- patterns/APPROVED_PATTERNS.md (undo pattern)
- docs/UNDO_REVERT_PRINCIPLES.md
- packages/backend/src/db/schema.sql (audit tables)

// Learn:
- Valid state transitions for undo
- Undo patterns already approved
- How to record undo history
- Audit trail requirements
```

**Step 4**: Implement with Full Context
```typescript
// Now implement:
1. Add soft delete to pick tasks
2. Add undo API endpoint
3. Add history tracking
4. Update frontend with undo button
5. Add tests
6. Extract pattern if reusable
```

---

## Decision Tree for Context Loading

```
Start Task
    │
    ├─ Is it a trivial change (typo, logging)?
    │   └─ YES → Load L1 → Do it
    │   └─ NO  → Continue
    │
    ├─ Is it contained within one module?
    │   └─ YES → Load L2 → Do it
    │   └─ NO  → Continue
    │
    ├─ Does it involve state transitions?
    │   └─ YES → Load L3 → Do it
    │   └─ NO  → Continue
    │
    ├─ Is it a breaking change or major refactor?
    │   └─ YES → Load L4 → Plan → Do it
    │   └─ NO  → Load L3 → Do it
```

---

## Integration with Existing Files

This progressive loading system integrates with:

1. **[`.project-index.json`](../.project-index.json)** - Fast file lookup
2. **[`docs/QUICK_REFERENCE.md`](../docs/QUICK_REFERENCE.md)** - Intent recognition
3. **[`docs/CODE_GRAPH.md`](../docs/CODE_GRAPH.md)** - Dependency mapping
4. **[`docs/DECISIONS.md`](../docs/DECISIONS.md)** - Historical context (L4)
5. **[`.cline-memory.md`](../.cline-memory.md)** - Recent decisions (L4)

---

## Best Practices

### For GLM 4.7
- Start with L1 for all tasks
- Upgrade to L2 if complexity increases
- Use L3 for any state changes
- Reserve L4 for major work
- Remember file summaries between sessions

### For Users
- Specify task complexity when asking GLM to help
- Let GLM determine appropriate context level
- Trust GLM to load what it needs
- Ask for context upgrade if GLM seems confused

---

## Monitoring and Optimization

Track effectiveness:
```typescript
interface ContextLoadMetrics {
  layer: number;
  taskType: string;
  loadTime: number;
  tokensUsed: number;
  taskCompleted: boolean;
  requiredReload: boolean;
}
```

Optimize based on:
- Most frequently accessed files (preload in L1)
- Common patterns (cache in memory)
- Slow-to-load files (optimize or split)
- Frequently required L3/L4 context (consider L2 promotion)

---

**Version**: 1.0.0
**Last Updated**: 2025-01-19
**Status**: Ready for implementation
