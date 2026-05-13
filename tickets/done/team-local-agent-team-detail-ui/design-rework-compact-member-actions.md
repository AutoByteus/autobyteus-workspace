# Design Rework: Compact Member Actions And Shared-Agent View Navigation

## Status

Approved user clarification incorporated on 2026-05-12.

## Reason For Rework

After seeing the current/proposed Agent Team member cards, the user clarified two UX points:

1. A large repeated `View member agent details` button on every team-local member card is visually too heavy.
2. Teams composed from shared/global individual agents should have a lightweight way to open the existing Agent Detail page for those members.

Application-owned behavior remains unchanged.

## Requirements Delta

- Team-local member cards must use compact actions such as `Details ▾` / `Hide ▴`, with longer text only in accessible labels/tooltips if needed.
- Shared/global agent members may show a compact `View ↗` action.
- Shared/global `View` must navigate to `/agents?view=detail&id=<agentId>` and should include return context such as `returnToTeam=<teamId>` when practical.
- Shared/global members must not get inline team-local detail/edit behavior.
- Application-owned members and nested team members remain unchanged for this ticket.

## Design Delta

- `AgentTeamDetail.vue` owns compact member-card actions:
  - team-local resolvable agent: `Details` accordion action;
  - shared/global resolvable agent: `View` route action;
  - application-owned/nested: unchanged.
- `AgentDetail.vue` should support optional team-return query context so users can go back to the originating team after inspecting a shared/global member.
- The design continues to extract reusable agent read-only sections and reuse the existing agent form for team-local inline editing.

## Updated Artifacts

- Requirements: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-local-agent-team-detail/tickets/done/team-local-agent-team-detail-ui/requirements.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-local-agent-team-detail/tickets/done/team-local-agent-team-detail-ui/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/team-local-agent-team-detail/tickets/done/team-local-agent-team-detail-ui/design-spec.md`
