# Design Spec: cross-node-task-close-591

## Solution And Approval Basis

- Current solution revision ID: `SR-004` (this design, on requirements SR-003).
- Approved requirements: `requirements-doc.md` at SR-003. The user decided DEC-004 (SR-002, SR-003); the rest was decided within the direction, and the user was informed.
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
- **A reopen** starts nothing locally. The run's row returns because the listing follows the Task's open state.
- **On the peer B**, a run that A's delegation started is a root of its own, with `delegatedFrom.nodeId` (`agent-run-metadata-types.ts:65-82`).
  - Its lifecycle is B's (CM-10). It is listed at the top level always (`top-level-run-rule.ts`, F-7). Its idle shutdown doesn't fire while an agent runs (F-5).
- **The link** (`/rest/remote/*`, signed and paired; `peer-gateway.ts` `admit`) already carries an owner `terminate` for such runs (F-4), checked by `storedRemoteLinkCheck` (`remote-run-links.ts:55-72`).
- **Peer reachability:** there is no heartbeat or "peer back" event (`peer-directory.ts`; no `setInterval` in `remote-collaboration/`).

## Task Size And Architectural Risk (Mandatory)

- **`task_size`: `Medium`.**
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

- **A** tells B a remote run's delegation state whenever it changes: **closed** when its Task closes and the run has no other open Task; **open** when a Task naming it is reopened. It retries until B confirms.
- **B** applies the state:
  - on **closed**, it records it, stops the run through its ordinary Stop, and drops it from its run list;
  - on **open**, it clears the record and lists the run again, starting nothing.

## Design Notes

**DN-1: the notice, and who decides it (A).**
- A new owner on A: `PeerRunStateNotices` (`agent-collaboration/execution/remote/peer-run-state-notices.ts`).
- `TaskExecutionResourceRelease` gives it each closed remote run, in place of the `FENCED_REMOTE` skip.
- The Task service gives it the remote runs of a Task it reopens. **To verify:** where `ProjectTaskService` commits a DONE/CANCELLED → TODO/IN_PROGRESS change; the notice goes beside that commit, as the release goes beside the close.
- **For each run:**
  1. mark the notice owed on the run's Task entries (DN-3);
  2. send it;
  3. on B's confirmation, clear the owed mark.
- The state sent is computed **at send time** from the Task side's `isOpen(run)` (the authority, as in `TaskRunControl`): open if any open Task entry names the run on A, closed otherwise.
- A run with another open Task is therefore never sent "closed" (AC-003). A reopen before delivery means the owed notice carries "open" (AC-004's alternate).
- After a confirmed send, A re-reads `isOpen`. If the state changed in flight, the notice stays owed and is sent again.
- One owner sends both states, so there's no second rule for remote runs.

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
- Absence means open. A local delegated run derives its state from its Task entries and never carries the field.
- **To verify:** both readers tolerate unknown keys (`agent-run-metadata-store.ts:55-70`; the team tree reader). A strict one is converted in this change (guideline §3, "Convert strict readers when you touch them").
- **Glossary:** "Closed delegated run" gains: "on the node that runs a peer-started run, recorded in its own file as `delegationClosedAt`".

**DN-6: B's list.**
- The top-level rule (`top-level-run-rule.ts`) leaves out a peer-started run whose own file has `delegationClosedAt`. On B such a run is in no list, as a local closed delegated run is in no sidebar list. It is still in B's memory and history, and on A's tree and Task page.
- **To verify:** which signal makes a local closure leave the list within seconds (autobyteus-446: the run-list refresh after a Task change; `RunStatusService.RUN_TREE_CHANGED`, `run-status-service.ts:404`, or the history catalog's change notice). B's handler publishes the same one, so desktop and phone drop or restore the row in the existing live-update time (REQ-005).
- **To verify:** the rule reads the run's own file. If listing doesn't already read it, the field is read where the row's metadata is read, not by a second file read per row.

**DN-7: what is removed.**
- The `FENCED_REMOTE` branch and the comment of `task-execution-resource-release.ts`.
- In `collaboration_model.md`, "stop on Task closure" moves from §4's "later steps" to holds. CM-7 and CM-10 say that a peer-started run's delegation state is sent by its delegating node and recorded on its node. "Reactivation" stays a later step: a reopen lists the run again and wakes nothing.
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
| S-4 reopen | Reopen (A) → `PeerRunStateNotices.changed(run)` → `isOpen` = true → `open=true` → B clears and publishes; starts nothing | the same; B: the handler |
| S-5 wake | A's message or delegation → existing link delivery → B clears `delegationClosedAt` if set → the run wakes (CM-7) | B's inbound delivery |
| S-6 refused | A third node sends the notice → `admit` (paired) → link check `not_linked` → refused | B's gateway |

**Walks per case (lesson 1):**
- Agent run and team run, each with DONE and CANCELLED: B stops the whole team, including a running member (AC-002).
- Another open Task on A: the state stays open, so nothing is sent (no change) (AC-003).
- B offline, then back: the 30 s retry (AC-004).
- A restarted while a notice is owed: S-3.
- B restarted while a notice is owed: the run resumes, then the next retry stops it.
- Reopen before delivery: the owed notice is sent as "open". B never stopped the run, and the listing is unchanged.
- Reopen after delivery: S-4. The run returns to B's list, stopped.
- A message after a reopen whose notice hasn't arrived: S-5 clears the mark.
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
  - Tests: unit, integration, and the two-node E2E (AC-001 … AC-006).
- **Left alone:**
  - the local closure path;
  - autobyteus-380's temp-Task rules (DEC-006);
  - reactivation on reopen;
  - file transfer (587).
- **Follow-ups:** none yet.
