# IMP-08 durable media cases: MSP-89 (phone) and MSP-90 (desktop window)
# command: pnpm -C autobyteus-server-ts build ; pnpm -C autobyteus-web build:mobile-web ;
#          cd autobyteus-web && node tests/e2e/mobile-shell-probe.mjs --cases=MSP-89,MSP-90 --output-dir=<this folder>
# commit: working tree = the server and web commits of IMP-001 (run before committing; same files)
# env: macOS, Node v22.23.1, Chrome 158 headless (phone 390x844, production phone bundle; desktop 1440x1000, nuxt dev),
#      ffmpeg 8.0.1 (lavfi synthetic media only), loopback; the big videos at 8 Mbit/s (CDP)
# date: 2026-11-20
# result: Pass (summary: MSP-89 Pass, MSP-90 Pass, unknownBrowserErrors 0; cleanup: servers stopped, temp root removed)
#
# MSP-89, phone (cases.MSP-89):
#   - insideVideo, insideAudio, outsideVideo, outsideAudio, delegatedVideo, delegatedAudio: each plays (blob:, readyState 4,
#     duration 3 s), Back returns to the conversation, "URL is not available" never shown.
#   - insideBig / outsideBig (9,785,004 bytes here; ffmpeg's size varies a little per run): "Loading video…" with 94
#     distinct progress texts, "0.1 of 9.8 MB" rising to "9.7 of 9.8 MB" (the probe samples every 100 ms), then the 20 s
#     video plays at ~10 s. Screenshots *-loading.png were taken ~3 s in.
#   - missing (gone-572.mp4 in the folder): "This video could not be played." with Retry (MSP-89-missing.png); its 404 is
#     the one expected console line.
#   - mediaReads: 9 reads through /rest/workspaces/…/content and /rest/node-files/content, all 9 with the phone's key in the
#     Authorization header, no key in any URL; no 401/403; no main-frame navigation to /rest.
#   - relativeLink: {"fileControl": false, "href": "media/rel-572.mp4"}: a relative Markdown link in a conversation is an
#     ordinary link, not a file link (only absolute paths are; absoluteFilePathAction.ts). Recorded, not tapped: see the
#     handoff's Design Impact (REQ-002 relative paths).
# MSP-90, desktop window (cases.MSP-90): the run's folder video and audio play from the node URL (readyState 4, 3 s); the
#   outside ones play as blob: through GET /rest/node-files/content (200).
#
# failedRequests: /rest/health ERR_ABORTED from the main probe's own phone page (also 9-12 per run on the base, IMP-01);
#   two blob: ERR_ABORTED on the epsilon phone. Measured in a diagnostic run (timestamps added temporarily, then removed):
#   each came within 250 ms of leaving a big video's viewer (11.30 s vs its end at 11.41 s; 21.15 s vs 21.40 s). The 20 s
#   video element was still reading its blob when Back unmounted it, so Chrome aborted that read. Not an error.
