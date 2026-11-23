# Delivery evidence — autobyteus-609 (phone-web-followups-609)

Checks the Delivery Engineer ran on the integrated tree (`origin/personal` `1956c232c8` merged into the ticket branch as
`fecee4ad82`, then delivery's integration fixes), 2026-11-23. macOS, Node v22.23.1, headless Chrome. The API/E2E evidence is in
`../api-e2e/` and the implementation's in `../implementation/`; neither is repeated here.

**Case IDs.** API/E2E's evidence and reports name this ticket's lost-task-end phone case `MSP-99`. The merge brought in the base's
autobyteus-585 `MSP-99` (a platform notice as its own row), and the probe refuses a case ID used twice, so delivery renumbered this
ticket's case to `MSP-104` (`mobile-background-tasks-cases.mjs`: the comment, the `runCase` and the screenshot name). The base's
`MSP-99` keeps its ID. `MSP-100`…`MSP-103` are unchanged.

| File / folder | Check | Command | What it shows |
| --- | --- | --- | --- |
| `DEL-01-server-typecheck.log` | server typecheck | `pnpm -C autobyteus-server-ts typecheck` | `production errors: 0; test-file errors: 972 in 299 files (baseline 972 in 299 files)`, `PASS` |
| `DEL-01-web-typecheck-first-run-fail.log` | web typecheck on the merge | `pnpm -C autobyteus-web typecheck` | `FAIL`: `EventMonitorLatestRow.vue(11,53)` and `(24,49)`: `'ConversationFileLink' is not assignable to parameter of type 'AbsoluteFilePathAction'`, 4 production errors |
| `DEL-01-web-typecheck-after-fix.log` | the same after the fix | `pnpm -C autobyteus-web typecheck` | `production errors: 0; test-file errors: 86 in 36 files (baseline 86 in 36 files)`, `PASS` |
| `DEL-02-check-contract-dist.log` | item B on the merged tree | `pnpm check:contract-dist` | `PASS: the tracked dist/ of 3 contract packages matches their source.` |
| `DEL-03-server-unit.log` | the ticket's server unit files | `vitest run` the five existing files | `Test Files 5 passed`, `Tests 52 passed` |
| `DEL-03-server-integration-workspace-content.log` | item J | `test:integration:prepare`, then `vitest run tests/integration/api/rest/workspace-content-after-restart.integration.test.ts` | `Tests 1 passed` |
| `DEL-03-server-e2e-run-projection.log` | items A, D2, E on a built server | `vitest run tests/e2e/run-history/recent-run-projection-graphql.e2e.test.ts tests/e2e/run-history/run-projection-toolcalls-graphql.e2e.test.ts` | `Test Files 2 passed`, `Tests 15 passed` |
| `DEL-04-web-whole-suite.log`, `DEL-04-web-guards.log` | the whole web suite and the guards | `NUXT_TEST=true pnpm -C autobyteus-web test:nuxt`; `guard:web-boundary`, `guard:localization-boundary`, `audit:localization-literals` | `Test Files 800 passed (800)`, `Tests 6104 passed \| 2 skipped`; all guards `Passed` |
| `DEL-05-server-build.log`, `DEL-05-mobile-web-build.log` | rebuilds after the fixes | `pnpm -C autobyteus-server-ts build`; `pnpm -C autobyteus-web build:mobile-web` | `build exit 0` |
| `DEL-05-phone-probe-first-run-duplicate-id.log` | the first phone and desktop run | `test:e2e:mobile-shell --cases=…,MSP-99,…` | refused to start: `duplicate case IDs MSP-99 (mobile-restored-run-cases.mjs, mobile-background-tasks-cases.mjs)` |
| `DEL-05-phone-probe-merged-state/` | the final run of both sides' cases | `test:e2e:mobile-shell --cases=MSP-44,MSP-45,MSP-55,MSP-59,MSP-75,MSP-76,MSP-77,MSP-91,MSP-96,MSP-99,MSP-100,MSP-101,MSP-102,MSP-103,MSP-104` | `mobile-shell-probe.json` `"result": "Pass"`, 15 cases Pass, no duplicate, no unknown browser error, cleanup `serversLeft: 0`; `command.log`; 4 screenshots |

The build-only Desktop Release run 45094535212 (on `e78a539dfe`) was read directly from GitHub (`gh run view`): `success`, the five
build jobs `success`, signing and publish `skipped`. Hygiene (`scripts/check_repository_artifact_hygiene.py`: passed, 104 137 tracked
files) and the frozen-lockfile consistency check (consistent) are recorded in `../../release-deployment-report.md`.
