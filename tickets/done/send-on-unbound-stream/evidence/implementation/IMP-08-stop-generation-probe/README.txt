# IMP-08 stop-generation probe (real stack: built server dist + scripted AGY + nuxt dev + headless Chrome), loopback
# command: pnpm -C autobyteus-server-ts build ; pnpm -C autobyteus-web test:e2e:stop-generation --output-dir <this folder>
# commit: 49ed8967f0 (the probe's holdTurn now fails at once on a lost send, D-7)
# env: macOS, Node v22.23.1, Chrome
# date: 2026-11-18
# result: Pass. evidence.json: "result" Pass, cases SGD-01…SGD-08 Pass, "sends": 20, "sendStalls": [] (no lost send).
# Each Stop round is followed by a message to the same run, which restores the AGY run the Stop took offline (a new stream):
# the case the defect hit (1 of 80 in autobyteus-533 API-10). 20 sends here, not the 40+ rounds of AC-002 (left to API/E2E).
