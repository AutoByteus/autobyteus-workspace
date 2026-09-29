#!/bin/bash
# CTRL-001: control for the stop `forced` observation. Same env as LIVE-001, explicit --control-port
# (unchanged path) and the auto path, each followed by stop by id.
set -u
WT=/Users/normy/autobyteus_org/autobyteus-worktrees/isolated-app-parallel-control-ports
PRIV=$(mktemp -d /tmp/abac3-XXXXXX)
cd "$WT"
EXP=$(node -e 'const s=require("net").createServer().listen(0,"127.0.0.1",()=>{console.log(s.address().port);s.close()})')
for mode in explicit auto; do
  if [ $mode = explicit ]; then ARGS="--control-port $EXP"; else ARGS=""; fi
  ID=$(TMPDIR=$PRIV node autobyteus-web/scripts/isolated-app/cli.mjs start --app /Applications/AutoByteus.app $ARGS | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const r=JSON.parse(s);console.log(r.result.instanceId)})')
  echo "$mode started $ID"
  T0=$(date +%s)
  TMPDIR=$PRIV node autobyteus-web/scripts/isolated-app/cli.mjs stop "$ID" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const r=JSON.parse(s).result;console.log(JSON.stringify({id:r.instanceId,wasRunning:r.wasRunning,forced:r.forced,controlPortReleased:r.controlPortReleased}))})'
  echo "$mode stop took $(( $(date +%s) - T0 ))s"
done
rm -rf "$PRIV"
