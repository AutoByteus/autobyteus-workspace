# Investigation Notes

## Investigation Status

- Bootstrap Status: Dedicated task worktree and draft ticket artifacts created.
- Current Status: Architecture review round 1 found design-impact issue AR-001; requirements/investigation/design refined to cover open-modal selected-tool synchronization and ready for re-review.
- Investigation Goal: Define the focused frontend/schema-projection ticket for making nested `generation_config` fields visible in Tool Details.
- Scope Classification (`Small`/`Medium`/`Large`): Medium
- Scope Classification Rationale: Requires a coordinated backend GraphQL schema projection update plus frontend generated types/store/modal rendering and tests, but does not change tool execution behavior.
- Scope Summary: Fix Tools UI schema visibility for object parameters. Runtime Agent Tools MCP schema cache behavior is out of scope.
- Primary Questions To Resolve:
  - Does the selected OpenAI model actually expose `voice` in the live model catalog?
  - Does `generate_speech` expose `generation_config` in the live local tool schema?
  - Where is nested object schema lost before it reaches the Tool Details modal?
  - What should be in and out of scope for this ticket?
  - After Reload Schema returns a new tool object, who owns replacing the open modal's selected tool so the modal does not display stale schema?

## Request Context

The user selected `OpenAI / gpt-4o-mini-tts` as the default speech generation model. The Default media models UI confirms that selection. In the Tool Details modal for `generate_speech`, the user sees `prompt`, `output_file_path`, and `generation_config`, but not nested fields like `generation_config.voice`. The user agreed that runtime MCP schema cache behavior can be treated as a non-bug/current limitation for now and asked to bootstrap a ticket for the frontend visibility problem.

Screenshot reference provided by user:

- `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_2420b0ce166b4d2ca10cab8591d0b206/solution_designer_4f154410b12240dfbcf2992d7b5e3ddc/context_files/ctx_32e08f06afe3__image.png`

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/tool-details-nested-config-schema`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/tool-details-nested-config-schema/tickets/tool-details-nested-config-schema`
- Current Branch: `codex/tool-details-nested-config-schema`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/tool-details-nested-config-schema`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin --prune` succeeded on 2026-06-20.
- Task Branch: `codex/tool-details-nested-config-schema`
- Expected Base Branch (if known): `origin/personal`
- Expected Finalization Target (if known): `personal` / `origin/personal`, unless redirected.
- Bootstrap Blockers: None.
- Notes For Downstream Agents: Runtime Agent Tools MCP schema cache refresh is intentionally out of scope for this ticket unless requirements are later expanded.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-06-20 | Setup | `git fetch origin --prune` | Refresh base refs before task branch/worktree creation | Succeeded. | No |
| 2026-06-20 | Setup | `git worktree add /Users/normy/autobyteus_org/autobyteus-worktrees/tool-details-nested-config-schema -b codex/tool-details-nested-config-schema origin/personal` | Create dedicated task workspace | Worktree created at commit `70984d2a`. | No |
| 2026-06-20 | Data | `grep -n "DEFAULT_SPEECH_GENERATION_MODEL" /Users/normy/.autobyteus/server-data/.env` | Confirm persisted default speech model | Line 17 is `DEFAULT_SPEECH_GENERATION_MODEL=gpt-4o-mini-tts`. | No |
| 2026-06-20 | Probe | GraphQL POST to `http://localhost:29695/graphql`: `{ availableAudioProvidersWithModels { models { modelIdentifier name value configSchema } } }` | Verify live model catalog schema for OpenAI TTS | `gpt-4o-mini-tts.configSchema.properties.voice` exists with enum values; `format` and `instructions` also exist. | No |
| 2026-06-20 | Probe | GraphQL POST to `http://localhost:29695/graphql`: `{ tools(origin: LOCAL) { name description argumentSchema { parameters { name paramType description required defaultValue enumValues } } } }` | Verify live Tool Details data for `generate_speech` | `generate_speech` includes top-level `generation_config` object but no nested fields in the GraphQL response shape. | Yes, fix projection/UI |
| 2026-06-20 | Code | `autobyteus-server-ts/src/api/graphql/types/tool-definition.ts` | Inspect GraphQL DTO shape | `ToolParameterDefinition` only contains flat scalar metadata and no nested schema field. | Yes |
| 2026-06-20 | Code | `autobyteus-server-ts/src/api/graphql/converters/tool-definition-converter.ts` | Inspect conversion from core tool schema to GraphQL | `paramToGraphql` maps only `name`, `paramType`, `description`, `required`, `defaultValue`, `enumValues`; drops `objectSchema`/JSON Schema property data. | Yes |
| 2026-06-20 | Code | `autobyteus-web/components/tools/ToolDetailsModal.vue` | Inspect UI rendering owner | Renders only `props.tool.argumentSchema.parameters` as flat table rows. | Yes |
| 2026-06-20 | Code | `autobyteus-web/stores/toolManagementStore.ts` | Inspect frontend store type | `ToolParameter` interface mirrors flat GraphQL shape and lacks nested schema data. | Yes |
| 2026-06-20 | Code | `autobyteus-ts/src/utils/parameter-schema.ts` | Inspect source schema capabilities | `ParameterDefinition.toJsonSchemaProperty()` already merges nested `objectSchema` properties for object params; `ParameterSchema.toJsonSchema()` can represent nested object schema. | Yes, reuse as source |
| 2026-06-20 | Other | User approval message: `approve` | Lock requirements for design | User approved the scoped frontend/schema-projection ticket. | No |
| 2026-06-20 | Other | `tickets/done/tool-details-nested-config-schema/design-spec.md` | Produce implementation design | Design uses existing tool schema boundary, adds per-parameter JSON Schema projection, and renders nested rows in Tool Details. | Architecture review |
| 2026-06-20 | Other | `tickets/done/tool-details-nested-config-schema/design-review-report.md` | Review architecture feedback | AR-001 failed DS-002: open modal selected tool can remain stale because `ToolsManagementWorkspace.vue` stores `selectedTool` separately while `reloadToolSchema` immutably replaces tools in store arrays. | Yes, revise design |
| 2026-06-20 | Code | `autobyteus-web/components/tools/ToolsManagementWorkspace.vue` | Inspect open modal selected-tool ownership for AR-001 | Modal receives `:tool="selectedTool"`; `selectedTool` is a standalone `ref<Tool | null>` set by `showToolDetails`. No reload event handler currently updates it. | Yes |
| 2026-06-20 | Code | `autobyteus-web/stores/toolManagementStore.ts` `reloadToolSchema` | Inspect reload update behavior for AR-001 | Store returns `result.tool` and updates `localTools`, `localToolsByCategory`, and `toolsByServerId` by immutable replacement. Existing selected object references are not mutated. | Yes |
| 2026-06-20 | Code | `autobyteus-web/components/tools/ToolDetailsModal.vue` `reloadSchema` | Inspect modal reload assumption for AR-001 | Modal calls `store.reloadToolSchema(props.tool.name)` and assumes reactive props will update, but emits only `close`; parent has no signal to replace `selectedTool`. | Yes |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary: Tools page -> Tool Details modal for `generate_speech`.
- Current execution flow:
  - Tool registry owns a `ParameterSchema` for `generate_speech`.
  - `media-tool-parameter-schemas.ts` adds an object `generation_config` whose nested object schema is the configured model's parameter schema.
  - GraphQL `ToolDefinitionConverter` projects the tool definition into `ToolDefinitionDetail`/`ToolParameterDefinition`.
  - Frontend `toolManagementStore` stores the projected schema.
  - `ToolDetailsModal.vue` renders a flat parameter table.
  - On Reload Schema, `ToolDetailsModal.vue` calls `toolManagementStore.reloadToolSchema(props.tool.name)`.
  - `toolManagementStore.reloadToolSchema` returns the updated tool and immutably replaces matching tools in store collections.
  - `ToolsManagementWorkspace.vue` owns the modal's `selectedTool` as a separate ref, so the open modal can keep the old object unless the parent replaces `selectedTool` from the reload result.
- Ownership or boundary observations:
  - Core schema can represent nested fields.
  - GraphQL projection is the first boundary where nested object schema is lost.
  - Frontend rendering currently cannot recover nested fields because the data is absent and its type is flat.
  - The open-modal reload path also needs explicit selected-tool synchronization because the current prop object is not automatically replaced by immutable store updates.
- Current behavior summary: The UI accurately shows that `generation_config` exists, but hides what valid keys can go inside it. After reload, the store can hold a newer tool than the object currently passed to the open modal.

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix / UX Improvement
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Shared Structure Looseness
- Refactor posture evidence summary: Small schema-boundary refactor likely needed. The backend/front-end shared tool-parameter projection is too loose/flat for object parameters, even though core `ParameterSchema` already supports nested JSON Schema.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| Live audio model GraphQL | OpenAI `gpt-4o-mini-tts` exposes `voice`, `format`, `instructions`. | Provider/model catalog is not the defect. | No |
| Live tools GraphQL | `generate_speech` exposes `generation_config` object only, no nested field data. | Tool GraphQL projection is insufficient for object parameters. | Yes |
| `ToolDetailsModal.vue` | Flat parameter rendering only. | Frontend display must be extended after backend data exists. | Yes |
| `ParameterSchema.toJsonSchema()` | Core schema can represent nested object data. | Target design should reuse existing schema source rather than invent a separate model-specific projection. | Yes |
| `ToolsManagementWorkspace.vue` + `toolManagementStore.reloadToolSchema` | Selected modal tool is held separately while store reload updates replace arrays immutably. | Target design must define parent-owned selected-tool synchronization after reload. | Yes |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-ts/src/utils/parameter-schema.ts` | Core parameter and JSON Schema conversion model. | Has nested object JSON Schema support via `toJsonSchemaProperty()` / `toJsonSchema()`. | Keep as source of truth for nested schema. |
| `autobyteus-server-ts/src/api/graphql/types/tool-definition.ts` | GraphQL DTOs for tool definitions. | `ToolParameterDefinition` lacks nested schema/JSON schema fields. | Needs projection shape extension. |
| `autobyteus-server-ts/src/api/graphql/converters/tool-definition-converter.ts` | Converts core `ToolDefinition` into GraphQL DTOs. | Drops object schema properties. | Needs conversion update. |
| `autobyteus-web/generated/graphql.ts` | Generated frontend GraphQL types. | Current generated types mirror flat schema. | Must be regenerated/updated through project workflow after backend GraphQL query/type changes. |
| `autobyteus-web/stores/toolManagementStore.ts` | Frontend tools store/type boundary. | `ToolParameter` lacks nested schema data; `reloadToolSchema` already returns the updated tool while replacing store collections immutably. | Needs type alignment with GraphQL response and keep returning the updated tool for parent synchronization. |
| `autobyteus-web/components/tools/ToolDetailsModal.vue` | User-facing tool schema display and reload button action. | Renders flat rows only; reload action emits no updated-tool event today. | Needs nested object rendering plus a `schema-reloaded` event carrying the returned tool. |
| `autobyteus-web/components/tools/ToolsManagementWorkspace.vue` | Parent workspace and modal selected-tool state. | Owns `selectedTool` ref passed to `ToolDetailsModal`; currently set only when opening details. | Must handle modal reload success and replace `selectedTool` when the returned tool matches the current selected tool. |
| `autobyteus-web/components/tools` tests, if present | UI regression coverage area. | Need locate/update or add modal test coverage. | Yes |
| `autobyteus-server-ts/tests` GraphQL/tool tests | Backend projection coverage area. | Need update/add tests for nested schema projection. | Yes |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-06-20 | Probe | Live GraphQL `availableAudioProvidersWithModels` on localhost:29695 | `gpt-4o-mini-tts` model config schema includes `voice`. | Missing UI voice is not model catalog failure. |
| 2026-06-20 | Probe | Live GraphQL `tools(origin: LOCAL)` on localhost:29695 | `generate_speech` has top-level `generation_config`, no nested subfields. | The reported screenshot matches current GraphQL/UI projection. |

## External / Public Source Findings

- Public API / spec / issue / upstream source: Prior OpenAI docs lookup confirmed OpenAI speech supports a `voice` parameter for TTS.
- Version / tag / commit / freshness: Public docs checked on 2026-06-20 in prior same-thread investigation.
- Relevant contract, behavior, or constraint learned: `voice` is a valid OpenAI speech request field; local model schema also includes it.
- Why it matters: This ticket should not remove or work around provider voice support; it should display existing schema data.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: Live local AutoByteus server on `http://localhost:29695/graphql` for the initial observation; implementation tests should avoid external paid OpenAI calls.
- Required config, feature flags, env vars, or accounts: Current persisted setting `DEFAULT_SPEECH_GENERATION_MODEL=gpt-4o-mini-tts` in `/Users/normy/.autobyteus/server-data/.env`.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: Dedicated worktree creation from `origin/personal`.
- Cleanup notes for temporary investigation-only setup: Temporary files `/tmp/tool-details-nested-config-tools.json` and `/tmp/tool-details-nested-config-audio.json` were used for probe output.

## Findings From Code / Docs / Data / Logs

The root problem is a projection/display gap. Core schemas can contain nested object fields, and the selected OpenAI TTS model does contain `voice`, but the GraphQL tool-definition model and frontend Tool Details modal are flat. The UI therefore stops at `generation_config` and does not show its nested keys.

Architecture review also exposed a reload-state ownership gap: the store can replace tool collections with the returned updated tool, but the open modal receives `selectedTool` from `ToolsManagementWorkspace.vue`, not a computed reference into those store collections. The parent workspace therefore must be part of the target design for reload refresh to be real.

Runtime Agent Tools MCP schema caching was separately identified in prior investigation, but the user explicitly scoped this ticket to the frontend improvement for now.

## Constraints / Dependencies / Compatibility Facts

- Preserve the tool invocation contract: `generation_config.voice`, not top-level `voice`.
- Keep existing flat parameter display working.
- Keep Reload Schema behavior working for the modal, including already-open modal rerender after the returned tool changes.
- Avoid executing provider calls.
- Coordinate backend GraphQL schema, generated frontend GraphQL artifacts, store types, and UI tests.

## Open Unknowns / Risks

- Need confirm project-standard command for regenerating frontend GraphQL types if a GraphQL query/type changes.

## Notes For Architect Reviewer

The design should be schema-boundary led: core `ParameterSchema` remains source of truth; GraphQL should expose nested schema faithfully; frontend should render nested object properties without changing invocation semantics. The reload return path must explicitly replace the parent-owned selected tool before claiming the modal refreshes. Do not include Agent Tools MCP cache refresh in this ticket unless requirements are expanded.
