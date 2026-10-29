#!/bin/bash
# Seeds the test-owned UI node through the real Project Task tools (separate process, worktree build).
set -e
ROOT=$1; PROJECT=$2; SERVER=/Users/normy/autobyteus_org/autobyteus-worktrees/task-comments/autobyteus-server-ts
source /tmp/task-comments-port/ui-env.sh
tool() { node $SERVER/tests/fixtures/project-task-tool-writer.mjs $ROOT/node "$1" "$2" $ROOT/tool-out.json 2>/dev/null | grep -v "^Successfully\|^AgentFactory\|^Platform\|^App " || true; cat $ROOT/tool-out.json; echo; }
cd $SERVER
tool create_task "{\"project_id\":\"$PROJECT\",\"description\":\"Cross-node collaboration\\nLet agents on different nodes delegate to each other.\"}"
tool create_task "{\"project_id\":\"$PROJECT\",\"description\":\"Release notes for 1.5.6\"}"
tool create_task "{\"project_id\":\"$PROJECT\",\"description\":\"Sidebar collapse state is lost\"}"
tool update_task '{"task_id":"autobyteus-1","add_comment":"Dispatched with this direction."}'
tool update_task '{"task_id":"AutoByteus-1","status":"IN_PROGRESS","add_comment":"User decided:\n- ship the relay on the beta channel first\n- keep the old bridge until 1.6"}'
tool update_task '{"task_id":"autobyteus-1","add_comment":"A much longer comment to check wrapping: the relay needs a heartbeat every thirty seconds, the peers keep a list of the links they trust, and a link that misses three heartbeats is shown as offline in the Nodes page until it reconnects on its own."}'
tool update_task '{"task_id":"autobyteus-2","add_comment":"Mention the quokka migration."}'
tool update_task '{"task_id":"autobyteus-2","add_comment":"   "}'
