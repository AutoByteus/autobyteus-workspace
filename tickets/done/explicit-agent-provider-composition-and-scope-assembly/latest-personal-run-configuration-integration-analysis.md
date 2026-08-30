# Latest Personal Run-Configuration Integration Analysis

Status: **Normative SR-008 reconciliation supplement** for latest `origin/personal` `b52fe5aebdb962ce361529f9e797affeb30d719a`. SR-008 corrects the exact frontend clean-cut inventory after ARCH-REV-007; the accepted SR-007 production architecture is unchanged. It does not authorize production edits before architecture review.

## 1. Integration Authority

| Concern | Authoritative Side | Required Combined Outcome |
| --- | --- | --- |
| current stopped Agent/Team model-configuration behavior, result schema, Studio UI/GraphQL, sequential transition semantics, model catalog validation | latest Personal | preserve exactly |
| application-run ownership lease and fail-closed Studio guard | latest Personal | preserve exactly through the outer application-platform boundary |
| process Agent Tools Host, scoped Authorities, provider factory builder, complete execution-family construction, context normalization, task identity, cleanup | reviewed ticket | preserve exactly |
| application execution lifetime and outward boundary | reviewed `ApplicationExecutionScope` | keep seven capabilities; no run-configuration or raw-manager escape |
| deleted broad `createApplicationRunServices` owner/test | reviewed scope transition | remain deleted; transplant only current behavior into the scope kernel and current tests |
| all unrelated latest-Personal paths | latest Personal | take as current base, subject to normal regression verification |

The implementation method remains one history-preserving semantic merge. Neither `ours`, `theirs`, resurrection of removed files, nor a compatibility wrapper is an acceptable conflict policy.

## 2. Supported Triggers And Product-Reachability Gate

| Premise | Independent Trigger / Contract | Forward Production Trace | Classification | Material Consequence |
| --- | --- | --- | --- | --- |
| latest Personal must be integrated | recorded base-branch refresh before delivery | delivery fetch -> merge preview -> 14 overlaps / 7 conflicts -> no integrated candidate | **Reachable** | shipping without current Personal loses approved product behavior; mechanical resolution can reopen ambient execution authority |
| user edits a stopped general Agent model configuration | Studio run history/settings UI and GraphQL mutation | UI -> GraphQL -> `StudioRunModelConfigService` -> ownership guard -> general Agent lifecycle lane -> validator -> metadata commit -> canonical result | **Reachable** | wrong owner or missing serialization can overwrite active/application-owned state or lose current settings behavior |
| user edits stopped general Team scope model configurations | Studio Team history/settings UI and GraphQL mutation | UI -> GraphQL -> Studio guard -> `TeamRunService` -> `AgentTeamRunManager` root lane -> resolve/validate all patches -> tree commit -> canonical tree | **Reachable** | wrong ordering can race restore/external-channel activation or partially update a Team tree |
| Studio attempts to read/edit a run still owned by an application binding | application launch creates binding/lookup; Studio history/config surface can address the same durable run | application binding stores -> `ApplicationRunOwnershipService` -> runtime `hostManagement.runOwnership` -> Studio guard -> active lock / zero general write | **Reachable** | without the guard, the general execution family can mutate state owned by the application execution family |
| application business/runtime code directly edits stopped-run model configuration | no application HTTP/WS/worker capability exposes this command; current application changes occur through launch overrides/bindings | no supported initiating caller reaches `AgentRunService.updateStoppedModelConfig` or `TeamRunService.updateStoppedModelConfigs` through the scope | **Not Reachable** | no new `ApplicationExecutionScope` outward capability is justified; exposing one would broaden the boundary without product benefit |
| one model validator instance must be shared for mutable state correctness | validator is stateless and delegates to the process model catalog | host-selected model catalog -> one narrow validator capability -> both execution roots | **Reachable governing construction contract**, but same-object identity is not a behavioral premise | explicit selection prevents ambient fallback; sharing one host-created instance is the simplest policy, not a new state authority |

## 3. Preserved Observable Contract

### Agent stopped-run update

1. Read canonical resume metadata in the per-run lane.
2. Return `NOT_FOUND`, `RUN_ACTIVE`, or `RUN_ARCHIVED` before validation/write when applicable.
3. Validate the selected runtime/model configuration against the current model catalog.
4. Commit only `llmConfig`; preserve every other metadata field.
5. Reread and return the canonical metadata.
6. Preserve `UPDATED`, `UNCHANGED`, `MODEL_UNAVAILABLE`, `SCHEMA_UNAVAILABLE`, `VALIDATION_FAILED`, `PERSISTENCE_FAILED`, and `PERSISTENCE_INDETERMINATE` outcomes and editability fields.
7. Serialize Save versus restore/command activation using the same run transition lane.

### Team stopped-run update

1. Enter the exact root-Team transition lane before reading state.
2. Require a current admitted V2 package; reject managed/active and archived roots.
3. Resolve every patch to one configured Team or configured Agent scope and reject duplicate, absent, or kind-mismatched addresses.
4. Validate every target before applying any patch; no partial write.
5. Replace only target `llmConfig` values, atomically write the V2 tree, reread, and return the canonical tree.
6. Preserve exact outcome/editability semantics and Save-versus-restore/external-channel ordering.

### Application-owned guard

1. Await application orchestration startup/recovery readiness.
2. Reconcile durable lookup and binding provenance; disagreement, missing binding, or mismatched run membership fails closed.
3. Treat `ATTACHED`, `TERMINATING`, and `FAILED` bindings as live ownership and `TERMINATED`/`ORPHANED` as released.
4. For live ownership, Studio reads show the existing active lock and writes return `RUN_ACTIVE` with zero general write.
5. For unreadable ownership, Studio writes return `INTERNAL_ERROR` with zero general write.
6. After release, the exact general update path remains available.

No public GraphQL, UI, run-model-config result, persisted metadata, Team-tree, binding, or application protocol representation changes in SR-007.

## 4. Ownership And Boundary Map

| Owner | Concrete Responsibility | Inputs | Exposes | Must Not Own / Expose |
| --- | --- | --- | --- | --- |
| Studio/standalone composition | select process model catalog and construct one `ModelConfigValidationService`; pass the same narrow validator to both execution roots | process model catalog | validator reference to supervisor/platform only | run state, Team lanes, binding stores |
| `ModelConfigValidationService` | schema/model availability validation and normalized config result | model catalog | `validate` | run lifecycle, persistence, application ownership |
| `GeneralProcessRunSupervisor` | assemble/own general managers/services/history readers with the exact validator | explicit provider/Authority/context/task inputs + validator | existing Agent/Team run services plus Agent resume and Team history read facades | application binding/store/scope internals |
| `ApplicationExecutionScopeKernelBuilder` | assemble application lifecycle/Team manager with the exact validator inside the existing kernel transaction | exact scope input + validator | unchanged private kernel | outward run-config capability, process managers |
| `StandaloneAgentRunLifecycleService` | Agent activation/restore and one per-run stopped-config transition lane | exact manager/stores/workspace/readiness/validator | called by owning `AgentRunService` | model catalog discovery, application ownership |
| `AgentTeamRunManager` | Root Team lifecycle, one per-root transition lane, V2 model-config mutation/commit | exact memory/factory/task identity/validator | called by owning `TeamRunService` | process/app selection, Studio guard |
| `ApplicationRunOwnershipService` | read-only binding/lookup ownership lease after startup recovery | startup gate + outer stores | `hasLiveRunOwnership` via platform host management | managers, mutation, scope internals |
| `StudioRunModelConfigService` | presentation-use-case guard and delegation to general facades | ownership reader + general resume/history/update facades | GraphQL-facing get/update methods | direct stores, managers, application scope internals |
| `ApplicationPlatformRuntime` | outer package/storage/orchestration/lifecycle owner | orchestration assembly | existing REST/realtime + read-only `hostManagement.runOwnership` | raw stores/managers, stopped-config mutation |

`ApplicationRunOwnershipService` stays outside `ApplicationExecutionScope`: its authoritative subject is durable application binding ownership, not mutable Agent/Team execution. `StudioRunModelConfigService` consumes the platform's read-only host-management boundary and the general supervisor's public run/history facades; it never depends on an application manager or store.

## 5. Exact Construction Contracts

The existing process helper still owns the nineteen provider leaves. SR-007 adds one separate, named LLM-management capability; it does not enter the provider builder.

```ts
export type RunModelConfigValidator = Pick<ModelConfigValidationService, "validate">;

// Host composition, once per maintained host process:
const modelConfigValidator = new ModelConfigValidationService(modelCatalogService);
```

Add `modelConfigValidator: RunModelConfigValidator` as a required, non-null field to:

- `GeneralProcessRunSupervisorInput`;
- `ApplicationPlatformBuildInput`;
- `ApplicationExecutionScopeBuildInput`;
- the maintained-root `AgentTeamRunManagerOptions` contract;
- the exact dependency input used to construct `StandaloneAgentRunLifecycleService`.

Both maintained hosts pass the same validator identity to the general supervisor and application platform. The platform passes it unchanged into the scope; the supervisor and kernel pass it unchanged to their Agent lifecycle and Team manager. No execution leaf calls `new ModelConfigValidationService()` or `getModelCatalogService()` on a maintained root path.

The application scope input changes from **ten top-level / eleven leaf values** to **eleven top-level / twelve leaf values**. The kernel outward result and seven scope capabilities remain unchanged.

`StandaloneAgentRunLifecycleService.modelConfigValidator` and
`AgentTeamRunManagerOptions.modelConfigValidator` become required. The lifecycle
service and Team manager contain no `new ModelConfigValidationService()`, model
catalog getter, optional validator branch, or nullish fallback. Because
`AgentRunService` must not reconstruct a lifecycle owner without that exact
validator, its maintained construction contract requires the root-created
`lifecycleService`; the process `getAgentRunService()` accessor becomes
lookup-only and fails before `GeneralProcessRunSupervisor` binds the service.
Direct service tests construct an explicit lifecycle fixture. This preserves the
existing general-process accessor surface while removing its lazy authority
selection.

`AgentTeamRunManagerOptions` remains exact for execution authority:

```ts
type AgentTeamRunManagerOptions = Readonly<{
  memoryDir: string;
  mixedTeamRunBackendFactory: MixedTeamRunBackendFactory;
  taskExecutionIdentity: TaskExecutionIdentityCapabilities;
  modelConfigValidator: RunModelConfigValidator;
  executionTreeStore?: TeamRunExecutionTreeStore;
  taskRecordsStore?: TaskDelegationRecordsV1Store;
  communicationStore?: TeamCommunicationV1Store;
}>;
```

The three stores remain legitimate owner-created defaults; the first four fields determine execution identity/authority and have no default. Process `getInstance()` remains no-argument lookup-only.

The general supervisor additionally constructs and exposes the current Personal read facades:

- `AgentRunResumeConfigService` over the exact general manager/metadata/history identities;
- `TeamRunHistoryService` over the exact general Team manager/catalog identities.

They are read/use-case facades, not raw managers. The application kernel does not construct them because no supported application caller consumes them.

## 6. Combined Data-Flow Spines

| Spine | Scope | Start | End | Governing Owner | Why |
| --- | --- | --- | --- | --- | --- |
| DS-012 | Primary | Studio stopped-Agent Save | canonical update result/UI state | `StudioRunModelConfigService` + general Agent lifecycle | ownership guard then serialized exact write |
| DS-013 | Primary | Studio stopped-Team Save | canonical V2 tree/update result | `StudioRunModelConfigService` + `AgentTeamRunManager` | all-target validation and Save/restore ordering |
| DS-014 | Primary/return | application launch/binding or Studio config read | live/released/fail-closed ownership result | `ApplicationRunOwnershipService` | prevents cross-family writes |
| DS-015 | Bounded construction | host model catalog selection | exact general/application validator leaves | host composition | no ambient model-catalog selection below roots |
| DS-016 | Return/error | ownership or persistence uncertainty | active lock / `INTERNAL_ERROR` / indeterminate result with zero unsafe write | Studio service / lifecycle owner | preserves fail-closed semantics |

Arrow traces:

- DS-012: `ExistingRunConfigEditor -> GraphQL mutation -> StudioRunModelConfigService -> ApplicationPlatformRuntime.hostManagement.runOwnership -> GeneralProcessRunSupervisor.agentRunService -> StandaloneAgentRunLifecycleService lane -> ModelConfigValidationService -> AgentRunHistoryCatalogService commit/reread -> GraphQL result -> Pinia/UI`.
- DS-013: `ExistingRunConfigEditor -> GraphQL mutation -> StudioRunModelConfigService -> runOwnership -> GeneralProcessRunSupervisor.teamRunService -> AgentTeamRunManager root lane -> TeamRunModelConfigMutator -> validator fan-out -> TeamRunExecutionTreeStore commit/reread -> GraphQL result -> Pinia/UI`.
- DS-014: `application binding launch/recovery -> lookup + binding stores -> startup gate -> ApplicationRunOwnershipService -> runtime host-management projection -> Studio guard -> active lock or general delegation`.
- DS-015: `host getModelCatalogService -> one ModelConfigValidationService -> general supervisor + application platform -> application scope -> exact Agent lifecycle/Team manager`.
- DS-016: `ownership mismatch/unreadable -> fail closed -> no general write`, and `write indeterminate -> reread canonical -> explicit result -> no speculative retry/restore`.

Existing DS-001–DS-011 remain unchanged. DS-012–DS-016 attach current Personal behavior to the accepted owners without bypassing `GeneralProcessRunSupervisor`, `ApplicationPlatformRuntime`, or `ApplicationExecutionScope`.

## 7. Dependency Directions

Allowed:

- host composition -> process model catalog -> `ModelConfigValidationService`;
- host composition -> general supervisor and application platform with the same narrow validator;
- application platform -> outer orchestration stores -> read-only ownership service;
- application platform -> application scope with required validator;
- general supervisor/application kernel -> Agent lifecycle and Team manager with the supplied validator;
- Studio composition -> platform `hostManagement.runOwnership` + general supervisor run/history facades -> `StudioRunModelConfigService`;
- GraphQL resolvers -> configured Studio run-model-config service only.

Forbidden:

- Studio config/GraphQL -> application stores, scope internals, Agent/Team managers, or model catalog directly;
- application scope outward capabilities -> stopped-run configuration commands;
- application ownership service -> any run manager or mutation;
- Agent lifecycle/Team manager -> `getModelCatalogService`, default `ModelConfigValidationService`, application ownership, or Studio API;
- process general manager/service -> application scope or binding store;
- restoration of `create-application-run-services.ts` or its broad service bag;
- generic DI/service locator, generic event bus, applicationId/runId manager router, one mode-switched builder, singleton fallback, compatibility wrapper, dual write, or source churn without an owned benefit.

## 8. Exact Conflict And Overlap Disposition

| Path | Disposition |
| --- | --- |
| `src/agent-execution/runtime/general-process-run-supervisor.ts` | semantic combine: keep ticket provider/Authority/context/task/cleanup assembly; use Personal `StandaloneAgentRunLifecycleService`; inject exact validator into Agent lifecycle and Team manager; add exact resume/history read facades; no old provider constructors/AppConfig/session-manager input |
| `src/agent-team-execution/services/agent-team-run-manager.ts` | semantic combine: preserve required memory/factory/task identity and lookup-only process instance; add Personal root-lane update algorithm and required validator; no default model validator or mixed/process fallback |
| `src/application-platform/runtime/build-application-platform-runtime.ts` | semantic combine: preserve one `ApplicationExecutionScope`; pass validator to scope; receive outer `runOwnershipService` from orchestration; expose only read-only host-management projection |
| `src/application-platform/runtime/create-application-run-services.ts` | **remain removed**; transplant lifecycle/validator construction into kernel builder |
| `tests/architecture/application-framework-boundaries.test.ts` | union latest ownership rules with current scope/provider rules; update removed-file expectations; no obsolete factory allowance |
| `tests/integration/agent-team-execution/agent-team-run-manager.integration.test.ts` | combine exact task-identity fixture with Personal stopped-update/serialization cases and explicit validator fixture |
| `tests/unit/application-platform/application-run-services.test.ts` | **remain removed**; its allocator/definition/non-global/shutdown identity proof is already owned by `application-execution-scope.test.ts`; extend current scope/kernel proof for validator identity rather than restoring the old owner |
| `src/agent-execution/backends/claude/session/claude-session.ts` | retain both already-normalized ticket input and current Personal model-config/session behavior; no context resolver or broad MCP manager returns |
| `src/agent-team-execution/services/team-run-service.ts` | retain ticket explicit manager/allocator dependencies and Personal `updateStoppedModelConfigs` delegation |
| `src/application-platform/runtime/create-application-orchestration-services.ts` | preserve sibling capability assembly; create ownership service from existing startup gate/lookup/binding stores; return it only as read-only host-management capability |
| `src/compositions/build-studio-server.ts` | preserve Host/builder/two authorities and close order; construct validator; build guarded Studio config service from runtime ownership plus general facades |
| `tests/unit/agent-execution/backends/claude/session/claude-session.test.ts` | preserve normalized-input/issuer tests and Personal current model-config behavior |
| `tests/unit/application-orchestration/application-orchestration-host-service.test.ts` | retain Personal application-binding provenance/ownership inputs plus ticket capability-only host-service construction |
| `tests/unit/application-platform/application-platform-runtime-isolation.test.ts` | preserve non-identical execution families and add ownership/validator projection proof without raw manager access |

## 9. Exact Change Inventory

### Add from latest Personal (retain as current base)

- `src/agent-execution/services/standalone-agent-run-lifecycle-service.ts` (replaces the removed activation-only file);
- `src/agent-team-execution/services/team-run-model-config-mutator.ts`;
- `src/llm-management/services/model-config-validation-service.ts`;
- `src/run-history/domain/run-model-config.ts`;
- `src/run-history/services/agent-run-model-config-commit.ts`;
- `src/run-history/services/studio-run-model-config-service.ts`;
- `src/application-orchestration/services/application-run-ownership-service.ts`;
- `src/api/graphql/types/run-model-config.ts`;
- their current Personal server/web tests and UI/store/GraphQL files.

### Modify for semantic integration

- both maintained host roots;
- `agent-run-service.ts`, `general-process-run-supervisor.ts`, `agent-team-run-manager.ts`, `team-run-service.ts`; `AgentRunService` requires the exact root-created lifecycle and its process accessor is lookup-only;
- `application-execution-scope-contracts.ts`, `application-execution-scope-kernel-builder.ts`;
- `application-platform-runtime-contracts.ts`, `build-application-platform-runtime.ts`, `create-application-orchestration-services.ts`;
- Studio API configuration/GraphQL files as introduced by Personal;
- the exact conflicted/overlapping durable files in section 8 plus the current scope/kernel/general-supervisor/standalone lifecycle tests and architecture guards.

### Rename / remove

- Personal rename `standalone-agent-run-activation-service.ts` -> `standalone-agent-run-lifecycle-service.ts` and corresponding test is retained.
- `create-application-run-services.ts` and `application-run-services.test.ts` remain removed.
- Personal's already-removed revision-based run-config model remains removed; sequential lanes are the only authority.
- The previous stopped-Team frontend representation is removed as one clean cut:
  - `autobyteus-web/components/workspace/config/__tests__/StoredTeamScopeHistoricalFields.spec.ts`;
  - `autobyteus-web/services/teamExecution/__tests__/storedTeamRunFormModel.spec.ts`;
  - `autobyteus-web/services/teamExecution/storedTeamRunFormModel.ts`;
  - `autobyteus-web/types/agent/StoredTeamRunFormModel.ts`.
- Current Personal replaces that family with `ExistingTeamRunFormModel`, `projectExistingTeamRunFormModel`, `existingTeamModelConfigDraft`, and `ExistingRunConfigEditor`; no old type/import/alias remains.
- No generated, SDK, application-package, persisted-schema, or migration file is added by SR-007 beyond latest Personal itself.

### Historical/residual assertion transfer

The deleted `StoredTeamScopeHistoricalFields.spec.ts` is not retained or
recreated. Its current requirements are allocated to current owners:

| Historical assertion | Current Owner | Exact Durable Proof |
| --- | --- | --- |
| exact persisted fields are classified once; removed keys and no-longer-enumerated values remain visible without mutating input | `historicalModelConfigFields.ts` + shared `RuntimeModelConfigFields` | `utils/__tests__/historicalModelConfigFields.spec.ts` and `components/launch-config/__tests__/RuntimeModelConfigFields.spec.ts` |
| existing configured Agent residual fields remain visible and non-editable | `ExistingTeamFormAgentNode` -> `MemberOverrideItem` | `components/workspace/config/__tests__/MemberOverrideItem.spec.ts` |
| root and nested existing Team scopes render the same representable/residual fields, hide Reset/fixed edits, emit no fixed-field mutation, and preserve source input | `ExistingTeamScopeFormModel` -> `TeamScopeConfigEditor` | modify `components/workspace/config/__tests__/TeamScopeConfigEditor.spec.ts` with current root/nested cases |
| root/member order, exact nested effective configuration, historical-only workspace display, fixed Team facts, and model-config-only editing use one current projection | `projectExistingTeamRunFormModel` + `ExistingRunConfigEditor`/`TeamRunConfigForm` | modify `components/workspace/config/__tests__/TeamRunConfigForm.spec.ts`; retain `services/runConfigEditing/__tests__/existingTeamModelConfigDraft.spec.ts` |

The deleted projector test's runtime deep-freeze assertion is not transferred:
current Personal intentionally uses recursively readonly current types plus a
separate editable draft. The preserved behavioral invariant is no mutation of
the canonical tree/source projection and model-config-only emitted edits, which
the current tests prove. Reintroducing a runtime-frozen `stored` model would be
a second representation rather than preservation.

## 10. Durable Proof Matrix

| Proof | Required Evidence |
| --- | --- |
| merge completeness | latest Personal is an ancestor of the integrated ticket; zero unmerged paths; no restored deleted factory/test; 14 overlaps audited |
| root construction | both hosts construct one validator from their exact model catalog and pass the same identity to general/application roots; omission/null/undefined fails before manager/scope mutation |
| Agent update | Personal lifecycle cases: inactive update, active reject, Save-before-restore ordering, restore-before-Save reject, validation outcomes, commit reread/indeterminate |
| Team update | Personal manager cases: configured Team/Agent target mapping, all-before-write validation, active/archive/admission rejection, exact root lane, Save/external resolver ordering |
| ownership guard | startup wait, canonical provenance during lookup rebuild, mismatch/missing fail closed, nonterminal/terminal status classification, zero general write for live/unreadable ownership |
| boundary | runtime exposes read-only ownership only; scope still exposes exactly seven capabilities; no raw manager/store/model catalog crosses outward |
| identity | the exact validator passed into each root reaches that root's Agent lifecycle and Team manager; general/application managers/task identities/Authorities remain non-identical |
| architecture | governed roots and lifecycle/manager leaves contain no default `ModelConfigValidationService`, model-catalog getter, old broad factory import, or run-configuration scope capability; `getAgentRunService()` is lookup-only; source occurrence sets fail closed |
| frontend representation | the four legacy stored-Team paths/imports are absent; current existing-run projection/editor tests cover topology, historical-only workspaces, residual fields, fixed identity, and model-config-only edits |
| regression | current provider/Authority/context/task cleanup matrix plus latest Personal server/web model-setting suite, Studio/standalone realistic runs, application ownership, recovery/reentry, external-channel concurrency, and shutdown |

## 11. Persisted Data Decision

Decision: **Directly Usable — No Migration / Not Affected by the merge reconciliation**.

Latest Personal already defines the current readers/writers for nullable `llmConfig` in Agent metadata and Team V2 trees. SR-007 changes only object-graph construction and boundary routing. Existing metadata, Team trees, application bindings/lookups, package state, provider sessions, and current UI projections remain directly usable. No compatibility read, rewrite, dual write, version branch, or new migration is permitted.

## 12. Proportionality And Rejected Alternatives

- Do not add an application run-config capability: no supported application caller exists.
- Do not move ownership into the execution scope: binding ownership is outer orchestration state.
- Do not let Studio query stores/managers directly: that bypasses both authoritative boundaries.
- Do not restore the old run-services bag/test: it reintroduces the structure this ticket deliberately removed.
- Do not create a generic lifecycle state machine: Agent and Team already have different, concrete transition owners and persistence.
- Do not add a generic validator registry/event bus/container: one narrow stateless validation service is sufficient.
- Do not unify general/application managers or sessions: the ownership guard exists precisely because they remain separate.
- Do not add aliases, singleton fallbacks, source compatibility wrappers, or a second model-config representation.
- Do not retain or recreate `StoredTeamRunFormModel` for test compatibility; current historical presentation belongs to the one `ExistingTeamRunFormModel`/draft/editor family.
