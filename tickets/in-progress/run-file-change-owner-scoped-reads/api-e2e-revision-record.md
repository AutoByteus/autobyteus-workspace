# API/E2E Revision Record — run-file-change-owner-scoped-reads

The latest coverage investigation (`api-e2e-coverage-investigation.md`) and execution coverage report (`api-e2e-execution-coverage-report.md`) remain authoritative. This record keeps one entry per completed validation round.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Code Reviewer / `code-review-report.md` (CRR-001 Pass) / round 1 | SR-003, ARCH-REV-002, IR-001, CRR-001 | N/A | Pass / 95.4% |

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
