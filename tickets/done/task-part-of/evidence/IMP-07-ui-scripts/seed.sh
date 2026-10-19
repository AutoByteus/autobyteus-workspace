#!/bin/bash
# Seeds the test-owned UI node through the real Project Task tools (separate process, worktree build).
set -e
ROOT=$1; PROJECT=$2; SERVER=/Users/normy/autobyteus_org/autobyteus-worktrees/task-part-of/autobyteus-server-ts
source /tmp/task-part-of-port/ui-env.sh
tool() { node $SERVER/tests/fixtures/project-task-tool-writer.mjs $ROOT/node "$1" "$2" $ROOT/tool-out.json; cat $ROOT/tool-out.json; echo; }
c() { tool create_task "{\"project_id\":\"$PROJECT\",\"description\":\"$1\"${2:+,$2}}"; }
u() { tool update_task "{\"task_id\":\"$1\",$2}"; }
cd $SERVER
c "Cross-node collaboration\nLet agents on different nodes delegate to each other."
c "Design the node handshake" '"part_of":"autobyteus-1"'
c "Build the relay service" '"part_of":"AutoByteus-1"'
c "Write the protocol docs" '"part_of":"autobyteus-1","depends_on":["autobyteus-3"]'
c "Retire the old bridge" '"part_of":"autobyteus-1"'
c "Test cross-node delegation end to end with two nodes and a scripted runtime" '"part_of":"autobyteus-1"'
c "Release notes for 1.5.6"
c "Onboarding redesign"
c "Welcome screen copy" '"part_of":"autobyteus-8"'
c "Sign-in illustration" '"part_of":"autobyteus-8"'
c "Old migration cleanup"
c "Drop legacy tables" '"part_of":"autobyteus-11"'
u autobyteus-1 '"status":"IN_PROGRESS"'
u autobyteus-2 '"status":"DONE"'
u autobyteus-3 '"status":"IN_PROGRESS"'
u autobyteus-5 '"status":"CANCELLED"'
u autobyteus-6 '"status":"DONE"'
u autobyteus-9 '"status":"DONE"'
u autobyteus-10 '"status":"DONE"'
u autobyteus-12 '"status":"CANCELLED"'
