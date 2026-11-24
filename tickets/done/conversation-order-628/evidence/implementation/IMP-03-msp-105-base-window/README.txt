# IMP-03a (D-1, AC-001, AC-002) MSP-105 on a phone bundle built with the base window: the founder's bug on a real stack
# command: recentEventMonitorWindow.ts from the base 1f761bc8db ; pnpm -C autobyteus-web build:mobile-web ;
#          cd autobyteus-web && node tests/e2e/mobile-shell-probe.mjs --cases=MSP-105 --output-dir=<this folder> ;
#          then the fixed file restored and the bundle rebuilt
# commit: base window; the server and the case as committed (1c6f493625, 2bb11e0874)
# env: macOS arm64, Node v22.23.1, Chrome headless (390x844, touch), loopback node alpha, scripted AGY
# date: 2026-11-23
# result: Fail, as expected, in the two rounds with the phone 2 s behind (it sends; it only watches): the message is
#         drawn after the "Tools updated" notice and the reply (MSP-105-phone-order-behind-sends-live.png: the
#         founder's screenshots). 2 s ahead passes; reopened, every round reads right (the node's times).
