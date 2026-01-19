@echo off
REM Automated ML Pipeline Setup for WMS
REM This script sets up the entire ML pipeline with automation

SET "PROJECT_ROOT=C:\Users\Heinricht\Documents\Warehouse Management System"
SET "ML_DIR=%PROJECT_ROOT%\packages\ml"
SET "LOG_FILE=%TEMP%\ml-setup.log"

echo ========================================
echo WMS ML Pipeline Automated Setup
echo ========================================
echo Log: %LOG_FILE%
echo.

echo [%DATE% %TIME%] Starting ML pipeline setup... >> "%LOG_FILE%"

REM Check Python installation
echo [1/7] Checking Python installation...
python --version >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Python not found. Please install Python 3.10+
    echo Download from: https://www.python.org/downloads/
    echo.
    echo During installation, check "Add Python to PATH"
    pause
    exit /b 1
)
python --version
echo [%DATE% %TIME%] Python found >> "%LOG_FILE%"

REM Create virtual environment
echo.
echo [2/7] Creating Python virtual environment...
cd "%ML_DIR%"
IF NOT EXIST venv (
    python -m venv venv
    echo [%DATE% %TIME%] Virtual environment created >> "%LOG_FILE%"
) ELSE (
    echo Virtual environment already exists
)

REM Activate virtual environment
echo.
echo [3/7] Activating virtual environment...
CALL venv\Scripts\activate.bat

REM Install Python dependencies
echo.
echo [4/7] Installing Python dependencies...
pip install --upgrade pip >> "%LOG_FILE%" 2>&1
pip install -r requirements.txt >> "%LOG_FILE%" 2>&1
echo [%DATE% %TIME%] Python dependencies installed >> "%LOG_FILE%"

REM Install Node dependencies
echo.
echo [5/7] Installing Node dependencies...
npm install >> "%LOG_FILE%" 2>&1
echo [%DATE% %TIME%] Node dependencies installed >> "%LOG_FILE%"

REM Run database migrations
echo.
echo [6/7] Running ML database migrations...
SET "PGPASSWORD=wms_password"
psql -h localhost -U wms_user -d wms -f database/migrations/001_ml_tables.sql >> "%LOG_FILE%" 2>&1
IF %ERRORLEVEL% EQU 0 (
    echo [%DATE% %TIME%] Database migrations completed >> "%LOG_FILE%"
) ELSE (
    echo [WARNING] Database migration failed. Run manually:
    echo psql -U wms_user -d wms -f packages/ml/database/migrations/001_ml_tables.sql
)

REM Extract features and train models
echo.
echo [7/7] Extracting features and training models...
python scripts/data/extract_features.py --days-back 90 >> "%LOG_FILE%" 2>&1
python scripts/models/train_duration_model.py >> "%LOG_FILE%" 2>&1
echo [%DATE% %TIME%] Model training completed >> "%LOG_FILE%"

echo.
echo ========================================
echo Setup Complete!
echo ========================================
echo.
echo Next steps:
echo 1. Start ML API: npm run dev
echo 2. Check health: curl http://localhost:8001/health
echo 3. View models: dir models
echo.
echo Full log: %LOG_FILE%
pause
