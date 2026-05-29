#!/usr/bin/env bash
set -euo pipefail
REPO_ROOT="/Users/normy/autobyteus_org/autobyteus-worktrees/codex-agent-spawn-ebadf-root-cause"
ARTIFACT_DIR="$REPO_ROOT/tickets/codex-agent-spawn-ebadf-root-cause/validation-artifacts"
BACKEND_PORT="8000"
FRONTEND_PORT="3000"
BASE_URL="http://127.0.0.1:${BACKEND_PORT}"
FRONTEND_URL="http://127.0.0.1:${FRONTEND_PORT}"
DATA_DIR="$ARTIFACT_DIR/api-e2e-round8-browser-server-data-20260523"
WORKSPACE_ROOT="$ARTIFACT_DIR/api-e2e-round8-browser-workspace-20260523"
BACKEND_LOG="$ARTIFACT_DIR/api-e2e-round8-browser-backend-20260523.log"
FRONTEND_LOG="$ARTIFACT_DIR/api-e2e-round8-browser-frontend-20260523.log"
META_JSON="$ARTIFACT_DIR/api-e2e-round8-browser-stack-20260523.json"
BACKEND_PID_FILE="$ARTIFACT_DIR/api-e2e-round8-browser-backend-20260523.pid"
FRONTEND_PID_FILE="$ARTIFACT_DIR/api-e2e-round8-browser-frontend-20260523.pid"
rm -f "$BACKEND_PID_FILE" "$FRONTEND_PID_FILE" "$BACKEND_LOG" "$FRONTEND_LOG" "$META_JSON"
rm -rf "$DATA_DIR" "$WORKSPACE_ROOT"
mkdir -p "$DATA_DIR/db" "$DATA_DIR/memory" "$DATA_DIR/logs" "$DATA_DIR/temp_workspace" "$WORKSPACE_ROOT/src/nested" "$WORKSPACE_ROOT/docs"
cat > "$WORKSPACE_ROOT/README.md" <<'EOF'
# Browser E2E Workspace

This README is used by the Round 8 browser-level AutoByteus file explorer validation.
EOF
cat > "$WORKSPACE_ROOT/src/main.ts" <<'EOF'
export const browserE2e = 'file explorer visible stream validation';
EOF
cat > "$WORKSPACE_ROOT/src/nested/deep-note.md" <<'EOF'
# Deep Note

Search target: browser-e2e-live-search.
EOF
cat > "$WORKSPACE_ROOT/docs/search-target.md" <<'EOF'
Browser E2E search target document.
EOF
DB_URL="file:${DATA_DIR}/db/production.db"
cat > "$DATA_DIR/.env" <<EOF
APP_ENV=production
LOG_LEVEL=INFO
PRISMA_LOG_QUERIES=0
DB_TYPE=sqlite
DATABASE_URL=${DB_URL}
AUTOBYTEUS_SERVER_HOST=${BASE_URL}
AUTOBYTEUS_MEMORY_DIR=${DATA_DIR}/memory
AUTOBYTEUS_LOG_DIR=${DATA_DIR}/logs
AUTOBYTEUS_TEMP_WORKSPACE_DIR=${DATA_DIR}/temp_workspace
EOF
# Try to find a usable Prisma engine pair from the local cache, mirroring prior validation harnesses.
PRISMA_QUERY_ENGINE_LIBRARY_VALUE=""
PRISMA_SCHEMA_ENGINE_BINARY_VALUE=""
if [[ "$(uname -s)" == "Darwin" ]]; then
  if [[ "$(uname -m)" == "arm64" ]]; then PRISMA_TARGET="darwin-arm64"; else PRISMA_TARGET="darwin"; fi
else
  PRISMA_TARGET="debian-openssl-3.0.x"
fi
CACHE_ROOT="$HOME/.cache/prisma/master"
if [[ -d "$CACHE_ROOT" ]]; then
  LATEST_DIR=""
  while IFS= read -r candidate; do
    if [[ -x "$candidate/schema-engine" || -x "$candidate/schema-engine.exe" ]]; then
      LATEST_DIR="$candidate"
    fi
  done < <(find "$CACHE_ROOT" -path "*/${PRISMA_TARGET}" -type d | sort)
  if [[ -n "$LATEST_DIR" ]]; then
    if [[ -f "$LATEST_DIR/libquery-engine" ]]; then PRISMA_QUERY_ENGINE_LIBRARY_VALUE="$LATEST_DIR/libquery-engine"; fi
    if [[ -f "$LATEST_DIR/schema-engine" ]]; then PRISMA_SCHEMA_ENGINE_BINARY_VALUE="$LATEST_DIR/schema-engine"; fi
    if [[ -f "$LATEST_DIR/schema-engine.exe" ]]; then PRISMA_SCHEMA_ENGINE_BINARY_VALUE="$LATEST_DIR/schema-engine.exe"; fi
  fi
fi
# Ensure requested ports are not occupied by our prior validation stack.
for port in "$BACKEND_PORT" "$FRONTEND_PORT"; do
  if lsof -nP -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; then
    echo "Port $port is already in use; aborting to avoid interfering with existing processes." >&2
    lsof -nP -iTCP:"$port" -sTCP:LISTEN >&2 || true
    exit 1
  fi
done
(
  cd "$REPO_ROOT/autobyteus-server-ts"
  export APP_ENV=production LOG_LEVEL=INFO PRISMA_LOG_QUERIES=0 DB_TYPE=sqlite DATABASE_URL="$DB_URL"
  export AUTOBYTEUS_DATA_DIR="$DATA_DIR" AUTOBYTEUS_SERVER_HOST="$BASE_URL" AUTOBYTEUS_INTERNAL_SERVER_BASE_URL="$BASE_URL"
  export AUTOBYTEUS_MEMORY_DIR="$DATA_DIR/memory" AUTOBYTEUS_LOG_DIR="$DATA_DIR/logs" AUTOBYTEUS_TEMP_WORKSPACE_DIR="$DATA_DIR/temp_workspace"
  export AUTOBYTEUS_LOG_LEVEL=info AUTOBYTEUS_HTTP_ACCESS_LOG_MODE=off CODEX_APP_SERVER_REQUEST_TIMEOUT_MS=60000
  export PRISMA_QUERY_ENGINE_LIBRARY="$REPO_ROOT/node_modules/.pnpm/@prisma+engines@5.22.0/node_modules/@prisma/engines/libquery_engine-darwin-arm64.dylib.node"
  export PRISMA_SCHEMA_ENGINE_BINARY="$REPO_ROOT/node_modules/.pnpm/@prisma+engines@5.22.0/node_modules/@prisma/engines/schema-engine-darwin-arm64"
  nohup node dist/app.js --host 127.0.0.1 --port "$BACKEND_PORT" --data-dir "$DATA_DIR" > "$BACKEND_LOG" 2>&1 &
  echo $! > "$BACKEND_PID_FILE"
)
BACKEND_PID="$(cat "$BACKEND_PID_FILE")"
# Wait for backend health.
for i in {1..180}; do
  if curl -fsS "$BASE_URL/rest/health" >/dev/null 2>&1; then
    break
  fi
  if ! kill -0 "$BACKEND_PID" >/dev/null 2>&1; then
    echo "Backend exited before health became ready. Log:" >&2
    tail -200 "$BACKEND_LOG" >&2 || true
    exit 1
  fi
  sleep 0.5
  if [[ "$i" == "180" ]]; then
    echo "Timed out waiting for backend health. Log:" >&2
    tail -200 "$BACKEND_LOG" >&2 || true
    exit 1
  fi
done
(
  cd "$REPO_ROOT/autobyteus-web"
  export BACKEND_NODE_BASE_URL="$BASE_URL"
  export SHOW_DEBUG_ERROR_PANEL=true
  nohup pnpm exec nuxt dev --host 127.0.0.1 --port "$FRONTEND_PORT" > "$FRONTEND_LOG" 2>&1 &
  echo $! > "$FRONTEND_PID_FILE"
)
FRONTEND_PID="$(cat "$FRONTEND_PID_FILE")"
# Wait for frontend HTTP response.
for i in {1..180}; do
  if curl -fsS "$FRONTEND_URL" >/dev/null 2>&1; then
    break
  fi
  if ! kill -0 "$FRONTEND_PID" >/dev/null 2>&1; then
    echo "Frontend exited before health became ready. Log:" >&2
    tail -200 "$FRONTEND_LOG" >&2 || true
    exit 1
  fi
  sleep 0.5
  if [[ "$i" == "180" ]]; then
    echo "Timed out waiting for frontend. Log:" >&2
    tail -200 "$FRONTEND_LOG" >&2 || true
    exit 1
  fi
done
cat > "$META_JSON" <<EOF
{
  "backendPort": ${BACKEND_PORT},
  "frontendPort": ${FRONTEND_PORT},
  "backendBaseUrl": "${BASE_URL}",
  "frontendUrl": "${FRONTEND_URL}",
  "backendPid": ${BACKEND_PID},
  "frontendPid": ${FRONTEND_PID},
  "dataDir": "${DATA_DIR}",
  "workspaceRoot": "${WORKSPACE_ROOT}",
  "backendLog": "${BACKEND_LOG}",
  "frontendLog": "${FRONTEND_LOG}",
  "startedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "prismaQueryEngineLibrary": "${REPO_ROOT}/node_modules/.pnpm/@prisma+engines@5.22.0/node_modules/@prisma/engines/libquery_engine-darwin-arm64.dylib.node",
  "prismaSchemaEngineBinary": "${REPO_ROOT}/node_modules/.pnpm/@prisma+engines@5.22.0/node_modules/@prisma/engines/schema-engine-darwin-arm64"
}
EOF
echo "$META_JSON"
