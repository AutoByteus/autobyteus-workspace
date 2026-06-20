# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete
- Current Status: Investigation complete; requirements refined to Design-ready; design spec produced separately.
- Investigation Goal: Locate the provided tool catalog/registration/handlers and determine the safe design to remove internal tool-management tools and built-in skill versioning while preserving `get_available_skills`, `get_skill_content`, and migrated server-owned `load_skill`.
- Scope Classification (`Small`/`Medium`/`Large`): Medium
- Scope Classification Rationale: The cleanup crosses backend startup tool registration, agent tool implementations/tests, skill service/GraphQL schema, frontend GraphQL documents/stores/types/UI/localization/docs, and generated GraphQL artifacts.
- Scope Summary: Remove local agent `Tool Management` tools, migrate legacy core `load_skill` into the server Skills tool group, remove `create_skill_version`, remove the built-in skill-versioning backend/API/UI flow, preserve normal tool catalog/MCP management and normal skill catalog/file operations.
- Primary Questions Resolved:
  - Where are the provided tools registered and exposed? `autobyteus-server-ts/src/startup/agent-tool-loader.ts` loads first-party groups; `register-tool-management-tools.ts` and `register-skills-tools.ts` register the in-scope local tools into `defaultToolRegistry`.
  - Does the frontend display a static catalog or render backend-provided definitions? The frontend `/tools` page loads GraphQL `toolsGroupedByCategory(origin: LOCAL)` through `toolManagementStore`; the visible cards are backend registry-driven.
  - What backend implementation exists for skill versioning and skill tools? `SkillVersioningService`, `SkillVersion` domain model, `SkillService` versioning integration, GraphQL skill version fields/queries/mutations, the legacy/core `load_skill` tool that should migrate to server Skills, and the `create_skill_version` agent tool.
  - Which tests/docs/generated clients reference removed tools? Backend unit/integration/e2e tests, frontend Skill Detail/store tests, GraphQL documents/generated types, localization messages, and docs reference versioning; tool-management agent tools have direct tests and an existing catalog-cleanup e2e test can be extended.

## Request Context

User requested to simplify provided tools by removing unused internal tool-management tools and removing the `create_skill_version` tool. The user explicitly wants built-in skill versioning removed because skills are often tracked by GitHub repositories instead of by AutoByteus. In a follow-up on 2026-06-20, the user explicitly confirmed: "remove the versioning of skill functionality as well" and provided a Skill Detail screenshot showing the visible `Not versioned` badge and `Enable Versioning` button that should disappear.

The user later asked why `load_skill` appears under `General` while the other skill tools appear under `Skills`. Code inspection confirmed `load_skill` is a legacy/core `autobyteus-ts` tool categorized as `ToolCategory.GENERAL`. The user then clarified that `load_skill` and `get_skill_content` are different tools and requested: migrate `load_skill` into the server project, still as `load_skill`, rather than folding it into `get_skill_content`.

Reference screenshots:
- `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_a1ae649f9fa7421eafa3af0bfe2bdec3/solution_designer_e43f961166c4491bbc7231b964ff6030/context_files/ctx_e39e1790d3fb__image.png`
- `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_a1ae649f9fa7421eafa3af0bfe2bdec3/solution_designer_e43f961166c4491bbc7231b964ff6030/context_files/ctx_d6a91706bc88__image.png`
- `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_a1ae649f9fa7421eafa3af0bfe2bdec3/solution_designer_e43f961166c4491bbc7231b964ff6030/context_files/ctx_aeac41bb7a50__image.png`

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/simplify-provided-tools`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/simplify-provided-tools/tickets/simplify-provided-tools`
- Current Branch: `codex/simplify-provided-tools`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/simplify-provided-tools`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin --prune` succeeded on 2026-06-20.
- Task Branch: `codex/simplify-provided-tools`, created from `origin/personal`.
- Expected Base Branch (if known): `origin/personal`
- Expected Finalization Target (if known): `personal`
- Bootstrap Blockers: None
- Notes For Downstream Agents: The original user checkout at `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` had unrelated untracked `.article-work/` and `docs/articles/`; the dedicated worktree avoids touching them. The dedicated worktree has no `node_modules` installed.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-06-20 | Command | `pwd && git rev-parse --show-toplevel && git status --short --branch && git remote -v && git symbolic-ref refs/remotes/origin/HEAD` | Bootstrap repo context | Original checkout is on `personal` tracking `origin/personal`; remote default is `origin/personal`; unrelated untracked files present. | No |
| 2026-06-20 | Command | `git worktree list --porcelain && git fetch origin --prune` | Confirm reusable worktrees and refresh remote refs | No existing `codex/simplify-provided-tools` worktree; fetch succeeded. | No |
| 2026-06-20 | Command | `git worktree add -b codex/simplify-provided-tools /Users/normy/autobyteus_org/autobyteus-worktrees/simplify-provided-tools origin/personal` | Create mandatory dedicated task worktree | Worktree and branch created from latest tracked base. | No |
| 2026-06-20 | Other | User-provided screenshots | Understand current visible tool cards | Current cards include five `Tool Management` tools, one `Skill Management` versioning tool, and two retained `Skills` tools. | No |
| 2026-06-20 | Other | User follow-up: "remove the versioning of skill functionality as well" plus Skill Detail screenshot `ctx_aeac41bb7a50__image.png` | Confirm whether full skill-versioning removal is in scope | User explicitly confirmed full skill-versioning removal; screenshot shows `Not versioned` badge and `Enable Versioning` button in Skill Detail UI. | No |
| 2026-06-20 | Command | `rg -n "list_available_tools|list_input_processors|list_lifecycle_processors|list_llm_response_processors|list_tool_result_processors|create_skill_version|get_available_skills|get_skill_content" -S .` | Find in-scope tool definitions and references | Active source definitions are under `autobyteus-server-ts/src/agent-tools/tool-management` and `autobyteus-server-ts/src/agent-tools/skills`; historical ticket logs also contain old registration output. | Exclude historical ticket artifacts from cleanup search assertions. |
| 2026-06-20 | Code | `autobyteus-server-ts/src/agent-tools/skills/register-skills-tools.ts` | Determine retained/removed skill tool registration | Registers `get_available_skills`, `get_skill_content`, and `create_skill_version`; target is to keep the first two, remove `create_skill_version`, and add migrated `load_skill`. | Modify |
| 2026-06-20 | Code | `autobyteus-server-ts/src/agent-tools/skills/create-skill-version.ts` | Inspect removed skill tool implementation | Uses `SkillService.getSkill()` and `SkillVersioningService` to tag a skill Git repository; category is `Skill Management`. | Remove |
| 2026-06-20 | Code | `autobyteus-server-ts/src/agent-tools/skills/get-available-skills.ts` and `get-skill-content.ts` | Verify retained behavior | `get_available_skills` returns skill name/description JSON; `get_skill_content` returns SKILL.md content and file tree. Both category `Skills`. | Preserve tests |
| 2026-06-20 | Code | `autobyteus-server-ts/src/agent-tools/tool-management/*.ts` | Inspect internal tool-management agent tools | Five local tools introspect registry/input/lifecycle/LLM/tool-result processors; category is `Tool Management`. | Remove directory and tests |
| 2026-06-20 | Code | `autobyteus-server-ts/src/startup/agent-tool-loader.ts` | Locate startup registration path | `loaderSpecs` includes `Tool Management Tools` then `Skills Tools` and other first-party groups. | Remove tool-management loader entry; keep skills loader with simplified registration |
| 2026-06-20 | Code | `autobyteus-server-ts/src/api/graphql/types/tool-management.ts` and `src/api/graphql/schema.ts` | Distinguish product tool-management API from removed agent tools | GraphQL `ToolManagementResolver` backs `/tools` browsing/MCP management via `defaultToolRegistry`; it should remain. | Preserve |
| 2026-06-20 | Code | `autobyteus-web/stores/toolManagementStore.ts`, `components/tools/ToolsManagementWorkspace.vue`, `ToolList.vue`, `ToolCard.vue`, `graphql/queries/toolQueries.ts` | Determine frontend tool catalog source | Frontend local tool cards are loaded from GraphQL `toolsGroupedByCategory(origin: LOCAL)`; not static. | No UI filtering; backend registry removal should drive catalog |
| 2026-06-20 | Code | `autobyteus-server-ts/src/skills/services/skill-service.ts` | Inspect skill service versioning integration | `SkillService` depends on `SkillVersioningService`, auto-initializes versioning in `createSkill()`, and exposes `enableSkillVersioning()`. | Remove versioning dependency/method/auto-init |
| 2026-06-20 | Code | `autobyteus-server-ts/src/skills/services/skill-versioning-service.ts` and `src/skills/domain/skill-version.ts` | Inspect removable backend versioning owner | Service shells out to Git for init/commit/tag/list/diff/reset; domain model only serves this flow. | Remove |
| 2026-06-20 | Code | `autobyteus-server-ts/src/api/graphql/types/skills.ts` | Inspect skill GraphQL schema | `Skill` exposes `isVersioned`/`activeVersion`; resolver exposes `SkillVersion`, `SkillDiff`, `skillVersions`, `skillVersionDiff`, `enableSkillVersioning`, `activateSkillVersion`. | Remove versioning types/fields/operations; keep normal CRUD/file/source operations |
| 2026-06-20 | Code | `autobyteus-web/graphql/skills.ts`, `graphql/skillSources.ts`, `stores/skillStore.ts`, `types/skill.ts` | Inspect frontend skill data layer | GraphQL documents include version fields/ops; store exposes fetch/enable/activate versioning actions; local type includes version fields/types. | Remove versioning fields/ops/types/actions |
| 2026-06-20 | Code | `autobyteus-web/components/skills/SkillDetail.vue`, `SkillVersioningPanel.vue`, `SkillVersionCompareModal.vue` | Inspect frontend skill UI | Skill Detail loads versions and renders versioning panel/compare modal. | Remove panel/modal/imports/state/actions; keep file workspace |
| 2026-06-20 | Code | `autobyteus-web/generated/graphql.ts` and `autobyteus-web/codegen.ts` | Confirm generated client impact | Generated types include removed fields/ops; codegen consumes a backend schema URL and `graphql/**/*.ts` documents. | Regenerate or update generated artifact |
| 2026-06-20 | Command | `find . -path './tickets/done' -prune ... rg ...` | Find active-source references excluding historical done tickets | Active references exist in backend source/tests/docs and frontend source/tests/docs/localization/generated GraphQL. Unrelated `activeVersion` exists in managed messaging gateway and must remain. | Cleanup search must scope to skill/tool symbols, not all `activeVersion` |
| 2026-06-20 | Doc | `autobyteus-server-ts/docs/modules/agent_tools.md`, `skills.md`, `skill_versioning.md`, `search.md`; `autobyteus-web/docs/skills.md`, `tools_and_mcp.md` | Locate durable docs impact | Backend skill docs mention CRUD/version workflows; `skill_versioning.md` exists solely for versioning; frontend skills docs mention versioning panel/actions; tools docs describe browsing and MCP management and should largely remain. | Update/remove docs downstream |
| 2026-06-20 | Code | `autobyteus-ts/src/tools/skill/load-skill.ts`, `autobyteus-ts/src/tools/register-tools.ts`, `autobyteus-ts/src/agent/system-prompt-processor/available-skills-processor.ts` | Check why `load_skill` appears under `General` | `registerLoadSkillTool()` registers `load_skill` with `category: ToolCategory.GENERAL`; `registerTools()` calls it; `AvailableSkillsProcessor` still emits prompt guidance telling models to use `load_skill` in global discovery mode. This is a legacy/core skill-loading tool separate from server-owned `get_available_skills` and `get_skill_content`. | Migrate tool into server Skills group; remove legacy core registration/implementation/tests after server replacement exists; preserve internal non-tool skill loaders. |
| 2026-06-20 | Code search | `rg -n "\bload_skill\b|registerLoadSkillTool" --glob "!tickets/**" --glob "!**/node_modules/**" --glob "!**/dist/**" --glob "!**/build/**" .`; scoped search in `autobyteus-agent-configs`, `autobyteus-server-ts`, `autobyteus-ts`, `autobyteus-web` | Determine whether `load_skill` is actively used | Active references are registration/source, prompt guidance, direct load-skill tests, prompt tests, and docs. No direct checked agent configuration, product UI dependency, or server-owned skill group dependency was found. `AgentFactory` calls `registerTools()`, making the tool generally available when core tools are registered, so practical use is possible only through generic model/tool-call exposure rather than known first-party application code. | Treat as exposed legacy surface with low known direct dependency but useful semantics; migrate to server Skills with the same name and remove core duplicate. |
| 2026-06-20 | Code | `autobyteus-ts/src/tools/skill/load-skill.ts`, `autobyteus-ts/src/skills/format-skill-content-for-prompt.ts`, `autobyteus-server-ts/src/agent-tools/skills/get-skill-content.ts`, `autobyteus-server-ts/src/agent-tools/skills/get-available-skills.ts` | Compare `load_skill` utility against retained server tools | `load_skill` has useful output/policy semantics: skill base path, path-resolution guidance, Markdown-link rewriting through `formatSkillContentForPrompt`, and skill-access-mode checks. Server `get_skill_content` covers the inspection/content retrieval and file-tree use case, while `load_skill` covers runtime/use loading. `load_skill` also accepts arbitrary paths and can register a skill from a supplied path, which bypasses the server Skills capability boundary. | Migrate `load_skill` itself into server Skills as a distinct tool; preserve useful runtime/use semantics; do not preserve unmanaged arbitrary path-loading behavior. |
| 2026-06-20 | Test | `autobyteus-server-ts/tests/e2e/tool-management/tool-catalog-cleanup.e2e.test.ts` | Find existing catalog cleanup coverage | Existing e2e asserts removed MCP wrapper tools are absent from LOCAL catalog; can be extended for the new removed tool names/category. | Update |
| 2026-06-20 | Test | `autobyteus-server-ts/tests/unit/agent-tools/tool-management/*.test.ts` and `tests/unit/agent-tools/skills/create-skill-version.test.ts` | Find direct removed-tool tests | Direct tests import removed implementations and should be deleted. | Remove |
| 2026-06-20 | Test | `autobyteus-server-ts/tests/unit/skills/services/skill-service.test.ts`, `tests/integration/skills/skill-versioning-integration.test.ts`, `tests/unit/skills/services/skill-versioning-service.test.ts`, `tests/e2e/skills/skills-graphql.e2e.test.ts` | Find backend skill versioning coverage | Tests assert auto version init, enable versioning, Git tag/diff/activate, and Git availability. These become obsolete or need assertions inverted for no versioning. | Update/remove |
| 2026-06-20 | Test | `autobyteus-web/components/skills/*.spec.ts`, `stores/__tests__/skillStore.spec.ts`, `pages/__tests__/skills.spec.ts` | Find frontend test impact | Skill fixtures include `isVersioned`/`activeVersion`; SkillDetail specs stub versioning components/actions. | Update/remove versioning fixtures/stubs/specs |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary:
  - Backend first-party local tool registration begins at `loadAllAgentTools()` in `autobyteus-server-ts/src/startup/agent-tool-loader.ts`, scheduled by `startup/background-runner.ts`.
  - Product tool browsing begins at frontend `ToolsManagementWorkspace.vue`, which calls `toolManagementStore.fetchLocalToolsGroupedByCategory()` and GraphQL `toolsGroupedByCategory(origin: LOCAL)`.
  - Skill browsing begins at frontend `SkillsList.vue` / `SkillDetail.vue`, through `skillStore` and GraphQL `SkillResolver`.
- Current execution flow:
  - Tool catalog: `loadAllAgentTools()` and core `registerTools()` -> `registerToolManagementTools()` / `registerSkillsTools()` / `registerLoadSkillTool()` -> `defaultToolRegistry` -> GraphQL `ToolManagementResolver.toolsGroupedByCategory()` -> frontend tool cards.
  - Runtime tool execution: `AgentDefinition.toolNames` -> runtime resolver/materializer -> `defaultToolRegistry.createTool(name)` or Agent Tools MCP adapter -> provider/runtime tool surface.
  - Skill versioning: `SkillService.createSkill()` -> `SkillVersioningService.initializeVersioning()` -> Git init/commit/tag; `SkillResolver` maps version metadata and exposes version operations; frontend Skill Detail loads versions and renders activation/compare controls.
- Ownership or boundary observations:
  - Agent-facing `Tool Management` tools expose internal registry/processor diagnostics as selectable/runtime tools, while the product-owned tool catalog GraphQL resolver already owns user-visible tool browsing.
  - `load_skill` is a useful skill-use tool but currently lives at the wrong boundary (`autobyteus-ts` core/General) while server-owned skill tools live under `autobyteus-server-ts/src/agent-tools/skills`.
  - Skill versioning is embedded in normal SkillService CRUD and UI, creating a second skill lifecycle authority beyond filesystem/Git repository ownership. User preference is to let the actual skill repository own versioning.
- Current behavior summary: The visible local tool catalog and potential agent tool selection surface include internal diagnostic tools and an unused built-in skill Git tag workflow. Frontend display is registry-driven, so backend removal is the authoritative way to simplify it.

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Cleanup / Behavior Change
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue
- Refactor posture evidence summary: Refactor/removal needed now. A UI-only hide would leave registry/runtime/API paths authoritative and callable. Clean removal must update startup registration, file responsibilities, schema/documents, and tests.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| `agent-tool-loader.ts` | Tool-management and skills tool groups register into the same default registry that drives runtime and catalog surfaces. | The registry is the authoritative boundary; remove definitions at registration/source, not frontend filtering. | Modify startup specs and skills registration. |
| `tool-management/*.ts` | Tool-management agent tools only introspect internal registries/processors. | They are internal diagnostics exposed on the model/user-facing tool surface. | Remove tool group files/tests. |
| `SkillService` + `SkillVersioningService` | Skill creation and version operations own per-skill Git lifecycle. | SkillService owns both catalog/file CRUD and Git versioning; user wants repository-based version ownership outside backend. | Remove versioning dependency and API. |
| `SkillResolver` + frontend skill docs/components | Skill versioning propagates through GraphQL and UI. | Full backend removal requires schema and frontend cleanup, not only removing the agent tool. | Update frontend GraphQL/store/UI/generated/docs. |
| `ToolManagementResolver` + frontend `/tools` | Product tool catalog/MCP management uses GraphQL resolver and should remain. | Avoid over-removing the management page/API; only remove agent tool-management capabilities. | Preserve resolver; extend absence tests. |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-server-ts/src/startup/agent-tool-loader.ts` | Loads first-party local tool groups. | Contains `Tool Management Tools` loader entry. | Remove only this loader entry; keep other groups. |
| `autobyteus-server-ts/src/agent-tools/tool-management/` | Agent tools that list tools/processors. | Entire folder maps to screenshot `Tool Management` category. | Delete folder and direct tests. |
| `autobyteus-server-ts/src/agent-tools/skills/register-skills-tools.ts` | Registers skill local agent tools. | Registers retained tools plus removed `create_skill_version`. | Remove import/call for create version; add migrated load-skill registration. |
| `autobyteus-server-ts/src/agent-tools/skills/create-skill-version.ts` | Agent tool wrapper for skill Git tag creation. | Only serves removed skill-versioning tool. | Delete. |
| `autobyteus-server-ts/src/agent-tools/skills/get-available-skills.ts` | Retained skill list tool. | Behavior aligns with user request. | Preserve. |
| `autobyteus-server-ts/src/agent-tools/skills/get-skill-content.ts` | Retained skill content/tree inspection tool. | Semantically distinct from runtime/use `load_skill`. | Preserve without folding `load_skill` into it. |
| `autobyteus-server-ts/src/agent-tools/skills/load-skill.ts` | Migrated runtime/use skill-loading tool. | Does not exist yet. | Add as server-owned `load_skill` under category `Skills`. |
| `autobyteus-ts/src/tools/skill/load-skill.ts` | Legacy/core skill-loading tool. | Registered under `General`, causing the screenshot mismatch; useful but belongs in server Skills. | Migrate into server Skills as distinct `load_skill`, then remove core implementation. |
| `autobyteus-ts/src/agent/system-prompt-processor/available-skills-processor.ts` | Injects skill catalog/guidance into prompts. | Mentions `load_skill` in global discovery mode. | Keep/rewrite guidance only if it accurately refers to migrated server-owned `load_skill` availability. |
| `autobyteus-server-ts/src/skills/services/skill-service.ts` | Skill catalog/CRUD/file/source service. | Injects versioning service; auto-inits versioning on create; exposes `enableSkillVersioning`. | Remove versioning from service; skill creation becomes file-only. |
| `autobyteus-server-ts/src/skills/services/skill-versioning-service.ts` | Built-in Git versioning owner. | No remaining desired owner after this scope. | Delete. |
| `autobyteus-server-ts/src/skills/domain/skill-version.ts` | Version DTO. | Only used by versioning service/API/tests. | Delete. |
| `autobyteus-server-ts/src/api/graphql/types/skills.ts` | GraphQL skill resolver/schema. | Contains version metadata, types, queries, mutations. | Remove versioning fields/ops; preserve normal skill APIs. |
| `autobyteus-server-ts/src/api/graphql/types/tool-management.ts` | Product GraphQL tool browsing/schema reload. | Separate from removed agent tool-management group. | Preserve. |
| `autobyteus-web/graphql/skills.ts`, `graphql/skillSources.ts` | Frontend skill GraphQL documents. | Include version fields/ops. | Remove version fields/ops. |
| `autobyteus-web/stores/skillStore.ts` | Frontend skill state/actions. | Owns versioning actions/state metadata updates. | Remove versioning actions and related imports. |
| `autobyteus-web/components/skills/SkillDetail.vue` | Skill detail file workspace. | Imports/renders versioning panel and compare modal. | Remove versioning UI; keep compact header + file workspace. |
| `autobyteus-web/components/skills/SkillVersioningPanel.vue` | Versioning controls. | Obsolete. | Delete. |
| `autobyteus-web/components/skills/SkillVersionCompareModal.vue` | Version diff UI. | Obsolete. | Delete. |
| `autobyteus-web/types/skill.ts` | Frontend skill types. | Includes `isVersioned`, `activeVersion`, `SkillVersion`, `SkillDiff`. | Remove versioning types/fields. |
| `autobyteus-web/generated/graphql.ts` | Checked-in generated GraphQL types/composables. | Includes removed schema/doc operations. | Regenerate/update. |
| `autobyteus-web/localization/messages/*/skills*.ts` | Skill UI translations. | Contains versioning keys. | Remove obsolete keys, respecting generated/static localization workflow. |
| `autobyteus-server-ts/docs/modules/skill_versioning.md` | Backend doc for versioning. | Entire doc becomes obsolete. | Delete or replace with note in skills docs; downstream delivery to sync docs. |
| `autobyteus-web/docs/skills.md` | Frontend skills docs. | Describes versioning UI/data actions. | Update. |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-06-20 | Setup | `test -d node_modules ...` in root/server/web | Dedicated worktree has no `node_modules` installed. | Investigation did not execute TypeScript tests; downstream implementation should install/use workspace deps as needed before validation. |
| 2026-06-20 | Static Trace | Source read of startup -> registry -> GraphQL -> frontend store | Visible tool cards are backend registry-driven. | No need for browser reproduction to decide architecture; tests should verify backend catalog absence. |

## External / Public Source Findings

- Public API / spec / issue / upstream source: None used.
- Version / tag / commit / freshness: N/A.
- Relevant contract, behavior, or constraint learned: N/A.
- Why it matters: This is internal product behavior; local code is authoritative.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: No live service was required for investigation; implementation validation should use backend unit/e2e and frontend unit/typecheck/build checks.
- Required config, feature flags, env vars, or accounts: None for investigation.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: Dedicated worktree creation above.
- Cleanup notes for temporary investigation-only setup: None.

## Findings From Code / Docs / Data / Logs

1. The screenshot cards are consistent with actual registry category names in code (`Tool Management`, `Skill Management`, `Skills`), and the later `load_skill` screenshot is explained by `autobyteus-ts/src/tools/skill/load-skill.ts` explicitly registering `category: ToolCategory.GENERAL`.
2. `load_skill` is not part of the server-owned `Skills` tool group today; it is a legacy/core `autobyteus-ts` tool registered by `registerTools()`. This is a boundary/refactor smell from a pre-server or not-yet-migrated core tool path.
3. `load_skill` and `get_skill_content` are semantically different: `load_skill` is runtime/use-oriented skill activation context, while `get_skill_content` is inspection/content plus file tree. The correct refactor is to migrate `load_skill` into the server `Skills` tool group as a distinct tool, then remove the legacy core registration and implementation.
4. Removing `Tool Management` must target `autobyteus-server-ts/src/agent-tools/tool-management` and its loader entry. Deleting GraphQL `ToolManagementResolver` would break the product `/tools` page and MCP management, and is not part of the request.
5. Removing only `create_skill_version` is mechanically simple but incomplete relative to the user's backend-versioning concern. Built-in versioning is coupled into `SkillService.createSkill()` and the Skills GraphQL/UI flow.
6. `SkillLoader.countFiles()` already ignores `.git`, so existing `.git` folders can remain on disk without affecting file count. Removal should not delete user data.
7. Active-source searches also find unrelated `activeVersion` fields under managed messaging gateway; those must not be removed.
8. Existing backend tests are strongly versioning-aware because `createSkill()` currently initializes Git. Those tests need inverted expectations: created skills should not require Git and should not produce `.git`.
9. Historical `tickets/done/**` logs contain old tool registration names and should not be treated as active code leftovers.

## Constraints / Dependencies / Compatibility Facts

- No compatibility retention requested for removed tool-management tools or versioning APIs.
- Preserve `get_available_skills` and `get_skill_content`.
- Preserve `load_skill` as a distinct useful skill-use tool by migrating it to the server Skills tool group; remove only the legacy core/General implementation and registration.
- Do not fold `load_skill` into `get_skill_content`.
- Preserve the product tool catalog/MCP management resolver and UI.
- Preserve normal skill CRUD, source reload, file tree/content, disable/enable, and skill workspace behavior.
- Do not delete existing skill Git metadata from disk; stop backend management only.
- Generated GraphQL types in `autobyteus-web/generated/graphql.ts` must match changed backend schema/documents before handoff.

## Open Unknowns / Risks

- The user explicitly confirmed full skill-versioning removal after the initial investigation, so the broader scope is no longer ambiguous.
- If frontend GraphQL codegen cannot run without a live backend during implementation, generated artifacts still need a project-acceptable update path.
- Existing persisted agent definitions that reference `load_skill` should continue to resolve after migration because the tool name is preserved. Removed tool-management/versioning tool names will become stale but inert; no data migration is designed for those names.

## Notes For Architect Reviewer

- Review the distinction between removed agent-facing `Tool Management` tools and preserved product `ToolManagementResolver` carefully; over-removal is the main risk.
- Review whether full built-in skill-versioning removal is correctly scoped. The design intentionally uses clean-cut removal rather than leaving hidden APIs or no-op wrappers.
- Review frontend/backend schema alignment requirements, especially generated GraphQL artifacts and localization cleanup.
- Review that `load_skill` is migrated as a distinct server Skills tool, not folded into `get_skill_content`, and that the old core/General registration is removed.
