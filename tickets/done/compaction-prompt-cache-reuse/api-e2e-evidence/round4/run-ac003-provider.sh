#!/bin/bash
# AC-003 per-provider quality comparison: cached note vs transcript summary, both written AND continued on the given
# model, on histories A and B. Usage: run-ac003-provider.sh <model> <label>. Keys read in-process from the user's
# server .env (never printed). Source histories are read-only temp copies.
MODEL=$1; L=$2
W=/Users/normy/autobyteus_org/autobyteus-worktrees/compaction-prompt-cache-reuse; E=$W/tickets/in-progress/compaction-prompt-cache-reuse/api-e2e-evidence
getk() { grep "^$1=" /Users/normy/.autobyteus/server-data/.env | head -1 | cut -d= -f2- | sed -e "s/^[\"']//" -e "s/[\"']\$//"; }
D=$W/autobyteus-ts/tests/_ac003_$L; mkdir -p $D && cp $E/ac003/ac003-compare.test.ts $D/ac003-compare.test.ts
sed -i '' "s#'\.\./\.\./src/#'../../src/#g" $D/ac003-compare.test.ts
cd $W/autobyteus-ts; H=$(mktemp -d /tmp/ac003-home-XXXX)
run() { # $1 history label, $2 source path file, $3 continuations JSON (optional)
  local extra=(); [ -n "$3" ] && extra=(AC3_CONTINUATIONS="$3")
  env -i PATH="$PATH" HOME="$H" TMPDIR="${TMPDIR:-/tmp}" LANG=en_US.UTF-8 RUN_AC003=1 AC3_SKIP_GEMINI=1 AC3_MODEL="$MODEL" AC3_TRANSCRIPT_ONLY="${AC3_TRANSCRIPT_ONLY:-}" AC3_PROMPT_FILE="${AC3_PROMPT_FILE:-}" \
    ANTHROPIC_API_KEY="$(getk ANTHROPIC_API_KEY)" VERTEX_AI_API_KEY="$(getk VERTEX_AI_API_KEY)" DEEPSEEK_API_KEY="$(getk DEEPSEEK_API_KEY)" \
    AC3_SOURCE="$(cat $2)" AC3_OUT="$E/round4/ac003-$L-$1" "${extra[@]}" \
    ./node_modules/.bin/vitest run tests/_ac003_$L/ac003-compare.test.ts --no-watch > $E/round4/ac003-$L-$1.log 2>&1
  echo "exit $?" >> $E/round4/ac003-$L-$1.log; echo "$L $1: $(tail -1 $E/round4/ac003-$L-$1.log)"
}
[ -z "$ONLY" ] || [ "$ONLY" = A ] && run A /tmp/ac003-src-path
B_CONT='["Sorry for interrupting you earlier. From memory and without running any tools: remind me in a few sentences what problem you are solving (my original request), and roughly how your design works.","OK. Where exactly are the design files (worktree, ticket folder and file names), what is the current status of the design work (what is approved or reviewed, what is not), and what is still open or blocked? Do not run any tools."]'
[ -z "$ONLY" ] || [ "$ONLY" = B ] && run B /tmp/ac003-srcB-path "$B_CONT"
rm -rf "$H" $D
