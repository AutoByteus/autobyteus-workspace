# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Design-ready

## Goal / Problem Statement

Users can add file-based skill source folders and see the discovered skills on the Skills page, but when files inside an already-configured skill source change on disk, there is no explicit reload control. Users must restart the application to force the visible skill catalog to refresh. Add a user-triggered skill catalog reload that refreshes configured skill sources and the Skills page list without restarting the app.

## Investigation Findings

- The backend `SkillService` already performs fresh synchronous filesystem scans for `listSkills()`, `getSkill()`, and `getSkillSources()` through `skill-discovery.ts`; there is no durable backend skill catalog cache to clear for the Skills page today.
- The missing behavior is still real at the product/API boundary: the frontend only fetches the skills list on `SkillsList.vue` mount and after add/remove source actions. There is no reload command exposed in the Skills page or Skill Sources modal for externally edited source folders.
- The analogous agent-package reload flow is a GraphQL mutation (`reloadAgentPackage`) exposed through `AgentPackagesManager.vue`; it validates the target package, refreshes backend catalog caches for agents/teams, returns updated packages, and the frontend refreshes dependent catalogs.
- Skill source add/remove already updates `AUTOBYTEUS_SKILLS_PATHS` through `ServerSettingsService`, then the frontend manually calls `skillStore.fetchAllSkills()` to refresh visible skills.
- Existing page behavior already handles a refreshed list that no longer contains the selected skill: `pages/skills.vue` clears detail selection when `skills` no longer contains the selected name.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Feature / behavior gap
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes, small boundary gap
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Likely Not Needed
- Evidence basis: Backend skill scanning owner exists and is cohesive; frontend skill/source stores exist; only explicit reload command boundary and UI action are missing.
- Requirement or scope impact: Extend the existing skill catalog boundary with a reload mutation and frontend action. Do not redesign skill discovery or agent-package reload.

## Recommendations

- Add a backend GraphQL mutation for skill catalog reload, returning both refreshed `skills` and refreshed `skillSources` so the frontend can update list cards and source counts from one authoritative command.
- Implement reload as an explicit method on `SkillService` even though the current implementation is a fresh rescan wrapper. This gives the UI/API a stable capability boundary and leaves future cache invalidation inside the service owner.
- Add a Skills page reload button near the existing `Sources` and `Create Skill` actions. It should be independent of add/remove source flows and should show loading, success, and error feedback.
- Keep reload global for all configured skill sources. Per-source reload is not necessary for the reported problem because duplicate precedence and bundled-skill scanning are catalog-wide concerns.
- Document that reload refreshes the catalog for the UI and future runs; it does not mutate skill material already loaded into currently running agent sessions.

## Scope Classification (`Small`/`Medium`/`Large`)

Medium

## In-Scope Use Cases

- UC-001: User edits `SKILL.md` or supporting files under an already-configured skill source folder and clicks Reload on the Skills page to see updated card metadata such as name, description, file count, added skills, and removed skills.
- UC-002: User opens Skill Sources after reload and sees refreshed skill counts for configured sources.
- UC-003: User reloads after a skill was removed or renamed on disk; the Skills page list updates and any stale selected detail view is cleared by existing page behavior.
- UC-004: User reloads when a source contains malformed skills; valid skills still refresh using existing scan behavior, while invalid entries continue to be warned/skipped by backend discovery.

## Out of Scope

- Automatic filesystem watching or hot reload without user action.
- Per-source reload controls.
- Updating the in-memory prompt/materialized skills of already-running agent sessions.
- Changing skill discovery precedence rules for duplicates.
- Redesigning agent-package reload, skill versioning, file explorer workspaces, or self-evolution flows.
- Adding Git pull/update support for skill source folders; this reload only rescans local filesystem state.

## Functional Requirements

- REQ-SKILL-RELOAD-001: The backend must expose an explicit skill catalog reload command through GraphQL.
- REQ-SKILL-RELOAD-002: The reload command must rescan all currently configured skill sources using the existing skill discovery rules and return the refreshed skill list.
- REQ-SKILL-RELOAD-003: The reload command must return refreshed skill source metadata, including skill counts, using the same source list semantics as the existing `skillSources` query.
- REQ-SKILL-RELOAD-004: The frontend Skills page must provide a visible reload action near existing Skills page actions.
- REQ-SKILL-RELOAD-005: The frontend reload action must update the Pinia skill list and skill-source list state from the reload response without requiring page navigation or application restart.
- REQ-SKILL-RELOAD-006: The frontend reload action must expose loading, success, and error feedback and prevent duplicate concurrent reload submissions.
- REQ-SKILL-RELOAD-007: Existing add/remove skill source behavior must continue to refresh the visible skill list.
- REQ-SKILL-RELOAD-008: Reload must not change disabled-skill state; disabled flags must still be applied to refreshed skill entries by skill name.
- REQ-SKILL-RELOAD-009: Reload must not alter running agent sessions or claim that already-materialized prompts/skill files are updated in active runs.
- REQ-SKILL-RELOAD-010: Localization keys must be added for the new reload UI in English and Chinese catalogs consistent with existing Skills module localization.

## Acceptance Criteria

- AC-SKILL-RELOAD-001: Given a configured source folder containing `alpha/SKILL.md`, when the file description is edited externally and the user clicks Reload, then the `alpha` card displays the new description without app restart.
- AC-SKILL-RELOAD-002: Given a configured source folder, when a new valid skill subdirectory is added externally and the user clicks Reload, then a new skill card appears and the relevant source count increases.
- AC-SKILL-RELOAD-003: Given a configured source folder, when a skill subdirectory is removed externally and the user clicks Reload, then the removed skill card disappears and the relevant source count decreases.
- AC-SKILL-RELOAD-004: Given the user is viewing a skill detail page and a reload removes that skill from the catalog, then the page returns to the list view using the existing selected-skill clearing behavior.
- AC-SKILL-RELOAD-005: Given a skill is disabled before reload, when reload completes and that skill still exists, then the refreshed card still shows the disabled state.
- AC-SKILL-RELOAD-006: Given reload is in progress, the Reload button is disabled and displays a loading label until the operation completes.
- AC-SKILL-RELOAD-007: Given the reload mutation fails, the Skills page shows an error and preserves the previous list state unless a valid response was received.
- AC-SKILL-RELOAD-008: Given reload succeeds, the Skills page shows a short success message and updates both the skills list and cached skill source list.
- AC-SKILL-RELOAD-009: Backend unit or GraphQL coverage proves that `reloadSkillCatalog` returns refreshed skill metadata after files are changed on disk between calls.
- AC-SKILL-RELOAD-010: Frontend store/component coverage proves that the reload action calls the new mutation, updates skill and source state, and renders the reload button loading state.

## Constraints / Dependencies

- Backend is TypeScript with TypeGraphQL resolvers under `autobyteus-server-ts/src/api/graphql/types`.
- Frontend is Nuxt/Vue/Pinia with hand-written GraphQL documents under `autobyteus-web/graphql` and some generated GraphQL artifacts under `autobyteus-web/generated/graphql.ts`.
- Skill source paths are configured through `AUTOBYTEUS_SKILLS_PATHS` and parsed by `AppConfig.getAdditionalSkillsDirs()`.
- Existing discovery functions skip invalid skill directories with warnings; reload should not introduce a new failure policy for malformed individual skills.
- If generated GraphQL artifacts are maintained for this schema change, codegen may require a live updated backend schema.

## Assumptions

- A global reload control is acceptable for the initial feature and better matches duplicate-resolution behavior than per-source reload.
- Current frontend card metadata is the visible stale state the user is reporting; direct file content reads in Skill Detail already use network-only queries and filesystem-backed workspaces.
- Existing `SkillService` scan behavior is authoritative for the Skills page catalog.
- It is acceptable for reload to be a rescan wrapper now, because it creates the correct API boundary for future cache invalidation.

## Risks / Open Questions

- Generated GraphQL artifact update may surface unrelated schema/doc drift if codegen is run against a live backend; downstream implementation should record any generated drift separately.
- If some runtime backends cache configured skills for active runs, this feature intentionally does not refresh them; product copy should avoid implying active-run hot reload.
- The user referenced agent-package reload in server settings; design places skill reload on the Skills page instead of server settings because the problem is catalog/user-list refresh, not server package management.

## Requirement-To-Use-Case Coverage

| Requirement ID | Covered Use Cases |
| --- | --- |
| REQ-SKILL-RELOAD-001 | UC-001, UC-002, UC-003, UC-004 |
| REQ-SKILL-RELOAD-002 | UC-001, UC-003, UC-004 |
| REQ-SKILL-RELOAD-003 | UC-002, UC-003 |
| REQ-SKILL-RELOAD-004 | UC-001 |
| REQ-SKILL-RELOAD-005 | UC-001, UC-002, UC-003 |
| REQ-SKILL-RELOAD-006 | UC-001 |
| REQ-SKILL-RELOAD-007 | UC-001, UC-002 |
| REQ-SKILL-RELOAD-008 | UC-001, UC-003 |
| REQ-SKILL-RELOAD-009 | UC-001, UC-003 |
| REQ-SKILL-RELOAD-010 | UC-001 |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criteria ID | Scenario Intent |
| --- | --- |
| AC-SKILL-RELOAD-001 | Externally edited metadata becomes visible. |
| AC-SKILL-RELOAD-002 | Externally added skills become visible and source count refreshes. |
| AC-SKILL-RELOAD-003 | Externally removed skills disappear and source count refreshes. |
| AC-SKILL-RELOAD-004 | Stale detail selection remains safe after reload. |
| AC-SKILL-RELOAD-005 | Disabled state survives rescan. |
| AC-SKILL-RELOAD-006 | User cannot fire duplicate reloads. |
| AC-SKILL-RELOAD-007 | Failure feedback and state preservation. |
| AC-SKILL-RELOAD-008 | Success feedback and state update. |
| AC-SKILL-RELOAD-009 | Backend executable proof. |
| AC-SKILL-RELOAD-010 | Frontend executable proof. |

## Approval Status

Approved by user on 2026-06-18 after reviewing the proposed user experience and design summary. Requirements are locked as design-ready for architecture review. If the user later requests per-source reload or active-run hot reload, that is a scope expansion.
