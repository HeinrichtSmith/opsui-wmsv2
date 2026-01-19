# Automated Pattern Extraction System

**Purpose**: Automatically extract, catalog, and suggest code patterns for GLM 4.7 to build a reusable pattern library.

**Version**: 1.0.0
**Last Updated**: 2025-01-19

---

## Concept

As GLM 4.7 works on tasks, it should:

1. **Recognize** reusable patterns in code
2. **Extract** the pattern with metadata
3. **Catalog** it in the pattern library
4. **Suggest** it for similar future tasks

---

## Pattern Extraction Protocol

### When to Extract Patterns

Extract a pattern when:

- ✅ Same code structure appears 3+ times
- ✅ Solution is non-trivial (>10 lines)
- ✅ Pattern is reusable across modules
- ✅ Pattern follows best practices
- ✅ Pattern is tested and working

**Don't extract when**:

- ❌ Code is trivial (<5 lines)
- ❌ Pattern is specific to one use case
- ❌ Code is messy or needs refactoring
- ❌ Pattern violates best practices

---

## Pattern Template

```yaml
name: descriptive_pattern_name
category: Transaction|Validation|ErrorHandling|Query|Auth|UI|State
complexity: low|medium|high
frequency: common|occasional|rare

description: |
  Brief 2-3 sentence description of what this pattern does
  and when to use it.

problem: |
  What problem does this pattern solve?

solution: |
  How this pattern solves the problem.

when_to_use:
  - Condition 1
  - Condition 2

when_not_to_use:
  - Condition 1
  - Condition 2

code_example: |
  // Complete, working code example
  // Include imports if needed

benefits:
  - Benefit 1
  - Benefit 2

tradeoffs:
  - Tradeoff 1
  - Tradeoff 2

related_patterns:
  - pattern_name_1
  - pattern_name_2

see_also:
  - Link to related documentation
  - Link to related files

extracted_from:
  - file1.ts
  - file2.ts

extracted_date: YYYY-MM-DD
tested: yes|no
test_coverage: percentage
```

---

## Pattern Extraction Workflow

### Step 1: Code Analysis

After completing a task, GLM 4.7 should analyze:

```typescript
// Ask these questions:
1. Did I write similar code before?
2. Is this pattern reusable?
3. Would this help in future tasks?
4. Is the code clean and tested?
```

### Step 2: Pattern Recognition

Look for patterns in:

- **Transaction patterns**: How multi-step operations are atomic
- **Validation patterns**: How input is validated
- **Error handling patterns**: How errors are mapped
- **Query patterns**: How data is fetched efficiently
- **State patterns**: How state transitions happen
- **UI patterns**: How components are structured

### Step 3: Pattern Extraction

Extract the pattern:

1. Remove business-specific details
2. Generalize variable names
3. Add documentation
4. Create working example
5. Add to pattern library

### Step 4: Pattern Cataloging

Store in [`patterns/APPROVED_PATTERNS.md`](../patterns/APPROVED_PATTERNS.md) with:

- Pattern name and category
- Code example
- Usage guidelines
- Related patterns

---

## Example: Extracting a Pattern

### Original Code (OrderService.ts)

```typescript
async claimOrder(orderId: string, pickerId: string): Promise<Order> {
  return await db.transaction(async (trx) => {
    // Check picker capacity
    const activeCount = await trx('orders')
      .where({ picker_id: pickerId, status: 'PICKING' })
      .count('* as count')
      .first();

    if (activeCount.count >= 10) {
      throw new ConflictError('Picker has reached maximum active orders');
    }

    // Claim order
    const order = await trx('orders')
      .where({ order_id: orderId })
      .update({ status: 'PICKING', picker_id: pickerId })
      .returning('*')
      .first();

    return order;
  });
}
```

### Extracted Pattern

```yaml
name: transaction_with_capacity_check
category: Transaction
complexity: medium
frequency: common

description: |
  Wraps multiple database operations in a transaction while
  checking a capacity constraint before proceeding.

problem: |
  Need to check a constraint (like capacity) and then perform
  an operation, ensuring both happen atomically.

solution: |
  Use a database transaction to check capacity and perform
  the operation. If capacity is exceeded, throw an error
  before making any changes.

when_to_use:
  - Checking user limits before action
  - Checking resource availability
  - Any capacity-constrained operation

when_not_to_use:
  - Simple CRUD operations
  - Operations without constraints

code_example: |
  async operationWithCapacityCheck(
    resourceId: string,
    userId: string,
    capacity: number
  ) {
    return await db.transaction(async (trx) => {
      // Check capacity
      const current = await trx('resources')
        .where({ user_id: userId })
        .count('* as count')
        .first();

      if (current.count >= capacity) {
        throw new ConflictError('Capacity exceeded');
      }

      // Perform operation
      const result = await trx('resources')
        .where({ id: resourceId })
        .update({ status: 'ACTIVE' })
        .returning('*')
        .first();

      return result;
    });
  }

benefits:
  - Atomic: All-or-nothing operation
  - Safe: No race conditions
  - Clear: Easy to understand

tradeoffs:
  - Slight overhead from transaction
  - Requires database transaction support

related_patterns:
  - service_layer_transaction
  - resource_reservation

see_also:
  - docs/DECISIONS.md (ADR-002: Database Transactions)

extracted_from:
  - packages/backend/src/services/OrderService.ts (claimOrder)
  - packages/backend/src/services/InventoryService.ts (reserveInventory)

extracted_date: 2025-01-19
tested: yes
test_coverage: 90%
```

---

## Pattern Categories

### Transaction Patterns

- `service_layer_transaction` - Basic transaction wrapper
- `transaction_with_capacity_check` - Transaction with constraint
- `transaction_with_rollback` - Complex transaction with rollback logic

### Validation Patterns

- `input_validation_with_joi` - Request validation
- `state_transition_validation` - State machine validation
- `invariant_check` - Business rule validation

### Error Handling Patterns

- `error_mapping` - Map database errors to domain errors
- `error_handler_middleware` - Express error handling
- `async_error_wrapper` - Wrap async functions with error handling

### Query Patterns

- `eager_loading` - Prevent N+1 queries
- `pagination` - Paginated list responses
- `filtered_search` - Search with multiple filters

### Authentication Patterns

- `jwt_auth_required` - Protected route
- `role_based_access` - Role checking
- `token_refresh` - Refresh token flow

### UI Patterns

- `form_with_validation` - Form with validation
- `list_with_pagination` - Paginated list
- `modal_with_confirm` - Confirmation modal

---

## Pattern Search & Suggestion

### How GLM 4.7 Should Use Patterns

When starting a task:

```typescript
// 1. Analyze the task
const taskType = analyzeTask(userRequest);

// 2. Search for relevant patterns
const patterns = searchPatterns(taskType);

// 3. Suggest pattern if found
if (patterns.length > 0) {
  suggestPattern(patterns[0]);
}

// 4. Apply pattern if user agrees
if (userAgrees) {
  applyPattern(patterns[0]);
}
```

### Search by Category

```
User: "I need to add a new API endpoint"
GLM: "This requires:
      - Input validation pattern
      - Service layer pattern
      - Error handling pattern

      Let me load these patterns and apply them..."
```

### Search by Problem

```
User: "I need to prevent overselling inventory"
GLM: "This sounds like a resource reservation problem.
      I found the 'resource_reservation' pattern that uses
      SELECT FOR UPDATE to prevent race conditions.

      Shall I apply this pattern?"
```

---

## Pattern Metadata Schema

```typescript
interface Pattern {
  // Identification
  name: string;
  category: PatternCategory;
  id: string; // Generated from name

  // Classification
  complexity: 'low' | 'medium' | 'high';
  frequency: 'common' | 'occasional' | 'rare';

  // Documentation
  description: string;
  problem: string;
  solution: string;
  when_to_use: string[];
  when_not_to_use: string[];

  // Code
  code_example: string;
  benefits: string[];
  tradeoffs: string[];

  // Relationships
  related_patterns: string[];
  see_also: string[];

  // Provenance
  extracted_from: string[];
  extracted_date: string;
  tested: boolean;
  test_coverage: number;

  // Usage tracking
  times_used: number;
  last_used: string;
  success_rate: number;
}
```

---

## Pattern Library Structure

```
patterns/
├── APPROVED_PATTERNS.md      # Human-readable pattern catalog
├── patterns.json              # Machine-readable pattern data
├── categories/
│   ├── transactions.md
│   ├── validation.md
│   ├── error_handling.md
│   └── queries.md
└── examples/
    ├── transaction_examples.ts
    ├── validation_examples.ts
    └── error_handling_examples.ts
```

---

## Automated Extraction Script

### Concept

Create a script that:

1. Scans codebase for similar code blocks
2. Identifies potential patterns
3. Asks GLM 4.7 to review and approve
4. Adds to pattern library

### Pseudo-code

```typescript
// scripts/extract-patterns.ts

async function extractPatterns() {
  // 1. Scan codebase
  const files = await scanCodebase('packages/**/*.ts');

  // 2. Find similar code blocks
  const similarBlocks = findSimilarCodeBlocks(files);

  // 3. For each similar block
  for (const block of similarBlocks) {
    if (block.occurrences >= 3) {
      // 4. Extract pattern
      const pattern = await extractPattern(block);

      // 5. Ask for approval
      const approved = await askForApproval(pattern);

      if (approved) {
        // 6. Add to library
        await addToPatternLibrary(pattern);
      }
    }
  }
}
```

---

## Pattern Versioning

Patterns evolve over time:

```yaml
name: transaction_with_capacity_check
version: 2.0.0
last_updated: 2025-01-19

changelog:
  - version: 2.0.0
    date: 2025-01-19
    changes:
      - Added support for custom capacity limits
      - Improved error messages
      - Added TypeScript generics

  - version: 1.0.0
    date: 2024-12-01
    changes:
      - Initial pattern extraction
```

---

## Pattern Quality Metrics

Track pattern effectiveness:

```typescript
interface PatternMetrics {
  pattern_id: string;

  // Usage
  times_suggested: number;
  times_used: number;
  acceptance_rate: number;

  // Success
  successful_uses: number;
  failed_uses: number;
  success_rate: number;

  // Time saved
  avg_time_saved: number; // in minutes

  // Quality
  user_rating: number;
  bug_reports: number;
}
```

---

## Integration with GLM 4.7 Workflow

### When GLM 4.7 Completes a Task

```typescript
// After completing a task:
async function afterTask(task: Task) {
  // 1. Analyze what was done
  const analysis = analyzeCodeChanges(task.changes);

  // 2. Look for reusable patterns
  const potentialPatterns = identifyPatterns(analysis);

  // 3. For each potential pattern
  for (const pattern of potentialPatterns) {
    // 4. Check if pattern already exists
    if (!patternExists(pattern)) {
      // 5. Ask to extract
      const shouldExtract = await askUser(
        `Found reusable pattern: ${pattern.name}. Extract it?`
      );

      if (shouldExtract) {
        await extractPattern(pattern);
      }
    }
  }
}
```

### When GLM 4.7 Starts a Task

```typescript
// Before starting a task:
async function beforeTask(task: Task) {
  // 1. Understand task requirements
  const requirements = analyzeRequirements(task.description);

  // 2. Search for relevant patterns
  const patterns = searchPatterns(requirements);

  // 3. Suggest patterns
  if (patterns.length > 0) {
    await suggestPatterns(patterns);
  }

  // 4. Load pattern code if approved
  if (userApproves) {
    await loadPatterns(patterns);
  }
}
```

---

## Pattern Search Algorithm

### By Category

```typescript
function searchByCategory(category: PatternCategory): Pattern[] {
  return patterns.filter(p => p.category === category);
}
```

### By Problem

```typescript
function searchByProblem(description: string): Pattern[] {
  const keywords = extractKeywords(description);
  return patterns.filter(
    p => p.problem.includes(keywords) || p.description.includes(keywords)
  );
}
```

### By Similarity

```typescript
function searchBySimilarity(code: string): Pattern[] {
  const codeFeatures = extractFeatures(code);
  return patterns
    .map(p => ({
      pattern: p,
      similarity: compareFeatures(codeFeatures, p.features),
    }))
    .filter(r => r.similarity > 0.7)
    .sort((a, b) => b.similarity - a.similarity)
    .map(r => r.pattern);
}
```

---

## Quick Reference for GLM 4.7

### Pattern Extraction Checklist

After completing a non-trivial task:

- [ ] Did I write code that could be reused?
- [ ] Is this pattern similar to existing patterns?
- [ ] Is the code clean and tested?
- [ ] Would this help in future tasks?
- [ ] Should I extract this pattern?

### Pattern Application Checklist

Before starting a task:

- [ ] What category of work is this?
- [ ] Are there existing patterns for this?
- [ ] Should I use an existing pattern?
- [ ] Can I improve an existing pattern?

---

## Future Enhancements

1. **Automatic extraction**: Script to find patterns automatically
2. **Pattern versioning**: Track pattern evolution
3. **Pattern testing**: Test patterns independently
4. **Pattern metrics**: Track usage and success rates
5. **Pattern recommendations**: Suggest patterns based on context

---

## Integration with Existing Files

This pattern system integrates with:

- [`patterns/APPROVED_PATTERNS.md`](../patterns/APPROVED_PATTERNS.md) - Pattern catalog
- [`docs/DECISIONS.md`](../docs/DECISIONS.md) - Architectural decisions
- [`docs/CODE_GRAPH.md`](../docs/CODE_GRAPH.md) - Dependency mapping

---

**Version**: 1.0.0
**Last Updated**: 2025-01-19
**Status**: Ready for implementation
**Next Step**: Create extraction script
