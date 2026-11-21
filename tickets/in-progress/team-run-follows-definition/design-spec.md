# Design Spec

## Solution And Approval Basis

- Current solution revision ID: `SR-009` (revises SR-008 after failure-origin review `CRR-002` CR-002 Design Impact: where a leaving member is shown; also settles CR-001's routing choice and API/E2E observations O-1/O-2. SR-008 revised SR-007 after `ARCH-REV-001`.)
- Approved requirements: `requirements-doc.md` at SR-005/SR-006 (REQ-001..REQ-009, AC-001..AC-010), approved by the User on 2026-11-21 ("Anyway I think now you have the fourth picture also the requirement is also clear right now I think you can work on it now is it").
- Behavior-defining supplements: the notice and refusal texts in § Exact Texts (this design; they realize DEC-004 and REQ-009).
- User approval of the design: `Not required` (the direction does not ask for it).
- Design status: `Ready`
- Canonical investigation notes: `investigation-notes.md` (IF-01..IF-20, AF-01..AF-18), same folder.
- Base: `origin/personal` `a07767f4d0`; branch `codex/team-run-follows-definition`.
- Authorities read (2026-11-21): `references/architecture-design.md`, `references/design-principles.md` (2026-11-12 version), `templates/design-spec-template.md` (2026-11-12 version), `DESIGN.md`, `autobyteus-server-ts/docs/design/data_migration_guideline.md` §2–3, `collaboration_model.md` §1–3, module docs `agent_team_execution.md`, `agent_communication.md`, `skill_update_notices.md`, `personal_settings.md`.
- Conflicts or discrepancies: `agent_team_execution.md` § Collaboration And Handoffs contradicts the address-resolution rule (FU-001); this change rewrites that paragraph anyway.

## Current-State Read

A Team run copies membership three times when it is prepared, and never re-reads the definition:
1. `RootTeamRun.tree` and its `TeamExecutionIndex` (resolution, delivery, collaborators read them through getters; `replaceTree` swaps both) (AF-01).
2. `TeamRunContext.teamNode` and `.handoffs`, fixed at construction; member settings (`FlatTeamMemberConfigResolver`) and member contexts (`MemberExecutionContextBuilder`, handle activation) read them (AF-03, AF-05, AF-06).
3. `FlatTeamExecutionContext.memberContexts`, per-member runtime state; the execution manager finds a handle and builds Offline statuses from it (AF-04).

Handoff rules are compiled at launch, stored in the tree, read back at restore, and frozen into each member context, so `get_handoff_rules` returns start-time rules (IF-03, IF-04, AF-07). Members start lazily on first message (IF-08, AF-05). The server hears every definition change (AF-10). The window's member rows come from `DelegationIndex`, which reads each run's file once and has no notice for "a run's own file changed" (AF-14). Platform notices are composed sources (AF-15).

## Task Size And Architectural Risk (Mandatory)

- Task size: `Large`.
- Size rationale: team execution (root, execution manager, contexts, registry, restore), collaboration (member context, recipient resolution), communication tool, delegation index (window rows), persisted run tree and its 14 readers, platform notices, composition, docs; about 25–30 source files.
- Architectural risk: `High`.
- Risk rationale: live membership becomes mutable in a running root (concurrency with message delivery and member activation); persisted tree shape gains a field read by history; a shared collaboration contract changes (`MemberCollaborationContext` handoffs read live); recipient resolution gains a refusal.
- Escalation trigger: any path that must rebuild or restart a live root to apply a change, a reader of `rootTeam.members` not covered by the inventory, or message delivery racing a removal in a way the gate below does not order → `Design Impact` to the Solution Designer.

## Architecture Investigation Evidence

| Source | Reference | Observation | Decision supported |
| --- | --- | --- | --- |
| Root tree and committer precedent | AF-01, AF-02 | Locked tree write, then `replaceTree` | D-COMMIT |
| Three membership copies | AF-03, AF-04, AF-05 | Few readers, all in team execution | D-ONE-VIEW |
| Lazy members, termination steps | AF-05, AF-06 | `getOrCreate`, `remove`, `tryPrepareTerminationIfQuiescent` | D-RETIRE |
| Frozen handoffs | AF-07 | Member context array | D-LIVE-RULES |
| Restore path | AF-08 | Load → config → materialize | D-STORED |
| Live roots, trigger | AF-09, AF-10 | `managedRoots`; `announce` | D-TRIGGER |
| Compilation per run kind | AF-11, AF-12, AF-13 | Own team vs catalog copy vs placement copy; no placement copies in real data | D-SCOPE |
| Window rows | AF-14 | One owner, needs a run-file notice | D-WINDOW |
| Notices | AF-15 | Composed sources | D-NOTICE |
| Readers of members | AF-16, AF-17 | Current vs history readers | D-FORMER |
| Launch | AF-18 | Catalog-copy layers, validated | D-LAUNCH |

## Intended Change

When a Team definition changes, each running or reopened Team run of it (standalone or catalog copy) compares the definition with its stored tree and, in one locked write, adds new members, moves removed members to `formerMembers`, and replaces coordinator and handoff rules. The live root swaps its tree and its one execution view of membership; removed busy members finish their turn and stop; every remaining member gets one notice; the window is told; `get_handoff_rules` reads current rules.

## Change Scope (Mandatory)

- In scope: UC-001..UC-005. Areas: `agent-team-execution` (new `membership/` folder, root, execution manager, contexts, registry, manager restore, tree schema/builder), `agent-collaboration` (member context live handoffs, recipient resolution refusal, delegation index run-file notice), `agent-communication` (get_handoff_rules), `agent-execution/prompt` (handoff section reads live rules), `run-history` (history readers include former members), the communication engine's sender/receiver split, Team copy creation (`copiedFrom`), the Team view stream (server session and projector, stream contract DTO, web streaming service, view state and members panel), composition, docs and glossary.
- Derived consumers (Principle 11): the 14 readers of `rootTeam.members` (AF-16) — current-member readers unchanged (former members are not in `members`); history readers (`team-root-memory-source.ts`, `team-run-history-service.ts`, `run-own-agents-reader.ts` `agentsOfMembers`, participant messages via `DelegationIndex.agentsOf`) include `formerMembers`; `team-run-execution-tree-schema.ts` accepts it; every tree write keeps it (`team-run-execution-tree-builder.ts`, mutators).
- Deliberately left alone: Org runs and Org-mounted Teams (FU-002); copies with `copiedFrom: configured_placement` (they follow their placement, with Orgs); application-bound Team runs (they follow their application package's lifecycle); Team-level launch defaults and Team instruction text; a running member's already-composed instructions (DEC-009).
- Follow-ups: FU-001 (doc), FU-002 (Orgs), FU-003 (peer link member list).

## Relevant Behavior And Production-Path Map

| Behavior | REQ / AC | Trigger | Target path / spine |
| --- | --- | --- | --- |
| BEH-001/002 add | REQ-001, REQ-003..005; AC-001, AC-004, AC-005 | Definition change (live) or restore (stored) | DS-001 / DS-002 |
| BEH-003 remove | REQ-002, REQ-009; AC-002, AC-003, AC-010 | Same | DS-001 + DS-004 |
| BEH-004 rules | REQ-003; AC-001, AC-008 | Same | DS-001; DS-005 |
| Notice | REQ-006; AC-006 | After a live or stored change | DS-006 |
| Window | REQ-008; AC-009 | After a live change | DS-007 |
| Invalid definition | REQ-007; AC-007 | Same | DS-003 |

## Relevant Supplemental Task Artifacts

| Artifact | Relationship |
| --- | --- |
| `follow-ups.md` | FU-001..FU-003 |

## Task Design Health Assessment (Mandatory)

- Change posture: `Feature`.
- Current design issue found: `Yes` — membership has three in-memory copies (AF-03, AF-04, AF-01), harmless while fixed, wrong once it changes.
- Structural triggers and responses:
  - Derived data (fires): three copies → the planner derives the next tree once; the root's tree/index and the one execution view `TeamRunMembership` are both replaced from it in one committer step; `TeamRunContext.teamNode/handoffs` and `memberContexts` become reads of `TeamRunMembership` (D-ONE-VIEW).
  - Persisted-data transition (fires): optional `formerMembers` → Directly Usable (below).
  - Several kinds (fires): standalone run, catalog copy, placement copy, application-bound run, peer-started run traced separately (AF-11..AF-13; D-SCOPE).
  - Capability-area reuse (fires): notices → platform notice source (AF-15); window → `DelegationIndex`/`ChildRowsFeed` (AF-14); launch → `CollaboratorLaunchResolver` (AF-18); locked write → `TeamRunPersistenceCoordinator` (AF-02).
  - Backward dependency (fires): restore needs the planner (manager → planner); live follow needs the manager's live roots (listener → manager, listener → planner). No cycle: the listener is a separate owner wired in the composition root (D-TRIGGER).
  - Hidden dependency: none added; every new owner receives collaborators by constructor from the composition root.
  - Empty indirection (checked): `TeamRun`/`FlatTeamRunBackend` forward one new call to the execution manager; they are the existing boundary chain every root command uses (AF-01 `executeAgentCommand`), not new layers.
  - Responsibility overload / size (fires): `root-team-run.ts` (495), `agent-team-run-manager.ts` (495), `delegation-index.ts` (548) gain a few lines each → each must end ≤500 (the last must not grow): logic goes in the new `membership/` files; implementation moves one existing cohesive block out of each to stay within the limit and names it in the handoff.
- Root cause classification: `Missing Invariant` (a run is not kept consistent with its definition) with `Shared Structure Looseness` (three membership copies).
- Refactor needed now: `Yes` (one execution view of membership; live handoff read).
- Deliberate deviations: None.

## Terminology

- **Former member** (new GLOSSARY entry): a member removed from its Team definition while the run existed; kept in the run's tree (`formerMembers`) with its run ID and history; not addressable; comes back as the same member if the definition adds it again. Code, stored field, docs and UI use this one word; agent-facing text says "left the team".
- **Follow the definition**: the change described here; no stored word.

## Persisted Data / State Transition Decision (Mandatory)

- Subject: `team_run_execution_tree.json` of Team runs: `rootTeam.formerMembers?: ConfiguredAgentExecutionNode[]` (optional, absent = none); `copiedFrom?: "team_definition" | "configured_placement"` at the file root (optional; written once at a delegated Team run's creation; absent = a standalone run, or a copy created before this change, treated as `team_definition`); `members`, `coordinatorAddress`, `handoffs` rewritten by the follow step. A `formerMembers` entry may carry `leaving: true` (SR-009): set by the committing write for a member removed while busy, cleared by the release write when it stops, and cleared by the restore follow (a stopped run has no turn in progress); readers that do not show leaving ignore it.
- Readers: tolerant schema (`team-run-execution-tree-schema.ts`) gains the optional list validated like `members` and the optional `copiedFrom` enum; current-member readers ignore `formerMembers`; history readers include it (AF-16); only the planner reads `copiedFrom`.
- Decision: `Directly Usable — No Migration` (data migration guideline §3: optional field whose absence truthfully means "no former members").
- Guideline §2 checklist: 1 Need: none. 2 Availability: a definition that can't be read leaves the run unchanged (REQ-007), contained to that run. 3 Source shapes: current trees (65 standalone, 30 copies, AF-13), all without the field. 4 Disposition: unchanged runs untouched; changed runs rewritten through the normal writer. 5 Commit: existing locked atomic tree write (AF-02). 6 Current-only: no old-shape code. 7 Cost: one definition resolve per live Team run per announcement; one write only when something changed. 8 References: former members' run IDs stay valid for history and message logs. 9 Evidence: tests in Guidance. 10 Lessons: no version field, no mapping.

## Data-Flow Spine Inventory

| ID | Scope | Start | End | Owner |
| --- | --- | --- | --- | --- |
| DS-001 | Primary: live follow | Definition change announced | Live root updated, members told, window told | `TeamDefinitionChangeListener` → `RootTeamRun` (`TeamMembershipCommitter`) |
| DS-002 | Primary: stored follow | `restoreTeamRun` | Restored root materialized on the followed tree | `AgentTeamRunManager` |
| DS-003 | Bounded local: plan | Stored tree + resolved definition | `TeamMembershipChange` or none | `TeamMembershipPlanner` |
| DS-004 | Bounded local: retire | Member removed while busy | Handle stopped and removed | `FlatTeamExecutionManager` |
| DS-005 | Return: rules read | `get_handoff_rules` / prompt | Current rules of the member | `TeamRunMembership` |
| DS-006 | Event: notice | Change committed | One notice per remaining member at idle/next input | `TeamChangeNoticeSource` |
| DS-007 | Event: window | Change committed | `RUN_TREE_CHANGED` to open views | `DelegationIndex` → `ChildRowsFeed` |

## Primary Execution Spine(s)

- DS-001: `Package reload / app save -> announce (agent-package-definition-feed) -> TeamDefinitionChangeListener -> AgentTeamRunManager.listActiveTeamRuns -> TeamMembershipPlanner.resolveDefinitionFor(tree) -> RootTeamRun.followDefinition(view) -> TeamMembershipCommitter: plan (under lock) -> persistence.commitExecutionTreeMutation -> replaceTree + TeamRunMembership.replace -> FlatTeamExecutionManager.applyMembership (add contexts, retire handles) -> TeamChangeNoticeSource.queue -> DelegationIndex.runPartsChanged -> ChildRowsFeed -> window`
- DS-002: `TeamRunService/caller -> AgentTeamRunManager.restoreTeamRun -> load package -> TeamMembershipPlanner.followStored(tree) -> executionTreeStore.write (when changed) -> buildTeamRunConfigFromExecutionTree -> materializeTeamRoot(restore) -> TeamChangeNoticeSource.queue (when changed)`

## Spine Narratives (Mandatory)

| Spine | Narrative |
| --- | --- |
| DS-001 | On every announcement the listener walks this process's live Team roots, each in its own try/catch: a failure of one root logs a warning naming the run and the reason and the loop continues (N-4, DESIGN.md rule 7). For each it asks the planner for the run's current definition view (definition read, launch for possible new members resolved outside any lock). The root's committer then plans against the root's *current* tree under the persistence lock; nothing changed → no write, no event. Otherwise one locked write saves the next tree, then the root swaps tree, index and `TeamRunMembership` together, the execution manager adds member contexts for new members (Offline, lazy) and retires removed ones, notices are queued, and the window is told. |
| DS-002 | A stopped run is followed before it comes alive: the planner computes the next tree from the stored one; when it changed it is written, then the run restores from it as today, inside `withRootTransition`. Notices are queued for its remaining members. Right after `register(root)` the manager runs one live follow for that root (N-1), so an announcement that arrived while it was restoring (after `followStored`, before `register`) is not missed; an empty plan makes it free. |
| DS-003 | Pure: compares definition members (by address and agent definition ID) with `members` and `formerMembers`: added (new address, or same address with another agent → old one becomes former, DEC-006), rejoined (a former member at the same address and agent, DEC-007), removed (→ former). Coordinator and rules are replaced by the definition's, compiled as the run was created (own team, or catalog copy at its mount path). |
| DS-004 | A removed member that is idle stops at once. A busy one is leaving (rules in § Member States And Call-Site Rules): it receives nothing new, may still send and answer its own commands, and is terminated when its handle is next quiescent (checked on each of its status changes to idle with `tryPrepareTerminationIfQuiescent`); then `registry.remove(agentRunId)`, a locked release write that clears its `leaving` marker (SR-009), `membership.replace(releasedTree)`, `DelegationIndex.runPartsChanged(run)` and a `team_membership_changed` view event. |
| DS-005 | The member context reads its outgoing rules from `TeamRunMembership` on each call, so `get_handoff_rules` and the next composed prompt use current rules. |
| DS-006 | The notice source holds one pending notice per remaining member (merged when several changes arrive before delivery) and hands it over at the member's next input or idle, as skill-update notices do. |
| DS-007 (revised for AR-004, CR-002) | One stored fact, two projections. The rendered member list is the run-tree rows (`WorkspaceStableExecutionRow`, `team_member` rows; CRR-002 F-2): `RunOwnAgentsReader.ownTreeOf` (team) returns `members` plus the `formerMembers` entries marked `leaving`, each `RunOwnMember` with `leaving?: true`; `run-tree-view.ts:155-203` builds their `team_member` rows with `leaving: true`; `RunTreeRowDto` gains `leaving?: true` (`autobyteus-collaboration-stream-contracts/src/run-tree-dtos.ts`); the web row shows a "Leaving" tag and still opens the member (its `openTarget`), so its pending approval is answerable. After every committed change and every release write the committer calls `DelegationIndex.runPartsChanged(run)` → `ChildRowsFeed` → `RUN_TREE_CHANGED`, so the row appears, gets its tag, or leaves. The open Team view's in-band `TEAM_EXECUTION_VIEW_SNAPSHOT` (re-opened on `team_membership_changed`) keeps its role for the view's agent contexts (event dispatch for a joined or leaving member; `TeamStreamingService.ts:312-329`, `teamExecutionViewState.ts:240-262`), its member DTO `leaving?: true` read from the same stored marker; it is not a rendered list. N-8 ("two pictures, brief") is superseded: both projections read the one stored marker. |

## Spine Actors / Main-Line Nodes

`TeamDefinitionChangeListener`, `AgentTeamRunManager`, `TeamMembershipPlanner`, `RootTeamRun` + `TeamMembershipCommitter`, `TeamRunMembership`, `FlatTeamExecutionManager`, `TeamChangeNoticeSource`, `DelegationIndex`.

## Ownership Map

| Owner | Owns |
| --- | --- |
| `TeamMembershipPlanner` (new) | Which runs follow (D-SCOPE), reading the definition view, compiling rules as the run was created, launch of new members, the pure diff into `TeamMembershipChange` and the next tree |
| `TeamMembershipCommitter` (new, built inside `RootTeamRun` like `TeamAgentPlatformBindingCommitter`) | Ordering of a live change: plan under lock → durable write → swap → apply to execution → notices → window; fail-stop on an indeterminate write (existing rule) |
| `TeamRunMembership` (new domain) | The one in-memory execution view: each agent run's state (current, leaving, former), the member runtime contexts (sole creator; retained members keep their context objects), coordinator, handoffs; changed only by `replace(committedTree, leaving)` and `release(agentRunId)` |
| `RootTeamRun` | Persisted tree and index (unchanged role); identity authorization accepts leaving members until stopped |
| `FlatTeamExecutionManager` | Retiring handles only (DS-004); creates no contexts |
| `TeamDefinitionChangeListener` (new) | Reacting to announcements by following every live Team root |
| `TeamChangeNoticeSource` (new) | Pending notices per member and their delivery |
| `DelegationIndex` | Window rows; gains `runPartsChanged(run)` |

## Thin Entry Facades

| Facade | Behind it | Why |
| --- | --- | --- |
| `TeamRun.followMembership`, `FlatTeamRunBackend.followMembership` | `FlatTeamExecutionManager.applyMembership` | Existing root → backend → manager boundary chain (as `executeAgentCommand`) |

## Removal / Decommission Plan (Mandatory)

| Item | Why | Replaced by |
| --- | --- | --- |
| Fixed `TeamRunContext.teamNode` / `.handoffs` fields | Second copy of membership | Getters reading `TeamRunMembership` |
| Fixed `FlatTeamExecutionContext.memberContexts` array | Third copy | `TeamRunMembership` member contexts |
| `MemberCollaborationContext.outgoingHandoffs` frozen array | Frozen rules | `outgoingHandoffs()` read (team: from `TeamRunMembership`; Org and standalone roots: their constant list) |
| `ConfiguredAgentExecutionRegistry.remove(address)` unused, handles keyed by address | Dead today (AF-05); address keys collide on reuse (AR-003) | Handles keyed by agent run ID; `remove(agentRunId)` used by DS-004 |
| `defaultLaunchSource` as a run-kind marker in the D-SCOPE draft | Settings rewrites it (AR-002) | `copiedFrom` |
| Engine `deliver` applying `isCurrentAgent` to sender and receiver | Leaving members may send, not receive (AR-001) | `maySend` (sender) + `isCurrentAgent` (receiver) |

## Off-Spine Concerns

| Concern | Serves | Responsibility |
| --- | --- | --- |
| Launch of new members | Planner | `CollaboratorLaunchResolver` layers (agent default → run's resolved launch), validated; unusable → member not added, warning logged, retried at the next announcement |
| Run IDs of new members | Planner | The existing member AgentRun ID allocator used at launch (`flat-team-topology-planner.ts`) |
| Locked write | Committer | `TeamRunPersistenceCoordinator.commitExecutionTreeMutation` |
| Notices | Committer, restore | `TeamChangeNoticeSource` in `AgentRunPlatformNotices` |
| Window | Committer | `DelegationIndex.runPartsChanged` + `ChildRowsFeed` |
| Refusal | Recipient resolution | Index answers `formerMemberAt(address)` |

## Decisions (design)

- **D-SCOPE (revised for AR-002):** follow: standalone Team runs (`own_team` compilation) and catalog Team copies (`delegated_team` at the mount path = parent of the stored coordinator address), including peer-started copies on the node that runs them. Not followed: application-bound runs (`applicationBinding` set) and copies of a configured placement. What a copy was made from is a fact recorded once, when the copy is created, in its own tree: `copiedFrom: "team_definition" | "configured_placement"` (root of `TeamRunExecutionTreeFile`; written only for delegated Team runs; never edited — no writer other than creation sets it, and every tree writer keeps it). The delegation knows it at creation: a catalog entry (`collaborator-entry-builder.ts:100-137`) → `team_definition`; a configured placement (`collaborator-source-projector.ts:20-50`, reached through `TeamRecipientResolver.resolveInRunDelegationPlacement`) → `configured_placement`; it is passed in `CreateTeamRunInput` (`team-run-service.ts:63-77`) beside `delegatedFrom`. A copy without the field (every copy created before this change) is treated as `team_definition`: measured, none of the 30 existing copies was delegated from an Org run (AF-13). The launch source (`defaultLaunchSource`) is no longer consulted: it records where a launch came from and Settings rewrites it (`team-run-selection-mutator.ts:92-101`).
- **D-TRIGGER:** every `announce` (any list kind) re-checks all live Team roots; a run whose plan is empty is untouched, so repeated announcements are harmless.
- **D-COMMIT:** plan against the root's current tree inside the lock (a stale plan cannot overwrite a newer change); swap only after the durable write.
- **D-RETIRE (revised for AR-001, AR-003, AR-006):** see § Member States And Call-Site Rules. Removal is effective for receiving and for addressing at the swap; a busy member is *leaving* until its handle is next quiescent, then it is stopped and released.
- **D-LIVE-RULES:** `get_handoff_rules` and prompt composition read rules through `outgoingHandoffs()`.
- **D-FORMER:** former members stay in the tree; history readers include them; a rejoin restores the same run.
- **D-WINDOW / D-NOTICE / D-LAUNCH:** as Off-Spine Concerns.
- **D-INVALID (revised SR-009, O-1/O-2):** a definition that is missing or invalid as a whole (including one naming an unknown agent, O-2) → the run is unchanged and the planner logs `TEAM_RUN_DEFINITION_NOT_FOLLOWED:<teamRunId>: <reason>` once per run and reason (REQ-007, AC-007, DESIGN.md rule 7). When the package loader keeps the last good definition of an unparsable `team-config.json` and records a load issue (O-1), the planner reads that load issue from the definition entry and logs the same warning naming it; it does not plan against the kept last good definition. N-3's per-member skip stays only for an unlaunchable member of a valid definition.

## Member States And Call-Site Rules (SR-008: AR-001, AR-003, AR-005, AR-006)

`TeamRunMembership` gives every agent run ID of the run one state:

| State | Meaning | Stored |
| --- | --- | --- |
| `current` | In the definition | `members` |
| `leaving` | Removed while busy; finishing its turn | `formerMembers` (it is already former on disk) + in-memory leaving set |
| `former` | Removed and stopped | `formerMembers` |

One rule, applied at each call site that resolves an agent run of this run:

| Call site (file:line on `a07767f4d0`) | `current` | `leaving` | `former` |
| --- | --- | --- | --- |
| Address resolution, own team instance step (`message-recipient-resolution.ts:70-73`) and run-wide step (`:75-78`) | resolves | refused with the former-member text (checked in each step before its generic not-found throw, through the index's `formerMemberAt(address)`, which answers leaving and former runs) | same refusal |
| `send_message_to` by run ID (`team-run-message-delivery.ts:163-168`) | resolves | refused with the former-member text (index `getAgent` misses → `formerMemberByRunId(id)`) | same refusal |
| Engine `deliver` receiver check (`root-communication-engine.ts:127`) | may receive | may not | may not |
| Engine `deliver` sender check (`root-communication-engine.ts:127`) and `authorizeIdentity` (`root-team-run.ts:248-265`, `team-run-message-delivery.ts:164`) | may send | may send | may not |
| Own commands: `executeAgentCommand` approve/deny/interrupt (`root-team-run.ts:321-341,366-369`) → `getDirectAgent` (`flat-team-execution-manager.ts:292-299`) | yes | yes (its pending approval and interrupt work) | `RUN_NOT_FOUND` |
| Message-log owner of its messages (`root-team-run.ts:126`) | own log | own log | own log (its messages stay in this run's log) |
| Status snapshots (`flat-team-execution-manager.ts:74-82`), run-tree `team_member` rows, and the view snapshot's member contexts | listed | listed, marked leaving (from the stored `leaving` marker) | not listed |
| Handoff rules from/to it | current rules | none (it is no longer in the compiled rules) | none |

How the rule is carried:
- The engine's one check is split: the shared `RootCommunicationPort` (`root-communication-port.ts:50`) gets `maySend(identity)` beside `isCurrentAgent(identity)`; `deliver` checks `maySend` for the sender and `isCurrentAgent` for the receiver. Team root: `maySend` = current or leaving; Org and standalone roots: `maySend` is their `isCurrentAgent` (they have no leaving state). Required, not optional.
- `TeamExecutionIndex` is built from the tree (`members` and `formerMembers`) plus the leaving set: `getAgent` answers current only; `getAgentForOwnCommand` (new) answers current and leaving; `formerMemberAt(address)` and `formerMemberByRunId(id)` answer leaving and former. `RootTeamRun` call sites above use these by name.
- Routing by run ID (SR-009, CRR-002 CR-001): `GlobalAgentRunMessageRouter.deliver` (`global-agent-run-message-router.ts:89`) routes a run-ID target through the sender's root when that root names it at all. A new root method `ownsAgentRun(agentRunId)` answers current, leaving and former members (team root: from `TeamRunMembership` and `formerMembers`; Org and standalone roots: their existing `hasAgentExecution`). The router uses `ownsAgentRun`; `hasAgentExecution` keeps its meaning (live current executions) because `ActiveCollaborationRootDirectory.placeOf` (restart-resume placement) also reads it and must not place a former member. So every run ID the team root refuses by name reaches `deliverToRunId`'s refusal. The test enters through the router or the `send_message_to` tool, not `deliverToRunId` directly.
- Visibility (decision within REQ-008/DEC-002, revised SR-009): a leaving member stays in the rendered member list (the run-tree `team_member` rows) tagged "Leaving", and can be opened there to answer its pending approval or stop it, until it stops; then its row disappears. The state is stored (`formerMembers[i].leaving`), so every projection agrees and a restart clears it (restore follow).

Address reuse and rejoin (AR-003):
- `ConfiguredAgentExecutionRegistry` keys handles by **agent run ID** (today by address, `configured-agent-execution-registry.ts:18,35-45`); `remove(agentRunId)`. So a new member at the address of a still-leaving member (DEC-006) gets its own handle and starts at once; the old handle keeps finishing its turn.
- A former member that rejoins (DEC-007) keeps its run ID. If it is still leaving when it rejoins, the rejoin cancels the leave: it returns to `current` with the same live handle. If it is already stopped, its handle is created on its next message in restore mode (its conversation continues).

One owner of member runtime contexts (AR-006):
- `TeamRunMembership.replace(committedTree)` (leaving read from the tree's `leaving` markers, SR-009) owns the member contexts: it **keeps the existing `FlatAgentExecutionContext` object of every retained member by agent run ID** (its runtime kind and provider binding are live state handles reference), creates contexts for added members, keeps leaving members' contexts, and drops former members'. `TeamRunMembership.release(agentRunId)` drops a leaving member's context after its handle is removed.
- `FlatTeamExecutionManager.applyMembership(change)` only acts on handles: for each removed member, stop now if idle, else watch for quiescence (DS-004); after stopping, `registry.remove(agentRunId)`, then `membership.release(agentRunId)` and a view refresh (DS-007). It creates no contexts.

## Exact Texts (normative)

Notice to each remaining member (only the lines that apply; addresses in the member's own address space):

```text
Your team changed: its definition was updated.
Joined: <name> at <address>.
Left: <name> (<address>); messages to it are no longer delivered.
Your handoff rules changed; call get_handoff_rules to read them.
```

The last line is replaced by `Your handoff rules are unchanged.` when that member's outgoing rules did not change. One `Joined:`/`Left:` line per member, in definition order.

Merging (N-2): a member's pending notice states the **net** change since its last delivered notice. A member that joined and then left before delivery, or left and then rejoined, gets no line; the rules line says "changed" when its outgoing rules now differ from the rules at its last delivered notice. A pending notice whose net change is empty is dropped.

A member whose launch can't be resolved (N-3) is not added (warning naming run, address and reason); the compiled rules leave out every rule from or to an address that is not a current member, so `get_handoff_rules` never names a member that does not exist. The next announcement retries the member and, when it is added, its rules come with it.

Refusal for a message to a former member (code `COLLABORATION_TARGET_NOT_FOUND`, existing handling):

```text
<name> (<address>) is no longer a member of your team: it was removed from the team definition. Call get_handoff_rules for your current handoff rules.
```

## Ownership Boundaries And Dependency Rules

- Allowed: listener → manager, planner; manager → planner; root → committer → persistence, `TeamRunMembership`, `TeamRun` (backend chain), notice source, `DelegationIndex` (narrowed `Pick<…, "runPartsChanged" | …>`); contexts → `TeamRunMembership` (read).
- Forbidden: writing the tree outside the committer or the restore step; editing `TeamRunMembership` except by `replace(committedTree)`; any reader building its own member list from the definition.
- Composition: `TeamMembershipPlanner`, `TeamDefinitionChangeListener`, `TeamChangeNoticeSource` are constructed in the server composition and passed by constructor; the listener is registered on the existing definition-change signal (a notification listener, Principle 16 "where it bends").

## Interface Boundary Mapping

| Interface | Subject | Identity |
| --- | --- | --- |
| `TeamMembershipPlanner.viewFor(tree): Promise<TeamDefinitionView \| NotFollowed>` | one Team run's definition view | stored tree |
| `planTeamMembershipChange(tree, view): TeamMembershipChange \| null` (pure) | one run | tree |
| `TeamMembershipPlanner.followStored(tree): Promise<{ tree, change } \| null>` | stopped run | tree |
| `RootTeamRun.followDefinition(view): Promise<TeamMembershipChange \| null>` | live run | root |
| `TeamRunMembership.replace(tree)`, `handoffsFrom(address)`, `memberAt(address)`, `isLeaving(agentRunId)` | one live run | address / run ID |
| `FlatTeamExecutionManager.applyMembership(change)` | one live run | change |
| `TeamChangeNoticeSource.queue(agentRunId, notice)` | one member run | agent run ID |
| `DelegationIndex.runPartsChanged(run)` | one run | `RootExecutionIdentity` |
| Index `formerMemberAt(address)` (MessageRecipientIndexPort; Org/standalone return null) | one address | address |
| Index `formerMemberByRunId(id)`, `getAgentForOwnCommand(id)` | one agent run | agent run ID |
| `RootCommunicationPort.maySend(identity)` (required; team: current or leaving; Org/standalone: = `isCurrentAgent`) | one sender | member identity |
| `TeamRunMembership.release(agentRunId)` | one leaving member | agent run ID |
| Root view event `team_membership_changed` → `TeamViewSession` re-opens the live snapshot | one open view | team run |
| `CreateTeamRunInput.copiedFrom` | one delegated Team run | creation input |

## Existing Capability Reuse Check

| Need | Existing | Decision |
| --- | --- | --- |
| Locked tree write | `TeamRunPersistenceCoordinator` | Reuse |
| Committer pattern | `TeamAgentPlatformBindingCommitter` | Reuse pattern |
| Notices | `AgentRunPlatformNotices` | Extend (new source) |
| Window rows | `DelegationIndex`, `ChildRowsFeed` | Extend |
| Launch | `CollaboratorLaunchResolver` | Reuse |
| Rules compilation | `CollaborationHandoffCompiler` | Reuse |
| Lazy start | `ConfiguredAgentExecutionRegistry.getOrCreate` | Reuse |

## Final File Responsibility Mapping

Server (`autobyteus-server-ts/src/`):

| File | Change | Concern |
| --- | --- | --- |
| `agent-team-execution/membership/team-membership-change.ts` | Add | `TeamMembershipChange` type and pure `planTeamMembershipChange` |
| `agent-team-execution/membership/team-membership-planner.ts` | Add | Scope rules, definition view, launch, `followStored` |
| `agent-team-execution/membership/team-membership-committer.ts` | Add | Live change sequence |
| `agent-team-execution/membership/team-definition-change-listener.ts` | Add | Announcement → live roots |
| `agent-team-execution/membership/team-change-notice-source.ts` | Add | Notice texts and delivery |
| `agent-team-execution/domain/team-run-membership.ts` | Add | One live execution view |
| `agent-team-execution/domain/root-team-run.ts` | Modify | Build committer; `followDefinition`; leaving members authorized; ≤500 lines |
| `agent-team-execution/domain/team-run-context.ts`, `local/flat-team-execution-context.ts`, `local/flat-team-execution-factory.ts`, `local/registries/flat-team-member-config-resolver.ts` | Modify | Read `TeamRunMembership` |
| `agent-team-execution/local/flat-team-execution-manager.ts`, `local/flat-team-run-backend.ts`, `domain/team-run.ts` | Modify | `applyMembership` / forwarding |
| `agent-team-execution/services/agent-team-run-manager.ts` | Modify | Restore follows stored tree; list live roots for the listener; ≤500 lines |
| `agent-team-execution/services/team-execution-index.ts` | Modify | `formerMemberAt` |
| `agent-team-execution/domain/team-run-execution-tree.ts`, `run-history/store/team-run-execution-tree-schema.ts`, `services/team-run-execution-tree-builder.ts` | Modify | `formerMembers` |
| `agent-collaboration/execution/domain/member-execution-context.ts`, `agent-team-execution/services/member-team-context-builder.ts`, Org/standalone builders | Modify | `outgoingHandoffs()` |
| `agent-communication/services/get-handoff-rules-service.ts`, `agent-execution/prompt/collaboration-prompt-sections.ts` | Modify | Read `outgoingHandoffs()` |
| `agent-collaboration/collaborators/message-recipient-resolution.ts` | Modify | Former-member refusal |
| `agent-collaboration/delegation/delegation-index.ts` | Modify | `runPartsChanged`; must not grow (move a cohesive block out) |
| `agent-memory/services/team-root-memory-source.ts`, `run-history/services/team-run-history-service.ts`, `run-history/store/run-own-agents-reader.ts` | Modify | History includes former members |
| composition (server) | Modify | Construct and wire new owners; register notice source |
| `agent-collaboration/execution/communication/root-communication-port.ts`, `root-communication-engine.ts`; Org and standalone communication ports | Modify | `maySend` split (AR-001) |
| `agent-team-execution/local/registries/configured-agent-execution-registry.ts` | Modify | Key by agent run ID (AR-003) |
| `agent-team-execution/services/team-run-message-delivery.ts` | Modify | Former-member refusal by run ID; sender authorization accepts leaving (AR-001, AR-005) |
| `agent-team-execution/services/team-run-service.ts`; `agent-collaboration/collaborators/collaborator-entry-builder.ts`, `collaborator-source-projector.ts` and the delegation step that creates a Team copy | Modify | Pass and record `copiedFrom` (AR-002) |
| `agent-team-execution/domain/team-run-event.ts`, `services/agent-streaming/team-view-session.ts`, `services/agent-streaming/team-execution-view-projector.ts` | Modify | `team_membership_changed` event; re-open live snapshot; project leaving members (AR-004) |
| `autobyteus-team-stream-contracts/src/team-execution-view-dtos.ts` | Modify | Member DTO `leaving?: true` (AR-004) |
| `autobyteus-web/services/agentStreaming/TeamStreamingService.ts`, `services/teamExecution/teamExecutionViewState.ts`, `teamExecutionTreeSelectors.ts` | Modify | Apply in-band snapshot member changes to the view's agent contexts (keep, add, drop) |
| `autobyteus-web/components/workspace/history/WorkspaceStableExecutionRow.vue` (and the run-tree row model it reads), web locales | Modify | "Leaving" tag on a `team_member` row with `leaving` (SR-009) |
| `autobyteus-web/components/workspace/team/TeamMembersPanel.vue`, its tests, and locale keys used only by it | Remove | Dead on base (no page, layout or component imports it; CRR-002) and touched by this change: Principle 7 |
| `autobyteus-collaboration-stream-contracts/src/run-tree-dtos.ts`; `autobyteus-server-ts/src/agent-collaboration/delegation/run-tree-view.ts`; `run-history/store/run-own-agents-reader.ts` | Modify | `leaving?: true` on member rows from the stored marker (SR-009) |
| `autobyteus-server-ts/src/agent-communication/services/global-agent-run-message-router.ts` and the roots' `ownsAgentRun` | Modify | Route leaving/former run IDs to the sender's root (CR-001) |

Docs: `collaboration_model.md` (membership follows the definition; former members), `agent_team_execution.md` (rewrite the fixed-topology statements), `agent_communication.md` (`get_handoff_rules` current rules; refusal), `GLOSSARY.md` (Former member).

## Concrete Examples

| Topic | Good | Avoided |
| --- | --- | --- |
| One view | Committer: `persist(next)` → `root.replaceTree(next)` + `membership.replace(next)` | Updating `teamNode`, `memberContexts` and the index separately |
| Stale plan | Plan inside the lock from the current tree | Plan computed before an earlier change committed, then written |
| Removal while busy | Address refused at once; stop when quiescent | Interrupting the turn; or keeping it addressable until it stops |
| Copy rules | `compileTeam(resolvedAt(mountPath), { kind: "delegated_team" })` | `own_team` compilation for a copy (loses the prefix) |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Decision |
| --- | --- |
| Keep frozen `outgoingHandoffs` array beside a live read | Rejected: one read |
| Keep the three membership copies and sync them | Rejected: one view |
| Version field on the tree | N/A (tolerant optional field) |

## Change / Refactor Sequence

1. `TeamRunMembership` and the readers' switch to it (no behavior change).
2. `formerMembers` in tree type, schema, writers, history readers.
3. Planner (pure diff + scope + view) with unit tests.
4. Committer, root `followDefinition`, execution manager `applyMembership`, retire (DS-004), authorization of leaving members.
5. Live rules (`outgoingHandoffs()`), refusal text.
6. Restore follows stored tree.
7. Listener + composition; notice source; `DelegationIndex.runPartsChanged`.
8. Docs and glossary; size checks for the three large files.

## Key Tradeoffs

- Recheck all live Team roots on every announcement (cheap, idempotent) instead of mapping definition IDs to runs.
- Former members kept in the tree for history and rejoin, at the cost of every tree writer preserving the list.

## Risks

- Delivery racing a removal: ordered by the swap; messages resolved before the swap reach a member that is then leaving (it finishes, then stops) — acceptable per DEC-002.
- A definition reload storm (many announcements): idempotent; no write unless changed.
- DeepSeek/other runtimes are unaffected (no runtime change).

## Guidance For Implementation

- Reproduction: start a Team run of a test package Team, add a member and a rule to its `team-config.json`; today `get_handoff_rules` of the sender omits it and `send_message_to` returns `COLLABORATION_TARGET_NOT_FOUND`; after the change both succeed.
- Tests: pure planner (add, remove, swap DEC-006, rejoin DEC-007, coordinator change, rules for own team and copy, `copiedFrom: configured_placement` and application run not followed, a copy without `copiedFrom` followed, a Settings-edited copy keeps its `copiedFrom`, rules to an unlaunchable member left out, invalid definition); committer ordering and fail-stop; leaving member: approve/deny/interrupt work, its sends delivered, messages to it refused by address (both resolution steps) and by run ID with the exact text, listed as a run-tree `team_member` row tagged "Leaving" (and openable to answer its approval) until stopped, then its row leaves after the release write; a restart while leaving clears the marker at restore; run-ID refusal entered through the router/tool for leaving and former members, with `placeOf` unchanged for former members; the planner warning for an unparsable or invalid definition (O-1, O-2); TeamMembersPanel removed; swap at the same address while the old member is leaving (new member starts, old one finishes); rejoin while leaving cancels the leave; retained members keep their context objects; notice net-merge cases; listener continues past a failing root; follow right after restore registration; open Team view receives an in-band snapshot with the new/removed member and the web adds/drops the row and context; run-tree row notice; schema with/without `formerMembers` and `copiedFrom`; history readers.
- Real E2E per the requirements' Verification Intent.
- Keep `root-team-run.ts`, `agent-team-run-manager.ts` ≤500 and `delegation-index.ts` ≤548 lines; name any block moved in the implementation handoff.
