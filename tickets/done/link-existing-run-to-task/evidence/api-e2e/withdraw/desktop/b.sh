#!/bin/bash
# Drives one isolated AutoByteus instance's renderer over CDP (attach-only; never the user's app).
# Usage: b.sh <cdpPort> js '<javascript>'   |  b.sh <cdpPort> shot <name>  |  b.sh <cdpPort> text
set -e
S=/Users/normy/autobyteus_org/autobyteus-skills/browser-automation/scripts/browser
DIR="$(cd "$(dirname "$0")" && pwd)"
export CHROME_REMOTE_DEBUGGING_PORT="$1" BROWSER_AUTOMATION_ATTACH_ONLY=1
TAB=$($S list-tabs | python3 -c 'import json,sys; t=[x for x in json.load(sys.stdin)["result"]["tabs"] if "renderer/index.html" in x["url"]]; print(t[0]["tab_id"])')
case "$2" in
  js) $S run-script --tab-id "$TAB" --script "$3" | python3 -c 'import json,sys; d=json.load(sys.stdin); r=d.get("result",{}); print(json.dumps(r.get("result"), ensure_ascii=False) if d.get("ok") else json.dumps(d)[:2000])' ;;
  shot) cd "$DIR" && $S screenshot --tab-id "$TAB" --output-file "$3.png" --viewport-only --overwrite >/dev/null && echo "$DIR/$3.png" ;;
  text) $S run-script --tab-id "$TAB" --script 'document.body.innerText' | python3 -c 'import json,sys; print(json.load(sys.stdin)["result"]["result"])' ;;
esac
