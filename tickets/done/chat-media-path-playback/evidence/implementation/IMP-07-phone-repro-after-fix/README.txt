# IMP-07 the IMP-01 reproduction after the fix (same scratch case, same throttle)
# command: pnpm -C autobyteus-server-ts build ; pnpm -C autobyteus-web build:mobile-web ;
#          cd autobyteus-web && SD572_THROTTLE_KBPS=8000 node tests/e2e/mobile-shell-probe.mjs --cases=MSP-572 --output-dir=<this folder>
# commit: working tree before the commits, with the fix but before two later changes: the loading view's units were
#         still 1024-based ("9.2 MB" for 9,684,568 bytes; now decimal, "9.7 MB") and the scratch case was not yet replaced
# env: macOS, Node v22.23.1, Chrome 158 (headless, 390x844), ffmpeg 8.0.1, loopback; phone page at 8 Mbit/s (CDP)
# date: 2026-11-20
# result: Pass. cases.MSP-572.results.bigVideo.timeline: "Loading video…" at 190 ms, then "0.1 of 9.2 MB" rising by 0.1 MB
#   every ~100 ms to "9.2 of 9.2 MB" at 9617 ms; the video plays at 9719 ms (blob:, readyState 4, 20 s). "URL is not
#   available" never appears. The small files show "Loading video…" / "Loading audio…" for ~100 ms, then play.
# The durable cases that replace this scratch case: IMP-08.
