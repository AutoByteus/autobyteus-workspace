# Design Spec

## Solution And Approval Basis

- Current solution revision ID: `SR-027` (the contract starts from the runs the user starts and from talking inside one run: RUN-1 … RUN-4, IN-1 … IN-8). SR-026 was contract revision 7: every case in one file, checked case by case; TC-13, one place for an agent run's log. SR-025 answers ARCH-REV-008 AR-018: TC-12 revised, a delegated team run is rooted at `/`). SR-024 first added TC-12, raised by the Implementation Engineer. SR-023 answered ARCH-REV-006: AR-016, AR-017. SR-022 was contract revision 6: the run's own `delegatedFrom` and the in-memory `DelegationTree`, the user's decisions TC-10 revised and TC-11). SR-021 passed architecture review ARCH-REV-005 (answering ARCH-REV-004: AR-005, narrowed again). SR-020 answered ARCH-REV-003 (AR-005). SR-019 answered ARCH-REV-002 (AR-004, AR-005, AR-008, AR-011 … AR-015). SR-018 was self-validated and approved by the user for review. SR-017 widened the scope to team and org runs (TC-4 revised). A new design on the 469 base. It replaces the design of SR-010, which was built on contract revision 2 and failed architecture review ARCH-REV-001 (AR-001 … AR-010, answered below).
- Approved requirements baseline, who approved, and approval reference: `requirements-doc.md` with `target-collaboration-contract.md` revision 5. Every contract decision was taken by the user on 2026-11-11: TC-4 (revised), TC-7, TC-8, TC-9, TC-10 (revised in revision 6), TC-11, DEC-011 (quotes in `solution-revision-record.md` SR-014 … SR-016).
- Behavior-defining supplements: `target-collaboration-contract.md` revision 5.
- User approval of the design: `Obtained`, the user, 2026-11-11: "please validate by yourself and whether the design specification works … After validation by yourself to work, you will send to the review by yourself. Yeah. I think you'll get an approval from me. You sent your architecture reviewer to review."
- Design status: `Ready`.
- Canonical investigation notes: `investigation-notes.md`.
- Authorities read (2026-11-10, 2026-11-11): the skill's `references/architecture-design.md`, `references/design-principles.md`; `DESIGN.md`; `collaboration_model.md`; `data_migration_guideline.md`; the 469 design.
- Base: `origin/personal` `827f1e68dc`.

## The Idea

Today a top run hosts every run delegated below it: one process, one index, one queue. Hosting gave two things at once:
1. An index of who belongs with whom.
2. Control over the delegated runs' life.

The second is the Stop bug and is wrong in the domain: you delegate a Task to someone, and you do not decide their life (the user, 2026-11-11). This design keeps the first and drops the second:

- **Every run is its own run**, with its own root, and its own start, Stop, idle shutdown and wake. Its life is bound to its Task, never to the run that delegated it (contract P6).
- **The Task record holds the delegation** (`delegatedFrom`, one hop). It decides which runs a run shows under it, and who may message whom (contract §2, cases in §5).
- **The relationships live in an in-memory `DelegationTree`**, owned by collaboration. It is built from the Task records at startup and kept current with every Task change. It answers who delegated whom, who can reach whom, and which run an agent is in. It owns no run (contract §4, TC-11).
- **A delegated run carries its own `delegatedFrom`** (its origin, written once), and each of its Task entries carries the same value as the assignment (contract P2).
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
| `DelegationTree` (`agent-collaboration/delegation/delegation-tree.ts`) | Collaboration | The relationships between runs, in memory (contract §4): nodes, one-hop edges, each node's Tasks and agents, each Task's assigner. Built at startup from the Task records (through `TaskExecutionResourcePort`); kept current by the Task side's change notice for one Task (`entriesChanged(taskId)`, a notification), on which it re-reads that Task's entries. Agents are read once per run from its own file; an org run is re-read on a miss. Questions: `runOfAgent`, `parentOf`, `openChildrenOf`, `assignerOf(task)`, `tasksOf(run)`, `subtreeOf(run)`, and **`canMessage(runA, runB)`**: the communication rule (contract §2.2) is a property of the tree, so the tree owns it. The same tree feeds the views (DS-8), so what the user sees and who can talk come from one structure. It owns no run |
| The Task side (`TaskExecutionResourceService`) | Task records | It owns the records and their order of change. It keeps no relationship maps; it notifies `DelegationTree` after each committed change of a Task's entries |
| `CrossRunMessageDelivery` (`agent-collaboration/communication/`) | Delivering a message between two runs | The order of one message between two runs: find the receiver's run and ask `canMessage` (`DelegationTree`), restore the receiver, the receiver's accept and log, then the sender's log. It owns no rule of its own: the rule is the tree's |
| `TaskDelegation` (`agent-collaboration/execution/task/`) | Delegation | `delegate_task`'s order for a new run (Task entry, start, work packet, `markStarted`) and for an existing run (follow-up Task). Root-neutral: the standalone, team and org roots all delegate through it |
| `DelegatedRunStarter` (`agent-collaboration/execution/delegation/`) | Starting a delegated run | Creating an ordinary agent run or team run for a delegation, with its resolved launch, address and `launchSource`. A team run is created rooted at `/`, like every team run and like the peer path already does (contract §3.2, TC-12 revised); the delegation address goes into the Task entry's `recipientAddress`. Extracted from the peer path's two starters, which keep only peer concerns |
| `DelegatedRunIdleShutdown`, `DelegatedTeamIdleShutdown` | The delegated run's own root | Its idle schedule. Today's `StandaloneHostIdleShutdown` and `RemoteTeamIdleShutdown`, renamed because they now serve every delegated run, not only peer-started ones |

## Data-Flow Spines

| ID | Scope | Start → End | Governing owner |
| --- | --- | --- | --- |
| DS-1 | Primary | `delegate_task` by an agent of any run (standalone, team, org) → a new run working on the Task | `TaskDelegation` |
| DS-2 | Primary | `send_message_to(run ID)` to another run → delivered, receiver woken | `GlobalAgentRunMessageRouter` with `CrossRunMessageDelivery` |
| DS-3 | Primary | `send_message_to(address)` beyond the sender's own run → delivered | The sender's root resolution, then DS-2 |
| DS-4 | Primary | The user stops a run → that run only | The run's own root |
| DS-5 | Primary | Task DONE/CANCELLED (or deleted) → each run of it stops | Task side → each run's own root |
| DS-6 | Primary | Reopen + the assigner's message, or a follow-up Task → the run continues | DS-2 / `TaskDelegation` + the Task side |
| DS-7 | Bounded local | A quiet delegated run → shut down; next message restores it | The run's own idle shutdown |
| DS-8 | Primary | The user opens a run → its rows (one hop) with status and live output | The run's view projection |
| DS-9 | Operational | Update restart → busy runs resumed | `RestartResumer` |
| DS-10 | Operational | First start after the update → stored data converted | One app-data migration |
| DS-11 | Primary | The run list → each run once, at its right place | The history list projection with the Task side |

### DS-1 Delegate to a new run

`agent: delegate_task(address) → the sender's root, whatever its kind: StandaloneAgentRunRoot, RootTeamRun or AgentOrgRun (its gate) → TaskDelegation.toNewRun → Task side: linkNewTaskExecution (entry: delegatedFrom = {this run, the delegator}, start "starting"; then it notifies DelegationTree) → DelegatedRunStarter: prepare an ordinary standalone run (agent) or create a top-level team run (team), with the same delegatedFrom in the run's own file → the new run's root registered in ActiveCollaborationRootDirectory → the work packet delivered to its entry agent (DS-2's delivery step, which starts it) → Task side: markStarted → tool result, same text as today`

- Refusals keep today's texts and order: CM-1 (never inside one's own team), the Project folder, the target, the launch.
- `delegatedFrom.delegatingRun` is the sender's own run: for a member of a team run, that team run; for an agent of an org run, that org run (contract §3.1, cases DL-1 … DL-6).
- **Role and refusals, from the `DelegationTree`:** `runOfAgent(sender)` and `tasksOf(that run)`. If the sender's run has an open entry, the new run is `subWork` of the sender's newest open Task (CM-6), and `task_id` is refused with today's `TASK_AGENT_RESOURCE_OWNED_SENDER` text. Otherwise the new run is `assigned`: to the saved Task named by `task_id`, or to a new Task with no Project for described work.
- **History row:** `DelegatedRunStarter` writes the new run's history row when it creates the run, as for any new run (DS-11).
- A failure after the entry was written: `markFailed`, and the new run is terminated before the answer. That is today's order.
- The work packet must name the delegator as today, because it is the record of the delegation that the run carries in its conversation (contract §5.1, S12, T-3).

### DS-2 Message by run ID

`sender's agent: send_message_to(run ID) → GlobalAgentRunMessageRouter:`
1. **The same run:** the sender's own root, as today (teammates of a team run, agents of an org run).
2. **Another run:** `CrossRunMessageDelivery.route(sender, target)`:
   - `DelegationTree.runOfAgent(target)` finds the run.
   - Admit by contract §2.2: same open Task, or the assigner's run. A closed Task is refused, except the assigner's reactivation (DS-6).
   - `CollaborationRootResolver.resolveOrRestore(that run)`, then the receiver's `root.acceptFromRun` in its gate. The gate re-checks the Task rule at its head, writes the **receiver's** log, and wakes and delivers.
   - Then the sender's root writes the **sender's** log, with the same message ID (`commitSent`).
   - This is the peer path's order (`remote-message-send.ts:20-24`): prepare without a state change, the receiver accepts and writes its own log, then the sender writes its own. Each root writes only its own log (Ownership Map).
   - If the receiver refuses, nothing is written. If the sender's log write fails after the receiver accepted, the message is delivered and the sender's root takes its existing persistence fail-stop (`standalone-root-persistence-coordinator.ts`, `latchAndThrow`), as for any failed write of its log.
3. **Live-only**, as today.

`DelegationTree.canMessage` is the one owner of "may these two runs talk" and `runOfAgent` of "where is the receiver" (Principle 13); `CrossRunMessageDelivery` owns the order of the delivery. Both answer from memory: nothing is resumed to find a receiver, also after a restart.

### DS-3 Message by address

`sender's root: resolveMessageRecipient → (1) own team, unchanged → (2) its own run's standing agents, unchanged → (3) new: the standing agents of the run that assigned the sender's Task: CrossRunMessageDelivery asks DelegationTree.assignerOf(each open Task of the sender's run) → that run's root resolves the address → DS-2's delivery step`

### DS-4 Stop

`user: Stop → the run's service (agent run, team run or org run) → that run's root.stop() in its gate → its own agent, its own team members, or its own org units, only`

Nothing else stops (TC-1). A delegated run's later report wakes its stopped delegator (DS-2).

### DS-5 Task closure

`update_task DONE → ProjectTaskService → TaskExecutionResourceRelease: for each closed run of the record → that run's own root, by the run's identity → root.stopForTaskClosure() in its gate → stopped`

- A peer's run is fenced, as today.
- Views drop the run (469).
- Deleting a Task: its open runs are stopped first, then the record goes, and the runs are ordinary runs (contract §5.1, S12, T-3).

### DS-6 Reopen and follow-up

`assigner: send_message_to(run ID) → DS-2: CrossRunMessageDelivery sees a closed entry whose assigner is the sender → Task side: reopenAssignment → the run's root, in its gate: re-check open, restore, deliver`

A follow-up Task by run ID: `TaskDelegation.toExistingRun` → Task side `assignExistingTaskExecution` → the same delivery.

### DS-7 Idle shutdown

`the run's own agent status → DelegatedRunIdleShutdown / DelegatedTeamIdleShutdown → at the grace end, in the run's gate: shut down if quiet → the next message restores it (DS-2)`

### DS-8 View

`user opens run X → X's root view: its own parts + child rows from DelegationTree.openChildrenOf(X) (one hop; the run's own file gives address and members) → each child's status from its own root when active, "offline" otherwise → while someone watches, a child's live output becomes the view's agent_presentation, through the path a remote child uses today (N-402) → the client shows the rows under the delegator agent`

- **Opening a view never starts a run** (REQ-004, AR-008). The collaboration stream's connect stops starting the host: `AgentCollaborationStreamHandler.readyRoot` (`services/agent-streaming/agent-collaboration-stream-handler.ts:59-62, 73, 148`) resolves the root without `ensureHostReady`, and the host starts on its first input. The same holds for the team and org streams' connect.
- **Commands to a local child from the delegating run's view** (AR-011): a message, interrupt, tool approval or Stop on a child row goes to the child's own root by its identity. `DelegatedRunCommands` (owner: the command route of a view) resolves it through `ActiveCollaborationRootDirectory` (`resolveOrRestore` for a message; a live root only for interrupt and tool approval; Stop to its root). Tool approval works, because the child runs on this node. A remote child keeps the remote route (`remote-child-commands.ts`, no tool approval). This holds in the standalone, team and org views.
- A child's conversation is read from its own run, as for a remote child.
- The web keeps today's rows, selection and buttons. A local child's status and live output reach the view the way a remote child's do; its commands go to its own root (above).

### DS-9 Update restart

- Each busy run is recorded under its own root.
- The resumer resolves and resumes each root, bottom-up along `delegatedFrom` (a delegated run before its delegator), so a report wakes nothing twice (REQ-008).
- **The restart notice** (AR-004): every resumed run's notice lists the resumed runs it delegated, one hop: the resumed runs whose Task entry names it as `delegatingRun` (the Task side). This replaces "delegated runs of the same root" in `restart-notice.ts:16-27`; the `place: "delegated"` case goes, because every run is a host or a member of its own root.

### DS-10 Migration (one app-data migration, in the sealed area)

| Step | Source | Target | Recognized as done (retry) |
| --- | --- | --- | --- |
| 1 | Task entry `hostRoot`, `assignedBy` | **Every** entry gets `delegatedFrom { delegatingRun, delegatorAgentRunId }`, one hop. The delegator is read from the run's own file; for a run without one (a released partial state), from its kept full record in the tree, through a frozen reader; else `assignedBy`. The delegating run is the stored run the delegator is a part of; when that run cannot be found, today's `hostRoot` (the only stored value). 375 entries take today's `hostRoot`; 31 nested entries take the delegated run the delegator is a part of | The entry has `delegatedFrom` and no `hostRoot` |
| 2 | role `delegated` | `subWork` (28) | No `delegated` role left in the file |
| 3 | Peer link in a standalone tree (2) | `nodeId`, and `members` for a team, on its Task entry; each member's address loses the delegation address prefix (`/marketing_team/x` → `/x`, 4 addresses), its address in its own team | The entry has `nodeId` |
| 4 | `taskAgent` on 196 runs | Replaced by the run's own `delegatedFrom { delegatingRun (one hop; else today's `coordinatingRun`), delegatorAgentRunId? }`, equal to its Task entries' value (contract E6, V-15, V-16). Agent run: `address` and `launchSource` → `run_metadata.json`. Team run: `delegatedFrom` beside `rootTeam`; `rootTeam.defaultLaunchSource`; `rootTeam.teamDefinitionName` filled through the definition-name port, else the definition ID; a team-level selection applied to the members with `followsTeam: true`, then `followsTeam` dropped; the file is rebased to an ordinary team file rooted at `/`: member and handoff addresses lose the team's prefix, a handoff `to` outside the team is kept as written (TC-12 revised); the team's delegation address goes to its Task entries' `recipientAddress`, filled on every entry `userLaunchSelection` (9) becomes the run's own launch; the edited agent's `launchSource` is dropped | The file has no `taskAgent` |
| 5 | Standalone `collaboration_tree.json` (8) | `host.address` → `run_metadata.json` `address`; the file removed | The file is absent and `address` is in the metadata |
| 5b | An agent run's log in `collaboration/` (8 runs, TC-13) | The append-only log files (`communication_messages_active.jsonl` and its dated segments) move to `agents/<id>/`; the folder goes when it is empty. An unconverted JSON log left by an unfinished `20261018_…` item is not moved: it stays for that migration's retry and is reported as `PRESERVED_UNFINISHED_PREDECESSOR` (it is not read at runtime, as today). A name already taken at the target is not overwritten: the item is reported and left (P7) | No `communication_messages_*.jsonl` left in `collaboration/` |
| 6 | Team and org `taskExecutions` and `remoteTaskExecutions` lists | Removed | The lists are absent |
| 7 | Busy-run record left by an interrupted update | Each entry under its own run's root | No entry with `place: "delegated"` |
| 8 | No history row for a delegated run (196) | A history row for each, built from its own file | The row exists |

**No prerequisite hold; registered after its predecessors** (AR-005, ARCH-REV-004). The four released migrations that wrote the shapes this migration reads each record `FAILED` as soon as one item fails, and the runner retries a `FAILED` migration at every start (`app-data-migration-runner.ts:190`):
- `20261015_collaborators_to_delegated_runs_v1` (`collaborators-to-delegated-runs-v1-app-data-migration.ts:90-103`);
- `20261017_task_agent_own_run_v1` (`task-agent-own-run-v1-app-data-migration.ts:41-44, 129-132`);
- `20261018_append_only_message_logs_v1` (`append-only-message-logs-v1-app-data-migration.ts:38-40, 100-105`);
- `20261019_delegated_copy_own_file_complete_v1` (`delegated-copy-own-file-complete-v1-app-data-migration.ts:46, 216-222`).

A persistent item failure, such as "target already exists", keeps such a migration `FAILED` for good. A hold on it would keep this migration from ever running. The runtime reads only the target shape, so every Task record would then be damaged node-wide (the review's MP-C): a lockout. So this migration declares no `prerequisiteMigrationIds`. It is registered after the four, so in each start they run first, and it converts what it can recognize, item by item. None of the four reads or writes Task records (`grep agent_run_resources|projects/|ad-hoc-tasks` in their folders finds nothing). This migration touches message logs only in step 5b, and only the append-only files that `20261018_append_only_message_logs_v1` produced; a JSON log that migration has not converted is left where it is, so its retry finds it.

**A predecessor's unfinished items are preserved** (the premise reconciled with the predecessors' status rule: these states arrive with the predecessor `FAILED` and retried at every start, not with a warning success):

| Predecessor's unfinished item | What this migration does |
| --- | --- |
| `20261017_…`: a tree holding a stored local entry that is not a link (a full record not yet reduced), or a link whose run has no own file at the standard place (469's save rule, `task-execution-tree-split.ts:191`; the review's MP-A) | Step 1 converts the Task entries of the runs named there, with the delegator from the kept record. Steps 5 and 6 leave the tree untouched. Step 4 leaves the own files of those runs untouched |
| `20261019_…`: an own file still in the shape before completion (`taskAgent.origin`) | Step 1 converts its Task entries (the delegator is in that shape too). Step 4 leaves the own file untouched |
| `20261015_…`: a tree still holding a non-empty `collaborators` list (0 on the user's machine; an empty `collaborators: []` is current residue, 39 trees, and is not read) | Steps 5 and 6 leave the tree untouched. Those runs have no Task record (contract E7) |
| `20261018_…`: a JSON message log not converted | Not read: no effect |

- Every preserved item is reported (`PRESERVED_UNFINISHED_PREDECESSOR`, naming the predecessor and the item), and this migration completes `SUCCEEDED_WITH_WARNINGS`.
- Every Task entry is converted in every case, so no Task is damaged by a predecessor's state.
- The current runtime reads a preserved own file tolerantly and ignores `taskAgent`; such a run is an ordinary run with a derived address. A preserved tree is not read.

**When a predecessor later finishes an item** (it is retried at every start), it writes its released shape:
- `20261017_…` writes an own file with `taskAgent` and a link into the kept tree. The child's Task entry is already in the target shape; the own file's `taskAgent` is ignored; the tree is not read.
- `20261019_…` completes an own file, still with `taskAgent`, which is ignored.
- `20261015_…` converts collaborators inside a kept tree, which is not read.

This migration is terminal by then and does not run again. The residue is inert, as with any preserved item.

**Order.** All Task records first (steps 1 … 3: they need each run's `taskAgent`), then the run files (step 4), then the trees (steps 5, 6), the busy-run record (7) and the history rows (8). A run whose Task record cannot be read keeps its `taskAgent` and is reported; the others go on.

**Guideline §2 checklist.**
1. **Need:** a stored name changes meaning (`hostRoot` → `delegatedFrom`, one hop), a field is renamed (`delegated` → `subWork`), and facts move (peer links, address). A tolerant reader cannot do this.
2. **Availability:** this migration never waits for a predecessor (no hold), and every Task entry is converted in every case, so the runtime that reads only the target shape always finds readable Task records. Startup admission reads own files only (469 D-11). A run or Task that cannot be converted is left intact and reported. The app starts and stays usable, also while a predecessor is `FAILED`.
3. **Source and target:** contract §6, E1 … E12, measured on the user's data; plus the released partial states above.
4. **Disposition:** converted; already current (recognized per the table); preserved with a warning (partial states, unreadable records); never deleted. **Every Task entry is converted, also the entries of preserved runs, so a Task file never mixes shapes.** Only a preserved run's own file and its tree stay as they were. A Task record that cannot be read at all is left as it was and reported; its runs keep their `taskAgent`.
5. **Commit and retry:** one atomic write per file; each step is recognized as done by structure, so a retry continues where it stopped. No journal.
6. **Current-only boundary:** source shapes are frozen copies in `frozen/`; current code reads only the target.
7. **Cost:** 362 Task record files (281 KB), 196 run files, 8 tree files, the team and org trees, 2 history indexes: one pass, once.
8. **References:** Task entry → run (by ID; checked present); peer entry → node; the address of an agent run.
9. **Evidence:** fixtures per row of the table, per contract case E1 … E10, and per partial state:
   - a full Team record whose own file exists, with a nested record without one;
   - a Task file with one preserved run's entry beside converted ones: after the migration every entry is in the target shape, and the Task and its other runs are usable (in the view, in messages and delegation, at closure);
   - a link without an own file;
   - an unreadable Task record;
   - an interrupted run with half the runs converted;
   - a busy-run record;
   - **each predecessor `FAILED`**, with this migration's start and the node usable afterwards (Tasks readable; views, messages, delegation and closure working):
     - `20261017_…` with one failed child under an owned parent;
     - `20261019_…` with one own file not completed;
     - `20261015_…` with one tree still holding a non-empty `collaborators` list;
     - `20261018_…` with one JSON log left;
   - **a predecessor finishing its item after this migration**: the node stays usable;
   - a preserved own file that keeps `taskAgent`, read as an ordinary run (asserted);
   - **a local delegated run** messages its delegator by run ID through DS-2 (not the peer channel), gets its idle shutdown, and is eligible for the runtime switch (AR-016);
   - **a migrated delegated team** loads, plans, and saves team-level and member Settings while stopped, rooted at `/`; its web Settings show its name; a member resumed after the migration is told its new address and reaches its teammates by their new addresses; a stale old address gets today's guidance; a member with its own launch keeps it after the team Settings save (TC-12 revised);
   - **a delegated team with a handoff outside the team** (a team copied from an org) loads and plans; `get_handoff_rules` names the external target; `send_message_to` to it reaches the org's agent through the contract's §2.3 step 2 when the org assigned the team's Task, and gets today's guidance when no Task relates them;
   - **a new delegated team**, local and on the peer path, is rooted at `/`, and its Task entry carries `recipientAddress`; on the peer path, node B's answer names the members by their own addresses (`/lead`), and node A stores them so in `members`;
   - **closing a Task stops only its runs with no other open Task**, and after a reopen only an `assigned` entry is continued, by its assigner (contract §5.1, S10 … S12);
   - **every case of the contract's §5**, walked run by run (§5.1 a standalone agent, §5.2 a team, §5.3 an org), one test per case ID (RUN-1 … RUN-4, IN-1 … IN-8, DL-0 … DL-11, A-1 … C-4, R-1 … R-10, E-1 … E-4, T-1 … T-7): the exact call and address or run ID, the records written (Task entry, the run's own file, which message logs), the tree change, the result and the header the receiver sees. DL-11's third row changes: a delegated team's member that delegates to its own team's definition gets a new copy, as in a team the user started (its team is rooted at `/`, so the address is a catalog address, not its own team). `evidence/data-model-validation/validate_every_case.py` is the data check of the same cases, line by line by case ID;
   - **TC-13:** a delegated and a user-started agent run both write and read their log at `agents/<id>/communication_messages_*`; a migrated user-started run's moved log reads back whole;
   - a closure and the assigner's reopen-and-message, interleaved in both orders (AR-017).

   Plus a start on the converted data.
10. **Lessons:** 469's AR-002 and SR-007 (partial states of released migrations); no startup pass over history.

### DS-11 The run list

`run list request → the history list projection reads the rows (every run has one) → for each row it asks DelegationTree.parentOf(run): a run with an entry whose delegatingRun is stored is not a top-level row (it is a child row of that run while an entry is open, and it is on its Task's page afterwards) → every other run is a top-level row`

- **Every run has a history row**, delegated or not. It is an ordinary run, and the ordinary run services need its row: the stopped-run Settings save refuses a run without one (`agent-execution/services/standalone-stopped-run-selection-updater.ts:67-69`, TC-5).
- **Where a run shows:**
  - A run with no Task entry is a top-level row (the 15 legacy runs, TC-9; the runs of a deleted Task).
  - A run whose delegating run was deleted is a top-level row (TC-3).
  - A run whose entries are all closed is not a top-level row, as after 469: its Task's page lists it, and the Memory page lists it like any run.
- **Measured:** 11 delegated runs would show under their delegating run, 170 only on their Task's page, 15 as top-level rows (`evidence/data-model-validation/spines-on-data-2026-11-11.txt`).

## Ordering Without A Shared Queue (was U-A)

Today one queue per top run orders every transition of every copy. Two owners take its place:
- **The Task side orders the record:** close, reopen, assign. It already does this, under the copy's ordering and then the Task's.
- **The tree is current before a Task change resolves** (AR-017). The Task side calls `DelegationTree.entriesChanged(taskId)` synchronously after each committed change of a Task's entries, still inside that Task's ordered change: before the operation resolves and before that Task's next change starts. The tree re-reads that Task's entries synchronously from the Task side's loaded records (the port's memory, no file read). So no reader sees the tree behind the record.
- **The gate-head re-check reads the authority, not the tree.** At the head of the receiver's gate, the delivery asks the Task side's port whether the receiver's entry is open (`isOpen`, as today's `assertInputAllowed`). The tree only decides admission and the route before the gate.
- **Each run's own gate orders the run:** start, deliver, Stop, closure stop, idle shutdown. The gate is the standalone root's `operationGate` (`standalone-agent-run-root.ts:102`), the team root's `materializationGate` (`root-team-run.ts:434`), and the org root's gate.

| Race | Today | Target |
| --- | --- | --- |
| Closure vs. the assigner's reopen-and-message | One queue step: release, or reopen commit, entirely before the other | The Task side commits one of them first, and the tree follows synchronously. The run's gate then runs either the closure stop or the delivery. A delivery re-checks "open" at the gate head **from the Task side's port**, so a delivery that lost the race is refused with today's text. Test: a closure and the assigner's message interleaved, in both orders |
| Closure vs. a running turn | Release cancels, then stops | The same, inside the run's gate |
| Idle shutdown vs. an arriving message | The idle step re-checks quiet; a lease holds the run live | The idle shutdown runs in the gate and checks quiet. A message enters the gate and restores the run if it was shut down |
| User Stop vs. a delegation's work packet | The Stop marks the copy stopping; queued wakes are refused | The Stop runs in the run's gate. The packet delivery that follows is refused while the run stops, then wakes it (DEC-001: a message wakes a stopped run) |
| Activation commit vs. closure of the same new run | One queue | `TaskDelegation` keeps today's order (entry, start, packet, `markStarted`). A closure during the start finds the entry `starting` and stops the run once its root exists |

Consequence for the code: `RootTaskExecutionLifecycle`'s per-copy queue, leases and idle schedule are removed. They served hosted copies only, and nothing is hosted.

## Readers Of Removed Or Renamed Fields (was V-10, AR-003)

Counts are files outside migrations, by area (grep at `827f1e68dc`).

| Field | Readers | Decision |
| --- | --- | --- |
| `hostRoot` (Task entry) | `projects/` (domain, stores, services, runtime, changes), `agent-collaboration/execution/task/` (3), `compositions/project-task-execution-resource-composition.ts`, `remote-collaboration/inbound/remote-message-receiver.ts`; web: `types`, `utils`, `graphql`, `composables/projects/useTaskRootNavigation.ts` (the Task page's locator) | Each asks for `delegatedFrom.delegatingRun` (one hop) or for the run's own identity. Closure release and run status go by the run's own identity (DS-5). The Task page's locator opens the delegating run's view with the run's row selected, as today with the hosting run (`useTaskRootNavigation.ts:25-50`); for a nested run that is the delegated run one hop up |
| `assignedBy` (Task entry) | `projects/` (4), `agent-collaboration/execution/` (4), `agent-tools/project-tasks` | `delegatedFrom.delegatorAgentRunId` on `assigned` entries; the same checks |
| `taskAgent` | `run-history/store` (8), `agent-memory/services` (2), `memory-search/runs`, `agent-team-execution/domain` (2), `services/team-communication`, `run-history/services`, `standalone-agent-run-root/persistence`; web (2 components, localization); contracts (team stream, collaboration stream) | A delegated run is an ordinary run: the readers that told it apart (Memory page, memory search, history admission) treat it as any run. Address and launch are read from the run's own fields. Contracts drop the field |
| `coordinatingRun` | `run-history/store` (8), `agent-memory/services` (3), `agent-collaboration/execution` (3), `remote-collaboration/*` (4), `projects/services` | Removed with `taskAgent`. On a peer-started run, renamed `delegatingRun` inside `delegatedFrom` (contract §3.2) |
| `remoteTaskExecutions` | streaming (6), `run-history/store` (6), web services (4), the three roots' domain and services, `api/graphql` (2), `agent-collaboration/execution` (2) | Remote children come from their Task entries (`nodeId`, `members`). In memory they stay a list of the view, built from those entries |
| `userLaunchSelection` | `run-history/store` (6), streaming (2), web (3), contracts (2), others | Removed. A stopped delegated run's Settings edit is the ordinary stopped-run save (TC-5) |
| The run's own `delegatedFrom` (new on local runs; on peer-started runs today) | Readers at `827f1e68dc` that branch on its presence (ARCH-REV-006, AR-016), and the new readers | Two tests, named: **`isDelegated(run)`** = `delegatedFrom` present; **`isPeerStarted(run)`** = `delegatedFrom.nodeId` present (contract §3.2). Per reader:
- `standalone-agent-run-root.ts:148`, `standalone-agent-run-root-manager.ts:208-211, 345`, `team-run-remote-links.ts:23`: the peer delegator endpoint (`RemoteRunLinks` back-link) and the peer channel → **`isPeerStarted` only**. A local delegated run reaches its delegator through DS-2.
- `standalone-agent-run-root.ts:153`, `root-team-run.ts:201`: the idle shutdowns → **`isDelegated`**: every delegated run has its own idle shutdown (DS-7).
- `standalone-agent-run-eligibility.ts:16`: excludes runs with `delegatedFrom` (runtime switch) → **`isPeerStarted` only**. A local delegated run is eligible like any run (REQ-006, TC-5).
- `standalone-agent-run-root-manager.ts:447-449`: the stored message view keyed on the back-link → **removed**. The view rule keeps every message of a run's own log that involves one of its own agents (469's `isMessageOfView`), so no back-link is needed.
- `coordinating-tree-shapes.ts:35` (`storedBackLink`, for the endpoint set) → **removed**, for the same reason.
- New readers: the run list's "delegated from" label and the Memory page → `isDelegated`; the equality test with the Task entries.

Routing, placement and lifecycle never read it; they read the Task entries through `DelegationTree`. |
| The standalone tree file (`readTree`, `StandaloneRootTreeFile`, its path) | `standalone-agent-run-root/` (7), `run-history/services` (4), `api/graphql/services/collaborator-root-port-resolver.ts`, `agent-org-execution/services`, `run-history/store` | The host address from `run_metadata.json`; nothing else is read. The history row's `hasCollaboration` is set by the first delegation |
| `listAgents` of the standalone location service (token total, context files, last activity, process supervisor) | 6 callers | A standalone run's agents are its own. Context files and last activity read the run itself |
| Token totals: `token-usage/providers/token-usage-run-store.ts` (`getTeamRunSummary` by `rootTeamRunId`, the org summary by agent run IDs, the standalone summary), `api/graphql/types/token-usage-stats.ts`, the attribution at capture (`agent-execution/events/processors/token-usage/token-usage-context-enricher.ts:38-42`) | 3 totals | **Unchanged results** (REQ-009, AC-012). A total of a run covers its own agents and every run delegated from it, one hop at a time and recursively, from the Task entries, open and closed. Each run record is counted once, by run ID. Attribution at capture stays the run's own root: a delegated team run's usage is its own team's. Usage rows a hosted copy wrote before the change keep their old `rootTeamRunId`; the run-ID set counts them once. 469's `ClosedDelegatedRunReader` becomes the reader of "runs delegated from X", for open and closed entries |

The implementation records the decision per file in its handoff. A reader not in this table is an escalation.

## Earlier Questions, Settled

- **V-11 (why a Settings edit was kept beside the started launch):** the earlier ticket (`delegated-copy-model-change`, design lines 240, 336) kept it so that later copies, which projected from the started values, would not inherit an edit, and so that the origin text could still be shown. Neither holds for an ordinary run: every delegation resolves its own launch, and an edited agent shows no origin text. The edit becomes the run's own launch (DS-10 step 4).
- **V-14 (a non-coordinator member of a stopped team):** `DelegationTree` reads that team's own file once and keeps its members.
- **U-B (the web):** a local delegated run is shown the way a remote child already is (DS-8). The rows, selection and Stop buttons stay. The view's children are built from the Task entries.

## Self-Validation (2026-11-11, before review)

The user asked for the data model and the design to be validated before review. The data checks are read-only on the user's data and count only. The walk is by hand against the contract and the code at `827f1e68dc`.

### The data model against the stored data

| Check | Result | Evidence |
| --- | --- | --- |
| Every Task entry of a run on this node gets a one-hop `delegatedFrom` | 406 of 406 (375 equal `hostRoot`, 31 nested) | `contract-after-469-2026-11-11.txt` |
| Entries of one run agree | 54 of 54 runs with several entries | `relationship-in-task-record-2026-11-11.txt` |
| The run that assigned a Task is today's top run | 375 of 376; the exception has no Task record | Contract §2.2 |
| Every Task with a `subWork` or `broughtIn` entry has an `assigned` entry (DS-3 needs the assigning run) | 26 of 26; no Task has two assigners | `spines-on-data-2026-11-11.txt` |
| The message rule against every stored message between two runs | 1,540 of 1,604 as today; 64 refused, all with a legacy run; 0 newly allowed | `task-centered-messaging-2026-11-11.txt` |
| A delegated agent run's file is an ordinary run file once `taskAgent` goes (DS-10 step 4) | 43 of 43 have every field all ordinary run files have | `spines-on-data-2026-11-11.txt` |
| Every run named by an entry has an address in its own file (DS-8 rows) | 181 of 181 | same |
| Every delegated team run's own file lists its members with run IDs (DS-2, V-14) | 153 of 153 | same |
| The peer runs' node and members are available to move into their entries (DS-10 step 3) | 2 of 2 | `relationship-in-task-record-2026-11-11.txt` |
| Delegated runs have history rows (DS-11) | 0 of 196: a migration step and a listing rule were missing | same; **added: DS-11, migration step 8** |

### The spines walked against the model

| Spine | The data it needs | Where it is in revision 5 | Result |
| --- | --- | --- | --- |
| DS-1 Delegate | The sender's run; the target; the Task | The sender's root; the entry is written first | Holds |
| DS-2 By run ID | The run of an agent run ID; the two runs' Tasks; the Task's assigning run | Entries (entry agents); a team's own file (members); `assigned` entries | Holds |
| DS-3 By address | The assigning run of the sender's Task | The Task's `assigned` entry | Holds |
| DS-4 Stop | The run itself | Its root | Holds: no other data is read |
| DS-5 Closure | The runs of the Task; each run's identity | The entries | Holds; `hostRoot` is not needed |
| DS-6 Reopen | The closed entry and its assigner | The entry | Holds |
| DS-7 Idle | The run's own status | Its root | Holds |
| DS-8 View | Open runs delegated from X; their address, delegator, members, status | Entries by `delegatingRun`; own files; live roots | Holds |
| DS-9 Restart | Busy runs and their delegating runs | Busy-run record; entries | Holds after migration step 7 |
| DS-10 Migration | Every source shape | Contract §6, E1 … E12 | Holds |
| DS-11 Run list | A row per run; whether an entry names a stored delegating run | History rows (step 8); entries | **Was missing**; added |

### What the walk changed

- **DS-11 and migration step 8:** a delegated run is an ordinary run, so it needs the ordinary history row. The list decides from the Task side where it shows.
- **The Task page's locator:** it opens the delegating run with the run's row selected, as today with the hosting run.

No other gap was found. Not validated: the code. The implementation verifies the readers table file by file.

## Ownership Map

| Owner | Owns |
| --- | --- |
| Task side (`TaskExecutionResourceService`, its port) | Every entry and its `delegatedFrom`; open/closed, reopen, assign, delete; the order of record changes; the change notice to `DelegationTree` |
| `DelegationTree` | The in-memory relationships: who delegated whom, each run's Tasks and agents, each Task's assigner (contract §4) |
| `CrossRunMessageDelivery` | Admission between runs and the route to the receiver |
| `TaskDelegation` | The order of a delegation to a new or an existing run |
| `DelegatedRunStarter` | Creating an ordinary run for a delegation, local or peer |
| Each run's root: standalone (`StandaloneAgentRunRoot`), team (`RootTeamRun`), org (`AgentOrgRun`) | Its own agents, its own log (and only its own), gate, Stop, closure stop, idle shutdown, view |
| `DelegatedRunCommands` (`agent-collaboration/execution/delegation/`) | A view's commands to a local child row (message, interrupt, tool approval, Stop), routed to the child's own root |
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
| `ensureHostReady` on a collaboration stream's connect (`agent-collaboration-stream-handler.ts:59-62, 73, 148`, and the team and org connects) | Opening a view never starts a run (REQ-004) | The host starts on its first input |
| The `place: "delegated"` busy-run entries and the same-root list in `restart-notice.ts` | Every run is its own root | The notice lists the resumed runs it delegated (Task side) |
| `task-agent-team-tree-schema.ts` (the separate shape of a delegated team's own file) and `followsTeam` with its readers | A delegated team run's file is an ordinary team file rooted at `/` (TC-12 revised) | `team-run-execution-tree-schema.ts` unchanged in its root rule; member `launchSource` optional; the handoff compiler (`collaboration-handoff-compiler.ts:73`) keeps a `to` outside a delegated team as an external target instead of resolving it in the team. No reader that equates the root or the team scope with `/` changes (ARCH-REV-008 listed them) |
| `standalone-root-tree-schema.ts`, `standalone-root-tree-mutator.ts`, `standalone-root-tree-path.ts`, the tree part of `standalone-root-package-store.ts`, `emptyStandaloneRootTree` | The file is removed (TC-8) | `run_metadata.address`; Task entries |
| The team and org trees' `taskExecutions` and `remoteTaskExecutions` (types, schemas, mutators, the org per-team lists) | No stored list | Task entries |
| `taskAgent`, `TaskAgentCoordinatingRun`, `coordinatingRun` (outside a peer-started run's `delegatedFrom`) | Contract rev. 5 | Task entry `delegatedFrom`; the run's own fields |
| `hostRoot`, `assignedBy` | Contract rev. 5 | `delegatedFrom` |
| 469's `CoordinatingRunPresence`; "a task agent is never a root candidate" in admission | A delegated run is an ordinary run | — |
| `userLaunchSelection` and its readers | TC-5 | The ordinary stopped-run save |
| The mounting of a peer team's member addresses under the delegation address in node B's answer (`remote-team-run-starter.ts`, `mounted` / `rebaseDefinitionAgentTeamAddress`) | Every address belongs to its run's own space (contract P8); node A reaches peer members by run ID only | The members' own addresses, as node B stores them |
| The "remote" in the names of the idle shutdowns and the run starters | They serve every delegated run | `DelegatedRunIdleShutdown`, `DelegatedTeamIdleShutdown`, `DelegatedRunStarter` |

Nothing of the hosting machinery is kept.

## Earlier Review Findings (ARCH-REV-001 on SR-010) and Their Answer Now

| Finding | Answer |
| --- | --- |
| AR-001 Task membership of an independent run | The Task entry is the membership and the relationship; DS-1, DS-5 |
| AR-002 Message routes beyond the pair | Contract §2 and §5.4.2, validated on 1,604 messages; DS-2, DS-3 |
| AR-003 Derived consumers of the composed tree | "Readers Of Removed Or Renamed Fields" |
| AR-004 Restart resume | DS-9; migration step 7 |
| AR-005 Migration shapes | DS-10 |
| AR-006 Two sources for nested rows | One source: `DelegationTree.openChildrenOf`, one hop |
| AR-007 Archive/delete of a delegated run | An ordinary run; refused while a run it delegated to works on an open Task (TC-2) |
| AR-008 Opening a view starts the agent | DS-8 |
| AR-009 Peer-only pieces | `DelegatedRunStarter` and the idle shutdowns leave `remote-*`; the peer receiver keeps peer concerns |
| AR-010 Stale notes | Notes "Re-investigation after autobyteus-469" |


### Round 2 (ARCH-REV-002 on SR-018)

| Finding | Answer |
| --- | --- |
| AR-004 Restart notice | DS-9: the notice lists the resumed runs the run delegated, from the Task side |
| AR-005 Migration vs. released partial states | DS-10: prerequisites, preserved partial states, retry recognition per step, order, Guideline §2 checklist, fixtures |
| AR-008 Opening a view starts the run | DS-8 and the removal plan: `readyRoot` without `ensureHostReady`, for the three stream kinds; change step 7 |
| AR-011 Commands to a local child | DS-8: `DelegatedRunCommands` routes message, interrupt, tool approval and Stop to the child's own root |
| AR-012 Team and org token totals | Readers table: every total covers the runs delegated from it, recursively, from the Task entries; results unchanged; no Requirement Gap |
| AR-013 Logs across two roots | DS-2: the receiver's root writes its log, then the sender's root writes its own; failure outcomes as the peer path |
| AR-014 Agents of a stopped delegating team or org run | `DelegationTree` maps every agent of every run named as `delegatingRun`, read once from its own file |
| AR-015 Stale requirements doc | Corrected (supplements, follow-ups, scenarios, REQ-005, REQ-009, unknowns, ASM-003) |
| AR-005, round 3 (a preserved run's Task entry would damage its Task) | DS-10: every Task entry is converted, a preserved run's `delegatedFrom` from its kept full record; only its own file and its tree stay; checklist item 4; a fixture for a Task with a preserved run beside converted ones |
| Round 3 residual (an org's agents can grow) | `DelegationTree`: on a miss, the org runs' own files are re-read |
| Revision 6 (the user, after round 5) | The run keeps its own `delegatedFrom`; `DelegationTree` replaces the Task-side lookup questions and `TaskRunIndex`; migration step 4 writes the run's `delegatedFrom` |
| AR-018 (round 8): a team rooted at its delegation address breaks readers of `/` | TC-12 revised: every team run is rooted at `/`; the delegation address is the Task entry's `recipientAddress`; external handoff targets resolved when sent; tests |
| AR-016 (round 6): readers treat `delegatedFrom` as "started by a peer" | Readers table: two named tests, `isDelegated` and `isPeerStarted`, and a decision per reader; tests |
| AR-017 (round 6): the tree at the gate-head re-check | Ordering: the tree is updated synchronously inside the Task's ordered change; the re-check reads the Task side's port; an interleaving test |
| AR-005, round 4 (the hold vs. the predecessors' `FAILED` status) | DS-10: no prerequisite hold; registered after the four; each predecessor's unfinished items preserved with a warning; every Task entry always converted; tests per predecessor `FAILED` and per later finish |
| Residuals | DS-1: role and owned-sender refusal from the Task side; the history row at creation. The team gate is named |

## Change Sequence

1. Data model and the Task side: `delegatedFrom` on entries and on runs, `subWork`, peer fields, the change notice. `DelegationTree`. Migration with fixtures (DS-10).
2. `DelegatedRunStarter` (extracted from the peer path) and the two idle shutdowns (renamed, generalized).
3. `TaskDelegation`, and every root (standalone, team, org) delegating through it.
4. `CrossRunMessageDelivery`, the router's second step, and address step 3.
5. Task closure, reopen and deletion by the run's own identity.
6. Stop of each root kind: its own parts only.
7. Views of all three kinds: children from the Task entries; local children shown like remote children, with their commands routed to their own roots (`DelegatedRunCommands`); the stream connect no longer starts the host; the web.
8. Restart resume and the restart notice.
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
