# Future-State Runtime Call Stacks (Debug-Trace Style)

## Design Basis

- Scope Classification: `Small`
- Call Stack Version: `v2`
- Requirements: `tickets/done/ollama-api-tool-call-mode/requirements.md` (status `Design-ready`)
- Source Artifact:
  - `Small`: `tickets/done/ollama-api-tool-call-mode/implementation.md`
- Source Design Version: `v2`
- Referenced Sections:
  - Spine inventory sections: `Solution Sketch`, `Spine-Led Dependency And Sequencing Map`
  - Ownership sections: `Solution Sketch`, `File Placement Plan`

## Future-State Modeling Rule (Mandatory)

- Model target design behavior even when current code diverges.
- If migration from as-is to to-be requires transition logic, describe that logic in `Transition Notes`; do not replace the to-be call stack with current flow.
- Every use case must declare which spine(s) it exercises from the approved design basis.

## Use Case Index (Stable IDs)

| use_case_id | Spine ID(s) | Spine Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Governing Owner | Source Type (`Requirement`/`Design-Risk`) | Requirement ID(s) | Design-Risk Objective (if source=`Design-Risk`) | Use Case Name | Coverage Target (Primary/Fallback/Error) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `UC-001` | `DS-003` | `Bounded Local` | `convertOllamaToolCalls` | `Requirement` | `R-002` | `N/A` | Normalize Ollama tool-call payload into internal deltas | Yes/N/A/Yes |
| `UC-002` | `DS-002` | `Primary End-to-End` | `OpenAICompatibleLLM` | `Requirement` | `R-003` | `N/A` | Preserve LM Studio API-call tool-call behavior | Yes/N/A/Yes |
| `UC-003` | `DS-001`, `DS-003` | `Primary End-to-End` | `OllamaLLM` | `Requirement` | `R-001`, `R-002`, `R-005` | `N/A` | Emit Ollama API-call tool invocations from the live qwen model | Yes/N/A/Yes |
| `UC-004` | `DS-001`, `DS-002` | `Primary End-to-End` | LLM API integration test suite | `Requirement` | `R-004` | `N/A` | Regression tests catch provider-specific tool-call shape drift | Yes/N/A/Yes |
| `UC-005` | `DS-004` | `Primary End-to-End` | Single-agent runtime integration flow | `Requirement` | `R-006` | `N/A` | Execute an Ollama API-call tool invocation through the single-agent loop | Yes/N/A/Yes |

## Transition Notes

- No temporary compatibility layer is planned.
- The target state is a clean provider-specific adaptation for Ollama while keeping the shared downstream agent tool-call contract unchanged.
- The higher-layer validation extension should reuse the existing single-agent harness rather than add a second agent orchestration path.

## Use Case: UC-001 [Normalize Ollama tool-call payload into internal deltas]

### Spine Context

- Spine ID(s): `DS-003`
- Spine Scope: `Bounded Local`
- Governing Owner: `convertOllamaToolCalls`
- Why This Use Case Matters To This Spine:
  - The core failure is shape mismatch between Ollama tool-call objects and the internal `ToolCallDelta` contract.
- Why This Spine Span Is Long Enough:
  - The local spine covers raw Ollama tool-call input, index/id/name extraction, argument serialization, and returned delta shape.
- If `Spine Scope = Bounded Local`, Parent Owner:
  - `OllamaLLM._streamMessagesToLLM`

### Goal

- Convert full-object Ollama tool-call payloads into `ToolCallDelta[]` with JSON-string `arguments_delta`.

### Preconditions

- `part.message.tool_calls` exists on an Ollama response chunk.

### Expected Outcome

- The returned `ToolCallDelta[]` can be consumed directly by `ApiToolCallStreamingResponseHandler`.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-ts/src/llm/api/ollama-llm.ts:_streamMessagesToLLM(messages, kwargs)
└── autobyteus-ts/src/llm/converters/ollama-tool-call-converter.ts:convertOllamaToolCalls(toolCalls)
    ├── autobyteus-ts/src/llm/converters/ollama-tool-call-converter.ts:normalizeOllamaToolCall(toolCall, fallbackIndex) [STATE]
    ├── autobyteus-ts/src/llm/converters/ollama-tool-call-converter.ts:serializeOllamaToolArguments(argumentsObject) [STATE]
    └── autobyteus-ts/src/llm/api/ollama-llm.ts:_streamMessagesToLLM(...) # emits ChunkResponse.tool_calls
```

### Branching / Fallback Paths

```text
[ERROR] if Ollama tool call is malformed or arguments are not serializable
autobyteus-ts/src/llm/converters/ollama-tool-call-converter.ts:normalizeOllamaToolCall(...)
└── autobyteus-ts/src/llm/api/ollama-llm.ts:_streamMessagesToLLM(...) # emit best-effort delta or skip invalid call safely
```

### State And Data Transformations

- Ollama tool-call object -> extracted `index`, `call_id`, `name`, `arguments`
- arguments object -> JSON string -> `arguments_delta`
- normalized delta -> `ChunkResponse.tool_calls`

### Observability And Debug Points

- Logs emitted at:
  - provider error path only for malformed tool-call payloads
- Metrics/counters updated at:
  - none
- Tracing spans (if any):
  - none

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? (`Yes/No`): `No`
- Any tight coupling or cyclic cross-subsystem dependency introduced? (`Yes/No`): `No`
- Any naming-to-responsibility drift detected? (`Yes/No`): `No`

### Open Questions

- Whether to skip malformed tool-call entries or emit partial best-effort deltas if the payload is incomplete.

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Missing`

## Use Case: UC-002 [Preserve LM Studio API-call tool-call behavior]

### Spine Context

- Spine ID(s): `DS-002`
- Spine Scope: `Primary End-to-End`
- Governing Owner: `OpenAICompatibleLLM`
- Why This Use Case Matters To This Spine:
  - The Ollama fix must not change the working LM Studio baseline.
- Why This Spine Span Is Long Enough:
  - The spine shows the test entrypoint, LM Studio provider call, OpenAI delta conversion, and downstream tool-call emission boundary.

### Goal

- Keep LM Studio tool-call emission behavior unchanged while Ollama is fixed.

### Preconditions

- LM Studio runtime is available with a compatible text model.

### Expected Outcome

- Existing LM Studio integration coverage continues to observe emitted tool calls.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-ts/tests/integration/llm/api/lmstudio-llm.test.ts:it('should emit tool calls for LM Studio')
├── autobyteus-ts/src/llm/api/lmstudio-llm.ts:constructor(...)
├── autobyteus-ts/src/llm/api/openai-compatible-llm.ts:_streamMessagesToLLM(messages, kwargs) [ASYNC]
├── autobyteus-ts/src/llm/converters/openai-tool-call-converter.ts:convertOpenAIToolCalls(delta.tool_calls) [STATE]
└── autobyteus-ts/src/llm/utils/response-types.ts:ChunkResponse(...) # tool_calls emitted to test consumer
```

### Branching / Fallback Paths

```text
[ERROR] if LM Studio is unavailable or model discovery fails
autobyteus-ts/tests/integration/llm/api/lmstudio-llm.test.ts:getTextLLM()
└── integration test returns early without asserting provider behavior
```

### State And Data Transformations

- OpenAI-compatible `delta.tool_calls` -> internal `ToolCallDelta[]`

### Observability And Debug Points

- Logs emitted at:
  - integration skip paths only

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? (`Yes/No`): `No`
- Any tight coupling or cyclic cross-subsystem dependency introduced? (`Yes/No`): `No`
- Any naming-to-responsibility drift detected? (`Yes/No`): `No`

### Open Questions

- None

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`

## Use Case: UC-005 [Execute an Ollama API-call tool invocation through the single-agent loop]

### Spine Context

- Spine ID(s): `DS-004`
- Spine Scope: `Primary End-to-End`
- Governing Owner: single-agent runtime integration flow
- Why This Use Case Matters To This Spine:
  - Provider-level proof is necessary but not sufficient; this use case proves that the restored Ollama tool-call path survives the actual single-agent runtime loop.
- Why This Spine Span Is Long Enough:
  - The spine covers agent startup, LLM request assembly, Ollama streaming, tool-call parsing, tool execution, and the user-visible file side effect.

### Goal

- Prove one real single-agent Ollama API-call tool execution end-to-end using the existing agent runtime.

### Preconditions

- Local Ollama server is reachable.
- Model `qwen3.5:35b-a3b-coding-nvfp4` is available or selected by the helper.
- `AUTOBYTEUS_STREAM_PARSER=api_tool_call`.
- `write_file` is registered in the agent config.

### Expected Outcome

- The agent emits a `write_file` tool invocation, executes it, and the expected file appears in the test workspace.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-ts/tests/integration/agent/agent-single-flow-ollama.test.ts:it('executes a tool call end-to-end for a single agent')
├── autobyteus-ts/src/agent/factory/agent-factory.ts:createAgent(config)
├── autobyteus-ts/src/agent/handlers/llm-user-message-ready-event-handler.ts:handle(event, context) [ASYNC]
│   ├── autobyteus-ts/src/agent/llm-request-assembler.ts:prepareRequest(...)
│   ├── autobyteus-ts/src/llm/base.ts:streamMessages(messages, renderedPayload, kwargs) [ASYNC]
│   ├── autobyteus-ts/src/llm/api/ollama-llm.ts:_streamMessagesToLLM(messages, kwargs) [ASYNC]
│   ├── autobyteus-ts/src/llm/converters/ollama-tool-call-converter.ts:convertOllamaToolCalls(part.message.tool_calls) [STATE]
│   └── autobyteus-ts/src/agent/streaming/handlers/api-tool-call-streaming-response-handler.ts:feed(chunk) [STATE]
├── autobyteus-ts/src/agent/handlers/tool-invocation-request-event-handler.ts:handle(event, context)
├── autobyteus-ts/src/agent/handlers/tool-invocation-execution-event-handler.ts:handle(event, context)
├── autobyteus-ts/src/tools/file/write-file.ts:execute(...)
└── autobyteus-ts/tests/integration/agent/agent-single-flow-ollama.test.ts:waitForFile(...) # asserts workspace side effect
```

### Branching / Fallback Paths

```text
[ERROR] if Ollama is unavailable or no model is discoverable
autobyteus-ts/tests/integration/helpers/ollama-llm-helper.ts:createOllamaLLM()
└── integration test returns early without asserting runtime behavior
```

```text
[ERROR] if the model emits plain text instead of a tool call
autobyteus-ts/src/agent/handlers/llm-user-message-ready-event-handler.ts:handle(...)
└── no file is created and the integration test fails
```

### State And Data Transformations

- agent input -> `LLMUserMessage`
- memory-backed assembled request -> Ollama streamed chunks
- Ollama native tool-call payload -> internal `ToolCallDelta`
- parsed tool invocation -> `ExecuteToolInvocationEvent`
- executed tool result -> created file in the temporary workspace

### Observability And Debug Points

- Logs emitted at:
  - agent runtime handler failures
  - integration skip paths only
- Metrics/counters updated at:
  - none
- Tracing spans (if any):
  - none

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? (`Yes/No`): `No`
- Any tight coupling or cyclic cross-subsystem dependency introduced? (`Yes/No`): `No`
- Any naming-to-responsibility drift detected? (`Yes/No`): `No`

### Open Questions

- Whether a follow-up assertion on the assistant’s post-tool reply is worth adding later, or whether the file side effect alone is the right minimal higher-layer proof.

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`

## Use Case: UC-003 [Emit Ollama API-call tool invocations from the live qwen model]

### Spine Context

- Spine ID(s): `DS-001`, `DS-003`
- Spine Scope: `Primary End-to-End`
- Governing Owner: `OllamaLLM`
- Why This Use Case Matters To This Spine:
  - This is the broken production path the ticket exists to restore.
- Why This Spine Span Is Long Enough:
  - The spine covers the caller, provider request with tools, streamed Ollama response, provider-specific conversion, normalized chunk emission, and downstream agent handler boundary.

### Goal

- Make Ollama API-call mode emit tool invocations that the existing agent runtime can consume.

### Preconditions

- Local Ollama server is reachable.
- Model `qwen3.5:35b-a3b-coding-nvfp4` is available.
- Tool schema is provided in `kwargs.tools`.

### Expected Outcome

- A streamed Ollama tool-call chunk yields at least one normalized `ToolCallDelta`, and the existing handler can reconstruct invocation arguments from it.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-ts/tests/integration/llm/api/ollama-llm.test.ts:it('should emit tool calls for Ollama')
├── autobyteus-ts/src/llm/base.ts:streamUserMessage(userMessage, kwargs)
├── autobyteus-ts/src/llm/api/ollama-llm.ts:_streamMessagesToLLM(messages, kwargs) [ASYNC]
│   ├── autobyteus-ts/src/llm/prompt-renderers/ollama-prompt-renderer.ts:render(messages) [STATE]
│   ├── ollama@0.6.3:Ollama.chat({ model, messages, stream: true, tools }) [IO]
│   ├── autobyteus-ts/src/llm/converters/ollama-tool-call-converter.ts:convertOllamaToolCalls(part.message.tool_calls) [STATE]
│   └── autobyteus-ts/src/llm/utils/response-types.ts:ChunkResponse({ tool_calls }) [STATE]
└── autobyteus-ts/src/agent/streaming/handlers/api-tool-call-streaming-response-handler.ts:feed(chunk) [STATE]
```

### Branching / Fallback Paths

```text
[ERROR] if local Ollama runtime or model is unavailable
autobyteus-ts/tests/integration/llm/api/ollama-llm.test.ts:getOllamaLLM()
└── integration test returns early without asserting provider behavior
```

```text
[ERROR] if the model responds without tool_calls
autobyteus-ts/src/llm/api/ollama-llm.ts:_streamMessagesToLLM(...)
└── integration test fails because no tool calls were emitted
```

### State And Data Transformations

- internal `Message[]` + tool schema -> Ollama chat request
- streamed `message.thinking` / `message.content` / `message.tool_calls` -> normalized `ChunkResponse`
- normalized `ToolCallDelta` -> reconstructed invocation arguments downstream

### Observability And Debug Points

- Logs emitted at:
  - provider conversion error paths only
- Metrics/counters updated at:
  - none
- Tracing spans (if any):
  - none

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? (`Yes/No`): `No`
- Any tight coupling or cyclic cross-subsystem dependency introduced? (`Yes/No`): `No`
- Any naming-to-responsibility drift detected? (`Yes/No`): `No`

### Open Questions

- Whether non-streaming Ollama tool calls need a follow-on improvement beyond the required streaming parity path.

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`

## Use Case: UC-004 [Regression tests catch provider-specific tool-call shape drift]

### Spine Context

- Spine ID(s): `DS-001`, `DS-002`
- Spine Scope: `Primary End-to-End`
- Governing Owner: LLM API integration/unit test suite
- Why This Use Case Matters To This Spine:
  - The ticket should leave behind durable regression coverage, not just a local manual repro.
- Why This Spine Span Is Long Enough:
  - The spine covers the test entrypoint, provider adapter surface, emitted chunk contract, and assertion boundary.

### Goal

- Prevent future regressions where Ollama tool-call shapes diverge silently from LM Studio/OpenAI-compatible behavior.

### Preconditions

- Unit tests can mock the `ollama` SDK.
- Live integration environment is available when running the live test.

### Expected Outcome

- Unit coverage fails if tool schemas are not forwarded or if `message.tool_calls` is not converted.
- Live integration coverage fails if the local qwen model no longer emits usable tool calls.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-ts/tests/unit/llm/api/ollama-llm.test.ts:provider unit tests
├── autobyteus-ts/src/llm/api/ollama-llm.ts:_streamMessagesToLLM(messages, kwargs)
├── autobyteus-ts/src/llm/converters/ollama-tool-call-converter.ts:convertOllamaToolCalls(toolCalls)
└── autobyteus-ts/src/llm/utils/response-types.ts:ChunkResponse(...)
```

### Branching / Fallback Paths

```text
[ERROR] if the mocked Ollama response omits tools or emits malformed tool call shapes
autobyteus-ts/tests/unit/llm/api/ollama-llm.test.ts
└── assertion failure
```

### State And Data Transformations

- mocked Ollama payload -> normalized chunk contract -> test assertions

### Observability And Debug Points

- Logs emitted at:
  - none beyond test failure output

### Design Smells / Gaps

- Any legacy/backward-compatibility branch present? (`Yes/No`): `No`
- Any tight coupling or cyclic cross-subsystem dependency introduced? (`Yes/No`): `No`
- Any naming-to-responsibility drift detected? (`Yes/No`): `No`

### Open Questions

- None

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`
