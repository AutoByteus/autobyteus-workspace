# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/home/autobyteus/workspace/.codex/worktrees/team-run-follows-definition/tickets/in-progress/team-run-follows-definition/requirements-doc.md` (Approved SR-005; verification intent SR-006)
- Upstream Investigation Notes: `/home/autobyteus/workspace/.codex/worktrees/team-run-follows-definition/tickets/in-progress/team-run-follows-definition/investigation-notes.md` (IF-01..IF-20, AF-01..AF-18)
- Upstream Solution Revision Record: `/home/autobyteus/workspace/.codex/worktrees/team-run-follows-definition/tickets/in-progress/team-run-follows-definition/solution-revision-record.md` (SR-001..SR-007)
- Reviewed Design Spec: `/home/autobyteus/workspace/.codex/worktrees/team-run-follows-definition/tickets/in-progress/team-run-follows-definition/design-spec.md` (SR-007, commit `ae125b7f85`)
- Supplemental Task Artifacts Reviewed: `follow-ups.md` (FU-001..FU-003); design § Exact Texts (behavior-defining, inside the design spec)
- Relevant Solution Revision IDs: SR-005, SR-006, SR-007
- Architecture Review Revision Record: `/home/autobyteus/workspace/.codex/worktrees/team-run-follows-definition/tickets/in-progress/team-run-follows-definition/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-001`
- Current Review Round: `1`
- Trigger: Architecture Design Complete, SR-007
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: 1
- Current-State Evidence Basis: worktree `/home/autobyteus/workspace/.codex/worktrees/team-run-follows-definition`, base `a07767f4d0`. Files opened (server `autobyteus-server-ts/src/`): `agent-team-execution/domain/root-team-run.ts` (whole), `domain/root-team-run-materialization-gate.ts`, `services/team-run-persistence-coordinator.ts`, `domain/team-run-context.ts`, `local/flat-team-execution-context.ts`, `local/flat-team-execution-manager.ts:60-130,280-316`, `local/registries/configured-agent-execution-registry.ts`, `local/registries/flat-team-member-config-resolver.ts`, `services/agent-team-run-manager.ts:60-260`, `services/team-run-message-delivery.ts:140-239`, `services/team-run-execution-tree-mutator.ts:16-70`, `services/team-run-selection-mutator.ts:84-140`, `domain/team-run-execution-tree.ts`, `agent-collaboration/execution/communication/root-communication-engine.ts:120-162,330-433`, `agent-collaboration/collaborators/message-recipient-resolution.ts:50-80`, `agent-collaboration/collaborators/collaborator-source-projector.ts:15-55`, `agent-collaboration/domain/launch-configuration-source.ts:67`, `agent-collaboration/delegation/run-tree-view.ts:25-80`, `agent-collaboration/execution/domain/member-execution-context.ts:30-60`, `agent-communication/services/get-handoff-rules-service.ts`, `agent-execution/domain/agent-run-platform-notices.ts`, `services/agent-streaming/team-execution-view-projector.ts:85-110`, `services/agent-streaming/team-view-session.ts` (frame types). Web (`autobyteus-web/`): `services/teamExecution/teamExecutionTreeSelectors.ts:1-60`, `teamExecutionViewModels.ts:10-40`, `teamExecutionViewState.ts` (frame handling), `services/agentStreaming/TeamStreamingService.ts:380-420`, `components/workspace/team/TeamMembersPanel.vue` (row source). Also `DESIGN.md` rules 3, 7.

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Classification rationale reviewed: live membership changes in a running root (concurrency with delivery and activation), a persisted tree field read by history, a shared member-context contract, and recipient refusal.
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: None. The findings below add a web/stream surface (AR-004), which strengthens the classification.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed` for the approved basis. The design's target paths for DEC-002 (busy removed member), REQ-008 (window) and REQ-009 (refusal entry forms) are `Needs Correction`.
- Approved requirements / intended behavior understood: a running or reopened standalone Team run or catalog copy follows its Team definition (members, coordinator, handoff rules). Added members are Offline until their first message. Removed members are retired: a busy one finishes its turn first. Every remaining member gets one notice. The window shows current members, and the user can message them. A message to a former member gets a clear refusal. Org-mounted Teams are out of scope.
- Relevant existing behavior and evidence confirmed: the root's tree and index are swapped by `replaceTree` (`root-team-run.ts:483-487`). `commitExecutionTreeMutation` plans against the current tree under the root lock and runs `commitAfterDurability` inside the lock (`team-run-persistence-coordinator.ts:48-69`). Membership copies exist in `TeamRunContext.teamNode/handoffs` (`team-run-context.ts:27-28`) and `FlatTeamExecutionContext.memberContexts` (`flat-team-execution-context.ts:51`). Handles are lazy, keyed by address (`configured-agent-execution-registry.ts:18,40-45`). `remove` has no caller. `get_handoff_rules` reads a frozen array (`get-handoff-rules-service.ts:15`, `member-execution-context.ts:37,50`). Restore loads and materializes without reading the definition (`agent-team-run-manager.ts:173-205`). The materialization gate is an admission counter, not a mutex (`root-team-run-materialization-gate.ts`).
- Scope guardrail confirmed: In-scope UC-001..UC-005; Out of Scope (Org-mounted Teams, launch defaults, Team-in-Team, undo); Preserved Behavior (lazy start, restore, delegated runs, history layout); Review Authority applied.
- Every prospective blocking `Design Impact` finding is traceable: `Yes`.
- Remaining material ambiguity: None in the requirements.
- Statements about existing code the design relies on: AF-01..AF-18 citations checked; all match. Two design statements do not hold as the design uses them:
  - "Window: `DelegationIndex.runPartsChanged` → `ChildRowsFeed` → `RUN_TREE_CHANGED`; open views re-read" (DS-007, D-WINDOW). This refreshes the run-tree rows only. The open Team view's member rows and agent contexts come from the one-time `TEAM_EXECUTION_VIEW_SNAPSHOT` (AR-004).
  - "Root … identity authorization accepts leaving members" (Ownership Map) is presented as the whole leaving-member treatment. The root, the execution manager and the communication engine resolve a member by run ID in several other places (AR-001).

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001/002 (add) | System | Pass | Pass | Fail (AR-003, AR-006) | Needs Correction | AR-003, AR-006 |
| BEH-003 (remove/retire) | System | Pass | Pass | Fail (AR-001, AR-003) | Needs Correction | AR-001, AR-003 |
| BEH-004 (rules) | System | Pass | Pass | Pass (DS-005) | Confirmed | — |
| Notice (REQ-006) | System | Pass | Pass (AF-15, `agent-run-platform-notices.ts`) | Pass (DS-006) | Confirmed | — |
| Window (REQ-008) | User | Pass | Pass | Fail (AR-004) | Needs Correction | AR-004 |
| Refusal (REQ-009) | System | Pass | Pass | Fail (AR-005) | Needs Correction | AR-005 |
| Scope (REQ-004, DEC-003) | System | Pass | Pass | Fail (AR-002) | Needs Correction | AR-002 |
| Invalid definition (REQ-007) | System | Pass | Pass | Pass (D-INVALID) | Confirmed | — |
| Stored follow (REQ-004/005) | System | Pass | Pass | Pass (DS-002) | Confirmed | — |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Clear | Linked | Internally Complete | Consistent | Status And Approval Applicability Clear | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| § Exact Texts (design) | Pass | Pass | Fail (merge rule for several pending changes, e.g. joined then left before delivery, is not stated) | Pass (realizes DEC-004, REQ-009) | Pass | State the merge result when revising (non-blocking, N-2) |
| `follow-ups.md` | Pass | Pass | Pass | Pass | Pass | — |

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment present | Pass | Feature; triggers listed | — |
| Root cause explicit and evidence-backed | Pass | Missing invariant + three membership copies (verified) | — |
| Refactor decision explicit | Pass | One execution view; live rules | — |
| Refactor reflected in design sections | Fail | `TeamRunMembership.replace` and `applyMembership` both claim to create member contexts (AR-006) | AR-006 |

## Spine Inventory Verdict

| Spine ID | Scope | Readable | Narrative Clear | Facade Vs Owner | Subject Naming | One Owner Per Node, Call Order | Off-Spine Off Main Line | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 live follow | Primary | Pass | Pass | Pass | Pass | Pass (listener iterates; committer drives per-root order) | Pass | Pass |
| DS-002 stored follow | Primary | Pass | Pass | N/A | Pass | Pass (inside `withRootTransition`) | Pass | Pass |
| DS-003 plan | Bounded local | Pass | Pass | N/A | Pass | Pass | Pass | Fail (scope marker, AR-002) |
| DS-004 retire | Bounded local | Pass | Fail (leaving member's run-ID paths and same-address replacement undefined) | N/A | Pass | Fail | Pass | Fail (AR-001, AR-003) |
| DS-005 rules read | Return | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-006 notice | Event | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-007 window | Event | Pass | Fail (reaches run-tree rows, not the open Team view) | N/A | Pass | Fail | Pass | Fail (AR-004) |

## Boundary Encapsulation Verdict

| Boundary / Owner | Public Entry Clear | Internals Stay Internal | Bypass Controlled | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `RootTeamRun` + committer | Pass | Pass | Pass | Pass | Committer pattern reuses `TeamAgentPlatformBindingCommitter` shape |
| `TeamRunMembership` | Pass | Fail | Pass | Fail | Who creates member runtime contexts is contradictory (AR-006) |
| `TeamRunPersistenceCoordinator` | Pass | Pass | Pass | Pass | — |
| Recipient index port | Pass | Pass | Pass | Pass | `formerMemberAt` placement in resolution steps to be stated (AR-005) |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Clear | Forbidden Explicit | Coherent | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Listener → manager, planner | Pass | Pass | Pass | Pass | Composition-root wiring, no cycle |
| Root → committer → persistence, membership, backend chain, notices, index | Pass | Pass | Pass | Pass | — |
| Contexts → `TeamRunMembership` (read) | Pass | Pass | Pass | Pass | — |

## Interface Boundary Verdict

| Interface | Subject Clear | Singular | Identity Explicit | Generic Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `TeamMembershipPlanner.viewFor(tree)` / `followStored(tree)` | Pass | Pass | Pass | Low | Pass |
| `planTeamMembershipChange(tree, view)` | Pass | Pass | Pass | Low | Pass |
| `RootTeamRun.followDefinition(view)` | Pass | Pass | Pass | Low | Pass |
| `TeamRunMembership.replace/handoffsFrom/memberAt/isLeaving` | Pass | Pass | Fail (`memberAt(address)` cannot tell a leaving old member from its same-address replacement, AR-003) | Medium | Fail |
| `FlatTeamExecutionManager.applyMembership(change)` | Pass | Fail (overlaps `replace`, AR-006) | Pass | Low | Fail |
| `TeamChangeNoticeSource.queue(agentRunId, notice)` | Pass | Pass | Pass | Low | Pass |
| `DelegationIndex.runPartsChanged(run)` | Pass | Pass | Pass | Low | Pass |
| Index `formerMemberAt(address)` | Pass | Pass | Pass | Low | Pass (see AR-005 for the run-ID form) |

## Existing Capability / Subsystem Reuse Verdict

| Need | Checked | Decision Sound | New Piece Justified | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Locked tree write | Pass | Pass | N/A | Pass | — |
| Notices | Pass | Pass | Pass | Pass | — |
| Window rows | Pass | Fail | N/A | Fail | The Team view stream is the existing owner of the open view's members; not reused (AR-004) |
| Launch | Pass | Pass | N/A | Pass | — |
| Rules compilation | Pass | Pass | N/A | Pass | — |
| Lazy start | Pass | Pass | N/A | Pass | — |

## Subsystem / Capability-Area Allocation Verdict

| Area | Allocation Clear | Decision Sound | Supports Spine Owners | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `agent-team-execution/membership/` | Pass | Pass | Pass | Pass | — |
| `agent-collaboration` | Pass | Pass | Pass | Pass | — |
| `services/agent-streaming` + `autobyteus-web` team view | Fail | Fail | Fail | Fail | Missing from scope (AR-004) |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Evaluated | Shared File Sound | Ownership Clear | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Three membership copies → one view | Pass | Pass | Fail (AR-006) | Fail | — |
| Rules compilation per run kind | Pass | Pass | Pass | Pass | Mount path derived from the stored coordinator address. Acceptable: it reads stored facts |

## Shared Structure / Data Model Tightness Verdict

| Structure | One Meaning | Redundant Removed | Overlap Controlled | Core Vs Variant | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `rootTeam.formerMembers` | Pass | Pass | Pass | N/A | Pass | — |
| `rootTeam.defaultLaunchSource` used as run-kind marker | Fail | N/A | Fail | N/A | Fail | Launch provenance given a second meaning; Settings overwrites it (AR-002) |

Derived consumers of a changed structure listed with a decision for each: `Pass` for the tree readers (AF-16). `Fail` for the Team view stream snapshot and the web team context (AR-004).

One vocabulary across code, data, wire, tools, UI and docs: `Pass` ("former member"; agent text "left the team").

## File Responsibility Mapping Verdict

| File | Singular | Matches Owner | Re-Tightened | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `membership/*` (5 new files) | Pass | Pass | N/A | Pass | — |
| `domain/team-run-membership.ts` | Pass | Fail | N/A | Fail | AR-006 |
| `root-team-run.ts`, `agent-team-run-manager.ts` (495), `delegation-index.ts` (548) | Pass | Pass | N/A | Pass | Moving a block out is named and required |
| Streaming/web files | — | — | — | Fail | Not listed (AR-004) |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Placement Clear | Folder Matches Boundary | Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `agent-team-execution/membership/` | Pass | Pass | Low | Pass | — |
| `domain/team-run-membership.ts` | Pass | Pass | Low | Pass | — |

## Removal / Decommission Completeness Verdict

| Item / Area | Named | Replacement Clear | Scope Explicit | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Fixed `teamNode`/`handoffs` | Pass | Pass | Pass | Pass | — |
| Fixed `memberContexts` | Pass | Fail (AR-006) | Pass | Fail | — |
| Frozen `outgoingHandoffs` | Pass | Pass | Pass | Pass | Org/standalone builders keep constant lists |
| `ConfiguredAgentExecutionRegistry.remove` | Pass | N/A | Pass | Pass | Becomes used |

## Legacy / Backward-Compatibility Verdict

| Area | Legacy Retention | Clean-Cut Explicit | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Membership copies | No | Pass | Pass | — |
| Tree shape | No | Pass | Pass | Optional field, no version |

## Persisted-Data Transition Verdict

| Stored Subject | Decision | Evidence Sufficient | Proportionate | Migration Safety | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `team_run_execution_tree.json` `rootTeam.formerMembers` | Directly Usable — No Migration | Pass (tolerant schema; mutators spread `rootTeam` (`team-run-execution-tree-mutator.ts:50-56`, `team-run-selection-mutator.ts:90-102`), so the field survives) | Pass | N/A | Pass | — |

## Change / Refactor Safety Verdict

| Area | Sequence Realistic | Temporary Seams Explicit | Cleanup Explicit | Verdict |
| --- | --- | --- | --- | --- |
| Steps 1–8 | Pass | Pass | Pass | Pass (needs the AR-004 web/stream step added) |

## Example Adequacy Verdict

| Topic | Needed | Present And Clear | Bad Shape Explained | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| One view, stale plan, copy rules | Yes | Pass | Pass | Pass | — |
| Removal while busy | Yes | Fail | Pass | Fail | No example of the leaving member's approval, interrupt or send by run ID (AR-001) |
| Same-address replacement (DEC-006) | Yes | Fail | N/A | Fail | AR-003 |

## Material Premise Validation

### `MP-01` — A removed member is mid-turn waiting for a tool approval

- Related approved requirement: DEC-002 (a), AC-003, REQ-002
- Behavior: BEH-003
- Initiating basis kind: `User`
- Trigger: a package author edits the Team (package reload or app save) while the user runs the team with auto-execute off. A member is mid-turn and has asked the user to approve a tool call.
- Support evidence: SCN-003 is an approved Supported Explicit Edge scenario. Tool approval is a normal UI action: `executeAgentCommand(agentRunId, { kind: "approve_tool" })`, `root-team-run.ts:362-381` → `flat-team-execution-manager.ts:114-122`.
- Forward path: committer swap → `replaceTree` rebuilds the index without the member → `TeamRunMembership.replace` drops it from member contexts → the user approves → `index.getAgent(agentRunId)` returns null → `RUN_NOT_FOUND` (`root-team-run.ts:366-369`). Even past the root, `getDirectAgent` searches member contexts → `RUN_NOT_FOUND` (`flat-team-execution-manager.ts:296-303`).
- Consequence: the turn never completes. The handle never becomes quiescent, so DS-004 never stops it and the member is never retired. The same blocks `interrupt`, which is the user's only other way to end the turn.
- Reachability: `Reachable`
- Review consequence: AR-001.

### `MP-02` — A copy of a configured placement whose Team launch was edited in Settings

- Related approved requirement or contract: DEC-003 (Org-mounted Teams are out of scope); D-SCOPE
- Behavior: scope of REQ-004
- Initiating basis kind: `User`
- Trigger: an Org run's member delegates to a Team placement configured in the Org. The copy is created with `defaultLaunchSource: { origin: "configured" }` (`collaborator-source-projector.ts:8,52`). The user then edits that copy's Team launch in Settings, which is a supported Settings save.
- Forward path: `applyTeamRunSelectionPatches` replaces `defaultLaunchSource` with `SETTINGS_LAUNCH_SOURCE` (origin `settings`) when the Team default changes (`team-run-selection-mutator.ts:92-101`; `launch-configuration-source.ts:67`). At the next announcement, D-SCOPE no longer sees `configured` and treats the copy as a catalog copy.
- Consequence: the copy's members and rules are replaced by the catalog Team definition's, compiled at the mount path. This changes a run the approved scope leaves alone (DEC-003; the design's "copies of a configured placement … follow their placement").
- Reachability: `Reachable` (all steps are supported actions; AF-13 shows no such copies in the user's data today, but the product creates them).
- Review consequence: AR-002.

### `MP-03` — DEC-006 replacement while the old member is still running or stopping

- Related approved requirement: DEC-006, DEC-002
- Behavior: BEH-002, BEH-003
- Initiating basis kind: `User`
- Trigger: a package author changes the agent of an existing member name. This is DEC-006's own case. Either the old member is busy, or it is idle and its async stop has not finished when the next message to that address arrives.
- Forward path: handles are keyed by address (`configured-agent-execution-registry.ts:18,40-45`). A message to the address resolves to the new member's run ID. `getDirectAgent` → `getOrCreate(newContext)` returns the existing handle of the old agent at that address.
- Consequence: the new member's message goes to the old agent's handle (another agent's conversation continues, which DEC-006 forbids), or the new member cannot start until the old handle is removed.
- Reachability: `Reachable`
- Review consequence: AR-003.

## Unresolved Approved-Behavior Or Current-State Gaps

None in the requirements. The gaps are in the design (Findings).

## Review Decision

`Fail`

## Findings

### AR-001 — The busy removed member ("leaving") cannot finish its turn: its run-ID paths are undefined

- Type: `Design Impact`; severity High
- Protects: DEC-002 (a), AC-003, REQ-002
- Scope status: `Within Approved Scope`. Changes approved behavior: No
- Evidence: after the swap the leaving member is in `formerMembers`, so it is absent from the index (`replaceTree`, `root-team-run.ts:483-487`) and from member contexts. Every run-ID lookup then refuses it:
  - `executeAgentCommand` (approve_tool, interrupt): `root-team-run.ts:366-369`;
  - `isCurrentAgent` / `isLiveAgent` / `requireContainingTeamRun`: `:441-462`;
  - `messageLogOwnerOf` (log owner of its last sends): `:126`;
  - the engine's `deliver` checks both sender and receiver with the same `isCurrentAgent`: `root-communication-engine.ts:127`;
  - `getDirectAgent` and `getLeafAgentStatusSnapshots` iterate member contexts: `flat-team-execution-manager.ts:74-82,296-303`.
  
  The design names only "identity authorization accepts leaving members". That is a single check, and the same check also admits the member as a *receiver*, which DEC-002 forbids. Premise MP-01.
- Required update: give the leaving state one explicit rule and apply it at each listed call site. For example: resolvable by run ID as a sender, for its own commands (approve, interrupt), for log ownership and for status; never resolvable as a receiver or by address. Separate "may send" from "may receive" where both use `isCurrentAgent`. Also decide, within REQ-008 and DEC-002, whether the leaving member stays visible in the Team view until it stops. DEC-002 retires it after its turn, and its pending approval must be answerable.
- Proportionate: the fix uses the existing leaving set in `TeamRunMembership`; no new mechanism.
- Recipient: Solution Designer

### AR-002 — The scope rule keys on a field Settings overwrites

- Type: `Design Impact`; severity Medium
- Protects: DEC-003 / Out of Scope (Org-mounted Teams), REQ-004 scope, D-SCOPE
- Scope status: `Within Approved Scope`. Changes approved behavior: No
- Evidence: D-SCOPE excludes copies whose `defaultLaunchSource.origin` is `configured`. A Settings edit of the Team launch replaces that source with `settings` (`team-run-selection-mutator.ts:92-101`). The field records where a launch came from; using it as a run-kind marker gives it a second meaning (Principle 15) and decides the behavior by a "counts as" rule (Principle 13). Premise MP-02.
- Required update: base "catalog copy vs copy of a configured placement" on a fact that is recorded once and never edited. Either name an existing stored fact (e.g. the copy's Task source in the delegating run) or record one at copy creation. If old copies lack it, state the decision for them, as AF-13 already does for copies with no source.
- Proportionate: a scope discriminator only; no change to the follow mechanism.
- Recipient: Solution Designer

### AR-003 — DEC-006 and DEC-007 collide with address-keyed handles while the old member is still live

- Type: `Design Impact`; severity Medium
- Protects: DEC-006, DEC-007, DEC-002
- Scope status: `Within Approved Scope`. Changes approved behavior: No
- Evidence: `ConfiguredAgentExecutionRegistry.handles` is keyed by address, and `getOrCreate` returns any existing handle at that address (`configured-agent-execution-registry.ts:18,40-45`). `TeamRunMembership.memberAt(address)` cannot separate a leaving old member from the new member at the same address. A rejoin (DEC-007) while the old member is still leaving is not described. Premise MP-03.
- Required update: state the rule for a member removed and re-added (DEC-006 or DEC-007) before its handle is removed. For example: key handles by agent run ID, or keep the new member unstartable until the old handle is gone, or treat a rejoin of a still-leaving member as cancelling the leave. Add the case to DS-003/DS-004 and the test list.
- Proportionate: one rule in the planner, registry or retire step.
- Recipient: Solution Designer

### AR-004 — The open Team view does not learn about joined or left members

- Type: `Design Impact`; severity High
- Protects: REQ-008, AC-009, UC-005
- Scope status: `Within Approved Scope`. Changes approved behavior: No
- Evidence:
  - The Team view's own member rows and agent contexts come from `TEAM_EXECUTION_VIEW_SNAPSHOT`'s `execution_tree.root_team.members`, sent once per connection (`team-execution-view-projector.ts:99`; web `teamExecutionTreeSelectors.ts:31-60`, `TeamMembersPanel.vue:121`).
  - `RUN_TREE_CHANGED` only updates the run-tree store (`TeamStreamingService.ts:401-407`). The run-tree rows are the runs the Team delegated, plus `team_member` rows used elsewhere (`teamExecutionViewModels.ts:11`, `run-tree-view.ts`).
  - Stream events for an agent run ID the view does not know are dropped (`TeamStreamingService.ts` `dispatch_agent`: `if (!agentContext) continue`).
  
  So with DS-007 as designed, a joined member does not appear in the open Team view, cannot be selected or messaged there, and its events are dropped. A removed member stays listed.
- Required update: add the open Team view to the design. For example: a Team stream frame carrying the changed member list or tree (numbered like other frames), or a re-snapshot of the view on a committed change. Add the web handling that adds or removes member rows and contexts. List the stream-contract, server streaming and web files in the file mapping, and keep `DelegationIndex.runPartsChanged` for the run-tree rows. Include AR-001's visibility decision.
- Proportionate: reuses the existing Team view stream; no new channel.
- Recipient: Solution Designer

### AR-005 — The refusal (REQ-009) covers only one entry form and one resolution step

- Type: `Design Impact`; severity Medium
- Protects: REQ-009, AC-010, REQ-002
- Scope status: `Within Approved Scope`. Changes approved behavior: No
- Evidence:
  - `send_message_to` by run ID (`deliverToRunId`, `team-run-message-delivery.ts:163-168`) answers `TARGET_AGENT_RUN_NOT_FOUND: Exact AgentRun target … is not in root …`. That is not the clear refusal. Replying by the sender's run ID is a normal agent action.
  - By address, `resolveMessageRecipient` throws in the sender's own team instance before reaching any run-wide step (`message-recipient-resolution.ts:68-73`). The design does not say where `formerMemberAt` is checked.
- Required update: give the former-member refusal for both forms, by address in both resolution steps and by run ID, with the § Exact Texts wording. State where each check sits.
- Proportionate: two lookups against the same `formerMembers`.
- Recipient: Solution Designer

### AR-006 — Two owners create member runtime contexts

- Type: `Design Impact`; severity Low
- Protects: REQ-001 (added member is Offline and starts on its first message); the design's own D-ONE-VIEW
- Scope status: `Within Approved Scope`. Changes approved behavior: No
- Evidence: `TeamRunMembership` "holds current members (node + runtime context)" and may only change by `replace(committedTree)`. `FlatTeamExecutionManager.applyMembership` also "adds member contexts". Retained members' `FlatAgentExecutionContext` objects carry mutable runtime kind and provider binding that handles reference (`flat-team-execution-context.ts:10-48`). The design does not say whether `replace` keeps those objects.
- Required update: one owner. For example: `replace(tree)` keeps retained members' context objects by agent run ID and creates new members' contexts, and `applyMembership` only retires handles. Or the reverse, stated explicitly.
- Proportionate: a clarification of ownership.
- Recipient: Solution Designer

## Classification

`Design Impact` (AR-001..AR-006). No requirement gap: DEC-002, DEC-006, DEC-007, REQ-008 and REQ-009 already decide the behavior.

## Recommended Recipient

Solution Designer.

## Residual Risks

Non-blocking notes:
- **N-1 (restore window):** a definition change announced while a root is restoring (after `followStored`, before `register`) is missed until the next announcement, because the listener walks only registered active roots (`listActiveTeamRunIds`). Consider one follow right after register.
- **N-2 (notice merge):** state what a merged notice says when a member joins and leaves (or the reverse) before delivery (§ Exact Texts).
- **N-3 (unlaunchable new member):** when its launch can't be resolved, the member is not added but its rules would still be applied, so `get_handoff_rules` names an unknown address. State whether rules to a member that was not added are kept.
- **N-4 (DESIGN.md rule 7):** contain a failure of one root inside the listener's loop so that other roots still follow; log a warning naming the run.
- **N-5 (size):** `root-team-run.ts` and `agent-team-run-manager.ts` (495) and `delegation-index.ts` (548) are named in the design; keep them so.
- FU-001..FU-003 are as recorded.

## Latest Authoritative Result

- Review Decision: `Fail`
- Material-Premise Gate: `Pass` (MP-01..MP-03 reachable, witnessed forward from supported actions)
- Notes: the overall approach is sound and should be kept: pure planner, committer planning under the root lock with the swap after the durable write, live rule reads, `formerMembers` without migration, and restore follow inside `withRootTransition`. The findings concern the leaving state, same-address replacement, the scope discriminator, the open Team view and the refusal's entry forms. Classification is Large / High.
