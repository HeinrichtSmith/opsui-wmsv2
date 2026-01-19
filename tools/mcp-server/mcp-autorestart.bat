@echo off
REM Universal MCP Server Auto-Restart Wrapper
REM Usage: mcp-autorestart.bat <command> <arg1> <arg2> ...
REM Example: mcp-autorestart.bat npx -y @modelcontextprotocol/server-sequential-thinking

SET LOG_FILE=%TEMP%\mcp-autorestart-%RANDOM%.log

:PARSE_ARGS
SET "CMD="
SET "ARGS="
SET SKIP_NEXT=0

IF "%~1"=="" (
    echo [%DATE% %TIME%] Error: No command specified >> %LOG_FILE%
    echo Usage: mcp-autorestart.bat ^<command^> [args...] >> %LOG_FILE%
    exit /b 1
)

SET CMD=%~1
SHIFT

:BUILD_ARGS
IF "%~1"=="" goto :RUN_LOOP
SET "ARGS=%ARGS% "%~1""
SHIFT
goto :BUILD_ARGS

:RUN_LOOP
echo [%DATE% %TIME%] Starting MCP server: %CMD% %ARGS% >> %LOG_FILE%

%CMD% %ARGS%
SET EXIT_CODE=%ERRORLEVEL%

IF %EXIT_CODE% EQU 0 (
    echo [%DATE% %TIME%] Server shut down gracefully (exit code 0) >> %LOG_FILE%
    goto :END
) ELSE (
    echo [%DATE% %TIME%] Server crashed (exit code %EXIT_CODE%), restarting in 3 seconds... >> %LOG_FILE%
    timeout /t 3 /nobreak >nul
    goto :RUN_LOOP
)

:END
echo [%DATE% %TIME%] Auto-restart wrapper terminated >> %LOG_FILE%
