# Proposed-Design-Based Runtime Call Stack - team-member-status-binding-fix (v1)

## Use Case UC-1: Focused member header status
Coverage: primary Yes / fallback N/A / error N/A

1. `components/workspace/team/TeamWorkspaceView.vue:setup()` reads `useAgentTeamContextsStore()`.
2. `computed activeTeamContext` resolves current selected team context.
3. `computed focusedMemberContext` reads `activeTeamContext.members.get(activeTeamContext.focusedMemberName)`.
4. `computed headerStatus` returns `focusedMemberContext.state.currentStatus`.
5. Template renders `AgentStatusDisplay` with `headerStatus`.

State mutation points: none (read-only render flow).

## Use Case UC-2: Fallback when focused member missing
Coverage: primary Yes / fallback Yes / error N/A

1. `TeamWorkspaceView.vue:headerStatus` attempts focused member lookup.
2. Lookup misses due to empty/unknown key.
3. `headerStatus` falls back to `activeTeamContext.currentStatus`.
4. Template renders team-level status string via same status display component.

Decision gate:
- Condition: focused member context exists and has status -> use member status.
- Else: use team status.
