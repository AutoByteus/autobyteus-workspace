# Requirements - team-member-offline-continuation-stream-reconnect

## Goal / Problem
When a user opens a terminated team run from history (member row like `professor`) and sends a new message, the UI shows only the user message and no assistant reply. Single-agent continuation works, but team-member continuation appears stuck.

## Scope Triage
- Size: `Small`
- Rationale: Frontend orchestration gap in team send flow; backend continuation APIs already exist and have E2E coverage.

## In-Scope Use Cases
1. Open inactive team member from history and send message; team should continue and reply appears in UI.
2. Existing non-temporary team send path should attach/reattach team websocket stream if offline.
3. Temporary team first-send promotion should still connect stream using permanent team ID.

## Acceptance Criteria
1. Sending from offline non-temporary team re-subscribes team stream before/at send path.
2. Assistant response events are streamed back to focused member conversation after continuation.
3. No regression for temporary team creation/promotion flow.
4. Tests cover this exact regression path.

## Constraints / Dependencies
- Keep existing GraphQL mutation contract (`sendMessageToTeam`).
- No backend schema/API compatibility layers.
- Preserve existing team context model.

## Assumptions
- Backend continuation (`sendMessageToTeam` with `teamId`) restores runtime correctly when team is inactive.
- Missing reply in UI is due to absent team websocket subscription in frontend.

## Open Questions / Risks
- If websocket connect fails silently, user may still see delayed/no updates; existing error handling is unchanged in this scope.
