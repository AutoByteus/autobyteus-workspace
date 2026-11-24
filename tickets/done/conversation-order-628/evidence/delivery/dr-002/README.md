# Delivery evidence — autobyteus-628 (conversation-order-628), round DR-002

Checks the Delivery Engineer ran on the integrated tree: the ticket branch with `origin/personal` `2a8d5bf8c3` merged as `061498f684`
(on top of DR-001's merge `54cee15c8e` of `e5d878832b`), 2026-11-24. macOS, Node v22.23.1, headless Chrome. API/E2E's evidence is in
`../../api-e2e/` (round 2, `R2-*`), the implementation's in `../../implementation/`, DR-001's in `../` (`DEL-*`, `DEL-BLOCK-*`).

| File / folder | Check | Command | What it shows |
| --- | --- | --- | --- |
| `DEL-R2-01-server-typecheck.log`, `DEL-R2-01-web-typecheck.log` | both typechecks | `pnpm -C autobyteus-server-ts typecheck`; `pnpm -C autobyteus-web typecheck` | at baseline (972 in 299 files; 86 in 36 files), 0 production errors, `PASS` |
| `DEL-R2-02-check-contract-dist.log` | the contract packages' tracked `dist/` | `pnpm check:contract-dist` | `PASS`; the tree has no change after it |
| `DEL-R2-03-contract-package-tests-*.log` | **DR-001 Finding 1**: the three contract packages' own suites | `pnpm -C <package> test` | `# pass 24 / # fail 0`, `# pass 39 / # fail 0`, `# pass 14 / # fail 0` (DR-001: 2, 4 and 2 failing) |
| `DEL-R2-04-server-unit-whole.log` | **DR-001 Finding 2**: the whole server unit suite | `pnpm -C autobyteus-server-ts test:unit` | `Test Files 1081 passed \| 5 skipped (1086)`, `Tests 9028 passed \| 9 skipped` (DR-001: 1 failed). The `APP_DATA_STARTUP_GATE_FAILED` line in it is a test provoking that failure on purpose |
| `DEL-R2-04-accumulator-file-distinct-times.log` | Finding 2's file alone | `vitest run tests/unit/agent-memory/runtime-memory-event-accumulator.test.ts` | `25 passed`; the committed file stamps strictly increasing event times 7 ms apart, DR-001's reproduction condition (DR-001: 7 of 25 failed) |
| `DEL-R2-04-server-integration-whole.log` | whole server integration | `test:integration:prepare`; `test:integration` | `92 passed \| 21 skipped (113)`, `523 passed \| 71 skipped (594)`, as API/E2E's R2-SI-1 |
| `DEL-R2-04-web-whole-suite-summary.log` | whole web suite | `NUXT_TEST=true pnpm -C autobyteus-web test:nuxt --run` | `803 passed`, `6124 passed \| 2 skipped`; 0 `FAIL` lines. The full log (2.6 MB, same as DR-001's `DEL-04-web-whole-suite.log`) is not kept: its header, the failure count and the summary are |
| `DEL-R2-05-server-build.log`, `DEL-R2-05-mobile-web-build.log` | rebuilds | `pnpm -C autobyteus-server-ts build`; `pnpm -C autobyteus-web build:mobile-web` | `exit 0` each; "The /mobile build holds no demo code." |
| `DEL-R2-06-phone-probe-merged-state/` | phone cases on the merged build | `pnpm -C autobyteus-web test:e2e:mobile-shell --cases=MSP-66,MSP-75,MSP-76,MSP-77,MSP-99,MSP-105` | `"result": "Pass"`, six cases `Pass`, `unknownBrowserErrors: 0` (38 known console lines, the same 18 distinct lines as DR-001), `failedRequests` 0, cleanup `serversLeft: 0`; MSP-105 three rounds (phone clock -2001 / +2000 / -2002 ms) `live.ok` and `reopened.ok` true |

Not rerun, with the reason: the fresh-start build and the build-only release run (API/E2E ran them on the ticket's code: R2-FS-1 on `2d3f46b223`, IMP-15);
the base's four new commits changed no file of the ticket and one build input only by a version string (`autobyteus-web/package.json`, `1.5.14-beta.10`, the base's own release, which built and verified itself). The gated live cases MSP-106 and MSP-107 (real Claude and a real model): API/E2E ran them on the merged tree (R2-MSP-105…107); delivery read their JSON and did not rerun them.
