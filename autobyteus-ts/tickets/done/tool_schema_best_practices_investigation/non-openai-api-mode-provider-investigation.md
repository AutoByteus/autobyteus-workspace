# Non-OpenAI-Compatible Native API Tool-Mode Investigation

Date: 2026-05-09

## Scope

Follow-up investigation after LM Studio/OpenAI-compatible chat mode was corrected. The question was whether the same API-mode tool-call reliability issue exists for non-OpenAI-compatible native providers: Gemini, Ollama, Anthropic, Mistral, and OpenAI Responses.

## Official API format comparison

### Gemini

Official Gemini function calling history is typed, not textual:

- model response contains `functionCall` parts;
- tool result is sent back as a `functionResponse` part, with the function call appended to history first;
- the docs show basic JavaScript using `{ role: 'user', parts: [{ functionResponse: ... }] }`; newer/multimodal examples also show `{ role: 'tool', parts: [{ functionResponse: ... }] }`.

Source: https://ai.google.dev/gemini-api/docs/function-calling

### Ollama

Official Ollama tool history is OpenAI-chat-like, not textual:

- assistant message contains `tool_calls`;
- tool output is sent as `{ role: "tool", tool_name: "...", content: "..." }`.

Source: https://docs.ollama.com/capabilities/tool-calling

### Anthropic / Claude

Official Anthropic Messages API does not use a separate `role: "tool"`, but it still uses typed blocks, not text tags:

- assistant content contains `tool_use` blocks;
- user content contains `tool_result` blocks;
- tool result blocks must immediately follow the assistant tool-use message and appear first in the user content array.

Source: https://platform.claude.com/docs/en/agents-and-tools/tool-use/handle-tool-calls

### Mistral

Official Mistral chat function calling is OpenAI-chat-like:

- append the model response message containing `tool_calls`;
- append tool results as `{ role: "tool", name, content, tool_call_id }`.

Source: https://docs.mistral.ai/capabilities/function_calling

### OpenAI Responses

Official Responses API uses response input/output items:

- preserve model output items such as `function_call`;
- append tool result items as `{ type: "function_call_output", call_id, output }`.

Source: https://developers.openai.com/api/docs/guides/function-calling

## Local probe

Probe script:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-tool-schema-best-practices/autobyteus-ts/tickets/tool_schema_best_practices_investigation/probes/non-openai-api-renderer-probe.mjs`

Probe output:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-tool-schema-best-practices/autobyteus-ts/tickets/tool_schema_best_practices_investigation/probes/non-openai-api-renderer-probe-output.json`

The probe rendered one prior tool call and one tool result through each provider renderer.

Summary:

| Provider renderer | Native shape observed? | Legacy `[TOOL_CALL]`/`[TOOL_RESULT]` text observed? | Classification |
| --- | ---: | ---: | --- |
| OpenAI-compatible chat | Yes | No | Correct after current fix |
| Gemini | No | Yes | Incorrect for native API mode |
| Ollama | No | Yes | Incorrect for native API mode |
| Anthropic | No | Yes | Incorrect for native API mode |
| Mistral | No | Yes | Incorrect for native API mode |
| OpenAI Responses | No | Yes | Incorrect for native Responses API mode |

## Key finding

The current ticket work fixes the shared continuation-routing bug for `api_tool_call` mode: tool results no longer need to be routed through the synthetic aggregate user input path.

However, that is not sufficient for all native API providers. Several provider prompt renderers still convert internal `ToolCallPayload` / `ToolResultPayload` history into legacy text markers:

- `[TOOL_CALL] ...`
- `[TOOL_RESULT] ...`

This remains wrong for native API tool-call mode for Gemini, Ollama, Anthropic, Mistral, and OpenAI Responses.

## Provider-specific notes

### Gemini

Current renderer output:

```json
{
  "role": "model",
  "parts": [{ "text": "[TOOL_CALL] run_bash {'command': 'pwd'}" }]
},
{
  "role": "user",
  "parts": [{ "text": "[TOOL_RESULT] run_bash {'stdout': '/tmp\\n'}" }]
}
```

Required native shape should use `functionCall` and `functionResponse` parts. Role choice for function responses needs to match current `@google/genai` SDK expectations; docs show user-role in the basic flow and tool-role in newer multimodal examples, but both require typed `functionResponse`, not text.

### Ollama

Current renderer output uses text markers. Required native shape is assistant `tool_calls` and tool-result messages with `role: "tool"` and `tool_name`.

Ollama's documented tool result does not include `tool_call_id`; mapping may rely on order/name and function `index` for parallel calls.

### Anthropic

Current renderer output uses text markers in user/assistant messages. Anthropic does use user/assistant roles, but not raw text tags. It requires content blocks:

- assistant: `{ type: "tool_use", id, name, input }`
- user: `{ type: "tool_result", tool_use_id, content, is_error? }`

This is especially important because Anthropic enforces immediate adjacency and content-block ordering.

### Mistral

Current renderer output uses text markers. Required native shape is assistant `tool_calls` and `role: "tool"` messages with `name`, `content`, and `tool_call_id`.

### OpenAI Responses

Current renderer output uses message text markers. Required native Responses shape is `function_call` output items preserved in `input`, followed by `function_call_output` input items.

## Design implication

The current solution should be described as solving OpenAI-compatible Chat providers, plus the shared no-synthetic-user-continuation path. It does not yet fully solve all native API providers.

Recommended follow-up design:

1. Introduce provider-native renderers for `api_tool_call` mode per provider, rather than letting legacy text renderers handle tool payloads.
2. Keep legacy `[TOOL_CALL]` / `[TOOL_RESULT]` rendering only for text-parser modes (`xml`, `json`, `sentinel`) and providers without native tool support.
3. Add provider-specific wire-format tests/probes:
   - Gemini: typed `functionCall` / `functionResponse` parts.
   - Ollama: assistant `tool_calls`, tool `role` with `tool_name`.
   - Anthropic: `tool_use` / `tool_result` content blocks, with result blocks first.
   - Mistral: assistant `tool_calls`, tool `role` with `tool_call_id`.
   - OpenAI Responses: `function_call` / `function_call_output` input items.
4. Provider-specific tool schema normalization may also be needed, but history rendering is the immediate correctness gap proven by the probe.
