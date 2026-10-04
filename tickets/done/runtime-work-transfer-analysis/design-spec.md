# Design Spec — Claude Agent SDK compaction detection and raw-trace rotation

## Solution And Approval Basis
- Package runtime-work-transfer-analysis, revision SR-013. Requirements: requirements-doc.md (REQ-022–025 for Claude, REQ-014, DEC-018, DEC-020, CONF-001); approved scope per E57; CONF-001 and handoff authorized per E63.
- Experimental basis (complete, production calling mode): streaming-input probes with pinned SDK 0.3.280 and system CLI 2.1.283 covering manual (E64), auto success and auto failure (E65), interrupt (E66) and long compaction (E67); keepalive source confirmed in the CLI (E68); real-data duplicates (E55).
- Worktree /Users/normy/autobyteus_org/autobyteus-worktrees/runtime-work-transfer-analysis, branch codex/runtime-work-transfer-analysis, base origin/personal @ 39f2dd008c3e4d90d85312f046df13a58172c236, finalization target origin/personal.
- Evidence: investigation-notes.md E53–E62; probes/claude-manual-compact-frames.jsonl.

## Current-State Read
Claude frames reach `ClaudeSession.projectTurnFrame`, which calls the stateless `buildClaudeProviderCompactionEvent`. That function detects a boundary only from `type === "compact_boundary"` or a `compact_boundary` field. Real frames are `{type:"system", subtype:"compact_boundary", compact_metadata}`, so boundaries are never emitted and rotation never runs. Every `status:"compacting"` frame, including the ~30 s repeats, is emitted with its own uuid as `provider_event_id` and its own boundary key. Each repeat therefore becomes a new raw-trace marker and a new frontend/history activity. Metadata is read from top-level fields that do not exist; `status:null, compact_result:"failed"` is ignored.

## Task Size And Architectural Risk (Mandatory)
- task_size: **Medium** — one new owned class plus edits to 5 existing server files within the Claude backend and agent-memory recorder, with tests and a fixture. No web change.
- architectural_risk: **Low** — reuses the existing COMPACTION_STATUS contract, the provider-boundary recorder and the archive rotation already proven for Codex. Event payload additions are optional fields. No schema/version change, no migration, no concurrency or ownership-boundary change. Message-flow uncertainty resolved by experiments E64–E68.
- Escalation trigger: reclassify High if implementation finds that rotation must happen outside an active turn, needs recorder/writer contract changes, or needs frontend pairing changes.

## Architecture Investigation Evidence
E58 production path; E63–E70 complete experiments and turn routing; E59 pairing contract (provider_event_id drives live and history activity identity, identical to Codex's stable-id approach); E60 history reads active traces only; E61 additive persistence; E62 test surface. SDK types: sdk.d.ts:3108-3135 (SDKCompactBoundaryMessage), :4588-4599 (SDKStatusMessage).

## Intended Change
Replace stateless frame matching with a per-session **Claude compaction operation tracker**. It recognizes the real SDK frame shapes, collapses repeated status frames into one operation, and gives every event of an operation the same `provider_event_id` (the operation id). It emits a rotation-eligible boundary with compact_metadata, emits an explicit failure, and closes an abandoned operation when the turn settles.

## Relevant Behavior And Production-Path Map (Mandatory)
| Behavior | Production path after change |
|---|---|
| BEH-008 / REQ-022 | frame `system/compact_boundary` → tracker → `COMPACT_BOUNDARY` (rotation_eligible true) → converter → COMPACTION_STATUS → accumulator → ProviderCompactionBoundaryRecorder → marker + `rotateActiveRawTracesBeforeBoundary` |
| BEH-009 / REQ-023 | first `system/status{status:"compacting"}` opens an operation and emits `STATUS_COMPACTING`; later ones while open are suppressed; boundary and failure reuse the operation id → web/history pair by provider_event_id |
| BEH-010 / REQ-024 | tracker copies compact_metadata.trigger/pre_tokens/post_tokens/duration_ms into boundary params → converter payload → recorder tool_result |
| REQ-025 | `system/status{status:null, compact_result:"failed"}` → `COMPACTION_FAILED` (status "failed", error_message) → non-rotating marker, failed activity. Turn settled with an open operation → tracker close → `COMPACTION_FAILED` with reason `turn_ended_before_boundary` (or `interrupted` / `process_exited`) |
| BEH-011 | unchanged reader: local-memory-run-view-projection-provider shows the active segment (CONF-001) |

## Relevant Supplemental Task Artifacts
probes/claude-manual-compact-probe.mjs and probes/claude-manual-compact-frames.jsonl: real frame shapes; implementation copies the compaction frames into a test fixture.

## Task Design Health Assessment (Mandatory)
- Root cause: compaction recognition was a stateless guess at frame shape, with no notion of an operation. It was tested only from pre-classified events.
- Fix shape: a small stateful owner at the session boundary where frames are first interpreted. This is the right layer: the converter stays a pure mapper, and the recorder stays runtime-neutral.
- Refactor need: remove `buildClaudeProviderCompactionEvent` (clean cut) rather than patching its conditions.
- No changes to shared recorder logic beyond additive optional fields.

## Terminology
- Compaction operation: one Claude compaction from first "compacting" status to boundary, failure or abandonment.
- Operation id: uuid of the frame that opened the operation (first status frame, or the boundary frame when no status preceded it). Used as provider_event_id.
- Boundary frame uuid: the compact_boundary frame's own uuid. Used in the rotation boundary_key, so a replayed frame is idempotent.

## Design Reading Order
Tracker → session wiring → event name → converter payloads → recorder payload fields → tests.

## Legacy Removal Policy (Mandatory)
Remove `buildClaudeProviderCompactionEvent` and its `type === "compact_boundary"` / `compact_boundary`-field heuristics from claude-session-output-events.ts. There is no evidence that those shapes exist. Do not keep a fallback path.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)
Decision: **No migration.** New Claude markers use the existing provider_compaction_boundary trace type and archive manifest. tool_result gains optional post_tokens, duration_ms and error_message; existing readers ignore unknown fields. Historical Claude files are not rewritten (DEC-018). Migration-conventions investigation N/A: no persisted-data transition is designed.

## Data-Flow Spine Inventory
1. Claude frame → tracker → ClaudeSessionEvent. 2. ClaudeSessionEvent → converter → AgentRunEvent COMPACTION_STATUS. 3. AgentRunEvent → (a) memory accumulator → recorder → raw traces/archive; (b) websocket mapper → web activity.

## Primary Execution Spine(s)
ClaudeTurnTracker.turnContent → ClaudeSession.projectTurnFrame → ClaudeCompactionOperationTracker.observeFrame → emitRuntimeEvent → ClaudeSessionEventConverter → AgentRunEvent → RuntimeMemoryEventAccumulator → ProviderCompactionBoundaryRecorder → ExternalRuntimeMemoryWriter.rotateActiveRawTracesBeforeBoundary.

## Spine Narratives (Mandatory)
- Auto compaction: status compacting (open op X, emit started, provider_event_id X) → repeats suppressed → status null success (remember result) → compact_boundary uuid B (emit boundary, provider_event_id X, boundary_key uses B, metadata) → recorder appends marker and rotates → web shows one activity X: started → completed.
- Failure: status compacting (X) → status null failed + compact_error (e.g. "too_few_groups", "API Error: Request was aborted.") → emit failed (X, error_message) → no rotation → the turn continues normally (E65, E66).
- Abandoned: status compacting (X) → turn settles/interrupts/exits with op open → emit failed (X, reason) before turn-settlement events.
- Boundary only: compact_boundary uuid B with no open op → op id = B → emit boundary.

## Spine Actors / Main-Line Nodes
ClaudeTurnTracker (frame routing, unchanged), ClaudeSession (owns tracker), ClaudeCompactionOperationTracker (new), ClaudeSessionEventConverter (mapping), ProviderCompactionBoundaryRecorder (persistence).

## Ownership Map
| Concern | Owner |
|---|---|
| Recognize Claude compaction frames; operation lifecycle and dedupe | ClaudeCompactionOperationTracker (new) |
| Tracker lifetime per session; close on settlement | ClaudeSession |
| Map Claude events to runtime-neutral COMPACTION_STATUS payload | ClaudeSessionEventConverter |
| Persist marker and rotate | ProviderCompactionBoundaryRecorder (unchanged logic) |
| Display pairing | existing web/history projections (unchanged) |

## Thin Entry Facades / Public Wrappers (If Applicable)
N/A.

## Removal / Decommission Plan (Mandatory)
Delete `buildClaudeProviderCompactionEvent` and its import in claude-session.ts. Delete converter tests that encode uuid-per-status identity, and replace them with operation-id tests.

## Return Or Event Spine(s) (If Applicable)
COMPACTION_STATUS websocket events: started (status "compacting"), completed (status "compacted"), failed (status "failed", error_message), all with the same provider_event_id per operation.

## Bounded Local / Internal Spines (If Applicable)
Tracker state machine (frames are `type:"system"` with subtype `status` or `compact_boundary`; everything else is ignored):
| State | Frame / call | Action | Next |
|---|---|---|---|
| Idle | status `compacting` | open op (id = frame uuid); emit STATUS_COMPACTING | Open |
| Idle | `compact_boundary` | op id = boundary uuid; emit COMPACT_BOUNDARY | Idle |
| Idle | status null + compact_result failed | emit COMPACTION_FAILED (op id = frame uuid) | Idle |
| Open | status `compacting` (30 s keepalive, E68) | suppress | Open |
| Open | status null + compact_result success | remember result | Open |
| Open | status null + compact_result failed | emit COMPACTION_FAILED with compact_error | Idle |
| Open | `compact_boundary` | emit COMPACT_BOUNDARY with compact_metadata | Idle |
| Open | closeOpenOperation(reason) on turn settlement | emit COMPACTION_FAILED with reason | Idle |
| any | status `requesting`, status null without compact_result, other subtypes | ignore | unchanged |
A failed compaction does not end the turn (E65); the turn's later frames, including a new compaction, proceed normally. The tracker persists across turns within the session, but closes any open operation at each turn settlement.

## Off-Spine Concerns Around The Spine
Logging: debug-log suppressed heartbeat count per operation. Token-usage events unaffected.

## Ownership Boundaries
Claude-specific frame knowledge stays inside backends/claude. Recorder and web remain runtime-neutral.

## Boundary Encapsulation Map
The tracker is internal to the Claude session; it is not exported outside backends/claude/session.

## Dependency Rules
The tracker depends only on frame objects and ClaudeSessionEventName. Converter does not depend on the tracker. agent-memory does not import Claude code.

## Interface Boundary Mapping
```ts
// backends/claude/session/claude-compaction-operation-tracker.ts
export class ClaudeCompactionOperationTracker {
  observeFrame(frame: Record<string, unknown>, ctx: { turnId: string; sessionId: string }): ClaudeSessionEvent[];
  closeOpenOperation(ctx: { turnId: string; sessionId: string; reason: "turn_ended_before_boundary" | "interrupted" | "process_exited" }): ClaudeSessionEvent[];
}
```
Event params (new/changed):
- STATUS_COMPACTING: `{ sessionId, turnId, operationId, frameUuid, ts? }`
- COMPACT_BOUNDARY: `{ sessionId, turnId, operationId, frameUuid, trigger, pre_tokens, post_tokens, duration_ms, result: "success" }`
- COMPACTION_FAILED (new `"session/compaction/failed"`): `{ sessionId, turnId, operationId, error_message, reason }`

Converter payload (COMPACTION_STATUS):
| Field | status_compacting | compact_boundary | compaction_failed |
|---|---|---|---|
| source_surface | claude.status_compacting | claude.compact_boundary | claude.compaction_failed |
| status | compacting | compacted | failed |
| provider_event_id | operationId | operationId | operationId |
| boundary_key | claude:{session}:claude.status_compacting:{operationId}:{turn} | claude:{session}:claude.compact_boundary:{frameUuid}:{turn} | claude:{session}:claude.compaction_failed:{operationId}:{turn} |
| rotation_eligible | false | true | false |
| metadata | — | trigger, pre_tokens, post_tokens, duration_ms | error_message |

## Interface Boundary Check
COMPACTION_STATUS shape is a superset of today's; web and history already consume status, provider_event_id and error_message (E59).

## Main Domain Subject Naming Check
"Compaction operation" and "operation id" are used consistently; no new "boundary" meaning.

## Existing Capability / Subsystem Reuse Check
Reuses ProviderCompactionBoundaryRecorder dedupe/restart recovery, RunMemoryFileStore rotation and the web/history pairing. Codex's stable-id pattern is mirrored, not shared (different frame semantics).

## Subsystem / Capability-Area Allocation
backends/claude/session (tracker, wiring), backends/claude/events (name, converter), agent-memory (optional fields).

## Draft File Responsibility Mapping
See final mapping.

## Reusable Owned Structures Check
No new shared structure. Optional fields are added to the existing ProviderCompactionBoundaryPayload.

## Shared Structure / Data Model Tightness Check
New optional fields: post_tokens:number|null, duration_ms:number|null, error_message:string|null. No catch-all fields.

## Final File Responsibility Mapping
| File (autobyteus-server-ts/) | Change |
|---|---|
| src/agent-execution/backends/claude/session/claude-compaction-operation-tracker.ts | NEW: frame recognition (`type==="system"` + subtype `status`/`compact_boundary`), state machine, event construction |
| src/agent-execution/backends/claude/session/claude-session.ts | Own one tracker per session; projectTurnFrame calls `observeFrame`; handleTurnSettled calls `closeOpenOperation` (reason from settlement kind) before emitting settlement events |
| src/agent-execution/backends/claude/session/claude-session-output-events.ts | Remove buildClaudeProviderCompactionEvent |
| src/agent-execution/backends/claude/events/claude-session-event-name.ts | Add COMPACTION_FAILED |
| src/agent-execution/backends/claude/events/claude-session-event-converter.ts | Payload builder uses operationId/frameUuid; adds metadata; maps COMPACTION_FAILED |
| src/agent-memory/domain/memory-recording-models.ts | Optional post_tokens, duration_ms, error_message on provider boundary payload/input |
| src/agent-memory/services/provider-compaction-boundary-recorder.ts | Parse and persist the optional fields in tool_result |
| tests/unit/agent-execution/backends/claude/session/claude-compaction-operation-tracker.test.ts | NEW: real-frame fixture; heartbeat collapse; failure; abandoned; boundary-only |
| tests/unit/agent-execution/backends/claude/events/claude-session-event-converter.test.ts | Update to operation-id payloads; failed mapping |
| tests/unit/agent-memory/runtime-memory-event-accumulator.test.ts (or provider-compaction recorder test) | Claude boundary payload rotates once; optional fields persisted; failed marker does not rotate |
| tests fixture (Claude compaction frames copied from ticket probes/claude-streaming-*-frames.jsonl, compaction-relevant frames only) | NEW fixture |
| tests/e2e/runtime/claude-agent-compaction-rotation.e2e.test.ts | NEW, RUN_CLAUDE_E2E-gated: send a message, then `/compact` through the AutoByteus Claude run; assert one rotation-eligible marker with trigger manual and tokens, one archive segment, and one started→completed COMPACTION_STATUS pair sharing provider_event_id |

## Applied Patterns (If Any)
Small explicit state machine; idempotent boundary key.

## Target Subsystem / Folder / File Mapping
As above; no new folders.

## Folder Boundary Check
Tracker sits beside other Claude session helpers (claude-turn-tracker.ts, claude-session-output-events.ts).

## Concrete Examples / Shape Guidance (Mandatory When Needed)
Build test fixtures from the recorded frames in probes/ (real shapes):
1. Manual (claude-streaming-manual-frames.jsonl): status compacting A → status null success → system/init → compact_boundary B {trigger manual, pre 3350, post 1149, duration_ms 12216} → user summary → replay "Compacted" → result. Expected: started(A), completed(A, boundary_key …compact_boundary:B…, metadata); 2 markers; 1 archive segment.
2. Auto with keepalive: frames from claude-streaming-auto-frames.jsonl turn 3, with two extra synthetic status compacting frames (new uuids, +30 s and +60 s) inserted per E68. Expected: the same 2 events and 1 archive; no extra markers.
3. Auto failure (auto turn 2): status compacting X → status null failed "too_few_groups" → assistant reply → result. Expected: started(X), failed(X, error_message "too_few_groups"); no archive; turn completes normally.
4. Interrupt (claude-streaming-interrupt-frames.jsonl): status compacting → status null failed "API Error: Request was aborted." → init → assistant "Compaction canceled." → result. Expected: started, failed; no archive.
5. Process exit with op open: closeOpenOperation("process_exited") → failed; no archive.
6. Boundary without status: compact_boundary B alone → completed(B); 1 archive.

## Backward-Compatibility Rejection Log (Mandatory)
- Not keeping the old shape heuristics (no evidence they exist).
- Not keeping uuid-per-status identity (it causes BEH-009).
- Not adding retroactive cleanup of old duplicate markers (DEC-018).

## Derived Layering (If Useful)
N/A.

## Change / Refactor Sequence
1. Fixture + tracker with unit tests. 2. Event name + converter changes + tests. 3. Recorder optional fields + test. 4. Session wiring; remove the old function. 5. Gated live E2E. 6. Run the existing Claude, Codex, memory and run-history suites (REQ-014).

## Key Tradeoffs
Operation id = first frame uuid (simple, deterministic within a session) versus a synthetic id; chosen because it is provider-derived and also stable when no status precedes the boundary. Rotation key uses the boundary frame uuid, so recorder dedupe is idempotent per real boundary.

## Risks
- Live keepalive repeats were not reproduced (compactions ran 12–23 s); they are covered by CLI source (E68) and real data (E55) and tested with synthetic repeats in recorded frame shapes.
- Claude CLI frame shapes may change; tests pin the shapes observed with SDK 0.3.280 / CLI 2.1.283.
- Rotation mid-turn moves the current turn's earlier records to the archive (E70). This is the existing Codex convention, not new behavior.
- Historical Claude runs keep duplicate markers (accepted, DEC-018).
- The live E2E costs a few cents per run with haiku (RUN_CLAUDE_E2E-gated); drive it by sending `/compact` (E64).

## Guidance For Implementation
Keep the tracker Claude-only and free of persistence. Emit failure close before turn-settlement events, so the web sees the compaction end before the turn ends. Do not touch Codex code paths. Confirm that the started → completed activity pairing works in the web store using an existing compaction activity test, if one exists.
