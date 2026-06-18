# Investigation Notes

## Investigation Status

- Bootstrap Status: Dedicated task worktree and branch created.
- Current Status: Deep investigation complete; design inputs established.
- Investigation Goal: Determine how file-based skill sources are loaded, cached, displayed, and how agent package reload is implemented, then design a reload capability for skill sources.
- Scope Classification (`Small`/`Medium`/`Large`): Medium
- Scope Classification Rationale: Crosses frontend Skills page, Pinia stores, GraphQL documents, backend TypeGraphQL resolver, and backend `SkillService`, but does not require redesigning discovery, persistence, runtime sessions, or agent-package management.
- Scope Summary: Add an explicit skill catalog reload command and UI action that rescans configured skill source folders and refreshes visible skill cards/source counts without app restart.
- Primary Questions To Resolve:
  - Where are skill sources configured and loaded on the backend? Answered: `SkillService` uses `AppConfig.getSkillsDir()` plus `getAdditionalSkillsDirs()` and package roots in `skill-discovery.ts`.
  - Is there an existing backend reload/rescan method for skills or only startup load? Answered: no explicit reload; current queries already rescan from disk on each call.
  - How does the Skills page fetch and cache list data? Answered: `SkillsList.vue` fetches on mount into Pinia `skillStore.skills`; no explicit user reload.
  - How is agent package reload implemented and surfaced in settings? Answered: TypeGraphQL mutation + backend service cache refresh + Pinia action + row button.
  - What invalidation event or API response should the frontend use after reload? Answered: one reload mutation should return both refreshed skills and skill sources.

## Request Context

User reports that after adding a skill source folder, skill cards are displayed, but updates to skills inside that source folder are not reloadable from the UI. The only current workaround is shutting down and restarting the application. The user references an existing reload capability for agent packages in frontend settings / server settings and asks for analysis.

Reference image: `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_18272212928940f8bd7e7ae7a478018d/solution_designer_63d66b7cf4584f9fb43a504d737154cc/context_files/ctx_f41e359c9b3f__image.png`.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/skill-source-reload`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/skill-source-reload/tickets/in-progress/skill-source-reload`
- Current Branch: `codex/skill-source-reload`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/skill-source-reload`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin --prune` completed successfully on 2026-06-18.
- Task Branch: `codex/skill-source-reload` tracking `origin/personal`
- Expected Base Branch (if known): `personal` / `origin/personal`
- Expected Finalization Target (if known): `personal`
- Bootstrap Blockers: None.
- Notes For Downstream Agents: Main checkout had unrelated untracked docs/article files, so a clean dedicated worktree was created before investigation.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-06-18 | Command | `pwd && git rev-parse --show-toplevel && git status --short --branch && git remote -v && git symbolic-ref refs/remotes/origin/HEAD || true && git branch --show-current && git worktree list` | Bootstrap repository state | Main checkout on `personal`, remote default `origin/personal`, many existing worktrees. | No |
| 2026-06-18 | Command | `git fetch origin --prune` | Refresh tracked remote refs before task branch creation | Fetch succeeded. | No |
| 2026-06-18 | Command | `git worktree add -b codex/skill-source-reload /Users/normy/autobyteus_org/autobyteus-worktrees/skill-source-reload origin/personal` | Create dedicated task worktree/branch | Worktree created at commit `3171a5a4`, branch tracks `origin/personal`. | No |
| 2026-06-18 | Command | `rg -n "skill source|skillSource|SkillSource|reload|agent package|AgentPackage" autobyteus-web autobyteus-server-ts autobyteus-ts` | Locate current skills and analogous reload code paths | Found skill sources GraphQL/store/UI and agent package reload mutation/store/UI. | No |
| 2026-06-18 | Code | `autobyteus-server-ts/src/skills/services/skill-service.ts` | Determine backend skill catalog owner | `listSkills`, `getSkill`, `getSkillSources`, `addSkillSource`, and `removeSkillSource` live here. Service has no explicit reload method. | Add method in design. |
| 2026-06-18 | Code | `autobyteus-server-ts/src/skills/services/skill-discovery.ts` | Determine discovery rules and cache behavior | Discovery reads directories synchronously each call; standalone skill dirs and bundled package skill dirs are both scanned. Invalid skills are warned/skipped by callers. | Reuse, do not duplicate. |
| 2026-06-18 | Code | `autobyteus-server-ts/src/skills/loader.ts` | Check if skill loading is cached | `SkillLoader.loadSkill()` reads `SKILL.md` and counts files from disk each call; no cache found. | No |
| 2026-06-18 | Code | `autobyteus-server-ts/src/api/graphql/types/skills.ts` | Check GraphQL surface | Queries/mutations exist for skills and sources (`skills`, `skillSources`, `addSkillSource`, `removeSkillSource`) but no reload mutation/result type. | Add mutation/result. |
| 2026-06-18 | Code | `autobyteus-web/pages/skills.vue` | Check list/detail selection behavior | Page watches `skills` and clears selected skill if refreshed list no longer contains it. | Reuse for removed skill scenario. |
| 2026-06-18 | Code | `autobyteus-web/components/skills/SkillsList.vue` | Check Skills page actions | Header has Search, Sources, Create Skill; fetches all skills on mount; no reload action. | Add button and feedback. |
| 2026-06-18 | Code | `autobyteus-web/components/skills/SkillSourcesModal.vue` | Check source add/remove refresh flow | Add source calls source store then triggers `skillStore.fetchAllSkills()`; remove source awaits list refresh and shows success. No reload. | Keep behavior; ensure reload can update sources too. |
| 2026-06-18 | Code | `autobyteus-web/stores/skillStore.ts` | Check skill store cache and actions | Uses Apollo `network-only`; stores skills/current skill/loading/error. No reload action. | Add reload action and reloading state. |
| 2026-06-18 | Code | `autobyteus-web/stores/skillSourcesStore.ts` | Check source store cache and actions | Holds source list and loading/error; add/remove update source list from mutation response. | Add direct setter or update from reload response. |
| 2026-06-18 | Code | `autobyteus-web/graphql/skills.ts`, `autobyteus-web/graphql/skillSources.ts` | Check GraphQL documents | Skill and skill-source documents are handwritten. No reload document. | Add reload document. |
| 2026-06-18 | Code | `autobyteus-server-ts/src/agent-packages/services/agent-package-service.ts` | Compare agent package reload semantics | `reloadAgentPackage` validates local package, refreshes agent/team definition caches, returns package list. | Mirror command-boundary pattern, not exact cache behavior. |
| 2026-06-18 | Code | `autobyteus-server-ts/src/api/graphql/types/agent-packages.ts` | Compare GraphQL mutation pattern | TypeGraphQL mutation returns mapped package list. | Use TypeGraphQL mutation with mapped reload result. |
| 2026-06-18 | Code | `autobyteus-web/stores/agentPackagesStore.ts` | Compare frontend store reload pattern | Store mutation sets row action loading and refreshes dependent catalogs. | Use separate reload loading state for skill reload. |
| 2026-06-18 | Code | `autobyteus-web/components/settings/AgentPackagesManager.vue` | Compare UI reload pattern | Local path packages show Reload button with loading label and success message. | Add analogous Skills page button. |
| 2026-06-18 | Code | `autobyteus-server-ts/src/config/app-config.ts`, `autobyteus-server-ts/src/config/config-value-parsers.ts`, `autobyteus-server-ts/src/services/server-settings-service.ts` | Understand source path setting updates | `AUTOBYTEUS_SKILLS_PATHS` is read dynamically from process/config data; `ServerSettingsService.updateSetting` updates config and process env. | No restart needed for configured path changes; reload should rescan current config. |
| 2026-06-18 | Doc | `autobyteus-web/docs/skills.md` | Understand product semantics and runtime constraints | Skills page lists global and bundled package skills; active self-evolution messages are not runtime/model skill-refresh instructions; next-run correctness baseline. | Document reload not active-run hot reload. |
| 2026-06-18 | Code | `autobyteus-server-ts/tests/unit/skills/services/skill-sources-management.test.ts`, `autobyteus-server-ts/tests/unit/skills/services/skill-service.test.ts`, `autobyteus-server-ts/tests/e2e/skills/skills-graphql.e2e.test.ts` | Locate backend coverage seams | Existing tests cover source add/remove/listing and GraphQL skills CRUD; no reload coverage. | Extend tests. |
| 2026-06-18 | Code | `autobyteus-web/components/skills/SkillSourcesModal.spec.ts`, `autobyteus-web/stores/__tests__/skillStore.spec.ts`, `autobyteus-web/pages/__tests__/skills.spec.ts` | Locate frontend coverage seams | Existing tests cover source remove refresh, stale detail clearing, and skill fetch behavior. | Add store/component reload coverage. |
| 2026-06-18 | Command | `cat autobyteus-web/package.json | jq '.scripts' && cat autobyteus-server-ts/package.json | jq '.scripts'` | Identify likely validation commands | Frontend uses `pnpm test:nuxt`; backend uses `pnpm test`, `pnpm typecheck`; codegen script exists. | Downstream should run targeted tests. |
| 2026-06-18 | Command | `rg -n "generated/graphql" autobyteus-web --glob '!generated/graphql.ts'` | Check generated GraphQL artifact usage | Generated file is used by some stores, but skills stores use handwritten documents/types. Codegen is documented as best practice. | Regenerate if feasible; record drift. |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary: `/skills` page (`autobyteus-web/pages/skills.vue`) renders `SkillsList.vue` when no skill is selected.
- Current execution flow:
  - `SkillsList.vue` mounts and calls `skillStore.fetchAllSkills()`.
  - `skillStore.fetchAllSkills()` executes `GET_SKILLS` with `fetchPolicy: 'network-only'`.
  - GraphQL `SkillResolver.skills()` calls `SkillService.getInstance().listSkills()` and maps each `Skill` with versioning metadata.
  - `SkillService.listSkills()` scans `getAllSkillDirectories(config)` first, then bundled skills from `getAllDefinitionRoots(config)`, deduplicating by skill name and applying disabled state.
  - `SkillLoader.loadSkill()` reads `SKILL.md` and counts files from disk every call.
- Skill source management flow:
  - `SkillSourcesModal.vue` mounts and calls `skillSourcesStore.fetchSkillSources()`.
  - `skillSourcesStore` queries `skillSources`, which maps `SkillService.getSkillSources()`.
  - `addSkillSource` / `removeSkillSource` mutate `AUTOBYTEUS_SKILLS_PATHS` via server settings and return source list; modal then triggers `skillStore.fetchAllSkills()`.
- Agent package reload comparison:
  - `AgentPackagesManager.vue` has row-level reload for local packages.
  - `agentPackagesStore.reloadAgentPackage()` calls GraphQL `reloadAgentPackage`, updates package list, then refreshes dependent application/agent/team stores.
  - Backend `AgentPackageService.reloadAgentPackage()` validates package and refreshes agent/team definition caches.
- Ownership or boundary observations:
  - `SkillService` is the correct backend owner for skill catalog scanning and source metadata.
  - `SkillResolver` is the correct GraphQL transport boundary.
  - `skillStore` owns visible skill list state; `skillSourcesStore` owns cached source metadata.
  - `SkillsList.vue` owns list-page user actions; `SkillSourcesModal.vue` owns add/remove source management.
- Current behavior summary: The system can fetch fresh data if code calls existing queries, but no explicit user-facing reload command exists. Users on the Skills page keep stale Pinia list state until remount, source add/remove, or app restart.

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Feature / behavior gap
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue
- Refactor posture evidence summary: No broad refactor needed. Existing backend and frontend owners are coherent; the missing piece is an explicit reload command/interface and UI action.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| `SkillService` + `skill-discovery.ts` | Skill list and source count are computed by one service/discovery path. | Existing backend owner can absorb reload. | Add method, no new service. |
| `SkillLoader` | Reads from disk each load; no cache. | Reload can be a rescan wrapper now. | Avoid fake cache invalidation. |
| `SkillsList.vue` | Fetches once on mount; no reload control. | Product gap is frontend action plus API command boundary. | Add UI. |
| Agent package reload flow | Explicit mutation/action pattern exists for external local folder changes. | Skill reload should follow command-boundary pattern for consistency. | Add GraphQL mutation. |
| `pages/skills.vue` | Already clears stale selected skill after list change. | Removed skill scenario mostly handled. | Ensure reload updates `skills`. |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-server-ts/src/skills/services/skill-service.ts` | Skill catalog/service owner | Lists skills/sources, adds/removes sources, applies disabled state. | Add `reloadSkillCatalog()` here. |
| `autobyteus-server-ts/src/skills/services/skill-discovery.ts` | Filesystem discovery functions | Owns standalone and bundled skill scan rules. | Reuse unchanged. |
| `autobyteus-server-ts/src/skills/loader.ts` | SKILL.md parse and file count | Reads disk each load. | No cache refactor. |
| `autobyteus-server-ts/src/api/graphql/types/skills.ts` | Skill GraphQL resolver and types | No reload mutation/result. | Add `SkillCatalogReloadResult` and mutation. |
| `autobyteus-web/graphql/skills.ts` / `skillSources.ts` | Handwritten frontend GraphQL docs | No reload document. | Add `RELOAD_SKILL_CATALOG` document. |
| `autobyteus-web/stores/skillStore.ts` | Pinia skill list/current skill owner | No reload action or separate reload state. | Add reload action and `reloading` state; update sources store from response. |
| `autobyteus-web/stores/skillSourcesStore.ts` | Pinia source list owner | No setter except fetch/add/remove responses. | Add `setSkillSources` or `replaceSkillSources`. |
| `autobyteus-web/components/skills/SkillsList.vue` | Skills list UI and actions | Header lacks reload action. | Add button, loading label, success message. |
| `autobyteus-web/components/skills/SkillSourcesModal.vue` | Source management modal | Add/remove already refresh skill list. | Existing behavior must stay. Optional modal need not own reload. |
| `autobyteus-web/localization/messages/*/skills.ts` | Manual i18n keys | New reload labels/messages needed. | Add EN and zh-CN keys. |
| `autobyteus-web/generated/graphql.ts` | Generated GraphQL types/docs | May need regeneration if project expects codegen after schema/doc changes. | Downstream implementation should regenerate if feasible and record drift. |
| `autobyteus-web/docs/skills.md` | Frontend Skills module docs | Mentions Skills module behavior and runtime skill-refresh limitation. | Update docs for manual reload and active-run limitation if delivery stage deems docs impacted. |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-06-18 | Code trace | Static trace from `SkillsList.vue` -> `skillStore.fetchAllSkills()` -> `SkillResolver.skills()` -> `SkillService.listSkills()` -> `SkillLoader.loadSkill()` | Existing query path would read changed files if invoked, but UI has no user reload invocation. | Implement explicit reload UI/API. |

## External / Public Source Findings

- Public API / spec / issue / upstream source: None used.
- Version / tag / commit / freshness: N/A.
- Relevant contract, behavior, or constraint learned: N/A.
- Why it matters: N/A.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: No live reproduction required for design; static code trace was enough to establish missing action. Downstream tests can use temp skill directories.
- Required config, feature flags, env vars, or accounts: Existing `AUTOBYTEUS_SKILLS_PATHS` config path behavior.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: Dedicated worktree creation only.
- Cleanup notes for temporary investigation-only setup: None.

## Findings From Code / Docs / Data / Logs

1. Backend skill catalog listing is not startup-only. Calls to `skills` query rescan the filesystem; the observed stale state is caused by frontend state not being refreshed by user action.
2. Because reload is a product command, adding only a frontend `fetchAllSkills()` button would work today but would leave no backend semantic reload boundary for future caches and would not return source counts in one operation.
3. Existing add/remove source already refreshes list; the missing flow is external edits after source registration.
4. Agent package reload precedent supports explicit command naming and user feedback. Exact backend cache semantics differ: agent packages refresh agent/team definition caches; skills currently just rescan.
5. Active agent runs should not be included in scope; current docs around self-evolution explicitly state next-run correctness as the MVP baseline for helper-authored skill changes.

## Constraints / Dependencies / Compatibility Facts

- No backward compatibility concern: this is additive UI/API behavior.
- Disabled skill persistence is name-based via `DisabledSkillsStore`; refreshed list entries need existing `isDisabled` application.
- Duplicate skill name precedence is first standalone source order then bundled definition roots; reload must not change that rule.
- `AppConfig.getAdditionalSkillsDirs()` filters missing paths, so missing source folders may disappear from source metadata rather than causing reload to fail.
- Frontend uses localization audits; new user-facing strings should be localized rather than hard-coded when in Skills components.

## Open Unknowns / Risks

- Codegen may be nontrivial if it needs a running backend; implementation should document whether generated GraphQL was regenerated or intentionally unchanged because affected stores use handwritten documents.
- If future code introduces a real skill catalog cache, the reload method must become the only place callers expect cache invalidation; direct UI fetches should not grow separate invalidation logic.
- User may later ask for per-source reload or active-run hot reload; both are intentionally outside this scope.

## Notes For Architect Reviewer

- The design should reject a frontend-only reload button even though it would solve the immediate stale list, because the user explicitly compared to agent-package reload and the system benefits from an authoritative reload command boundary.
- The design should also reject a new standalone `SkillSourceReloadService`; `SkillService` is already the governing owner for source/list discovery.
- No current evidence supports a broad refactor of skill discovery, path configuration, or runtime materialization.
