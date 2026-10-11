#!/bin/bash
# AC-003 rerun on IR-003 (instruction v4 / prompt v6) + AC-010 Gemini (Vertex Express and Gemini API), histories A and B.
# Keys read in-process from the user's server .env (never printed). Source histories are read-only temp copies.
W=/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-prompt-cache-reuse; E=$W/tickets/in-progress/compaction-prompt-cache-reuse/api-e2e-evidence
getk() { grep "^$1=" /Users/normy/.autobyteus/server-data/.env | head -1 | cut -d= -f2- | sed -e "s/^[\"']//" -e "s/[\"']\$//"; }
mkdir -p $W/autobyteus-ts/tests/_ac003 && cp $E/ac003/ac003-compare.test.ts $W/autobyteus-ts/tests/_ac003/
cd $W/autobyteus-ts; H=$(mktemp -d /tmp/ac003-home-XXXX)
run() { # $1 out-name, $2 source path file, $3 continuations JSON (optional)
  local extra=(); [ -n "$3" ] && extra=(AC3_CONTINUATIONS="$3")
  env -i PATH="$PATH" HOME="$H" TMPDIR="${TMPDIR:-/tmp}" LANG=en_US.UTF-8 RUN_AC003=1 ANTHROPIC_API_KEY="$(getk ANTHROPIC_API_KEY)" \
    VERTEX_AI_API_KEY="$(getk VERTEX_AI_API_KEY)" GEMINI_API_KEY="$(getk GEMINI_API_KEY)" AC3_SOURCE="$(cat $2)" AC3_OUT="$E/round2/$1" \
    "${extra[@]}" ./node_modules/.bin/vitest run tests/_ac003/ac003-compare.test.ts --no-watch > $E/round2/$1.log 2>&1
  echo "exit $?" >> $E/round2/$1.log; tail -1 $E/round2/$1.log
}
run ac003-A /tmp/ac003-src-path
B_CONT='["Sorry for interrupting you earlier. From memory and without running any tools: remind me in a few sentences what problem you are solving (my original request), and roughly how your design works.","OK. Where exactly are the design files (worktree, ticket folder and file names), what is the current status of the design work (what is approved or reviewed, what is not), and what is still open or blocked? Do not run any tools."]'
run ac003-B /tmp/ac003-srcB-path "$B_CONT"
rm -rf "$H" $W/autobyteus-ts/tests/_ac003
