# Proposed Design

## Ticket

- Ticket: `autobyteus-tool-result-continuation-regression`
- Scope: `Medium`
- Date: `2026-04-07`

## Design Goal

Restore tool-result continuation after successful tool execution without breaking existing input-processor and server-customization behavior.

## Approved Design

### 1. Separate queue eligibility from message semantics

- Add a dedicated internal queue for tool-result continuation input in `AgentInputEventQueueManager`.
- Give that queue higher priority than external user input while a turn is still active.
- Keep the continuation payload itself as `UserMessageReceivedEvent` built from `AgentInputUserMessage(..., SenderType.TOOL)`.

### 2. Preserve the existing handler and processor path

- `ToolResultEventHandler` should still aggregate the tool results into a tool-origin message.
- Instead of enqueuing that message on `enqueueUserMessage`, it must enqueue it on the new continuation queue.
- `UserInputMessageEventHandler` must remain the consumer for the continuation event so:
  - input processors still run
  - customization hooks in `autobyteus-server-ts` still run
  - turn ownership stays visible to the rest of the runtime the same way as a normal input event

### 3. Strengthen regression coverage at the real seam

- Add a runtime integration test that proves tool continuation is processed before later external user input.
- Strengthen LM Studio single-agent and team-flow tests to require:
  - tool success
  - later assistant completion
  - later turn completion
- Fix and strengthen the server team GraphQL runtime E2E so it:
  - uses valid team member `refScope`
  - asserts assistant completion after tool success

## Alternatives Rejected

### A. Reuse the normal external user-message queue and rely on `senderType`

- Rejected because queue filtering happens before handler dispatch.
- `SenderType.TOOL` cannot help if the event is never dequeued.

### B. Add a separate tool-result input handler path

- Rejected because it risks bypassing shared input-processor and customization behavior already attached to `UserInputMessageEventHandler`.
- This would have increased semantic divergence between real user input and tool-result continuation without solving the core queue-eligibility issue cleanly.

## Compatibility Decision

- No backward-compatibility wrapper is retained.
- No dual queue fallback is retained.
- No separate server customization branch is introduced.

## Expected Outcome

- A successful tool call always re-enters the model loop for the same turn.
- Later user input waits until that continuation finishes.
- Existing processor/customization behavior remains intact.
