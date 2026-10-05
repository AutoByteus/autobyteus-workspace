#!/bin/bash
# API-REV-022 per-runtime journey chain on the merge build. Usage: rt-chain.sh <codex|claude|agy>
# Fresh owned isolated instance per runtime; continues past a failing phase and records every exit code.
set -u
cd /Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-linked-delegation
RT=$1; B=tickets/in-progress/project-task-manager-linked-delegation/api-e2e-evidence/api-022; E=$B/$RT; mkdir -p $E
export RT
step() { echo "=== $1 $(date -u +%H:%M:%S)"; shift; "$@"; c=$?; echo "=== exit $c"; return 0; }
must() { echo "=== $1 $(date -u +%H:%M:%S)"; shift; "$@"; c=$?; echo "=== exit $c"; [ $c -eq 0 ] || { echo "=== ABORT (infrastructure step failed)"; exit $c; }; }
must start bash -c "pnpm --silent isolated-app start --from-worktree > $E/instance.json 2> $E/start.log"
I=$(python3 -c "import json;print(json.load(open('$E/instance.json'))['result']['instanceId'])"); echo "instance $I"
must import python3 $B/rt-import.py $E/instance.json
must restart-import pnpm --silent isolated-app restart $I
step setup node $B/rt-probe.mjs setup
step agent node $B/rt-probe.mjs run agent
step agent_team node $B/rt-probe.mjs run agent_team
step agent_org node $B/rt-probe.mjs run agent_org
step reply node $B/rt-reply.mjs
step done-smoke node $B/rt-done.mjs
must restart-2 pnpm --silent isolated-app restart $I
step resume-agent node $B/rt-probe.mjs resume agent
step resume-team node $B/rt-probe.mjs resume agent_team
step resume-org node $B/rt-probe.mjs resume agent_org
step damaged-prepare node $B/rt-probe.mjs damaged-prepare
must restart-3 pnpm --silent isolated-app restart $I
step damaged node $B/rt-probe.mjs damaged
echo "=== CHAIN COMPLETE $RT"
