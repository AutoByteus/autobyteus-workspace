# Future-State Runtime Call Stacks (Debug-Trace Style)

## Design Basis

- Scope Classification: `Medium`
- Call Stack Version: `v1`
- Requirements: `tickets/done/llm-tool-call-ordering-multi-provider/requirements.md` (status `Design-ready`)
- Source Artifact: `tickets/done/llm-tool-call-ordering-multi-provider/proposed-design.md`
- Source Design Version: `v1`
- Referenced Sections:
  - `Change Inventory (Delta)`
  - `Target State (To-Be)`
  - `Requirements And Use Cases`

## Use Case Index (Stable IDs)

| use_case_id | Source Type (`Requirement`/`Design-Risk`) | Requirement ID(s) | Design-Risk Objective (if source=`Design-Risk`) | Use Case Name | Coverage Target (Primary/Fallback/Error) |
| --- | --- | --- | --- | --- | --- |
| UC-001 | Requirement | REQ-001, REQ-002, REQ-003, REQ-004 | N/A | DeepSeek tool-call turn persists valid history sequence | Yes/N/A/Yes |
| UC-002 | Requirement | REQ-001, REQ-002, REQ-003, REQ-005 | N/A | Kimi tool-call turn persists valid history sequence | Yes/N/A/Yes |
| UC-003 | Requirement | REQ-001, REQ-002, REQ-003, REQ-006 | N/A | GLM tool-call turn persists valid history sequence | Yes/N/A/Yes |
| UC-004 | Requirement | REQ-005, REQ-006 | N/A | Provider integration tests execute real tool-call continuation | Yes/N/A/Yes |
| UC-005 | Requirement | REQ-007 | N/A | User-facing provider naming shows GLM | Yes/N/A/N/A |

## Use Case: UC-001 [DeepSeek tool-call continuation ordering]

### Goal

Ensure strict assistant tool_calls -> tool results sequencing in request history for DeepSeek continuation calls.

### Preconditions

- Tool schemas provided to LLM streaming call.
- Streaming handler emits one or more tool invocations.

### Expected Outcome

Working context snapshot contains provider-valid ordering:
- one assistant message with grouped tool_calls (all invocations from turn),
- followed by corresponding tool messages,
- then next user/tool-summary prompt and later assistant responses.

### Primary Runtime Call Stack

```text
[ENTRY] src/agent/handlers/llm-user-message-ready-event-handler.ts:handle(event, context)
├── src/agent/llm-request-assembler.ts:prepareRequest(...) [STATE]
├── src/llm/base.ts:streamMessages(...) [ASYNC]
│   └── src/llm/api/openai-compatible-llm.ts:_streamMessagesToLLM(...) [IO]
├── src/agent/streaming/handlers/api-tool-call-streaming-response-handler.ts:feed(...) [STATE]
├── src/agent/streaming/handlers/api-tool-call-streaming-response-handler.ts:finalize(...) [STATE]
├── src/memory/memory-manager.ts:ingestToolIntents(toolInvocations, turnId) [STATE][IO]
│   ├── raw trace append per invocation [IO]
│   └── workingContextSnapshot.appendToolCalls(groupedToolCallsForTurn) [STATE]
├── src/agent/events/agent-events.ts:PendingToolInvocationEvent(...) [ASYNC]
├── src/agent/tool-execution-result-processor/memory-ingest-tool-result-processor.ts:process(...) [ASYNC]
│   └── src/memory/memory-manager.ts:ingestToolResult(...) [STATE][IO]
│       └── workingContextSnapshot.appendToolResult(...) [STATE]
├── src/agent/handlers/llm-user-message-ready-event-handler.ts:ingestAssistantResponse(..., suppressForToolTurn=true) [STATE]
│   └── prevents ordering-invalid assistant message insertion between tool_calls and tool results
└── src/agent/handlers/tool-result-event-handler.ts:dispatchResultsToInputPipeline(...) [ASYNC]
```

### Branching / Fallback Paths

```text
[ERROR] provider rejects malformed history ordering
src/llm/api/openai-compatible-llm.ts:_streamMessagesToLLM(...)
└── throws Error('Error in API streaming: ...tool_calls must be followed...')
```

Post-fix expected: this error path no longer triggered for valid tool-turn history.

### State And Data Transformations

- Streaming tool deltas -> `ToolInvocation[]` with stable call IDs.
- `ToolInvocation[]` -> grouped assistant tool_calls snapshot message.
- `ToolResultEvent[]` -> ordered tool result snapshot messages referencing tool_call_id.

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`

## Use Case: UC-002 [Kimi tool-call continuation ordering]

### Goal

Apply same strict ordering guarantees for Kimi OpenAI-compatible endpoint.

### Primary Runtime Call Stack

```text
[ENTRY] src/agent/handlers/llm-user-message-ready-event-handler.ts:handle(...)
├── src/llm/api/kimi-llm.ts:constructor(...)
│   └── src/llm/api/openai-compatible-llm.ts:_streamMessagesToLLM(...) [IO]
├── src/memory/memory-manager.ts:ingestToolIntents(...) [STATE]
├── src/memory/memory-manager.ts:ingestToolResult(...) [STATE]
└── continuation call via src/llm/base.ts:streamMessages(...) with provider-valid history
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`

## Use Case: UC-003 [GLM tool-call continuation ordering]

### Goal

Apply same strict ordering guarantees for GLM endpoint and latest model entries.

### Primary Runtime Call Stack

```text
[ENTRY] src/agent/handlers/llm-user-message-ready-event-handler.ts:handle(...)
├── src/llm/api/zhipu-llm.ts:constructor(...)
│   └── src/llm/api/openai-compatible-llm.ts:_streamMessagesToLLM(...) [IO]
├── src/memory/memory-manager.ts:ingestToolIntents(...) [STATE]
├── src/memory/memory-manager.ts:ingestToolResult(...) [STATE]
└── continuation call with provider-valid history ordering
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`

## Use Case: UC-004 [Real provider integration tests for tool-call continuation]

### Goal

Execute real provider tests (DeepSeek/Kimi/GLM) that assert tool-call continuation payload correctness and absence of sequencing error.

### Primary Runtime Call Stack

```text
[ENTRY] tests/integration/llm/api/{deepseek,kimi,zhipu}-llm.test.ts
├── instantiate provider LLM class
├── send tool-enabled stream request (tools + tool_choice required)
├── collect emitted tool call IDs/deltas
├── construct follow-up messages with assistant(tool_calls)+tool results
└── send continuation request; assert no sequencing error
```

### Error Path

```text
[ERROR] unauthorized provider key / invalid model id
tests/integration/... -> fail with explicit provider error; blocks AC closure
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`

## Use Case: UC-005 [User-facing GLM naming]

### Goal

Expose GLM naming in user-facing provider configuration surfaces.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-web/utils/llmThinkingConfigAdapter.ts:detectThinkingProvider(...)
├── schema key detection for thinking_type
└── maps provider display/behavior key to glm naming in UI logic
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `N/A`
