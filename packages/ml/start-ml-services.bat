@echo off
REM Automated ML Services Startup
REM Starts the ML API server and training scheduler with auto-restart

SET "PROJECT_ROOT=C:\Users\Heinricht\Documents\Warehouse Management System"
SET "ML_DIR=%PROJECT_ROOT%\packages\ml"
SET "LOG_FILE=%TEMP%\ml-services.log"

echo ========================================
echo WMS ML Services Auto-Start
echo ========================================
echo Log: %LOG_FILE%
echo.

echo [%DATE% %TIME%] Starting ML services... >> "%LOG_FILE%"

REM Start ML API Server (background with auto-restart)
echo [1/2] Starting ML API server...
start "WMS ML API" /D "%ML_DIR%" cmd /c "cd /d "%ML_DIR%" && venv\Scripts\uvic.exe src.api.serve:app --host 0.0.0.0 --port 8001 --reload"

REM Wait for API to start
timeout /t 5 /nobreak >nul

REM Check API health
echo Checking API health...
curl -s http://localhost:8001/health >nul 2>&1
IF %ERRORLEVEL% EQU 0 (
    echo [%DATE% %TIME%] ML API started successfully >> "%LOG_FILE%"
    echo [OK] ML API is running on http://localhost:8001
) ELSE (
    echo [%DATE% %TIME%] ML API health check failed >> "%LOG_FILE%"
    echo [WARNING] ML API may not be running correctly
)

REM Start Training Scheduler (background)
echo.
echo [2/2] Starting training scheduler...
start "WMS ML Trainer" /D "%ML_DIR%" cmd /c "cd /d "%ML_DIR%" && venv\Scripts\python.exe scripts/auto_retrain.py --daemon"

echo [%DATE% %TIME%] Training scheduler started >> "%LOG_FILE%"

echo.
echo ========================================
echo Services Started
echo ========================================
echo.
echo ML API:       http://localhost:8001
echo API Docs:     http://localhost:8001/docs
echo Metrics:       http://localhost:8001/metrics
echo.
echo To stop services, check Task Manager and terminate:
echo   - WMS ML API
echo   - WMS ML Trainer
echo.
pause
