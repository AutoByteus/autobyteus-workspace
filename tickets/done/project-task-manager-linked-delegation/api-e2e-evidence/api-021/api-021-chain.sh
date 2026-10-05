#!/bin/bash
# API-REV-021 full rerun chain on the merge build (owned instance iso-50993-65ad). Stops at the first failure.
set -u
cd /Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-linked-delegation
E=tickets/in-progress/project-task-manager-linked-delegation/api-e2e-evidence/api-021; I=iso-50993-65ad; D=$(cat $E/api-207-data-root.txt)
run() { echo "=== $1 $(date -u +%H:%M:%S)"; shift; "$@"; c=$?; echo "=== exit $c"; [ $c -eq 0 ] || exit $c; }
snap() { find $D/server-data/projects -type f -exec shasum -a 256 {} \; | sed "s#$D##" | sort; }
run import python3 $E/api-021-pty-import.py
snap > $E/hashes-before-restart.txt
run restart-1 pnpm --silent isolated-app restart $I
snap > $E/hashes-after-restart.txt
run restart-no-op diff $E/hashes-before-restart.txt $E/hashes-after-restart.txt
run setup node $E/api-021-probe.mjs setup
run agent node $E/api-021-probe.mjs run agent
run agent_team node $E/api-021-probe.mjs run agent_team
run agent_org node $E/api-021-probe.mjs run agent_org
run reply node $E/api-021-reply.mjs
run done-smoke node $E/api-021-done.mjs
run restart-2 pnpm --silent isolated-app restart $I
run resume-agent node $E/api-021-probe.mjs resume agent
run resume-team node $E/api-021-probe.mjs resume agent_team
run resume-org node $E/api-021-probe.mjs resume agent_org
run damaged-prepare node $E/api-021-probe.mjs damaged-prepare
run restart-3 pnpm --silent isolated-app restart $I
run damaged node $E/api-021-probe.mjs damaged
run ui node $E/api-021-ui.mjs
echo "=== CHAIN COMPLETE"
