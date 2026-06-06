# Design Spec

## Current-State Read

The approved change covers three connected behaviors:

1. **Memory Compactor prompt wording.** The source template at `autobyteus-server-ts/src/built-in-agents/templates/memory-compactor/agent.md` is partly cleaned up, but still talks in task/output-contract terms. Automated prompt builders in `autobyteus-ts/src/memory/compaction/working-context-compaction-prompt-builder.ts` and `compaction-task-prompt-builder.ts` still emit `[OUTPUT_CONTRACT]`, `Return JSON only`, and “output contract” wording.
2. **Internal built-in agent materialization.** `BuiltInAgentBootstrapper` loops over `BUILT_IN_AGENT_DEFINITIONS`, creates target app-data folders under `agents/`, and calls `seedFileIfMissing(...)`. Existing files are preserved forever. That is why the running Electron app can show stale internal prompt language even though the source template has changed.
3. **Agent Duplicate/Fork.** Duplicate is exposed as a frontend button, GraphQL mutation, backend service method, provider contract, cached provider path, and file-provider copy operation. It creates unmanaged app-data copies rather than a Git/package fork, so it conflicts with the package-source customization model.

Current authoritative internal built-ins are only the registry entries in `autobyteus-server-ts/src/built-in-agents/built-in-agent-registry.ts`:

- `autobyteus-memory-compactor`
- `autobyteus-skill-evolver`

The app-data `agents/` root can also contain standalone local agents such as `codex`, `professor`, and `student`, and user packages are registered separately as local/GitHub package roots. Therefore the target sync must be **registry-id scoped**, not directory-wide.

Bundled application-owned teams/agents are application package content and are out of this internal built-in-agent sync scope.

## Intended Change

Make a clean-cut target state:

- The Memory Compactor prompt reads as human-friendly working-memory summarization guidance.
- Automated compaction still uses the current final assistant-text JSON result channel, but prompt labels and wording stop exposing internal “output contract” language.
- Startup sync overwrites `agent.md` and `agent-config.json` for only the built-in registry ids, every time, from bundled templates.
- User standalone agents, user packages, and application-owned bundled definitions are untouched by this sync.
- Duplicate/Fork is removed rather than hidden or retained as a legacy path.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Behavior Change / Refactor / Cleanup
- Current design issue found (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue / File Placement Or Responsibility Drift / Legacy Or Compatibility Pressure
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes
- Evidence:
  - `BuiltInAgentBootstrapper.seedFileIfMissing(...)` makes product-managed internal agents stale after the first copy.
  - Duplicate/Fork spans frontend, GraphQL, service, provider, cache, and file-copy code even though product direction is package-source ownership.
  - Compactor prompt/user-visible template wording mixes the human agent role with parser/backend phrasing.
- Design response:
  - Make built-in agent materialization an internal registry-owned sync operation.
  - Keep memory compaction as schema/result parser owner while cleaning generated wording.
  - Remove duplicate/fork surfaces and provider methods fully.
- Refactor rationale:
  - A local prompt edit alone would not repair existing Electron app data.
  - Hiding Duplicate in UI would leave obsolete API/backend behavior behind.
  - A compatibility branch that seeds only missing files for “old installs” would preserve the stale-agent bug.
- Intentional deferrals and residual risk, if any:
  - File-based compaction result handoff is deferred to a separate ticket. This change preserves the current assistant-text JSON result path as the sole authoritative channel for automated compaction.
  - True AutoByteus internal agent teams do not exist today. If introduced later, they should get a dedicated built-in team registry/materializer.

## Terminology

- **Internal built-in agent**: an AutoByteus-provided system/default agent listed in `BUILT_IN_AGENT_DEFINITIONS` and sourced from `src/built-in-agents/templates/`.
- **Standalone local agent**: a user-created agent under app-data `agents/` that is not listed in the built-in registry.
- **User package**: a user-registered local path or GitHub agent package. Its source folder/repository is authoritative.
- **Application-owned definition**: an agent/team bundled inside an application package. It is owned by that application package, not this built-in-agent sync.

## Design Reading Order

1. data-flow spine
2. subsystem / capability-area allocation
3. draft file responsibilities -> extract reusable owned structures -> finalize file responsibilities
4. folder/path mapping

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: remove Duplicate/Fork fully and replace seed-if-missing with registry-scoped built-in sync.
- This design does not keep compatibility wrappers, hidden GraphQL mutations, provider duplicate methods, or dual seed/sync behavior for internal built-ins.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | Server startup | Current built-in agent files in app data and refreshed definition cache | `BuiltInAgentBootstrapper` | Repairs stale internal agents while preserving non-built-in local/user sources. |
| DS-002 | Primary End-to-End | Parent run compaction request | Parsed `CompactionResult` from final assistant-text JSON | Memory compaction (`AgentCompactionSummarizer` + prompt/parser owners) | Ensures prompt cleanup does not change result authority. |
| DS-003 | Primary End-to-End | User opens agent detail | Agent detail without Duplicate/Fork affordance | Agent definition UI/store/API boundaries | Removes obsolete customization path. |
| DS-004 | Primary End-to-End | GraphQL schema/API build | No duplicate mutation/provider path | Agent definition backend boundary | Removes obsolete backend capability, not just UI. |

## Primary Execution Spine(s)

- DS-001: `ServerRuntime -> bootstrapBuiltInAgents -> BuiltInAgentBootstrapper -> BUILT_IN_AGENT_DEFINITIONS -> sync template files -> AgentDefinitionService refresh`
- DS-002: `PendingCompactionExecutor -> WorkingContextCompactor -> AgentCompactionSummarizer -> WorkingContextCompactionPromptBuilder -> visible compactor run -> CompactionResponseParser`
- DS-003: `AgentDetail route/view -> agentDefinitionStore -> AgentDetail actions -> run/edit/delete only`
- DS-004: `GraphQL schema generation -> AgentDefinitionResolver -> AgentDefinitionService -> AgentDefinitionProvider contract`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | Startup asks the built-in agent bootstrapper to materialize internal agents. The bootstrapper uses the registry as the source of truth, copies both template files over the matching app-data agent folders every time, then refreshes the agent definition cache/settings as today. | Server runtime, built-in bootstrapper, built-in registry, template files, app-data target files | `BuiltInAgentBootstrapper` | File copy/write, template path resolution, server settings default initialization, cache refresh. |
| DS-002 | When compaction is required, memory builds a human-friendly summarization task with a required final JSON shape, runs the configured visible compactor, and parses the final assistant text. | Pending compaction executor, summarizer, prompt builder, runner, parser | Memory compaction subsystem | Prompt wording, result shape constant, parser tolerance, status metadata. |
| DS-003 | Agent detail renders allowed actions only. Duplicate/Fork is not a possible action; after removal, run/edit/delete are the only shared-agent actions in this screen. | Agent detail component, store | Agent UI | Localization cleanup, test cleanup. |
| DS-004 | The backend schema no longer exposes a duplicate mutation. Service/provider contracts only support create/read/update/delete/list/template/refresh. | GraphQL resolver, service, cache provider, persistence provider, file provider | Agent definition subsystem | Generated frontend GraphQL cleanup, typecheck. |

## Spine Actors / Main-Line Nodes

- `ServerRuntime`: invokes built-in bootstrap during startup.
- `BuiltInAgentBootstrapper`: authoritative owner of internal built-in agent materialization.
- `BUILT_IN_AGENT_DEFINITIONS`: authoritative inventory of AutoByteus internal built-in agents.
- `AgentCompactionSummarizer`: memory-owned bridge from compaction task to selected compactor run and parser.
- `WorkingContextCompactionPromptBuilder` / `CompactionTaskPromptBuilder`: prompt rendering owners.
- `CompactionResponseParser`: authoritative final assistant-text JSON parser for this ticket.
- `AgentDetail`: frontend detail surface for agent actions.
- `AgentDefinitionResolver` / `AgentDefinitionService`: backend API/service boundary for agent definition operations.

## Ownership Map

| Node | Owns |
| --- | --- |
| `BuiltInAgentBootstrapper` | Built-in template path resolution, registry iteration, target app-data file sync, default setting initialization, cache refresh trigger. |
| `BUILT_IN_AGENT_DEFINITIONS` | Identity of platform-internal built-in agents. Anything not listed is not synced by this mechanism. |
| Memory compaction prompt builders | Human-readable task wording and generated final JSON result shape. |
| `CompactionResponseParser` | Accepted structured result from the selected compactor's final assistant text. |
| `AgentDetail` | Agent detail actions and visual affordances. |
| `AgentDefinitionService` | Public backend operations for agent definitions after Duplicate removal. |
| File/cached/persistence providers | Storage/cache implementation for create/read/update/delete/list/template operations only. |

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `bootstrapBuiltInAgents(...)` | `BuiltInAgentBootstrapper` | Functional startup entrypoint. | Sync policy outside the bootstrapper. |
| `AgentDefinitionResolver` | `AgentDefinitionService` | GraphQL transport boundary. | Duplicate/copy behavior after removal. |
| `agentDefinitionStore` | GraphQL agent definition API | Frontend state boundary around agent definitions. | A local duplicate/fork workflow. |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| `BuiltInAgentBootstrapper.seedFileIfMissing(...)` seed-only behavior | Preserves stale internal agents forever. | Registry-scoped template sync in `BuiltInAgentBootstrapper`. | In This Change | Remove method; do not keep fallback. |
| `seededAgentMd` / `seededAgentConfig` result semantics | “Seeded” no longer describes target behavior. | `syncedAgentMd` / `syncedAgentConfig` or equivalent sync result fields. | In This Change | Update smoke/tests accordingly. |
| `DuplicateAgentDefinitionInput` and `duplicateAgentDefinition` GraphQL mutation | Duplicate/Fork removed. | No replacement. Users create agents or edit package source. | In This Change | Regenerate frontend GraphQL types. |
| `AgentDefinitionService.duplicateAgentDefinition` | Backend duplicate operation removed. | No replacement. | In This Change | Remove service private `nextAgentId` if unused. |
| Provider `duplicate(...)` contract/methods | No backend duplicate operation remains. | No replacement. | In This Change | Remove from persistence, cached, and file providers. |
| `FileAgentDefinitionProvider.duplicate(...)` | Unmanaged file copy behavior is obsolete. | No replacement. | In This Change | Keep `nextAgentId` only if still used by create. |
| `AgentDuplicateButton.vue` and its spec | UI action removed. | No replacement. | In This Change | Delete component and test. |
| Frontend duplicate mutation/store/localization/generated code | No UI/API consumer remains. | No replacement. | In This Change | Remove en/zh localization entries. |
| AgentDetail “navigate to edit after duplicate” test | Scenario no longer exists. | Tests asserting no Duplicate rendering. | In This Change | Shared-agent detail should not contain Duplicate. |

## Return Or Event Spine(s) (If Applicable)

- DS-001 return path: `BuiltInAgentBootstrapper -> BuiltInAgentsBootstrapResult -> ServerRuntime log/error handling`. The result should report sync status, not seed-only status.
- DS-002 return path: `CompactionResponseParser -> AgentCompactionSummarizer -> WorkingContextCompactor -> PendingCompactionExecutor status`. Existing status/result flow remains authoritative.

## Bounded Local / Internal Spines (If Applicable)

- `BuiltInAgentBootstrapper.bootstrap()` local loop: `for each BuiltInAgentDefinition -> sync files -> resolve definition -> initialize setting`. This bounded loop matters because the registry item, not directory enumeration, defines sync scope.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Template file reading/writing | DS-001 | `BuiltInAgentBootstrapper` | Copy current `agent.md` and `agent-config.json` over target files. | Keeps file IO encapsulated in bootstrapper. | Directory-wide overwrites or scattered file writes. |
| Server setting default initialization | DS-001 | `BuiltInAgentBootstrapper` | Select built-in default ids when settings are blank. | Existing behavior still needed. | Settings policy mixed into registry or file writer. |
| Agent definition cache refresh | DS-001 | `BuiltInAgentBootstrapper` / `AgentDefinitionService` | Refresh after built-in files sync. | Ensures runtime sees current synced definitions. | Stale cache after overwrite. |
| Compaction result shape constant | DS-002 | Memory compaction prompt builders | Provide exact JSON object shape without internal “contract” wording. | Keeps schema in memory code. | Schema duplicated into `agent.md`. |
| Frontend generated GraphQL cleanup | DS-003, DS-004 | Agent definition frontend store | Remove stale mutation typings/hooks. | Keeps frontend schema aligned. | Hidden unused duplicate API surviving in generated code. |
| Docs sync | DS-001, DS-002, DS-004 | Delivery/docs | Reflect built-in sync and Duplicate removal. | Prevents docs from instructing stale behavior. | Future contributors reintroduce seed-only or duplicate. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Internal built-in agent materialization | `autobyteus-server-ts/src/built-in-agents` | Extend | Existing bootstrapper/registry already owns this. | N/A |
| User package update behavior | `agent-packages` service | Reuse / Do Not Modify | User package roots are already registered/reloaded/updated through package service. | N/A |
| Application-owned bundled definitions | `application-packages` / application bundle materializer | Reuse / Do Not Modify | User clarified these are application content, out of this scope. | N/A |
| Agent definition API removal | `agent-definition` service/provider + GraphQL resolver | Extend by removal | Same subsystem currently owns Duplicate; remove there. | N/A |
| Prompt wording/schema | `autobyteus-ts/src/memory/compaction` | Extend | Memory compaction owns generated task prompts and parser. | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Built-in agents | Registry-scoped sync, template assets, default setting initialization | DS-001 | Server startup | Extend | Replace seed-only with sync. |
| Memory compaction | Compactor prompt wording, result shape, parser continuity | DS-002 | Parent run compaction | Extend | No file handoff in this ticket. |
| Agent definition backend | Remove duplicate API/service/provider file copy | DS-004 | Agent management API | Extend by removal | CRUD remains. |
| Agent frontend | Remove Duplicate UI/store/generated mutation/localization | DS-003 | Agent detail page | Extend by removal | Run/edit/delete remain. |
| Docs | Update durable behavior docs | All | Delivery/maintenance | Extend | Exact docs finalized by delivery if implementation changes durable behavior. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `built-in-agent-bootstrapper.ts` | Built-in agents | `BuiltInAgentBootstrapper` | Registry-scoped sync from template to app-data target. | Existing bootstrap owner. | `BuiltInAgentDefinition` registry type. |
| `built-in-agent-registry.ts` | Built-in agents | Built-in registry | Internal built-in identity list. | Existing source of truth. | N/A |
| `templates/memory-compactor/agent.md` | Built-in agents / memory compaction prompt | Memory Compactor definition | Human-resume stable instructions. | Source asset. | N/A |
| `working-context-compaction-prompt-builder.ts` | Memory compaction | Prompt builder | Natural automated task wording. | Existing working-context prompt owner. | Result shape constant. |
| `compaction-task-prompt-builder.ts` | Memory compaction | Prompt builder / result shape owner | Shared final JSON result shape and block prompt wording. | Existing shared constant owner; rename constant to non-contract wording. | N/A |
| Agent definition provider/service/resolver files | Agent definition backend | API/service/storage boundaries | Remove duplicate methods/mutation. | Existing owners for operation. | N/A |
| Agent frontend files | Agent frontend | Agent detail/store/mutations | Remove duplicate UI and mutation usage. | Existing owners for view/state/API docs. | Generated GraphQL. |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Final compaction JSON shape | Keep in `compaction-task-prompt-builder.ts` or rename file only if implementation chooses | Memory compaction | Used by both prompt builders. | Yes | Yes | A general “output contract” utility. |
| Built-in agent identities | `built-in-agent-registry.ts` | Built-in agents | Already authoritative source. | Yes | Yes | Directory scan or app-data inference. |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `BuiltInAgentDefinition` | Yes | Yes | Low | Keep focused on id/template/display/default setting. Do not add user-package ownership fields. |
| Built-in bootstrap result | Yes after rename | Yes | Low | Rename seed fields to sync semantics. |
| Compaction result JSON shape | Yes | Yes | Low | Keep facts-only arrays and one `episodic_summary`. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/built-in-agents/built-in-agent-bootstrapper.ts` | Built-in agents | `BuiltInAgentBootstrapper` | Sync registry-defined built-in agent template files every startup; initialize settings; refresh cache. | Existing authoritative owner. | `BuiltInAgentDefinition`. |
| `autobyteus-server-ts/src/built-in-agents/built-in-agent-registry.ts` | Built-in agents | Registry | Current internal built-in inventory. | Existing registry. | N/A |
| `autobyteus-server-ts/src/built-in-agents/templates/memory-compactor/agent.md` | Built-in agents | Template asset | Human-resume compactor instructions. | One source asset. | N/A |
| `autobyteus-server-ts/scripts/smoke-built-in-agents-bootstrap.mjs` | Built-in agents validation | Build smoke | Assert built-in assets are present, stale files are overwritten, non-built-in app-data agents are preserved. | Existing smoke for build. | Registry ids. |
| `autobyteus-server-ts/src/built-in-agents/__tests__/built-in-agent-bootstrapper.spec.ts` | Built-in agents validation | Unit tests | Focused sync behavior tests if implementation adds source-level tests. | Keeps behavior testable without full build. | Registry ids. |
| `autobyteus-ts/src/memory/compaction/working-context-compaction-prompt-builder.ts` | Memory compaction | Prompt builder | Human-friendly automated compaction task wording. | Existing owner. | Result shape constant. |
| `autobyteus-ts/src/memory/compaction/compaction-task-prompt-builder.ts` | Memory compaction | Result shape / block prompt builder | Rename `COMPACTION_OUTPUT_CONTRACT` to non-legacy `COMPACTION_RESULT_SHAPE`; remove “output contract” language. | Existing shared result shape owner. | N/A |
| `autobyteus-ts/src/memory/index.ts` | Memory public exports | Package export boundary | Update exports for renamed result shape without compatibility alias. | Existing export boundary. | N/A |
| `autobyteus-server-ts/src/api/graphql/types/agent-definition.ts` | Agent definition backend | GraphQL resolver | Remove duplicate input and mutation. | Existing transport owner. | N/A |
| `autobyteus-server-ts/src/agent-definition/services/agent-definition-service.ts` | Agent definition backend | Service boundary | Remove duplicate operation and unused helpers. | Existing service owner. | Provider contract. |
| `autobyteus-server-ts/src/agent-definition/providers/*` | Agent definition backend | Provider/cache boundaries | Remove duplicate from contracts and implementations. | Existing storage/cache owners. | N/A |
| `autobyteus-web/components/agents/AgentDetail.vue` | Agent frontend | Agent detail UI | Remove Duplicate button import/render/handler. | Existing view owner. | Store only for remaining actions. |
| `autobyteus-web/components/agents/AgentDuplicateButton.vue` | Agent frontend | Deleted | Delete obsolete UI component. | Removal. | N/A |
| `autobyteus-web/graphql/mutations/agentDefinitionMutations.ts` | Agent frontend API | GraphQL documents | Remove duplicate mutation document. | Existing document owner. | N/A |
| `autobyteus-web/stores/agentDefinitionStore.ts` | Agent frontend store | Agent definition state | Remove duplicate mutation method/types/export. | Existing store owner. | Generated GraphQL. |
| `autobyteus-web/generated/graphql.ts` | Agent frontend generated API | Generated code | Regenerate/remove duplicate types and hooks. | Generated schema mirror. | N/A |
| `autobyteus-web/localization/messages/*/agents.ts` | Agent frontend localization | Localization entries | Remove Duplicate strings. | Existing localization owner. | N/A |
| `autobyteus-web/components/agents/__tests__/AgentDetail.spec.ts` | Agent frontend validation | UI tests | Assert no Duplicate action; remove duplicate navigation test. | Existing test owner. | N/A |
| `autobyteus-web/components/agents/__tests__/AgentDuplicateButton.spec.ts` | Agent frontend validation | Deleted | Delete obsolete component test. | Removal. | N/A |
| `autobyteus-ts/docs/agent_memory_design.md` and `_nodejs.md` | Docs | Memory docs | Update built-in sync and prompt wording description. | Existing durable docs. | N/A |

## Ownership Boundaries

- `BuiltInAgentBootstrapper` is the authoritative boundary for internal built-in agent materialization. Upstream startup code must not write built-in agent files directly.
- `BUILT_IN_AGENT_DEFINITIONS` is the identity boundary for sync scope. File system contents under app-data `agents/` must not decide what is internal.
- Memory compaction prompt/parser code owns the automated result shape. The editable compactor `agent.md` owns stable human behavior guidance, not parser authority.
- Agent definition API no longer owns duplicate/fork. Create and update remain separate explicit operations; there is no copy-from-existing operation.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `BuiltInAgentBootstrapper.bootstrap()` | Template read/write, registry loop, default setting init, cache refresh | `server-runtime.ts` | Startup code directly copying built-in files or scanning `agents/` to infer managed ids. | Add explicit bootstrapper option/result fields. |
| `BUILT_IN_AGENT_DEFINITIONS` | Built-in ids/template names | Bootstrapper/tests | Directory-wide overwrite based on app-data folders. | Add registry entry. |
| Memory compaction prompt/parser | Result shape and parsing | Summarizer/runner | Duplicating schema into `agent.md` as the only parser source. | Update prompt builder/parser API. |
| `AgentDefinitionService` | Agent definition operations | GraphQL resolver | Resolver calling provider duplicate/copy directly. | Add a real service method only for approved operations. |

## Dependency Rules

- `server-runtime.ts` may call `bootstrapBuiltInAgents(...)`; it must not know file sync details.
- `BuiltInAgentBootstrapper` may read `BUILT_IN_AGENT_DEFINITIONS`, template files, app config, server settings, and agent definition service.
- Built-in sync must never depend on agent package registry roots or application package roots.
- Frontend store may call only GraphQL operations that exist in backend schema; no stale generated duplicate hooks.
- No layer may keep duplicate/fork behavior as a hidden fallback.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `bootstrapBuiltInAgents(options?)` | Internal built-in agents | Sync built-in templates and init defaults. | Optional `agentsDir`; registry ids internal. | Result fields use sync semantics. |
| `AgentDefinitionResolver.create/update/delete/refresh/query` | Agent definitions | CRUD/query/refresh only. | Agent id for update/delete; input object for create/update. | Duplicate mutation removed. |
| `AgentDefinitionProvider` contract | Agent persistence | Create/read/list/update/delete/template. | Agent id/domain object. | Duplicate method removed. |
| `WorkingContextCompactionPromptBuilder.buildTaskPrompt` | Working-context compaction task | Render summarization request. | `WorkingContextMessageUnit[]`. | Uses result shape constant. |
| `CompactionResponseParser.parse` | Compaction result | Parse final assistant text JSON. | Text. | Preserved channel. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `bootstrapBuiltInAgents` | Yes | Yes | Low | Scope by registry only. |
| AgentDefinition GraphQL mutations | Yes after removal | Yes | Low | Remove duplicate. |
| Provider contract | Yes after removal | Yes | Low | Remove duplicate. |
| Prompt builders | Yes | Yes | Low | Rename result shape wording. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Built-in agent materialization | `BuiltInAgentBootstrapper` | Yes | Low | Keep class name; method/result fields should say sync, not seed. |
| Result shape constant | `COMPACTION_OUTPUT_CONTRACT` -> `COMPACTION_RESULT_SHAPE` | Yes after rename | Medium currently | Rename without compatibility alias. |
| Duplicate/Fork | `duplicateAgentDefinition` | N/A removed | High if kept | Remove. |
| Memory compactor | `Memory Compactor` | Yes | Low | Rewrite instructions around human-resume model. |

## Applied Patterns (If Any)

- **Registry**: `BUILT_IN_AGENT_DEFINITIONS` remains the identity registry for internal built-in agents.
- **Bootstrap/materializer**: `BuiltInAgentBootstrapper` owns startup materialization/sync.
- **Parser**: `CompactionResponseParser` remains the single parser for current result channel.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/built-in-agents/` | Folder | Built-in agent subsystem | Internal AutoByteus built-in registry/templates/bootstrap. | Existing capability area. | User package sync logic. |
| `autobyteus-server-ts/src/built-in-agents/built-in-agent-bootstrapper.ts` | File | Built-in bootstrapper | Registry-scoped sync every startup. | Existing bootstrap owner. | Directory-wide overwrite, seed-only fallback. |
| `autobyteus-server-ts/src/built-in-agents/templates/memory-compactor/agent.md` | File | Memory compactor template | Human-friendly stable prompt. | Source asset. | Backend/parser jargon. |
| `autobyteus-ts/src/memory/compaction/` | Folder | Memory compaction subsystem | Prompt rendering, parser, result normalization. | Existing memory capability. | Server file submission tools in this ticket. |
| `autobyteus-server-ts/src/agent-definition/` | Folder | Agent definition backend | Remove duplicate operation; retain CRUD/query. | Existing backend owner. | Copy/fork workflow. |
| `autobyteus-web/components/agents/` | Folder | Agent UI | Agent detail actions without Duplicate. | Existing UI owner. | Duplicate button component. |
| `autobyteus-web/graphql/` / `generated/` / `stores/` | Folders | Frontend GraphQL/store | Remove duplicate mutation usage/types. | Existing frontend API boundary. | Stale generated duplicate operations. |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `src/built-in-agents` | Main-Line Domain-Control + asset templates | Yes | Low | Existing focused subsystem. |
| `src/agent-definition` | Mixed justified: service/provider/GraphQL domain area | Yes | Low | Remove operation across existing layers. |
| `src/memory/compaction` | Main-Line Domain-Control | Yes | Low | Existing prompt/parser owner. |
| `components/agents` | UI | Yes | Low | Delete obsolete duplicate component. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Built-in sync scope | `for (definition of BUILT_IN_AGENT_DEFINITIONS) sync definition.templateDirName -> agents/definition.id` | `rm -rf ~/.autobyteus/server-data/agents && copy templates` | Prevents overwriting user local agents. |
| Prompt wording | `Your final answer must be one JSON object with this shape:` | `[OUTPUT_CONTRACT] Return JSON only. Parser-compatible shape...` | Keeps schema requirement without backend jargon. |
| Duplicate removal | Delete mutation/service/provider/component | Hide button but leave `duplicateAgentDefinition` callable | Satisfies no legacy paths. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep `seedFileIfMissing` for existing installs and add separate updater | Could preserve user edits to built-ins. | Rejected | Internal built-ins are product-managed; sync registry ids every startup. |
| Detect old prompt hashes before overwrite | Could avoid overwriting modified built-in app-data files. | Rejected | User confirmed internal built-ins should overwrite; customization belongs in package source/standalone agents. |
| Hide Duplicate button but keep backend mutation | Would reduce UI but keep old API. | Rejected | Remove UI, GraphQL mutation, service, providers, generated code. |
| Keep provider `duplicate(...)` for possible future use | Could simplify re-adding later. | Rejected | No legacy dead API. Reintroduce explicitly in a future approved design if needed. |
| Add file result handoff alongside assistant-text JSON | Could support future preferred handoff. | Rejected for this ticket | Defer to separate design; current text JSON path remains sole channel. |
| Export both `COMPACTION_OUTPUT_CONTRACT` and renamed result shape | Would preserve external import compatibility. | Rejected | Rename cleanly and update internal exports/usages without alias. |

## Derived Layering (If Useful)

- Startup layer: `server-runtime.ts` calls bootstrap entrypoint only.
- Domain/control layer: built-in bootstrapper and memory compaction prompt/parser owners.
- Transport layer: GraphQL resolver and frontend GraphQL documents.
- UI layer: Agent detail actions.

## Migration / Refactor Sequence

1. Update requirements-aligned prompt wording:
   - Rewrite `templates/memory-compactor/agent.md`.
   - Rename compaction result-shape constant away from `OUTPUT_CONTRACT` language and update both prompt builders.
   - Update `autobyteus-ts/src/memory/index.ts` exports without compatibility alias.
2. Replace built-in bootstrap seed-only behavior:
   - Replace `seedFileIfMissing` with sync/write-from-template behavior.
   - Rename result fields from seed semantics to sync semantics.
   - Ensure only `BUILT_IN_AGENT_DEFINITIONS` entries are touched.
   - Update smoke/unit tests to verify stale overwrite for both built-ins and preservation of a non-built-in local agent folder.
3. Remove backend Duplicate/Fork:
   - Remove GraphQL input/mutation.
   - Remove service method and unused service helper.
   - Remove duplicate from provider contracts and implementations.
   - Run server typecheck/tests.
4. Remove frontend Duplicate/Fork:
   - Delete `AgentDuplicateButton.vue` and spec.
   - Remove import/render/handler from `AgentDetail.vue`.
   - Remove duplicate mutation document, store method/types/export, localization strings.
   - Regenerate or clean `generated/graphql.ts` so no duplicate operation remains.
   - Update AgentDetail tests.
5. Update docs that describe compactor JSON task wording, stale built-in prompts, or seed-only behavior.
6. Run targeted validation, then broader build/test commands listed below.

## Validation Plan

Minimum expected validation:

- `pnpm -C autobyteus-server-ts typecheck`
- `pnpm -C autobyteus-server-ts test -- built-in-agent-bootstrapper` if a source-level test is added
- `pnpm -C autobyteus-server-ts build` to run TypeScript build and built-in agent smoke check
- `pnpm -C autobyteus-web codegen` against the updated backend schema, or equivalent generated GraphQL refresh used by the project
- `pnpm -C autobyteus-web test:nuxt -- components/agents/__tests__/AgentDetail.spec.ts`
- `pnpm -C autobyteus-web test:nuxt -- stores` if store tests cover agent definitions; otherwise `pnpm -C autobyteus-web test:nuxt` if practical
- Targeted grep/static checks:
  - no `AgentDuplicateButton`
  - no `duplicateAgentDefinition`
  - no `DuplicateAgentDefinition`
  - no `COMPACTION_OUTPUT_CONTRACT`
  - generated compactor prompts do not contain prohibited internal terms from requirements

## Documentation Impact

Update durable docs that currently state:

- built-in compactor definitions are preserved and may keep old wording,
- automated compaction uses “JSON-only output contract” language,
- any docs or UI help mentioning Duplicate/Fork if found during implementation.

Known docs candidates:

- `autobyteus-ts/docs/agent_memory_design.md`
- `autobyteus-ts/docs/agent_memory_design_nodejs.md`

## Open Risks / Reviewer Focus

- Verify the bootstrapper does not overwrite any folder except `agents/<built-in id>` for ids in `BUILT_IN_AGENT_DEFINITIONS`.
- Verify Duplicate/Fork is removed across all layers, not only hidden from UI.
- Verify prompt cleanup does not weaken the required final JSON shape while file result handoff remains deferred.
- Verify no compatibility aliases are retained for removed/renamed in-scope behavior.
