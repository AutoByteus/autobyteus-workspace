# API/E2E Revision Record — run-file-change-owner-scoped-reads

The latest coverage investigation (`api-e2e-coverage-investigation.md`) and execution coverage report (`api-e2e-execution-coverage-report.md`) remain authoritative. This record keeps one entry per completed validation round.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Code Reviewer / `code-review-report.md` (CRR-001 Pass) / round 1 | SR-003, ARCH-REV-002, IR-001, CRR-001 | N/A | Pass / 95.4% |
| API-REV-002 | Code Reviewer / `api-e2e-test-review-report.md` (CRR-002, Local Fix TR-001) / round 2 | CRR-002 | Pass / 95.4% | Pass / 95.4% |

## Revision Entries

### API-REV-001 — Baseline: owner-scoped reads proven on a real server, a real browser and a 680-run seed

- Triggering role, report path, and round: `/software_engineering_team/code_reviewer`, `code-review-report.md` (CRR-001), round 1
- Triggering finding or case IDs: none (pass handoff). Work items from CRR-001: the two edited gated E2E files, real-server AC-003/AC-005/AC-007, the AC-001 browser journey, AC-010/QR-001 timing, no web typecheck
- Related revision IDs: SR-003, ARCH-REV-002, IR-001, CRR-001
- Why this baseline was recorded: first completed API/E2E validation result
- Coverage decisions or durable test paths changed (commit `2486c8b7c4`):
  - Added `autobyteus-server-ts/tests/e2e/projects/owner-scoped-member-file-changes.e2e.test.ts`
  - Added `autobyteus-web/tests/e2e/owner-scoped-file-reads-probe.mjs` and script `test:e2e:owner-scoped-file-reads`
  - Updated `autobyteus-server-ts/tests/e2e/projects/agent-run-collaboration-member-file-changes.e2e.test.ts` (copy content route, hub's own id)
  - Updated `autobyteus-server-ts/tests/e2e/run-history/standalone-unreadable-tree-containment.e2e.test.ts` (warning tied to the scanning read)
  - Updated `autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs` (`WRITE_FILE_HOLD:` directive)
- Cases added, changed, removed, or rechecked: API-01 (reused IMP-01..IMP-05, IMP-07), API-02, API-02b, API-03, API-03b, API-03c, API-04, API-04b, API-05 (B-001..B-007), API-06, API-07, API-08, API-09
- Commands, environment, fixture, or broader-validation delta: gated server E2E under `env -i` with the scripted AGY; probe-owned real stack (server `dist`, Nuxt dev, headless Chrome) on a small (10) and a large (680) seed made through public APIs; ad-hoc vue-tsc 3.3.13

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: coverage investigation (all), execution coverage report (all), test progress log, evidence folder
- Prior result and confidence: N/A
- Current result and confidence: Pass, 95.4% overall, no category below 94%
- New or remaining failure IDs: none for this ticket
- Recommended owner: `/software_engineering_team/code_reviewer` (proportional test-code review)
- Remaining risks, blocked evidence, or untested scope: FU-C, a pre-existing `RunFileChangeService.load` live-cache race outside the Change Scope (API-08), sent to `/project_task_manager`. The pending state is emulated by the scripted runtime. Timing ran on synthetic trees, not the user's data (forbidden by TESTING.md). The Electron shell is not exercised (unchanged).

### API-REV-002 — The browser probe fails journeys on browser errors (TR-001)

- Triggering role, report path, and round: `/software_engineering_team/code_reviewer`, `api-e2e-test-review-report.md` (CRR-002), round 2
- Triggering finding or case IDs: TR-001 (`Local Fix`, API/E2E). The probe recorded browser errors but never failed on them (TESTING.md "Browser probes")
- Related revision IDs: CRR-002 (source review CRR-001 still stands)
- Why this revision was recorded: an API/E2E-owned Local Fix of durable test code and its rerun
- Coverage decisions or durable test paths changed: `autobyteus-web/tests/e2e/owner-scoped-file-reads-probe.mjs` (commit `ae178ebe39`).
  - Errors are recorded with kind and resource URL.
  - Each journey fails on any page exception or console error raised during it.
  - Only B-005 may log Chrome's 404 resource lines for `/file-change-content`, at most one per 404 content response it received.
  - Warm-up errors are recorded, not asserted.
- Cases added, changed, removed, or rechecked: API-05 and API-06 rerun on fresh small (10) and large (680) seeds. API-05c added: a mutation check that injects a page exception and a console error. All other cases still valid (`git diff --name-only 2486c8b7c4 ae178ebe39` = the probe only)
- Commands, environment, fixture, or broader-validation delta: ENV-5 (`ae178ebe39`); new evidence folders with the `-r2` suffix; round-1 evidence kept

#### Prior Failure Resolution

| Prior Case / Failure Reference | Previous Classification | Current Resolution | Case IDs Now Proving It |
| --- | --- | --- | --- |
| CRR-002 TR-001 (probe does not fail on browser errors) | Local Fix / api_e2e_engineer | Fixed in `ae178ebe39`. Round 2 passes on both seeds: only B-005 logs errors (2 allowed 404 lines = 2 content 404 responses), and the warm-up logs none | API-05 (round 2), API-05c |

- Canonical artifacts and sections updated: execution report (Round, environments, API-05/API-05c/API-06 rows, durable coverage, cleanup, result notes), coverage investigation (meta, planned cases, durable coverage to update, decision notes), test progress log
- Prior result and confidence: Pass / 95.4%
- Current result and confidence: Pass / 95.4%
- New or remaining failure IDs: none
- Recommended owner: `/software_engineering_team/code_reviewer` (test-code review of the probe change)
- Remaining risks, blocked evidence, or untested scope: unchanged from API-REV-001. FU-C is recorded as Task autobyteus-180
