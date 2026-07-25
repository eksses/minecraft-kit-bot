#!/bin/bash
# MDB Permanent Server Start Script
# Kills existing processes and starts fresh

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_LOG="/tmp/mdb-backend.log"
FRONTEND_LOG="/tmp/mdb-frontend.log"
PID_FILE="/tmp/mdb-pids"

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${BLUE}[MDB]${NC} $1"; }
ok() { echo -e "${GREEN}[OK]${NC} $1"; }
err() { echo -e "${RED}[ERR]${NC} $1"; }

# Kill existing
log "Stopping existing servers..."
if [ -f "$PID_FILE" ]; then
    while read pid; do
        kill "$pid" 2>/dev/null || true
    done < "$PID_FILE"
    rm "$PID_FILE"
fi
pkill -f "node backend/src/index.js" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true
sleep 1

# Start backend with nodemon
log "Starting backend (nodemon) on 0.0.0.0:8081..."
cd "$PROJECT_ROOT"
HOST=0.0.0.0 PORT=8081 setsid npx nodemon \
    --watch backend/src \
    --ext js,json \
    --ignore "data/*" \
    backend/src/index.js \
    > "$BACKEND_LOG" 2>&1 &
BACKEND_PID=$!
echo "$BACKEND_PID" >> "$PID_FILE"
ok "Backend PID: $BACKEND_PID"

# Start frontend with vite
log "Starting frontend (vite) on 0.0.0.0:5173..."
cd "$PROJECT_ROOT/frontend"
setsid npx vite --host 0.0.0.0 --port 5173 \
    > "$FRONTEND_LOG" 2>&1 &
FRONTEND_PID=$!
echo "$FRONTEND_PID" >> "$PID_FILE"
ok "Frontend PID: $FRONTEND_PID"

sleep 2

# Get public IP
PUBLIC_IP=$(curl -s ifconfig.me 2>/dev/null || echo "unknown")

echo ""
echo "========================================="
ok "MDB Servers Started!"
echo "========================================="
echo " Backend:  http://${PUBLIC_IP}:8081"
echo " Frontend: http://${PUBLIC_IP}:5173"
echo " Logs:     $BACKEND_LOG"
echo "           $FRONTEND_LOG"
echo "========================================="
echo ""
echo "To stop: $0 stop"
echo "To watch logs: tail -f $BACKEND_LOG $FRONTEND_LOG"

# Subcommand: stop
if [ "${1:-}" = "stop" ]; then
    log "Stopping servers..."
    if [ -f "$PID_FILE" ]; then
        while read pid; do
            kill "$pid" 2>/dev/null || true
        done < "$PID_FILE"
        rm "$PID_FILE"
    fi
    pkill -f "node backend/src/index.js" 2>/dev/null || true
    pkill -f "vite" 2>/dev/null || true
    ok "Stopped"
fi

# Subcommand: logs
if [ "${1:-}" = "logs" ]; then
    tail -f "$BACKEND_LOG" "$FRONTEND_LOG"
fi