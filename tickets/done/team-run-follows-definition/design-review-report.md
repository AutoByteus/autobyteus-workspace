# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/home/autobyteus/workspace/.codex/worktrees/team-run-follows-definition/tickets/in-progress/team-run-follows-definition/requirements-doc.md` (Approved SR-005/SR-006; unchanged)
- Upstream Investigation Notes: `/home/autobyteus/workspace/.codex/worktrees/team-run-follows-definition/tickets/in-progress/team-run-follows-definition/investigation-notes.md` (unchanged)
- Upstream Solution Revision Record: `/home/autobyteus/workspace/.codex/worktrees/team-run-follows-definition/tickets/in-progress/team-run-follows-definition/solution-revision-record.md` (SR-001..SR-010)
- Reviewed Design Spec: `/home/autobyteus/workspace/.codex/worktrees/team-run-follows-definition/tickets/in-progress/team-run-follows-definition/design-spec.md` (SR-010, commit `30ebc16223`)
- Supplemental Task Artifacts Reviewed: `follow-ups.md`; design § Exact Texts (unchanged); `code-review-report.md` CRR-002 (context)
- Relevant Solution Revision IDs: SR-009, SR-010
- Architecture Review Revision Record: `/home/autobyteus/workspace/.codex/worktrees/team-run-follows-definition/tickets/in-progress/team-run-follows-definition/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-004`
- Current Review Round: `4`
- Trigger: SR-010 resubmission after ARCH-REV-003 Fail (AR-007, AR-008, AR-009)
- Prior Review Round Reviewed: 3 (`ARCH-REV-003`, Fail)
- Latest Authoritative Round: 4
- Current-State Evidence Basis: implementation `6b46ec5bdd`, tests `443f1c2c0f`. Opened for this round:
  - `agent-team-execution/services/agent-team-run-manager.ts:160-230,376` (register, restore with `followedStored` and the follow after register, unregister);
  - `agent-collaboration/execution/services/active-collaboration-root-directory.ts:55-170` (registration, `liveRoots`, `unregister`);
  - `services/agent-streaming/stored-team-package-snapshot.ts:7-15`: a stopped run's snapshot already lists no leaving members;
  - round-3 reads of the retire loop, committer, `run-tree-view.ts:120-205`, `run-tree-records.ts:70-95` and `run-own-agents-reader.ts`.
  
  The evidence for checks unaffected by SR-010 stands from ARCH-REV-002/003.

## Routing Classification Review

- Task size `Large`; architectural risk `High`. Independent review required: `Yes`. No correction.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`
- Approved requirements: unchanged. The behaviors in play are DEC-002, REQ-008, AC-003, AC-005, AC-009, REQ-007/AC-007 and REQ-009/AC-010.
- Statements about existing code the design relies on: checked.
  - The manager has a single unregister path (`onTerminated` → `unregister`, and the stopping path at `:376`), where the design hangs the `runPartsChanged` call.
  - The active root directory knows which roots are registered (`liveRoots`, `onRegistrationChanged`), so `isLiveTeamRun` is a read of an existing owner.
  - A stopped run's view snapshot already shows no leaving members (`stored-team-package-snapshot.ts:11`). SR-010's "outside a live run the marker reads as former" therefore agrees with the stopped view.

| Behavior ID | Design Alignment | Trigger / Current-State Evidence | Target Path / Spine | Status | Required Action |
| --- | --- | --- | --- | --- | --- |
| BEH-001/002, BEH-004, Notice, Refusal (incl. CR-001 routing), Scope, Stored follow, Invalid definition | Pass | Pass | Pass (unchanged) | Confirmed | — |
| BEH-003 leaving visibility (DEC-002, REQ-008, AC-003, AC-005, AC-009) | Pass | Pass | Pass (one `teamMemberRowsOf` for both tree paths; leaving only while live) | Confirmed | — |
| DS-004 release (DEC-002) | Pass | Pass | Pass (committer-owned, ordered; failure handled) | Confirmed | — |

## Supplemental Artifact Coherence Verdict

Unchanged: Pass (§ Exact Texts; `follow-ups.md` FU-001..FU-004).

## Task Design Health Assessment Verdict

Pass on all four rows. SR-010 keeps one stored fact, the `leaving` marker, and one rule for reading it.

## Spine Inventory Verdict

| Spine ID | Scope | Readable | Narrative Clear | Facade Vs Owner | Naming | One Owner Per Node, Call Order | Off-Spine Off Main Line | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001..DS-003, DS-005, DS-006 | — | Pass | Pass | Pass | Pass | Pass | Pass | Pass (unchanged) |
| DS-004 retire/release | Bounded local | Pass | Pass | N/A | Pass | Pass. The manager stops the handle and notifies (`released` → `memberStopped`). The committer runs locked write → `replaceTree` + `TeamRunMembership.replace` → `removeStoppedHandle` → `runPartsChanged` → view event | Pass | Pass |
| DS-007 view | Event | Pass | Pass | N/A | Pass | Pass. One member source (`ownTreeOf`) and one row rule (`teamMemberRowsOf`) for own and delegated rows; unregister refresh when a root ends | Pass | Pass |

## Boundary Encapsulation Verdict

| Boundary / Owner | Entry Clear | Internals Internal | Bypass Controlled | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `RootTeamRun` + committer (tree writes) | Pass | Pass | Pass | Pass | All tree writes are the committer's or restore's, including the release write |
| `TeamRunMembership` | Pass | Pass | Pass | Pass | Changed only by `replace(committedTree)`; `release` removed |
| `FlatTeamExecutionManager` | Pass | Pass | Pass | Pass | Handles only; writes nothing; never calls `TeamRunMembership` |
| Others | Pass | Pass | Pass | Pass | Unchanged |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Clear | Forbidden Explicit | Coherent | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Execution manager → committer | Pass | Pass | Pass | Pass | A notification only (`released`); the committer drives the sequence (Principle 13) |
| `RunTreeView` → `isLiveTeamRun` (active root directory) | Pass | Pass | Pass | Pass | A narrow question passed in through `RunTreeSources` at composition |
| Manager unregister → `DelegationIndex.runPartsChanged` | Pass | Pass | Pass | Pass | The manager already holds the delegation index |
| Others | Pass | Pass | Pass | Pass | Unchanged |

Principle 16: `Pass`. `isLiveTeamRun` and the planner's `liveExecutionIds` are passed in, not looked up.

## Interface Boundary Verdict

| Interface | Subject | Singular | Identity | Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `TeamMembershipCommitter.memberStopped(agentRunId)`; `FlatTeamExecutionManager.removeStoppedHandle(agentRunId)` | Pass | Pass | Pass | Low | Pass |
| `RunTreeSources.isLiveTeamRun(teamRunId)`; `teamMemberRowsOf(ownTeam, isLive)` | Pass | Pass | Pass | Low | Pass |
| Planner input `liveExecutionIds` | Pass | Pass | Pass | Low | Pass |
| `TeamRunMembership.replace(committedTree)` (sole mutator) | Pass | Pass | Pass | Low | Pass |
| Others | Pass | Pass | Pass | Low | Pass (unchanged) |

Empty indirection check: `Pass`. Nothing that only forwards was added. The backend-chain forwarding of `removeStoppedHandle` and `liveExecutionIds` uses the existing root → backend → manager chain accepted in ARCH-REV-001/002 (rulings hold).

## Existing Capability / Subsystem Reuse Verdict

Pass. The design reuses the committer and persistence lock for the release, the active root directory for liveness, `ownTreeOf` as the one member source, and `runPartsChanged` and `ChildRowsFeed` for refresh.

## Subsystem / Capability-Area Allocation Verdict

Unchanged: Pass.

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Evaluated | Shared File Sound | Ownership Clear | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| A Team's `team_member` rows (own and delegated paths) | Pass | Pass | Pass | Pass | One builder, `teamMemberRowsOf`, over one source, `ownTreeOf` (Case 10). `DelegationIndex.agentsOf` keeps its single meaning for messages and history |

## Shared Structure / Data Model Tightness Verdict

| Structure | One Meaning | Redundant Removed | Overlap Controlled | Core Vs Variant | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `formerMembers[i].leaving` | Pass | Pass | Pass | N/A | Pass | "Removed with a live execution, not yet stopped". Written from live execution IDs under the lock and read as former outside a live run. Every plan clears markers whose execution is not live |
| Others | Pass | Pass | Pass | N/A | Pass | Unchanged |

Derived consumers of the changed structure listed with a decision for each: `Pass`. Covered: own rows, delegated rows, view snapshot (live: from the marker; stored: none, `stored-team-package-snapshot.ts:11`), index, membership, history readers.

One vocabulary: `Pass`.

## File Responsibility Mapping Verdict

Pass. The mapping now names `run-tree-records.ts`, the `RunTreeView` composition, and the manager's unregister. `agent-team-run-manager.ts` stays at 500 lines or fewer.

## Subsystem / Folder / File Placement Verdict

Unchanged: Pass.

## Removal / Decommission Completeness Verdict

| Item | Named | Replacement Clear | Scope Explicit | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `TeamRunMembership.release` | Pass | Pass (`replace(releasedTree)`) | Pass | Pass | SR-010 |
| `run-tree-records.ts` member source via `agentsOf` | Pass | Pass (`ownTreeOf` + `teamMemberRowsOf`) | Pass | Pass | SR-010 |
| `TeamMembersPanel.vue`, tests, exclusive locale keys | Pass | Pass | Pass | Pass | SR-009 |
| Others | Pass | Pass | Pass | Pass | Unchanged |

## Legacy / Backward-Compatibility Verdict

Unchanged: Pass.

## Persisted-Data Transition Verdict

| Stored Subject | Decision | Evidence | Proportionate | Migration Safety | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `formerMembers[i].leaving`, `formerMembers`, `copiedFrom` | Directly Usable — No Migration | Pass | Pass | N/A | Pass | A stale marker on a stopped run is harmless (read as former) and cleared at the next plan or restore |

## Change / Refactor Safety Verdict

Pass. SR-009/SR-010 changes land on the existing implementation, together with CR-001 in the same implementation round.

## Example Adequacy Verdict

| Topic | Needed | Present | Bad Shape | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Release sequence | Yes | Pass (ordered list in DS-004) | Pass (manager writes nothing) | Pass | — |
| Leaving outside a live run | Yes | Pass (visibility line, DS-007) | N/A | Pass | — |

## Material Premise Validation

- `MP-05` (Stop or quit while leaving): addressed. The marker reads as former outside a live run, and unregister refreshes the rows.
- `MP-06` (delegated copy watched from its delegator): addressed by one member source and one row rule.

### `MP-07` — A removed member re-added while its stop is finishing

- Related requirement: DEC-007 (rejoin), DEC-002
- Initiating basis kind: `User`
- Trigger: the definition removes a member and adds it back. A rejoin while the member is still leaving is supported and cancels the leave.
- Forward path: the claimed state needs the second plan to run between the retire loop's `prepared.commit()` and its `finish()` (`flat-team-execution-manager.ts:155-157`). Only then does the plan still see a live execution and make the member current while its handle finishes stopping.
- Reachability: `Not Reachable` as a supported scenario. It depends on artificial timing between two independent actions (Principle 6). Rejoin before the stop begins is covered by the existing `isLeaving` check and `prepared.cancel()`.
- Review consequence: no finding. A cheap guard is suggested in N-12.

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

`Pass`

## Findings

None. AR-007, AR-008 and AR-009 are resolved (revision record ARCH-REV-004).

## Classification

N/A (Pass).

## Recommended Recipient

Implementation, per the handoff rules (the SR-009/SR-010 changes, with CR-001 as a Local Fix in the same round).

## Residual Risks

Notes for implementation, none blocking:

- **N-12:** `memberStopped` should remove the stopped handle even if the member is no longer leaving, and clear the marker only if it is. A stopped handle then never stays registered for a current member (MP-07).
- **N-13:** in unregister, call `runPartsChanged` after the root has left the active root directory. Otherwise the re-read still sees the run as live and keeps the "Leaving" tag.
- **N-14:** `liveExecutionIds` is read synchronously inside `prepareAgainstCurrent`, under the lock, through the backend chain. Keep it a plain synchronous read of handle state, with no awaits inside the locked plan.
- Earlier notes N-5 (file sizes), N-6, N-7, N-9 and N-10 still apply. The O-1 warn-once reset is now in D-INVALID.
- After the round: source review, then API/E2E reruns of TF-02, TF-03, TFU-03 and TFL-02, plus a Stop-while-leaving case and a delegated-copy row case (in the design's Guidance).

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate: `Pass` (MP-05, MP-06 addressed; MP-07 Not Reachable)
- Notes: the design is consistent. The tree is written only by the committer and restore, the stored marker is the single fact with one reading rule, one builder serves both member-row paths, and routing stays separate from placement. Classification is Large / High.
