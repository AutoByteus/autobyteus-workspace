# Design Spec

## Solution And Approval Basis

- Current solution revision ID: `SR-003` (Design Impact from ARCH-REV-001 AR-001; requirements unchanged at SR-002)
- Approved requirements baseline: `requirements-doc.md` at SR-002 (unchanged by SR-003); approved by the Solution Designer within the direction of Task autobyteus-533 (user informed in the Solution Designer's conversation, 2026-11-18).
- Behavior-defining supplements: None (reproduction evidence only).
- User approval of the design: `Not required` (the Task does not ask for it).
- Design status: `Ready`
- Canonical investigation-notes path: `/Users/normy/autobyteus_org/autobyteus-worktrees/interrupt-idempotent-stop/tickets/in-progress/interrupt-idempotent-stop/investigation-notes.md`
- Authorities read (2026-11-18): `references/architecture-design.md`, `references/design-principles.md`, `/Users/normy/autobyteus_org/autobyteus-worktrees/interrupt-idempotent-stop/DESIGN.md` (rules 1, 5, 9, 11), `docs/design-cases.md` (Cases 2, 3, 4, 6), `references/design-examples.md` (contents); `GLOSSARY.md` (no entry for interrupt/Stop).
- Conflicts / discrepancies: DESIGN.md rule 9 (no compatibility between software versions) contradicted a mixed-version clause of SR-001; removed in SR-002. No other conflict.

## Current-State Read

The user's Stop generation runs through one composer on desktop and phone (`AgentUserInputTextArea.vue:314-330` → `useComposerTarget.ts:78` → `activeContextStore.interruptGeneration`, `activeContextStore.ts:251-272`), which checks the primary action and calls the target's `interaction.interrupt()` (`AgentInteractionPort`, `types/workspace/activeAgentWorkspaceTarget.ts:8-17`, returns `Promise<void>`). Six interaction implementations exist: standalone (`activeContextStore.ts:70` → `agentRunStore.interruptGeneration`, returns a boolean "admitted"), Team member (`activeContextStore.ts:109` → `agentTeamRunStore.interruptFocusedMemberGeneration`, boolean), Org member (`agentOrgContextsStore.ts:376` → `AgentOrgStreamingService.interrupt`, a promise that rejects on a non-accepted ack, 15 s timeout, rejects on disconnect `:492-496`), delegated agent / delegated Team member / peer run (`delegatedRunsStore.ts:118-155`).

Results are presented in four different ways: `agentRunStore.ts:59-76` and `teamRunCommandPresentation.ts:14-31` toast every non-accepted ack and every transport failure with the raw run id and raw server text (callbacks `onInterruptCommandResult` / `onInterruptCommandTransportFailure` of `AgentStreamingService.ts:53,76,92,337-360` and `TeamStreamingService.ts:55-56,67-68,91-92,294-303,467-470`); the Org path drops the rejection (`AgentUserInputTextArea.vue:316` `void`); the peer path has no callback (`peerRunStreams.ts:30`). The primary action has no pending-Stop state (`agentPrimaryAction.ts:22-41`).

On the node, every stream passes the domain result through: standalone `agent-stream-handler.ts:389-440` (+ not-active `RUN_NOT_FOUND` at `:404-417`), Team `team-interrupt-generation-command-handler.ts:19-71` (+ `RUN_NOT_FOUND` at `:42-44`), Org `agent-org-stream-handler.ts:131-137,139-143,153-157` (+ stopped Org `AGENT_ORG_STOPPED`), collaboration root peer rows `agent-collaboration-stream-handler.ts:185-188`, peer run relay `peer-run-stream-session.ts:112-117`. The domain owner of "is there a turn" is `AgentRunInterruptState.reserve` (`agent-run-interrupt-state.ts:50-80`), whose `NO_ACTIVE_TURN` result is also read by the root shutdown fence (`agent-run-root-shutdown-fence.ts:85-99`: a non-accepted result makes it wait for quiescence) and termination (`agent-run-termination.ts:106,136,153`). Backends: ACP (`acp-agent-run-backend.ts:169-176`) and AGY (`agy-agent-run-backend.ts:131`) answer `NO_ACTIVE_TURN` when their turn is gone; Claude (`claude-session.ts:281-285` rejects) and Codex (`codex-thread.ts:268-272` throws) report it as `RUNTIME_COMMAND_FAILED`; native maps `no_active_turn` / `already_settled` (`autobyteus-ts/src/agent/runtime/agent-runtime.ts:184-192`) to a lowercase code (`autobyteus-agent-run-backend.ts:297-303`).

Root cause and measurements: investigation notes, "Runtime, Probe, Or Reproduction Findings".

## Task Size And Architectural Risk (Mandatory)

- Task size: `Medium`
- Size rationale: about 8 server source files (5 stream boundaries, one new rule file, 3 backends) and about 14 web source files (one new interrupt owner, the outcome type, 2 streaming services, the Org service, 5 interaction implementations, primary action, composer, AgentContext, a display-name extraction, localization), plus their tests and docs. All within existing owners; no persistence, no new subsystem.
- Architectural risk: `High`
- Risk rationale: it changes the meaning of the user interrupt command's ack on five streams (nothing to stop becomes `accepted`), changes the backend interrupt contract for three runtimes, replaces the result-callback API of both web streaming services and the `AgentInteractionPort.interrupt()` return type for every run kind, and moves presentation ownership to one new owner; it adds a client-side pending state with lifecycle (concurrency with status events). Blast radius: every run kind, desktop and phone.
- Escalation trigger: any need to change a wire schema (zod contracts), the domain `AgentRunInterruptState` turn logic (448/526 FU-002 overlap), or the status writers; or a run kind whose Stop does not pass through `activeContextStore.interruptGeneration`.

## Architecture Investigation Evidence

| Source / Command / Probe | Exact Path / Reference | Observation | Design Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| Code | Investigation notes, Source Log rows | All server and web paths per run kind, with lines (see Current-State Read) | D-S1…D-S3, D-W1…D-W6 | None |
| Code | `agent-run-root-shutdown-fence.ts:85-99`; `agent-run-termination.ts:106,136,153` | Internal callers rely on a non-accepted `NO_ACTIVE_TURN` | D-S1: map at the user-command boundary, not in the domain | None |
| Code | `claude-session.ts:151-153,275-285`; `codex-thread.ts:162,264-272` | Both expose `activeTurnId`; their interrupt checks it synchronously before any await | D-S3: the backend checks the same id first and answers `NO_ACTIVE_TURN` | None |
| Code | `paired-agent-access.ts:57-58` | A peer node answers `RUN_NOT_ACTIVE` for a run that is not running | D-S1 rule covers relayed answers | None |
| Code | `useTargetConversation.ts:12-19` | The shown name rule lives in a composable | D-W5: extract it so the failure message names the agent the same way | None |
| Code (SR-003) | `AgentStreamingService.ts:120-123,304-326` (`dropConnection`, `reopen`, `handleDisconnect` → `rejectInFlight` drains pending interrupts at the drop); `agentRunStreamReconnection.ts` (the same service reconnects); `liveStreamReconnectScheduler.ts:14,53-57` (first retry after 1 s); `peerRunStreams.ts:10,32-35` (peer reopen after 1 s, same service); server `agent-stream-handler.ts:150-155` (every open sends `CONNECTED` then `AGENT_STATUS`), `peer-run-stream-session.ts:78` (sends the peer's `AGENT_STATUS` before its snapshot) | A Stop waiting at a drop is settled ≥1 s before the rebind brings the status; the page meanwhile shows the stale status | D-W7: hold waiting Stops across a retryable loss; settle at the rebind's status | None |
| Code (SR-003) | `TeamStreamingService.ts:281-287` (`markTransportLost` drains), `:312-323` (snapshot sets `ready`), `:132-140` (`disconnect`); `agentOrgStreamingService.ts:133-140` (unintentional close rejects all pending, then recovers), `:312` (snapshot → `ready`), `:446-454` (`closeSocket`), `:491-496` (`rejectPending`) | Same gap for Team and Org | D-W7 for Team (settle when the snapshot sets `ready`) and Org (settle when the snapshot sets `ready`) | None |
| Reproduction | `tests/e2e/agent-run/interrupt-twice-repro.e2e.test.ts`; `autobyteus-web/tests/e2e/interrupt-twice-repro-scratch.mjs` | Fails on the base; browser toasts at 0–60 ms locally, ≤300 ms at 150 ms latency | AC-002, AC-010 | None |

## Intended Change

The node answers a user Stop that finds nothing to stop as accepted on every stream and runtime. The web gets one owner for a Stop: it marks the run's context "Stopping", sends the Stop once, receives a typed outcome from whichever stream carries it, ends "Stopping" by the run's status, a failure, or a connection loss only once the stream has rebound and its status is applied (or the stream is closed for good), and shows one plain message only for a real failure.

## Design Decisions

- **D-S1** Node: one rule `userInterruptOutcome` (`NO_ACTIVE_TURN`, `RUN_NOT_ACTIVE` → accepted) applied at the five user interrupt boundaries; the domain `AgentRun.interrupt()` result is unchanged.
- **D-S2** Node: each handler answers a not-running run / Team / Org with `NOTHING_TO_INTERRUPT` for an interrupt (tool approval keeps its refusal).
- **D-S3** Backends: Claude, Codex and native answer `NO_ACTIVE_TURN` when `turnId` is not the runtime's active turn.
- **D-W1** `InterruptOutcome` (`accepted` | `not_sent` | `connection_lost` | `refused`) is what every route returns; `AgentInteractionPort.interrupt(): Promise<InterruptOutcome>`.
- **D-W2** `AgentContext.interruptPending` and the primary action kind `stopping`.
- **D-W3** `runInterrupt` owns the Stop sequence, the status watch (from the press) and the messages; per-route presenters and result callbacks are removed.
- **D-W4** `orgInterruptOutcome` translates the Org command promise.
- **D-W5** `targetDisplayName` extracted so the message names the agent as the view does.
- **D-W6** Localized texts (`agents.interrupt.*`), no run ids or internal words.
- **D-W7** (SR-003) A Stop waiting at a retryable connection loss is held (`InterruptsAwaitingRebind`) and settled `connection_lost` only after the rebind's status is applied (agent, peer: first `AGENT_STATUS` of the new connection; Team, Org: the snapshot that sets `ready`), or at once when the stream is closed for good.

## Change Scope (Mandatory)

- In scope: UC-001…UC-006. Server: the user interrupt command boundary on `/ws/agent`, `/ws/agent-team`, `/ws/agent-org`, `/ws/agent-collaboration`, `/ws/peer-run`; the interrupt answer of the Claude, Codex and native backends. Web: the composer's primary action and Stop control, the Stop sequence and its presentation, the interrupt result plumbing of `AgentStreamingService`, `TeamStreamingService`, `AgentOrgStreamingService`, and the six interaction implementations; localization; tests and the two existing stale tests; docs that state the old rule.
- Derived consumers (the ack meaning and `AgentInteractionPort.interrupt()` change):
  - Web presentation of acks (`agentRunStore.ts:59-76`, `teamRunCommandPresentation.ts:14-31`): replaced by the new owner (D-W3).
  - `interrupt-result-presentation-probe.mjs` (asserts the `NO_ACTIVE_TURN` toast) and its fixture page: rewritten to the new presentation.
  - Server `tests/integration/agent/agent-websocket.integration.test.ts:621,665` (assert the failed ack): rewritten to `accepted`.
  - Root shutdown fence and termination (read the domain result): unchanged, the domain result is unchanged (D-S1).
  - Docs `autobyteus-web/docs/agent_execution_architecture.md:99,372-383` and `autobyteus-server-ts/docs/design/agent_websocket_streaming_protocol.md:331-341`: updated to the new rule.
  - `ChatComposer.vue:103-113` (also resolves the primary action): passes `interruptPending` (it has no interrupt target, so it never shows Stopping; the field keeps one rule).
- Deliberately left alone: terminate/Stop in run settings and per-copy Stop (`terminateRun`, 458/522); `AgentRunInterruptState` turn and join logic (448/526 FU-002 owns turn identity); the open-time `Running` placeholder (DEC-008); AGY taking its run offline on Stop; tool approval and send commands; the wire schemas (an `accepted` ack exists on every stream already).
- Follow-ups: FU-001 (composer button labels are English literals), FU-002 (open-time `Running` placeholder shows Stop for an idle run until the stream binds) in `follow-ups.md`.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Requirement / AC IDs | Trigger | Existing Behavior | Approved Change Or Preserved Outcome | Target Path / Spine |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | REQ-003, REQ-007; AC-006, AC-011 | Stop on a Running run | Turn ends; no toast; no pending state | Same, with "Stopping…" until status leaves Running | DS-001, DS-002, DS-003 |
| BEH-002 | User | REQ-002, REQ-003; AC-002, AC-006 | Second press | Joins on the node | The page sends nothing; the node still joins two Stops | DS-001 (gate), DS-005 |
| BEH-003/004 | User | REQ-001, REQ-004; AC-001, AC-003, AC-007 | Stop after the turn ended / stale status | Failure toast | Node answers accepted; no toast | DS-004 |
| BEH-005 | User | REQ-001; AC-004 | Team member | Same failure | Same as BEH-003 | DS-004 (Team row) |
| BEH-006/007 | User | REQ-006; AC-004, AC-009 | Org member, peer run | Silent for everything | Accepted quiet; real failure shown | DS-001…DS-004 |
| BEH-008 | User | REQ-005; AC-008 | Disconnect while pending | False toast; Stop enabled again on the stale status | Context stays Stopping across the reconnect; outcome `connection_lost` after the rebind's status: no toast; the current status decides | DS-002b, DS-003 |
| BEH-009/010 | User | REQ-006; AC-009 | Not connected; runtime failure | Raw toast | One plain message naming the agent | DS-002 |
| (AC-005) | System | REQ-001; AC-005 | Turn ended inside the runtime before the interrupt reached it | Claude/Codex `RUNTIME_COMMAND_FAILED`, native lowercase code | `NO_ACTIVE_TURN` from every backend → accepted | DS-004, DS-006 |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related IDs | Relationship To This Design | Status |
| --- | --- | --- | --- | --- |
| `evidence/reproduction/` | Root cause and window measurements | REQ-001…006 | Basis | Final |
| `autobyteus-server-ts/tests/e2e/agent-run/interrupt-twice-repro.e2e.test.ts` | Failing reproduction | AC-001…004 | Starting point for the durable server e2e | Hand-over |
| `autobyteus-web/tests/e2e/interrupt-twice-repro-scratch.mjs` | Browser reproduction with latency | AC-010 | Starting point for the durable browser probe; removed when replaced | Hand-over |

## Task Design Health Assessment (Mandatory)

- Change posture: `Bug Fix` with a `Behavior Change` (ack meaning, Stopping state).
- Current design issue found: `Yes`.
- Structural triggers that fire:
  - *Repeated coordination / Duplicated policy* (Principle 13): the "what does a Stop result mean to the user" policy has four copies on the web (two toasters, a dropped rejection, a missing callback) and the nothing-to-stop rule would need five copies on the node. Response: one owner each side (D-S1 `userInterruptOutcome`; D-W3 `runInterrupt`); the hold-until-rebind rule has one holder shared by the three streaming services (D-W7).
  - *Several kinds or forms* (Principle 1): six run kinds, five streams, five runtimes; each traced (Current-State Read; Spine table rows per kind).
  - *Derived data* (Principle 11): the shown agent name is derived in a composable; the message needs the same fact. Response: extract the rule (D-W5).
  - *Behavior by absence* (Principle 13): today a missing callback (peer) means "show nothing" and a dropped promise (Org) means "show nothing". Response: every route returns an explicit `InterruptOutcome`.
  - *Capability-area reuse* (Principle 4): status (the existing `currentStatus` writers) is reused by watching it, not by adding a clearing call to five writers.
  - *Empty indirection* (Principle 13): the new `runInterrupt` owns the sequence, pending state and presentation (not forwarding); no port is added (the existing `AgentInteractionPort` changes its return type).
  - *Hidden dependency* (Principle 16): none added; `runInterrupt` receives the context, the interrupt function and the name as arguments.
- Deliberate deviations: None.
- Root cause classification: `Duplicated Policy Or Coordination` (presentation per route, rule per stream) plus a `Missing Invariant` (no pending-Stop state on the context).
- Refactor needed now: `Yes` (bounded): one presentation owner replaces the per-route presenters and callback options.
- Evidence: Current-State Read citations.
- Design response: D-S1…D-S3, D-W1…D-W7 (Design Decisions).
- Refactor rationale: adding the new rule to each of four web routes and five node handlers would keep the duplication that produced the inconsistent behavior (Org and peer silent, standalone/Team raw).
- Intentional deferrals: FU-001, FU-002.

## Terminology

- **Stop** (user word, the composer button "Stop generation") = **interrupt** (code word: `INTERRUPT_GENERATION`, `interrupt()`): ends the current turn, keeps the run. Not *terminate*.
- **Nothing to stop**: the run has no active turn, its turn ended inside the runtime before the interrupt reached it, or the run (or its Team/Org) is not running. Code name of the rule: `userInterruptOutcome` (server).
- **Stopping**: the composer state between the first press and the status leaving Running (or a failure). Field `AgentContext.interruptPending`; primary action kind `stopping`.
- **Interrupt outcome** (web): `accepted` | `not_sent` | `connection_lost` | `refused` (type `InterruptOutcome`).
- No project glossary entry for these words; none added (they are UI/protocol words, not new domain concepts).

## Legacy Removal Policy (Mandatory)

- Obsolete paths: the per-route presenters and the callback options for interrupt results (Removal plan).
- Compatibility wrappers kept: `None`.

## Persisted Data / State Transition Decision

- Decision: `Not Affected` (no stored data; the change is command answers and client state).

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001, 002, 006, 007 | User presses Stop (desktop/phone composer) | `INTERRUPT_GENERATION` sent on the run kind's stream | `runInterrupt` (web) | One gate, one pending state, one dispatch for every run kind |
| DS-002 | Return-Event | BEH-001, 008, 009, 010 | Node ack, admission failure, or a connection loss (settled after the rebind's status, or at a final close) | Pending cleared and at most one plain message | `runInterrupt`; the streaming service owns when a lost command settles | One presentation rule; no stale-status window after a drop |
| DS-003 | Return-Event | BEH-001, 003 | `AGENT_STATUS` (any status writer) | "Stopping…" ends, Send shows | `runInterrupt` (status watch) | Stopping ends with the truth, not with the ack |
| DS-004 | Primary End-to-End (server) | BEH-003…007 | Stream handler receives `INTERRUPT_GENERATION` | Ack on that stream | Each stream handler, applying `userInterruptOutcome` | Nothing to stop is accepted on every stream |
| DS-005 | Bounded Local | BEH-002 | `AgentRunInterruptState.interrupt` | Reservation claimed / joined / rejected | `AgentRunInterruptState` (unchanged) | Joining preserved |
| DS-006 | Bounded Local | AC-005 | Backend `interrupt(turnId)` | `NO_ACTIVE_TURN` when the runtime's active turn is not `turnId` | Each backend | One backend contract for "turn already gone" |

## Primary Execution Spine(s)

DS-001 (web, every run kind):
`Composer Stop (AgentUserInputTextArea, desktop & phone) -> activeContextStore.interruptGeneration (primary action gate) -> runInterrupt (mark Stopping, dispatch once) -> target.interaction.interrupt() (run-kind route) -> streaming service (command id, pending entry with its outcome) -> WebSocket`

Run-kind routes (the `interaction.interrupt()` step):
- Standalone, delegated agent: `agentRunStore.interruptGeneration(runId) -> AgentStreamingService.interruptGeneration -> /ws/agent`
- Team member, delegated Team member: `agentTeamRunStore.interruptFocusedMemberGeneration(member) -> TeamStreamingService.interruptGeneration -> /ws/agent-team`
- Org member: `orgInterruptOutcome(AgentOrgStreamingService, agentRunId) -> AgentOrgStreamingService.interrupt -> /ws/agent-org`
- Peer run: `peer AgentStreamingService.interruptGeneration -> /ws/peer-run`

DS-004 (node):
`Stream handler (agent | Team | Org | collaboration | peer-run) -> [run/Team/Org not running: NOTHING_TO_INTERRUPT] -> AgentRun.interrupt / executeAgentCommand(interrupt) / peer owner command -> AgentRunInterruptState -> backend.interrupt -> userInterruptOutcome(result) -> ack`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The press reaches `activeContextStore.interruptGeneration`, which resolves the primary action; `stopping` or anything but `interrupt` ends there (a second press). Otherwise `runInterrupt` sets `context.interruptPending = true` and awaits the target's `interrupt()`, which returns the route's `InterruptOutcome`. | composer, active context, run interrupt, interaction route, streaming service | `runInterrupt` | primary action resolution; shown name |
| DS-002 | `accepted`: nothing shown; Stopping ends by DS-003. `connection_lost`: nothing shown; Stopping ends. The streaming service settles a waiting Stop as `connection_lost` only after the stream has rebound and the rebind's status (agent, peer: the first `AGENT_STATUS` of the new connection; Team, Org: the snapshot that makes the stream `ready`) has been applied, so the button then shows the current status; it settles at once only when the stream is closed for good (D-W7). Between the drop and the rebind the context stays Stopping and a press sends nothing. `not_sent`: Stopping ends; "Stop was not sent…". `refused`: Stopping ends; "Could not stop {name}…"; detail to `console.warn`. A throw from the route counts as `not_sent`. | run interrupt, streaming services, toasts | `runInterrupt` | localization |
| DS-003 | From the press, `runInterrupt` watches `context.state.currentStatus` (started at the press, so the order of the status frame and the ack does not matter); the first value that is not `Running` ends Stopping and the watch; an outcome that ends Stopping (`not_sent`, `refused`, `connection_lost`) also stops the watch. Every status writer (agent stream, Team view, Org context, history snapshot, offline cleanup) is covered because they all write that field. | context status | `runInterrupt` | — |
| DS-004 | Each handler answers a not-running run/Team/Org with `NOTHING_TO_INTERRUPT` for an interrupt (tool approval keeps its refusal); otherwise it passes the result through `userInterruptOutcome`, which turns `NO_ACTIVE_TURN` and `RUN_NOT_ACTIVE` into `{accepted:true}` and leaves everything else as it is. | stream handler, AgentRun | each handler; rule in `user-interrupt-outcome.ts` | logging |
| DS-006 | Claude and Codex backends compare the runtime's `activeTurnId` with `turnId` before calling the session/thread and answer `NO_ACTIVE_TURN` when they differ; native maps `no_active_turn` and `already_settled` to `NO_ACTIVE_TURN`. ACP and AGY already do. | backend | each backend | — |

## Spine Actors / Main-Line Nodes

Web: `AgentUserInputTextArea`, `activeContextStore.interruptGeneration`, `runInterrupt`, the six interaction routes, `AgentStreamingService` / `TeamStreamingService` / `AgentOrgStreamingService`. Node: the five stream handlers, `AgentRun`, `AgentRunInterruptState`, backends.

## Ownership Map

- `runInterrupt` (new, web): owns the Stop sequence for one context: the second-press guard (with the primary action), `interruptPending`, the outcome handling, the status watch, and the user-visible messages. Receives `{ context, interrupt, agentName }` as arguments.
- `activeContextStore.interruptGeneration`: thin entry; resolves the target and its primary action, then calls `runInterrupt`. Not a governing owner of the sequence.
- Streaming services: own command ids, the pending command map, and settle each command's `InterruptOutcome` exactly once (ack, admission failure, connection loss). On a retryable loss they move waiting Stops to an `InterruptsAwaitingRebind` holder and settle them `connection_lost` after the rebind's status is applied; on a final close (agent: `disconnect()`, a non-retryable loss; Team: `disconnect()`; Org: intentional close, release, a credential-refusal close; peer: `closeAll` → `disconnect()`) they settle held and waiting Stops at once. They no longer present anything.
- `orgInterruptOutcome` (web): translates the Org service's command promise into an `InterruptOutcome` (ready check → `not_sent`; resolved → `accepted`; `AgentOrgConnectionLostError` → `connection_lost`; other rejection → `refused`).
- `userInterruptOutcome` (node): owns the rule "nothing to stop is accepted" for the user interrupt command.
- Backends: own "is `turnId` this runtime's active turn" for their runtime.
- `AgentRunInterruptState`: unchanged owner of reservation/join.

## Thin Entry Facades / Public Wrappers

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `activeContextStore.interruptGeneration` | `runInterrupt` | Resolves the active target (existing entry of every composer) | Pending state, presentation |
| `agentRunStore.interruptGeneration`, `agentTeamRunStore.interruptFocusedMemberGeneration` | streaming services | Find the run's/Team's service | Presentation |

## Removal / Decommission Plan (Mandatory)

| Item To Remove | Why It Becomes Unnecessary | Replaced By | Notes |
| --- | --- | --- | --- |
| `showInterruptCommandResult`, `showInterruptTransportFailure` in `stores/agentRunStore.ts:59-76` | Presentation moves to one owner | `runInterrupt` | Net reduction in a file already over 500 lines (508) |
| `showInterruptCommandResult`, `showInterruptTransportFailure` in `services/agentStreaming/teamRunCommandPresentation.ts:14-31` | Same | `runInterrupt` | Keep the id builders if still used (check their callers) |
| `onInterruptCommandResult`, `onInterruptCommandTransportFailure` options/fields in `AgentStreamingService.ts` and `TeamStreamingService.ts`, and their wiring in `agentRunStore.ts:310-311`, `agentTeamRunStore.ts:110-111,158-159` | Results are returned as the command's promise | `InterruptOutcome` promise | — |
| `InterruptCommandTransportFailure` type (`protocol/agentCommandTypes.ts:76-88`) and the failure-callback shape of `interruptCommandAdmission.ts` | Replaced by outcomes | `InterruptOutcome`, settle functions in `interruptCommandAdmission.ts` | Same file keeps admission/drain; returns/settles outcomes |
| Localization keys `agents.store.interrupt.failed`, `agents.store.interrupt.transportFailed` (en, zh-CN) | Messages replaced | `agents.interrupt.notSent`, `agents.interrupt.failed` | — |
| The displayName rule inside `useTargetConversation.ts:12-19` | Extracted | `utils/workspace/targetDisplayName.ts` | The composable calls it |
| Reproductions `tests/e2e/agent-run/interrupt-twice-repro.e2e.test.ts`, `tests/e2e/interrupt-twice-repro-scratch.mjs` | Replaced by durable tests | durable server e2e and browser probe | Not delivered as scratch |

## Return Or Event Spine(s)

DS-002: `Node ack | admission failure -> streaming service settles the command's InterruptOutcome -> route returns it -> runInterrupt -> (accepted: nothing; Stopping ends by DS-003) | (not_sent / refused: clear, one toast)`

DS-002b (connection loss): `retryable loss -> streaming service moves waiting Stops to InterruptsAwaitingRebind (context stays Stopping; a press sends nothing) -> reconnect (same service, ≥1 s) -> rebind's status applied to the context (agent/peer: first AGENT_STATUS; Team/Org: ready snapshot) -> held Stops settled connection_lost -> runInterrupt clears Stopping (if DS-003 has not already) -> button shows the current status (Running: Stop enabled; Idle/Offline: Send)`; a final close settles held Stops at once.

DS-003: `AGENT_STATUS (agent stream | Team view | Org context | snapshot | cleanup) -> context.state.currentStatus -> runInterrupt status watch -> interruptPending = false -> primary action: Send/disabled`

## Bounded Local / Internal Spines

- DS-005 `AgentRunInterruptState`: `reserve -> (active: join | NONE: NO_ACTIVE_TURN | claim) -> backend.interrupt -> release on failure / clear on terminal`. Unchanged.
- Stopping state of one context (inside `runInterrupt`): `idle -> stopping (press; status watch starts) -> idle (status ≠ Running | not_sent | refused | connection_lost)`; `connection_lost` arrives only after the rebind's status or at a final close.
- Waiting Stop across a connection loss (inside each streaming service, `InterruptsAwaitingRebind`): `pending -> held (retryable loss) -> settled connection_lost (rebind's status applied | final close)`; an ack can no longer arrive for a held Stop (its socket is gone), so `held` has exactly these two exits.
- A press while `stopping` is refused by the primary action (`kind: 'stopping'`) before `runInterrupt` is reached; `runInterrupt` also returns at once when `interruptPending` is already true (the same guard where the composer is bypassed).

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Spine | Serves | Responsibility | Why It Exists | Risk If Misplaced |
| --- | --- | --- | --- | --- | --- |
| `resolveAgentPrimaryAction` (`services/runSubmission/agentPrimaryAction.ts`) | DS-001 | composer, `activeContextStore` | Adds input `interruptPending` and kind `{ kind: 'stopping'; enabled: false }` when status is Running and a Stop is pending | One rule for what the button is | Two rules for Stop vs Stopping |
| `targetDisplayName(target)` (`utils/workspace/targetDisplayName.ts`) | DS-002 | `runInterrupt`, `useTargetConversation` | The name the view shows | One derived fact | Message and header disagree |
| Localization (`localization/messages/{en,zh-CN}/agents.ts`: `agents.interrupt.stopping`, `agents.interrupt.notSent`, `agents.interrupt.failed`) | DS-002 | `runInterrupt`, composer | Plain texts | User-visible text | Raw text again |
| `useToasts` | DS-002 | `runInterrupt` | Show the message | Existing | — |

## Ownership Boundaries

`runInterrupt` is the only place that decides what the user sees about a Stop. Streaming services and routes return outcomes and never toast. On the node, handlers decide "not running → nothing to interrupt" for their own root kind; the code-level rule for relayed and domain results lives once in `userInterruptOutcome`. The domain `AgentRun.interrupt()` keeps returning `NO_ACTIVE_TURN` to its internal callers.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) | Upstream Callers | Forbidden Bypass Shape | Fix If Too Thin |
| --- | --- | --- | --- | --- |
| `activeContextStore.interruptGeneration` → `runInterrupt` | pending flag, outcome handling, messages | composers (desktop, phone) | A composer or store toasting an interrupt result itself, or setting `interruptPending` | Extend `runInterrupt` |
| Streaming service `interruptGeneration` (returns `Promise<InterruptOutcome>`) | pending command map, admission, drain | `agentRunStore`, `agentTeamRunStore`, `delegatedRunsStore` peer route | Callers reading the pending map | — |
| Stream handler (node) | `userInterruptOutcome` | WebSocket clients | — | — |

## Dependency Rules

- `runInterrupt` depends on: the context (argument), an `interrupt: () => Promise<InterruptOutcome>` (argument: the route's own call, a question-free request, not another owner's sequence step), the agent name (argument), `useToasts`, localization, Vue `watch`. It does not import stores.
- Streaming services must not import toasts or localization for interrupt results.
- `orgInterruptOutcome` depends on a narrowed `Pick<AgentOrgStreamingService, 'isReady' | 'interrupt'>`.
- Node handlers import `userInterruptOutcome` and `NOTHING_TO_INTERRUPT` from `services/agent-streaming/user-interrupt-outcome.ts`; the rule file imports only `AgentOperationResult` and the domain code constants. The domain does not import the rule.
- Collaborators are passed as arguments; process-wide bindings added or used: `None` (the existing `useToasts()` store is used as the existing presenters use it).

## Interface Boundary Mapping

| Interface | Subject Owned | Responsibility | Identity Shape | Notes |
| --- | --- | --- | --- | --- |
| `runInterrupt({ context, interrupt, agentName }): Promise<void>` (web) | one run context's Stop | sequence, pending, messages | the `AgentContext` | New owner (not forwarding) |
| `AgentInteractionPort.interrupt(): Promise<InterruptOutcome>` | the target's run | send one Stop, report its outcome | bound in the port | Return type changes from `Promise<void>` |
| `AgentStreamingService.interruptGeneration(commandId): Promise<InterruptOutcome>` | this stream's run | as today, plus the outcome | command id | Was `boolean` + callbacks |
| `TeamStreamingService.interruptGeneration(commandId, target): Promise<InterruptOutcome>` | a member of this Team | same | command id + `agent_run_id` | Was `boolean` + callbacks |
| `agentRunStore.interruptGeneration(runId): Promise<InterruptOutcome>`; `agentTeamRunStore.interruptFocusedMemberGeneration(member): Promise<InterruptOutcome>` | the run / member | find the service; no service → `not_sent` | run id; Team run id + agent run id | Was `boolean` |
| `orgInterruptOutcome(service, agentRunId): Promise<InterruptOutcome>` | an Org agent | translation of the Org command promise | agent run id | Translation, not forwarding |
| `userInterruptOutcome(result): AgentOperationResult`; `NOTHING_TO_INTERRUPT` (node) | user interrupt answer | the rule | — | Pure function |
| Backend `interrupt(turnId)` (Claude, Codex, native) | runtime turn | answers `NO_ACTIVE_TURN` when `turnId` is not the runtime's active turn | turn id | Contract stated on `AgentRunBackend.interrupt` (`agent-run-backend.ts:79`) |

## Interface Boundary Check

| Interface | Singular | Explicit Identity | Ambiguity | Action |
| --- | --- | --- | --- | --- |
| `runInterrupt` | Yes | Yes | Low | — |
| `interruptGeneration` (both services) | Yes | Yes | Low | — |
| `userInterruptOutcome` | Yes | N/A | Low | — |

## Main Domain Subject Naming Check

| Node / Subject | Name | Natural | Same Meaning Everywhere | Drift Risk | Action |
| --- | --- | --- | --- | --- | --- |
| Stop sequence owner | `runInterrupt` (file `services/runInterrupt/runInterrupt.ts`) | Yes | Yes (interrupt = Stop) | Low | — |
| Pending state | `AgentContext.interruptPending` | Yes | Yes (mirrors `submissionPending`) | Low | — |
| Primary action kind | `stopping` | Yes | Yes | Low | — |
| Outcome type | `InterruptOutcome` (`accepted` / `not_sent` / `connection_lost` / `refused`) | Yes | Yes | Low | Replaces `InterruptCommandTransportFailure` |
| Node rule | `userInterruptOutcome`, `NOTHING_TO_INTERRUPT` | Yes | Yes | Low | — |
| Domain code | `NO_ACTIVE_TURN` constant exported from `agent-execution/domain/agent-operation-result.ts` | Yes | Yes (one code for "no such active turn") | Low | Backends and domain use the constant instead of literals |

## Existing Capability / Subsystem Reuse Check

| Need | Existing Area | Decision | Why |
| --- | --- | --- | --- |
| Pending flag on the run's composer state | `AgentContext` (`submissionPending`) | Extend | Same lifetime and readers |
| Status change detection | `context.state.currentStatus` (all writers) | Reuse (watch) | Avoids a call in five writers |
| Connection loss | `handleDisconnect(retryable=true)`: `awaitingRebind.hold(pendingInterrupts)`; on the new connection's first `AGENT_STATUS`, after `dispatchMessage`: `awaitingRebind.settle(CONNECTION_LOST)`; `disconnect()`: settle at once | Draining at the drop (`rejectInFlight` today): the button falls back to the stale Running for ≥1 s and a double tap shows "Stop was not sent" although the first Stop worked (ARCH-REV-001 AR-001) | REQ-003, REQ-005 |
| Messages | `useToasts`, localization | Reuse | — |
| Command admission/drain | `interruptCommandAdmission.ts` | Extend | Settles outcomes instead of calling callbacks |
| Stop sequence | none fits (`runSubmission` owns sending input) | Create New `services/runInterrupt/` | A distinct primary action with its own lifecycle |
| Node ack building | `interrupt-generation-command-ack.ts` | Reuse (unchanged) | The rule is applied before it |

## Subsystem / Capability-Area Allocation

| Area | Owns | Spine | Decision |
| --- | --- | --- | --- |
| web `services/runInterrupt/` | Stop sequence, Org outcome translation | DS-001…003 | Create New |
| web `services/agentStreaming/` | command outcomes | DS-001, DS-002 | Extend |
| web `services/runSubmission/agentPrimaryAction.ts` | button kind | DS-001 | Extend |
| node `services/agent-streaming/` | nothing-to-interrupt rule, handlers | DS-004 | Extend |
| node backends | turn-gone answer | DS-006 | Extend |

## Draft File Responsibility Mapping

See Final File Responsibility Mapping (no extraction changed the draft other than `targetDisplayName`).

## Reusable Owned Structures Check

| Repeated Structure / Logic | Shared File | Owner | Why Shared | Redundant Attrs Removed | Overlaps Removed | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Interrupt outcome type | `services/agentStreaming/protocol/agentCommandTypes.ts` | agentStreaming protocol | Returned by three services and every route | Yes (no target/connectionState: the caller knows its target) | Yes (replaces the transport-failure type) | A carrier of raw server text for display (`refused.detail` is for the console only) |
| Holding waiting Stops across a reconnect | `InterruptsAwaitingRebind` in `services/agentStreaming/interruptCommandAdmission.ts` | agentStreaming | Used by `AgentStreamingService`, `TeamStreamingService`, `AgentOrgStreamingService` (one rule: settle once, after the rebind's status or at a final close) | Yes | Yes | A reconnect scheduler or a status owner |
| Shown-name rule | `utils/workspace/targetDisplayName.ts` | workspace utils | Header and message | Yes | Yes | — |
| Nothing-to-interrupt rule | `services/agent-streaming/user-interrupt-outcome.ts` | node streaming | Five handlers | Yes | Yes | A place for other command rules |

## Shared Structure / Data Model Tightness Check

| Structure | One Meaning Per Field | Redundant Removed | Overlap Risk | Action |
| --- | --- | --- | --- | --- |
| `InterruptOutcome = { kind: 'accepted' } \| { kind: 'not_sent' } \| { kind: 'connection_lost' } \| { kind: 'refused'; detail: string }` | Yes | Yes | Low | — |

## Final File Responsibility Mapping

| File | Owner | Concrete Concern |
| --- | --- | --- |
| `autobyteus-server-ts/src/services/agent-streaming/user-interrupt-outcome.ts` (Add) | node streaming | `NOTHING_TO_INTERRUPT`, `userInterruptOutcome(result)`: `NO_ACTIVE_TURN`, `RUN_NOT_ACTIVE` → accepted |
| `agent-stream-handler.ts` (Modify) | standalone stream | not-active branch → `NOTHING_TO_INTERRUPT`; result through the rule |
| `team-interrupt-generation-command-handler.ts` (Modify) | Team stream | not-active Team → accepted ack; result through the rule |
| `agent-org-stream-handler.ts` (Modify) | Org stream | stopped Org + interrupt → accepted; own and peer results through the rule (tool approval unchanged) |
| `agent-collaboration-stream-handler.ts` (Modify) | collaboration stream | peer interrupt result through the rule |
| `peer-run-stream-session.ts` (Modify) | peer relay | receipt through the rule |
| `agent-execution/domain/agent-operation-result.ts` (Modify) | domain | export `NO_ACTIVE_TURN` code constant; `agent-run-interrupt-state.ts:62`, ACP, AGY use it |
| `claude-agent-run-backend.ts`, `codex-agent-run-backend.ts`, `autobyteus-agent-run-backend.ts` (Modify) | backends | turn-gone → `NO_ACTIVE_TURN` |
| `agent-run-backend.ts:79` (Modify, doc comment) | backend contract | states the `NO_ACTIVE_TURN` answer |
| `autobyteus-web/services/runInterrupt/runInterrupt.ts` (Add) | Stop sequence | pending, dispatch, outcome, watch, messages |
| `autobyteus-web/services/runInterrupt/orgInterruptOutcome.ts` (Add) | Org translation | Org command promise → outcome |
| `services/agentStreaming/protocol/agentCommandTypes.ts` (Modify) | protocol types | `InterruptOutcome`; pending entry carries its settle function; remove transport-failure type |
| `services/agentStreaming/interruptCommandAdmission.ts` (Modify) | admission | settle outcomes (`not_sent`, `connection_lost`) instead of failure callbacks; `InterruptsAwaitingRebind` (hold on a retryable loss, settle once) |
| `AgentStreamingService.ts`, `TeamStreamingService.ts` (Modify) | streams | return outcome promises; remove result callbacks; hold waiting Stops on a retryable loss (`handleDisconnect`, `reopen`, `dropConnection` / `markTransportLost`) and settle them after the new connection's first `AGENT_STATUS` (agent) or the snapshot that sets `ready` (Team); settle at once in `disconnect()` and on a non-retryable loss |
| `services/agentOrgExecution/agentOrgStreamingService.ts` (Modify) | Org stream | on an unintentional close, move pending `INTERRUPT_GENERATION` commands (timeout cleared) to `InterruptsAwaitingRebind` instead of rejecting them, and reject them with `AgentOrgConnectionLostError` (defined in `services/agentOrgExecution/agentOrgConnectionLostError.ts`, Add) when the next snapshot sets `ready` (`:312`) or at an intentional close / release / credential-refusal close; other commands keep today's rejection. Stays ≤ 500 lines (498 today): the hold/settle logic lives in the shared holder |
| `stores/agentRunStore.ts`, `stores/agentTeamRunStore.ts` (Modify) | stores | return outcomes; remove presenters and callback wiring |
| `services/agentStreaming/teamRunCommandPresentation.ts` (Modify/Remove) | — | remove presenters; remove the file if only id builders remain unused, else keep them |
| `stores/activeContextStore.ts` (Modify) | entry | call `runInterrupt`; interaction `interrupt` returns the outcome |
| `stores/delegatedRunsStore.ts` (Modify) | delegated routes | agent/Team/peer interaction `interrupt` returns the outcome (peer: no stream → `not_sent`) |
| `stores/agentOrgContextsStore.ts` (Modify) | Org route | `interrupt: () => orgInterruptOutcome(liveService(), agentRunId)` (no net growth; the file is 505 lines) |
| `types/workspace/activeAgentWorkspaceTarget.ts` (Modify) | port | `interrupt(): Promise<InterruptOutcome>` |
| `types/agent/AgentContext.ts` (Modify) | context | `interruptPending: boolean` |
| `services/runSubmission/agentPrimaryAction.ts` (Modify) | primary action | input `interruptPending`; kind `stopping` |
| `components/agentInput/AgentUserInputTextArea.vue` (Modify) | composer | pass `interruptPending`; render `kind='interrupt'`, `busy` and the localized "Stopping…" title for `stopping`; `handleStop` awaits nothing it drops (no `void` of a rejecting promise) |
| `components/chat/ChatComposer.vue` (Modify) | chat composer | pass `interruptPending` |
| `utils/workspace/targetDisplayName.ts` (Add), `composables/workspace/useTargetConversation.ts` (Modify) | shown name | extracted rule |
| `localization/messages/{en,zh-CN}/agents.ts` (Modify) | texts | new keys `agents.interrupt.stopping`, `agents.interrupt.notSent`, `agents.interrupt.failed`; remove `agents.store.interrupt.*` (the `*.generated.ts` catalogs are not edited by hand) |
| Docs: `autobyteus-web/docs/agent_execution_architecture.md`, `autobyteus-server-ts/docs/design/agent_websocket_streaming_protocol.md` | docs | the new rule (delivery's docs sync if not done in implementation) |

## Applied Patterns

- A small state machine per context (idle → stopping → idle) inside `runInterrupt`.
- Outcome-returning commands (a promise per command id) instead of result callbacks.

## Target Subsystem / Folder / File Mapping

As in Final File Responsibility Mapping. `services/runInterrupt/` holds the two new web files; the node rule sits beside `interrupt-generation-command-ack.ts`.

## Folder Boundary Check

| Folder | Depth | Clear | Risk | Note |
| --- | --- | --- | --- | --- |
| `autobyteus-web/services/runInterrupt/` | Off-spine owner of a primary action | Yes | Low | Mirrors `services/runSubmission/` |

## Concrete Examples / Shape Guidance

| Topic | Good Example | Bad / Avoided Shape | Why |
| --- | --- | --- | --- |
| Web sequence | `const outcome = await interrupt(); if (outcome.kind === 'refused') toast(t('agents.interrupt.failed', { name }))` inside `runInterrupt` | `service = new AgentStreamingService(url, { onInterruptCommandResult: toastWithRunId })` per store | One rule, every run kind |
| Ending Stopping | `stop = watch(() => context.state.currentStatus, (s) => { if (s !== AgentStatus.Running) end() })` started at the press; `end()` also on `not_sent` / `refused` / `connection_lost` | Clearing `interruptPending` in `applyLiveAgentStatusEvent`, the Team view, the Org context… | One owner instead of five writers |
| Node rule | `const result = userInterruptOutcome(await activeRun.interrupt(null))` | `if (result.code === "NO_ACTIVE_TURN")` copied in each handler; or changing `AgentRunInterruptState` to answer accepted (breaks the shutdown fence's wait, `agent-run-root-shutdown-fence.ts:91-99`) | Domain stays truthful |
| Connection loss | `handleDisconnect(retryable=true)`: `awaitingRebind.hold(pendingInterrupts)`; on the new connection's first `AGENT_STATUS`, after `dispatchMessage`: `awaitingRebind.settle(CONNECTION_LOST)`; `disconnect()`: settle at once | Draining at the drop (`rejectInFlight` today): the button falls back to the stale Running for ≥1 s and a double tap shows "Stop was not sent" although the first Stop worked (ARCH-REV-001 AR-001) | REQ-003, REQ-005 |
| Messages | en: "Could not stop {{name}}. Please try again." / "Stop was not sent: not connected to the node. Check the connection and try again."; zh-CN: "无法停止 {{name}}，请重试。" / "停止指令未发送：未连接到节点。请检查连接后重试。"; Stopping: "Stopping…" / "正在停止…" | "Could not stop solution_designer_e7ba…: AgentRun '…' has no canonical active turn to interrupt." | REQ-006 |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Why Considered | Decision | Replacement |
| --- | --- | --- | --- |
| Web tolerance of `NO_ACTIVE_TURN` acks from older nodes/peers | Mixed versions | Rejected (DESIGN.md rule 9) | Node answers accepted; every non-accepted ack is a real failure |
| Keeping the callback options beside the outcome promises | Fewer call-site changes | Rejected | Callbacks removed |
| Keeping old localization keys | — | Rejected | Removed |

## Change / Refactor Sequence

1. Node: `NO_ACTIVE_TURN` constant; `user-interrupt-outcome.ts`; five handlers; three backends; turn the server reproduction into the durable e2e (standalone + Team member; idle, together, after the turn ended) and unit tests per handler and backend; rewrite `agent-websocket.integration.test.ts:621,665`.
2. Web types: `InterruptOutcome`, port return type, `AgentContext.interruptPending`, primary action `stopping`.
3. Web streams: admission settles outcomes; both services return promises; remove callbacks; `InterruptsAwaitingRebind` and its use in the three services; Org connection-lost error and `orgInterruptOutcome`.
4. Web routes: stores and interactions return outcomes; `runInterrupt`; `activeContextStore` calls it; `targetDisplayName` extraction; composer rendering; localization; remove presenters and keys.
5. Tests: unit (double press sends one Stop for each run kind; each outcome; status watch from the press; texts with no run id/internal words; **connection loss while Stopping**, per service: the stream drops, a press in the reconnect window sends nothing and shows nothing, then a rebind with Running ends Stopping and enables Stop, and a rebind with Idle/Offline shows Send; a final close settles at once), the rewritten `interrupt-result-presentation` probe, a desktop browser probe from the scratch reproduction (built server + scripted AGY + `--latency-ms`), a phone case in `test:e2e:mobile-shell`; remove both scratch reproductions.
6. Docs.

## Key Tradeoffs

- Mapping at the command boundary (not the domain) keeps internal callers correct at the cost of one rule file and five call sites, instead of changing shutdown semantics.
- Holding a Stop across a reconnect keeps "Stopping…" for up to the reconnect delay (1 s, then backoff up to 30 s while the node is unreachable). The alternative, ending at the drop, shows a stale Running and invites a false "not sent" message; while the node is unreachable no Stop could be sent anyway.
- Ending Stopping by status (not by the ack) means a Stop accepted while the runtime keeps running would show Stopping until the status changes; every runtime ends the turn after an accepted interrupt (Claude and AGY settle first; native waits for settlement or answers `settlement_timeout` as a failure), so this matches what the user should see.

## Risks

- R-1: Overlap with 448/526 FU-002 in the interrupt path; this design does not change `AgentRunInterruptState`.
- R-2: `agentOrgStreamingService.ts` near the 500-line limit; the translation lives outside it.
- R-3: A Stop accepted with no later status change (a node defect) leaves Stopping on; no timer is added (DESIGN.md: no speculative machinery). The next status, or a later loss and rebind, clears it.
- R-4: While the node stays unreachable, Stopping lasts until the stream rebinds or is closed for good; this is intended (REQ-003, REQ-005).

## Guidance For Implementation

- Reproduction to start from: `autobyteus-server-ts/tests/e2e/agent-run/interrupt-twice-repro.e2e.test.ts` (fails on the base), command in the investigation notes; browser: `autobyteus-web/tests/e2e/interrupt-twice-repro-scratch.mjs`. The fix turns the server test green; both scratch files are replaced by durable tests and removed.
- Re-walk DS-001…DS-004 for each run kind (standalone, Team member, Org member direct and in an Org-internal Team, delegated agent, delegated Team member, peer run) on desktop and phone before handing off.
- Both typechecks (TESTING.md); localization guards; the 500-line limit for `agentRunStore.ts` (do not grow), `agentOrgContextsStore.ts` (do not grow), `agentOrgStreamingService.ts` (≤ 500).
