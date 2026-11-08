#!/bin/bash
# Isolated check of the built node-access CLI against a test-owned built node (loopback, temp data folder).
set -u
cd /Users/normy/autobyteus_org/autobyteus-worktrees/node-universal-authentication-437/autobyteus-server-ts
D=$(mktemp -d /tmp/nac.XXXX)
D=$(cd "$D" && pwd -P)
H=$(mktemp -d)
P=$((39100 + RANDOM % 800))
printf 'APP_ENV=test\nAUTOBYTEUS_SERVER_HOST=http://127.0.0.1:%s\n' "$P" > "$D/.env"
env -i PATH="$PATH" HOME="$H" TMPDIR="$TMPDIR" node dist/app.js --host 127.0.0.1 --port "$P" --data-dir "$D" > "$D/server.out" 2>&1 &
SP=$!
for i in $(seq 1 60); do
  code=$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$P/rest/health")
  [ "$code" = "200" ] && break
  sleep 1
done
echo "health: $(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$P/rest/health")"
echo "graphql without credential: $(curl -s -o /dev/null -w '%{http_code}' -X POST -H 'content-type: application/json' -d '{"query":"{__typename}"}' "http://127.0.0.1:$P/graphql")"
ls -la "$D/node-access/"
OUT=$(env -i PATH="$PATH" HOME="$H" node dist/node-access-cli.js setup-code --data-dir "$D" 2>&1)
echo "cli exit: $?"
echo "$OUT" | sed -E 's/[A-Za-z0-9_-]{20,}/<code>/g'
CODE=$(echo "$OUT" | grep -oE '[A-Za-z0-9_-]{20,}' | head -1)
printf '{"setupCode":"%s","desktopName":"cli-check"}' "$CODE" > "$H/body.json"
echo "exchange: $(curl -s -X POST -H 'content-type: application/json' --data-binary @"$H/body.json" "http://127.0.0.1:$P/rest/node-access/setup-exchanges" | sed -E 's/own_[A-Za-z0-9_-]+/own_<credential>/g')"
echo "replay: $(curl -s -X POST -H 'content-type: application/json' --data-binary @"$H/body.json" "http://127.0.0.1:$P/rest/node-access/setup-exchanges")"
echo "code in server output or logs: $(grep -rl --exclude=*.sock -- "$CODE" "$D" 2>/dev/null | wc -l | tr -d ' ') files"
kill "$SP"
wait "$SP" 2>/dev/null
echo "after the node stopped:"
env -i PATH="$PATH" HOME="$H" node dist/node-access-cli.js setup-code --data-dir "$D" 2>&1 | head -3
echo "long data folder:"
L="/tmp/$(printf 'x%.0s' $(seq 1 90))"
env -i PATH="$PATH" HOME="$H" node dist/node-access-cli.js setup-code --data-dir "$L" 2>&1 | head -3
rm -rf "$D" "$H"
