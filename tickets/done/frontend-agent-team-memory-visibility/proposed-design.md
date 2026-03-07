# Proposed Design Document

## Design Version

- Current Version: `v1`

## Revision History

| Version | Trigger | Summary Of Changes | Related Review Round |
| --- | --- | --- | --- |
| v1 | Initial draft | Define dual-scope memory UX (`Agent Runs` + `Team Runs`) with new team-memory backend contracts and frontend scope-aware stores/components. | 1 |

## Artifact Basis

- Investigation Notes: `tickets/in-progress/frontend-agent-team-memory-visibility/investigation-notes.md`
- Requirements: `tickets/in-progress/frontend-agent-team-memory-visibility/requirements.md`
- Requirements Status: `Design-ready`

## Summary

Add explicit memory scope switching in `/memory` and provide first-class team-member memory retrieval from `memory/agent_teams`. Preserve current agent-run memory behavior while introducing team-run index + member-memory view APIs and corresponding frontend state/UI.

## Goals

- Keep one intuitive memory page.
- Preserve existing agent memory behavior.
- Enable selecting team -> member -> member-run memory inspection.
- Keep clear separation between scope state, index state, and inspector view state.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: remove any temporary dual-render hacks that mix scope-specific UI in hidden branches.
- Gate rule: design invalid if both old and new selection models remain active simultaneously.

## Requirements And Use Cases

| Requirement ID | Description | Acceptance Criteria ID(s) | Acceptance Criteria Summary | Use Case IDs |
| --- | --- | --- | --- | --- |
| R-001 | Scope toggle | AC-001 | Toggle with default agent scope | UC-001, UC-002 |
| R-002 | Preserve agent behavior | AC-002 | Agent memory unchanged | UC-001 |
| R-003 | Team/member index | AC-003 | Team/member selectable list | UC-002 |
| R-004 | Team member view retrieval | AC-004 | Member run memory visible | UC-003 |
| R-005 | Context header clarity | AC-003 | Header identifies selected context | UC-003, UC-004 |
| R-006 | Scoped loading/error/stale guard | AC-005, AC-006 | No mixed stale scope data | UC-004, UC-005 |
| R-007 | Team memory data contract | AC-004, AC-007 | Backend reads `agent_teams` layout | UC-002, UC-003 |
| R-008 | No run-history regression | AC-007 | Existing run-history APIs unaffected | UC-005 |

## Codebase Understanding Snapshot (Pre-Design Mandatory)

| Area | Findings | Evidence (files/functions) | Open Unknowns |
| --- | --- | --- | --- |
| Entrypoints / Boundaries | Memory page is isolated and store-driven. | `autobyteus-web/pages/memory.vue`, `stores/agentMemoryIndexStore.ts`, `stores/agentMemoryViewStore.ts` | None |
| Current Naming Conventions | Run-scoped memory queries use `RunMemoryView` terms. Team projection uses `TeamMemberRunProjection`. | `graphql/queries/agentMemoryViewQueries.ts`, `graphql/queries/runHistoryQueries.ts` | Final naming choice for new team-memory query |
| Impacted Modules / Responsibilities | Memory index/view resolvers currently tied to `MemoryFileStore` default `agents` root. | `src/api/graphql/types/memory-index.ts`, `memory-view.ts`, `memory-file-store.ts` | None |
| Data / Persistence / External IO | Team memory stored under `memory/agent_teams/<teamRunId>/<memberRunId>/...`. | `team-member-memory-layout-store.ts` | Sort strategy for team/member index |

## Current State (As-Is)

- `/memory` loads only `listRunMemorySnapshots` and `getRunMemoryView`.
- Team memory is only exposed indirectly as conversation projection via team run history APIs.

## Target State (To-Be)

- `/memory` has scope toggle (`Agent Runs`/`Team Runs`).
- Agent scope uses existing index/view stores and tabs.
- Team scope uses:
  - team-memory index query for team/member list,
  - team-member memory view query for full memory tabs payload.
- Inspector stays reusable and scope-aware.

## Architecture Direction Decision (Mandatory)

- Chosen direction: `Add` (new scope-aware team memory contracts + stores) while `Keep` existing agent memory path.
- Rationale (`complexity`, `testability`, `operability`, `evolution cost`): additive change limits regression risk and enables independent test coverage per scope.
- Layering fitness assessment: `Yes`
- Decoupling assessment: `Yes`
- Outcome (`Keep`/`Add`/`Split`/`Merge`/`Move`/`Remove`): `Add`

## Change Inventory (Delta)

| Change ID | Change Type (`Add`/`Modify`/`Rename/Move`/`Remove`) | Current Path | Target Path | Rationale | Impacted Areas | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| C-001 | Modify | `autobyteus-server-ts/src/api/graphql/types/memory-index.ts` | same | Add team memory index GraphQL types + query | Backend API | Non-breaking additive query |
| C-002 | Modify | `autobyteus-server-ts/src/api/graphql/types/memory-view.ts` | same | Add team member memory view query | Backend API | Non-breaking additive query |
| C-003 | Add | N/A | `autobyteus-server-ts/src/agent-memory-view/services/team-memory-index-service.ts` | Dedicated service for team memory index assembly | Backend service | Async service over team manifests + memory files |
| C-004 | Add | N/A | `autobyteus-web/graphql/queries/teamMemoryQueries.ts` | Separate frontend query module for team memory | Frontend GraphQL | Keeps run-history and memory concerns decoupled |
| C-005 | Add | N/A | `autobyteus-web/stores/teamMemoryIndexStore.ts` | Team scope index state | Frontend state | search/pagination/expand state |
| C-006 | Add | N/A | `autobyteus-web/stores/teamMemoryViewStore.ts` | Team scope inspector state | Frontend state | selected team/member + view payload |
| C-007 | Modify | `autobyteus-web/stores/agentMemoryViewStore.ts` | same | Add lightweight scope-safe clear/reset behavior as needed | Frontend state | Avoid mixed-scope stale data |
| C-008 | Modify | `autobyteus-web/types/memory.ts` | same | Add team memory index/view DTOs | Frontend types | Shared typing for components/stores |
| C-009 | Modify | `autobyteus-web/components/memory/MemoryIndexPanel.vue` | same | Add scope toggle and team/member listing mode | Frontend UI | preserve existing agent UI path |
| C-010 | Modify | `autobyteus-web/components/memory/MemoryInspector.vue` | same | Make inspector scope-aware for header/data source | Frontend UI | tabs remain reusable |
| C-011 | Modify | `autobyteus-web/pages/memory.vue` | same | Initial fetch behavior depends on active scope | Frontend page | default agent fetch |
| C-012 | Add/Modify | test files | same/new tests | Validate new APIs and dual-scope UI/store behavior | Backend+frontend tests | Required by AC-008 |

## Target Architecture Shape And Boundaries (Mandatory)

| Layer/Boundary | Purpose | Owns | Must Not Own | Notes |
| --- | --- | --- | --- | --- |
| Frontend Memory Page + Components | Render and interaction | UI state rendering and events | Direct persistence/path logic | Uses stores only |
| Frontend Stores | Orchestrate query calls + local selection state | scope-aware fetch/select/error state | raw DOM concerns | Agent and team stores separated |
| GraphQL Query Modules | Transport contracts | query documents | view formatting | one module per concern |
| Backend Resolvers | API boundary | arg validation and service wiring | filesystem traversal details | delegate to services/stores |
| Backend Memory Services | memory view/index construction | file read orchestration + model assembly | GraphQL decorations | reusable and testable |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Replacement Clean-Cut Design |
| --- | --- | --- | --- |
| Reuse run-history projection as team memory inspector payload | lower immediate effort | Rejected | Add dedicated team-memory view query with same memory tab payload shape |
| Keep one store handling both scopes with nullable mixed fields | fewer new files | Rejected | Separate stores per scope + explicit scope switch state |

## File And Module Breakdown

| File/Module | Change Type | Layer / Boundary | Concern / Responsibility | Public APIs | Inputs/Outputs | Dependencies |
| --- | --- | --- | --- | --- | --- | --- |
| `memory-index.ts` | Modify | API boundary | add team memory index query | `listTeamRunMemorySnapshots` | args -> TeamMemorySnapshotPage | team-memory-index-service |
| `memory-view.ts` | Modify | API boundary | add team member memory view query | `getTeamMemberRunMemoryView` | team/member args -> AgentMemoryView | MemoryFileStore + AgentMemoryViewService |
| `team-memory-index-service.ts` | Add | backend service | build paged team/member memory summary | `listTeamSnapshots` | search/page inputs -> page payload | TeamRunManifestStore, MemoryFileStore |
| `teamMemoryQueries.ts` | Add | frontend graphql | team memory queries | gql docs | vars -> response | apollo client |
| `teamMemoryIndexStore.ts` | Add | frontend state | team index and expansion state | `fetchIndex`, `setSearch`, etc. | query result -> normalized state | teamMemoryQueries |
| `teamMemoryViewStore.ts` | Add | frontend state | selected team/member and memory view fetch | `setSelectedMember`, `fetchMemoryView` | ids -> view payload | teamMemoryQueries |
| `MemoryIndexPanel.vue` | Modify | frontend UI | render scope toggle + index lists | emits/actions | store state <-> user input | scope + index stores |
| `MemoryInspector.vue` | Modify | frontend UI | scope-aware header and tab source | internal tab events | selected scope/view -> tab props | view stores |

## Layer-Appropriate Separation Of Concerns Check

- UI/frontend scope: clear separation between scope toggle/index panel and inspector.
- Non-UI scope: clear separation between resolver and service.
- Integration/infrastructure scope: file IO stays in memory store/service layer.
- Decoupling check: no new cyclic dependency between run-history and memory modules.

## Naming Decisions (Natural And Implementation-Friendly)

| Item Type (`File`/`Module`/`API`) | Current Name | Proposed Name | Reason | Notes |
| --- | --- | --- | --- | --- |
| API | N/A | `listTeamRunMemorySnapshots` | mirrors existing `listRunMemorySnapshots` vocabulary | index query |
| API | N/A | `getTeamMemberRunMemoryView` | mirrors existing team-member naming | view query |
| Store | N/A | `teamMemoryIndexStore` | parallel to existing `agentMemoryIndexStore` | clear ownership |
| Store | N/A | `teamMemoryViewStore` | parallel to existing `agentMemoryViewStore` | clear ownership |

## Naming Drift Check (Mandatory)

| Item | Current Responsibility | Does Name Still Match? (`Yes`/`No`) | Corrective Action (`Rename`/`Split`/`Move`/`N/A`) | Mapped Change ID |
| --- | --- | --- | --- | --- |
| `MemoryIndexPanel` | render index controls and entries | Yes | N/A | C-009 |
| `MemoryInspector` | inspect selected memory payload | Yes | N/A | C-010 |

## Existing-Structure Bias Check (Mandatory)

| Candidate Area | Current-File-Layout Bias Risk | Architecture-First Alternative | Decision | Why |
| --- | --- | --- | --- | --- |
| Reusing run-history team query for memory index | Medium | add dedicated memory index API | Change | avoids coupling memory UI to run-history semantics |
| Forcing single dual-scope mega store | High | separate agent/team stores | Change | reduces mixed-state bugs |

## Anti-Hack Check (Mandatory)

| Candidate Change | Shortcut/Hack Risk | Proper Structural Fix | Decision | Notes |
| --- | --- | --- | --- | --- |
| Mapping projection `conversation` to fake memory tabs | High | add team member memory-view API | Reject hack | preserves tab meaning |
| Scope switch without clearing incompatible selection | Medium | explicit scope-change reset rules | Apply fix | prevents stale data bleed |

## Dependency Flow And Cross-Reference Risk

| Module/File | Upstream Dependencies | Downstream Dependents | Cross-Reference Risk | Mitigation / Boundary Strategy |
| --- | --- | --- | --- | --- |
| `teamMemoryViewStore` | graphql query module, apollo | `MemoryInspector.vue` | Low | no component imports in stores |
| `memory-view.ts` resolver | memory services/stores | frontend GraphQL consumers | Low | resolver-only wiring |
| `MemoryIndexPanel.vue` | multiple stores | memory page | Medium | keep UI logic thin, delegate actions to stores |

## Allowed Dependency Direction (Mandatory)

- Allowed direction rules: `Page/Component -> Store -> GraphQL Query` and `Resolver -> Service -> Store(IO)`.
- Temporary boundary violations and cleanup deadline: none planned.

## Decommission / Cleanup Plan

| Item To Remove/Rename | Cleanup Actions | Legacy Removal Notes | Verification |
| --- | --- | --- | --- |
| Scope-unsafe selection remnants in memory components | remove mixed-scope assumptions and stale header logic | no dual-scope shared selection object | component/store tests |

## Error Handling And Edge Cases

- Team has no members: render empty state in team index panel.
- Member memory files missing: show inspector empty/not available states, not crash.
- Scope switch while fetch in flight: request-id guard in each store ensures stale response ignored.
- Team/member fetch error: show scoped error banner; keep last successful payload for that scope.

## Use-Case Coverage Matrix (Design Gate)

| use_case_id | Requirement | Use Case | Primary Path Covered (`Yes`/`No`) | Fallback Path Covered (`Yes`/`No`/`N/A`) | Error Path Covered (`Yes`/`No`/`N/A`) | Runtime Call Stack Section |
| --- | --- | --- | --- | --- | --- | --- |
| UC-001 | R-001,R-002 | Agent scope default and agent run inspect | Yes | N/A | Yes | UC-001 |
| UC-002 | R-001,R-003,R-007 | Switch to team scope and list team/member index | Yes | Yes | Yes | UC-002 |
| UC-003 | R-004,R-005,R-007 | Select member and load member memory view | Yes | Yes | Yes | UC-003 |
| UC-004 | R-005,R-006 | Scope switch and stale-state isolation | Yes | Yes | Yes | UC-004 |
| UC-005 | R-006,R-008 | Error handling and no regression to existing APIs | Yes | N/A | Yes | UC-005 |

## Performance / Security Considerations

- Team index query paginates team rows and performs bounded member summaries per page.
- Team/member path resolution remains bounded by existing safe path logic (`TeamMemberMemoryLayoutStore`).
- No new external IO surface beyond existing memory files.

## Change Traceability To Implementation Plan

| Change ID | Implementation Plan Task(s) | Verification (Unit/Integration/API/E2E) | Status |
| --- | --- | --- | --- |
| C-001..C-003 | T-001..T-003 | Backend unit + API scenario | Planned |
| C-004..C-011 | T-004..T-009 | Frontend unit/component + E2E scenario | Planned |
| C-012 | T-010 | test execution gates | Planned |

## Open Questions

- None blocking implementation. Team aggregate tab intentionally deferred out-of-scope.
