# Design Spec

## Current-State Read

The current application framework uses `ApplicationRuntimeResource*` for a public concept that is actually an app-selectable agent/team execution resource. The represented subject is clear in the data shape but not in the name:

```ts
ApplicationRuntimeResourceKind = "AGENT" | "AGENT_TEAM"
ApplicationRuntimeResourceOwner = "bundle" | "shared"
ApplicationRuntimeResourceRef
ApplicationRuntimeResourceSummary
```

Current flow:

1. Application manifests declare `resourceSlots[]`.
2. Host setup selects a concrete `resourceRef` for each slot from bundle-local or shared agent/team definitions.
3. App backend handlers use `context.runtimeControl.listAvailableResources(...)`, `getConfiguredResource(...)`, and `startRun({ resourceRef, ... })`.
4. Application orchestration resolves the selected resource with `ApplicationRuntimeResourceResolver` and launches an app-bound agent/team run.
5. Run binding summaries persist the selected `resourceRef` alongside actual runtime run details.

The problem is not behavior. The problem is that the word `runtime` is overloaded across several different subjects: backend worker runtime, runtime-control APIs, runtime provider kind, run lifecycle runtime subject, future runtime streaming, and the app-selectable agent/team resource concept. The `owner` discriminator is also inaccurate: `bundle` and `shared` describe resource source/scope, not architectural ownership.

## Intended Change

Perform a clean-cut naming refactor from **Application Runtime Resource** to **Application Execution Resource**.

Target concept:

```text
ApplicationExecutionResource
```

Target public shape:

```ts
export type ApplicationExecutionResourceKind = "AGENT" | "AGENT_TEAM";
export type ApplicationExecutionResourceSource = "bundle" | "shared";

export type ApplicationExecutionResourceRef =
  | { source: "bundle"; kind: "AGENT"; localId: string }
  | { source: "bundle"; kind: "AGENT_TEAM"; localId: string }
  | { source: "shared"; kind: "AGENT"; definitionId: string }
  | { source: "shared"; kind: "AGENT_TEAM"; definitionId: string };
```

The implementation should preserve behavior while updating public SDK types, manifest JSON, runtime-control method names, orchestration service/file names, stores, docs, tests, and first-party apps.

Runtime streaming is explicitly out of scope. Old-shape compatibility and persisted-data migration are also explicitly out of scope.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Naming Refactor / Cleanup.
- Current design issue found (`Yes`/`No`/`Unclear`): Yes.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue and Shared Structure Looseness.
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes.
- Evidence: `ApplicationRuntimeResourceKind` only permits `AGENT` and `AGENT_TEAM`; `owner` only permits `bundle` and `shared`; the concept appears in manifest slots, runtime-control methods, run binding summaries, stores, and docs. The broader `runtime` name conflicts with runtime control, runtime kind, run lifecycle, and future runtime stream concepts.
- Design response: Rename the concept to `ApplicationExecutionResource*`, rename `owner` to `source`, update public and internal boundaries consistently, and document the distinction between execution resources, runtime control, and future runtime streams.
- Refactor rationale: The app-selectable resource is an execution input to app-bound runs, not the runtime itself. Naming it as an execution resource makes the spine clear: app chooses an execution resource -> runtime control starts a run from it -> run binding records the selected execution resource.
- Intentional deferrals and residual risk, if any: No runtime streaming API is designed here. The remaining overloaded word `runtime` will still exist in legitimate places such as `runtimeControl`, launch-profile `runtimeKind`, and actual run metadata; this ticket only removes it from agent/team resource selection. Old persisted execution-resource shapes are not migrated; stale local state must be reset/reconfigured or rejected with a clear error.

## Terminology

- **Execution resource:** An agent or agent team definition that an application can select/configure and use to start an app-bound run.
- **Execution resource source:** Where the execution resource comes from: `bundle` for bundle-local definitions, `shared` for shared/global definitions.
- **Execution resource slot:** A manifest-declared app setup slot that constrains which execution resources may satisfy an application requirement.
- **Configured execution resource:** A persisted host/application setup selection for one execution resource slot.
- **Runtime control:** Backend handler capability for controlling app-bound runs. It may use execution resources, but it is not itself an execution resource.
- **Runtime stream:** Future app-safe stream of live agent/team output. Out of scope for this ticket.

## Design Reading Order

Read this design from behavior spine to rename mapping:

1. Manifest execution resource slots.
2. Host setup/configuration persistence.
3. App backend runtime-control use.
4. Orchestration resolution and run binding launch.
5. Storage stale-state handling, docs, and tests.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Remove active `ApplicationRuntimeResource*` public type names and internal class/file names.
- Do not leave permanent alias exports such as `export type ApplicationRuntimeResourceRef = ApplicationExecutionResourceRef`.
- Do not support both `owner` and `source` in active public JSON contracts after the clean-cut rename.
- No storage/data migration is allowed for old execution-resource JSON shapes. Active code must not accept, rewrite, or silently upgrade old `owner`, `resourceRef`, `resourceSlots`, or `allowedResourceOwners` shapes. Stale local state must be reset/reconfigured or fail clearly.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | App manifest execution resource slot | Host setup selected configured execution resource | Application resource setup/configuration owner | Public manifest naming is a major source of confusion. |
| DS-002 | Primary End-to-End | App backend runtime-control request to start run | App-bound agent/team run binding | Application orchestration host + run binding launch service | This is where selected execution resources become actual runs. |
| DS-003 | Bounded Local | Resolve execution resource ref | Concrete bundle/shared agent/team definition summary | Application execution resource resolver | Resolver naming must match its true subject. |
| DS-004 | Return/Event | Run binding summary/artifact/lifecycle callbacks include selected resource | App backend sees selected execution resource in binding/event payloads | Application orchestration stores/contracts | Binding/event payload naming should not leak the old runtime-resource wording. |
| DS-005 | Documentation/Positioning | Developer reads docs/types | Developer distinguishes execution resources from runtime control/streams | SDK/docs owners | Prevents future runtime-stream confusion. |

## Primary Execution Spine(s)

- DS-001 resource setup: `application.json executionResourceSlots -> application bundle manifest parser -> host setup routes/UI -> execution resource configuration service -> execution resource configuration store`
- DS-002 launch: `app backend handler -> context.runtimeControl.startRun({ executionResourceRef, ... }) -> ApplicationOrchestrationHostService -> ApplicationRunBindingLaunchService -> ApplicationExecutionResourceResolver -> AgentRunService/TeamRunService -> ApplicationRunBindingSummary`
- DS-003 resolution: `ApplicationExecutionResourceRef(source, kind, id) -> list available bundle/shared execution resources -> match source/kind/id -> ApplicationExecutionResourceSummary`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The manifest declares which execution resources an app needs. Host setup persists a selected execution resource for each slot. | Manifest slot, host setup, configuration service/store | Application execution resource configuration service | Manifest validation, setup UI labels, stale old-shape rejection. |
| DS-002 | The app backend starts a run using a selected execution resource. Orchestration resolves it and launches the right agent/team run. | Runtime-control facade, orchestration host, launch service, execution resource resolver, run binding | Application orchestration host service | Launch-profile validation, binding store, lifecycle observer attach. |
| DS-003 | The resolver lists and resolves bundle/shared agent/team definitions by explicit source/kind/identity. | Execution resource ref, resolver, bundle/shared definition services | Application execution resource resolver | Friendly names, filtering, error messages. |
| DS-004 | Run bindings and downstream events expose the selected execution resource consistently. | Binding summary, stores, event/artifact payloads | Application run binding store/contracts | Stale-state rejection/drop behavior for persisted refs and summaries. |
| DS-005 | Docs and public names teach that execution resources are selected inputs to runs, not runtime streams. | SDK contracts, docs, examples | SDK/docs owners | Release notes, generated package docs. |

## Spine Actors / Main-Line Nodes

- `ApplicationExecutionResourceSlotDeclaration` — manifest slot contract for app-selectable execution resources.
- `ApplicationExecutionResourceRef` — public identity shape for selected bundle/shared agent/team definitions.
- `ApplicationExecutionResourceConfigurationService` — validates and persists host setup selections.
- `ApplicationRuntimeControl` — backend control surface; method names should refer to execution resources where applicable.
- `ApplicationExecutionResourceResolver` — resolves refs into concrete bundle/shared resource summaries.
- `ApplicationRunBindingLaunchService` — launches bound runs from selected execution resources.
- `ApplicationRunBindingStore` — persists summaries that include selected execution resource refs.

## Ownership Map

| Node | Owns | Does Not Own |
| --- | --- | --- |
| Manifest execution resource slot | Public app setup contract for allowed execution-resource kinds/sources/defaults. | Runtime run lifecycle or stream delivery. |
| Execution resource resolver | Listing/resolving bundle/shared agent/team execution resources. | Persisting setup selections or launching runs. |
| Execution resource configuration service | Host setup validation and persisted selected execution resource per slot. | Runtime launch sequencing. |
| Runtime control | Backend-facing run/resource operations. | Frontend transport or future runtime streaming. |
| Run binding launch service | Turning a selected execution resource and launch profile into an app-bound run. | Manifest JSON parsing or host setup UX. |
| Run binding store | Persisting selected execution resource plus run metadata. | Resolving resource availability. |

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `context.runtimeControl.listAvailableExecutionResources(...)` | Application orchestration host + execution resource resolver | Backend handler convenience to discover app-usable execution resources. | Generic runtime catalog or stream state. |
| `context.runtimeControl.getConfiguredExecutionResource(...)` | Execution resource configuration service | Backend handler convenience to read setup selection. | Resource validation policy outside configuration service. |
| `context.runtimeControl.startRun(...)` | Run binding launch service + orchestration host | Start a run from selected execution resource. | Manifest/host setup concerns. |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| `ApplicationRuntimeResourceKind` | Overloaded runtime wording. | `ApplicationExecutionResourceKind` | In This Change | No alias export. |
| `ApplicationRuntimeResourceOwner` | `owner` misstates `bundle/shared` semantics. | `ApplicationExecutionResourceSource` | In This Change | Field becomes `source`. |
| `ApplicationRuntimeResourceRef` | Overloaded runtime wording and `owner` field. | `ApplicationExecutionResourceRef` | In This Change | JSON shape uses `source`. |
| `ApplicationRuntimeResourceSummary` | Same concept rename. | `ApplicationExecutionResourceSummary` | In This Change | Summary field `source`. |
| `runtime-resources.ts` | File name no longer matches target concept. | `execution-resources.ts` | In This Change | Update exports/imports. |
| `ApplicationRuntimeResourceResolver` / `application-runtime-resource-resolver.ts` | Internal owner name mirrors bad public term. | `ApplicationExecutionResourceResolver` / `application-execution-resource-resolver.ts` | In This Change | Update dependencies/tests. |
| Manifest `resourceSlots` public field | Too generic and tied to old resource wording. | `executionResourceSlots` | In This Change | Requires manifest version decision. |
| Manifest `allowedResourceOwners` | Misuses ownership. | `allowedExecutionResourceSources` or `allowedSources` | In This Change | Prefer explicit `allowedExecutionResourceSources` in public JSON. |
| Public `resourceRef` fields where subject is selected execution resource | Generic resource naming. | `executionResourceRef` | In This Change | Start input, configured resource, binding summary. |
| Runtime-control methods `listAvailableResources`, `getConfiguredResource` | Too generic under runtime control. | `listAvailableExecutionResources`, `getConfiguredExecutionResource` | In This Change | Clean-cut public API rename. |

## Return Or Event Spine(s) (If Applicable)

Run lifecycle and artifact events include `ApplicationRunBindingSummary`. After this refactor, those payloads should expose `executionResourceRef` in the binding summary. Existing event/artifact behavior remains unchanged.

## Bounded Local / Internal Spines (If Applicable)

- Parent owner: `ApplicationExecutionResourceResolver`.
  - Local spine: `list bundle resources -> list shared agents -> list shared teams -> filter by source/kind -> resolve by localId or definitionId`.
  - Why it matters: all current behavior stays here; only names and field discriminators change.
- Parent owner: `ApplicationExecutionResourceConfigurationStore`.
  - Local spine: `ensure tables -> read only new execution-resource refs -> reject or reset stale old-shape setup state -> persist only new shape`.
  - Why it matters: public JSON shape changes must not leave old/new shapes both authoritative, and old persisted shapes must not be upgraded silently.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Manifest contract replacement | DS-001 | Manifest contract owner | Decide and implement a clean public JSON replacement. | Field names change. | Hidden dual parsing creates compatibility debt. |
| Stale state rejection/reset | DS-001, DS-004 | Configuration/binding stores | Detect old refs/summaries and fail/reset/reconfigure explicitly without rewriting old shapes. | Existing local DBs may contain old JSON, but user rejected migration/backward compatibility. | Stores become hidden compatibility adapters. |
| Generated/vendor outputs | All | Package build owner | Regenerate first-party app packages and SDK dists. | Public names appear in generated packages. | Hand edits drift from source. |
| Docs/release notes | DS-005 | SDK/docs owners | Teach execution resource terminology and breaking reset/reconfigure behavior. | Public refactor affects app authors. | Developers keep using old runtime-resource language. |
| Tests | All | Validation owner | Prove behavior unchanged after rename. | Rename is broad and high-risk. | Behavior regressions hidden by search/replace. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Resource listing/resolution | Application orchestration resolver | Extend/Rename | Correct existing owner. | N/A |
| Resource setup/configuration | Application orchestration configuration service/store | Extend/Rename | Correct existing owner. | N/A |
| Manifest contract | Application SDK contracts | Extend/Rename | Public contract source. | N/A |
| Runtime stream | None in this ticket | Defer | Out of scope. | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Application SDK contracts | Public execution resource, manifest slot, configured resource, runtime-control types | DS-001 to DS-005 | App developers and server packages | Extend/Rename | Primary public API work. |
| Application orchestration | Execution resource resolver/configuration/start-run binding | DS-001 to DS-004 | Runtime-control backend owner | Extend/Rename | Behavior unchanged. |
| Application bundle/host setup | Manifest parsing and setup routes/UI | DS-001 | App host setup owner | Extend/Rename | Update routes/GraphQL if present. |
| Application storage | Configuration and run binding persistence | DS-001, DS-004 | Store owners | Extend/Reject Stale State | No old-shape migration; explicit stale-state reset/reconfigure/failure only. |
| First-party apps/packages | Manifest examples and generated packages | DS-001, DS-005 | App packages | Extend/Regenerate | Brief Studio and Socratic Math Teacher. |
| Documentation | Concept clarity and breaking-change/reset notes | DS-005 | SDK/docs owners | Extend | Explicitly distinguish runtime control/streams. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `execution-resources.ts` | SDK contracts | Execution resource public contract | Types for kind/source/ref/summary/configured resource and launch profiles. | One cohesive public concept. | N/A |
| `manifests.ts` | SDK contracts | Manifest public contract | Execution resource slot declaration and manifest version. | Existing manifest source. | Execution resource types. |
| `index.ts` | SDK contracts | Barrel/aggregate contract | Export renamed types and update runtime-control/input/binding types. | Existing public aggregation. | Execution resource types. |
| `application-execution-resource-resolver.ts` | Orchestration | Resolver | List/resolve bundle/shared execution resources. | One resolver concern. | SDK types. |
| `application-execution-resource-configuration-service.ts` | Orchestration | Configuration service | Validate slots/selections/profiles and expose views. | Existing service renamed with clearer subject. | SDK types. |
| `application-execution-resource-configuration-store.ts` | Orchestration storage | Configuration store | Persist selected execution resource refs and launch profiles; reject stale old-shape refs. | Existing store renamed with no old-shape migration. | SDK types. |
| `application-run-binding-store.ts` | Orchestration storage | Run binding store | Persist binding summaries and selected execution resource columns. | Existing binding store. | SDK types. |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Execution resource source/kind/ref types | `execution-resources.ts` | SDK contracts | Used by manifests, runtime control, configuration, binding summaries. | Yes | Yes | Kitchen-sink runtime model. |
| Old-shape execution resource ref detection | Store-local validation helpers unless reused by two stores | Application orchestration storage | Needed only to reject/reset stale old data clearly. | Yes | Yes | Compatibility migration or silent upgrader. |
| Execution resource slot validation | Configuration service | Application orchestration | Central validation for source/kind/profile. | Yes | Yes | Duplicated route/UI validation. |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `ApplicationExecutionResourceRef` | Yes: `source`, `kind`, and source-specific ID. | Yes | Low | Replace `owner` with `source`; keep source-specific union arms. |
| `ApplicationExecutionResourceSummary` | Yes | Yes | Low | Use `source`, `kind`, `localId`, `definitionId`, `name`, `applicationId`. |
| Manifest execution resource slot | Yes if field names are explicit. | Yes | Medium | Prefer `executionResourceSlots`, `allowedExecutionResourceKinds`, `allowedExecutionResourceSources`, `defaultExecutionResourceRef`. |
| Run binding summary | Yes | Yes | Medium | Replace `resourceRef` with `executionResourceRef`; avoid keeping both and do not migrate old summary JSON. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-application-sdk-contracts/src/execution-resources.ts` | SDK contracts | Execution resource public contract | `ApplicationExecutionResourceKind`, `ApplicationExecutionResourceSource`, `ApplicationExecutionResourceRef`, `ApplicationExecutionResourceSummary`, configured execution resource/profile types. | One coherent app execution-resource concept. | N/A |
| `autobyteus-application-sdk-contracts/src/manifests.ts` | SDK contracts | Manifest contract | Manifest version and `executionResourceSlots[]` contract. | Existing manifest authority. | Execution resource types. |
| `autobyteus-application-sdk-contracts/src/index.ts` | SDK contracts | Public aggregate | Renamed start-run, binding, runtime-control, and handler-context type references. | Existing aggregate. | Execution resource types. |
| `autobyteus-server-ts/src/application-orchestration/services/application-execution-resource-resolver.ts` | Orchestration | Resolver | List/resolve bundle/shared execution resources. | One resolver owner. | SDK types. |
| `autobyteus-server-ts/src/application-orchestration/services/application-execution-resource-configuration-service.ts` | Orchestration | Configuration service | Validate and expose configured execution resources. | One validation/service owner. | SDK types. |
| `autobyteus-server-ts/src/application-orchestration/services/application-execution-resource-configuration-launch-profile.ts` | Orchestration | Launch profile validation | Normalize/validate launch profiles for selected execution resources. | Existing launch-profile concern, renamed. | SDK types. |
| `autobyteus-server-ts/src/application-orchestration/stores/application-execution-resource-configuration-store.ts` | Orchestration storage | Config store | Persist selected execution resource refs and launch profiles; reject/reset stale old-shape setup state without rewriting it. | Store concern stays isolated. | SDK types. |
| `autobyteus-server-ts/src/application-orchestration/services/application-run-binding-launch-service.ts` | Orchestration | Launch service | Use `executionResourceRef` and resolver to start runs. | Existing run-launch owner. | SDK types. |
| `autobyteus-server-ts/src/application-orchestration/stores/application-run-binding-store.ts` | Orchestration storage | Binding store | Persist binding summaries and execution resource columns. | Existing binding store. | SDK types. |
| First-party app manifests and backend sources | Applications | App examples | Update manifest fields and backend runtime-control calls. | Proves clean-cut public replacement. | SDK types. |
| Docs under `autobyteus-server-ts/docs/modules` and package READMEs | Documentation | Concept docs | Explain execution resources vs runtime control/streams. | Prevent future confusion. | N/A |

## Ownership Boundaries

- SDK contracts own the public execution-resource vocabulary.
- Application orchestration owns resolving/configuring/executing selected execution resources.
- Application bundle/host setup owns manifest entry/setup surfaces, but not execution-resource resolution policy.
- Runtime control remains the backend capability that consumes execution resources; it must not be renamed into a generic execution-resource owner.
- Future runtime stream work must not depend on old runtime-resource terminology.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `ApplicationExecutionResourceRef` public type | Source-specific ID rules for bundle/shared agent/team definitions | Manifests, configs, start-run input, binding summaries | Ad hoc `{ owner, localId, definitionId }` shapes | Strengthen the union type. |
| `ApplicationExecutionResourceResolver` | Bundle/shared definition service lookups | Orchestration launch/config services | Launch service manually searching bundle/shared definitions | Extend resolver API. |
| `ApplicationExecutionResourceConfigurationService` | Slot validation, source/kind/profile checks | Host setup routes/UI and backend resource queries | Routes/stores validating resource refs independently | Strengthen service methods. |
| `ApplicationRuntimeControl` | Backend run/resource control operations | App backend handlers | Frontend directly manipulating execution-resource stores | Add backend command/SDK helper; do not bypass. |

## Dependency Rules

- SDK manifest types may depend on SDK execution-resource types.
- Orchestration services may depend on SDK execution-resource types and agent/team definition services.
- Stores may serialize execution-resource refs but must expose only new in-memory shapes and must not migrate old shapes.
- App frontend/host setup routes must use orchestration configuration/list APIs rather than resolving resources directly.
- Do not add future runtime stream dependencies to execution-resource code.
- Do not leave active source imports from `runtime-resources.ts` after the rename.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `ApplicationExecutionResourceRef` | Selected execution resource | Identify bundle/shared agent/team definition. | `source`, `kind`, and source-specific ID. | Replaces old `owner` ref. |
| `ApplicationExecutionResourceSlotDeclaration` | Manifest setup slot | Declare allowed execution-resource choices. | Slot key plus allowed kinds/sources/default ref. | Replaces old resource slot shape. |
| `runtimeControl.listAvailableExecutionResources` | Runtime-control discovery | List app-usable execution resources. | Optional `source`, `kind` filters. | Replaces `listAvailableResources`. |
| `runtimeControl.getConfiguredExecutionResource` | Runtime-control setup read | Read selected execution resource for a slot. | `slotKey`. | Replaces `getConfiguredResource`. |
| `runtimeControl.startRun` input | Run launch | Start bound run from execution resource. | `executionResourceRef`. | Behavior unchanged. |
| Host setup REST routes | Host setup | List/configure execution resources. | Application ID, slot key, execution-resource ref. | Rename routes if currently resource-generic. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `ApplicationExecutionResourceRef` | Yes | Yes | Low | Use discriminated union by `source` and `kind`. |
| Manifest execution resource slot | Yes | Yes | Low | Field names include execution-resource subject. |
| Runtime-control execution-resource methods | Yes | Yes | Low | Rename method names to execution-resource wording. |
| Stores | Yes if old shapes are rejected | Medium | Medium | Remove old-shape migration helpers; implement explicit stale-state failure/reset handling only. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| App-selectable agent/team resource | `ApplicationRuntimeResource` -> `ApplicationExecutionResource` | Proposed: Yes | Current: High | Rename public/internal concept. |
| Bundle/shared discriminator | `owner` -> `source` | Proposed: Yes | Current: Medium | Rename type and JSON field. |
| Resource slot | `resourceSlots` -> `executionResourceSlots` | Proposed: Yes | Current: Medium | Rename manifest field. |
| Runtime control methods | `listAvailableResources` -> `listAvailableExecutionResources` | Proposed: Yes | Current: Medium | Clean-cut method rename. |
| Future runtime stream | N/A | N/A | High if confused | Document out-of-scope distinction. |

## Applied Patterns (If Any)

- **Clean-cut public rename:** Replace public type/method/manifest names directly; avoid permanent aliases.
- **Stale-state rejection/reset:** Treat old stored JSON/columns as stale local state requiring reset/reconfiguration or clear failure; do not transform old shapes into new shapes.
- **Discriminated union tightening:** Keep source-specific ID arms so bundle refs use `localId` and shared refs use `definitionId`.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-application-sdk-contracts/src/execution-resources.ts` | File | SDK execution-resource contract | Public execution-resource types. | Replaces misnamed `runtime-resources.ts`. | Runtime stream types. |
| `autobyteus-server-ts/src/application-orchestration/services/application-execution-resource-resolver.ts` | File | Resolver | Resolve/list execution resources. | Orchestration owns app-bound execution setup. | Run lifecycle dispatch. |
| `autobyteus-server-ts/src/application-orchestration/services/application-execution-resource-configuration-service.ts` | File | Configuration service | Slot validation and configuration views. | Existing service concern, renamed. | Definition lookup internals outside resolver. |
| `autobyteus-server-ts/src/application-orchestration/stores/application-execution-resource-configuration-store.ts` | File | Configuration persistence | Persist selected execution-resource refs/profiles; reject stale old-shape refs. | Store concern. | Validation policy or migration logic. |
| `applications/*/application.json` | File | App manifests | Update execution resource slot fields. | First-party public examples. | Old field names after replacement. |
| Docs | Files | Documentation | Clarify terminology and breaking stale-state behavior. | Needed for downstream teams. | Runtime stream implementation details. |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `autobyteus-application-sdk-contracts/src` | Public contract | Yes | Low | Type file rename improves public concept ownership. |
| `application-orchestration/services` | Main-Line Domain-Control | Yes | Low | Resolver/config/launch services remain orchestration concerns. |
| `application-orchestration/stores` | Persistence-Provider | Yes | Medium | Old-shape detection/reset helpers must stay store-local unless two stores need one shared rejection utility; no migration helper is allowed. |
| First-party app folders | App examples | Yes | Low | Update manifests and backend usage as examples. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Execution resource ref | `{ source: "bundle", kind: "AGENT_TEAM", localId: "drafting-team" }` | `{ owner: "bundle", kind: "AGENT_TEAM", localId: "drafting-team" }` | `source` names what `bundle` means. |
| Manifest slot | `executionResourceSlots: [{ slotKey, allowedExecutionResourceKinds, allowedExecutionResourceSources }]` | `resourceSlots: [{ allowedResourceOwners }]` | Public app JSON becomes self-explanatory. |
| Runtime control | `context.runtimeControl.listAvailableExecutionResources({ source: "shared" })` | `listAvailableResources({ owner: "shared" })` | Makes runtime-control resource discovery specific. |
| Future stream | Future separate `subscribeRuntimeStream(...)` | Adding stream fields to execution resource refs | Keeps selected resource identity separate from live runtime output. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Public type aliases from old `ApplicationRuntimeResource*` to new names | Would reduce compile breakage. | Rejected | Update all source/tests/apps to new names. |
| Accept both `owner` and `source` in public or private refs | Would ease JSON/state transition. | Rejected | Old `owner` shapes must fail/reset/reconfigure; no migration or dual acceptance. |
| Keep both `resourceSlots` and `executionResourceSlots` | Would support old app manifests. | Rejected | Bump manifest contract or clean-cut update current contract; update first-party apps. |
| Keep runtime-control old method names as aliases | Would reduce backend app changes. | Rejected | Rename call sites to new method names. |
| Use this ticket to add runtime stream APIs | Could combine naming work with future feature. | Rejected | Runtime stream remains separate future ticket. |

## Derived Layering (If Useful)

- Public contract layer: SDK execution-resource and manifest types.
- Host/setup API layer: REST/GraphQL/host setup routes and UI use the new names.
- Orchestration domain-control layer: configuration service, resolver, launch service.
- Persistence layer: configuration and binding stores with stale-state rejection/reset behavior, not old-shape migration.
- Documentation/examples layer: app manifests, READMEs, module docs.

## Refactor Sequence (No Data Migration Allowed)

1. Update SDK contract source:
   - Rename `runtime-resources.ts` to `execution-resources.ts`.
   - Rename public types to `ApplicationExecutionResource*`.
   - Replace `owner` with `source` in ref/summary/filter types.
2. Update manifest contract:
   - Decide and implement manifest version bump if JSON fields change.
   - Recommended public fields: `executionResourceSlots`, `allowedExecutionResourceKinds`, `allowedExecutionResourceSources`, `defaultExecutionResourceRef`.
3. Update runtime-control public contract:
   - Rename `listAvailableResources` -> `listAvailableExecutionResources`.
   - Rename `getConfiguredResource` -> `getConfiguredExecutionResource`.
   - Rename `resourceRef` fields to `executionResourceRef` in start input/configured resource/binding summaries.
4. Rename orchestration services/files/imports:
   - `ApplicationRuntimeResourceResolver` -> `ApplicationExecutionResourceResolver`.
   - Resource configuration service/store/launch-profile files to execution-resource naming.
5. Update storage:
   - Remove any old-shape readers/rewriters for persisted configured execution-resource refs and run binding summary JSON.
   - Do not migrate `owner/resourceRef` to `source/executionResourceRef`.
   - If old local platform state is encountered, fail with a clear stale-state/reconfiguration error or route through an explicit destructive reset path.
   - Prefer new physical column names (`execution_resource_source`, `execution_resource_kind`, etc.) if practical. If SQLite column rename complexity makes physical rename risky, retained private DB column names must not imply old JSON compatibility or old-shape acceptance.
6. Update server routes/host setup API names if they expose generic resource wording:
   - Prefer `/available-execution-resources` and `/execution-resource-configurations` equivalents.
   - Update frontend host setup callers/tests.
7. Update first-party apps:
   - `applications/brief-studio/application.json`
   - `applications/socratic-math-teacher/application.json`
   - backend code that calls runtime-control resource methods or uses `resourceRef` fields.
8. Regenerate package dist/vendor outputs according to repository conventions.
9. Update docs:
   - `applications.md`
   - `application_orchestration.md`
   - `application_communication_model.md` if it references runtime resources.
   - SDK READMEs/release notes.
10. Run focused tests:
    - SDK type/build checks.
    - Application bundle manifest validation tests.
    - Application orchestration resource configuration/list/start-run tests.
    - First-party app integration/package tests.
11. Search and remove old active names:
    - `ApplicationRuntimeResource`
    - `ApplicationRuntimeResourceOwner`
    - `application-runtime-resource-resolver`
    - `allowedResourceOwners`
    - `resourceRef.owner`
    - `runtime resource` docs language, except historical tickets or explicit breaking-change notes.

## Requirement Correction: No Old-Shape Migration

API/E2E validation reported a user clarification after the original design: the user does not want backward-compatible migration behavior, including private persisted-store migration. Therefore the following implementation shapes are invalid and must be removed if present:

- reading old persisted `resource_ref_json` with `owner` and rewriting it to `source`;
- accepting old run binding `summary_json.resourceRef` and rewriting it to `executionResourceRef`;
- tests that prove old `owner` / `resourceRef` state migrates successfully;
- any public or private dual-shape parser that treats old and new execution-resource shapes as equivalent.

Allowed handling for stale old state is limited to explicit failure, destructive reset, or forcing reconfiguration. The implementation engineer must choose the least surprising existing reset/failure path and document it in the implementation handoff.

## Key Tradeoffs

- **ExecutionResource vs AgentResource:** `ExecutionResource` is slightly broader but accurately describes the role in application workflows and can still cover both agents and teams without duplicating agent/team-specific type families.
- **source vs scope:** `source` is more concrete for `bundle`/`shared`. `scope` is also plausible, but `source` better explains where the definition comes from.
- **Public API churn:** Clean naming requires breakage in SDK/manifests. This is acceptable because the ticket is explicitly a naming refactor and avoids long-term dual names.
- **DB column rename complexity:** Full physical rename is cleaner. If retained private DB column names reduce SQLite churn, they are allowed only as storage implementation detail; old JSON/API shapes must still be rejected, not migrated.

## Risks

- Broad public rename may break first-party package builds if generated/vendor outputs are not regenerated correctly.
- Manifest version changes can break old application bundles unless all installed/current bundles are updated.
- Rejecting stale stored setup/run binding data may require users/developers to reset local app platform state and reconfigure execution resources.
- Over-renaming generic “resource” words may create excessive churn. The implementation should target app execution-resource concepts, not unrelated resource words.
- If method renames are incomplete, mixed old/new language will remain and defeat the purpose of the ticket.
- If old-shape migration helpers remain, they violate the corrected requirement even if tests pass.

## Guidance For Implementation

- Treat this as a semantic refactor, not a mechanical global replace. Only rename the app-selectable agent/team execution-resource concept.
- Preserve runtime behavior exactly: same agent/team definitions, same launch profile semantics, same run binding lifecycle, same artifact behavior.
- Prefer source-level changes first, then generated outputs.
- Keep tests behavior-focused: the selected execution resource should resolve to the same agent/team as before. Add/retain tests that old persisted shapes are rejected/reset, not migrated.
- Do not add runtime stream fields, subscriptions, or websocket behavior.
- Before final handoff, include a search log proving old active names are gone or explicitly justified as historical or breaking-change documentation text.
