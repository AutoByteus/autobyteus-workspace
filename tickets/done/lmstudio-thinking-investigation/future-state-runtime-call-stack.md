# Future-State Runtime Call Stacks (Debug-Trace Style)

## Design Basis

- Scope Classification: `Small`
- Call Stack Version: `v1`
- Requirements: `tickets/done/lmstudio-thinking-investigation/requirements.md` (status `Design-ready`)
- Source Artifact:
  - `Small`: `tickets/done/lmstudio-thinking-investigation/implementation.md` (solution sketch as lightweight design basis)
- Source Design Version: `v1`
- Referenced Sections:
  - Spine inventory sections: `implementation.md -> Solution Sketch`
  - Ownership sections: `implementation.md -> File Placement Plan`

## Use Case Index (Stable IDs)

| use_case_id | Spine ID(s) | Spine Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Governing Owner | Source Type (`Requirement`/`Design-Risk`) | Requirement ID(s) | Design-Risk Objective (if source=`Design-Risk`) | Use Case Name | Coverage Target (Primary/Fallback/Error) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| UC-001 | DS-001 | Primary End-to-End | OpenAICompatibleLLM | Requirement | R-001,R-003 | N/A | Sync reasoning normalization | Yes/N/A/Yes |
| UC-002 | DS-001 | Primary End-to-End | OpenAICompatibleLLM | Requirement | R-002,R-003,R-004 | N/A | Stream reasoning normalization with content continuity | Yes/N/A/Yes |
| UC-003 | DS-001 | Bounded Local | OpenAICompatibleLLM | Requirement | R-004,R-005 | N/A | Mixed stream content/tool/reasoning emission | Yes/N/A/Yes |

## Transition Notes

- No migration branch is required. The future-state behavior is a direct extension of the existing normalization path in `OpenAICompatibleLLM`.
- No compatibility wrapper should be introduced; providers that do not emit reasoning fields simply continue returning `null`.

## Use Case: UC-001 [Sync reasoning normalization]

### Spine Context

- Spine ID(s): `DS-001`
- Spine Scope: `Primary End-to-End`
- Governing Owner: `OpenAICompatibleLLM`
- Why This Use Case Matters To This Spine: The root defect is the loss of reasoning during normalized response creation.
- Why This Spine Span Is Long Enough: It begins at the provider adapter entrypoint and ends at the normalized response object consumed by the downstream agent event pipeline.

### Goal

- Preserve separate reasoning returned by an OpenAI-compatible sync response.

### Preconditions

- Provider returns a chat-completion response whose assistant message contains `reasoning_content` or `reasoning`.

### Expected Outcome

- `CompleteResponse.reasoning` contains the extracted reasoning text.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-ts/src/llm/base.ts:sendMessages(...)
└── autobyteus-ts/src/llm/api/openai-compatible-llm.ts:_sendMessagesToLLM(...) [ASYNC]
    ├── autobyteus-ts/src/llm/prompt-renderers/openai-chat-renderer.ts:render(...) [STATE]
    ├── openai client chat.completions.create(...) [IO]
    ├── autobyteus-ts/src/llm/api/openai-compatible-llm.ts:extractReasoningText(...) [STATE]
    └── autobyteus-ts/src/llm/utils/response-types.ts:CompleteResponse(...) [STATE]
```

### Branching / Fallback Paths

```text
[ERROR] if provider request throws
autobyteus-ts/src/llm/api/openai-compatible-llm.ts:_sendMessagesToLLM(...)
└── Error("Error in API request: ...")
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`

## Use Case: UC-002 [Stream reasoning normalization with content continuity]

### Spine Context

- Spine ID(s): `DS-001`
- Spine Scope: `Primary End-to-End`
- Governing Owner: `OpenAICompatibleLLM`
- Why This Use Case Matters To This Spine: The live user-visible failure occurs in streamed chat responses where reasoning never becomes reasoning segments.
- Why This Spine Span Is Long Enough: It starts at the streaming provider entrypoint, passes through normalized chunk emission, and reaches the generic reasoning-segment consumer boundary.

### Goal

- Emit reasoning chunks without interrupting normal streamed answer text.

### Preconditions

- Provider stream emits `delta.reasoning_content` or `delta.reasoning`.

### Expected Outcome

- The chunk stream contains reasoning chunks and still emits answer text chunks and final usage.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-ts/src/llm/base.ts:streamMessages(...)
└── autobyteus-ts/src/llm/api/openai-compatible-llm.ts:_streamMessagesToLLM(...) [ASYNC]
    ├── autobyteus-ts/src/llm/prompt-renderers/openai-chat-renderer.ts:render(...) [STATE]
    ├── openai client chat.completions.create(..., stream=true) [IO]
    ├── autobyteus-ts/src/llm/api/openai-compatible-llm.ts:extractReasoningText(...) [STATE]
    ├── autobyteus-ts/src/llm/utils/response-types.ts:ChunkResponse(...) [STATE]
    └── autobyteus-ts/src/agent/handlers/llm-user-message-ready-event-handler.ts:handle(...) [STATE]
```

### Branching / Fallback Paths

```text
[ERROR] if provider stream throws
autobyteus-ts/src/llm/api/openai-compatible-llm.ts:_streamMessagesToLLM(...)
└── Error("Error in API streaming: ...")
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`

## Use Case: UC-003 [Mixed stream content/tool/reasoning emission]

### Spine Context

- Spine ID(s): `DS-001`
- Spine Scope: `Bounded Local`
- Governing Owner: `OpenAICompatibleLLM`
- Why This Use Case Matters To This Spine: The adapter must preserve tool-call and text parsing while adding reasoning support.
- Why This Spine Span Is Long Enough: This is a bounded local stream-normalization loop inside one owner, and the parent owner is explicit.
- If `Spine Scope = Bounded Local`, Parent Owner: `OpenAICompatibleLLM`

### Goal

- Ensure mixed streamed fields continue to emit correctly after the reasoning change.

### Preconditions

- Provider stream yields reasoning deltas, text deltas, and tool-call deltas across one request.

### Expected Outcome

- The adapter emits reasoning chunks, text chunks, tool-call chunks, and final usage without field loss.

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-ts/src/llm/api/openai-compatible-llm.ts:_streamMessagesToLLM(...) [ASYNC]
├── for await (chunk of stream) # bounded local normalization loop
├── extractReasoningText(delta.reasoning_content | delta.reasoning) [STATE]
├── convertOpenAIToolCalls(delta.tool_calls) [STATE]
└── yield ChunkResponse(reasoning/content/tool_calls/usage) [STATE]
```

### Branching / Fallback Paths

```text
[ERROR] if delta has no reasoning/text/tool fields
_streamMessagesToLLM(...) # no emission for that delta, continue loop
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`
