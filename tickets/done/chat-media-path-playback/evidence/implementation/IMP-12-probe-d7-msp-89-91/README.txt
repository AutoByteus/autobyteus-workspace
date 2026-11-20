# IMP-12 D-7 on the phone: MSP-89 (with its new outside-folder steps) and API/E2E's MSP-91
# command: pnpm -C autobyteus-web build:mobile-web ; cd autobyteus-web && node tests/e2e/mobile-shell-probe.mjs --cases=MSP-89,MSP-91 --output-dir=<this folder>
#          (server dist from the unchanged server commit 02320583a5)
# commit: working tree = f2894c65e1 (run before committing; same files)
# env: macOS, Node v22.23.1, Chrome 158 headless (phone 390x844, production phone bundle), ffmpeg 8.0.1 (lavfi synthetic media), loopback
# date: 2026-11-20
# result: Pass (summary: MSP-89 Pass, MSP-91 Pass, unknownBrowserErrors 0; cleanup: servers stopped, temp root removed)
#
# MSP-89 (cases.MSP-89.results):
#   - outsideMissing (gone-572-out.mp4, outside the folder, not there yet): "This file was not found on the computer." with
#     Retry (MSP-89-outsideMissing.png). The probe then created the file and tapped Retry: the video plays (blob:,
#     readyState 4, 3 s; `after`; MSP-89-outsideMissing-after-retry.png).
#   - outsideFolder (folder-572.mp4, a folder outside the folder): "This path is a folder, not a file." and no Retry
#     (MSP-89-outsideFolder.png).
#   - missing (inside the folder): the player's "This video could not be played." with Retry, as before.
#   - all earlier MSP-89 steps pass as in IMP-08.
# MSP-91 (API/E2E's case; it failed in API-REV-001 at its outside step):
#   - outside: after the node was killed mid-download, "The file preview could not be opened." now with Retry
#     (`outside.state.retry: true`; MSP-91-outside-failed.png); tapping the link again plays it (MSP-91-outside-again.png).
#   - inside: the player's Retry reloads with its progress and plays, as before.
# Expected console lines: the 404/400 of MSP-89's missing videos and folder path, and MSP-91's stopped node (both
#   recorded with their cause).
