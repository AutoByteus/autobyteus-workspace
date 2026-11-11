# API/E2E Test Review Report

## Review Meta

- Review Round: 1 (test-code review)
- Trigger: API/E2E round 2 `Pass` (API-REV-002) on product code `fa48d74a3e`.
- Test commits reviewed:
  - `009f707955`: baseline wording.
  - `431de4c9d1`: ticket E2E and probe.
  - `c7eb0d8626`: EXC-E2E-007 per DEC-011.
- Requirements Doc Reviewed As Context: `requirements-doc.md` (SR-009, DEC-011)
- Investigation Notes Reviewed As Context: as cited by the coverage investigation
- Solution Revision Record Reviewed As Context: `solution-revision-record.md` (SR-009)
- Design Spec Reviewed As Context: `design-spec.md` (SR-009)
- Supplemental Task Artifacts Reviewed As Context: `evidence/unlink-cases-2026-11-10.txt` (shape inventory the fixtures follow)
- Architecture Review Revision Record Reviewed As Context: ARCH-REV-006
- Implementation Revision Record Reviewed As Context: IR-002
- Original Code Review Report: `code-review-report.md` (CRR-003, Pass)
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-004`
- Coverage Investigation: `api-e2e-coverage-investigation.md`
- Execution Coverage Report: `api-e2e-execution-coverage-report.md`
- API/E2E Revision Record Reviewed As Context: `api-e2e-revision-record.md` (API-REV-001, API-REV-002)
- API/E2E Result: `Pass`. Results:
  - API-I01: 524 tests passed.
  - API-E01: 182 files passed, 0 failed.
  - API-B01: 16 of 16 probe cases.
  - API-F01: fresh-start build passed at `c7eb0d8626`.
- Final Validation Confidence: 95%
- Prior unresolved test-review findings rechecked: none, this is the first test-code review.
- Project testing guideline(s) applied: `TESTING.md` (Rules 2, 6, 9; hand-built fixtures, never user data). No conflict.
- Supported Product Scenario Basis Confirmed: `Yes`. SCN-001 … SCN-006, through real triggers (`update_task`, `delegate_task`, `send_message_to`, server start and restart, GraphQL reads). Released data shapes are hand-built per the inventory, which is the design's prescribed basis for SCN-006.

## Changed Durable Test Scope

| Durable Test Path | Change | Related Scenario / Requirement | Coherent Test Responsibility | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/run-history/open-task-tree-upgrade-startup.e2e.test.ts` | Added | AC-001, AC-005, AC-006, AC-008 … AC-012 | Built-server journey on an upgraded data root, OT-1 → OT-2 → OT-3 | The three cases run in order and share data; the file header says so |
| `tests/e2e/projects/task-closure-root-visibility.e2e.test.ts` | Updated | AC-001 (and its "root not loaded" alternate), D-2, D-4 | Closure across three root kinds | Old closed-list expectations replaced. New positive checks: the tree file holds no local run; a closure while the root is stopped leaves the file byte-identical |
| `tests/e2e/projects/task-reactivation-root-visibility.e2e.test.ts`, `task-existing-copy-assignment.e2e.test.ts` | Updated | AC-002, AC-003, AC-004; DEC-006, DEC-011 | Reopen and follow-up Task journeys | EXC-E2E-007 now removes only the conversation and keeps today's text, with an assertion that the own file stays. Team records are read through the new reopened payload |
| `tests/e2e/projects/ad-hoc-task-delegation`, `teammate-delivery-task-closure-race`, `get-project-task-worker-scope` | Updated | D-4, DEC-010 | Existing journeys moved to the approved behavior | Closed runs read through the Memory views; the unreadable-record case expects the not-in-root refusal, still fail-closed with no model request |
| `tests/e2e/app-data-migrations/{task-agent-own-run-startup,append-only-message-logs-startup,team-run-v1-production-upgrade,collaborators-to-delegated-runs-startup}` | Updated | DEC-008, AC-008, MP-002 | Released-data startups | `team-run-v1` asserts its run with no Task record is in no tree |
| `tests/e2e/{memory/memory-collaboration-graphql,memory/imported-team-memory-graphql,run-history/recent-run-projection-graphql,workspaces/archive-run-history-graphql}` | Updated | Harness | In-process schema suites bind the stand-in source | 4-5 lines each |
| `tests/e2e/remote-collaboration/remote-delegation-two-server`, `projects/delegated-launch-config-defaults`, `projects/collaboration-model-contract` | Updated | Baseline (TESTING.md Rule 9) | Wording set by base commits `40b9d79e1e` and `432d1c3af2` | Not this ticket; the triage table records each cause |
| `tests/fixtures/app-data-migrations/released-task-agent-layout-fixtures.ts` | Updated | DEC-008; notes A-7 | `writeOpenTaskRecordsOfReleasedData`: the Task records real installs keep | Current persisted shape |
| `tests/fixtures/agy-failure-cli.mjs` | Updated | AC-006 | `AGY_FAKE_REPLY_USAGE` puts usage on reply steps | Opt-in by env, so other suites are unaffected |
| `autobyteus-web/tests/e2e/task-closure-tree-probe.mjs` | Updated | AC-001, AC-011 | Tree-file check; Team/Org tab rows and names before and after closures, per-frame sampling, after a reload and a restart | — |

- No durable test file changed: `No`
- No test was removed.

## Proportional Test-Code Checks

| Check | Result | Evidence / Notes |
| --- | --- | --- |
| Scenario grouping and names make intent clear | Pass | OT-1 … OT-3 name their ACs; updated cases carry `autobyteus-469` comments naming the decision (D-4, DEC-006, DEC-008, DEC-010, DEC-011) |
| Assertions prove approved requirements instead of incidental implementation details | Pass | AC-009 compares the exact root list after the save, unchanged and in place. AC-010 makes the closed runs' own files unreadable and has a positive control showing a read would be reported. AC-001 checks byte-identity when the root is not loaded. Updated cases replace old expectations with positive checks of the new behavior, so nothing is weakened |
| Fixtures, setup, helpers, and data builders reuse meaningful repetition | Pass | `writeOpenTaskRecordsOfReleasedData` is shared by the startup suites. `storedLocalEntries` appears twice (server E2E and web probe), across two packages; that is acceptable |
| Test isolation and determinism are appropriate for the exercised boundary | Pass | Temp data roots under `env -i`, a scripted CLI only, `until` polling instead of sleeps for the state checks. The mode-bit read check is guarded for root and Windows. OT-3 depends on OT-1/OT-2 by design, and this is documented |
| Large files remain coherent and navigable rather than mixing unrelated scenarios | Pass | The new 504-line E2E is one upgrade journey with named helpers |
| No stale, duplicated, disabled-without-reason, or compatibility-only tests remain | Pass | The one `it.skip` (EXC-E2E-006) predates this ticket and states its reason |
| Added, updated, and removed coverage agrees with the coverage investigation and execution evidence | Pass | Triage table, AC proof table, `API-E01-round2-server-e2e.txt`, `API-B01-round2-probe-evidence.json` |
| Test callers and fixtures exercise an independently established supported scenario | Pass | Closure, reopen, follow-up, restart and upgrade are approved scenarios. The hand-built older entries follow the design's inventory. The unreadable Task record is AC-005 / DEC-010 |
| Each test enters through its scenario's real trigger and follows the real actor's steps | Pass | Agents call the real tools through the scripted CLI, the user acts in the real composer (probe), and servers start for real. EXC-E2E-007 now creates a state allowed under DEC-011 (own file kept). Making own files unreadable is test-only instrumentation for a read count, not a scenario premise |

## Findings

None.

Non-blocking note (not a finding): the probe's per-frame Team-tab sample (`commDuringB`) is recorded in evidence (`framesDiffering: 0`) but not asserted. The lasting state is asserted. Asserting the sample too would guard CR-002's "rows stay while it reloads" in future runs. That is the API/E2E engineer's option.

## Follow-ups

- Follow-ups this review added: None. FU-004 was added by API/E2E.

## Latest Authoritative Result

- Result: `Pass`
- Changed durable test paths reviewed: the 22 server test and fixture files and the web probe listed above.
- Unresolved finding IDs: none (CR-001, a non-blocking source naming note, is unrelated to the tests)
- Recommended Recipient: `/software_engineering_team/delivery_engineer`
- Notes: task size `Large` and architectural risk `High` are preserved.
