# Requirements Doc — Provider-Native Tool History Rendering

Status: Refined after architecture review round 1
Date: 2026-05-10
Owner: solution_designer
Ticket branch/worktree: `codex/provider-native-tool-history-rendering` at `/Users/normy/autobyteus_org/autobyteus-worktrees/provider-native-tool-history-rendering/autobyteus-ts`

## 1. Context

The completed tool-call reliability ticket intentionally solved OpenAI-compatible Chat / LM Studio native tool-call history and the shared native continuation path. It did **not** claim provider-native renderer correctness for Gemini, Ollama, Anthropic, Mistral, or OpenAI Responses.

This new ticket covers those provider-native API modes. Current probe evidence shows that these renderers still convert internal `ToolCallPayload` / `ToolResultPayload` to legacy text such as `[TOOL_CALL]` and `[TOOL_RESULT]`, often inside provider-visible `user` messages, even though the providers expose native tool-call/tool-result channels.

## 2. In Scope

- Gemini native API history rendering.
- Ollama native API history rendering.
- Anthropic native Messages API history rendering.
- Mistral native Chat API history rendering.
- OpenAI Responses API history rendering.
- Provider-specific executable wire-format probes/tests proving current and target request payload shapes.
- Keeping the existing API-mode `ToolContinuationReadyEvent` / no synthetic aggregate user-message continuation behavior.
- Preserving user-visible tool result events/logs for frontend/status purposes while preventing those events from becoming duplicate provider-visible user text in native API mode.

## 3. Out of Scope

- Reopening or changing the completed OpenAI-compatible Chat / LM Studio behavior except where shared tests must prove it remains correct.
- Changing XML/text parser modes except to ensure they remain available for non-native tool modes.
- Adding new public `AgentConfig` tool-choice policy or server UI configuration.
- Fixing provider/model quality issues where a provider accepts a correct native payload but a specific model still emits tool calls as plain text.
- Full live-provider E2E coverage with paid credentials for every provider; this ticket requires executable wire-format tests/probes and may include live smoke tests only when credentials are available.

## 4. Functional Requirements

### FR-001 — Native provider history rendering
For each in-scope native provider, internal assistant tool-call history and tool-result history must render into the provider's native wire format instead of legacy `[TOOL_CALL]` / `[TOOL_RESULT]` text.

Provider targets:
- Gemini: assistant/model `functionCall` parts and user `functionResponse` parts, preserving function-call `id` when available.
- Ollama: assistant messages with `tool_calls` and tool messages with `role: "tool"`, `tool_name`, and `content`.
- Anthropic: assistant `tool_use` content blocks and immediately-following user `tool_result` content blocks.
- Mistral: assistant `tool_calls` and tool messages with `role: "tool"`, `name`, `content`, and `tool_call_id`.
- OpenAI Responses: response input items using `function_call` / `function_call_output` semantics, with tool outputs keyed by `call_id`.

### FR-002 — No provider-visible synthetic aggregate tool-result user message in native API mode
When `api_tool_call` mode is active and the provider has a native tool-result channel, completed tool results must continue the LLM turn through native history only. The provider-visible request payload must not include the legacy aggregate tool-execution user message text.

### FR-003 — Tool result events/logging remain available
`ToolResultEvent` and related frontend/status notifications must remain emitted and usable. The change is routing/rendering behavior for native LLM requests, not removal of lifecycle events.

### FR-004 — Provider-specific identity and ordering semantics
The native renderer must preserve the provider's matching identity and ordering requirements:
- Anthropic `tool_result.tool_use_id` must match the assistant `tool_use.id`, and tool results must immediately follow the assistant tool-use turn.
- Mistral/OpenAI Chat-style tool results must match `tool_call_id`.
- OpenAI Responses tool outputs must match `call_id`.
- Gemini function responses must include the original function-call `id` when supplied.
- Ollama results must include the tool name and preserve call order for parallel calls.

### FR-005 — Preserve provider-required native metadata
Where a provider requires more than normalized `id/name/arguments` for safe stateless continuation, the implementation must preserve that provider metadata through streaming conversion, tool invocation, memory, and renderer layers.

Known cases:
- Gemini thinking/function calling documentation requires returning the original function-call `id` and warns that manually edited histories must preserve thought-signature-bearing parts.
- OpenAI Responses streaming emits function-call response output items with both `id` and `call_id`; stateless continuation needs `function_call_output.call_id`, and reasoning/function-call items may need to be carried in manually-managed context.

### FR-006 — Legacy text/tool parser modes remain isolated
Legacy text rendering (`[TOOL_CALL]`, `[TOOL_RESULT]`, XML/text parsing) may remain only in non-native modes or provider/model combinations explicitly configured not to use native tool APIs. Native provider renderers must not use those tags for tool-call/tool-result history.

### FR-007 — Executable validation
The ticket must add durable tests/probes that render a representative tool-call + tool-result history for every in-scope provider and assert the target provider-native shape plus absence of legacy tags.

### FR-008 — Mode-aware renderer isolation for non-native formats
For Gemini, Ollama, Anthropic, Mistral, and OpenAI Responses, provider-native history rendering must be selected only when `resolveToolCallFormat()` returns `api_tool_call`. When `resolveToolCallFormat()` returns `xml`, `json`, or `sentinel`, those providers must use an explicit legacy text-history renderer path that preserves the configured text/parser-mode tool-call behavior and does not emit provider-native tool-result structures for stored `ToolCallPayload` / `ToolResultPayload` history.

### FR-009 — Ordered and coalesced parallel tool-result replay
For a batch containing multiple assistant tool calls, native continuation history must be ordered by the original assistant tool-call order, not by tool execution completion order. Providers that require result blocks/parts in a single user turn, especially Anthropic and Gemini, must coalesce the completed batch into provider-valid result blocks/parts sorted by the prior `ToolCallSpec[]` order.

## 5. Acceptance Criteria

### AC-001 — Gemini native shape
Given a working context containing a user message, assistant `ToolCallPayload`, and `ToolResultPayload`, rendering with the Gemini native renderer produces:
- a model turn containing `functionCall` part(s);
- a user turn containing `functionResponse` part(s);
- no `[TOOL_CALL]`, `[TOOL_RESULT]`, or aggregate tool-execution text.

### AC-002 — Ollama native shape
Rendering the same internal history for Ollama produces assistant `tool_calls` and `role: "tool"` result messages with `tool_name`, and no legacy tool tags.

### AC-003 — Anthropic native shape
Rendering for Anthropic produces `tool_use` and `tool_result` content blocks. `tool_result` blocks come first in the user content array and immediately follow the assistant tool-use turn. No legacy tool tags appear.

### AC-004 — Mistral native shape
Rendering for Mistral produces assistant `tool_calls` and `role: "tool"` messages with `tool_call_id`, `name`, and provider-valid string content. No legacy tool tags appear.

### AC-005 — OpenAI Responses native shape
Rendering for OpenAI Responses produces provider-native response input items, including `function_call_output` keyed by `call_id`. No legacy text message with `[TOOL_RESULT]` appears.

### AC-006 — Native continuation no-duplication invariant
In `api_tool_call` mode, tool result handling enqueues `ToolContinuationReadyEvent` and prepares a continuation request without appending a synthetic aggregate `UserMessageReceivedEvent` / `AgentInputUserMessage` to working context.

### AC-007 — Frontend/status compatibility
Tool result status/log notifications still fire and remain available for frontend display. Validation must explicitly show that removing provider-visible synthetic user text does not remove user-visible tool execution events.

### AC-008 — Regression guard for completed ticket
OpenAI-compatible Chat rendering remains native (`assistant.tool_calls` + `role: "tool"` with `tool_call_id`) and still contains no legacy tool tags.

### AC-009 — Provider-native probe suite
A committed probe or unit-test suite must fail against the current state for Gemini/Ollama/Anthropic/Mistral/OpenAI Responses and pass after implementation.

### AC-010 — Non-native renderer isolation
With `AUTOBYTEUS_STREAM_PARSER` set to `xml`, `json`, or `sentinel`, each in-scope provider uses its legacy text-history renderer for stored tool-call/tool-result history. Validation shows the rendered payload follows the non-native parser-mode text path and does not include native-only tool-result objects such as Anthropic `tool_result`, Mistral/Ollama `role: "tool"`, Gemini `functionResponse`, or OpenAI Responses `function_call_output`.

### AC-011 — Reverse-settlement parallel result ordering
Given one assistant tool-call batch with calls `[call_a, call_b]`, and tool results settling in reverse order `[call_b, call_a]`, native continuation stores and renders results in `[call_a, call_b]` order. Anthropic renders a single immediately-following user message whose content begins with `tool_result` blocks for `call_a` then `call_b`; Gemini renders result parts in the same order; Ollama, Mistral, and OpenAI Responses emit their provider-native tool output entries in the same order.

## 6. Requirement-to-Scenario Coverage

- Scenario A: Gemini native function calling with one or more tool calls/results → FR-001, FR-004, FR-005, FR-007, FR-009; AC-001, AC-011.
- Scenario B: Ollama native tool call loop, including parallel call ordering → FR-001, FR-004, FR-007, FR-009; AC-002, AC-011.
- Scenario C: Anthropic Claude tool use with strict result ordering and reverse settlement → FR-001, FR-004, FR-007, FR-009; AC-003, AC-011.
- Scenario D: Mistral function calling loop → FR-001, FR-004, FR-007, FR-009; AC-004, AC-011.
- Scenario E: OpenAI Responses stateless continuation → FR-001, FR-004, FR-005, FR-007, FR-009; AC-005, AC-011.
- Scenario F: Shared agent runtime continuation → FR-002, FR-003, FR-006; AC-006, AC-007.
- Scenario G: OpenAI-compatible Chat regression guard → FR-006, FR-007; AC-008.
- Scenario H: Non-native XML/JSON/sentinel provider text-history modes → FR-006, FR-008, FR-007; AC-010.

## 7. Open Risks / Assumptions

- Gemini thought-signature preservation may require extending internal tool-call metadata beyond normalized `ToolCallSpec`.
- OpenAI Responses may require preserving response output items, not just normalized function call IDs, for full stateless context fidelity.
- Provider SDK types may differ slightly from REST docs; implementation must validate against installed SDK request shapes.
- Some Ollama models may not truly support native tool calls even when the API shape is correct; that is model support, not renderer correctness.


## 8. Approval Status

- Requirements basis status: `Refined after architecture review round 1`; still design-ready for architecture re-review.
- User instruction on 2026-05-10: work this existing ticket and send to architecture reviewer directly after understanding.
- Handoff interpretation: proceed to architecture review without an additional interactive approval round; do not treat this as implementation approval until architecture review passes.
- Architecture review round 1 impacts:
  - AR-001 refined FR-008 / AC-010 to make non-native renderer isolation explicit.
  - AR-002 refined FR-009 / AC-011 to make parallel result ordering/coalescing verifiable.
