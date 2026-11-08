#!/bin/bash
W=/Users/normy/autobyteus_org/autobyteus-worktrees/node-universal-authentication-437; T=$W/tickets/in-progress/node-universal-authentication-437; E=$T/evidence/api-e2e/API-16-probes; LEDGER=$E/API-16-ledger.md
row() { echo "| $1 | $(date -u +%FT%TZ) | $2 | $3 | $4 |" >> $LEDGER; }
cd $W/autobyteus-web
one() { name=$1; shift; log=$E/$name.log; s=$(date +%s); { echo "# API-16 $name: node $*"; echo "# commit $(git -C $W rev-parse --short HEAD) + round-2 probe migration; $(date -u +%FT%TZ)"; } > $log; node "$@" >> $log 2>&1; c=$?; row "$name" $c $(( $(date +%s) - s )) "$(grep -v '^\s*$' $log | tail -1 | tr '|' '/' | cut -c1-150)"; }
one agent-org-role-labels-r2 tests/e2e/agent-org-role-labels-probe.mjs --output-dir $E/agent-org-role-labels-r2
one large-runs-load-less-r2 tests/e2e/delegated-launch-defaults-probe.mjs --cases LRL-001,LRL-002,LRL-003,LRL-004,LRL-005 --output-dir $E/large-runs-load-less-r2
S=/tmp/abtest437r2/seeds; rm -rf $S; mkdir -p $S
one owner-scoped-file-reads-seed tests/e2e/owner-scoped-file-reads-probe.mjs --seed-to $S/owner-scoped --unrelated 100 --output-dir $E/owner-scoped-file-reads-seed
one owner-scoped-file-reads tests/e2e/owner-scoped-file-reads-probe.mjs --from-seed $S/owner-scoped --output-dir $E/owner-scoped-file-reads
one delegated-copies-large-hub-seed tests/e2e/delegated-copies-large-hub-probe.mjs --seed-to $S/large-hub --teams 10 --unrelated 50 --output-dir $E/delegated-copies-large-hub-seed
one delegated-copies-large-hub tests/e2e/delegated-copies-large-hub-probe.mjs --from-seed $S/large-hub --output-dir $E/delegated-copies-large-hub
one run-history-read-budget-seed tests/e2e/run-history-read-budget-probe.mjs --seed-to $S/run-history --output-dir $E/run-history-read-budget-seed
one run-history-read-budget tests/e2e/run-history-read-budget-probe.mjs --from-seed $S/run-history --output-dir $E/run-history-read-budget
cd $W && one github-skill-sources autobyteus-web/tests/e2e/github-skill-sources-probe.mjs $E/github-skill-sources
echo DONE > /tmp/abtest437r2/batch2.done
