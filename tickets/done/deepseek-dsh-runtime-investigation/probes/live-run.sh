#!/bin/bash
# live-run.sh <name> <cwd> <patch> <stepsJson> : real DeepSeek via vault-backed forwarder; evidence in /tmp/ab387-ext/evidence
E=/tmp/ab387-ext/evidence; A=/Users/normy/autobyteus_org/autobyteus-worktrees/agy-acp-runtime
P=18791; while lsof -nP -iTCP:$P -sTCP:LISTEN >/dev/null 2>&1; do P=$((P+1)); done
PASS=run-pass-live-$RANDOM; rm -f $E/$1-*.jsonl $E/$1.jsonl
env -i PATH=/opt/homebrew/bin:/usr/bin:/bin HOME=$HOME PASS=$PASS /opt/homebrew/bin/node /tmp/ab387-probe-scripts/vault-forwarder.mjs $P $A/autobyteus-ts/dist/secrets/vault/open-test-vault.js $HOME/.autobyteus-test/vault $E/$1-forwarder.jsonl >/dev/null 2>&1 & F=$!
sleep 3; cd "$2"
env -i PATH=/opt/homebrew/bin:/usr/bin:/bin HOME=/tmp/ab387-ext/home DSH_HOME=/tmp/ab387-ext/home/.dsh DEEPSEEK_API_KEY=$PASS DEEPSEEK_BASE_URL=http://127.0.0.1:$P/anthropic PROBE_PERMISSION=${PROBE_PERMISSION:-allow-once} PROBE_ARGS="[\"--patch\",\"$3\"]" /opt/homebrew/bin/node /tmp/ab387-probe-scripts/dsh-acp-probe.mjs /tmp/ab387-ext/dsh-npm/node_modules/.bin/dsh "$2" $E/$1.jsonl "$4"
kill $F 2>/dev/null; wait $F 2>/dev/null; pkill -f "vault-forwarder.mjs $P " 2>/dev/null; true
echo "== $1 forwarder: $(grep -c '"upstreamStatus":200' $E/$1-forwarder.jsonl) ok requests, non-200: $(grep upstreamStatus $E/$1-forwarder.jsonl | grep -vc '"upstreamStatus":200')"
grep -E 'agent_message_chunk|"tool_call"|tool_call_update|request_permission|stopReason|"error"' $E/$1.jsonl | sed -E 's/"sessionId":"[^"]+",//; s/"messageId":"[^"]+",//; s/^\{"t":[0-9]+,"dir":"(in|out)","frame":\{"jsonrpc":"2.0",//' | cut -c1-520
