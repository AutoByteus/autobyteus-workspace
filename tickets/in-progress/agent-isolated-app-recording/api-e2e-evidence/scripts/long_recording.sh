#!/bin/bash
# Temporary probe (QR-006): 5-minute recording with continuous page change; samples recorder worker + ffmpeg RSS every 10 s.
set -u
OUT=$1; TAB=$2; PORT=$3; SECS=${4:-300}
B=/Users/normy/autobyteus_org/autobyteus_mcps-agent-isolated-app-recording/browser-automation/scripts/browser
br(){ env CHROME_REMOTE_DEBUGGING_PORT=$PORT BROWSER_AUTOMATION_ATTACH_ONLY=1 bash $B "$@"; }
cd "$OUT"
br run-script --tab-id $TAB --script 'async () => { await __abDemo.caption("long 0"); let n = 0; clearInterval(window.__apiLong); window.__apiLong = setInterval(() => { n += 1; __abDemo.caption("long run " + n + " " + new Date().toISOString()); }, 200); return "ok" }' > ticker.json
br start-recording --tab-id $TAB --output-file long-5min.mp4 --overwrite > start.json
sleep 1
WPID=$(pgrep -f "browser_automation.recording.worker" | head -1)
echo "t_s,worker_pid,worker_rss_kb,ffmpeg_pid,ffmpeg_rss_kb" > rss.csv
S=$(date +%s)
while [ $(( $(date +%s) - S )) -lt $SECS ]; do
  FPID=$(pgrep -P $WPID ffmpeg | head -1)
  echo "$(( $(date +%s) - S )),$WPID,$(ps -o rss= -p $WPID | tr -d ' '),$FPID,$(ps -o rss= -p ${FPID:-0} 2>/dev/null | tr -d ' ')" >> rss.csv
  sleep 10
done
br stop-recording --tab-id $TAB > stop.json
br run-script --tab-id $TAB --script '() => { clearInterval(window.__apiLong); return __abDemo.hideCaption() }' > ticker-stop.json
ffprobe -v error -show_entries format=duration:stream=codec_name,width,height,nb_frames -of json long-5min.mp4 > ffprobe.json
echo DONE > done.flag
