# Implementation Plan - inter-agent-message-format-simplification

## Small-Scope Solution Sketch
- Expose sender-ID -> member-name lookup in `TeamManager`.
- Simplify injected inter-agent content format in `InterAgentMessageReceivedEventHandler`.
- Enforce one strict message template (no alternate fallback template branch).
- Make `send_message_to.message_type` optional with default `direct_message`.
- Update unit tests for new content format and argument semantics.

## Tasks
1. Update `src/agent-team/context/team-manager.ts` with sender-name lookup method.
2. Update `src/agent/handlers/inter-agent-message-event-handler.ts` formatting and sender resolution.
   - Always render:
     - `You received a message from ...`
     - `Sender ID: ...`
     - `Message: ...`
   - No alternate template branch.
3. Update `src/agent/message/send-message-to.ts` schema/validation/default behavior.
4. Update affected tests:
   - `tests/unit/agent/handlers/inter-agent-message-event-handler.test.ts`
   - `tests/unit/agent/message/send-message-to.test.ts`
   - `tests/unit/agent/message/inter-agent-message.test.ts`
   - `tests/unit/agent-team/events/agent-team-events.test.ts`
5. Run targeted unit tests.

## Verification Strategy
- `pnpm -s vitest run tests/unit/agent/handlers/inter-agent-message-event-handler.test.ts tests/unit/agent/message/send-message-to.test.ts tests/unit/agent/message/inter-agent-message.test.ts tests/unit/agent-team/events/agent-team-events.test.ts tests/unit/agent-team/routing/local-team-routing-port-adapter.test.ts`
