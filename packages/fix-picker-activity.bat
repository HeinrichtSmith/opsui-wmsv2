@echo off
setlocal SCRIPTDIR=%~dp0

REM Stop servers
echo Stopping servers...
cd /d "%SCRIPTDIR%\c:\Users\Heinricht\Documents\Warehouse Management System"
taskkill /F /IM node.exe /FI "node.exe" 2>NUL
taskkill /F /IM node.exe /FI "node.exe" /T 2>NUL

REM Apply database migration
echo Applying database migration...
psql -h localhost -U wms_user -d wms_db -c "ALTER TABLE orders ADD COLUMN IF NOT EXISTS last_viewed_at TIMESTAMP WITH TIME ZONE;" 2>NUL
if %ERRORLEVEL% NEQ 0 (
  echo ERROR: Migration failed!
  pause
  exit /b 1
)

REM Wait for migration to complete
echo Waiting for database to update...
timeout /t 3

REM Restart servers
echo Restarting servers...
cd /d "%SCRIPTDIR%\c:\Users\Heinricht\Documents\Warehouse Management System"
start "" Backend Server" /MIN cmd /c cd packages\backend && npm run dev
start "" Frontend Server" /MIN cmd /c cd packages\frontend && npm run dev

echo Done! Migration applied and servers restarted.
pause