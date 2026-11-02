#!/usr/bin/env bash
# TEMPORARY API/E2E harness (autobyteus-356), kept as evidence; not repository test code.
# Repeats the read-only-volume journey on fresh profiles until the native refusal lands during the preparation
# (the install's stop has begun), and classifies each sample from the instance log:
#   before = refused inside the 100 ms start delay: no stop, no recovery, the old process keeps its server
#   during = the preparation had begun: server exit logged, recovery relaunches
# Each sample: wipe the data root and the copy's updater cache; start from the mount; click the switch; collect.
# Stops at the first "during" sample and leaves that app running for inspection, unless KEEP_GOING=1.
# Usage: API-356-ro-samples.sh <run root> <evidence dir> <first sample no.> <last sample no.>
R="$1"; E="$2"; FIRST="$3"; LAST="$4"; OUT="$E/API-05-r2-samples.log"
for n in $(seq "$FIRST" "$LAST"); do
  rm -rf "$R/data-ro" "$HOME/Library/Caches/autobyteus-updater-an356"; mkdir -p "$R/data-ro"
  J="$R/logs/inst-ro-$n.json"; bash "$R/start.sh" "$R/mnt-ro/AutoByteus.app" "$R/data-ro" 47923 "$J" > /dev/null
  CP=$(node -p 'JSON.parse(require("fs").readFileSync(process.argv[1])).result.controlPort' "$J")
  PID=$(node -p 'JSON.parse(require("fs").readFileSync(process.argv[1])).result.pid' "$J")
  ID=$(node -p 'JSON.parse(require("fs").readFileSync(process.argv[1])).result.instanceId' "$J")
  LOG=$(node -p 'JSON.parse(require("fs").readFileSync(process.argv[1])).result.logPath' "$J")
  sleep "${BEFORE_CLICK:-15}"; (cd "$R/clean" && node "$E/API-356-drive.mjs" "$CP" "$E/API-356-page-toggle.js" > /dev/null)
  for _ in $(seq 1 30); do sleep 1; grep -q "Auto-update failed. (kind=install" "$LOG" && break; done; sleep 12
  cp "$LOG" "$E/API-05-r2-sample-$n-instance.log"
  dl=$(grep -m1 "has been downloaded" "$LOG" | cut -c2-25); ref=$(grep -m1 "Auto-update failed. (kind=install" "$LOG" | cut -c2-25); ex=$(grep -m1 "Server process exited" "$LOG" | cut -c2-25)
  if grep -q "relaunching this version" "$LOG"; then branch=during; else branch=before; fi
  alive=$(kill -0 "$PID" 2>/dev/null && echo yes || echo no); health=$(curl -s -m 3 -o /dev/null -w '%{http_code}' http://127.0.0.1:47923/rest/health)
  echo "sample $n: branch=$branch downloaded=$dl refused=$ref serverExit=${ex:-none} recoveryLines=$(grep -c 'relaunching this version\|server exit is not confirmed' "$LOG") oldPidAlive=$alive health=$health instance=$ID cp=$CP" | tee -a "$OUT"
  if [ "$branch" = during ] && [ "${KEEP_GOING:-0}" != 1 ]; then echo "$J" > "$R/during-instance.txt"; exit 0; fi
  (cd "$R/clean" && node autobyteus-web/scripts/isolated-app/cli.mjs stop "$ID" > /dev/null 2>&1); osascript -e 'tell application id "com.autobyteus.app.an356" to quit' 2>/dev/null; sleep 3
done
