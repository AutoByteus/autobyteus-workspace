# Implementation Revision Record

The current code and `implementation-handoff.md` are authoritative. This record keeps the initial baseline and each later implementation round.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture Reviewer, `design-review-report.md` round 2 (ARCH-REV-002 pass) | N/A | `Initial Baseline` | SR-008, ARCH-REV-002 | Implemented; handed to Code Review |
| IR-002 | Architecture Reviewer, `design-review-report.md` round 4 (ARCH-REV-004 pass on SR-010), after CRR-002 (API-REV-001 Fail) | CR-001 (Local Fix), CR-002 (Design Impact, resolved by SR-009/SR-010), O-1, C-07 | `Local Fix` + `Design Impact` realization | SR-009, SR-010, ARCH-REV-003, ARCH-REV-004, CRR-002, API-REV-001 | Implemented; handed to Code Review |
| IR-003 | Code Reviewer, `code-review-report.md` CRR-004 (failure-origin review of API-REV-002) | CR-003 (F-3) | `Local Fix` | SR-010, CRR-004, API-REV-002 | Implemented; handed to Code Review |

## Revision Entries

### IR-001 — Team runs follow their Team definition (initial implementation)

- Triggering role, report path, and round: Architecture Reviewer; `tickets/in-progress/team-run-follows-definition/design-review-report.md`; round 2 (ARCH-REV-002, pass, with notes N-5 … N-10).
- Triggering finding IDs: N/A.
- Classification: `Initial Baseline`.
- Prior authoritative result: N/A.
- Current authoritative result: commits `19b31ad365` (server core) and `6b46ec5bdd` (tests, a leaving-member fix, web, docs) on `codex/team-run-follows-definition`; the handoff commit follows them.
- Related solution revision IDs: SR-008.
- Related architecture-review revision IDs: ARCH-REV-002.
- Related code-review revision IDs: N/A.
- Related API/E2E revision IDs: N/A.
- Related delivery revision IDs: N/A.
- Why this baseline is recorded: first implementation of the reviewed design.
- Approved behavior or requirement IDs affected: REQ-001 … REQ-009; AC-001 … AC-010; DS-001 … DS-007; D-SCOPE, D-TRIGGER, D-FORMER, D-ONE-VIEW; DEC-002 … DEC-007.
- Implementation delta:
  - The new `membership/` folder holds the pure planner, the planner service, the committer, the definition-change listener and the notice source.
  - `TeamRunMembership` is the one in-memory view of a run's membership.
  - Former members and `copiedFrom` are optional tree fields.
  - The communication engine distinguishes senders from receivers.
  - Leaving members retire once they are quiet.
  - Former members get the exact refusal.
  - A membership event re-opens the view snapshot in-band.
  - The web view keeps, adds and drops members, and tags a leaving member "Leaving".
  - Docs and glossary are updated.
  - The blocks moved to meet the size limits are listed in the handoff (N-5).
- Changed files or areas: see `implementation-handoff.md` § Key Files Or Areas.
- Local validation and result: see `implementation-handoff.md` § Checks Run (IMP-01 … IMP-09).
- Next recipient or routing: Code Review (`/software_engineering_team/code_reviewer`), for Large / High.
- Remaining limitations or risks: see `implementation-handoff.md` § Known Risks. The real-runtime E2E (Verification Intent) is left to API/E2E.

### IR-002 — Leaving as a stored marker; committer-owned release; leaving rows; run-ID routing

- Triggering role, report path, and round: Architecture Reviewer, `design-review-report.md` round 4 (ARCH-REV-004 Pass on SR-010). It follows the code reviewer's failure-origin review CRR-002 (`code-review-report.md` round 2) of API/E2E API-REV-001 (Fail: F-1, F-2).
- Triggering finding IDs: CR-001 (F-1, Local Fix), CR-002 (F-2, Design Impact → SR-009, SR-010), O-1, the review notes N-12, N-13 and N-14, and C-07 (cosmetic).
- Classification: `Local Fix` (CR-001, C-07) and the implementation of a revised design (SR-009/SR-010).
- Prior authoritative result: IR-001 (`19b31ad365`, `6b46ec5bdd`).
- Current authoritative result: `d005fa2a5b`, plus the handoff commit.
- Related solution revision IDs: SR-009, SR-010.
- Related architecture-review revision IDs: ARCH-REV-003, ARCH-REV-004.
- Related code-review revision IDs: CRR-001, CRR-002.
- Related API/E2E revision IDs: API-REV-001.
- Related delivery revision IDs: N/A.
- Why this revision is recorded: the rendered member list did not show a leaving member (F-2), and a run-ID message to a removed member did not reach the refusal (F-1).
- Approved behavior or requirement IDs affected: AC-003, AC-007, AC-009, AC-010; DEC-002; DS-004, DS-007; D-INVALID.
- Implementation delta:
  - **Leaving marker.** `formerMembers[i].leaving: true` is written by the locked plan from the live execution IDs (`FlatTeamExecutionManager.liveExecutionIds`, a synchronous read, N-14). Every plan clears stale markers (`clearStoppedLeavingMarkers`), and the restore follow always clears them (`followStored` → `leavingReleaseChange`).
  - **Release step.** `TeamRunMembership` reads leaving from the markers; `release` is removed. `FlatTeamExecutionManager.applyMembership(leavingIds, stopped)` only stops handles and reports the stop. `TeamMembershipCommitter.memberStopped` owns the release: write, replace, `removeStoppedHandle`, `runPartsChanged`, then the view event. The handle goes even when the member rejoined (N-12), and an ending run writes nothing.
  - **Member rows.** `teamMemberRowsOf(members, isLive)` in `run-tree-view.ts` serves both row paths. The run's own rows use `RunOwnAgentsReader.ownTreeOf`, which lists members and then leaving former members. A delegated copy's record (`localChildRecord`) now reads `ownTreeOf` instead of `DelegationIndex.agentsOf` (AR-009). `RunTreeSources.isLiveTeamRun` comes from the active root directory. `RunTreeRow`/`RunTreeRowDto.leaving` is added. The manager's unregister calls `runPartsChanged` after leaving the directory when the tree has markers (N-13).
  - **Routing (CR-001).** `GlobalAgentRunMessageRouter` asks `ownsAgentRun` (team root: current, leaving and former; Org and standalone roots: `hasAgentExecution`). `hasAgentExecution` is unchanged, so `placeOf` never places a former member.
  - **Planner (O-1).** A definition with a load issue is not followed (`listLoadIssues`). The coordinator-addability check moved into `viewFor`. Warnings are logged once per run and reason, and the warn-once entry is cleared when the definition is valid again.
  - **Web.** The "Leaving" tag is on `WorkspaceStableExecutionRow` and `WorkspaceDelegatedRunRow`, from the row model's `leaving` (`runTreeDisplayRows`, `WorkspaceTeamExecutionTree`). `TeamMembersPanel.vue` and all its locale keys (en and zh-CN, hand-written and generated) are removed. The dead `leaving` field on navigation rows is dropped.
  - **Cleanup.** C-07: `isOwnTeamAddress`'s doc comment is back on its method.
- Changed files or areas: see `implementation-handoff.md` § Key Files Or Areas (IR-002 list).
- Local validation and result: `implementation-handoff.md` § Checks Run, IMP-10 … IMP-17.
- Next recipient or routing: Code Review (`/code_reviewer`).
- Remaining limitations or risks: see the handoff's Known Risks.

### IR-003 — A leaving or former member opens by run ID (CR-003)

- Triggering role, report path, and round: Code Reviewer, `code-review-report.md`, CRR-004, the failure-origin review of API-REV-002 (F-3).
- Triggering finding IDs: CR-003.
- Classification: `Local Fix`.
- Prior authoritative result: IR-002 (`d005fa2a5b`, `64a4b6100c`).
- Current authoritative result: the IR-003 commit after `3d8e53cf0c`.
- Related solution revision IDs: SR-010 ("the row still opens").
- Related architecture-review revision IDs: N/A.
- Related code-review revision IDs: CRR-004.
- Related API/E2E revision IDs: API-REV-002.
- Related delivery revision IDs: N/A.
- Why this revision is recorded: a Leaving row could not open its member, so its pending approval could not be answered. The member projection, the active trace page and the file changes refused a former member with "no configured launch placement or recorded source".
- Approved behavior or requirement IDs affected: AC-003, DEC-002; REQ-002 (a stopped former member's conversation opens by run ID too).
- Implementation delta:
  - **Location.** `TeamRunExecutionTreeLocationService.toLocation` sets `configuredPlacement` to the located agent's own stored node: `members` for a member, `formerMembers` for a former one, leaving or stopped. The `leaving` marker is stripped. Before, it read the node held by the current member at that address, by address.
  - **Projection metadata.** `TeamMemberRunViewProjectionService.metadataFor` reads `platformAgentRunId` from the member's own node, current or former (`ownNodeOf`).
- Changed files or areas: `run-history/services/team-run-execution-tree-location-service.ts`, `run-history/services/team-member-run-view-projection-service.ts`, `tests/unit/run-history/services/team-run-former-member-location.test.ts`.
- Local validation and result: `implementation-handoff.md` § Checks Run, IMP-18 … IMP-21. That includes the rendered TFU-04 with a real Codex member: the Leaving row opens it with its Approve control, the approval runs the command, then its row goes.
- Next recipient or routing: Code Review (`/code_reviewer`).
- Remaining limitations or risks: none new. The web needed no change.

