# IMP-10 (D-1, D-2, D-3, SR-006; AC-001…AC-003, AC-006) MSP-105 on the whole change, live and reopened
# command: pnpm -C autobyteus-server-ts build ; pnpm -C autobyteus-web build:mobile-web ;
#          cd autobyteus-web && node tests/e2e/mobile-shell-probe.mjs --cases=MSP-105 --output-dir=<tmp>/msp105-sr006
# commit: 0b60b9f668 (SR-006 on top of D-3 87d7321915, D-2 1c6f493625, D-1 d67b58c740)
# env: macOS arm64, Node v22.23.1, Chrome headless (390x844, touch), loopback node alpha, scripted AGY
# date: 2026-11-23
# result: Pass. All three rounds (the phone 2 s behind and sending, 2 s ahead and sending, 2 s behind and only watching)
#   read: previous reply, the message, "Tools updated", the reply, both live and after reopening.
#   The node's stored order (nodeOrder in the JSON) has the user trace before its notice in every round:
#   user@…891.010 < notice@…891.013; user@…899.398 < notice@…899.405; the third likewise.
# Before SR-006 (D-3 alone) this case failed after a reopen in 3 of 3 rounds: the notice's delivery time came about 1 ms
#   before the user trace's forwarding time, so the read path's time sort put the notice first (the Design Impact that
#   became SR-006). With the user trace at its admission time, the stored order is the live order.
# Only the probe's summary, its console output and the screenshots are kept; the server logs stay out of the evidence.
