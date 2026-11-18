#!/bin/bash
W=/Users/normy/autobyteus_org/autobyteus-worktrees/node-universal-authentication-437; T=$W/tickets/in-progress/node-universal-authentication-437; E=$T/evidence/api-e2e
row() { echo "| $(date -u +%FT%TZ) | $1 | $2 | $3 | $4 |" >> $T/api-e2e-test-progress.md; }
cd $W
row API-03 Started "" "round 2: build:mobile-web then mobile-shell"
{ echo "# R2 API-03 prerequisite: pnpm -C autobyteus-web build:mobile-web; commit $(git rev-parse --short HEAD); $(date -u +%FT%TZ)"; pnpm -C autobyteus-web build:mobile-web 2>&1 | tail -6; echo "# Exit status: ${PIPESTATUS[0]}"; } > $E/R2-API-03-build-mobile-web.log
run() { id=$1; script=$2; row $id Started "" "round 2: $script"; pnpm -C autobyteus-web $script --output-dir=$E/R2-$id-${script#test:e2e:} > $E/R2-$id-${script#test:e2e:}.log 2>&1; c=$?; row $id Completed "$([[ $c == 0 ]] && echo Pass || echo Fail)" "exit $c; $(grep -v '^\s*$' $E/R2-$id-${script#test:e2e:}.log | tail -1 | tr '|' '/' | cut -c1-140)"; }
run API-03 test:e2e:mobile-shell
run API-08 test:e2e:node-vocabulary
run API-05 test:e2e:remote-run-title
run API-06 test:e2e:remote-runs-in-tree
run API-07 test:e2e:model-routing-decisions
run API-09 test:e2e:remote-nodes-page
echo DONE > /tmp/abtest437r2/r2-probes.done
