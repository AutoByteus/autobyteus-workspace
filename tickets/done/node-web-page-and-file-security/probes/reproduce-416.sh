#!/usr/bin/env bash
# Reproduction probe for autobyteus-416 (node web-page and file security).
# Starts one isolated node from this worktree's build (own data root, free port, 127.0.0.1),
# then sends the requests a browser sends in each attack and prints status + key headers.
# Prerequisites: pnpm install; pnpm -C autobyteus-server-ts prebuild && pnpm -C autobyteus-server-ts build.
# Usage: bash reproduce-416.sh <output-dir>   (output dir must not exist)
# Before the fix: R1, R2 and R3 lines report the attack request as accepted (200 / no sandbox).
# After the fix (design-spec Guidance): R1a/R1b 403 REMOTE_ACCESS_HOST_REFUSED, R1c/R2a-c 403, R2d (a configured
# origin) 200, R3a-d with `sandbox allow-scripts` and `nosniff`.
set -euo pipefail
OUT="${1:?output dir}"; [ -e "$OUT" ] && { echo "output dir exists" >&2; exit 2; }
mkdir -p "$OUT"
REPO="$(cd "$(dirname "$0")/../../../.." && pwd)"
SERVER="$REPO/autobyteus-server-ts"
ROOT="$(cd "$(mktemp -d)" && pwd -P)"
DATA="$ROOT/data"; WS="$ROOT/workspace"; mkdir -p "$DATA/db" "$WS"
PORT="$(node -e "const s=require('net').createServer();s.listen(0,'127.0.0.1',()=>{console.log(s.address().port);s.close()})")"
BASE="http://127.0.0.1:$PORT"
DBURL="file:$DATA/db/production.db"
cleanup() { [ -n "${PID:-}" ] && kill "$PID" 2>/dev/null || true; rm -rf "$ROOT"; }
trap cleanup EXIT

printf '<!doctype html><script>fetch("/graphql",{method:"POST"})</script>\n' > "$WS/page.html"
printf '<svg xmlns="http://www.w3.org/2000/svg"><script>1</script></svg>\n' > "$WS/pic.svg"
printf '%%PDF-1.4\n' > "$WS/doc.pdf"

ENVV=(env -i PATH="$PATH" HOME="$ROOT" TMPDIR="${TMPDIR:-/tmp}" APP_ENV=production DB_TYPE=sqlite DATABASE_URL="$DBURL" AUTOBYTEUS_SERVER_HOST="$BASE" AUTOBYTEUS_ALLOWED_ORIGINS=http://127.0.0.1:3000 DISABLE_HTTP_REQUEST_LOGS=true)
printf "APP_ENV=production\nDB_TYPE=sqlite\nDATABASE_URL=%s\nAUTOBYTEUS_SERVER_HOST=%s\nAUTOBYTEUS_ALLOWED_ORIGINS=http://127.0.0.1:3000\n" "$DBURL" "$BASE" > "$DATA/.env"
(cd "$SERVER" && "${ENVV[@]}" ./node_modules/.bin/prisma migrate deploy --schema ./prisma/schema.prisma >/dev/null)
(cd "$SERVER" && "${ENVV[@]}" node dist/app.js --host 127.0.0.1 --port "$PORT" --data-dir "$DATA" > "$OUT/server.log" 2>&1) &
PID=$!
for _ in $(seq 1 240); do curl -fsS "$BASE/rest/health" >/dev/null 2>&1 && break; sleep 0.5; done
curl -fsS "$BASE/rest/health" >/dev/null

curl -sS "$BASE/graphql" -H 'content-type: application/json' \
  --data "{\"query\":\"mutation(\$i:CreateWorkspaceInput!){createWorkspace(input:\$i){workspaceId}}\",\"variables\":{\"i\":{\"rootPath\":\"$WS\"}}}" > "$OUT/create-workspace.json"
WSID="$(node -e 'const j=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));if(!j.data){console.error(JSON.stringify(j));process.exit(1)}console.log(j.data.createWorkspace.workspaceId)' "$OUT/create-workspace.json")"

q='{"query":"{__typename}"}'
row() { # label, curl args...
  local label="$1"; shift
  local res; res="$(curl -sS -o "$OUT/last-body" -D - "$@" | tr -d '\r')"
  local code; code="$(grep -o '"code":"[A-Z_]*"' "$OUT/last-body" | head -1 | cut -d'"' -f4 || true)"
  local status; status="$(printf '%s' "$res" | head -1 | awk '{print $2}')"
  local ctype; ctype="$(printf '%s' "$res" | grep -i '^content-type:' | head -1 | cut -d' ' -f2- || true)"
  local csp; csp="$(printf '%s' "$res" | grep -i '^content-security-policy:' | head -1 | cut -d' ' -f2- || true)"
  local nos; nos="$(printf '%s' "$res" | grep -i '^x-content-type-options:' | head -1 | cut -d' ' -f2- || true)"
  printf '%s | status=%s | code=%s | type=%s | csp=%s | nosniff=%s\n' "$label" "$status" "${code:-none}" "${ctype:-}" "${csp:-none}" "${nos:-none}" | tee -a "$OUT/results.txt"
}

# R1 DNS rebinding: after rebinding, the browser addresses the node as evil.example.
row "R1a rebinding POST /graphql (Host+Origin evil.example)" -X POST "$BASE/graphql" -H "Host: evil.example:$PORT" -H "Origin: http://evil.example:$PORT" -H 'content-type: application/json' --data "$q"
row "R1b rebinding same-origin GET file (Host evil.example, no Origin)" "$BASE/rest/workspaces/$WSID/content?path=page.html" -H "Host: evil.example:$PORT"
row "R1c control: foreign Origin, real Host (refused since 403)" -X POST "$BASE/graphql" -H "Origin: http://evil.example" -H 'content-type: application/json' --data "$q"
# R2 a page served from another localhost port (agent-started dev server).
row "R2a localhost:5173 page POST /graphql" -X POST "$BASE/graphql" -H "Origin: http://localhost:5173" -H 'content-type: application/json' --data "$q"
row "R2b 127.0.0.1:8080 page POST /graphql" -X POST "$BASE/graphql" -H "Origin: http://127.0.0.1:8080" -H 'content-type: application/json' --data "$q"
row "R2d control: configured origin 127.0.0.1:3000 POST /graphql (listed in AUTOBYTEUS_ALLOWED_ORIGINS)" -X POST "$BASE/graphql" -H "Origin: http://127.0.0.1:3000" -H 'content-type: application/json' --data "$q"
row "R2c localhost:5173 page POST /mcp/gateway" -X POST "$BASE/mcp/gateway" -H "Origin: http://localhost:5173" -H 'content-type: application/json' -H 'accept: application/json, text/event-stream' --data '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
# R3 user files opened top-level at the node's origin.
row "R3a workspace content page.html" "$BASE/rest/workspaces/$WSID/content?path=page.html"
row "R3b workspace content pic.svg" "$BASE/rest/workspaces/$WSID/content?path=pic.svg"
row "R3c workspace content doc.pdf" "$BASE/rest/workspaces/$WSID/content?path=doc.pdf"
row "R3d workspace static page.html (417 preview route)" "$BASE/rest/workspaces/$WSID/static/page.html"
echo "done; results in $OUT/results.txt"
