# Code Review Revision Record

## Revision Index

| Revision ID | Canonical Review Report | Entry Point / Trigger | Prior Result | Current Result | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| CRR-001 | `code-review-report.md` | Implementation Review / IR-001 complete | N/A | Pass | None |
| CRR-002 | `code-review-report.md` | API/E2E Failure-Origin Review / API-REV-001 Fail (F-1, F-2) | Pass (CRR-001) | Fail | CR-001, CR-002 |
| CRR-003 | `code-review-report.md` | Implementation Review / IR-002 (SR-010, CR-001) | Fail (CRR-002) | Pass | CR-001, CR-002 (resolved) |
| CRR-004 | `code-review-report.md` | API/E2E Failure-Origin Review / API-REV-002 Fail (F-3) | Pass (CRR-003) | Fail | CR-003 |
| CRR-005 | `code-review-report.md` | Implementation Review / IR-003 (CR-003 Local Fix) | Fail (CRR-004) | Fail | CR-003 (resolved), CR-004 (new) |
| CRR-006 | `code-review-report.md` | Implementation Review / IR-004 (CR-004 Local Fix) | Fail (CRR-005) | Pass | CR-004 (resolved) |

## Revision Entries

### CRR-001: Initial implementation review of IR-001

- Canonical review report updated: `/home/autobyteus/workspace/.codex/worktrees/team-run-follows-definition/tickets/in-progress/team-run-follows-definition/code-review-report.md`
- Review entry point and round: Implementation Review, round 1
- Review scope: `Full Review`
- Triggering role, report path, and finding or scenario IDs: implementation engineer, `implementation-handoff.md` (IR-001); commits `19b31ad365`, `6b46ec5bdd` on `codex/team-run-follows-definition` (base `a07767f4d0`, design `a54485a260`)
- Relevant solution revision IDs: SR-005, SR-006, SR-008
- Relevant architecture-review revision IDs: ARCH-REV-001, ARCH-REV-002
- Relevant implementation revision IDs: IR-001
- Relevant API/E2E revision IDs: N/A
- Relevant delivery revision IDs: N/A
- Prior authoritative result: N/A
- Current authoritative result: Pass
- What changed in the review result and why: first result. The implementation realizes SR-008 and notes N-5..N-10. The exact texts match. The N-5 files are within limits. Two declared deviations (history list, launch layers) are consistent with REQ-002 and DEC-005.
- Supported product scenario / material-premise basis changes: None. MP-01..MP-04 were confirmed. Candidates C-01..C-08 were rejected; C-07 is a cosmetic misplaced doc comment.

#### Prior Finding Resolution

None.

- New or remaining finding IDs: None
- Material score or classification changes: N/A (initial); Large/High preserved
- Recommended recipient: API/E2E engineer
- Remaining risks or uncertainty: real-runtime behavior and the rendered AC-009 view (N-8) are pending in API/E2E. Declared retry and follower-step risks remain. C-07 is cosmetic.

### CRR-002: Failure-origin review of API-REV-001 (F-1, F-2)

- Canonical review report updated: `/home/autobyteus/workspace/.codex/worktrees/team-run-follows-definition/tickets/in-progress/team-run-follows-definition/code-review-report.md`
- Review entry point and round: API/E2E Failure-Origin Review, round 2
- Review scope: `N/A` (failure-origin round)
- Triggering role, report path, and finding or scenario IDs: API/E2E engineer, `api-e2e-execution-coverage-report.md` (API-REV-001); F-1 (TF-02, TF-03; AC-010), F-2 (TFU-03; AC-003)
- Relevant solution revision IDs: SR-008
- Relevant architecture-review revision IDs: ARCH-REV-002
- Relevant implementation revision IDs: IR-001
- Relevant API/E2E revision IDs: API-REV-001
- Relevant delivery revision IDs: N/A
- Prior authoritative result: Pass (CRR-001)
- Current authoritative result: Fail
- What changed in the review result and why:
  - F-1: `GlobalAgentRunMessageRouter.deliver` routes a run-ID message through the sender's root only when `RootTeamRun.hasAgentExecution` (current members only) is true. Leaving and former run IDs fall through to cross-run delivery and never reach the refusal in `deliverToRunId`. Classified `Local Fix`.
  - F-2: the "Leaving" tag was designed onto `TeamMembersPanel.vue`, which no page mounts (on base or HEAD). The rendered member list is the run-tree rows, which drop a leaving member. Classified `Design Impact`.
  - Both are source-review gaps of CRR-001, recorded in CR-001 and CR-002.
- Supported product scenario / material-premise basis changes: none. N-8's "brief and expected" premise is reclassified within CR-002: the run-tree rows are the only rendered list, and the difference lasts the whole leaving period.

#### Prior Finding Resolution

None (CRR-001 had no findings).

- New or remaining finding IDs: CR-001 (Local Fix, implementation), CR-002 (Design Impact, Solution Designer)
- Material score or classification changes: Runtime Correctness 9.3 → 8.6; API/E2E Readiness 9.3 → 9.0; dead-code row Fail (`TeamMembersPanel.vue`). Large/High preserved.
- Recommended recipient: Solution Designer (CR-001 included for the next implementation round)
- Remaining risks or uncertainty: O-1 (AC-007 "warning logged" reading) is left to the Solution Designer.

### CRR-003: Implementation review of IR-002 (Full Re-Audit)

- Canonical review report updated: `/home/autobyteus/workspace/.codex/worktrees/team-run-follows-definition/tickets/in-progress/team-run-follows-definition/code-review-report.md`
- Review entry point and round: Implementation Review, round 3
- Review scope: `Full Re-Audit`. IR-002 changes the spine (a persisted leaving marker under the lock; a release step owned by the committer), shared interfaces and shapes (`ownsAgentRun`, `FormerMemberExecutionNode`, `RunTreeRowDto.leaving`, `isLiveTeamRun`, `TeamRunBackend`), and files beyond the prior findings.
- Triggering role, report path, and finding or scenario IDs: implementation engineer, `implementation-handoff.md` (IR-002); commits `d005fa2a5b`, `64a4b6100c`; CR-001, CR-002, O-1, O-2, C-07
- Relevant solution revision IDs: SR-009, SR-010
- Relevant architecture-review revision IDs: ARCH-REV-003, ARCH-REV-004
- Relevant implementation revision IDs: IR-002
- Relevant API/E2E revision IDs: API-REV-001
- Relevant delivery revision IDs: N/A
- Prior authoritative result: Fail (CRR-002)
- Current authoritative result: Pass
- What changed in the review result and why: both findings are resolved as designed in SR-010. N-12, N-13 and N-14 are implemented. The new warning-format deviation has a reason that holds (C-14). Candidates C-09..C-14 were rejected.
- Supported product scenario / material-premise basis changes: SCN-003a, SCN-003b and SCN-010 were added from SR-010. N-8 is no longer relevant (superseded).

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-001 | Open (Local Fix) | Resolved | IR-002, SR-009 | `global-agent-run-message-router.ts:90` asks `ownsAgentRun`. `RootTeamRun.ownsAgentRun` includes `formerMemberByRunId`. Required on the boundary and checked at registration. `hasAgentExecution` unchanged (`active-root-place-of.test.ts`). Integration test through the router; IMP-17 TF-02/TF-03 return the exact refusal through the tool. |
| CR-002 | Open (Design Impact) | Resolved (rendered confirmation pending in API/E2E) | SR-009, SR-010, ARCH-REV-004, IR-002 | Stored `leaving` marker → `ownTreeOf` → `teamMemberRowsOf` (both paths) → `RunTreeRowDto.leaving` → tag on `WorkspaceStableExecutionRow` and `WorkspaceDelegatedRunRow` (`WorkspaceMemberLeavingTag.spec.ts`). `TeamMembersPanel.vue` and its keys removed. |

- New or remaining finding IDs: None
- Material score or classification changes: Runtime Correctness 8.6 → 9.3; API/E2E Readiness 9.0 → 9.3; dead-code row Pass. Large/High preserved.
- Recommended recipient: API/E2E engineer
- Remaining risks or uncertainty: the TFU-03 rendered rerun and the TFL-02 real-runtime rerun are pending.

### CRR-004: Failure-origin review of API-REV-002 (F-3)

- Canonical review report updated: `/home/autobyteus/workspace/.codex/worktrees/team-run-follows-definition/tickets/in-progress/team-run-follows-definition/code-review-report.md`
- Review entry point and round: API/E2E Failure-Origin Review, round 4
- Review scope: `N/A` (failure-origin round)
- Triggering role, report path, and finding or scenario IDs: API/E2E engineer, `api-e2e-execution-coverage-report.md` (API-REV-002); F-3 (TF-03, TFU-03, TFU-04; AC-003, DEC-002)
- Relevant solution revision IDs: SR-010
- Relevant architecture-review revision IDs: ARCH-REV-004
- Relevant implementation revision IDs: IR-001 (location service change), IR-002
- Relevant API/E2E revision IDs: API-REV-002
- Relevant delivery revision IDs: N/A
- Prior authoritative result: Pass (CRR-003)
- Current authoritative result: Fail
- What changed in the review result and why: `TeamRunExecutionTreeLocationService.toLocation` gives former and leaving members `configuredPlacement: null` (it reads current members by address only). So `TeamMemberRunViewProjectionService.requireLocation` refuses them, and a "Leaving" row cannot open the member to answer its approval. The same current-only read affects `metadataFor`'s `platformAgentRunId`. Classified `Local Fix`. It is also a source-review gap: CRR-003 carried the handoff's known risk without tying it to SR-010's "still opens".
- Supported product scenario / material-premise basis changes: None (SCN-003a).

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-001 | Resolved (CRR-003) | Resolved, confirmed at runtime | API-REV-002 | TF-02, TF-03, TFL-02: exact refusal with `COLLABORATION_TARGET_NOT_FOUND` |
| CR-002 | Resolved (CRR-003) | Resolved, tag confirmed rendered | API-REV-002 | TFU-03, TFU-05, TFU-06, TF-11, TF-12 |

- New or remaining finding IDs: CR-003 (Local Fix, implementation)
- Material score or classification changes: Runtime Correctness 9.3 → 8.8; API/E2E Readiness 9.3 → 9.1. Large/High preserved.
- Recommended recipient: implementation engineer
- Remaining risks or uncertainty: whether the web focus and Approve control follow once the projection loads is for the TFU-04 rerun to prove.

### CRR-005: Implementation review of IR-003 (Targeted Delta Review)

- Canonical review report updated: `/home/autobyteus/workspace/.codex/worktrees/team-run-follows-definition/tickets/in-progress/team-run-follows-definition/code-review-report.md`
- Review entry point and round: Implementation Review, round 5
- Review scope: `Targeted Delta Review`. The changes in `3d8e53cf0c..072bdb7217` stay within CR-003's two services and one test file.
- Triggering role, report path, and finding or scenario IDs: implementation engineer, `implementation-handoff.md` (IR-003, commit `072bdb7217`; first handoff named `74a7ce4c7c` in error, corrected); CR-003
- Relevant solution revision IDs: SR-010
- Relevant architecture-review revision IDs: ARCH-REV-004
- Relevant implementation revision IDs: IR-003
- Relevant API/E2E revision IDs: API-REV-002
- Relevant delivery revision IDs: N/A
- Prior authoritative result: Fail (CRR-004)
- Current authoritative result: Fail
- What changed in the review result and why:
  - CR-003 is resolved. Traced from the row's open target to `toLocation`; confirmed by the IMP-20 TF-03 values and the IMP-21 rendered approval with real Codex.
  - Every reader of the changed `configuredPlacement` was checked: none grants an action from it, and former members now get their own attribution (REQ-002).
  - New CR-004 (`Local Fix`): the fix left an unreachable null branch and `!` in `TeamMemberRunViewProjectionService`, a nullable team location type that no value uses, and a second derivation of the member's node (`ownNodeOf`). These fail the mandatory dead-code check (Principle 7) and one-derivation (Principle 11).
- Supported product scenario / material-premise basis changes: None.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-003 | Open (Local Fix) | Resolved | IR-003 | `toLocation` uses the located agent's own node (`:186-188`); `metadataFor` binding from the member's own node; unit tests (own node for a leaving and a stopped former member, swap at the same address; projection and file changes open); IMP-20 `TF-03.json` `openedProjection`/`openedFileChanges` "ok"; IMP-21 `TFU-04-observed.approvalShown: true`, `ran: true` |

- New or remaining finding IDs: CR-004 (Local Fix, implementation)
- Material score or classification changes:
  - Runtime Correctness 8.8 → 9.4; API/E2E Readiness 9.1 → 9.4;
  - Shared-Structure Tightness 9.4 → 9.0; Cleanup Completeness 9.5 → 8.8.
  - Large/High preserved.
- Recommended recipient: implementation engineer
- Remaining risks or uncertainty: none new.

### CRR-006: Implementation review of IR-004 (Targeted Delta Review)

- Canonical review report updated: `/home/autobyteus/workspace/.codex/worktrees/team-run-follows-definition/tickets/in-progress/team-run-follows-definition/code-review-report.md`
- Review entry point and round: Implementation Review, round 6
- Review scope: `Targeted Delta Review`. `9b0705a8ef..6c7af4a384` touches only CR-004's two files and one test.
- Triggering role, report path, and finding or scenario IDs: implementation engineer, `implementation-handoff.md` (IR-004, commit `6c7af4a384`); CR-004
- Relevant solution revision IDs: SR-010
- Relevant architecture-review revision IDs: ARCH-REV-004
- Relevant implementation revision IDs: IR-004
- Relevant API/E2E revision IDs: API-REV-002
- Relevant delivery revision IDs: N/A
- Prior authoritative result: Fail (CRR-005)
- Current authoritative result: Pass
- What changed in the review result and why: CR-004 is resolved. The team location type is non-null; the unreachable throw, the assertion, `ownNodeOf` and its second index, and the unused import are removed; the stale test is removed. Candidate C-18 (no-op optional chains and a nullable agent-memory type, both outside the touched files) was rejected.
- Supported product scenario / material-premise basis changes: None.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| CR-004 | Open (Local Fix) | Resolved | IR-004 | diff `9b0705a8ef..6c7af4a384`; IMP-22 typecheck at baseline, 96 files / 661 tests passed including the CR-003 cases |

- New or remaining finding IDs: None
- Material score or classification changes: Shared-Structure Tightness 9.0 → 9.4; Cleanup Completeness 8.8 → 9.4. Large/High preserved.
- Recommended recipient: API/E2E engineer
- Remaining risks or uncertainty: API/E2E's own TF-03/TFU-03/TFU-04 rerun on the final commit is pending.
