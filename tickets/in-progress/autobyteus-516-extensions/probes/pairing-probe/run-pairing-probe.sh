#!/usr/bin/env bash
# Probe-only: runs run-pairing-probe.mjs in a fresh scratch folder and checks the founder's
# own Tailscale is unchanged before and after. Nothing outside the scratch folder is written.
set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
TOOLS="${1:-/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-516-probe-tools}"
SCRATCH="$(cd "$(mktemp -d "${TMPDIR:-/tmp}/autobyteus-516-pair.XXXXXX")" && pwd -P)"
ts_state() { tailscale status --json | python3 -I -c 'import json,sys; d=json.load(sys.stdin); print(d["BackendState"], len(d.get("Peer") or {}), "peers")'; }
BEFORE="$(ts_state)"
echo "scratch: $SCRATCH"
node "$HERE/run-pairing-probe.mjs" "$TOOLS" "$SCRATCH"
STATUS=$?
pkill -f "$SCRATCH" || true
AFTER="$(ts_state)"
echo "your Tailscale before: $BEFORE / after: $AFTER"
rm -rf "$SCRATCH"
exit $STATUS
