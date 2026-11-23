# IMP-08 (design step 10) the whole phone probe once, on the final HEAD
# command: pnpm -C autobyteus-server-ts build ; pnpm -C autobyteus-web build:mobile-web ;
#          cd autobyteus-web && node tests/e2e/mobile-shell-probe.mjs --output-dir=<tmp>
# commit: d4af72998f (clean tree)
# env: macOS arm64, Node v22.23.1, Chrome headless (390x844 touch; desktop 1280x900), loopback nodes, scripted runtimes.
#      The machine was busy (load average 6-9 on 10 cores; mediaanalysisd at 160% CPU).
# date: 2026-11-22 (21:39:23Z to 22:27:07Z)
# result: 97 of 98 cases Pass; MSP-61 Fail, for a reason on the base and outside this ticket (below; follow-up FU-006).
#         unknownBrowserErrors 0; servers stopped, temp root removed. Every case this ticket added or changed passes:
#         MSP-44, MSP-45, MSP-46 (D-F), MSP-55 (D-G), MSP-96 (D-D, "Stopped"), MSP-99 (D-I), MSP-100 (D-H).
#
# Files: run.log (the probe's output), mobile-shell-probe-summary.json (every case's result, MSP-61's details; the 840
# browser errors, all of a known kind, reduced to their count), MSP-61-*.png, msp-61-cause.log.
#
# MSP-61 (autobyteus-458 AC-004, mobile-run-settings-cases.mjs) fails at "REQ-006 another runtime clears the model; Save
# waits for a model": 500 ms after Runtime → Grok Build, the model row reads "Loading…" where the case expects "Choose".
# Every later step of the case passes: the model is chosen, Save, the node holds grok_build / grok-4.7, Settings shows
# it again, and the run continues on it.
#
# Cause (msp-61-cause.log):
#   - The case reads the row after a fixed `sleep(500)`.
#   - Since autobyteus-551 (5054f97a17, merged 2026-11-22, in this ticket's base f2c0d2a902), the node's Grok Build model
#     discovery waits up to GROK_MODELS_UPDATE_WAIT_MS = 3_000 after `initialize` for Grok's models-update
#     announcement (autobyteus-server-ts/src/runtime-management/grok/grok-build-capability.ts:118). The probe's fake
#     Grok CLI never sends one, so every model list costs the whole 3 s: discovery alone measured 3127-3456 ms; the
#     phone's row leaves "Loading…" after 3135-3200 ms.
#   - The base build shows the same 3.1-3.2 s. The unchanged case fails 3 of 3 runs on the branch (with MSP-66, which
#     stops the Team first; alone it cannot open the rows). With the sleep replaced by polling, it passes on the branch
#     and on the base.
#   - This ticket changes nothing in model discovery, run settings or the case (`git diff f2c0d2a902` shows no file of
#     llm-management, runtime-management, components/mobile/newRun or mobile-run-settings-cases.mjs). Earlier today's
#     whole-probe runs (phone-activity-details) passed MSP-61 because they ran before 551 merged.
# Not fixed here: the fix belongs to the probe (wait for the row to leave "Loading…", or let the fake Grok CLI announce
# its models), which is the 458/551 cases' scope. Recorded as FU-006 in follow-ups.md.
