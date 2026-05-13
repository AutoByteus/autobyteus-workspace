# Investigation Notes — Provider-Native Tool History Rendering

Status: Current-state investigation complete; revised after architecture review round 1
Date: 2026-05-10
Owner: solution_designer

## 1. Bootstrap Context

- Original user/workspace context: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo`.
- Dedicated ticket worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/provider-native-tool-history-rendering/autobyteus-ts`.
- Ticket branch: `codex/provider-native-tool-history-rendering`.
- Base branch/source: `origin/personal`.
- Base commit: `8ff0cd3c622b4a2d2a8a2e2311014ff5b60ffcec`.
- Artifact directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/provider-native-tool-history-rendering/autobyteus-ts/tickets/provider_native_tool_history_rendering`.

## 2. External Provider References Consulted

### Gemini
- Official docs: https://ai.google.dev/gemini-api/docs/function-calling
- Findings:
  - Gemini returns `functionCall` objects with `id`, `name`, and `args`.
  - The final request appends the model response content and then appends a user `functionResponse` part: `{ role: 'user', parts: [{ functionResponse: { name, response, id } }] }`.
  - Gemini docs state that when manually managing function-calling history, the original function-call `id` should be included in the function response; for thinking models, thought-signature-bearing parts must be preserved when manually constructing history.

### Ollama
- Official docs: https://docs.ollama.com/capabilities/tool-calling
- Findings:
  - Ollama chat history uses assistant messages with `tool_calls`.
  - Tool results are sent as `{"role":"tool", "tool_name": call.function.name, "content": ...}`.
  - Parallel tool calling sends one assistant message with multiple `tool_calls`, followed by one `role: "tool"` result message per tool result in order.

### Anthropic
- Official docs: https://platform.claude.com/docs/en/agents-and-tools/tool-use/handle-tool-calls
- Findings:
  - Claude uses `tool_use` blocks in assistant messages and `tool_result` blocks in user messages.
  - The `tool_result.tool_use_id` must match the previous `tool_use.id`.
  - Formatting requirements are strict: tool-result blocks must immediately follow corresponding tool-use blocks, and tool-result blocks must come first in the user content array.
  - Anthropic explicitly distinguishes this from APIs with separate `tool` roles.

### Mistral
- Official docs: https://docs.mistral.ai/capabilities/function_calling
- Findings:
  - Mistral documents a flow of assistant function call(s) followed by tool result(s), including parallel calls.
  - The assistant response message is appended to history.
  - Tool results are appended as `{ role: "tool", name: function_name, content: function_result, tool_call_id: tool_call.id }`.
  - Mistral supports `tool_choice` and `parallel_tool_calls`, but this ticket does not introduce a new public tool-choice policy.

### OpenAI Responses
- Official docs: https://developers.openai.com/api/docs/guides/function-calling
- Findings:
  - Responses API function calls appear as output items with `type: "function_call"`, `id`, `call_id`, `name`, and JSON `arguments`.
  - Function outputs are appended back as input items with `type: "function_call_output"`, `call_id`, and string `output`.
  - Streaming emits `response.output_item.added`, `response.function_call_arguments.delta/done`, and `response.output_item.done` for function calls.

### Re-verification on 2026-05-10 before architecture handoff

The official provider references above were re-opened immediately before architecture handoff on 2026-05-10:
- Gemini function calling docs still show native `functionCall` / `functionResponse` history, state that Gemini 3 returns function-call `id`, and warn that manually-managed thinking/function-calling histories must preserve `thought_signature` parts and exact function-call IDs.
- Ollama tool-calling docs still show assistant `tool_calls` followed by `role: "tool"` messages with `tool_name` and string `content`, including parallel tool-call ordering examples.
- Anthropic tool-use docs still require assistant `tool_use` blocks and immediately-following user `tool_result` blocks, with all `tool_result` blocks first in the user content array.
- Mistral docs redirect from `https://docs.mistral.ai/capabilities/function_calling` to `https://docs.mistral.ai/studio-api/conversations/function-calling` and still show tool outputs as `role: "tool"`, `name`, `content`, and `tool_call_id`.
- OpenAI Responses function-calling docs still show tool outputs appended as `type: "function_call_output"`, keyed by `call_id`, with string `output` as the normal result format.

## 3. Current Code Paths Inspected

Package root: `/Users/normy/autobyteus_org/autobyteus-worktrees/provider-native-tool-history-rendering/autobyteus-ts/autobyteus-ts`

### Shared message/memory model
- `src/llm/utils/messages.ts`
  - Defines `ToolCallPayload` and `ToolResultPayload` on internal `Message`.
- `src/memory/working-context-snapshot.ts`
  - `appendToolCalls()` stores assistant messages with `ToolCallPayload`.
  - `appendToolResult()` stores `MessageRole.TOOL` messages with `ToolResultPayload`.
- `src/memory/memory-manager.ts`
  - `ingestToolIntents()` appends normalized tool-call history to working context.
  - `ingestToolResult()` appends normalized tool-result history to working context.

### Shared native continuation path
- `src/agent/handlers/tool-result-event-handler.ts`
  - In `api_tool_call` mode, `dispatchNativeToolContinuation()` enqueues `ToolContinuationReadyEvent` and does **not** append the aggregate synthetic user message.
  - In non-native modes, it still builds the legacy aggregate `AgentInputUserMessage` from tool results.
- `src/agent/handlers/llm-user-message-ready-event-handler.ts`
  - Handles `ToolContinuationReadyEvent` by calling `LLMRequestAssembler.prepareToolContinuationRequest()` without adding a new user message.
- `src/agent/llm-request-assembler.ts`
  - `prepareToolContinuationRequest()` renders existing working-context messages only.

Conclusion: shared no-aggregate continuation behavior is already present from the completed ticket. Remaining issue is provider renderer output for existing `ToolCallPayload` / `ToolResultPayload` messages.

### Provider renderers
- `src/llm/prompt-renderers/openai-chat-renderer.ts`
  - Already renders native Chat shape: assistant `tool_calls` and `role: "tool"` results.
- `src/llm/prompt-renderers/gemini-prompt-renderer.ts`
  - Current state formats tool calls/results as text `[TOOL_CALL]` / `[TOOL_RESULT]` inside Gemini `parts[].text`.
- `src/llm/prompt-renderers/ollama-prompt-renderer.ts`
  - Current state formats tool calls/results as text and maps tool results to `role: user` rather than `role: tool`.
- `src/llm/prompt-renderers/anthropic-prompt-renderer.ts`
  - Current state formats tool calls/results as text instead of `tool_use` / `tool_result` content blocks.
- `src/llm/prompt-renderers/mistral-prompt-renderer.ts`
  - Current state formats tool calls/results as text and maps tool results to `role: user` rather than `role: tool`.
- `src/llm/prompt-renderers/openai-responses-renderer.ts`
  - Current state formats tool calls/results as `type: "message"` with textual `[TOOL_CALL]` / `[TOOL_RESULT]` content.

### Provider APIs/converters
- `src/llm/api/gemini-llm.ts`
  - Passes `config.tools`; converter emits native `tool_calls` deltas from Gemini `functionCall` parts.
- `src/llm/api/ollama-llm.ts`
  - Passes `tools`; converter reads `message.tool_calls`.
- `src/llm/api/anthropic-llm.ts`
  - Passes `tools`; converter reads `tool_use` stream events.
- `src/llm/api/mistral-llm.ts`
  - Passes `...kwargs` including tools; converter reads Mistral `delta.toolCalls`.
- `src/llm/api/openai-responses-llm.ts`
  - Passes Responses `tools`; converter emits normalized tool-call deltas from function-call events.

Conclusion: providers can emit native tool-call deltas, but rendered history for subsequent turns is not native for non-OpenAI-compatible providers.

## 4. Executable Probe

Probe script:
- `/Users/normy/autobyteus_org/autobyteus-worktrees/provider-native-tool-history-rendering/autobyteus-ts/tickets/provider_native_tool_history_rendering/probes/provider-native-renderer-current-state-probe.mjs`

Probe output:
- `/Users/normy/autobyteus_org/autobyteus-worktrees/provider-native-tool-history-rendering/autobyteus-ts/tickets/provider_native_tool_history_rendering/probes/provider-native-renderer-current-state-probe-output.json`

Command run:

```bash
AUTOBYTEUS_TS_DIST=/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-ts/dist \
AUTOBYTEUS_TS_DIST_GIT_HEAD=$(git -C /Users/normy/autobyteus_org/autobyteus-workspace-superrepo rev-parse HEAD) \
node /Users/normy/autobyteus_org/autobyteus-worktrees/provider-native-tool-history-rendering/autobyteus-ts/tickets/provider_native_tool_history_rendering/probes/provider-native-renderer-current-state-probe.mjs
```

Reason for using the superrepo dist path: the new worktree is source-only and did not have `node_modules`/`dist` built yet; the shared superrepo checkout was at the same commit (`8ff0cd3c622b4a2d2a8a2e2311014ff5b60ffcec`) and had built dist available.

Probe summary:

| Renderer | Native shape observed | Legacy `[TOOL_CALL]` text | Legacy `[TOOL_RESULT]` text |
|---|---:|---:|---:|
| OpenAI-compatible Chat | true | false | false |
| Gemini | false | true | true |
| Ollama | false | true | true |
| Anthropic | false | true | true |
| Mistral | false | true | true |
| OpenAI Responses | false | true | true |

## 5. Root-Cause Classification

- Change posture: behavior change plus refactor of provider-native rendering.
- Root cause: boundary/ownership issue plus shared structure looseness.
  - The internal memory model correctly stores semantic tool-call/tool-result history, and the shared native continuation path correctly avoids synthetic aggregate messages.
  - Provider-native renderers still own an obsolete text rendering policy for tool payloads, so the provider boundary receives text instead of native tool-history structures.
  - Some providers require provider-specific metadata/ordering that normalized `id/name/arguments` may not fully preserve.
- Refactor needed now: yes.
  - Direct local replacement in each renderer would fix the symptom, but provider-required metadata flow must also be designed so Gemini/OpenAI Responses are not merely shape-correct while losing continuation fidelity.

## 6. Open Questions / Risks

- Gemini: exact SDK object spelling for thought signatures and function-call parts must be validated against installed `@google/genai` types/runtime tests.
- OpenAI Responses: decide whether to preserve full function-call output items in working context or reconstruct minimal `function_call` items from normalized tool calls. Design recommends preserving native items where available.
- Anthropic: if multiple `tool_result` blocks are rendered in one user message, they must come before any text. Current framework usually stores one `ToolResultPayload` per message; batching behavior should be explicitly tested.
- Ollama: provider API shape can be correct even when individual local model templates do not support native tool calling reliably.


## 7. Architecture Review Round 1 Rework Evidence

Design review report:
- `/Users/normy/autobyteus_org/autobyteus-worktrees/provider-native-tool-history-rendering/autobyteus-ts/tickets/provider_native_tool_history_rendering/design-review-report.md`

### AR-001 — Non-native renderer isolation evidence

Current code evidence inspected on 2026-05-10:
- `src/utils/tool-call-format.ts` defines `resolveToolCallFormat()` with formats `xml`, `json`, `sentinel`, and `api_tool_call`; default is `api_tool_call`.
- `src/llm/api/gemini-llm.ts` constructs `new GeminiPromptRenderer()` unconditionally.
- `src/llm/api/ollama-llm.ts` constructs `new OllamaPromptRenderer()` unconditionally.
- `src/llm/api/anthropic-llm.ts` constructs `new AnthropicPromptRenderer()` unconditionally.
- `src/llm/api/mistral-llm.ts` constructs `new MistralPromptRenderer()` unconditionally.
- `src/llm/api/openai-responses-llm.ts` constructs `new OpenAIResponsesRenderer()` unconditionally.
- `src/llm/api/lmstudio-llm.ts` is the useful existing pattern: it selects `OpenAIChatRenderer` only for `api_tool_call`, otherwise `LMStudioTextToolHistoryRenderer`.
- `src/llm/prompt-renderers/lmstudio-text-tool-history-renderer.ts` explicitly documents that it is the legacy renderer for text-parser modes only.

Design implication:
- Replacing the existing in-scope provider renderer classes with native-only output is safe only if the provider LLM classes select a separate legacy text-history renderer whenever the resolved tool-call format is not `api_tool_call`.

### AR-002 — Parallel tool-result ordering/coalescing evidence

Current code evidence inspected on 2026-05-10:
- `src/agent/handlers/llm-user-message-ready-event-handler.ts` starts an active `ToolInvocationBatch` from `streamingHandler.getAllInvocations()` and then calls `memoryManager.ingestToolIntents(toolInvocations, activeTurnId)` in provider/stream order.
- `src/agent/tool-invocation-batch.ts` stores `expectedInvocationIds` in invocation order and exposes `getOrderedSettledResults()` that returns settled results in that expected order.
- `src/agent/handlers/tool-result-event-handler.ts` waits until the active batch is complete, calls `activeBatch.getOrderedSettledResults()`, and passes those sorted results to continuation dispatch.
- However, `src/agent/tool-execution-result-processor/memory-ingest-tool-result-processor.ts` currently calls `memoryManager.ingestToolResult(event, turnId)` for each processed result event before batch completion.
- `src/memory/memory-manager.ts` `ingestToolResult()` immediately appends one `ToolResultPayload` message to `WorkingContextSnapshot`, so reverse-settling parallel tools can be stored in completion order before the handler obtains sorted results for continuation.

Design implication:
- The authoritative ordering owner already exists: `ToolInvocationBatch` knows the assistant tool-call order. The design must route native API memory append through that ordered batch instead of through per-result memory ingestion, then render/coalesce adjacent results against the preceding `ToolCallSpec[]` batch.
