#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WORKSPACE_ROOT="$ROOT_DIR"
SERVER_DIR="$WORKSPACE_ROOT/autobyteus-server-ts"
HOST="127.0.0.1"
PORT="8000"
BACKGROUND=0
SKIP_BUILD=0
STOP=0
STATUS=0

usage() {
  cat <<'EOF'
Usage: scripts/android-run-server-termux.sh [options]

Options:
  --background            Run server in background with nohup
  --foreground            Run server in foreground (default)
  --stop                  Stop background server using pid file
  --status                Show background server status
  --skip-build            Skip `pnpm --filter autobyteus-server-ts run build`
  --host <host>           Bind host (default: 127.0.0.1)
  --port <port>           Bind port (default: 8000)
  --workspace-root <dir>  Override workspace root (default: repo root)
  -h, --help              Show help
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --)
      shift
      break
      ;;
    --background)
      BACKGROUND=1
      shift
      ;;
    --foreground)
      BACKGROUND=0
      shift
      ;;
    --skip-build)
      SKIP_BUILD=1
      shift
      ;;
    --stop)
      STOP=1
      shift
      ;;
    --status)
      STATUS=1
      shift
      ;;
    --host)
      HOST="${2:-}"
      if [[ -z "$HOST" ]]; then
        echo "Missing value for --host" >&2
        exit 1
      fi
      shift 2
      ;;
    --port)
      PORT="${2:-}"
      if [[ -z "$PORT" ]]; then
        echo "Missing value for --port" >&2
        exit 1
      fi
      shift 2
      ;;
    --workspace-root)
      WORKSPACE_ROOT="${2:-}"
      if [[ -z "$WORKSPACE_ROOT" ]]; then
        echo "Missing value for --workspace-root" >&2
        exit 1
      fi
      SERVER_DIR="$WORKSPACE_ROOT/autobyteus-server-ts"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage
      exit 1
      ;;
  esac
done

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is required. Run bootstrap first." >&2
  exit 1
fi

if ! command -v pkg >/dev/null 2>&1; then
  echo "This script must run inside Termux (missing 'pkg')." >&2
  exit 1
fi

if ! command -v pnpm >/dev/null 2>&1; then
  echo "pnpm is required. Run bootstrap first." >&2
  exit 1
fi

if [[ ! -d "$SERVER_DIR" ]]; then
  echo "Server directory not found: $SERVER_DIR" >&2
  exit 1
fi

LOG_DIR="$SERVER_DIR/logs"
PID_FILE="$LOG_DIR/android-server.pid"
LOG_FILE="$LOG_DIR/android-server.log"

is_running() {
  local pid="$1"
  kill -0 "$pid" >/dev/null 2>&1
}

stop_server() {
  if [[ ! -f "$PID_FILE" ]]; then
    echo "No PID file found at $PID_FILE"
    return 0
  fi

  local pid
  pid="$(cat "$PID_FILE")"
  if [[ -z "$pid" ]]; then
    echo "PID file is empty: $PID_FILE" >&2
    return 1
  fi

  if is_running "$pid"; then
    kill "$pid"
    sleep 1
    if is_running "$pid"; then
      kill -9 "$pid"
    fi
    echo "Stopped server PID $pid"
  else
    echo "PID $pid is not running"
  fi

  rm -f "$PID_FILE"
}

if [[ $STATUS -eq 1 ]]; then
  if [[ -f "$PID_FILE" ]]; then
    pid="$(cat "$PID_FILE")"
    if [[ -n "$pid" ]] && is_running "$pid"; then
      echo "Server is running in background (PID $pid)"
      echo "Log: $LOG_FILE"
      exit 0
    fi
    echo "PID file exists but process is not running: $PID_FILE"
    exit 1
  fi

  echo "Server is not running in background."
  exit 1
fi

if [[ $STOP -eq 1 ]]; then
  stop_server
  exit 0
fi

mkdir -p "$LOG_DIR"

if [[ ! -f "$SERVER_DIR/.env" ]]; then
  cat > "$SERVER_DIR/.env" <<EOF
AUTOBYTEUS_SERVER_HOST=http://$HOST:$PORT
DB_TYPE=sqlite
LOG_LEVEL=INFO
EOF
  echo "Created default .env at $SERVER_DIR/.env"
fi

if [[ $SKIP_BUILD -eq 0 ]]; then
  pnpm -C "$WORKSPACE_ROOT" --filter autobyteus-server-ts run build
fi

CMD=(node "$SERVER_DIR/dist/app.js" --host "$HOST" --port "$PORT")

if [[ $BACKGROUND -eq 1 ]]; then
  if [[ -f "$PID_FILE" ]]; then
    existing_pid="$(cat "$PID_FILE")"
    if [[ -n "$existing_pid" ]] && is_running "$existing_pid"; then
      echo "Background server already running with PID $existing_pid" >&2
      exit 1
    fi
    rm -f "$PID_FILE"
  fi

  nohup "${CMD[@]}" > "$LOG_FILE" 2>&1 &
  pid="$!"
  echo "$pid" > "$PID_FILE"
  echo "Started server in background."
  echo "PID: $pid"
  echo "Log: $LOG_FILE"
  echo "Stop: pnpm android:server:stop"
  exit 0
fi

exec "${CMD[@]}"
