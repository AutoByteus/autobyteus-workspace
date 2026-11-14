# Design Spec

## Solution And Approval Basis

- Current solution revision ID: `SR-081` (the old-name correction is checked before address step 2). Earlier: `SR-080` (the Task card opens its run in its tree's top view: `topRun` on the Task's run view). Earlier: `SR-079` (every late predecessor, failed or waiting, classified; follow-ups for writers and readers through one mechanism). Earlier: `SR-078` (a preserved copy's history row created when first needed; an unconvertible root answers base's reasons at connect and at its first message). Earlier: `SR-077` (the model's S26 stops M before the delete, with the mutation's result shape; a preserved copy is not editable until its predecessor finishes). Earlier: `SR-076` (a message whose Task closes during its durable write stays in the log and is shown, as at base). Earlier: `SR-075` (CR-461-064: a delegated team's team-level choice saved as any team's, a run does not list its own definition, the error card on the run's own path, a deleted run takes its Tasks with no Project). Earlier: `SR-074` (the Team tab: one in-view rule for the read and for live; the unreadable-record check before the root loads). Earlier: `SR-073` (a listed team's or org's delegated rows show when it is opened, as at base). Earlier: `SR-072` (the Team tab's messages composed over the run's subtree; CR-461-055's seven questions decided). Earlier: `SR-071` (refusals in base's order, codes and texts: R-8 before R-7, a team run's ID answered with its coordinator's). Earlier: `SR-070` (DS-15: the user's message to a delegated run; the closed-Task input fence restored in each run's own root). Earlier: `SR-069` (a peer run takes no `@` mentions, as at base). Earlier: `SR-068` (`hasCollaboration` returns on the agent run history item, from the stored row). Earlier: `SR-067` (every spine walked for every case; G-1 archive/delete asks peer runs, G-2 a deleted run leaves the tree, G-3 the agent stream at connect). Earlier: `SR-066` (a peer child is reached by its own identity, through `PeerAgentRun` / `PeerTeamRun`, never through its delegator; REQ-013). Earlier: `SR-065` (each local child's model options come from its own queries; its peer route is replaced by SR-066). Earlier: `SR-064` (an agent run's own stream follows its run; a child's Settings save composed by the web from each run's own save). Earlier: `SR-063` (`RunViewStream` is base's `RootEventPublisher` moved out of the root). Earlier: `SR-061` (the frontend contract: views in base's shapes, every run reached the same way; the names `DelegationIndex` and `CollaborationTree`). Earlier: `SR-033` (the contract's Task rules as cases; SR-031: the contract's executable model and generated walkthrough). Earlier: `SR-027` (the contract starts from the runs the user starts and from talking inside one run: RUN-1 … RUN-4, IN-1 … IN-8). SR-026 was contract revision 7: every case in one file, checked case by case; TC-13, one place for an agent run's log. SR-025 answers ARCH-REV-008 AR-018: TC-12 revised, a delegated team run is rooted at `/`). SR-024 first added TC-12, raised by the Implementation Engineer. SR-023 answered ARCH-REV-006: AR-016, AR-017. SR-022 was contract revision 6: the run's own `delegatedFrom` and the in-memory `DelegationIndex`, the user's decisions TC-10 revised and TC-11). SR-021 passed architecture review ARCH-REV-005 (answering ARCH-REV-004: AR-005, narrowed again). SR-020 answered ARCH-REV-003 (AR-005). SR-019 answered ARCH-REV-002 (AR-004, AR-005, AR-008, AR-011 … AR-015). SR-018 was self-validated and approved by the user for review. SR-017 widened the scope to team and org runs (TC-4 revised). A new design on the 469 base. It replaces the design of SR-010, which was built on contract revision 2 and failed architecture review ARCH-REV-001 (AR-001 … AR-010, answered below).
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
- **The relationships live in an in-memory `DelegationIndex`**, owned by collaboration. It is built from the Task records at startup and kept current with every Task change. It answers who delegated whom, who can reach whom, and which run an agent is in. It owns no run (contract §4, TC-11).
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
| `DelegationIndex` (`agent-collaboration/delegation/delegation-index.ts`) | Collaboration | The relationships between runs, in memory (contract §4): nodes, one-hop edges, each node's Tasks and agents, each Task's assigner. Built at startup from the Task records (through `TaskExecutionResourcePort`); kept current by the Task side's change notice for one Task (`entriesChanged(taskId)`, a notification), on which it re-reads that Task's entries. Agents are read once per run from its own file; an org run is re-read on a miss. Questions: `runOfAgent`, `parentOf`, `openChildrenOf`, `assignerOf(task)`, `tasksOf(run)`, `subtreeOf(run)`, and **`canMessage(runA, runB)`**: the communication rule (contract §2.2) is a property of the tree, so the tree owns it. The same tree feeds the views (DS-8), so what the user sees and who can talk come from one structure. It owns no run |
| The Task side (`TaskExecutionResourceService`) | Task records | It owns the records and their order of change. It keeps no relationship maps; it notifies `DelegationIndex` after each committed change of a Task's entries |
| `CrossRunMessageDelivery` (`agent-collaboration/communication/`) | Delivering a message between two runs | The order of one message between two runs: find the receiver's run and ask `canMessage` (`DelegationIndex`), restore the receiver, the receiver's accept and log, then the sender's log. It owns no rule of its own: the rule is the tree's |
| `TaskDelegation` (`agent-collaboration/execution/task/`) | Delegation | `delegate_task`'s order for a new run (Task entry, start, work packet, `markStarted`) and for an existing run (follow-up Task). Root-neutral: the standalone, team and org roots all delegate through it |
| `DelegatedRunStarter` (`agent-collaboration/execution/delegation/`) | Starting a delegated run | Creating an ordinary agent run or team run for a delegation, with its resolved launch, address and `launchSource`. A team run is created rooted at `/`, like every team run and like the peer path already does (contract §3.2, TC-12 revised); the delegation address goes into the Task entry's `recipientAddress`. Extracted from the peer path's two starters, which keep only peer concerns |
| `DelegatedRunIdleShutdown`, `DelegatedTeamIdleShutdown` | The delegated run's own root | Its idle schedule. Today's `StandaloneHostIdleShutdown` and `RemoteTeamIdleShutdown`, renamed because they now serve every delegated run, not only peer-started ones |

## Data-Flow Spines

| ID | Scope | Start → End | Governing owner |
| --- | --- | --- | --- |
| DS-1 | Primary | `delegate_task` by an agent of any run (standalone, team, org) → a new run working on the Task | `TaskDelegation` |
| DS-2 | Primary | `send_message_to(run ID)` to another run → delivered, receiver woken | `GlobalAgentRunMessageRouter` with `CrossRunMessageDelivery` |
| DS-3 | Primary | `send_message_to(address)` beyond the sender's own run → delivered | The sender's root resolution, then DS-2 |
| DS-4 | Primary | The user stops a run → that run only | The run's own root; for a run on a peer, its `PeerAgentRun` / `PeerTeamRun` (SR-066) |
| DS-5 | Primary | Task DONE/CANCELLED (or deleted) → each run of it stops | Task side → each run's own root |
| DS-6 | Primary | Reopen + the assigner's message, or a follow-up Task → the run continues | DS-2 / `TaskDelegation` + the Task side |
| DS-7 | Bounded local | A quiet delegated run → shut down; next message restores it | The run's own idle shutdown |
| DS-8 | Primary | The user opens a run → its snapshot and numbered frames (8a), its rows at every depth (8b), local and peer statuses and output (8c, 8d), a selected delegated run on its own path (8e), the view across the run's stop and restart (8f) | `RunViewStream`, `ChildRowsFeed`, `LocalChildObservation`, `PeerChildObservation`; rule 2 |
| DS-9 | Operational | Update restart → busy runs resumed | `RestartResumer` |
| DS-10 | Operational | First start after the update → stored data converted | One app-data migration |
| DS-11 | Primary | The run list → each run once, at its right place | The history list projection with the Task side |
| DS-12 | Primary | Save a delegated run's launch from its delegator's Settings → each run's own file | The editor, composing each run's own save (SR-064) |
| DS-13 | Primary | Archive or delete a run → refused while a run it delegated to works (local or peer); a deleted run leaves the tree | `DelegatedWorkGuard`; the run services; `DelegationIndex.runDeleted` (SR-067) |
| DS-15 | Primary | The user messages a delegated run → its own stream, or for a peer its handle; refused while its Task is closed | The run's own root (SR-070) |
| DS-14 | Bounded local | A run a peer started on this node → stopped, restored and watched as itself | Its own root (as base; BEH-008) |

**Every spine is walked for every case** in `evidence/spine-validation/spine-walk-2026-11-12.md` (SR-067). The walk follows each spine through its owners, with the file of each step, for every delegator kind, the delegated run's kind and node, and each run's state. The stored data of each spine is the model's (`collaboration-walkthrough.md`).

### DS-1 Delegate to a new run

`agent: delegate_task(address) → the delegate_task tool service → TaskDelegation.toNewRun → the sender's root, whatever its kind (StandaloneAgentRunRoot, RootTeamRun or AgentOrgRun): delegationSource(sender, address) in its gate, which answers only what the root owns (the sender's identity and address, its own catalog address map, the own-address, own-team and own-definition refusals) and nothing else → TaskDelegation continues outside the root → Task side: linkNewTaskExecution (entry: delegatedFrom = {this run, the delegator}, start "starting"; then it notifies DelegationIndex) → DelegatedRunStarter: prepare an ordinary standalone run (agent) or create a top-level team run (team), with the same delegatedFrom in the run's own file → the new run's root registered in ActiveCollaborationRootDirectory → the work packet delivered to its entry agent (DS-2's delivery step, which starts it) → Task side: markStarted → tool result, same text as today`

- **A root does not delegate** (SR-049). The tool path orchestrates delegation, and the root answers only for its own run. So no root, and no run service that creates roots, depends on `TaskDelegation`, while `TaskDelegation` depends on the run services (through `DelegatedRunStarter` and the root resolver). Dependencies run one way, and there is no cycle. `delegateThrough(...)` / `bindTaskDelegation` leave `root-team-run.ts`, `standalone-root-message-delivery.ts`, `agent-org-run-message-delivery.ts` and `remote-delegation.ts`.
- Refusals keep today's texts and order: CM-1 (never inside one's own team), the Project folder, the target, the launch.
- `delegatedFrom.delegatingRun` is the sender's own run: for a member of a team run, that team run; for an agent of an org run, that org run (contract §3.1, cases DL-1 … DL-6).
- **Role and refusals, from the `DelegationIndex`** (contract §2.4; cases S12 … S15, S23): `runOfAgent(sender)` and `tasksOf(that run)`.
  - If the sender's run has any Task entry, `task_id` is refused with today's `TASK_AGENT_RESOURCE_OWNED_SENDER` text, and described work is `subWork` of the run's current Task: its newest open entry (by `linkedAt`; tie: the greater Task ID). When none of its entries is open, it is refused: "Your Task is DONE or CANCELLED, so you can't start new work."
  - Otherwise the new run is `assigned`: to the saved Task named by `task_id`, or to a new Task with no Project for described work.
- **History row:** `DelegatedRunStarter` writes the new run's history row when it creates the run, as for any new run (DS-11).
- A failure after the entry was written: `markFailed`, and the new run is terminated before the answer. That is today's order.
- The work packet must name the delegator as today, because it is the record of the delegation that the run carries in its conversation (contract §5.1, S1).

### DS-2 Message by run ID

`sender's agent: send_message_to(run ID) → GlobalAgentRunMessageRouter:`
1. **The same run:** the sender's own root, as today (teammates of a team run, agents of an org run).
2. **Another run:** `CrossRunMessageDelivery.route(sender, target)`:
   - `DelegationIndex.runOfAgent(target)` finds the run.
   - Admit by contract §2.2: same open Task, or the assigner's run. A closed Task is refused, except the assigner's reactivation (DS-6).
   - `CollaborationRootResolver.resolveOrRestore(that run)`, then the receiver's `root.acceptFromRun` in its gate. The gate re-checks the Task rule at its head, writes the **receiver's** log, and wakes and delivers.
   - Then the sender's root writes the **sender's** log, with the same message ID (`commitSent`).
   - This is the peer path's order (`remote-message-send.ts:20-24`): prepare without a state change, the receiver accepts and writes its own log, then the sender writes its own. Each root writes only its own log (Ownership Map).
   - If the receiver refuses, nothing is written. If the sender's log write fails after the receiver accepted, the message is delivered and the sender's root takes its existing persistence fail-stop (`standalone-root-persistence-coordinator.ts`, `latchAndThrow`), as for any failed write of its log.
3. **Live-only**, as today.

**Refusals: base's order, codes and texts** (SR-071; CR-461-045 / F-18, CR-461-046 / F-19; REQ-009 "the same results and texts"; contract §2.2, R-7, R-8, R-12; model S20, U9, U10):
- **Order:**
  1. the assigner's continuation (R-6);
  2. a receiver whose Tasks are all closed is refused as closed (R-8, `TASK_AGENT_RESOURCE_CLOSED`, "Only the agent that assigned…"), whoever sends;
  3. only then, runs of different open Tasks (R-7, `TASK_AGENT_RESOURCE_CONFLICT`).

  Base answered the closed target first (`root-task-execution-lifecycle.ts:306-313`, `reactivateClosedTarget` before delivery). The branch's `CrossRunMessageDelivery.admit` checked R-7 first.
- **A team run's ID** given as `target_agent_run_id` is answered `TARGET_IS_TEAM_RUN` with its coordinator's run ID, in base's text, **whether the team runs or not** (R-12). Base found the coordinator only while the team's host root was loaded. The branch answers it from the `DelegationIndex` (the run's entry agent), else from the team's own file, before the R-9 / R-11 fallbacks.
- **`delegate_task` refusals keep base's texts.** For example, `target_agent_run_id` naming a member of a team the sender delegated to is answered as at base: "<id> is not one of your task agents. Use a run id that delegate_task returned to you, or delegate to a new task agent with recipient_address." The branch's more specific member text is reverted, because what an agent reads does not change (non-goal).
- **The check:** every `send_message_to` and `delegate_task` refusal is characterized at `827f1e68dc` and asserted on the branch (the API/E2E suites `task-existing-copy-assignment`, `task-reactivation-root-visibility`, `teammate-delivery-task-closure-race`).

`DelegationIndex.canMessage` is the one owner of "may these two runs talk" and `runOfAgent` of "where is the receiver" (Principle 13); `CrossRunMessageDelivery` owns the order of the delivery. Both answer from memory: nothing is resumed to find a receiver, also after a restart.

### DS-3 Message by address

`agent: send_message_to(address) → the send_message_to dispatcher (the tool service) → the sender's root, in its gate: (1) its own team, unchanged (resolveMessageRecipient's own-team step) → (2) new, for a run that works on a Task, asked by the dispatcher of CrossRunAddressResolution, not by the root: the standing agents of the run that assigned its Task: DelegationIndex.assignerOf(each open Task of the sender's run) → DelegationIndex.standingAgentsOf(that run), by address, read once from that run's own file (no root is restored to resolve an address) → (3) for a run the user started: its own run's standing agents, unchanged → DS-2's delivery step` (contract §2.3; the steps as the contract numbers them; a miss inside the own team never falls through)

**The delegation tree and each run's collaboration tree** (SR-060; the user's direction of 2026-11-12; contract §4). The old containers' indexes answered every question about a run's collaboration world, and they were the map the user sees in the collaboration tree. This ticket removed the hosting, and with it the indexes' cross-run part. That part was then rebuilt question by question, by five owners: `CrossRunAddressResolution`'s step 2 and `reachingAddress`, `ReachableAgents`, `RunCollaborationContext`, the rows of `RunViewChildren`, and `addressesInUse`. That is why their details kept disagreeing (ARCH-REV-034). **They become one owner: each run's collaboration tree, derived from the `DelegationIndex`.**

- **The `DelegationIndex`** is a forest. A node's tree is **derived** by walking up its parents, never stored (ARCH-REV-035). When a Task deletion removes a run's own entries, that run becomes the top of a tree of its own, and its subtree moves with it. One tree per run the user started, with `byAgentRunId` (agent run ID → run, address, tree) and `byRunId` for direct lookups (contract §4). It is restructured in `delegation-index.ts` and created at composition step 2, as now.
- **`CollaborationTree`** (`agent-collaboration/delegation/collaboration-tree.ts`), from `delegationIndex.collaborationTreeOf(run)`, is derived when asked and never stored. It works whether or not the run is loaded, because it reads only the tree's nodes and their per-run agents and files, read once. It answers:
  - **reach**, steps 1 to 3 of §2.3, in one enumeration, with the old-address correction **before** step 2 (SR-081: an address under the run's own delegated name means its own teammate);
  - **the addresses in use;**
  - **the sender address** a receiver may use (§2.5);
  - **the rows** under the run (its open subtree, nested by parent and delegator; identity only, SR-056);
  - **the collaboration context:** task agent, the organization line, and an org copy's inherited rules and instruction;
  - `canMessage`;
  - the subtree for token totals and the restart notice.

  Steps 1 and 3 use the same run file that a loaded root's own index is built from, so the two agree. A test asserts it, for a team run and an org run: the map's step 1 and the loaded root's `memberOfInstance` / `getMessagePlacement` give the same receiver for every address (ARCH-REV-035).
- **The folded owners:**
  - `CrossRunAddressResolution` goes (ARCH-REV-035): with the enumeration in the map, it would only forward to it, an empty layer (Principle 13). The `send_message_to` dispatcher resolves an address through `collaborationTreeOf(sender)` and hands the receiver to `CrossRunMessageDelivery`.
  - `ReachableAgents` and `RunCollaborationContext` are replaced by the map, and their callers read `collaborationTreeOf(run)`: the mention note, `list_available_agents`, `delegate_task`'s in-run placements, and the member context builders.
  - The rows of `RunViewChildren`, `ChildRowsFeed` and the poll come from `collaborationTreeOf(run).rows`. The row builder adds `source` for the view (SR-056).

**What the old indexes answered, method by method, and where each goes** (`standalone-root-execution-index.ts`, `team-execution-index.ts`, `agent-org-execution-index.ts` at `827f1e68dc`):

| Old methods | About | After this ticket |
| --- | --- | --- |
| `getAgent` / `requireAgent`, `agentAddressOf`, `getTeam` / `requireTeam`, `rootRunId` / `hostAddress` | Looking up an agent or a team | A run's own parts: its own index, unchanged. An agent of another run: `delegationIndex.byAgentRunId` |
| `getTaskExecution`, `listTaskExecutions`, `listChildAgents`, `listTaskExecutionChainForAgent` | Copies hosted in the root, and their chain | `collaborationTreeOf(run).rows` (the open subtree) and the node's parent chain; the copies are gone from the root's index |
| `listAgents`, `listTeams`, `listDirect…`, `listTeamAncestorsDeepestFirst`, `listContainingTeamAncestorsForAgent` | Navigating the run's own parts | The run's own index, unchanged (members, sub-teams, mounted teams) |
| `getMessagePlacement`, `getConfiguredPlacement`, `teamInstancesOf`, `memberOfInstance`, `isOwnTeamAddress`, `instanceDefinitionsOf` | Reach by address, and CM-1 | Steps 1 and 3 and CM-1: the run's own index. Step 2, the addresses in use, the sender address shown: `collaborationTreeOf(run)` |
| `getPhysicalScope…`, `getMemoryPlacementForAgent` | Where a copy's memory lived inside the root | The run's own root: each delegated run has its own folder (the memory layout ticket); no cross-run answer |

Any caller of these methods that the change leaves without an answer in this table is an escalation. The Implementation Engineer confirms each caller against the table, and lists them in the handoff.

**What a delegated run sees as in its run** (the `@` note, `list_available_agents`, and the in-run part of `delegate_task`; REQ-009, the non-goal "no change to what an agent reads"; SR-059). At base a copy was hosted in its delegator's root, so the delegator's agents were "in the run" for it. Now the rule follows address reach: **a run's in-run set is exactly what it reaches by address (§2.3)**:
- step 1, its own team;
- for a run that works on a Task, step 2, the standing agents of the run that assigned it (`DelegationIndex.assignersOf` its open Tasks → `standingOf`, each with its definition from the tree's per-run agents);
- step 3, its own run's standing agents.

One owner computes that set, beside `CrossRunAddressResolution` (`ReachableAgents`), and the `CollaboratorRootPort`'s in-run read becomes async to include it (ARCH-REV-034):
- **One step-2 enumeration.** `CrossRunAddressResolution` resolves step 2 by looking up `ReachableAgents`' address map, never by its own walk: the open Tasks in Task-ID order, else all the run's Tasks, and their assigners in run order, first match winning. So a run can send to an address exactly when its note and list say it is in the run, also when all its Tasks are closed.
- **One definition at two addresses** is preferred in §2.3's order: its own team first, then step 2, then step 3.
- **`addressesInUse`** is taken from the same set. A catalog address therefore never lands on an address step 2 already resolves, as at base, where a hosted copy used its host's addresses in use.

Its readers:
- **the `@` mention note** (`CollaboratorAdmission.resolveMentions`): an assigner's own agent (an agent run the user started) is `run_agent`, as at base: "talk with it using send_message_to; you can't delegate to it". An assigner's configured placement is `in_run`, at the address step 2 resolves: "talk with it using send_message_to".
- **`list_available_agents`**: it lists them at those addresses.
- **`delegate_task`'s in-run placements:** the same set, so an address step 2 reaches is answered as base answered it for a hosted copy. A characterization test **at `827f1e68dc`** captures the exact answers for the assigner's own agent and for an assigner's configured placement. The branch asserts the same (SR-052's method).

Tests: CPW-M2 and CPW-M5 read base's notes, plus that characterization test.

**A run does not list its own definition** (SR-075, F-40). `list_available_agents` of a delegated run leaves out its own catalog name, as every run does (autobyteus-455 AC-006; SR-037, approved in the requirements' non-goal exception). At base a hosted copy listed it only because the list was its host's. It then refused delegating to it (CM-1, CR-461-050). Listing an address the run can't use would mislead the agent.

### DS-4 Stop

`user: Stop → the run's service by its own run ID (agent run, team run or org run) → that run's root.stop() in its gate → its own agent, its own team members, or its own org units, only`. For a run on a peer: `the run's service → peerRunOf(runId).terminate() → ownerCommand(terminate)` on its node (SR-066)

Nothing else stops (TC-1). A delegated run's later report wakes its stopped delegator (DS-2).

### DS-5 Task closure

`update_task DONE → ProjectTaskService → TaskExecutionResourceRelease: for each closed run of the record → that run's own root, by the run's identity → root.stopForTaskClosure() in its gate → stopped`

- A peer's run is fenced, as today.
- Views drop the run (469).
- Deleting a Task: its open runs are stopped first, then the record goes, and the runs are ordinary runs (contract §5.1, S16, T-3).

### DS-6 Reopen and follow-up

`assigner: send_message_to(run ID) → DS-2: CrossRunMessageDelivery sees a closed entry whose assigner is the sender → Task side: reopenAssignment → the run's root, in its gate: re-check open, restore, deliver`

A follow-up Task by run ID: `TaskDelegation.toExistingRun` → Task side `assignExistingTaskExecution` → the same delivery.

### DS-7 Idle shutdown

`the run's own agent status → DelegatedRunIdleShutdown / DelegatedTeamIdleShutdown → at the grace end, in the run's gate: shut down if quiet → the next message restores it (DS-2)`

### The frontend contract: views in base's shapes, every run reached the same way (SR-061, the user's direction of 2026-11-12)

This section governs every web-facing part of DS-8 and of SR-039 … SR-059. Where an earlier item below says otherwise, this section wins.

**Rule 1: what is shown under a delegator is a view, in base's shapes.** The container used to be the view. Now the backend builds the same view from each run's `CollaborationTree`, and sends it in **the shapes the frontend got at `827f1e68dc`**:
- **the snapshots:** a run's delegated runs placed in its tree under their delegator, at every depth, with their records, and the closed set;
- **the live events:** `task_execution_started` / `TASK_EXECUTION_STARTED` with the record, `task_executions_closed`, `task_executions_reopened`, `remote_task_execution_started`, and `remote_task_execution_summary`;
- **the run list's reads:** the listed agent runs' `agentRunCollaborationStatuses` with its digest, and a team's or org's execution rows in its history read, which include its delegated runs;
- **the delegated rows' statuses:** each child's status, projected by the backend from that run's own root into the delegator's view, as base showed a hosted copy's status. A delegated team's members show their live statuses unselected, as at base.

The frontend renders them and decides nothing about relationships. The closed set has its base meaning, produced by the tree: a delegated run whose Tasks are all closed while it still runs. It leaves the tree when it stops (469).

**Rule 2: a delegated run is reached like any run of its kind.** Selecting a delegated row uses that run's **own standard path**, by its own run ID: `AgentStreamingService` for an agent run, `TeamStreamingService` for a team run. That is the path the web uses when the run is opened directly, for:
- its conversation and live output;
- messages, with their `@` mentions;
- interrupts, tool approvals and Stop.
- its error card. A delegated run's failed start, or any conversation error, is part of its own conversation. Selecting its row therefore shows the card in the agent-run, team and org views alike (SR-075, F-41). Each view's row shows the run's `error` status and message from the run's own status. No delegator's view carries another run's card in its own conversation.

The same holds for a child's Settings: a launch edited in the delegator's Settings is saved through that run's own stopped-run save, the call its own Settings uses. The delegator's view only shows rows. Nothing about a delegated run goes through the delegator.

**An agent run's own stream follows its run, whoever restores it** (SR-064, IR-013). At base only a standalone run's own user restored it, so `AgentStreamHandler` bound a session to the run in two cases only: at connect, when the run is already active (`agent-stream-handler.ts:154-155`); and on that session's own `SEND_MESSAGE` (`onActiveRunReady`, `:381`). Now a delegator's Task message restores a stopped delegated agent run (DS-2). A user who watches that run on its own stream would see its status move (rule 1) but no live conversation. So the agent stream gets the rule the team and org view sessions already follow (SR-046):
- **The rule:** an open agent stream session follows its run by run ID. When the run becomes active, the session binds to it, whoever restored or started it: a delegator's Task message, a peer, a restart resume, or another session. When the run stops, the session unbinds, sends `AGENT_STATUS`, and stays open.
- **The source, one** (ARCH-REV-039 note 3): the standalone root's `onHostReady`, the pattern `StandalonePairedAgentAccess` uses for a peer that started the run (autobyteus-278):
  - **Finding the root:** the session finds it through `ActiveCollaborationRootDirectory.onRegistrationChanged`, the lifecycle the team and org sessions follow. A standalone root is committed there when it is created (`standalone-agent-run-root-manager.ts:366-369`), before anything is delivered through it.
  - **On registration:** the session binds to `root.activeHostRun()` if it is live, and subscribes to `root.onHostReady`.
  - **The binding:** `onHostReady` fires in `readyHost` (`standalone-root-message-delivery.ts:184`), inside the root's gate, after the run is made ready and before any message is posted. So the binding comes before the run's first event, for every kind of input. An `AgentRun` restored after an idle shutdown is a new run, and the session rebinds to it.
  - **At connect** (SR-067, G-3): when the run's root is already registered, the session takes it at once. It binds to `activeHostRun()` if that is live and subscribes to `onHostReady`, so a stream opened while the run is registered but idle-shut-down still follows the next restore.
  - **On unregistration:** the session drops the root's subscription and unbinds.
- **Idempotent:** binding a session that is already bound to the same `AgentRun` does nothing. The own-send `onActiveRunReady` stays, and becomes the same call.
- **No web change:** the web opens the run's own stream as at base.
- **Tests:**
  - a stopped delegated agent run's own stream is open; the delegator's Task message restores it; its first event and its output arrive on that stream without a reconnect or a send;
  - the run stops, and the session stays open with the stopped status;
  - a session's own send while the run is being restored binds once and does not duplicate events.

**A child's Settings save, composed by the web from each run's own save** (SR-064, IR-013). SR-039's server composition (`updateDelegatedLaunchSelections`, `DelegatedLaunchSelectionService`, `DelegatedChildLaunches`) goes with rule 2, and so does `stopDelegatedExecution`. Their callers go too, so they are removed. The Save in the delegator's Settings keeps SR-039's behavior, composed in the editor from the runs' own calls:
- **The calls:**
  - for an agent child, `UpdateStoppedAgentRunSelection`;
  - for a team child, `UpdateStoppedTeamRunSelections`, with its team-scope patch or a member patch at the member's address in its own team.
- **Check first:** if a named child's row status (rule 1) is running, the whole Save is refused before any write. The check is a convenience. Each run's own save still refuses an active run itself (`RUN_ACTIVE`), so a child that starts between the check and its write ends as the failure below.
- **Then apply:** the parent's own patches, then each child, in row order.
- **On a failure:** the editor reports the runs already saved and the one that failed, through the outcome display it already has. Each saved run keeps its save, since each file is that run's truth. The editor then reloads the rows.
- **Peer children:** they keep no editable launch, as at base.
- **The children's model options** (SR-065): the editor reads each local child's own options with the queries its own Settings uses: `AgentRunModelOptions(agentRunId)` and `TeamRunModelOptions(teamRunId)`. The query `delegatedLaunchModelOptions` and `DelegatedChildLaunches.modelOptions` are removed.

**A child on a peer node is reached by its own identity too** (SR-066, REQ-013 / AC-016; replaces SR-065's "keeps base's route"). At base, a peer child was reached through its delegator's root only to look up its node and target from the root's `RemoteRunLinks`. That lookup was the only reason for the route, and the only source of `ROOT_NOT_ACTIVE`. Everything else is per node:
- the channel is one per process (`findProcessRemoteRunChannel`, `remote-run-channel.ts:125`);
- a command is `channel.ownerCommand(nodeId, targetRoot, agentRunId, command)` (`:106`);
- node B admits it by the run's back-link, which never changes for a run (`admitsOwner`, `remote-run-links.ts:144`).

So:
- **`PeerAgentRun` and `PeerTeamRun`: a run on a peer node, as an object you act on** (the user's decision, 2026-11-12: "PeerAgentRun and PeerTeamRun … architecture wise symmetric"). A peer run is in the `DelegationIndex` and in its delegator's `CollaborationTree` exactly like a local one: the same entry, plus its node (its `PeerRunLink`). What differs is only where it executes. So, as the user acts on a local run through its run, they act on a peer run through its handle:
  - **Where:** `agent-collaboration/execution/remote/peer-agent-run.ts` and `peer-team-run.ts`.
  - **What it is:** each is built from the run's `PeerRunLink` (from the index's `peerChildrenOf`, which the member projection services already use) and the process's channel (`findProcessRemoteRunChannel`).
  - **State:** none of its own. The run's state is on its node, so a handle is made when needed, with no registry and no lifecycle.
  - **Methods**, named as on the local run wherever the meaning is the same:
    - `terminate()` → `ownerCommand(terminate)`. A team's goes to its coordinator, as base's `peerTeamCoordinatorRunId` does;
    - `postMessage(...)` and `interrupt(...)`, to a member for `PeerTeamRun` → `ownerCommand`;
    - `readConversation(agentRunId)` → `agentProjection`;
    - `observe(observer)` → `observeRun`, which never reconnects (DEC-807), as at base;
    - `status()` → `runSummaries` (one request per node), for the archive and delete guard (DS-13, SR-067).

    Base's `executeRemoteChildCommand`, `stopRemoteChild` and the root's `RemoteChild` reads become these methods, now given the link from the tree instead of the root's `RemoteRunLinks`.
  - **No shared base class with the local `AgentRun` / team run.** A peer run has no tool approval, no Settings here and no local files, as at base. It has one failure the local run does not: "Couldn't reach {node}.". Where code treats both alike, it asks once whether the run is local or on a peer.
  - **Finding one:** `peerRunOf(runId)` looks up a run ID in the `DelegationIndex` (`byAgentRunId` / `byRunId`). It builds the link with the same `peerRunLinksOf` builder the roots' `RemoteRunLinks` use, so the handles and the agents' own peer collaboration read one set of facts (ARCH-REV-040 note 2). It returns a `PeerAgentRun`, a `PeerTeamRun`, or `null`. It never reads a root, so it works the same whether the delegator is running, stopped or deleted.
  - **Refusals:** `null` gives `NOT_FOUND`. With remote collaboration off, base's off text. An unreachable node gives base's "Couldn't reach {node}.".
- **Stop is the standard terminate, for every row.** A peer row's Stop calls the same mutation as a local row, `terminateAgentRun` / `terminateAgentTeamRun` by the run's own ID, so the Stop button has one path. The run services' terminate asks `peerRunOf(runId)` when the run is not on this node, and calls the handle's `terminate()`. `peerRunOf` is given to them at composition. Removed: `stopDelegatedExecution`, its GraphQL type, `PeerChildStop` (SR-065) and `DelegatedLaunchSelectionService`.
- **Message, interrupt and the stored conversation:** the web keeps base's shapes (rule 3). A peer row's commands still arrive as the delegator's view command, and its conversation as the member projection read. The server finds the target's handle with `peerRunOf` and calls its `postMessage`, `interrupt` or `readConversation`. That works in a stored view session too (SR-046), with no root.
  - **`@` mentions** (SR-069, CR-461-035): a peer run takes none, as at base. autobyteus-278 REQ-808 made a run on another node text-only: base's web gives its composer no mention scope (`useComposerTarget.ts:69`, "a run another node runs takes no `@`"), and base's probe asserts that `@` opens no menu there (`remote-runs-in-tree-probe.mjs:357-360`). So the base web never sends mentions for a peer row. A client that sends them anyway was refused at base too: the root's `resolveCollaboratorMentions` found no such agent in its index (`RUN_NOT_FOUND`). The branch's explicit refusal, `REMOTE_RUN_MENTIONS_UNSUPPORTED`, keeps that, with a clearer text: nothing reaches the user that base's web would send. A note composed on this node would also name addresses the peer run cannot reach, because across nodes only run IDs work. Test: the characterization at `827f1e68dc` of the peer composer's mention scope (null), and the server's refusal of mentions for a peer target. Removed: the remote branches in the three roots (`executeRemoteChildCommand` and `stopRemoteChild` calls; base `root-team-run.ts:373`, `agent-org-run.ts:411`, `standalone-agent-run-root.ts:372` and the Stop branches) and the projection resolvers' reads through the root's `RemoteChild`.
- **The live status and output: `PeerChildObservation`,** the peer counterpart of `LocalChildObservation`, owned by the view side (`RunViewStream`).
  - While a run's view is open, it observes that run's open peer rows from `collaborationTreeOf(run)`, through each one's `observe`. Their `remote_task_execution_summary` and output frames are numbered in the view's sequence.
  - **One observation per peer run, shared** (ARCH-REV-040 note 1). Rows show at every depth (SR-058), so a peer run can be a row in its delegator's view and in each ancestor's view at once. `PeerChildObservation` is one node-level owner, keyed by peer run. The first open view showing the run opens its `observe`; each view's `RunViewStream` subscribes to it and numbers its frames in its own sequence; the last view to close it closes it.
  - It caches each peer row's last status in memory. The snapshot connection reads that cache in its one synchronous step (SR-063).
  - A stopped delegator's open view therefore keeps its peer rows live. Base's root-opened observation (`remote-run-observation.ts`) moves here.
  - The list poll is unchanged: a listed, not-open run makes no request per poll (SR-057).
- **What stays in the roots:** the agents' own collaboration with a peer run: `send_message_to` by address or run ID, the reports back, and the delegation itself. These use the root's `RemoteRunLinks` as at base. Only the user's reach to a peer run moves to `PeerAgentRun` / `PeerTeamRun`.
- **Unchanged:** node B's admission by back-link, the peer protocol (no wire change), and the offline behavior.
- **Tests:**
  - with the delegator stopped (standalone, team member and org agent as delegators), a peer Agent child's and a peer Team child's Stop, message and interrupt reach the child on its node, and the delegator stays stopped;
  - the peer row's status stays live in the stopped delegator's open view; a status change during a snapshot appears once (SR-063);
  - its stored conversation opens with the delegator stopped;
  - a command for a run whose back-link doesn't name this node is refused by node B;
  - an offline node gives "Couldn't reach {node}.";
  - the agents' own messages to and from a peer run work as at base.

**The view's sequence: one per run, owned by the view** (SR-062, ARCH-REV-036 AR-024). Base's three clients take the row events inside the view's numbered stream (`advanceSequencedStream`; `agentRunCollaborationContext.ts:158-161`, `agentOrgExecutionContext.ts:232-235`, `teamExecutionViewState.ts:371`). A gap or an unnumbered frame forces a reopen. The checkpoints (`getTeamRunExecutionCheckpoint`, `getAgentOrgExecutionCheckpoint`) are read around a stored hydration, and the stream resumes at their `changeSequence` (`teamRunContextHydrationService.ts:358-372`, `agentOrgStreamingService.ts:490-505`). So:
- **One owner per run X, `RunViewStream`** (`agent-collaboration/delegation/run-view-stream.ts`), created by the composition root's view stream registry, numbers **every frame of X's view in one order**:
  - X's own events, which X's root, while live, hands to it in place of numbering them itself;
  - the tree's row events (`ChildRowsFeed`);
  - the delegated rows' status events (`LocalChildObservation`).

  It exists whether or not X's root is loaded, so a stopped run's view (SR-045, SR-046) is numbered by the same owner. Its sequence lives as long as the process, like base's.
- **`RunViewStream` is base's `RootEventPublisher` (`root-event-publisher.ts` at `827f1e68dc`), moved out of the root** (SR-063, ARCH-REV-037 AR-025), with all of its duties:
  - **its `liveSequenceId`, one per `RunViewStream` instance.** The instance lives as long as the process, so a stop and a restore of the run stay in one live sequence. A server restart starts another. The web keys its participant message positions by (run, `liveSequenceId`, sequence) (`collaborationParticipantMessages.ts:19-23`), as at base;
  - **its `lastMessageChangeSequence`,** in the view's numbers, counting the view's message events: the composed messages of the Team tab below (SR-072), as base's root counted its hosted copies' messages. Row and status frames do not move it. It is in the snapshot and in the history read (`team-run-history-service.ts:92`), as at base;
  - **its snapshot connection** (`openSnapshotConnection`, base `:82-116`), made exact for frames from outside the root as well (the reviewer's option (i)). In one synchronous step, with no await between, it reads the view's base sequence, the tree's rows (`collaborationTreeOf(run)`, in memory) and the observed statuses (`LocalChildObservation`'s cache, in memory). It then captures the run's own parts as base did: a live root's inside its gate, with base's queue for the root's own events published meanwhile. A stopped run's stored parts are captured from its files, where no root produces events. Every row or status frame after the base is therefore a change after the snapshot's rows, so none is duplicated or lost, and base's clients need no idempotence.
- **A snapshot** carries the sequence it was taken at. A connection receives the frames after it, in order. A switch between stored and live mode is ordinary frames in the same sequence, with no new base. A team stream batch keeps its range (`change_sequence` … `change_sequence_through`) in the view's numbers.
- **A checkpoint** answers `changeSequence` as X's view sequence, and `hasOpenExecutionWork` as X's own run's open work (false while its root is not loaded). A child's status change or row change is a numbered frame, so a recovery that spans one sees the sequence move and retries, as base's recovery already does for any change.
- **What this replaces:** SR-044's hold during a snapshot, and its idempotent handling. The hold now lives in `RunViewStream`'s snapshot connection (base's queue), and a numbered stream gives the frames after the snapshot, in order, each once. So base's clients take the row events exactly as at base.

**Sequencing tests** (SR-062, SR-063): a row change and a status change during an async stored capture appear once, after the snapshot, not twice; `liveSequenceId` stays the same across a stop and a restore of the run, and changes on a server restart; `lastMessageChangeSequence` moves only with the view's message events (the composed messages, SR-072), never with row or status frames; a stopped run's view and a live one each get consecutive frames mixing the run's own events, row events and status events; a snapshot taken between frames is followed by exactly the frames after it; a stored-to-live switch keeps the sequence; a checkpoint-bracketed recovery resumes at the checkpoint's sequence, and retries when a child's status changed during it.

**Rule 3: the acceptance check of the frontend contract.** For each story of `stories.py`, a characterization at `827f1e68dc` captures the snapshots, events and list reads the web receives. The branch gives the same, except where rule 2 applies: a child's conversation, output and commands, which move to the child's own stream.

**Every earlier web-facing item:**

| Item | Decision |
| --- | --- |
| `child_runs_changed` / `CHILD_RUNS_CHANGED` (SR-042, SR-043) | **Goes.** `ChildRowsFeed` stays as the owner and emits base's started, closed and reopened events with their records, built from the collaboration tree |
| Session ordering and membership idempotence (SR-044) | **Replaced** by `RunViewStream` (SR-062, SR-063): base's `RootEventPublisher` moved out of the root, which numbers every frame of a run's view. Its snapshot connection reads the base, the tree's rows and the statuses in one synchronous step, so a connection gets exactly the frames after its snapshot. No web change |
| `closed_task_executions`, `closedTaskExecutionsDigest`, `task_executions_reopened` (removed by SR-041) | **Return,** with base's meaning, now produced by the tree. They are no longer dead |
| `hasCollaboration` on the agent run history item (SR-068) | **Returns,** in base's shape. It is read from the history row's stored flag, which the first delegation sets (contract §3.5, model S1). The web uses it to show a listed, not-open agent run's delegated rows (`AgentRunTaskRows` → `ensureStoredView`, `useMobileRunTree.ts:61`), so without it those rows would wait for the run to be opened, which is a change from base. It is not derived from the tree: the stored flag is base's meaning and the contract's record |
| `delegated_launch_selections_changed`, the Memory explorer's `isTaskTeam` / `startedByAgentName` / `TASK_AGENT` / `TASK_TEAM_MEMBER` (removed) | **Stay removed:** nothing produces them, and rule 2 covers a child's Settings |
| The view stream lives with the open view (SR-045) | **Stays:** a real change, because a stopped delegator's children keep working |
| Stored and live sessions for a stopped team or org (SR-046), and restore, then live, then post (SR-048) | **Stay** (server) |
| `runCollaborationStatuses` and the listed rows built from its answer (SR-055, SR-057) | **Go.** Base's `agentRunCollaborationStatuses` and base's history reads return, filled from the tree, peer rows included. The identity split (SR-056) and the in-run set (SR-059) stay on the server |
| Rows at every depth (SR-058, the held CR-461-033 work) | **Server: stays,** as base's nested placement in the snapshot and events. **Web: base's row builders** (`buildRunHistoryTeamExecutionRows` and the agent run's task rows), with no new nesting code |
| `DelegatedRunCommands`, the child-row `@` handling (CR-461-032), the team stream's child acknowledgement (CR-461-034), the child selection fixes (CR-461-010, -019), SR-039's server routing of child launches | **Go,** replaced by rule 2 |
| `LocalChildObservation` | **Stays for statuses only** (rule 1). It no longer relays a child's output; the child's own stream carries that (rule 2) |
| The reads of a child's own messages by its own identity (CR-461-020, -022) | **Stay:** they are rule 2 |
| The branch's web row code: `withListedChildRows`, `listedAgentRunTaskRows`, `runHistoryTeamChildRows`, `agentOrgChildRows`, `listedRunChildrenStore`, `delegatedChildren` | **Go:** the web returns to base's row code, fed by base's shapes (this also settles CR-461-025) |

**The Team tab's messages: base's composed logs, over the run's subtree** (SR-072; CR-461-054 / F-26; rule 1, REQ-002).

At base, a delegator's Team tab showed its root's log composed with the own logs of its open delegated runs, at any depth, filtered by one rule, `isMessageOfView` (`task-agent-message-logs.ts:133-147`). That was `composeMessageLogs` over `taskAgentLogOwners` (`task-agent-message-logs.ts:102-163`, `team-communication-store.ts:51`, `standalone-root-package-store.ts:92`, `agent-org-communication-messages-store.ts:49`): deduplicated by message ID and ordered by time. Since TC-13 each run's log holds only its own agents' messages, so the same composition is taken over the delegation index:
- **One rule, for the read and for live** (SR-074, CR-461-056; Principle 11). A message is in X's view when **both** of its agents are in X's tree, or when **one** of them is one of X's own agents. That is base's `isMessageOfView(message, own(X), tree(X))`, where:
  - `own(X)` is X's own agents;
  - `tree(X)` is `own(X)` plus the agents of every run in X's open subtree, at every depth: the runs of `collaborationTreeOf(X).rows`, as base's tree held its open copies.

  A closed run's messages with X's own agents stay, because they are in X's own log, as at base (DEC-001). A message between a run below X and an agent outside X's tree, such as X's own delegator, is not in X's view.
- **The source:** the view of run X composes X's own log and the own log of every run in its open subtree. It uses base's `composeMessageLogs`, filtered by that rule. A cross-run message is in both runs' logs and is kept once. A peer run's internal messages stay on its node, as at base. Its messages with this node's runs are in those runs' logs.
- **Live:** when a root commits a line to its own log, it publishes the message once to a node-level `RunMessagesFeed`, with the sender's and the receiver's runs. For a message between runs, the receiver's commit publishes it; the sender's later commit of the same message ID does not. Each open `RunViewStream` numbers it, as base's message event, **only when the same rule holds for its X at that moment** (`isMessageOfView` against X's current `own` and `tree`) (`TEAM_COMMUNICATION_MESSAGE` and its collaboration and org counterparts). It moves `lastMessageChangeSequence`.
- **The snapshot** (ARCH-REV-046 AR-026): the logs are read **after** the synchronous base step, like the run's own parts, in this order:
  1. in one synchronous step: the view's base sequence, the rows and the statuses (SR-063);
  2. the asynchronous read of the composed logs, behind the snapshot connection's queue. Its run set and filter are bound to the `own(X)` and `tree(X)` taken in step 1, the same set as the snapshot's rows, so the rows and the messages describe one moment (ARCH-REV-048). A row that closes during the read leaves through its own frame after the snapshot;
  3. the queued message frames, numbered after the base, **all delivered** after the snapshot (ARCH-REV-047). `RunViewStream` numbers each frame once for every connection, so none is dropped, because a drop would leave a gap. The client ignores a message ID it already holds while it advances the sequence, as at base (`collaborationParticipantMessages.ts:44-45, 101`; `teamExecutionViewState.ts:432-440`).

  So a message committed during the read is in the snapshot or in a frame after it, never lost, and never numbered at or below the base. Rows must be read at the base, because base's Team client does not deduplicate started rows. Messages are deduplicated by message ID at base, so they may be read behind the queue.
- **Paging:** as at base: the newest page, then older pages on request, over the composed list.
- **Refused messages, as at base** (SR-076; CR-461-060 TDR-001; autobyteus-469 REQ-012). The receiver appends under its log lock: it re-checks the Task, writes durably, then re-checks again.
  - **Refused before the write:** a message refused by the first check is in no log and is not shown. The sender sees the refusal in its tool result.
  - **The Task closes during the write itself:** the bytes are already on disk, and the log is append-only. Only the second check sees the closure, so, as at base, the record stays in the receiver's log and the sender gets the closure refusal (`TASK_AGENT_RESOURCE_CLOSED`). The composed Team tab shows it, as base's composed read did (`root-message-append.ts:43`).
  - **The rejected alternatives:**
    - making the closure wait for in-flight appends would couple the Task side to every run's log lock;
    - a refusal marker would add a new record kind to the log and to every reader.

    Neither is needed to match base.
  - **The sender records it too** (the Implementation Engineer's follow-up). On this result, a refusal after the receiver's durable write, the sender's root commits the message to its own log, as on an accepted delivery (`commitSentToRun`). So a message in a receiver's log is always in its sender's log (TC-13), and one rule (SR-074) gives the same answer live and after a reload. When the sender is X's own agent, X's own log shows it on reload, as base's one log did. When neither side is in X's tree at that moment, it is shown neither live nor on reload.
  - SR-072's "accepted difference" is withdrawn. `teammate-delivery-task-closure-race` (TDR-001) expects the refusal answered and the record shown.
- **Tests:**
  - a two-hop message, a worker to its helper, is in the Manager's Team tab: in the snapshot, live, and after a reload;
  - a message between runs is shown once;
  - **one rule, live and on reload:**
    - a message between a run below X and X's own delegator is shown neither live nor after a reload;
    - a message two hops down is shown both live and after a reload;
  - a closed run's earlier messages with X's own agents stay;
  - a message committed during the snapshot's log read appears exactly once, and its frame is numbered after the base, with no reopen by the sequence check;
  - the paging over the composed list works.

**A listed team's or org's delegated rows show when it is opened, as at base** (SR-073; CR-461-053 F-32). Base's web builds a listed team's rows from its open context only. With no context it shows its configured members (`runHistoryTeamExecutionRows.ts` `flattenStableRows`; `runHistoryTeamRows.ts` reads `rootTeam.members`), and unfolding a team loads nothing (`useRunListDisclosure.setTeamExpanded`). The branch keeps that on both layouts (rule 3). A listed agent run differs, as at base: with `hasCollaboration`, its stored view is read, so its rows show without opening it. The server's team list row still carries `rootTeam.task_executions` in base's shape (rule 1), and nothing new reads it. Showing a listed, unopened team's delegated rows would be new web behavior, which this ticket does not add.

**A copy whose Task record can't be read fails closed before its root is loaded** (SR-074; the code reviewer's suggestion on CR-461-051, the same placement as ARCH-REV-044 for DS-15). The run's own file says that it was delegated (`RunOwnAgentsReader.delegationOf`). So the check runs where input enters, before the root is resolved, and a refused start registers nothing and shows no status.

**What the web still changes, and why:**
1. The view stream is kept for a stopped run (SR-045).
2. Selecting a delegated row binds the conversation and composer to that run's own context and stream (rule 2), and a child's Settings save goes to its own save. **Its file-change and trace panels** read by its own identity too (ARCH-REV-042 note):
   - an agent child uses `GetRunFileChanges` and `GetRunEventMonitorActiveTracePage` by its own run ID;
   - a member of a delegated team uses its own team's member queries, by the child team's run ID, never the delegator's.

   The web queries `GetAgentRunCollaborationMemberFileChanges` (`collaboratorQueries.ts:66`) and `GetAgentRunCollaborationMemberEventMonitorActiveTracePage` (`runHistoryQueries.ts:236`) are deleted with their server queries (CR-461-022). A peer's files and trace pages stay on its node, as at base.

Everything else on the web returns to base.

**The trace pages' sender addresses** (the Implementation Engineer's inventory question): `collaborationTreeOf(run).reachingAddressOf(sender)`. A page shows a message as its receiver got it, the same as its header.

### DS-8 View

`user opens run X → RunViewStream's snapshot connection: in one synchronous step the view's base sequence, collaborationTreeOf(X).rows (X's open subtree at every depth, each row with its parent) and the cached statuses, local and peer; then X's own parts (SR-063) → numbered frames after it: X's own events, row changes (ChildRowsFeed), local statuses (LocalChildObservation), peer statuses and output (PeerChildObservation) → the client shows the rows under their delegators; a selected delegated run uses its own path (rule 2)`. The frontend contract above governs this spine; where an item below says otherwise, the contract wins.

- **Opening a view never starts a run** (REQ-004, AR-008). The collaboration stream's connect stops starting the host: `AgentCollaborationStreamHandler.readyRoot` (`services/agent-streaming/agent-collaboration-stream-handler.ts:59-62, 73, 148`) resolves the root without `ensureHostReady`, and the host starts on its first input. The same holds for the team and org streams' connect.
- **Commands to a local child from the delegating run's view** (AR-011). *Superseded by rule 2 (SR-061): each child is reached through its own standard path. `DelegatedRunCommands` goes. The text below is kept as history.* a message, interrupt, tool approval or Stop on a child row goes to the child's own root by its identity. `DelegatedRunCommands` (owner: the command route of a view) resolves it through `ActiveCollaborationRootDirectory` (`resolveOrRestore` for a message; a live root only for interrupt and tool approval; Stop to its root). Tool approval works, because the child runs on this node. A remote child keeps the remote route (`remote-child-commands.ts`, no tool approval). This holds in the standalone, team and org views.
- **A local child's launch, edited in its delegator's Settings** (REQ-009, TC-5; SR-039). *Superseded by SR-064 under rule 2: the same behavior is composed by the web from each run's own save, and the server composition below is removed. The text below is kept as history.* The web is unchanged: the child rows of `ExistingRunConfigEditor.vue` (`delegatedLaunchRows.ts`, `delegatedLaunchDraftStore.ts`). `updateDelegatedLaunchSelections(rootKind, parentRunId, changes, configuredPatches)` routes each `change` to that child's **own** ordinary stopped-run save, by its identity, as `DelegatedRunCommands` routes Stop:
  - an agent child: `AgentRunService.updateStoppedSelection` on the child run;
  - a team child's team-level row: the child team's own stopped save, with its team-scope patch;
  - a team child's member row: the child team's own stopped save, as a member patch at the member's address in its own team.

  Each run writes only its own file, so the parent's Save is a composition of independent saves, not one atomic write:
  - **Check first:** every child named is stopped (else `COPY_RUNNING`, as today) and every patch is valid. Then nothing is written unless all pass.
  - **Then apply:** the parent's own patches, then each child, in row order.
  - **On a failure:** if a write fails after others succeeded, the result names the runs saved and the one that failed. It is reported through an outcome the editor already shows, `PERSISTENCE_FAILED` with that message, so the web needs no new branch (ARCH-REV-014). Each saved run keeps its save, since each file is that run's truth. The editor reloads the rows.

  Peer children keep no editable launch (as today). Tests: an agent child and a team child (team row and member row) saved from the parent's Settings land in the child's own file; a running child refuses the whole Save before any write; a failure on the second child reports the first as saved.
- **A view's stream lives with the open view, not with the run's activity** (SCN-005 / AC-007 and its alternate, REQ-002, REQ-004; SR-045, CR-461-006). The web assumed that a stopped run's children were stopped too: it kept a live stream only for an active run. That is the same assumption SR-040 removed from the history poll. A stopped delegator whose children work, the ticket's own case (SCN-001), must show their live rows and output, and must let the user message a child, without starting the delegator.
  - **Rule, for every view kind and layout:** while a run's view is open (selected in the desktop layout, or on screen and in front in the phone layout, under the phone's existing visibility rule), its view stream is kept, whether the run is active or stopped. It ends when the view closes, as today. A stopped run's snapshot (`isActive: false`) is an ordinary snapshot: it does not end the stream.
  - **Readiness** is the stream's own: open, with its snapshot applied. It no longer requires an active run. A child command (message, interrupt, tool approval, Stop) goes to the child's own root by its identity (`DelegatedRunCommands`), so it never starts the delegator (REQ-004). A message the user writes to the delegator itself starts the delegator on its first input, as for any stopped run. When the delegator starts or stops, the same stream continues, and its lifecycle event updates the view.
  - **Per client:**
    - agent-run: `agentRunCollaborationStore.syncHost` attaches for the open run whatever `hostRunning` says, and stops detaching on a stop. `agentRunCollaborationStreamingService` keeps the stream on an inactive snapshot (no `onInactive` → `disconnect`), and `whenReady` settles on the applied snapshot. The comment "a stopped host is restored first" goes;
    - org: `agentOrgContextsStore` attaches the open org run whether or not it is active (no `retireStream` for an inactive one);
    - team: `agentTeamRunStore.connectToTeamStream` keeps the stream of the open team run when it stops (`TEAM_RUN_LIFECYCLE` stopped updates the view; it does not close the stream);
    - phone: the same stores, so the same rule holds while the run screen is on screen and in front.
  - **Server: the view session serves a stopped run without restoring it** (SR-046, ARCH-REV-020 AR-023). Restoring would make a stopped team "managed", which reads as active, refuses its stopped-run Settings (`RUN_ACTIVE`) and archive, and breaks REQ-004, REQ-006 / AC-010 and REQ-007. So no stream kind restores or starts its run to serve a view, and "active" keeps meaning "running":
    - **Standalone:** as it is now. `readyRoot` loads the root without starting the host, and the stopped-run gates ask the host (`standalone-stopped-run-selection-updater.ts:59`, `standalone-run-liveness.ts`), so a loaded root does not look active.
    - **Team and org: each view session has two modes**, owned by the session (`agent-team-stream-handler.ts`, `agent-org-stream-handler.ts`):
      - **Stored mode, while the run is not managed:** the session neither calls `resolveActiveTeamRun` / `restoreTeamRun` nor refuses a stopped org (`service.getActive`).
        - Its snapshot is built from the run's own stored file through **the same view projection** (members and units, each stopped), with the child rows from `DelegationIndex.openChildrenOf(X)`.
        - It carries `ChildRowsFeed` events (held through the snapshot, SR-044) and the children's live output (`LocalChildObservation`, as for a remote child).
        - A child command goes to the child's own root (`DelegatedRunCommands`).
        - A message to one of the run's own members restores the run through its ordinary service, on that first input. An interrupt or a tool approval for a stopped member is refused, as for any stopped run.
        - **The order of that restore** (SR-048), owned by the view session:
          1. restore the run;
          2. switch the session to live: send the live snapshot in-band and subscribe to the live root's events;
          3. then post the message.

          The member's input echo (`MEMBER_INPUT_MESSAGE` on the team stream, which settles the web's send) is then an ordinary live event after the snapshot, so it cannot fall before the snapshot's base. The pending send survives the snapshot in the send tracker, which only the manual recovery drains, and the echo settles it there by identity. Posting first and switching after would lose the echo and leave the send pending. No contract changes: the org stream already acknowledges `SEND_MESSAGE` (`AGENT_COMMAND_ACK`), and the team stream keeps settling on the echo.
      - **Live mode, while the run is managed:** today's session on the live root. Child rows and children's output come as in stored mode.
      - **Switching modes:** the session follows the run's lifecycle by run ID (the run's registration in `ActiveCollaborationRootDirectory`, and its stop). When the run becomes managed (restored by a message, or started by the user), the session sends an in-band snapshot from the live root on the same connection. When the run stops, it sends a stored-mode snapshot and continues. Each in-band snapshot goes through the run's `RunViewStream` snapshot connection (SR-062, SR-063): it is taken at the current view sequence, under the same `liveSequenceId`, and is not a new base. The frames after it continue the one sequence, so no gap or recovery can arise. The client takes each in-band snapshot as it takes one today.
    - So, for every kind, an open view of a stopped run shows live child rows and output and routes child commands, and the run stays stopped and unmanaged.
  - **Tests,** per client (agent-run, org, team) and in the phone layout:
    - a stopped delegator's open view shows a working child's live status and output;
    - a message to the child from that view wakes only the child, and the delegator stays stopped;
    - a new delegation by the child appears live;
    - selecting another run and back keeps one stream, with no stream left behind;
    - a message to the delegator itself starts it, on the same stream;
    - **a stopped team's and a stopped org's view open while a child works:** the run stays stopped and unmanaged; its child rows and child output are live; its stopped-run Settings save succeeds; its archive gate answers as for a stopped run; a message to one of its own members restores it, and the view continues live after one in-band snapshot, with no recovery. The message is posted after the live snapshot. Its `MEMBER_INPUT_MESSAGE` echo settles the send in the web's send tracker, by identity (`agentRunId`, `messageId`, `dedupeKey`; `TeamStreamingService.ts:356-358`, `teamSendAdmission.ts:60-70`). A snapshot does not drain the tracker; only the manual recovery does. The member's input state that follows comes from the live input-state events (ARCH-REV-023; this supersedes ARCH-REV-021's residual): **the first message to a stopped team's own member settles, and the composer does not stay pending** (SR-048).
- **Rows at every depth** (REQ-002 "whoever delegated it … shown under the run that delegated it"; SR-058, CR-461-033). At base, copies of copies were nested under their delegator, and one hop is not enough. The view snapshot, `ChildRowsFeed`'s `added` / `removed`, and the listed-runs poll all carry **X's open subtree**, not only its children:
  - **Which runs:** the runs reached through `DelegationIndex.openChildrenOf` transitively from X: a child, its open children, and so on (`subtreeOf`, restricted to open entries). A closed run is not a row, and its own open children are then found from their Task's page and from their own delegator, as a closed run's are today.
  - **Each row** carries its `parent`, the run that delegated it, and its delegator agent, so the one row builder per view kind (CR-461-025) nests it under its delegator in its parent's row. The row is the identity (SR-056) with its statuses. In the view it also has `source` (SR-056).
  - **Peer rows** are rows of their own, with the members their entry names. A peer run's own delegations live on its node and are not expanded here, as at base.
  - **The feed** reports `childRowsChanged(X)` for X and for every ancestor of X, when X's open subtree changes. One Task change still gives one event per run.
  - **Statuses** of every row come from that run's own root, else `offline`. The open view follows every row of the subtree through `LocalChildObservation`.
  - **Removed:** the team stream DTO's `task_executions` in a task team, always `[]` (`team-execution-view-projector.ts:165`). The subtree rows replace it.
  - **Tests,** desktop and phone, in an open view of each kind and in the list:
    - a child's own child (a helper of the worker) is shown nested under the worker;
    - it appears live when delegated, and leaves when its Task closes;
    - a listed, not-open delegator shows it within one poll.
- **A delegated run's collaboration context** (the prompt sections an agent reads; the non-goal "no change to what an agent reads", REQ-009; SR-058, CR-461-030). At base, hosting decided it: a hosted copy was a task agent; a copy at an org's configured agent address had that address's handoff rules and the org's authored instruction; a member of a task agent team hosted in an org had the organization line. Each run is its own now, so **one owner derives it from the data**, `RunCollaborationContext` (`agent-collaboration/delegation/run-collaboration-context.ts`, created in the composition root after the tree). Every kind's member context builder (`StandaloneHostMemberContextBuilder`, the team and the org builders) asks it for an agent run ID:
  - **Role:** an agent of a delegated agent run (its own `delegatedFrom` present) is a **task agent**, with the sections base gave a hosted copy ("You are a task agent: …", "to report your result"). A member of a delegated team keeps the team member sections. A run the user started keeps its own role.
  - **The organization line:** given to an agent whose run works on a Task whose assigner (`DelegationIndex.assignerOf`) is an org run. That is exactly when address step 2 reaches the org's agents and teams (§2.3), so the text says what the agent can do.
  - **Rules and instruction a copy inherits:** when a delegated agent run's `recipientAddress` is a configured agent address of its delegating org, the run is a copy of that placement. It inherits the org's handoff rules whose `from` is that address, and the org's authored instruction for it. Both are read at use from the delegating org's own file and definition, through the tree, so nothing new is stored. `get_handoff_rules` returns those rules; their targets are the org's agents, reached by step 2. A team copy keeps the handoffs in its own team file (SR-054).
  - **Tests:** the prompt-wording rows of `collaboration-prompt-wording.e2e.test.ts`. Row 2 (a task agent of a standalone agent), rows 3 and 4 (of a team and of an org), row 5 (a copy of an org's configured agent, with its rules and instruction) and row 8 (a member of a delegated team whose Task the org assigned) each read exactly base's text.
- **Live child rows in an open view** (REQ-002, REQ-005 / AC-005, AC-007, 469's reopened row listed again without a reload; SR-042, ARCH-REV-016 AR-022). The view is the projection of `DelegationIndex.openChildrenOf(X)`, so when that changes, an open view of X is told and reads itself again. One path serves all three view kinds:
  - **Source:** `DelegationIndex`, inside each Task change (`entriesChanged(taskId)`, synchronously, contract §4). For every run X whose `openChildrenOf(X)` differs before and after the change, it reports `childRowsChanged(X)` to its listeners after updating itself. That covers a new delegated run, a child whose last open Task closed, a reopened child, a child of a deleted Task, and a delegation to a peer. A child that keeps another open Task is no change.
  - **Owner of the publication:** `ChildRowsFeed` (`agent-collaboration/delegation/child-rows-feed.ts`), the one listener. For each X with an open view stream (the standalone collaboration stream, the team stream, the org stream, found by X's run ID in the stream registry), it publishes one event on that stream, **whether or not X's own run is active**. Opening or following a view never starts or restores a run (REQ-004).
  - **The event, one per stream contract:**
    - `child_runs_changed` on the collaboration and org streams;
    - `CHILD_RUNS_CHANGED` on the team stream.

    **The payload carries the change itself** (SR-043, ARCH-REV-017): `{ run_id, added: [row records], removed: [run references] }`.
    - `added` holds each new or reopened child's row record, in the shape today's `TASK_EXECUTION_STARTED` / `task_execution_started` carries (with `parent_team_run_id` on the team stream). `ChildRowsFeed` builds it with **the same projection function as the view**, so applying it equals a re-read.
    - `removed` holds the run references of children that left `openChildrenOf(X)`: a closure leaving no open Task, or a Task deletion.

    How each client answers:
    - **The Team client** (`teamExecutionViewState.ts`) applies it **in place**, in its sequenced stream, as it applies `TASK_EXECUTION_STARTED` today:
      - it inserts each added record (`insertTaskExecution`, context associations, `invalidate_team_member_projection`);
      - it removes each removed child's subtree, with a new `removeTaskExecution`; if the focus was on a removed child, it moves off it (`reconcile_focused_team_member_projection`, as `leaveClosedFocus` did);
      - then `reconcile_team_navigation`.

      The stream, pending sends, interrupts and approvals are untouched. It never goes through `team_stream_recovery_required`, the manual recovery 469's CR-003 found.
    - **The agent-run and org clients** answer with `checkpoint_required`, as they answer `task_execution_started` today: an automatic re-read that keeps their streams.
    - *Superseded by SR-062 and SR-063: row events are numbered frames of the view's sequence, and the snapshot connection makes the snapshot exact. The text below is kept as history.* **Unsequenced and idempotent** (SR-044, ARCH-REV-018). The event carries no `change_sequence`. Child-row membership is owned by the `DelegationIndex`, not by the team run's ordered changes, so it must not need the run's root, which a stopped team does not have loaded. The Team client therefore does not advance or check its `changeSequence` for it, and applies it by membership:
      - an `added` row the view already holds is skipped;
      - a `removed` row it does not hold is ignored;
      - a row in both, which happens when it left and came back between deliveries, ends as the event's `added` says.
    - **Order against the snapshot, owned by the stream session** (each connection of a view stream, all three kinds). The snapshot (`TEAM_EXECUTION_VIEW_SNAPSHOT`, and the collaboration and org snapshots) is sent on the same connection as the events.
      - While a session builds a snapshot, a child-row event published to it is held, and sent right after that snapshot. The snapshot reads the tree when it is built.
      - So a change is either already in the snapshot, and its held event is then a no-op by idempotence, or it is applied after the snapshot.
      - No change is lost to a snapshot read just before it, and no gap or recovery can arise.
  - **Events that go**, with their producer, the hosting lifecycle: `task_execution_started` / `TASK_EXECUTION_STARTED`, `task_executions_closed` / `TASK_EXECUTIONS_CLOSED`, `task_executions_reopened` / `TASK_EXECUTIONS_REOPENED`, and `remote_task_execution_started`. They are replaced by the one event, and the web's merge and removal of a closed set goes with `closed_task_executions` (SR-041). `remote_task_execution_summary` stays: peer statuses while the view is open.
  - **Order:** the event is published after the tree is updated, so the re-read sees the new rows. Several changes in one Task change give one event per X.
  - **Tests,** in an open view of each kind (standalone, team, org), with no manual reload:
    - a new delegation appears;
    - **in the Team view, a pending send and a pending tool approval survive a child-row change**, with no `team_stream_recovery_required`; the focused child that is removed hands the focus back;
    - **Team, the team run stopped:** an open view of a stopped team run gets the change and applies it, with no recovery, and the team run stays stopped;
    - **Held events flush in order:** several child-row events held during one snapshot's build are sent after it in the order they were published (FIFO), each once (ARCH-REV-019 residual);
    - **Team, a change racing a snapshot:** a change published while the session builds a snapshot is sent after it. If the snapshot already holds the row, the event is a no-op; if not, the event adds it. A duplicate `added` and a `removed` for an unknown row are no-ops. None of these causes a gap or a recovery;
    - a closure removes a child with no other open Task, and keeps one with another open Task without an event;
    - the assigner's reopen-and-continue brings the child back;
    - a Task deletion removes its children;
    - a delegation to a peer appears;
    - an open view of a stopped X gets the event and X stays stopped.
- *Superseded in its query by SR-061 rule 1: base's `agentRunCollaborationStatuses` and base's team and org history reads return, filled from the tree; the rows and statuses it describes stand. The text below is kept as history.* **The history poll for listed runs that are not open** (`runCollaborationStatuses(runs)`; autobyteus-426 REQ-009, kept by REQ-009 and REQ-002; SR-040, SR-041; **SR-055, every delegating kind**). Today the hosting run answered it from its copies, and a team's or org's list rows came from its own stored tree. Now it is answered from **the same projection as the view**, for every kind of run, so a listed run's rows and its open view agree by construction:
  - **Server:** `runCollaborationStatuses(runs: [{ kind: agent | agent_team | agent_org, runId }])`, at most 100 runs, replaces `agentRunCollaborationStatuses`. It is a clean cut of the query, its GraphQL type, the web query and its hydration. For every listed run X, active or stopped, never restoring anything, the answer has:
    - `isActive`: X's own run;
    - `children`: one entry per local child row the view of X has (`DelegationIndex.openChildrenOf(X)`, one hop), each with:
      - `row`: the child's **row identity**, built by the one shared builder (SR-056). The row projection is split by how long its data lasts:
        - **The identity, fixed for the run's life:** address, run reference, members with their addresses, delegator, `startedAt`, and each agent's definition ID. It is built by one function from the `DelegationIndex`'s per-run data, read once per run from its own file (ARCH-REV-030), never from a file per poll.
        - **The view's part:** the identity plus `source` (each agent's launch, launch source, the team's handoffs), read from the child's own file when a view snapshot or a `ChildRowsFeed` event is built, as today. A Settings save (SR-039) rewrites the launch, and the editor's reload then reads it fresh.

        The poll's `row` is the identity alone, which is all the run list reads. The view and the list share the identity builder, so they agree by construction, and the launch is never cached;
      - `statuses`: every agent of that child, with its address from the tree's per-run agents and its status from the child's own root when active, else `offline`.

      **Peer children are in the answer too** (SR-057, CR-461-027; REQ-002 "whoever delegated it", autobyteus-278's peer rows kept by REQ-009):
      - each has a `row` with its identity from `DelegationIndex.peerChildrenOf(X)`: the Task entry's `nodeId`, `recipientAddress`, `members` with their addresses, the delegator and `linkedAt`;
      - it has **no `statuses`**: no call to the peer node is made per poll.

      At base a listed run's peer rows came from its stored link, and their statuses only from the remote summary events of an open view, so a listed, not-open run showed them without a live status. The web shows them so again: under their delegator, marked with their node, without a live status. The open view keeps the remote observation (summary and live stream) for their live statuses, as today.
  - **Web, one rule for every listed run that is not open, desktop and phone:**
    - `runHistoryStore`'s listed runs (all kinds, `listedRuns`) are polled in one read.
    - The run list's delegated rows of each such run come **from the answer**: each `children[].row` is placed under its delegating agent or member, as in the open view, with its `statuses` applied, in `runHistoryNavigationProjection` (desktop) and `mobileRunTreeProjection` (phone).
    - A child no longer in the answer leaves the list at the next poll, and a reopened one comes back.
    - The open run's rows keep coming from its live stream (SR-042 … SR-046).
    - Because the answer carries the rows, a listed run that is not open needs no view read. The re-read rule of SR-040 and SR-041 (re-read on a difference, once per distinct answer) is withdrawn with it, and the agent run's stored view is read only when the run is opened.
  - Tests, desktop and phone:
    - *Withdrawn by SR-073:* a listed, not-open **team** and **org** with an open delegated child show the child's row under its delegating member within one poll, with its live status. As at base, a listed team's or org's delegated rows show once its view is open: base's web builds a listed team's rows from its open context only (`runHistoryTeamExecutionRows.ts`, `runHistoryTeamRows.ts`, unchanged). A listed **agent run** shows its rows without opening, through `hasCollaboration` (SR-068);
    - the row leaves within one poll after the child's Task closes, and returns on a reopen;
    - a listed, not-open **agent run** does the same, with no view read per poll;
    - the open run's rows are unchanged by the poll;
    - a listed, not-open run with a child on a peer node shows the peer row under its delegator, marked with its node, without a status and without any request to the peer per poll; opening the run gives the peer row its live status;
    - the 100-run limit holds.
- **A peer child's launch details** (each agent's runtime, model and launch source; REQ-009) are read from the peer while the view is open (SR-038). The peer's run summary (`peer-run-view-answers.ts`, `remote-run-view-provider.ts`, autobyteus-278) gains `launches` per agent, read from the run's own file on its node. `remote-task-execution-dto-projection.ts` fills `RemoteTaskExecutionDto.launches` from that answer instead of the stored link. A peer that cannot answer gives no launch details, as it gives no statuses. Nothing is stored on the delegating node; the delegation result's launch notes are unchanged. Tests: the row shows the peer's launches from the summary; a changed launch on the peer shows on the next summary; no launches while the peer is unreachable.
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
- **A preserved copy, before and after its predecessor finishes** (SR-077, Q-1; SR-078, CR-461-068). While a predecessor's item is unfinished (for example, a `20261017_…` copy with no own file), the copy is left as it was and reported (`PRESERVED_UNFINISHED_PREDECESSOR`). The host no longer edits it (rule 2), and an operation on it gets base's answer for a run ID with no own file: the public Settings save answers `INTERNAL_ERROR` "Run ownership could not be verified" (`studio-run-model-config-service.ts:88-118`, unchanged). This is the expected outcome of a failed migration (`DESIGN.md` rule 7, the data guideline: preserve, report, never half-convert).
  - **After the predecessor finishes the item: one follow-up migration per predecessor** (SR-078 as revised by ARCH-REV-049 AR-027 and ARCH-REV-050; guideline §7, "a separate new migration"). The runner checks prerequisites per migration, not per item (`assertPrerequisites`, `app-data-migration-runner.ts:144-157`). So one follow-up per predecessor keeps a predecessor that stays `FAILED` for an unrelated item from holding back the items another predecessor has finished (REQ-011).

    | Follow-up | Prerequisites (besides our main migration, `20261111_delegated_runs_own_runs_v1`) | Items it converts | Steps it applies |
    | --- | --- | --- | --- |
    | `20261114_preserved_items_after_task_agent_own_run_v1` | `20261017_task_agent_own_run_v1` | copies preserved for `20261017_…` (no own file, or an unreduced record) | 4, 5b (an append-only log already present), 8 |
    | `20261114_preserved_items_after_own_file_complete_v1` | `20261019_delegated_copy_own_file_complete_v1` | own files preserved for `20261019_…` (pre-completion shape) | 4, 8 |
    | `20261114_preserved_items_after_append_only_logs_v1` | `20261018_append_only_message_logs_v1` | logs preserved for `20261018_…` (a JSON log) | 5b |

    - **Policy:** each is `requiredOnStartup`, with **no** `holdsBackCapabilities`, and is registered after its prerequisites.
    - **While its prerequisite is `FAILED`:** it waits, reported (`AppDataMigrationPrerequisiteError`); startup continues (`runPending`, :80-100), and the node stays usable. Our main migration has still converted every Task entry with no hold (AR-005 and SR-021 stand).
    - **At the start where its predecessor finishes,** it runs in the same `runPending` pass and applies its steps with our migration's own builders, recognized as done by structure, so idempotent. An item preserved for two predecessors is finished by both follow-ups, each doing its own steps. An item its predecessor still has unfinished stays preserved and reported, with a warning success. Then it is terminal.
    - **After that the runtime reads only the target** (DS-10 checklist item 6). There is no runtime repair: `ensureRunHistoryRow` is withdrawn.
    - **Tests:**
      - with a predecessor `FAILED`, its follow-up is reported as waiting and the node is usable: Tasks, views, messages, delegation and closure all work;
      - with `20261018_…` `FAILED` for an unrelated log, a copy whose `20261017_…` item finished is still converted and listed;
      - after the predecessor finishes, the copy is listed in that same start, top-level (its delegator deleted) or nested, and its Settings save succeeds;
      - a later start changes nothing.
  - **Every late predecessor, not only the `FAILED` ones** (SR-079; CR-461-074, F-53). A migration registered before ours can run after ours in two ways:
    - it is `FAILED` and retried;
    - it is `NOT_RUN` while it waits behind a failed prerequisite. For example, `20260901_agent_org_flat_team_families_v1` waits for `token-usage-run-records-v1` (registry line 99).

    Its late output must not be left half-converted (rule 7). The predecessors that matter are classified once, by what they do to the shapes ours converts (the `taskExecutions` / `remoteTaskExecutions` lists, `taskAgent`, `hostRoot` / `assignedBy`, `collaboration_tree.json`, logs in `collaboration/`, delegated runs' history rows). The evidence is a search of each migration folder for those shapes, **and for the address and path shapes ours changes**: member addresses rebased to `/` (step 4), logs moved to the run's own folder (step 5b), and run folders (ARCH-REV-052 note 1). The classification test cites both searches.

    | Predecessor | What it does to our shapes | What converts its late output |
    | --- | --- | --- |
    | `20261017_task_agent_own_run_v1`, `20261019_…_own_file_complete_v1`, `20261018_append_only_message_logs_v1` | write a copy's own file and logs | their follow-ups (above) |
    | `team-run-execution-tree-v1`, `team-run-execution-tree-v2`, `20260901_agent_org_flat_team_families_v1` | write team and org trees in their released shapes, with `taskExecutions` lists (and a task team's `taskAgent` section, where they write one) | a follow-up each: step 6 (the lists), step 4 (a `taskAgent` section) and step 8 (a history row the tree now names) |
    | `20261015_collaborators_to_delegated_runs_v1` | writes `taskExecutions` links and sourceless copies into trees | a follow-up: steps 4, 6 and 8 for what it wrote |
    | `20261020_remove_skill_improvement_data` | **reads**: it selects the improver's runs by definition and records, and deletes them. A run our migration has converted would be selected differently (F-25) | ours **preserves** the improver's delegated runs while it is not terminal. Its follow-up converts those that remain after it finishes (steps 4, 5b, 8) |
    | `20260521_run_history_index_v2` | rebuilds the agent run index from every `agents/*/run_metadata.json`, delegated runs included (`run-history-index-v2-migration.ts:236-300`) | nothing: a true rebuilder. A test confirms that a late run keeps the delegated agent runs' rows |
    | `20260521_team_run_history_index_v2` | **a writer of our shape:** it builds rows only from `team_run_metadata.json`, which no current team has (`team-run-execution-tree-v1` renamed it). It removes every other row as stale (`team-run-history-index-v2-migration.ts:126-166, 443-451`), the delegated team rows our step 8 added among them (the Implementation Engineer's check) | a follow-up: step 8 for the delegated team runs. That it also removes the rows of team runs the user started is base's behavior, recorded as a follow-up outside this ticket |
    | `TeamAgentMemoryLayoutAppDataMigration` (path shapes: member folders) | acts only on roots in the v1 tree shape (`CURRENT_V1`), moving nested sub-team members' folders. A delegated team our step 4 converted is not v1, and a v1-shaped root is one ours leaves untouched | none (verified by the Implementation Engineer) |
    | `TeamCommunicationProjectionAddressMigration` (message address shapes) | writes exact addresses into a team's JSON message log, which is 20261018's input. Ours converts no message contents | none for our steps; its output reaches us through 20261018's follow-up (step 5b) (verified) |
    | `TeamContextFileExecutionLocatorsV1AppDataMigration` (attachment owners) | validates against the released root-package shapes from before task-agent-own-run (`team-context-file-locator-transition.ts:6`). A file ours converted doesn't match, so a late run skips it | none (verified) |
    | every other migration registered before ours | none of our shapes, including the address and path shapes | nothing |

    - **One mechanism.** Every follow-up is an instance of one definition, `PreservedItemsFollowUp(predecessor, steps)`. Its prerequisites are its predecessor and our main migration; it is `requiredOnStartup` with no `holdsBackCapabilities`, idempotent by structure, and terminal after it runs. It waits while its predecessor is `FAILED` **or** `NOT_RUN`.
    - **Our main migration preserves only for readers.** For writers, ours already leaves an older shape it doesn't recognize untouched, and the writer's follow-up converts what the writer later produces.
    - **The classification is enforced.** A registry test requires every migration registered before ours to have a classification: writer with a follow-up, reader with a follow-up, rebuilder, or none. A new migration can't be added without one.
    - **Tests:**
      - the restart-retry scenario (`token-usage-run-records-v1` fails on the first start, then the flat-families migration runs on the restart) ends with no stored `taskExecutions` list;
      - `20261020_…` `FAILED` on the first start and finishing on the next: the improver's delegated copy is kept and converted (F-25's case, now also for a late retry);
      - the classification test;
      - a late agent-index rebuild keeps the delegated agent runs' rows;
      - a late team-index run followed by its follow-up leaves every delegated team run with its row.
- Every Task entry is converted in every case, so no Task is damaged by a predecessor's state.
- The current runtime reads a preserved own file tolerantly and ignores `taskAgent`; such a run is an ordinary run with a derived address. A preserved tree is not read.

**When a predecessor later finishes an item:** superseded by SR-078 (c) and SR-079. Its follow-up converts what the predecessor wrote, in the same start, so no residue stays half-converted. Only a kept tree that no runtime reads, and that no follow-up's steps cover, stays as written, and it is reported.

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
9. **Evidence:** fixtures per row of the table, per contract case E1 … E12, and per partial state:
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
   - **a migrated delegated team** loads, plans, and saves team-level and member Settings while stopped, rooted at `/`; its web Settings show its name; a member reaches its teammates by the addresses `get_handoff_rules` and `list_available_agents` give it; an old prefixed address (under its run's `recipientAddress`) is refused with the correction of contract S24, computed from the Task entry, nothing stored; a member with its own launch keeps it after the team Settings save (TC-12 revised);
   - **a delegated team with a handoff outside the team** (a copy of an org's in-run mounted team, contract O5–O6; `delegate_task("/dev_team")` by an org agent outside that team) loads and plans; `get_handoff_rules` names the external target; `send_message_to` to it reaches the org's agent through the contract's §2.3 step 2 when the org assigned the team's Task, and gets today's guidance when no Task relates them;
   - **a new delegated team**, local and on the peer path, is rooted at `/`, and its Task entry carries `recipientAddress`; on the peer path, node B's answer names the members by their own addresses (`/lead`), and node A stores them so in `members`;
   - **closing a Task stops only its runs with no other open Task**, and after a reopen only an `assigned` entry is continued, by its assigner (contract §5.1, S10, S11, S14, S16);
   - **the contract's stories, run against the server** (the acceptance test of this ticket): each story of `stories.py` (standalone with a peer node on two server instances, team, org) is driven through the real tools, and after every step the server's files are compared with the state in `collaboration-walkthrough.md` (run IDs, times and texts mapped; `…` matches anything). A difference is a code defect or a contract defect, and the contract's model decides which;
   - **every case of the contract's §5**, walked run by run (§5.1 a standalone agent, §5.2 a team, §5.3 an org), one test per case ID (RUN-1 … RUN-4, IN-1 … IN-8, DL-0 … DL-13, A-1 … C-4, R-1 … R-10, E-1 … E-4, T-1 … T-7): the exact call and address or run ID, the records written (Task entry, the run's own file, which message logs), the tree change, the result and the header the receiver sees. DL-11 (U7): a run never delegates to its own definition, as today (autobyteus-455 AC-006): in a delegated team, now rooted at `/`, this is the own-definition refusal that teams the user starts already give, and the same for an agent run whose stored address differs from its definition's (SR-037). `evidence/data-model-validation/validate_every_case.py` is the data check of the same cases, line by line by case ID;
   - **TC-13:** a delegated and a user-started agent run both write and read their log at `agents/<id>/communication_messages_*`; a migrated user-started run's moved log reads back whole;
   - a closure and the assigner's reopen-and-message, interleaved in both orders (AR-017).

   Plus a start on the converted data.
10. **Lessons:** 469's AR-002 and SR-007 (partial states of released migrations); no startup pass over history.

### DS-11 The run list

`run list request → the history list projection reads the rows (every run has one) → for each row it asks DelegationIndex.parentOf(run): a run with an entry whose delegatingRun is stored is not a top-level row (it is a child row of that run while an entry is open, and it is on its Task's page afterwards) → every other run is a top-level row`

- **Every run has a history row**, delegated or not. It is an ordinary run, and the ordinary run services need its row: the stopped-run Settings save refuses a run without one (`agent-execution/services/standalone-stopped-run-selection-updater.ts:67-69`, TC-5).
- **Where a run shows:**
  - A run with no Task entry is a top-level row (the 15 legacy runs, TC-9; the runs of a deleted Task).
  - A run whose delegating run was deleted is a top-level row (TC-3).
  - A run whose entries are all closed is not a top-level row, as after 469: its Task's page lists it, and the Memory page lists it like any run.
- **Measured:** 11 delegated runs would show under their delegating run, 170 only on their Task's page, 15 as top-level rows (`evidence/data-model-validation/spines-on-data-2026-11-11.txt`).

### DS-15 The user's message to a delegated run (SR-070)

- **To an agent run:** `user: composer of the selected row (its own run) → AgentStreamingService SEND_MESSAGE (agent-stream-handler.ts) → AgentRunCommandCoordinator.postUserMessage → the run's StandaloneAgentRunRoot: postToHost in its gate → [closed-Task fence] → readyHost (restore if stopped or idle-shut-down) → onHostReady (the open stream binds, SR-064) → own @ mentions → post → AGENT_COMMAND_ACK; the run's events on its own stream`
- **To a member of a team run:** `user → TeamStreamingService SEND_MESSAGE on the team's own run ID (agent-team-stream-handler.ts) → stored session: [closed-Task fence] → restore the team → switch to live with one in-band snapshot through RunViewStream → post to the member (SR-048) | live session: [closed-Task fence] → the RootTeamRun posts to the member in its gate → MEMBER_INPUT_MESSAGE echo settles the send`
- **To a peer run:** the delegator's view command → `peerRunOf(runId).postMessage` → `ownerCommand` on its node, which fences by its own Task rule as at base (SR-066). Text only (SR-069).
- **The closed-Task fence** (G-4, found by walking this spine; REQ-005 "a closed run takes no input except its assigner's reactivation"): at base, every input to a hosted copy, the user's included, passed the host root's `assertExecutionInputAllowed` → `taskExecutions.assertInputAllowed` and was refused with `TASK_AGENT_RESOURCE_CLOSED` when the copy's Task was closed (`configured-agent-execution-handle.ts:142-155`, `standalone-agent-run-root.ts:240-243`, `root-team-run.ts:210-213`). The branch dropped it with hosting (`team-root-materializer.ts:76`, "nothing hosted is fenced here"), and the standalone root has no such check, so a user's message would revive a closed delegated run. A closed run is still reachable when its own view was already open as its Task closed. Its Task's page only lists it, muted and not openable, as at base (`presentTaskRoot`; AR-002, REQ-009; CRR-039 F-55). **Restored:** the check is made **before the run's root is resolved or restored** (ARCH-REV-044 note): in the run's service, where the input enters (`AgentRunCommandCoordinator` for an agent run; the team and org view sessions and run services for a member), and again at the head of the root's gate for a run that is already loaded. A refused input therefore never registers a root, never changes a status and never binds a stream. When the run has a Task entry (`DelegationIndex.tasksOf(run)` is not empty) and its current entry is closed (`RunTaskRecords.isOpen` is false), the input is refused with base's input-fence answer: `TASK_AGENT_RESOURCE_CLOSED`, "Your Task is DONE or CANCELLED, so you can't start new work." (`root-task-execution-resource-scope.ts:68, 164` at `827f1e68dc`; characterized in IMP-58, case "closed, not yet released", the nearest base case now that a closed run stays reachable). `ASSIGNER_ONLY_REACTIVATION_MESSAGE` stays the answer to an agent's message to a closed run (DS-2, R-8), as at base. The agent stream's acknowledgement codes gain `TASK_AGENT_RESOURCE_CLOSED`: a new code value, with no shape change. A run that no Task names is not fenced: one you started, or one whose Task was deleted. The fence covers user input, application input and restart resume, as at base. The assigner's reactivation (R-6) reaches the run through DS-2, which reopens the entry first.
- **Tests:** the user's message to a closed delegated agent run, and to a member of a closed delegated team, is refused with base's text. The run is not restored: there is no registration change in `ActiveCollaborationRootDirectory`, no status frame in the delegator's open view or in the list, and no stream binding. After the assigner reopens and continues it, the user's message is delivered. A run of a deleted Task takes the message. A characterization at `827f1e68dc` gives base's refusal for a closed copy.

### The Task page's card opens its run where the row lives (SR-080, CR-461-076 F-54)

At base the Task's run view carried `hostRoot`, the top run that hosted the copy, and the card opened that run with the copy's row selected. This ticket renamed the field to `delegatingRun` (one hop), which fits the record. But a delegated run's row lives in the view of **the top of its tree** (DS-11; rows at every depth, CR-461-033), and the web can't find that top from one hop.

- **`TaskRootView` gains `topRun: { kind, runId }`,** derived when the view is built: `DelegationIndex.topOf(entry's run)`, passed to `buildTaskRootView` as a resolver beside the status resolver. It is never stored. It is carried on the GraphQL type, the project change message and the web type. `delegatingRun` stays, for display.
- **The card opens `topRun` and selects the run's row there,** through that view's own row selection:
  - an agent view: `selectTaskRow`;
  - a team view: its delegated row;
  - an org view: its task row.

  So the card opens the run exactly as the row does (rule 2), at any depth, as base's card opened its host.
- **`openable`** = started, not closed, and `topRun` listed. A closed run stays muted and not openable, as at base (AR-002).
- **A peer-delegated run** (`nodeId`) has no local top. Its card stays as it is.
- **Tests:**
  - PMU-003: an agent delegator with a team worker opens the worker;
  - a worker two hops down opens in its top run's view with its row selected;
  - a run whose delegator was deleted opens as its own top.

### DS-12 Settings of a delegated run

`the delegator's Settings → the editor → each run's own stopped-run save: the delegator's own patches, then each delegated row in row order, at any depth` (SR-064, under rule 2). A peer run has no editable launch.

- **A team-level choice on a stopped delegated team** (SR-075, F-39; REQ-006 "a stopped delegated run's settings are saved like any stopped run's"): it is saved as for a team the user started (`team-run-selection-mutator.ts`). It changes the team's default, and each member keeps its own saved launch. To change a member's model, edit that member's row. Base's `followsTeam` path existed only for hosted copies. The migration applies a pending team-level selection to the following members once and drops the flag (DS-10, step 4), so no stored choice is lost. This is a behavior change for delegated teams, decided by REQ-006 and flagged to the user.

### DS-13 Archive and delete (SR-067)

`user: archive or delete run X → its service (agent, team or org) → DelegatedWorkGuard.refusal(X) → refused, naming the working runs; else the action → on delete: DelegationIndex.runDeleted(X) first, then its files and row are removed`

- **The guard asks every open delegated run of X** (one hop, `openChildrenOf(X)`):
  - a local one by its own live status. **Working** means not stopped: running, initializing or idle. A stopped or idle-shut-down run does not block (SR-072, F-30; contract T-5), so the reason's "stop it first" is true;
  - **a peer one through its handle's `status()`** (G-1). A working peer run refuses, as a local one does (REQ-007 with REQ-013). Otherwise its later report would find its delegator gone.
  - **An unreachable node** does not block the action, because its node owns the run and may never come back. The action's result names the runs that were not asked. The guard becomes async.
- **A deleted run leaves the tree** (G-2; contract §4, T-8, R-11; model S26, S27). `runDeleted(X)` drops X's node and its per-run agents.
  - **Order** (ARCH-REV-041 note): the index is told first, so no step 2 or message can find X while its files go. If removing the files then fails, the startup build adds X back, because it is still stored.
  - **A message already past the tree** when X is deleted: `resolveOrRestore` meets a run with no files, and that answer maps to R-11 (`TARGET_AGENT_RUN_NOT_ACTIVE`). The Task entries that name X stay, as the Task's record. The tree then skips X:
  - a run X delegated to has no parent and is the top of its own tree. The list already shows it as a run of its own (DS-11), so views, reach and the list now agree;
  - a Task X assigned has no assigner, so address step 2 reaches nothing of X, and the `@` note and `list_available_agents` stop listing X's agents;
  - X's agents' run IDs are unknown, so a message to one is refused with `TARGET_AGENT_RUN_NOT_ACTIVE`, as for any unknown run ID.

  At startup the tree is built from the stored runs, so a deleted run is skipped there too.
- **Archive keeps the tree.** An archived run is still a stored run. Its open delegated runs, which are stopped since the guard passed, stay under it and are hidden with it, as base hid the copies with their host. Unarchiving shows both again.
- **Tests:**
  - delete or archive with a working peer run is refused, naming it;
  - with its node unreachable, the action goes ahead and the result names it as not asked;
  - after a delete, the delegated run is a top-level row, and its `list_available_agents` has none of the deleted run's agents;
  - its message to the deleted run's agent is refused with `TARGET_AGENT_RUN_NOT_ACTIVE`;
  - a restart keeps all of this.

### A root its migration could not convert (SR-078, CR-461-069; rule 7)

At base, the user's restore mutation (`restoreAgentTeamRun`) answered a team or org root its migration could not convert with the reason, `TEAM_RUN_STATE_PACKAGE_NOT_CATALOGED` or `TOKEN_USAGE_EXISTING_RUN_RESTORE_MIGRATION_REQUIRED`, and base's view connect answered `TEAM_NOT_FOUND`. With restore now the first message (SR-046) and the mutation removed, base's two answers keep their places:
- **The view connect** asks the run service's restore admission, base's checks (cataloged, token-usage migration), **before** it reads the stored file. When admission refuses, the connect answers with **the admission's own code and text**: `TEAM_RUN_STATE_PACKAGE_NOT_CATALOGED` or `TOKEN_USAGE_EXISTING_RUN_RESTORE_MIGRATION_REQUIRED` with base's restore texts, or the org's counterparts. Then it closes the stream, as base's failed connect did (SR-078 as revised for CR-461-073).
  - **Why the connect:** at base the user saw the reason on send, because base's web hydrated a stopped team without a stream and called the restore mutation when sending (`agentTeamRunStore.ts:306` at `827f1e68dc`). Now a stopped run's view *is* its stream (SR-045, SR-046), and a refused connect leaves no session to send from. So the connect is the one place the reason can reach the user.
  - **Not affected:** the web does not special-case `TEAM_NOT_FOUND` (no reader in `autobyteus-web`). It shows a failed connect's code and text as it shows any.
- **The first message** of a run that passed admission (a race, or a later restore) answers the admission's reason on its acknowledgement, as base's restore did.
- **No raw schema error reaches the user.** A stored file that passes admission but cannot be parsed is answered as a run that cannot be restored, with a reason, and the detail goes to the log only (rule 7).
- **The same holds for an org root.**
- **Tests:** team-run-v1 ×2. The view connect answers the admission's reason code and text, then the stream closes. No message names a schema field.

### DS-14 A run a peer started on this node

As at base (BEH-008): its own root and history row. Its user stops it here, and node A's owner commands are admitted by its back-link. It is restored by its delegator's message, and its open stream follows it (SR-064).

## Ordering Without A Shared Queue (was U-A)

Today one queue per top run orders every transition of every copy. Two owners take its place:
- **The Task side orders the record:** close, reopen, assign. It already does this, under the copy's ordering and then the Task's.
- **The tree is current before a Task change resolves** (AR-017). The Task side calls `DelegationIndex.entriesChanged(taskId)` synchronously after each committed change of a Task's entries, still inside that Task's ordered change: before the operation resolves and before that Task's next change starts. The tree re-reads that Task's entries synchronously from the Task side's loaded records (the port's memory, no file read). So no reader sees the tree behind the record.
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

Routing, placement and lifecycle never read it; they read the Task entries through `DelegationIndex`. |
| The standalone tree file (`readTree`, `StandaloneRootTreeFile`, its path) | `standalone-agent-run-root/` (7), `run-history/services` (4), `api/graphql/services/collaborator-root-port-resolver.ts`, `agent-org-execution/services`, `run-history/store` | The host address from `run_metadata.json`; nothing else is read. The history row's `hasCollaboration` is set by the first delegation |
| `listAgents` of the standalone location service (token total, context files, last activity, process supervisor) | 6 callers | A standalone run's agents are its own. Context files and last activity read the run itself |
| Token totals: `token-usage/providers/token-usage-run-store.ts` (`getTeamRunSummary` by `rootTeamRunId`, the org summary by agent run IDs, the standalone summary), `api/graphql/types/token-usage-stats.ts`, the attribution at capture (`agent-execution/events/processors/token-usage/token-usage-context-enricher.ts:38-42`) | 3 totals | **Unchanged results** (REQ-009, AC-012). A total of a run covers its own agents and every run delegated from it, one hop at a time and recursively, from the Task entries, open and closed. Each run record is counted once, by run ID. Attribution at capture stays the run's own root: a delegated team run's usage is its own team's. Usage rows a hosted copy wrote before the change keep their old `rootTeamRunId`; the run-ID set counts them once. 469's `ClosedDelegatedRunReader` becomes the reader of "runs delegated from X", for open and closed entries |

The implementation records the decision per file in its handoff. A reader not in this table is an escalation.

## Earlier Questions, Settled

- **V-11 (why a Settings edit was kept beside the started launch):** the earlier ticket (`delegated-copy-model-change`, design lines 240, 336) kept it so that later copies, which projected from the started values, would not inherit an edit, and so that the origin text could still be shown. Neither holds for an ordinary run: every delegation resolves its own launch, and an edited agent shows no origin text. The edit becomes the run's own launch (DS-10 step 4).
- **V-14 (a non-coordinator member of a stopped team):** `DelegationIndex` reads that team's own file once and keeps its members.
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

*Superseded by the walk of every spine for every case, `evidence/spine-validation/spine-walk-2026-11-12.md` (SR-067). The table below, from revision 5, checked only that each spine's data exists.*

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
| Task side (`TaskExecutionResourceService`, its port) | Every entry and its `delegatedFrom`; open/closed, reopen, assign, delete; the order of record changes; the change notice to `DelegationIndex` |
| `DelegationIndex` | The in-memory relationships: who delegated whom, each run's Tasks and agents, each Task's assigner (contract §4) |
| `CrossRunMessageDelivery` | Admission between runs and the route to the receiver |
| `TaskDelegation` | The order of a delegation to a new or an existing run |
| `DelegatedRunStarter` | Creating an ordinary run for a delegation, local or peer |
| Each run's root: standalone (`StandaloneAgentRunRoot`), team (`RootTeamRun`), org (`AgentOrgRun`) | Its own agents, its own log (and only its own), gate, Stop, closure stop, idle shutdown, view |
| `DelegatedRunCommands` (`agent-collaboration/execution/delegation/`) | A view's commands to a local child row (message, interrupt, tool approval, Stop), routed to the child's own root |
| `CollaborationRootResolver`, `ActiveCollaborationRootDirectory` | Resolving or restoring a run's root; the live roots (existing) |
| The migration | DS-10 only |

## Dependency Rules And The Composition Root (Principle 16; SR-047)

**Structural Trigger fired: Hidden dependency.**
- **Evidence:** this ticket added seven process-wide bindings for owners it creates: `bindCrossRunAddressResolution`, `bindCrossRunMessageDelivery`, `bindDelegatedRuns`, `bindDelegationIndex`, `bindLocalChildPorts`, `bindTaskDelegation` and `bindTaskRunControl`. It also added nine `find…()?.… ?? fallback` call sites, for example `requestRelease: (run) => findTaskRunControl()?.stopForTaskClosure(run) ?? null`, and `tree: () => findDelegationIndex()` with "before the Task records are loaded no run has children".
- **Why they existed:** the startup is split across `project-task-execution-resource-composition.ts` and `task-delegation-composition.ts`, and the Project Task service was composed before the run control it needs.
- **Resolution: none is kept.** A missing owner is a startup error, never a quiet `null`. There is no cycle: each owner below needs only owners created before it.

**One composition root: `compositions/build-studio-server.ts`.** It creates the owners this ticket adds in this order and passes each one its collaborators, through its constructor or the call that needs it:

1. `TaskExecutionResourceService`, loaded.
2. `DelegationIndex(taskExecutionResources, runOwnAgentsReader)`, built; then `taskExecutionResources.setEntriesListener(delegationTree)`. A Task change with no entries listener set fails; it is not skipped.
3. The run services (agent, team, org) **with the narrow `RunTaskRecords` port, not the full Task port** (SR-053). Since SR-049 a root does not delegate, so it needs only two things from the Task side:
   - `isOpen(run)`, for the Task-rule check at the head of its gate and the work-packet check;
   - `statusChanged(run)`, for `TaskWorkerStatusNotice`.

   `RunTaskRecords` implements them from step 1's records (`TaskExecutionResourceService.isOpen`) and the Task change marks (`taskChangeMarks`), both created before this step. No root they create needs `TaskDelegation`, `CrossRunMessageDelivery`, `CrossRunAddressResolution` or `ProjectTaskService` (SR-049, SR-053), and `TaskRunControl.statusChanged` goes.
4. `TaskRunControl({ agentRuns, teamRuns, tasks: taskExecutionResources })`.
5. `ProjectTaskService({ …, runControl })`, the full `TaskExecutionResourcePort`. Its `requestRelease` and `workerStatus` call `runControl` directly, with no listener and no setter. `composeProjectTaskExecutionResources` is split: the Task records and the tree come at steps 1 and 2, and the service at step 5.
6. The root resolver, then `TaskDelegation`, `CrossRunMessageDelivery` and `CrossRunAddressResolution`, from the tree, the root resolver, the run services and **the full Task port, `ProjectTaskService` (step 5)**: linking, `markStarted`, `projectFolderForNewCopy`, `resolveAssignment`, `describeTask`, and the assigner's continuation. Nothing created before them needs them.

   **Why there is no cycle** (SR-053; Example 9, "split out what both need"):
   - the run services need only `RunTaskRecords` (step 1);
   - `ProjectTaskService` needs `TaskRunControl` (step 4), which needs the run services (step 3);
   - the delegation owners need `ProjectTaskService` (step 5).

   Every arrow points back to an earlier step.
7. `LocalChildPorts({ tree: delegationTree, agents })`, `LocalChildObservation` and `DelegatedRunCommands` (one instance). Then the stream session registry, its own owner. Then `ChildRowsFeed(streamSessions)`, then `childRowsFeed.follow(delegationTree)`. The registry is passed to the feed and to the stream handlers.
8. Their consumers, the tool services among them, each receiving them at construction:
   - the `delegate_task` tool service gets `TaskDelegation`;
   - `GlobalAgentRunMessageRouter`, an older lazy singleton, is constructed by the composition root at this step with `CrossRunMessageDelivery`, and its existing getter returns that instance. Replacing the getter's callers is FU-011;
   - the `send_message_to` dispatcher gets `CrossRunAddressResolution`;
   - the three stream handlers get `DelegatedRunCommands`, `ChildRowsFeed` and `LocalChildObservation`;
   - `DelegatedRunAgentsReader`, `DelegatedWorkGuard` and the run list projection get `delegationIndex` (they replace `bindDelegatedRuns`);
   - `RunOwnTask`, `DelegatedChildLocations` and `PeerRunLink` get the tree or `runControl`; `TaskWorkerStatusNotice` gets the Task side (step 3).

**The tool path** (ARCH-REV-024): the agents' tools come from the framework's `defaultToolRegistry`. They reach their services through the existing initializers: `send-message-to.ts:40` → `getSendMessageToDispatcher()`, and the task-delegation router. This is the framework-edge case Principle 16 allows. At step 8 the composition root installs the dispatcher (with `CrossRunAddressResolution` and `CrossRunMessageDelivery`), the `delegate_task` tool service (with `TaskDelegation`) and `GlobalAgentRunMessageRouter` (with `CrossRunMessageDelivery`) through those initializers. That is before any run can call a tool, so there is no construction cycle: run services → agents → tools → tool services → `TaskDelegation` → run services is a call path at run time, not a construction order.

**The rules:**
- **No owner this ticket adds is reached through a process-wide lookup.**
- **A consumer created by an older singleton** (an existing `get…()` this ticket only uses) receives the new owner from the composition root through that singleton's existing initialization call, never by looking it up. Replacing that older singleton itself is FU-011, now limited to the older lookups the change only uses.
- **Tests build the owners with fakes** through their constructors. No test binds or resets a global for an owner this ticket adds.
- **The host's close and a startup rollback** release in reverse order. The `unbind…` calls go with the bindings.

**The second composition root: the application host** (`standalone-application-host/start-standalone-application-host.ts:242-268`; SR-052, which replaces SR-050 and SR-051). **It composes the same steps 1–8 as the studio, through the same composition file.**
- **Why:** at `827f1e68dc` the application host binds the Task records and runs the hosting lifecycle, so delegation runs there through the ordinary path (ARCH-REV-026). An application-owned run is refused at placement: `CollaboratorAdmission.catalogDefinitionAt` returns null for `isApplicationBound` (`collaborator-admission.ts:112`). The answer is base's own text for each case: its own address (self), a teammate (own team), a catalog address (`delegationTargetUnavailableMessage`). A run in the application host that is not application-bound delegates as in the studio.
- **SR-050's premise was the branch's state, not base's.** The branch had never composed delegation in the application host, so its null lookups answered `TASKS_UNAVAILABLE_TEXT`, a regression of this ticket. With the same composition, the application-bound rule keeps working where it lives, in placement, and no special "unavailable" collaborator is needed.
- **Tests:**
  - a characterization test **at `827f1e68dc`** captures the exact answer an application-owned team member's `delegate_task` gets, to its own address, to a teammate, to a catalog address, and with a `task_id`;
  - the branch test, composing the application host, asserts the same texts;
  - a run that is not application-bound delegates there, and its Task's closure stops it, as in the studio.
- **What the application host lacks** (ARCH-REV-027): where it has no studio piece (the credential proxy, possibly the peer collaboration, the web view streams), the composition passes that host's real equivalent explicitly, as at base. For example, an empty stream session registry, or the peer channel absent as at base. Never a lookup.

**Where the code lives** (SR-049): `build-studio-server.ts` is at its 500-line limit, so the steps live in a dedicated composition file with two calls that `build-studio-server.ts` makes in order. The first call covers steps 1–2, the run services are created between the calls (step 3), and the second call covers steps 4–8. The order stays readable in one place.

Read-only values (configuration, the data directory, the clock) stay process-wide (Principle 16's exception).

## Removal / Decommission Plan (this ticket)

| Removed | Why | Replaced by |
| --- | --- | --- |
| `RootTaskExecutionLifecycle` and its parts for hosted copies: the command queue, idle schedule, live holds, resource scope, dispatch, adapter interface (`agent-collaboration/execution/task/`) | Nothing is hosted | `TaskDelegation`; each run's own root, gate and idle shutdown |
| The three task execution adapters: `StandaloneRootTaskExecutionAdapter` (hosting branch), `TeamTaskExecutionAdapter` with `team-task-execution-service.ts`, `AgentOrgTaskExecutionAdapter` | Same | `TaskDelegation` through each root |
| The registries of hosted copies: `task-agent-execution-registry.ts`, `task-team-execution-registry.ts`; the copy parts of `RootAgentExecutionRegistry` and `RootTeamExecutionDirectory` | Same | `ActiveCollaborationRootDirectory` (each run a root) |
| The hosted children in the termination scopes (`flat-team-execution-manager.ts:275-296`, `agent-org-run.ts:380-384`, `standalone-agent-run-root.ts:462-466`) | Stop ends a run's own parts only | — |
| `stopDelegatedExecution` (all of it) and the delegated launch editing inside the three roots; `updateDelegatedLaunchSelections`, `delegatedLaunchModelOptions`, `DelegatedChildLaunches`, `DelegatedLaunchSelectionService`; the user-command remote branches and the root-opened child observation in the three roots (SR-064, SR-066) | Every delegated run, on this node or a peer, is stopped, commanded and configured as itself | The ordinary run services and queries; `PeerAgentRun` / `PeerTeamRun` and `PeerChildObservation` for a peer run (SR-066) |
| `ensureHostReady` on a collaboration stream's connect (`agent-collaboration-stream-handler.ts:59-62, 73, 148`, and the team and org connects) | Opening a view never starts a run (REQ-004) | The host starts on its first input |
| The `place: "delegated"` busy-run entries and the same-root list in `restart-notice.ts` | Every run is its own root | The notice lists the resumed runs it delegated (Task side) |
| `task-agent-team-tree-schema.ts` (the separate shape of a delegated team's own file) and `followsTeam` with its readers | A delegated team run's file is an ordinary team file rooted at `/` (TC-12 revised) | `team-run-execution-tree-schema.ts` unchanged in its root rule; member `launchSource` optional; the handoff compiler (`collaboration-handoff-compiler.ts:73`), **when it plans a delegated team** (the run's `delegatedFrom` present, from `collaborator-entry-builder.ts:133`'s `compileTeam` for a new copy and from the team load), keeps a `to` outside the team as an external target instead of resolving it in the team. A team the user starts and the definition validator keep today's check, that every handoff `to` is in the team. The product path to such a team is a copy of an org's in-run mounted team (`configuredPlacementSource` with the org's handoffs from that team's members; contract O5), not a saved team definition, which the validator still refuses (SR-054, CR-461-009). No reader that equates the root or the team scope with `/` changes (ARCH-REV-008 listed them) |
| `standalone-root-tree-schema.ts`, `standalone-root-tree-mutator.ts`, `standalone-root-tree-path.ts`, the tree part of `standalone-root-package-store.ts`, `emptyStandaloneRootTree` | The file is removed (TC-8) | `run_metadata.address`; Task entries |
| The team and org trees' `taskExecutions` and `remoteTaskExecutions` (types, schemas, mutators, the org per-team lists) | No stored list | Task entries |
| `taskAgent`, `TaskAgentCoordinatingRun`, `coordinatingRun` (outside a peer-started run's `delegatedFrom`) | Contract rev. 5 | Task entry `delegatedFrom`; the run's own fields |
| `hostRoot`, `assignedBy` | Contract rev. 5 | `delegatedFrom` |
| 469's `CoordinatingRunPresence`; "a task agent is never a root candidate" in admission | A delegated run is an ordinary run | — |
| `userLaunchSelection` and its readers | TC-5 | The ordinary stopped-run save |
| The mounting of a peer team's member addresses under the delegation address in node B's answer (`remote-team-run-starter.ts`, `mounted` / `rebaseDefinitionAgentTeamAddress`) | Every address belongs to its run's own space (contract P8); node A reaches peer members by run ID only | The members' own addresses, as node B stores them |
| **Hosting-only contract fields and events** (SR-041, ARCH-REV-015 AR-021; was FU-008). Each is dead because this ticket removed what produced it, and this ticket touches its producer: | Nothing hosts; a child whose Task closed leaves the view; server and web ship together (`DESIGN.md` rule 9), so a clean cut | — |
| `closedTaskExecutionsDigest` (the history poll) | Producer touched here (`api/graphql/types/agent-run-collaboration.ts`, `standalone-agent-run-root-manager.ts`), web store changed by SR-040 | Removed with the shared `closedTaskExecutionsDigest(...)` function (`autobyteus-collaboration-stream-contracts/src/root-execution-view-dtos.ts`) and its readers: `graphql/queries/collaboratorQueries.ts`, `agentRunCollaborationHydration.ts`, `agentRunCollaborationStore.ts`, `docs/workspace_layout.md`, their tests |
| `closed_task_executions` / `closedTaskExecutions` (views and history, always `[]`) | Producers touched here: the three view projectors (`agent-collaboration-`, `agent-org-execution-`, `team-execution-view-projector.ts`), `collaboration-root-history-service.ts`, `team-run-history.ts`; a reader touched (`ExistingRunConfigEditor.vue`) | Removed from the contracts (`autobyteus-collaboration-stream-contracts/src/{root-execution-view-dtos,agent-run-collaboration-dtos,agent-org-execution-dtos}.ts`, `autobyteus-team-stream-contracts/src/team-stream-server-message.ts`), the GraphQL types (`collaboration-root-history.ts`, `team-run-history.ts`), `graphql/queries/runHistoryQueries.ts`, and every web reader (stores, contexts, view models, components, docs) with their tests; the web's "closed rows leave" handling becomes the view's own child list |
| `task_execution_started` / `TASK_EXECUTION_STARTED`, `task_executions_closed` / `TASK_EXECUTIONS_CLOSED`, `task_executions_reopened` / `TASK_EXECUTIONS_REOPENED`, `remote_task_execution_started` (stream events) | Their producer, the hosting lifecycle, is removed here | **Replaced** by `child_runs_changed` / `CHILD_RUNS_CHANGED` from `ChildRowsFeed` (DS-8, "Live child rows", SR-042): removed from the contracts and from their web readers (`agentRunCollaborationContext.ts`, `agentRunCollaborationStreamingService.ts`, `agentOrgExecutionContext.ts`, `teamExecutionViewModels.ts`, `teamExecutionViewState.ts`) and docs, with their tests; the new event reads the view again |
| `delegated_launch_selections_changed` / `DELEGATED_LAUNCH_SELECTIONS_CHANGED` (stream events) | Its producer, the delegated launch editing in the roots, is removed here (SR-039 routes each change to the child's own save) | Removed from the contracts and web readers (the same contexts and team view models), docs and tests; after a Settings save the editor reloads its rows (DS-8) |
| The Memory explorer's `isTaskTeam`, `startedByAgentName` and the kinds `TASK_AGENT`, `TASK_TEAM_MEMBER` | Producer touched here (`team-memory-explorer-service.ts`); always `false` / `null`, kinds never produced | Removed from `agent-memory/domain/models.ts`, `agent-memory/services/collaboration-member-memory-targets.ts`, `api/graphql/types/memory-explorer-schema.ts`, `graphql/queries/memoryExplorerQueries.ts`, `types/memory.ts`, `MemoryHome.vue`, `CollaborationMemoryDetail.vue`, `docs/memory.md`, their tests. A delegated run shows on the Memory page as the ordinary run it is |
| The seven process bindings this ticket added (`bind`/`find`/`unbind` of `CrossRunAddressResolution`, `CrossRunMessageDelivery`, `DelegatedRuns`, `DelegationIndex`, `LocalChildPorts`, `TaskDelegation`, `TaskRunControl`) and their `find…()?.… ?? fallback` call sites | Principle 16: hidden dependencies; behavior by absence | Owners passed in from `build-studio-server.ts` in the order of "Dependency Rules And The Composition Root" |
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
| AR-006 Two sources for nested rows | One source: `DelegationIndex.openChildrenOf`, one hop |
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
| AR-014 Agents of a stopped delegating team or org run | `DelegationIndex` maps every agent of every run named as `delegatingRun`, read once from its own file |
| AR-015 Stale requirements doc | Corrected (supplements, follow-ups, scenarios, REQ-005, REQ-009, unknowns, ASM-003) |
| AR-005, round 3 (a preserved run's Task entry would damage its Task) | DS-10: every Task entry is converted, a preserved run's `delegatedFrom` from its kept full record; only its own file and its tree stay; checklist item 4; a fixture for a Task with a preserved run beside converted ones |
| Round 3 residual (an org's agents can grow) | `DelegationIndex`: on a miss, the org runs' own files are re-read |
| Revision 6 (the user, after round 5) | The run keeps its own `delegatedFrom`; `DelegationIndex` replaces the Task-side lookup questions and `TaskRunIndex`; migration step 4 writes the run's `delegatedFrom` |
| AR-018 (round 8): a team rooted at its delegation address breaks readers of `/` | TC-12 revised: every team run is rooted at `/`; the delegation address is the Task entry's `recipientAddress`; external handoff targets resolved when sent; tests |
| AR-016 (round 6): readers treat `delegatedFrom` as "started by a peer" | Readers table: two named tests, `isDelegated` and `isPeerStarted`, and a decision per reader; tests |
| AR-017 (round 6): the tree at the gate-head re-check | Ordering: the tree is updated synchronously inside the Task's ordered change; the re-check reads the Task side's port; an interleaving test |
| AR-005, round 4 (the hold vs. the predecessors' `FAILED` status) | DS-10: no prerequisite hold; registered after the four; each predecessor's unfinished items preserved with a warning; every Task entry always converted; tests per predecessor `FAILED` and per later finish |
| Residuals | DS-1: role and owned-sender refusal from the Task side; the history row at creation. The team gate is named |

## Change Sequence

1. Data model and the Task side: `delegatedFrom` on entries and on runs, `subWork`, peer fields, the change notice. `DelegationIndex`. Migration with fixtures (DS-10).
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

- **The contract and its executable model are the reference** (the user, 2026-11-11), not the base code. `evidence/collaboration-model/` holds the rules as code. `collaboration-walkthrough.md` gives the exact disk after every call of every story. `walkthrough.py --check` must stay green. Where the code and the model differ, send the point to the Solution Designer, who decides it on the data model's merits and updates the contract and the model first.

- Start from the peer path. A peer-started run already is the target shape; extract from it rather than write a second starter.
- Every new name above is the owner's name; do not add a "manager" or "helper" around them.
- Do not add lines to files over 500 lines beyond calls; new logic goes into the new files (469 FU-002).
- Fixtures are small and hand-built per shape; never copy user data and never run a migration on it (`TESTING.md`).
