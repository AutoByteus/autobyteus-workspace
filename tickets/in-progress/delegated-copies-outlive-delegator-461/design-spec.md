# Design Spec

## Solution And Approval Basis

- Current solution revision ID: `SR-015`. A new design on the 469 base; it replaces the design of SR-010, which was built on contract revision 2 and failed architecture review ARCH-REV-001 (AR-001 … AR-010, answered in "Earlier Review Findings" below).
- Approved requirements baseline, who approved, and approval reference: `requirements-doc.md` with `target-collaboration-contract.md` revision 5. Decided by the user on 2026-11-11: TC-7, TC-8, DEC-011 (quotes in `solution-revision-record.md` SR-014). **TC-9 is open.**
- Behavior-defining supplements: `target-collaboration-contract.md` revision 5.
- User approval of the design: **`Pending`**. The user: "after you redesign … don't send for review immediately, I want to review it myself first" (2026-11-11). This draft goes to the user, not to architecture review.
- Design status: `Draft — for the user's review`.
- Canonical investigation notes: `investigation-notes.md` (sections up to "Re-investigation after autobyteus-469").
- Authorities read (2026-11-10 and 2026-11-11): the skill's `references/architecture-design.md` and `references/design-principles.md`; `DESIGN.md`; `collaboration_model.md`; `data_migration_guideline.md`; the 469 design (`tickets/done/collaboration-tree-open-tasks-only-469/design-spec.md`).
- Base: `origin/personal` `827f1e68dc`.

## The Idea In One Paragraph

Today a top run hosts every run delegated below it: one process, one index, one queue. That container is also what decides who may talk, and why Stop takes everything down.

After this change:
- Every run is its own run, with its own root, and its own life (start, Stop, idle shutdown, wake).
- The **Task record** holds the delegation (`delegatedBy`, one hop), and it decides two things: which runs a run shows under it, and who may message whom.
- A root contains its own run only.

## Current-State Read

| Concern | Today | Source |
| --- | --- | --- |
| Hosting | A `StandaloneAgentRunRoot` owns `rootAgents` and `teams` registries; every new local copy is placed at the root; `stop()` ends every child, then the host | `standalone-root-builder.ts:113, 121`; `standalone-root-task-execution-adapter.ts:121-141`; `standalone-agent-run-root.ts:435-466` |
| Copy lifecycle | `RootTaskExecutionLifecycle` (one per root): admission, a FIFO of every copy's transitions (activate, wake, idle shutdown, Stop, closure release, reopen), the idle schedule, live leases | `agent-collaboration/execution/task/root-task-execution-lifecycle.ts` |
| Tree | Since 469, composed in memory from open Task entries keyed by `hostRoot` and each run's own file; the standalone tree file still holds the host, its creation time and peer links | 469 D-1 … D-3; notes "Re-investigation after autobyteus-469" |
| Messages by run ID | Same root: the root's index, which wakes a copy. Else: an active run only | `agent-communication/services/global-agent-run-message-router.ts:60-110` |
| Messages by address | Own team, then the top run's standing agents | `agent-collaboration/collaborators/message-recipient-resolution.ts:58-78` |
| Task closure | The Task side groups the closed runs by `hostRoot` and asks that root to release them | `projects/runtime/task-execution-resource-release.ts` |
| Independent delegated runs already exist | A run a **peer** delegates to this node is an ordinary standalone run, or a top-level team run, with `delegatedFrom`. It has its own idle shutdown and is restored by an inbound message | `remote-collaboration/inbound/remote-delegation-receiver.ts`, `remote-team-run-starter.ts`; `standalone-host-idle-shutdown.ts`; `compositions/collaboration-root-resolver.ts` (`resolveOrRestore`) |

The last row matters most: the target already exists for runs started by a peer. Local delegation adopts the same shape.

## Scope (TC-4: in steps)

| Part | This ticket | Later Tasks (TC-4) |
| --- | --- | --- |
| Data model (contract rev. 5): Task entry `delegatedBy`, `subWork`, peer info in the entry, `taskAgent` removed, `address` in `run_metadata.json`, standalone tree file removed | **Yes, for all stored data** (one migration) | — |
| Delegations made **from a standalone agent run**: the delegated agent or team run is its own run | **Yes** | — |
| Communication centered on the Task (contract §10) | **Yes**, for every run that is its own root | — |
| Delegations made from a team run or an org run | Still hosted by that run, as today (their Stop still ends what they host) | Next Tasks |
| Removing the hosting code | Only what standalone delegation no longer uses | The last step |

Consequence: a team run delegated from the manager becomes a top-level team run. Delegations its members make are hosted by that team run, exactly as for a team run the user starts, until the team step.

## Task Size And Architectural Risk

- Task size: `Large`. It touches the stored model of every run and Task, one migration, the standalone root, delegation, routing, Task closure, idle shutdown, restore, views, the web tree, and the documents.
- Architectural risk: `High`. It changes persistence, ownership boundaries (no hosting), concurrency (each run's own queue instead of one per top run), and shared contracts (the Task entry, stream DTOs).
- Escalation trigger: any reader of `hostRoot`, `taskAgent`, `coordinatingRun` or the standalone tree file not decided in V-10; a message route that today works and the Task rule refuses for a run that has a Task.

## Data-Flow Spines

| ID | Scope | Start → End | Governing owner |
| --- | --- | --- | --- |
| DS-1 | Primary | `delegate_task` in a standalone run → a new run working on the Task | `StandaloneTaskDelegation` (new; replaces the hosting branch) |
| DS-2 | Primary | `send_message_to(run ID)` to another run → delivered and the receiver woken | `GlobalAgentRunMessageRouter` with `TaskCommunicationScope` (new) |
| DS-3 | Primary | `send_message_to(address)` beyond the sender's own run → delivered | The sender's root resolution, then DS-2 |
| DS-4 | Primary | The user stops a run → that run only | The run's own root |
| DS-5 | Primary | Task DONE/CANCELLED → every run of it stops | Task side → each run's own root |
| DS-6 | Primary | Reopen + the assigner's message, or a follow-up Task → the run continues | DS-2 + the Task side's reactivation |
| DS-7 | Bounded local | A quiet delegated run → shut down; its next message restores it | The run's own idle shutdown |
| DS-8 | Primary | The user opens a run → its rows (one hop) with live status | The run's view projection |
| DS-9 | Operational | Update restart → busy runs resumed | `RestartResumer` |
| DS-10 | Operational | First start after the update → stored data converted | One app-data migration |

### DS-1 Delegate

`agent calls delegate_task → sender's StandaloneAgentRunRoot → StandaloneTaskDelegation → Task side: linkNewTaskExecution (entry with delegatedBy = {this run, the delegator}, start: starting) → IndependentRunStarter: prepare an ordinary standalone run (agent) or create a top-level team run (team), with the resolved launch, its own address and launchSource → the new run's root is registered in ActiveCollaborationRootDirectory → the work packet is delivered to its entry agent through DS-2 → Task side: markStarted → tool result (same text as today)`

- `IndependentRunStarter` is the local twin of the peer path's two starters. It takes their "prepare a standalone run / create a team run" half; the peer receiver keeps only its peer-specific part (G-9: catalog port, temp workspace, signature).
- Refusals keep today's texts and order: CM-1, folder, target, launch.

### DS-2 Message by run ID

`sender's agent → send_message_to → GlobalAgentRunMessageRouter: (1) same run: the sender's root, as today; (2) TaskCommunicationScope.route(sender, target): find the target's run from the Task records, then admit it (§10.2: same open Task, or the assigner's run; closed → refused, except the assigner's reactivation) → CollaborationRootResolver.resolveOrRestore(target run) → target root.deliverExactAgentMessage (wakes the agent) → both runs' logs; (3) live-only, as today`

- `TaskCommunicationScope` is the one owner of "may these two runs talk, and where is the receiver" (Principle 13). It reads only the Task side's in-memory records and the target run's own file (a stopped team's member, V-14).
- The receiving root checks the same scope before it accepts, so a stale sender cannot bypass it.

### DS-3 Message by address

`sender's root → resolveMessageRecipient: (1) own team, unchanged; (2) its own run's standing agents, unchanged; (3) new: the standing agents of the run that assigned the sender's Task, from TaskCommunicationScope.assigningRunOf(sender run) → that run's placement → DS-2 delivery`

### DS-4 Stop

`user → AgentRunService.terminate(run) → that run's root.stop() → its own agent (or its own team members) only`

Nothing else stops. A delegated run's report later wakes its stopped delegator (DS-2), which is TC-1.

### DS-5 Task closure

`update_task DONE → ProjectTaskService → TaskExecutionResourceRelease: for each closed run of the record → that run's own root (by its own identity, not hostRoot) → root.stopForTaskClosure() → stopped; a peer's run: fenced as today → the Task side publishes the change; views drop the run (469)`

### DS-6 Reopen and follow-up

`assigner's send_message_to(run ID) → DS-2: TaskCommunicationScope finds the run in a closed entry; the sender is its assigner → Task side reopenAssignment → resolveOrRestore → delivered`. A follow-up Task by run ID works the same way with `assignExistingTaskExecution`.

### DS-7 Idle shutdown

`the run's own agent status → its own idle schedule (StandaloneHostIdleShutdown for an agent run, RemoteTeamIdleShutdown's local twin for a team run) → shut down when quiet → the next message restores it (DS-2)`

The peer path already does this. Both schedules lose the word "remote" and serve every delegated run.

### DS-8 View

`user opens run X → X's root view: its own parts + child rows from the open Task entries with delegatedBy.run = X (469's composition, one hop) → each child's status from its own root when it is active, "offline" otherwise → the client shows rows under the delegator agent (delegatedBy.agentRunId)`

- Opening a view never starts a run (AR-008).
- A child row opens the child's own run view, as a remote child's row does today.

### DS-9 Update restart

Each busy run is recorded under its own root. The resumer resolves each root and resumes it. The order follows `delegatedBy`, bottom-up: a delegated run first, then its delegator, so a report wakes nothing twice (AR-004).

### DS-10 Migration (one app-data migration, sealed area)

| Step | Source | Target |
| --- | --- | --- |
| 1 | Task entry `hostRoot`, `assignedBy` | `delegatedBy { run: the delegator's run (one hop, from the run's own file and the stored runs), agentRunId }`; 31 nested entries get the delegated run they were delegated from |
| 2 | role `delegated` | `subWork` (28) |
| 3 | Peer link in a standalone tree (2) | `nodeId`, and `members` for a team, on its Task entry |
| 4 | `taskAgent` on 196 runs | Removed. Agent run: `address` and `launchSource` → `run_metadata.json`. Team run: `rootTeam.defaultLaunchSource`. `userLaunchSelection` (9): V-11 |
| 5 | Standalone `collaboration_tree.json` (8) | `host.address` → the run's `run_metadata.json` `address`; the file removed; the message log stays |
| 6 | Team and org `taskExecutions` and `remoteTaskExecutions` lists | Removed |
| 7 | Busy-run record (pending, after an interrupted update) | Each entry under its own run's root |

Rules:
- Per run, with an atomic write per file. A run that cannot be converted is left intact and reported (DESIGN.md rule 7).
- Task records are converted before the files of the runs they name.
- A frozen copy of every source shape lives in `frozen/`.
- The 469 save rule stays valid on the converted data: there are no local entries left.
- Fixtures per case E1 … E10 of the contract and per partial state of a released migration (469's lessons AR-002 and SR-007).

## Ownership Map

| Owner | Owns |
| --- | --- |
| Task side (`TaskExecutionResourceService`) | Every entry, `delegatedBy`, open/closed, reopen; the index "open entries by `delegatedBy.run`" (469's index, re-keyed) |
| `TaskCommunicationScope` (new, `agent-collaboration/communication/`) | Locating a run from an agent run ID; admission by the Task rule; the assigning run of a Task |
| `StandaloneTaskDelegation` (new) | DS-1's order: Task entry, start, packet, `markStarted` |
| `IndependentRunStarter` (new, extracted from the peer path) | Creating an ordinary agent or team run for a delegation |
| Each run's root (standalone, team) | Its own agent(s), log, queue, idle shutdown, Stop, view |
| `CollaborationRootResolver` | Resolving or restoring a run's root by identity (existing) |
| The migration | DS-10 only |

## Removal / Decommission Plan (this ticket)

| Removed | Why | Replaced by |
| --- | --- | --- |
| The hosting branch of `StandaloneRootTaskExecutionAdapter` and the standalone root's use of `RootTaskExecutionLifecycle` for copies; its `rootAgents` / `teams` registries for copies | Nothing is hosted by a standalone run | `StandaloneTaskDelegation`, each run's own root |
| `standalone-root-tree-*` (schema, mutator, path) and the tree part of `standalone-root-package-store.ts` | The file is removed (TC-8) | `run_metadata.address`; Task entries |
| `taskAgent` readers (10 files), `TaskAgentCoordinatingRun` | Contract rev. 5 | `delegatedBy`; the run's own fields |
| `hostRoot` and `assignedBy` in the Task side and the client (14 files) | Contract rev. 5 | `delegatedBy` |
| 469's `CoordinatingRunPresence` | A delegated run is an ordinary run, listed on the Memory page like any run | — |
| The "same root" condition in the router and the standalone root's index lookups for copies | The Task decides | `TaskCommunicationScope` |

Kept for team and org runs until their Tasks (TC-4): `RootTaskExecutionLifecycle`, the team and org adapters, their hosting.

## Earlier Review Findings (ARCH-REV-001 on SR-010) and Their Answer Now

| Finding | Answer in this design |
| --- | --- |
| AR-001 Task membership of an independent run | The Task entry is the membership and the relationship (contract §2.1); DS-1, DS-5 |
| AR-002 Message routes beyond the pair | Contract §10: Task-centered, today's reach, validated on 1,604 messages; DS-2, DS-3 |
| AR-003 Derived consumers of the composed tree | V-10, as a table in the next revision of this design: every reader of `hostRoot`, `taskAgent`, `coordinatingRun`, `remoteTaskExecutions`, the standalone tree, `listAgents` (token total, context files, last activity, process supervisor) |
| AR-004 Restart resume | DS-9 and migration step 7 |
| AR-005 Migration shapes | DS-10, with fixtures per contract case and per released partial state |
| AR-006 Two sources for nested rows | One source: open entries by `delegatedBy.run`, one hop (DS-8) |
| AR-007 Archive/delete of a delegated run | It is an ordinary run: archive and delete as any run; refused while a run it delegated to works on an open Task (TC-2) |
| AR-008 Opening a view starts the agent | DS-8: a view reads, it never starts |
| AR-009 Peer-only pieces | `IndependentRunStarter` and the idle schedules move out of `remote-*`; the peer receiver keeps only peer concerns |
| AR-010 Stale notes | The notes have a new section for the 469 base |

## Open Before The Next Revision

| ID | Open item |
| --- | --- |
| TC-9 | The user: the 15 legacy runs as ordinary runs in the run list |
| V-10 | Every reader of the removed fields, with a decision each (AR-003) |
| V-11 | Why a Settings edit of a stopped copy was kept beside its started launch |
| V-14 | Finding a non-coordinator member of a stopped delegated team |
| U-A | The concurrency that one queue per top run gave: closure release vs. reopen vs. wake of one run. Target: that run's own root queue. To be checked against the lifecycle's ordering guarantees (AR-001 of an earlier ticket) |
| U-B | The client: a child row of a local delegated run reads like a remote child (summary, own stream); what of the web tree changes |

## Risks

| Risk | Mitigation |
| --- | --- |
| A message route that works today is lost | The rule was validated on every stored message; tests per case W1 … W11 |
| A run becomes unreachable when its Task record is unreadable | Reported, as 469's DEC-010; nothing else depends on it |
| Ordering of closure, reopen and wake without one shared queue | U-A before implementation |
| The migration on real data | Fixtures per shape and partial state; never run on user data |
| Size | TC-4: only standalone delegation in this ticket |
