# Design Spec

## Solution And Approval Basis

- Current solution revision ID: `SR-002` (revision for ARCH-REV-001 AR-001..AR-003; DS-001..DS-003 unchanged)
- Approved requirements baseline / revision, who approved, and approval reference: `requirements-doc.md` at SR-002 (SR-001 + REQ-004/QR-001/AC-005 clarification), approved by the Solution Designer within the Task's direction (user informed in this conversation, 2026-10-18)
- Behavior-defining supplements and their approval references: none
- Design status: `Ready`
- Canonical investigation-notes path: `/Users/normy/autobyteus_org/autobyteus-worktrees/segment-lifecycle-error-flood/tickets/in-progress/segment-lifecycle-error-flood/investigation-notes.md`
- Authorities read (design reading gate; file and date): `references/architecture-design.md`, `references/design-principles.md` (2026-10-18); project `DESIGN.md` (repository root, 2026-10-18); area contracts `autobyteus-server-ts/docs/modules/agent_execution.md` (Runtime lifecycle projection; Runtime Segment Identity And Ordering), `docs/modules/agent_streaming.md`, `docs/design/agent_websocket_streaming_protocol.md`; prior design `tickets/done/agent-idle-status-lifecycle/design-spec.md` (turn state machine).
- Project design-principle conflicts with the general principles, or discrepancies: one discrepancy with the prior idle-status design. It says "an identified start is allowed to supersede another identified active turn because it is positive newer active evidence". That holds only for ordered stream evidence. The same code also accepts a live runtime snapshot, which can be ahead of the queued stream. This design corrects the rule; the docs listed in the mapping are updated in the same change.

## Current-State Read

Per run, runtime events flow `backend → AgentRun.publishSourceEvents → AgentRunEventDispatchQueue (serialized) → pipeline (AgentSegmentLifecycleEventTransformer … LifecycleStatusEventTransformer) → listeners (WebSocket, memory, Team adapters)`. Two run-owned states each keep their own "active turn + ended (retired) turns" record:

- `AgentTurnLifecycleState` (status, and the command side: interrupt targeting, active-turn append, quiescence, root shutdown);
- `AgentSegmentLifecycleState` (segment admission), which falls back on the turn state when it has no active turn itself.

Both feed on two kinds of evidence without distinguishing them:

1. ordered stream evidence: `TURN_STARTED`/terminal events in queue order, accepted input commands;
2. the runtime's **live** lifecycle snapshot (`backend.getLifecycleSnapshot()`), read when a queued batch is processed and, for the turn state, also on status reads, input claims and after each batch (`AgentRun.reconcileRecovery()`).

The live snapshot can be ahead of the queued events, and both states treat it as if it were ordered. A snapshot naming turn T2 opens T2. The older turn T1's queued `TURN_STARTED` then "supersedes" and permanently retires T2 (BEH-001/002). Or a snapshot naming T2 retires T1 while T1's text is still queued (BEH-007). Evidence: probe and experiments (investigation notes; `experiments/experiment-results.md`). The transformer then turns every rejected event into its own chat card and logs nothing (BEH-003).

## Task Size And Architectural Risk (Mandatory)

- Task size: `Medium`
- Size rationale and supporting evidence: 2 new small source files and 4 modified source files (3 in `agent-execution/events/processors`, plus a logging-only call-site change in `agent-run-termination.ts`), focused tests, 2 intentionally changed integration tests, and 4 docs. E4 prototype: +115/−63 for the turn-identity part; the rejection notice and logging adds a bounded delta in the segment state and transformer.
- Architectural risk: `High`
- Risk rationale and supporting evidence: it changes the turn-lifecycle semantics (which evidence may end a turn) of run-owned state shared by every runtime (Claude, Codex, AutoByteus, AGY, Grok). This state also drives command targeting and root-shutdown quiescence: a lifecycle/concurrency-semantics change with a wide blast radius. The experiments are green (E4 prototype: full server unit 721 passed/4 skipped; related integration 20 pass/3 skipped as base), but the change still warrants independent review.
- Escalation trigger if implementation or validation discovers new impact: any existing test that only passes by letting a snapshot retire a stream-observed turn; any runtime found to emit a turn's events only through snapshots while also emitting stream starts for other turns; any change needed outside the files listed.

## Architecture Investigation Evidence

| Source / Command / Probe | Exact Path / Reference | Observation | Design Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| Reproduction probe | `probes/claude-provider-turn-segment-race.probe.test.ts`, `evidence/probe-run-base-1c718202b2.txt` | Instrumented `openTurn`: snapshot opens T2, queued `TURN_STARTED(T1)` retires T2; 6 diagnostics; status idle mid-T2 | Root cause | None |
| E1 experiment | `experiments/experiment-results.md` | Removing snapshot turn-opening breaks 22 command-side tests | Keep snapshot evidence; change its *authority* only | None |
| E2/E3/E4 experiments | `experiments/*.patch`, results | E3 (timing) fixes the probe but relies on synchronous backend emission (Codex documents async batches); E2 and E4 fix all six cases; E4 same results with one owner | Adopt E4's rule and shape; reject E3 | E4 prototype full server unit: 721 passed / 4 skipped, exit 0; related integration 20 passed / 3 skipped (= base). Notice/log part not prototyped |
| Codex backend | `backends/codex/backend/codex-agent-run-backend.ts` `terminateRun` comment | "A synchronous native terminal update does not mean its async canonical batch reached AgentRun." | Evidence rule must not depend on capture timing | None |
| Pipeline order | `events/default-agent-run-event-pipeline.ts` | Segment transformer runs over the whole batch before the lifecycle-status finalizer | Each state keeps its **own** ledger instance (they observe a batch in different passes); only the rule is shared | None |

## Intended Change

Give "which turn is active, and which turns have ended" one owner (`AgentTurnLedger`) with an explicit evidence rule: stream evidence is ordered and may supersede and end turns, while the turn a runtime snapshot *names* as current is provisional and never supersedes or ends a turn. (Unchanged: a snapshot reporting the runtime `offline`, or `phase: error`, still ends the active turn exactly as today; this is runtime-availability evidence, not turn naming.) Use it in both run-owned states. Then make segment-lifecycle rejections show at most one plain-language notice per turn, only in the current turn, and log them with a reason code.

## Change Scope (Mandatory)

- In scope: UC-001 (turn ordering under a runtime snapshot ahead of the queue), UC-002 (presentation and logging of segment-lifecycle rejections). Areas: run-owned turn lifecycle state, run-owned segment lifecycle state, segment lifecycle transformer, a small rejection log module, the termination release call site (logging only), and the four docs that describe these contracts.
- Deliberately left alone: `AgentRunTermination`'s termination sequence (only the release call's returned summaries are logged); `AgentRun` command-side reads (interrupt/admission/termination keep using the turn state's `activeTurn`); snapshot capture timing in `dispatch-processed-agent-run-events.ts` (E3 rejected); all runtime backends and converters; the web client (the error card is unchanged and receives at most one event per turn); the Codex thread admission gate; the error DTO contract.
- Follow-ups (FU-001 and FU-002 **sent** to `/project_task_manager` on 2026-10-18 at the user's request, ahead of delivery; created as Project Tasks FU-001 = `autobyteus-165`, FU-002 = `autobyteus-166`; this ticket is Task `autobyteus-143`; do not resend at the delivery receipt):
  - FU-001 — Codex thread admission rejections: 1,963 `[CodexSegmentTurnAdmissionRejected]` entries in the user's log, concentrated in `codex_45ce1b9e80ea42db869dc86615d51fc3` (1,070, bursts up to 438) and `solution_designer_ef2854b4b6584744a63b5674a0899293` (651): item/agentMessage deltas and item started/completed arriving while the Codex thread tracks no active turn (INACTIVE) or another turn (CONFLICT). These are dropped before conversion, so they never reach the chat, but agent text may be missing for those Codex turns. Investigate why the thread lost the turn (resume/attach mid-turn, steer/append, or app-server turns started outside AutoByteus), whether content is lost, and bound that gate's per-event logging. Suggested Task: "Investigate Codex runs dropping whole turns of item notifications as CODEX_SEGMENT_TURN_INACTIVE/CONFLICT (server.log evidence from 2026-10-18)".
  - FU-002 (minor) — `AgentRun` answers command-side "which turn is running now" from the same projection state. During the short queue lag after a turn ends, a Stop can target the turn that just ended and get the existing "not the active turn" rejection; a second Stop works. The window exists only for backends whose batches reach AgentRun asynchronously (Codex). On those backends it is introduced by this design's rule: at base, the live snapshot would have retargeted the command (ARCH-REV-001 MP-002). No action proposed unless it is observed in use.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Approved Requirement / Intent And Acceptance-Criteria IDs | Approved Trigger Or Governing Contract | Relevant Existing Behavior And Evidence Reference | Approved Change Or Preserved Outcome | Target Production Path / Lifecycle And Spine ID(s) |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | REQ-001; AC-001 | Claude starts consecutive turns on its own (SCN-001) | Turn 2 retired by turn 1's queued start; all text rejected | Turn 2 text admitted and saved | DS-001, DS-003 |
| BEH-007 | System | REQ-001; AC-002 | Same, turn 1 has text queued | Snapshot retires turn 1; its text rejected | Turn 1 text admitted | DS-001, DS-003 |
| BEH-002 | System | REQ-002; AC-003 | Same | Status idle during turn 2 | running during turn 2, idle after | DS-001, DS-002 |
| BEH-003 | System | REQ-003, REQ-004; AC-004, AC-005 | Rejected segment event (SCN-002) | One card per event, no log | ≤1 notice per turn in the current turn; first-per-turn log with reason + end-of-turn count | DS-004 |
| BEH-008 | Contract | REQ-005; AC-006 | Snapshot-only current turn (SCN-003) | Treated as running; commands target it | Preserved: a snapshot still names the turn while the stream has none | DS-002 |
| BEH-006 | System | REQ-005; AC-006 | Provider retry diagnostics | Card shown | Preserved (other producers untouched) | — |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related Requirement / Acceptance-Criteria IDs (When Applicable) | Relationship To This Design | Status / Approval Applicability |
| --- | --- | --- | --- | --- |
| `probes/claude-provider-turn-segment-race.probe.test.ts` | Reproduction | AC-001..AC-003 | Basis for the durable regression test | Evidence |
| `experiments/turn-race-experiment.probe.test.ts` | Scoring probe X1–X6 | AC-001..AC-003 | Cases to keep as durable tests | Evidence |
| `experiments/E4-shared-turn-identity.patch` | Prototype of the chosen turn-identity owner | REQ-001, REQ-002 | Reference implementation of DS-003 (to be renamed per this design and completed with tests); not a commit | Evidence |
| `experiments/experiment-results.md` | Experiment record | REQ-001, REQ-002 | Alternatives and evidence | Evidence |

## Task Design Health Assessment (Mandatory)

- Change posture: `Bug Fix`
- Current design issue found: `Yes`
- Structural triggers that fire, each with evidence:
  - *Repeated coordination trigger*: the active/retired turn policy (open, supersede-and-retire, retire on terminal, snapshot reconcile) is implemented twice, in `AgentTurnLifecycleState` and `AgentSegmentLifecycleState`, and the bug lived in both copies (probe: both segment rejection and idle status).
  - *Shared-structure tightness*: neither copy records which evidence established its active turn, so one field ("active turn") carries two meanings: the stream's turn and the runtime's current turn.
  - Ruled out: *Authoritative-boundary trigger*. Callers use `AgentRun`/the states' public methods only. *Responsibility overload*: the transformer remains a translator.
- Root cause classification: `Duplicated Policy Or Coordination` (primary), with a `Missing Invariant`: only ordered evidence may end a turn.
- Refactor needed now: `Yes` (bounded)
- Evidence: probe instrumentation; E2 vs E4 experiments (same behavior, E4 removes the duplicate policy); E1 shows the snapshot must stay as an evidence source.
- Design response: extract `AgentTurnLedger` (one owner of the turn-identity rule). Both states hold their own ledger instance, because they observe a batch in different pipeline passes. Remove both duplicated implementations.
- Refactor rationale: patching the rule twice (E2) keeps two authorities for the same policy, and the next change can again fix one and miss the other. The extraction is small and stays inside the subsystem.
- Intentional deferrals and residual risk: FU-002 (command-side "now" vs projection) is deferred. The residual is a rejected first Stop during a millisecond-scale window, recoverable by a second Stop. Splitting command-side reads from projection state would touch interrupt, admission and termination, which is out of proportion for this bug.

## Terminology

- **Stream evidence**: a turn fact observed in the run's ordered event stream (`TURN_STARTED`, `TURN_COMPLETED`/`TURN_INTERRUPTED`, turn-terminal `ERROR`, runtime-global error/offline) or from an accepted input command's turn id.
- **Runtime-snapshot evidence**: the runtime's live current turn (`AgentRuntimeLifecycleSnapshot.currentTurn`), which may be ahead of the queued stream. The rule restricts only this turn naming. The snapshot's `availability: "offline"` and `phase: "error"` keep their current effect (`terminate()` / `retireAndClearActiveTurn()` in the turn state, `releaseRun()` in the segment state), using the ledger's `endActive()` / `forgetActive()`.
- **Ended turn**: a turn the ledger has seen end (today's "retired"). Its later segment events are rejected.

## Legacy Removal Policy (Mandatory)

- Obsolete legacy paths and files in this scope: the duplicated turn-tracking members of both states (see Removal Plan).
- Compatibility wrappers, dual paths, or legacy fallbacks this design keeps: `None`

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- Decision: `Not Affected`. Both states are live-only, in memory per run, and never persisted. Run memory gains the previously dropped records through its existing writer, with an unchanged shape.

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001, BEH-002, BEH-007 | Claude CLI frame (`system/init`, assistant, `result`) | Chat (WebSocket) + run memory + run status | `AgentRun` (per-run dispatch queue) | The path where text was lost and status went idle |
| DS-002 | Primary End-to-End | BEH-002, BEH-008 | Status read / input claim / interrupt / root-shutdown evaluation | Status payload, command target | `AgentRun` → `AgentTurnLifecycleState` | Live snapshot reconciles feed the same state |
| DS-003 | Bounded Local | BEH-001, BEH-007, BEH-008 | Evidence (stream start/terminal, command turn id, snapshot turn) | Active turn / ended set | `AgentTurnLedger` (one instance per state) | The corrected rule |
| DS-004 | Bounded Local | BEH-003 | Rejected segment event | ≤1 notice per turn + bounded log | `AgentSegmentLifecycleEventTransformer` with `AgentSegmentLifecycleState` | The flood and the missing log |

## Primary Execution Spine(s)

- DS-001: `Claude CLI frame → ClaudeSession/ClaudeTurnTracker → ClaudeAgentRunBackend (converter) → AgentRun dispatch queue → AgentSegmentLifecycleEventTransformer (+AgentSegmentLifecycleState/AgentTurnLedger) → LifecycleStatusEventTransformer (+AgentTurnLifecycleState/AgentTurnLedger) → listeners (WebSocket chat, run memory, Team adapter)`
- DS-002: `Status read / input claim / Stop / root-shutdown check → AgentRun.reconcileRecovery() (live snapshot) → AgentTurnLifecycleState (+AgentTurnLedger) → status payload / command target`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | Each Claude frame becomes canonical events that are queued per run. When processed, each state reconciles with the live snapshot (provisional: it can name a turn only while the state has no stream-observed turn) and then applies the batch's stream events in order, which alone can supersede or end turns. Turn 2 therefore stays admissible after turn 1's queued start and end, and turn 1 stays admissible until its own end | Run, turn, segment | AgentRun | Rejection logging |
| DS-002 | Command-side reads reconcile the turn state with the live snapshot. With the rule, a snapshot fills an empty slot (restore/attach, runtimes that report turns only by state) or refreshes a snapshot-held slot, but never ends a stream-observed turn | Run, turn | AgentRun | — |
| DS-003 | The ledger applies the evidence rule (see Concrete Examples) | Turn | AgentTurnLedger | — |
| DS-004 | The state classifies each rejection with a reason and keeps a run-lifetime rejection account per turn (and one for events without a turn id). The transformer logs the first rejection of an account in detail and emits the single notice only if the turn is the current one and has had none. Later rejections are counted. At every run lifecycle boundary (a turn terminal seen by the segment transformer, an in-pipeline release, the termination release) the pending counts are taken from the state and written as one summary line per account | Turn, rejected segment event | Segment transformer + state; termination for its release | `agent-segment-rejection-log.ts` |

## Spine Actors / Main-Line Nodes

`AgentRun` (queue), `AgentSegmentLifecycleEventTransformer`, `AgentSegmentLifecycleState`, `LifecycleStatusEventTransformer`, `AgentTurnLifecycleState`, `AgentTurnLedger`.

## Ownership Map

- `AgentTurnLedger` (new): owns the identified active turn, the evidence kind that established it, and the set of ended turns; owns the evidence rule. No status, no segments, no I/O.
- `AgentTurnLifecycleState`: owns status, the anonymous turn, the pending command and the recoverable block; delegates identified-turn identity to its ledger; exposes `activeTurn` (derived) unchanged to callers.
- `AgentSegmentLifecycleState`: owns segment identities and phases, rejection reasons and per-turn rejection accounting; delegates turn identity to its own ledger.
- `AgentSegmentLifecycleEventTransformer`: owns payload validation, canonical event shaping, the notice event and rejection logging (it has `runContext` for run id and runtime kind).
- `AgentRunTermination`: unchanged ownership of the termination sequence; it now also logs the pending summaries that `releaseRun()` returns.
- `agent-segment-rejection-log.ts`: owns the two log line formats only.

## Thin Entry Facades / Public Wrappers (If Applicable)

N/A — no facade involved.

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope | Notes |
| --- | --- | --- | --- | --- |
| `AgentSegmentLifecycleState.activeTurnId`, `.retiredTurnIds`, `openTurn()` | Duplicated turn policy | `AgentTurnLedger` | In This Change | `clearTurn()` stays (segment cleanup) |
| `AgentTurnLifecycleState.activeTurn` (mutable field) and `.retiredTurnIds` (public field) | Duplicated turn policy; nothing outside the file reads `retiredTurnIds` (repo search: no hits in `src`/`tests` outside the two state files) | Ledger + `anonymousTurnActive` flag; `activeTurn` becomes a getter with the same `AgentActiveTurn` shape | In This Change | No caller assigns `activeTurn` (repo search) |
| Per-event diagnostic emission in `AgentSegmentLifecycleEventTransformer.diagnostic()` | Replaced by per-turn accounting | DS-004 | In This Change | — |

## Return Or Event Spine(s) (If Applicable)

DS-001's tail: `canonical events → WebSocket → web handleError/segment handlers` (unchanged).

## Bounded Local / Internal Spines (If Applicable)

- DS-003, parent `AgentTurnLedger`: `evidence → (stream start: supersede and end a stream-held different turn; replace a snapshot-held turn without ending it) | (snapshot-named turn: fill an empty slot or refresh a snapshot-held slot; never supersede or end; ignored while stream-held) | (terminal: end the turn; clear it if active) | (runtime offline/error, from a snapshot or an event: owning state calls endActive()/forgetActive() exactly as today) → active turn / ended set`.
- DS-004, parent `AgentSegmentLifecycleState` + transformer: see "Rejection accounting lifecycle" below.

### Rejection accounting lifecycle (DS-004, revised in SR-002 for AR-001)

- **Account key**: the rejected event's turn id, or one run-level "no turn" account for events without a turn id.
- **Account lifetime**: the run's lifetime, like the ledger's ended-turn set (which already lives as long as the run). Accounts are never deleted at a terminal or on release, so a turn's late rejections find its existing account and never produce a second detailed warning. Size is bounded by the number of turns that had rejections.
- **Account fields**: `warned` (detailed warning written), `pending` (rejections counted since the last summary), `noticed` (chat notice emitted).
- **recordRejection(turnId | null) → { warn, showNotice }**: `warn` is true only for the account's first rejection (then `warned = true`); otherwise `pending += 1`. `showNotice` is true only when turnId is non-null, it is the ledger's active turn, and `noticed` is false (then `noticed = true`). The no-turn account never notices.
- **Flush (boundary)**: `takeRejectionSummaries() → { turnId: string | null; count: number }[]` returns every account with `pending > 0` and resets `pending` to 0. Boundaries:
  1. the segment transformer, at the end of a batch that contained a turn terminal (`TURN_COMPLETED`, `TURN_INTERRUPTED`, turn-terminal `ERROR`) or a release;
  2. in-pipeline release (`observeRuntimeTerminal`, offline/error `AGENT_STATUS`, `reconcileAfterBatch`): `releaseRun()` **returns** the pending summaries, and the transformer logs them;
  3. termination: `AgentRunTermination.finishCommittedTerminationOnce` takes the summaries returned by `segmentLifecycleState.releaseRun()` and logs them through the same log module (it has `runId` and `backend.runtimeKind`).
- **I/O**: the state has none. `segment-lifecycle/agent-segment-rejection-log.ts` owns the two log formats and is called by the transformer and termination.
- **Resulting bound** (REQ-004/QR-001 as clarified in SR-002): at most 1 detailed warning per account, plus at most 1 summary per account per boundary. All of a turn's rejections before its own terminal give ≤ 2 lines. A burst of late events after the terminal gives 1 summary at the next boundary (the next turn's end or the run's release). No count is dropped.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Rejection log module `segment-lifecycle/agent-segment-rejection-log.ts` (`console.warn` via module-local `logger`, as in sibling processors) | DS-004 | Segment transformer; AgentRunTermination (release summaries) | Two formats: detailed rejection, per-account summary | REQ-004 | Logging inside the state would give the pure state I/O; formatting in two callers would duplicate it |

## Ownership Boundaries

`AgentRun` remains the only caller of the states' command-side methods (`acceptCommand`, `reconcileRuntimeSnapshot`, `releaseRun`, `terminate`). The transformers are the only callers of the observe methods. `AgentTurnLedger` is internal to the two states; nothing else imports it.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `AgentTurnLifecycleState` | its `AgentTurnLedger` | AgentRun, interrupt state, termination, lifecycle-status transformer | Callers reading or holding the ledger | Add a query on the state |
| `AgentSegmentLifecycleState` | its `AgentTurnLedger`, segment map, rejection accounting | Segment transformer, AgentRun, termination | Transformer keeping its own per-run maps (the transformer is a shared singleton) | Add a method on the state |

## Dependency Rules

- `segment-lifecycle/*` may import `lifecycle-status/agent-turn-ledger.ts` (it already imports the turn-state type from that folder). `lifecycle-status/*` must not import `segment-lifecycle/*`.
- The ledger imports nothing beyond the standard library.
- `agent-execution/domain/agent-run-termination.ts` may import `segment-lifecycle/agent-segment-rejection-log.ts` (it already depends on the segment state type); the log module imports nothing from `domain`.
- The segment state must not read the turn state's ledger. Its existing fallback via `turnLifecycleState.activeTurn`/`status` in `canOpen` stays unchanged.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `AgentTurnLedger.activeTurnId: string \| null` | turn | current identified turn | — | |
| `AgentTurnLedger.hasEnded(turnId)` | turn | ended check | turn id | |
| `AgentTurnLedger.observeStreamStart(turnId): string \| null` | turn | stream start; returns the turn it superseded and ended, if any | turn id | Used for `TURN_STARTED`, accepted command turn id, segment-start opening |
| `AgentTurnLedger.observeRuntimeSnapshotTurn(turnId): boolean` | turn | provisional naming; returns whether it is now the active turn | turn id | Never ends a turn |
| `AgentTurnLedger.end(turnId)` / `endActive(): string \| null` / `forgetActive()` | turn | terminal / runtime-global end / release without ending | turn id | `forgetActive` serves today's `releaseRun()` semantics |
| `AgentSegmentLifecycleState` transition result `{ kind: "REJECTED"; reason: AgentSegmentRejectionReason }` | rejected segment event | reason | — | `TURN_ENDED`, `TURN_NOT_CURRENT`, `SEGMENT_NOT_STARTED`, `SEGMENT_ENDED`, `SEGMENT_TYPE_CONFLICT`; the transformer adds `PAYLOAD_INVALID` |
| `AgentSegmentLifecycleState.recordRejection(turnId: string \| null): { warn: boolean; showNotice: boolean }` | rejection account | dedupe for log and notice | turn id or null (no-turn account) | See "Rejection accounting lifecycle" |
| `AgentSegmentLifecycleState.takeRejectionSummaries(): AgentSegmentRejectionSummary[]` | rejection accounts | boundary flush | — | `{ turnId: string \| null; count: number }`; resets `pending` |
| `AgentSegmentLifecycleState.releaseRun(): AgentSegmentRejectionSummary[]` | segments + accounts | release; returns pending summaries | — | Callers (transformer, termination) log them; accounts themselves are kept |
| `logAgentSegmentRejection(input)` / `logAgentSegmentRejectionSummaries(context, summaries)` | log format | `[AgentSegmentLifecycleRejected] { runtimeKind, runId, turnId, eventType, segmentId, reason }`; `[AgentSegmentLifecycleRejectedSummary] { runtimeKind, runId, turnId, count }` | run id + runtime kind | New file `agent-segment-rejection-log.ts` |

## Interface Boundary Check

| Interface | Responsibility Is Singular? | Identity Shape Is Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `AgentTurnLedger` methods | Yes | Yes | Low | Evidence kind is in the method name, not a flag parameter |
| `recordRejection` | Yes | Yes | Low | — |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Turn identity owner | `AgentTurnLedger` (E4 prototype called it `AgentTurnIdentity`) | Yes: a ledger of the active turn and ended turns | Low | Use `AgentTurnLedger`, file `agent-turn-ledger.ts` |
| "retired" | "ended" in the ledger API | Yes | Low | Keep "retired" wording out of new API; docs say "ended (retired)" once |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Turn identity rule | `events/processors/lifecycle-status` | Extend (new file in it) | Turn lifecycle is this folder's concern | — |
| Rejection accounting | `AgentSegmentLifecycleState` | Extend | Run-owned per-run state already exists; the transformer is a shared singleton | — |
| Logging | module-local `logger` pattern of sibling processors | Reuse | Consistency | — |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| `agent-execution/events/processors/lifecycle-status` | turn ledger, turn/status state | DS-001..DS-003 | AgentRun | Extend | |
| `agent-execution/events/processors/segment-lifecycle` | segment admission, rejection accounting, notice/log | DS-001, DS-004 | AgentRun | Extend | |

## Draft File Responsibility Mapping

See Final mapping (no extraction beyond the ledger was found necessary).

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? | Overlapping Representations Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| active/ended turn tracking + snapshot reconcile | `lifecycle-status/agent-turn-ledger.ts` | lifecycle-status | Same policy in two states | Yes | Yes (evidence kind explicit) | A status or segment owner; a shared instance across states |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Parallel / Overlapping Representation Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `{ turnId, evidence: "stream" \| "runtime_snapshot" }` | Yes | Yes | Low | — |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `lifecycle-status/agent-turn-ledger.ts` (Add) | lifecycle-status | AgentTurnLedger | Evidence rule for active/ended turns | One small policy object | — |
| `lifecycle-status/agent-turn-lifecycle-state.ts` (Modify) | lifecycle-status | AgentTurnLifecycleState | Status/anonymous/pending/recoverable; identified identity via ledger | Existing owner | Ledger |
| `segment-lifecycle/agent-segment-lifecycle-state.ts` (Modify) | segment-lifecycle | AgentSegmentLifecycleState | Segments, rejection reasons, per-turn accounting; identity via ledger | Existing owner | Ledger |
| `segment-lifecycle/agent-segment-lifecycle-event-transformer.ts` (Modify) | segment-lifecycle | transformer | Validation, shaping, single notice, boundary flush, log calls | Existing owner | Log module |
| `segment-lifecycle/agent-segment-rejection-log.ts` (Add) | segment-lifecycle | log formats | Detailed and summary rejection lines | One small module shared by two callers | — |
| `agent-execution/domain/agent-run-termination.ts` (Modify) | agent-execution/domain | AgentRunTermination | Log the summaries returned by `segmentLifecycleState.releaseRun()` | Existing release caller | Log module |

## Applied Patterns (If Any)

Small state machine (ledger) inside each owning state.

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-execution/events/processors/lifecycle-status/agent-turn-ledger.ts` | File | AgentTurnLedger | Rule DS-003 | Turn lifecycle concern | Status, segments, logging |
| `…/lifecycle-status/agent-turn-lifecycle-state.ts` | File | AgentTurnLifecycleState | As today minus own identity tracking | — | Its own active/retired copy |
| `…/segment-lifecycle/agent-segment-lifecycle-state.ts` | File | AgentSegmentLifecycleState | As today minus own identity tracking; plus reasons/accounting | — | I/O |
| `…/segment-lifecycle/agent-segment-lifecycle-event-transformer.ts` | File | transformer | + single notice, boundary flush, log calls | — | Per-run maps |
| `…/segment-lifecycle/agent-segment-rejection-log.ts` | File | log module | Log formats | Off-spine concern of the segment lifecycle | State, policy |
| `autobyteus-server-ts/src/agent-execution/domain/agent-run-termination.ts` | File | AgentRunTermination | Logs release summaries | Owns the termination release call | Accounting policy |
| `autobyteus-server-ts/tests/unit/agent-execution/events/agent-turn-ledger.test.ts` (Add), segment-lifecycle transformer/state unit tests incl. the four AC-005 cases (Add; none exist today), termination release-summary test (Add or extend the existing termination unit test), turn-lifecycle tests (Modify as needed), Claude regression test through ClaudeSession → backend → AgentRun (Add; from the probes) | Tests | — | AC-001..AC-006 | — | — |
| `tests/integration/agent/agent-status-websocket.integration.test.ts` (~l.559–583) (Modify, intentional) | Test | — | Late `SEGMENT_CONTENT` of ended `turn-a` while `turn-b` runs: expected trace ends at `["TURN_COMPLETED","turn-a"]` (no `ERROR turn-a`), message count one lower; status assertions unchanged | REQ-003 | — |
| `tests/integration/agent-team-execution/team-agent-segment-admission.integration.test.ts` "retires an ended turn and accepts a fresh exact segment…" (Modify, intentional) | Test | — | `diagnosticEvents(observed)` for content of ended `turn-1` → 0; fresh `turn-2` segment still accepted | REQ-003 | — |
| Same file, other cases ("missing identity", "content before start", "conflicting type", "content after terminal end", "surplus type") | Test | — | Expected to stay at 1 diagnostic each: one rejection in the current (snapshot-held `turn-1`) turn; if one of them needs a change, it is because it has several rejections in one turn (now 1), which is intended under REQ-003 | REQ-003 | — |
| `docs/modules/agent_execution.md`, `docs/modules/agent_streaming.md`, `docs/design/agent_websocket_streaming_protocol.md`, `docs/design/streaming_parsing_architecture.md` (l.51) | Docs | — | Evidence rule (turn naming only); notice once per turn in the current turn; bounded logging | Contract docs | — |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth | Ownership Boundary Is Clear? | Mixed-Layer Or Over-Split Risk | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `events/processors/lifecycle-status` | Main-Line Domain-Control | Yes | Low | Ledger is turn lifecycle |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Ledger rule, user's case | Ledger empty (T0 ended). Snapshot says T2 → active T2 (snapshot). Queued `TURN_STARTED(T1)` → active T1 (stream), T2 **not** ended. `TURN_COMPLETED(T1)` → T1 ended, active none. Snapshot T2 → active T2 (snapshot). `TURN_STARTED(T2)` → active T2 (stream). T2 segments admitted | Today: `TURN_STARTED(T1)` "supersedes" T2 → T2 ended forever → every T2 segment rejected, status idle | The core rule |
| Ledger rule, X5 | Active T1 (stream) with text queued; snapshot says T2 → ignored (stream-held); T1 text admitted; `TURN_COMPLETED(T1)`; then T2 as above | Today: snapshot T2 ends T1 → T1's queued text rejected | Snapshot never ends a turn |
| Ordered supersede kept | Active T1 (stream); `TURN_STARTED(T2)` with no T1 terminal → T1 ended, T2 active | — | Existing contract preserved (missing terminal) |
| Snapshot offline/error kept | Active T1 (stream); snapshot `availability: offline` → turn state `terminate()` ends T1 as today; snapshot `phase: error` → `retireAndClearActiveTurn()` as today | Reading "a snapshot never ends a turn" as also removing these | AR-003 |
| Notice | Five invalid contents in current turn T → one `ERROR` "Some of the agent's output in this turn could not be shown." + one detailed warn; at `TURN_COMPLETED(T)` one summary warn `count: 4` | Five cards | REQ-003/004 |
| Late rejections | T ended (no earlier rejections); U runs; 3 late `SEGMENT_CONTENT` of T → no notice (T not current), one detailed warn `reason: TURN_ENDED`, `pending = 2`; at U's terminal (or the run's release) one summary `{ turnId: T, count: 2 }`. T's account stays; a further late event much later adds to `pending` and appears in a later boundary's summary | A second "first" warn per late event; or late counts silently dropped | AR-001 |
| Terminate | Current T has 3 rejections (1 notice, 1 warn, pending 2); user terminates → `AgentRunTermination` → `releaseRun()` returns `[{ turnId: T, count: 2 }]` → termination logs one summary | Release clearing counts silently | AR-001 |
| No turn id | 2 payload-invalid events without `turn_id` → no notice; one detailed warn; one summary `{ turnId: null, count: 1 }` at the next boundary | Unbounded per-event lines | AR-001 |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep the old per-event diagnostic behind a flag | "Debug visibility" | Rejected | Server log carries the detail |
| Keep `retiredTurnIds` public field for tests | Test convenience | Rejected | Tests assert through behavior or `hasEnded` via the state |

## Derived Layering (If Useful)

N/A

## Change / Refactor Sequence

1. Add `AgentTurnLedger` with unit tests for the rule (the four example rows above, plus `forgetActive`/`endActive`).
2. Switch `AgentTurnLifecycleState` to the ledger (`activeTurn` getter, `anonymousTurnActive`); run the turn-lifecycle and AgentRun unit tests unchanged.
3. Switch `AgentSegmentLifecycleState` to the ledger and add rejection reasons and accounting.
4. Add `agent-segment-rejection-log.ts`; change the transformer to the single notice, boundary flush and logging; make `releaseRun()` return pending summaries and log them in `AgentRunTermination`; add state/transformer/termination unit tests (AC-004, AC-005 a–d); update the two intentionally changed integration tests.
5. Add the Claude regression test (AC-001..AC-003, including a run-memory assertion that turn-2 text is recorded) from the probes; remove the throwaway probes.
6. Update the four docs.
7. Full server unit, integration, typecheck; then the API/E2E stage per TESTING.md (isolated app, AC-007).

## Key Tradeoffs

- E4 over E2: slightly more code moved (+115/−63) for one owner of the policy instead of two copies.
- No snapshot-capture timing change (E3): it would add a hidden timing contract without changing the outcome once the evidence rule holds.
- Notice only in the current turn: a real rejection in a non-current turn is logged but not shown, because the web appends diagnostics to the message being displayed and would otherwise misplace it.

## Risks

- A runtime whose turns are known only by snapshot *and* that also emits stream starts for some turns could keep a stream-held turn until its terminal arrives. No such runtime was found; covered by the full suites (escalation trigger).
- FU-002 window (see Change Scope).

## Guidance For Implementation

- Use `experiments/E4-shared-turn-identity.patch` as a reference only; apply the names from this design (`AgentTurnLedger`, `hasEnded`, `end`, `endActive`, `forgetActive`).
- Segment-start opening (`start()` today calls `openTurn`) is stream evidence: use `observeStreamStart` only when the ledger's active turn differs, as in the prototype.
- Notice payload: keep `code: "AGENT_SEGMENT_LIFECYCLE_INVALID"`, `error_scope: "turn"`, `error_effect: "diagnostic"`, `turn_id`; message exactly "Some of the agent's output in this turn could not be shown."
- Log tags: `[AgentSegmentLifecycleRejected]` `{ runtimeKind, runId, turnId, eventType, segmentId, reason }` and `[AgentSegmentLifecycleRejectedSummary]` `{ runtimeKind, runId, turnId, rejectedAfterFirst }`.
- Keep the test-environment isolation rules; the regression test uses the existing fake Claude SDK helper (`tests/helpers/fake-claude-streaming-sdk.ts`).
