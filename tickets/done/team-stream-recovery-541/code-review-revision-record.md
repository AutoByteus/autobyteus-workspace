# Code Review Revision Record

## Revision Index

| Revision ID | Canonical Review Report | Entry Point / Trigger | Prior Result | Current Result | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| CRR-001 | `code-review-report.md` | Implementation Review, round 1 (IR-001) | N/A | Pass | None |
| CRR-002 | `code-review-report.md` | API/E2E Failure-Origin Review, round 2 (API-REV-001 F-1) | Pass | Fail: implementation Local Fix | CR-001 (new; was C-2) |
| CRR-003 | `code-review-report.md` | Implementation Review, round 3 (IR-002), Targeted Delta | Fail | Pass | CR-001 (resolved) |
| CRR-004 | `api-e2e-test-review-report.md` | API/E2E test-code review (API-REV-002 Pass) | Pass (CRR-003) | Pass | None |

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

### CRR-003: targeted delta review of IR-002 (Pass)

- Canonical review report updated: `tickets/in-progress/team-stream-recovery-541/code-review-report.md` ("Round 3 Delta Verification")
- Review entry point and round: Implementation Review, round 3
- Review scope: `Targeted Delta Review` of `879030100d..5721f3f2c6`:
  - `teamRunOpenCoordinator.ts` and its spec;
  - the stale mock removed from `HistoricalTeamLazyHydration.integration.spec.ts`.
- Triggering role, report path, and finding or scenario IDs: implementation engineer, `implementation-handoff.md` (IR-002); CR-001
- Relevant solution revision IDs: SR-002
- Relevant architecture-review revision IDs: ARCH-REV-002
- Relevant implementation revision IDs: IR-002
- Relevant API/E2E revision IDs: API-REV-001
- Relevant delivery revision IDs: N/A
- Prior authoritative result: Fail (CRR-002)
- Current authoritative result: Pass, 9.3 / 10
- What changed in the review result and why:
  - The focus at the commit is carried: loaded, then focused, then the navigation projection refreshed.
  - It is guarded against a further focus move and a replaced context, and a failed load is safe.
  - An explicit reselect still applies after it.
  - The specs are red on IR-001 and green now, and SDD-16 and SDD-17 pass.
  - My re-run: 319 tests passed.
- Supported product scenario / material-premise basis changes: none. Held: an inspection still loading when the commit lands keeps the earlier focus.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-001 | Open (CRR-002) | Resolved | IR-002 `376b4bb9c0` | IMP-007 (2 of 3 new specs red on IR-001; 20/20 green); SDD-16 green with the header and the tree row on mate; my re-run, 319 passed |

- New or remaining finding IDs: None
- Material score or classification changes: runtime correctness back to 9.2.
- Recommended recipient: `/api_e2e_engineer`
- Remaining risks or uncertainty:
  - the held in-flight-inspection window;
  - FU-001 (on the base);
  - the test-code review of `488e231641` after the next pass.

### CRR-004: proportional review of the API/E2E test code (Pass)

- Canonical review report updated: `tickets/in-progress/team-stream-recovery-541/api-e2e-test-review-report.md` (new)
- Review entry point and round: API/E2E test-code review, round 1
- Review scope: `N/A` (test review) of `488e231641`: `send-delivery-probe.mjs` (SDD-15, SDD-16, SDD-17) and `mobile-team-stream-recovery-cases.mjs` (MSP-120)
- Triggering role, report path, and finding or scenario IDs: API/E2E, `api-e2e-execution-coverage-report.md` (API-REV-002 Pass, 94%, commit `da5802075f`)
- Relevant solution revision IDs: SR-002
- Relevant architecture-review revision IDs: ARCH-REV-002
- Relevant implementation revision IDs: IR-002
- Relevant API/E2E revision IDs: API-REV-001, API-REV-002
- Relevant delivery revision IDs: N/A
- Prior authoritative result: Pass (CRR-003)
- Current authoritative result: Pass (test code)
- What changed in the review result and why:
  - The cases prove REQ-001, REQ-002, AC-003 and AC-010 in the browser, with a deterministic, scoped read hold.
  - Notes:
    - T-1: SDD-16 pushes the router instead of clicking a Project Task link;
    - T-2: SDD-17 could assert `heldReads === 1`;
    - a leftover variable name.
  - I agree with FU-002, the in-flight inspection residual, as a follow-up.
- Supported product scenario / material-premise basis changes: none.

#### Prior Finding Resolution

None.

- New or remaining finding IDs: None
- Material score or classification changes: N/A
- Recommended recipient: `/delivery_engineer`
- Remaining risks or uncertainty:
  - FU-001 (the NodeRow font audit, on the base);
  - FU-002 (an inspection rejected across a commit).
