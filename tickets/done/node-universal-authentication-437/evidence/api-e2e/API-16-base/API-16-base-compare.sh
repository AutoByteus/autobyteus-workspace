#!/bin/bash
# API-16 base comparison (Rule 9): the same probe on base b690a5dfdb (no node access) and this branch.
W=/Users/normy/autobyteus_org/autobyteus-worktrees/node-universal-authentication-437; B=/tmp/abtest437r2/base-wt
E=$W/tickets/in-progress/node-universal-authentication-437/evidence/api-e2e/API-16-base; mkdir -p $E; L=$E/API-16-base-ledger.md
[[ -f $L ]] || printf '| Run | Started (UTC) | Exit | Duration s | Last line |\n| --- | --- | --- | --- | --- |\n' > $L
one() { name=$1; dir=$2; shift 2; log=$E/$name.log; s=$(date +%s); { echo "# API-16-base $name: (cwd $dir) node $*"; echo "# $(date -u +%FT%TZ); load $(uptime | sed 's/.*averages: //')"; } > $log; (cd $dir && node "$@") >> $log 2>&1; c=$?; echo "| $name | $(date -u -r $s +%FT%TZ) | $c | $(( $(date +%s) - s )) | $(grep -v '^\s*$' $log | tail -1 | tr '|' '/' | cut -c1-150) |" >> $L; }
one base-internal-agents $B/autobyteus-web tests/e2e/internal-agents-probe.mjs --output-dir=$E/base-internal-agents
one base-memory-search $B/autobyteus-web tests/e2e/memory-search-probe.mjs --output-dir $E/base-memory-search
one base-runtime-switch $B/autobyteus-web tests/e2e/runtime-switch-probe.mjs --output-dir $E/base-runtime-switch
one base-github-skill-sources $B autobyteus-web/tests/e2e/github-skill-sources-probe.mjs $E/base-github-skill-sources
S=/tmp/abtest437r2/seeds/run-history
for i in 1 2; do
  one rhrb-base-$i $W/autobyteus-web tests/e2e/run-history-read-budget-probe.mjs --from-seed $S --stack-root $B --label base --output-dir $E/rhrb-base-$i
  one rhrb-current-$i $W/autobyteus-web tests/e2e/run-history-read-budget-probe.mjs --from-seed $S --label current --output-dir $E/rhrb-current-$i
done
echo DONE > /tmp/abtest437r2/base-compare.done
