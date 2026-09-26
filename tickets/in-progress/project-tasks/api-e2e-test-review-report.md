# API/E2E Test Review Report

Package `PROJ-TASKS-20260926-001` — `project-tasks`.

## Review Meta

- Review Round: `1`
- Trigger: `/api_e2e_engineer` reported that API/E2E passed (`API-REV-001`, round 1) on `IR-001` (`8d3de39a6`/`e8fca7771`).
- Requirements Doc Reviewed As Context: `requirements-doc.md` (Approved, `SR-003`)
- Investigation Notes Reviewed As Context: `investigation-notes.md`
- Solution Revision Record Reviewed As Context: `solution-revision-record.md`
- Design Spec Reviewed As Context: `design-spec.md` (`SR-004`)
- Supplemental Task Artifacts Reviewed As Context: `handoff-to-architecture-review-sr-004.md`
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md` (`ARCH-REV-001`)
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md` (`IR-001`)
- Original Code Review Report: `code-review-report.md` (`CRR-001`, Pass)
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-002`
- Coverage Investigation: `api-e2e-coverage-investigation.md`
- Execution Coverage Report: `api-e2e-execution-coverage-report.md` (authoritative)
- API/E2E Revision Record Reviewed As Context: `api-e2e-revision-record.md` (`API-REV-001`)
- Delivery Revision Record Reviewed As Context: N/A
- API/E2E Result: `Pass`
  - Server `tests/e2e/projects`: 9/9, three times, with the developer shell's `ENABLE_*` variables still set.
  - Browser probe: 26/26, three identical runs.
  - Changed and adjacent web suites: 1107 of 1108 pass; the one failure is pre-existing.
  - Both localisation guards pass.
- Final Validation Confidence: 95% (reported)
- Prior unresolved test-review findings rechecked: None. This is the first test review for this package.
- Supported Product Scenario Basis Confirmed: `Yes`

## Changed Durable Test Scope

| Durable Test Path | Change | Related Scenario / Requirement | Coherent Test Responsibility | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/projects/projects-graphql.e2e.test.ts` | Updated (uncommitted; +172/−0 on top of the released file) | API-006 → REQ-013 (restart, now with a Task); API-007 → REQ-001/003/005/006, AC-001/003/004; API-008 → REQ-008, AC-006, QR-001; API-009 → REQ-013, AC-010 | The un-mocked Projects and Project Tasks GraphQL boundary over the real store, registry and settings | Adds a hermetic `ENABLE_*` stash and restore in `beforeEach`/`afterEach`. This fixes the released API-001's dependence on the developer's shell, which was a test-environment defect. Also adds a `resetProjectTaskServiceForTests` reset. |
| `autobyteus-web/tests/e2e/projects-feature-probe.mjs` | Updated (uncommitted; +687/−6 on top of IR-001's adapted file) | E2E-014/015 → AC-001–004; E2E-016 → AC-005/QR-002; E2E-017 → AC-006; E2E-018 → AC-007; E2E-019 → AC-008; E2E-020 → AC-011; E2E-021 → AC-012/QR-003; E2E-022 → AC-012/REQ-015; E2E-023 → REQ-016 (narrow width); E2E-024 → AC-010; E2E-025 → REQ-013; E2E-026 → REQ-003/006/009 rendering | The browser journey probe for the Projects feature, now including Tasks | Adds Task and binding helpers and a node C lifecycle, which is stopped in its cases and also in the shared `finally` cleanup. IR-001's adaptations of E2E-001 to E2E-013 are kept. |

- No durable test file changed: `No`

## Proportional Test-Code Checks

| Check | Result | Evidence / Notes |
| --- | --- | --- |
| Scenario grouping and names make intent clear | Pass | Each case title states the approved outcome and cites the REQ or AC where relevant, for example "API-009: a released v1.4.86 projects.json is read intact without a rewrite…" and "E2E-020 Two-pane navigation: one click switches Projects with the same list pane…". |
| Assertions prove approved requirements instead of incidental implementation details | Pass | The assertions check approved outcomes: error codes, ordering, whether the Project's `updatedAt` is preserved, byte and mtime equality of the released file, the persisted shape after the first write (no `projectId` inside a Task), the absence of any status mutation in the schema, visible text counts, rows with status labels, the same list-pane DOM node across a switch, and the search timing against the approved 100 ms budget. |
| Fixtures, setup, helpers, and data builders reuse meaningful repetition | Pass | The server test adds shared `createTask` and `listTasks` helpers and a `TASK_FIELDS` constant. The probe adds shared `taskDialog`, `taskRowsOn`, `taskSummariesOn`, `openCountText`, `bindPageTo` and `readProjectsFile` helpers, and reuses the existing `runCase` runner and `api` object. |
| Test isolation and determinism are appropriate for the exercised boundary | Pass | **Server:** each test gets its own temp app data dir, and the `ENABLE_*` variables are stashed and restored, so the test no longer depends on the shell (verified: 9/9 with the variables set). A 5 ms wait makes `updatedAt` strictly increase before the edit-ordering assertion; that is acceptable. **Probe:** three identical 26/26 runs. Node C is stopped both in its cases and in `finally`, and the temp root is removed. The fixed `sleep` calls in the probe are all in the pre-existing E2E-007 and E2E-009. |
| Large files remain coherent and navigable rather than mixing unrelated scenarios | Pass | The probe is now about 1700 lines, but it covers one feature surface (Projects and Tasks), with shared helpers followed by self-contained `runCase` blocks. The server file covers one GraphQL boundary. Non-blocking: if the Task-admission ticket grows the probe further, consider splitting the Task journeys into their own probe that shares a helpers module. |
| No stale, duplicated, disabled-without-reason, or compatibility-only tests remain | Pass | No skipped cases. The replaced E2E-008 assertion (checking for raw translation keys instead of "no Task wording") correctly follows REQ-011, which supersedes the released AC-012. |
| Added, updated, and removed coverage agrees with the coverage investigation and execution evidence | Pass | The case IDs match the execution report and ledger: API-007–009 and E2E-014–026. The results match `/tmp/ptasks-logs/probe-run1/result.json` and the two confirmation runs. |
| Test callers and fixtures exercise an independently established supported scenario rather than proving one by themselves | Pass | The E2E-024 and API-009 fixtures reproduce the approved SCN-006 upgrade state. The E2E-026 hand-seeded mixed-status file is labelled a stand-in and is used only to prove approved rendering contracts: three statuses shown as text and a filter option for each (REQ-003/REQ-006), and "N open" excluding Done (REQ-009). It records the delete-message count as an observation only and does not assert the unreachable open-count versus total behavior (`CRR-001` C-01), so it creates no scenario or finding of its own. |

## Findings

None.

## Latest Authoritative Result

- Result: `Pass`
- Changed durable test paths reviewed:
  - `autobyteus-server-ts/tests/e2e/projects/projects-graphql.e2e.test.ts` (updated)
  - `autobyteus-web/tests/e2e/projects-feature-probe.mjs` (updated)
- Unresolved finding IDs: None
- Recommended Recipient: `/delivery_engineer`
- Notes:
  - Both files are uncommitted in the worktree, and delivery should commit them. `autobyteus-web/test-results/` and the untracked SDK `dist/` folders are leftovers and should not be committed.
  - Optional polish, non-blocking and outside approved ACs:
    - return focus to the next row or to New task after deleting a Task from its dialog (currently it falls to `BODY`; E2E-021 observation);
    - add a blank line before `it("API-007…` (cosmetic);
    - consider splitting the Task journeys into a separate probe if the file keeps growing.
  - Carry to the Task-admission ticket: the Project delete message counts open Tasks rather than the total (`CRR-001` C-01; observed in E2E-026).
  - Task size `Medium` and architectural risk `High` are preserved.
