# Investigation Notes

## Investigation Meta

- Package identifier: `team-run-follows-definition` (Project Task `autobyteus-22`, Project `project_f34a9537-07d7-449a-b78f-16368f1aa619`)
- Request: Task autobyteus-22 from `/project_task_manager` (run `project_task_manager_2f41a1df4e464bf2aa8970327d9d7ad0`), the user's questions of 2026-11-11
- Workspace root: `/home/autobyteus/workspace/.codex/worktrees/team-run-follows-definition`
- Repository mode: `Git`; branch `codex/team-run-follows-definition`
- Base: `origin/personal` at `a07767f4d007ff00ae16e0b58a8023e8ac8f0cc0` (fetched 2026-11-21; the ticket commits were rebased onto it at the user's request; before that `53b72018ad`, 2026-11-18; the worktree was recreated on it at the user's request; first investigated on `827f1e68d`, 2026-11-11); finalization target `origin/personal`
- Bootstrap result: OK. The first worktree (base `827f1e68d`) could not take a merge of the new base: `git merge` failed with `fatal: stash failed` because this filesystem reports two unchanged tracked symlinks (`autobyteus-web/docker-compose.yml`, `tickets/done/android-mobile-pairing-qr-error/build-logs/electron-mac-build-latest.log`) as modified. It was replaced by a fresh worktree on `53b72018ad`; the ticket documents were copied over (commit `598bf5572f`). Bootstrap blocker: None
- Current solution revision ID: `SR-001`
- Authorities read (requirements gate, read in this conversation): `references/requirements-engineering.md`, `references/ticket-scope.md`, `references/finding-the-cause.md`; `DESIGN.md`; `autobyteus-server-ts/docs/design/collaboration_model.md` §1–2; module docs `agent_team_execution.md`, `agent_communication.md`, `skill_update_notices.md`
- Investigation status: requirements and architecture investigation complete (architecture on `a07767f4d0`, 2026-11-21).
- Authorities read for the architecture phase (2026-11-21): `references/architecture-design.md`, `references/design-principles.md` (updated 2026-11-12: The Approach, Principles 13 empty-indirection check, 16 visible dependencies), `templates/design-spec-template.md` (updated), `DESIGN.md` (rule 12 wording only changed), `autobyteus-server-ts/docs/design/data_migration_guideline.md` §2–3, `collaboration_model.md` §1–3

## Initial Request And Clarifications

- The user (2026-11-11): when a team definition changes, running team runs don't follow. A new member (Agent Package Creator → Supervised Research Team; Reply Scout → Marketing Team) does not appear in a running team even after the handoff rules name it; a removed member (Research Method Reviewer) stays. Today's only way: stop at a checkpoint, close the Task, start a new team run from the files, losing the team's conversation context.
- His questions: why doesn't the new teammate appear automatically when the researcher hands off to it? Why can't a removed member disappear automatically?
- Direction: investigate how team runs fix membership and what it takes to follow the definition; say what can be safe; recommend an approach before building; then build what he approves.

## Source Log

| ID | Date | Type | Source | Finding | Established |
| --- | --- | --- | --- | --- | --- |
| IF-01 | 2026-11-11 | Doc | `docs/modules/agent_team_execution.md` § Launch-Time Identity, Backend And Topology | Launch validates the definition and allocates one AgentRun ID per member, producing one immutable `TeamRunConfig`; `TeamRunConfig.rootTeam` is the runtime authority | Read |
| IF-02 | 2026-11-11 | Code | `agent-team-execution/domain/team-run-execution-tree.ts:25-55` | The saved tree (`team_run_execution_tree.json`) holds `rootTeam.members[]` (address, agentDefinitionId, agentRunId, provider binding, launchConfiguration), `coordinatorAddress`, `defaultLaunchConfiguration` and the compiled `handoffs` | Read |
| IF-03 | 2026-11-11 | Code | `team-run-execution-tree-builder.ts:42,82`; `team-root-materializer.ts:79,101`; `flat-team-topology-planner.ts:94` | Handoffs are compiled once at launch (`CollaborationHandoffCompiler().compileTeam`), written to the tree, and read back from the tree on restore | Read |
| IF-04 | 2026-11-11 | Code | `agent-communication/services/get-handoff-rules-service.ts:8-20`; `member-team-context-builder.ts:49-66`; `member-execution-context.ts:37-50` | `get_handoff_rules` returns the member context's frozen `outgoingHandoffs`, built from the run's saved handoffs | Read |
| IF-05 | 2026-11-11 | Data (read-only) | `/home/autobyteus/data/memory/agent_teams/marketing_team_f261c36351b04328bd6428d35ea9c03a/team_run_execution_tree.json` (created 2026-10-14) vs `autobyteus-agents/agent-teams/marketing-team/team-config.json` | The running standalone Marketing Team has 4 members and no handoff to the Reply Scout; the current definition has 5 members including `marketing_reply_scout` | Measured |
| IF-06 | 2026-11-11 | Data (read-only) | `/home/autobyteus/data/memory/agent_teams/supervised_research_team_8d0ee1d530754e1d93badae820d62636/team_run_execution_tree.json` | The SemFlow study's team is a **delegated Team copy** (`taskAgent` section), its own run with its own tree; addresses are prefixed `/supervised_research_team/…` (the compiler rewrites the definition's bare `/researcher`) | Measured |
| IF-07 | 2026-11-11 | Doc | `agent_communication.md` § Address resolution order | `send_message_to(address)` resolves only the run's own placements; any other address is `COLLABORATION_TARGET_NOT_FOUND`; "a message can never start an agent"; the first message to an existing Offline member starts it | Read |
| IF-08 | 2026-11-11 | Doc | `agent_team_execution.md` § Root And Agent Lifecycle | Every Team kind prepares scope-only: configured members stay unstarted and Offline until a message needs them; first input activates only its receiver | Read |
| IF-09 | 2026-11-11 | Doc | `agent_team_execution.md` § Collaboration And Handoffs | No prompt section lists teammates (no roster); a `Handoffs` section appears only when the member has rules and points to `get_handoff_rules` | Read |
| IF-10 | 2026-11-11 | Code | `agent-org-execution/domain/agent-org-run-execution-tree.ts:17,32` | Org runs save their own copies of mounted Teams' members and handoffs (separate format) | Read |
| IF-11 | 2026-11-11 | Code | `compositions/agent-package-definition-feed-composition.ts` | Every definition change (package reload, app save, personal setting) is announced once: web clients and `agentDefinitionChanges.notifyChanged()`, which lets running agents take their definitions' new tools | Read |
| IF-12 | 2026-11-11 | Doc | `skill_update_notices.md` | Precedent: one platform notice to a running run, delivered at idle, when something it uses changes | Read |
| IF-13 | 2026-11-11 | Doc | `agent_communication.md` § Launch configuration of catalog copies | Precedent for choosing runtime/model for an agent nobody configured: agent default → the Team's resolved launch | Read |
| IF-14 | 2026-11-11 | Doc | `agent_communication.md` § recipient_address Team Route | Precedent for departed participants: `pastParticipants` keeps closed delegated runs' messages readable and named by address | Read |
| IF-16 | 2026-11-18 | Code | `origin/personal` `b1229d0430`: `get-handoff-rules-service.ts` unchanged; `flat-team-topology-planner.ts:101` compiles at launch; `team-run-execution-tree-builder.ts:43,85` writes/reads `tree.handoffs`; `team-root-materializer.ts:86,107` | Re-checked after the user's comment that rules are dynamic: they are still the run's saved copy from launch; the 461 refactor did not change this | Read |
| IF-17 | 2026-11-18 | Code | `53b72018ad`: `get-handoff-rules-service.ts:8-20`, `flat-team-topology-planner.ts:101`, `team-run-execution-tree-builder.ts:43,85`, `team-root-materializer.ts:86,107`, `team-run-execution-tree.ts:25-37`, `message-recipient-resolution.ts:60-78` | Re-analysis on the latest base: same as IF-01..IF-04 and IF-07; no commit among the 112 touching team execution/collaboration/communication since `827f1e68d` makes runs follow their definition | Read |
| IF-18 | 2026-11-18 | Code | `agent-collaboration/delegation/run-tree-view.ts:30-76`, `child-rows-feed.ts:1-45`, `run-history/store/run-own-agents-reader.ts:49-95`, `services/agent-streaming/team-view-session.ts:174-184` (461, SR-082..SR-086) | The window now gets each run's tree from the server (`runTree(run)`): a team's member rows come from its own file through `RunOwnAgentsReader.ownTreeOf`, read once by `DelegationIndex` (the one owner); `ChildRowsFeed.rowChanged(run)` publishes `RUN_TREE_CHANGED` so open views re-read and send the change | Read |
| IF-19 | 2026-11-18 | Code | `run-own-agents-reader.ts` `RunListingFacts` (autobyteus-492) | `list_running_agents` also reads a run's coordinator/members from its own file | Read |
| IF-20 | 2026-11-21 | Code | `a07767f4d0` (447 commits after `53b72018ad`, 33 in team execution, collaboration, communication, definitions, org execution, web workspace/stores): `get-handoff-rules-service.ts:15`, `flat-team-topology-planner.ts:101`, `team-root-materializer.ts:89,110`, `team-run-execution-tree-builder.ts:43,85`, `team-run-execution-tree.ts:25-37`, `message-recipient-resolution.ts:60-74`, `child-rows-feed.ts:29-35`, `agent-package-definition-feed-composition.ts:44` | Second re-analysis: all facts hold; no commit implements runs following their definition; the 33 commits are refactors (delegated-run naming, Stop, standalone messages, semantic memory for every agent, unmounted running-team panel removed). Relevant: `8e2d3b76c0` refuses a run whose saved model its runtime no longer offers, so an added member needs an offered model | Read |
| IF-21 | 2026-11-21 | Review | `design-review-report.md` N-7 (ARCH-REV-002) | Correction of IF-06: current Team copy trees store the team's own addresses (no copy prefix); IF-06 reflected an older copy | Read (reviewer) |
| IF-15 | 2026-11-11 | Doc | `agent_communication.md` lines ~795 vs § Address resolution | Doc inconsistency: "a first message to an available catalog address brings that one instance in" contradicts "a message can never start an agent" | Read (FU-001) |

## Relevant Existing Behavior

| ID | Trigger | Current behavior | Evidence |
| --- | --- | --- | --- |
| BEH-001 | Team run starts (standalone or delegated copy) | Members, coordinator and handoffs are copied from the definition into the run's tree and never read from the definition again | IF-01..IF-03 |
| BEH-002 | Definition gains a member | Running and stored runs don't get it; a handoff or message to its address fails `COLLABORATION_TARGET_NOT_FOUND`; `get_handoff_rules` doesn't even list it | IF-04, IF-05, IF-07 |
| BEH-003 | Definition loses a member | It stays addressable and keeps its rules in every existing run | IF-02, IF-03 |
| BEH-004 | Agent definition changes (instructions, tools, skills) | Already followed: tools live via `agentDefinitionChanges`; instructions at the next composition; skills via notices | IF-11, IF-12 |
| BEH-005 | Member needed for the first time | Lazy: an Offline member is started by the first message to it | IF-07, IF-08 |


## Architecture Investigation Findings (base `a07767f4d0`)

All paths under `autobyteus-server-ts/src/`. Established by reading unless marked.

| ID | Source | Finding | Design implication |
| --- | --- | --- | --- |
| AF-01 | `agent-team-execution/domain/root-team-run.ts:78-79,95-170,483-487` (495 lines) | `RootTeamRun` holds the live `tree` and `TeamExecutionIndex`; resolution, delivery and collaborators read them through getters (`getIndex: () => this.index`, `getTree: () => this.tree`); `replaceTree(tree)` swaps both. `TeamAgentPlatformBindingCommitter` is built in the constructor with `persistence`, `getTree`, `replaceTree`, `assertAdmitting` | Precedent for a committer that persists a tree change and swaps it; the file has 5 lines of room |
| AF-02 | `services/team-run-persistence-coordinator.ts:22-75` | `commitExecutionTreeMutation(plan)` is the locked tree write; fail-stop on an indeterminate write | The membership change is one locked tree write |
| AF-03 | `domain/team-run-context.ts:16-66` | `TeamRunContext.teamNode` and `.handoffs` are fixed at construction | Second copy of membership; must not stay a separate picture |
| AF-04 | `local/flat-team-execution-context.ts:50-60`; `local/flat-team-execution-manager.ts:74-82,288-299` | `FlatTeamExecutionContext.memberContexts` (per-member runtime state: runtime kind, provider binding) is fixed at construction; the manager finds a member's handle and builds Offline status snapshots from it | Third copy; members must be added/removed here too |
| AF-05 | `local/registries/configured-agent-execution-registry.ts:17-70`; `flat-team-member-config-resolver.ts:9-15` | Handles are created lazily per address (`getOrCreate`), resolved from `teamContext.teamNode.children`; `remove(address)` exists and has no caller (grep) | Lazy start fits "first message starts it"; `remove` becomes used (not dead) |
| AF-06 | `local/flat-team-agent-execution-handle.ts:59-127,155-175` | A handle knows `hasOpenExecutionWork()`, `tryPrepareTerminationIfQuiescent()`, `prepareTermination()`, `releaseRuntime()`, `dispose()`; at activation it builds the member context with `hostTeam.handoffs = teamContext.handoffs` | Retire-after-turn uses existing termination steps |
| AF-07 | `agent-communication/services/get-handoff-rules-service.ts:15`; `agent-collaboration/execution/domain/member-execution-context.ts:37-50`; `agent-execution/prompt/collaboration-prompt-sections.ts:147` | `get_handoff_rules` and the prompt's Handoffs section read the member context's frozen `outgoingHandoffs` | For live rules the member context must read the run's current rules |
| AF-08 | `services/agent-team-run-manager.ts:173-205` (495 lines) | `restoreTeamRun` loads the stored package, builds the config from the tree and materializes; no definition read | A stopped run follows its definition here, before materializing |
| AF-09 | `services/agent-team-run-manager.ts:78,242` | `managedRoots`, `listActiveTeamRunIds()`: the live team roots of this process (standalone and delegated copies alike) | Live runs to follow on a definition change |
| AF-10 | `compositions/agent-package-definition-feed-composition.ts:38-44` | One `announce(changedLists)` per definition change: web hub + `agentDefinitionChanges.notifyChanged()` | Server-side trigger; carries list kinds, not IDs |
| AF-11 | `agent-collaboration/definition/collaboration-handoff-compiler.ts:34-47`; `agent-collaboration/collaborators/collaborator-entry-builder.ts:100-137` | A catalog Team copy compiles the definition's rules with `{ kind: "delegated_team" }` at the copy's mount path (addresses prefixed, external `to` kept); a standalone run with `own_team` | The follower compiles exactly as the run was created |
| AF-12 | `agent-collaboration/collaborators/collaborator-source-projector.ts:20-50` | A copy of a configured placement takes the placement's members and the delegating run's rules (launch source origin `configured`) | Such a copy follows its placement, not the Team definition (Org scope, FU-002) |
| AF-13 | Data (read-only), `/home/autobyteus/data/memory/agent_teams/*/team_run_execution_tree.json` | 65 standalone Team runs, 30 Team copies (29 delegated from an agent run, 1 from a team run), 0 from an Org run; old copies (e.g. SemFlow, 2026-10-28) have no `defaultLaunchSource` | Existing copies are catalog copies; a marker cannot be read from old copies | 
| AF-14 | `agent-collaboration/delegation/delegation-index.ts:100-205,384-420` (548 lines); `child-rows-feed.ts:29-35`; `run-history/store/run-own-agents-reader.ts:49-95` | `DelegationIndex` reads each run's parts once (`partsOf`, `membersRead`) and is the one owner of a run's tree rows; changes are reported by `entriesChanged`/`runDeleted` → `subscribeChildRows` → `ChildRowsFeed` → `RUN_TREE_CHANGED`; no notice for "a run's own file changed" | Needs one new notice; the file is over 500 lines and must not grow |
| AF-15 | `agent-execution/domain/agent-run-platform-notices.ts:1-40` | Platform notices are composed sources (skill updates, tool list updates) delivering one notice per input/idle | The team-change notice is one more source |
| AF-16 | grep `rootTeam.members` (14 files) | Current-member readers: collaborators, view projector, run-own `membersOf`, selection mutator, studio model config, remote links, peer launches, application scope, workspace guard. History readers: `team-root-memory-source.ts:55`, `team-run-history-service.ts:151`, run-own `agentsOfMembers`, `participant-messages-reader.ts`/`counterpart-identities.ts` | A removed member must leave current readers and stay in history readers |
| AF-17 | `services/team-run-execution-tree-builder.ts:43,85`; `domain/team-run-config.ts` | Config ↔ tree conversions; config holds current members only | Retired members live only in the tree and every tree write must keep them |
| AF-18 | `agent-collaboration/collaborators/collaborator-launch-resolver.ts` (docs `agent_communication.md` § Launch configuration of catalog copies); commit `8e2d3b76c0` | Member launch: agent default → the Team's resolved launch, validated (runtime available, model offered) | An added member's launch uses the same owner |

## Requirement Implications

- The user's premise "get_handoff_rules reads the current rules" (Task facts) is **not** true: rules are frozen at run start like membership (IF-03, IF-04, IF-05). Handoff rules must follow the definition too, or a new member is unreachable by rule.
- "Appears when first needed" needs no new mechanism: adding the member to the run's saved placements makes it an Offline member, and the first message starts it (BEH-005).
- Both of the user's cases are Team runs with their own tree: a standalone Team run and a delegated Team copy (IF-05, IF-06). Org-mounted Teams use a different saved format (IF-10).
- A definition-change signal exists server-side (IF-11), so running runs can follow without a restart.
- The app's member list (REQ-008) has a server-owned path (IF-18): after the run's file changes, `DelegationIndex` must re-read that run and `ChildRowsFeed` must announce it; no new UI channel is needed.

## Notes For Architecture Design

- Reuse the launch path's definition resolution and handoff compiler (address rewriting for copies, IF-06) rather than a second compiler.
- Tree writes go through the root's persistence lock (`RootTeamRun` boundary, `agent_team_execution.md` § Durable Member Activation).
- Remote links on a delegating peer keep member addresses (collaboration model CM-10): check what happens when a remote Team copy's members change.
