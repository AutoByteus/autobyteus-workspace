# IMP-13 (D-D2, AC-D, AC-E; API-REV-001 F-1) MSP-102 on the fixed tree: a stopped call live and read back from the node
# command: pnpm -C autobyteus-server-ts build ; pnpm -C autobyteus-web build:mobile-web ;
#          cd autobyteus-web && node tests/e2e/mobile-shell-probe.mjs --cases=MSP-102 --output-dir=<tmp>
#          (the case is API/E2E's, tests/e2e/desktop-stopped-call-trace-cases.mjs, 54a305f690; unchanged)
# commit: e78a539dfe (the D-D2 fix 70f3d8d410 and the SR-005 removal)
# env: macOS arm64, Node v22.23.1, Chrome headless (desktop 1440x1000; phone 390x844, touch), loopback nodes,
#      scripted AGY with real step shapes
# date: 2026-11-23 (run started 01:23:22Z)
# result: Pass (unknownBrowserErrors 0). The parts that failed in API-REV-001 (F-1) now pass:
#   - the phone, opened after the stop: the row `{"status":"interrupted","word":"Stopped"}`, the detail "Stopped" with
#     the stop icon (MSP-102-phone-activity-stopped.png, MSP-102-phone-detail-stopped.png);
#   - after 50 echo turns (110 page events), a reload and the wheel to the top: the stopped call's earlier-trace card
#     has the stop icon (`browseHeld.stopped: true`, MSP-102-desktop-page-cards.png), and the page's GraphQL answer
#     for it is `"statusKey":"interrupted"` (`api.held`).
#   The live parts still pass: the live card `stopped: true`, the desktop Activity chip "Stopped"; AC-E: each page card's
#   summary equals the live card's, and the page's summaryArgs carry the shared keys.
#
# Observed, not changed: the phone detail still shows an "Error" section with "Tool execution interrupted." (red), and
# the desktop conversation shows that text under the card. The node stores that text as the stopped call's error and
# its content (the sequencer's default for an interrupt); this predates the ticket and AC-D does not ask about it.
