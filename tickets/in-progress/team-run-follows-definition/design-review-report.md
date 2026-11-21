# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/home/autobyteus/workspace/.codex/worktrees/team-run-follows-definition/tickets/in-progress/team-run-follows-definition/requirements-doc.md` (Approved SR-005; verification intent SR-006; unchanged in SR-008)
- Upstream Investigation Notes: `/home/autobyteus/workspace/.codex/worktrees/team-run-follows-definition/tickets/in-progress/team-run-follows-definition/investigation-notes.md` (IF-01..IF-20, AF-01..AF-18; unchanged in SR-008)
- Upstream Solution Revision Record: `/home/autobyteus/workspace/.codex/worktrees/team-run-follows-definition/tickets/in-progress/team-run-follows-definition/solution-revision-record.md` (SR-001..SR-008)
- Reviewed Design Spec: `/home/autobyteus/workspace/.codex/worktrees/team-run-follows-definition/tickets/in-progress/team-run-follows-definition/design-spec.md` (SR-008, commit `a54485a260`)
- Supplemental Task Artifacts Reviewed: `follow-ups.md` (FU-001..FU-003); design § Exact Texts (behavior-defining, inside the design spec)
- Relevant Solution Revision IDs: SR-005, SR-006, SR-007, SR-008
- Architecture Review Revision Record: `/home/autobyteus/workspace/.codex/worktrees/team-run-follows-definition/tickets/in-progress/team-run-follows-definition/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-002`
- Current Review Round: `2`
- Trigger: SR-008 resubmission after ARCH-REV-001 Fail (AR-001..AR-006)
- Prior Review Round Reviewed: 1 (`ARCH-REV-001`, Fail)
- Latest Authoritative Round: 2
- Review guidance: the skill's design principles, report template, ticket scope and design examples were updated on 2026-11-12 and re-read before this round. Applied as written: The Approach (findings name a concrete problem; rulings hold), Principle 13's empty indirection check, Principle 16, and Case 10.
- Current-State Evidence Basis: base `a07767f4d0`. Round-1 evidence still holds; see revision record ARCH-REV-001. Opened again or newly for this round:
  - `services/agent-streaming/team-view-session.ts:55-199`;
  - web `services/agentStreaming/TeamStreamingService.ts:305-332`, `services/teamExecution/teamExecutionViewState.ts:127-146,232-300`;
  - `agent-team-execution/domain/root-team-run.ts:134,248-265,321-339,454-480`;
  - `services/team-communication/team-communication-port.ts:18-62`;
  - `agent-collaboration/execution/communication/root-communication-port.ts:50`;
  - `agent-team-execution/services/team-run-service.ts:55-77`;
  - `agent-collaboration/execution/delegation/delegated-run-starter.ts:40-125`;
  - `agent-collaboration/execution/task/task-delegation.ts:253`;
  - `remote-collaboration/inbound/remote-team-run-starter.ts:1-45`;
  - `agent-collaboration/collaborators/collaborator-entry-builder.ts:95-137`;
  - `agent-collaboration/definition/collaboration-handoff-compiler.ts:28-47,111-135`;
  - `agent-team-definition/services/flat-team-definition-validator.ts:16,28`;
  - read-only data: all 95 `team_run_execution_tree.json` under `/home/autobyteus/data/memory/agent_teams` and every `autobyteus-agents/agent-teams/*/team-config.json`.

## Routing Classification Review

- Task size: `Large`; Architectural risk: `High`
- Classification rationale reviewed: live membership mutation in a running root, a persisted tree field, a shared communication-port contract (`maySend`), the Team view stream and its web consumer, and a recipient refusal.
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: None.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`
- Approved requirements / intended behavior understood: unchanged since round 1 (REQ-001..REQ-009, AC-001..AC-010, DEC-001..DEC-009).
- Relevant existing behavior and evidence confirmed:
  - round-1 evidence;
  - the Team view re-snapshots in-band on a mode switch (`team-view-session.ts:115-160`), and the web accepts a later snapshot (`TeamStreamingService.ts:312-329`);
  - the web keeps, creates and drops contexts by run ID and repairs focus when the focused member is gone (`teamExecutionViewState.ts:127-146,240-300`);
  - Team copies are created only through `DelegatedRunStarter.startTeam`, from a local delegation (`task-delegation.ts:253`) or a peer's (`remote-team-run-starter.ts:34`, a catalog address by construction).
- Scope guardrail confirmed: unchanged. Org-mounted Teams and configured-placement copies are not followed (`copiedFrom`).
- Every prospective blocking `Design Impact` finding is traceable: `Yes` (none remain).
- Remaining material ambiguity: None.
- Statements about existing code the design relies on: the new SR-008 citations were opened and match:
  - the engine check at `root-communication-engine.ts:127`;
  - the port at `root-communication-port.ts:50`;
  - `executeAgentCommand` at `root-team-run.ts:321-339`, including `isLiveAgent` (`:334`) and `requireContainingTeamRun` (`:337,339`);
  - `getDirectAgent` and status snapshots in `flat-team-execution-manager.ts`;
  - the registry keyed by address;
  - `CreateTeamRunInput` at `team-run-service.ts:63-77`;
  - the selection mutator rewriting `defaultLaunchSource`.
  
  The log-owner line is `:134`, not `:126`; the rule is unaffected. One statement inherited from round 1 is stale but harmless, so the round-1 ruling holds (N-7): "Team copy addresses are prefixed; compile at the mount path = parent of the stored coordinator address" (IF-06, AF-11, D-SCOPE). Copy trees are in the team's own space: `delegated-run-starter.ts:42-56,91-108`, and all 95 stored trees have a root-level coordinator address. The formula therefore always gives `/`, which is the correct place to resolve.

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001/002 (add) | System | Pass | Pass | Pass (DS-001/003; AR-003, AR-006 resolved) | Confirmed | — |
| BEH-003 (remove/retire) | System | Pass | Pass | Pass (§ Member States And Call-Site Rules; DS-004) | Confirmed | — |
| BEH-004 (rules) | System | Pass | Pass | Pass (DS-005) | Confirmed | — |
| Notice (REQ-006) | System | Pass | Pass | Pass (DS-006; net-merge N-2) | Confirmed | — |
| Window (REQ-008) | User | Pass | Pass | Pass (DS-007 a/b) | Confirmed | — |
| Refusal (REQ-009) | System | Pass | Pass | Pass (both address steps and run ID) | Confirmed | — |
| Scope (REQ-004, DEC-003) | System | Pass | Pass | Pass (`copiedFrom`) | Confirmed | — |
| Invalid definition (REQ-007) | System | Pass | Pass | Pass (D-INVALID; N-4 per-root containment) | Confirmed | — |
| Stored follow (REQ-004/005) | System | Pass | Pass | Pass (DS-002 + follow after register) | Confirmed | — |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Clear | Linked | Internally Complete | Consistent | Status And Approval Applicability Clear | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| § Exact Texts (design) | Pass | Pass | Pass (net-merge and empty-notice rule added) | Pass (DEC-004, REQ-009) | Pass | — |
| `follow-ups.md` | Pass | Pass | Pass | Pass | Pass | — |

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment present | Pass | Feature | — |
| Root cause explicit and evidence-backed | Pass | Missing invariant + three membership copies | — |
| Refactor decision explicit | Pass | One execution view; live rules; handles keyed by run ID | — |
| Refactor reflected in design sections | Pass | `TeamRunMembership` sole owner of contexts (AR-006) | — |

## Spine Inventory Verdict

| Spine ID | Scope | Readable | Narrative Clear | Facade Vs Owner | Subject Naming | One Owner Per Node, Call Order | Off-Spine Off Main Line | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 live follow | Primary | Pass | Pass | Pass | Pass | Pass (listener iterates with per-root containment; committer drives per-root order) | Pass | Pass |
| DS-002 stored follow | Primary | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-003 plan | Bounded local | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-004 retire | Bounded local | Pass | Pass | N/A | Pass | Pass (manager retires handles → registry remove → membership release → view event) | Pass | Pass |
| DS-005 rules read | Return | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-006 notice | Event | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-007 window | Event | Pass | Pass | N/A | Pass | Pass (root publishes; `TeamViewSession` re-opens; run-tree rows by `DelegationIndex`) | Pass | Pass |

## Boundary Encapsulation Verdict

| Boundary / Owner | Public Entry Clear | Internals Stay Internal | Bypass Controlled | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `RootTeamRun` + committer | Pass | Pass | Pass | Pass | — |
| `TeamRunMembership` | Pass | Pass | Pass | Pass | Changed only by `replace` and `release` |
| `TeamExecutionIndex` | Pass | Pass | Pass | Pass | Named lookups per state (`getAgent`, `getAgentForOwnCommand`, `formerMemberAt`, `formerMemberByRunId`) |
| `RootCommunicationPort` | Pass | Pass | Pass | Pass | `maySend` required on every root's port |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Clear | Forbidden Explicit | Coherent | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Listener → manager, planner | Pass | Pass | Pass | Pass | Backward need (manager ↔ listener) answered by a separate listener owner (Principle 9) |
| Root → committer → persistence, membership, backend chain, notices, index | Pass | Pass | Pass | Pass | — |
| `TeamViewSession` ← root view event | Pass | Pass | Pass | Pass | A notification in the existing view stream |

Owners receive their collaborators from the composition root; there is no process-wide lookup and no silent fallback; the listener is a notification wired in the composition root (Principle 16): `Pass`. See N-10.

## Interface Boundary Verdict

| Interface | Subject Clear | Singular | Identity Explicit | Generic Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `TeamMembershipPlanner.viewFor` / `followStored`; `planTeamMembershipChange` | Pass | Pass | Pass | Low | Pass |
| `RootTeamRun.followDefinition(view)` | Pass | Pass | Pass | Low | Pass |
| `TeamRunMembership.replace(committedTree, leaving)` / `release(agentRunId)` / `handoffsFrom` / `isLeaving` | Pass | Pass | Pass (run-ID keyed) | Low | Pass |
| `FlatTeamExecutionManager.applyMembership(change)` | Pass | Pass (handles only) | Pass | Low | Pass |
| Index `getAgentForOwnCommand`, `formerMemberAt`, `formerMemberByRunId` | Pass | Pass | Pass | Low | Pass |
| `RootCommunicationPort.maySend(identity)` | Pass | Pass | Pass | Low | Pass |
| `TeamChangeNoticeSource.queue`; `DelegationIndex.runPartsChanged` | Pass | Pass | Pass | Low | Pass |
| `CreateTeamRunInput.copiedFrom` | Pass | Pass | Pass | Low | Pass |
| Root view event `team_membership_changed` | Pass | Pass | Pass | Low | Pass |

Each interface, port, adapter or wrapper passes Principle 13's empty indirection check: `Pass`. No new port is added. `maySend` extends an existing port with a distinct question. `TeamRun.followMembership` and `FlatTeamRunBackend.followMembership` are steps on the existing root → backend → manager chain that every root command uses (`executeAgentCommand`), not new types.

## Existing Capability / Subsystem Reuse Verdict

| Need | Checked | Decision Sound | New Piece Justified | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Locked tree write | Pass | Pass | N/A | Pass | — |
| Notices | Pass | Pass | Pass | Pass | — |
| Open Team view | Pass | Pass (in-band snapshot, the existing mode-switch mechanism) | N/A | Pass | No new frame type |
| Run-tree rows | Pass | Pass | N/A | Pass | — |
| Launch, rules compilation, lazy start | Pass | Pass | N/A | Pass | — |

## Subsystem / Capability-Area Allocation Verdict

| Area | Allocation Clear | Decision Sound | Supports Spine Owners | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `agent-team-execution/membership/`, `domain/team-run-membership.ts` | Pass | Pass | Pass | Pass | — |
| `agent-collaboration` (engine split, refusal, copy creation, delegation index) | Pass | Pass | Pass | Pass | — |
| `services/agent-streaming`, stream contracts, `autobyteus-web` team view | Pass | Pass | Pass | Pass | — |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Evaluated | Shared File Sound | Ownership Clear | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Three membership copies → one view | Pass | Pass | Pass | Pass | — |
| The Team's member picture (open view vs run-tree rows) | Pass | N/A | Pass | Pass | Two builders existed before this change; during leaving they differ briefly (N-8) |
| Rules compilation per run kind | Pass | Pass | Pass | Pass | See N-7 |

## Shared Structure / Data Model Tightness Verdict

| Structure | One Meaning | Redundant Removed | Overlap Controlled | Core Vs Variant | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `rootTeam.formerMembers` | Pass | Pass | Pass | N/A | Pass | — |
| Tree `copiedFrom` | Pass | Pass | Pass | N/A | Pass | Recorded once; `defaultLaunchSource` keeps its single meaning |
| Member DTO `leaving?: true` | Pass | Pass | Pass | N/A | Pass | — |

Derived consumers of a changed structure listed with a decision for each: `Pass` (tree readers; view snapshot projector; web view state; schema; every tree writer keeps both optional fields, since the mutators spread `tree` and `rootTeam`).

One vocabulary: `Pass` ("former member", "leaving", `copiedFrom`).

## File Responsibility Mapping Verdict

| File | Singular | Matches Owner | Re-Tightened | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `membership/*`, `domain/team-run-membership.ts` | Pass | Pass | Pass | Pass | — |
| Registry, delivery, engine/port, copy creation, view session/projector, contracts, web files | Pass | Pass | N/A | Pass | Listed in the mapping |
| `root-team-run.ts`, `agent-team-run-manager.ts` (495), `delegation-index.ts` (548) | Pass | Pass | N/A | Pass | The size requirement stands (N-5) |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Placement Clear | Folder Matches Boundary | Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `agent-team-execution/membership/` | Pass | Pass | Low | Pass | — |

## Removal / Decommission Completeness Verdict

| Item / Area | Named | Replacement Clear | Scope Explicit | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Fixed `teamNode`/`handoffs`, `memberContexts` | Pass | Pass | Pass | Pass | — |
| Frozen `outgoingHandoffs` | Pass | Pass | Pass | Pass | — |
| Address-keyed registry, `remove(address)` | Pass | Pass | Pass | Pass | Run-ID keys |
| Engine single sender/receiver check | Pass | Pass | Pass | Pass | `maySend` + `isCurrentAgent` |

## Legacy / Backward-Compatibility Verdict

| Area | Legacy Retention | Clean-Cut Explicit | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Membership copies, registry keys, engine check | No | Pass | Pass | — |
| Tree fields | No | Pass | Pass | Optional fields, no version |

## Persisted-Data Transition Verdict

| Stored Subject | Decision | Evidence Sufficient | Proportionate | Migration Safety | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `rootTeam.formerMembers` | Directly Usable — No Migration | Pass | Pass | N/A | Pass | — |
| `copiedFrom` | Directly Usable — No Migration (absent = standalone, or old copy treated as `team_definition`) | Pass (AF-13: no copy from an Org run among the existing copies) | Pass | N/A | Pass | — |

## Change / Refactor Safety Verdict

| Area | Sequence Realistic | Temporary Seams Explicit | Cleanup Explicit | Verdict |
| --- | --- | --- | --- | --- |
| Steps 1–8 plus the SR-008 additions | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic | Needed | Present And Clear | Bad Shape Explained | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Member states per call site | Yes | Pass (rule table) | Pass | Pass | — |
| Same-address replacement and rejoin while leaving | Yes | Pass | N/A | Pass | — |
| One view, stale plan, copy rules | Yes | Pass | Pass | Pass | Copy-rules rationale is stale (N-7) |

## Material Premise Validation

The round-1 premises are addressed:

- `MP-01` (removed member waiting for approval): the design now covers it. Own commands are allowed for leaving members, and the member stays visible with a "Leaving" tag.
- `MP-02` (configured-placement copy edited in Settings): addressed by `copiedFrom`.
- `MP-03` (same-address replacement while the old member is live): addressed by run-ID keyed handles.

New for this round:

### `MP-04` — An external `to` dropped by the N-3 filter on a followed run

- Related contract: compiler `delegated_team` keeps an external `to` (`collaboration-handoff-compiler.ts:28-35,130-135`)
- Behavior: BEH-004
- Initiating basis kind: `Contract`
- Applicable contract: every Team definition is validated with `own_team` compilation, which refuses a `to` outside the team (`flat-team-definition-validator.ts:16,28`; `collaboration-handoff-compiler.ts:111-125`). An external `to` therefore enters a run only through the delegating run's rules for a configured placement, and those copies are not followed (`copiedFrom: configured_placement`).
- Forward path: the followed runs (standalone and catalog copies) compile from the definition, so none of their rules has an external `to`. A read-only scan found no definition rule outside its team in `autobyteus-agents/agent-teams/*`.
- Reachability: `Not Reachable` for followed runs.
- Review consequence: none. The N-3 filter is safe as written.

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

`Pass`

## Findings

None. AR-001..AR-006 are resolved (revision record ARCH-REV-002).

## Classification

N/A (Pass).

## Recommended Recipient

Implementation, per the handoff rules.

## Residual Risks

Notes for implementation, none blocking:

- **N-5 (size):** `root-team-run.ts` gains `maySend`, own-command lookups and the view event; `agent-team-run-manager.ts` gains the follow after register. Each must end at ≤500 lines, and `delegation-index.ts` at ≤548. Name the moved blocks in the implementation handoff.
- **N-6 (peer copies):** `remote-team-run-starter.ts:34` starts a peer's delegation from a catalog address ("the catalog address the source is mounted at"). Record `copiedFrom: team_definition` there explicitly, so that every copy created after this change carries the field.
- **N-7 (copy rules, stale rationale):** copy trees are in the team's own space (`delegated-run-starter.ts:42-56,91-108`; all 95 stored trees). "Mount path = parent of coordinator address" is always `/`, and "own_team loses the prefix" is not the reason to use `delegated_team`. Implement it as: resolve the definition at the copy's own root and compile with `{ kind: "delegated_team" }` (the kind chosen by `delegatedFrom`, as the compiler states). Do not reconstruct a delegating-run mount path. IF-06's "prefixed" observation no longer matches the stored data.
- **N-8 (two member pictures while leaving):** run-tree `team_member` rows (from the run's file via `ownTreeOf`) drop a leaving member at the swap, while the open Team view lists it as "Leaving" until it stops. This is brief and expected; the AC-009 rendered probe should note it.
- **N-9 (same address twice, DEC-006 while leaving):** the web keys by run ID, but helpers such as `findConfiguredAgentByAddress` (`teamExecutionTreeSelectors.ts`) return the first match. Prefer run IDs wherever both entries can appear.
- **N-10 (Principle 16, Case 9):** the notice source, the narrowed `DelegationIndex` and the membership collaborators reach `RootTeamRun` through `materializeTeamRoot`'s dependencies. Make them required parameters, not optional for tests.
- **`TeamViewSession.follow()`** returns early while it stays live on the same root (`team-view-session.ts:120`). The `team_membership_changed` handling needs its own re-enter that bypasses that check, run in the session's `run` order.
- **Codex/AutoByteus real-runtime E2E** per the Verification Intent remains the proof for AC-001..AC-010.

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate: `Pass` (MP-04 rejected as Not Reachable; MP-01..MP-03 addressed)
- Notes: SR-008 keeps the round-1 core and resolves AR-001..AR-006 with concrete, code-cited rules. Classification is Large / High.
