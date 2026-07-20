#!/usr/bin/env bash
set -Eeuo pipefail

WORKTREE="/Users/normy/autobyteus_org/autobyteus-worktrees/replace-vendored-novnc"
WEB_DIR="$WORKTREE/autobyteus-web"
EVIDENCE_DIR="$WORKTREE/tickets/in-progress/replace-vendored-novnc/probes/api-e2e"
LIVE_DIR="$EVIDENCE_DIR/vnc-live"
OWNER_LABEL="com.autobyteus.api-e2e-owner=replace-vendored-novnc"
VNC_PASSWORD="codex-vnc-secret"
VNC_DISPLAY=":100"
CONTAINER="codex-replace-vendored-novnc-$(date +%s)-$$"
FRONTEND_PID=""
CONTAINER_STARTED=0
RUN_EXIT=1

mkdir -p "$LIVE_DIR"

read -r BACKEND_PORT VNC_WS_PORT FRONTEND_PORT < <(
  python3 - <<'PY'
import socket

sockets = []
ports = []
for _ in range(3):
    sock = socket.socket()
    sock.bind(("127.0.0.1", 0))
    sockets.append(sock)
    ports.append(sock.getsockname()[1])
print(*ports)
for sock in sockets:
    sock.close()
PY
)

cat > "$LIVE_DIR/fixture-environment.txt" <<EOF
container=$CONTAINER
owner_label=$OWNER_LABEL
backend_url=http://127.0.0.1:$BACKEND_PORT
vnc_websocket_url=ws://127.0.0.1:$VNC_WS_PORT
frontend_url=http://127.0.0.1:$FRONTEND_PORT
vnc_display=$VNC_DISPLAY
image=autobyteus/autobyteus-server:latest
EOF

collect_evidence() {
  set +e
  if [[ "$CONTAINER_STARTED" == "1" ]]; then
    docker inspect "$CONTAINER" > "$LIVE_DIR/container-inspect.json" 2> "$LIVE_DIR/container-inspect.stderr.log"
    docker logs "$CONTAINER" > "$LIVE_DIR/container.log" 2>&1
    docker exec "$CONTAINER" sh -c 'cat /tmp/codex-Xvnc.log 2>/dev/null || true' > "$LIVE_DIR/xvnc-auth-display.log" 2>&1
    docker exec "$CONTAINER" sh -c 'cat /tmp/codex-websockify.log 2>/dev/null || true' > "$LIVE_DIR/websockify-auth-display.log" 2>&1
    docker exec "$CONTAINER" sh -c 'ps auxww' > "$LIVE_DIR/container-processes.log" 2>&1
  fi
}

cleanup() {
  local exit_code=$?
  trap - EXIT INT TERM
  collect_evidence
  if [[ -n "$FRONTEND_PID" ]]; then
    kill -TERM -- "-$FRONTEND_PID" 2>/dev/null || true
    for _ in $(seq 1 20); do
      kill -0 "$FRONTEND_PID" 2>/dev/null || break
      sleep 0.25
    done
    kill -KILL -- "-$FRONTEND_PID" 2>/dev/null || true
  fi
  if [[ "$CONTAINER_STARTED" == "1" ]]; then
    docker rm -f "$CONTAINER" > "$LIVE_DIR/container-cleanup.log" 2>&1 || true
  fi
  printf 'script_exit=%s\nprobe_exit=%s\ncleanup_completed_at=%s\n' \
    "$exit_code" "$RUN_EXIT" "$(date -u +%Y-%m-%dT%H:%M:%SZ)" > "$LIVE_DIR/cleanup-status.txt"
  exit "$exit_code"
}
trap cleanup EXIT INT TERM

echo "Starting owned fixture $CONTAINER"
docker run -d --rm \
  --name "$CONTAINER" \
  --label "$OWNER_LABEL" \
  --cap-add SYS_ADMIN \
  --security-opt seccomp=unconfined \
  -p "127.0.0.1:$BACKEND_PORT:8000" \
  -p "127.0.0.1:$VNC_WS_PORT:6081" \
  -e AUTOBYTEUS_DATA_DIR=/home/autobyteus/data \
  -e AUTOBYTEUS_BIND_HOST=0.0.0.0 \
  -e AUTOBYTEUS_SERVER_PORT=8000 \
  -e AUTOBYTEUS_SERVER_HOST="http://127.0.0.1:$BACKEND_PORT" \
  -e AUTOBYTEUS_VNC_SERVER_HOSTS="127.0.0.1:$VNC_WS_PORT" \
  -e AUTOBYTEUS_VNC_SERVER_PASSWORD="$VNC_PASSWORD" \
  -e APP_ENV=production \
  -e DB_TYPE=sqlite \
  -e LOG_LEVEL=INFO \
  -e AUTOBYTEUS_SKIP_SYNC=1 \
  autobyteus/autobyteus-server:latest > "$LIVE_DIR/container-id.txt"
CONTAINER_STARTED=1

for _ in $(seq 1 120); do
  if curl --silent --show-error --fail "http://127.0.0.1:$BACKEND_PORT/rest/health" > "$LIVE_DIR/backend-health.json" 2> "$LIVE_DIR/backend-health.stderr.log"; then
    break
  fi
  sleep 1
done
curl --silent --show-error --fail "http://127.0.0.1:$BACKEND_PORT/rest/health" > "$LIVE_DIR/backend-health.json"

curl --silent --show-error --fail \
  -H 'content-type: application/json' \
  --data-binary "$(python3 - "$VNC_PASSWORD" <<'PY'
import json
import sys
print(json.dumps({
    "query": "mutation UpdateServerSetting($key: String!, $value: String!) { updateServerSetting(key: $key, value: $value) }",
    "variables": {"key": "AUTOBYTEUS_VNC_SERVER_PASSWORD", "value": sys.argv[1]},
}))
PY
)" \
  "http://127.0.0.1:$BACKEND_PORT/graphql" > "$LIVE_DIR/vnc-password-seed.json"

python3 - "$LIVE_DIR/vnc-password-seed.json" <<'PY'
import json
import sys
payload = json.load(open(sys.argv[1]))
if payload.get("errors") or not payload.get("data", {}).get("updateServerSetting"):
    raise SystemExit(f"VNC password seed failed: {payload}")
PY

curl --silent --show-error --fail \
  -H 'content-type: application/json' \
  --data-binary '{"query":"query { getServerSettings { key value } }"}' \
  "http://127.0.0.1:$BACKEND_PORT/graphql" > "$LIVE_DIR/server-settings-after-seed.json"

python3 - "$LIVE_DIR/server-settings-after-seed.json" "$VNC_PASSWORD" <<'PY'
import json
import sys
payload = json.load(open(sys.argv[1]))
settings = {item["key"]: item["value"] for item in payload.get("data", {}).get("getServerSettings", [])}
if settings.get("AUTOBYTEUS_VNC_SERVER_PASSWORD") != sys.argv[2]:
    raise SystemExit(f"VNC password setting was not visible after seeding; keys={sorted(settings)}")
PY

printf '%s\n' "$VNC_PASSWORD" | docker exec -i "$CONTAINER" sh -c \
  'umask 077; /usr/bin/tigervncpasswd -f > /tmp/codex-vnc.passwd; chown vncuser:vncuser /tmp/codex-vnc.passwd'

docker exec -d --user vncuser "$CONTAINER" sh -c \
  'exec /usr/bin/Xvnc :100 -geometry 1024x768 -depth 24 -rfbport 5901 -SecurityTypes=VncAuth -PasswordFile=/tmp/codex-vnc.passwd -localhost no -AlwaysShared -AcceptCutText=1 -SendCutText=1 > /tmp/codex-Xvnc.log 2>&1'

for _ in $(seq 1 60); do
  if docker exec --user vncuser --env DISPLAY="$VNC_DISPLAY" "$CONTAINER" xdpyinfo > "$LIVE_DIR/xdpyinfo-initial.log" 2>&1; then
    break
  fi
  sleep 0.5
done
docker exec --user vncuser --env DISPLAY="$VNC_DISPLAY" "$CONTAINER" xdpyinfo > "$LIVE_DIR/xdpyinfo-initial.log" 2>&1

docker exec -d --user vncuser "$CONTAINER" sh -c \
  'exec websockify --web=/usr/local/lib/python3.13/dist-packages/websockify 6081 localhost:5901 > /tmp/codex-websockify.log 2>&1'

for _ in $(seq 1 60); do
  if curl --silent --show-error --fail "http://127.0.0.1:$VNC_WS_PORT/" > "$LIVE_DIR/websockify-readiness.html" 2> "$LIVE_DIR/websockify-readiness.stderr.log"; then
    break
  fi
  sleep 0.5
done
curl --silent --show-error --fail "http://127.0.0.1:$VNC_WS_PORT/" > "$LIVE_DIR/websockify-readiness.html"

echo "Starting frontend on $FRONTEND_PORT"
python3 - "$WEB_DIR" "$BACKEND_PORT" "$FRONTEND_PORT" "$LIVE_DIR/frontend.log" <<'PY' &
import os
import sys

web_dir, backend_port, frontend_port, log_path = sys.argv[1:]
os.setsid()
os.chdir(web_dir)
log = open(log_path, "ab", buffering=0)
env = os.environ.copy()
env["BACKEND_NODE_BASE_URL"] = f"http://127.0.0.1:{backend_port}"
os.dup2(log.fileno(), 1)
os.dup2(log.fileno(), 2)
os.execvpe("pnpm", ["pnpm", "dev", "--port", frontend_port], env)
PY
FRONTEND_PID=$!

for _ in $(seq 1 120); do
  if curl --silent --show-error --fail "http://127.0.0.1:$FRONTEND_PORT/workspace" > "$LIVE_DIR/frontend-readiness.html" 2> "$LIVE_DIR/frontend-readiness.stderr.log"; then
    break
  fi
  kill -0 "$FRONTEND_PID" 2>/dev/null
  sleep 1
done
curl --silent --show-error --fail "http://127.0.0.1:$FRONTEND_PORT/workspace" > "$LIVE_DIR/frontend-readiness.html"

set +e
(
  cd "$WEB_DIR"
  pnpm test:e2e:vnc-live -- \
    --base-url "http://127.0.0.1:$FRONTEND_PORT" \
    --vnc-container "$CONTAINER" \
    --vnc-display "$VNC_DISPLAY" \
    --expect-host "127.0.0.1:$VNC_WS_PORT" \
    --output-dir "$LIVE_DIR"
) 2>&1 | tee "$LIVE_DIR/probe-command.log"
RUN_EXIT=${PIPESTATUS[0]}
set -e

if [[ "$RUN_EXIT" != "0" ]]; then
  echo "Live VNC probe failed with exit $RUN_EXIT" >&2
  exit "$RUN_EXIT"
fi

echo "Live VNC probe passed"
