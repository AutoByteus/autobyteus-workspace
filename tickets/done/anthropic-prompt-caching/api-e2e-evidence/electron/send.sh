#!/bin/bash
# Usage: send.sh "<message>" — type a message into the run composer and press Enter, like a user.
cd "$(dirname "$0")"; export CHROME_REMOTE_DEBUGGING_PORT=64203 BROWSER_AUTOMATION_ATTACH_ONLY=1
ARG=$(python3 -c 'import json,sys;print(json.dumps({"msg":sys.argv[1]}))' "$1")
bash /Users/normy/autobyteus_org/autobyteus-skills/browser-automation/scripts/browser run-script --tab-id "$(cat tab-id)" --script 'async (a) => { const t=await __abDemo.type({selector:"textarea"}, a.msg, {delayMs: 2}); await new Promise(r=>setTimeout(r,300)); const p=await __abDemo.press("Enter"); return {t:t.ok,p:p.ok}; }' --arg-json "$ARG" | python3 -c "import json,sys;print(json.load(sys.stdin)['result']['result'])"
