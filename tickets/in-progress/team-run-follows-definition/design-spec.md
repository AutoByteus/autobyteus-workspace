# Design Spec

## Solution And Approval Basis

- Current solution revision ID: `SR-007`
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

- In scope: UC-001..UC-005. Areas: `agent-team-execution` (new `membership/` folder, root, execution manager, contexts, registry, manager restore, tree schema/builder), `agent-collaboration` (member context live handoffs, recipient resolution refusal, delegation index run-file notice), `agent-communication` (get_handoff_rules), `agent-execution/prompt` (handoff section reads live rules), `run-history` (history readers include former members), composition, docs and glossary.
- Derived consumers (Principle 11): the 14 readers of `rootTeam.members` (AF-16) — current-member readers unchanged (former members are not in `members`); history readers (`team-root-memory-source.ts`, `team-run-history-service.ts`, `run-own-agents-reader.ts` `agentsOfMembers`, participant messages via `DelegationIndex.agentsOf`) include `formerMembers`; `team-run-execution-tree-schema.ts` accepts it; every tree write keeps it (`team-run-execution-tree-builder.ts`, mutators).
- Deliberately left alone: Org runs and Org-mounted Teams (FU-002); copies of configured placements (they follow their placement, with Orgs); application-bound Team runs (they follow their application package's lifecycle); Team-level launch defaults and Team instruction text; a running member's already-composed instructions (DEC-009).
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

- Subject: `team_run_execution_tree.json` of Team runs: `rootTeam.formerMembers?: ConfiguredAgentExecutionNode[]` (optional, absent = none); `members`, `coordinatorAddress`, `handoffs` rewritten by the follow step.
- Readers: tolerant schema (`team-run-execution-tree-schema.ts`) gains the optional list validated like `members`; current-member readers ignore it; history readers include it (AF-16).
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
| DS-001 | On every announcement the listener walks this process's live Team roots. For each it asks the planner for the run's current definition view (definition read, launch for possible new members resolved outside any lock). The root's committer then plans against the root's *current* tree under the persistence lock; nothing changed → no write, no event. Otherwise one locked write saves the next tree, then the root swaps tree, index and `TeamRunMembership` together, the execution manager adds member contexts for new members (Offline, lazy) and retires removed ones, notices are queued, and the window is told. |
| DS-002 | A stopped run is followed before it comes alive: the planner computes the next tree from the stored one; when it changed it is written, then the run restores from it as today. Notices are queued for its remaining members. |
| DS-003 | Pure: compares definition members (by address and agent definition ID) with `members` and `formerMembers`: added (new address, or same address with another agent → old one becomes former, DEC-006), rejoined (a former member at the same address and agent, DEC-007), removed (→ former). Coordinator and rules are replaced by the definition's, compiled as the run was created (own team, or catalog copy at its mount path). |
| DS-004 | A removed member that is idle stops at once. A busy one is marked leaving: it receives nothing new (its address resolves to the former-member refusal), may still send from its current turn, and is terminated when its handle is next quiescent; then its handle is removed from the registry. |
| DS-005 | The member context reads its outgoing rules from `TeamRunMembership` on each call, so `get_handoff_rules` and the next composed prompt use current rules. |
| DS-006 | The notice source holds one pending notice per remaining member (merged when several changes arrive before delivery) and hands it over at the member's next input or idle, as skill-update notices do. |
| DS-007 | `DelegationIndex.runPartsChanged(run)` forgets that run's cached parts and reports child rows for the run and its ancestors; `ChildRowsFeed` publishes `RUN_TREE_CHANGED`; open views re-read `runTree(run)`. |

## Spine Actors / Main-Line Nodes

`TeamDefinitionChangeListener`, `AgentTeamRunManager`, `TeamMembershipPlanner`, `RootTeamRun` + `TeamMembershipCommitter`, `TeamRunMembership`, `FlatTeamExecutionManager`, `TeamChangeNoticeSource`, `DelegationIndex`.

## Ownership Map

| Owner | Owns |
| --- | --- |
| `TeamMembershipPlanner` (new) | Which runs follow (D-SCOPE), reading the definition view, compiling rules as the run was created, launch of new members, the pure diff into `TeamMembershipChange` and the next tree |
| `TeamMembershipCommitter` (new, built inside `RootTeamRun` like `TeamAgentPlatformBindingCommitter`) | Ordering of a live change: plan under lock → durable write → swap → apply to execution → notices → window; fail-stop on an indeterminate write (existing rule) |
| `TeamRunMembership` (new domain) | The one in-memory execution view of current members (node + runtime context), coordinator, handoffs, leaving and former members; replaced only from a committed tree |
| `RootTeamRun` | Persisted tree and index (unchanged role); identity authorization accepts leaving members until stopped |
| `FlatTeamExecutionManager` | Adding member contexts, retiring handles (DS-004) |
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
| `ConfiguredAgentExecutionRegistry.remove` unused | Dead today (AF-05) | Becomes used by DS-004 (not removed) |

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

- **D-SCOPE:** follow: standalone Team runs (`own_team` compilation) and Team copies (`delegated_team` at the mount path = parent of the stored coordinator address), including peer-started copies on the node that runs them. Not followed: application-bound runs (`applicationBinding` set); copies whose `defaultLaunchSource.origin` is `configured` (copies of a configured placement, AF-12); existing copies with no source are catalog copies (AF-13: none came from an Org run).
- **D-TRIGGER:** every `announce` (any list kind) re-checks all live Team roots; a run whose plan is empty is untouched, so repeated announcements are harmless.
- **D-COMMIT:** plan against the root's current tree inside the lock (a stale plan cannot overwrite a newer change); swap only after the durable write.
- **D-RETIRE:** removal is effective for inbound delivery at the swap; a busy member stops when next quiescent; its sends from that turn are authorized (leaving set).
- **D-LIVE-RULES:** `get_handoff_rules` and prompt composition read rules through `outgoingHandoffs()`.
- **D-FORMER:** former members stay in the tree; history readers include them; a rejoin restores the same run.
- **D-WINDOW / D-NOTICE / D-LAUNCH:** as Off-Spine Concerns.
- **D-INVALID:** definition missing, unreadable or invalid → warning naming run and reason, run unchanged (REQ-007, DESIGN.md rule 7).

## Exact Texts (normative)

Notice to each remaining member (only the lines that apply; addresses in the member's own address space):

```text
Your team changed: its definition was updated.
Joined: <name> at <address>.
Left: <name> (<address>); messages to it are no longer delivered.
Your handoff rules changed; call get_handoff_rules to read them.
```

The last line is replaced by `Your handoff rules are unchanged.` when that member's outgoing rules did not change. One `Joined:`/`Left:` line per member, in definition order.

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
- Tests: pure planner (add, remove, swap DEC-006, rejoin DEC-007, coordinator change, rules for own team and copy, placement copy and application run not followed, invalid definition); committer ordering and fail-stop; retire while busy; refusal text; notice merge and texts; window notice; restore follow; schema with/without `formerMembers`; history readers.
- Real E2E per the requirements' Verification Intent.
- Keep `root-team-run.ts`, `agent-team-run-manager.ts` ≤500 and `delegation-index.ts` ≤548 lines; name any block moved in the implementation handoff.
