# Design Spec

## Current-State Read

The incident path is a restored AutoByteus runtime/team member that has a persisted assistant native tool-call message without a matching native tool-result message. The concrete run is `kids_coloring_story_team_fe532f9ee3904aa888142fa3bc8c0992` / `coloring_page_illustrator_879c669a220042579c20756deff63257`; its `working_context_snapshot.json` contains assistant `tool_calls=[call_00_sV5xrttWiaZHhUHAKgo88012]` for `generate_image`, followed directly by user retry messages. DeepSeek/OpenAI-compatible chat rejects this with HTTP 400 because a native assistant `tool_calls` message must be immediately followed by tool messages for each `tool_call_id`.

Current code path:

- `WorkingContextSnapshotRestoreStep` calls `WorkingContextSnapshotBootstrapper.bootstrap(...)` during restored runtime startup.
- `WorkingContextSnapshotBootstrapper` trusts any schema-valid cached snapshot, deserializes it, calls `memoryManager.resetWorkingContextSnapshot(...)`, and returns. Schema validity does not imply provider protocol validity.
- `LLMRequestAssembler.prepareRequest(...)` ensures system prompt, runs pending compaction, appends the new user message, reads working-context messages, renders through `OpenAIChatRenderer` / `DeepSeekChatRenderer`, and then `LlmPhase` streams to the provider.
- `OpenAIChatRenderer` renders `ToolCallPayload` as native assistant `tool_calls` and `ToolResultPayload` as native `role: tool` messages. It does not repair or validate pairing.
- `AgentTurnRunner` already handles graceful `AgentInterruptionError` by appending an `operation_boundary` raw trace and calling `MemoryManager.projectWorkingContextForNextLlm(...)`, but abrupt computer shutdown does not run that catch path.
- Existing `working-context-llm-safe-projector.ts` fences unsafe tool-call protocol by converting unsafe assistant native tool-call messages into assistant text. The user approved a different recovery shape: preserve native tool-call protocol and close incomplete calls with a synthetic interrupted/unknown tool result.

Constraints:

- Do not invent successful tool output.
- Do not remove raw audit evidence of the original incomplete `tool_call`.
- Do not mention `AutoByteus` in the provider-visible synthetic result.
- Completed native tool-call/result pairs must remain native and unchanged.
- A run already poisoned by failed retry user messages must still recover.
- The fixed runtime must resume after one additional user prompt and kick off LLM execution again with provider-safe history.

## Intended Change

Add an authoritative working-context native tool-protocol repair step that runs before provider rendering and during snapshot restore. When it finds an assistant native tool-call message whose required immediate tool result is absent, it inserts a synthetic native `ToolResultPayload` immediately after the assistant tool-call message for each missing call id. The synthetic result content is:

```text
Tool execution was interrupted by runtime shutdown before a result was recorded.
Completion status is unknown. No tool output is available in memory.
Do not assume the requested output exists. Retry or verify only if the user asks or task requires it.
```

This keeps provider-visible history valid while telling the model the abandoned tool request has unknown completion state and no usable output. Raw traces keep the original tool call, and the repair records a durable recovery marker.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix / robustness behavior change.
- Current design issue found (`Yes`/`No`/`Unclear`): Yes.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing Invariant, with secondary Boundary Or Ownership Issue.
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes, narrow refactor.
- Evidence: The snapshot cache is schema-valid but provider-invalid. The request assembler and bootstrapper both bypass the existing interruption-only projection path. The screenshot confirms the provider rejects the replayed history.
- Design response: Make provider-safe native tool protocol an invariant owned by memory/working-context preparation, not by individual providers. Reuse the existing memory/projection capability area, but change the unsafe-tool repair shape from text-fencing to synthetic interrupted/unknown tool results.
- Refactor rationale: Keeping the repair only in `AgentTurnRunner` leaves crash/shutdown, stale snapshots, compaction preflight, and request assembly bypasses. The invariant belongs at the working-context boundary used by restore and LLM request preparation.
- Intentional deferrals and residual risk, if any: UI presentation of the old activity card's `PARSED` state may need a later polish if the current UI does not render the recovery marker as an interrupted tool. The in-scope runtime behavior does not depend on that UI polish.

## Terminology

- `Native tool-call protocol`: provider-visible assistant `tool_calls` messages and matching `role: tool` result messages keyed by `tool_call_id`.
- `Provider-safe working context`: a working-context message sequence that can be rendered for OpenAI-compatible providers without unmatched native tool calls or orphan native tool results.
- `Synthetic interrupted/unknown tool result`: a generated tool result message used only to close a previously persisted but incomplete native tool call after crash/shutdown or interruption. It explicitly does not claim success.

## Design Reading Order

1. Follow the restore/user-message request spine.
2. Observe where the working-context protocol repair owner sits.
3. Read file responsibility mapping for concrete implementation points.
4. Read migration and coverage requirements.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: decommission the old behavior where incomplete native tool-call payloads are converted into plain assistant text as the primary provider-safety repair. Replace it with synthetic interrupted/unknown native tool-result insertion.
- No dual repair modes should remain. The steady-state repair shape is synthetic tool result insertion for missing tool results.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | Restored team/member or standalone agent receives a follow-up user message | Provider-safe LLM stream starts | Agent runtime + LLM request assembly, with memory owning the invariant | This is the user-visible failing path. |
| DS-002 | Primary End-to-End | Runtime startup restores working-context snapshot | Persisted provider-safe working context | Working-context snapshot bootstrapper using memory repair boundary | Prevents a schema-valid cached snapshot from staying poisoned after restart. |
| DS-003 | Bounded Local | Working-context message scan | Repaired message sequence and repair report | Working-context tool-protocol repairer | Encapsulates the native tool-call pairing invariant. |
| DS-004 | Return/Event | Repair detects missing result | Raw recovery marker / persisted snapshot | Memory manager | Preserves auditability and makes recovery idempotent/inspectable. |

## Primary Execution Spine(s)

DS-001:

`User follow-up prompt -> AgentTurnRunner/LlmPhase -> LLMRequestAssembler -> MemoryManager provider-safety repair -> Renderer -> DeepSeek/OpenAI-compatible LLM stream`

DS-002:

`Runtime bootstrap -> WorkingContextSnapshotRestoreStep -> WorkingContextSnapshotBootstrapper -> MemoryManager provider-safety repair -> persisted working-context snapshot`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | After restart, the user sends one more message. Request assembly repairs any incomplete native tool protocol before compaction/rendering and again before final render as a backstop. The provider receives a valid assistant tool-call + synthetic tool-result + user message sequence and can start streaming again. | User prompt, LLM request assembly, working context, provider renderer | `LLMRequestAssembler` for request sequencing; `MemoryManager` for working-context invariant | Tool-protocol repairer, raw recovery marker, renderer shape validation |
| DS-002 | During startup, a schema-valid cached snapshot is not trusted blindly. After restore, the memory boundary repairs any incomplete native tool-call protocol and persists the repaired snapshot before the runtime becomes usable. | Snapshot store, bootstrapper, memory manager, working context | `WorkingContextSnapshotBootstrapper` delegates invariant enforcement to `MemoryManager` | Snapshot schema gate, raw trace audit marker |
| DS-003 | The repairer scans messages, identifies assistant native tool-call payloads, finds immediate native tool results, inserts missing synthetic interrupted/unknown results in the required position, and reports repaired call ids. | Message sequence, tool-call payload, tool-result payload | New/renamed working-context tool-protocol repairer | Completed-result lookup, orphan result handling, idempotency |
| DS-004 | When repair happens, memory persists the repaired snapshot and records an operation-boundary/recovery raw trace so later diagnostics can see why synthetic result messages exist. | Repair report, raw trace store, snapshot store | `MemoryManager` | Duplicate-marker avoidance, provenance metadata |

## Spine Actors / Main-Line Nodes

- Restored agent/team member runtime.
- `WorkingContextSnapshotBootstrapper`.
- `LLMRequestAssembler`.
- `MemoryManager`.
- Working-context native tool-protocol repairer.
- OpenAI-compatible/DeepSeek renderer and LLM provider.

## Ownership Map

- `WorkingContextSnapshotBootstrapper` owns snapshot restore sequencing and deciding cache vs rebuild. It must call the memory invariant after cache restore.
- `LLMRequestAssembler` owns pre-provider request assembly order. It must ensure the context is provider-safe before compaction and final render.
- `MemoryManager` owns working-context state, snapshot persistence, raw-trace audit markers, and the public boundary for provider-safety repair.
- Working-context tool-protocol repairer owns pure message-sequence transformation and detection of missing/unsafe native tool protocol.
- Renderers own provider-specific formatting only; they must not silently repair memory history.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `WorkingContextSnapshotRestoreStep` | `WorkingContextSnapshotBootstrapper` + `MemoryManager` | Bootstrap step in agent lifecycle | Tool-protocol repair logic |
| `LlmPhase` | `LLMRequestAssembler` + provider LLM | Runtime phase orchestration | Message protocol repair policy |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| Text-fencing as the primary repair for incomplete native tool calls in `working-context-llm-safe-projector.ts` | User-approved design is to close the native protocol with synthetic interrupted/unknown tool results, not hide the assistant tool call as plain text | Working-context tool-protocol repairer | In This Change | Existing explicit interruption tests must be updated to the new shape. |
| Restore path that trusts schema-valid snapshots as provider-safe | Schema validity is insufficient after crash/shutdown | `MemoryManager.ensureWorkingContextToolProtocolSafeForNextLlm(...)` called from bootstrapper | In This Change | Not a compatibility mode; it is the new invariant. |
| Request assembly path that renders without protocol preflight | It allows already-poisoned snapshots to reach provider | Pre-compaction and pre-render repair in `LLMRequestAssembler` | In This Change | Required for already retried runs. |

## Return Or Event Spine(s) (If Applicable)

DS-004:

`Repair report -> MemoryManager recovery marker -> raw trace store -> snapshot persistence -> later diagnostics/readback`

The repair marker should be durable but should not be confused with a real successful tool execution. Use a distinct source event such as `WorkingContextToolProtocolRecovery` and provenance metadata on inserted synthetic messages.

## Bounded Local / Internal Spines (If Applicable)

Parent owner: working-context tool-protocol repairer.

`Scan messages -> classify assistant tool calls and immediate tool results -> resolve completed known results if provided -> synthesize missing interrupted/unknown results -> skip/reinsert immediate result block -> emit repaired messages and repair details`

This bounded local spine matters because provider validity depends on exact adjacency/order of messages, not merely on whether a result exists somewhere later in history.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Snapshot schema validation | DS-002 | Bootstrapper | Decide whether cached snapshot is deserializable/current | Separate structural schema from provider protocol safety | If mixed with protocol repair, schema validity may again be mistaken for LLM validity |
| Raw recovery marker | DS-004 | MemoryManager | Record that a synthetic interrupted/unknown tool result was inserted | Auditability and duplicate detection | If done in renderer, memory and UI/debug traces remain misleading |
| Completed raw result lookup | DS-003, DS-004 | MemoryManager | If a real tool result exists in raw traces but not snapshot, prefer the real result over synthetic unknown | Handles partial persistence windows | If ignored, real completed facts may be degraded to unknown |
| Provider rendering | DS-001 | Renderer | Format already-safe messages for provider API | Provider adapters stay simple and deterministic | If renderer repairs, the persisted working context remains poisoned |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Working-context provider safety | Memory / working context | Extend | Existing memory manager already owns context projection and snapshot persistence | N/A |
| Pure tool-protocol sequence repair | Existing `working-context-llm-safe-projector.ts` capability | Extend/rename or replace in place | Classification logic already exists but output shape changes | N/A |
| Provider-specific message rendering | LLM prompt renderers | Reuse unchanged | Renderers should format safe messages, not own recovery policy | N/A |
| E2E resume validation | API/E2E coverage | Extend | Needs durable regression coverage for restore + one user prompt + LLM kickoff | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Memory / working context | Provider-safe message invariant, repair persistence, raw recovery markers | DS-001, DS-002, DS-003, DS-004 | MemoryManager | Extend | Central owner for snapshot and raw traces. |
| Agent request assembly | Sequencing user input, compaction, safety preflight, render | DS-001 | LLMRequestAssembler | Extend | Must call memory invariant before compaction and render. |
| Snapshot restore | Cache restore then invariant enforcement | DS-002 | WorkingContextSnapshotBootstrapper | Extend | Do not add repair logic here directly. |
| LLM provider rendering | Formatting native tool calls/results | DS-001 | OpenAI/DeepSeek renderers | Reuse unchanged | Renderer must receive safe messages. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/memory/working-context-tool-protocol-repairer.ts` or replacement of `working-context-llm-safe-projector.ts` | Memory / working context | Tool-protocol repairer | Pure transformation of `Message[]` into provider-safe sequence plus repair report | Keeps protocol classification/repair isolated from persistence | Uses `Message`, `ToolCallPayload`, `ToolResultPayload`, `ToolResultEvent` |
| `autobyteus-ts/src/memory/memory-manager.ts` | Memory / working context | MemoryManager | Public repair boundary, raw marker persistence, completed raw result lookup, snapshot reset | Owns persisted state and auditability | Uses repair result/types |
| `autobyteus-ts/src/memory/restore/working-context-snapshot-bootstrapper.ts` | Snapshot restore | Bootstrapper | Invoke memory provider-safety repair after cached snapshot restore and before return | Restore sequencing only | Uses MemoryManager boundary |
| `autobyteus-ts/src/agent/llm-request-assembler.ts` | Agent request assembly | Request assembler | Invoke memory provider-safety repair before compaction and before final render | Last request-preparation owner before provider | Uses MemoryManager boundary |
| `autobyteus-ts/src/agent/loop/agent-turn-runner.ts` | Agent runtime loop | Turn runner | Continue using memory projection/repair on explicit interruption | Keeps explicit interruption behavior aligned | Uses MemoryManager boundary |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Synthetic interrupted/unknown result content | Tool-protocol repairer exported constant | Memory / working context | Same wording must be used by restore, request preflight, and interruption repair | Yes | Yes | Provider-specific string scattered across callers |
| Repair detail/report type | Tool-protocol repairer | Memory / working context | Memory manager needs repaired call ids/turn ids for raw markers and idempotency | Yes | Yes | Generic untyped metadata blob |
| Native tool-call classification | Tool-protocol repairer | Memory / working context | One implementation prevents divergent pairing rules | Yes | Yes | Renderer-side validation clone |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `WorkingContextToolProtocolRepairResult` | Yes | Yes | Low | Fields should be limited to `messages`, `didRepair`, and per-call repair details needed by memory. |
| `InterruptedToolResultRepair` detail | Yes | Yes | Low | Include `toolCallId`, `toolName`, `turnId`, `source` (`synthetic_interrupted` or `raw_completed_result`), and inserted content/result. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/memory/working-context-tool-protocol-repairer.ts` | Memory / working context | Tool-protocol repairer | Scan and repair provider-visible native tool-call/result adjacency; insert synthetic interrupted/unknown tool results for missing results; handle orphan unsafe tool results safely; return repair report | Pure deterministic transform, testable without stores/providers | Yes |
| `autobyteus-ts/src/memory/memory-manager.ts` | Memory / working context | MemoryManager | Expose `ensureWorkingContextToolProtocolSafeForNextLlm(...)`; derive completed raw results; append recovery markers; reset/persist snapshot when repaired | Authoritative state/audit boundary | Yes |
| `autobyteus-ts/src/memory/restore/working-context-snapshot-bootstrapper.ts` | Snapshot restore | Bootstrapper | After valid cache restore, call memory repair boundary before returning | Keeps restore cache path safe | No new structure beyond boundary call |
| `autobyteus-ts/src/agent/llm-request-assembler.ts` | Request assembly | LLMRequestAssembler | Call memory repair boundary before compaction and before render in both user-message and tool-history-only modes | Covers already-poisoned contexts and compaction preflight | No new structure beyond boundary call |
| `autobyteus-ts/src/agent/loop/agent-turn-runner.ts` | Runtime loop | AgentTurnRunner | Keep explicit interruption recovery routed through memory repair; update expectations to synthetic result shape | Aligns graceful interruption and crash recovery | No |
| `autobyteus-ts/tests/...` | Test suites | Unit/integration/API-E2E coverage | Durable coverage for missing result + restart + one additional user prompt + LLM kickoff | Required regression protection | Test fixtures use shared constant or exact expected text |

## Ownership Boundaries

- MemoryManager is the authoritative public boundary for making a working context provider-safe. Callers above memory must not import the repairer directly.
- The repairer is an internal owned mechanism under memory. It must not know stores, snapshots, runtime state, or providers.
- Bootstrapper and request assembler must depend only on MemoryManager's repair boundary, not on the repairer internals.
- Renderers must not repair or mutate history. If they receive unsafe messages after this change, that is a caller invariant failure and should be caught by tests.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `MemoryManager.ensureWorkingContextToolProtocolSafeForNextLlm(...)` | Tool-protocol repairer, completed result lookup, recovery marker, snapshot persistence | Bootstrapper, request assembler, turn runner | Bootstrapper/request assembler importing repairer and mutating snapshots directly | Add explicit options/result fields to MemoryManager boundary |
| `LLMRequestAssembler.prepareRequest(...)` / `prepareToolContinuationRequest(...)` | Safety preflight sequencing before compaction/render | LlmPhase | LlmPhase calling renderer on memory messages directly | Extend assembler package/result shape |
| `WorkingContextSnapshotBootstrapper.bootstrap(...)` | Cache restore vs rebuild sequencing | Restore step | Restore step reading snapshot store and repairing directly | Add bootstrapper option or internal call to MemoryManager |

## Dependency Rules

Allowed:

- `WorkingContextSnapshotBootstrapper -> MemoryManager` repair boundary.
- `LLMRequestAssembler -> MemoryManager` repair boundary.
- `MemoryManager -> working-context-tool-protocol-repairer`.
- Repairer -> message/payload types only.
- Renderers -> message/payload types only.

Forbidden:

- Renderer-specific repair logic for this invariant.
- Bootstrapper or request assembler importing the repairer directly.
- Fake successful tool results for missing calls.
- Deleting original raw `tool_call` traces to hide the issue.
- Keeping both text-fence and synthetic-result repair modes as behavior switches.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `repairWorkingContextToolProtocol(messages, options)` | Pure message sequence | Return provider-safe messages and repair report | `Message[]`; optional completed results by call id | Internal to memory. |
| `MemoryManager.ensureWorkingContextToolProtocolSafeForNextLlm(input?)` | Persisted working context | Enforce provider-safe invariant, persist repaired snapshot, record marker | Optional reason/source/scope; no ambiguous run ids | Public boundary for callers. |
| `LLMRequestAssembler.prepareRequest(...)` | Provider request package | Sequence safety repair, user append, render | `LLMUserMessage|string`, optional `turnId`, optional system prompt | Must call safety repair before compaction and before final render. |
| `WorkingContextSnapshotBootstrapper.bootstrap(...)` | Snapshot restore | Restore cache/rebuild and enforce safety | `MemoryManager`, system prompt, restore options | No repair internals exposed. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| Repairer function | Yes | Yes | Low | Keep pure; do not pass stores. |
| MemoryManager repair boundary | Yes | Yes | Low | Options should name source/reason rather than generic flags. |
| Request assembler methods | Yes | Yes | Low | Do not expose provider repair details to LlmPhase. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Provider-safe repair owner | `WorkingContextToolProtocolRepairer` / `repairWorkingContextToolProtocol` | Yes | Low | Prefer this over vague `sanitizer`. |
| Synthetic recovery result | `SYNTHETIC_INTERRUPTED_TOOL_RESULT_CONTENT` | Yes | Low | Keep wording product-neutral. |
| Memory boundary | `ensureWorkingContextToolProtocolSafeForNextLlm` | Yes | Low | Name explicitly mentions tool protocol and next LLM. |

## Applied Patterns (If Any)

- Pure transformer: the repairer is a deterministic transform over message arrays plus optional completed-result facts.
- Boundary-owned invariant: MemoryManager owns persistence and audit side effects around the pure transformer.
- Adapter remains adapter: OpenAI/DeepSeek renderers continue only adapting message objects to provider payloads.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/memory/working-context-tool-protocol-repairer.ts` | File | Memory internal repairer | Provider-safe native tool protocol transform | Same folder as working-context snapshot/projector concerns | Store access, provider clients, runtime state |
| `autobyteus-ts/src/memory/memory-manager.ts` | File | MemoryManager | Public repair boundary, snapshot persistence, raw markers | Existing owner of working context and raw traces | Provider rendering details |
| `autobyteus-ts/src/memory/restore/working-context-snapshot-bootstrapper.ts` | File | Snapshot bootstrapper | Invoke memory repair after cache restore | Existing restore owner | Protocol scan implementation |
| `autobyteus-ts/src/agent/llm-request-assembler.ts` | File | Request assembler | Pre-compaction and pre-render safety call | Existing provider request assembly owner | Repair algorithm |
| `autobyteus-ts/src/llm/prompt-renderers/openai-chat-renderer.ts` | File | Provider renderer | No intended change except possibly tests proving it receives safe messages | Renderer remains simple | Recovery policy |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `autobyteus-ts/src/memory` | Persistence/state + memory-owned off-spine concerns | Yes | Low | Repair belongs with working context because it mutates/persists memory state. |
| `autobyteus-ts/src/agent` | Runtime/request orchestration | Yes | Low | Assembler calls memory boundary only. |
| `autobyteus-ts/src/llm/prompt-renderers` | Provider adapter | Yes | Low | No repair logic should move here. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Incident repair | `assistant(tool_calls=[call_123 generate_image]) -> tool(call_123, "Tool execution was interrupted...") -> user("please continue there was a shutdown")` | `assistant(tool_calls=[call_123]) -> user("please continue")` | Shows the exact provider protocol requirement and the approved synthetic result. |
| Audit preservation | Raw traces keep original `tool_call call_123`; raw marker records recovery; snapshot gets synthetic tool result | Delete raw `tool_call` or pretend image generation succeeded | Preserves truth and debuggability. |
| Boundary placement | Bootstrapper/assembler call `MemoryManager.ensure...`; MemoryManager calls repairer | Renderer patches malformed payload silently | Ensures persisted state is repaired, not only one outgoing payload. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep old text-fencing projector as an alternate mode | Existing tests and code already use it for explicit interruptions | Rejected | Replace incomplete native tool-call repair with synthetic interrupted/unknown tool-result insertion; update tests. |
| Provider-specific DeepSeek workaround | The visible error came from DeepSeek | Rejected | Enforce OpenAI-compatible native tool protocol before any provider render. |
| Swallow provider 400 and ask user to retry | Easy local symptom handling | Rejected | Repair invalid working context before the request. |
| Manually remove incomplete call from snapshot | Would make this run continue | Rejected | Durable invariant and audit-preserving synthetic result repair. |
| Fake successful image result | Could close provider protocol | Rejected | Synthetic result must say interrupted/unknown and no output available. |

## Derived Layering (If Useful)

- Runtime/request layer: `AgentTurnRunner`, `LlmPhase`, `LLMRequestAssembler`.
- Memory invariant layer: `MemoryManager`, tool-protocol repairer, snapshot/bootstrap memory integration.
- Provider adapter layer: OpenAI/DeepSeek renderers and LLM clients.

Higher layers use the MemoryManager boundary. Provider adapters do not reach back into memory to repair state.

## Migration / Refactor Sequence

1. Add or refactor the memory-owned tool-protocol repairer:
   - Export the product-neutral synthetic interrupted/unknown result content constant.
   - Scan `Message[]` for assistant `ToolCallPayload` messages.
   - Collect immediately following `ToolResultPayload` messages.
   - For every expected call id without a matching immediate result, insert a `MessageRole.TOOL` message with `ToolResultPayload(toolCallId, toolName, syntheticContent, null)` immediately after the assistant tool-call message / immediate result block.
   - Prefer real completed result events from raw traces when available for the missing call id; only synthesize unknown when no real result exists.
   - Ensure idempotency: a second repair pass over repaired messages performs no additional insertion.
   - Handle orphan unsafe `ToolResultPayload`s by converting/dropping them in a provider-safe way consistent with existing projector behavior.
2. Extend `MemoryManager`:
   - Add `ensureWorkingContextToolProtocolSafeForNextLlm(...)` or update `projectWorkingContextForNextLlm(...)` to be the single public boundary with the new synthetic-result repair semantics.
   - Build completed-result facts from raw traces by tool call id.
   - Persist the repaired working-context snapshot only when changes occur.
   - Append an idempotent `operation_boundary`/recovery raw trace when synthetic interrupted/unknown results are inserted.
   - Attach provenance to inserted synthetic tool-result messages.
3. Update `WorkingContextSnapshotBootstrapper`:
   - After a valid cached snapshot is restored, call the MemoryManager repair boundary before returning.
   - Keep rebuild path unchanged unless it creates unsafe native payloads; natural raw recovery should remain provider-safe.
4. Update `LLMRequestAssembler`:
   - Call the MemoryManager repair boundary before pending compaction execution.
   - Append the current user message.
   - Call the repair boundary again before final `getWorkingContextMessages()` / render.
   - Apply the same pre-render repair to `prepareToolContinuationRequest(...)`.
5. Update `AgentTurnRunner` explicit interruption expectations if necessary so graceful interruption uses the same synthetic-result repair shape.
6. Remove/decommission text-fencing-only incomplete native tool-call behavior as the primary repair path.
7. Add/update tests and run targeted suites.

## Key Tradeoffs

- Synthetic tool result vs removal: synthetic result keeps the model's local context and explains why the previous tool request has no output; removal is simpler but loses the reference the user's “continue after shutdown” message depends on.
- Synthetic interrupted/unknown vs failed: interruption is more accurate than failure. The tool may not have completed, and no recorded result exists.
- Memory-level repair vs renderer-level patch: memory-level repair fixes persisted state and all future requests; renderer patch would hide the bug for one provider call and leave snapshots poisoned.
- Restore + request preflight vs only one location: restore repair cleans state early; request preflight is necessary backstop for already-poisoned contexts and compaction preflight.

## Risks

- If synthetic tool-result raw markers are represented as normal `tool_result` raw traces, UI or analytics may mistake them for real tool executions. Prefer a distinct recovery source event and clear marker content; if a synthetic raw `tool_result` is added for UI state, it must be clearly flagged by source/provenance.
- Existing tests expecting incomplete tool calls to be converted to assistant text must be updated carefully.
- If compaction or summarization reads unsafe context before repair, it can still fail; therefore the assembler must repair before compaction.
- Tool batches with multiple calls need precise insertion so all expected ids are satisfied immediately.

## Guidance For Implementation

- Use the exact provider-visible synthetic content approved by the user; do not include `AutoByteus` in it.
- Do not set the synthetic result as a success artifact. It is an interrupted/unknown status message.
- Preserve the assistant native tool-call message and insert missing `role: tool` results immediately after it.
- For the reported fixture, the repaired provider-visible tail should become:

```text
assistant: Los geht's mit **Seite 2** – das Schaf läuft neugierig weg. + tool_calls=[call_00_sV5xrttWiaZHhUHAKgo88012]
tool: tool_call_id=call_00_sV5xrttWiaZHhUHAKgo88012, content="Tool execution was interrupted by runtime shutdown before a result was recorded..."
user: please continue there was a shutdown
```

- Required durable tests:
  - Unit repairer test: missing tool result inserts synthetic result immediately after assistant tool call and is idempotent.
  - Unit/bootstrap test: schema-valid snapshot with incomplete native tool call is repaired during restore.
  - Request assembly test: already-poisoned snapshot with user messages after the incomplete call produces provider-safe rendered OpenAI-compatible messages.
  - Resume execution test: after restore, one additional user message prompt causes the runtime/request path to kick off LLM execution again without the provider-tool-message 400 shape.
  - Completed pair regression: completed native tool-call/result history is unchanged.
  - Partial batch regression: completed facts remain, missing calls receive synthetic interrupted/unknown results.
