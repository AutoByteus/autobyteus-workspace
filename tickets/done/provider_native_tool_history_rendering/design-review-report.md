# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/provider-native-tool-history-rendering/autobyteus-ts/tickets/provider_native_tool_history_rendering/requirements-doc.md`
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/provider-native-tool-history-rendering/autobyteus-ts/tickets/provider_native_tool_history_rendering/investigation-notes.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/provider-native-tool-history-rendering/autobyteus-ts/tickets/provider_native_tool_history_rendering/design-spec.md`
- Current Review Round: 2
- Trigger: Rerun after solution-designer revision for round 1 findings `AR-001` and `AR-002`.
- Prior Review Round Reviewed: 1
- Latest Authoritative Round: 2
- Current-State Evidence Basis: revised requirements/investigation/design artifacts; prior round 1 review report; current source files under `/Users/normy/autobyteus_org/autobyteus-worktrees/provider-native-tool-history-rendering/autobyteus-ts/autobyteus-ts/src`; current-state probe and output; installed SDK type evidence reviewed in round 1 remains applicable.

## Round History

| Round | Trigger | Prior Unresolved Findings Rechecked | New Findings Found | Review Decision | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Initial architecture review | N/A | AR-001, AR-002 | Fail | No | Non-native renderer isolation and parallel-result ordering/batching were not concrete enough. |
| 2 | Rerun after design revision | AR-001, AR-002 | None | Pass | Yes | Revised design resolves both prior design impacts and is ready for implementation. |

## Reviewed Design Spec

The revised design remains aligned with the original target architecture: semantic memory stays in `MemoryManager` / `WorkingContextSnapshot`, continuation routing stays provider-agnostic in `ToolResultEventHandler` and `LLMRequestAssembler`, provider stream interpretation stays in provider API/converter code, and provider request wire shape stays in provider renderers.

Round 2 adds the two missing pieces required for safe implementation:

1. **Mode-aware renderer isolation**: native renderer classes are selected only for `api_tool_call`; explicit provider text-history renderers preserve XML/JSON/sentinel modes, with selector functions owning construction-time mode choice.
2. **Ordered native batch result replay**: `ToolInvocationBatch` is the authoritative order owner; active native-batch memory append moves from per-result settlement to sorted batch append before native continuation; renderers add defensive adjacent-result grouping and provider-specific coalescing.

This makes the design actionable in the current codebase without violating the authoritative boundary rule.

## Task Design Health Assessment Verdict

| Assessment Area | Result (`Pass`/`Fail`) | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Design section 3 states posture, root cause, refactor-needed decision, and response. | None. |
| Root-cause classification is explicit and evidence-backed | Pass | Classified as boundary/ownership issue plus shared-structure looseness; investigation and probe show shared continuation works while in-scope renderers emit legacy text. | None. |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | Design says refactor needed now and ties it to provider renderer boundary plus metadata/ordering needs. | None. |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | Sections 6.1-6.5 now cover metadata plumbing, native renderer mappings, non-native renderer selection, and ordered batch replay. | None. |

## Prior Findings Resolution Check (Mandatory On Round >1)

| Prior Round | Finding ID | Previous Severity | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | AR-001 | High | Resolved | Requirements add FR-008/AC-010; investigation section 7 records current unconditional renderer construction and LM Studio selection precedent; design section 6.4 adds explicit text-history renderers and `provider-tool-history-renderer-selection.ts` selector functions; file inventory and validation requirements include mode isolation tests. | No remaining design-impact issue. Implementation must keep renderer instances one-responsibility. |
| 1 | AR-002 | High | Resolved | Requirements add FR-009/AC-011; investigation section 7 records `ToolInvocationBatch` order and current per-result memory append defect; design section 6.5 defines the active native-batch algorithm, `MemoryManager.ingestToolResults()`, processor skip behavior, and renderer grouping/coalescing; validation requires reverse-settlement and Anthropic/Gemini coalescing tests. | No remaining design-impact issue. Implementation should test reverse settlement explicitly. |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? (`Pass`/`Fail`) | Narrative Is Clear? (`Pass`/`Fail`) | Facade Vs Governing Owner Is Clear? (`Pass`/`Fail`/`N/A`) | Main Domain Subject Naming Is Clear? (`Pass`/`Fail`) | Ownership Is Clear? (`Pass`/`Fail`) | Off-Spine Concerns Stay Off Main Line? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| S1 | Native request assembly | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| S2 | Provider-native tool-call return | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| S3 | Tool-result continuation | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| S4 | Frontend/tool lifecycle event path | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| S5 | Legacy non-native fallback path | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| S6 | Ordered parallel result replay | Pass | Pass | Pass | Pass | Pass | Pass | Pass |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? (`Pass`/`Fail`) | Reuse / Extend / Create-New Decision Is Sound? (`Pass`/`Fail`) | Supports The Right Spine Owners? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Memory / working context | Pass | Pass | Pass | Pass | Stores semantic tool calls/results and optional bounded native metadata; does not format provider wire shape. |
| Runtime continuation | Pass | Pass | Pass | Pass | `ToolResultEventHandler` and `LLMRequestAssembler` remain provider-agnostic. |
| Tool invocation batch ordering | Pass | Pass | Pass | Pass | `ToolInvocationBatch` is correctly used as the authoritative assistant/provider call-order owner. |
| Provider converters/API classes | Pass | Pass | Pass | Pass | They own provider output interpretation and metadata capture. |
| Provider native renderers | Pass | Pass | Pass | Pass | Native wire mapping remains explicit per provider. |
| Provider text-history renderers | Pass | Pass | Pass | Pass | New renderers isolate non-native XML/JSON/sentinel text history. |
| Renderer selection | Pass | Pass | Pass | Pass | Small selector owns construction-time mode choice without hiding wire contracts. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? (`Pass`/`Fail`) | Shared File Choice Is Sound? (`Pass`/`Fail`/`N/A`) | Ownership Of Shared Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Provider-native metadata context | Pass | Pass | Pass | Pass | Discriminated union is bounded and attached only to tool-call replay metadata. |
| Tool result/value serialization | Pass | Pass | Pass | Pass | Narrow utility is appropriate; no generic renderer base. |
| Renderer selection helpers | Pass | Pass | Pass | Pass | Centralizes repeated format selection while keeping provider mappings in renderers. |
| Provider text-history renderers | Pass | Pass | Pass | Pass | Copies current legacy text-payload behavior into explicit non-native owners. |
| Ordered batch result append | Pass | Pass | Pass | Pass | New `ingestToolResults()` boundary is a coherent memory owner for sorted result history. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Pass`/`Fail`) | Redundant Attributes Removed? (`Pass`/`Fail`) | Overlapping Representation Risk Is Controlled? (`Pass`/`Fail`) | Shared Core Vs Specialized Variant / Composition Decision Is Sound? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `ProviderNativeToolCallContext` | Pass | Pass | Pass | Pass | Provider-discriminated context avoids a broad `any` side channel. |
| `ToolCallSpec.nativeToolCallContext` | Pass | Pass | Pass | Pass | Native context belongs with the assistant tool call, not the result. |
| `ToolResultPayload` | Pass | Pass | Pass | N/A | Pass | Results remain normalized; ordering is now owned by batch append plus renderer grouping. |
| Renderer mode selection functions | Pass | Pass | Pass | N/A | Pass | Explicit provider-specific factories avoid hidden global-state switching inside renderers. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? (`Pass`/`Fail`) | Replacement Owner / Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Removal / Decommission Scope Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Legacy `[TOOL_*]` in native provider renderers | Pass | Pass | Pass | Pass | Removed only from native API-mode renderers. |
| Tool-result-as-user in Ollama/Mistral native renderers | Pass | Pass | Pass | Pass | Replaced with provider-native `role: "tool"` messages. |
| OpenAI Responses tool-call/result-as-message | Pass | Pass | Pass | Pass | Replaced with `function_call` / `function_call_output` items. |
| Unconditional provider renderer construction | Pass | Pass | Pass | Pass | Replaced with `resolveToolCallFormat()`-based selector functions. |
| Per-result working-context append for active native batches | Pass | Pass | Pass | Pass | Replaced with ordered batch append after settlement completion. |
| Legacy text rendering for non-native modes | Pass | Pass | Pass | Pass | Preserved in explicit provider text-history renderers. |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? (`Pass`/`Fail`) | Responsibility Matches The Intended Owner/Boundary? (`Pass`/`Fail`) | Responsibilities Were Re-Tightened After Shared-Structure Extraction? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `src/llm/utils/tool-call-delta.ts` | Pass | Pass | Pass | Pass | Normalized deltas plus bounded native context. |
| `src/agent/streaming/handlers/api-tool-call-streaming-response-handler.ts` | Pass | Pass | Pass | Pass | Merges metadata by tool-call index/segment. |
| `src/agent/streaming/adapters/invocation-adapter.ts` | Pass | Pass | Pass | Pass | Segment-to-invocation adapter. |
| `src/agent/tool-invocation.ts` | Pass | Pass | Pass | Pass | One invocation identity plus optional native context. |
| `src/llm/utils/messages.ts` | Pass | Pass | Pass | Pass | Semantic DTOs; no provider formatting. |
| `src/memory/memory-manager.ts` / `working-context-snapshot.ts` / serializer | Pass | Pass | Pass | Pass | Adds ordered result ingestion and native metadata persistence without provider formatting. |
| `src/agent/tool-execution-result-processor/memory-ingest-tool-result-processor.ts` | Pass | Pass | Pass | Pass | Skips active native batches; preserves non-native/single-result ingestion. |
| `src/agent/handlers/tool-result-event-handler.ts` | Pass | Pass | Pass | Pass | Routes continuation and appends sorted native batch results before enqueueing continuation. |
| Provider native renderers | Pass | Pass | Pass | Pass | Own provider-native wire shape and coalescing where required. |
| Provider text-history renderers | Pass | Pass | Pass | Pass | Own legacy non-native text history. |
| `provider-tool-history-renderer-selection.ts` | Pass | Pass | Pass | Pass | Owns explicit renderer selection only. |
| Provider LLM constructors | Pass | Pass | Pass | Pass | Use selector instead of unconditional renderer construction. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? (`Pass`/`Fail`) | Forbidden Shortcuts Are Explicit? (`Pass`/`Fail`) | Direction Is Coherent With Ownership? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Runtime continuation to renderer | Pass | Pass | Pass | Pass | Assembler calls selected renderer; no provider branches. |
| Provider converters to native metadata | Pass | Pass | Pass | Pass | Provider API/converters interpret provider outputs. |
| Memory to provider formatting | Pass | Pass | Pass | Pass | Memory persists semantic state only. |
| Renderer selection | Pass | Pass | Pass | Pass | Selector may depend on `resolveToolCallFormat()`; renderers must not silently switch internally. |
| Tool result ordering/coalescing | Pass | Pass | Pass | Pass | Batch owns order; handler/memory append sorted results; renderer coalesces provider-specific output. |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? (`Pass`/`Fail`) | Internal Owned Mechanisms Stay Internal? (`Pass`/`Fail`) | Caller Bypass Risk Is Controlled? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `ToolResultEventHandler` | Pass | Pass | Pass | Pass | Owns route and sorted batch persistence trigger, not provider wire shape. |
| `LLMRequestAssembler` | Pass | Pass | Pass | Pass | Owns timing/context selection only. |
| Provider native renderers | Pass | Pass | Pass | Pass | Own native request-message shape. |
| Provider text-history renderers | Pass | Pass | Pass | Pass | Own non-native text-history rendering only. |
| Working-context snapshot | Pass | Pass | Pass | Pass | Stores ordered semantic messages; no provider rendering. |
| `ToolInvocationBatch` | Pass | Pass | Pass | Pass | Owns expected invocation order and sorted settlements only. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? (`Pass`/`Fail`) | Responsibility Is Singular? (`Pass`/`Fail`) | Identity Shape Is Explicit? (`Pass`/`Fail`) | Generic Boundary Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- |
| `ToolCallDelta` | Pass | Pass | Pass | Medium | Pass |
| `ToolInvocation` | Pass | Pass | Pass | Low | Pass |
| `MemoryManager.ingestToolIntents()` | Pass | Pass | Pass | Low | Pass |
| `MemoryManager.ingestToolResults()` | Pass | Pass | Pass | Low | Pass |
| `MemoryIngestToolResultProcessor.process()` | Pass | Pass | Pass | Medium | Pass |
| `PromptRenderer.render(messages)` native implementations | Pass | Pass | Pass | Medium | Pass |
| Text-history renderer implementations | Pass | Pass | Pass | Low | Pass |
| `createXPromptRendererForToolFormat()` selector functions | Pass | Pass | Pass | Low | Pass |
| `ToolResultEventHandler.dispatchNativeToolContinuation()` | Pass | Pass | Pass | Low | Pass |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? (`Pass`/`Fail`) | Folder Matches Owning Boundary? (`Pass`/`Fail`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `src/llm/prompt-renderers/native-tool-payload-format.ts` | Pass | Pass | Low | Pass | Narrow utility in renderer subsystem. |
| `src/llm/prompt-renderers/provider-tool-history-renderer-selection.ts` | Pass | Pass | Low | Pass | Small selector in renderer subsystem is acceptable because it selects renderer responsibilities only. |
| `src/llm/prompt-renderers/*-text-tool-history-renderer.ts` | Pass | Pass | Low | Pass | Explicitly owns legacy provider text history. |
| Existing provider renderer classes | Pass | Pass | Medium | Pass | Become native-only renderers; old text behavior moves out. |
| Memory/order changes | Pass | Pass | Low | Pass | Remain in memory/handler/batch owners. |
| Tests under `tests/unit/llm/prompt-renderers/` and related handler/memory tests | Pass | Pass | Low | Pass | Existing test layout supports the required validation. |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? (`Pass`/`Fail`) | Reuse / Extension Decision Is Sound? (`Pass`/`Fail`) | New Support Piece Is Justified? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Provider-native wire mapping | Pass | Pass | Pass | Pass | Extend existing provider renderers. |
| Provider output metadata preservation | Pass | Pass | Pass | Pass | Extend existing delta/invocation/message path. |
| Legacy non-native rendering | Pass | Pass | Pass | Pass | Reuse current behavior in explicit text-history renderers. |
| Ordered/batched tool results | Pass | Pass | Pass | Pass | Reuse existing `ToolInvocationBatch` order and add memory boundary. |
| Renderer mode selection | Pass | Pass | Pass | Pass | Follows LM Studio pattern, generalized per provider without generic wire mapping. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? (`Yes`/`No`) | Clean-Cut Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- |
| Native provider request history | No | Pass | Pass | Clean native-only output in API mode. |
| Non-native XML/JSON/sentinel modes | Yes | Pass | Pass | Required mode isolation, not a native compatibility wrapper. |
| OpenAI-compatible Chat / LM Studio regression guard | No | Pass | Pass | Existing behavior remains a regression guard. |
| Synthetic aggregate user message in `api_tool_call` | No | Pass | Pass | Still rejected for native mode. |

## Migration / Refactor Safety Verdict

| Area | Sequence Is Realistic? (`Pass`/`Fail`) | Temporary Seams Are Explicit? (`Pass`/`Fail`) | Cleanup / Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- |
| Native renderer replacement | Pass | Pass | Pass | Pass |
| Native metadata plumbing | Pass | Pass | Pass | Pass |
| Non-native renderer preservation | Pass | Pass | Pass | Pass |
| Parallel result ordering/coalescing | Pass | Pass | Pass | Pass |
| Validation sequence | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? (`Yes`/`No`) | Example Is Present And Clear? (`Pass`/`Fail`/`N/A`) | Bad / Avoided Shape Is Explained When Helpful? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Gemini native tool history | Yes | Pass | Pass | Pass | Good native shape and avoided legacy shape. |
| Anthropic native tool history | Yes | Pass | Pass | Pass | Multi-result coalescing and ordering are now explicit. |
| OpenAI Responses native items | Yes | Pass | Pass | Pass | Function-call/function-output item shape is clear. |
| Non-native mode isolation | Yes | Pass | Pass | Pass | Selector example and avoided hidden-global renderer switch are clear. |
| Tool-result order preservation | Yes | Pass | Pass | Pass | Reverse-settlement example is concrete. |

## Missing Use Cases / Open Unknowns

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| Non-native XML/JSON/sentinel provider history | FR-006/FR-008/AC-010 require preservation. | Implement text-history renderers and selector tests. | Resolved at design level; implementation validation required. |
| Parallel/multi-tool reverse-settlement ordering | FR-009/AC-011 require deterministic provider-native replay. | Implement ordered batch memory append and renderer grouping tests. | Resolved at design level; implementation validation required. |
| OpenAI Responses reasoning/function-call item preservation depth | Full stateless continuation may require more than normalized call IDs. | Preserve native function-call item/reasoning metadata where available; validate against installed OpenAI SDK types. | Residual implementation risk, not blocking. |
| Gemini thought-signature exact SDK spelling | Thinking/function-calling histories need exact part preservation. | Validate against current `@google/genai` types/runtime and preserve original parts when present. | Residual implementation risk, not blocking. |
| Ollama local model quality | Correct API wire shape may still fail with some model templates. | Keep validation scoped to payload shape unless credentials/model behavior are available. | Residual implementation risk, not blocking. |

## Review Decision

- `Pass`: the design is ready for implementation.

## Findings

None.

## Classification

N/A — no unresolved findings.

## Recommended Recipient

`implementation_engineer`

## Residual Risks

- Gemini implementation must preserve `thoughtSignature` / thought-signature-bearing parts exactly where returned by the current SDK/runtime.
- OpenAI Responses implementation should preserve original `function_call` items and relevant reasoning/output items where available; fallback reconstruction should be covered by tests.
- Renderer grouping must remain defensive; the primary correctness boundary is sorted batch memory append.
- Text-history renderers should be mechanically copied/extracted from current behavior before native conversion so non-native mode behavior does not drift accidentally.
- Wire-format validation should not overclaim live model/tool reliability beyond request payload correctness.

## Latest Authoritative Result

- Review Decision: Pass
- Notes: Prior findings AR-001 and AR-002 are resolved. Route cumulative package to `implementation_engineer` for implementation.
