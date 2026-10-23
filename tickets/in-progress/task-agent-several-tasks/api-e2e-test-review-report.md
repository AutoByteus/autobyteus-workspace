# API/E2E Test Review Report — task-agent-several-tasks

## Review Meta

- Review Round: 1
- Trigger: API/E2E validation passed, round 2 (API-REV-002), from `/software_engineering_team/api_e2e_engineer`
- Requirements Doc Reviewed As Context: `requirements-doc.md` (SR-006)
- Investigation Notes Reviewed As Context: through the design spec (AF-001–AF-009)
- Solution Revision Record Reviewed As Context: SR-003 to SR-006
- Design Spec Reviewed As Context: `design-spec.md` (SR-006)
- Supplemental Task Artifacts Reviewed As Context: `follow-ups.md` (FU-001, FU-002)
- Architecture Review Revision Record Reviewed As Context: ARCH-REV-002, ARCH-REV-003
- Implementation Revision Record Reviewed As Context: IR-001 to IR-003
- Original Code Review Report: `code-review-report.md` (CRR-004, Pass)
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-005`
- Coverage Investigation: `api-e2e-coverage-investigation.md`
- Execution Coverage Report: `api-e2e-execution-coverage-report.md`
- API/E2E Revision Record Reviewed As Context: `api-e2e-revision-record.md` (API-REV-001, API-REV-002)
- Delivery Revision Record: N/A
- API/E2E Result: Pass. All critical ACs are proven, including AC-010 and AC-011 on the rebuilt isolated desktop instance (API-07 run 2).
- Final Validation Confidence: 96%
- Prior unresolved test-review findings rechecked: none (first test review)
- Project testing guideline applied: the worktree's `TESTING.md` (Rule 6 "Assertions first"; Rule 9; isolated-instance and probe rules). Round 2's rerun-by-impact matches the guideline: only the two catalogs and their test changed, so API-00 to API-06 keep their round-1 runs. Conflicts or discrepancies: none.
- Supported Product Scenario Basis Confirmed: `Yes`. SCN-001 to SCN-005, as in CRR-001 / CRR-004. Product code: the web fix `1fa3a1d87e`; the server is unchanged since `cd8c289b67`.

Reviewed commit: `386ce18b5f`. Round 2 changed no durable test (`git diff --name-only 386ce18b5f..HEAD` over the test folders is empty).

## Changed Durable Test Scope

| Durable Test Path | Change | Related Scenario / Requirement | Coherent Test Responsibility | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/projects/task-agent-several-tasks.e2e.test.ts` | Added | SCN-002, SCN-004; AC-002, AC-005, AC-006, AC-007; QR-001; wake of a sleeping copy | Several Tasks on one copy through the real server, the Manager's MCP session and AGY processes | Gated like its sibling live suites. SEV-E2E-004 sets the idle-grace setting to 60 s and back, inside its own test-owned data root. |
| `autobyteus-server-ts/tests/e2e/projects/task-existing-copy-assignment.e2e.test.ts` | Updated: rootScenario (all three roots), EXC-E2E-004, TKD-AGY-001 | SCN-001, SCN-003; AC-001, AC-003, AC-004; QR-002 | The existing-copy journey per root kind | The removed refusal's assertions are replaced by the accepted journey, not deleted (each removal's rationale is in the report's "Durable Coverage Changed"). |
| `autobyteus-server-ts/tests/e2e/projects/project-task-boundaries.e2e.test.ts` | Updated: CLS-API-001, POF-API-001 | REQ-008 | Tool-text pins | Exact new sentences, including CR-001's corrected parenthetical |

- No durable test file changed: `No`

## Proportional Test-Code Checks

| Check | Result | Evidence / Notes |
| --- | --- | --- |
| Scenario grouping and names make intent clear | Pass | The SEV-E2E-001..004 titles name their ACs. The updated blocks carry `task-agent-several-tasks AC-…` comments that say which removed refusal they replace. |
| Assertions prove approved requirements instead of incidental implementation details | Pass | The assertions check: the exact given-Task sentence ("Your Task A is still open; name the Task key in each report."); both Tasks' roots being the live copy; the open entries across Tasks being exactly {A, E}, then {A}; "already works on this Task" for a repeat; no closure and the process live after the first DONE, with a message still accepted; exactly one closure and the process gone after the last. EXC-E2E-004 now fails if an assignment is ever refused, and it records which order landed. |
| Fixtures, setup, helpers, and data builders reuse meaningful repetition | Pass | Existing harness helpers (`root.mark`, `closedSince`, `openEntriesAcross`, `processLive`) are reused. The scripted-AGY helper duplication predates this ticket and is already tracked in Task autobyteus-59. |
| Test isolation and determinism are appropriate for the exercised boundary | Pass | Each suite uses its own data root and server. Positive waits are bounded `until` conditions. The fixed 2–3 s sleeps back negative checks only ("no closure happened", "process still live"), which is a reasonable bound for a not-happening assertion at this boundary. |
| Large files remain coherent and navigable rather than mixing unrelated scenarios | Pass | The new suite covers one subject; the root journeys stay in the existing-copy suite. |
| No stale, duplicated, disabled-without-reason, or compatibility-only tests remain | Pass | The busy-refusal branches and their retries are removed, with nothing kept for the old rule. Only the suites' documented gates skip. |
| Added, updated, and removed coverage agrees with the coverage investigation and execution evidence | Pass | Matches the Cases table. The 7 stale pins found by the API-00 baseline are all updated, and FU-002's suite is unchanged and out of scope. |
| Test callers and fixtures exercise an independently established supported scenario rather than proving one by themselves | Pass | Every case maps to an approved SCN / AC. TKD-AGY-001 pins today's behavior after a Task is deleted ("Your previous Task is closed…") and refers to FU-001. That is a characterization of preserved delete behavior, which FU-001 may later change together with this assertion. |
| Each test enters through its scenario's real trigger and follows the real actor's or event's steps, without a setup real use does not produce | Pass | The tests drive the Manager's own `delegate_task` / `update_task` / `send_message_to`, the real idle shutdown (through the server setting), and real CLI processes. Only the external AGY CLI is scripted. |

## Findings

None.

## Follow-ups

Findings outside this ticket go in the ticket's `follow-ups.md`.

- Follow-ups this review added: None. FU-001 and FU-002 are already recorded.

## Latest Authoritative Result

- Result: `Pass`
- Changed durable test paths reviewed: the 3 paths above (commit `386ce18b5f`)
- Unresolved finding IDs: none
- Recommended Recipient: `/software_engineering_team/delivery_engineer`
- Notes:
  - Source review is not reopened: CRR-004 covered the last product change (`1fa3a1d87e`).
  - I reran nothing; the diffs and the recorded evidence were enough to judge every changed assertion.
  - Residual: a closed Task's root reads Offline while the same team works on another open Task, which is approved in ARCH-REV-003.
