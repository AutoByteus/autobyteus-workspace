#!/bin/bash
# usage: make-probe.sh <worktree>
set -e
D="$1/autobyteus-server-ts/tests/e2e/app-data-migrations"
awk '/^describe\("TeamRun released-shape/{exit} {print}' "$D/team-run-v1-production-upgrade.e2e.test.ts" > "$D/zz-rsam-upgrade-probe.e2e.test.ts"
cat /tmp/rsam-probe/probe-tail.ts >> "$D/zz-rsam-upgrade-probe.e2e.test.ts"
