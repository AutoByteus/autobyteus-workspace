#!/bin/bash
# API-16 runner (autobyteus-437 API/E2E round 2): runs each migrated probe once, sequentially, into its own fresh folder.
W=/Users/normy/autobyteus_org/autobyteus-worktrees/node-universal-authentication-437
E=$W/tickets/in-progress/node-universal-authentication-437/evidence/api-e2e/API-16-probes
LEDGER=$E/API-16-ledger.md
mkdir -p $E; [[ -f $LEDGER ]] || printf '| Probe | Started (UTC) | Exit | Duration s | Last line |\n| --- | --- | --- | --- | --- |\n' > $LEDGER
cd $W/autobyteus-web
for name in "$@"; do
  p=tests/e2e/$name-probe.mjs; out=$E/$name; log=$E/$name.log
  if grep -q 'startsWith(`--${' $p; then args=("--output-dir=$out"); else args=(--output-dir "$out"); fi
  start=$(date +%s); { echo "# API-16 $name: node $p ${args[*]}"; echo "# commit $(git -C $W rev-parse --short HEAD) + round-2 probe migration; $(date -u +%FT%TZ)"; } > $log
  node $p "${args[@]}" >> $log 2>&1; code=$?
  last=$(grep -v '^\s*$' $log | tail -1 | tr '|' '/' | cut -c1-160)
  echo "| $name | $(date -u -r $start +%FT%TZ) | $code | $(( $(date +%s) - start )) | $last |" >> $LEDGER
done
