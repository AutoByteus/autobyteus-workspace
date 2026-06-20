# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Design-ready

## Goal / Problem Statement

Simplify the first-party/provided tool and skill-management surface by removing unused internal tool-management tools and removing the built-in skill-versioning workflow. After the change, the only agent-facing skill tools that remain are `get_available_skills` and `get_skill_content`. Built-in skill versioning should no longer be exposed through agent tools, backend GraphQL/API, or frontend Skills UI because skills can be versioned by their owning Git repositories outside AutoByteus.

## Investigation Findings

- The user-provided screenshots show the currently visible local tool catalog exposing:
  - `Tool Management`: `list_available_tools`, `list_input_processors`, `list_lifecycle_processors`, `list_llm_response_processors`, `list_tool_result_processors`.
  - `Skill Management`: `create_skill_version`.
  - `Skills`: `get_available_skills`, `get_skill_content`.
- Backend startup currently loads all local agent tool groups from `autobyteus-server-ts/src/startup/agent-tool-loader.ts`; the first loader entry registers `Tool Management Tools`, and the second loader entry registers `Skills Tools`.
- `autobyteus-server-ts/src/agent-tools/tool-management/` contains only the five internal discovery/processor-list agent tools named by the screenshot. These tools are not referenced by product agent definitions or non-test runtime code outside registration/tests/docs.
- `autobyteus-server-ts/src/agent-tools/skills/register-skills-tools.ts` registers `get_available_skills`, `get_skill_content`, and `create_skill_version`; the first two are the intended retained tools.
- Built-in skill versioning is broader than the `create_skill_version` tool:
  - `SkillService.createSkill()` automatically initializes a per-skill `.git` repo and tag through `SkillVersioningService`.
  - `SkillService.enableSkillVersioning()` enables versioning for existing skills.
  - GraphQL `SkillResolver` exposes `isVersioned`, `activeVersion`, `skillVersions`, `skillVersionDiff`, `enableSkillVersioning`, and `activateSkillVersion`.
  - Frontend Skills detail imports and renders `SkillVersioningPanel` and `SkillVersionCompareModal`; `skillStore` and GraphQL documents call the versioning operations.
- The GraphQL `ToolManagementResolver` and frontend `/tools` page are separate product-management surfaces used to browse local tools and manage MCP servers. They must remain, but their local-tool catalog should naturally stop showing the removed local agent tools because those tools are no longer registered.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Cleanup / Behavior Change
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Likely Needed
- Evidence basis: Internal runtime registry/processor diagnostics are exposed as agent-selectable local tools; skill lifecycle management is split between normal skill CRUD/file browsing and a built-in Git tag/version subsystem the user says is unused and redundant with repository-backed skill source control.
- Requirement or scope impact: This cannot be a UI-only hide. The authoritative backend tool registrations and skill versioning APIs/services must be removed cleanly so the frontend, GraphQL schema, runtime registry, and tests converge on the smaller surface.

## Recommendations

- Remove the entire backend local agent tool-management group from startup registration and delete its tool files/tests, while preserving the GraphQL tool catalog/MCP management resolver and frontend `/tools` page.
- Modify skill tool registration to keep only `get_available_skills` and `get_skill_content`; delete the `create_skill_version` tool and its tests.
- Remove built-in skill versioning from backend skill services and GraphQL schema:
  - no automatic `.git` initialization for created skills,
  - no `enableSkillVersioning`, `activateSkillVersion`, `skillVersions`, or `skillVersionDiff` API,
  - no skill version metadata fields in the skill GraphQL/frontend model.
- Remove frontend versioning controls, compare modal, versioning store actions/documents/types/localization, and update generated GraphQL artifacts.
- Add/update tests so the local tool catalog proves removed tools are absent and retained skill tools still work.

## Scope Classification (`Small`/`Medium`/`Large`)

Medium

## In-Scope Use Cases

- UC-001: A user opens the Tools local-tool view and no longer sees the `Tool Management` category or its five internal tools.
- UC-002: An agent/runtime tool catalog no longer contains or can instantiate the five internal tool-management tools.
- UC-003: A user/agent views local skill tools and sees only `get_available_skills` and `get_skill_content` for agent-facing skill access.
- UC-004: A user creates, edits, browses, reloads, disables/enables, and deletes skills without AutoByteus creating or managing per-skill Git repositories/tags.
- UC-005: A user opens Skill Detail and sees the normal file workspace without built-in versioning controls or compare flows.
- UC-006: Existing MCP server management, tool browsing, schema reload, and GraphQL tool catalog behavior continue to work for retained local tools and MCP-origin tools.

## Out of Scope

- Removing or redesigning the frontend `/tools` module, MCP server management, MCP gateway, or GraphQL `ToolManagementResolver`.
- Removing normal skill catalog/CRUD/file workspace functionality.
- Removing or changing Git repositories that already exist on disk inside or around skill directories; this change stops AutoByteus from managing them but does not delete user data.
- Replacing built-in skill versioning with a new GitHub/Git integration.
- Migration/cleanup of persisted agent definitions that may already contain removed tool names; removed names should simply stop resolving because no tool definition exists.
- Changes to unrelated `activeVersion` concepts outside skills, such as managed messaging gateway status.

## Functional Requirements

- REQ-001: Backend startup MUST NOT register the local agent `Tool Management Tools` group.
- REQ-002: The local agent tool registry MUST NOT contain `list_available_tools`, `list_input_processors`, `list_lifecycle_processors`, `list_llm_response_processors`, or `list_tool_result_processors` after first-party tool loading.
- REQ-003: The codebase MUST remove the in-scope tool-management agent tool implementations and their direct tests rather than leaving hidden/unregistered legacy implementations.
- REQ-004: Backend skill tool registration MUST retain `get_available_skills` and `get_skill_content` with their existing behavior and category `Skills`.
- REQ-005: Backend skill tool registration MUST NOT register or expose `create_skill_version`; its implementation and direct tests MUST be removed.
- REQ-006: Built-in skill versioning backend code MUST be removed from the Skills capability area, including the `SkillVersioningService`, `SkillVersion` domain model, `SkillService.enableSkillVersioning()`, and automatic version initialization during `SkillService.createSkill()`.
- REQ-007: Creating a skill through `SkillService` or GraphQL MUST create the skill directory and `SKILL.md` only; it MUST NOT initialize `.git`, create commits, or create tags.
- REQ-008: The skills GraphQL schema MUST remove skill-versioning fields, input/object types, queries, and mutations while preserving normal skill catalog, file tree/content, CRUD, enable/disable, source, and reload operations.
- REQ-009: The frontend Skills UI MUST remove built-in versioning controls and compare workflows from Skill Detail while preserving the normal skill file workspace.
- REQ-010: Frontend GraphQL documents, generated types, stores, local types, tests, localization messages, and docs MUST be updated so they do not reference removed skill-versioning operations or fields.
- REQ-011: The frontend `/tools` page and GraphQL tool catalog MUST continue to browse retained local tools and MCP-origin tools; the absence of removed local tools should come from backend registry changes, not client-side hiding.
- REQ-012: No backward-compatibility aliases, no-op wrappers, dual-path versioning behavior, or hidden retained registration paths for removed tools/versioning APIs may remain.

## Acceptance Criteria

- AC-001: After invoking the backend first-party tool loader, `defaultToolRegistry.listToolNames()` does not include `list_available_tools`, `list_input_processors`, `list_lifecycle_processors`, `list_llm_response_processors`, `list_tool_result_processors`, or `create_skill_version`.
- AC-002: After invoking the backend first-party tool loader, `defaultToolRegistry.listToolNames()` still includes `get_available_skills` and `get_skill_content`.
- AC-003: The GraphQL `toolsGroupedByCategory(origin: LOCAL)` result does not contain a `Tool Management` category and does not contain the six removed tool names, while still returning retained local tool categories/tools when available.
- AC-004: Direct unit coverage for `get_available_skills` and `get_skill_content` still passes and confirms their retained outputs/error behavior.
- AC-005: Creating a skill through `SkillService.createSkill()` succeeds without a versioning service dependency and leaves no `.git` directory under the created skill root.
- AC-006: Creating/querying a skill through GraphQL succeeds and returned `Skill` data no longer includes `isVersioned` or `activeVersion`.
- AC-007: GraphQL introspection or schema tests confirm removed skill-versioning operations/types are absent: `skillVersions`, `skillVersionDiff`, `enableSkillVersioning`, `activateSkillVersion`, `SkillVersion`, `SkillDiff`, `ActivateSkillVersionInput`, and `EnableSkillVersioningInput`.
- AC-008: Frontend Skills detail renders without `SkillVersioningPanel` or `SkillVersionCompareModal`; no request is made for skill versions/diffs during normal Skill Detail load.
- AC-009: Frontend skill store/types/GraphQL documents compile without versioning actions or fields, and checked-in generated GraphQL artifacts match the new backend schema.
- AC-010: Existing Tools/MCP UI tests or store tests still pass, proving MCP server management and tool catalog browsing were not removed.
- AC-011: Repository search over active source/test/docs files finds no remaining references to removed agent tool names or skill-versioning backend/UI symbols, except historical ticket artifacts if intentionally excluded from active source scans.

## Constraints / Dependencies

- Preserve working behavior for `get_available_skills` and `get_skill_content`.
- Preserve the GraphQL tool catalog resolver and frontend `/tools` product surface; it is not the same as the removed agent-facing `Tool Management` tools.
- Preserve normal skill CRUD and file browsing/editing through Skill Detail/File Explorer.
- Do not delete existing skill `.git` folders or external repository metadata from disk.
- Regenerate or manually update checked-in frontend generated GraphQL types after schema/document changes.
- Keep unrelated `activeVersion` fields for managed messaging gateway or other non-skill domains intact.

## Assumptions

- The user's phrase "tool managements" refers to all tools currently grouped under `Tool Management` in the screenshot.
- The user's phrase "create skill version tool" refers to the `create_skill_version` agent tool under `Skill Management`.
- The user explicitly confirmed that removing skill versioning is in scope for this cleanup, not merely a future idea.
- Persisted agent definitions with removed tool names are rare/unused; they will become inert through normal missing-tool handling rather than requiring data migration.

## Risks / Open Questions

- Existing manually created skills may already contain `.git` directories from prior AutoByteus versioning; this change intentionally stops using them but does not remove that data.
- Frontend generated GraphQL artifacts may require a running backend schema during implementation; if unavailable, implementers must still keep generated checked-in types consistent by the project's accepted fallback process.
- Existing tests with `.js` mirrors of `.ts` tests may need parallel removal/update if they are still part of active test discovery.

## Requirement-To-Use-Case Coverage

| Use Case | Covered Requirements |
| --- | --- |
| UC-001 | REQ-001, REQ-002, REQ-003, REQ-011, REQ-012 |
| UC-002 | REQ-001, REQ-002, REQ-003, REQ-012 |
| UC-003 | REQ-004, REQ-005, REQ-012 |
| UC-004 | REQ-006, REQ-007, REQ-008, REQ-010, REQ-012 |
| UC-005 | REQ-008, REQ-009, REQ-010 |
| UC-006 | REQ-011 |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criterion | Scenario Intent |
| --- | --- |
| AC-001 | Backend registry no longer exposes removed tools. |
| AC-002 | Retained skill agent tools still register. |
| AC-003 | Product tool catalog reflects backend removal without client-side filtering. |
| AC-004 | Retained skill tool behavior remains stable. |
| AC-005 | Skill creation no longer performs built-in Git versioning. |
| AC-006 | GraphQL skill CRUD/query surface is simplified. |
| AC-007 | Versioning APIs/types are cleanly removed, not hidden. |
| AC-008 | Skill Detail UI no longer drives versioning. |
| AC-009 | Frontend type/document layer matches simplified schema. |
| AC-010 | Unrelated Tools/MCP management remains intact. |
| AC-011 | No active-source leftovers for removed surfaces. |

## Approval Status

Approved by user on 2026-06-20 after clarification. User confirmed the intended distinction: remove internal/unused agent tools and all skill versioning, while preserving the normal Skills page CRUD/file browsing and Tools/MCP management pages.
