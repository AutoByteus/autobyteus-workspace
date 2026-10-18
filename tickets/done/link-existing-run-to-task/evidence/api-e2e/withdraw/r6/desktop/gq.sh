#!/bin/bash
# GraphQL against one isolated instance's embedded server (never the user's app). Usage: gq.sh <backendPort> '<query>' ['<variables json>']
python3 - "$1" "$2" "${3:-"{}"}" <<'PY'
import json, sys, urllib.request
port, query, variables = sys.argv[1], sys.argv[2], json.loads(sys.argv[3])
req = urllib.request.Request(f"http://127.0.0.1:{port}/graphql", data=json.dumps({"query": query, "variables": variables}).encode(), headers={"content-type": "application/json"})
print(json.dumps(json.load(urllib.request.urlopen(req, timeout=120)), ensure_ascii=False))
PY
