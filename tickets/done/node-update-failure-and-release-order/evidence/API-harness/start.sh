#!/bin/bash
# Starts the isolated instance from the fresh-clone bundle on the test-owned data root; writes the start JSON to
# /tmp/ab412-e2e/logs/iso-start-<label>.json and the control port / instance id to /tmp/ab412-e2e/current.{port,id}.
label="$1"
cd /Users/normy/autobyteus_org/autobyteus-worktrees/node-update-failure-and-release-order || exit 1
pnpm --silent isolated-app start \
  --app /private/tmp/ab412-e2e/clone/autobyteus-web/electron-dist/mac-arm64/AutoByteus.app \
  --data-root /private/tmp/ab412-e2e/data-root \
  > "/tmp/ab412-e2e/logs/iso-start-$label.json" 2>>/tmp/ab412-e2e/logs/iso-start.stderr
status=$?
python3 -I -c 'import json,sys; r=json.load(open(sys.argv[1]))["result"]; open("/tmp/ab412-e2e/current.port","w").write(str(r["controlPort"])); open("/tmp/ab412-e2e/current.id","w").write(r["instanceId"]); print(r["instanceId"], r["controlPort"], r["pid"])' "/tmp/ab412-e2e/logs/iso-start-$label.json"
echo "start-exit $status at $(date -u +%FT%TZ)"
