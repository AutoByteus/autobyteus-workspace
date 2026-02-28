# Future-State Runtime Call Stacks

## Design Basis
- Scope Classification: Small
- Call Stack Version: v2
- Requirements: `tickets/in-progress/reopen-run-config/requirements.md` (Refined)
- Source Design Basis: `tickets/in-progress/reopen-run-config/implementation-plan.md` (Solution Sketch v2)

## Use Case Index
| use_case_id | Source Type | Requirement ID(s) | Use Case Name | Coverage Target (Primary/Fallback/Error) |
| --- | --- | --- | --- | --- |
| UC-101 | Requirement | R-101,R-104 | Agent header action opens config for selected run | Yes/N/A/Yes |
| UC-102 | Requirement | R-102,R-104 | Team header action opens config for selected team | Yes/N/A/Yes |
| UC-103 | Requirement | R-103,R-105 | Selection defaults event/chat and returns from config to event view | Yes/N/A/Yes |
| UC-104 | Requirement | R-106 | History tree removes row-level config buttons | Yes/N/A/N/A |

## Use Case: UC-101 Agent header action opens config

### Primary Runtime Call Stack
```text
[ENTRY] autobyteus-web/components/workspace/common/WorkspaceHeaderActions.vue:click(editConfig)
└── emit('editConfig') [ASYNC]
    └── autobyteus-web/components/workspace/agent/AgentWorkspaceView.vue:onEditConfig()
        └── autobyteus-web/stores/workspaceCenterViewStore.ts:showConfig() [STATE]
            └── autobyteus-web/components/layout/WorkspaceDesktopLayout.vue:showSelectedRunConfig(computed)=true
                └── render(RunConfigPanel)
```

### Error Path
```text
[ERROR] If no selected run context exists
AgentWorkspaceView.vue:onEditConfig()
└── no-op guard (do not change mode)
```

### Coverage Status
- Primary Path: Covered
- Fallback Path: N/A
- Error Path: Covered

## Use Case: UC-102 Team header action opens config

### Primary Runtime Call Stack
```text
[ENTRY] WorkspaceHeaderActions.vue:click(editConfig)
└── emit('editConfig') [ASYNC]
    └── autobyteus-web/components/workspace/team/TeamWorkspaceView.vue:onEditConfig()
        └── workspaceCenterViewStore.showConfig() [STATE]
            └── WorkspaceDesktopLayout.vue:showSelectedRunConfig(computed)=true
                └── render(RunConfigPanel)
```

### Error Path
```text
[ERROR] If no active team context
TeamWorkspaceView.vue:onEditConfig()
└── no-op guard
```

### Coverage Status
- Primary Path: Covered
- Fallback Path: N/A
- Error Path: Covered

## Use Case: UC-103 Event/chat default selection + return path

### Primary Runtime Call Stack
```text
[ENTRY] WorkspaceAgentRunsTreePanel.vue:onSelectRun/onSelectTeam/onSelectTeamMember
└── workspaceCenterViewStore.showChat() [STATE]

[ENTRY] RunConfigPanel.vue:showConversationView()
└── workspaceCenterViewStore.showChat() [STATE]
    └── WorkspaceDesktopLayout.vue:showSelectedRunConfig(computed)=false
        └── render(AgentWorkspaceView or TeamWorkspaceView)
```

### Error Path
```text
[ERROR] Selection hydrate failure
WorkspaceAgentRunsTreePanel.vue:onSelectRun/onSelectTeamMember
└── console.error(...) and mode remains unchanged
```

### Coverage Status
- Primary Path: Covered
- Fallback Path: N/A
- Error Path: Covered

## Use Case: UC-104 History tree removes row-level config actions

### Primary Runtime Call Stack
```text
[ENTRY] WorkspaceAgentRunsTreePanel.vue:render(run/team rows)
└── row action group contains terminate/delete/time only
    └── no config button selectors:
        - workspace-run-config-*
        - workspace-team-config-*
```

### Coverage Status
- Primary Path: Covered
- Fallback Path: N/A
- Error Path: N/A
