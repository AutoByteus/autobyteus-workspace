# Design Spec — Provider-Native Tool History Rendering

Status: Ready for architecture re-review after round 1 design-impact fixes
Date: 2026-05-10
Owner: solution_designer
Requirements: `/Users/normy/autobyteus_org/autobyteus-worktrees/provider-native-tool-history-rendering/autobyteus-ts/tickets/provider_native_tool_history_rendering/requirements-doc.md`
Investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/provider-native-tool-history-rendering/autobyteus-ts/tickets/provider_native_tool_history_rendering/investigation-notes.md`
Design Review Round 1 Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/provider-native-tool-history-rendering/autobyteus-ts/tickets/provider_native_tool_history_rendering/design-review-report.md`

## 0. Architecture Review Round 1 Resolution

This revision addresses the architecture review round 1 `Design Impact` findings:

- `AR-001`: adds a concrete mode isolation design. The existing provider renderer classes become native-history renderers selected only for `api_tool_call`; new provider-specific text-history renderers preserve XML/JSON/sentinel tool parser modes. Provider LLM classes select renderers through explicit `resolveToolCallFormat()`-based construction, following the existing LM Studio pattern.
- `AR-002`: adds a concrete ordered-result ownership design. `ToolInvocationBatch` remains the authoritative owner of assistant tool-call order; native API memory ingestion moves from per-result append to ordered batch append after all results settle; provider renderers coalesce/sort adjacent result payloads against the preceding `ToolCallSpec[]` batch for native replay.

## 1. Scope Decision

This is a separate ticket from the completed OpenAI-compatible Chat / LM Studio ticket.

In scope:
- Gemini, Ollama, Anthropic, Mistral, and OpenAI Responses provider-native history rendering.
- Native tool-result continuation with no provider-visible synthetic aggregate user message.
- Provider-specific metadata preservation where needed for correct stateless continuation.
- Mode-aware renderer isolation so XML/JSON/sentinel text-parser modes keep explicit legacy text-history renderers.
- Ordered/coalesced parallel tool-result replay based on the original assistant tool-call order.
- Wire-format tests/probes.

Out of scope:
- OpenAI-compatible Chat / LM Studio behavior except regression tests.
- Text/XML parser-mode behavior except ensuring legacy text tags stay isolated there.
- New public tool-choice configuration.

## 2. Current-State Summary

The shared runtime now has the right high-level continuation shape for `api_tool_call` mode:

`ToolResultEvent -> ToolResultEventHandler.dispatchNativeToolContinuation -> ToolContinuationReadyEvent -> LLMRequestAssembler.prepareToolContinuationRequest -> renderer.render(existing working context)`

This prevents the aggregate `Tool executions have completed...` user message from being appended in native API mode.

The remaining defect is at the provider renderer boundary. Internal memory stores semantic tool history as:

- assistant `Message` + `ToolCallPayload(toolCalls)`;
- tool `Message` + `ToolResultPayload(toolCallId, toolName, result, error)`.

`OpenAIChatRenderer` already maps that semantic history to native Chat messages. The in-scope provider renderers still map it to legacy text tags.

Two round-1 review findings refine the current-state read:

- The provider LLM classes currently instantiate those same renderer classes unconditionally. Therefore converting the existing renderer classes to native output without explicit selection would break configured non-native XML/JSON/sentinel parser modes.
- `ToolInvocationBatch` already knows provider/assistant call order, and `ToolResultEventHandler` already uses `getOrderedSettledResults()` for continuation dispatch, but `MemoryIngestToolResultProcessor` currently appends each `ToolResultPayload` to working context as results settle. Native continuation renders working context, so native API mode must persist ordered batch results only after the batch is complete.

## 3. Design Health Assessment

- Change posture: provider-native behavior fix and renderer refactor.
- Root-cause classification: boundary/ownership issue + shared-structure looseness.
- Refactor needed now: yes.
- Why: the provider renderer is the authoritative boundary for provider wire format. Leaving provider renderers to emit legacy text in native API mode contradicts the provider API contract and makes tool result history appear as user text to the model.
- Design response: keep semantic working-context ownership in memory, keep continuation routing ownership in `ToolResultEventHandler`, and make provider renderers own native wire mapping. Add a narrow native metadata path only where provider contracts require more than normalized tool-call identity. Split native renderer responsibility from legacy text-history renderer responsibility, and make `ToolInvocationBatch` + `ToolResultEventHandler` the ordered native batch persistence boundary.

## 4. Spine Inventory

| Spine ID | Scope | Start | End | Governing owner | Why it matters |
|---|---|---|---|---|---|
| S1 | Native request assembly | `LLMUserMessageReadyEvent` / `ToolContinuationReadyEvent` | provider request payload | `LLMRequestAssembler` + selected provider renderer | Determines exactly what the provider sees. |
| S2 | Provider-native tool-call return | provider stream chunk | `PendingToolInvocationEvent` + working-context tool-call history | provider LLM converter + streaming handler + `MemoryManager` | Preserves provider tool-call identity and history for the next request. |
| S3 | Tool-result continuation | `ToolResultEvent` | next provider continuation request | `ToolResultEventHandler` + `LLMRequestAssembler` | Ensures no synthetic aggregate user text in native API mode. |
| S4 | Frontend/tool lifecycle event path | tool invocation/result events | frontend/status notifications | event handlers/status notifier | Tool result events remain visible without becoming provider-visible user messages. |
| S5 | Legacy non-native fallback path | non-API tool mode | text/XML/JSON/sentinel continuation | selected provider text-history renderer + existing parser/rendering path | Keeps legacy model support isolated from native API providers through explicit renderer selection. |
| S6 | Ordered parallel result replay | assistant multi-tool-call batch | provider-native continuation request | `ToolInvocationBatch` + `ToolResultEventHandler` + `MemoryManager` | Ensures result history follows assistant call order even when tools settle out of order. |

Primary target path:

`User/ToolContinuation event -> LLMRequestAssembler -> Selected provider renderer -> Provider API -> Provider stream converter -> Streaming handler -> ToolInvocationBatch/ToolInvocation -> MemoryManager semantic tool-call history -> ToolResultEvent settlements -> ordered batch memory append -> ToolContinuationReadyEvent -> Selected native provider renderer -> Provider API`

## 5. Ownership Model

### Existing owners to preserve

- `MemoryManager` / `WorkingContextSnapshot`
  - Own semantic conversation history and normalized tool-call/tool-result memory.
- `ToolResultEventHandler`
  - Own routing decision between native continuation and legacy aggregate user message.
- `LLMRequestAssembler`
  - Own appending user input for normal user turns and not appending user input for tool continuations.
- Provider renderers under `src/llm/prompt-renderers/`
  - Own provider wire-format mapping for internal `Message[]`.
- Provider LLM API classes/converters under `src/llm/api/` and `src/llm/converters/`
  - Own converting provider stream/output events into normalized tool-call deltas.
- `ToolInvocationBatch`
  - Owns the original assistant/provider tool-call order and sorted settlement result list for one active turn batch.

### New/strengthened ownership

- Add a narrow provider-native metadata channel attached to tool invocations/tool-call history only where native stateless continuation needs it.
- Do not move provider wire-shape decisions into `ToolResultEventHandler` or `LLMRequestAssembler`; those layers must remain provider-agnostic.
- Provider LLM classes must select native vs legacy text-history renderers through `resolveToolCallFormat()`; provider renderers themselves own wire shape, while renderer selection owns only mode isolation.
- Native result memory append must happen once per completed active batch in `ToolInvocationBatch` order; per-result lifecycle events/logs remain per-result and unchanged.
- Do not create a new public config owner for tool-choice policy; this ticket is about history shape, not forcing tool calls.

## 6. Target Design

### 6.1 Shared provider-native metadata path

Modify the internal tool-call path so provider converters can preserve provider-required native context:

1. Extend `src/llm/utils/tool-call-delta.ts` with an optional, typed native metadata field.
   - Use a discriminated union, not an unstructured catch-all.
   - Proposed shape:

```ts
export type ProviderNativeToolCallContext =
  | { provider: 'gemini'; modelContent?: Record<string, unknown>; functionCallPart?: Record<string, unknown> }
  | { provider: 'anthropic'; toolUseBlock?: Record<string, unknown> }
  | { provider: 'mistral'; toolCall?: Record<string, unknown> }
  | { provider: 'ollama'; toolCall?: Record<string, unknown> }
  | { provider: 'openai_responses'; functionCallItem?: Record<string, unknown>; responseOutputItems?: Record<string, unknown>[] };
```

2. Extend `src/agent/tool-invocation.ts` with optional `nativeToolCallContext?: ProviderNativeToolCallContext`.

3. Update `src/agent/streaming/adapters/invocation-adapter.ts` and API tool-call segment events so native metadata merges by segment/index the same way `name`, `call_id`, and argument deltas do.

4. Extend `src/llm/utils/messages.ts` `ToolCallSpec` with optional `nativeToolCallContext?: ProviderNativeToolCallContext`.

5. Update `src/memory/memory-manager.ts` `ingestToolIntents()` to copy `ToolInvocation.nativeToolCallContext` into `ToolCallSpec`.

6. Keep `ToolResultPayload` normalized. It should continue to use `toolCallId`, `toolName`, `toolResult`, and `toolError`; renderers can match it to the previous `ToolCallSpec` by ID/name/order when needed.

Rationale:
- This keeps semantic memory authoritative while allowing exact provider-native replay where provider contracts require it.
- It avoids making `Message` a provider-specific kitchen sink because the optional metadata is bounded, discriminated, and only attached to native tool-call history.

### 6.2 Shared serialization helper

Add or update a small utility under `src/llm/prompt-renderers/`, for example `native-tool-payload-format.ts`, with only provider-neutral value serialization helpers:

- `stringifyToolResultForProvider(value, error?)` → stable string for provider `content`/`output` fields.
- `cloneJsonObject(value)` / safe object coercion for arguments where provider expects object arguments.
- `stringifyJsonArguments(value)` for Chat-style providers that require JSON string arguments.

Do **not** create a generic provider renderer base that hides provider-specific wire contracts. Provider-specific renderers should remain explicit.

### 6.3 Provider renderer target mappings

#### Gemini — `src/llm/prompt-renderers/gemini-prompt-renderer.ts`

Target:
- Normal user/assistant text/media behavior remains.
- `ToolCallPayload` on assistant messages renders as `role: 'model'` with `parts` containing `functionCall` objects.
- Prefer replaying `nativeToolCallContext.provider === 'gemini'` `modelContent` when available to preserve thought signatures and original function-call parts.
- Fallback reconstruction when native metadata is absent:

```ts
{
  role: 'model',
  parts: [{ functionCall: { id: call.id, name: call.name, args: call.arguments ?? {} } }]
}
```

- `ToolResultPayload` renders as:

```ts
{
  role: 'user',
  parts: [{ functionResponse: { id: payload.toolCallId, name: payload.toolName, response: { result: serializedOrJsonResult } } }]
}
```

- No `[TOOL_CALL]`, `[TOOL_RESULT]`, `[TOOL_ERROR]` text in native tool payloads.
- For multi-call batches, coalesce immediately following matching `ToolResultPayload` messages into one user turn with `functionResponse` parts sorted by the prior `ToolCallSpec[]` order.

#### Ollama — `src/llm/prompt-renderers/ollama-prompt-renderer.ts`

Target:
- `ToolCallPayload` renders assistant messages with `tool_calls`:

```ts
{
  role: 'assistant',
  content: msg.content ?? '',
  tool_calls: [{ type: 'function', function: { index, name, arguments } }]
}
```

- `ToolResultPayload` renders:

```ts
{ role: 'tool', tool_name: payload.toolName, content: stringifyToolResultForProvider(payload.toolResult, payload.toolError) }
```

- Preserve parallel call order by rendering tool calls/results in the preceding `ToolCallSpec[]` order; use native `function.index` when available as provider metadata, not as a replacement for call-id matching.

#### Anthropic — `src/llm/prompt-renderers/anthropic-prompt-renderer.ts`

Target:
- `ToolCallPayload` renders an assistant message with content blocks:

```ts
{
  role: 'assistant',
  content: [
    ...optionalTextBlocks,
    { type: 'tool_use', id: call.id, name: call.name, input: call.arguments ?? {} }
  ]
}
```

- `ToolResultPayload` renders a user message whose content array begins with:

```ts
{ type: 'tool_result', tool_use_id: payload.toolCallId, content: stringOrBlocks, is_error?: true }
```

- If the internal message also has text content, append text **after** all `tool_result` blocks.
- Preserve immediate adjacency between assistant tool-use and user tool-result turns; do not insert system/user text between them.
- For multi-call batches, coalesce immediately following matching `ToolResultPayload` messages into one user turn whose `tool_result` blocks are sorted by the prior `ToolCallSpec[]` order and appear before any text block.

#### Mistral — `src/llm/prompt-renderers/mistral-prompt-renderer.ts`

Target:
- `ToolCallPayload` renders assistant messages with `tool_calls`:

```ts
{
  role: 'assistant',
  content: msg.content ?? '',
  tool_calls: [{ id: call.id, type: 'function', function: { name: call.name, arguments: JSON.stringify(call.arguments ?? {}) } }]
}
```

- `ToolResultPayload` renders:

```ts
{
  role: 'tool',
  name: payload.toolName,
  content: stringifyToolResultForProvider(payload.toolResult, payload.toolError),
  tool_call_id: payload.toolCallId
}
```

- Tool result messages for a multi-call batch render in the prior `ToolCallSpec[]` order.

#### OpenAI Responses — `src/llm/prompt-renderers/openai-responses-renderer.ts`

Target:
- Normal text/media messages remain `type: 'message'` input items.
- `ToolCallPayload` should render provider-native `function_call` input items, preferably from preserved `nativeToolCallContext.provider === 'openai_responses'` `functionCallItem` / output items.
- Fallback reconstruction when native item is absent:

```ts
{
  type: 'function_call',
  id: call.id,
  call_id: call.id,
  name: call.name,
  arguments: JSON.stringify(call.arguments ?? {}),
  status: 'completed'
}
```

- `ToolResultPayload` renders:

```ts
{
  type: 'function_call_output',
  call_id: payload.toolCallId,
  output: stringifyToolResultForProvider(payload.toolResult, payload.toolError)
}
```

- Do not wrap tool calls/results as `type: 'message'` with user/assistant text tags.
- Function-call output items for a multi-call batch render in the prior `ToolCallSpec[]` order.

### 6.4 Mode-aware renderer isolation

Native provider-history rendering is selected only for `api_tool_call`. Non-native XML/JSON/sentinel modes must keep explicit text-history rendering.

Target structure:

1. Keep the existing provider renderer class names as the native renderer boundary for API tool mode:
   - `GeminiPromptRenderer` renders Gemini native `functionCall` / `functionResponse` history.
   - `OllamaPromptRenderer` renders Ollama native `tool_calls` / `role: "tool"` history.
   - `AnthropicPromptRenderer` renders Anthropic `tool_use` / `tool_result` blocks.
   - `MistralPromptRenderer` renders Mistral native `tool_calls` / `role: "tool"` history.
   - `OpenAIResponsesRenderer` renders Responses `function_call` / `function_call_output` items.

2. Add provider-specific text-history renderers that copy the current legacy tool-payload behavior before native conversion:
   - `gemini-text-tool-history-renderer.ts`
   - `ollama-text-tool-history-renderer.ts`
   - `anthropic-text-tool-history-renderer.ts`
   - `mistral-text-tool-history-renderer.ts`
   - `openai-responses-text-tool-history-renderer.ts`

3. Add a small selection owner, for example `src/llm/prompt-renderers/provider-tool-history-renderer-selection.ts`, with provider-specific factory functions:

```ts
export function createGeminiPromptRendererForToolFormat(
  format = resolveToolCallFormat()
): BasePromptRenderer {
  return format === 'api_tool_call'
    ? new GeminiPromptRenderer()
    : new GeminiTextToolHistoryRenderer();
}
```

Repeat the same explicit function shape for Ollama, Anthropic, Mistral, and OpenAI Responses. The selector owns only mode selection; it must not hide provider wire contracts or become a generic renderer base.

4. Update provider LLM constructors to use the selector instead of unconditional `new XPromptRenderer()`. Type `_renderer` as the concrete provider output renderer interface or `BasePromptRenderer` plus provider-specific output aliases as needed.

5. Validation must assert both sides:
   - `api_tool_call` selects native renderers and produces no legacy tags.
   - `xml`, `json`, and `sentinel` select text-history renderers and do not emit native-only provider tool-result structures.

This is not a backward-compatibility wrapper. It is required mode isolation for still-supported parser modes. The clean-cut removal applies only to legacy text tags inside native API-mode renderers.

### 6.5 Ordered native tool-result batch replay

Native API continuation must not rely on result completion order. The authoritative ordering owner is `ToolInvocationBatch`, because it is created from `streamingHandler.getAllInvocations()` in the assistant/provider emission order and stores `expectedInvocationIds` in that order.

Target algorithm for `api_tool_call` mode with an active batch:

1. `LLMUserMessageReadyEventHandler` keeps current behavior: after streaming finalization, create `ToolInvocationBatch` from `toolInvocations` in provider/assistant order, then call `memoryManager.ingestToolIntents(toolInvocations, activeTurnId)` in the same order.
2. `MemoryIngestToolResultProcessor` must not append `ToolResultPayload` messages to working context for active native API batches. It can detect this by `resolveToolCallFormat() === 'api_tool_call'` and `context.state.activeTurn?.activeToolInvocationBatch?.accepts(event.toolInvocationId, event.turnId)`. It remains responsible for non-native modes and non-batch legacy flows.
3. `ToolResultEventHandler` keeps per-result processor execution, status logs, terminal lifecycle notifications, validation, duplicate rejection, and settlement.
4. When `activeBatch.isComplete()` becomes true, `ToolResultEventHandler` calls `activeBatch.getOrderedSettledResults()` and treats that array as the only native continuation result order.
5. Before enqueuing `ToolContinuationReadyEvent`, `ToolResultEventHandler` calls a new memory boundary such as:

```ts
memoryManager.ingestToolResults(sortedResults, activeBatch.turnId, {
  source: 'native_api_ordered_batch'
});
```

`ingestToolResults()` is the single writer for active native batch result history. It appends raw traces and `ToolResultPayload` working-context messages in the received order. Existing `ingestToolResult()` can delegate to `ingestToolResults([event], turnId)` for non-native/single-result paths.

6. Provider renderers implement defensive adjacent-result grouping for native replay:
   - when a `ToolCallPayload` message is rendered, remember its `ToolCallSpec[]` call order;
   - collect immediately following `ToolResultPayload` messages that match that call batch;
   - sort the collected results by the prior call order before rendering;
   - for Anthropic and Gemini, render the sorted result group as one immediately-following user turn with multiple `tool_result` blocks / `functionResponse` parts;
   - for Ollama, Mistral, and OpenAI Responses, emit one provider-native tool-output message/item per sorted result.

The memory append is the primary correctness boundary. Renderer grouping is a defensive replay rule and the provider-specific coalescing owner, not a substitute for ordered batch persistence.

Concrete reverse-settlement example:

```text
Assistant tool batch: [call_a:get_weather, call_b:get_time]
Runtime settlement order: [call_b result, call_a result]
ToolInvocationBatch order: [call_a, call_b]
Working-context result append after fix: [ToolResult(call_a), ToolResult(call_b)]
Anthropic render: assistant[{tool_use call_a}, {tool_use call_b}] -> user[{tool_result call_a}, {tool_result call_b}]
```

### 6.6 Continuation routing invariant


Keep `ToolResultEventHandler.dispatchNativeToolContinuation()` as the only native-mode route from processed tool results to the next LLM call.

Required invariant:
- In `api_tool_call`, this path enqueues `ToolContinuationReadyEvent` and never enqueues a synthetic `UserMessageReceivedEvent` for provider-visible tool results.
- Non-native modes keep the existing aggregate message path.

### 6.7 Frontend/status event invariant

Do not remove or suppress:
- `ToolResultEvent`;
- tool-result processor hooks;
- lifecycle notifier calls/logs;
- terminal tool execution events.

Those events are product/UI lifecycle events. The bug is only that native provider requests must not render those events as aggregate `user` text.

## 7. File-Level Change Inventory

### Modify

- `src/llm/utils/tool-call-delta.ts`
  - Add typed optional provider-native metadata.
- `src/agent/tool-invocation.ts`
  - Carry optional native metadata through the invocation lifecycle.
- `src/agent/streaming/handlers/api-tool-call-streaming-response-handler.ts`
  - Preserve native metadata from provider deltas into segment metadata.
- `src/agent/streaming/adapters/invocation-adapter.ts`
  - Copy native metadata from segment metadata into `ToolInvocation`.
- `src/llm/utils/messages.ts`
  - Add optional native metadata to `ToolCallSpec`.
- `src/memory/memory-manager.ts`
  - Store native metadata in `ToolCallSpec` during `ingestToolIntents()`.
  - Add ordered `ingestToolResults()` batch boundary and make single-result ingestion delegate to it where appropriate.
- `src/memory/working-context-snapshot.ts`
  - Add an ordered multi-result append helper if needed so batch result order is explicit at the snapshot boundary.
- `src/memory/working-context-snapshot-serializer.ts`
  - Serialize/deserialize optional native metadata so restored sessions do not lose provider-native continuity.
- `src/agent/tool-execution-result-processor/memory-ingest-tool-result-processor.ts`
  - Skip per-result working-context append for active `api_tool_call` batches so ordered batch append is authoritative.
- `src/agent/handlers/tool-result-event-handler.ts`
  - After active native batch completion, append sorted results to memory through the ordered batch boundary before enqueueing `ToolContinuationReadyEvent`.
- `src/llm/converters/gemini-tool-call-converter.ts` and `src/llm/api/gemini-llm.ts`
  - Preserve Gemini native function-call context where available.
- `src/llm/converters/ollama-tool-call-converter.ts`
  - Preserve raw Ollama tool-call object when available.
- `src/llm/converters/anthropic-tool-call-converter.ts`
  - Preserve/reconstruct native `tool_use` metadata.
- `src/llm/converters/mistral-tool-call-converter.ts`
  - Preserve raw Mistral tool-call object when available.
- `src/llm/api/openai-responses-llm.ts`
  - Preserve OpenAI Responses function-call items/output context as native metadata.
- `src/llm/prompt-renderers/gemini-prompt-renderer.ts`
- `src/llm/prompt-renderers/ollama-prompt-renderer.ts`
- `src/llm/prompt-renderers/anthropic-prompt-renderer.ts`
- `src/llm/prompt-renderers/mistral-prompt-renderer.ts`
- `src/llm/prompt-renderers/openai-responses-renderer.ts`
  - Replace legacy text rendering for native tool payloads with provider-native mappings.
  - Implement native adjacent-result grouping/coalescing rules where the provider requires them.
- `src/llm/api/gemini-llm.ts`
- `src/llm/api/ollama-llm.ts`
- `src/llm/api/anthropic-llm.ts`
- `src/llm/api/mistral-llm.ts`
- `src/llm/api/openai-responses-llm.ts`
  - Select native vs text-history renderers using `resolveToolCallFormat()` through the renderer selector.

### Add

- `src/llm/prompt-renderers/native-tool-payload-format.ts`
  - Narrow serialization helpers only.
- `src/llm/prompt-renderers/provider-tool-history-renderer-selection.ts`
  - Provider-specific factory functions for native vs legacy text-history renderer selection.
- `src/llm/prompt-renderers/gemini-text-tool-history-renderer.ts`
- `src/llm/prompt-renderers/ollama-text-tool-history-renderer.ts`
- `src/llm/prompt-renderers/anthropic-text-tool-history-renderer.ts`
- `src/llm/prompt-renderers/mistral-text-tool-history-renderer.ts`
- `src/llm/prompt-renderers/openai-responses-text-tool-history-renderer.ts`
  - Explicit legacy text-history renderers for `xml`/`json`/`sentinel` modes, preserving current text-tag behavior outside native API mode.
- Tests/probes under an appropriate test path, e.g.:
  - `tests/unit/llm/prompt-renderers/provider-native-tool-history-renderers.test.ts`
  - or provider-specific tests if that matches existing test layout better.
- Durable probe or fixture based on:
  - `tickets/provider_native_tool_history_rendering/probes/provider-native-renderer-current-state-probe.mjs`

### Remove / Decommission

- Remove provider-native renderer uses of `formatToolPayload()` functions that emit `[TOOL_CALL]` / `[TOOL_RESULT]` text in Gemini/Ollama/Anthropic/Mistral/OpenAI Responses native renderers.
- Do not remove text rendering for non-native modes; move/copy it into explicit provider text-history renderers and select those renderers when `resolveToolCallFormat()` is not `api_tool_call`.

### 7.4 Final file responsibility mapping

| File / area | Owning subsystem | Concrete responsibility after this change | Must not contain |
|---|---|---|---|
| `src/llm/utils/tool-call-delta.ts` | LLM provider output normalization | Typed stream delta shape plus bounded provider-native context needed to replay native tool-call history. | Renderer-specific request formatting or public config policy. |
| `src/agent/streaming/handlers/api-tool-call-streaming-response-handler.ts` | Native API streaming segmentation | Merge provider delta identity, arguments, and native metadata into segment metadata by tool-call index. | Provider request rendering or frontend notification policy. |
| `src/agent/streaming/adapters/invocation-adapter.ts` | Segment-to-tool-invocation adapter | Produce `ToolInvocation` objects with normalized name/arguments/id plus optional native context. | Provider-specific serialization decisions. |
| `src/agent/tool-invocation.ts` | Tool invocation identity model | Carry one invocation's normalized identity and optional native replay context through execution/memory ingestion. | Tool-result payload data or renderer logic. |
| `src/llm/utils/messages.ts` | Internal message/memory DTO model | Store semantic tool calls/results; attach optional provider-native tool-call context only to `ToolCallSpec`. | A broad provider wire-format kitchen sink or duplicate tool-result representation. |
| `src/memory/memory-manager.ts` / `working-context-snapshot.ts` / serializer | Working-context memory | Persist normalized tool-call/tool-result history and optional native tool-call metadata across restored sessions. | Provider renderer branching beyond preserving stored payloads. |
| Provider converters under `src/llm/converters/` and relevant API classes | Provider output conversion | Convert provider stream/output objects into normalized deltas and attach raw/native metadata where the provider requires it. | Working-context mutation or request assembly policy. |
| Provider renderers under `src/llm/prompt-renderers/` | Provider request wire boundary | Map internal `Message[]` tool history to each provider's native tool-call/tool-result request shape. | Tool execution lifecycle routing or provider-agnostic continuation decisions. |
| `src/llm/prompt-renderers/native-tool-payload-format.ts` | Prompt-renderer utility | Stable provider-neutral result/argument serialization helpers. | A generic renderer superclass or hidden provider-specific policy. |
| `src/llm/prompt-renderers/provider-tool-history-renderer-selection.ts` | Renderer mode selection | Select provider-specific native renderer only for `api_tool_call`; select provider-specific text-history renderer for `xml`/`json`/`sentinel`. | Provider wire-format rendering or tool-choice policy. |
| Provider text-history renderers under `src/llm/prompt-renderers/*-text-tool-history-renderer.ts` | Legacy parser-mode prompt rendering | Preserve current `[TOOL_CALL]` / `[TOOL_RESULT]` text history for configured non-native parser modes. | Native provider wire objects. |
| `src/agent/tool-invocation-batch.ts` | Tool batch ordering | Preserve expected invocation IDs in assistant/provider order and expose ordered settled results. | Memory mutation or provider rendering. |
| `src/agent/tool-execution-result-processor/memory-ingest-tool-result-processor.ts` | Result memory ingestion processor | Preserve non-native/single-result ingestion; skip active native batches so ordered batch append is authoritative. | Batch ordering policy beyond deferring to `ToolInvocationBatch`. |

### 7.5 Off-spine concerns and existing capability reuse

| Concern | Served owner | Decision | Rationale |
|---|---|---|---|
| Provider-required native replay metadata | Provider converters + memory DTO model | Extend existing delta/invocation/message path | The current path already owns provider output normalization and semantic memory; adding a bounded discriminated field avoids a parallel persistence channel. |
| Tool-result value serialization | Provider renderers | Add narrow helper | Multiple renderers need stable string/object coercion, but provider wire structures remain provider-specific and explicit. |
| Frontend/status notifications | Existing event/status handlers | Preserve existing capability | The product/UI event path is separate from provider request rendering and should not be re-owned by renderers. |
| Legacy text/XML tool modes | Existing non-native parser/rendering path | Preserve but isolate | Text tags remain valid only where native API tool mode is not being used. |
| Renderer mode selection | Provider LLM classes | Create small selector | Selection repeats across five providers; centralize mode selection without hiding provider wire contracts. |
| Ordered batch persistence | `ToolResultEventHandler` / `ToolInvocationBatch` | Extend existing active batch flow | Current batch already owns call order; memory append must use that order for native continuation. |

### 7.6 Boundary encapsulation and dependency rules

- `ToolResultEventHandler` remains the authoritative owner for choosing native continuation vs legacy aggregate continuation. It must not know Gemini/Ollama/Anthropic/Mistral/OpenAI Responses wire shapes.
- `LLMRequestAssembler` remains the provider-agnostic owner of request assembly timing and working-context selection. It must call the selected renderer rather than inspect provider-specific tool payloads.
- Provider renderers are the only owners of provider request-message wire shape. Upstream runtime code must not build `functionResponse`, `tool_result`, `tool_call_id`, or `function_call_output` objects directly.
- Provider converters/API classes are the only owners of provider response-stream interpretation. Renderers must not reach back into SDK response objects except through the optional native context already stored on `ToolCallSpec`.
- `MemoryManager` and `WorkingContextSnapshot` own semantic conversation memory. They may persist bounded native tool-call replay context, but they must not choose provider request formatting.
- Forbidden shortcut: `ToolResultEventHandler -> provider renderer internals` or `LLMRequestAssembler -> provider-specific tool-result branches`.
- Renderer selection may depend on `resolveToolCallFormat()`; renderers must not call it internally to silently change wire shape. A renderer instance has one clear responsibility: native or text-history.
- `MemoryIngestToolResultProcessor` must not append active native batch results before the batch is complete; `ToolResultEventHandler` must append the ordered batch before native continuation.
- Forbidden shortcut: duplicating provider metadata in a second side table not serialized with working-context snapshots.
- Forbidden shortcut: a single provider renderer class that silently emits native or text history based on hidden global state during `render()`.

### 7.7 Interface boundary mapping

| Interface / method | Subject owned | Accepted identity shape | Target change |
|---|---|---|---|
| `ToolCallDelta` | One provider-emitted tool-call delta | `index`, optional `call_id`, optional `name`, optional `arguments_delta`, optional bounded native context | Add discriminated native context without changing normalized identity fields. |
| `ToolInvocation` constructor/model | One executable tool invocation | `name`, `arguments`, `id`, optional `turnId`, optional native context | Carry native context forward after segment completion. |
| `MemoryManager.ingestToolIntents()` | Completed assistant tool-call intents for a turn | `ToolInvocation[]`, optional `turnId` | Copy native context into `ToolCallSpec` with the normalized call. |
| `PromptRenderer.render(messages)` implementations | Provider request history | Internal `Message[]` with `ToolCallPayload`/`ToolResultPayload` | Emit provider-native history shapes and reject legacy tag rendering in native provider renderers. |
| `ToolResultEventHandler.dispatchNativeToolContinuation()` | Native tool-result continuation event route | Processed tool result events and agent context | Preserve route; no provider wire-format parameters added. |
| `createXPromptRendererForToolFormat()` selector functions | Renderer mode selection for one provider | Explicit `ToolCallFormat` (`api_tool_call`, `xml`, `json`, `sentinel`) | Return native renderer only for `api_tool_call`; otherwise return text-history renderer. |
| `MemoryManager.ingestToolResults()` | Ordered tool-result history append | `ToolResultEvent[]` already ordered by authoritative batch, `turnId`, optional source marker | Append traces/results in provided order; no provider formatting. |

### 7.8 Removal / decommission plan

| Item to remove or decommission | Why it becomes unnecessary | Replacement | Scope |
|---|---|---|---|
| `formatToolPayload()` legacy text-tag use inside Gemini/Ollama/Anthropic/Mistral/OpenAI Responses native renderers | Native provider APIs have structured tool-history channels; text tags cause provider-visible duplicate or misleading user text. | Provider-specific native mappings in each renderer. | In this change. |
| Tool-result-as-`user` message rendering in Ollama/Mistral native renderers | Their native API expects separate `role: "tool"` result messages. | `role: "tool"` messages with provider-required identity fields. | In this change. |
| Tool-call/result-as-`message` rendering in OpenAI Responses | Responses has typed `function_call` / `function_call_output` items. | Native response input items keyed by `call_id`. | In this change. |
| Any proposed compatibility branch that emits both native structures and legacy `[TOOL_*]` text for the same native turn | Dual-path history would keep two authoritative representations and risk duplicate model input. | Clean native-only history in native API mode. | Rejected. |
| Unconditional provider LLM construction of one renderer class regardless of tool-call format | It hides the native-vs-text boundary and can break non-native parser modes. | `resolveToolCallFormat()`-based selector returning one-responsibility renderer instances. | In this change. |
| Per-result working-context append for active native batches | It records reverse-settling parallel tool results in completion order before continuation sorting. | Ordered batch append after `ToolInvocationBatch.getOrderedSettledResults()`. | In this change. |

### 7.9 Backward-compatibility rejection log

| Candidate compatibility mechanism | Decision | Clean-cut replacement |
|---|---|---|
| Keep legacy text tags alongside native tool structures for provider compatibility | Rejected | Native provider renderers emit only native tool structures; non-native modes keep their existing text rendering separately. |
| Add provider-specific branches to `LLMRequestAssembler` for tool result formats | Rejected | Keep renderer boundary authoritative for wire format. |
| Store raw provider SDK objects in an untyped `any` field everywhere | Rejected | Use bounded `ProviderNativeToolCallContext` discriminated by provider and serialize it with message history. |
| Preserve old synthetic aggregate user message in `api_tool_call` as a fallback | Rejected | Native mode continues via `ToolContinuationReadyEvent`; aggregate message remains only for non-native modes. |
| Preserve non-native text-history renderers for `xml`/`json`/`sentinel` | N/A | This is required mode isolation, not a compatibility wrapper; text renderers are selected only outside `api_tool_call`. |
| Keep per-result memory append for active native batches | Rejected | Use ordered batch append once all results settle. |

### 7.10 Concrete examples / shape guidance

| Topic | Good shape | Avoided shape | Why it matters |
|---|---|---|---|
| Gemini continuation | `assistant ToolCallPayload -> {role:'model', parts:[{functionCall:{id,name,args}}]}` then `ToolResultPayload -> {role:'user', parts:[{functionResponse:{id,name,response}}]}` | `parts:[{text:'[TOOL_RESULT] ...'}]` | Keeps Gemini function-call IDs and thought-signature-bearing model parts in the native history channel. |
| Anthropic tool result ordering | `assistant[{tool_use}] -> user[{tool_result}, optional text]` | `user[{text}, {tool_result}]` or an intervening user text message | Anthropic rejects histories where result blocks are not immediate or first. |
| OpenAI Responses | `function_call` item followed by `function_call_output` keyed by `call_id` | `type:'message', role:'user', content:'[TOOL_RESULT] ...'` | Responses stateless continuation matches by typed call IDs, not text. |
| Ownership | `ToolResultEventHandler` chooses native continuation; renderer chooses provider wire format | `ToolResultEventHandler` builds provider-specific messages | Maintains the authoritative boundary and prevents provider-specific leakage into runtime routing. |
| Non-native isolation | `GeminiLLM -> createGeminiPromptRendererForToolFormat(xml) -> GeminiTextToolHistoryRenderer` | `GeminiPromptRenderer.render()` silently switches based on env var | Keeps renderer instances one-responsibility and testable. |
| Reverse settlement | Calls `[call_a, call_b]`, results settle `[call_b, call_a]`, memory appends/renders `[call_a, call_b]` | Render working-context completion order `[call_b, call_a]` | Provider matching and Anthropic/Gemini coalescing depend on assistant call order. |

## 8. Migration / Implementation Sequence

1. Add failing tests for native renderer shapes, non-native renderer isolation, and reverse-settlement ordering/coalescing.
2. Extract/copy current provider text-tag behavior into explicit provider text-history renderers for `xml`/`json`/`sentinel` modes.
3. Add renderer selection functions and update provider LLM constructors to select native vs text-history renderers through `resolveToolCallFormat()`.
4. Add typed native metadata plumbing with serializer coverage.
5. Update provider converters/API classes to populate native metadata where available.
6. Update native provider renderers to emit native tool-call/tool-result history and to group/sort adjacent result payloads against the preceding tool-call batch.
7. Add ordered native batch result memory ingestion: skip per-result working-context append for active native batches, append sorted results after `ToolInvocationBatch` completion, and keep lifecycle events/logs per-result.
8. Add/adjust continuation routing tests proving `ToolContinuationReadyEvent` path still avoids aggregate user messages in `api_tool_call` mode.
9. Add frontend/status regression tests or focused assertions proving tool result lifecycle notifications still fire.
10. Run full relevant unit/integration tests and the provider-native wire-format probe.

## 9. Validation Requirements

Minimum durable tests:

- OpenAI Chat regression: native `assistant.tool_calls` + `role: 'tool'`, no legacy tags.
- Gemini: `functionCall` + `functionResponse`, no legacy tags.
- Ollama: assistant `tool_calls` + `role: 'tool'`, `tool_name`, no legacy tags.
- Anthropic: `tool_use` + immediate `tool_result`, no legacy tags.
- Mistral: assistant `tool_calls` + `role: 'tool'`, `tool_call_id`, no legacy tags.
- OpenAI Responses: `function_call` + `function_call_output`, no legacy tags.
- Native continuation: no aggregate synthetic user message is appended in API tool-call mode.
- Legacy text mode: aggregate/text behavior remains where explicitly non-native.
- Non-native renderer selection: each in-scope provider uses text-history renderer for `xml`, `json`, and `sentinel`.
- Reverse-settlement ordering: active native batch results are appended and rendered in assistant tool-call order even when results settle in reverse order.
- Anthropic/Gemini coalescing: parallel result batches render as one immediate user result turn with result blocks/parts first and sorted by call order.

Recommended command examples:

```bash
pnpm install --frozen-lockfile
pnpm --dir autobyteus-ts build
pnpm --dir autobyteus-ts vitest run tests/unit/llm/prompt-renderers/provider-native-tool-history-renderers.test.ts
node tickets/provider_native_tool_history_rendering/probes/provider-native-renderer-current-state-probe.mjs
```

Adjust commands to the repository's actual test runner conventions during implementation.

## 10. Risks and Guardrails

- Do not overclaim live reliability for providers/models beyond wire-format correctness.
- Do not make `LLMRequestAssembler` provider-aware.
- Do not make `ToolResultEventHandler` choose provider wire format.
- Do not introduce a broad `any` metadata blob; use a bounded discriminated native metadata union.
- Do not suppress frontend-visible tool lifecycle events.
- Treat Anthropic's `role: 'user'` `tool_result` as a native typed block, not as the synthetic aggregate user-message bug.
- Preserve exact provider IDs and order for parallel tool calls.
- Do not let renderer instances switch modes internally based on hidden global state; select one renderer responsibility at construction.
- Do not append active native batch tool results to working context before the batch has completed and been sorted by `ToolInvocationBatch`.
