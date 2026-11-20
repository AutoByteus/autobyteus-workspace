# IMP-01 phone reproduction on the base code (the Solution Designer's scratch case MSP-572), throttled
# command: pnpm -C autobyteus-server-ts build ; pnpm -C autobyteus-web build:mobile-web ;
#          cd autobyteus-web && SD572_THROTTLE_KBPS=8000 node tests/e2e/mobile-shell-probe.mjs --cases=MSP-572 --output-dir=<this folder>
# commit: 315d6d94cf (base code; the scratch case committed by the Solution Designer)
# env: macOS, Node v22.23.1, Chrome 158 (headless, 390x844), ffmpeg 8.0.1 (lavfi synthetic media), loopback; phone page throttled to 8 Mbit/s by CDP
# date: 2026-11-20
# result: Fails as reported (the probe itself only records). mobile-shell-probe.json, cases.MSP-572.results:
#   bigVideo (9.7 MB, in the run's folder): "Video URL is not available." from 178 ms to 9817 ms, then the video plays.
#   insideAudio: "Audio URL is not available." while it downloads. Outside files: "Opening…".
# Screenshots: MSP-572-*.png (taken when each file played).
