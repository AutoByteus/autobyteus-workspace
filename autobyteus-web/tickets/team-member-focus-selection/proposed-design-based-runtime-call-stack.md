# Proposed-Design-Based Runtime Call Stack

## Use Case UC-001: Team row selected state is member-specific

```text
[ENTRY] WorkspaceAgentRunsTreePanel.vue
└── compute selectedTeamId + selectedTeamMemberRouteKey
    ├── selectedTeamId: selectionStore (team) else runTreeStore.selectedTeamId
    └── selectedTeamMemberRouteKey: active team context focusedMemberName else runTreeStore.selectedTeamMemberRouteKey
[ENTRY] TeamRunsSection.vue
└── isTeamMemberSelected(teamId, memberRouteKey)
    └── true only when both selectedTeamId and selectedTeamMemberRouteKey match
```

## Use Case UC-002: Clicking a team member updates focused member without full reopen when local team context exists

```text
[ENTRY] useRunTreeActions.selectTeamMember(member)
└── runTreeStore.selectTreeRun(member)
    ├── if local team context exists:
    │   ├── teamContextsStore.setFocusedMember(member.memberRouteKey)
    │   ├── selectionStore.selectRun(teamId, 'team')
    │   └── runTreeStore.selectedTeamMemberRouteKey = member.memberRouteKey
    └── else:
        └── openTeamMemberRun(teamId, memberRouteKey) // restore path
```

## Use Case UC-003: Switching to agent rows clears team member selection

```text
[ENTRY] runTreeStore.selectTreeRun(agentRow)
└── selectionStore.selectRun(agentId, 'agent')
    ├── runTreeStore.selectedTeamId = null
    └── runTreeStore.selectedTeamMemberRouteKey = null
```

## Use Case UC-004: Center team workspace header follows focused member (default coordinator)

```text
[ENTRY] TeamWorkspaceView.vue
└── compute headerTitle from activeTeamContext
    ├── read focusedMemberRouteKey = activeTeamContext.focusedMemberName
    ├── resolve focused member context from activeTeamContext.members.get(focusedMemberRouteKey)
    ├── choose display name priority:
    │   1) memberContext.config.agentDefinitionName
    │   2) memberContext.state.conversation.agentName
    │   3) focusedMemberRouteKey leaf segment
    └── fallback to teamDefinitionName when focused member is unavailable
```
