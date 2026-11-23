# IMP-06 (D-H, AC-H1, AC-H2) a run-relative Markdown link in a run's conversation opens the run's file (MSP-100)
# command: pnpm -C autobyteus-server-ts build ; pnpm -C autobyteus-web build:mobile-web ;
#          cd autobyteus-web && node tests/e2e/mobile-shell-probe.mjs --cases=MSP-100 --output-dir=<this folder>
# commit: working tree = ab72e00e7a (run before committing; same files)
# env: macOS arm64, Node v22.23.1, Chrome headless (desktop 1280x900; phone 390x844, touch), loopback node "alpha"
# date: 2026-11-22 (run started 21:12:53Z)
# result: Pass (MSP-100 Pass; browserErrors 0). Also Pass in the whole probe on d4af72998f (IMP-08).
#
# A run's reply holds four links relative to its folder; on the desktop and on the phone:
#   docs-609/a.md#x and media-609/clip-609.txt open that file of the run's folder (A-609-BODY, CLIP-609-BODY shown;
#   MSP-100-*-A-609-BODY.png, MSP-100-*-CLIP-609-BODY.png).
#   ../outside-609.md opens nothing; the conversation says "The file preview could not be opened." and the outside
#   file's text is never shown (MSP-100-phone-outside.png).
#   docs-609/gone-609.md opens the viewer, which shows the node's "File not found" (MSP-100-*-gone.png). The viewer
#   shows the node's raw text {"error":"File not found: <path>"}: follow-up FU-005, outside this ticket.
