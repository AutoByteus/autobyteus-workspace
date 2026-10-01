#!/bin/bash
# LIVE-002 (AC-002, SCN-002): three concurrent default starts from three different worktree cwds
# sharing one (private) registry; browser-automation attach-only list-tabs per reported port.
set -u
WT=/Users/normy/autobyteus_org/autobyteus-worktrees/isolated-app-parallel-control-ports
CLI=$WT/autobyteus-web/scripts/isolated-app/cli.mjs
LAUNCHER=/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/.claude/skills/browser-automation/scripts/browser
PRIV=$(mktemp -d /tmp/abac2-XXXXXX)
CWDS=("$WT" "$1" "$2")
i=0
for d in "${CWDS[@]}"; do
  (cd "$d" && TMPDIR=$PRIV INIT_CWD="$d" node "$CLI" start --app /Applications/AutoByteus.app > $PRIV/start-$i.json; echo "start-$i cwd=$d exit=$?") &
  i=$((i+1))
done
wait
IDS=()
for i in 0 1 2; do
  read CP ID PID < <(node -e 'const r=JSON.parse(require("fs").readFileSync(process.argv[1])); if(!r.ok){console.log("ERR ERR ERR"); console.error(JSON.stringify(r)); process.exit()} console.log(r.result.controlPort, r.result.instanceId, r.result.pid)' $PRIV/start-$i.json)
  echo "== instance $i controlPort=$CP instanceId=$ID pid=$PID"
  IDS+=("$ID")
  for p in $(lsof -nP -tiTCP:$CP -sTCP:LISTEN); do echo "listener: $(lsof -nP -a -p $p -iTCP:$CP -sTCP:LISTEN -Fn | grep ^n)  pid/pgid: $(ps -o pid=,pgid= -p $p)"; done
  env CHROME_REMOTE_DEBUGGING_PORT=$CP BROWSER_AUTOMATION_ATTACH_ONLY=1 bash "$LAUNCHER" list-tabs; echo " list-tabs exit=$?"
done
echo "== shared registry list"; TMPDIR=$PRIV node "$CLI" list | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.stringify(JSON.parse(s).result.instances.map(i=>[i.instanceId,i.controlPort,i.serverPort,i.running]))))'
for ID in "${IDS[@]}"; do
  echo "== stop $ID"; TMPDIR=$PRIV node "$CLI" stop "$ID" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const r=JSON.parse(s);console.log(JSON.stringify(r.ok?r.result:r.error))})'
done
TMPDIR=$PRIV node "$CLI" list | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log("remaining records:",JSON.parse(s).result.instances.length))'
rm -rf "$PRIV"; echo "private tmp removed"
