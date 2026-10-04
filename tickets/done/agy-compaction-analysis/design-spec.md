# Design Spec — AGY compaction detection and raw-trace rotation

## Solution And Approval Basis
Package agy-compaction-analysis, SR-002. Requirements approved (U03, U04): requirements-doc.md REQ-A01–A05, DEC-A01–A05. Worktree /Users/normy/autobyteus_org/autobyteus-worktrees/agy-compaction-analysis, branch codex/agy-compaction-analysis, base origin/personal @ 517409d40, finalization target origin/personal. Evidence: investigation-notes.md A01–A20, probes/.

## Current-State Read
The AGY backend spawns `agy … --input-format stream-json --output-format stream-json`. AgyStreamEventConverter maps `agent_response` and `tool` steps and returns [] for every other step_type, including `checkpoint`. AGY therefore never emits COMPACTION_STATUS, the shared provider-boundary recorder never writes a marker, and AGY raw traces never rotate.

## Task Size And Architectural Risk (Mandatory)
- task_size: **Medium** — one new payload builder, a converter branch, a version probe in the capability module, version wiring in factory → backend → converter, plus unit, fake-CLI E2E and gated live E2E tests and a doc update; all within the AGY backend and the existing capability module.
- architectural_risk: **Low** — reuses the shipped COMPACTION_STATUS contract, recorder and rotation (A18). Additive event only, no schema/migration, no concurrency or ownership change. Stream shape proven live three times (A15, A17).
- Escalation trigger: High if the checkpoint step turns out to arrive outside an active turn, or the recorder contract must change.

## Architecture Investigation Evidence
A01–A05 (launch, parser, converter, recorder, capsule); A06–A09 (AGY storage and real data); A10–A14 (no manual trigger); A15–A17 (stream signal, reproducible); A18–A20 (reuse path, wiring points, test infrastructure).

## Intended Change
When the run's AGY CLI version is ≥ 1.2.16, the converter maps `step_update{step_type:"checkpoint", state:"DONE"}` to one COMPACTION_STATUS event with a rotation-eligible provider_compaction_boundary payload. The existing recorder writes the marker and rotates raw traces; web and history show one completed compaction.

## Relevant Behavior And Production-Path Map (Mandatory)
| Behavior | Path |
|---|---|
| BEH-A1/REQ-A01 | agy stdout → AgyStreamProcess → parseAgyStreamMessage (step_update) → AgyStreamEventConverter.convert → checkpoint branch → COMPACTION_STATUS → RuntimeMemoryEventAccumulator → ProviderCompactionBoundaryRecorder → marker + rotateActiveRawTracesBeforeBoundary |
| BEH-A2/REQ-A02 | same COMPACTION_STATUS → agent-run-event-message-mapper → websocket → web compaction activity (status "compacted" → completed); history replay from the marker |
| REQ-A04 | AgyAgentRunBackendFactory.assertAvailable → readAntigravityCliVersion() → `compactionDetection` flag in the backend context → converter constructor |
| BEH-A4 | unchanged reader (active segment only), as for Claude/Codex |

## Relevant Supplemental Task Artifacts
probes/agy-stream-auto-compaction-twice-raw.jsonl and probes/agy-stream-auto-compaction-raw.jsonl (real checkpoint frames); probes/agy-stream-manual-compact-raw.jsonl (fake `/compact`, for the known-limitation note).

## Task Design Health Assessment (Mandatory)
The root cause is a missing mapping, not a structural defect. The converter is the correct owner for AGY step semantics. The payload builder mirrors the Claude helper so that runtime-specific identity stays in the runtime folder. The version gate lives at the existing capability probe (single owner of CLI facts).

## Terminology
Checkpoint step: AGY's `step_type:"checkpoint"` step update; equals one automatic compaction on AGY ≥ 1.2.16.

## Design Reading Order
Payload builder → converter branch → version probe → factory/backend wiring → tests → docs.

## Legacy Removal Policy (Mandatory)
Nothing to remove; `checkpoint` was silently ignored and becomes handled. No compatibility shim.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)
No migration. New markers use the existing provider_compaction_boundary trace type and archive manifest; old AGY raw traces untouched. Migration-conventions investigation N/A (no persisted-data transition).

## Data-Flow Spine Inventory
Stream frame → converter → AgentRunEvent → (memory recorder → raw traces/archive) and (websocket → web activity).

## Primary Execution Spine(s)
AgyStreamProcess.acceptStdout → listener in AgyAgentRunBackend → AgyStreamEventConverter.convert → emitted AgentRunEvents → RuntimeMemoryEventAccumulator.recordRunEvent → ProviderCompactionBoundaryRecorder.record.

## Spine Narratives (Mandatory)
- Normal: turn active → `checkpoint` DONE step 9 (duration 7.29 s) → COMPACTION_STATUS {provider antigravity, boundary_key agy:<conversation>:checkpoint:9, status compacted, rotation_eligible true, duration_ms 7290} → marker appended, earlier active records archived → agent_response continues after the marker → web shows one completed compaction.
- Second compaction (step 18): same flow; new boundary key; second archive.
- Duplicate step: the converter remembers emitted checkpoint indices per conversation → no second event; the recorder also dedupes by boundary_key.
- Gate off (version < 1.2.16 or unknown): checkpoint ignored exactly as today.
- Non-DONE checkpoint state (never observed): ignored; no event.

## Spine Actors / Main-Line Nodes
AgyAgentRunBackendFactory, antigravity-cli-capability (version), AgyAgentRunBackend, AgyStreamEventConverter, buildAgyCompactionStatusPayload (new), shared recorder.

## Ownership Map
| Concern | Owner |
|---|---|
| Reading the AGY CLI version | runtime-management/antigravity-cli-capability.ts (new readAntigravityCliVersion, cached per process; short timeout) |
| Deciding whether detection is on | AgyAgentRunBackendFactory (compares to the minimum 1.2.16) |
| Recognizing checkpoint steps, idempotence | AgyStreamEventConverter |
| Runtime-neutral payload | backends/antigravity/stream/agy-compaction-status-payload.ts (new) |
| Marker + rotation | existing ProviderCompactionBoundaryRecorder |

## Thin Entry Facades / Public Wrappers (If Applicable)
N/A.

## Removal / Decommission Plan (Mandatory)
None.

## Return Or Event Spine(s) (If Applicable)
COMPACTION_STATUS: `{kind:"provider_compaction_boundary", runtime_kind:"ANTIGRAVITY", provider:"antigravity", source_surface:"antigravity.checkpoint", boundary_key:"agy:<conversation_id>:checkpoint:<step_index>", provider_session_id:<conversation_id>, provider_event_id:"checkpoint:<step_index>", provider_timestamp:null, turn_id, status:"compacted", trigger:"auto", rotation_eligible:true, semantic_compaction:false, duration_ms:round(duration_seconds*1000) or null}`.

## Bounded Local / Internal Spines (If Applicable)
Converter state: `Set<number>` of emitted checkpoint step indices for this conversation, kept for the converter's lifetime (not cleared on startTurn).

## Off-Spine Concerns Around The Spine
Log once per run when detection is disabled because of the version (info level), naming the detected version.

## Ownership Boundaries
AGY-specific knowledge stays in backends/antigravity and the AGY capability module; recorder/web stay runtime-neutral.

## Boundary Encapsulation Map
The version probe is exported from the capability module; the payload builder is internal to the AGY stream folder.

## Dependency Rules
The converter does not call the CLI; it receives a boolean. The capability module does not import backend code.

## Interface Boundary Mapping
- `readAntigravityCliVersion(): Promise<string | null>` — runs `agy --version` (bounded, ~3 s), returns a trimmed version string or null; cached per process (cache cleared only on process restart; AGY updates are picked up after a server restart, acceptable).
- `isAgyCompactionDetectionSupported(version: string | null): boolean` — semver-style numeric compare ≥ 1.2.16; null/unparsable → false.
- AgyStreamEventConverter constructor: add an options parameter `{ compactionDetection: boolean }` (default false).
- `buildAgyCompactionStatusPayload(input: { conversationId; turnId; stepIndex; durationSeconds: number | null }): Record<string, unknown>`.

## Interface Boundary Check
COMPACTION_STATUS payload is the same contract Claude/Codex use (A18); the web handles status "compacted" as completed, and provider_event_id pairs a single-phase activity.

## Main Domain Subject Naming Check
"checkpoint" stays AGY vocabulary at the stream edge; downstream it is a provider compaction boundary.

## Existing Capability / Subsystem Reuse Check
Reuses recorder, rotation, websocket mapping and web projection; mirrors the Claude payload helper pattern.

## Subsystem / Capability-Area Allocation
backends/antigravity (stream, backend), runtime-management (capability).

## Draft File Responsibility Mapping
See final mapping.

## Reusable Owned Structures Check
No new shared structures.

## Shared Structure / Data Model Tightness Check
No shared model changes; the recorder already accepts duration_ms (Claude fix).

## Final File Responsibility Mapping
| File (autobyteus-server-ts/) | Change |
|---|---|
| src/runtime-management/antigravity-cli-capability.ts | add readAntigravityCliVersion() (cached) and isAgyCompactionDetectionSupported(); constant AGY_COMPACTION_DETECTION_MIN_VERSION = "1.2.16" |
| src/agent-execution/backends/antigravity/backend/agy-agent-run-backend-factory.ts | on create and restore, read the version and put `compactionDetection` in the backend context; log once when off |
| src/agent-execution/backends/antigravity/backend/agy-agent-run-context.ts / agy-agent-run-backend.ts | carry the flag; pass `{ compactionDetection }` to the AgyStreamEventConverter |
| src/agent-execution/backends/antigravity/stream/agy-stream-event-converter.ts | checkpoint branch (state DONE, gate on, not yet emitted) → COMPACTION_STATUS; otherwise [] |
| src/agent-execution/backends/antigravity/stream/agy-compaction-status-payload.ts | NEW payload builder |
| tests/unit/…/antigravity/stream/agy-stream-event-converter.test.ts (or a new agy-compaction test) | real frames from probes: two checkpoints → two events; duplicate → one; gate off → none; non-DONE → none; payload fields |
| tests/unit/runtime-management/antigravity-cli-capability (version) | parse/compare: "1.2.16", "1.2.17", "1.10.0" on; "1.2.15", "", "garbage", null off |
| tests/unit/agent-memory/runtime-memory-event-accumulator.test.ts | AGY payload rotates once; duplicate no-op |
| tests/fixtures/agy-failure-cli.mjs (or a sibling scripted fixture) + tests/e2e/runtime/agy-compaction-rotation-transport.e2e.test.ts | scripted CLI reporting version 1.2.16 and emitting init → user_input → checkpoint DONE → agent_response → result; assert one archive segment, one completed COMPACTION_STATUS over the websocket, history starts at the boundary (RUN_AGY_FAILURE_E2E convention) |
| tests/e2e/runtime/agy-compaction-rotation-live.e2e.test.ts | RUN_AGY_COMPACTION_E2E=1: real agy, gemini-3.8-flash-low, send ~90K-token messages until a checkpoint (expected on turn 5; cap at 8 turns); assert ≥1 archive and one completed activity per checkpoint |
| docs/modules/antigravity_cli_runtime.md, docs/modules/agent_memory.md, TESTING.md | document checkpoint → boundary, version gate, the `/compact` limitation, new test gates |

## Applied Patterns (If Any)
Adapter mapping at the stream edge; capability gate at the CLI probe.

## Target Subsystem / Folder / File Mapping
As above; no new folders.

## Folder Boundary Check
The payload builder sits beside the other AGY stream helpers.

## Concrete Examples / Shape Guidance (Mandatory When Needed)
Input frame (real, A17): `{"event":"step_update","step_update":{"conversation_id":"5bd8c148-aa5c-4f18-a0e8-1c2f52782771","step_index":9,"state":"DONE","step_type":"checkpoint","duration_seconds":7.293076}}`. Output payload: boundary_key `agy:5bd8c148-aa5c-4f18-a0e8-1c2f52782771:checkpoint:9`, provider_event_id `checkpoint:9`, duration_ms 7293, status compacted, rotation_eligible true. The step arrives after `user_input` and before `agent_response` inside the active turn (A15/A17), so the converter's turn guard holds.

## Backward-Compatibility Rejection Log (Mandatory)
No detection on AGY < 1.2.16 (unproven; DEC-A04). No retroactive rotation of old AGY raw traces. No parsing of AGY transcript files.

## Derived Layering (If Useful)
N/A.

## Change / Refactor Sequence
1. Version probe + tests. 2. Payload builder + converter branch + unit tests with real frames. 3. Factory/context/backend wiring. 4. Accumulator test. 5. Scripted fake-CLI E2E. 6. Gated live E2E. 7. Docs. 8. Run the existing AGY, Claude, Codex, memory and history suites.

## Key Tradeoffs
A version gate (provable) over content verification via AGY transcript files (an undocumented layout plus extra I/O). A completed-only activity, because AGY sends no start signal.

## Risks
- Compaction failure reporting unknown (not reproducible); a failed compaction would simply produce no checkpoint DONE → no rotation (safe).
- AGY may change the stream shape in future versions; the gate is a minimum, so newer versions are enabled. The live E2E and scripted fixture guard against regressions.
- The live E2E consumes AGY quota (~5 large turns on flash-low, ~45–70 s).
- `/compact` sent to AGY is still answered falsely by the model (known limitation, out of scope; follow-up candidate).

## Guidance For Implementation
Keep the checkpoint mapping strictly to state DONE. Do not read AGY brain/transcript files for this feature. Convert duration_seconds to integer ms. Keep the version probe failure-tolerant (unreadable → detection off, run still starts).
