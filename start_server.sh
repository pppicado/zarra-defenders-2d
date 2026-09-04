#!/bin/bash
# Start HTTP server for zarra-defenders-2d on port 8000 (daemonized)
# Usage: ./start_server.sh [port]

set -u
PORT="${1:-8000}"
DIR="/projects/personal/zarra-defenders-2d"
LOG="/tmp/zarra2d-server.log"
PIDFILE="/tmp/zarra2d-server.pid"

# Kill any previous instance
pkill -f "http.server ${PORT}" 2>/dev/null
sleep 1

# Start with setsid + redirect all fds to log/null
nohup setsid python3 -m http.server "${PORT}" --bind 0.0.0.0 \
    --directory "${DIR}" \
    < /dev/null > "${LOG}" 2>&1 &

echo $! > "${PIDFILE}"
sleep 2
PID="$(cat ${PIDFILE})"

if kill -0 "${PID}" 2>/dev/null; then
  echo "Server PID: ${PID} on port ${PORT} serving ${DIR}"
  echo "Test: curl -sI http://localhost:${PORT}/"
  echo "Log: tail -f ${LOG}"
else
  echo "Server FAILED to start. Log:"
  cat "${LOG}"
  exit 1
fi
