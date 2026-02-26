# Proposed-Design-Based Runtime Call Stack - team-member-offline-continuation-stream-reconnect

## Design Basis (Small Scope)
- Source: `tickets/team-member-offline-continuation-stream-reconnect/implementation-plan.md`
- Target: Team send flow guarantees websocket subscription for offline historical contexts.

## UC-1: Inactive historical team member send returns live reply
1. `stores/agentTeamRunStore.ts:sendMessageToFocusedMember(...)`
2. Determine `isTemporary = false` for persisted `teamId`.
3. `ensureTeamStreamSubscribed(teamId)`
4. `connectToTeamStream(teamId)` if missing/stale subscription.
5. GraphQL mutation `SendMessageToTeam(input: { teamId, targetMemberName, userInput })`.
6. Backend restores inactive team runtime and dispatches message.
7. Team websocket receives member-scoped assistant events.
8. `services/agentStreaming/TeamStreamingService.ts:dispatchMessage(...)`
9. Focused member conversation updates with assistant reply.

## UC-2: Temporary team first send remains correct
1. `sendMessageToFocusedMember(...)` with `temp-team-*` ID.
2. Skip preconnect because temporary ID is not persisted runtime identity.
3. GraphQL lazy create returns permanent `teamId`.
4. Promote temporary ID -> permanent ID.
5. `ensureTeamStreamSubscribed(permanentId)` and continue normal streaming.

## UC-3: Existing subscription does not duplicate streams
1. `ensureTeamStreamSubscribed(teamId)` checks `isSubscribed + service map`.
2. If valid existing stream, return without reconnect.
3. If stale mismatch, disconnect old handle and reconnect once.
