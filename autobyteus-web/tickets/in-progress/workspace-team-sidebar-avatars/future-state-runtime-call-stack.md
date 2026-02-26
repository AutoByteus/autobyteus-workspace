# Future-State Runtime Call Stack

## Version
- Version: `v1`
- Scope: `Small`
- Design Basis: `requirements.md (Design-ready)`

## UC-001 Team Row Avatar Render
1. `components/workspace/history/WorkspaceAgentRunsTreePanel.vue:setup()`
- Resolve `workspaceNodes` and `workspaceTeams(...)` from `runHistoryStore`.
- Build `teamAvatarByDefinitionId` map from `agentTeamDefinitionStore.agentTeamDefinitions`.
2. `WorkspaceAgentRunsTreePanel.vue:template(team row)`
- For each `team` row, call `showTeamAvatar(team)`.
- Decision:
  - `true`: render `<img :src="teamAvatarUrl" ... @error="onTeamAvatarError(...)" />`
  - `false`: render initials fallback.
3. State mutation
- `onTeamAvatarError(...)` writes key into `brokenAvatarByTeamKey` to prevent repeated broken image render.

## UC-002 Team Member Row Avatar Render
1. `WorkspaceAgentRunsTreePanel.vue:setup()`
- Build `memberAvatarByName` map from `agentDefinitionStore.agentDefinitions`.
2. `WorkspaceAgentRunsTreePanel.vue:template(member row)`
- For each member, call `showTeamMemberAvatar(member)`.
- Decision:
  - `true`: render `<img :src="memberAvatarUrl" ... @error="onTeamMemberAvatarError(...)" />`
  - `false`: render initials fallback.
3. State mutation
- `onTeamMemberAvatarError(...)` writes key into `brokenAvatarByTeamMemberKey`.

## UC-003 No Regression of Existing Row Behavior
1. Existing click handlers stay unchanged:
- `onSelectTeam(teamId)`
- `onSelectTeamMember(member)`
2. Existing action handlers stay unchanged:
- `onTerminateTeam(teamId)`
- `onDeleteTeam(team)`
3. Status dot and time labels remain in same rows.

## UC-005 Focused Member Event Monitor Avatar
1. `components/workspace/team/AgentTeamEventMonitor.vue:setup()`
- Read `focusedMemberContext` from `agentTeamContextsStore`.
- Compute `focusedMemberDisplayName` and `focusedMemberAvatarUrl`:
  - priority: member context avatar -> agent definition by id -> definition by normalized name.
2. `AgentTeamEventMonitor.vue:template`
- Pass `:agent-name` and `:agent-avatar-url` to `AgentEventMonitor`.
3. `components/workspace/agent/AgentEventMonitor.vue -> components/conversation/AIMessage.vue`
- Existing avatar rendering consumes forwarded props, rendering member avatar image when available.

## UC-006 Workspace Header Avatar Consistency
1. `components/workspace/team/TeamWorkspaceView.vue:setup()`
- Resolve focused member avatar with priority: member context avatar -> definition by id -> definition by name.
- Render header avatar image; fallback to initials if unavailable/broken.
2. `components/workspace/agent/AgentWorkspaceView.vue:setup()`
- Resolve selected agent avatar with priority: context avatar -> definition by id.
- Render header avatar image with existing initials fallback.
3. State mutation
- Header avatar load errors toggle local fallback state and reset on URL change.

## Error / Fallback Paths
- Missing avatar URL: fallback initials.
- Image load error: per-row broken-avatar key set; fallback initials displayed.
- If definitions are not loaded at first render, fallback initials display until store data available.
