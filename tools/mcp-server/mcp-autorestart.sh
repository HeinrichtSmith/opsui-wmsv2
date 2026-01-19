#!/bin/bash
# Universal MCP Server Auto-Restart Wrapper
# Usage: ./mcp-autorestart.sh <command> [args...]
# Example: ./mcp-autorestart.sh npx -y @modelcontextprotocol/server-sequential-thinking

LOG_FILE="$TMP/mcp-autorestart-$RANDOM.log"

if [ $# -eq 0 ]; then
    echo "[$(date)] Error: No command specified" >> "$LOG_FILE"
    echo "Usage: mcp-autorestart.sh <command> [args...]" >> "$LOG_FILE"
    exit 1
fi

CMD="$1"
shift
ARGS="$@"

while true; do
    echo "[$(date)] Starting MCP server: $CMD $ARGS" >> "$LOG_FILE"

    $CMD $ARGS
    EXIT_CODE=$?

    if [ $EXIT_CODE -eq 0 ]; then
        echo "[$(date)] Server shut down gracefully (exit code 0)" >> "$LOG_FILE"
        break
    else
        echo "[$(date)] Server crashed (exit code $EXIT_CODE), restarting in 3 seconds..." >> "$LOG_FILE"
        sleep 3
    fi
done

echo "[$(date)] Auto-restart wrapper terminated" >> "$LOG_FILE"
