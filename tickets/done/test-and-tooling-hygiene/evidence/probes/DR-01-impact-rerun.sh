#!/bin/bash
set -u
C=/tmp/dr253/clone; LOG=/tmp/dr253/DR-01-ac016-clean-clone.txt
cd "$C"
{
echo
echo "-- full rerun stopped by delivery at 13:14 during server test:unit (no result taken from it): rerun-by-impact (TESTING.md) and API/E2E's reply say the merge delta needs only the web nuxt layer and the guards; server unit/integration, electron, node tests and the E2E files stay proven by API-21/API-10…19 on unchanged code"
echo "== impact set on the same clean clone, HEAD $(git rev-parse --short=10 HEAD), start $(date '+%F %T'), $(uptime | sed 's/.*load/load/')"
} >> "$LOG"
step() { local name="$1"; shift; echo "== $name: $*"; local s=$(date +%s); "$@" > "/tmp/dr253/$name.log" 2>&1; local rc=$?; echo "$name rc=$rc $(( $(date +%s)-s ))s"; grep -E '^\s*(Test Files|Tests)\s' "/tmp/dr253/$name.log" | tail -2; [ $rc -ne 0 ] && tail -40 "/tmp/dr253/$name.log"; return 0; }
{
step nuxt pnpm -C autobyteus-web test:nuxt --run
grep -E 'NfsGuideCard' /tmp/dr253/nuxt.log | head -3
step guardweb pnpm -C autobyteus-web guard:web-boundary
step guardloc pnpm -C autobyteus-web guard:localization-boundary
step auditloc pnpm -C autobyteus-web audit:localization-literals
echo "git status lines after run (tracked changes): $(git status --short --untracked-files=no | wc -l | tr -d ' ')"
echo "done $(date '+%F %T')"
} >> "$LOG" 2>&1
