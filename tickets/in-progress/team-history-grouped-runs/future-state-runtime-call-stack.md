# Future-State Runtime Call Stacks (Debug-Trace Style)

## Design Basis

- Scope Classification: `Medium`
- Call Stack Version: `v4`
- Requirements: `tickets/in-progress/team-history-grouped-runs/requirements.md` (status `Design-ready`)
- Source Artifact:
  - `Medium/Large`: `tickets/in-progress/team-history-grouped-runs/proposed-design.md`
- Source Design Version: `v4`
- Referenced Sections:
  - Spine inventory sections: `Data-Flow Spine Inventory`
  - Ownership sections: `Ownership Map`, `Final File Responsibility Mapping`

## Use Case Index (Stable IDs)

| use_case_id | Spine ID(s) | Spine Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Governing Owner | Source Type (`Requirement`/`Design-Risk`) | Requirement ID(s) | Design-Risk Objective (if source=`Design-Risk`) | Use Case Name | Coverage Target (Primary/Fallback/Error) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| UC-001 | DS-001 | Primary End-to-End | `teamRunOpenCoordinator.ts` | Requirement | R-001, R-002, R-005 | N/A | Open an inactive historical team with shell members plus one loaded projection | Yes/Yes/Yes |
| UC-002 | DS-002, DS-004 | Primary End-to-End | `agentTeamContextsStore.ts` | Requirement | R-003, R-005 | N/A | Switch to another historical member and lazy load only that member if missing | Yes/Yes/Yes |
| UC-003 | DS-003, DS-004 | Bounded Local | `agentTeamContextsStore.ts` | Requirement | R-004, R-005 | N/A | Enter grid or spotlight and progressively hydrate missing historical members | Yes/Yes/Yes |

## Use Case: UC-001 [Open an inactive historical team with shell members plus one loaded projection]

### Spine Context

- Spine ID(s): `DS-001`
- Spine Scope: `Primary End-to-End`
- Governing Owner: `teamRunOpenCoordinator.ts`
- Why This Use Case Matters To This Spine: The first historical open is the performance-critical path the user is experiencing today.

### Goal

Open an inactive historical team run by building one lightweight runtime team context whose focused/coordinator member is immediately readable, while all other members remain shell contexts until demanded later.

### Preconditions

- `listWorkspaceRunHistory` already returned grouped team definitions and child team-run rows
- `getTeamRunResumeConfig(teamRunId)` can return historical metadata for the selected run
- Existing `getTeamMemberRunProjection(teamRunId, memberRouteKey)` can return one member projection

### Expected Outcome

- The historical team context exists immediately with all member identities/configs
- The first focused member equals the requested member when valid, otherwise the coordinator, otherwise the first member
- Only that member projection is fetched and applied during the first historical open
- The team workspace focus mode can render the focused member conversation immediately
- Non-focused historical members remain shell entries with explicit `unloaded` load state

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-web/composables/useWorkspaceHistorySelectionActions.ts:onSelectTeam(team)
└── [ASYNC] autobyteus-web/stores/runHistoryStore.ts:selectTreeRun(member row for requested/coordinator member)
    └── [ASYNC] autobyteus-web/stores/runHistorySelectionActions.ts:openTeamMemberRunFromHistory(teamRunId, memberRouteKey)
        └── [ASYNC] autobyteus-web/services/runOpen/teamRunOpenCoordinator.ts:openTeamRun(...)
            ├── [ASYNC] autobyteus-web/services/runHydration/teamRunContextHydrationService.ts:getTeamRunResumeConfig(teamRunId)
            ├── [STATE] build shell member contexts for every member from metadata only
            ├── [STATE] resolve focused member route key (requested -> coordinator -> first member)
            ├── [ASYNC] fetch one member projection for the resolved focused member
            ├── [STATE] apply that projection to the focused member context only
            ├── [STATE] install/update AgentTeamContext with per-member load-state
            └── [RETURN] selected historical team ready for focus-mode render
```

### Branching / Fallback Paths

```text
[FALLBACK] if the requested member route key is missing or invalid
teamRunContextHydrationService.ts:resolveFocusKey(...)
├── use coordinator member route key when present
└── otherwise use the first metadata member

[FALLBACK] if the focused member projection request fails
teamRunContextHydrationService.ts:ensureHistoricalTeamMemberHydrated(...)
├── keep the shell member context
├── mark that member load-state as error
└── keep the team open instead of failing the whole team open

[ERROR] if resume config metadata is missing or malformed
teamRunContextHydrationService.ts:loadTeamRunContextHydrationPayload(...)
└── throw an open failure before installing the team context
```

### Coverage Status

- Primary Path: `Planned`
- Fallback Path: `Planned`
- Error Path: `Planned`

## Use Case: UC-002 [Switch to another historical member and lazy load only that member if missing]

### Spine Context

- Spine ID(s): `DS-002`, `DS-004`
- Spine Scope: `Primary End-to-End`
- Governing Owner: `agentTeamContextsStore.ts`
- Why This Use Case Matters To This Spine: Member drill-down must remain responsive after the first historical team open.

### Goal

Let the user switch to another member in an already opened inactive historical team without reopening the whole team or refetching already loaded members.

### Preconditions

- The historical team context is already installed in `agentTeamContextsStore`
- The team member exists in the team context member map
- The runtime team context stores per-member load state

### Expected Outcome

- If the selected member is already loaded, focus changes immediately with no network call
- If the selected member is still unloaded, only that member projection is fetched and applied
- The existing team context object remains authoritative; only the requested member context is patched
- The selection stores still point at the same `teamRunId`

### Primary Runtime Call Stack

```text
[ENTRY] left-tree member click OR team workspace member click
└── [ASYNC] autobyteus-web/stores/runHistoryStore.ts:selectTreeRun(member row)
    └── [ASYNC] autobyteus-web/stores/runHistorySelectionActions.ts:selectTreeRunFromHistory(...)
        ├── [STATE] detect existing historical team context for teamRunId
        └── [ASYNC] autobyteus-web/stores/agentTeamContextsStore.ts:focusMemberAndEnsureHydrated(teamRunId, memberRouteKey)
            ├── [STATE] update focused member route key on the existing team context
            └── [ASYNC] autobyteus-web/services/runHydration/teamRunContextHydrationService.ts:ensureHistoricalTeamMemberHydrated(teamRunId, memberRouteKey)
                ├── if load-state is loaded -> return without network
                ├── if load-state is loading -> await the in-flight request
                ├── else fetch one member projection only
                ├── apply projection to that one member context
                ├── refresh that member's activities in the activity store
                └── mark load-state as loaded or error
```

### Branching / Fallback Paths

```text
[FALLBACK] if the team is live/subscribed instead of inactive historical
runHistorySelectionActions.ts:selectTreeRunFromHistory(...)
└── reuse the existing live team context and skip historical lazy hydration

[FALLBACK] if the selected member is already loaded
teamRunContextHydrationService.ts:ensureHistoricalTeamMemberHydrated(...)
└── no projection fetch occurs

[ERROR] if the member projection fetch fails
teamRunContextHydrationService.ts:ensureHistoricalTeamMemberHydrated(...)
├── leave focus on the requested member
├── preserve the existing shell context
└── record error load-state for that member so the UI can show empty/error state instead of freezing
```

### Coverage Status

- Primary Path: `Planned`
- Fallback Path: `Planned`
- Error Path: `Planned`

## Use Case: UC-003 [Enter grid or spotlight and progressively hydrate missing historical members]

### Spine Context

- Spine ID(s): `DS-003`, `DS-004`
- Spine Scope: `Bounded Local`
- Governing Owner: `agentTeamContextsStore.ts`
- Why This Use Case Matters To This Spine: Broader views should not silently reintroduce eager first-open cost.

### Goal

When a user switches an inactive historical team from `focus` to `grid` or `spotlight`, progressively request missing member projections after the view-mode change.

### Preconditions

- The team is already opened as an inactive historical context
- Shell member contexts exist for all members
- The focused member is already loaded from the first open

### Expected Outcome

- The mode switch itself is immediate
- Missing members are hydrated sequentially or through a bounded in-flight queue after the mode change
- Already loaded members are skipped
- Re-entering `focus` mode does not discard already loaded members

### Primary Runtime Call Stack

```text
[ENTRY] autobyteus-web/components/workspace/team/TeamWorkspaceView.vue:setCurrentMode('grid' | 'spotlight')
├── [STATE] teamWorkspaceViewStore.setMode(teamRunId, mode)
└── [ASYNC] TeamWorkspaceView.vue watch/effect for activeTeamContext + currentMode
    └── [ASYNC] autobyteus-web/stores/agentTeamContextsStore.ts:ensureHistoricalMembersHydratedForView(teamRunId, mode)
        └── [ASYNC] teamRunContextHydrationService.ts:ensureHistoricalTeamMembersHydrated(teamRunId, memberRouteKeys[])
            ├── iterate missing members only
            ├── call ensureHistoricalTeamMemberHydrated(...) per missing member
            ├── skip loaded members
            └── patch each member context in place as its projection arrives
```

### Branching / Fallback Paths

```text
[FALLBACK] if the active team is live/subscribed
TeamWorkspaceView.vue broader-mode effect
└── do nothing because live teams already own member runtime state through streaming

[FALLBACK] if the user returns to focus mode before all broader-mode hydration completes
ensureHistoricalTeamMembersHydrated(...)
└── allow in-flight member requests to finish, but do not start new ones unless broader mode is still active

[ERROR] if one broader-mode member projection fails
ensureHistoricalTeamMembersHydrated(...)
├── continue hydrating the remaining members
└── keep the failed member as shell/error state instead of failing the entire team view
```

### Coverage Status

- Primary Path: `Planned`
- Fallback Path: `Planned`
- Error Path: `Planned`
