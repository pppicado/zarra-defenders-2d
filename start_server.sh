#!/bin/bash
# Start HTTP server for zarra-defenders-2d on port 8000 (daemonized, no-cache headers)
# Usage: ./start_server.sh [port]

set -u
PORT="${1:-8000}"
DIR="/projects/personal/zarra-defenders-2d"
LOG="/tmp/zarra2d-server.log"
PIDFILE="/tmp/zarra2d-server.pid"

# Kill any previous instance
pkill -f "dev_server.py ${PORT}" 2>/dev/null
pkill -f "http.server ${PORT}" 2>/dev/null
sleep 1

# Start custom server (no-cache headers so browsers don't serve stale JS/CSS)
nohup setsid python3 "${DIR}/tools/dev_server.py" "${PORT}" \
    < /dev/null > "${LOG}" 2>&1 &

echo $! > "${PIDFILE}"
echo "zarra-dev-server pid=$(cat ${PIDFILE}), port=${PORT}, no-cache enabled"
