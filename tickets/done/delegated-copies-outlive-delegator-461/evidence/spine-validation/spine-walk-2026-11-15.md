# The view spines walked again for every case, after SR-082 … SR-085 (2026-11-15, SR-086)

The user asked whether every data-flow spine had been validated for every case after the run-tree and status design. It had not. SR-067's walk (`spine-walk-2026-11-12.md`) predates SR-082 … SR-085, which change DS-8, DS-11, DS-12, the Task card and how a run's own stream connects. This walk covers the spines those revisions touch, for every case, through the owners of the current design. The spines they don't touch (DS-1 … DS-7, DS-9, DS-10, DS-13, DS-14, DS-15) are unchanged, and SR-067's walk stands for them.

**The cases:**
- **who delegated:** an agent (A), a team (T) or an org (O), at depth 1 or 2;
- **the delegated run:** an agent (a), a team (t), or a member of a team;
- **where it runs:** this node (L) or a peer (P);
- **the run's state:** running, idle, idle-shut-down, stopped, deleted;
- **the delegator's state:** running, stopped, deleted;
- **events:** a server restart; a peer offline.

**The new spines and their owners:**

| ID | Start → end | Owner |
| --- | --- | --- |
| V-S | A run's status → every place it is shown (list, tree, Task card, Settings, its own page) | `RunStatusService`, `/ws/run-status` |
| V-T | An open view → its tree, then its changes | `RunTreeView` on `RunViewStream` |
| V-L | A listed run that is not open → its tree, and its changes | `runTree(run)`, plus `RUN_TREE_CHANGED { runId }` |
| V-O | A click on a row, a Task card or a phone row → the run opened | `openRunTarget(openTarget)` |
| V-E | Settings → its rows, liveness, save, and the result shown | `RunTreeView` rows, `/ws/run-status`, each run's own save |
| V-C | A run's own conversation → snapshot, then frames | `AgentStreamSequence` and the snapshot connection (3b) |

## V-S Statuses

| Cases | Path | Expected | Verdict |
| --- | --- | --- | --- |
| a local agent run, any depth, running / idle / stopped / idle-shut-down | subscribe its run ID → `RunStatusService`: while registered, its root's status events; otherwise `offline` | its own status everywhere, also under a stopped delegator (F-62) | Holds |
| a team's or org's member | subscribe its agent run ID → its own run's root, by agent run ID | its own status | Holds |
| **a team or org row as a whole** | the row's `statusIds` were left undefined for the team itself. Base's web computes the team's dot from its members (`TeamAggregateStatusDot`, fed by the client's own aggregation) | the team's status is a fact of the team run, so one owner computes it, and a client doesn't derive it | **G-A4** |
| a peer agent, team or member | subscribe → its handle's shared `observe`, counted | its status from its node | Holds |
| **a peer node offline** | the handle's `observe` fails: the status answer is undefined | a defined answer | **G-A3** |
| **an id the node doesn't know** (a deleted run, a mistyped id) | undefined | a defined answer | **G-A2** |
| **a server restart, or a dropped status connection** | the client's subscription is lost; no reconnect rule | statuses resume without a reload | **G-A1** |

## V-T An open view's tree

| Cases | Path | Expected | Verdict |
| --- | --- | --- | --- |
| A, T, O × a, t × L, depth 1 and 2; delegator running or stopped | `RUN_TREE_SNAPSHOT` in SR-063's connection (rows read at the base), then `RUN_TREE_CHANGED` from `ChildRowsFeed` | the same rows as the query; nesting by delegating agent | Holds |
| closure, reopen, Task deletion, run deletion (T-8) | the index changes → `ChildRowsFeed` → `removed` / `added` for the run and its ancestors | live | Holds |
| **a Settings save changes a run's `launch`** | the row's `launch` is read from the run's file when the tree is built. Nothing emits `updated` after a save, and SR-085 removed Settings' save overlay | the saved launch shows at once, in every open view and listed tree that holds the row | **G-B1** |
| **a peer row's `launch` and summary** | SR-082 took `PeerChildObservation` out of the views. The peer row's launch has no defined source or update | read from the peer's summary, and updated when it changes | **G-B2** |
| P rows (status) | through V-S | | Holds |

## V-L A listed run that is not open

| Cases | Path | Expected | Verdict |
| --- | --- | --- | --- |
| a listed agent run with `hasCollaboration`; any listed run expanded | `runTree(run)`; `RUN_TREE_CHANGED { runId }` → re-read, newest answer only | live rows without a reload | Holds |
| **a listed team or org, expanded** | SR-073 said their delegated rows show only once opened. The tree now shows them on expand, for every kind | one rule for every kind (FU-031) | **G-C1** (document: SR-073 is superseded) |

## V-O Opening

| Cases | Path | Expected | Verdict |
| --- | --- | --- | --- |
| an agent row; a member row; a team row (its coordinator) | `openRunTarget` → the target's own stream (`/ws/agent`, the team stream) → select the row in `topRun`'s tree | its own conversation | Holds |
| **a peer row** | `openTarget` is the peer run. Before SR-082 its conversation was read through the handle, but its **live output** reached the screen only as `remote_agent_presentation` frames in the delegator's view (`peer-child-observation.ts:153`). SR-082 removed that numbering, and nothing else carries a peer run's live output | a peer run opens by its own identity, with its conversation and live output (REQ-013) | **G-D1** |
| **the Task card** | it has `topRun` (SR-080), but no `openTarget`. The client would derive one from the entry's run | the card opens through `openRunTarget` with the server's target | **G-F1** |

## V-E Settings

| Cases | Path | Expected | Verdict |
| --- | --- | --- | --- |
| an agent child, a team child (team row and member row), at any depth | rows from `RunTreeView` with `launch`; liveness from `/ws/run-status`; each run's own save | the right rows; a running child refuses before any write | Holds |
| after a save | depends on G-B1 | the saved launch and the `"settings"` origin show | G-B1 |
| a peer child | no editable launch | as base | Holds |
| a refresh during editing | the target is a row key from identities (ARCH-REV-057) | the target is kept | Holds |

## V-C A run's own conversation

| Cases | Path | Expected | Verdict |
| --- | --- | --- | --- |
| a user-started or delegated agent run, running or stopped | the snapshot connection on `AgentStreamSequence`; appending frames carry offsets | nothing is lost or doubled | Holds |
| restored by its delegator, or after idle shutdown, while open | the session rebinds (SR-064) → an in-band snapshot through the same connection | one sequence | Holds |
| **a server restart** | `AgentStreamSequence`'s lifetime and `liveSequenceId` are undefined | the client reopens on a new sequence | **G-G1** |
| a team member; an org agent | the team stream or the org stream, which have their own snapshot connection | | Holds |

## The gaps and their answers (SR-086)

- **G-A1:** the client reconnects `/ws/run-status` with backoff and re-subscribes every id it shows. The server answers with a fresh `RUN_STATUS_SNAPSHOT`, and the client replaces its statuses from it.
- **G-A2:** an id the node doesn't know is answered `not_found`, and the client shows no status for it.
- **G-A3:** a peer run whose node can't be reached is answered `unreachable`, with the node's name. The client shows "Couldn't reach {node}." as at base. The handle's `observe` retries under its existing rule (DEC-807: no reconnect while the stream is open; a new observation when a subscriber returns).
- **G-A4:** a team or org run ID has its own status in `RunStatusService`, computed by its own root from its members by base's rule. That rule moves from `TeamAggregateStatusDot`'s feeding code to the server, one owner. A team or org row's `statusIds` is its run ID, and its members' rows carry their agent run IDs.
- **G-B1:** every run save that changes a launch (agent run, team default, member) notifies `ChildRowsFeed` for that run. It emits `RUN_TREE_CHANGED { updated }` on every open view whose tree holds the row (the run and its ancestors), and `RUN_TREE_CHANGED { runId }` for listed runs. Settings shows the new `launch` from that update. No client overlay.
- **G-B2:** a peer row's `launch` comes from the peer run's summary, carried by the same shared observation as its status. `RunStatusService` keeps the latest summary beside the status, and `RunTreeView` reads it when building. A summary change emits `updated` for the row. No peer request per poll.
- **G-C1:** SR-073 is superseded. A listed team or org shows its tree when expanded, like an agent run.
- **G-D1:** a peer run opens by its own identity. `openRunTarget` for a peer target connects to `/ws/peer-run` (`{ nodeId, runId, agentRunId }`), a stream on this node served through the run's handle:
  - its snapshot is `readConversation` (the stored conversation on its node);
  - its live frames are the handle's `observe` output, numbered with SR-063's snapshot rule and carrying offsets like 3b;
  - its commands (a message, an interrupt) go to the handle's `postMessage` / `interrupt`, with no tool approval, as at base;
  - the frames the delegator's view carried before (`remote_agent_presentation`) go.
- **G-F1:** `TaskRootView` carries `openTarget` from `openTargetOf`, beside `topRun`. The card calls `openRunTarget(openTarget)`.
- **G-G1:** an `AgentStreamSequence` lives as long as the process, one per agent run, and is created when its first session connects. A server restart gives a new `liveSequenceId`, and the client reopens with a fresh snapshot, as the view clients do.
