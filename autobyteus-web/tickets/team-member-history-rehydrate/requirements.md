# Requirements - team-member-history-rehydrate

## Goal / Problem
When a user clicks a historical team member row (for example `professor` or `student`) in the workspace tree, the main conversation panel should re-render that member's historical conversation. Current behavior shows empty conversation with `Offline/Uninitialized` status.

## Scope Triage
- Size: `Small`
- Rationale: Frontend store open-flow gap in team-run history hydration. No API/schema/storage changes required.

## In-Scope Use Cases
1. Open historical team member row and render historical messages in the main conversation area.
2. After team context is loaded once, switching to another member in the same team should show that member's historical messages too.
3. If a member projection cannot be fetched, fallback to empty conversation without breaking team open.

## Acceptance Criteria
1. `openTeamMemberRun` loads each member's run projection and hydrates member conversations.
2. Selected member history appears immediately after selecting a team history row.
3. Existing active/inactive team stream behavior remains unchanged.
4. Unit tests assert projection hydration for team members.

## Constraints / Dependencies
- Must reuse existing run projection format (`getRunProjection`).
- Must preserve current team context shape in `agentTeamContextsStore`.
- Must not introduce compatibility wrappers or duplicate open paths.

## Assumptions
- Manifest `memberAgentId` is the lookup key for per-member run projection.
- Existing projection-to-conversation parser used by single-agent open is valid for team members.

## Open Questions / Risks
- If specific historical runs have stale/missing `memberAgentId`, member-level projection can be unavailable; fallback behavior is required.
