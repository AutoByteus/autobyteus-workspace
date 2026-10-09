# Code Review Revision Record

The latest `code-review-report.md` (or `api-e2e-test-review-report.md`) remains authoritative for its current result.

## Revision Index

| Revision ID | Canonical Review Report | Entry Point / Trigger | Prior Result | Current Result | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| CRR-001 | `code-review-report.md` | Implementation Review, round 1 / IR-001 handoff | N/A | Pass | None |
| CRR-002 | `code-review-report.md` | API/E2E Failure-Origin Review, round 2 / API-REV-001 F-001 | Pass | Fail — Local Fix → implementation_engineer | CR-001 (new) |
| CRR-003 | `code-review-report.md` | Implementation Review, round 3 (Targeted Delta) / IR-002 | Fail (CR-001 open) | Pass | CR-001 (resolved) |
| CRR-004 | `api-e2e-test-review-report.md` | Proportional test-code review / API-REV-002 pass | Pass (CRR-003) | Pass | None |

## Revision Entries

### CRR-001 — Initial implementation review of delegate-to-existing-copy

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegate-to-existing-copy/tickets/in-progress/delegate-to-existing-copy/code-review-report.md`
- Review entry point and round: Implementation Review, round 1
- Review scope: `Full Review`
- Triggering role, report path, and finding or scenario IDs: implementation_engineer, `implementation-handoff.md` (IR-001); no triggering findings
- Relevant solution revision IDs: SR-003, SR-006
- Relevant architecture-review revision IDs: ARCH-REV-003
- Relevant implementation revision IDs: IR-001
- Relevant API/E2E revision IDs: N/A
- Relevant delivery revision IDs: N/A
- Prior authoritative result: N/A
- Current authoritative result: Pass (9.3/10; every category ≥ 9.0)
- What changed in the review result and why: initial baseline.
- Supported product scenario / material-premise basis changes: none. MP-001..MP-004 are confirmed against the code. Candidates C-01..C-08 were recorded and none was promoted.

#### Prior Finding Resolution

None.

- New or remaining finding IDs: None
- Material score or classification changes: N/A
- Recommended recipient: `/software_engineering_team/api_e2e_engineer`
- Remaining risks or uncertainty:
  - `project-task-service.ts` is near the 500-line limit.
  - The MP-003 release window needs wire-level QR-001 coverage.
  - The PTM skill branch must ship with the server change.
  - Real-runtime AC coverage is pending in API/E2E.

### CRR-002 — Failure origin of F-001 (never-started copy refused with the generic reason)

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegate-to-existing-copy/tickets/in-progress/delegate-to-existing-copy/code-review-report.md` (round-2 sections at the top)
- Review entry point and round: API/E2E Failure-Origin Review, round 2
- Review scope: `N/A` (failure-origin)
- Triggering role, report path, and finding or scenario IDs: api_e2e_engineer, `api-e2e-execution-coverage-report.md` (API-REV-001); F-001 / EXC-E2E-006 (AC-009, REQ-005)
- Relevant solution revision IDs: SR-003, SR-006
- Relevant architecture-review revision IDs: ARCH-REV-003
- Relevant implementation revision IDs: IR-001
- Relevant API/E2E revision IDs: API-REV-001
- Relevant delivery revision IDs: N/A
- Prior authoritative result: Pass (CRR-001)
- Current authoritative result: Fail. Failure origin confirmed: implementation defect, `Local Fix` → implementation_engineer.
- What changed in the review result and why:
  - A copy whose start failed is never registered in the root's tree.
  - `assignToExistingCopy` resolves the copy in the tree before the Task-side eligibility check, so the approved "never started" reason (AC-009 / item 5) is unreachable. The generic "not a delegated copy in this run" refusal is returned instead.
  - The runtime unit fixture masked this: its fake copy stays in the tree.
  - This was a round-1 source-review gap: MP-004 was confirmed only on the Task side.
- Supported product scenario / material-premise basis changes: FO-SCN-001 was added as a Supported Explicit Edge Scenario (AC-009 contract; ID surfaced by `list_project_tasks`). MP-004 was reclassified (item 5 is unreachable through the current ordering).

#### Prior Finding Resolution

None (CRR-001 had no findings).

- New or remaining finding IDs: CR-001 (new, open)
- Material score or classification changes:
  - Round-1 Runtime Correctness rationale amended to ≤ 8.5 while CR-001 is open.
  - Classification: `Local Fix`.
- Recommended recipient: `/software_engineering_team/implementation_engineer`
- Remaining risks or uncertainty:
  - If the fix needs a new port contract (e.g. host-root exposure), escalate to the Solution Designer.
  - Test-code review of the API/E2E durable changes is deferred to the post-pass entry point.
  - O-001, O-002 and O-003 are non-blocking and unrelated.

### CRR-003 — CR-001 fix verified (never-started copy outside the tree)

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegate-to-existing-copy/tickets/in-progress/delegate-to-existing-copy/code-review-report.md` (round-3 section at the top)
- Review entry point and round: Implementation Review, round 3
- Review scope: `Targeted Delta Review`. Commit `88e59f500` touches only the CR-001 refusal path, one fixture and two unit suites. No interface, port or data-shape change.
- Triggering role, report path, and finding or scenario IDs: implementation_engineer, `implementation-handoff.md` / `implementation-revision-record.md` (IR-002); CR-001; F-001 / EXC-E2E-006
- Relevant solution revision IDs: SR-003, SR-006
- Relevant architecture-review revision IDs: ARCH-REV-003
- Relevant implementation revision IDs: IR-002
- Relevant API/E2E revision IDs: API-REV-001
- Relevant delivery revision IDs: N/A
- Prior authoritative result: Fail (CRR-002, CR-001 open)
- Current authoritative result: Pass (9.3/10; every category ≥ 9.0)
- What changed in the review result and why: on a tree miss, a closed copy hosted by this root now gets the Task side's specific refusal through the existing port. Other IDs keep the generic refusal. Verified in code, by the unit and real-adapter suites, and by the original E2E case (EXC-E2E-006), which reviewer-run evidence shows passing.
- Supported product scenario / material-premise basis changes: MP-004 / item 5 is reachable again. C-09 (failed copy while its own Task is still open → generic refusal) was rejected and accepted as a residual risk.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-001 | Open | Resolved | IR-002, commit `88e59f500` | `refuseCopyOutsideTree` trace; 521 unit tests passed; EXC-E2E-006 passed (scripted AGY, Team root) |

- New or remaining finding IDs: None
- Material score or classification changes: Runtime Correctness restored to 9.0; no classification.
- Recommended recipient: `/software_engineering_team/api_e2e_engineer`
- Remaining risks or uncertainty:
  - C-09: generic refusal while the failed copy's Task is open.
  - `project-task-service.ts` is near the 500-line limit.
  - The PTM skill branch is still unpushed.

### CRR-004 — Proportional review of the API/E2E durable test changes

- Canonical review report updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegate-to-existing-copy/tickets/in-progress/delegate-to-existing-copy/api-e2e-test-review-report.md` (new)
- Review entry point and round: successful API/E2E test-code review, round 1
- Review scope: `N/A` (test review)
- Triggering role, report path, and finding or scenario IDs: api_e2e_engineer, `api-e2e-execution-coverage-report.md` (API-REV-002, Pass); EXC-E2E-001..008, BR-012..016
- Relevant solution revision IDs: SR-003, SR-006
- Relevant architecture-review revision IDs: ARCH-REV-003
- Relevant implementation revision IDs: IR-002
- Relevant API/E2E revision IDs: API-REV-002
- Relevant delivery revision IDs: N/A
- Prior authoritative result: Pass (CRR-003, implementation review)
- Current authoritative result: Pass (test review)
- What changed in the review result and why: four durable paths were reviewed: 1 added E2E suite, 1 updated scripted-actor fixture, 1 updated browser probe and `TESTING.md`. All are coherent, enter through real triggers and assert approved behavior.
- Supported product scenario / material-premise basis changes: None

#### Prior Finding Resolution

None (no prior test-review findings).

- New or remaining finding IDs: None. There are two non-blocking notes: duplicated E2E helpers across files, and the unasserted leftover-process record.
- Material score or classification changes: N/A
- Recommended recipient: `/software_engineering_team/delivery_engineer`
- Remaining risks or uncertainty:
  - The durable test changes are uncommitted.
  - The PTM skill commit `0bd84e0` is unpushed.
  - C-09 (accepted residual).
  - `project-task-service.ts` is near the 500-line limit.
