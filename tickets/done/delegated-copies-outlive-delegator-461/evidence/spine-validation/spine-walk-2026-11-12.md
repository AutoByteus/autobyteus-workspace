# Every data-flow spine, walked for every case (2026-11-12, SR-067)

The Solution Designer's own check that the design holds, done at the user's request. Each spine is walked through the owners of the current design (SR-066 and its review notes), for every case that changes its path. Each step names the file where it happens: the branch where the code exists, otherwise base `827f1e68dc`. The stored data of the spines is the executable model's (`collaboration-walkthrough.md`, now 43 states). This walk covers what the model does not: the runtime path and the view.

**The cases.** A spine's path can depend on these dimensions:
- **who delegated:**
  - a standalone agent (A);
  - a team member (T);
  - an org agent (O);
  - a delegated run itself, at depth 2 (N);
- **the delegated run's kind:** an agent (a) or a team (t);
- **where it runs:** this node (L) or a peer (P);
- **the delegator's state:**
  - running;
  - stopped;
  - shut down when idle;
  - deleted;
  - archived;
- **the delegated run's state:**
  - running;
  - stopped;
  - idle;
  - its Task closed.

A row below groups the cases whose path is the same. **Verdict** is "Holds", or a gap (G-n), which is answered in the design (SR-067).

## The spines after SR-066

| ID | Start → end | Owner |
| --- | --- | --- |
| DS-1 | `delegate_task` → a new run working on the Task | `TaskDelegation` |
| DS-2 | `send_message_to(run ID)` → delivered, receiver woken | `CrossRunMessageDelivery` |
| DS-3 | `send_message_to(address)` beyond the own run → delivered | `collaborationTreeOf(sender)`, then DS-2 |
| DS-4 | The user's Stop → that run only | The run's service: its own root, or its `PeerAgentRun` / `PeerTeamRun` |
| DS-5 | A Task closed or deleted → its runs stop | Task side → each run's root |
| DS-6 | Reopen + the assigner's message, or a follow-up Task → the run continues | DS-2 / `TaskDelegation` |
| DS-7 | A quiet delegated run → shut down; its next message restores it | Its own idle shutdown |
| DS-8a | Open a run's view → snapshot, then the numbered frames | `RunViewStream` (base's `RootEventPublisher`, moved out of the root) |
| DS-8b | The tree changes → the rows of every open view at every depth | `DelegationIndex` → `ChildRowsFeed` → `RunViewStream` |
| DS-8c | A local delegated run's status → its row | `LocalChildObservation` → `RunViewStream` |
| DS-8d | A peer delegated run's status and output → its row | `PeerChildObservation` (shared per peer run) → `RunViewStream` |
| DS-8e | Select a delegated row → its conversation and composer | Rule 2: the run's own stream; for a peer, its handle |
| DS-8f | The delegator's view session while the delegator stops or restarts | The team and org sessions (SR-046/048); the agent stream follows its run (SR-064) |
| DS-9 | Update restart → busy runs resumed | `RestartResumer` |
| DS-10 | First start after the update → data converted | The migration |
| DS-11 | The run list and the listed runs' statuses | The history list projection; base's status reads, filled from the tree |
| DS-12 | Save a delegated run's launch from its delegator's Settings | The editor, composing each run's own save (SR-064) |
| DS-13 | Archive or delete a run → refused while its delegated runs work; a deleted run leaves the tree | `DelegatedWorkGuard`; the run services; the `DelegationIndex` |
| DS-14 | A run a peer started on this node | Its own root (`StandalonePairedAgentAccess`, the peer receivers) |

DS-12 … DS-14 are new to the list: DS-12 and DS-13 were prose without a spine, and DS-14 was covered only by BEH-008. DS-8 is split by its parts.

## DS-1 Delegate

| Cases | Path | Data read | Expected | Covered by | Verdict |
| --- | --- | --- | --- | --- | --- |
| A, T, O, N × a, t × L | tool → `TaskDelegation.toNewRun` → the sender's root `delegationSource` in its gate → Task side `linkNewTaskExecution` → `DelegationIndex.entriesChanged` → `DelegatedRunStarter` → the new root registered → the work packet → `markStarted` | the sender's run (`runOfAgent`), `tasksOf` for the role, the catalog | entry and own file as the model; the result text as today | S1, S5, S6, U3, U5, O5, O8 | Holds |
| the same, then the view | `entriesChanged` → `childRowsChanged(X)` for X and every ancestor → `ChildRowsFeed` → each open `RunViewStream` numbers a row frame | `collaborationTreeOf(X).rows` | the new row appears live at every depth | DS-8b tests | Holds |
| A, T, O × a, t × P | as above to `RemoteDelegation` → node B starts an ordinary run with `delegatedFrom.nodeId` → the entry with `nodeId` and `members` | the peer's answer | as S17; the peer row appears; an open view's `PeerChildObservation` starts watching it | S17, S25 | Holds |
| a run with a Task uses `task_id`; own definition; own team | refused before any write | the run's entries | today's texts | S23, U6, U7 | Holds |

## DS-2 Message by run ID

| Cases | Path | Expected | Covered by | Verdict |
| --- | --- | --- | --- | --- |
| delegated run → its delegator, delegator running / stopped / idle (A, T, O) | `GlobalAgentRunMessageRouter` → `CrossRunMessageDelivery.route`: `runOfAgent`, `canMessage` → `resolveOrRestore(delegator)` → `acceptFromRun` in its gate, the receiver's log, then the sender's log | delivered once; a stopped delegator is restored. Its open view: an agent's stream binds on `onHostReady` (SR-064); a team's or org's session goes from stored to live with one in-band snapshot, not a new base (SR-048, SR-063) | S3, S9, U4, O6; SR-048 / SR-064 tests | Holds |
| delegator → its delegated run, running / stopped / idle | the same, the other way | the child is restored; its own open stream follows it (SR-064) | S4, S11 | Holds |
| peer run (node B) → its delegator, stopped | `RemoteMessageReceiver` → `storedRemoteLinkCheck`, from the `DelegationIndex` (`agent-team-run-manager.ts:223-228`, branch) → restore → deliver | as base | S18 | Holds |
| a run of a closed Task, or of another Task | refused, with the closed or other-Task text | | S10, S19, S20 | Holds |
| **→ an agent of a deleted run** | `route` asks the tree. **The branch's `DelegationIndex` is never told of a deletion** (no deletion entry in `delegation-index.ts`), so it still knows the deleted run's agents: `canMessage` admits, and `resolveOrRestore` meets a run with no files | refused as for an unknown run ID (`TARGET_AGENT_RUN_NOT_ACTIVE`, `global-agent-run-message-router.ts:100-108`) | **was not a case:** now S27, R-11 | **G-2** |

## DS-3 Message by address

| Cases | Path | Expected | Covered by | Verdict |
| --- | --- | --- | --- | --- |
| steps 1 to 3 for A, T, O, N; old prefix corrected | the dispatcher → `collaborationTreeOf(sender)` resolves (step 1, then step 2 over the assigners' standing agents, then step 3) → DS-2's delivery | as the model | S2, S3, S7, S24, U1, U4, O1–O7 | Holds |
| **step 2 when the assigner was deleted** | the tree still holds the deleted assigner's agents (G-2), so step 2 resolves to an agent of a deleted run, and the note and `list_available_agents` list it | step 2 reaches nothing of a deleted run | S27 | **G-2** |

## DS-4 Stop

| Cases | Path | Expected | Verdict |
| --- | --- | --- | --- |
| the user stops a delegator (A, T, O) | its service → its root's `stop()` in its gate | its own parts only; its delegated runs keep running (S8, TC-1). Its open view keeps its stream (SR-045), and the rows stay live (DS-8c/d) | Holds |
| the user stops a local delegated row, from the delegator's view or its own | the Stop button → `terminateAgentRun` / `terminateAgentTeamRun` by its own ID (rule 2) → its root | that run only; its row shows stopped through `LocalChildObservation` | Holds |
| the user stops a peer row, delegator running or stopped | the standard terminate by run ID → not on this node → `peerRunOf(runId).terminate()` → `ownerCommand(terminate)`; node B admits it by the back-link | stopped on its node; no root of the delegator is touched (REQ-013) | Holds |
| a peer row, its node offline | the handle → the channel refuses | "Couldn't reach {node}.", as at base | Holds |

## DS-5 Task closure, DS-6 reopen, DS-7 idle

| Cases | Path | Expected | Covered by | Verdict |
| --- | --- | --- | --- | --- |
| closure, local runs | Task side → each run with no other open Task → its root `stopForTaskClosure` → `entriesChanged` → rows `removed` in every open view at every depth | stopped; rows leave | S10, S14, S16 | Holds |
| closure, a peer run | fenced, as at base (out of scope: requirements, non-goals); the peer row leaves; `PeerChildObservation` drops it, and closes it after its last view | | S19 | Holds |
| reopen + the assigner's message; a follow-up Task | DS-2 / `TaskDelegation.toExistingRun` → `reopenAssignment` → restore → rows `added` | | S11, S12 | Holds |
| idle shutdown of a delegated agent | `DelegatedRunIdleShutdown` → the host shut down, the root stays registered → its next message restores the host → `onHostReady` → an open stream rebinds to the new `AgentRun` (SR-064) | | SR-064 tests | Holds |
| idle shutdown of a delegated team | `DelegatedTeamIdleShutdown` → `shutDownIfQuiet` → the root unregistered → an open team view session goes to stored mode in-band (SR-046) | | | Holds |

## DS-8 View

| Part | Cases | Path | Expected | Verdict |
| --- | --- | --- | --- | --- |
| 8a snapshot | any view, delegator live or stopped | the snapshot connection: in one synchronous step, the base sequence, `collaborationTreeOf(X).rows` and the cached statuses (local and peer); then the run's own parts, in its gate (live) or from its files (stopped) | every frame after the base is a change after the snapshot (SR-063) | Holds |
| 8b rows | A, T, O, N; L and P | `entriesChanged` → `childRowsChanged` for X and ancestors → a numbered row frame | live at every depth; a peer row is a row with its members | Holds |
| 8c local statuses | every local row of the open subtree | `LocalChildObservation` → numbered status frames | live, also in a stopped delegator's view | Holds |
| 8d peer statuses and output | every open peer row of any open view | `PeerChildObservation`: one `observe` per peer run, shared by every view that shows it, with frames numbered in each view's sequence (ARCH-REV-040) | live in a stopped delegator's view (REQ-013) | Holds |
| 8e select a local agent row | any depth | `AgentStreamingService` on its own run ID; stopped → the stored projection; then it follows the run (SR-064) | its conversation, live | Holds, with one detail (**G-3**) |
| 8e select a local team row or member | | `TeamStreamingService` on its team run ID; a stored session for a stopped team (SR-046) | | Holds |
| 8e select a peer row or member | | the delegator's view → `peerRunOf` → `readConversation`; live output from 8d; message and interrupt → the handle | as base, with no delegator root (REQ-013) | Holds |
| 8f the delegator stops / restarts with its view open | team, org | the session follows its registration (SR-046), with in-band snapshots through the same snapshot connection | one sequence, no recovery | Holds |
| 8f | standalone agent | the collaboration stream stays (SR-045); its own agent stream follows the run (SR-064) | | Holds |

**G-3 (detail).** SR-064 binds "on registration". A stream that connects **after** the run's root was registered never sees a registration event. At connect, the session must also take the current root, if there is one: bind to `activeHostRun()` if it is live, and subscribe to its `onHostReady`. Without this, a stream opened while the run sits registered but idle-shut-down would miss the host's next restore.

## DS-9 Restart, DS-10 Migration

| Cases | Expected | Verdict |
| --- | --- | --- |
| update restart with busy delegated runs, delegators stopped | the tree is rebuilt from the Task entries (T-6); resumed bottom-up; each resumed root registers, so an open stream binds (SR-064); `RunViewStream`s are new, with a new `liveSequenceId` (SR-063); the peer observations reopen with the views | Holds |
| the migration | unchanged by SR-060 … SR-066 (DS-10, E1 … E12) | Holds |

## DS-11 The run list

| Cases | Expected | Verdict |
| --- | --- | --- |
| a delegated run with an open entry | a child row under its delegator, at every depth; a peer row without a status (no request per poll) | Holds |
| a run whose entries are all closed; a run of a deleted Task | on its Task's page; a run of its own | Holds |
| **a run whose delegator was deleted** | DS-11 reads "`delegatingRun` is stored" from the files, so the list makes it top-level. But the tree (G-2) still puts it under the deleted run, so its views, reach and context disagree with the list | **G-2** |
| a run whose delegator was archived | stays under its delegator and is hidden with it, as base hid the copies with their host; unarchiving shows both again. A stopped run only: the guard refuses while it works | Holds; stated in DS-13 |

## DS-12 Settings

| Cases | Expected | Verdict |
| --- | --- | --- |
| a local child at any depth, agent / team / member row | each run's own stopped-run save, parent first, then row order; a running child refuses before any write; its own `RUN_ACTIVE` covers a race; a partial failure names the saved runs (SR-064) | Holds |
| a peer child | no editable launch, as base | Holds |

## DS-13 Archive and delete (new spine)

| Cases | Path today (branch) | Expected | Verdict |
| --- | --- | --- | --- |
| archive or delete A, T, O with a local delegated run working | `DelegatedWorkGuard.refusal` (`delegated-work-guard.ts`), called by the agent, team and org services | refused, naming the working runs | Holds |
| **with a peer delegated run working** | the guard skips peer rows ("its node owns it") | REQ-007 is "while a run it delegated to is working", and REQ-013 makes a peer run reached like a local one. Otherwise the peer run's later report finds its delegator deleted | **G-1** |
| **delete when none works** | the run's files and row go; **the `DelegationIndex` is not told** | the run leaves the tree; its delegated runs are tops of their own; step 2 and messages to it are refused (T-8, R-11) | **G-2** |

## DS-14 A run a peer started on this node

| Cases | Expected | Verdict |
| --- | --- | --- |
| node B's run is stopped by node B's user; restored by node A's message; its open stream on node B | stops itself only; the message restores it, and an open stream follows it (SR-064); node A's owner commands are admitted by the back-link | Holds |

## Gaps found, and their answers (SR-067)

- **G-1:** the archive/delete guard skips a working peer run. **Answer:** the guard also asks each open peer run once, through its handle's new `status()` (`runSummaries`, one request per node).
  - A working run refuses the action, as a local one does.
  - An unreachable node does not block. That run is reported in the result as not asked, and the action goes ahead, because the node owns the run and may never come back.
- **G-2:** a deleted run stays in the `DelegationIndex`. **Answer:** the run services' delete tells the index (`runDeleted(run)`), after the files are gone. The tree no longer has the run:
  - its delegated runs are the tops of their own trees;
  - a Task it assigned has no assigner for step 2;
  - its agents' run IDs are unknown, so a message is refused with `TARGET_AGENT_RUN_NOT_ACTIVE` (R-11).

  The Task entries keep their record. The model now has this as S26, S27, T-5 (peers), T-8 and R-11, and the independent validator applies the same rule.
- **G-3:** the agent stream connecting after the registration. **Answer:** at connect, the session also takes the current root, if there is one: it binds to `activeHostRun()` and subscribes to `onHostReady`.
- **Stale text found by the walk** (no behavior change): the DS-8 head line ("one hop", "the path a remote child uses"); the SR-044 "unsequenced and idempotent" paragraph, which SR-062/063 replace; the poll item's `runCollaborationStatuses`, which SR-061 replaced with base's status reads; DS-4's head line without peers; DS-5's peer line. Each is corrected or marked superseded in the design.

Checks after the changes:
- `walkthrough.py --check`: three "match" lines;
- `validate_contract_examples.py collaboration-walkthrough.md`: 0 findings.
