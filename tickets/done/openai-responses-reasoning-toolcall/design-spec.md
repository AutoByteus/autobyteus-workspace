# Design Spec

## Current-State Read

The reported failing path is an OpenAI Responses API native tool-call continuation in `autobyteus-ts`:

`User/UI -> AgentTurnRunner -> LlmPhase -> OpenAIResponsesLLM stream -> ApiToolCallStreamingResponseHandler -> ToolInvocation native context -> MemoryManager working context -> ToolResultContinuationBuilder -> LLMRequestAssembler -> OpenAIResponsesRenderer -> OpenAI Responses API`

Current ownership is mostly healthy:

- `OpenAIResponsesLLM` owns OpenAI Responses request params, streaming event interpretation, and provider-native tool-call context capture.
- `ApiToolCallStreamingResponseHandler` owns conversion from streamed tool-call deltas to segment events and `ToolInvocation`s.
- `MemoryManager` / `WorkingContextSnapshot` own provider-neutral persistence of internal LLM messages, including `ToolCallSpec.nativeToolCallContext`.
- `ToolResultContinuationBuilder` owns switching native API tool continuations away from synthetic aggregate user text.
- `OpenAIResponsesRenderer` owns conversion from internal `Message[]` into OpenAI Responses `input` items.

The failure is at the OpenAI renderer boundary. `OpenAIResponsesLLM._streamMessagesToLLM` already captures `response.completed.response.output` as `nativeToolCallContext.responseOutputItems`. Those output items can include OpenAI `reasoning` items associated with a `function_call`. However, `OpenAIResponsesRenderer.renderToolCall` currently ignores `responseOutputItems` and reconstructs only a standalone `function_call` item, then appends `function_call_output` items. When OpenAI expects the prior `reasoning` item to be replayed with that `function_call`, the next request is rejected with the screenshot error.

Constraints the target design must respect:

- OpenAI Responses manual context requires provider output items, including `reasoning`, to survive across function-call continuation.
- Tool-call `call_id` must remain the stable identity used to match tool results.
- Final normalized tool arguments must replace stale/partial streamed arguments.
- The renderer must avoid duplicating a full `responseOutputItems` sequence when multiple tool calls from the same assistant output each carry the same native context.
- Non-OpenAI provider renderers and the generic memory/agent loop should stay provider-neutral.

## Intended Change

Add a bounded OpenAI Responses native-output replay path:

1. Extend `OpenAIResponsesRenderer` so assistant `ToolCallPayload` rendering first looks for captured OpenAI `responseOutputItems` on its tool calls.
2. Select one authoritative OpenAI output-item sequence per assistant tool-call message.
3. Replay that sequence into Responses `input` before tool outputs, preserving all non-function-call items such as `reasoning` exactly enough for OpenAI continuation.
4. Normalize any replayed `function_call` item that matches a current `ToolCallSpec` by `call_id`, preserving provider item `id` while replacing stale arguments with `ToolCallSpec.arguments`.
5. Append fallback-rendered `function_call` items only for current tool calls not represented in the captured sequence.
6. Keep existing ordered `function_call_output` rendering for following `ToolResultPayload`s.
7. In `OpenAIResponsesLLM`, merge `reasoning.encrypted_content` into Responses `include` for tool-capable/manual-context requests so OpenAI can return replayable reasoning items when needed.
8. Add deterministic unit/request-payload/agent-level tests for reasoning replay and multi-tool dedupe.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix
- Current design issue found (`Yes`/`No`/`Unclear`): Yes, localized.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing Invariant, with secondary Shared Structure Looseness.
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes, bounded to OpenAI Responses renderer/request construction.
- Evidence: `openai-responses-llm.ts` captures `responseOutputItems`; `openai-responses-renderer.ts` ignores them; OpenAI Responses docs require reasoning items to be passed back for subsequent function-call turns when manually managing context.
- Design response: Make `OpenAIResponsesRenderer` the authoritative owner of OpenAI prior-output-item replay and make `OpenAIResponsesLLM` request replayable encrypted reasoning content for relevant tool/manual-context requests.
- Refactor rationale: Treating `responseOutputItems` as incidental per-call metadata is too loose; the semantic owner needs to understand it as one ordered provider output sequence. This is a small internal refactor, not a broad architecture rewrite.
- Intentional deferrals and residual risk, if any: A larger switch to `previous_response_id` or OpenAI server-side conversation state is deferred. Manual context remains the current architecture, so the fix must make manual context correct for this bug.

## Terminology

- `Subsystem` / `capability area`: `autobyteus-ts` LLM provider adapter and prompt renderer capability areas.
- `Module`: not introduced as a new structural level for this ticket.
- `Folder` / `directory`: existing `src/llm/api`, `src/llm/prompt-renderers`, and tests folders.
- `File`: concrete TypeScript source/test files listed below.

## Design Reading Order

1. Follow the data-flow spine from agent run to OpenAI continuation request.
2. Understand ownership: provider streaming captures native output; renderer replays native output.
3. Read file responsibilities and the target mapping.
4. Review tests and migration sequence.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: remove/decommission the in-scope behavior where OpenAI Responses renderer ignores available `responseOutputItems` and renders a function-call-only history.
- There is no public legacy API to preserve. The fallback standalone `function_call` renderer remains only for cases where no captured OpenAI output sequence exists; it must not be used when `responseOutputItems` are available for the same assistant tool-call message.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | User/team prompt in AutoByteus runtime | OpenAI Responses continuation accepted after tool result | Agent runtime + OpenAI Responses provider boundary | This is the user-visible failing path. |
| DS-002 | Return-Event | OpenAI streamed output events | Stored assistant tool-call message with native context | `OpenAIResponsesLLM` + `ApiToolCallStreamingResponseHandler` + `MemoryManager` | This is where provider output items are captured and carried. |
| DS-003 | Primary End-to-End | Working-context tool-call/tool-result history | OpenAI Responses `input` array | `OpenAIResponsesRenderer` | This is the defect location; renderer must replay reasoning items. |
| DS-004 | Bounded Local | One assistant `ToolCallPayload` with one or more OpenAI tool calls | Ordered OpenAI prior-output replay plus fallback calls | `OpenAIResponsesRenderer` | Deduping and normalization happen inside this owner. |

## Primary Execution Spine(s)

- DS-001: `User Prompt -> AgentTurnRunner -> LlmPhase -> OpenAIResponsesLLM -> Tool Execution -> Tool Continuation LlmPhase -> OpenAI Responses API`
- DS-003: `WorkingContext Message[] -> OpenAIResponsesRenderer -> Prior Output Replay -> Function Call Outputs -> Responses API input`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | A user asks a team member to send a message. The OpenAI model emits `send_message_to`; AutoByteus executes it; the runtime asks OpenAI to continue after the tool output. | User prompt, LLM phase, OpenAI stream, tool phase, continuation LLM phase | Agent runtime with OpenAI provider adapter | Tool registry/execution, memory ingestion, status events |
| DS-002 | The provider stream emits tool-call deltas; final OpenAI response output items are captured and attached to the native context; the tool invocation is stored in working context. | OpenAI output event, native context, tool invocation, working context | OpenAI provider adapter and memory manager | Segment UI events, raw trace persistence |
| DS-003 | The next LLM request renders working context into OpenAI Responses `input`. Prior OpenAI output items must be replayed before tool outputs. | Message history, renderer, Responses input | `OpenAIResponsesRenderer` | Tool-result ordering, media formatting |
| DS-004 | Inside one assistant tool-call message, choose the captured output sequence once, preserve reasoning/non-call items, normalize current function calls, and append fallback calls only for missing call ids. | ToolCallPayload, responseOutputItems, normalized function calls | `OpenAIResponsesRenderer` | Argument stringification, duplicate avoidance |

## Spine Actors / Main-Line Nodes

- AutoByteus user/team prompt
- `AgentTurnRunner`
- `LlmPhase`
- `OpenAIResponsesLLM`
- `ApiToolCallStreamingResponseHandler`
- `MemoryManager` / `WorkingContextSnapshot`
- `ToolResultContinuationBuilder`
- `OpenAIResponsesRenderer`
- OpenAI Responses API

## Ownership Map

| Node | Owns |
| --- | --- |
| `AgentTurnRunner` | Turn lifecycle, status events, loop from LLM phase to tool phase to continuation. |
| `LlmPhase` | Per-turn LLM streaming execution, request assembly, segment notification, memory ingestion of LLM outcomes. |
| `OpenAIResponsesLLM` | OpenAI Responses params, streaming event interpretation, token usage mapping, provider-native output-item capture. |
| `ApiToolCallStreamingResponseHandler` | Native tool-call delta accumulation into segment events and final `ToolInvocation`s. |
| `MemoryManager` / `WorkingContextSnapshot` | Durable provider-neutral working-context messages and raw traces. |
| `ToolResultContinuationBuilder` | Native-vs-synthetic tool-result continuation mode and ingestion of ordered tool results. |
| `OpenAIResponsesRenderer` | Authoritative mapping from internal messages to OpenAI Responses `input`, including prior-output replay and tool-result ordering. |

`OpenAILLM` is a thin public facade over `OpenAIResponsesLLM`, not a governing owner for this bug.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `OpenAILLM` | `OpenAIResponsesLLM` | Provides OpenAI-specific API key/base URL defaults. | Responses streaming or prior-output replay policy. |
| `LLMRequestAssembler` | `MemoryManager` + provider renderer | Assembles message history and rendered payload. | Provider-specific reasoning replay. |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| OpenAI renderer behavior that ignores `responseOutputItems` when present | It drops provider-required reasoning items and causes 400 errors. | `OpenAIResponsesRenderer.renderCapturedOutputItemsForToolPayload`-style helper | In This Change | Not a public API removal; behavior replacement. |
| Tests that imply function-call-only retention is sufficient for OpenAI Responses | They allow missing reasoning replay to pass. | Strengthened renderer/request-payload tests | In This Change | Existing tests should be updated, not duplicated with weak expectations. |

## Return Or Event Spine(s) (If Applicable)

- DS-002 return/event flow: `OpenAI response.completed event -> response.output items -> ToolCallDelta.native_context.responseOutputItems -> ToolInvocation.nativeToolCallContext -> WorkingContextSnapshot ToolCallPayload`.

This return/event spine is central because the needed reasoning item is not created by AutoByteus; it is returned by OpenAI and must be carried forward.

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: `OpenAIResponsesRenderer`
- Chain: `ToolCallPayload -> select captured output sequence -> replay non-call items -> normalize matching function_call items -> append missing fallback calls -> append ordered function_call_output items`
- Why it matters: This local renderer spine prevents both missing reasoning items and duplicated function-call items.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| JSON argument stringification | DS-003, DS-004 | `OpenAIResponsesRenderer` | Convert final internal arguments into OpenAI function-call argument strings. | Keeps stale streamed args from being replayed. | If spread through memory/tool layers, provider formatting leaks upward. |
| Include-parameter merging | DS-001, DS-002 | `OpenAIResponsesLLM` | Add `reasoning.encrypted_content` without overwriting caller includes. | Ensures replayable reasoning items can be returned. | If renderer owns request params, API/request concerns mix with message rendering. |
| Tool-result ordering | DS-003 | `OpenAIResponsesRenderer` | Sort following `ToolResultPayload`s by assistant call order. | Responses API expects outputs matched to original calls. | If handled by tool phase, provider-specific message ordering leaks into runtime. |
| Native context serialization | DS-002 | `WorkingContextSnapshotSerializer` | Persist JSON-safe native contexts. | Survives working-context restore. | If renderer tries to recover missing context from raw traces, boundaries blur. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| OpenAI Responses input rendering | `src/llm/prompt-renderers/openai-responses-renderer.ts` | Extend | Already owns provider input items. | N/A |
| OpenAI request params and includes | `src/llm/api/openai-responses-llm.ts` | Extend | Already owns Responses API params. | N/A |
| Native context schema | `src/llm/utils/tool-call-delta.ts` | Reuse | Already has `responseOutputItems`. | N/A |
| Agent-level native continuation validation | `tests/integration/agent/provider-native-tool-continuation-flow.test.ts` | Extend | Existing scripted provider-native continuation test. | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| LLM API adapters | OpenAI Responses request params, stream interpretation, native output capture | DS-001, DS-002 | `OpenAIResponsesLLM` | Extend | Add include merge helper only. |
| Prompt renderers | Internal message to provider input conversion | DS-003, DS-004 | `OpenAIResponsesRenderer` | Extend | Main change. |
| Agent streaming | Stream deltas to invocations | DS-002 | `ApiToolCallStreamingResponseHandler` | Reuse | No design change needed. |
| Memory | Working context persistence | DS-002, DS-003 | `MemoryManager` | Reuse | No design change needed. |
| Tests | Regression validation | All | Test suite | Extend | Add deterministic reasoning replay assertions. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `src/llm/prompt-renderers/openai-responses-renderer.ts` | Prompt renderers | OpenAI Responses renderer | Replay captured response output items and normalize matching function calls. | This file already owns Responses input item construction. | Uses `ToolCallSpec`, `ToolResultPayload`, native context. |
| `src/llm/api/openai-responses-llm.ts` | LLM API adapters | OpenAI Responses API adapter | Merge `reasoning.encrypted_content` include for relevant requests. | This file already owns Responses request params. | No new shared type needed. |
| `tests/unit/llm/prompt-renderers/openai-responses-renderer.test.ts` | Tests | Renderer unit tests | Direct reasoning replay and fallback behavior. | Existing renderer tests live here. | N/A |
| `tests/unit/llm/api/provider-native-request-payloads.test.ts` | Tests | Provider request payload tests | Captured OpenAI request input contains reasoning and no duplicates. | Existing provider payload coverage. | N/A |
| `tests/integration/agent/provider-native-tool-continuation-flow.test.ts` | Tests | Agent-level scripted integration | OpenAI Responses native continuation carries reasoning output item through runtime. | Existing native continuation integration coverage. | N/A |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| OpenAI output item replay helpers | Keep private in `openai-responses-renderer.ts` | Prompt renderers | Only used by OpenAI Responses renderer. | Yes | Yes | Generic provider helper. |
| Include merge helper | Keep private in `openai-responses-llm.ts` | LLM API adapters | Only applies to OpenAI Responses params. | Yes | Yes | Cross-provider include utility. |

No new shared file is needed unless implementation discovers the helpers are reused by another OpenAI Responses renderer. Keeping helpers private avoids premature shared-structure looseness.

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `ProviderNativeToolCallContext.openai_responses.functionCallItem` | Yes | N/A | Medium | Continue using it as per-call fallback/identity. |
| `ProviderNativeToolCallContext.openai_responses.responseOutputItems` | Yes, after this design | N/A | Medium -> Low | Treat it as the ordered prior OpenAI assistant output sequence, not arbitrary metadata. |
| `ToolCallSpec.arguments` vs captured `functionCallItem.arguments` | Yes if renderer normalizes | Yes | Medium -> Low | Renderer must prefer final `ToolCallSpec.arguments` for matching function calls. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/llm/prompt-renderers/openai-responses-renderer.ts` | Prompt renderers | `OpenAIResponsesRenderer` | Render basic messages, media messages, captured OpenAI output-item sequences, normalized function calls, and ordered function-call outputs. | One provider renderer should own all OpenAI Responses input item conversion. | Reuses existing message/tool types. |
| `autobyteus-ts/src/llm/api/openai-responses-llm.ts` | LLM API adapters | `OpenAIResponsesLLM` | Build Responses params, merge reasoning include, normalize tools, map streaming events. | Request-param policy belongs with API adapter. | Reuses existing config/extraParams shape. |
| `autobyteus-ts/tests/unit/llm/prompt-renderers/openai-responses-renderer.test.ts` | Tests | Renderer unit tests | Verify direct replay behavior. | Existing targeted test file. | N/A |
| `autobyteus-ts/tests/unit/llm/api/provider-native-request-payloads.test.ts` | Tests | Provider request payload tests | Verify full request input shape. | Existing cross-provider payload test file. | N/A |
| `autobyteus-ts/tests/integration/agent/provider-native-tool-continuation-flow.test.ts` | Tests | Scripted runtime integration | Verify end-to-end native continuation rendered payload includes reasoning. | Existing runtime loop test. | N/A |

## Ownership Boundaries

- Upstream runtime layers must not know how OpenAI associates reasoning items with function calls. They only preserve native context as opaque provider data.
- `OpenAIResponsesLLM` must not render message history itself; it delegates to the renderer, but it owns API parameter construction.
- `OpenAIResponsesRenderer` must be the only owner that expands OpenAI native context into Responses `input` items.
- The renderer must not mutate stored native context; it emits a normalized clone.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `OpenAIResponsesRenderer.render(messages)` | OpenAI output-item replay, function-call normalization, result ordering | `LLMRequestAssembler`, tests | Runtime/memory manually constructing Responses `function_call`/`reasoning` items | Add renderer helpers behind `render`, not caller-side logic. |
| `OpenAIResponsesLLM._sendMessagesToLLM` / `_streamMessagesToLLM` | Responses params, include merging, OpenAI client invocation | `BaseLLM.sendMessages` / `streamMessages` | Prompt renderer modifying top-level OpenAI request params | Add private API adapter helper. |
| `MemoryManager.ingestToolIntents` | Working-context storage of tool intents | `LlmPhase` | Provider renderer reading raw traces to recover context | Preserve native context in messages. |

## Dependency Rules

Allowed:

- `OpenAIResponsesLLM` may depend on `OpenAIResponsesRenderer` through the existing renderer selection.
- `OpenAIResponsesRenderer` may depend on `Message`, `ToolCallPayload`, `ToolCallSpec`, and `ToolResultPayload`.
- Tests may inspect rendered provider payloads.

Forbidden:

- `MemoryManager`, `ToolResultContinuationBuilder`, or `LlmPhase` must not special-case OpenAI reasoning items.
- `OpenAIResponsesRenderer` must not depend on OpenAI client/network classes.
- `OpenAIResponsesLLM` must not duplicate renderer output-item replay logic.
- Do not introduce a compatibility branch that renders function-call-only history when a captured output sequence is available.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `OpenAIResponsesRenderer.render(messages)` | OpenAI Responses input rendering | Convert internal messages to provider input items. | `Message[]` with optional `ToolCallPayload`/`ToolResultPayload`. | Existing public renderer API remains. |
| Private helper: `renderToolCallPayload(payload)` or equivalent | One assistant tool-call message | Produce prior output items plus fallback calls. | `ToolCallPayload` and following results from message list. | Implementation naming flexible. |
| Private helper: `normalizeCapturedFunctionCall(item, call)` or equivalent | One OpenAI function-call item | Preserve provider identity and final arguments. | OpenAI item `call_id` matched to `ToolCallSpec.id`. | Must clone, not mutate. |
| Private helper: `mergeInclude(params, value)` or equivalent | OpenAI Responses request params | Preserve caller includes and add `reasoning.encrypted_content`. | `params.include` array of strings. | Keep provider-local. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `OpenAIResponsesRenderer.render` | Yes | Yes | Low | Keep provider-rendering-only. |
| Function-call normalization helper | Yes | Yes: OpenAI `call_id` equals `ToolCallSpec.id` | Low | Match only by call id. |
| Include merge helper | Yes | Yes: include string values | Low | Preserve existing entries. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| OpenAI renderer | `OpenAIResponsesRenderer` | Yes | Low | Keep. |
| Native output sequence | `responseOutputItems` | Yes enough | Medium | Document/test as ordered prior output sequence. |
| Function-call item | `functionCallItem` | Yes | Low | Keep. |
| Include merge helper | Implementation-defined, e.g. `ensureReasoningEncryptedContentInclude` | Yes if named this way | Low | Use concrete provider term. |

## Applied Patterns (If Any)

- Bounded local replay/normalization loop inside `OpenAIResponsesRenderer`: solves provider-specific output-item replay while keeping runtime/memory provider-neutral.
- Private helper extraction: keeps the renderer readable without adding new cross-provider abstractions.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/llm/prompt-renderers/openai-responses-renderer.ts` | File | `OpenAIResponsesRenderer` | OpenAI Responses message/tool/reasoning item rendering. | Existing provider renderer file. | OpenAI client calls or request execution. |
| `autobyteus-ts/src/llm/api/openai-responses-llm.ts` | File | `OpenAIResponsesLLM` | OpenAI Responses request params and streaming. | Existing API adapter file. | Message-history rendering logic beyond invoking renderer. |
| `autobyteus-ts/tests/unit/llm/prompt-renderers/openai-responses-renderer.test.ts` | File | Renderer tests | Unit-level reasoning replay assertions. | Existing renderer tests. | Live API calls. |
| `autobyteus-ts/tests/unit/llm/api/provider-native-request-payloads.test.ts` | File | Payload tests | Request payload shape with reasoning/function outputs. | Existing cross-provider request test. | Live API calls. |
| `autobyteus-ts/tests/integration/agent/provider-native-tool-continuation-flow.test.ts` | File | Agent integration tests | Runtime continuation payload with OpenAI reasoning replay. | Existing scripted integration. | Network calls. |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `src/llm/api` | Persistence-Provider / Provider API adapter | Yes | Low | Request execution and stream mapping live here. |
| `src/llm/prompt-renderers` | Off-Spine Concern serving provider API adapters | Yes | Low | Provider message formatting belongs here. |
| `src/memory` | Persistence / working context | Yes | Low | No OpenAI-specific replay logic should be added. |
| `tests/unit/llm` | Test support | Yes | Low | Correct granularity. |
| `tests/integration/agent` | Test support | Yes | Low | Scripted runtime integration belongs here. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Replaying OpenAI captured output | Input context has `responseOutputItems: [ {type:'reasoning', id:'rs_1', ...}, {type:'function_call', id:'fc_1', call_id:'call_1', arguments:'{"stale":true}'} ]`; renderer emits `reasoning` then normalized `function_call` with final arguments, then `function_call_output`. | Renderer emits only `{type:'function_call', id:'fc_1', call_id:'call_1'}` then output. | The bad shape matches the screenshot failure. |
| Multi-tool dedupe | One assistant message with calls `call_a`, `call_b`; first captured output sequence contains reasoning + both calls; renderer emits that sequence once and two outputs. | Each call replays the same `responseOutputItems`, producing duplicate reasoning and function calls. | Prevents malformed or bloated OpenAI input. |
| Boundary placement | `OpenAIResponsesRenderer` handles reasoning replay from native context. | `MemoryManager` inspects OpenAI reasoning items and constructs provider input. | Keeps provider-specific policy behind the provider renderer. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep function-call-only rendering even when `responseOutputItems` exists | Existing behavior passes current tests and live cases without reasoning items. | Rejected | When captured output sequence exists, use it as authoritative and preserve reasoning. |
| Add a second OpenAI-specific memory message type for reasoning | Could make reasoning visible in memory. | Rejected for this ticket | Preserve reasoning inside existing native context and replay in renderer. |
| Switch whole runtime to `previous_response_id` | It would avoid some manual replay complexity. | Rejected for this ticket | Fix current manual context path; consider stateful OpenAI design separately. |

## Derived Layering (If Useful)

Layering remains:

- Runtime orchestration: `AgentTurnRunner`, `LlmPhase`, `ToolPhase`
- Provider API adapter: `OpenAIResponsesLLM`
- Provider input renderer: `OpenAIResponsesRenderer`
- Provider-neutral memory: `MemoryManager`, `WorkingContextSnapshot`

The design intentionally avoids a layer bypass where runtime/memory constructs OpenAI-specific reasoning/function-call input directly.

## Migration / Refactor Sequence

1. Add failing unit coverage in `openai-responses-renderer.test.ts` for captured `reasoning` + `function_call` replay.
2. Add/strengthen request-payload coverage in `provider-native-request-payloads.test.ts` so OpenAI `captured.input` includes the reasoning item before function calls and outputs.
3. Add/strengthen scripted agent integration in `provider-native-tool-continuation-flow.test.ts` so OpenAI native context includes `responseOutputItems` with reasoning and the continuation rendered payload preserves it.
4. Implement private renderer helpers in `openai-responses-renderer.ts`:
   - collect current calls by `id`/`call_id`,
   - select one authoritative captured output sequence,
   - clone and replay non-function-call items,
   - normalize matching `function_call` items,
   - append fallback calls for missing ids.
5. Implement OpenAI include merge helper in `openai-responses-llm.ts` and call it for tool-capable/manual-context Responses requests after user extra params are merged.
6. Run focused unit and integration commands from acceptance criteria.
7. Remove any scratch/live temporary test files; keep `.env.test` ignored.

## Key Tradeoffs

- Replaying `responseOutputItems` is more provider-specific than pure provider-neutral tool-call history, but it is exactly what the OpenAI Responses API requires for manual context.
- Using `responseOutputItems` once per assistant message preserves order and non-call items without overfitting to only `reasoning`.
- Adding `reasoning.encrypted_content` include for relevant requests is slightly broader than the observed missing-id error, but it supports OpenAI's stateless/manual-context contract and preserves caller includes.
- Not switching to `previous_response_id` keeps the fix bounded and avoids reworking AutoByteus memory/compaction semantics.

## Risks

- If OpenAI returns partial output sequences without `response.completed`, fallback rendering still cannot synthesize missing reasoning. This is acceptable because no provider-required reasoning item was captured in that case; interruption handling remains separate.
- If multiple calls carry conflicting `responseOutputItems`, implementation must choose the most complete sequence deterministically and test the normal shared-sequence case.
- If OpenAI changes item field requirements, preserving cloned unknown fields from captured items minimizes risk.
- Live reproduction may remain nondeterministic because OpenAI may not emit reasoning items in every tool-call response.

## Guidance For Implementation

- Prefer a small private helper set inside `OpenAIResponsesRenderer`; do not introduce a new shared module unless implementation reveals reuse.
- Clone captured items before modifying them.
- Match function calls by `call_id` against `ToolCallSpec.id`.
- Preserve all fields on non-function-call output items, especially `reasoning.id`, `summary`, `encrypted_content`, `content`, and `status`.
- For matched function-call items, spread the captured item first, then override:
  - `type: 'function_call'`
  - `id: captured.id ?? call.id`
  - `call_id: call.id`
  - `name: call.name`
  - `arguments: stringifyJsonArguments(call.arguments)`
  - `status: captured.status ?? 'completed'`
- Track rendered call ids; append `renderToolCall(call)` only for calls not rendered from captured output items.
- Keep `collectFollowingResults` behavior so outputs remain in original assistant call order.
- In `OpenAIResponsesLLM`, merge `reasoning.encrypted_content` into `params.include` without overwriting existing includes.
