# Team Operations Guide for AI-Only Development

**Purpose**: Protocols for sustainable, effective team-based development using AI agents (Cline + GLM-4.7).

**Version**: 1.0.0
**Last Updated**: 2025-01-12

---

## Team Structure

### Current Team (3 People)

| Role | Owner | Scope | Responsibilities |
|------|-------|-------|------------------|
| **Picking Module** | Friend 1 | `packages/frontend/src/pages/picking/`<br>`packages/backend/src/services/picking*`<br>`packages/backend/src/controllers/picking*` | Picker workflow, pick task management, bin location validation |
| **Packing Module** | Friend 2 | `packages/frontend/src/pages/packing/`<br>`packages/backend/src/services/packing*`<br>`packages/backend/src/controllers/packing*` | Packer workflow, shipment preparation, packaging verification |
| **Admin Dashboard** | You | `packages/frontend/src/pages/admin/`<br>`packages/backend/src/services/analytics*`<br>`packages/backend/src/services/user*` | User management, reports, settings, supervision |

### Shared/Conflict Zones (REQUIRES COORDINATION)

These areas belong to NO ONE and require team consensus before modification:

```
packages/shared/              # ALL team members - coordinate changes
packages/backend/src/db/      # DB schema - requires team approval
packages/backend/src/models/  # Data models - coordinate with owner of related module
packages/ml/                  # ML pipeline - specialist only or team decision
```

**Rule**: Before touching shared code, post in team chat: *"Planning to modify X, anyone working on dependent code?"*

---

## Daily Workflow

### 1. Morning Sync (15 minutes, async OK)

Each person posts:
```
🟢 Working on: [feature/bug]
📍 Files: [expected scope]
🔗 Depends on: [shared code touched, if any]
⚠️ Blocking: [anything blocking progress]
```

**Example**:
```
🟢 Working on: Pick task batch claiming feature
📍 Files: packages/frontend/src/pages/picking/, packages/backend/src/services/picking/
🔗 Depends on: packages/shared/src/types/ (planning to add BatchClaimDTO)
⚠️ Blocking: None
```

### 2. Development Work

**Each person works independently on their owned modules.**

When you need shared code changed:
1. **Check if someone else is touching it** (see morning sync)
2. **Propose the change** in team chat with context
3. **Wait for approval** (5-10 min typically)
4. **Make the change** together or designate owner

### 3. End of Day (5 minutes, async)

Each person posts:
```
✅ Completed: [what shipped]
🚧 WIP: [what's in progress]
📝 Tomorrow: [what's planned]
🐛 Issues: [any problems encountered]
```

---

## Branching Strategy

### Primary Branches

```
main                    # Production-ready code
  ├── picking           # Friend 1's working branch
  ├── packing           # Friend 2's working branch
  └── admin             # Your working branch
```

### Branch Naming Convention

```
{owner}/{short-description}

Examples:
  friend1/pick-task-batching
  friend2/shipment-labels
  you/admin-user-roles
```

### Merge Protocol

**Each person merges to main independently when ready:**

```bash
# 1. Update your branch with latest main
git checkout main
git pull origin main

# 2. Merge main into your working branch
git checkout your-branch
git merge main

# 3. Fix any conflicts (rare if modules are separate)
# 4. Run tests
npm test

# 5. Merge back to main
git checkout main
git merge your-branch
git push origin main
```

**Conflict Resolution**:
- If conflict is in **your module**: You decide
- If conflict is in **shared code**: Discuss in team chat
- If conflict is in **someone else's module**: Ask them to resolve

---

## Communication Protocols

### When to Coordinate

**Required coordination for:**
- Changing `packages/shared/src/types/`
- Modifying database schema
- Changing API contracts between modules
- Updating dependencies (package.json)
- Performance changes that affect other modules

**Independent work (no coordination needed):**
- Bug fixes in your owned modules
- UI changes in your owned pages
- New features in your owned modules
- Tests for your owned code

### Decision Making

**Quick decisions (< 5 min discussion):**
- Bug fixes
- Small refactorings
- Test improvements
- Documentation updates

**Team decisions (requires all 3):**
- Database schema changes
- New shared types
- Breaking changes to APIs
- Dependency upgrades
- Architecture changes

**Veto power**: Anyone can veto a change if it breaks their module. Must propose alternative.

---

## Module Ownership Boundaries

### Picking Module (Friend 1)

**Owns**:
```
packages/frontend/src/pages/picking/*
packages/frontend/src/components/PickTaskList*
packages/frontend/src/components/BinScanner*
packages/backend/src/services/picking*
packages/backend/src/controllers/picking*
packages/backend/src/repositories/picking*
```

**Can modify without asking**:
- Any of the above files
- Create new components in their module

**Must coordinate before changing**:
- `packages/shared/src/types/` (if adding PickTask-related types)
- `packages/backend/src/services/order*` (if order service needs changes)

### Packing Module (Friend 2)

**Owns**:
```
packages/frontend/src/pages/packing/*
packages/frontend/src/components/PackingList*
packages/frontend/src/components/LabelPrinter*
packages/backend/src/services/packing*
packages/backend/src/controllers/packing*
packages/backend/src/repositories/packing*
```

**Can modify without asking**:
- Any of the above files
- Create new components in their module

**Must coordinate before changing**:
- `packages/shared/src/types/` (if adding Shipment-related types)
- `packages/backend/src/services/order*` (if order service needs changes)

### Admin Dashboard (You)

**Owns**:
```
packages/frontend/src/pages/admin/*
packages/frontend/src/components/Analytics*
packages/frontend/src/components/UserManagement*
packages/backend/src/services/analytics*
packages/backend/src/services/user*
packages/backend/src/controllers/admin*
packages/backend/src/repositories/user*
```

**Can modify without asking**:
- Any of the above files
- Create new components in their module

**Must coordinate before changing**:
- `packages/shared/src/types/` (if adding Admin-related types)
- Auth/permission system (affects everyone)

---

## AI Agent Workflow

### 1. Task Assignment

When working with your AI agent (Cline):

```
"I'm working on the [MODULE] module.
My owned files are: [list]
Any changes outside these files need team coordination.
Please help me [task description]."
```

### 2. Scope Enforcement

Before AI makes changes, verify:

```typescript
// AI should check:
const isOwnedFile = (filePath: string) => {
  const ownedPaths = [
    'packages/frontend/src/pages/picking/',
    'packages/backend/src/services/picking/'
    // ... your owned paths
  ];

  return ownedPaths.some(path => filePath.startsWith(path));
};

// If AI wants to modify non-owned file, it should ask:
if (!isOwnedFile(aiSuggestedFile)) {
  console.log('⚠️ This file is outside my owned module. I need to coordinate with the team.');
}
```

### 3. Shared Code Changes

When you need shared code changed:

**Step 1**: Ask AI to analyze impact
```typescript
"Analyze what changes are needed in packages/shared/src/types/
to support my new feature. List all files that would be affected."
```

**Step 2**: Propose to team
```
"Hey team, I'm adding [feature]. This requires changes to:
- packages/shared/src/types/index.ts (add NewFeatureDTO)
- packages/backend/src/services/order.ts (add new method)

Anyone working on code that depends on these?"
```

**Step 3**: After approval, make changes together or designate owner

---

## Testing Strategy

### Module-Isolated Testing

Each person runs tests for their module:

```bash
# Friend 1 - Picking
npm test -- packages/frontend/src/pages/picking/
npm test -- packages/backend/src/services/picking/

# Friend 2 - Packing
npm test -- packages/frontend/src/pages/packing/
npm test -- packages/backend/src/services/packing/

# You - Admin
npm test -- packages/frontend/src/pages/admin/
npm test -- packages/backend/src/services/admin/
```

### Integration Testing

Before merging to main:

```bash
# Run full test suite
npm test

# If tests fail:
# 1. Check if failure is in your module → fix it
# 2. Check if failure is in shared code → coordinate with team
# 3. Check if failure is in other module → notify owner
```

### Regression Testing

After anyone merges to main:

```bash
# Everyone runs:
npm test
npm run build

# If anything breaks, notify the person who merged
```

---

## Continuous Integration (Recommended)

### GitHub Actions Workflow

Create `.github/workflows/test.yml`:

```yaml
name: Test Suite

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_DB: wms_db
          POSTGRES_USER: wms_user
          POSTGRES_PASSWORD: wms_password
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test
        env:
          DB_HOST: localhost
          DB_PORT: 5432
          DB_NAME: wms_db
          DB_USER: wms_user
          DB_PASSWORD: wms_password

      - name: Build
        run: npm run build
```

**This means**: Tests run automatically on every PR/merge. If tests fail, merge is blocked.

---

## Conflict Prevention

### Module Boundary API Design

**Key principle**: Modules communicate through well-defined APIs, not shared mutable state.

**Good**:
```typescript
// Picking module exposes clean API
export class PickingService {
  async claimPickTask(taskId: string, pickerId: string): Promise<PickTask> {
    // Encapsulated logic
  }
}
```

**Bad**:
```typescript
// Picking module reaches into other module's internals
import { OrderService } from './order';
orderService.internalDoSomething(); // Breaks encapsulation
```

### Interface Segregation

Each module defines its own interfaces in shared types:

```typescript
// packages/shared/src/types/picking.ts
export interface PickTaskDTO {
  id: string;
  orderId: string;
  sku: string;
  quantity: number;
  binLocation: string;
  status: TaskStatus;
}

// packages/shared/src/types/packing.ts
export interface ShipmentDTO {
  id: string;
  orderId: string;
  carrier: string;
  trackingNumber: string;
  status: ShipmentStatus;
}
```

**Rule**: Don't modify another module's DTO without their permission.

---

## Code Review Process (AI-Assisted)

### Self-Review (Before Merging)

Before merging, ask AI agent:

```
"Review my changes for:
1. Rule violations (check AI_RULES.md)
2. Type safety issues
3. Test coverage gaps
4. Performance concerns
5. Any code outside my owned module"

Generate a summary report.
```

### Peer Review (Optional, Recommended)

For complex changes:

```
"Hey [friend], I just finished [feature].
Can you have your AI agent review:
- Integration points with your module
- API contract changes
- Any shared code we both touch

Link: [GitHub PR or diff]"
```

---

## Handling Emergencies

### Production Bug in Your Module

**You fix it** (no coordination needed unless touching shared code):

```
1. Create hotfix branch
2. Fix the bug
3. Run tests
4. Merge to main
5. Deploy
6. Notify team after fix is deployed
```

### Production Bug in Someone Else's Module

**Notify owner, let them fix**:

```
"🚨 Bug found in [module]:
[Description]
[Steps to reproduce]
[Impact]

@owner - can you investigate? I'm available to help if needed."
```

### Production Bug in Shared Code

**Team decision**:

```
"🚨 Bug in shared code:
[Location]
[Description]
[Impact]

Priority: [CRITICAL/HIGH/MEDIUM/LOW]
Who can take this?"
```

---

## Documentation Standards

### Code Ownership Markers

Add ownership comments to key files:

```typescript
/**
 * Picking Service
 *
 * OWNER: @friend1 (Team Picking)
 *
 * Changes to this file should be coordinated with:
 * - @friend2 (Packing module) - for order status transitions
 * - @you (Admin) - for picker management
 *
 * @module packages/backend/src/services/picking
 */
```

### Change Documentation

When modifying shared code:

```typescript
/**
 * Added BatchClaimDTO to support batch picking feature
 *
 * CHANGE DATE: 2025-01-12
 * CHANGED BY: @friend1 (Team Picking)
 * REVIEWED BY: @you (Team Admin)
 *
 * AFFECTS:
 * - packages/backend/src/services/picking/*
 * - packages/frontend/src/pages/picking/*
 *
 * MIGRATION NOTES: None (backwards compatible)
 */
```

---

## Scaling the Team

### Adding a 4th Person

**New module options**:
- Shipping/Carrier integration
- Inventory management
- Reporting/Analytics (separate from admin)
- Mobile apps (Picking/Packing mobile apps)

**Process**:
1. Define new module boundaries
2. Update this document with new ownership
3. Create new branch for new module
4. Establish integration APIs with existing modules

### Splitting Existing Modules

If a module grows too large:

```
Picking Module → Picking Core + Picking Analytics
                    ↓                ↓
                 @friend1         @friend3
```

**Process**:
1. Team decision on split
2. Define new boundaries
3. Migrate tests
4. Update ownership docs

---

## Success Metrics

Track these metrics weekly:

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Merge conflicts | < 2 per week | Git logs |
| Test failures | < 5% of commits | CI/CD logs |
| Shared code changes | < 10 per week | Git diff stats |
| Time to merge | < 1 day | PR cycle time |
| Bugs per module | < 3 per week | Issue tracker |

**Review metrics in weekly team sync** (30 min, Friday afternoon).

---

## Industry Standards We're Following

### DevOps Practices
- ✅ Feature branches
- ✅ Automated testing
- ✅ CI/CD pipeline (recommended)
- ✅ Peer review (AI-assisted)

### Agile Practices
- ✅ Daily standup (async)
- ✅ Iterative development
- ✅ Task ownership
- ✅ Continuous integration

### Software Engineering
- ✅ Module boundaries
- ✅ Type safety
- ✅ Testing standards
- ✅ Documentation

### AI-Specific
- ✅ AI rule files
- ✅ Invariant enforcement
- ✅ Schema synchronization
- ✅ Execution-only behavior

---

## Quick Reference

### DO ✅
- Work independently on owned modules
- Coordinate before touching shared code
- Run tests before merging
- Communicate blockers early
- Trust AI agents within boundaries
- Review AI-generated changes

### DON'T ❌
- Modify someone else's module without asking
- Skip tests before merging
- Change database schema without team decision
- Bypass AI rules
- Merge broken code
- Leave conflicts unresolved

---

## Emergency Contacts

When something goes wrong and you need immediate help:

1. **Check AI_RULES.md** - Most issues are covered there
2. **Check CLINE_RULES.md** - Execution-specific guidance
3. **Post in team chat** - With context and what you've tried
4. **Schedule call** - If async doesn't resolve in 15 minutes

---

## Conclusion

This workflow is **experimental** but based on solid software engineering principles. The key to success:

1. **Clear boundaries** - Everyone knows what they own
2. **Over-communication** - When in doubt, ask the team
3. **Trust but verify** - Run tests, review changes
4. **Iterate** - Adjust this process as you learn

**Goal**: Each person works 80% independently, 20% coordinating. If you're spending more time coordinating than building, adjust boundaries.

---

*Remember: The AI agents are tools, not team members. You and your friends are responsible for the software. The AI helps you work faster, but you own the quality and coordination.*
