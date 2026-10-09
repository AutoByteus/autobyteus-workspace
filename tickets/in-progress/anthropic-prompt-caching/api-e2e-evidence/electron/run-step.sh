#!/bin/bash
# Usage: run-step.sh <hold:true|false>  — one UI step against the isolated instance
export CHROME_REMOTE_DEBUGGING_PORT=64203 BROWSER_AUTOMATION_ATTACH_ONLY=1
BR=/Users/normy/autobyteus_org/autobyteus-skills/browser-automation/scripts/browser
cd "$(dirname "$0")"
bash $BR run-script --tab-id "$(cat tab-id)" --script-file scripts/step.js --arg-json "{\"hold\": ${1:-false}}" | python3 -c "import json,sys;d=json.load(sys.stdin);print(json.dumps(d['result']['result']) if d.get('ok') else json.dumps(d))"
