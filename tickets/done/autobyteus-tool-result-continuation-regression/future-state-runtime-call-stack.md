# Future-State Runtime Call Stack

## Ticket

- Ticket: `autobyteus-tool-result-continuation-regression`
- Date: `2026-04-07`

## Use Case UC-001

- Name: `Successful tool result continues the same turn`
- User-facing outcome:
  - after tool success, the agent produces the next assistant output instead of stopping

### Primary Spine DS-001

1. User message enters the agent runtime as `UserMessageReceivedEvent`.
2. `UserInputMessageEventHandler` runs input processors and enqueues `LLMUserMessageReadyEvent`.
3. The LLM returns a tool call.
4. The tool invocation executes and produces `ToolResultEvent`.
5. `ToolResultEventHandler` aggregates the completed tool result set into a new `AgentInputUserMessage` with `SenderType.TOOL`.
6. The handler enqueues that continuation input onto the dedicated internal `toolContinuationInputQueue`.
7. The worker, while external input is still blocked for the active turn, selects `toolContinuationInputQueue` as eligible work.
8. The continuation re-enters `UserInputMessageEventHandler`, so the standard input-processor chain still runs.
9. `LLMUserMessageReadyEvent` is emitted again for the same active-turn continuation context.
10. The LLM produces the post-tool assistant response.
11. The runtime emits assistant completion and then turn completion.

## Use Case UC-002

- Name: `Later external user input waits behind active-turn continuation`

### Ordering Spine DS-002

1. Tool success enqueues continuation on `toolContinuationInputQueue`.
2. A later real user message arrives on `userMessageInputQueue`.
3. The worker requests the next input event with external input blocked because the current turn is still active.
4. The queue manager returns the continuation event first.
5. The current turn completes.
6. Only after that completion does the later external user message become eligible and start a new turn.

## Use Case UC-003

- Name: `Team runtime websocket receives post-tool assistant completion`

### Team Spine DS-003

1. Team runtime routes the user message to the worker agent.
2. Worker agent reaches tool approval and tool execution success.
3. Tool result is re-enqueued internally on the worker continuation queue.
4. Worker agent produces assistant completion after tool success.
5. Team websocket observers see:
   - `TOOL_EXECUTION_SUCCEEDED`
   - later `ASSISTANT_COMPLETE`
   - later turn completion / idle

## Design Notes

- The key architectural distinction is between queue eligibility and message semantics.
- Queue eligibility is internal.
- Message semantics stay aligned with the shared user-input handling path.
