# Development Server Startup Guide

**Purpose**: Foolproof guide for starting and stopping development servers.

**Last Updated**: 2025-01-19

---

## Quick Start (The Only Way You Need)

### Start Everything

```bash
npm run dev
```

**This command will**:
1. ✅ Check prerequisites (Node.js, PostgreSQL)
2. ✅ Kill any existing processes on ports 3001 and 5173
3. ✅ Verify database connection
4. ✅ Start backend server (port 3001)
5. ✅ Wait for backend to be healthy
6. ✅ Start frontend server (port 5173)
7. ✅ Show you the URLs

**Press Ctrl+C to stop all servers**

---

## Available Commands

### Starting Servers

| Command | What It Does | When to Use |
|---------|--------------|-------------|
| `npm run dev` | **Start everything** (recommended) | Everyday development |
| `npm run dev:start` | Same as `npm run dev` | Alternative syntax |
| `npm run dev:restart` | Kill all + start fresh | When things are broken |
| `npm run dev:smart` | Advanced monitoring | For advanced users |
| `npm run dev:safe` | Safe mode with checks | When having issues |

### Stopping Servers

| Command | What It Does | When to Use |
|---------|--------------|-------------|
| `npm run dev:stop` | **Stop all servers** (recommended) | Normal shutdown |
| Ctrl+C | Stop all servers | When servers are running in terminal |

### Individual Servers

| Command | What It Does | When to Use |
|---------|--------------|-------------|
| `npm run dev:backend` | Start backend only | Backend-only work |
| `npm run dev:frontend` | Start frontend only | Frontend-only work |

---

## What the Startup Script Does (Step by Step)

### Step 1: Check Prerequisites (5 seconds)

```
✓ Node.js version 20+ detected
✓ PostgreSQL is running
✓ Backend .env file exists
```

**If this fails**:
- **Node.js too old**: Install Node.js 20+ from nodejs.org
- **PostgreSQL not running**:
  - Windows: Start PostgreSQL service from Services
  - Docker: `docker run --name wms-postgres -e POSTGRES_PASSWORD=wms_password -e POSTGRES_DB=wms_db -p 5432:5432 -d postgres:15`
- **.env missing**: Script creates it from .env.example automatically

### Step 2: Clean Up Existing Processes (5 seconds)

```
Checking port 3001...
Checking port 5173...
```

**If ports are in use**:
- Script automatically kills processes on ports 3001 and 5173
- Waits 2 seconds for ports to be released
- **No manual intervention needed**

### Step 3: Verify Database Connection (5 seconds)

```
✓ Database connection successful
✓ Database tables exist
```

**If this fails**:
- Check PostgreSQL is running
- Check `packages/backend/.env` has correct credentials:
  ```env
  DB_HOST=localhost
  DB_PORT=5432
  DB_NAME=wms_db
  DB_USER=wms_user
  DB_PASSWORD=wms_password
  ```
- If database doesn't exist:
  ```sql
  CREATE DATABASE wms_db;
  CREATE USER wms_user WITH PASSWORD 'wms_password';
  GRANT ALL PRIVILEGES ON DATABASE wms_db TO wms_user;
  ```

### Step 4: Start Backend Server (~10 seconds)

```
[Backend] Starting development server...
[Backend] Server listening on port 3001
✅ Backend is ready at http://localhost:3001
```

**What happens**:
- Runs `npm run dev` in `packages/backend/`
- Watches for file changes
- Auto-restarts on changes
- Waits for `/health` endpoint to respond

### Step 5: Start Frontend Server (~5 seconds)

```
[Frontend] VITE v5.x.x ready in xxx ms
[Frontend] ➜  Local:   http://localhost:5173/
✅ Frontend is ready at http://localhost:5173
```

**What happens**:
- Runs `npm run dev` in `packages/frontend/`
- Hot Module Replacement (HMR) enabled
- Auto-refreshes on changes

### Step 6: Show Status

```
🎉 DEVELOPMENT SERVERS RUNNING
======================================================================

Backend:
  URL:  http://localhost:3001
  API:  http://localhost:3001/api
  Health: http://localhost:3001/health

Frontend:
  URL:  http://localhost:5173

Default Login:
  Email:    john.picker@wms.local
  Password: password123

======================================================================
Press Ctrl+C to stop all servers
======================================================================
```

---

## Troubleshooting

### "Port already in use" Error

**Problem**: Port 3001 or 5173 is already in use.

**Solution**: The startup script handles this automatically, but if you see this error:

```bash
# Option 1: Use restart command (kills everything first)
npm run dev:restart

# Option 2: Manually stop servers
npm run dev:stop

# Option 3: Find and kill process on Windows
netstat -ano | findstr :3001
taskkill /F /PID <PID_FROM_ABOVE>
```

### "PostgreSQL connection failed" Error

**Problem**: Cannot connect to database.

**Solutions**:

1. **Check PostgreSQL is running**:
   ```bash
   # Windows: Check Services
   # Look for "postgresql-x64-15" or similar

   # Or use command line
   pg_isready
   ```

2. **Check database exists**:
   ```bash
   psql -U postgres
   \l  # list databases

   # If wms_db doesn't exist:
   CREATE DATABASE wms_db;
   ```

3. **Check user exists**:
   ```bash
   \du  # list users

   # If wms_user doesn't exist:
   CREATE USER wms_user WITH PASSWORD 'wms_password';
   GRANT ALL PRIVILEGES ON DATABASE wms_db TO wms_user;
   ```

4. **Check .env file**:
   ```bash
   # View current settings
   cat packages/backend/.env

   # Should have:
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=wms_db
   DB_USER=wms_user
   DB_PASSWORD=wms_password
   ```

### "Database tables not found" Warning

**Problem**: Database exists but tables aren't created.

**Solution**:

```bash
# Run migrations
npm run db:migrate

# Or reset everything (WARNING: deletes all data)
npm run db:reset

# Or just seed sample data
npm run db:seed
```

### Backend Starts But Frontend Doesn't

**Problem**: Backend is working but frontend shows connection errors.

**Solutions**:

1. **Check backend is actually running**:
   ```bash
   curl http://localhost:3001/health
   ```

2. **Check frontend is trying to connect to right URL**:
   - Open browser DevTools (F12)
   - Check Console for errors
   - Check Network tab for failed requests

3. **Clear browser cache**:
   - Ctrl+Shift+Delete (Chrome/Edge)
   - Clear cache and cookies

### Servers Start But Immediately Crash

**Problem**: Processes start but exit immediately.

**Solutions**:

1. **Check for syntax errors**:
   ```bash
   npm run build
   # Fix any TypeScript errors
   ```

2. **Check for missing dependencies**:
   ```bash
   npm install
   cd packages/backend && npm install
   cd ../frontend && npm install
   ```

3. **Check logs for actual error**:
   - The startup script shows error messages
   - Look for red text in output

### Changes Not Reflecting (Hot Reload Not Working)

**Problem**: You save a file but changes don't appear.

**Solutions**:

1. **Backend**: Should auto-restart automatically. If not:
   - Check terminal for "Watcher" messages
   - Try restarting: `npm run dev:restart`

2. **Frontend**: Should auto-refresh automatically. If not:
   - Hard refresh browser (Ctrl+Shift+R)
   - Check browser console for HMR errors
   - Try restarting: `npm run dev:restart`

---

## Common Workflows

### First Time Setup

```bash
# 1. Install dependencies
npm install

# 2. Create .env file (if needed)
cp packages/backend/.env.example packages/backend/.env

# 3. Create database
psql -U postgres
CREATE DATABASE wms_db;
CREATE USER wms_user WITH PASSWORD 'wms_password';
GRANT ALL PRIVILEGES ON DATABASE wms_db TO wms_user;
\q

# 4. Run migrations
npm run db:migrate

# 5. Seed sample data (optional)
npm run db:seed

# 6. Start servers
npm run dev
```

### Everyday Development

```bash
# Start servers
npm run dev

# Work on your project...
# - Backend auto-restarts on changes
# - Frontend auto-refreshes on changes

# Stop servers
# Press Ctrl+C
```

### When Things Get Weird

```bash
# Nuclear option - start completely fresh
npm run dev:restart

# This:
# 1. Kills all processes
# 2. Waits for ports to be released
# 3. Starts everything fresh
```

### Database Work

```bash
# Check database status
npm run db:status

# Reset database (WARNING: deletes all data)
npm run db:reset

# Seed sample data
npm run db:seed

# Refresh data (keep schema, reset data)
npm run db:refresh
```

---

## Port Configuration

### Default Ports

- **Backend**: 3001
- **Frontend**: 5173 (Vite default)

### Changing Ports

If you need to use different ports:

**Backend** (`packages/backend/.env`):
```env
PORT=4001  # Change backend port
```

**Frontend** (`packages/frontend/vite.config.ts`):
```typescript
export default defineConfig({
  server: {
    port: 5180  # Change frontend port
  }
});
```

Then update scripts to match new ports.

---

## Health Checks

### Backend Health Endpoint

```bash
curl http://localhost:3001/health

# Expected response:
# {"status":"healthy","timestamp":"2025-01-19T...","uptime":...}
```

### Check if Servers Are Running

```bash
# Check ports
netstat -ano | findstr :3001  # Windows
lsof -ti:3001  # Mac/Linux

# Check health endpoint
curl http://localhost:3001/health

# Check if frontend is accessible
curl http://localhost:5173
```

---

## For GLM 4.7

### Starting Servers

When GLM 4.7 needs to start servers:

```bash
# The ONLY command to use
npm run dev
```

**Do NOT**:
- ❌ Run `npm run dev:backend` and `npm run dev:frontend` separately
- ❌ Use `concurrently` directly
- ❌ Start servers in background without user consent

**Checking if Servers Are Running**:

```bash
# Check health endpoint
curl http://localhost:3001/health

# If response is 200 OK, servers are running
# If connection refused, servers are not running
```

### Stopping Servers

```bash
# Graceful shutdown (use this)
# Press Ctrl+C in the terminal

# Or use stop command
npm run dev:stop
```

### Restarting Servers

```bash
# Clean restart (kills all, starts fresh)
npm run dev:restart

# Use this when:
# - Ports seem stuck
# - Changes aren't appearing
# - Things are acting weird
```

---

## Summary

### For Humans

**Start**: `npm run dev`
**Stop**: Ctrl+C
**Restart**: `npm run dev:restart`

### For GLM 4.7

**Start**: `npm run dev` (wait for "DEVELOPMENT SERVERS RUNNING" message)
**Stop**: Kill the terminal process or run `npm run dev:stop`
**Restart**: `npm run dev:restart` (for clean slate)
**Check**: `curl http://localhost:3001/health` (should return 200)

---

**Remember**: The new `npm run dev` command is foolproof. It handles all edge cases and provides clear feedback. Use it and forget about manual server management!

**Version**: 1.0.0
**Last Updated**: 2025-01-19
