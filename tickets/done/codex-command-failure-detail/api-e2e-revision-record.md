# API/E2E Revision Record

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| `API-REV-001` | API/E2E Engineer / initial execution round 1 | `RER-002`, `IR-001` | `N/A` | `Pass / 98%` |
| `API-REV-002` | API/E2E Engineer / integrated-current-base round 2 | `RER-002`, `IR-002`, `DR-001`, `API-REV-001` | `Pass / 98%` | `Pass / 98%` |

## Revision Entries

### API-REV-001 — Initial provider, transport, replay, live, and browser baseline

- Triggering role, report path, and round: API/E2E Engineer; `/home/autobyteus/workspace/autobyteus-workspace/tickets/done/codex-command-failure-detail/api-e2e-execution-coverage-report.md`; round `1`
- Triggering scenarios: `SCN-001/002/003`, `API-SCN-001/002/003/004`, `BE2E-CODEX-FAIL-001/002`
- Related revisions: requirements `RER-002`; implementation `IR-001`; architecture/source-review/delivery revisions `N/A — direct initial route`
- Why recorded: first completed API/E2E result for package `REQ-CODEX-COMMAND-FAILURE-DETAIL-20260901`; no prior result or confidence may be inferred.
- Coverage decisions/durable paths changed:
  - added `autobyteus-server-ts/tests/integration/agent-execution/codex-command-failure-transport.integration.test.ts`
  - updated `autobyteus-server-ts/tests/e2e/run-history/run-projection-toolcalls-graphql.e2e.test.ts`
  - updated `autobyteus-server-ts/tests/e2e/memory/codex-live-memory-persistence.e2e.test.ts`
  - added `autobyteus-web/tests/e2e/fixtures/codex-command-failure-detail.page.vue`
  - added `autobyteus-web/tests/e2e/codex-command-failure-detail-probe.mjs`
  - updated `autobyteus-web/package.json` and `autobyteus-web/README.md`
- Scenarios added/rechecked: cross-transport standalone/Team equality; current writer/local GraphQL replay; real App Server exit-23 failure/persistence/idle; desktop and 390px center/Activity rendering; precedence/fallback and adjacent regression suites.
- Command/environment delta: built workspace contracts; ran focused and broader server Vitest, focused Nuxt Vitest, Prisma/source compilation, an env-gated Codex 0.152.0 live test, and a self-starting Chromium 149 probe with owned cleanup.

#### Prior Failure Resolution

None — `API-REV-001` is the initial baseline. Test-harness failures encountered inside this round were resolved before the authoritative pass: standalone raw source fields are legitimate extras; GraphQL singleton lifecycle became test-owned; the replay conversation shape assertion was aligned to its public fields; the live bootstrapper fixture was aligned to the current constructor; browser selectors/interactions were corrected. Attempt evidence is retained under the ticket probe directory.

- Canonical artifacts updated: `api-e2e-coverage-investigation.md`; `api-e2e-execution-coverage-report.md`; this revision record; `probes/api-e2e/` evidence.
- Prior result/confidence: `N/A`
- Current result/confidence: `Pass / 98%`
- New or remaining failure IDs: none for this package. An unrelated pre-existing live steered-input assertion remains a separate baseline test-maintenance issue and is not a package failure.
- Recommended recipient: `/software_engineering_team/delivery_engineer`, subject to `get_handoff_rules`
- Remaining risk/untested scope: no material release blocker; no fully live model-driven Team-to-full-routed-UI duplication, no Electron shell run because those changed seams are directly proven/inapplicable respectively.

### API-REV-002 — Revalidate integrated current-base candidate after DR-001

- Triggering role, report path, and round: Implementation Engineer Local Fix `IR-002` after Delivery `DR-001`; `/home/autobyteus/workspace/autobyteus-workspace/tickets/done/codex-command-failure-detail/api-e2e-execution-coverage-report.md`; round `2`
- Triggering finding/scenarios: `DR-001 latest-base README integration conflict`; rechecked `API-SCN-001/002/003/004`, `BE2E-CODEX-FAIL-001/002`, and the provider matrix
- Related revisions: `RER-002`, `IR-002`, `DR-001`, prior `API-REV-001`; architecture/source-review revisions `N/A — direct Small/Low route`
- Why recorded: the prior validated candidate was merged with current base `ad63d74275a4eb204ebc6d97a2260aa9790fea52`, including adjacent Team streaming/hydration/Activity source changes, so the integrated candidate required its own explicit result rather than inheriting API-REV-001.
- Coverage decisions/durable test paths changed: none. Existing current transport/replay/live/browser coverage remained valid. Only canonical reports/revision history and execution evidence changed.
- Scenarios rechecked: ancestry/merge resolution; provider precedence and correlation; standalone/Team transport; current writer/GraphQL replay; adjacent current-base server task registry and frontend Team streaming/hydration/ActivityFeed; real Codex exit-23 lifecycle; integrated package-script browser desktop/narrow rendering.
- Execution delta: focused server `5 files / 87 tests` passed; broader server `15 files passed + 1 skipped / 211 passed + 10 skipped`; integrated frontend `8 files / 59 tests`; real Codex focused scenario passed; Chromium `2/2`; contract/build/integrity/cleanup checks passed.

#### Prior Failure Resolution

| Prior Scenario / Failure | Previous Classification | Current Resolution | Evidence |
| --- | --- | --- | --- |
| `DR-001` README latest-base conflict | Delivery Local Fix blocker | Resolved and directly verified: both ancestors present, merge complete, no unmerged paths/markers, both probe docs/scripts/targets retained with one shared note | `probes/api-e2e-round-2/logs/integration-and-doc-consistency.log` |
| Existing live steered-input assertion | Non-package baseline `Needs Update` | Rechecked first and unchanged: initial accepted admission returns `turnId: null`; remains excluded from package acceptance and requires separate maintenance | `probes/api-e2e-round-2/logs/prior-baseline-live-steering.log` |

- Canonical artifacts updated: coverage investigation; execution coverage report; this revision record; `probes/api-e2e-round-2/`.
- Prior result/confidence: `Pass / 98%` (`API-REV-001`)
- Current result/confidence: `Pass / 98%`
- New or remaining package failure IDs: none
- Recommended recipient: `/software_engineering_team/delivery_engineer`, subject to `get_handoff_rules`
- Remaining risk/untested scope: no material delivery blocker; no duplicated fully live Team-to-full-routed-UI journey and no Electron shell run because direct adjacent Team suites and each changed boundary passed and no shell boundary changed.
