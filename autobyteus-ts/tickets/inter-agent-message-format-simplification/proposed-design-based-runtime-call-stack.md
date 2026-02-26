# Proposed-Design-Based Runtime Call Stack - inter-agent-message-format-simplification

## Design Basis (Small Scope)
- Source: `tickets/inter-agent-message-format-simplification/implementation-plan.md`
- Target: concise inter-agent injected prompt + optional message_type.

## UC-1: Recipient receives concise direct message
1. `src/agent/handlers/inter-agent-message-event-handler.ts:handle(...)`
2. Validate `InterAgentMessageReceivedEvent`.
3. Resolve sender display name via `teamContext.teamManager.resolveMemberNameByAgentId(senderAgentId)` when available.
4. Build strict payload with one invariant template:
   - `You received a message from <sender-name-or-id>.`
   - `Sender ID: <sender-id>`
   - `Message: <content>`
5. Enqueue `UserMessageReceivedEvent` with concise content.

## UC-2: send_message_to without message_type
1. `src/agent/message/send-message-to.ts:_execute(...)`
2. Read `recipient_name`, `content`; validate required fields.
3. Read optional `message_type`; when missing/blank use `direct_message`.
4. Dispatch `InterAgentMessageRequestEvent` with resolved type.

## UC-3: sender name resolution service
1. `src/agent-team/context/team-manager.ts:resolveMemberNameByAgentId(...)`
2. Lookup in runtime map built during `ensureNodeIsReady(...)` (`agentIdToNameMap`).
3. Return member name or null.
