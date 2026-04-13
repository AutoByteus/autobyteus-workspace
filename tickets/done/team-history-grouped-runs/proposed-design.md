# Proposed Design Document

## Design Version

- Current Version: `v4`

## Revision History

| Version | Trigger | Summary Of Changes | Related Review Round |
| --- | --- | --- | --- |
| v1 | Initial draft | Introduce grouped team-definition presentation while preserving run-level team identity and actions | 1 |
| v2 | Requirement-gap re-entry | Move team-definition grouping and initial summary completeness into the backend history contract, then let the sidebar render that contract directly | 3 |
| v3 | Requirement-gap re-entry | Make the workspace-history payload symmetric and canonical by exposing grouped agent definitions plus grouped team definitions and removing flat persisted team-run paths | 5 |
| v4 | Requirement-gap re-entry | Redesign historical team opening around shell member contexts plus focused-member-first lazy projection hydration while keeping live-team behavior unchanged | 7 |

## Artifact Basis

- Investigation Notes: `tickets/done/team-history-grouped-runs/investigation-notes.md`
- Requirements: `tickets/done/team-history-grouped-runs/requirements.md`
- Requirements Status: `Design-ready`
- Shared Design Principles: `shared/design-principles.md`

## Summary

Keep the grouped backend workspace-history tree as the canonical sidebar read model, but split historical team hydration from live team hydration. Inactive historical team runs should open as lightweight shell team contexts that contain every member identity and config but only one loaded member projection at first. The initially loaded member is the explicitly requested member when present, otherwise the coordinator. Additional historical member projections are loaded one at a time on demand, and broader team views such as `grid` or `spotlight` progressively hydrate the remaining missing members after the user enters those modes.

## Goal / Intended Change

Replace the eager historical team-open runtime path with a focused-member-first lazy model:

- grouped workspace-history tree remains unchanged as the persisted read model
- historical team open creates shell member contexts for all members
- only the focused/coordinator member projection is fetched and applied up front
- clicking another historical member hydrates only that member
- `grid` and `spotlight` progressively hydrate missing members after mode entry
- live active team runs keep the current eager/subscribed behavior

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action:
  - remove the eager all-member historical-team-open path
  - remove the dormant historical-context pruning workaround from the historical open path once shell-first hydration makes it unnecessary

## Requirements And Use Cases

| Requirement ID | Description | Acceptance Criteria ID(s) | Acceptance Criteria Summary | Use Case IDs |
| --- | --- | --- | --- | --- |
| R-001 | Historical team open fetches one member projection first | AC-001, AC-004 | Initial inactive historical open hydrates only the requested or coordinator member | UC-001 |
| R-002 | Historical team contexts support lightweight shell members | AC-002 | Non-focused members exist without full projection payloads | UC-001 |
| R-003 | Historical member switching hydrates one missing member at a time | AC-003 | Member switching fetches only the newly requested member projection | UC-002 |
| R-004 | Grid/spotlight hydrate progressively on demand | AC-005 | Broader views load missing members after mode entry instead of during first open | UC-003 |
| R-005 | Preserve grouped contract and live-team behavior | AC-006 | Grouped sidebar contract and live subscribed team behavior remain intact | UC-001, UC-002, UC-003 |

## Current-State Read

| Area | Findings | Evidence (files/functions) | Open Unknowns |
| --- | --- | --- | --- |
| Entrypoints / Current Spine | Historical team selection flows through `openTeamRun(...)`, which currently delegates to one eager hydrator for both inactive and active team runs | `teamRunOpenCoordinator.ts`, `teamRunContextHydrationService.ts` | None |
| Current Ownership Boundaries | The hydration subsystem already owns projection fetching and runtime conversion, but it does not distinguish between shell-member setup and member-projection loading | `teamRunContextHydrationService.ts`, `runHistoryTeamHelpers.ts` | None |
| Current Coupling / Fragmentation Problems | Team workspace focus mode only needs one member, but the runtime open path preloads every member because the runtime context model assumes that the team cannot exist before every member projection is fetched | `AgentTeamEventMonitor.vue`, `TeamGridView.vue`, `TeamSpotlightView.vue`, `runHistoryTeamHelpers.ts` | None |
| Existing Constraints / Compatibility Facts | Live subscribed teams and temp teams already rely on a fully populated member map and should not be redesigned in this re-entry | `agentTeamRunStore.ts`, `runHistoryLoadActions.ts` | None |
| Relevant Files / Components | The redesign stays within the existing frontend team runtime boundary: type/state model, hydration helpers, open coordinator, selection actions, and team workspace view | `AgentTeamContext.ts`, `agentTeamContextsStore.ts`, `teamRunContextHydrationService.ts`, `teamRunOpenCoordinator.ts`, `runHistorySelectionActions.ts`, `TeamWorkspaceView.vue` | None |

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Owning Node / Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | Left-tree historical team-run selection | Focus-mode workspace opens with shell members plus one loaded member projection | `teamRunOpenCoordinator.ts` + `teamRunContextHydrationService.ts` | This is the new historical open contract |
| DS-002 | Primary End-to-End | Historical member selection after a team is already open | Requested member becomes focused with its projection loaded if missing | `runHistorySelectionActions.ts` + `teamRunContextHydrationService.ts` | This preserves member drill-down without reopening the whole team |
| DS-003 | Bounded Local | Historical team workspace switches from `focus` to `grid` or `spotlight` | Missing member projections hydrate progressively in the background | `TeamWorkspaceView.vue` + `teamRunContextHydrationService.ts` | This prevents broader views from reintroducing eager first-open cost |
| DS-004 | Return-Event | Team hydration finishes for one member | Existing runtime context is patched in place and the view updates without reopening the team | `agentTeamContextsStore.ts` | This keeps runtime state stable while projections arrive incrementally |

## Primary Execution / Data-Flow Spine(s)

- `workspace tree click -> selection action -> openTeamRun -> getTeamRunResumeConfig + build shell member contexts -> fetch focused member projection only -> install historical team context -> focus-mode render`
- `member click -> selection action -> ensure historical member hydrated -> fetch one member projection if missing -> patch member context -> focus switches without whole-team reopen`
- `mode switch to grid/spotlight -> request progressive missing-member hydration -> sequential member projection fetch/apply loop`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | A historical team opens as one lightweight team context whose member map is immediately usable for identity and selection, but only one member's full projection payload is fetched up front. | history row, open coordinator, historical hydrator, team context store, focus-mode view | `teamRunOpenCoordinator.ts` + `teamRunContextHydrationService.ts` | workspace lookup, summary display, selection bookkeeping |
| DS-002 | A later historical member selection reuses the already open team context and loads only the missing member projection when necessary. | member row, selection action, targeted member hydrator, team context store | `runHistorySelectionActions.ts` + `teamRunContextHydrationService.ts` | config-panel focus, shared composer retargeting |
| DS-003 | Broader team views do not change initial open cost; they progressively hydrate the remaining missing members only after the user enters those views. | view-mode store, team workspace view, progressive hydrator loop | `TeamWorkspaceView.vue` + `teamRunContextHydrationService.ts` | tile ordering, load-status rendering |
| DS-004 | When one member finishes loading, the runtime team context is patched in place so existing focus, selection, and team identity remain stable. | member projection fetch, member context patch, reactive update | `agentTeamContextsStore.ts` | in-flight dedupe, activity-store refresh |

## Ownership Map

| Node / Owner | Owns | Must Not Own | Notes |
| --- | --- | --- | --- |
| `teamRunContextHydrationService.ts` | Historical-vs-live hydration strategy, shell-member construction, targeted member-projection fetch/apply logic | Vue view-mode state or selection events | Correct owner for projection fetching and runtime conversion |
| `teamRunOpenCoordinator.ts` | Historical/live team-open orchestration and context installation | Per-view lazy-loading policy details | Uses the hydration service as its authoritative boundary |
| `agentTeamContextsStore.ts` | In-memory team runtime state, focus, and member projection load-state bookkeeping | Direct GraphQL calls | Correct owner for reactive team state |
| `runHistorySelectionActions.ts` | Historical member selection routing | Projection fetch internals | Signals the team-context store instead of reopening everything |
| `TeamWorkspaceView.vue` | Mode-change demand signals and rendering | GraphQL or projection transformation | May request broader hydration through the team-context store, not by calling the hydrator directly |
| `runHistoryLoadActions.ts` | Live active team recovery | Historical lazy-loading policy | Live eager hydration stays here unchanged |

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Serves Which Owner | Responsibility | Must Stay Off Main Line? (`Yes`/`No`) |
| --- | --- | --- | --- |
| Summary prefix stripping | history section component | Sanitize raw summary text for label display | Yes |
| Relative time and avatar rendering | history/team components | Display-only presentation | Yes |
| Per-member projection load-state rendering | team workspace components | Optionally show whether a member is still loading or unavailable | Yes |
| Activity-store refresh | targeted member hydrator | Replace one member's historical activity payload when that member finishes loading | Yes |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Historical team-open orchestration | `teamRunOpenCoordinator.ts` | Reuse | It already owns team open sequencing | N/A |
| Projection fetch and runtime conversion | `teamRunContextHydrationService.ts` + `runHistoryTeamHelpers.ts` | Extend | The existing hydration boundary is the correct place to split historical lazy hydration from live eager hydration | N/A |
| Team runtime state and focus | `agentTeamContextsStore.ts` | Extend | The store already owns `AgentTeamContext` instances and focused-member state | N/A |
| Broader-view demand signaling | `TeamWorkspaceView.vue` + `teamWorkspaceViewStore.ts` | Reuse | View mode is already owned here; the component should only signal the hydrator | N/A |
| Backend API for member projection fetch | existing GraphQL `getTeamMemberRunProjection` | Reuse | The needed per-member query already exists | N/A |

## Architecture Direction Decision (Mandatory)

- Chosen direction: `Split historical lazy hydration from live eager hydration within the existing team runtime subsystem`
- Outcome (`Keep`/`Add`/`Split`/`Merge`/`Move`/`Remove`):
  - `Keep` grouped backend workspace-history contract
  - `Split` historical hydration from live hydration in `teamRunContextHydrationService.ts`
  - `Add` explicit per-member historical projection-load state on `AgentTeamContext`
  - `Remove` eager all-member historical fetches and the pruning workaround tied to them

## Change Inventory (Delta)

| Change ID | Change Type (`Add`/`Modify`/`Rename/Move`/`Remove`) | Current Path | Target Path | Rationale | Impacted Areas | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| C-001 | Modify | `autobyteus-web/types/agent/AgentTeamContext.ts` | same | Add explicit historical member projection-load state so shell members and hydrated members can coexist cleanly | Runtime team model | Required |
| C-002 | Modify | `autobyteus-web/stores/runHistoryTeamHelpers.ts` | same | Replace eager all-member historical projection fan-out with shell-member construction plus reusable single-member projection helpers | Historical runtime hydration | Required |
| C-003 | Modify | `autobyteus-web/services/runHydration/teamRunContextHydrationService.ts` | same | Split live eager hydration from historical focused-member-first hydration and expose targeted/member-batch ensure helpers | Hydration boundary | Required |
| C-004 | Modify | `autobyteus-web/services/runOpen/teamRunOpenCoordinator.ts` and `autobyteus-web/stores/runHistorySelectionActions.ts` | same | Open inactive teams with one loaded member and route later member-demand requests through the team-context store instead of reopening the whole team | Open/selection flow | Required |
| C-005 | Modify | `autobyteus-web/stores/agentTeamContextsStore.ts` and `autobyteus-web/components/workspace/team/TeamWorkspaceView.vue` | same | Track load state in-memory and expose store-owned `ensure...hydrated` actions that the view can call when broader modes are entered | Runtime state + view demand signal | Required |
| C-006 | Remove | `autobyteus-web/stores/agentTeamContextsStore.ts`, `teamRunOpenCoordinator.ts` | same | Remove dormant historical-context pruning as the primary performance fix because shell-first hydration becomes the real fix | Cleanup | Required |
| C-007 | Modify | focused frontend tests | same | Verify single-member initial fetch, lazy member switching, and on-demand broader-view hydration | Regression coverage | Required |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| Eager all-member historical projection fetch on team open | Historical focus mode only needs one member immediately | focused-member-first hydration in `teamRunContextHydrationService.ts` | In This Change | Live eager hydration remains for active teams only |
| Dormant historical-context pruning workaround | The freeze should no longer depend on tearing down already opened historical contexts if each one opens cheaply | shell-first historical contexts plus targeted member hydration | In This Change | Preserve only real lifecycle cleanup, not the workaround |
| Implicit "all members are already loaded" assumption in historical member switching | Historical runtime state now distinguishes shell members from hydrated members | per-member load-state plus `ensureHistoricalTeamMemberHydrated(...)` | In This Change | Needed for left-tree and workspace member selection |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/types/agent/AgentTeamContext.ts` | team runtime model | runtime shared type | Represent team runtime state, including per-member historical projection-load state | One owned runtime team shape | Reuses `AgentContext`, task types |
| `autobyteus-web/stores/runHistoryTeamHelpers.ts` | historical team hydration helpers | hydration support under the team-history subsystem | Build shell member contexts and apply one member projection to an existing context | Shared projection-to-context mechanics belong together | Reuses conversation/activity hydration helpers |
| `autobyteus-web/services/runHydration/teamRunContextHydrationService.ts` | team run hydration | authoritative hydration boundary | Orchestrate historical shell-first hydration, targeted member ensures, and live eager hydration | One owner for persisted projection fetch + runtime conversion | Reuses GraphQL projection query and helper builders |
| `autobyteus-web/services/runOpen/teamRunOpenCoordinator.ts` | team open orchestration | open boundary | Install team contexts using the new hydration contract | One owner for open sequencing | Reuses hydration service and run-config reconstruction |
| `autobyteus-web/stores/agentTeamContextsStore.ts` | team runtime state | Pinia store | Hold team contexts, focus, per-member load-state, and store-owned member hydration requests | Existing authoritative team runtime store | Reuses `AgentTeamContext` |
| `autobyteus-web/components/workspace/team/TeamWorkspaceView.vue` | team workspace presentation | team workspace view | Request progressive missing-member hydration when the user enters grid/spotlight | View owns mode changes and demand signals | Reuses team-context store and mode store |
