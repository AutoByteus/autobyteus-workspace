# Design Spec — autobyteus-434

## Solution And Approval Basis

- Current solution revision ID: `SR-004` (SR-003 revised SR-002 for ARCH-REV-001; SR-004 resolves ARCH-REV-002 AR-001(c) and notes N-4…N-7)
- Approved requirements baseline / revision, who approved, and approval reference: `requirements-doc.md` at SR-001, approved by the Solution Designer within the Task's direction, user informed (2026-11-08); the PM confirmed the order bug stays in this ticket (2026-11-08). Unchanged by SR-003.
- Behavior-defining supplements and their approval references: None.
- User approval of the design, when the direction requires it: `Not required`
- Design status: `Ready`
- Canonical investigation-notes path: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-live-updates-434/tickets/in-progress/phone-live-updates-434/investigation-notes.md`
- Authorities read (design reading gate; 2026-11-08): `references/architecture-design.md`, `references/design-principles.md`, `DESIGN.md` (repository root), `autobyteus-server-ts/docs/design/data_migration_guideline.md` § 2 (checklist), `GLOSSARY.md` (searched; no stream-lifecycle words defined). Review input: `design-review-report.md` (ARCH-REV-001, ARCH-REV-002).
- Project design-principle conflicts or discrepancies: None.

### SR-003 changes at a glance (for the re-review)

| Finding | Resolution | Sections |
| --- | --- | --- |
| AR-001(a) | The agent catch-up no longer races live events. It runs **before** the socket opens: load the stored state, commit it, then open. No revision-guard loop, no "3 conflicts" end state. A failed load is a failed attempt and goes back to the scheduler. | DS-003, Agent run reconnection, Interfaces, Guidance (test) |
| AR-001(b) | A narrow loader reads only the projection and file changes; the commit replaces only conversation, activities, file changes and `hasEarlierActiveTraceEvents`; config and status stay. Conversation defaults come from the live context's config. | DS-003, Files |
| AR-001(c) | No `onReconnected`. Only attempts the scheduler drives do the catch-up; owner-initiated connects (open path, active-run recovery) keep doing what they do today. | DS-003, Per-owner table |
| AR-002(a) | Success point per owner: Team, Org, collaboration = snapshot accepted; agent = socket open after its catch-up. An attempt that opens and fails before that point is a failed attempt. One schedule, first wait 1 s (P-002). | Per-owner table |
| AR-002(b) | Org re-sync = retire the current generation (intentional close), then `attemptNow()`, which runs its transparent recovery with no socket (`reopenOwned(null)`). Collaboration: `closeSocket` + `attemptNow()`. Team: restart the transport. Agent: quiet disconnect + `attemptNow()`. | Per-owner table |
| AR-002(c) | Scheduler API `startOver()`, `attemptNow()`, `isWaiting()` (renamed `isRecovering()` in SR-004) replace Org's `transparentRecoveryScheduled` and the owners' counters. `connect()` and `requestRecovery()` are mapped. `WebSocketClient` becomes a plain socket: `DISCONNECTED` while waiting or holding (`RECONNECTING` removed). An owner connect request during a wait cancels the wait and connects at once. | Per-owner table, Interfaces, Removal plan |
| N-1 | Recorded as established: a later accepted snapshot clears the reported error (`agentOrgContextsStore.ts:81`, `agentRunCollaborationStore.ts:78`). | Ownership Map |
| N-2 | `agentRunStore.ts` is 515 lines: its line count must not grow. Service construction moves into the new reconnection file's factory. `TeamStreamingService.ts` (486) must stay ≤ 500 (extraction named). | Files |
| N-3 | Stated: a `whenReady()` caller registered after the one-time persistent-failure report waits until success or release, as after today's give-up. | Ownership Map |

### SR-004 changes at a glance (ARCH-REV-002)

| Finding | Resolution | Sections |
| --- | --- | --- |
| AR-001(c1) / P-004 | Rule in `agentRunStore.connectToAgentStream` (through `AgentRunStreamReconnection.requestConnect()`): a stream in a loss streak (waiting, held or attempting) is never connected without catch-up. Waiting → `attemptNow()` (catch-up, then open); held → nothing (the page resume attempts); attempting → nothing. Only an idle stream (never lost, or closed on purpose) connects without catch-up. This covers the real owner-initiated caller, the history read's `reconcileDiscoveredActiveRuns` (`runHistoryLoadActions.ts:323-329`, after every history read, `:147`), and the open path. The wrong name "active-run recovery" is removed: it has no production caller (FU-002). | Agent Connect Rule, Per-owner table, Change Scope |
| AR-001(c2) / P-005 | Every agent socket open calls `connected()`, whoever started it; the same holds for every owner's success point. An owner-opened stream therefore re-syncs after ≥ 30 s hidden. | Per-owner table |
| N-4 | `isWaiting()` is replaced by `isRecovering()` (waiting, held or attempting); Org `requestRecovery` and the agent connect rule use it, so nothing attempts while hidden. | Interfaces, Per-owner table |
| N-5 | `activeRunRecoveryCoordinator.ts` recorded as dead code (FU-002). | follow-ups.md |
| N-6 | The agent re-sync drops the connection with `AgentStreamingService.dropConnection(reason)`, which runs the loss bookkeeping (rejects pending admissions and interrupts) without the loss notification. | Per-owner table, Interfaces |
| N-7 | Every exit of the agent `attempt` ends in exactly one scheduler call: the open's `connected()`, `connectionLost()`, or `startOver()` (superseded: context gone, or an owner connect already started a socket). No path leaves the scheduler in `attempting`. | Agent Connect Rule |

## Current-State Read

Four client owners keep a live run stream per open run, and each one decides on its own when to reconnect:

| Stream | Owner | Reconnect today | Success point today | Catch-up after a reconnect |
| --- | --- | --- | --- | --- |
| `/ws/agent/:runId` | `AgentStreamingService` over `WebSocketClient` (`transport/WebSocketClient.ts:15-20, 94, 132-152`) | 1,2,4,8,16 s, then `Max reconnection attempts reached` and never again; `RECONNECTING` state during the wait | Socket open (`:94`) | **None**: the node sends `CONNECTED` + `AGENT_STATUS` only (`agent-stream-handler.ts:169-175`); `AgentStreamingService.handleConnect` only logs (`AgentStreamingService.ts:254-256`). A re-open hydrates only when the stream is not connected (`agentRunOpenCoordinator.ts:72-110`, `runOpenStrategyPolicy.ts:9-22`) |
| `/ws/agent-team/:teamRunId` | `TeamStreamingService` over `WebSocketClient` | same | Socket open (transport) | Yes: `CONNECTED` + `TEAM_EXECUTION_VIEW_SNAPSHOT` (`TeamStreamingService.ts:273-276, 332-355`; R2) |
| `/ws/agent-org/:orgRunId` | `AgentOrgStreamingService` (`agentOrgStreamingService.ts:44-48, 80-101, 421-438`) | 0,1,2,4,8 s then `reportError` and stop | Snapshot accepted (`:325`) | Yes: transparent recovery, `reopenOwned(null)` with inspection, checkpoint and snapshot (`:136-166, 440-452`) |
| `/ws/agent-collaboration/:runId` | `AgentRunCollaborationStreamingService` (`agentRunCollaborationStreamingService.ts:28-30, 60-82, 249-262`) | 0,1,2,4,8 s then `reportError`, readiness rejected, stop | Snapshot accepted (`:201`) | Yes: `CONNECTED` + `ROOT_EXECUTION_VIEW_SNAPSHOT` (`:186-201`) |

None of them reacts to the page becoming visible or the network returning; none detects a silently dead socket. Opening a run reuses a stream that looks connected or reconnecting (`agentTeamRunStore.ts:98-107`, `agentRunStore.ts:293-305`), so a re-open helps only after the stream gave up (R3) and not for a silently dead one (R4).

Order bug: the node lists a forwarded input in the live input state with its `message_id`/`dedupe_key` until its turn ends (`agent-run-input-admission-state.ts:310-320, 360-370`). The client matches pending entries to shown user messages by identity and appends unmatched ones (`userMessageProjection.ts` `applyPendingUserMessage`; `memberLoader.ts:135`). The node writes the stored user message of external runtimes without identity: `RuntimeMemoryEventAccumulator.recordForwardedUserMessage` (`runtime-memory-event-accumulator.ts:68-85`) passes no identity and `ExternalRuntimeMemoryWriter`'s user branch (`external-runtime-memory-writer.ts:66-71`) forwards none, although `RawTraceItem` writes them (`autobyteus-ts/src/memory/models/raw-trace-item.ts:70-74, 101-104`) and the reader chain carries them to the projection (`raw-trace-record-normalizer.ts:76-78`, `raw-trace-to-historical-replay-events.ts:182-183`, `historical-replay-events-to-conversation.ts:15-16, 28-29`).

## Task Size And Architectural Risk (Mandatory)

- Task size: `Medium`
- Size rationale and supporting evidence: about 12 production files in two packages, all inside existing owners: one new small web module (scheduler + page resume), one new agent-run reconnection file, four stream owners adopt the scheduler, one narrow loader extracted in run hydration, two server memory-recording files and one type. No new route, no protocol message, no UI.
- Architectural risk: `High` (confirmed by ARCH-REV-001)
- Risk rationale and supporting evidence: it changes the connection lifecycle of all four live run streams on desktop and phone, replaces a live agent conversation from the stored state on reconnect, and adds fields to newly persisted raw-trace records.
- Escalation trigger: a stream owner that cannot adopt the scheduler without changing its protocol or readiness contract; the agent catch-up losing or duplicating events beyond the stated read-to-open window; any reader that rejects the identity keys on external-runtime user records; `TeamStreamingService.ts` or `agentRunStore.ts` exceeding the size constraints below.

## Architecture Investigation Evidence

| Source / Command / Probe | Exact Path / Reference | Observation | Design Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| Reproduction R1–R6 | `evidence/repro/phone-live-repro.mjs`, `evidence/repro-run-3..5/` | 46 ms live; short outage recovers (Team); 45 s outage never recovers; silent dead path never noticed; duplicate message on load during a turn | All | Agent-run short outage not measured (read: no catch-up) |
| Code read | Current-State table | Four reconnect policies, three success points, no resume trigger | One scheduler; success point stays per owner | — |
| Code read | `agent-stream-handler.ts:169-175` | Agent stream has no snapshot | Agent catch-up from stored state (DS-003) | — |
| Code read (ARCH-REV-001 P-001) | `agentStreamMessageProjector.ts:91-94`, `recentEventMonitorMutationCoordinator.ts:60-66` | Every text delta changes the presentation revision | Catch-up runs while the socket is closed (no guard needed) | — |
| Code read | `runContextHydrationService.ts:38-43, 56-155` | Full loader needs workspace resolution and rebuilds config; the projection and file-change reads are separable | Narrow loader shared with the full one | — |
| Code read (ARCH-REV-001 AR-002) | `agentOrgStreamingService.ts:80-101, 136-166, 270-283, 325, 346, 405-421, 440-452`; `agentRunCollaborationStreamingService.ts:60-82, 160-171, 201, 215-222, 249-262` | Success at snapshot; failure paths before snapshot; Org recovery needs no socket; `requestRecovery` reads the scheduled flag | Per-owner mapping | — |
| Code read | `agentOrgContextsStore.ts:81`, `agentRunCollaborationStore.ts:78` | A later accepted snapshot clears the reported error | N-1 recorded | — |
| Code read | `grep RECONNECTING` over `autobyteus-web` (2026-11-08) | Read only inside `WebSocketClient.ts:62, 76, 146` | Remove the state | — |
| Code read | `MobilePairedShell.vue` (E-25) | The phone already treats visibility as "in front" | Page resume signal | ASM-001 |
| Data read | User's raw traces (no ids); repro `hasMessageId: false` | Identity lost at write | DS-004 | — |

## Intended Change

1. One scheduler decides **when** a live run stream tries again. Its rules: capped backoff with no final give-up while the page is visible; no attempts while hidden; an immediate attempt on becoming visible or `online`; a re-synchronization of an apparently connected stream after the page was hidden ≥ 30 s. Each of the four stream owners holds one scheduler and keeps **how** it connects, **where** it succeeds and **how** it catches up.
2. An agent-run stream catches up before it reopens: it loads the stored state, commits it, then opens the socket. (The agent stream has no snapshot.)
3. The node stores `message_id` and `dedupe_key` on external-runtime user records.

## Change Scope (Mandatory)

- In scope: UC-001, UC-002, UC-003. Areas:
  - the web client's live-stream reconnect lifecycle: new `services/liveStreamLifecycle/`; `WebSocketClient` reduced to a plain socket; `TeamStreamingService`, `AgentStreamingService` and a new agent-run reconnection owner; `AgentOrgStreamingService`, `AgentRunCollaborationStreamingService`;
  - a narrow stored-state loader in run hydration;
  - the server's external-runtime memory recording of user messages.
- Derived consumers of the changed stored structure (user raw-trace records gain `message_id`/`dedupe_key`):
  - `raw-trace-record-normalizer.ts`: reads them already. No change.
  - Run projection (`historical-replay-events-to-conversation.ts`) and `run-projection-dedupe.ts`: user entries now carry identity and dedupe by it instead of content+time. Intended; no change.
  - Client `runProjectionConversation.ts` / `userMessageProjection.ts`: identity now matches pending entries. This is the fix; no change.
  - Memory explorer, memory search, compaction/work journal readers: they ignore the new keys (`RawTraceItem.fromDict` already parses them). No change.
  - Remote runs (another node's projection, N-403): same reader. No change.
- Deliberately left alone:
  - the 403/416 guards;
  - stream protocols and contracts (no heartbeat: FU-001);
  - the node change feed (`nodeChangeFeed.ts`, already retries forever and is not a run stream);
  - terminal and VNC sockets;
  - the Android shell;
  - the native AutoByteus runtime's recording;
  - old raw-trace records;
  - Team candidate streams used by `replaceFailedTeamStream` (they keep their own 10 s readiness timeout and get no scheduler);
  - the existing open path (`agentRunOpenCoordinator.ts`) and the history read's `reconcileDiscoveredActiveRuns` (`runHistoryLoadActions.ts:288-345`): unchanged. Both connect through `agentRunStore.connectToAgentStream`, whose rule (Agent Connect Rule) decides the catch-up. `activeRunRecoveryCoordinator.ts` has no production caller (FU-002) and is not touched.
- Follow-ups: FU-001, FU-002.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Approved Requirement / AC IDs | Approved Trigger Or Governing Contract | Relevant Existing Behavior And Evidence | Approved Change Or Preserved Outcome | Target Production Path / Spine |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | REQ-005 / AC-006 | Open running run | 46 ms (R1) | Preserved | DS-001 unchanged |
| BEH-002 | System | REQ-005 / AC-006 | Short outage | Team catches up (R2) | Preserved; agent now also catches up (DS-003) | DS-002, DS-003 |
| BEH-003 | System | REQ-001 / AC-001, AC-002 | Outage > 31 s, visible | Gives up (R3) | Keeps trying ≤ 30 s apart; catches up | DS-002 → owner attempt → catch-up |
| BEH-004 | System | REQ-002 / AC-003, AC-004 | Page visible / online after hidden | Nothing happens (R3, R4) | Immediate attempt; re-sync after ≥ 30 s hidden | DS-002 resume branch |
| BEH-005 | User | REQ-004 / AC-005 | Load during the turn | Duplicate at the end (R6) | One copy in place | DS-004 → projection → client match |
| BEH-006, 007, 008 | — | REQ-005 | — | — | Preserved | — |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related AC IDs | Relationship To This Design | Status |
| --- | --- | --- | --- | --- |
| `evidence/repro/phone-live-repro.mjs` | Reproduction | AC-001, 003, 005, 006 | Implementation starts from it failing (R3, R4 `null`; R6 2 copies) | Evidence only |
| `design-review-report.md` (ARCH-REV-001) | Review findings | — | SR-003 resolves AR-001, AR-002, N-1…N-3 | Review-owned |

## Task Design Health Assessment (Mandatory)

- Change posture: `Bug Fix`
- Current design issue found: `Yes`
- Structural triggers that fire:
  - *Repeated coordination* (Principle 13): retry scheduling (attempt counter, timer, backoff, give-up) is implemented three times (`WebSocketClient.ts:132-152`, `agentOrgStreamingService.ts:421-438`, `agentRunCollaborationStreamingService.ts:249-262`), with two schedules. The missing resume trigger would otherwise be added three more times.
  - *Behavior by absence* (Principle 13): today the agent stream catches up after a reconnect only when a later re-open happens to find the stream disconnected. It becomes an explicit catch-up before each scheduled reopen.
  - *Split sequence* (Principle 13): placing the agent catch-up inside the transport would make the transport reach the hydration owner. Instead, the agent-run reconnection owner drives load → commit → open itself.
  - *Persisted-data transition* (Principle 5): new optional keys on user records.
  - *Several kinds* (Principle 1): four stream kinds, each mapped in the per-owner table.
  - Ruled out:
    - *Authoritative boundary*: callers keep using the stores, not the transports or schedulers.
    - *Shared folder*: the new module is a stream-lifecycle concern, not `shared/`.
    - *Vocabulary drift*: see Terminology.
- Root cause classification: `Duplicated Policy Or Coordination` (stall) and `Local Implementation Defect` (identity not written).
- Refactor needed now: `Yes`, bounded. Extract the retry scheduling into one owner, remove the three local copies, and reduce `WebSocketClient` to a socket.
- Evidence: the trigger list above.
- Design response: `LiveStreamReconnectScheduler` owns *when*; each stream owner keeps *how*, its *success point* and its *catch-up*.
- Refactor rationale: one owner makes AC-001…004 provable once.
- Intentional deferrals and residual risk:
  - Screen-on silent dead path (FU-001).
  - Agent read-to-open window (Risks): events the node produces between the catch-up read and the socket open are not shown until the next catch-up or open. This is the same window the open path has today.

## Terminology

- *Run stream*: the WebSocket a client keeps for one open run (agent, Team, Org, collaboration).
- *Page resume*: the page became visible again, or the browser reported `online`.
- *Success point*: the moment an owner counts a reconnect as successful (snapshot accepted; for the agent stream, socket open after its catch-up).
- *Catch-up*: what an owner does so that the events it missed are shown: apply the node's snapshot (Team, Org, collaboration), or load and commit the stored state before opening (agent).
- *Re-synchronize (a run stream)*: drop a stream that looks open and reconnect it with its catch-up.
- No project glossary entry is needed: these are code-level terms of the web client's stream lifecycle (`GLOSSARY.md` holds domain words).

## Legacy Removal Policy (Mandatory)

- Obsolete paths in this scope:
  - `WebSocketClient`'s whole reconnect machinery and `ConnectionState.RECONNECTING`;
  - the Org service's `MAX_TRANSPARENT_RECOVERY_ATTEMPTS`, `recoveryDelay`, counter, timer and scheduled flag;
  - the collaboration service's `MAX_RECOVERY_ATTEMPTS`, `recoveryDelay`, counter and timer.
- Compatibility wrappers, dual paths, or legacy fallbacks this design keeps: `None`.

## Persisted Data / State Transition Decision (Mandatory)

- Stored subject: user records (`trace_type: "user"`) in per-run raw trace files of external-runtime runs; one per user message.
- Change: new records gain `message_id` and `dedupe_key`. Both are already part of `RawTraceItem`'s format and written by the native runtime.
- Normal reader/writer behavior: `RawTraceItem.fromDict` and the normalizer read them when present and tolerate their absence (the user's real records have none and load today).
- Required semantics under direct use: an old record without identity stays readable. Its only effect is BEH-005 for a turn that started before the update and is still running after it; a node update stops running turns.
- Decision: `Directly Usable — No Migration` (confirmed by ARCH-REV-001).
- Rationale: a tolerant reader is already in place; nothing can supply the missing ids for old records; rewriting would gain nothing.
- Data Migration Guideline § 2:
  1. Need: no (tolerant reader).
  2. Availability: unaffected.
  3. Source shapes inspected: real user records without ids (Claude Agent SDK member, 2026-11-04…08) and native records with ids; both read today.
  4. Disposition: old records untouched.
  5. Commit/retry: N/A.
  6. Current-only boundary: no legacy branch added.
  7. Cost: none at startup.
  8. References: none cross packages beyond `RawTraceItem`.
  9. Evidence: a server test of the recorder and the projection (AC-005).
  10. Lessons: no migration for an additive optional field (guideline § 3).
- Supports: REQ-004 / AC-005.

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001 | Node run event | Phone conversation | Stream owner (per kind) | Unchanged live path |
| DS-002 | Bounded Local | BEH-003, BEH-004 | Stream lost, or page resume | Owner's attempt or re-sync | `LiveStreamReconnectScheduler` (one per stream) | The fix for the stall |
| DS-003 | Primary End-to-End | BEH-002, BEH-003 | Scheduler attempt for an agent run | Conversation caught up, socket open | `AgentRunStreamReconnection` | Agent catch-up |
| DS-004 | Primary End-to-End | BEH-005 | User sends a message to an external-runtime run | A loading view shows it once in place | Node memory recorder → projection → client hydration | The order fix |

## Primary Execution Spine(s)

- DS-002: `Socket lost or attempt failed (owner) -> scheduler.connectionLost() -> visible ? wait 1,2,4,8,16,30,30… s : hold -> scheduler calls owner.attempt -> owner opens (and catches up) -> owner's success point -> scheduler.connected()`; and `page resume -> scheduler: waiting/held ? attemptNow : (connected && hidden ≥ 30 s ? owner.resynchronize : nothing)`
- DS-003: `Scheduler attempt (timer, page resume, or a connect request during a loss streak) -> AgentRunStreamReconnection.attempt -> loadRunStoredState (projection + file changes) -> commit into the live AgentContext (conversation with pending inputs overlaid, activities, file changes, hasEarlierActiveTraceEvents) -> AgentStreamingService.connect -> socket open -> scheduler.connected() -> node CONNECTED + AGENT_STATUS -> live events`
- DS-004: `Phone/desktop composer -> Node AgentRun input admission (forwarded, with message_id/dedupe_key) -> RuntimeMemoryEventAccumulator.recordForwardedUserMessage (identity from message metadata) -> ExternalRuntimeMemoryWriter -> RawTraceItem (raw_traces file) -> run projection (user entry with identity) -> client hydration -> AGENT_INPUT_STATE pending entry matches the stored message -> one copy in place`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-002 | When a run stream is lost or an attempt fails before its success point, the owner calls `connectionLost()`. While the page is visible, the scheduler waits 1, 2, 4, 8, 16, 30, 30… s and calls the owner's `attempt`; it never stops. While hidden it holds. On page resume it attempts at once if the stream is waiting or held. If the stream is connected and the page was hidden ≥ 30 s, it asks the owner to re-synchronize. The owner calls `connected()` at its success point, which resets the count. After the fifth consecutive failure it calls `onPersistentFailure` once per failure streak. | run stream, scheduler, page resume | Scheduler (when), stream owner (how) | Page resume signal |
| DS-003 | The agent stream has no snapshot, so the agent-run reconnection owner catches up while the socket is closed. It loads the projection and file changes, commits them into the live context (keeping config and status), then opens the socket. No stream event can land during the load, so nothing races. A failed load or a commit conflict counts as a failed attempt and goes back to the scheduler. Every exit ends in one scheduler call: `connected()` (open), `connectionLost()` (failure) or `startOver()` (superseded). A connect request during a loss streak goes through this attempt (P-004). | agent run, stored state | `AgentRunStreamReconnection` | Narrow loader, pending-input overlay |
| DS-004 | The forwarded message's metadata carries its `message_id` and `dedupe_key`. The recorder passes them to the writer, the raw record stores them, the projection returns them, and the client's existing identity matching keeps one copy. | user message, raw trace record, projection | Node memory recorder | — |

## Per-Owner Scheduler Adoption (AR-002, AR-001(c))

| Owner | `attempt` (scheduler-driven) | Success point → `connected()` | `connectionLost()` called on | `resynchronize` (looks open, hidden ≥ 30 s) | Owner-initiated connect | `onPersistentFailure` |
| --- | --- | --- | --- | --- | --- | --- |
| `TeamStreamingService` | `connectTransport(teamRunId)` (phase `awaiting_connected_root`) | Snapshot accepted (phase `ready`, `TeamStreamingService.ts:351`) | Unintended transport close (`handleDisconnect`); not in `reopen_required` | `restartTransport()`: quiet `wsClient.disconnect()`, the `handleDisconnect` bookkeeping (phase `disconnected`, drain pending sends/interrupts), then `attemptNow()` | `connect()` (store, `agentTeamRunStore.ts:105, 120`): `startOver()`, then connect as today | None (no report today) |
| `TeamStreamingService` in `reopen_required` | — | — | — | — | — | `enterReopenRequired` calls `startOver()`; no retries; the user re-selects (as today) |
| Team candidate stream (`connectCandidate`) | no scheduler | — | — | — | — | — |
| `AgentRunStreamReconnection` (agent run) | Catch-up then `service.connect()` (DS-003) | **Every** socket open, scheduler-driven or owner-initiated (the agent stream has no snapshot; P-005) | Unintended socket close; failed load; commit conflict | `service.dropConnection('re-synchronizing')` (loss bookkeeping: pending admissions and interrupts rejected; no loss notification), then `attemptNow()` | `requestConnect()` from `agentRunStore.connectToAgentStream` (open path after its own hydration; history read `reconcileDiscoveredActiveRuns`); see Agent Connect Rule | None |
| `AgentOrgStreamingService` | Existing transparent recovery (`attemptTransparentRecovery`: `reopenOwned(null)` when a context exists, else `openSocket()`) | Snapshot accepted (`:325`, where the count resets today) | Socket `onclose` when not intentional (`:121-133`); `failClosed` (`:405-421`, covers `ERROR`, correlation mismatch, snapshot outside the checkpoint window); a failed recovery attempt (`:452`) | Retire the current generation (intentional close, phase `disconnected`, reject pending commands with "re-synchronizing"), then `attemptNow()` → `reopenOwned(null)` | `connect()` (`:80-92`, store `attach`): `startOver()`; then as today: in `reopen_required` → `attemptNow()`, else `openSocket()` (a throw → `connectionLost()`). `requestRecovery()` (`:95-101`, store `:220`): the guard reads `scheduler.isRecovering()` (waiting, held or attempting: nothing to do, the scheduler or the page resume attempts) instead of `transparentRecoveryScheduled`; then `startOver()` + `attemptNow()` | `reportError(lastFailureDetail)` (as today at the 5th failure); keep retrying |
| `AgentRunCollaborationStreamingService` | `connect()` mechanics (`:60-82`) | Snapshot accepted (`:201`) | Socket `onclose` when not intentional and not 4004 (`:71-79`); `processFrame` catch (`:165-171`) | `closeSocket('re-synchronize')`, then `attemptNow()` (the same pattern as `checkpoint_required`, `:215-222`) | `connect()` from the store: `startOver()`, then connect | `reportError(lastFailureDetail)` + `settleReadiness(error)` (as today); keep retrying |

Common rules:
- Every success point calls `connected()`, whoever started the connect (scheduler or owner), so an owner-opened stream also gets the resume re-sync (P-005).
- An attempt that opens and then fails before the owner's success point is a failed attempt. It counts toward the fifth-failure report and the backoff (P-003).
- The schedule has no 0 s step. Every wait is ≥ 1 s, so a node that accepts and then closes at once cannot cause a tight loop (P-002). Org and collaboration's first retry moves from 0 s to 1 s; no requirement depends on 0 s.
- Close codes 4004/4005 (`WebSocketClient`) and 4004 (collaboration) end retrying, as today: the owner calls `startOver()` instead of `connectionLost()`.
- While waiting or holding, `WebSocketClient.state` is `DISCONNECTED`. `isAgentStreamReady`/`isTeamStreamReady` are therefore false, and a store connect request starts a connection at once and cancels the wait (Team, Org, collaboration). For agent streams the Agent Connect Rule decides instead (`waiting` → catch-up attempt; `held` → nothing). `WebSocketClient.connect()` keeps ignoring calls while `CONNECTING`/`CONNECTED`, so no second socket opens.

## Agent Connect Rule (AR-001(c), N-4, N-7)

`agentRunStore.connectToAgentStream(runId)` is the only connect entry for agent streams. For an existing service it calls `reconnection.requestConnect()`:

| Reconnection state | Who typically asks | Result |
| --- | --- | --- |
| `waiting` (lost, timer pending) | history read (`reconcileDiscoveredActiveRuns`, after every read: the desktop's 5 s poll, the phone's list screen and resume), or the open path | `attemptNow()`: catch-up, then open. If the open path has just hydrated, the second load is redundant but harmless: the socket is closed, so nothing races |
| `held` (lost, page hidden) | a history read on a hidden window | Nothing; the page resume attempts (N-4) |
| `attempting` | any | Nothing; the running attempt connects |
| `connected` | any | Nothing (`WebSocketClient.connect` ignores it, as today) |
| `idle` (never lost, or closed on purpose) | the open path after its hydration; the first connect of a new service | `startOver()` + `service.connect()`, no catch-up (as today) |

The agent `attempt` ends every path with one scheduler call:
- the open → `connected()`;
- a load failure, a commit conflict or a socket loss → `connectionLost()`;
- superseded → `startOver()`. Superseded means the context was removed or replaced, or the socket is no longer `DISCONNECTED` because an owner connect started it; in that case the owner's open calls `connected()` itself.

`disconnectAgentStream` disposes the reconnection.

## Spine Actors / Main-Line Nodes

- Stream owners: `TeamStreamingService`, `AgentRunStreamReconnection` (with `AgentStreamingService`), `AgentOrgStreamingService`, `AgentRunCollaborationStreamingService`.
- `LiveStreamReconnectScheduler`.
- `loadRunStoredState`.
- `RuntimeMemoryEventAccumulator`, `ExternalRuntimeMemoryWriter`.

## Ownership Map

- **`LiveStreamReconnectScheduler`** (new) owns:
  - the failure count, the wait schedule and the timer;
  - holding while hidden;
  - the resume reaction (attempt now, or re-sync);
  - the once-per-streak persistent-failure notice.
  
  It owns no socket. States: `idle` (no stream wanted, or the owner is connecting on its own), `attempting`, `connected`, `waiting`, `held`.
- **`pageResumeSignal`** (new) owns:
  - the page's visible/hidden state and the time it was hidden;
  - the `online` event;
  - one set of DOM listeners for the app.
- **`WebSocketClient`**: a plain socket (open, send, close, events) that tells intentional from unintended closes. No retry.
- **`TeamStreamingService`**: its sync phase, snapshot catch-up, pending commands and its scheduler.
- **`AgentStreamingService`**: the agent socket and message dispatch. It also exposes open and unintended-loss notifications to its owner. It has no retry and no catch-up.
- **`AgentRunStreamReconnection`** (new, one per agent run with a stream) owns:
  - the scheduler of the agent run's stream;
  - the catch-up-then-open sequence;
  - the re-sync.
  
  It is created and disposed together with the run's `AgentStreamingService` (a factory in its file builds both). A store's `disconnectAgentStream` disposes both.
- **`loadRunStoredState`** (new, extracted) owns reading a run's stored state (projection + file changes) and building its conversation and activities from given conversation defaults. `loadRunContextHydrationCandidate` uses it, so there is one projection reader.
- **`AgentOrgStreamingService`, `AgentRunCollaborationStreamingService`**: their sockets, recovery mechanics, readiness and the last failure detail. Their scheduler replaces the local counters and timers.
  - Established (N-1): a later accepted snapshot clears the reported error (`agentOrgContextsStore.ts:81`, `agentRunCollaborationStore.ts:78`).
  - Stated (N-3): a `whenReady()` caller registered after the one-time persistent-failure report waits until success or release, as after today's give-up. No second notification path is added.
- **Server:**
  - `RuntimeMemoryEventAccumulator.recordForwardedUserMessage` owns what a stored user message contains, now including identity.
  - `ExternalRuntimeMemoryWriter` maps the input to `RawTraceItem` and now forwards the identity.

## Thin Entry Facades / Public Wrappers (If Applicable)

N/A — no facade added.

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By | Notes |
| --- | --- | --- | --- |
| `WebSocketClient`: `DEFAULT_OPTIONS`, `WebSocketClientOptions` (`autoReconnect`, `maxReconnectAttempts`, `reconnectDelay`, `maxReconnectDelay`), `reconnectAttempts`, `reconnectTimeout`, `shouldReconnect`, `scheduleReconnect`, `clearReconnectTimeout`, the `Max reconnection attempts reached` error | Retry moves to the owners' schedulers; no give-up | `LiveStreamReconnectScheduler` in each owner | `autoReconnect` — Dead: only its default sets it (`WebSocketClient.ts:16`, read at `:112`, declared `types.ts:25`); no caller passes options (grep over `autobyteus-web`, 2026-11-08) |
| `ConnectionState.RECONNECTING` (`types.ts:10`) | No transport-level wait | `DISCONNECTED` while waiting | Read only in `WebSocketClient.ts:62, 76, 146` (grep, 2026-11-08) |
| Org: `MAX_TRANSPARENT_RECOVERY_ATTEMPTS`, `recoveryDelay`, `transparentRecoveryAttempts`, `transparentRecoveryTimer`, `transparentRecoveryScheduled`, `scheduleTransparentRecovery`, `resetTransparentRecovery`, `clearTransparentRecovery` | Scheduler | scheduler (`connectionLost`, `startOver`, `attemptNow`, `isRecovering`) | Keep `transparentRecoveryInFlight` (mechanics) and `attemptTransparentRecovery` (the `attempt`) |
| Collaboration: `MAX_RECOVERY_ATTEMPTS`, `recoveryDelay`, `recoveryAttempts`, `recoveryTimer`, `scheduleRecovery` | Scheduler | scheduler | — |
| Duplicate projection/file-change reading inside `loadRunContextHydrationCandidate` | Extracted | `loadRunStoredState` | One reader |
| Tests asserting a give-up after N attempts, or `RECONNECTING` | Behavior removed | Tests of the scheduler and per-owner adoption | Rule 11 |

## Return Or Event Spine(s) (If Applicable)

Page resume → scheduler (DS-002 second chain).

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: `LiveStreamReconnectScheduler`.
- Transitions:
  - `connectionLost` → visible ? `waiting` (timer = schedule[min(n, 5)]) : `held`; `n += 1`; when `n` reaches 5 for the first time in this streak → `onPersistentFailure`.
  - Timer fires → `attempting` → owner `attempt`.
  - `connected` → `connected`, `n = 0`, streak flag cleared.
  - `startOver` → `idle`, `n = 0`, timer cleared.
  - `attemptNow` → timer cleared → `attempting` → owner `attempt`.
  - resume(hiddenForMs): `waiting|held` → `attemptNow`; `connected` and `hiddenForMs ≥ 30 000` → owner `resynchronize`; otherwise nothing.
  - A resume or timer while `attempting` does nothing.
- Why it matters: this is the whole fix for BEH-003/004. It must be one state machine, testable with fake timers and a fake page signal.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| `pageResumeSignal` | DS-002 | Scheduler | Visibility, hidden duration, `online` | Single DOM listener owner | Each stream adding its own listeners |
| `loadRunStoredState` | DS-003 | `AgentRunStreamReconnection`, `loadRunContextHydrationCandidate` | Read projection + file changes; build conversation/activities | One projection reader | A second, drifting reader |
| Pending-input overlay (`overlayPendingUserMessages`, existing) | DS-003 | `AgentRunStreamReconnection` | Keep shown queued/held inputs across the commit | Same as `memberLoader.ts:135` | Lost pending bubbles |

## Ownership Boundaries

- Stores remain the public entry for opening and keeping streams; UI never talks to a scheduler.
- Each scheduler is internal to its stream owner: one instance per stream, created and disposed with it.
- `pageResumeSignal` is an app-level module read only by schedulers.
- `AgentRunStreamReconnection` is reached only through `agentRunStore` (creation and disposal via its factory), never by components.
- Server: the accumulator is the only author of user records for external runtimes; the writer only maps.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| Stream owner (Team, Org, collaboration services; `AgentRunStreamReconnection`) | its `LiveStreamReconnectScheduler` | stores | A store or component calling a scheduler | Add an owner method |
| `agentRunStore` | `AgentRunStreamReconnection`, `AgentStreamingService` | open path, recovery, components (via store) | Callers creating a reconnection or service directly | — |
| `RuntimeMemoryEventAccumulator` | `ExternalRuntimeMemoryWriter` | runtime event observers | Others writing user records | — |

## Dependency Rules

- `services/liveStreamLifecycle/*` depends on nothing in the app (DOM and timers only); it never imports a stream owner or store.
- Stream owners depend on `liveStreamLifecycle`.
- `AgentStreamingService` does not import hydration or stores for reconnection. `AgentRunStreamReconnection` depends on `AgentStreamingService`, `loadRunStoredState`, `agentContextsStore`, `agentActivityStore`, run file changes hydration and `userMessageProjection.overlayPendingUserMessages`.
- No dependency from the web client on server code; no contract package change.

## Interface Boundary Mapping

| Interface / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `new LiveStreamReconnectScheduler({ attempt, resynchronize, onPersistentFailure? })` | one run stream's reconnect timing | schedule, hold, resume | none (per instance) | `attempt` and `resynchronize` are the owner's own methods; the scheduler only says when |
| `connectionLost()`, `connected()`, `startOver()`, `attemptNow()`, `isRecovering(): boolean`, `dispose()` | same | lost/failed attempt; success point; owner-initiated start (cancels wait, resets count); immediate attempt; loss-streak query: waiting, held or attempting (Org `requestRecovery`, agent `requestConnect`); teardown | — | `dispose` unsubscribes from page resume |
| `subscribePageResume(listener: (event: { hiddenForMs: number; cause: 'visible' \| 'online' }) => void): () => void`, `isPageVisible(): boolean` | page | visibility state | — | No-op without `document` |
| `createAgentRunStream(runId, context, serviceOptions): { service, reconnection }` | one agent run's stream | build the service and its reconnection together | `runId` | Replaces the construction lines in `agentRunStore.connectToAgentStream` |
| `AgentRunStreamReconnection.requestConnect()`, `.dispose()` | one agent run's stream | the store's connect request (Agent Connect Rule); teardown | — | Called only by `agentRunStore.connectToAgentStream` / `disconnectAgentStream` |
| `AgentStreamingService.dropConnection(reason)` | agent socket | quiet close with the loss bookkeeping (reject pending admissions and interrupts), no loss notification | — | Used by the re-sync only (N-6) |
| `AgentStreamingService` open/loss notifications (subscription, e.g. `onConnectionChange(listener)`) | agent socket | tell its owner opened / lost unintentionally | — | Notifications only |
| `loadRunStoredState(runId, conversationDefaults): Promise<{ conversation, activities, expectedActivityRevision, fileChanges, hasEarlierActiveTraceEvents, lastActivityAt }>` | one run's stored state | read + build | `runId`; defaults `{ agentDefinitionId, agentName, llmModelIdentifier }` | Defaults come from the live context's `config` (`agentDefinitionId`, `agentDefinitionName`, `llmModelIdentifier`) |
| `RuntimeMemoryUserTraceInput.messageId?`, `.dedupeKey?` | stored user message | identity | normalized strings | via `normalizeAcceptedInputIdentity` |

## Interface Boundary Check

| Interface | Singular? | Identity Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Scheduler | Yes | N/A | Low | — |
| `subscribePageResume` | Yes | N/A | Low | — |
| `loadRunStoredState` | Yes | Yes (agent run id; Team members use the Team snapshot and `memberLoader`) | Low | — |
| `createAgentRunStream` | Yes | Yes | Low | — |

## Main Domain Subject Naming Check

| Node / Subject | Name | Natural? | Same Meaning Everywhere? | Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- | --- |
| Scheduler | `LiveStreamReconnectScheduler` | Yes | Yes | Low | — |
| Page signal | `pageResumeSignal` | Yes | Yes | Low | — |
| Agent reconnection | `AgentRunStreamReconnection` | Yes | Yes | Low | — |
| Stored-state loader | `loadRunStoredState` | Yes | Yes ("stored" = node projection, as in "stored conversation") | Low | — |
| Scheduler methods | `startOver`, `attemptNow`, `connectionLost`, `connected` | Yes; `startOver` says both "cancel" and "reset count", which it does | Yes | Low | — |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area | Decision | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Reconnect timing | Three local copies | Create New (one owner) | Consolidate | No shared owner exists |
| Visibility | `MobilePairedShell.vue` local ref | Create New module | App-wide | Component state is not reachable from services |
| Agent catch-up reading | `loadRunContextHydrationCandidate` | Extend (extract `loadRunStoredState`) | One reader, without config/workspace resolution | — |
| Agent catch-up commit | `memberLoader.ts:122-141` commit steps, `overlayPendingUserMessages` | Reuse the same steps | Proven commit sequence | — |
| Identity writing | `RawTraceItem` | Reuse | Already supports it | — |

## Subsystem / Capability-Area Allocation

| Subsystem | Owns | Spines | Owners Served | Decision |
| --- | --- | --- | --- | --- |
| `autobyteus-web/services/liveStreamLifecycle/` | Reconnect timing, page resume | DS-002 | All four stream owners | Create New |
| `autobyteus-web/services/agentStreaming/` | Agent/Team services, transport, agent-run reconnection | DS-002, DS-003 | — | Extend |
| `autobyteus-web/services/runHydration/` | Stored-state loading | DS-003 | — | Extend |
| `autobyteus-web/services/agentOrgExecution/`, `services/agentCollaboration/` | Their streams | DS-002 | — | Extend |
| `autobyteus-server-ts/src/agent-memory/` | Recording | DS-004 | — | Extend |

## Draft File Responsibility Mapping

See Final File Responsibility Mapping (no extraction changed the draft).

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Removed? | Overlapping Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Backoff + attempt + timer + give-up (3 copies) | `liveStreamReconnectScheduler.ts` | `liveStreamLifecycle` | One policy | Yes | Yes (one schedule) | A connection manager that owns sockets, success points or protocol |
| Projection + file-change read (open path, reconnection) | `runHydration/runStoredStateLoader.ts` | `runHydration` | One reader | Yes | Yes | A config builder |

## Shared Structure / Data Model Tightness Check

| Shared Structure | One Meaning Per Field? | Redundant Removed? | Overlap Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Scheduler options (`attempt`, `resynchronize`, `onPersistentFailure`) | Yes | Yes | Low | — |
| `loadRunStoredState` result | Yes | Yes (no config, no resume config) | Low | — |
| `RuntimeMemoryUserTraceInput` + identity | Yes | Yes | Low | Optional only on the user variant |

## Final File Responsibility Mapping

| File | Owning Subsystem | Owner / Boundary | Concrete Concern | Why One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/services/liveStreamLifecycle/liveStreamReconnectScheduler.ts` (Add) | liveStreamLifecycle | Scheduler | DS-002 state machine; constants `RECONNECT_DELAYS_MS = [1_000, 2_000, 4_000, 8_000, 16_000, 30_000]` (last repeats), `RESYNC_AFTER_HIDDEN_MS = 30_000`, `PERSISTENT_FAILURE_ATTEMPTS = 5` | One state machine | `pageResumeSignal` |
| `autobyteus-web/services/liveStreamLifecycle/pageResumeSignal.ts` (Add) | liveStreamLifecycle | Page signal | `visibilitychange`, `online`, hidden duration, subscribers | One DOM concern | — |
| `autobyteus-web/services/agentStreaming/transport/WebSocketClient.ts` (Modify) | agentStreaming | Transport | Plain socket; intentional vs unintended close | — | — |
| `autobyteus-web/services/agentStreaming/transport/types.ts` (Modify) | agentStreaming | Transport types | Remove `RECONNECTING` and the options | — | — |
| `autobyteus-web/services/agentStreaming/TeamStreamingService.ts` (Modify) | agentStreaming | Team stream | Holds a scheduler; per-owner table row; `restartTransport()`. **Must stay ≤ 500 lines** (486 today): if adoption would pass 500, extract the pending Team-send admission (`PendingTeamSend`, `teamSendFailureCodes`, `sendKey`, `sendMessage` bookkeeping, `resolveTeamSend`, `rejectTeamSend`, `drainPendingTeamSends`) into `teamSendAdmission.ts` in the same folder | — | Scheduler |
| `autobyteus-web/services/agentStreaming/AgentStreamingService.ts` (Modify) | agentStreaming | Agent stream | Open/loss notifications; no retry | — | — |
| `autobyteus-web/services/agentStreaming/agentRunStreamReconnection.ts` (Add) | agentStreaming | `AgentRunStreamReconnection` + `createAgentRunStream` | DS-003 catch-up-then-open; scheduler; re-sync | One owner, one sequence | Scheduler, `loadRunStoredState`, `overlayPendingUserMessages` |
| `autobyteus-web/stores/agentRunStore.ts` (Modify) | stores | Agent run store | Use `createAgentRunStream`; keep the reconnection beside the service in its map; `requestConnect()` on every connect request of an existing service (Agent Connect Rule); `dispose()` in `disconnectAgentStream`. **Its line count must not grow** (515 today, N-2): the service construction block moves into the factory | — | — |
| `autobyteus-web/services/runHydration/runStoredStateLoader.ts` (Add) | runHydration | `loadRunStoredState` | Projection + file changes read; conversation/activities build | One reader | — |
| `autobyteus-web/services/runHydration/runContextHydrationService.ts` (Modify) | runHydration | Full hydration | Uses `loadRunStoredState` | — | `loadRunStoredState` |
| `autobyteus-web/services/agentOrgExecution/agentOrgStreamingService.ts` (Modify) | agentOrgExecution | Org stream | Per-owner row; net shorter (524 today: the change must not grow it; it removes more scheduling code than it adds) | — | Scheduler |
| `autobyteus-web/services/agentCollaboration/agentRunCollaborationStreamingService.ts` (Modify) | agentCollaboration | Collaboration stream | Per-owner row | — | Scheduler |
| `autobyteus-server-ts/src/agent-memory/services/runtime-memory-event-accumulator.ts` (Modify) | agent-memory | Recorder | Pass `messageId`/`dedupeKey` from `payload.message.metadata` (normalized) | — | `normalizeAcceptedInputIdentity` |
| `autobyteus-server-ts/src/agent-memory/domain/memory-recording-models.ts` (Modify) | agent-memory | Types | `messageId?`, `dedupeKey?` on the user trace input | — | — |
| `autobyteus-server-ts/src/agent-memory/store/external-runtime-memory-writer.ts` (Modify) | agent-memory | Writer | Forward them to `RawTraceItem` in the user branch | — | — |

## Applied Patterns (If Any)

State Machine (scheduler); Observer (page resume subscribers; agent socket notifications); Factory (`createAgentRunStream`).

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/services/liveStreamLifecycle/` | Folder | Stream lifecycle | When run streams try again | Used by four stream subsystems | Sockets, protocol parsing, stores, success points |
| Other files | Files | see Final mapping | — | Existing owners | — |

## Folder Boundary Check

| Path / Folder | Structural Depth | Ownership Clear? | Risk | Justification |
| --- | --- | --- | --- | --- |
| `services/liveStreamLifecycle/` | Off-Spine Concern | Yes | Low | Two files, one concern |
| `services/agentStreaming/agentRunStreamReconnection.ts` | Main-Line Domain-Control | Yes | Low | Beside the agent stream it drives |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why |
| --- | --- | --- | --- |
| Org adoption | `this.reconnect = new LiveStreamReconnectScheduler({ attempt: () => void this.attemptTransparentRecovery(), resynchronize: () => this.retireAndRecover(), onPersistentFailure: () => this.options.reportError(this.lastFailureDetail) })`; snapshot accepted → `this.reconnect.connected()`; `failClosed`/unintended `onclose` → `this.lastFailureDetail = detail; this.reconnect.connectionLost()` | `connected()` on socket open (P-003: never reaches the fifth-failure report) | Success point stays where today's reset is |
| Agent catch-up | `attempt: async () => { const ctx = contexts.getRun(runId); if (!ctx) return; try { const stored = await loadRunStoredState(runId, defaultsOf(ctx.config)); if (contexts.getRun(runId) !== ctx \|\| service.connectionState !== DISCONNECTED) return; commit(ctx, stored); service.connect(runId, ctx) } catch { reconnect.connectionLost() } }` | Connect first, then fetch and guard against live revisions (P-001: conflicts on every delta) | Nothing can race while the socket is closed |
| Hidden page | Close while hidden → no timer; visible → attempt at once | A timer firing every 30 s in the background | Battery (QR-003) |
| Owner connect during a wait | Store `connectToTeamStream` → `service.connect()` → `startOver()` + `connectTransport()` | `connect()` ignored because the client says `RECONNECTING` while a timer waits | The user's re-open connects at once |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision | Clean-Cut Replacement |
| --- | --- | --- | --- |
| Keep `maxReconnectAttempts`/`RECONNECTING` in `WebSocketClient` | Fewer test changes | Rejected | Remove; schedulers in owners |
| Client heuristic: match identity-less stored user messages by content | Would fix old records | Rejected (guessing identity; old turns end at update) | Write identity at the source |
| Rewrite old raw-trace records | Completeness | Rejected (no source for the ids) | None needed |

## Derived Layering (If Useful)

N/A.

## Change / Refactor Sequence

1. Server: identity on user records (accumulator, model, writer), with server tests: the recorder writes the ids, the projection returns them, and an old record without ids still loads.
2. Web: `pageResumeSignal` and `LiveStreamReconnectScheduler`, with unit tests (fake timers, fake visibility/online, every transition in the bounded local spine).
3. `WebSocketClient` reduced to a socket; remove `RECONNECTING` and the options; update its tests.
4. `TeamStreamingService` adopts the scheduler (per-owner row; extraction if > 500 lines). Tests: reconnect after loss; success only at snapshot; `reopen_required` stops; candidate streams unaffected; re-sync after ≥ 30 s hidden; store connect during a wait.
5. `loadRunStoredState` extracted (open path unchanged in behavior); `AgentStreamingService` notifications; `AgentRunStreamReconnection` + `createAgentRunStream`; `agentRunStore` wiring without growth.
   Tests:
   - catch-up then open;
   - a failed load counts as a failure;
   - an owner connect does no catch-up;
   - re-sync after hidden;
   - AR-001(a): a run whose node keeps producing text deltas during the outage and right up to the reconnect. After the attempt, the conversation equals the stored state plus the deltas received after open; there is no guard loop, and the attempt does not stall.
   - P-004: a history read (`reconcileDiscoveredActiveRuns`) during a wait still shows the gap's events (it triggers the catch-up attempt, not a plain connect); a history read while held attempts nothing.
   - P-005: a stream opened by the open path, page hidden ≥ 30 s, then visible: it re-syncs (drop, catch-up, open).
   - N-6: the re-sync rejects a pending message admission and a pending interrupt.
   - N-7: each early exit of `attempt` (context removed, owner connect raced) leaves the scheduler `idle` or `connected`, never `attempting`.
6. Org and collaboration adopt the scheduler (per-owner rows). Tests:
   - a failure after open but before the snapshot counts, and reaches the fifth-failure report once;
   - retrying continues after the report;
   - `requestRecovery` and `connect` during a wait;
   - Org re-sync on a live socket re-publishes from a fresh recovery;
   - the error clears on a later snapshot.
7. Run the reproduction (`phone-live-repro.mjs`): R3 shows a delay, R6 one copy; then the durable probe and emulator validation (API/E2E).

## Key Tradeoffs

- **Re-sync after ≥ 30 s hidden:** costs one reconnect plus catch-up per open stream per wake, instead of a heartbeat protocol. It needs no contract change and covers the background case the Task names.
- **Unlimited retries while visible:** at most one attempt per 30 s per stream after the first minute.
- **Agent catch-up before open, not after:** no race with live events and no guard loop. The cost is a read-to-open window (Risks) that the open path already has.
- **First retry at 1 s instead of 0 s for Org and collaboration:** one uniform schedule, no tight loop.

## Risks

- Agent read-to-open window: events the node produces between the catch-up read and the socket open (one round trip) are not shown until the next catch-up or open. An in-progress segment's later deltas still land, as on the open path today (ARCH-REV-001 residual). This is accepted as equal to today's open path. If validation shows a visible loss on the phone, it is a Design Impact for a buffered approach.
- WebView visibility semantics on Android (ASM-001): validated on the emulator.
- Desktop windows with many kept runs re-sync each kept stream after ≥ 30 s hidden (DEC-003; reviewer residual): watch the cost in validation.

## Guidance For Implementation

- Reproduction to start from: `node /Users/normy/autobyteus_org/autobyteus-worktrees/phone-live-updates-434/tickets/in-progress/phone-live-updates-434/evidence/repro/phone-live-repro.mjs --output-dir=<fresh> --scenarios=R1,R2,R3,R4,R6`, after `pnpm -C autobyteus-server-ts build` and `pnpm -C autobyteus-web build:mobile-web`.
  - Today: R3 `phoneShowsByItselfWithin60s: null`, R4 `null`, R6 `freshDuringTurn.copies: 2`.
  - After the fix: R3 shown ≤ 35 s, R6 one copy. R4 (screen-on silent dead path, page stays visible) stays `null` by design (FU-001).
  - AC-003 covers the dead path with the page hidden, then visible. Add a scenario that switches the page to hidden and back (CDP `Page.setWebLifecycleState`, or overriding `document.visibilityState` and dispatching `visibilitychange`) while the proxy black-holes the old connection.
- Keep `pageResumeSignal` free of Vue/Pinia; guard `typeof document === 'undefined'`.
- Server: use `normalizeAcceptedInputIdentity({ messageId: metadata.message_id, dedupeKey: metadata.dedupe_key })`, the same normalizer the reader uses. Premise checked: `AgentRunUserMessageForwardedPayload.message` is an `AgentInputUserMessage` (`agent-run-command-observer.ts:6-14`), the same type whose `metadata.message_id`/`dedupe_key` the input state publishes (`agent-run-input-admission-state.ts:360-363`).
- Agent commit steps (same as `memberLoader.ts:122-141`):
  1. Replace activities with `replaceProjectionActivitiesIfRevisions` (a conflict counts as a failed attempt).
  2. Build the conversation and run `overlayPendingUserMessages(stored, shown)`.
  3. `resetRecentEventMonitorBaseline`.
  4. Set the conversation, `hasEarlierActiveTraceEvents` and `updatedAt` from `lastActivityAt`.
  5. `markEventMonitorPresentationChanged`, then `primeRecentEventMonitorBaseline`.
  6. `hydrateRunFileChanges`.
  
  Leave config and status alone: `AGENT_STATUS` follows the open.
- Durable tests:
  - web unit tests per step;
  - a `mobile-shell-probe` case for AC-001/AC-003/AC-005 on the phone bundle (TESTING.md);
  - a server test for AC-005's stored identity;
  - AC-006 existing suites, including the route-policy tests (`/ws/terminal` refused for a phone credential, run streams allowed).
