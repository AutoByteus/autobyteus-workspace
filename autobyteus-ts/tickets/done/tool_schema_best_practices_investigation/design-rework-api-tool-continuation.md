# Design Rework: API Tool Result Continuation Must Not Add a User Message

- Ticket: Tool schema / OpenAI-compatible tool-call reliability investigation
- Date: 2026-05-09
- Status: Design-impact rework required
- Trigger: User asked whether the framework feeds tool results back as a user message in API tool mode, not only whether `OpenAIChatRenderer` can render `role:'tool'` correctly.

## Decision Summary

The user's suspicion is confirmed at the framework pipeline level.

The current native API path is partially correct:

1. `MemoryIngestToolResultProcessor` stores the tool result in memory.
2. `MemoryManager.ingestToolResult(...)` appends a `ToolResultPayload` to `WorkingContextSnapshot`.
3. `OpenAIChatRenderer` renders that payload correctly as an OpenAI-compatible `role:'tool'` message with `tool_call_id`.

But the continuation path then adds a second textual copy of the same tool result:

1. `ToolResultEventHandler.dispatchResultsToInputPipeline(...)` creates an `AgentInputUserMessage` with `SenderType.TOOL` and content beginning `The following tool executions have completed...`.
2. `UserInputMessageEventHandler` converts that to an `LLMUserMessage` and enqueues `LLMUserMessageReadyEvent`.
3. `LLMRequestAssembler.prepareRequest(...)` always converts the incoming `LLMUserMessage` into `new Message(MessageRole.USER, ...)` and appends it to working context.
4. The next provider request therefore contains both the correct `role:'tool'` message and an extra `role:'user'` message containing aggregated tool-result text.

For OpenAI-compatible native tool-call mode, this is not the clean best-practice message sequence. The textual user continuation should be legacy/text-parser-mode behavior only, or UI/logging-only, not a native API request message.

## Evidence

Durable probe output:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/autobyteus-ts-tool-schema-best-practices/autobyteus-ts/tickets/tool_schema_best_practices_investigation/api-tool-continuation-render-probe-output.json`

Observed rendered payload after one `run_bash` call and result:

```json
[
  { "role": "system", "content": "system" },
  { "role": "user", "content": "List files." },
  {
    "role": "assistant",
    "content": null,
    "tool_calls": [
      {
        "id": "call_abc123",
        "type": "function",
        "function": {
          "name": "run_bash",
          "arguments": "{\"command\":\"ls -la\"}"
        }
      }
    ]
  },
  {
    "role": "tool",
    "tool_call_id": "call_abc123",
    "content": "total 8\n-rw-r--r-- README.md"
  },
  {
    "role": "user",
    "content": "The following tool executions have completed. Please analyze their results and decide the next course of action.\n\nTool: run_bash (ID: call_abc123)\nStatus: Success\nResult:\ntotal 8\n-rw-r--r-- README.md"
  }
]
```

Expected native OpenAI-compatible sequence is:

```json
[
  { "role": "user", "content": "List files." },
  { "role": "assistant", "content": null, "tool_calls": [/* call */] },
  { "role": "tool", "tool_call_id": "call_abc123", "content": "...tool output..." }
]
```

A follow-up assistant response should then be generated from this history. There should not be a synthetic user message repeating the tool output in native API mode.

## Current Code Path

Relevant files:

- `src/agent/handlers/tool-result-event-handler.ts`
  - `dispatchResultsToInputPipeline(...)` aggregates tool results into text and creates `new AgentInputUserMessage(finalContentForLLM, SenderType.TOOL, ...)`.
- `src/agent/handlers/user-input-message-event-handler.ts`
  - treats `SenderType.TOOL` as not starting a new turn, but still builds `LLMUserMessage` and enqueues `LLMUserMessageReadyEvent`.
- `src/agent/input-processor/memory-ingest-input-processor.ts`
  - correctly stores only a `tool_continuation` trace boundary for `SenderType.TOOL`, not a user trace.
- `src/agent/llm-request-assembler.ts`
  - always calls `buildUserMessage(processedUserInput)` and appends `MessageRole.USER`, regardless of whether the input came from a tool continuation.
- `src/agent/tool-execution-result-processor/memory-ingest-tool-result-processor.ts`
  - stores structured tool result before continuation.
- `src/memory/memory-manager.ts` and `src/memory/working-context-snapshot.ts`
  - append `ToolResultPayload` correctly.
- `src/llm/prompt-renderers/openai-chat-renderer.ts`
  - renders `ToolResultPayload` correctly as `role:'tool'`.

## Updated Requirement

Add requirement:

- **FR-011 API tool-result continuation:** In `api_tool_call` / OpenAI-compatible native mode, completed tool results must be fed back to the provider only through structured `role:'tool'` messages with matching `tool_call_id`. The framework must not append a synthetic `role:'user'` message containing aggregated tool-result text in that same native request.

Add acceptance criterion:

- **AC-008 Native tool continuation request:** A request assembly test for the full tool-call continuation path proves that after an assistant native tool call and corresponding tool result, the next OpenAI-compatible request contains `assistant.tool_calls` followed by matching `role:'tool'` messages and does not contain the aggregate `The following tool executions have completed...` user message.

## Updated Design Direction

The fix should split the continuation trigger from the textual continuation content.

Recommended target shape:

1. Keep structured memory ingestion:
   - `MemoryIngestToolResultProcessor` continues to append `ToolResultPayload` to working context.
   - `OpenAIChatRenderer` continues to render it as `role:'tool'`.
2. Add an explicit native tool-continuation path:
   - either a new internal event type or explicit metadata on `LLMUserMessageReadyEvent` / request assembly that means “continue current turn after tool results; do not append a user message.”
   - `LLMRequestAssembler` must support rendering current working context without appending a `MessageRole.USER` input for this continuation.
3. Keep textual aggregate content only where appropriate:
   - legacy text/parser modes that lack provider-native `role:'tool'` support;
   - user-visible logs/status/UI if needed;
   - raw trace boundary metadata, not provider request history in native API mode.
4. Add tests at the framework-pipeline level, not only `OpenAIChatRenderer` unit tests.

## Out of Scope / Future Work

- This rework does not require solving DeepSeek-specific tool reliability.
- This rework does not require adding product-facing `tool_choice` configuration.
- This rework does not require executing textual `[TOOL_CALL]` output as a fallback.

## Implementation Notes

Possible implementation options, in preferred order:

1. Add a dedicated internal `ToolContinuationReadyEvent` (or equivalent) consumed by `LLMUserMessageReadyEventHandler` that renders existing working context without adding a user message when native API mode is active.
2. Add a request-assembly option such as `appendUserMessage: false` for explicit tool continuations, with types/metadata preventing accidental use for normal user input.
3. Gate `ToolResultEventHandler.dispatchResultsToInputPipeline(...)` by selected tool-call mode: native API mode triggers a no-user-message continuation; legacy text modes keep the current aggregated text behavior.

Whichever option is chosen, tests must prove that the default OpenAI-compatible request after a tool result does not contain a synthetic user aggregate and still continues the same active turn.

## Server-Side Customization Check

Follow-up investigation in `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-server-ts` found:

1. The server domain model and APIs support `toolExecutionResultProcessorNames`:
   - `src/agent-definition/domain/models.ts`
   - `src/agent-definition/providers/agent-definition-config.ts`
   - `src/api/graphql/types/agent-definition.ts`
   - `src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.ts`
   - `src/agent-team-execution/backends/autobyteus/autobyteus-agent-config-builder.ts`
2. Current server startup customization source does **not** register any server-specific tool-result processor:
   - `src/startup/agent-customization-loader.ts` registers input processors, LLM response processors, and tool-invocation preprocessors, but no `ToolExecutionResultProcessorDefinition`.
3. Current runtime agent configs under `/Users/normy/.autobyteus/server-data/agents/*/agent-config.json` have `toolExecutionResultProcessorNames: []`.
4. The server does register a mandatory input processor, `UserInputContextBuildingProcessor`, that formats all `AgentInputUserMessage`s by sender type. For `SenderType.TOOL`, it wraps content with `**[Tool Execution Result]**`.
5. Therefore the observed user-message tool-result shape is not caused by an active server tool-result processor. It is caused by the core continuation design sending tool results through the user-input pipeline; the server's mandatory input processor then intentionally formats that tool-originated user input as `**[Tool Execution Result]**`.

Implementation implication:

- Native OpenAI-compatible tool continuations must not pass through the normal user-input formatting pipeline in a way that appends a provider-visible `role:'user'` message.
- Legacy text/parser modes may still use the aggregate input path if they require textual tool-result prompt content.
- Existing server input processing for real user/agent/system inputs and context files must be preserved.
