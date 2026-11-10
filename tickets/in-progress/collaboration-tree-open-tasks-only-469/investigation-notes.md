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
