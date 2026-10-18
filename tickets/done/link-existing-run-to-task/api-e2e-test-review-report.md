# API/E2E Test Review Report

## Review Meta

- Review Round: 2 (delta re-review of TR-001/TR-002; round 1 = CRR-007)
- Trigger: `api_e2e_engineer` API-REV-003 Pass, on `fbc0f805bf` (rounds API-REV-001/002 failed on F-001/F-002, since fixed)
- Requirements Doc Reviewed As Context: `requirements-doc.md` (REQ-001..REQ-007, AC-001..AC-007)
- Investigation Notes Reviewed As Context: through the design
- Solution Revision Record Reviewed As Context: `solution-revision-record.md` (SR-009)
- Design Spec Reviewed As Context: `design-spec.md` (SR-009)
- Supplemental Task Artifacts Reviewed As Context: N/A — not applicable
- Architecture Review Revision Record Reviewed As Context: ARCH-REV-005
- Implementation Revision Record Reviewed As Context: IR-001..IR-004
- Original Code Review Report: `code-review-report.md` (CRR-006 Pass)
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-008`
- Coverage Investigation: `api-e2e-coverage-investigation.md`
- Execution Coverage Report: `api-e2e-execution-report.md`, `api-e2e-validation-ledger.md`
- API/E2E Revision Record Reviewed As Context: `api-e2e-revision-record.md` (API-REV-001..003)
- API/E2E Result: Pass
- Final Validation Confidence: as reported (AC-001..AC-004, AC-006 pass; AC-007 at delivery)
- Prior unresolved test-review findings rechecked: None (first test review)
- Project testing guideline(s) applied: `TESTING.md` (clean environment, scripted runtime, test-owned data, never the user's data). No conflicts.
- Supported Product Scenario Basis Confirmed: `Yes`. SCN-001..SCN-003: the PM adopts an agent run and a team run the user started in its workspace (REQ-001..REQ-003); refusals (REQ-005, REQ-007); adopted-team usage (F-001's real-model trigger).

## Changed Durable Test Scope

| Durable Test Path | Change | Related Scenario / Requirement | Coherent Test Responsibility | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/projects/hand-started-run-adoption.e2e.test.ts` | Added | AC-001..AC-004, REQ-002..REQ-004, F-001 | adoption end to end through the real server and tools (ADO-1..ADO-4) | one behavior per case; 266 lines |
| `autobyteus-server-ts/tests/e2e/helpers/collaboration-root-harness.ts` | Updated | — | `startRoot(…, { workspaceRootPath })` (another-workspace refusal); `release(rootId)` so cleanup doesn't terminate a run another root adopted | small, additive |
| `TESTING.md` | Updated | test guidance | resolve the temp `HOME` (macOS `/var` symlink; the terminal e2e compares `$PWD` with `HOME`) | matches the TR-003 cause in round 1 |

- No durable test file changed: `No`

## Proportional Test-Code Checks

| Check | Result | Evidence / Notes |
| --- | --- | --- |
| Scenario grouping and names | Fail | ADO-1..ADO-4 are clear, but the file header lists only ADO-1..ADO-3 (TR-001) |
| Assertions prove requirements | Pass | the link at the catalog address; the PM's open Task entry; the run gone from the history; the earlier conversation kept and the Task delivered into it; every earlier file kept; the own file naming the PM; DONE closes; reopen plus the PM's message reactivates; members message each other and the PM; refusals leave the tree and Task entries unchanged; ADO-4 checks that the root keeps running, with a control |
| Fixtures / helpers reused | Pass | built on `collaboration-root-harness`; the two harness additions are minimal |
| Isolation and determinism | Fail | resolved temp `HOME` set in `vi.hoisted`; `AGY_FAKE_CASE` restored in `finally`. But ADO-3's busy case waits a fixed `setTimeout(2000)` for the held turn to start before the refusals; under load the turn may not be running yet (TR-002) |
| Large files coherent | Pass | — |
| No stale or compatibility-only tests | Fail | the stale header (TR-001) |
| Coverage matches evidence | Pass | the ledger discloses the failed authoring runs with their causes: TR-001 (HOLD_TURN terminate hang, made a follow-up), TR-002 (early ADO-4 versions not exercising the defect), FU-1. Final runs: `ADO-run3.log` 3/3, ADO-4 with the fix (`implementation/IR-003-ADO-e2e.log` 4/4, round-2 impact run). The real-app D-1 evidence in `round3/desktop/` (retired state, window check) matches the report |
| Independently established scenario | Pass | REQ-001..REQ-007 |
| Real trigger | Pass | the PM's real `delegate_task` / `update_task` / `send_message_to` through scoped MCP; history through GraphQL; the runs the user started through the real start mutations and a real turn |

## Findings

| Finding ID | Test Path / Scenario | Evidence | Required Action | Classification / Owner |
| --- | --- | --- | --- | --- |
| TR-001 | `hand-started-run-adoption.e2e.test.ts` lines 11–23 | The header describes ADO-1..ADO-3 only; ADO-4 (adopted-team usage, F-001) is missing. The Run line passes `HOME="$HOME"`, against the TESTING.md rule this change adds (a resolved temp `HOME`). The test sets its own `HOME` internally, but the documented command should follow the rule | Add ADO-4 to the header. Make the Run line use `HOME="$(cd "$(mktemp -d)" && pwd -P)"` as TESTING.md now says | Local Fix / `api_e2e_engineer` |
| TR-002 | ADO-3 lines 196–197 | After sending the delayed `CALL_TOOLS`, the test sleeps a fixed 2 s and assumes the turn is running. The "in the middle of a turn" refusal depends on that, so under load the precondition can fail | Replace the sleep with an `until` on the busy run's status being running (or another observable turn start) before the refusals | Local Fix / `api_e2e_engineer` |

## Follow-ups

None new. FU-1/FU-2 (AGY terminate during a held turn) are already in autobyteus-122.

## Round 2 Resolution (CRR-008, API-REV-004)

| Finding ID | Prior Status | Current Status | Verification Evidence |
| --- | --- | --- | --- |
| TR-001 | Local Fix | Resolved | The header now describes ADO-4 (adopted-team usage under the PM's root, the new-task-team control, the `usage_report` replay). The Run line uses `HOME="$(cd "$(mktemp -d)" && pwd -P)"`, per TESTING.md |
| TR-002 | Local Fix | Resolved | Lines 199–203: `until` the busy run's conversation records its `CALL_TOOLS:` input ("busy run's turn started", 30 s), then the refusals; the delayed call keeps the turn running for 25 s. `round4/ADO3-run2.log`: Pass, and the refusal still matches "middle of a turn". The failed first try (`round4/ADO3-run.log`, waiting on `agent_statuses`, which lists task agents, not the root) is disclosed in the ledger |

## Latest Authoritative Result

- Result: `Pass`
- Changed durable test paths reviewed: `hand-started-run-adoption.e2e.test.ts` (ADO-1..ADO-4), `collaboration-root-harness.ts` (`startRoot` workspace option, `release`), `TESTING.md` (resolved temp `HOME`)
- Unresolved finding IDs: None
- Recommended Recipient: `delivery_engineer`
- Notes:
  - The three durable test changes are uncommitted.
  - AC-007 (the user's check on a beta: give autobyteus-10 to the run working on it) is for delivery.
  - Follow-ups are with `/project_task_manager`: autobyteus-59 (test title) and autobyteus-122 (AGY terminate during a held turn).
