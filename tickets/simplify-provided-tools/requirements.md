# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Design-ready

## Goal / Problem Statement

Simplify the first-party/provided tool and skill-management surface by removing unused internal tool-management tools and removing the built-in skill-versioning workflow, while preserving useful skill-use tools under the correct server-owned skill tool boundary. After the change, the agent-facing skill tools are `get_available_skills`, `get_skill_content`, and `load_skill`, all registered by the server Skills tool group under category `Skills`. Built-in skill versioning should no longer be exposed through agent tools, backend GraphQL/API, or frontend Skills UI because skills can be versioned by their owning Git repositories outside AutoByteus. The legacy core `load_skill` implementation in `autobyteus-ts` should be migrated into `autobyteus-server-ts/src/agent-tools/skills` as the same `load_skill` tool instead of being folded into `get_skill_content` or left under `General`.

## Investigation Findings

- The user-provided screenshots show the currently visible local tool catalog exposing:
  - `Tool Management`: `list_available_tools`, `list_input_processors`, `list_lifecycle_processors`, `list_llm_response_processors`, `list_tool_result_processors`.
  - `Skill Management`: `create_skill_version`.
  - `Skills`: `get_available_skills`, `get_skill_content`.
  - `General`: legacy/core `load_skill`.
- Backend startup currently loads all local agent tool groups from `autobyteus-server-ts/src/startup/agent-tool-loader.ts`; the first loader entry registers `Tool Management Tools`, and the second loader entry registers `Skills Tools`.
- `autobyteus-server-ts/src/agent-tools/tool-management/` contains only the five internal discovery/processor-list agent tools named by the screenshot. These tools are not referenced by product agent definitions or non-test runtime code outside registration/tests/docs.
- `autobyteus-server-ts/src/agent-tools/skills/register-skills-tools.ts` currently registers `get_available_skills`, `get_skill_content`, and `create_skill_version`; the first two are retained, `create_skill_version` is removed, and migrated `load_skill` should be added to this server-owned Skills group.
- Built-in skill versioning is broader than the `create_skill_version` tool:
  - `SkillService.createSkill()` automatically initializes a per-skill `.git` repo and tag through `SkillVersioningService`.
  - `SkillService.enableSkillVersioning()` enables versioning for existing skills.
  - GraphQL `SkillResolver` exposes `isVersioned`, `activeVersion`, `skillVersions`, `skillVersionDiff`, `enableSkillVersioning`, and `activateSkillVersion`.
  - Frontend Skills detail imports and renders `SkillVersioningPanel` and `SkillVersionCompareModal`; `skillStore` and GraphQL documents call the versioning operations.
- `load_skill` is a legacy/core tool from `autobyteus-ts/src/tools/skill/load-skill.ts`; it is registered by `autobyteus-ts/src/tools/register-tools.ts` with category `ToolCategory.GENERAL`, which is why it appears under `General` instead of `Skills`. This is legacy core-tool boundary drift rather than a server-owned Skills tool.
- `load_skill` and `get_skill_content` are semantically different tools and should remain separate:
  - `load_skill` is runtime/use-oriented: it loads a skill for agent use, returns skill base-path context, path-resolution guidance, resolvable Markdown-link rewriting, and skill-access-mode/configured-skill enforcement.
  - `get_skill_content` is inspection/content-oriented: it retrieves SKILL.md plus a readable file tree from server `SkillService`.
- Active-source usage search found `load_skill` used as a registered tool and prompt-guidance target, plus its own tests/docs. No current product UI code, server skill tool group, or checked agent configuration was found depending on it directly; practical use is possible through generic model/tool-call registry exposure.
- The `AvailableSkillsProcessor` prompt text in `autobyteus-ts/src/agent/system-prompt-processor/available-skills-processor.ts` still tells models to use `load_skill` in global discovery mode; after migration, that guidance can remain conceptually valid only if it refers to the server-owned `load_skill` tool that is actually registered under `Skills`.
- The GraphQL `ToolManagementResolver` and frontend `/tools` page are separate product-management surfaces used to browse local tools and manage MCP servers. They must remain, but their local-tool catalog should naturally stop showing the removed local agent tools because those tools are no longer registered.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Cleanup / Behavior Change
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue / File Placement Or Responsibility Drift
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Likely Needed
- Evidence basis: Internal runtime registry/processor diagnostics are exposed as agent-selectable local tools; skill lifecycle management is split between normal skill CRUD/file browsing and a built-in Git tag/version subsystem the user says is unused and redundant with repository-backed skill source control.
- Requirement or scope impact: This cannot be a UI-only hide. The authoritative backend tool registrations and skill versioning APIs/services must be removed cleanly so the frontend, GraphQL schema, runtime registry, and tests converge on the smaller surface.

## Recommendations

- Remove the entire backend local agent tool-management group from startup registration and delete its tool files/tests, while preserving the GraphQL tool catalog/MCP management resolver and frontend `/tools` page.
- Modify server skill tool registration to keep `get_available_skills` and `get_skill_content`, remove `create_skill_version`, and add migrated `load_skill` under the `Skills` category.
- Migrate `load_skill` from `autobyteus-ts` into `autobyteus-server-ts/src/agent-tools/skills/load-skill.ts` as a distinct tool implemented through server `SkillService`; preserve runtime/use semantics separately from `get_skill_content`.
- Remove built-in skill versioning from backend skill services and GraphQL schema:
  - no automatic `.git` initialization for created skills,
  - no `enableSkillVersioning`, `activateSkillVersion`, `skillVersions`, or `skillVersionDiff` API,
  - no skill version metadata fields in the skill GraphQL/frontend model.
- Remove frontend versioning controls, compare modal, versioning store actions/documents/types/localization, and update generated GraphQL artifacts.
- Add/update tests so the local tool catalog proves removed tools are absent, migrated `load_skill` is present under `Skills`, and retained skill tools still work.

## Scope Classification (`Small`/`Medium`/`Large`)

Medium

## In-Scope Use Cases

- UC-001: A user opens the Tools local-tool view and no longer sees the `Tool Management` category or its five internal tools.
- UC-002: An agent/runtime tool catalog no longer contains or can instantiate the five internal tool-management tools.
- UC-003: A user/agent views local skill tools and sees `get_available_skills`, `get_skill_content`, and migrated `load_skill` under `Skills`; `load_skill` is no longer present under `General`.
- UC-004: A user creates, edits, browses, reloads, disables/enables, and deletes skills without AutoByteus creating or managing per-skill Git repositories/tags.
- UC-005: A user opens Skill Detail and sees the normal file workspace without built-in versioning controls or compare flows.
- UC-006: Existing MCP server management, tool browsing, schema reload, and GraphQL tool catalog behavior continue to work for retained local tools, migrated `load_skill`, and MCP-origin tools.

## Out of Scope

- Removing or redesigning the frontend `/tools` module, MCP server management, MCP gateway, or GraphQL `ToolManagementResolver`.
- Removing normal skill catalog/CRUD/file workspace functionality.
- Folding `load_skill` into `get_skill_content`; they remain distinct tools.
- Removing or changing Git repositories that already exist on disk inside or around skill directories; this change stops AutoByteus from managing them but does not delete user data.
- Replacing built-in skill versioning with a new GitHub/Git integration.
- Migration/cleanup of persisted agent definitions that may already contain removed tool-management/versioning names; removed names should simply stop resolving because no tool definition exists. `load_skill` keeps resolving because its name is migrated, not removed.
- Changes to unrelated `activeVersion` concepts outside skills, such as managed messaging gateway status.

## Functional Requirements

- REQ-001: Backend startup MUST NOT register the local agent `Tool Management Tools` group.
- REQ-002: The local agent tool registry MUST NOT contain `list_available_tools`, `list_input_processors`, `list_lifecycle_processors`, `list_llm_response_processors`, or `list_tool_result_processors` after first-party tool loading.
- REQ-003: The codebase MUST remove the in-scope tool-management agent tool implementations and their direct tests rather than leaving hidden/unregistered legacy implementations.
- REQ-004: Backend/server skill tool registration MUST retain `get_available_skills` and `get_skill_content` with category `Skills`.
- REQ-004A: The legacy/core `load_skill` tool MUST be migrated into `autobyteus-server-ts/src/agent-tools/skills` as a distinct server-owned `load_skill` tool with category `Skills`; it MUST NOT remain registered from `autobyteus-ts` or appear under `General`.
- REQ-004B: Migrated `load_skill` MUST preserve its runtime/use-oriented semantics separately from `get_skill_content`: skill base path context, path-resolution guidance, resolvable Markdown-link rewriting or equivalent absolute-path formatting, and skill-access-mode/configured-skill enforcement from tool context.
- REQ-004C: The legacy arbitrary path-loading/register-from-path behavior of core `load_skill` MUST NOT be preserved as an agent tool capability unless the path is part of normal server-managed skill sources; skill directories should be introduced through normal server skill sources/CRUD flows, not ad hoc model-supplied paths.
- REQ-005: Backend skill tool registration MUST NOT register or expose `create_skill_version`; its implementation and direct tests MUST be removed.
- REQ-006: Built-in skill versioning backend code MUST be removed from the Skills capability area, including the `SkillVersioningService`, `SkillVersion` domain model, `SkillService.enableSkillVersioning()`, and automatic version initialization during `SkillService.createSkill()`.
- REQ-007: Creating a skill through `SkillService` or GraphQL MUST create the skill directory and `SKILL.md` only; it MUST NOT initialize `.git`, create commits, or create tags.
- REQ-008: The skills GraphQL schema MUST remove skill-versioning fields, input/object types, queries, and mutations while preserving normal skill catalog, file tree/content, CRUD, enable/disable, source, and reload operations.
- REQ-009: The frontend Skills UI MUST remove built-in versioning controls and compare workflows from Skill Detail while preserving the normal skill file workspace.
- REQ-010: Frontend GraphQL documents, generated types, stores, local types, tests, localization messages, and docs MUST be updated so they do not reference removed skill-versioning operations or fields.
- REQ-011: The frontend `/tools` page and GraphQL tool catalog MUST continue to browse retained local tools, migrated `load_skill`, and MCP-origin tools; the absence of removed local tools should come from backend registry changes, not client-side hiding.
- REQ-012: No backward-compatibility aliases, no-op wrappers, dual-path versioning behavior, or hidden retained registration paths for removed tools/versioning APIs may remain.

## Acceptance Criteria

- AC-001: After invoking the backend/core first-party tool loaders, `defaultToolRegistry.listToolNames()` does not include `list_available_tools`, `list_input_processors`, `list_lifecycle_processors`, `list_llm_response_processors`, `list_tool_result_processors`, or `create_skill_version`.
- AC-002: After invoking the backend/core first-party tool loaders, `defaultToolRegistry.listToolNames()` includes `get_available_skills`, `get_skill_content`, and migrated `load_skill`.
- AC-003: The GraphQL `toolsGroupedByCategory(origin: LOCAL)` result does not contain a `Tool Management` category and does not contain the six removed tool names, while returning `load_skill`, `get_available_skills`, and `get_skill_content` under `Skills`.
- AC-004: Direct unit coverage for `get_available_skills`, `get_skill_content`, and migrated `load_skill` passes and confirms their distinct behavior: discovery list, inspection/content file tree, and runtime/use skill-loading context respectively.
- AC-005: Creating a skill through `SkillService.createSkill()` succeeds without a versioning service dependency and leaves no `.git` directory under the created skill root.
- AC-006: Creating/querying a skill through GraphQL succeeds and returned `Skill` data no longer includes `isVersioned` or `activeVersion`.
- AC-007: GraphQL introspection or schema tests confirm removed skill-versioning operations/types are absent: `skillVersions`, `skillVersionDiff`, `enableSkillVersioning`, `activateSkillVersion`, `SkillVersion`, `SkillDiff`, `ActivateSkillVersionInput`, and `EnableSkillVersioningInput`.
- AC-008: Frontend Skills detail renders without `SkillVersioningPanel` or `SkillVersionCompareModal`; no request is made for skill versions/diffs during normal Skill Detail load.
- AC-009: Frontend skill store/types/GraphQL documents compile without versioning actions or fields, and checked-in generated GraphQL artifacts match the new backend schema.
- AC-010: Existing Tools/MCP UI tests or store tests still pass, proving MCP server management and tool catalog browsing were not removed.
- AC-011: Repository search over active source/test/docs files finds no remaining references to removed agent tool names or skill-versioning backend/UI symbols, except historical ticket artifacts if intentionally excluded from active source scans and the migrated server-owned `load_skill` implementation/tests/docs.
- AC-012: Active source search confirms `autobyteus-ts/src/tools/register-tools.ts` no longer imports/registers `registerLoadSkillTool`, and no active `autobyteus-ts/src/tools/skill/load-skill.ts` tool implementation remains.

## Constraints / Dependencies

- Preserve working behavior for `get_available_skills` and `get_skill_content`.
- Preserve `load_skill` as a distinct useful skill-use tool by migrating it to the server Skills tool group.
- Preserve the GraphQL tool catalog resolver and frontend `/tools` product surface; it is not the same as the removed agent-facing `Tool Management` tools.
- Preserve normal skill CRUD and file browsing/editing through Skill Detail/File Explorer.
- Do not delete existing skill `.git` folders or external repository metadata from disk.
- Regenerate or manually update checked-in frontend generated GraphQL types after schema/document changes.
- Keep unrelated `activeVersion` fields for managed messaging gateway or other non-skill domains intact.

## Assumptions

- The user's phrase "tool managements" refers to all tools currently grouped under `Tool Management` in the screenshot.
- The user's phrase "create skill version tool" refers to the `create_skill_version` agent tool under `Skill Management`.
- The user explicitly confirmed that removing skill versioning is in scope for this cleanup, not merely a future idea.
- Persisted agent definitions that reference `load_skill` should continue to resolve after migration because the tool name is preserved; persisted definitions that reference removed tool-management or versioning tool names will become inert through normal missing-tool handling rather than requiring data migration.

## Risks / Open Questions

- Existing manually created skills may already contain `.git` directories from prior AutoByteus versioning; this change intentionally stops using them but does not remove that data.
- Frontend generated GraphQL artifacts may require a running backend schema during implementation; if unavailable, implementers must still keep generated checked-in types consistent by the project's accepted fallback process.
- Existing tests with `.js` mirrors of `.ts` tests may need parallel removal/update if they are still part of active test discovery.

## Requirement-To-Use-Case Coverage

| Use Case | Covered Requirements |
| --- | --- |
| UC-001 | REQ-001, REQ-002, REQ-003, REQ-011, REQ-012 |
| UC-002 | REQ-001, REQ-002, REQ-003, REQ-012 |
| UC-003 | REQ-004, REQ-004A, REQ-004B, REQ-004C, REQ-005, REQ-012 |
| UC-004 | REQ-006, REQ-007, REQ-008, REQ-010, REQ-012 |
| UC-005 | REQ-008, REQ-009, REQ-010 |
| UC-006 | REQ-004A, REQ-011 |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criterion | Scenario Intent |
| --- | --- |
| AC-001 | Backend/core registry no longer exposes removed tools. |
| AC-002 | Retained/migrated skill agent tools register. |
| AC-003 | Product tool catalog reflects backend removal/migration without client-side filtering. |
| AC-004 | Skill tools remain distinct and useful after migration. |
| AC-005 | Skill creation no longer performs built-in Git versioning. |
| AC-006 | GraphQL skill CRUD/query surface is simplified. |
| AC-007 | Versioning APIs/types are cleanly removed, not hidden. |
| AC-008 | Skill Detail UI no longer drives versioning. |
| AC-009 | Frontend type/document layer matches simplified schema. |
| AC-010 | Unrelated Tools/MCP management remains intact. |
| AC-011 | No active-source leftovers for removed surfaces. |
| AC-012 | Legacy core `load_skill` registration is gone after server migration. |

## Approval Status

Approved by user on 2026-06-20 after clarification. User confirmed the intended distinction: remove internal/unused agent tools and all skill versioning, while preserving the normal Skills page CRUD/file browsing and Tools/MCP management pages. Follow-up clarification found `load_skill` is a useful but legacy core skill tool incorrectly sitting under `General`; user clarified it should stay distinct and be migrated to the server Skills tool group as `load_skill`, not folded into `get_skill_content`.
