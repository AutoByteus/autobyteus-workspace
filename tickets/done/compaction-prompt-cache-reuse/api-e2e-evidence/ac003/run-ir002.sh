#!/bin/bash
# AC-003 on IR-002 wording: sample A (with Gemini) then sample B. Keys read in-process from the user's server .env.
W=/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-prompt-cache-reuse; E=$W/tickets/in-progress/compaction-prompt-cache-reuse/api-e2e-evidence/ac003
getk() { grep "^$1=" /Users/normy/.autobyteus/server-data/.env | head -1 | cut -d= -f2- | sed -e "s/^[\"']//" -e "s/[\"']\$//"; }
mkdir -p $W/autobyteus-ts/tests/_ac003 && cp $E/ac003-compare.test.ts $W/autobyteus-ts/tests/_ac003/
cd $W/autobyteus-ts
H=$(mktemp -d /tmp/ac003-home-XXXX)
env -i PATH="$PATH" HOME="$H" TMPDIR="${TMPDIR:-/tmp}" LANG=en_US.UTF-8 RUN_AC003=1 ANTHROPIC_API_KEY="$(getk ANTHROPIC_API_KEY)" VERTEX_AI_API_KEY="$(getk VERTEX_AI_API_KEY)" AC3_SOURCE="$(cat /tmp/ac003-src-path)" AC3_OUT="$E/run-4-ir002-A" ./node_modules/.bin/vitest run tests/_ac003/ac003-compare.test.ts --no-watch > $E/run-4-ir002-A.log 2>&1; echo "exit $?" >> $E/run-4-ir002-A.log
B_CONT='["Sorry for interrupting you earlier. From memory and without running any tools: remind me in a few sentences what problem you are solving (my original request), and roughly how your design works.","OK. Where exactly are the design files (worktree, ticket folder and file names), what is the current status of the design work (what is approved or reviewed, what is not), and what is still open or blocked? Do not run any tools."]'
env -i PATH="$PATH" HOME="$H" TMPDIR="${TMPDIR:-/tmp}" LANG=en_US.UTF-8 RUN_AC003=1 ANTHROPIC_API_KEY="$(getk ANTHROPIC_API_KEY)" AC3_SOURCE="$(cat /tmp/ac003-srcB-path)" AC3_OUT="$E/run-4-ir002-B" AC3_CONTINUATIONS="$B_CONT" ./node_modules/.bin/vitest run tests/_ac003/ac003-compare.test.ts --no-watch > $E/run-4-ir002-B.log 2>&1; echo "exit $?" >> $E/run-4-ir002-B.log
rm -rf "$H" $W/autobyteus-ts/tests/_ac003
