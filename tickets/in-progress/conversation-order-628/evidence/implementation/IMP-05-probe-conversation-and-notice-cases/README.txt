# IMP-05 (AC-005) the phone probe's conversation and notice cases on the fixed tree; MSP-99's restart expectation rewritten
# command: cd autobyteus-web && node tests/e2e/mobile-shell-probe.mjs --cases=MSP-66,MSP-75,MSP-76,MSP-77,MSP-99,MSP-102,MSP-103,MSP-105 ;
#          then, with MSP-99's restart expectation rewritten, --cases=MSP-99
# commit: tree = 2bb11e0874 (the MSP-99 change is in it)
# env: macOS arm64, Node v22.23.1, Chrome headless, loopback nodes (alpha; delta native for MSP-75…77, MSP-99)
# date: 2026-11-23
# result: Pass after the rewrite. The first run: 7 of 8 Pass; MSP-99 failed in its restart part only
#   (run-subset.log, subset-summary.json): it asserted the old order, the restart reminder before the phone's next
#   message. That reminder is the message's preface (restart-reminder-service.ts implements takePreface), so REQ-002
#   / DEC-002 (a) puts it right after the message and before the reply. The case now asserts message, notice, reply;
#   the wake notice (its own turn) keeps agent, notice, agent. The rewritten case passes (run-msp-99-rewritten.log),
#   live and after a reload. The old expectation passed on the base in earlier whole-probe runs (autobyteus-609 IMP-08).
