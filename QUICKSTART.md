# Quick Start Guide for New Team Members

**Welcome to the team!** This guide will get you set up for AI-only development on the Warehouse Management System.

---

## Part 1: Project Setup (First Time Only)

### Prerequisites

You need **PostgreSQL** installed and running to use this application.

#### Installing PostgreSQL

**Option 1: Download from PostgreSQL.org**

1. Go to https://www.postgresql.org/download/windows/
2. Download and install PostgreSQL 15+
3. During installation, set a password for the `postgres` user
4. Note the installation path (default: `C:\Program Files\PostgreSQL\15`)

**Option 2: Using Chocolatey**

```powershell
choco install postgresql
```

**Option 3: Using Docker**

```powershell
docker run --name wms-postgres -e POSTGRES_PASSWORD=wms_password -e POSTGRES_DB=wms_db -p 5432:5432 -d postgres:15
```

### Setting Up the Database

**Option A: Using PostgreSQL directly**

1. **Open PostgreSQL command line** (pgAdmin or psql):

```bash
# Using psql from command line
psql -U postgres
```

2. **Create database and user**:

```sql
CREATE DATABASE wms_db;
CREATE USER wms_user WITH PASSWORD 'wms_password';
GRANT ALL PRIVILEGES ON DATABASE wms_db TO wms_user;
\q
```

**Option B: Using Docker (recommended for testing)**

```powershell
# Run PostgreSQL in Docker
docker run --name wms-postgres -e POSTGRES_PASSWORD=wms_password -e POSTGRES_DB=wms_db -p 5432:5432 -d postgres:15-alpine
```

### Install Dependencies

```bash
# From root directory
npm install

# Install package-specific dependencies
cd packages/shared && npm install
cd ../frontend && npm install
cd ../backend && npm install
cd ../ml && pip install -r requirements.txt  # If using ML features
```

### Run Database Migrations

```bash
cd packages/backend
npm run build
node dist/db/migrate.js
```

### Seed Sample Data (Optional)

```bash
node dist/db/seed.js
```

---

## Part 2: Identify Your Module

Check [MODULE_OWNERSHIP.json](MODULE_OWNERSHIP.json) to see what you own:

| Person   | Module  | Files You Own                                                                     |
| -------- | ------- | --------------------------------------------------------------------------------- |
| Friend 1 | Picking | `packages/frontend/src/pages/picking/`, `packages/backend/src/services/picking/*` |
| Friend 2 | Packing | `packages/frontend/src/pages/packing/`, `packages/backend/src/services/packing/*` |
| You      | Admin   | `packages/frontend/src/pages/admin/`, `packages/backend/src/services/admin/*`     |

**Key Point**: You can freely modify files in your owned module. Other files need team coordination.

---

## Part 3: Set Up Your AI Agent (Cline)

### Install VSCode Extension

1. Open VSCode
2. Install the "Cline" extension
3. Configure Cline to use GLM-4.7

### Cline Configuration

Cline will automatically read these rule files:

- [AI_RULES.md](AI_RULES.md) - What AI agents can/cannot do
- [CLINE_RULES.md](CLINE_RULES.md) - Execution-specific rules
- [MCP_USAGE.md](MCP_USAGE.md) - MCP tool guidelines

**You don't need to configure anything** - the rules are already in place!

---

## Part 4: Create Your Working Branch

```bash
# Friend 1 (Picking)
git checkout -b picking/main

# Friend 2 (Packing)
git checkout -b packing/main

# You (Admin)
git checkout -b admin/main
```

**Keep this branch in sync with main**:

```bash
git checkout main
git pull origin main
git checkout your-branch
git merge main
```

---

## Part 5: Daily Development Workflow

### Morning Sync (5 min, async OK)

Post in team chat:

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

### During Work

1. Open your module's files in VSCode
2. Use Cline to help with tasks
3. Let Cline read the AI rules automatically
4. If Cline wants to modify files outside your module → **STOP** and ask team

### Example Cline Conversation

```
You: "I'm working on the picking module. My owned files are:
     - packages/frontend/src/pages/picking/
     - packages/backend/src/services/picking/

     Please help me add a feature to batch-claim pick tasks."

Cline: [Reads AI_RULES.md, CLINE_RULES.md automatically]
       "I'll help you add batch pick task claiming.
        I'll stay within your owned module boundaries."
```

### End of Day (5 min, async OK)

Post in team chat:

```
✅ Completed: [what shipped]
🚧 WIP: [what's in progress]
📝 Tomorrow: [what's planned]
🐛 Issues: [any problems encountered]
```

---

## Part 6: Testing

### Before Merging Changes

```bash
# Run all tests
npm test

# Run tests for your module only (faster)
npm test -- packages/frontend/src/pages/picking/
npm test -- packages/backend/src/services/picking/

# Build to verify TypeScript
npm run build
```

**⚠️ Never merge code that fails tests**

### Start Development Servers

```bash
# From root directory
npm run dev
```

This starts:

- Backend: http://localhost:3001
- Frontend: http://localhost:5173

---

## Part 7: Merging Your Work

### When to Merge

- ✅ Tests pass
- ✅ Build succeeds
- ✅ You've reviewed AI-generated changes
- ✅ No conflicts with shared code

### Merge Process

```bash
# 1. Update main
git checkout main
git pull origin main

# 2. Merge main into your branch
git checkout your-branch
git merge main

# 3. Resolve conflicts if any
#    - Conflicts in your module → you decide
#    - Conflicts in shared code → ask team

# 4. Run tests again
npm test

# 5. Merge your branch back to main
git checkout main
git merge your-branch
git push origin main
```

---

## Part 8: When You Need Shared Code Changed

### Scenario: You need a new type definition

1. **Check who else is affected**:

   ```
   Post in team chat:
   "I need to add BatchClaimDTO to packages/shared/src/types/index.ts
    Anyone working on code that depends on this?"
   ```

2. **Wait for response** (typically quick response)

3. **Make the change together** or **designate someone** to do it

### What If Someone Says No?

- They might be working on conflicting changes
- Ask them when they'll be done
- Wait or adjust your approach

---

## Part 9: Handling Problems

### Tests Fail After Your Changes

1. Check if failure is in **your module** → fix it
2. Check if failure is in **other module** → notify owner
3. Check if failure is in **shared code** → coordinate with team

### Merge Conflicts

**In your module**: You decide how to resolve

**In shared code**: Discuss with team

**In other module**: Ask module owner to resolve

### Production Bugs

**In your module**: Fix it yourself (no coordination needed)

**In other module**: Notify owner, let them fix

**In shared code**: Team decision on who fixes

---

## Important Rules to Remember

### ✅ DO

- Work independently on your owned module
- Run tests before merging
- Communicate blockers early
- Ask before touching shared code
- Trust AI within boundaries
- Review AI-generated changes

### ❌ DON'T

- Modify someone else's module without asking
- Skip tests before merging
- Change database schema without team decision
- Bypass AI rules
- Merge broken code
- Leave conflicts unresolved

---

## Quick Reference Commands

```bash
# Check if you can modify a file
npx ts-node scripts/check-ownership.ts you packages/shared/src/types/index.ts

# Run all tests
npm test

# Run your module's tests
npm test -- packages/frontend/src/pages/picking/

# Build project
npm run build

# Sync your branch with main
git checkout main && git pull && git checkout your-branch && git merge main

# See your owned files
# Check MODULE_OWNERSHIP.json for your "ownedPaths"
```

---

## Files You Should Read

**Must Read**:

- [AI_RULES.md](AI_RULES.md) - What AI can/cannot do
- [CLINE_RULES.md](CLINE_RULES.md) - Execution rules
- [TEAM_OPERATIONS.md](TEAM_OPERATIONS.md) - Team workflows

**Reference**:

- [MODULE_OWNERSHIP.json](MODULE_OWNERSHIP.json) - Who owns what
- [MCP_USAGE.md](MCP_USAGE.md) - MCP tool guidelines

---

## Access the Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001
- **Health Check**: http://localhost:3001/health

### Default Login Credentials

- **Email**: john.picker@wms.local
- **Password**: password123

---

## Getting Help

### Stuck on a Problem?

1. **Check AI rules first** - Most issues are covered
2. **Post in team chat** - With context and what you've tried
3. **Schedule call** - If async doesn't resolve in 15 minutes

### Quick Questions

- "Can I modify this file?" → Use `check-ownership.ts`
- "Who owns this code?" → Check `MODULE_OWNERSHIP.json`
- "Is this allowed?" → Check `AI_RULES.md`

---

## Success Tips

1. **Start small** - Make minor changes first to learn the system
2. **Communicate early** - Don't wait until you're blocked
3. **Trust the AI** - It's configured with all the rules
4. **Review changes** - AI makes mistakes, you're responsible
5. **Run tests often** - Catch issues early
6. **Stay in your lane** - Focus on your module

---

## What Makes This Work

### Clear Boundaries

- Each person owns specific files
- Shared code requires coordination
- No ambiguity about responsibility

### AI Guardrails

- Rules prevent architectural mistakes
- Type safety prevents runtime errors
- Automated checking prevents boundary violations

### Over-Communication

- Daily syncs (even async)
- Coordination before shared changes
- Quick resolution of conflicts

### Trust but Verify

- Trust AI within boundaries
- Review all changes
- Run tests before merging

---

## Welcome Aboard!

You're joining an experiment in **AI-only team development**. This is cutting edge, and we're all learning together.

**Key principles**:

- Each person works primarily independently
- Periodic team coordination
- AI helps you go faster
- You own the quality and coordination

**Questions?** Just ask in the team chat. We're all figuring this out together.

---

## Troubleshooting

### "Connection refused" error

- Make sure PostgreSQL is running
- Check that DB_HOST, DB_PORT, DB_USER, DB_PASSWORD in `packages/backend/.env` match your PostgreSQL setup

### "Database does not exist" error

- Run the migration script: `node packages/backend/dist/db/migrate.js`

### Port already in use

- Change PORT in `packages/backend/.env` (default: 3001)
- Or stop the process using that port

### Module not found errors

- Run `npm install` again
- Run `npm run build` to compile TypeScript

---

_Last updated: 2025-01-12_
_Version: 1.0.0_

## Prerequisites

You need **PostgreSQL** installed and running to use this application.

### Installing PostgreSQL

#### Option 1: Download from PostgreSQL.org

1. Go to https://www.postgresql.org/download/windows/
2. Download and install PostgreSQL 15+
3. During installation, set a password for the `postgres` user
4. Note the installation path (default: `C:\Program Files\PostgreSQL\15`)

#### Option 2: Using Chocolatey

```powershell
choco install postgresql
```

#### Option 3: Using Docker

```powershell
docker run --name wms-postgres -e POSTGRES_PASSWORD=wms_password -e POSTGRES_DB=wms_db -p 5432:5432 -d postgres:15
```

## Setting Up the Database

### Option A: Using PostgreSQL directly

1. **Open PostgreSQL command line** (pgAdmin or psql):

```bash
# Using psql from command line
psql -U postgres
```

2. **Create database and user**:

```sql
CREATE DATABASE wms_db;
CREATE USER wms_user WITH PASSWORD 'wms_password';
GRANT ALL PRIVILEGES ON DATABASE wms_db TO wms_user;
\q
```

### Option B: Using Docker (recommended for testing)

```powershell
# Run PostgreSQL in Docker
docker run --name wms-postgres -e POSTGRES_PASSWORD=wms_password -e POSTGRES_DB=wms_db -p 5432:5432 -d postgres:15-alpine

# To stop later: docker stop wms-postgres
# To start again: docker start wms-postgres
```

## Starting the Application

Once PostgreSQL is running:

### 1. Dependencies already installed

```bash
# npm install already completed
```

### 2. Run database migrations

```bash
cd packages/backend
npm run build
node dist/db/migrate.js
```

### 3. Seed sample data

```bash
node dist/db/seed.js
```

### 4. Start the application

```bash
# From root directory
npm run dev
```

## Access the Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001
- **Health Check**: http://localhost:3001/health

## Default Login Credentials

- **Email**: john.picker@wms.local
- **Password**: password123

## Troubleshooting

### "Connection refused" error

- Make sure PostgreSQL is running
- Check that DB_HOST, DB_PORT, DB_USER, DB_PASSWORD in `packages/backend/.env` match your PostgreSQL setup

### "Database does not exist" error

- Run the migration script: `node packages/backend/dist/db/migrate.js`

### Port already in use

- Change PORT in `packages/backend/.env` (default: 3001)
- Or stop the process using that port

### Module not found errors

- Run `npm install` again
- Run `npm run build` to compile TypeScript
