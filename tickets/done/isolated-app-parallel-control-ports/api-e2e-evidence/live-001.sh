#!/bin/bash
# LIVE-001 (AC-001, SCN-001): 9333 occupied -> default start succeeds elsewhere; browser-automation
# attach-only list-tabs on the reported port shows only this instance's window; stop by instanceId.
set -u
WT=/Users/normy/autobyteus_org/autobyteus-worktrees/isolated-app-parallel-control-ports
LAUNCHER=/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/.claude/skills/browser-automation/scripts/browser
PRIV=$(mktemp -d /tmp/abac1-XXXXXX)
cd "$WT"
node -e 'require("net").createServer().listen(9333,"127.0.0.1",()=>console.error("holder listening 127.0.0.1:9333"))' &
HOLDER=$!
sleep 1
echo "== 9333 holder"; lsof -nP -iTCP:9333 -sTCP:LISTEN
echo "== explicit --control-port 9333 while held (foreign busy)"
TMPDIR=$PRIV pnpm -s isolated-app start --app /Applications/AutoByteus.app --control-port 9333; echo "exit=$?"
echo "== default start while 9333 held"
TMPDIR=$PRIV pnpm -s isolated-app start --app /Applications/AutoByteus.app > $PRIV/start.json; echo "exit=$?"
cat $PRIV/start.json
CP=$(node -e 'console.log(JSON.parse(require("fs").readFileSync(process.argv[1])).result.controlPort)' $PRIV/start.json)
ID=$(node -e 'console.log(JSON.parse(require("fs").readFileSync(process.argv[1])).result.instanceId)' $PRIV/start.json)
PID=$(node -e 'console.log(JSON.parse(require("fs").readFileSync(process.argv[1])).result.pid)' $PRIV/start.json)
echo "controlPort=$CP instanceId=$ID pid=$PID"
echo "== listeners on controlPort"; lsof -nP -iTCP:$CP -sTCP:LISTEN
echo "== owner pgid of controlPort listener vs instance pid"
for p in $(lsof -nP -tiTCP:$CP -sTCP:LISTEN); do ps -o pid=,pgid=,comm= -p $p; done
echo "== browser-automation attach-only list-tabs on reported port"
env CHROME_REMOTE_DEBUGGING_PORT=$CP BROWSER_AUTOMATION_ATTACH_ONLY=1 bash "$LAUNCHER" list-tabs; echo "exit=$?"
echo "== /json/list page targets"
curl -s http://127.0.0.1:$CP/json/list | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.stringify(JSON.parse(s).filter(t=>t.type==="page").map(t=>({id:t.id,url:t.url})))))'
echo "== list (private registry)"; TMPDIR=$PRIV pnpm -s isolated-app list
echo "== stop by id"; TMPDIR=$PRIV pnpm -s isolated-app stop "$ID"; echo "exit=$?"
echo "== post-stop"; lsof -nP -iTCP:$CP -sTCP:LISTEN || echo "controlPort $CP free"
ps -o pid= -g $PID >/dev/null 2>&1 && echo "group alive" || echo "group $PID gone"
TMPDIR=$PRIV pnpm -s isolated-app list
kill $HOLDER; wait $HOLDER 2>/dev/null
lsof -nP -iTCP:9333 -sTCP:LISTEN || echo "9333 released"
ls -A $PRIV; rm -rf "$PRIV"; echo "private tmp removed"
