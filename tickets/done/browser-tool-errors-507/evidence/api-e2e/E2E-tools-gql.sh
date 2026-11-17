#!/bin/bash
# Usage: gql.sh <controlPort> <backendPort> <tabId> '<graphql query>' ['<variables json>']
# Sends a GraphQL request from the instance's own window (its node credential applies).
Q=$(python3 -c 'import json,sys;print(json.dumps(sys.argv[1]))' "$4")
V=${5:-{\}}
CHROME_REMOTE_DEBUGGING_PORT=$1 BROWSER_AUTOMATION_ATTACH_ONLY=1 bash /Users/normy/autobyteus_org/autobyteus-skills/browser-automation/scripts/browser run-script --tab-id "$3" --script "async () => { const r = await fetch('http://127.0.0.1:$2/graphql', {method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({query: $Q, variables: $V})}); return await r.json(); }" | python3 -c 'import json,sys;print(json.dumps(json.load(sys.stdin)["result"]["result"],indent=1))'
