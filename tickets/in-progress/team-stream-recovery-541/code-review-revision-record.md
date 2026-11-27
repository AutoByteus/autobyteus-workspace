# Code Review Revision Record

## Revision Index

| Revision ID | Canonical Review Report | Entry Point / Trigger | Prior Result | Current Result | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| CRR-001 | `code-review-report.md` | Implementation Review, round 1 (IR-001) | N/A | Pass | None |
| CRR-002 | `code-review-report.md` | API/E2E Failure-Origin Review, round 2 (API-REV-001 F-1) | Pass | Fail: implementation Local Fix | CR-001 (new; was C-2) |

## Revision Entries

### CRR-001: initial implementation review of IR-001 (Pass)

- Canonical review report updated: `tickets/in-progress/team-stream-recovery-541/code-review-report.md`
- Review entry point and round: Implementation Review, round 1
- Review scope: `Full Review` of `80420a8bf6..9e508b3adf`
- Triggering role, report path, and finding or scenario IDs: implementation engineer, `implementation-handoff.md` (IR-001, Large / High)
- Relevant solution revision IDs: SR-001, SR-002
- Relevant architecture-review revision IDs: ARCH-REV-001, ARCH-REV-002
- Relevant implementation revision IDs: IR-001
- Relevant API/E2E revision IDs: N/A
- Relevant delivery revision IDs: N/A
- Prior authoritative result: N/A
- Current authoritative result: Pass, 9.3 / 10
- What changed in the review result and why:
  - A, B, C, D and E match the design.
  - The two deviations hold: a separate recovery store for the 500-line rule, with the direction unchanged; and an intent-free shared attempt.
  - Held edges:
    - C-1: a context removed without a disconnect leaves a stale recovery state;
    - C-2: a member switch during an automatic attempt's hydration reverts at the commit.
  - Cosmetic: C-3, a stale mock key.
  - My re-run: web 1,875 and server 218 tests passed.
- Supported product scenario / material-premise basis changes: S-1…S-5 established.

#### Prior Finding Resolution

None.

- New or remaining finding IDs: None
- Material score or classification changes: N/A
- Recommended recipient: `/api_e2e_engineer`
- Remaining risks or uncertainty: C-1, C-2 (held); a mid-turn gap recovers after the turn.

### CRR-002: failure-origin review of API-REV-001 F-1 (focus undone at the recovery commit)

- Canonical review report updated: `tickets/in-progress/team-stream-recovery-541/code-review-report.md` ("Round 2 Failure-Origin Finding")
- Review entry point and round: API/E2E Failure-Origin Review, round 2
- Review scope: `N/A` (failure-origin). Read:
  - `teamRunOpenCoordinator.runTeamStreamRecovery` and its joined-reselect branch;
  - `workspaceNavigationService.ts:138-143`;
  - `runHistorySelectionActions.ts:81-82,122`;
  - the SDD-16 and SDD-17 evidence.
- Triggering role, report path, and finding or scenario IDs: API/E2E, `api-e2e-execution-coverage-report.md` (commit `488e231641`): F-1 (SDD-16; SDD-17 is the control)
- Relevant solution revision IDs: SR-002
- Relevant architecture-review revision IDs: ARCH-REV-002
- Relevant implementation revision IDs: IR-001
- Relevant API/E2E revision IDs: API-REV-001
- Relevant delivery revision IDs: N/A
- Prior authoritative result: Pass (CRR-001)
- Current authoritative result: Fail. The origin is implementation: CR-001, `Local Fix`.
- What changed in the review result and why:
  - C-2 is reproduced through a supported trigger: a Project Task's link to a member, which focuses directly instead of joining.
  - The automatic attempt's candidate keeps the focus captured when the attempt began, so the commit reverts the user's navigation. That breaks REQ-001 and AC-010.
  - The fix: carry the current focus at the commit, loading and focusing that member after it, as the joined reselect does.
  - C-1 is rejected: it is unreachable through the UI.
- **Review gap I own:** CRR-001 held C-2 on window size without checking which navigation paths bypass the coordinator's join.
- Supported product scenario / material-premise basis changes: S-2 now includes in-app links (Project Tasks) to a Team member during a recovery.

#### Prior Finding Resolution

None (CRR-001 had no findings; C-2 is promoted to CR-001, and C-1 is rejected).

- New or remaining finding IDs: CR-001
- Material score or classification changes: runtime correctness is below 9.2 until CR-001 is fixed.
- Recommended recipient: `/implementation_engineer`
- Remaining risks or uncertainty:
  - FU-001 (the NodeRow audit, on the base);
  - the test-code review of `488e231641` after a pass.
