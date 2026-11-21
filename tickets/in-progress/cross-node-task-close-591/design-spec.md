# Design Spec: cross-node-task-close-591

## Solution And Approval Basis

- Current solution revision ID: `SR-008` (this design, on requirements SR-005).
- Approved requirements: `requirements-doc.md` at SR-005. The user decided DEC-004 (SR-002, SR-003); the rest was decided within the direction, and the user was informed.
- User approval of the design: `Not required`.
- Design status: `Ready`.
- Authorities read:
  - `references/architecture-design.md` and `references/design-principles.md` (this conversation);
  - `DESIGN.md` (this conversation; the diff since then is only rule 12's Docker `build_only` wording);
  - `collaboration_model.md` §1, §2.3 (CM-5, CM-7, CM-10 … CM-13) and §4;
  - `data_migration_guideline.md` §3 (compatible changes).
- Conflicts: none.

## Current-State Read

- **On the delegating node A, a Task's close (DONE / CANCELLED)** reaches `TaskExecutionResourceRelease.release` (`projects/runtime/task-execution-resource-release.ts:13-33`):
  - a local run goes to `TaskRunControl.stopForTaskClosure` (`task-run-control.ts:25-34`), its ordinary Stop with the `stillClosed` re-check (`isOpen`, CR-461-001);
  - a run with `nodeId` is skipped (`:18-21`, F-1).
- **A reopen** changes only the Task's status. The run's entry stays closed: the run stays out of the list, and a message to it is refused (`cross-run-message-delivery.ts:57`). Its assigner's `delegate_task` with the run's ID and `task_id` reopens the entry (`task-execution-resource-service.ts:180-194`, `reopenAssignment`) and delivers the work. For a remote run, this is refused (`task-delegation.ts:370`).
- **On the peer B**, a run that A's delegation started is a root of its own, with `delegatedFrom.nodeId` (`agent-run-metadata-types.ts:65-82`).
  - Its lifecycle is B's (CM-10). It is listed at the top level always (`top-level-run-rule.ts`, F-7). Its idle shutdown doesn't fire while an agent runs (F-5).
- **The link** (`/rest/remote/*`, signed and paired; `peer-gateway.ts` `admit`) already carries an owner `terminate` for such runs (F-4), checked by `storedRemoteLinkCheck` (`remote-run-links.ts:55-72`).
- **Peer reachability:** there is no heartbeat or "peer back" event (`peer-directory.ts`; no `setInterval` in `remote-collaboration/`).

## Task Size And Architectural Risk (Mandatory)

- **`task_size`: `Medium`** (SR-006 adds DN-8: the remote re-delegation, a removed refusal plus a delivery through an existing link call).
  - One new link request and its handler on B.
  - One owner on A for the notices and their retry.
  - Two optional stored fields.
  - The listing rule on B.
  - Docs.
- **`architectural_risk`: `High`.** A new cross-node contract, a new persisted field on each side, lifecycle (stop) across nodes, and a retry loop.
- **Escalate if:**
  - a strict reader rejects the new fields;
  - B's list can't be refreshed by an existing signal;
  - a Task outside A can name the run (U-1 returns).

## Architecture Investigation Evidence

| Source | Observation | Decision |
| --- | --- | --- |
| `task-execution-resource-release.ts:17-21`; the founder's `server.log:3191044` | Remote runs are skipped at the close | DN-1 replaces the skip |
| `task-run-control.ts:25-34` | The local closure stops through the ordinary Stop, re-checking `isOpen` | The same rule is applied for remote runs (DEC-006): state computed by `isOpen` at send time |
| `peer-gateway.ts:192-195, 286-305`; `team-run-agent-access.ts:97-98`; `standalone-run-agent-access.ts:75` | The link's owner `terminate` stops a whole team run, or a run's root | B's handler uses the same ordinary Stop |
| `remote-run-links.ts:55-72` (`storedRemoteLinkCheck`, the back-link) | A peer's request about a run is admitted only when the run's back-link names that peer's delegation | REQ-003 reuses it |
| `task-execution-resource-schema.ts:20-70, 95-115` | Task entries: the reader has no exact-key check per entry; the writer emits an exact shape; `closedAt` exists | DN-3: an optional `peerNoticeOwed` |
| `top-level-run-rule.ts` | A peer-started run is always top-level on B | DN-5: filtered by its stored delegation state |
| `peer-directory.ts`; `remote-collaboration/` | No reachability tracking | DN-4: A retries owed notices on a timer |
| **U-1** (`delegate_task`'s contract: a saved Task goes to an existing task agent only from the agent that made its most recent assignment) | A run's Tasks all come from its assigner's node. B's own agents can't assign a Task to a peer-started run | A decides "no other open Task" (DEC-003). **To verify** by a test that B's `delegate_task` with that run ID and a B-local Task is refused |

## Intended Change

- **A** tells B a remote run's delegation state whenever its entries change it: **closed** when its last open entry closes; **open** when its assigner gives it a Task again. It retries until B confirms.
- **A** also allows that re-delegation for a remote run (REQ-006), with the local checks, and delivers the Task's work through the link.
- **B** applies the state:
  - on **closed**, it records it, stops the run through its ordinary Stop, and drops it from its run list;
  - on **open**, it clears the record and lists the run again, starting nothing.

## Design Notes

**DN-1: the notice, and who decides it (A).**
- A new owner on A: `PeerRunStateNotices` (`agent-collaboration/execution/remote/peer-run-state-notices.ts`).
- `TaskExecutionResourceRelease` gives it each closed remote run, in place of the `FENCED_REMOTE` skip.
- The re-delegation (DN-8) gives it the run after `reopenAssignment` or a new `assigned` entry commits. A Task's reopen alone gives it nothing (SR-005: it changes no entry).
- **For each run:**
  1. mark the notice owed on the run's Task entries (DN-3);
  2. send it;
  3. on B's confirmation, clear the owed mark.
- The state sent is computed **at send time** from the Task side's `isOpen(run)` (the authority, as in `TaskRunControl`): open if any open Task entry names the run on A, closed otherwise.
- A run with another open Task is therefore never sent "closed" (AC-003). A reopen before delivery means the owed notice carries "open" (AC-004's alternate).
- After a confirmed send, A re-reads `isOpen`. If the state changed in flight, the notice stays owed and is sent again.
- One owner sends both states, so there's no second rule for remote runs.

**DN-1b: one ordered sequence per remote run (SR-007, ARCH-REV-001 AR-001).**
- `PeerRunStateNotices` serializes everything it sends about one remote run:
  - at most one notice in flight per run;
  - the state computed from `isOpen` when the notice is sent;
  - the next notice sent only after the previous answer.
- **Why:** this is the cross-node counterpart of CR-461-001's `kept_open`. B can't re-check A's state, so A orders.
- Without it, a stale "closed" (in flight, or held while B stops a team) could be applied after the re-delegated work woke the run, stopping it mid-work.
- **The re-delegation's work joins the same sequence (DN-8):** `TaskDelegation` awaits `notices.settled(run)` before delivering. That call resolves once the latest notice B confirmed is `open`, sending one if needed. If the notice can't be delivered (peer unreachable), the delegation's delivery fails as today's delivery failure does (`TASK_WORK_NOT_DELIVERED`), and the "open" notice stays owed.
- **On B,** the handler answers `open: false` only after the run's Stop completed (team or agent).
- **A's transport time-out** while B is still stopping keeps the notice owed. The next attempt is idempotent on B (already recorded, already stopped), and arrives after B's earlier stop has settled.

**DN-2: the link request and B's handler.**
- **The request:** `POST /rest/remote/delegated-run-states`, with body `{ run: { kind: "agent" | "agent_team", runId }, open: boolean }`.
  - It goes through `PeerGateway.admit` (pairing, signature, node identity) and the stored link check (`storedRemoteLinkCheck` with an owner query: the run's back-link must name the caller's node).
  - Answers: `{ accepted: true, open }`; `not_found` (no such run); `not_linked` (REQ-003).
  - A peer-client method `deliveredRunState(nodeId, run, open)` (`peer-client.ts`) sends it.
- **B's handler,** `DelegatedRunStateHandler` beside `RemoteRunViews` (`remote-collaboration/inbound/`):
  - **`open: false`:**
    1. record `delegationClosedAt` in the run's own file (DN-5);
    2. publish the run-list change (DN-6);
    3. stop the run through its ordinary Stop: `TeamRunService.terminateTeamRun` for a team, or the run root's Stop for an agent (the same calls the owner `terminate` uses).

    Already stopped: nothing to stop. Already recorded: idempotent.
  - **`open: true`:** clear `delegationClosedAt` and publish the change. Start nothing.
  - The handler stops nothing on `open: true`, and never deletes anything.
- **A message or delegation from A that reaches the run** (the existing inbound delivery, CM-11) also clears `delegationClosedAt`, if it's set. A run that is being worked on is open; this covers a reopen notice still in flight.

**DN-3: A's persisted owed mark.**
- On the Task entry, an optional `peerNoticeOwed: true`, written only when true and cleared on confirmation.
- Absence means nothing is owed. That is guideline §3's compatible addition, so there's no migration and no sweep of old closures (DEC-005).
- The reader keeps tolerating unknown keys. The writer emits it only when set. The entry type and the schema module carry it; the schema module's mapping comment is unchanged.

**DN-4: retry on A, without a heartbeat.**
- `PeerRunStateNotices` keeps the owed runs per peer:
  - loaded at start-up from the Task entries the delegation index already reads (no extra scan, QR-002);
  - added on each close or reopen.
- While a peer has owed runs, one timer (unref'd) per peer sends them every **30 s** (REQ-002's bound), one request per run, in turn.
- A transport failure keeps them owed.
- `not_found` or `not_linked` from B, or a peer no longer paired (`PeerDirectory.findByNodeId` null), drops the notice, logged: there is nothing to stop.
- A restart of A loses nothing (DN-3). A restart of B: the run resumes as today, then the next retry stops it.

**DN-5: B's persisted delegation state.**
- In the run's own file, an optional `delegationClosedAt: string`: `run_metadata.json` for an agent run, `team_run_execution_tree.json` for a team run.
- Set only on a run with `delegatedFrom.nodeId` (a peer-started run), meaning its delegating node closed every Task naming it.
- **Round-trip, not just tolerated** (ARCH-REV-001 note 1): the run_metadata parser builds from known fields only (`agent-run-metadata-store.ts:40-64`), and `writeMetadata` (`:135`) writes the parsed object. A tolerated unknown field would be dropped by the next rewrite (a Settings save, a runtime switch, a restore), and the run would return to B's list. So `delegationClosedAt` is a field of `AgentRunMetadata` and of its parser and writer, and likewise of the team tree's type, parser and writer, with a round-trip test each (read, rewrite, read).
- Absence means open. A local delegated run derives its state from its Task entries and never carries the field.
- **To verify:** both readers tolerate unknown keys (`agent-run-metadata-store.ts:55-70`; the team tree reader). A strict one is converted in this change (guideline §3, "Convert strict readers when you touch them").
- **Glossary:** "Closed delegated run" gains: "on the node that runs a peer-started run, recorded in its own file as `delegationClosedAt`".

**DN-6: B's list.**
- The top-level rule (`top-level-run-rule.ts`) leaves out a peer-started run whose own file has `delegationClosedAt`. On B such a run is in no list, as a local closed delegated run is in no sidebar list. It is still in B's memory and history, and on A's tree and Task page.
- **To verify:** which signal makes a local closure leave the list within seconds (autobyteus-446: the run-list refresh after a Task change; `RunStatusService.RUN_TREE_CHANGED`, `run-status-service.ts:404`, or the history catalog's change notice). B's handler publishes the same one, so desktop and phone drop or restore the row in the existing live-update time (REQ-005).
- **To verify:** the rule reads the run's own file. If listing doesn't already read it, the field is read where the row's metadata is read, not by a second file read per row.

**DN-8: giving a saved Task to an existing remote run (REQ-006).**
- In `TaskDelegation.toExistingRun` (`task-delegation.ts:357-…`), the refusal of a run with a `nodeId` entry (`:370`, `REMOTE_ROOT_REFUSAL_TEXT.savedTask`) goes. The local checks hold unchanged: the sender is the run's last assigner, and the reopen rules (`assertReopenable`).
- The entry is reopened or appended with the same `nodeId` (and `members` for a team), as the local path does.
- **For a run with a `nodeId` entry, two local steps don't apply** (SR-008, ARCH-REV-002 AR-002, read):
  - **The conversation check is skipped.** `toExistingRun` refuses unless `conversationOf` answers present (`task-delegation.ts:381-385`), and `createRunConversationAvailability` (`run-conversation-availability.ts:26-36`) knows only this node's runs. A remote run's conversation and restorability are B's (CM-10; `delegated-run-restorability.ts:44-47`). B's answer to the delivery stands.
  - **`deliverToRun` (→ `crossRun.route`) doesn't reach a peer run.** It returns `null` for a run with a peer entry (`cross-run-message-delivery.ts:105-109`), which `toExistingRun` treats as not delivered (`:398-404`).
- **The owner that chooses the delivery is `TaskDelegation.toExistingRun`:**
  - local run: `deliverToRun`, as today;
  - remote run: a second passed-in port, `deliverToPeerRun({ sender, nodeId, targetAgentRunId, content, messageType, referenceFiles })`, with `TASK_ASSIGNMENT_MESSAGE_TYPE` and the entry's `nodeId`, after `notices.settled(run)` (DN-1b).
- **The port is the existing peer delivery,** not a copy. The core of `GlobalAgentRunMessageRouter.deliverToPeer` after its peer-name lookup (`global-agent-run-message-router.ts:188-205`) becomes one function, `deliverMessageToPeerRun`:
  1. the sender's collaboration context;
  2. the channel (off: refused);
  3. `closedPeerRunRefusal`;
  4. the sender root by `activeRootDirectory.resolve`;
  5. `senderRoot.deliverToPeerRun`.

  The router (after `findPeer`) and the composition's port for `TaskDelegation` both call it.
- `closedPeerRunRefusal` doesn't refuse here, because the entry was just reopened or appended (open).
- On B, the linked message is admitted by the back-link endpoints (CM-11) and wakes the run (S-5 clears `delegationClosedAt` if still set).
- **A refusal from B, or an unreachable peer,** gives `TASK_WORK_NOT_DELIVERED`, as today's delivery failure (`:398-404`).
- **Test (AC-007), two-node integration:** the re-delegated Task's work reaches B's run and wakes it, for an agent run and a team run (its coordinator).
- Reference files travel as in `toNewRun`'s remote path (paths only; transfer is autobyteus-587).
- `REMOTE_ROOT_REFUSAL_TEXT.savedTask` is removed if nothing else uses it.
- A refused delivery (peer unreachable) gives the same result as a new remote delegation's delivery failure (`:189`). The entry stays as committed, and the sender can retry, as for a local delivery failure.

**DN-7: what is removed.**
- The `FENCED_REMOTE` branch and the comment of `task-execution-resource-release.ts`.
- In `collaboration_model.md`, "stop on Task closure" moves from §4's "later steps" to holds. CM-7 and CM-10 say that a peer-started run's delegation state is sent by its delegating node and recorded on its node. "Reactivation" (giving a run a Task again) holds for remote runs too (DN-8).
- The node access model gains the route's scenario row (`node_access_model.md`: link-only route, paired peer).

## Persisted Data / State Transition Decision

| Data | Decision | Evidence |
| --- | --- | --- |
| A: Task entry `peerNoticeOwed` | Compatible optional field, no migration | §3; absence = nothing owed |
| B: run file `delegationClosedAt` | Compatible optional field, no migration | §3; absence = open |
| Runs leaked before this fix | Not affected (DEC-005) | — |

- **Rollback:** an older build ignores both fields, if its readers are tolerant (DN-5 to verify). A run left with `delegationClosedAt` would then be listed again, which is harmless.

## Spines

| Spine | Path | Owner |
| --- | --- | --- |
| S-1 close | `update_task` DONE / CANCELLED (A) → `ProjectTaskService` → `TaskExecutionResourceRelease` → `PeerRunStateNotices.changed(run)` → owed mark → `isOpen` = false → `PeerClient.deliveredRunState(open=false)` → B `PeerGateway.admit` → link check → `DelegatedRunStateHandler`: record, publish, ordinary Stop → answer → A clears the owed mark | A: `PeerRunStateNotices`; B: the handler |
| S-2 unreachable | S-1 until the send; the transport fails → stays owed → the peer's 30 s timer → S-1's send … | `PeerRunStateNotices` |
| S-3 A restart | Start-up → the delegation index loads the entries → owed runs → per-peer timers → S-1's send | the same |
| S-4 re-delegation | Reopen (A, no effect on B) → the assigner's `delegate_task(run ID, task_id)` → `TaskDelegation.toExistingRun` (the local checks; the `:370` refusal removed for remote runs) → the entry committed → `notices.settled(run)`: the run's sequence finishes any in-flight notice, then sends `open` and awaits B's confirmation → the `deliverToPeerRun` port (`deliverMessageToPeerRun` → `senderRoot.deliverToPeerRun`, a linked message) → B wakes the run | `TaskDelegation`; `PeerRunStateNotices`; B: the handler and the inbound delivery |
| S-5 wake | A's message or delegation → existing link delivery → B clears `delegationClosedAt` if set → the run wakes (CM-7) | B's inbound delivery |
| S-6 refused | A third node sends the notice → `admit` (paired) → link check `not_linked` → refused | B's gateway |

**Walks per case (lesson 1):**
- Agent run and team run, each with DONE and CANCELLED: B stops the whole team, including a running member (AC-002).
- Another open Task on A: the state stays open, so nothing is sent (no change) (AC-003).
- B offline, then back: the 30 s retry (AC-004).
- A restarted while a notice is owed: S-3.
- B restarted while a notice is owed: the run resumes, then the next retry stops it.
- A re-delegation while "closed" is in flight, or while B is stopping a team: the sequence waits for that answer, then sends "open", then delivers the work. The run ends up working (AR-001's tests).
- A re-delegation before the close notice was sent: the owed notice is sent as "open". B never stopped the run, and the listing is unchanged.
- A re-delegation after delivery: S-4. The run returns to B's list and wakes with the work.
- A reopen alone: nothing on either side. A message is refused on A (`TASK_AGENT_RESOURCE_CLOSED`), as locally (AC-007).
- The work delivered before the open notice arrived: S-5 clears the mark.
- B unpaired from A: the notice is dropped, logged.
- A run deleted on B: `not_found`, dropped.
- A third node: S-6.
- The phone and the desktop on B: the same list signal (DN-6).

## Dependency Rules

- `PeerRunStateNotices` receives:
  - the peer channel (`RemoteRunChannel`, from the composition, as roots do since autobyteus-500 DR-1; the application host passes its "no remote" value, so nothing is owed there);
  - the Task side's `isOpen`, plus the owed-mark writes through `TaskExecutionResourceService` (the owner of entries);
  - the peer directory;
  - timers.
- Nothing is looked up process-wide.
- B's handler receives the run services and the list-change publisher from the composition.

## Change Scope (Mandatory)

- **In scope:**
  - A: `task-execution-resource-release.ts`; the new `peer-run-state-notices.ts`; the Task entry type and schema (`peerNoticeOwed`); the reopen commit point; the composition.
  - Link: `peer-client.ts`, `peer-gateway.ts`, `api/rest/remote.ts` (the route).
  - B: the new handler; the agent run metadata and team tree (`delegationClosedAt`); `top-level-run-rule.ts` and its list signal; the inbound delivery's clear.
  - Docs: the collaboration model, the glossary, the node access model.
  - A: `task-delegation.ts` (`toExistingRun`: the remote branch and its port), `remote-refusal-codes.ts`, `global-agent-run-message-router.ts` (the extracted `deliverMessageToPeerRun`), and the composition's port.
  - Tests: unit, integration, and the two-node E2E (AC-001 … AC-007).
- **Left alone:**
  - the local closure and re-delegation paths;
  - autobyteus-380's temp-Task rules (DEC-006);
  - a Task's reopen (it changes no entry, as locally);
  - file transfer (587).
- **Follow-ups:** none yet.
