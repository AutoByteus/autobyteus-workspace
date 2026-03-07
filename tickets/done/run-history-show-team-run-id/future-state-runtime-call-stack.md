# Future-State Runtime Call Stacks (Debug-Trace Style)

## Design Basis

- Scope Classification: `Small`
- Call Stack Version: `v2`
- Requirements: `tickets/in-progress/run-history-show-team-run-id/requirements.md` (status `Refined`)
- Source Artifact:
  - `Small`: `tickets/in-progress/run-history-show-team-run-id/implementation-plan.md`
- Source Design Version: `v2`

## Use Case Index (Stable IDs)

| use_case_id | Source Type (`Requirement`/`Design-Risk`) | Requirement ID(s) | Design-Risk Objective (if source=`Design-Risk`) | Use Case Name | Coverage Target (Primary/Fallback/Error) |
| --- | --- | --- | --- | --- | --- |
| UC-001 | Requirement | R-001 | N/A | Render team run history row with `teamRunId` label | Yes/Yes/Yes |
| UC-002 | Requirement | R-002 | N/A | Select team row still uses same `teamRunId` action path | Yes/N/A/Yes |
| UC-003 | Requirement | R-003 | N/A | Preserve stable team ordering (no dynamic recency reorder) | Yes/Yes/Yes |

## Transition Notes

- Keep source/insertion order from team history/context merge. Do not apply `lastActivityAt` sorting in projection layer.

## Use Case: UC-001 [Render Team Run Identifier]

### Primary Runtime Call Stack

```text
[ENTRY] WorkspaceAgentRunsTreePanel.vue:render()
└── WorkspaceHistoryWorkspaceSection.vue:template(v-for team in workspaceTeams)
    ├── [STATE] read team.teamRunId
    └── render <span class="truncate font-medium">team.teamRunId</span>
```

### Branching / Fallback Paths

```text
[FALLBACK] if teamRunId is empty
WorkspaceHistoryWorkspaceSection.vue:template
└── render empty label without throwing
```

```text
[ERROR] if team history load fails
WorkspaceAgentRunsTreePanel.vue:template
└── render runHistoryStore.error
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`

## Use Case: UC-002 [Select Team Row]

### Primary Runtime Call Stack

```text
[ENTRY] user-click team-row button
└── WorkspaceHistoryWorkspaceSection.vue:@click
    └── actions.onSelectTeam(team.teamRunId)
        └── [ASYNC] runHistoryStore.selectTreeRun({ source: 'history', teamRunId })
```

### Branching / Fallback Paths

```text
[ERROR] if selectTreeRun rejects
useWorkspaceHistorySelection.ts:onSelectTeam(...)
└── console.warn(...)
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`

## Use Case: UC-003 [Stable Team Ordering]

### Goal

Prevent team row order from changing dynamically when `lastActivityAt` updates.

### Preconditions

- Team history rows and optional live team contexts are available.

### Expected Outcome

- `getTeamNodes` returns teams in stable source/insertion order, not activity-recent order.

### Primary Runtime Call Stack

```text
[ENTRY] runHistoryStore.ts:getTeamNodes(workspaceRootPath)
└── runHistoryReadModel.ts:buildRunHistoryTeamNodes(...)
    └── runHistoryTeamHelpers.ts:buildTeamNodes(...)
        ├── [STATE] create nodesByTeamRunId Map in source order
        ├── [STATE] update existing keys in place (no insertion-order change)
        └── return Array.from(nodesByTeamRunId.values()) # no recency sort
```

### Branching / Fallback Paths

```text
[FALLBACK] workspace filter applied
buildTeamNodes(...)
└── filter by normalized workspace root path while preserving list order
```

```text
[ERROR] invalid workspace path inputs
buildRunHistoryTeamNodes(...)
└── normalization yields empty path; row excluded by existing filter rules
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `Covered`
- Error Path: `Covered`
