# API/E2E Test Review Report — agent-tool-results-omit-empty (autobyteus-260)

## Review Meta

- Review Round: 2 (proportional test-code review, delivery re-entry DR-001). Round 1 (CRR-005, Pass) covered API/E2E rounds 1–2; its tables below stay as that round's result.
- Trigger: API/E2E round 3 passed on the integrated branch (API-REV-003, 95%, delivery re-entry DR-001); round 1's trigger was API-REV-002
- Requirements Doc Reviewed As Context: `requirements-doc.md` (approved; unchanged by SR-012)
- Investigation Notes Reviewed As Context: `investigation-notes.md` (by reference)
- Solution Revision Record Reviewed As Context: `solution-revision-record.md` (SR-012)
- Design Spec Reviewed As Context: `design-spec.md` (SR-012)
- Supplemental Task Artifacts Reviewed As Context:
  - `evidence/API-10-r2-regression-e2e-summary.txt`
  - `evidence/API-12-isolated-desktop-observations.txt`
  - `evidence/API-11c-r2-project-manager-ux-probe-evidence.json`
  - `evidence/API-06-get-project-task-worker-scope-receipt.json`
  - `evidence/API-13-before-after-sizes-table.md`
- Architecture Review Revision Record Reviewed As Context: `architecture-review-revision-record.md` (ARCH-REV-004)
- Implementation Revision Record Reviewed As Context: `implementation-revision-record.md` (IR-003)
- Original Code Review Report: `code-review-report.md` (CRR-006, Pass)
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-007`
- Coverage Investigation: `api-e2e-coverage-investigation.md`
- Execution Coverage Report: `api-e2e-execution-coverage-report.md`
- API/E2E Revision Record Reviewed As Context: `api-e2e-revision-record.md` (API-REV-001, API-REV-002, API-REV-003)
- Delivery Revision Record Reviewed As Context: `delivery-revision-record.md` (DR-001)
- API/E2E Result: Pass on tested source `fccf1227a6`. Test code is in `75ad3e4cb2` (round 1) and `fba908bff5` (round 2).
- Final Validation Confidence: 95%
- Prior unresolved test-review findings rechecked: None (CRR-005 had none)
- Project testing guideline(s) applied: `TESTING.md` (repository root; the coverage investigation records no closer file). Rules checked: data and migration rules, clean environment, gates, rule 6 (assertions first) and rule 9 (cause before "pre-existing"). No conflicts.
- Supported Product Scenario Basis Confirmed: `Yes` (SCN-001 to SCN-007, MP-001 and MP-003, as confirmed in CRR-003/CRR-004)

## Round 2 Scope (API-REV-003)

- API/E2E round 3 commits `9434420df5` and `d7a2b9c1ef` change only files under `tickets/` (`git diff --name-only 64fd0d913a d7a2b9c1ef`).
- No durable test file was added, updated or removed by API/E2E this round.
- The test changes in the DR-001 fix (`7c60cb4909`: `list-available-agent-runtimes-tool.test.ts`, `available-agent-runtimes-graphql.e2e.test.ts`) are implementation's. They were reviewed in source review CRR-006.
- No durable test file changed (this round): `Yes`. Review result: `Not Applicable`.
- Evidence read for context:
  - `evidence/API-10-r3-regression-e2e-summary.txt`: 146 pass; the 3 failures are FU-002, FU-003 and FU-004, which also fail on base; AAR-04 (case API-16) proves DR-001 over a real MCP session.
  - `evidence/API-R3W-web-guards-and-unit.txt`.
- The rerun-by-impact choices in the coverage investigation's Round 3 Plan follow TESTING.md.

## Changed Durable Test Scope

Only the API/E2E engineer's test commits (`75ad3e4cb2`, `fba908bff5`) are in scope. Implementation's own test changes were reviewed in source review. Temporary probes, logs, screenshots and receipts are evidence.

| Durable Test Path | Change | Related Scenario / Requirement | Coherent Test Responsibility | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/projects/get-project-task-worker-scope.e2e.test.ts` | Added | REQ-014–REQ-017; AC-012–AC-015; AR-006, AR-008, MP-003 | `get_project_task` scope through a real Team root on built servers. MCP route (scripted AGY) and native route (emulated LM Studio). First messages, exposure, existing copy, damaged run data. | Only inference is scripted. The `it` blocks share one stack and run in order, which the header states; a reasonable trade-off for a ~4-minute stack. |
| `autobyteus-server-ts/tests/e2e/app-data-migrations/project-task-titles-startup.e2e.test.ts` | Added; updated in round 2 for SR-012 | REQ-005, AC-004, QR-002 | Startup titling through the built entrypoint, on synthesized released shapes | Covers the four shapes, the 200-character cut with an astral character, CRLF, a blank description and an unknown status (both preserved), Temp tasks untouched, the native tool's view and a byte-identical second start |
| `autobyteus-server-ts/tests/e2e/projects/project-task-boundaries.e2e.test.ts` | Updated | REQ-001, REQ-004, REQ-007, REQ-013, REQ-014 (TTL-API-001, GET-API-001) | Project tool boundaries on both routes | Compact one-value MCP copies; title refusals; `{name, path}` paths that read the saved copy; saved data unchanged by the rule |
| ~24 other server E2E files: `projects/*`, `media/*`, `remote-delegation-two-server`, `mcp-runtime-tool-matrix`, `codex-standalone-send-message-global-routing` | Updated | REQ-001, REQ-003/004, REQ-007/008, REQ-013/014, REQ-017 | Existing scenarios moved to the new shapes | Removed assertions have replacements, often tighter (`toEqual` in place of `toMatchObject`). Closed assignments are now read through `get_project_task`; Temp-task acks lose `projectId: null`; GraphQL errors gained the title cases. |
| Web probes: `projects-feature-probe`, `project-manager-ux-probe`, `project-manager-ux-task-locator-cases`, `task-closure-tree-probe`, `team-status-live-probe`, `delegated-team-default-collapse-probe`, `delegated-copies-large-hub-probe`, `embedding-settings-probe` | Updated | REQ-004, REQ-006, DEC-018 (3) | Real-stack browser probes | They send `title` with the description and assert title labels and the card preview that skips a repeated first line |

- No durable test file changed: `No`

## Proportional Test-Code Checks

| Check | Result | Evidence / Notes |
| --- | --- | --- |
| Scenario grouping and names make intent clear | Pass | Case IDs (SCP-E2E-001…006, TTL-E2E-001, TTL-API-001, GET-API-001) cite REQ/AC; headers state the stack, the scripted parts and the run command |
| Assertions prove approved requirements instead of incidental implementation details | Pass | Exact result shapes, absent fields, the refusal text naming the caller's Task, files read by `path`, byte-identical second start. One incidental detail: `storedNameOf` reads the stored name from the path's basename to cross-check GraphQL. It is acceptable as a cross-reference, not the behavior under test. |
| Fixtures, setup, helpers, and data builders reuse meaningful repetition | Pass | `titled()`, `taskAck()`, `attached()`, `taskLine()`, `fullTask()`, and the shared collaboration-root harness helpers |
| Test isolation and determinism are appropriate for the exercised boundary | Pass | Test-owned data roots and HOME, `env -i`, gated by `RUN_AGY_FAILURE_E2E`, processes and folders cleaned in `afterAll`/`afterEach`. Ordered shared state in the scope suite is documented. One fixed 3-second wait in SCP-E2E-006 backs a negative assertion; it is bounded and acceptable. |
| Large files remain coherent and navigable rather than mixing unrelated scenarios | Pass | The 416-line scope suite covers one capability; the boundaries file keeps its existing organization |
| No stale, duplicated, disabled-without-reason, or compatibility-only tests remain | Pass | `summary`, `meaningSearch: ready`, `projectId: null` and the `SKIPPED_NO_TITLE_LINE_WARNING` assertions are removed with the behavior; nothing newly skipped |
| Added, updated, and removed coverage agrees with the coverage investigation and execution evidence | Pass | Execution report Cases API-03, API-05, API-06, API-10-r2, API-11c/d-r2, API-12 match the files. FU-005's updated expectation is unexecuted because the base API changed; recorded as a follow-up with its cause (TESTING.md rule 9). |
| Test callers and fixtures exercise an independently established supported scenario rather than proving one by themselves | Pass | Damaged run data (SCP-E2E-006) is MP-003, a supported explicit edge. The blank-description and unknown-status files reproduce AC-004's "a Task that cannot be converted does not stop startup" on synthesized released shapes, per TESTING.md's migration rule. |
| Each test enters through its scenario's real trigger and follows the real actor's or event's steps, without a setup real use does not produce | Pass | Agents call tools through their runtime's real MCP session or native resolver; Tasks are created through GraphQL; the migration runs at the built server's startup. The only file edits are released-shape seeds and the MP-003 damage, both test-owned. |

## Findings

None.

## Follow-ups

- Follow-ups this review added: None. API/E2E recorded FU-002 to FU-007, each with its cause.

## Latest Authoritative Result

- Result: `Not Applicable` (round 2: no durable test code changed during API/E2E round 3). Round 1 (CRR-005) was `Pass`.
- Changed durable test paths reviewed: none this round. Round 1 reviewed `75ad3e4cb2` and `fba908bff5`.
- Unresolved finding IDs: None
- Recommended Recipient: `delivery_engineer`
- Notes:
  - Delivery resumes from DR-001 on head `d7a2b9c1ef` (tested source `7c60cb4909`, merge `54cd6803f4`).
  - Release notes:
    - rolling back after the title migration is not supported;
    - `list_available_agent_runtimes` (shipped in `v1.5.9-beta.7`) now leaves out null limit values;
    - the "summary" wording in `autobyteus-web/docs/projects.md` lines 694, 696 and 706 still needs docs sync.
  - The code-review documents updated after `269dbc209f` (CRR-006 and this round) are uncommitted.
