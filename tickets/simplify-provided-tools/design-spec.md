# Design Spec

## Current-State Read

The current local/provided tool surface is registry-driven. Backend startup schedules `loadAllAgentTools()` from `autobyteus-server-ts/src/startup/agent-tool-loader.ts`; that loader dynamically imports first-party registration groups, including:

- `Tool Management Tools` -> `src/agent-tools/tool-management/register-tool-management-tools.ts`
- `Skills Tools` -> `src/agent-tools/skills/register-skills-tools.ts`

Those groups register `ToolDefinition` entries in `defaultToolRegistry`. The product `/tools` UI does not hardcode the screenshot cards; `autobyteus-web/stores/toolManagementStore.ts` calls GraphQL `toolsGroupedByCategory(origin: LOCAL)`, and `ToolManagementResolver` maps the current registry into grouped cards. Runtime tool selection also resolves configured tool names from the same registry, so hidden/unregistered/leftover definitions would remain callable if they stay registered.

The `Tool Management` agent tools are internal diagnostics:

- `list_available_tools`
- `list_input_processors`
- `list_lifecycle_processors`
- `list_llm_response_processors`
- `list_tool_result_processors`

They expose registry/processor internals as model-selectable tools. The product GraphQL `ToolManagementResolver` is a separate user-management boundary for tool browsing, schema reload, MCP server management, and MCP-origin tool display; it must remain.

The current skill tool group registers three tools:

- retained: `get_available_skills`
- retained: `get_skill_content`
- removed: `create_skill_version`

Built-in skill versioning is not isolated to `create_skill_version`. It also appears in:

- `SkillService.createSkill()` automatically initializing a per-skill Git repository and initial tag through `SkillVersioningService`.
- `SkillService.enableSkillVersioning()`.
- `SkillVersioningService` and `SkillVersion` domain model.
- GraphQL `Skill` fields `isVersioned` and `activeVersion`, plus `SkillVersion`, `SkillDiff`, `skillVersions`, `skillVersionDiff`, `enableSkillVersioning`, and `activateSkillVersion`.
- Frontend Skill Detail versioning badge/button/dropdown/compare modal and the supporting store/documents/types/localization/generated GraphQL code.

The target must therefore be a clean removal across backend registration, backend skill lifecycle APIs, frontend skill data/UI, tests, generated artifacts, and docs. A client-side hide or no-op wrapper would violate the user-confirmed cleanup request.

## Intended Change

Remove unused internal agent-facing tool-management tools and remove the entire built-in skill-versioning feature. The only retained agent-facing skill tools are `get_available_skills` and `get_skill_content`. Normal skill catalog, source reload, create/edit/delete/disable/enable, and file workspace browsing remain intact. Product-level tool browsing and MCP management remain intact.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Cleanup / Behavior Change
- Current design issue found (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes
- Evidence: Internal registry/processor introspection tools are exposed through the same registry that feeds runtime tool selection and the product local-tool catalog. Skill versioning is embedded in the skill CRUD service, GraphQL schema, frontend Skill Detail UI, and agent tool layer even though the user wants repository-backed version ownership outside AutoByteus.
- Design response: Remove the internal agent tool-management group at its registry owner and remove the built-in skill-versioning subsystem at every API/UI/test/doc boundary. Preserve the product `ToolManagementResolver` and normal skill CRUD/file workspace owners.
- Refactor rationale: Removal is cross-cutting because the old boundaries made internal diagnostics and Git tag lifecycle first-class product/runtime capabilities. A local hide would leave mixed authority in place.
- Intentional deferrals and residual risk, if any: No migration is designed for persisted agent definitions that already mention removed tool names. Existing runtime resolution already skips missing tool definitions with warnings. Existing skill `.git` directories on disk are not removed to avoid deleting user data; they simply stop being managed by AutoByteus.

## Terminology

- `Subsystem` / `capability area`: a larger functional area that owns a broader category of work and may contain multiple files plus optional module groupings.
- `Module`: an optional intermediate grouping inside a subsystem when the codebase benefits from it. Do not use `module` as a synonym for one file or as the default ownership term.
- `Folder` / `directory`: a physical grouping used to organize files and any optional module groupings.
- `File`: one concrete source file and the primary unit where one concrete concern should land.

## Design Reading Order

Read this design from registry/tool exposure and skill lifecycle spines first, then subsystem ownership, then file responsibilities, removal plan, and validation.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: remove obsolete agent tool definitions, startup registration, backend skill-versioning service/domain/API, frontend versioning UI/data layer, direct tests, generated GraphQL references, and durable docs.
- There should be no compatibility aliases for removed tool names, no hidden `create_skill_version`, no no-op GraphQL versioning mutations, and no fallback behavior that preserves AutoByteus-managed skill tags.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | Backend startup first-party tool loading | Frontend/runtime local tool catalog | Agent tool registry boundary | Determines which local tools exist at all. |
| DS-002 | Primary End-to-End | Agent or user asks for skill access tool | SkillService catalog/content output | Skills agent-tool boundary | Preserves only the two useful skill tools. |
| DS-003 | Primary End-to-End | User creates/browses/edits a skill | Skill file workspace / skill metadata | Skills capability area | Removes AutoByteus Git version ownership while preserving normal skill work. |
| DS-004 | Primary End-to-End | User opens Tools/MCP page | Tool cards and MCP management interactions | Product Tool Management GraphQL/UI boundary | Ensures product tool/MCP management remains, while removed local tools disappear naturally. |

## Primary Execution Spine(s)

- DS-001: `Startup Background Runner -> Agent Tool Loader -> First-Party Tool Group Registration -> defaultToolRegistry -> Runtime/GraphQL Tool Catalog`
- DS-002: `Runtime Tool Call -> Retained Skills Tool -> SkillService -> Skill Loader/File Tree -> Tool Result`
- DS-003: `Skills Page/GraphQL Mutation -> SkillResolver -> SkillService -> Filesystem Skill Directory/SKILL.md -> Skill Detail File Workspace`
- DS-004: `Tools Page -> toolManagementStore -> ToolManagementResolver -> defaultToolRegistry/MCP Config APIs -> Tool Cards/MCP Management UI`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | Startup loads only supported first-party agent tool groups. The removed `Tool Management Tools` group is no longer part of the loader. The simplified skill group registers only two tools. Registry state then drives runtime tool availability and GraphQL catalog output. | Startup loader, first-party registration groups, tool registry, runtime/catalog consumers | `agent-tool-loader.ts` plus each tool family registration file | Tests proving absent names; docs explaining supported groups |
| DS-002 | A model/runtime calls `get_available_skills` or `get_skill_content`. The retained tool wrapper delegates to `SkillService` and formats the output. No versioning tool exists. | Runtime tool call, skills tool wrapper, SkillService, output formatter | `src/agent-tools/skills` | JSON formatting helper, file tree serializer |
| DS-003 | A user performs normal skill CRUD/browsing. GraphQL delegates to `SkillService`, which creates/updates/deletes files only. Skill Detail shows identity/description and the file workspace; no versioning state or Git tag actions are queried/rendered. | Skills UI, SkillResolver, SkillService, filesystem skill root, file workspace | Skills capability area | Skill sources store, File Explorer workspace bridge, localization |
| DS-004 | The Tools/MCP page still queries GraphQL for grouped tools and MCP server state. Because removed local tools are absent from the registry, their categories/cards disappear without client-side filtering. MCP server management remains unchanged. | Tools UI, tool management store, ToolManagementResolver, registry/MCP APIs | Product tool-management GraphQL/UI boundary | MCP gateway/server stores and schema reload mutation |

## Spine Actors / Main-Line Nodes

- Startup Background Runner: schedules non-critical startup tasks.
- Agent Tool Loader: chooses which first-party local tool groups are registered.
- Tool Family Registration: owns per-family registration into `defaultToolRegistry`.
- `defaultToolRegistry`: authoritative runtime/catalog source of registered tool definitions.
- ToolManagementResolver: product API for browsing registered tools and managing tool schema reload.
- Skills Tool Wrappers: agent-facing skill discovery/content tools.
- SkillResolver: GraphQL API boundary for skill catalog/file/CRUD operations.
- SkillService: authoritative backend owner for skill catalog, CRUD, source reload, disabled state, file operations, and configured-runtime resolution.
- Skill Detail UI: frontend owner for skill identity/description and file workspace composition.

## Ownership Map

| Node | Owns |
| --- | --- |
| Agent Tool Loader | Which first-party tool families are loaded into the local registry at startup. |
| `src/agent-tools/skills/register-skills-tools.ts` | The complete retained agent-facing skill tool set. |
| `defaultToolRegistry` | Registered tool definitions, grouping by category/origin, and instantiation by name. |
| ToolManagementResolver | Product GraphQL browsing of current registry state; schema reload mutation. It is not an agent-facing diagnostic tool family. |
| SkillService | Skill discovery, CRUD, source metadata, disable/enable, file tree/content/file write/delete, configured skill resolution. It no longer owns Git versioning. |
| SkillResolver | GraphQL projection of SkillService capabilities. It no longer owns or projects versioning. |
| Skill Detail UI | Skill identity/description display and file workspace mounting. It no longer owns version state/activation/compare controls. |

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `get_available_skills` tool | SkillService | Model-facing discovery output | Skill mutation/version lifecycle |
| `get_skill_content` tool | SkillService + file tree traversal | Model-facing skill content retrieval | Skill mutation/version lifecycle |
| GraphQL `tools`/`toolsGroupedByCategory` | `defaultToolRegistry` | Product UI/API browsing | Agent-only internal diagnostics |
| GraphQL `skills`/`skill`/mutations | SkillService | Product UI/API skill management | Git versioning/tag lifecycle |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| `Tool Management Tools` loader entry in `agent-tool-loader.ts` | Internal diagnostic agent tools are no longer provided. | Product `ToolManagementResolver` remains for tool browsing. | In This Change | Remove only this loader spec. |
| `autobyteus-server-ts/src/agent-tools/tool-management/` | Contains only removed internal agent tools. | No agent-facing replacement. | In This Change | Delete all five tool files and registration file. |
| `tests/unit/agent-tools/tool-management/*.test.{ts,js}` | Direct tests for removed tools. | Catalog absence coverage. | In This Change | Remove both TS and checked-in JS mirrors if present. |
| `create_skill_version` registration/import | Only exists for removed skill versioning. | Retained skills registration file. | In This Change | `registerSkillsTools()` keeps only two calls. |
| `autobyteus-server-ts/src/agent-tools/skills/create-skill-version.ts` | Agent tool for removed versioning. | No replacement. | In This Change | Delete direct tests. |
| `SkillVersioningService` | AutoByteus no longer owns per-skill Git tags. | External Git/GitHub repositories outside backend. | In This Change | Do not delete user `.git` directories. |
| `SkillVersion` domain model | Only served built-in versioning. | None. | In This Change | Delete after GraphQL/tests stop importing. |
| `SkillService.versioningService` and `enableSkillVersioning()` | SkillService should own skill files/catalog only. | SkillService file-only CRUD. | In This Change | `createSkill()` no longer initializes Git. |
| GraphQL skill version fields/types/queries/mutations | Versioning removed from backend API. | Normal Skill GraphQL fields/operations. | In This Change | Schema breaking change is intended. |
| Frontend SkillVersioningPanel and compare modal | Versioning removed from UI. | Skill Detail header + file workspace. | In This Change | Screenshot button/badge disappear. |
| Frontend versioning store actions/documents/types/localization | No caller remains. | Simplified skill store and schema docs. | In This Change | Regenerate GraphQL after document/schema changes. |
| `utils/skillDiffParser.ts` and tests | Solely used by version compare modal. | None. | In This Change | Remove if no other active references. |
| Backend/frontend skill versioning docs | Durable docs would be stale. | Updated skills docs noting external version control is outside AutoByteus. | In This Change | Delivery engineer may finalize docs wording. |

## Return Or Event Spine(s) (If Applicable)

No async return/event spine materially changes. Normal GraphQL query/mutation responses and runtime tool results remain synchronous request/response flows.

## Bounded Local / Internal Spines (If Applicable)

No event loop/state machine is introduced. The only bounded local loop worth noting is existing skill file tree traversal inside `get_skill_content`/SkillService file tree operations; it remains unchanged and is not a design driver.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Test absence assertions | DS-001, DS-003 | Tool registry and Skill GraphQL owners | Prove removed names/fields/ops are absent. | Removal tasks need negative coverage. | Without tests, hidden legacy exposure may regress. |
| Generated GraphQL artifact sync | DS-003 | Frontend skill data layer | Keep checked-in generated types/composables aligned with schema/documents. | Frontend compile relies on generated types. | Stale generated code would reintroduce removed operations. |
| Localization cleanup | DS-003 | Skill Detail UI | Remove text for deleted controls and avoid stale translation keys. | Versioning UI disappears. | Stale labels make docs/tests/audits misleading. |
| Docs sync | DS-001, DS-003, DS-004 | Delivery/documentation | Reflect smaller tool and skill-management surface. | Durable docs currently mention removed versioning. | Stale docs encourage unsupported flows. |
| Historical ticket artifact exclusion | DS-001, DS-003 | Validation scripts/reviewers | Avoid treating old logs under `tickets/done/**` as active references. | Historical evidence contains removed names. | Naive `rg` would report intentional archives as failures. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Product browsing of tools after removing agent diagnostics | ToolManagementResolver + toolManagementStore | Reuse | Already owns `/tools` catalog and MCP management. | N/A |
| Retained model skill access | `src/agent-tools/skills` + SkillService | Reuse/Simplify | Existing wrappers already do exactly the retained discovery/content work. | N/A |
| Skill CRUD/file workspace | SkillService + SkillResolver + File Explorer workspace | Reuse/Simplify | Existing normal skill management remains the correct owner. | N/A |
| Skill version ownership | External Git/GitHub repository | Reuse outside backend | User indicates skills are often tracked by GitHub repos; backend should not duplicate. | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Backend Agent Tools | First-party tool group loading and agent-facing tool wrappers | DS-001, DS-002 | Agent Tool Loader, skills tool registration | Simplify | Remove tool-management group and `create_skill_version`. |
| Backend Skills | Skill catalog, CRUD, sources, file operations, runtime skill resolution | DS-002, DS-003 | SkillService, SkillResolver | Simplify | Remove Git versioning responsibility. |
| Backend Product Tool Management | GraphQL tool browsing/schema reload and MCP management | DS-004 | ToolManagementResolver/MCP resolvers | Reuse | Preserve; not the removed agent tool group. |
| Frontend Skills | Skill list/detail/file workspace state and UI | DS-003 | SkillsList, SkillDetail, skillStore | Simplify | Remove versioning controls and data actions. |
| Frontend Tools/MCP | Tool browsing and MCP management UI | DS-004 | ToolsManagementWorkspace, toolManagementStore | Reuse | No client-side hiding; backend removal drives catalog. |
| Docs/Generated/Test Artifacts | Durable reflection and validation | All | Downstream delivery/test owners | Update | Keep active artifacts aligned. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/startup/agent-tool-loader.ts` | Backend Agent Tools | Startup tool group loader | List supported first-party tool group registration specs. | Centralized dynamic startup loading. | N/A |
| `autobyteus-server-ts/src/agent-tools/skills/register-skills-tools.ts` | Backend Agent Tools | Skills tool family registration | Register only retained skill agent tools. | One file per tool family registration. | N/A |
| `autobyteus-server-ts/src/skills/services/skill-service.ts` | Backend Skills | SkillService | Skill catalog/CRUD/file/source/disable/enable/configured-resolution. | Existing service remains coherent after versioning removal. | `Skill` model |
| `autobyteus-server-ts/src/api/graphql/types/skills.ts` | Backend Skills | SkillResolver | GraphQL projection of skill management APIs. | Existing resolver remains coherent after versioning removal. | `Skill` model, `SkillSourceInfo` |
| `autobyteus-web/graphql/skills.ts` | Frontend Skills | Skill GraphQL documents | Frontend documents for normal skill APIs. | Established document file for skill operations. | Generated GraphQL types |
| `autobyteus-web/stores/skillStore.ts` | Frontend Skills | Skill state store | Skill catalog/current skill/reload/CRUD/file actions. | Existing store remains coherent after removing version actions. | `Skill` type |
| `autobyteus-web/components/skills/SkillDetail.vue` | Frontend Skills | Skill detail composition | Header identity/description and file workspace. | Existing component owns detail layout. | `SkillWorkspaceLoader`, File Explorer |
| `autobyteus-web/types/skill.ts` | Frontend Skills | Skill frontend type boundary | Skill/Create/Update/Delete types only. | Central local type file. | N/A |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Skill frontend/backend DTO fields | Existing GraphQL generated types and `types/skill.ts` | Frontend Skills | Existing local type boundary is enough. | Yes: remove `isVersioned`/`activeVersion` from skill DTOs. | Yes: remove version objects/diff objects. | A legacy version metadata carrier. |
| Tool name absence list in tests | Test-local constant | Backend test suite | Negative assertions can share one local array in catalog cleanup test. | Yes | Yes | Runtime filtering code. |
| Diff parser | None; remove `utils/skillDiffParser.ts` | N/A | No remaining consumer after compare modal deletion. | Yes | Yes | Orphaned utility. |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| GraphQL `Skill` | Yes after removal | Yes | Low | Remove version fields; keep identity/content/source flags only. |
| Frontend `Skill` | Yes after removal | Yes | Low | Remove `isVersioned` and `activeVersion`. |
| Backend `SkillVersion` | N/A | Yes | Low | Delete type entirely. |
| Frontend `SkillVersion` / `SkillDiff` | N/A | Yes | Low | Delete types entirely. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/startup/agent-tool-loader.ts` | Backend Agent Tools | Startup loader | Register supported first-party tool families, excluding Tool Management. | Maintains current startup pattern. | N/A |
| `autobyteus-server-ts/src/agent-tools/skills/register-skills-tools.ts` | Backend Agent Tools | Skills tool registration | Register `get_available_skills` and `get_skill_content` only. | Clear family boundary. | N/A |
| `autobyteus-server-ts/src/agent-tools/skills/get-available-skills.ts` | Backend Agent Tools | Retained skill discovery tool | Return list of skill names/descriptions. | Existing single concern. | SkillService |
| `autobyteus-server-ts/src/agent-tools/skills/get-skill-content.ts` | Backend Agent Tools | Retained skill content tool | Return SKILL.md content and file tree. | Existing single concern. | SkillService, TreeNode |
| `autobyteus-server-ts/src/skills/services/skill-service.ts` | Backend Skills | SkillService | Skill catalog/CRUD/source/file/disable/enable/configured resolution without versioning. | Coherent after removing Git tag lifecycle. | Skill, SkillSourceInfo |
| `autobyteus-server-ts/src/api/graphql/types/skills.ts` | Backend Skills | SkillResolver | Normal skill GraphQL operations only. | Existing resolver remains correct after pruning versioning. | SkillService |
| `autobyteus-web/graphql/skills.ts` | Frontend Skills | Skill documents | Normal skill queries/mutations only. | Existing document owner. | Generated types |
| `autobyteus-web/graphql/skillSources.ts` | Frontend Skills | Skill source reload document | Reload catalog result without version fields. | Existing source document owner. | Generated types |
| `autobyteus-web/stores/skillStore.ts` | Frontend Skills | Skill store | Skill state/actions without versioning. | Existing store owner. | `Skill` local type |
| `autobyteus-web/components/skills/SkillDetail.vue` | Frontend Skills | Skill detail view | Skill identity/description + workspace. | Existing UI owner after pruning version controls. | SkillWorkspaceLoader |
| `autobyteus-web/types/skill.ts` | Frontend Skills | Local skill types | Skill and CRUD/delete types only. | Existing type owner. | N/A |
| `autobyteus-web/generated/graphql.ts` | Frontend GraphQL | Generated client artifacts | Match simplified schema/documents. | Checked-in generated artifact. | GraphQL documents/schema |

## Ownership Boundaries

- Agent-facing tool exposure is owned by first-party registration groups and `defaultToolRegistry`. Upstream callers must not retain hidden local tools after a family is removed.
- Product tool browsing/MCP management is owned by GraphQL `ToolManagementResolver`, MCP server resolvers, and frontend `/tools` state. It must not be deleted when removing agent-facing diagnostic tools.
- Skill lifecycle is owned by SkillService for file/catalog operations only. Git tag/version lifecycle is outside backend scope and belongs to external repository tooling if the user wants it.
- Frontend Skill Detail owns layout/workspace composition only. It must not call versioning GraphQL APIs or render versioning controls after removal.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| Agent Tool Loader + registration files | Per-family tool registration | Startup/background runner | Manually registering removed tool-management files elsewhere | Adjust supported family registration explicitly. |
| ToolManagementResolver | Registry grouping/schema reload mapping | `/tools` frontend and product APIs | Frontend hardcoding hidden/removed local tool cards | Query registry output only. |
| SkillService | Skill filesystem/catalog/source/disabled/file operations | SkillResolver, retained skill agent tools, workspace registration | GraphQL/frontend invoking removed versioning service or Git commands | Add normal SkillService file/catalog APIs only if needed. |
| Skill Detail | Workspace mounting and skill identity display | Skills page | Component reaching into versioning APIs or diff utilities | Add non-version UI state under Skill Detail or file explorer owners. |

## Dependency Rules

Allowed:

- `agent-tool-loader.ts` may import/load retained first-party registration files.
- `register-skills-tools.ts` may import retained skill tools only.
- Retained skill tools may depend on SkillService and formatting/tree utilities.
- SkillResolver may depend on SkillService and skill/source models.
- Frontend skill store may depend on normal skill GraphQL documents and local skill types.
- Frontend `/tools` may depend on GraphQL tool catalog/MCP APIs.

Forbidden:

- Any active source import of `SkillVersioningService` or `SkillVersion` after removal.
- Any active source registration of `create_skill_version` or the five `Tool Management` tools.
- Any GraphQL skill versioning operation/type/field retained as a compatibility no-op.
- Any frontend component/store/document/generated code that calls `skillVersions`, `skillVersionDiff`, `enableSkillVersioning`, or `activateSkillVersion`.
- Any client-side-only hiding of removed local tools while leaving backend definitions registered.
- Any deletion of unrelated product `ToolManagementResolver` or MCP management flows.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `get_available_skills` | Skill catalog | Return available skill names/descriptions to agent | Agent context only | Retained. |
| `get_skill_content` | One skill content/tree | Return SKILL.md and tree for selected skill | `skill_name: string` | Retained. |
| `skills` / `skill(name)` | Skill metadata/content | Return normal skill data | optional/name string | Remove version fields. |
| `createSkill` / `updateSkill` / `deleteSkill` | Skill CRUD | Manage skill directory/SKILL.md | explicit skill name/input | No Git version side effects. |
| `uploadSkillFile` / `deleteSkillFile` / `skillFileTree` / `skillFileContent` | Skill file workspace | Read/write/list skill files | skill name + relative path where applicable | Preserved. |
| `disableSkill` / `enableSkill` | Skill disabled state | Toggle disabled skill list | skill name | Preserved. |
| `reloadSkillCatalog` / skill source operations | Skill catalog/source metadata | Refresh/list source folders | none/path string | Preserved; remove version fields in returned skills. |
| `tools` / `toolsGroupedByCategory` | Current tool registry catalog | Product browsing of registered tools | origin and/or source server | Preserved. |
| Removed `create_skill_version` | N/A | N/A | N/A | No alias/no-op. |
| Removed `skillVersions` / `skillVersionDiff` / `enableSkillVersioning` / `activateSkillVersion` | N/A | N/A | N/A | Removed from schema. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `get_available_skills` | Yes | Yes | Low | Preserve. |
| `get_skill_content` | Yes | Yes | Low | Preserve. |
| Skill GraphQL CRUD/file operations | Yes after version removal | Yes | Low | Remove version operations/fields. |
| Tool GraphQL catalog | Yes | Yes | Low | Preserve; do not confuse with removed agent diagnostics. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Product GraphQL tool browsing | `ToolManagementResolver` | Yes | Medium because removed agent tools share the phrase "tool management" | Document/preserve distinction. |
| Agent diagnostic tools | `Tool Management` category | No for product-facing model surface | High | Remove. |
| Skill file/catalog service | `SkillService` | Yes | Low after version removal | Remove Git versioning concern. |
| Retained skill agent tools | `get_available_skills`, `get_skill_content` | Yes | Low | Preserve. |
| Built-in versioning service | `SkillVersioningService` | Yes but obsolete | N/A | Delete. |

## Applied Patterns (If Any)

- Registry pattern remains in `defaultToolRegistry`; this change removes obsolete registry entries rather than adding another filter/strategy.
- Repository/Git pattern is removed from the Skills backend. External Git repositories may still exist but are outside AutoByteus skill management.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/startup/agent-tool-loader.ts` | File | Agent tool startup | Retained first-party groups only. | Existing startup owner. | Tool Management loader spec. |
| `autobyteus-server-ts/src/agent-tools/tool-management/` | Folder | Removed | Delete. | No supported agent-facing concern remains. | Any active source. |
| `autobyteus-server-ts/src/agent-tools/skills/` | Folder | Skills agent tools | Retained discovery/content tools and registration. | Existing family owner. | `create-skill-version.ts`. |
| `autobyteus-server-ts/src/skills/services/skill-service.ts` | File | SkillService | Normal skill management only. | Existing service owner. | `SkillVersioningService`, `enableSkillVersioning`, Git init/tag calls. |
| `autobyteus-server-ts/src/skills/services/skill-versioning-service.ts` | File | Removed | Delete. | Obsolete backend-owned versioning. | Any retained compatibility service. |
| `autobyteus-server-ts/src/skills/domain/skill-version.ts` | File | Removed | Delete. | Obsolete DTO. | Any retained type. |
| `autobyteus-server-ts/src/api/graphql/types/skills.ts` | File | Skill GraphQL | Skill CRUD/file/source APIs only. | Existing resolver owner. | Versioning fields/types/queries/mutations. |
| `autobyteus-server-ts/src/api/graphql/types/tool-management.ts` | File | Product tool catalog | Preserve. | Existing product owner. | Removal of resolver due to name confusion. |
| `autobyteus-web/components/skills/SkillDetail.vue` | File | Skill Detail UI | Header identity/description + file workspace. | Existing UI owner. | Versioning controls/actions/imports. |
| `autobyteus-web/components/skills/SkillVersioningPanel.vue` | File | Removed | Delete. | Obsolete UI. | Any hidden button/status. |
| `autobyteus-web/components/skills/SkillVersionCompareModal.vue` | File | Removed | Delete. | Obsolete UI. | Diff fetch/rendering. |
| `autobyteus-web/utils/skillDiffParser.ts` | File | Removed | Delete if only used by compare modal. | Solely versioning support. | Orphaned utility. |
| `autobyteus-web/graphql/skills.ts` | File | Skill GraphQL docs | Normal skill operations only. | Existing document owner. | Versioning documents/fields. |
| `autobyteus-web/graphql/skillSources.ts` | File | Skill source reload docs | Reload result without version fields. | Existing document owner. | Version fields. |
| `autobyteus-web/stores/skillStore.ts` | File | Skill store | Normal skill state/actions. | Existing store owner. | Version actions/types. |
| `autobyteus-web/types/skill.ts` | File | Frontend skill types | Normal skill DTOs. | Existing type owner. | `SkillVersion`, `SkillDiff`, version fields. |
| `autobyteus-web/generated/graphql.ts` | File | Generated GraphQL | Regenerated simplified schema/documents. | Existing generated artifact. | Removed operations/types. |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `src/agent-tools/skills` | Transport/agent tool wrapper | Yes after removal | Low | Retains only skill discovery/content wrappers. |
| `src/agent-tools/tool-management` | Removed | N/A | N/A | Delete to prevent misleading obsolete boundary. |
| `src/skills/services` | Main-Line Domain-Control | Yes after removal | Low | SkillService no longer mixes Git tag lifecycle. |
| `components/skills` | Frontend view components | Yes after removal | Low | Delete obsolete versioning components to avoid stale UI concern. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Tool catalog removal | `Agent Tool Loader -> Skills Tools (2 retained) -> defaultToolRegistry -> /tools cards` | `Backend still registers removed tools -> frontend filters category out` | Backend registry is authoritative for runtime and UI. |
| Skill creation | `createSkill -> mkdir skill dir -> write SKILL.md -> return loaded Skill` | `createSkill -> write SKILL.md -> git init -> commit/tag` | Confirms versioning is not a hidden side effect. |
| Skill Detail UI | `Back button + skill title + description -> SkillWorkspaceLoader/File Explorer` | `Not versioned badge + Enable Versioning button + compare modal` | Matches user screenshot request. |
| GraphQL removal | Removed fields fail introspection/query validation | No-op mutations return fake success | Clean schema break is intended. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep removed tools registered but hide in frontend | Would avoid missing persisted tool names | Rejected | Remove registrations/implementations; missing configured names are skipped by runtime. |
| Keep `create_skill_version` as no-op | Would avoid tool-call errors if invoked | Rejected | Delete tool; no alias. |
| Keep GraphQL versioning mutations returning errors/no-ops | Would preserve generated client compatibility | Rejected | Remove schema operations and frontend callers. |
| Keep SkillService auto-versioning but remove UI/tool | Would silently retain backend version side effects | Rejected | Remove versioning service dependency and Git calls. |
| Delete existing skill `.git` directories | Would clean disk state | Rejected | Do not delete user data; stop backend management only. |

## Derived Layering (If Useful)

- Backend runtime layer: startup loader and tool registration.
- Backend product API layer: GraphQL resolvers for tools and skills.
- Backend domain/service layer: SkillService and registry.
- Frontend state/documents layer: GraphQL documents/generated types/stores.
- Frontend view layer: Skills and Tools components.

Layering is explanatory only; the ownership rule is that registry registration owns tool existence and SkillService owns only non-version skill lifecycle.

## Migration / Refactor Sequence

1. Backend agent tools:
   - Remove `Tool Management Tools` loader entry from `agent-tool-loader.ts`.
   - Remove `autobyteus-server-ts/src/agent-tools/tool-management/` files.
   - Remove `create_skill_version` import/call from `register-skills-tools.ts`.
   - Delete `create-skill-version.ts` and direct tests.
2. Backend skill versioning:
   - Remove `SkillVersioningService` and `SkillVersion` imports/types/options/member from `SkillService`.
   - Change `SkillService.createSkill()` to create/write/load only; no `.git` init or tag.
   - Remove `SkillService.enableSkillVersioning()`.
   - Delete `skill-versioning-service.ts` and `skill-version.ts` after consumers are removed.
3. Backend GraphQL:
   - Remove version fields from `Skill` object type.
   - Remove versioning input/object types and map helpers.
   - Remove `skillVersions`, `skillVersionDiff`, `enableSkillVersioning`, `activateSkillVersion`.
   - Update all resolver methods to call `mapSkill(skill)` without versioning service.
4. Backend tests/docs:
   - Delete direct tests for removed tools/services.
   - Update SkillService tests to expect no `.git` and no versioning dependency.
   - Update skills GraphQL e2e to remove Git gating/imports and add absence assertions for version operations/types.
   - Extend tool catalog cleanup e2e to assert removed tool names/category absent and retained skills tools present.
   - Remove/update backend docs for skill versioning/tool management references.
5. Frontend GraphQL/data layer:
   - Remove version fields/documents from `graphql/skills.ts` and `graphql/skillSources.ts`.
   - Update `types/skill.ts`.
   - Remove version actions and imports from `stores/skillStore.ts`.
   - Regenerate/update `generated/graphql.ts`.
6. Frontend UI/tests/localization/docs:
   - Remove versioning components/modal/parser and tests.
   - Simplify `SkillDetail.vue` to no longer load/render versions.
   - Update fixtures/specs to omit version fields.
   - Remove obsolete localization keys and update docs.
7. Final cleanup validation:
   - Search active source/tests/docs excluding historical tickets for removed names and versioning symbols.
   - Run targeted backend/frontend typechecks/tests as available.

## Key Tradeoffs

- Clean schema/tool removal will break any stale external callers, but matches the explicit cleanup request and avoids hidden legacy behavior.
- Existing `.git` folders are left in place to protect user data, even though this means some disk artifacts from old behavior may remain.
- Product `/tools` GraphQL/UI remains because it owns a different concern than the removed agent-facing diagnostic tools.

## Risks

- Generated GraphQL artifacts may become stale if not regenerated after schema/document changes.
- Some `.js` mirror tests may remain in the repository and keep importing removed files unless cleaned together with `.ts` tests.
- Broad `activeVersion` searches include unrelated managed messaging gateway code; cleanup must be scoped to skill versioning.
- Persisted agent definitions may contain removed tool names; runtime will warn/skip them, but no migration is included.

## Guidance For Implementation

- Treat removal as source deletion, not feature flagging or hiding.
- Preserve these backend files/concerns: `ToolManagementResolver`, MCP server GraphQL/types/stores/components, retained skill tools, SkillService normal CRUD/file/source behavior, File Explorer skill workspace behavior.
- Do not introduce new Git/GitHub skill versioning in this ticket.
- Suggested targeted validation:
  - Backend typecheck: `pnpm -C autobyteus-server-ts typecheck`.
  - Backend targeted tests around retained tools, SkillService, Skill GraphQL, and tool catalog cleanup.
  - Frontend type/test/build checks sufficient to prove skill store/detail/tools UI compile.
  - Active-source search excluding historical tickets, for example removed tool names and `SkillVersioningService`, `SkillVersioningPanel`, `skillVersions`, `enableSkillVersioning`.
