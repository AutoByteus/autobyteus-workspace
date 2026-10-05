# Design Spec — Codex interrupted-compaction fix

## Solution And Approval Basis
Package codex-interrupted-compaction-fix, SR-002; requirements approved (U03): REQ-C01, REQ-C04. Worktree /Users/normy/autobyteus_org/autobyteus-worktrees/codex-interrupted-compaction-fix, branch codex/codex-interrupted-compaction-fix, base origin/personal @ 03d5db06b, finalization target origin/personal. Evidence: investigation-notes.md C01–C16; probes/.

## Current-State Read
The Codex converter projects `item/started` contextCompaction as a non-rotating "compacting" marker and `item/completed` as a rotation-eligible "compacted" boundary, paired by provider_event_id = item id (C01). No owner remembers which compactions are open. When a turn ends without item/completed (interrupt, C10/C11), or the run/app server ends (C14), nothing closes the compaction.

## Task Size And Architectural Risk (Mandatory)
- task_size: **Medium** — open-operation tracking in the existing Codex compaction projector; hooks at turn completion, terminal error conversion and backend terminate; new payload variant; tests including real-frame replays and a gated live E2E. All inside the Codex backend.
- architectural_risk: **Low** — reuses the existing COMPACTION_STATUS contract, the recorder's non-rotating failed markers and the web/history failed phase (Claude precedent). No schema/migration, no concurrency or ownership change. Interrupt behavior proven live.
- Escalation trigger: High if closing on terminate requires changing thread-manager listener ownership beyond emitting before unsubscribe.

## Architecture Investigation Evidence
C01–C03 source; C04–C06 real data; C07–C12 live protocol; C13–C16 turn end, other endings, pairing, tests.

## Intended Change
Track open Codex compaction operations per run (keyed by item id, remembering turn id and thread id). On any ending of their turn or run before item/completed, emit one failed COMPACTION_STATUS per open operation, reusing its provider_event_id, before the turn/run ending event.

## Relevant Behavior And Production-Path Map (Mandatory)
| Behavior | Path after change |
|---|---|
| SCN-C1/C2/C3 | codex `turn/completed` → convertCodexTurnEvent TURN_COMPLETED → new context hook closeOpenCompactionsForTurn(turnId, turnStatus) → failed COMPACTION_STATUS events, then TURN_COMPLETED |
| SCN-C4 | local ERROR {error_effect terminal; scope runtime → all open, scope turn → that turn} → codex-thread-lifecycle-event-converter ERROR case → close hook → failed events, then ERROR |
| SCN-C5 | CodexAgentRunBackend.terminateRun → before threadManager.terminateThread/unsubscribe, ask the converter for close events (reason run_terminated) and dispatch them to sourceListeners |
| SCN-C6 | unchanged: completed boundary rotates; the tracker forgets the id |
| Persistence/display | RuntimeMemoryEventAccumulator → ProviderCompactionBoundaryRecorder writes a non-rotating failed marker; web/history pair started→failed by provider_event_id |

## Relevant Supplemental Task Artifacts
probes/codex-interrupt-auto-raw.jsonl, probes/codex-interrupt-manual-raw.jsonl (abandon shapes), probes/codex-auto-raw.jsonl (normal pairs), probes/real-data-unmatched-started.json (32 real cases).

## Task Design Health Assessment (Mandatory)
Root cause: compaction lifecycle has no owner for "open" state; projections are stateless per event except for dedupe. CodexProviderCompactionStatusProjector already sees every compaction surface and owns Codex compaction identity, so it is the right owner of the open-operation registry. Turn/error/terminate paths only call into it.

## Terminology
Open compaction: a contextCompaction item started and not yet completed. Abandon reason: interrupted | turn_failed | turn_ended | runtime_error | app_server_closed | run_terminated.

## Design Reading Order
Projector registry → payload variant → turn hook → error hook → terminate hook → tests.

## Legacy Removal Policy (Mandatory)
Nothing removed. Existing surfaces stay.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)
No migration. New failed markers use the existing provider_compaction_boundary trace type (non-rotating) with optional error_message (already supported). Historical markers untouched (REQ-C03 rejected). Migration-conventions investigation N/A.

## Data-Flow Spine Inventory
Codex notification/local event → CodexThreadEventConverter (+projector) → AgentRunEvents → memory recorder and websocket.

## Primary Execution Spine(s)
CodexThread notification → CodexAgentRunBackend.handleAppServerMessage → CodexThreadEventConverter.convert → convertCodexTurnEvent / lifecycle converter → projector.closeOpen… → listeners.

## Spine Narratives (Mandatory)
- Interrupt (C10): item/started X (turn T) → projector registers X(T) and emits compacting → turn/completed T status interrupted → hook closes X → COMPACTION_STATUS {status failed, provider_event_id X, error_message "Compaction interrupted before it completed (turn interrupted)"} → TURN_COMPLETED → next turn compaction Y pairs normally.
- Normal (C09): item/started X → item/completed X (rotation boundary) → projector forgets X → turn end closes nothing.
- App server closed: local ERROR runtime terminal → close all open → ERROR.
- Terminate: backend asks the converter for close events (run_terminated) → dispatch → then terminateThread/unsubscribe.

## Spine Actors / Main-Line Nodes
CodexProviderCompactionStatusProjector (registry + payload), CodexThreadEventConverter (context hooks), convertCodexTurnEvent, codex-thread-lifecycle-event-converter, CodexAgentRunBackend (terminate).

## Ownership Map
| Concern | Owner |
|---|---|
| Open-operation registry (id → turnId, threadId) | CodexProviderCompactionStatusProjector |
| Failed payload construction | same projector (new surface) |
| When a turn ends | convertCodexTurnEvent (calls the hook) |
| When the runtime ends by error | codex-thread-lifecycle-event-converter ERROR case (calls the hook) |
| When the run is terminated | CodexAgentRunBackend.terminateRun (calls the converter, dispatches) |

## Thin Entry Facades / Public Wrappers (If Applicable)
CodexThreadEventConverter gets `closeOpenCompactions(reason: "run_terminated"): AgentRunEvent[]` for the backend.

## Removal / Decommission Plan (Mandatory)
None.

## Return Or Event Spine(s) (If Applicable)
Failed COMPACTION_STATUS payload: `{kind:"provider_compaction_boundary", runtime_kind:"CODEX", provider:"codex", source_surface:"codex.context_compaction_abandoned", boundary_key:"codex:<thread>:<itemId>:failed", provider_thread_id, provider_event_id:<itemId>, turn_id:<turnId>, status:"failed", rotation_eligible:false, semantic_compaction:false, error_message:<reason text>}`.

## Bounded Local / Internal Spines (If Applicable)
Registry: register on a non-rotating started projection with a stable id; forget on any rotation-eligible projection with the same stable id (item/completed, raw compaction item or thread/compacted carrying the id). Close-for-turn removes and returns the entries with that turn id; close-all removes all. Entries without a stable id are not tracked (not observed in practice; documented).

## Off-Spine Concerns Around The Spine
None beyond existing logging.

## Ownership Boundaries
Codex-specific; recorder/web untouched.

## Boundary Encapsulation Map
The registry is private to the projector; exposed only via close methods.

## Dependency Rules
Projector has no I/O; turn/lifecycle converters call through the existing converter context.

## Interface Boundary Mapping
- Projector: `closeOpenForTurn(turnId: string, reason): CodexProviderCompactionProjection[]`, `closeAllOpen(reason): CodexProviderCompactionProjection[]`.
- CodexTurnEventConverterContext: add `closeOpenCompactionsForTurn(codexEventName, payload): AgentRunEvent[]` (reason derived from payload.turn.status: interrupted → interrupted, failed → turn_failed, otherwise turn_ended).
- Lifecycle ERROR conversion: when error_effect is terminal, call close for turn (scope turn, with turn id) or all (scope runtime); prepend the resulting events.
- CodexThreadEventConverter: `closeOpenCompactions(reason)` for terminate.
- CodexCompactionSourceSurface: add "codex.context_compaction_abandoned".

## Interface Boundary Check
Same COMPACTION_STATUS contract; web/history already render status "failed" and pair by provider_event_id (C15).

## Main Domain Subject Naming Check
"abandoned" for the surface; "failed" as the status (shared vocabulary).

## Existing Capability / Subsystem Reuse Check
Reuses the projector, recorder, failed phase in web/history, and the reasoning-block closing pattern at turn completion.

## Subsystem / Capability-Area Allocation
backends/codex/events and backends/codex/backend.

## Draft File Responsibility Mapping
See final mapping.

## Reusable Owned Structures Check
None new outside the projector.

## Shared Structure / Data Model Tightness Check
No shared model change.

## Final File Responsibility Mapping
| File (autobyteus-server-ts/) | Change |
|---|---|
| src/agent-execution/backends/codex/events/codex-provider-compaction-status-projector.ts | registry; abandoned surface/payload; closeOpenForTurn/closeAllOpen |
| src/agent-execution/backends/codex/events/codex-turn-event-converter.ts | TURN_COMPLETED: close open compactions for the turn before TURN_COMPLETED |
| src/agent-execution/backends/codex/events/codex-thread-lifecycle-event-converter.ts | terminal ERROR: close for turn/all before ERROR |
| src/agent-execution/backends/codex/events/codex-thread-event-converter.ts | wire context hooks; expose closeOpenCompactions(reason) |
| src/agent-execution/backends/codex/backend/codex-agent-run-backend.ts | terminateRun: dispatch close events before terminateThread/unsubscribe |
| tests (unit): projector registry; turn statuses; terminal errors; terminate; replay of probes/codex-interrupt-*-raw.jsonl and codex-auto-raw.jsonl through converter + accumulator | new/updated |
| tests/e2e (RUN_CODEX_E2E=1): interrupt an automatic compaction through AutoByteus (lowered model_auto_compact_token_limit via thread config), assert started→failed and no archive for it, then a later normal compaction with one archive | new |
| docs/modules (agent_memory.md / Codex runtime doc), TESTING.md | document abandoned-compaction close and the test |

## Applied Patterns (If Any)
Close-on-boundary (same as reasoning blocks); small registry in the existing owner.

## Target Subsystem / Folder / File Mapping
As above; no new folders.

## Folder Boundary Check
All changes stay within backends/codex.

## Concrete Examples / Shape Guidance (Mandatory When Needed)
Real abandon frames (C10): `item/started {"turnId":"01a10877-2907-…","item":{"type":"contextCompaction","id":"01a10877-2924-7da3-ac64-c5b641eeb9d5"}}` then `turn/completed {"turn":{"id":"01a10877-2907-…","status":"interrupted","error":null}}`. Expected events: COMPACTION_STATUS compacting (id 2924…), COMPACTION_STATUS failed (id 2924…, reason interrupted), TURN_COMPLETED. Next turn: started(3c7d…) → completed(3c7d…) → one archive.

## Backward-Compatibility Rejection Log (Mandatory)
No rewrite or display fix of the 32 historical abandoned markers (REQ-C03 rejected). No `/compact` interception (deferred).

## Derived Layering (If Useful)
N/A.

## Change / Refactor Sequence
1. Projector registry + payload + unit tests. 2. Turn-completion hook + replay tests. 3. Terminal error hook. 4. Terminate dispatch. 5. Accumulator/history tests. 6. Gated live E2E. 7. Docs. 8. Run Codex/memory/history/Claude/AGY suites.

## Key Tradeoffs
Close at the boundary we can observe (turn/run end), not by timeout. A completed-status turn with an open item is also closed (defensive; never observed).

## Risks
- AutoByteus process killed hard (no terminate) leaves an open marker (unchanged residual; out of scope).
- Compaction failure from the model side is not reproducible; it would end the turn the same way and be closed by the same hook.
- The live E2E uses Codex quota (a few small turns at a lowered token limit).

## Guidance For Implementation
Emit the failed close before the turn/error ending event. Do not rotate on failed closes. Keep the registry bounded (cleared per close; entries only for open items). Do not change completed-compaction dedupe.
