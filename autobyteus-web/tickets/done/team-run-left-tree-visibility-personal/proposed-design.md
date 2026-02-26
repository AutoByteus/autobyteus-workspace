# Proposed Design Document

## Design Version

- Current Version: `v4`

## Revision History

| Version | Trigger | Summary Of Changes | Related Review Round |
| --- | --- | --- | --- |
| v1 | User requested enterprise-pattern design adaptation for personal | Defined frontend + backend parity design with personal shared-workspace simplification | 1 |
| v2 | Deep review round 1 write-back | Resolved requirement gaps: canonical team workspace path, persisted member auto-open behavior, delete lifecycle policy | 1 |
| v3 | User added persisted/offline member continuation requirement | Added explicit offline continuation design via team-run continuation service + resolver branch | 4 |
| v4 | Reopened regression after branch reconciliation | Restored store-driven team history projection, persisted member rehydrate selection path, and query/mutation wiring in web | 7 |

## Artifact Basis

- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-web/tickets/in-progress/team-run-left-tree-visibility-personal/investigation-notes.md`
- Requirements: `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-web/tickets/in-progress/team-run-left-tree-visibility-personal/requirements.md`
- Requirements Status: `Refined`

## Summary

Enterprise solves team-run visibility with a dedicated team-history backend (`TeamRunHistoryResolver` + `TeamRunHistoryService`) and a frontend store (`runTreeStore`) that merges persisted team runs with live team contexts.  
Personal should keep the same pattern but simplify grouping: all team members share one workspace, so team rows are rendered under that workspace (not in a global teams section).

## Goals

- Reuse enterprise persistence and API patterns so behavior is stable after reload.
- Preserve personal UX rule: team runs are nested under workspace in left tree.
- Keep frontend immediate responsiveness for draft/live team runs.

## Decision Log (Round-1 Write-Back)

- Persisted team-member selection will auto-open/hydrate the team member run projection immediately.
- Personal keeps enterprise `deleteLifecycle` field; current personal lifecycle remains `READY` until deferred-cleanup behavior is introduced.
- Team workspace grouping uses canonical team-level workspace root path persisted in team manifest/index payloads.
- For existing `teamId` sends when team runtime is offline, backend continues the team run from persisted team-run manifest/history before dispatching the message.
- Reopened regression fix uses `runHistoryStore.getTeamNodes(...)` as canonical left-tree source (persisted + live), removing the live-only panel derivation path.
- Team member row selection is routed through `runHistoryStore.selectTreeRun(...)` so persisted/offline members are rehydrated before continuation send.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: avoid duplicate team tree data sources; standardize on one merged team-run projection path.

## Requirements And Use Cases

| Requirement | Description | Acceptance Criteria | Use Case IDs |
| --- | --- | --- | --- |
| R-001 | Team run appears immediately under workspace after run | Team row visible for temp and promoted IDs | UC-001, UC-002 |
| R-002 | Team/member selection works from left tree | Selection and focus update correctly | UC-003, UC-004 |
| R-003 | Team lifecycle actions update tree state | Terminate/remove behavior consistent | UC-005, UC-007 |
| R-004 | Team history persists and reloads | Team rows rehydrated from backend on fetch | UC-006 |
| R-005 | Offline member continuation works in personal mode | Persisted member can load history and continue messaging while team runtime is offline/idle | UC-008 |

## Codebase Understanding Snapshot (Pre-Design Mandatory)

| Area | Findings | Evidence (files/functions) | Open Unknowns |
| --- | --- | --- | --- |
| Entrypoints / Boundaries | Personal tree is rendered by one panel component and a single run-history store; enterprise splits team history in dedicated APIs/store projection. | `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-web/components/workspace/history/WorkspaceAgentRunsTreePanel.vue`, `enterprise:/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-web/stores/runTreeStore.ts:getTeamNodes` | None |
| Current Naming Conventions | Personal uses `runHistoryStore`; enterprise uses `runTreeStore` with explicit team-run terms (`TeamTreeNode`, `listTeamRunHistory`). | `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-web/stores/runHistoryStore.ts`, `enterprise:/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-web/stores/runTreeStore.ts` | Whether personal should rename store now or keep incremental naming |
| Impacted Modules / Responsibilities | Personal frontend already has live team context; backend lacks team-run-history resolver/service wiring. | `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-web/stores/agentTeamContextsStore.ts`, `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/src/api/graphql/types/run-history.ts` | None |
| Data / Persistence / External IO | Enterprise persists team manifest+index and exposes query/mutation; personal currently only agent run history persistence. | `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/src/run-history/services/team-run-history-service.ts`, `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/src/run-history/services/run-history-service.ts` | Final personal storage location names for team manifests/index |

## Current State (As-Is)

- Frontend personal:
  - Workspace tree projects agent history from `runHistoryStore.getTreeNodes()`.
  - Before v4 regression restore, team rows were derived from live `agentTeamContextsStore` only in panel scope, so persisted teams could disappear after terminate/reload.
- Backend personal:
  - Team history APIs and continuation flow exist and are used by personal runtime (`listTeamRunHistory`, `getTeamRunResumeConfig`, `getTeamMemberRunProjection`, `deleteTeamRunHistory`).

## Target State (To-Be)

- Frontend personal:
  - Tree model includes `workspace -> agents + teams`.
  - Team rows are merged from:
    - persisted team history (`listTeamRunHistory`),
    - live team contexts (temp/draft/active updates).
  - Persisted member selection calls team member projection hydrate flow immediately.
  - Team member selection goes through store-level `selectTreeRun(...)` dispatch for both local and persisted contexts.
  - Rendering remains under workspace section (personal-specific UX).
- Backend personal:
  - Add team-run-history resolver and service surface equivalent to enterprise:
    - `listTeamRunHistory`
    - `getTeamRunResumeConfig`
    - `deleteTeamRunHistory`
    - `getTeamMemberRunProjection`
  - Persist canonical team-level workspace root path in team manifest/index so workspace grouping is deterministic.
  - Add team-run continuation service and route `sendMessageToTeam(teamId=existing)` through continuation path when runtime is offline.
  - Update team lifecycle mutation paths to upsert/update history rows.

## Change Inventory (Delta)

| Change ID | Change Type (`Add`/`Modify`/`Rename/Move`/`Remove`) | Current Path | Target Path | Rationale | Impacted Areas | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| C-001 | Modify | `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-web/stores/runHistoryStore.ts` | same | Add persisted team history state and merged projection by workspace | Frontend store/model | Keep personal workspace nesting |
| C-002 | Modify | `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-web/components/workspace/history/WorkspaceAgentRunsTreePanel.vue` | same | Consume unified team rows from store + live contexts and render under workspace | Frontend UI | Existing patch can be aligned to store-driven projection |
| C-003 | Add | N/A | `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/src/api/graphql/types/team-run-history.ts` | Expose team-run-history query/mutation API | GraphQL API | Enterprise-derived with personal simplification |
| C-004 | Add | N/A | `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/src/run-history/services/team-run-history-service.ts` | Persist and query team run index/manifest | Backend persistence | Reuse enterprise service pattern |
| C-005 | Modify | `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/src/api/graphql/schema.ts` | same | Register team-run-history resolver | GraphQL schema | Required for query discoverability |
| C-006 | Modify | `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/src/api/graphql/types/agent-team-instance.ts` | same | Upsert and lifecycle-update team history during create/send/terminate | Team runtime integration | Keep mutation contract unchanged |
| C-007 | Modify | `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/src/run-history/domain/team-models.ts` | same | Add canonical team-level workspace root path in manifest/index DTO | Backend model contract | Ensures stable workspace grouping |
| C-008 | Add | N/A | `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/src/run-history/services/team-run-continuation-service.ts` | Resume offline team runtime from persisted team history | Backend continuation | Enterprise-derived and simplified for personal |
| C-009 | Modify | `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-server-ts/src/api/graphql/types/agent-team-instance.ts` | same | Route existing-team sends through continuation path prior to dispatch | GraphQL runtime bridge | Required for UC-008 |
| C-010 | Modify | `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-web/graphql/queries/runHistoryQueries.ts` | same | Add missing team-history query documents used by store projection/open flow | Frontend GraphQL docs | Restored from known-good branch behavior |
| C-011 | Modify | `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-web/graphql/mutations/runHistoryMutations.ts` | same | Add team-history delete mutation document for parity | Frontend GraphQL docs | Enables store-level team history delete path |
| C-012 | Modify | `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-web/stores/runHistoryStore.ts` | same | Add team history state, merged team nodes, team-member rehydrate open flow, and select dispatch | Frontend store/model | Canonical source for workspace team tree |
| C-013 | Modify | `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-web/components/workspace/history/WorkspaceAgentRunsTreePanel.vue` | same | Replace live-only team derivation with store-driven team nodes and store-routed member selection | Frontend UI | Fixes terminate/reload disappearance + restore behavior |
| C-014 | Modify | `/Users/normy/autobyteus_org/autobyteus-workspace/autobyteus-web/services/runOpen/runOpenCoordinator.ts` | same | Export projection-to-conversation builder for team-member hydrate reuse | Frontend service boundary | Prevents duplicate projection conversion logic |

## Architecture Overview

- Pattern borrowed from enterprise:
  - `runtime mutation flow` -> `history service` -> `manifest/index persistence`.
  - `frontend fetch` -> `store projection` -> `panel rendering`.
- Personal simplification:
  - Team-to-workspace mapping is single workspace per team.
  - No distributed-node placement metadata is required for rendering.

## File And Module Breakdown

| File/Module | Change Type | Concern / Responsibility | Public APIs | Inputs/Outputs | Dependencies |
| --- | --- | --- | --- | --- | --- |
| `graphql/queries/runHistoryQueries.ts` | Modify | Declare GraphQL documents for team history/read-side hydration | `ListTeamRunHistory`, `GetTeamRunResumeConfig`, `GetTeamMemberRunProjection` | query vars -> typed payloads | Apollo GraphQL client |
| `graphql/mutations/runHistoryMutations.ts` | Modify | Declare GraphQL document for team-history deletion | `DeleteTeamRunHistory` | teamId -> mutation result | Apollo GraphQL client |
| `runHistoryStore.ts` | Modify | Unified run tree projection for agents + teams in personal | `fetchTree`, `getTreeNodes`/team helpers | GraphQL data + live contexts -> UI nodes | Apollo, workspace store, team contexts |
| `WorkspaceAgentRunsTreePanel.vue` | Modify | Render workspace-scoped rows and dispatch team interactions | emits `instance-selected` | store nodes -> UI events | runHistoryStore, selection/team stores |
| `runOpenCoordinator.ts` | Modify | Shared projection conversion helper reused by agent/team open flows | `buildConversationFromProjection` | projection entries -> `Conversation` | run-history stores/services |
| `team-run-history.ts` | Add | GraphQL contract for team history query/mutation/projection hydrate | `listTeamRunHistory`, `getTeamRunResumeConfig`, `getTeamMemberRunProjection`, `deleteTeamRunHistory` | resolver args -> service results | team history + projection services |
| `team-run-history-service.ts` | Add | Team manifest/index persistence + lifecycle read/write | `listTeamRunHistory`, `upsert...`, `onTeamEvent`, `onTeamTerminated`, `deleteTeamRunHistory` | runtime events -> persisted rows | team instance manager, file stores |
| `team-run-continuation-service.ts` | Add | Rehydrate/resume offline team runtime from manifest/history | `continueTeamRun` | teamId + targetMember + input -> resumed dispatch | team history service, team instance manager |
| `team-models.ts` | Modify | Team run domain DTO schema | team manifest/index types | persistence payload <-> API DTO | team history service/stores |
| `schema.ts` | Modify | Resolver registration | `buildGraphqlSchema` | resolver array -> schema | type-graphql |
| `agent-team-instance.ts` | Modify | Runtime lifecycle bridge to history persistence | team mutations | mutation flow -> history updates | team manager + history service |

## Layer-Appropriate Separation Of Concerns Check

- UI/frontend scope: panel remains presentational; store owns projection logic.
- Non-UI scope: resolver remains API boundary; history service owns persistence policy.
- Integration/infrastructure scope: team runtime resolver calls history service through explicit lifecycle hooks.

## Naming Decisions (Natural And Implementation-Friendly)

| Item Type (`File`/`Module`/`API`) | Current Name | Proposed Name | Reason | Notes |
| --- | --- | --- | --- | --- |
| File | `run-history.ts` (agent only) | keep + add `team-run-history.ts` | Matches enterprise and clarifies API separation | Avoid overloading one resolver |
| Module | `runHistoryStore` | keep name short-term | Avoid high-churn rename while behavior is being aligned | Optional future rename to `runTreeStore` |
| API | `listTeamRunHistory` etc. | same as enterprise | Shared query vocabulary reduces drift | Personal keeps same API surface |

## Naming Drift Check (Mandatory)

| Item | Current Responsibility | Does Name Still Match? (`Yes`/`No`) | Corrective Action (`Rename`/`Split`/`Move`/`N/A`) | Mapped Change ID |
| --- | --- | --- | --- | --- |
| `runHistoryStore.ts` | Agent-first tree + (now) team overlay in personal | No | Split/rename later if store continues to grow | C-001 |
| `WorkspaceAgentRunsTreePanel.vue` | Workspace tree for agent + team rows | No | Rename later to `WorkspaceRunsTreePanel.vue` | C-002 |
| `run-history.ts` resolver | Agent run history only | Yes | N/A | C-003 complements it |

## Dependency Flow And Cross-Reference Risk

| Module/File | Upstream Dependencies | Downstream Dependents | Cross-Reference Risk | Mitigation / Boundary Strategy |
| --- | --- | --- | --- | --- |
| `agent-team-instance.ts` | Team runtime manager, team history service | GraphQL mutation callers | Medium | Keep history updates in narrow helper calls |
| `team-run-history-service.ts` | run-history stores, team manager | team-history resolver, team runtime mutations | Medium | Keep service pure IO + status derivation |
| `runHistoryStore.ts` | GraphQL queries, workspace/team context stores | left panel and routing UX | Medium | keep projection helpers isolated and test-backed |

## Decommission / Cleanup Plan

| Item To Remove/Rename | Cleanup Actions | Legacy Removal Notes | Verification |
| --- | --- | --- | --- |
| ad-hoc in-component team-only projection logic | move projection ownership into store as canonical source | avoid dual projection implementations | panel/unit tests |
| duplicate team row derivation paths | keep one merged projection function | no compatibility branch | store tests |

## Error Handling And Edge Cases

- If team history query fails, keep live team contexts visible and surface a non-blocking error toast/state.
- If canonical team workspace root path is missing in a persisted row, do not render the row under arbitrary member workspace; treat as data integrity warning and skip until repaired.
- Prevent deletion of active team history; align with enterprise behavior.

## Use-Case Coverage Matrix (Design Gate)

| use_case_id | Requirement | Use Case | Primary Path Covered (`Yes`/`No`) | Fallback Path Covered (`Yes`/`No`/`N/A`) | Error Path Covered (`Yes`/`No`/`N/A`) | Runtime Call Stack Section |
| --- | --- | --- | --- | --- | --- | --- |
| UC-001 | R-001 | Run team shows under workspace immediately | Yes | Yes | Yes | Planned in next artifact |
| UC-002 | R-001 | Temp-to-permanent id promotion keeps row visible | Yes | N/A | Yes | Planned in next artifact |
| UC-003 | R-002 | Team row selection works | Yes | N/A | Yes | Planned in next artifact |
| UC-004 | R-002 | Team member selection sets focus | Yes | N/A | Yes | Planned in next artifact |
| UC-005 | R-003 | Team terminate updates row | Yes | N/A | Yes | Planned in next artifact |
| UC-006 | R-004 | Persisted rows reload after restart | Yes | Yes | Yes | Planned in next artifact |
| UC-007 | R-003 | Delete inactive team history | Yes | N/A | Yes | Planned in next artifact |
| UC-008 | R-005 | Persisted member offline continuation | Yes | N/A | Yes | Planned in next artifact |

## Performance / Security Considerations

- Run `listRunHistory` and `listTeamRunHistory` in parallel on frontend fetch.
- Keep delete path protected against path traversal by using normalized safe directory checks (enterprise pattern).

## Migration / Rollout (If Needed)

- Step 1: Add backend team history APIs and persistence service.
- Step 2: Extend personal frontend store to fetch/merge team history.
- Step 3: Keep workspace-nested team rendering in panel.
- Step 4: Add/adjust tests.

## Change Traceability To Implementation Plan

| Change ID | Implementation Plan Task(s) | Verification (Unit/Integration/E2E/Manual) | Status |
| --- | --- | --- | --- |
| C-001 | T-01 | Frontend unit tests + manual run | Completed |
| C-002 | T-02 | Frontend unit tests + manual run | Completed |
| C-003 | T-03 | GraphQL resolver tests | Completed |
| C-004 | T-04 | Backend service tests | Completed |
| C-005 | T-05 | Schema bootstrap test | Completed |
| C-006 | T-06 | Team execution integration tests | Completed |
| C-008 | T-07 | Backend continuation service tests | Completed |
| C-009 | T-08 | GraphQL `sendMessageToTeam` continuation-path tests | Completed |
| C-010 | T-09 | Frontend unit tests (`runHistoryStore`, workspace panel) | Completed |
| C-011 | T-09 | Frontend unit tests (`runHistoryStore`) | Completed |
| C-012 | T-10 | Frontend unit tests + manual regression verification | Completed |
| C-013 | T-11 | Frontend panel tests + manual UI click-path verification | Completed |
| C-014 | T-10 | Type compatibility check in store/open flow tests | Completed |

## Design Feedback Loop Notes (From Review/Implementation)

| Date | Trigger (Review/File/Test/Blocker) | Classification (`Local Fix`/`Design Impact`/`Requirement Gap`) | Design Smell | Requirements Updated? | Design Update Applied | Status |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-02-20 | User requested enterprise cross-check for recurrence confidence | Design Impact | personal only had partial frontend fix; backend parity missing | Yes | Added backend parity scope and enterprise-derived architecture | Open |
| 2026-02-20 | Deep review round 1 | Requirement Gap | persisted member-open behavior and workspace grouping were ambiguous | Yes | Promoted decisions into requirements + design; bumped to v2 | Closed |
| 2026-02-20 | User added offline member continuation expectation | Requirement Gap | continuation behavior for existing `teamId` sends was not explicit | Yes | Added UC-008 and continuation-service design in v3 | Closed |
| 2026-02-21 | User-reported regression after branch reconciliation | Design Impact | left tree relied on live-only team contexts; persisted member selection bypassed store hydrate path | Yes | Added v4 store-driven team projection + member selection routing via `selectTreeRun` | Closed |

## Open Questions

- Should team-level workspace root path be duplicated into both manifest and index row for read-path speed, or derived from manifest only?
