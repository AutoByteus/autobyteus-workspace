# API/E2E Test Review Report — phone-background-tasks-473 (autobyteus-473)

## Review Meta

- Review Round: 1
- Trigger: API/E2E engineer, API-REV-001 (Pass, 95%); code under test `f33b3c772a`; evidence `ec7b26a7d9`
- Requirements / Design reviewed as context: `requirements-doc.md` (SR-001), `design-spec.md` (SR-002)
- Original Code Review Report: `code-review-report.md` (CRR-001 Pass)
- Code Review Revision Record: `code-review-revision-record.md`; Current Code Review Revision ID: `CRR-002`
- Coverage Investigation / Execution Coverage / API/E2E Revision Record: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-revision-record.md` (API-REV-001)
- API/E2E Result: Pass; Final Validation Confidence: 95%
- Prior unresolved test-review findings rechecked: none
- Project testing guideline(s) applied: `TESTING.md` (isolated nodes, a test-owned Claude login for live runs, browser probes). No conflicts.
- Supported Product Scenario Basis Confirmed: `Yes`

## Changed Durable Test Scope

API/E2E changed no durable test (`git diff f33b3c772a..HEAD` outside `tickets/` is empty); its in-app and desktop tools stay in `evidence/api-e2e/scripts/`. The implementation-authored durable tests, deferred from CRR-001, are reviewed here:

| Durable Test Path | Change | Related Scenario | Responsibility | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-web/tests/e2e/mobile-background-tasks-cases.mjs` (MSP-44…46) | Added | AC-001, AC-002, AC-003 | A scripted AGY run on alpha leaves a real daemon background step that ends by itself; the phone opens Activity by its own navigation; a desktop window reloads | Assertions name their AC and check the real outcome: running, then Failed with the exit message; live and newest first, then Completed; listed after a reload with its command. MSP-45 explicitly asserts its dependency on MSP-44's run. |
| `autobyteus-web/tests/e2e/mobile-shell-probe.mjs` | Updated | — | Wiring after the zoom cases; header lines | Minimal |
| Server specs (`agent-run.test.ts`, `agy-background-task-monitor.test.ts`, `autobyteus-background-tasks.test.ts`, `claude-background-task-registry.test.ts`, `api/graphql/agent-background-task-view.test.ts`, BGT-01 e2e) | Updated | AC-004 | `current()` / `list()` per runtime, the view's `tasks`, R-2 empty manager, the native run's task listed running then completed | Each runtime traced separately (several kinds of subject) |
| Web specs (`agentBackgroundTaskStore.spec.ts`, `BackgroundTaskPanel.inspection.spec.ts`, `MobileActivity.backgroundTasks.spec.ts`) | Added / updated | REQ-001…004, R-1 | Seed rules (unknown added, running → ended taken, ended never replaced, running kept); panel seeding; phone section, REQ-004 hidden, snapshot rows | The mutation check (seeding removed → the late-viewer cases fail) shows they bite |

- No durable test file changed by API/E2E: `Yes`. Implementation-authored durable tests are reviewed as above.

## Proportional Test-Code Checks

| Check | Result | Evidence / Notes |
| --- | --- | --- |
| Scenario grouping and names clear | Pass | MSP IDs with ACs in the header; spec names state the rule |
| Assertions prove requirements | Pass | Visible status, end text, order, command |
| Fixtures/helpers reuse | Pass | Uses the probe's `stack`, `openRow`, `menuOpen`, `waitFor`; the scripted AGY `BACKGROUND_STEP` reuses the probe's runtime |
| Isolation/determinism | Pass | Tasks end by themselves at known codes; 46/46 in the full probe (API-04) |
| Large files coherent | Pass | 125 lines, one behavior |
| No stale/disabled tests | Pass | The stale `test:e2e:background-tasks-panel` predates this ticket (`7bd0bbea4a`) and is recorded as FU-002, not changed here |
| Coverage agrees with evidence | Pass | The in-app Claude runs (AC-001, AC-002, reconnect), desktop reload (AC-003), FS-01 |
| Callers exercise established scenarios | Pass | Phone navigation by its own menu; a desktop reload |
| Real trigger and steps | Pass | Real daemon steps; the in-app proof used a real Claude run and real taps |

## Findings

None.

## Follow-ups

- Follow-ups this review added: None (FU-001 and FU-002 were recorded by API/E2E).

## Round 2 (CRR-003): Delivery Re-Entry on the Merged State, API-REV-002

- Trigger: Delivery DR-001 was blocked after `origin/personal` moved to `87b7f16c9d` (autobyteus-480, merged as `4ea0901811`), because the case IDs MSP-44…46 collided. API/E2E commit `6f667d2552`; no product code changed.
- Changed durable tests: `mobile-background-tasks-cases.mjs` and `mobile-shell-probe.mjs`. This is a pure renumber MSP-44…46 → MSP-47…49: the IDs, the header and `--cases` hint, the cross-reference assertion ("MSP-48 needs MSP-47") and the four screenshot names, plus the probe's case-list and timing lines. No assertion changed, no old ID is left in the file, and 480's MSP-44…46 are untouched.
- Evidence: on the merged state the full phone probe passes 49/49, including MSP-47…49 and 480's MSP-44…46; the duplicate-ID guard passes; 0 unknown browser errors (`evidence/api-e2e/r2-API-04-mobile-shell.log`).
- Proportional checks: names and IDs consistent; assertions unchanged; deterministic. All `Pass`.
- Findings: none.

## Latest Authoritative Result

- Result: `Pass` (round 2, CRR-003; round 1 CRR-002 stands)
- Changed durable test paths reviewed: round 2: `6f667d2552` renumber; round 1: `mobile-background-tasks-cases.mjs`, `mobile-shell-probe.mjs`, the 473 server and web specs
- Unresolved finding IDs: none
- Recommended Recipient: `delivery_engineer`
- Notes: residuals are RSK-001 / C-03 (Antigravity missed end, not seen; in-app runs used Claude), and signing and notarization (not run).
