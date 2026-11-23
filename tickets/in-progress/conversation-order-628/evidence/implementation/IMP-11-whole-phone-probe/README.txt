# IMP-11 (AC-005, and AC-001…AC-003 through MSP-105) the whole phone probe on the whole change
# command: pnpm -C autobyteus-server-ts build ; pnpm -C autobyteus-web build:mobile-web ;
#          cd autobyteus-web && node tests/e2e/mobile-shell-probe.mjs --output-dir=<tmp>/probe-all
#          base comparison (earlier, same day): --cases=MSP-17,MSP-65,MSP-82,MSP-87,MSP-58 on the D-3 head 87d7321915, on
#          the pre-D-3 code (D-1 and D-2 only), and on a detached worktree of the base 1f761bc8db (its own install and builds)
# commit: 0b60b9f668 build (the later 6ad8920bd6 only moves stampForDelivery, IMP-13)
# env: macOS arm64, Node v22.23.1, Chrome headless (390x844, touch), loopback nodes, scripted runtimes
# date: 2026-11-23 (finished after midnight)
# result: 97 Pass, 6 Fail; unknownBrowserErrors 0 (the D-3 run before SR-006 also had 0). The 6 failures:
#   - MSP-17, MSP-58, MSP-65, MSP-82, MSP-87 (Org member and root-view cases) fail with the same messages on the base,
#     the pre-D-3 head and D-3 (base-comparison-*.log): earlier failures, follow-up FU-002 of this ticket.
#   - MSP-61 ("REQ-006 another runtime clears the model; Save waits for a model"): autobyteus-609's FU-006
#     (tickets/done/phone-web-followups-609/follow-ups.md; the case's fixed 500 ms wait against a 3.1–3.2 s model
#     load, red on that ticket's base and branch). The case file is unchanged since, and this branch does not touch
#     Run Settings.
#   MSP-105 passes in the whole run (in the D-3 run before SR-006 it failed after a reopen).
# The probe's summary keeps the failed cases' messages and MSP-105's rounds; the server and frontend logs stay out.
