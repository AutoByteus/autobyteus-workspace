# Code Review Revision Record

## Revision Index

| Revision ID | Canonical Review Report | Entry Point / Trigger | Prior Result | Current Result | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| CRR-001 | `code-review-report.md` | Implementation Review, round 1 / IR-001 | N/A | Pass | CR-001 (non-blocking) |
| CRR-002 | `code-review-report.md` | API/E2E Failure-Origin Review, round 2 / API-REV-001 F-1…F-3 | Pass | Fail: Design Impact (F-3), implementation Local Fix (F-2), API/E2E Local Fix (F-1) | CR-002, CR-003; C-06 corrected |
| CRR-003 | `code-review-report.md` | Implementation Review, round 3 / IR-002 (SR-009) | Fail (CRR-002) | Pass | CR-002, CR-003 resolved; CR-001 open, non-blocking |
| CRR-004 | `api-e2e-test-review-report.md` | Proportional test-code review / API-REV-002 Pass | Pass (CRR-003) | Pass | None |

## Revision Entries

### CRR-001 — Initial implementation review of IR-001: Pass

- Canonical review report updated: `tickets/in-progress/collaboration-tree-open-tasks-only-469/code-review-report.md`
- Review entry point and round: Implementation Review, round 1
- Review scope: `Full Review`
- Triggering role, report path, and finding or scenario IDs: Implementation Engineer, `implementation-handoff.md` (IR-001); SCN-001 … SCN-006
- Relevant solution revision IDs: SR-005 … SR-008
- Relevant architecture-review revision IDs: ARCH-REV-002, ARCH-REV-003, ARCH-REV-005
- Relevant implementation revision IDs: IR-001
- Relevant API/E2E revision IDs: N/A
- Relevant delivery revision IDs: N/A
- Prior authoritative result: N/A
- Current authoritative result: Pass
- What changed in the review result and why: initial result. Every behavior of the design map is implemented as traced (compose from the Task records, SR-008 save rule, `readOwnParts`, drop after a confirmed stop and add-back with undo in one queue step, closed-copy run-ID routing, view rule, closed-run readers, web reload). Checks IMP-01 … IMP-07 cover the reviewed commits; none rerun.
- Supported product scenario / material-premise basis changes: none; MP-002 confirmed.

#### Prior Finding Resolution

None.

- New or remaining finding IDs: CR-001 (non-blocking naming: `knowsRunId`)
- Material score or classification changes: N/A
- Recommended recipient: `/software_engineering_team/api_e2e_engineer`
- Remaining risks or uncertainty: inactive closed-set digest re-read (bounded); Team-tab transient during a participant list re-fetch; AC-008 full start, isolated-instance journeys, AC-011 rendered and the fresh-start build not yet run.

### CRR-002: Failure-origin review of API/E2E round 1 (F-1, F-2, F-3)

- Canonical review report updated: `code-review-report.md` (new "Round 2" section first; C-06, Findings, Classification and Latest Result updated)
- Review entry point and round: API/E2E Failure-Origin Review, round 2
- Review scope: `N/A` (failure-origin)
- Triggering role, report path, and finding or scenario IDs: API/E2E Engineer, `api-e2e-execution-coverage-report.md` (API-REV-001), F-1 (EXC-E2E-007), F-2 (BR-001, BR-003), F-3 (BR-011, BR-015)
- Relevant solution revision IDs: SR-008
- Relevant architecture-review revision IDs: ARCH-REV-005
- Relevant implementation revision IDs: IR-001
- Relevant API/E2E revision IDs: API-REV-001
- Relevant delivery revision IDs: N/A
- Prior authoritative result: Pass (CRR-001)
- Current authoritative result: Fail. F-3 is a `Design Impact` (Solution Designer); F-2 is a `Local Fix` (implementation, web); F-1 is a `Local Fix` (API/E2E, stale test).
- What changed in the review result and why:
  - F-3: DS-R1 / D-8 send an unknown "reopened" reference in a Team view to stream recovery, which is a manual recovery (`TeamStreamingService.ts:366-367, 411-427`; `TeamWorkspaceView.vue:44-47`). It cannot meet AC-002's "without a manual reload".
  - F-2: `reloadRoot` keeps loaded lists without re-fetching in the same live sequence (`collaborationParticipantMessages.ts:114-121`), so `pastParticipants` stay stale after a rebuild drops the counterpart.
  - F-1: the old wording depended on the record still being in memory, in a state no product action produces (whole folder deleted). REQ-005 / AC-009 of `delegate-to-existing-copy` still hold.
- Supported product scenario / material-premise basis changes:
  - C-06 changes from Reject to Promote (CR-002).
  - F-1's whole-folder deletion is classified as having no product trigger; the governing contract still holds.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-001 | Open (non-blocking) | Open (non-blocking) | IR-001 | Unchanged code |

- New or remaining finding IDs: CR-002 (blocking), CR-003 (blocking), CR-001 (non-blocking)
- Material score or classification changes: round-1 rationale for Runtime Correctness and API/E2E Readiness did not account for CR-002 or CR-003. Review gaps are recorded: F-2 fully, F-3 partly.
- Recommended recipient: `/software_engineering_team/solution_designer`
- Remaining risks or uncertainty:
  - BR-005 and BR-007 have not run.
  - Memory Sync imported sources with delegated runs are untested (API/E2E residual risk).

### CRR-003: Implementation review of IR-002: Pass

- Canonical review report updated: `code-review-report.md` (new "Round 3" section first; Latest Authoritative Result updated)
- Review entry point and round: Implementation Review, round 3
- Review scope: `Full Re-Audit`
  - Why: a shared contract changed, the Team stream "reopened" payload.
  - Structural checks were rerun on the changed files; round-1 evidence is carried forward for untouched source.
- Triggering role, report path, and finding or scenario IDs: Implementation Engineer, `implementation-handoff.md` (IR-002); CR-002, CR-003
- Relevant solution revision IDs: SR-009 (DEC-011)
- Relevant architecture-review revision IDs: ARCH-REV-006
- Relevant implementation revision IDs: IR-002
- Relevant API/E2E revision IDs: API-REV-001
- Relevant delivery revision IDs: N/A
- Prior authoritative result: Fail (CRR-002)
- Current authoritative result: Pass
- What changed in the review result and why:
  - CR-003: the Team reopened event carries each record and its parent Team run, built from the loaded tree. The Team view inserts records it does not hold; the stream-recovery branch is gone.
  - CR-002: `reloadRoot` re-fetches a kept list whose counterpart the rebuilt view does not hold and its past participants do not name.
- Supported product scenario / material-premise basis changes: none. New candidates C-08 … C-10 were rejected (no reachable consequence, artificial timing, contradictory concurrent actions).

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-003 | Open (blocking) | Resolved | SR-009, IR-002 | `task-execution-event-factory.ts:25-36`; `team-execution-view-projector.ts:101-107`; `teamExecutionViewState.ts:385-406`; IMP-08, IMP-10 |
| CR-002 | Open (blocking) | Resolved | IR-002 | `collaborationParticipantMessages.ts:35-40, 123-135`; four callers; IMP-10 |
| CR-001 | Open (non-blocking) | Open (non-blocking) | — | Unchanged |

- New or remaining finding IDs: CR-001 (non-blocking)
- Material score or classification changes: every category is at or above 9.2; overall 9.4.
- Recommended recipient: `/software_engineering_team/api_e2e_engineer`
- Remaining risks or uncertainty:
  - The two changed server E2E helpers have not been run.
  - Still to run: BR-001 … BR-005, BR-007, BR-011, BR-015, and EXC-E2E-007 (per DEC-011).
  - Memory Sync imported sources with delegated runs are untested.

### CRR-004: Proportional test-code review after API/E2E round 2: Pass

- Canonical review report updated: `api-e2e-test-review-report.md` (new)
- Review entry point and round: successful API/E2E test-code review, round 1
- Review scope: `N/A` (test review)
- Triggering role, report path, and finding or scenario IDs: API/E2E Engineer, `api-e2e-execution-coverage-report.md` (API-REV-002); test commits `009f707955`, `431de4c9d1`, `c7eb0d8626`
- Relevant solution revision IDs: SR-009 (DEC-011)
- Relevant architecture-review revision IDs: ARCH-REV-006
- Relevant implementation revision IDs: IR-002
- Relevant API/E2E revision IDs: API-REV-001, API-REV-002
- Relevant delivery revision IDs: N/A
- Prior authoritative result: Pass (CRR-003)
- Current authoritative result: Pass
- What changed in the review result and why:
  - The new upgrade-startup E2E proves AC-001, AC-005, AC-006 and AC-008 … AC-012 through a built server, with a positive control for the read check.
  - Updated E2Es replace old expectations with positive checks of the approved behavior; none is weakened.
  - EXC-E2E-007 follows DEC-011.
  - The probe checks Team-tab rows and names across closures and a restart.
- Supported product scenario / material-premise basis changes: none

#### Prior Finding Resolution

None (first test-code review).

- New or remaining finding IDs: none (one non-blocking note: the per-frame Team-tab sample is recorded, not asserted)
- Material score or classification changes: N/A
- Recommended recipient: `/software_engineering_team/delivery_engineer`
- Remaining risks or uncertainty:
  - Memory Sync imported sources with delegated runs are untested.
  - Signing, notarization and the non-macOS release jobs need the release runner.
