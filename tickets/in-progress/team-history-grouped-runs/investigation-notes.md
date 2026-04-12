# Investigation Notes

## Investigation Status

- Current Status: `Current`
- Scope Triage: `Medium`
- Triage Rationale: The new gap is not a one-line optimization. It changes the historical team hydration model, the team runtime context shape, the team workspace mode demand path, and the focused validation plan.
- Investigation Goal: Replace eager all-member historical team hydration with focused-member-first lazy hydration while preserving the grouped workspace-history contract and current live-team behavior.
- Primary Questions To Resolve:
  - Where does the eager all-member historical hydration happen today?
  - Which team views truly require every member projection immediately, and which do not?
  - What lightweight shell state is sufficient so the UI can show members before their projections are loaded?
  - How should member selection and view-mode changes request missing projections without reopening the whole team?

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-04-12 | Code | `autobyteus-web/services/runHydration/teamRunContextHydrationService.ts` | Identify the historical team-open hydration entrypoint | `loadTeamRunContextHydrationPayload(...)` always fetches projections for all members before the team opens. | Yes |
| 2026-04-12 | Code | `autobyteus-web/stores/runHistoryTeamHelpers.ts` | Confirm how member projections become runtime member contexts | `fetchTeamMemberProjections(...)` fans out to every member, and `buildTeamMemberContexts(...)` materializes a full `AgentContext` for each member. | Yes |
| 2026-04-12 | Code | `autobyteus-web/services/runOpen/teamRunOpenCoordinator.ts` | Trace historical team open orchestration | `openTeamRun(...)` always installs the fully hydrated member map returned by the hydration service. | Yes |
| 2026-04-12 | Code | `autobyteus-web/components/workspace/team/AgentTeamEventMonitor.vue` | Check whether focus mode needs every member projection immediately | Focus mode only reads the currently focused member conversation. | No |
| 2026-04-12 | Code | `autobyteus-web/components/workspace/team/TeamGridView.vue`, `TeamSpotlightView.vue`, `TeamMemberMonitorTile.vue` | Check how non-focus modes consume member contexts | Grid and spotlight iterate all members and can benefit from progressively hydrating missing member conversations after mode entry. | Yes |
| 2026-04-12 | Code | `autobyteus-web/stores/agentTeamContextsStore.ts`, `runHistorySelectionActions.ts`, `useWorkspaceHistorySelectionActions.ts` | Trace member focus changes after the first historical open | Historical member switching currently assumes all members are already present and loaded. | Yes |
| 2026-04-12 | Probe | Live GraphQL `listWorkspaceRunHistory` plus `getTeamMemberRunProjection(teamRunId, memberRouteKey)` measurements against `http://127.0.0.1:8000/graphql` | Measure how large eager historical team hydrations are in real data | The first two stored software-engineering team runs serialize to about `28.30 MB` and `18.07 MB` across all six member projections. | No |
| 2026-04-12 | Data | Count serialized conversation/activity volume across the same two stored team runs | Understand whether the freeze risk is real or theoretical | The larger stored run carries about `3673` conversation entries and `2091` activity entries across six members; the second carries about `2062` conversation entries and `1309` activity entries. | No |

## Current Behavior / Codebase Findings

### Entrypoints And Boundaries

- Primary entrypoints:
  - `autobyteus-web/services/runHydration/teamRunContextHydrationService.ts`
  - `autobyteus-web/services/runOpen/teamRunOpenCoordinator.ts`
  - `autobyteus-web/stores/runHistorySelectionActions.ts`
  - `autobyteus-web/components/workspace/team/TeamWorkspaceView.vue`
  - `autobyteus-web/stores/agentTeamContextsStore.ts`
- Execution boundaries:
  - The grouped workspace-history query already returns enough persisted information to render team rows before any team-open hydration occurs.
  - Historical team opening currently crosses straight from selection/open orchestration into a bulk member-projection fetch.
  - Team workspace focus mode consumes one member conversation, but grid/spotlight iterate all member contexts.
- Owning subsystems / capability areas:
  - `runHydration/` owns persisted projection-to-runtime conversion.
  - `runOpen/` owns historical/live run open orchestration.
  - `agentTeamContextsStore` owns selected team runtime state and member focus.
  - `workspace/team/` components own view-mode rendering, not GraphQL orchestration.

### Relevant Files / Symbols

| Path | Symbol / Area | Current Responsibility | Finding / Observation | Ownership / Placement Implication |
| --- | --- | --- | --- | --- |
| `autobyteus-web/services/runHydration/teamRunContextHydrationService.ts` | `loadTeamRunContextHydrationPayload` | Build team hydration payload from persisted history | Historical and live team opens currently share the same eager all-member fetch path. | This is the correct owner to split live eager hydration from historical lazy hydration. |
| `autobyteus-web/stores/runHistoryTeamHelpers.ts` | `fetchTeamMemberProjections`, `buildTeamMemberContexts` | Fetch member projections and build runtime member contexts | The helpers assume the team needs every member projection before the context can exist. | The helper boundary should be redesigned around shell contexts plus targeted projection application. |
| `autobyteus-web/services/runOpen/teamRunOpenCoordinator.ts` | `openTeamRun` | Orchestrate historical/live team opening | The open coordinator installs whatever hydration payload returns, so it currently inherits the eager design. | Keep orchestration here, but change the hydration contract it depends on. |
| `autobyteus-web/stores/agentTeamContextsStore.ts` | `teams`, `focusedMemberContext`, `setFocusedMember` | Own in-memory team runtime state and focus switching | The store has no explicit notion of loaded vs unloaded historical member projections. | The runtime state needs a lightweight per-member projection-load model. |
| `autobyteus-web/components/workspace/team/TeamWorkspaceView.vue` | focus/grid/spotlight mode rendering | Decide which team workspace mode is active | The default mode is `focus`, but broader modes can trigger demand for additional member data later. | Mode changes should signal lazy hydration, not bypass the hydration owner. |

### Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-04-12 | Probe | Live GraphQL payload-size measurement using `Buffer.byteLength(JSON.stringify(payload))` on `getTeamMemberRunProjection` results for each member of the first two stored software-engineering team runs | Historical eager hydration currently pulls about `28.30 MB` for the first stored run and `18.07 MB` for the second before the second run even becomes active in the center pane. | The freeze is consistent with real payload volume; lazy hydration is required, not optional polish. |
| 2026-04-12 | Repro | Open the first stored software-engineering team run, then open the second stored run | The first open is acceptable, but opening the second historical run previously froze the UI because the historical hydrator materialized another full multi-member graph. | Retaining less data helped, but the root fix is to stop eagerly hydrating every member on first open. |
| 2026-04-12 | Trace | Review `AgentTeamEventMonitor.vue` and `teamWorkspaceViewStore.ts` | Focus mode is the default and only needs the focused member conversation immediately. | Historical initial open should optimize for focus mode. |

## Constraints

- Technical constraints:
  - `AgentTeamContext.members` is still the authoritative member map for runtime team behavior.
  - Existing live streaming logic expects all members to exist as runtime entries when a team is active or temp.
  - Existing selection and view-mode logic key everything by `teamRunId` and `memberRouteKey`.
- Environment constraints:
  - The ticket is being developed in an isolated worktree because the main repo checkout is dirty.
- Third-party / API constraints:
  - Existing GraphQL APIs already provide the necessary metadata and per-member projection query; the lazy redesign does not require a new backend endpoint.

## Unknowns / Open Questions

- Unknown:
  - None
- Why it matters:
  - N/A
- Planned follow-up:
  - N/A

## Implications

### Requirements Implications

- Historical team opens must fetch only one member projection up front.
- The runtime team context needs shell member entries plus an explicit loaded/unloaded projection state.
- Member selection and broader view modes must trigger targeted follow-up projection hydration rather than reopening the whole team.

### Design Implications

- Split the historical hydration path from the live eager-hydration path inside the existing team hydration subsystem.
- Keep GraphQL projection fetches inside the hydration/open boundary rather than moving them into view components.
- Treat `grid` and `spotlight` as demand signals for progressive hydration, not as reasons to keep eager historical open.

### Implementation / Placement Implications

- Main source changes belong in:
  - `autobyteus-web/types/agent/AgentTeamContext.ts`
  - `autobyteus-web/stores/agentTeamContextsStore.ts`
  - `autobyteus-web/stores/runHistoryTeamHelpers.ts`
  - `autobyteus-web/services/runHydration/teamRunContextHydrationService.ts`
  - `autobyteus-web/services/runOpen/teamRunOpenCoordinator.ts`
  - `autobyteus-web/stores/runHistorySelectionActions.ts`
  - `autobyteus-web/components/workspace/team/TeamWorkspaceView.vue`
- Focused regression coverage must verify:
  - initial historical open fetches one member projection
  - switching to another historical member fetches only that missing member
  - grid/spotlight demand does not change the initial historical open path
