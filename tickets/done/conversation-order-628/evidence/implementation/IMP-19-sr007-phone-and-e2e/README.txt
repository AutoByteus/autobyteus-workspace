# IMP-19 (SR-007; AC-001…AC-003, AC-005) the phone notice and conversation cases and the server e2e after the recorder keeps write times
# command: pnpm -C autobyteus-server-ts build ; pnpm -C autobyteus-web build:mobile-web ;
#          cd autobyteus-web && node tests/e2e/mobile-shell-probe.mjs --cases=MSP-66,MSP-75,MSP-76,MSP-77,MSP-99,MSP-105 --output-dir=<tmp>/sr7-probe ;
#          cd autobyteus-server-ts && pnpm test:integration:prepare ;
#          env -i PATH="$PATH" HOME=<resolved temp> TMPDIR="$TMPDIR" pnpm exec vitest run tests/e2e
# commit: ba25165c1e (+ 2dbfe43c28, contract tests only), on the merged base (delivery's 54cee15c8e)
# env: macOS arm64, Node v22.23.1, Chrome headless (390x844, touch), loopback nodes, scripted runtimes; clean environment for the e2e
# date: 2026-11-24
# result: Pass. The six cases delivery ran on the merged state pass again (unknownBrowserErrors 0). MSP-105 reads previous
#   reply, message, "Tools updated", reply in all three rounds live and reopened, and the node's stored order has each
#   user message (its admission time) before its notice (its write time). The server e2e passes: 127 files, 573 tests.

## phone probe
[mobile-shell] MSP-105 …
[mobile-shell] MSP-105 Pass
[mobile-shell] MSP-66 …
[mobile-shell] MSP-66 Pass
[mobile-shell] MSP-75 …
[mobile-shell] MSP-75 Pass
[mobile-shell] MSP-76 …
[mobile-shell] MSP-76 Pass
[mobile-shell] MSP-77 …
[mobile-shell] MSP-77 Pass
[mobile-shell] MSP-99 …
[mobile-shell] MSP-99 Pass
mobile-shell probe: Pass

## MSP-105 node order
phone-order-behind-sends live True reopened True ['message:assistant@1795494093.128', 'message:user@1795494098.213', 'system_task_notification@1795494098.219', 'message:assistant@1795494098.223']
phone-order-ahead-sends live True reopened True ['message:assistant@1795494098.223', 'message:user@1795494106.56', 'system_task_notification@1795494106.569', 'message:assistant@1795494106.573']
phone-order-behind-watches live True reopened True ['message:assistant@1795494106.573', 'message:user@1795494115.377', 'system_task_notification@1795494115.389', 'message:assistant@1795494115.401']

## server e2e (clean environment)
 Test Files  127 passed | 169 skipped (296)
      Tests  573 passed | 804 skipped (1377)
