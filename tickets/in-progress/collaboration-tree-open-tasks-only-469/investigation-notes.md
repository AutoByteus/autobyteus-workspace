# Investigation Notes

## Investigation Meta

- Package identifier: `collaboration-tree-open-tasks-only-469`
- Request / ticket: Project Task `autobyteus-469` (Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`); prerequisite PRE-001 of `autobyteus-461`
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/collaboration-tree-open-tasks-only-469`
- Repository mode: `Git`
- Task worktree / branch: the workspace root above / `codex/collaboration-tree-open-tasks-only-469`
- Resolved base remote / branch / revision: `origin` / `personal` / `bff4faa6f664d073ae8e1ccdcb044c91747d8179` (fetched 2026-11-10)
- Finalization target remote / branch: `origin` / `personal` (release only on the user's word)
- Bootstrap result: worktree and branch created; ticket folder `tickets/in-progress/collaboration-tree-open-tasks-only-469/`
- Bootstrap blocker: none
- Current solution revision ID: `SR-001`
- Authorities read (requirements reading gate; file and date): `references/requirements-engineering.md`, `references/finding-the-cause.md`, `references/ticket-scope.md`, `references/handoff.md`, project `DESIGN.md`, `autobyteus-server-ts/docs/design/collaboration_model.md`, `docs/design/data_migration_guideline.md` (all read on 2026-11-10 in this conversation, for `autobyteus-461`)
- Investigation status: requirements investigation done as far as the two decisions that need the user; architecture investigation after approval

## Initial Request And Clarifications

- Original request: Task `autobyteus-469`, created by `/project_task_manager` from the Solution Designer's prerequisite request of `autobyteus-461` (`handoff-waiting-for-prerequisite.md`, attached to the Task). The user, 2026-11-10: "let's first fix the problem regarding the collaboration tree which is constantly growing … if a task agent or agent team is associated with the task itself, why does this tree itself continue to grow"; "the agent or agent team is connected with the task"; "when the task is finished … it is just dismissed".
- Clarifications received: none yet on this Task (no comments).
- User-supplied facts and constraints: the rules of the Task description (an entry exists while a Task its run works on is open; back on reopen or a follow-up Task; no timer for temporary Tasks; runs without a Task keep their entry; all three kinds of top run; a migration drops today's closed entries); what must keep working; out of scope: the hosting of delegated runs (`autobyteus-461`).
- Initial ambiguity: what the user sees of a dismissed run afterwards (the top run's message tab, the Memory page); see DEC-001 and DEC-002.

## Product And Domain Understanding

- Product area: agent collaboration (delegated runs), run storage, Tasks, the run tree and the Team tab in the web client, the Memory page.
- Affected actors or systems: the user; a run that delegates (standalone agent run, team run, org run: the "top run" that hosts every delegated run below it); its delegated runs; the Task side.
- Existing user or operational purpose: one long-lived Project Task Manager run delegates Project Tasks for months.
- Relevant terminology (`collaboration_model.md`): coordinating run (the top run that records and hosts delegated runs), delegated run (copy, task agent, task agent team), Task record (`agent_run_resources.json`), entry (a `taskExecutions` element of a top run's tree; on disk a short link, in memory composed with the delegated run's own file).

## Source Log

| Date | Source Type | Exact Source / Command / Query | Why Consulted | Relevant Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-11-10 | Other | `get_project_task(autobyteus-469)`; its context file `handoff-waiting-for-prerequisite.md` | The direction | As recorded above | Read again before approval and before each handoff |
| 2026-11-10 | Doc | The `autobyteus-461` ticket folder (branch `codex/delegated-copies-outlive-delegator-461`, not pushed): `target-collaboration-contract.md` §11 and §12, `investigation-notes.md`, `design-review-report.md` (AR-001, AR-003) | Rules, earlier findings | §11 L1 … L11 are the rules of this Task; AR-001 and AR-003 name the Task-side and location readers | — |
| 2026-11-10 | Code | `standalone-agent-run-root/persistence/standalone-root-package-store.ts:74-100` | What loading a top run reads | `readMessages` reads the host's own log **and the message log of every task agent listed in the tree**, and composes them filtered by the tree's agents (`agentRunIdsOfTree`); `writeTree` splits composed records into own files and links | The entry list decides what is read and what is shown |
| 2026-11-10 | Code | `run-history/services/team-run-state-package-validator.ts:36-47`, `agent-org-execution/services/agent-org-state-package-validator.ts:28-39` | Whether a tree may lack an agent that a stored message names | Both **throw**: "Message … names AgentRun …, which is not …" when a message endpoint is not an agent of the tree | Removing entries without changing this would make such a team or org run unloadable |
| 2026-11-10 | Code | `run-history/store/task-agent-link-check.ts` (`TaskAgentLinkChecker.isLinked`), used by `agent-memory/services/agent-memory-explorer-service.ts`, `task-team-root-memory-source.ts` | The Memory page | A task agent is listed only while its coordinating run's tree lists it ("detached and not listed" otherwise) | A dismissed run would leave the Memory page |
| 2026-11-10 | Code | `grep -rln "closedTaskExecutions\|closed_task_executions\|listClosedTaskExecutions\|closedTaskExecutionsIn"` in `autobyteus-server-ts/src` | Readers of the closed set | 25 files: the three roots and their managers, the task lifecycle and resource scope, the Task service, the three view projectors, GraphQL history types, the delegated-launch settings of the three roots | With no closed entries in a tree, the "closed set" of a tree is empty by construction |
| 2026-11-10 | Code | `grep -rln "agentRunIdsOfTree\|TaskAgentLinkChecker"`; `grep -rln "CollaborationExecutionLocationService"` | Other readers of "the agents of a tree" | The three message stores and two validators; the Memory services; `context-file-owner-resolver.ts`, `api/rest/context-files.ts`, `general-process-run-supervisor.ts`, `token-usage/providers/token-usage-display-field-capturer.ts`, the standalone token roll-up (`api/graphql/types/token-usage-stats.ts`) | Architecture phase: a decision per reader |
| 2026-11-10 | Code (from the 461 investigation, base `aae0a53a81`) | `root-task-execution-lifecycle.ts:174-321` (`assignToExistingCopy`, `reactivateClosedTarget`), `root-task-execution-resource-scope.ts`, `existing-copy-target.ts` | Reopen and follow-up | Both find the run through the top run's index (`taskExecutionWithIngress`, `resolveExistingCopy`) | They need another lookup once the entry is gone |
| 2026-11-10 | Data | Read-only, counts only (commands in "Runtime, Probe, Or Reproduction Findings") | Size of the problem | See there | — |

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Kind | Supported Trigger Or Governing Contract | Current Supported Product Behavior Path / Lifecycle | Current Outcome / Invariants | Evidence | Confidence / Unknown |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | `delegate_task` | The top run's tree gets an entry for the new run | Entries are only added | Store and adapter code (`Read`); the user's data (`Measured`) | High |
| BEH-002 | Contract | A Task is closed | Its runs are stopped and hidden in the tree; their entries stay | The tree, its index and its message view keep every run | Module docs, code (`Read`) | High |
| BEH-003 | Operational | A top run is loaded (first use after a start, restore, open) | The tree is read; each listed run's own file and message log are read; the index and the message view are built from all of them | Load cost grows with every delegation ever made | Store code (`Read`); `Measured` below | High |
| BEH-004 | Contract | A closed Task is reopened and its assigner messages the run; a follow-up Task by run ID | The run is found in the top run's index and continues | — | Lifecycle code (`Read`) | High |
| BEH-005 | User | The top run's Team tab (messages) | The server composes the top run's own log with the log of every listed run and keeps a message when both its agents are in the tree (`composeMessageLogs`, `agentRunIdsOfTree`). The web client then shows the rows of the focused agent (`CollaborationMessagesPanel.vue`, `rows` = "the focused member's perspective rows"). A stored message holds two agent run IDs and no names; the names come from the tree | — | Store and component code (`Read`); `evidence/team-tab-messages-2026-11-10.txt` (`Measured`); not opened in the app | High for the server, Medium for the client |
| BEH-006 | User | The Memory page's Agents list | Lists a delegated run under its definition while its top run lists it | — | `task-agent-link-check.ts` (`Read`) | High |
| BEH-007 | User | The top run's token total; files attached in earlier conversations | Found through the tree (location service) | — | 461 review AR-003 (`Read`) | Medium (not read line by line) |

## Relevant Codebase And Technical Facts

| Path / Component / Contract | Current Responsibility Or Behavior | Requirement Implication | Architecture Question / Design Implication |
| --- | --- | --- | --- |
| The three tree stores (`standalone-root-package-store.ts`, team tree store, org tree store) | Compose entries on load, split on save | Fewer entries, fewer reads | Who removes an entry when the top run is not loaded |
| Team and org state package validators | Reject a message that names an agent outside the tree | Must accept a message with a dismissed run | Tolerant rule: a message with an agent that is not in the tree is kept in the log and not shown, never a load failure |
| `TaskAgentLinkChecker` | "Listed by its top run" decides Memory page listing | DEC-002 | Another test for "not detached" |
| `RootTaskExecutionLifecycle`, `RootTaskExecutionResourceScope`, the three adapters | Closure release, reopen, follow-up, closed set | Entry removed on closure, re-added on reopen and follow-up | A Task-side lookup from an entry agent's run ID to its record |
| Location services and their consumers | "Every agent below a run" | Token total and attachments unchanged | The Task's records as the source for dismissed runs |
| The three view projectors and the web client's closed-run handling | Hide closed entries | Nothing to hide | What is removed |

## Structural And Payload Surface Inventory

### Payload Or Content Surfaces

- Files, records, documents, catalogs, fixtures, or generated payloads: the three trees (`collaboration_tree.json`, `team_run_execution_tree.json`, `agent_org_run_execution_tree.json`): entries are removed and re-added; no shape change. Task records, run files, message logs: unchanged.
- Existing readers, writers, or contracts that consume them: see the source log.
- Evidence paths: see the source log.

### Structural Surfaces

- Runtime modules, shared interfaces, routes, APIs, persistence boundaries, security/concurrency controls, deployment configuration, or ownership boundaries: the three roots' task execution adapters and tree mutators; the Task side's resource service (a lookup by entry agent); the message stores and validators; the location services; the Memory services; the view projectors; one startup migration; the web client's tree and Team tab.
- Existing structural surfaces that can support the approved behavior: a delegated run restores from its own file (since `delegated-copy-restore-from-own-file`), so an entry can be rebuilt from the link and the run's own file; the Task records are held in memory.
- Evidence paths: `docs/modules/standalone_agent_run_root.md` "Package"; `compositions/project-task-execution-resource-composition.ts`.

### Potential Structural Impacts To Investigate

- API or external-contract change: the views' `closed_task_executions` may become unnecessary (to decide).
- Persistence schema or invariant change: the invariant "every message endpoint is an agent of the tree" goes.
- Security or privacy boundary change: none.
- Concurrency or lifecycle change: an entry's removal and return, also when the top run is not loaded.
- Deployment, migration, ownership-boundary, architectural-pattern, or structural-refactoring change: a startup migration that removes closed entries.
- Confirmed absent, present, or unknown: as stated; details in the architecture phase.

## Runtime, Probe, Or Reproduction Findings

| Method / Command | Scenario | Observation | Established | Requirement Implication | Artifact / Evidence Path |
| --- | --- | --- | --- | --- | --- |
| `python3 -I validate_task_record_as_lasting_record.py ~/.autobyteus/server-data` (461 ticket, `evidence/data-model-validation/`) | The rule on every stored delegated run | 196 delegated runs: 170 with only closed Task records, 11 with an open one, 15 with none (started 2026-08 … 2026-10); the delegator is recoverable for all 170; "every run below a holder" from Task records alone misses exactly the 15 and 1 run assigned by an agent of one of them | `Measured` | The rules are feasible; runs without a Task keep their entry; history readers need Task records plus kept entries | `…/delegated-copies-outlive-delegator-461/evidence/data-model-validation/task-record-validation-2026-11-10.txt` |
| Inline read-only script over the Project Task Manager's run (2026-11-10) | The tree's size | `collaboration_tree.json` 39,840 bytes, 145 entries from 2026-10-08 to 2026-11-10; 134 of closed Tasks, 11 of open ones, 0 of no Task; own files of listed runs: 143 files, 1,570,039 bytes | `Measured` | BEH-003 | Recorded here (counts only) |
| Inline read-only script (2026-11-10) | What a load of that run reads in message logs | The run's own log: 6,303,733 bytes. Logs of listed runs: 133 files, 13,329,598 bytes for closed Tasks; 10 files, 798,002 bytes for open ones | `Measured` | About 15 MB of 22 MB read per load belongs to closed Tasks | Recorded here |
| `evidence/measure_team_tab_messages.py` | The Team tab's content for the manager | Own log: 2,097 messages (1,957 with a run of closed Tasks, 139 with a listed run whose Task is open or that has no Task, 1 with a run not in the tree). Only in the listed runs' logs and shown today when such a member is focused: 2,224 (2,141 inside one delegated team, 83 between two runs; 2,098 from logs of runs of closed Tasks) | `Measured` | DEC-001: keeping every message of the top run's own agent needs no log of a dismissed run | Recorded here |
| Inline read-only script (2026-11-10) | Tasks | 346 Project Tasks with runs (336 fully closed); 15 temporary Tasks (14 closed, 1 open for 19 days) | `Measured` | No timer for temporary Tasks is needed now | Recorded here |

- Temporary diagnostics: `None`.
- Reproduction for implementation to start from: none yet (the growth is today's designed behavior; the architecture phase names the tests that assert it).

## Stakeholder And User Evidence

| Source / Actor | Need, Problem, Or Constraint | Evidence Strength | Requirement Implication | Open Question |
| --- | --- | --- | --- | --- |
| The user | The tree must not grow with every delegation; a run is connected with its Task | Direct decision | REQ-001 … REQ-003 | DEC-001, DEC-002 |

## External Contracts, Standards, And Dependencies

| Contract / Dependency | Version / Authority | Relevant Behavior Or Constraint | Evidence | Unknown / Risk |
| --- | --- | --- | --- | --- |
| Collaboration Model | `collaboration_model.md` | CM-6 (Task ownership), CM-7 (the coordinating run records its delegated runs), CM-8 (links), CM-9 (messages in both runs' logs) | `Read` | CM-7/CM-8 wording changes |
| Data Migration Guideline | `data_migration_guideline.md` | Governs the migration; no lockout; sealed area | `Read` | — |

## Persisted Data And State Facts

- Affected stored or external subject: the `taskExecutions` lists of the three tree files.
- Location and representative shape: an entry on disk is `{address, agentRunId | teamRunId, delegatorAgentRunId, startedAt}` (0 local entries carry other fields; 461 notes).
- Approximate volume: 197 entries on the user's machine, 170 of closed Tasks (157 in standalone runs, 11 in team runs, 2 in org runs).
- Current readers and writers: the three tree stores; readers in the source log.
- Current unknown/extra-field behavior: trees are read tolerantly and written exactly.
- Required semantics or data that must be preserved: every run's own files, conversations, message logs and Task records; a removed entry's facts stay in the Task's record and the run's own file.
- Acceptable loss, reset, rebuild, or regeneration: none.
- Privacy, retention, compliance, downtime, or operational constraints: none.
- Remaining evidence gap: the exact behavior of each reader in the source log's last three code rows.

## Product Design Request Context

- Product Design request in the current input: `Not stated`
- Other fields: N/A — no Product Design was requested.

## Product Design Findings

N/A.

## Supplemental Artifact Inventory

| Artifact Path | Owner | Purpose | Scope | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copies-outlive-delegator-461/tickets/in-progress/delegated-copies-outlive-delegator-461/target-collaboration-contract.md` §11, §12 | Solution Designer (461) | The rules as cases with example files, and their validation | An entry's life | REQ-001 … REQ-003 | Proposed in 461; this Task's rules by the Task description | The user agreed to the rules; the 461 contract as a whole is not this Task's supplement |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Why It Matters | Resolution / Owner | Status |
| --- | --- | --- | --- | --- | --- |
| R-001 | Risk | A team or org run whose message log names an agent that left the tree is rejected by its validator today | Without a change the run cannot be loaded | Design: the validators' rule changes with the removal | Open |
| U-001 | Unknown | What the token roll-up, the attachment locators, restart resume and memory search do with an agent that is not in the tree | REQ-005 | Architecture investigation | Open |
| U-002 | Unknown | The web client's Team tab and tree: where closed runs are handled | REQ-004 | Architecture investigation | Open |

## Architecture Investigation Findings

Not started.

## Requirement Implications

- The entry list is not only a display list: it decides what a top run reads when it loads, which message endpoints a team or org run accepts, what the Memory page lists and where history readers look. The rules of the Task touch each of them.
- The one visible effect, the top run's Team tab (DEC-001), was decided by the user on 2026-11-10: no visible change. The Memory page (DEC-002) is settled by the Task: it is listed under "must keep working", so a dismissed run stays listed there.

## Notes For Architecture Design

- Scenarios SCN-001 … SCN-006 of the requirements doc.
- Start from the readers listed in the source log; R-001 first.

## Architecture Investigation (2026-11-10, after approval at SR-002)

- Authorities read (design reading gate; 2026-11-10): the skill's `references/architecture-design.md`, `references/design-principles.md`, `templates/design-spec-template.md`; the project's `DESIGN.md`; `autobyteus-server-ts/docs/design/collaboration_model.md`; `autobyteus-server-ts/docs/design/data_migration_guideline.md`.
- All paths below are under `autobyteus-server-ts/src/` unless they start with `autobyteus-web/`. All statements are `Read` (code read in this worktree at `bff4faa6f6`) unless marked `Measured`.

### A-1 Where the entries live and how they are written

| Fact | Source |
| --- | --- |
| A tree file holds links `{address, agentRunId or teamRunId, delegatorAgentRunId?, startedAt}`; each run's facts are in its own file. A standalone and a Team tree have one list; an Org tree has the root list and one list per configured Team (older links only: new ones always go to the root list) | `run-history/store/task-agent-own-records.ts:21-41`; `run-history/store/coordinating-tree-shapes.ts:26-92`; `agent-org-execution/services/agent-org-run-execution-tree-mutator.ts:21-40` |
| All three stores read and write through the same two functions: `composeTreeFile` (reads the own file of every listed run) and `splitTaskExecutions` | `run-history/store/task-execution-tree-split.ts:110-167, 181-219, 259-281`; callers `standalone-agent-run-root/persistence/standalone-root-package-store.ts`, `run-history/store/team-run-execution-tree-store.ts`, `run-history/store/agent-org-run-execution-tree-store.ts` |
| A save never removes an on-disk entry it did not load: an entry missing from the in-memory tree is written back unchanged | `task-execution-tree-split.ts:202-215` (rule L6 in the file header) |
| A link can be rebuilt from the run's own file: the own file holds `taskAgent.address`, `taskAgent.delegatorAgentRunId`, `taskAgent.coordinatingRun` and the start time (`startedAt`; a Team's `createdAt`) | `task-agent-own-records.ts:43-140` (ASM-001 confirmed for local runs) |
| A link to a run on another node is stored whole in the tree and has no file on this node | `run-history/store/remote-task-execution-links.ts:11-17`; `collaboration_model.md` §3 |
| A record whose delegator is not in the composed tree is left out with a warning | `task-execution-tree-split.ts:147-165` |

### A-2 Closure today

| Fact | Source |
| --- | --- |
| The Task side is the only authority for "closed": a run is closed when its current Task entry is closed (its open entry, else its latest). It keeps an in-memory index of closed runs per host root | `agent-collaboration/execution/task/task-execution-resource-port.ts:60-70`; `projects/services/task-execution-resource-service.ts:202-204, 319-336` |
| DONE or CANCELLED asks the host root, when it is active, to release the closed runs; nothing is persisted and a root that is not active is skipped | `projects/runtime/task-execution-resource-release.ts:8-31`; `compositions/project-task-execution-resource-composition.ts:60-61` |
| The release is one queue step of the root: it publishes "closed" first, cancels, then invokes every exact release; a run on another node is fenced, not stopped | `root-task-execution-lifecycle.ts:262-269`; `root-task-execution-resource-scope.ts:90-128` |
| Every reader hides closed runs by asking the Task side at read time (`closedTaskExecutionsIn` filtered by "is in the tree") | `task-execution-closure.ts`; `root-task-execution-resource-scope.ts:81-83`; `standalone-agent-run-root-manager.ts:436-440`; web `utils/collaboration/taskExecutionClosure.ts` |

### A-3 Reopen and follow-up Task today

| Fact | Source |
| --- | --- |
| `send_message_to(run ID)`: each root first refuses a run ID that is not in its index (`TARGET_AGENT_RUN_NOT_FOUND`), then the lifecycle reactivates a closed target: its ingress is looked up in the index, the Task side checks assigner and Task state, and one queue step settles the old stop and commits the reopen | `standalone-root-message-delivery.ts:175-187`; `agent-team-execution/services/team-run-message-delivery.ts:127`; `agent-org-execution/services/agent-org-run-message-delivery.ts:127`; `root-task-execution-lifecycle.ts:293-340` |
| `delegate_task` with a run ID: the copy is resolved in the root's tree; one that is not in the tree but is a closed copy the Task side records for this root already gets the Task side's specific refusal | `root-task-execution-lifecycle.ts:174-237` |
| A task agent cannot give a saved Task to anyone (`TASK_AGENT_RESOURCE_OWNED_SENDER`); what it delegates joins its own Task. So a nested run never has an open Task while its delegating run has none | `root-task-execution-lifecycle.ts:181`; `collaboration_model.md` CM-6; `Measured`: 0 such cases, `evidence/unlink-cases-2026-11-10.txt` |
| Only an `assigned` entry can be reactivated or given a follow-up Task; sub-work runs stay closed when their Task is reopened | `task-execution-resource-port.ts:74-94` |

### A-4 What the user sees of a closed run today

| Surface | Today | Source |
| --- | --- | --- |
| Run tree rows | Hidden | web `services/agentCollaboration/agentRunCollaborationContext.ts:287-296`; `services/teamExecution/teamExecutionViewState.ts:238-243`; `services/agentOrgExecution/agentOrgExecutionContext.ts:134` |
| Task page | A muted "Offline" line that cannot be opened (`openable` needs `!root.closed`) | web `utils/projects/taskRootPresentation.ts:40-46` |
| A focused closed run | Focus leaves it | web `teamExecutionViewState.ts:245-258`; `agentOrgExecutionContext.ts:352-360` |
| Team tab | One participant's messages, read when shown. A message is returned when both its agents are agents of the tree; the web drops a row whose counterpart it cannot name. The name is the leaf of the member's own address ("solution designer"), which only the run's own file holds: the Task record holds the delegated address ("/software_engineering_team") | `api/graphql/types/collaboration-participant-messages.ts:49-70`; web `services/collaborationMessages/participantMessageRows.ts:13-30`, `agentRunCollaborationContext.ts:363-388`; `Measured` shapes in the Team-tab evidence file |
| Attachments of a message | Served from the root's message snapshot by message ID | `api/rest/agent-collaboration-references.ts:22-24` |
| Memory page and memory search | A delegated run is found through its own file and listed while its coordinating run's tree lists it | `agent-memory/services/agent-memory-explorer-service.ts:137-147`; `agent-memory/services/task-team-root-memory-source.ts:77-83`; `run-history/store/task-agent-link-check.ts` |
| A standalone run's token total | Host plus the agent runs of its tree, read at request time | `api/graphql/types/token-usage-stats.ts:324-340`; `token-usage/services/` `StandaloneRunTokenUsageSummaryService` |
| A Team or Org run's token total | By the root recorded on each usage row | `token-usage/providers/token-usage-run-store.ts:50-54` |
| A run's last activity in the run list | Latest activity over the agents of its tree | `run-history/services/run-last-activity-reader.ts:63-79` |
| A run on another node | Stays listed after its Task is closed | web `agentRunCollaborationContext.ts:288-289` |

### A-5 Message view and validators

| Fact | Source |
| --- | --- |
| A stored view is the run's own log plus the log of every listed run, keeping a message only when both its agents are in the tree's agent set | `run-history/store/task-agent-message-logs.ts:133-152`; `task-execution-tree-split.ts:309-327` |
| The Team and Org package validators run on that composed set and throw when a message names an agent outside the set. They do not see filtered messages, so an entry that leaves the tree does not make a run unloadable (R-001 corrected); they do have to change when the view keeps more messages | `run-history/services/team-run-state-package-validator.ts:36-47`; `agent-org-execution/services/agent-org-state-package-validator.ts:28-39` |

### A-6 Web client and events

| Fact | Source |
| --- | --- |
| "closed" and "reopened" events must name an execution the client's tree knows: otherwise the agent-run and Org contexts fail the view and the Team view throws | web `agentRunCollaborationContext.ts:172-191`; `agentOrgExecutionContext.ts:242-258`; `teamExecutionViewState.ts:412-429` |
| "started": the agent-run and Org contexts reload the view; the Team view inserts the execution | web `agentRunCollaborationContext.ts:164-166`; `agentOrgExecutionContext.ts:238-241`; `teamExecutionViewState.ts:385-392` |

### A-7 Measurements on the user's data (read-only, counts only)

`evidence/measure_unlink_cases.py` → `evidence/unlink-cases-2026-11-10.txt`: 195 local links in 26 trees (standalone 170, Team 20, Org 5): 170 of closed Tasks, 25 of an open Task or of no Task. 2 links to a run on another node (1 closed, 1 open). 32 nested links; 4 where the nested run is closed and its delegating run stays; 0 where a nested run stays under a closed delegating run. 2 Org links sit in a configured Team's list (the older shape).

### A-8 Migration conventions (Data Migration Guideline, read in full)

- Section 2 item 1: migrate only for a change of meaning, a stored name, or a new required fact; prefer what the normal reader and writer absorb. Section 1: nothing at startup may depend on history. Section 6: do not validate history at startup.
- Predecessors that touched the same files: `20261017_task_agent_own_run_v1` (links plus own files), `20261019_delegated_copy_own_file_complete_v1`, `20261018_append_only_message_logs_v1` (`collaboration_model.md` §5). Their output is the link shape of A-1; no predecessor leaves closed and open links in different shapes.
- Result: the stored shape does not change. Removing a closed link is an ordinary lifecycle step that the root also needs for a Task closed while the root was not loaded (the user closes a Task on the Task page while the manager run is stopped). The same step removes the closed links that exist today, the first time each run is loaded. No migration is designed (design spec, Persisted Data decision).

### Corrections to earlier notes

- R-001 as first written ("a Team or Org run becomes unloadable") is wrong: see A-5.
- BEH-005: the Team tab is per participant and read when shown (A-4), not part of the root's load.
- U-002 is answered by A-4 and A-6.

### Open unknowns for implementation

| ID | Unknown | Why it matters | Owner |
| --- | --- | --- | --- |
| U-003 | A live root's in-memory message list after an unlink: whether any step re-checks it against the tree | D-5 keeps own-log messages with unlinked runs | Implementation Engineer (a test that closes a Task and then appends and saves a message) |
| U-004 | Relinking one of the 2 older Org links that sat in a configured Team's list puts it in the root list, so the root restores it | The host of a restored run | Implementation Engineer (a test on that shape) |
| U-005 | The Team and Org counterparts of each standalone step were mapped by name and by their shared functions, not read line by line | Design rows for those two kinds | Implementation Engineer; Architecture Reviewer |
| U-006 | Whether the three readers that serve a message's attached file admit a message by "both agents are in the tree" | D-5: an attachment of a message with an unlinked run must still open (AC-007, AC-011) | Implementation Engineer (read `api/rest/agent-collaboration-references.ts`, `agent-org-reference-content-service.ts`, `team-communication-projection-service.ts`; give them the reader's rule when they do) |

## The Task-Record Model (2026-11-10, after the user's decision DEC-009)

The user asked why a top run stores a list at all when the Task record holds the same relationship, and decided that it should not (DEC-009). SR-003's design is withdrawn; the Architecture Reviewer stopped its review without a report and sent observations, used below.

### B-1 What a Task record holds (`Read` and `Measured`)

| Fact | Source |
| --- | --- |
| One file per Task, `agent_run_resources.json`: `{ taskId, agentRunResources: [entry] }`. Every entry, of every role, has `hostRoot { kind, runId }` (the top run), `agentRun` (`{kind:"agent", agentRunId}` or `{kind:"team", teamRunId, coordinatorAgentRunId}`), `linkedAt`, `start`, `closedAt`. An `assigned` entry also has `assignedBy` and usually `recipientAddress` | Field names read from the user's files (no content): 378 `assigned`, 28 `delegated`, 2 `broughtIn`; `start`: 406 `started`, 2 `failed` |
| The server reads every record once at startup into memory and keeps, per run, its current entry (newest open, else latest) and, per top run, an index of the runs whose current entry is closed | `compositions/project-task-execution-resource-composition.ts:47-54`; `projects/services/task-execution-resource-service.ts:202-204, 313-336` |
| A link's four fields are all in the run's own file (A-1), so a tree record can be composed from the run reference and the own file alone | `run-history/store/task-agent-own-records.ts:43-140` |
| 362 record files, 281 KB, the largest 2.6 KB, for five weeks of use | `Measured` 2026-11-10 |

### B-2 What the Task records cannot supply

| Case | Count (`Measured`, `evidence/links-without-task-2026-11-10.txt`) | Decision |
| --- | --- | --- |
| Local links of a run with no Task record | 14 (started 2026-08-18 … 2026-10-13; under 8 top runs: 2 standalone, the rest Team and Org) | They leave the tree (DEC-008, the user) |
| Local links of a run with an open Task | 11, all `start: started` | In the tree |
| Local links of runs of closed Tasks only | 170 | Not in the tree |
| Links to a run on another node | 2; the Task record holds the run and coordinator but not the node or the other members | Stay stored (DEC-003) |

### B-3 Who reads a stored tree

The three stores are constructed with their defaults in 19 places in 15 files (corrected by the review; listed in B-5) (grep of `new StandaloneRootPackageStore(`, `new TeamRunExecutionTreeStore(`, `new AgentOrgRunExecutionTreeStore(`): the three managers, the three location services, the history and catalog services, the Team communication projection, the collaborator port resolver, `run-history/services/root-run-package-current-validator.ts`, `run-history/maintenance/collaboration-run-history-index-repair.ts`, `application-platform/execution/application-execution-scope-kernel-builder.ts`. All of them compose through `composeTreeFile` / `composeTreeFileSync` (A-1), some synchronously.

### B-4 The Architecture Reviewer's observations (message of 2026-11-10; no report was written)

| Observation | Use |
| --- | --- |
| The 461 contract (revision 2) removes `hostRoot` from the Task record, while this model looks runs up by it | This ticket keeps the Task record's shape. `autobyteus-461` must revise that part of its contract when it resumes: the Task record is now the only index of local delegation, so an entry has to keep naming the run it is found under (design spec, "Relationship to autobyteus-461") |
| Stopped-run Settings of a delegated copy read and write the stored tree (`standalone-agent-run-root-manager.ts:356-424`; `agent-team-run-manager.ts:271-310, 388-394`) | They use the store's read and save, so they get the same source as the view; the save writes own files only |
| `StandaloneRootLocationService.listAgents` has six callers, among them the token total; its comment names converted collaborators, which have no Task | Design D-7; DEC-008 states the consequence for the 2 standalone cases |
| Tree-file existence is a weak presence signal for the Memory page | Design D-6 uses the coordinating run's own file |
| `team-run-history-service.ts:73,82`, `RootRunPackageReadinessIndex`, the index repair read stored trees | B-3; U-007 |
| Web: "closed" and "reopened" for an unknown execution fail the view | Design D-8 |
| SR-003 had no section defining D-1 … D-9; "migration" wording remained in the requirements; note statuses were stale | Fixed in SR-004 |

### Status of earlier items

R-001: corrected (A-5). U-001, U-002: answered (A-4, A-6). ASM-001: confirmed. "Architecture Investigation Findings: Not started" in the first part of this file is superseded by the sections "Architecture Investigation" and this one.

### Open unknowns for implementation (replaces the earlier list)

| ID | Unknown | Why it matters | Owner |
| --- | --- | --- | --- |
| U-003 | A live root's in-memory message list after a run is dropped: whether any step re-checks it against the tree | D-5 | Implementation Engineer |
| U-004 | Settled 2026-11-10 (`Measured`, read-only): both older Org links in a configured Team's list belong to runs with no Task record, so they leave the tree (DEC-008) and no open run was hosted by a configured Team | — | Closed |
| U-005 | The Team and Org counterparts of each standalone step were mapped by name and through their shared functions, not read line by line | Design rows for those kinds | Implementation Engineer; Architecture Reviewer |
| U-006 | Whether the three readers that serve a message's attached file admit a message by "both agents are in the tree" | D-5 | Implementation Engineer |
| U-007 | Settled by B-5 (review finding AR-001): the startup admission scan and the maintenance repair read trees without the Task records; they read the run's own parts only (D-11) | — | Closed |
| U-008 | Whether an entry with `start: "starting"` can exist after a restart, and whether a run with an open `failed` entry and an own file is in the tree today | D-1's candidate rule | Implementation Engineer |
| U-009 | Whether a history index row projected from a tree's own parts equals the row projected from the composed tree (`projectTeamRunHistoryIndexRow`, the Org equivalent) | D-11: the maintenance repair reads own parts | Answered by the Architecture Reviewer's reading in ARCH-REV-002: both row projectors use own parts only. The Implementation Engineer keeps a test of it |

### B-5 Startup order and every construction site of the three tree stores (after review finding AR-001)

`Read`: `server-runtime.ts:172-197`, `standalone-application-host/start-standalone-application-host.ts:155-242`, `compositions/build-studio-server.ts:118-329`, `run-history/services/root-run-package-current-validator.ts` (whole), `run-history/services/root-run-package-readiness-index.ts:24-82`, `run-history/maintenance/collaboration-run-history-index-repair.ts:26-62`, `scripts/repair-collaboration-run-history-index.mjs`.

Order in both entry points: app-data migrations → `RootRunPackageReadinessIndex.rebuild()` (`server-runtime.ts:184`; `start-standalone-application-host.ts:166`) → definition and package services, definition admission scan, workspace manager, MCP host, credential proxy, provider factory, model catalog → `composeProjectTaskExecutionResources` loads the Task records (`build-studio-server.ts:329`; `start-standalone-application-host.ts:242`) → run supervisor, run managers, API, application runtime, restart resume.

The rebuild calls `RootRunPackageCurrentValidator.scan()`, which reads every Team tree (`:190`) and every Org tree (`:216`) through the stores and validates their structure; a thrown read marks the package `ROOT_RUN_PACKAGE_CURRENT_VALIDATION_FAILED` (`:194-196`, `:221-223`) and the run is then refused (`agent-team-run-manager.ts:178-181`). Its own comment says "Structure only". A standalone run is admitted from its metadata alone (`:140-156`). Today this scan also reads the own file of every delegated run each Team and Org tree lists.

Nothing between the rebuild and the Task record load constructs a tree store (the two ranges were read: definitions, packages, MCP, credentials, models only).

| Construction site (19 in 15 files) | When it reads a tree | Relative to the binding |
| --- | --- | --- |
| `run-history/services/root-run-package-current-validator.ts:71, 73` (Team, Org) | Startup rebuild; later `scanOne` when a run is created | **Before** (rebuild); after (`scanOne`) |
| `run-history/maintenance/collaboration-run-history-index-repair.ts:50, 51` (Team, Org) | A maintenance script in its own process | **Never bound** |
| `agent-team-execution/services/agent-team-run-manager.ts:121` | Run creation, restore, inspection | After |
| `agent-org-execution/services/agent-org-run-manager.ts:103` | Same for Org runs | After |
| `standalone-agent-run-root/services/standalone-agent-run-root-manager.ts:137` | Same for standalone runs | After |
| `run-history/services/team-run-execution-tree-location-service.ts:55`, `agent-org-execution/services/agent-org-execution-tree-location-service.ts:46`, `standalone-agent-run-root/services/standalone-root-location-service.ts:59` | Request-time lookups (context files, token usage, memory, last activity, process supervisor) | After |
| `run-history/services/team-run-history-service.ts:59`, `team-run-history-catalog-service.ts:61`, `agent-org-run-history-catalog-service.ts:40`, `collaboration-root-history-service.ts:34` | History and catalog requests | After |
| `services/team-communication/team-communication-projection-service.ts:43` | Team tab and attachment requests | After |
| `api/graphql/services/collaborator-root-port-resolver.ts:39, 45, 62` | GraphQL requests | After |
| `application-platform/execution/application-execution-scope-kernel-builder.ts:180` | The application runtime, which `buildStudioServer` creates after line 329 | After (`Inferred` from the read range; a start on data with Team and Org runs is in AC-008) |

Also `Measured` 2026-11-10: both links to a run on another node were delegated by the top run's own agent; none was delegated by an agent of a local delegated run.

### B-6 The Implementation Engineer's early checks (message of 2026-11-10; Design Impact on D-1's rule)

Verified by the Solution Designer at the base revision for the first row; the others are the engineer's readings.

| Check | Answer | Source |
| --- | --- | --- |
| U-008 | **Against SR-005's rule.** Every entry is created `starting` (`entryOf`), for a new copy and for a follow-up Task given to an existing copy (`linkExistingTaskExecution`). A new copy's order is: Task entry (`starting`) → activation commit (own file) → seed accepted → `markStarted`. So an entry is `starting` while the run already exists and may already work, and stays `starting` after a crash between the commit and `markStarted`; nothing settles it at startup. For an existing copy the new `starting` entry is its current entry until the work is delivered. A rule that leaves out `starting` would drop runs that are in the tree today, also from the stored reads made while the root is loaded (`api/rest/context-files.ts:45-46`, `general-process-run-supervisor.ts:104-108`, `token-usage-stats.ts:329`). A run with an open `failed` entry and an own file is in the tree today, as the design keeps it | `projects/domain/task-execution-resources.ts:70-104`; `agent-collaboration/execution/task/root-task-dispatch.ts:59-81`; `root-task-execution-lifecycle.ts:199-221`; `task-execution-resource-service.ts:317-333` |
| U-003 | As expected: a loaded root's message list changes only by appends (`root-communication-engine.ts:67, 236`); nothing re-checks it against the tree, so the adapters' trim is needed | The engineer's reading |
| U-006 | The three attachment readers find the message by ID in the root's records and apply no tree rule (`agent-collaboration-references.ts:22-31`, `agent-org-reference-content-service.ts:70`, `team-communication-projection-service.ts:55-70`); they need no change | The engineer's reading |
| U-009 | Both history row projectors use own parts only | The Architecture Reviewer's reading (ARCH-REV-002) |
| U-005 | In progress, file by file | — |

Decision (SR-006): the candidate rule is "the run's current entry names this top run and is open, whatever its `start`". A missing own file is silent for `starting` and `failed`, a warning for `started`.
