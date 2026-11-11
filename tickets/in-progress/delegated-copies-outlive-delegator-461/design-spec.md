# Design Spec

## Solution And Approval Basis

- Current solution revision ID: `SR-017` (scope widened by the user to team and org runs, TC-4 revised). A new design on the 469 base. It replaces the design of SR-010, which was built on contract revision 2 and failed architecture review ARCH-REV-001 (AR-001 … AR-010, answered below).
- Approved requirements baseline, who approved, and approval reference: `requirements-doc.md` with `target-collaboration-contract.md` revision 5. Every contract decision was taken by the user on 2026-11-11: TC-4 (revised), TC-7, TC-8, TC-9, TC-10, DEC-011 (quotes in `solution-revision-record.md` SR-014 … SR-016).
- Behavior-defining supplements: `target-collaboration-contract.md` revision 5.
- User approval of the design: **`Pending`**. The user (2026-11-11): "after you finish your work, then tell me stop there and then I will review myself as well". Not sent to architecture review.
- Design status: `Draft — for the user's review`.
- Canonical investigation notes: `investigation-notes.md`.
- Authorities read (2026-11-10, 2026-11-11): the skill's `references/architecture-design.md`, `references/design-principles.md`; `DESIGN.md`; `collaboration_model.md`; `data_migration_guideline.md`; the 469 design.
- Base: `origin/personal` `827f1e68dc`.

## The Idea

Today a top run hosts every run delegated below it: one process, one index, one queue. Hosting gave two things at once:
1. An index of who belongs with whom.
2. Control over the delegated runs' life.

The second is the Stop bug and is wrong in the domain: you delegate a Task to someone, and you do not decide their life (the user, 2026-11-11). This design keeps the first and drops the second:

- **Every run is its own run**, with its own root, and its own start, Stop, idle shutdown and wake. Its life is bound to its Task, never to the run that delegated it (contract P6).
- **The Task record holds the delegation** (`delegatedFrom`, one hop). It decides which runs a run shows under it, and who may message whom (contract §10).
- **The index lives with the Task records.** The Task side owns them, builds the index in memory at startup, and keeps it current. It owns no run.
- **A root contains its own run only.**

The target shape already exists: a run a peer delegates to this node is an ordinary run with its own root, idle shutdown and wake. Local delegation adopts that shape and its code.

## Current-State Read

| Concern | Today | Source |
| --- | --- | --- |
| Hosting | A `StandaloneAgentRunRoot` owns `rootAgents` and `teams` registries; every new local copy is placed at the root; `stop()` ends every child, then the host | `standalone-root-builder.ts:113, 121`; `standalone-root-task-execution-adapter.ts:121-141`; `standalone-agent-run-root.ts:435-466` |
| Copy lifecycle and ordering | `RootTaskExecutionLifecycle` (one per root): admission, one FIFO for every copy's transitions (activate, wake, idle shutdown, Stop, closure release, reopen), the idle schedule, live leases | `agent-collaboration/execution/task/root-task-execution-lifecycle.ts` |
| A root's own ordering | Every operation of a standalone root runs in its `RootOperationGate` | `standalone-agent-run-root.ts:102, 146, 249-342` |
| Tree | Since 469, composed in memory from open Task entries keyed by `hostRoot` and each run's own file | 469 D-1 … D-3 |
| Messages by run ID | Same root: the root's index, which wakes a copy. Else: an active run only | `global-agent-run-message-router.ts:60-110` |
| Messages by address | Own team, then the top run's standing agents | `message-recipient-resolution.ts:58-78` |
| Task closure | The Task side groups the closed runs by `hostRoot` and asks that root to release them | `projects/runtime/task-execution-resource-release.ts` |
| Independent delegated runs (peer-started) | An ordinary standalone run or top-level team run with `delegatedFrom`; idle shutdown (`StandaloneHostIdleShutdown`, `RemoteTeamIdleShutdown`); restored by an inbound message (`CollaborationRootResolver.resolveOrRestore`) | `remote-delegation-receiver.ts`, `remote-team-run-starter.ts`, `standalone-host-idle-shutdown.ts`, `remote-team-idle-shutdown.ts`, `compositions/collaboration-root-resolver.ts` |
| A remote child in the manager's view | Its status from a summary; its live output becomes the view's `agent_presentation` while someone watches; its conversation is read from its own run | `services/agent-streaming/agent-collaboration-view-projector.ts:68-73` (N-402); CM-11 |

## Scope

The user (2026-11-11): "I think we can do the agent team and agent organization in this task as well. We don't have to separate because it's kind of not so easy to have like intermediary states."

| Part | This ticket |
| --- | --- |
| Data model (contract rev. 5), for all stored data, one migration | Yes |
| Delegations made from a **standalone agent run**, a **team run** (a team the user started, a delegated team run, a peer-started team run) and an **org run** (a direct agent, a member of a mounted team): the delegated agent or team run is its own run | Yes |
| Messages centered on the Task, for every run | Yes |
| Removing the hosting code | Yes, all of it: no run hosts another afterwards |
| Inside one team run or org run (its members, handoff rules, messages by address) | Unchanged: they are parts of one run |
| Termination of an application-owned run by its application | Unchanged (DEC-006) |

There is no in-between state: after this ticket the codebase has one model.

## Task Size And Architectural Risk

- Task size: `Large`, and larger than the standalone-only scope. It also covers the team and org roots: `RootTeamRun` and `AgentOrgRun` delegation; the team side's task delegation (`agent-team-execution/task-delegation/`, about 1,100 lines with the org adapter); the registries of hosted copies (`task-agent-execution-registry.ts`, `task-team-execution-registry.ts`); the hosted-children part of the termination scopes (`flat-team-execution-manager.ts:275-296`, `agent-org-run.ts:380-384`); the web's team and org views of delegated children.
- Architectural risk: `High`. It changes persistence, ownership boundaries (no hosting anywhere), ordering (each run's own gate), and shared contracts (the Task entry, the stream and view DTOs of all three kinds of run).
- What the wider scope removes: the period with two models, and the duplicated hosting machinery of three root kinds.
- Escalation trigger: a reader of a removed field not in the table "Readers Of Removed Or Renamed Fields"; a message route that works today and the Task rule refuses for a run that has a Task; an ordering guarantee in "Ordering Without A Shared Queue" that the code cannot give.

## Names, By Owner

Each new name says what its owner owns.

| Name | Owner | Owns |
| --- | --- | --- |
| Task-side port methods `runOfAgent(agentRunId)`, `delegationOf(run)`, `assigningRunOf(taskId)`, `openRunsDelegatedFrom(run)` | The Task side (`TaskExecutionResourceService` behind `TaskExecutionResourcePort`) | The answers about the Task records. It loads them at startup and changes them on every delegation, closure and reopen, so it keeps the index. Callers only ask |
| `TaskRunIndex` (private to `projects/services/`, only if the service file needs the split) | The Task side | The in-memory maps over the entries: by entry agent, by run, by delegating run, by Task. Built from the records at startup (whether or not any run runs), updated with each change. A non-coordinator team member is read once from that team's own file and kept (members never change) |
| `TaskMessageScope` (`agent-collaboration/communication/`) | Collaboration messaging | The Task rule for a message between two runs (contract §10.2), and the route to the receiver. Named after the existing "Task-linked message scope" (`agent_communication.md`). It asks the Task side's port |
| `TaskDelegation` (`agent-collaboration/execution/task/`) | Delegation | `delegate_task`'s order for a new run (Task entry, start, work packet, `markStarted`) and for an existing run (follow-up Task). Root-neutral: the standalone, team and org roots all delegate through it |
| `DelegatedRunStarter` (`agent-collaboration/execution/delegation/`) | Starting a delegated run | Creating an ordinary agent run or team run for a delegation, with its resolved launch, address and `launchSource`. Extracted from the peer path's two starters, which keep only peer concerns |
| `DelegatedRunIdleShutdown`, `DelegatedTeamIdleShutdown` | The delegated run's own root | Its idle schedule. Today's `StandaloneHostIdleShutdown` and `RemoteTeamIdleShutdown`, renamed because they now serve every delegated run, not only peer-started ones |

## Data-Flow Spines

| ID | Scope | Start → End | Governing owner |
| --- | --- | --- | --- |
| DS-1 | Primary | `delegate_task` by an agent of any run (standalone, team, org) → a new run working on the Task | `TaskDelegation` |
| DS-2 | Primary | `send_message_to(run ID)` to another run → delivered, receiver woken | `GlobalAgentRunMessageRouter` with `TaskMessageScope` |
| DS-3 | Primary | `send_message_to(address)` beyond the sender's own run → delivered | The sender's root resolution, then DS-2 |
| DS-4 | Primary | The user stops a run → that run only | The run's own root |
| DS-5 | Primary | Task DONE/CANCELLED (or deleted) → each run of it stops | Task side → each run's own root |
| DS-6 | Primary | Reopen + the assigner's message, or a follow-up Task → the run continues | DS-2 / `TaskDelegation` + the Task side |
| DS-7 | Bounded local | A quiet delegated run → shut down; next message restores it | The run's own idle shutdown |
| DS-8 | Primary | The user opens a run → its rows (one hop) with status and live output | The run's view projection |
| DS-9 | Operational | Update restart → busy runs resumed | `RestartResumer` |
| DS-10 | Operational | First start after the update → stored data converted | One app-data migration |

### DS-1 Delegate to a new run

`agent: delegate_task(address) → the sender's root, whatever its kind: StandaloneAgentRunRoot, RootTeamRun or AgentOrgRun (its gate) → TaskDelegation.toNewRun → Task side: linkNewTaskExecution (entry: delegatedFrom = {this run, the delegator}, start "starting") → DelegatedRunStarter: prepare an ordinary standalone run (agent) or create a top-level team run (team) → the new run's root registered in ActiveCollaborationRootDirectory → the work packet delivered to its entry agent (DS-2's delivery step, which starts it) → Task side: markStarted → tool result, same text as today`

- Refusals keep today's texts and order: CM-1 (never inside one's own team), the Project folder, the target, the launch.
- `delegatedFrom.delegatingRun` is the sender's own run: for a member of a team run, that team run; for an agent of an org run, that org run (contract §2.1, cases D1 … D6).
- A failure after the entry was written: `markFailed`, and the new run is terminated before the answer. That is today's order.
- The work packet must name the delegator as today, because it is the record of the delegation that the run carries in its conversation (contract §6, "Delete a Task").

### DS-2 Message by run ID

`sender's agent: send_message_to(run ID) → GlobalAgentRunMessageRouter:`
1. **The same run:** the sender's own root, as today (teammates of a team run, agents of an org run).
2. **Another run:** `TaskMessageScope.route(sender, target)`:
   - `runOfAgent(target)` finds the run.
   - Admit by contract §10.2: same open Task, or the assigner's run. A closed Task is refused, except the assigner's reactivation (DS-6).
   - `CollaborationRootResolver.resolveOrRestore(that run)`, then `root.deliverExactAgentMessage` in its gate. The gate re-checks the Task rule at its head, then wakes the agent, delivers, and writes both runs' logs.
3. **Live-only**, as today.

`TaskMessageScope` is the one owner of "may these two runs talk, and where is the receiver" (Principle 13). It answers from memory: nothing is resumed to find a receiver, also after a restart.

### DS-3 Message by address

`sender's root: resolveMessageRecipient → (1) own team, unchanged → (2) its own run's standing agents, unchanged → (3) new: the standing agents of the run that assigned the sender's Task: TaskMessageScope.assigningRunOf(sender run) → that run's root resolves the address → DS-2's delivery step`

### DS-4 Stop

`user: Stop → the run's service (agent run, team run or org run) → that run's root.stop() in its gate → its own agent, its own team members, or its own org units, only`

Nothing else stops (TC-1). A delegated run's later report wakes its stopped delegator (DS-2).

### DS-5 Task closure

`update_task DONE → ProjectTaskService → TaskExecutionResourceRelease: for each closed run of the record → that run's own root, by the run's identity → root.stopForTaskClosure() in its gate → stopped`

- A peer's run is fenced, as today.
- Views drop the run (469).
- Deleting a Task: its open runs are stopped first, then the record goes, and the runs are ordinary runs (contract §6).

### DS-6 Reopen and follow-up

`assigner: send_message_to(run ID) → DS-2: TaskMessageScope sees a closed entry whose assigner is the sender → Task side: reopenAssignment → the run's root, in its gate: re-check open, restore, deliver`

A follow-up Task by run ID: `TaskDelegation.toExistingRun` → Task side `assignExistingTaskExecution` → the same delivery.

### DS-7 Idle shutdown

`the run's own agent status → DelegatedRunIdleShutdown / DelegatedTeamIdleShutdown → at the grace end, in the run's gate: shut down if quiet → the next message restores it (DS-2)`

### DS-8 View

`user opens run X → X's root view: its own parts + child rows from openRunsDelegatedFrom(X) (one hop; the run's own file gives address and members) → each child's status from its own root when active, "offline" otherwise → while someone watches, a child's live output becomes the view's agent_presentation, through the path a remote child uses today (N-402) → the client shows the rows under the delegator agent`

- Opening a view never starts a run (REQ-004, AR-008).
- A child's conversation is read from its own run, as for a remote child.
- The web keeps today's rows and selection. A local child is shown the way a remote child already is.

### DS-9 Update restart

- Each busy run is recorded under its own root.
- The resumer resolves and resumes each root, bottom-up along `delegatedFrom` (a delegated run before its delegator), so a report wakes nothing twice (REQ-008, AR-004).

### DS-10 Migration (one app-data migration, in the sealed area)

| Step | Source | Target |
| --- | --- | --- |
| 1 | Task entry `hostRoot`, `assignedBy` | `delegatedFrom { delegatingRun: the delegator's run (one hop), delegatorAgentRunId }`. 375 entries take today's `hostRoot`; 31 nested entries take the delegated run the delegator is a part of |
| 2 | role `delegated` | `subWork` (28) |
| 3 | Peer link in a standalone tree (2) | `nodeId`, and `members` for a team, on its Task entry |
| 4 | `taskAgent` on 196 runs | Removed. Agent run: `address` and `launchSource` → `run_metadata.json`. Team run: `rootTeam.defaultLaunchSource`. `userLaunchSelection` (9): becomes the run's own launch; the edited agent's `launchSource` is dropped (today's display shows no origin for an edited agent) |
| 5 | Standalone `collaboration_tree.json` (8) | `host.address` → `run_metadata.json` `address`; the file removed; the message log stays |
| 6 | Team and org `taskExecutions` and `remoteTaskExecutions` lists | Removed |
| 7 | Busy-run record left by an interrupted update | Each entry under its own run's root |

Rules:
- Task records are converted before the run files they name. Each file is written atomically.
- A run or Task that cannot be converted is left intact and reported, and the app starts (DESIGN.md rule 7).
- Frozen copies of every source shape live in `frozen/`.
- Fixtures cover each contract case E1 … E10 and each partial state of a released migration (469's AR-002 and SR-007).
- Admission at startup reads own files only (469 D-11). The migration runs before it.

## Ordering Without A Shared Queue (was U-A)

Today one queue per top run orders every transition of every copy. Two owners take its place:
- **The Task side orders the record:** close, reopen, assign. It already does this, under the copy's ordering and then the Task's.
- **Each run's own gate orders the run:** start, deliver, Stop, closure stop, idle shutdown.

| Race | Today | Target |
| --- | --- | --- |
| Closure vs. the assigner's reopen-and-message | One queue step: release, or reopen commit, entirely before the other | The Task side commits one of them first. The run's gate then runs either the closure stop or the delivery. A delivery re-checks "open" at the gate head, so a delivery that lost the race is refused with today's text |
| Closure vs. a running turn | Release cancels, then stops | The same, inside the run's gate |
| Idle shutdown vs. an arriving message | The idle step re-checks quiet; a lease holds the run live | The idle shutdown runs in the gate and checks quiet. A message enters the gate and restores the run if it was shut down |
| User Stop vs. a delegation's work packet | The Stop marks the copy stopping; queued wakes are refused | The Stop runs in the run's gate. The packet delivery that follows is refused while the run stops, then wakes it (DEC-001: a message wakes a stopped run) |
| Activation commit vs. closure of the same new run | One queue | `TaskDelegation` keeps today's order (entry, start, packet, `markStarted`). A closure during the start finds the entry `starting` and stops the run once its root exists |

Consequence for the code: `RootTaskExecutionLifecycle`'s per-copy queue, leases and idle schedule are removed. They served hosted copies only, and nothing is hosted.

## Readers Of Removed Or Renamed Fields (was V-10, AR-003)

Counts are files outside migrations, by area (grep at `827f1e68dc`).

| Field | Readers | Decision |
| --- | --- | --- |
| `hostRoot` (Task entry) | `projects/` (domain, stores, services, runtime, changes), `agent-collaboration/execution/task/` (3), `compositions/project-task-execution-resource-composition.ts`, `remote-collaboration/inbound/remote-message-receiver.ts`; web: `types`, `utils`, `graphql` (the Task page's locator) | Each asks for `delegatedFrom.delegatingRun` (one hop) or for the run's own identity. Closure release and run status go by the run's own identity (DS-5). The Task page's locator opens the run itself; its row sits under `delegatingRun` |
| `assignedBy` (Task entry) | `projects/` (4), `agent-collaboration/execution/` (4), `agent-tools/project-tasks` | `delegatedFrom.delegatorAgentRunId` on `assigned` entries; the same checks |
| `taskAgent` | `run-history/store` (8), `agent-memory/services` (2), `memory-search/runs`, `agent-team-execution/domain` (2), `services/team-communication`, `run-history/services`, `standalone-agent-run-root/persistence`; web (2 components, localization); contracts (team stream, collaboration stream) | A delegated run is an ordinary run: the readers that told it apart (Memory page, memory search, history admission) treat it as any run. Address and launch are read from the run's own fields. Contracts drop the field |
| `coordinatingRun` | `run-history/store` (8), `agent-memory/services` (3), `agent-collaboration/execution` (3), `remote-collaboration/*` (4), `projects/services` | Removed with `taskAgent`. On a peer-started run, renamed `delegatingRun` inside `delegatedFrom` (contract §2.4) |
| `remoteTaskExecutions` | streaming (6), `run-history/store` (6), web services (4), the three roots' domain and services, `api/graphql` (2), `agent-collaboration/execution` (2) | Remote children come from their Task entries (`nodeId`, `members`). In memory they stay a list of the view, built from those entries |
| `userLaunchSelection` | `run-history/store` (6), streaming (2), web (3), contracts (2), others | Removed. A stopped delegated run's Settings edit is the ordinary stopped-run save (TC-5) |
| The standalone tree file (`readTree`, `StandaloneRootTreeFile`, its path) | `standalone-agent-run-root/` (7), `run-history/services` (4), `api/graphql/services/collaborator-root-port-resolver.ts`, `agent-org-execution/services`, `run-history/store` | The host address from `run_metadata.json`; nothing else is read. The history row's `hasCollaboration` is set by the first delegation |
| `listAgents` of the standalone location service (token total, context files, last activity, process supervisor) | 6 callers | A standalone run's agents are its own. A token total of a run "with the work it delegated" sums the runs named by its open and closed Task entries (one hop, recursively); 469's `ClosedDelegatedRunReader` becomes that reader. Context files and last activity read the run itself |

The implementation records the decision per file in its handoff. A reader not in this table is an escalation.

## Earlier Questions, Settled

- **V-11 (why a Settings edit was kept beside the started launch):** the earlier ticket (`delegated-copy-model-change`, design lines 240, 336) kept it so that later copies, which projected from the started values, would not inherit an edit, and so that the origin text could still be shown. Neither holds for an ordinary run: every delegation resolves its own launch, and an edited agent shows no origin text. The edit becomes the run's own launch (DS-10 step 4).
- **V-14 (a non-coordinator member of a stopped team):** the Task side's index reads that team's own file once and keeps its members.
- **U-B (the web):** a local delegated run is shown the way a remote child already is (DS-8). The rows, selection and Stop buttons stay. The view's children are built from the Task entries.

## Ownership Map

| Owner | Owns |
| --- | --- |
| Task side (`TaskExecutionResourceService`, its port) | Every entry and `delegatedFrom`; open/closed, reopen, assign; the in-memory index and its four questions; the order of record changes |
| `TaskMessageScope` | Admission between runs and the route to the receiver |
| `TaskDelegation` | The order of a delegation to a new or an existing run |
| `DelegatedRunStarter` | Creating an ordinary run for a delegation, local or peer |
| Each run's root (standalone agent, team) | Its own agent(s), log, gate, Stop, closure stop, idle shutdown, view |
| `CollaborationRootResolver`, `ActiveCollaborationRootDirectory` | Resolving or restoring a run's root; the live roots (existing) |
| The migration | DS-10 only |

## Removal / Decommission Plan (this ticket)

| Removed | Why | Replaced by |
| --- | --- | --- |
| `RootTaskExecutionLifecycle` and its parts for hosted copies: the command queue, idle schedule, live holds, resource scope, dispatch, adapter interface (`agent-collaboration/execution/task/`) | Nothing is hosted | `TaskDelegation`; each run's own root, gate and idle shutdown |
| The three task execution adapters: `StandaloneRootTaskExecutionAdapter` (hosting branch), `TeamTaskExecutionAdapter` with `team-task-execution-service.ts`, `AgentOrgTaskExecutionAdapter` | Same | `TaskDelegation` through each root |
| The registries of hosted copies: `task-agent-execution-registry.ts`, `task-team-execution-registry.ts`; the copy parts of `RootAgentExecutionRegistry` and `RootTeamExecutionDirectory` | Same | `ActiveCollaborationRootDirectory` (each run a root) |
| The hosted children in the termination scopes (`flat-team-execution-manager.ts:275-296`, `agent-org-run.ts:380-384`, `standalone-agent-run-root.ts:462-466`) | Stop ends a run's own parts only | — |
| `stopDelegatedExecution` and the delegated launch editing inside the three roots | A delegated run is stopped and configured as itself | The ordinary run services |
| `standalone-root-tree-schema.ts`, `standalone-root-tree-mutator.ts`, `standalone-root-tree-path.ts`, the tree part of `standalone-root-package-store.ts`, `emptyStandaloneRootTree` | The file is removed (TC-8) | `run_metadata.address`; Task entries |
| The team and org trees' `taskExecutions` and `remoteTaskExecutions` (types, schemas, mutators, the org per-team lists) | No stored list | Task entries |
| `taskAgent`, `TaskAgentCoordinatingRun`, `coordinatingRun` (outside a peer-started run's `delegatedFrom`) | Contract rev. 5 | Task entry `delegatedFrom`; the run's own fields |
| `hostRoot`, `assignedBy` | Contract rev. 5 | `delegatedFrom` |
| 469's `CoordinatingRunPresence`; "a task agent is never a root candidate" in admission | A delegated run is an ordinary run | — |
| `userLaunchSelection` and its readers | TC-5 | The ordinary stopped-run save |
| The "remote" in the names of the idle shutdowns and the run starters | They serve every delegated run | `DelegatedRunIdleShutdown`, `DelegatedTeamIdleShutdown`, `DelegatedRunStarter` |

Nothing of the hosting machinery is kept.

## Earlier Review Findings (ARCH-REV-001 on SR-010) and Their Answer Now

| Finding | Answer |
| --- | --- |
| AR-001 Task membership of an independent run | The Task entry is the membership and the relationship; DS-1, DS-5 |
| AR-002 Message routes beyond the pair | Contract §10, validated on 1,604 messages; DS-2, DS-3 |
| AR-003 Derived consumers of the composed tree | "Readers Of Removed Or Renamed Fields" |
| AR-004 Restart resume | DS-9; migration step 7 |
| AR-005 Migration shapes | DS-10 |
| AR-006 Two sources for nested rows | One source: `openRunsDelegatedFrom`, one hop |
| AR-007 Archive/delete of a delegated run | An ordinary run; refused while a run it delegated to works on an open Task (TC-2) |
| AR-008 Opening a view starts the agent | DS-8 |
| AR-009 Peer-only pieces | `DelegatedRunStarter` and the idle shutdowns leave `remote-*`; the peer receiver keeps peer concerns |
| AR-010 Stale notes | Notes "Re-investigation after autobyteus-469" |

## Change Sequence

1. Data model and the Task side: `delegatedFrom` on entries, `subWork`, peer fields, the port questions and index. Migration with fixtures (DS-10).
2. `DelegatedRunStarter` (extracted from the peer path) and the two idle shutdowns (renamed, generalized).
3. `TaskDelegation`, and every root (standalone, team, org) delegating through it.
4. `TaskMessageScope`, the router's second step, and address step 3.
5. Task closure, reopen and deletion by the run's own identity.
6. Stop of each root kind: its own parts only.
7. Views of all three kinds: children from the Task entries; local children shown like remote children; the web.
8. Restart resume.
9. Removal of the hosting machinery and of the removed fields' code (table above).
10. Documents: `collaboration_model.md` (words, CM-6 … CM-8, §3, §5), `GLOSSARY.md`, the module docs (standalone root, team execution, orgs, communication, projects, memory).

Steps 1 … 9 ship together: the stored model and the runtime change at once. Inside the ticket the implementation can land them as separate commits in this order, each with its tests.

## Risks

| Risk | Mitigation |
| --- | --- |
| A message route that works today is lost | The rule was validated on every stored message; tests per walk case W1 … W11 |
| A run is unreachable while its Task record is unreadable | Reported (469 DEC-010) |
| An ordering guarantee is lost without the shared queue | "Ordering Without A Shared Queue": each race has a named owner and a re-check at the gate head; a test per row |
| The migration on real data | Fixtures per shape and partial state; never run on user data |
| The size of one change over three root kinds | One shared delegation owner (`TaskDelegation`) and one Stop rule; the change sequence lands in commits with tests per step; the API/E2E round covers each kind |

## Guidance For Implementation

- Start from the peer path. A peer-started run already is the target shape; extract from it rather than write a second starter.
- Every new name above is the owner's name; do not add a "manager" or "helper" around them.
- Do not add lines to files over 500 lines beyond calls; new logic goes into the new files (469 FU-002).
- Fixtures are small and hand-built per shape; never copy user data and never run a migration on it (`TESTING.md`).
