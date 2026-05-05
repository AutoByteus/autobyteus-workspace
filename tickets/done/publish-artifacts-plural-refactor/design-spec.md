# Design Spec

## Current-State Read

The current platform has a durable published-artifact subsystem, but the agent-facing tool API is singular-only.

Current primary path:

`Agent config/toolNames -> Runtime tool exposure -> publish_artifact adapter -> PublishedArtifactPublicationService.publishForRun -> Snapshot/projection/event/app relay -> Tool result`

Important current ownership facts:

- `PublishedArtifactPublicationService` already owns durable publication: it resolves the active/fallback run context, canonicalizes workspace paths, snapshots source files, writes published-artifact projections/revisions, emits `ARTIFACT_PERSISTED`, and relays to application handlers where applicable.
- `published-artifact-tool-contract.ts` owns the current singular tool input shape `{ path, description? }` and tool name constant.
- Native AutoByteus, Codex, and Claude each have adapter-specific exposure code, but they should not own artifact persistence policy.
- Built-in Brief Studio and Socratic Math prompts/configs teach `publish_artifact`; their committed generated/importable packages copy those strings.
- Tool discovery/selection surfaces read from the default registry. Once singular registration is removed and plural registration is added, these surfaces should naturally show only `publish_artifacts` for artifact publication.

Constraints the target design must respect:

- Keep durable published-artifact storage/event/application contracts unchanged.
- Use `publish_artifacts({ artifacts: [...] })` as the canonical and only artifact-publication tool API.
- Avoid duplicated runtime-specific schema and batch-publication logic.
- Do not keep backward compatibility for `publish_artifact`.

## Intended Change

Replace `publish_artifact` with `publish_artifacts` everywhere the platform registers, exposes, allowlists, discovers, selects, documents, or tests artifact publication.

The plural tool accepts a required `artifacts` array; each item has `path` and optional `description`. Single-file publication uses a one-item array. The plural tool delegates all item persistence to the existing published-artifact publication owner.

The singular `publish_artifact` name is removed from runtime tool registration, Codex dynamic tool exposure, Claude MCP/allowed-tools exposure, shared contract constants/types/normalizers, built-in app prompts/configs/generated packages, and tests. Old/custom configs that still contain only `publish_artifact` receive no artifact-publication tool.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Refactor / API cleanup with strict plural batch capability.
- Current design issue found (`Yes`/`No`/`Unclear`): Yes.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Legacy Or Compatibility Pressure, with secondary duplicated-coordination risk if runtime adapters implement batching separately.
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes.
- Evidence: `publish_artifacts` has zero current matches; `publish_artifact` is encoded in shared contract, native/Codex/Claude exposure, built-in app configs/prompts, generated packages, discovery surfaces via registry listing, and tests. The user clarified no backward compatibility should be kept.
- Design response: Create one canonical plural contract and batch execution path; update all built-ins to plural; remove singular registration/exposure/allowlisting/discovery entirely.
- Refactor rationale: A simple search/replace would miss runtime-specific schema/exposure and discovery behavior. Adding plural while retaining singular would preserve the tool-choice confusion and violate the user's no-backward-compatibility clarification.
- Intentional deferrals and residual risk, if any: No singular runtime support is deferred. Residual risk is that old/custom agent configs must be manually migrated by their owners.

## Terminology

- `Published artifact`: durable file publication created from a workspace path and optional description.
- `Canonical tool`: the supported agent-facing tool name/shape: `publish_artifacts`.
- `Runtime adapter`: native AutoByteus, Codex dynamic tool, or Claude MCP tool exposure code.

## Design Reading Order

1. data-flow spine
2. subsystem / capability-area allocation
3. draft file responsibilities -> extract reusable owned structures -> finalize file responsibilities
4. folder/path mapping

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: remove the singular `publish_artifact` agent tool from registration, exposure, allowlists, discoverability, built-in configs/prompts, and tests.
- Obsolete path in scope: every built-in/runtime/test reference that teaches or exposes `publish_artifact`.
- No deferred singular runtime support remains in this design.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-PAP-001 | Primary End-to-End | Agent configured with `publish_artifacts` | Durable published-artifact summary/revision + runtime event | `PublishedArtifactPublicationService` | Main canonical publication path across runtimes. |
| DS-PAP-002 | Primary End-to-End | Built-in app source prompt/config | Runtime tool exposure for imported app agents | Application package build + agent-definition loading | Ensures built-in agents teach/request plural, including committed importable packages. |
| DS-PAP-003 | Primary End-to-End | Agent/tool discovery request | Plural-only artifact-publication tool availability | Tool registry + runtime exposure | Ensures `publish_artifact` is absent, not hidden behind a retained runtime path. |
| DS-PAP-004 | Return-Event | `PublishedArtifactPublicationService` persisted item | Runtime stream/app relay/tool result | `PublishedArtifactPublicationService` | Publication side effects and result shape must remain consistent per item. |
| DS-PAP-005 | Bounded Local | Normalized plural `artifacts[]` list | Ordered `PublishedArtifactSummary[]` | `PublishedArtifactPublicationService.publishManyForRun` | Batch loop must be owned once, not copied into every runtime adapter. |

## Primary Execution Spine(s)

Canonical plural publication:

`Agent toolNames -> Configured tool exposure -> Runtime adapter (native/Codex/Claude) -> Shared publish_artifacts contract normalizer -> PublishedArtifactPublicationService.publishManyForRun -> publishForRun per item -> Snapshot/projection/event/app relay`

Built-in app migration:

`Application source prompts/configs -> Application package build -> Importable package files -> AgentDefinition toolNames/instructions -> Runtime exposure -> publish_artifacts`

Singular removal:

`Tool registry/startup + runtime exposure + app prompts/configs/tests -> remove publish_artifact references -> only publish_artifacts remains available`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-PAP-001 | A configured agent receives a runtime-specific tool named `publish_artifacts`; the adapter validates the plural input through the shared contract and delegates ordered publication to the existing durable service. | Agent config, runtime adapter, shared contract, publication service, snapshot/projection stores | `PublishedArtifactPublicationService` for durable effects; shared contract for schema | Runtime-specific schemas, fallback runtime context, result text formatting |
| DS-PAP-002 | Built-in app source files stop teaching singular; package build copies those updates into importable artifacts so runtime-loaded agents request the plural tool. | App source, package builder, importable package, agent definition loader | Application package build/source ownership | Generated dist consistency, config integration tests |
| DS-PAP-003 | Startup/register/discovery/runtime code no longer contains an artifact-publication tool named `publish_artifact`; old configs that name it are treated like configs naming an unavailable tool. | Tool registry, configured tool exposure, runtime bootstrappers, discovery APIs | Tool registry and runtime exposure owners | Absence tests, old config skip behavior |
| DS-PAP-004 | Each item that persists emits the same `ARTIFACT_PERSISTED` and app relay as today; plural tool returns summaries in the same order as input items. | Publication service, stores, run event emitter, app relay, tool result | `PublishedArtifactPublicationService` | Result shaping for plural tool |
| DS-PAP-005 | Batch processing is an internal ordered loop on a normalized item list; validation happens before the loop where possible, then each item uses the existing single-item publication. | Normalized item list, publishMany loop, publishForRun | `PublishedArtifactPublicationService.publishManyForRun` | Partial-success caveat if later item fails after earlier persistence |

## Spine Actors / Main-Line Nodes

- `AgentDefinition.toolNames`: source of configured runtime tools.
- `ConfiguredAgentToolExposure`: shared resolver for optional runtime tool exposure; it detects `publish_artifacts` only.
- Native AutoByteus tool registry path: creates local tool instances by registered name; `publish_artifact` is not registered.
- Codex dynamic tool registration: exposes runtime dynamic tool schema/handler for `publish_artifacts` only.
- Claude MCP tool definition/server: exposes runtime MCP schema/handler and allowed tool names for `publish_artifacts` only.
- `published-artifact-tool-contract.ts`: shared plural name, item/input types, input normalizer, description.
- `PublishedArtifactPublicationService`: durable publication owner.
- Application package source/build outputs: built-in prompt/config ownership.
- Tool discovery/listing surfaces: show registry contents; singular is absent because it is not registered.

## Ownership Map

| Node | Owns |
| --- | --- |
| `AgentDefinition.toolNames` | Configured tool names requested by an agent definition. It should not own aliasing or migration policy. |
| `ConfiguredAgentToolExposure` | Shared derivation of optional runtime tool exposure for plural `publish_artifacts`. |
| Native/Codex/Claude runtime adapters | Runtime-specific schema publication, handler binding, allowed tool names, and result formatting. They do not own artifact persistence rules. |
| `published-artifact-tool-contract.ts` | Canonical plural tool name, description, item/input types, validation/normalization. |
| `PublishedArtifactPublicationService` | Durable artifact publication and ordered batch execution over normalized items. |
| Tool registry/discovery | Which tools are registered/discoverable/selectable. The singular tool is absent. |
| Application package source/build | Built-in prompts/configs and generated package consistency. |

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| Native `PublishArtifactsTool` | `PublishedArtifactPublicationService` | AutoByteus local tool entrypoint. | Snapshot/projection/event policy. |
| Codex dynamic tool handler | `PublishedArtifactPublicationService` | Codex app-server dynamic tool entrypoint. | Contract variants beyond shared normalizer. |
| Claude MCP tool handler | `PublishedArtifactPublicationService` | Claude Agent SDK MCP tool entrypoint. | Contract variants beyond shared normalizer. |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| `publish_artifact` tool name constant and singular input normalizer/type | Canonical API is plural-only. | `publish_artifacts` constants and plural input normalizer/type in `published-artifact-tool-contract.ts`. | In This Change | No alias. |
| Native `publish_artifact` tool registration/file responsibility | Native runtime must register only plural. | `publish-artifacts-tool.ts` canonical native tool. | In This Change | Rename/replace existing file; register only plural. |
| Codex `publish_artifact` dynamic tool registration | Codex must expose only plural. | Plural dynamic registration. | In This Change | Dynamic spec name is `publish_artifacts`. |
| Claude `publish_artifact` MCP definition/server/allowed-tools names | Claude must expose/allowlist only plural. | Plural MCP tool definition and `mcp__autobyteus_published_artifacts__publish_artifacts`. | In This Change | Remove singular allowed names. |
| `publishArtifactConfigured` singular exposure semantics | Shared exposure should detect plural only. | `publishArtifactsConfigured` or equivalent plural field. | In This Change | Do not add singular fallback fields. |
| Built-in `toolNames: ["publish_artifact"]` | Built-ins should use canonical plural API. | `publish_artifacts` in source and generated app configs. | In This Change | Brief Studio and Socratic Math. |
| Built-in prompt/guidance references to `publish_artifact` | Prompts must teach one canonical mental model. | One-item `publish_artifacts({ artifacts: [...] })` examples. | In This Change | Include source and generated package copies via build. |
| Singular service-level error wording | Domain service should not encode the removed tool name. | Tool-neutral published-artifact path errors. | In This Change | Tool contract errors may name `publish_artifacts`. |
| Tests expecting singular behavior | Tests must validate plural-only behavior. | Plural tests and singular-absence tests. | In This Change | Generic renderer example should be changed too. |

## Return Or Event Spine(s) (If Applicable)

Canonical plural return/event flow per item:

`publishForRun item persistence -> ARTIFACT_PERSISTED run event / fallback notifier -> optional app relay -> PublishedArtifactSummary -> publish_artifacts result artifacts[]`

The durable event payload stays the existing `PublishedArtifactSummary`; only the tool-call result wrapper changes from old single `artifact` to plural `artifacts[]`.

## Bounded Local / Internal Spines (If Applicable)

Parent owner: `PublishedArtifactPublicationService`

`Normalized PublishArtifactsToolArtifactInput[] -> publishManyForRun ordered loop -> publishForRun(item 1..n) -> PublishedArtifactSummary[]`

Why it matters: without this bounded local owner, native/Codex/Claude adapters would each implement their own batch loop and error semantics. The batch loop should be shared once.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Runtime fallback context resolution | DS-PAP-001 | Native AutoByteus tool adapter | Preserve team-member runtime fallback publication context. | Native tool has extra context unavailable to Codex/Claude. | Publication service would need know native tool internals. |
| Result text formatting | DS-PAP-001 | Runtime adapters | Wrap summaries in runtime-compatible text/JSON result. | Runtime protocols differ. | Durable service would become adapter-aware. |
| Application package build refresh | DS-PAP-002 | Application package source/build | Copy source prompt/config updates into committed importable packages. | Tests and imports use committed dist outputs. | Source and package outputs drift. |
| Test fixture/tool-call naming | DS-PAP-001..005 | Test suites | Update expected names/schema and add singular-absence tests. | Prevents tests from teaching old API accidentally. | Singular references persist invisibly. |
| Discovery absence checks | DS-PAP-003 | Tool registry/discovery | Verify singular is absent from normal registry/listing surfaces. | Clean-cut removal must be visible to new users. | A stale singular registration could reappear unnoticed. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Durable publication | `services/published-artifacts` | Extend | Existing owner already handles snapshots/projections/events. | N/A |
| Tool contract normalization | `published-artifact-tool-contract.ts` | Extend/replace | Existing shared contract file is the right place for names and validators. | N/A |
| Native tool registration | `agent-tools/published-artifacts` | Replace singular with plural | Existing local tool category and loader already exist. | N/A |
| Codex dynamic exposure | `agent-execution/backends/codex/published-artifacts` | Replace singular with plural | Existing adapter path already isolates Codex dynamic tool behavior. | N/A |
| Claude MCP exposure | `agent-execution/backends/claude/published-artifacts` | Replace singular with plural | Existing adapter path already isolates Claude MCP behavior. | N/A |
| Tool discovery | Existing registry-backed GraphQL/tool surfaces | Reuse | Once singular registration is removed, existing registry listing should only show plural. | N/A |
| Application prompt/config source | Application package folders | Reuse/update | Existing package build copies source to dist. | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Published-artifacts service | Plural contract types; batch publication; durable persistence | DS-PAP-001, DS-PAP-004, DS-PAP-005 | `PublishedArtifactPublicationService` | Extend | No data schema migration. |
| Runtime tool exposure | Native/Codex/Claude plural tool schemas and handlers | DS-PAP-001, DS-PAP-003 | Runtime adapters | Replace singular with plural | Adapters call shared normalizer/service. |
| Agent configured-tool exposure | Plural-only optional exposure detection | DS-PAP-001, DS-PAP-003 | `ConfiguredAgentToolExposure` | Replace singular field | No singular alias/fallback. |
| Tool discovery | Registry-backed plural-only listing | DS-PAP-003 | Tool management/discovery APIs | Reuse | Singular absent because not registered. |
| Built-in applications | Prompt/config guidance and generated packages | DS-PAP-002 | App source/build | Extend | Run both app build scripts. |
| Tests | Contract/exposure/app-package coverage | All | Test suites | Extend | Include plural behavior and singular absence. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `published-artifact-tool-contract.ts` | Published-artifacts service | Tool contract | Plural tool name, description, item/input types, plural normalizer. | One contract owner for all runtime adapters. | N/A |
| `published-artifact-publication-service.ts` | Published-artifacts service | Durable publication owner | Add `publishManyForRun` ordered batch loop; keep `publishForRun`. | Batch belongs beside single durable publication. | Yes: normalized item type. |
| `publish-artifacts-tool.ts` | Native runtime tools | Canonical native tool | Native AutoByteus `publish_artifacts` schema/execute/result. | Canonical tool deserves plural-named file. | Yes: contract/service. |
| `register-published-artifact-tools.ts` | Native runtime tools | Tool group loader | Register canonical plural only. | Existing group loader remains. | Yes |
| `build-codex-publish-artifacts-dynamic-tool-registration.ts` | Codex adapter | Codex dynamic tool | Build plural dynamic tool registration. | Adapter-specific schema/result. | Yes |
| `build-claude-publish-artifacts-tool-definition.ts` | Claude adapter | Claude MCP tool | Build plural Claude tool definition. | Adapter-specific zod schema/result. | Yes |
| `build-claude-published-artifacts-mcp-server.ts` | Claude adapter | Claude MCP server | Build MCP server containing plural artifact tool. | Server wiring separate from tool definition. | Yes |
| `configured-agent-tool-exposure.ts` | Shared runtime exposure | Exposure resolver | Track plural artifact tool configuration only. | Existing owner of optional runtime tool exposure. | Yes: contract constants. |
| App prompt/config files | Built-in apps | Source package authoring | Replace singular instructions/configs with plural. | Existing files own app behavior guidance. | N/A |
| Tests | Validation | Test suites | Update expectations and add batch/singular-absence tests. | Existing suite boundaries. | Yes |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Artifact item `{ path, description? }` | `published-artifact-tool-contract.ts` | Published-artifacts service | Used by plural native/Codex/Claude schemas. | Yes | Yes | Rich artifact metadata DTO. |
| Plural input validation | `published-artifact-tool-contract.ts` | Published-artifacts service | Must be identical across runtimes. | Yes | Yes | Runtime-specific schema drift. |
| Plural tool name | `published-artifact-tool-contract.ts` | Published-artifacts service | Avoid string literals across exposure code/tests. | Yes | Yes | Hidden duplicated constants. |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `PublishArtifactsToolArtifactInput` | Yes | Yes | Low | Contains only `path` and optional `description`. |
| `PublishArtifactsToolInput` | Yes | Yes | Low | Contains only `artifacts`. No top-level single-item fields. |
| `ConfiguredAgentToolExposure` plural artifact field | Yes | Yes | Low | Use `publishArtifactsConfigured` or equivalent plural name only. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/services/published-artifacts/published-artifact-tool-contract.ts` | Published-artifacts service | Tool contract boundary | Plural name, description, item/input types, normalizer. | Single contract source for all adapters. | N/A |
| `autobyteus-server-ts/src/services/published-artifacts/published-artifact-publication-service.ts` | Published-artifacts service | Durable publication owner | `publishForRun` and `publishManyForRun`. | Batch is a small owned extension of publication. | Yes |
| `autobyteus-server-ts/src/agent-tools/published-artifacts/publish-artifacts-tool.ts` | Native tools | Canonical native tool | Register/execute `publish_artifacts`, build `ParameterSchema` with `artifacts` array. | Clean plural file responsibility. | Yes |
| `autobyteus-server-ts/src/agent-tools/published-artifacts/register-published-artifact-tools.ts` | Native tools | Tool group loader | Register plural only. | Existing group entrypoint. | Yes |
| `autobyteus-server-ts/src/agent-execution/shared/configured-agent-tool-exposure.ts` | Runtime exposure | Shared exposure resolver | Normalize configured names and detect plural artifact tool only. | Existing shared owner. | Yes |
| `autobyteus-server-ts/src/agent-execution/backends/codex/published-artifacts/build-codex-publish-artifacts-dynamic-tool-registration.ts` | Codex adapter | Dynamic tool adapter | Build plural dynamic registration and handler. | Runtime-specific adapter. | Yes |
| `autobyteus-server-ts/src/agent-execution/backends/claude/published-artifacts/build-claude-publish-artifacts-tool-definition.ts` | Claude adapter | MCP tool adapter | Build plural tool definition and handler. | Runtime-specific adapter. | Yes |
| `autobyteus-server-ts/src/agent-execution/backends/claude/published-artifacts/build-claude-published-artifacts-mcp-server.ts` | Claude adapter | MCP server adapter | Build server with plural artifact tool. | Runtime-specific server wiring. | Yes |
| Application source/config files | Built-in apps | App guidance | Teach/request `publish_artifacts`. | Existing files own app prompts. | N/A |
| Generated app dist files | Built-in app packages | Generated output | Match source after app builds. | Committed package artifact. | N/A |
| Existing affected tests | Tests | Validation | Update names/schema/result expectations; add singular absence tests. | Existing suite boundaries. | Yes |

## Ownership Boundaries

- `PublishedArtifactPublicationService` remains the authoritative boundary for durable artifact writes. No runtime adapter may manually snapshot files, write projections, emit artifact events, or relay application artifact events.
- `published-artifact-tool-contract.ts` is the authoritative boundary for the agent-facing plural tool shape. Runtime adapters may render that shape as native `ParameterSchema`, JSON schema, or zod, but they must not invent incompatible fields.
- `ConfiguredAgentToolExposure` owns shared optional exposure decisions for Codex/Claude and must only detect the plural tool.
- Tool registration owns what exists. Discovery surfaces should not need singular-specific filtering because the singular tool is not registered.
- Built-in application source owns prompts/configs; committed package output must be generated from source rather than hand-diverging.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `PublishedArtifactPublicationService` | Snapshot store, projection store, run event emission, app relay | Native/Codex/Claude handlers | Runtime handler writes projection or emits `ARTIFACT_PERSISTED` directly. | Add service method (`publishManyForRun`). |
| `published-artifact-tool-contract.ts` | Input item validation, allowed keys, plural tool constant | Runtime adapter schemas/tests | Adapter defines its own allowed fields or singular alias. | Extend shared plural contract. |
| `ConfiguredAgentToolExposure` | Configured tool-name normalization, plural exposure detection | Codex/Claude bootstrap/tooling | Bootstrapper separately checks old singular string literals. | Add/use plural exposure field. |
| `register-published-artifact-tools.ts` | Registered artifact-publication local tools | Startup and registry-backed discovery | Register both singular and plural. | Register plural only. |

## Dependency Rules

Allowed:

- Runtime adapters may import shared published-artifact contract constants/normalizers and call `PublishedArtifactPublicationService`.
- `PublishedArtifactPublicationService.publishManyForRun` may call `publishForRun` sequentially.
- Tool discovery resolvers/tools may list registry contents and should naturally show the plural tool only.
- App package builds may copy updated source prompts/configs into dist.

Forbidden:

- Runtime adapters must not duplicate snapshot/projection/event persistence.
- Built-in prompts/configs must not mention `publish_artifact` after migration.
- Do not register, expose, allowlist, discover, select, alias, or translate `publish_artifact`.
- Do not add singular input types, singular normalizers, singular constants, or singular runtime adapter branches.
- Do not add old rich artifact metadata fields back into the agent-facing contract.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `publish_artifacts({ artifacts })` | Published artifact publication request | Canonical agent tool command | `artifacts: Array<{ path: string; description?: string | null }>` | One-item array for single artifact. |
| `PublishedArtifactPublicationService.publishManyForRun({ runId, artifacts, fallbackRuntimeContext? })` | Run published artifacts | Ordered batch durable publication | `runId + artifacts[]` | Returns summaries in input order. |
| `PublishedArtifactPublicationService.publishForRun({ runId, path, description, fallbackRuntimeContext? })` | One run published artifact | Existing single-item durable publication | `runId + path` | Kept for internal/item use and existing service callers. |
| `ConfiguredAgentToolExposure.publishArtifactsConfigured` or equivalent | Runtime exposure | Plural artifact tool exposure | `boolean` derived only from `publish_artifacts` | No singular fallback. |
| `availableToolNames` / `tools` / `toolsGroupedByCategory` / `list_available_tools` | Tool discovery | Discoverable/selectable tools | Registry definitions | Singular absent because not registered. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `publish_artifacts` | Yes | Yes | Low | Required top-level `artifacts` array only. |
| `publishManyForRun` | Yes | Yes | Low | Batch of the same subject, not mixed artifact types. |
| `ConfiguredAgentToolExposure` plural artifact field | Yes | Yes | Low | Use plural name and plural constant only. |
| Registry/discovery surfaces | Yes | Yes | Low | Verify singular is not registered/listed. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Canonical tool | `publish_artifacts` | Yes | Low | Use everywhere new/built-in/runtime. |
| Removed tool | `publish_artifact` | Historically yes, now obsolete | High | Remove registration/exposure/references. |
| Batch service method | `publishManyForRun` or `publishArtifactsForRun` | Yes | Low | Prefer a name that clearly returns many summaries for one run. |
| Contract item type | `PublishArtifactsToolArtifactInput` | Yes | Low | Keep item shape tight. |
| Exposure field | `publishArtifactsConfigured` | Yes | Low | Avoid old singular `publishArtifactConfigured`. |

## Applied Patterns (If Any)

- Adapter: native/Codex/Claude tool definitions adapt one shared plural contract to runtime-specific tool schema/result protocols.
- Facade: native and runtime dynamic/MCP tools are thin facades over the durable publication service.
- Clean-cut replacement: old singular entrypoints are removed instead of wrapped or aliased.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/services/published-artifacts/` | Folder | Published-artifacts service | Tool contract + durable publication service. | Existing capability area. | Runtime-specific schema plumbing. |
| `.../published-artifact-tool-contract.ts` | File | Tool contract | Plural name, description, normalizer. | Existing contract owner. | Singular constants/normalizers; persistence side effects. |
| `.../published-artifact-publication-service.ts` | File | Durable publication | Single and batch publication. | Existing durable owner. | Runtime tool schema definitions; tool-name-specific errors. |
| `autobyteus-server-ts/src/agent-tools/published-artifacts/` | Folder | Native tool registry | AutoByteus local plural tool. | Existing native tool group. | Singular tool registration. |
| `.../publish-artifacts-tool.ts` | File | Canonical native tool | Native plural tool class/register function. | Plural file matches canonical tool. | Singular support. |
| `.../register-published-artifact-tools.ts` | File | Tool group loader | Register plural only. | Existing startup loader target. | Business logic or singular registration. |
| `autobyteus-server-ts/src/agent-execution/backends/codex/published-artifacts/` | Folder | Codex adapter | Codex plural dynamic tool registration. | Existing adapter folder. | Durable persistence logic; singular dynamic tool. |
| `autobyteus-server-ts/src/agent-execution/backends/claude/published-artifacts/` | Folder | Claude adapter | Claude plural MCP tool/server. | Existing adapter folder. | Durable persistence logic; singular allowed tool. |
| `autobyteus-server-ts/src/agent-execution/shared/configured-agent-tool-exposure.ts` | File | Shared exposure | Optional plural tool exposure resolution. | Existing shared owner. | Runtime-specific MCP/dynamic schemas; singular fallback. |
| `applications/brief-studio/...` | Files | Built-in app source/package | Plural configs/prompts/guidance. | Existing app ownership. | Runtime implementation logic. |
| `applications/socratic-math-teacher/...` | Files | Built-in app source/package | Plural configs/prompts/guidance. | Existing app ownership. | Runtime implementation logic. |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `services/published-artifacts` | Main-Line Domain-Control + persistence-adjacent service | Yes | Low | Already owns published artifact domain behavior. |
| `agent-tools/published-artifacts` | Transport/adapter for native tools | Yes | Low | Separate native entrypoint from service. |
| `codex/published-artifacts` | Transport adapter | Yes | Low | Runtime-specific dynamic tool only. |
| `claude/published-artifacts` | Transport adapter | Yes | Low | Runtime-specific MCP tool only. |
| Application package folders | Mixed justified | Yes | Low | App source intentionally includes prompts/configs/backend launch guidance. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Single publication | `publish_artifacts({ artifacts: [{ path: "/workspace/brief-studio/research.md", description: "Research checkpoint" }] })` | `publish_artifact({ path: "/workspace/brief-studio/research.md" })` | Shows one-item array is the only supported mental model. |
| Batch publication | `publish_artifacts({ artifacts: [{ path: "a.md" }, { path: "b.md", description: "Final" }] })` | Calling plural twice for a natural batch or adding top-level `path`. | Shows why plural exists and keeps schema uniform. |
| Runtime exposure | Config has `publish_artifacts` -> expose `publish_artifacts`; config has only `publish_artifact` -> expose no artifact-publication tool. | Mapping old singular to plural behind the scenes. | Prevents hidden backward compatibility. |
| Contract placement | Shared plural normalizer used by native/Codex/Claude. | Three separate validators with slightly different allowed fields. | Prevents drift. |
| Registry | Register only `publish_artifacts`. | Register singular and try to hide it later. | Discovery should reflect clean-cut removal. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Expose both singular and plural to every agent | Easiest implementation after adding plural. | Rejected | Register/expose/allowlist only plural. |
| Map configured `publish_artifact` to `publish_artifacts` silently | Would reduce breakage for old configs. | Rejected | Old configs must be updated; singular names get no artifact-publication tool. |
| Keep singular in built-in prompts/configs | Avoid app prompt edits. | Rejected | Update built-ins and generated packages to plural now. |
| Make plural accept both `{ path }` and `{ artifacts }` | Smooth input migration. | Rejected | Plural schema is strict; top-level `path` is invalid. |
| Keep singular discoverable or hidden in registry | Would preserve a fallback path. | Rejected | Singular is not registered. |
| Re-add old rich artifact fields | Some older payloads might have used them. | Rejected | File path + optional description remains the only item contract. |

## Derived Layering (If Useful)

- Agent/application authoring layer: prompts and `agent-config.json` request `publish_artifacts`.
- Runtime adapter layer: native/Codex/Claude expose the plural tool and format results.
- Contract layer: shared published-artifact tool contract validates input and supplies the plural constant.
- Domain/service layer: `PublishedArtifactPublicationService` writes durable artifacts and emits events.
- Discovery layer: registry-backed tool-management surfaces show registered plural tool only.

## Migration / Refactor Sequence

1. Replace `published-artifact-tool-contract.ts` with canonical plural constants/types/normalizer only.
2. Add `publishManyForRun` to `PublishedArtifactPublicationService`; validate normalized artifacts before looping where possible, then call `publishForRun` in order. Keep service error wording tool-neutral where changed.
3. Replace native `publish-artifact-tool.ts` with `publish-artifacts-tool.ts` or update/rename responsibility so it registers and executes only `publish_artifacts` with an `artifacts` array schema and `{ success, artifacts }` result.
4. Update `register-published-artifact-tools.ts` to register only the plural tool.
5. Update shared configured-tool exposure to detect only `publish_artifacts` and expose a plural field/name. Remove singular field semantics.
6. Update Codex dynamic tool registration to build only the plural `publish_artifacts` registration and use shared normalizer/service.
7. Update Claude MCP/tooling options/server builder to allow/build only `publish_artifacts` and `mcp__autobyteus_published_artifacts__publish_artifacts`.
8. Remove singular imports, file references, and allowed-tool string literals from runtime code.
9. Update Brief Studio and Socratic Math source configs/prompts/backend launch guidance to `publish_artifacts` one-item array examples.
10. Run `pnpm -C applications/brief-studio build` and `pnpm -C applications/socratic-math-teacher build` to refresh committed generated package outputs.
11. Update tests: native plural tool tests, service batch tests, exposure gating tests, Codex/Claude tests, app package config tests, registry/discovery singular-absence tests, old-config no-tool tests, and generic renderer test string.
12. Run targeted validation: affected server unit tests, app package integration test, app builds, server typecheck/build as feasible, and any environment-gated integration tests if available.

## Key Tradeoffs

- Clean-cut removal vs old config breakage: user clarified no backward compatibility, so old/custom configs must be updated rather than supported by aliases or wrappers.
- Batch atomicity: adding all-or-nothing rollback would complicate the durable artifact service beyond the user request. The design uses ordered sequential publication and documents partial-success risk.
- File renames vs smaller diffs: plural-named files improve responsibility clarity but require import/test updates. This is worthwhile because old singular file names would preserve naming drift.
- Discovery filtering vs registry removal: registry removal is simpler and stronger for this task. Filtering is not used as a substitute for singular removal.

## Risks

- A missed generated package copy could leave application import tests failing or imported apps teaching old API.
- A missed runtime adapter could make plural work in one backend but not another.
- A stale singular registration/import could leave `publish_artifact` discoverable or exposed despite the clean-cut goal.
- Old/custom configs that are not migrated will lose artifact-publication capability.
- Sequential batch partial-success behavior must be clear in tests/handoff.

## Guidance For Implementation

- Do not hand-code artifact persistence in runtime adapters; call the shared service.
- Prefer importing the plural tool name constant from `published-artifact-tool-contract.ts` instead of string literals.
- Delete or rename singular-owned files/imports; do not add a singular wrapper/alias.
- Ensure plural input rejects unknown top-level and item fields; old rich fields must remain invalid.
- Update tests and app generated outputs in the same implementation commit; a passing source-only state is not sufficient.
- After implementation, run at minimum:
  - `pnpm -C autobyteus-server-ts vitest run tests/unit/agent-tools/published-artifacts/... tests/unit/services/published-artifacts/... tests/unit/agent-execution/shared/configured-agent-tool-exposure.test.ts tests/unit/agent-execution/backends/codex/backend/codex-thread-bootstrapper.test.ts tests/unit/agent-execution/backends/claude/session/claude-session-tool-gating.test.ts tests/unit/agent-tools/tool-management/list-available-tools.test.ts`
  - `pnpm -C autobyteus-server-ts vitest run tests/integration/application-backend/brief-studio-team-config.integration.test.ts`
  - `pnpm -C applications/brief-studio build`
  - `pnpm -C applications/socratic-math-teacher build`
  - `pnpm -C autobyteus-server-ts typecheck` or `pnpm -C autobyteus-server-ts build` if time/environment allows.
