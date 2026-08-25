# Latest-Base Refresh Round 5 — Personal v1.4.58 Integration Design Analysis

## Status And Authority

Implemented `SR-010` revision of the `SR-009` supplement that governed integration of protected ticket checkpoint `c6d74710ad30b680f853fba0e90a68255f112955` with `origin/personal@fb1335867a4223b2499e4513f58c609b6ac33ab4` (`v1.4.58`). The history-preserving merge and reviewed source correction are now present on the ticket branch; the original pre-merge measurements below remain the durable integration evidence.

This supplement is normative for the v1.4.58 delta. `SR-010` resolves `ARCH-REV-009` / `AR-006` by making the baseline, effective, application SDK wire, and Personal service mappings exact and identical across artifacts; no approved behavior or implementation scope changes. Earlier supplements remain authoritative for already-integrated lifecycle, graph-local execution, physical scope, provider/model, controlled workspace, dual-host, and package behavior. Personal v1.4.58 is authoritative for hierarchical Team launch, current TeamRun execution-tree V2, and its forward-only migration. The verified feature remains authoritative for application-package defaults, sparse host overrides, explicit application construction, two-host parity, scoped Agent Tools/publication, and clean generated-output ownership.

## Measured Integration Surface

| Fact | Evidence-backed result |
| --- | --- |
| Protected ticket checkpoint | `c6d74710ad30b680f853fba0e90a68255f112955` |
| Prior integrated Personal | `8a4c3868c7c54a46991f45be22a68151076412b1` |
| Reviewed Personal target | `fb1335867a4223b2499e4513f58c609b6ac33ab4` |
| Personal advance | 38 commits, 633 paths |
| Divergence from merge base | Personal 38 / ticket 160 |
| Changed on both branches | 50 paths |
| Content conflicts | 13 |
| Modify/delete conflicts | 30 generated or packaged outputs |
| Textually auto-merged changed-both paths | 7 |
| Historical preview state | Not started at design time; zero unmerged paths |

Canonical evidence:

- `latest-base-refresh-round-5-conflict-report.md`
- `evidence/delivery/dr-010-base-refresh-and-integration.log`
- `evidence/solution/latest-base-refresh-round-5-merge-preview.log`
- `evidence/solution/latest-base-refresh-round-5-conflict-inventory.txt`
- `evidence/solution/latest-base-refresh-round-5-overlap-inventory.txt`
- `evidence/solution/latest-base-refresh-round-5-path-inventory.txt`

## Root-Cause And Design-Health Decision

- Change posture: semantic latest-base integration of an already-completed large feature.
- Root-cause classification: `Shared Structure Looseness` at the application Team launch contract plus `Persisted-Data Transition` at TeamRun execution-tree V2.
- Refactor needed now: yes, but bounded to the application launch projection/adapter and Personal's current TeamRun V2 integration. A broad application-platform redesign is not justified.
- Why a local conflict edit is insufficient: the current application effective configuration retains only leaf Agents, while Personal V2 requires one complete effective default for every configured Team and one complete snapshot for every configured Agent. Inventing Team defaults inside the run-binding service would duplicate package/override precedence and make dynamic Team agents use hidden values.
- Why this is not a rewrite: Personal already owns Team topology planning, exact Team/Agent coverage, validation-before-identity allocation, V2 persistence, history, and migration. The application framework only needs to carry its already-authoritative resolved Team-scope values to that owner.

## Governing Behavior And Reachability Matrix

| Premise | Independent supported trigger / contract | Forward path | Classification | Material consequence / design result |
| --- | --- | --- | --- | --- |
| An application starts a nested Team resource | Maintained/custom application calls `requireRunnable` then `startAgentTeam`; application-owned team graphs may be recursive | package definitions -> launch resolver -> backend SDK -> run-binding service -> Team topology planner | Reachable | Every Team scope and leaf must reach the planner as a complete effective value; a leaf-only projection is insufficient. |
| A Team creates a dynamic task Agent later | Current Personal Dynamic AgentTeam behavior consumes containing TeamRun defaults | persisted V2 Team default -> task creation -> Agent launch | Reachable | Readiness must validate Team-scope runtime/model/credentials, not only currently configured leaves. |
| Studio overlays application defaults | Existing application setup Save/Reset flow | package/selected baseline -> sparse host slot/member overlay -> effective configuration | Reachable | Host team-wide fields overlay every Team scope and leaf; exact member fields overlay only that Agent leaf. No UI-side precedence. |
| A historical V1 TeamRun is opened/restored | Ordinary startup with pre-v1.4.58 Team history | migration runner -> V1 validator -> coordinator reconstruction -> V2 write -> current catalog | Reachable | V1 knowledge stays migration-only; current readers are V2-only. |
| A pre-physical-scope nested Agent memory tree also exists | Existing SR-005 direct/skip-version upgrade | V1 promotion -> memory-layout migration -> V2 migration | Reachable | Migration order is fixed; V2 reconstruction must not run before nested memory placement is current. |
| Runtime memory migrations inspect stored TeamRuns before live managers exist | Shared startup migration phase | runtime memory classifier -> stored execution-tree location service -> current package/tree | Reachable | Preserve a narrow stored-only V2 location-service factory; do not fall back to process-global `AgentTeamRunManager`. |
| Maintained package output is rebuilt | `pnpm build` / devkit `pack` | canonical source -> generated backend/UI/vendor/importable package | Reachable | Resolve source contracts once; keep the 30 derived conflicts deleted and regenerate for verification rather than hand-merging or recommitting them. |
| Studio opens editable or stored Team settings | Existing launch form and history Settings | current definitions/draft or immutable V2 view -> shared form hierarchy | Reachable | Accept Personal's editable/stored capability split, exact stored values, and hierarchical controls while retaining controlled workspace and provider-granular selection behavior. |

## Target Ownership

| Owner | Owns in the combined target | Forbidden dependency / shortcut |
| --- | --- | --- |
| `ApplicationLaunchResourceBaselineBuilder` | Definition traversal; package/selected Team-scope and Agent-leaf baseline values plus provenance | No runtime allocation, provider discovery, host persistence, or UI policy |
| `ApplicationLaunchConfigurationService` | Package/selected baseline, sparse host overlay, effective configuration, package/host issue classification, preview/Save/Reset/readiness | No TeamRun creation and no definition traversal in Studio |
| `ApplicationLaunchHostCapabilityValidator` and current-model/credential adapters | Host resolvability for every effective Team scope and Agent leaf, fresh per-selection model results | No application-owned provider catalog, runtime-only cache, or silent fallback |
| Backend SDK launch builders | Lossless translation from one runnable application effective configuration into SDK launch input | No definition traversal, precedence reconstruction, or inferred coordinator fallback |
| `ApplicationRunBindingLaunchService` | Resource/binding launch boundary, exact current-model revalidation, conversion to TeamRun service inputs, binding persistence after run creation | No global services, no root/Agent identity pre-allocation, no invented Team defaults |
| Personal `TeamRunService` + `TeamDefinitionTopologyPlanner` | Exact Team/Agent coverage, workspace activation, validation-before-allocation, topology compilation, run creation/catalog recording | No application package/override policy and no optional application construction fallback |
| Personal V2 migration + `TeamRunPackageCatalog` | V1-to-V2 transformation, atomic commit/reread, current-package admission | No V1 branch in current runtime/history/GraphQL |
| `AppDataMigrationRunner` | Ordered shared startup execution/ledger/retry for both hosts | No second application-specific runner |
| Personal Team form model/presentation | Editable hierarchical intent and immutable stored V2 inspection through explicit capabilities | No application launch precedence or persisted-history reconstruction from current definitions |
| Devkit packer | Generated backend/UI/vendor/importable output | Generated output is not maintained source authority |

## Tight Application Launch Contract

### Baseline and effective shapes

The application SDK contract adds Team scope values only to the `AGENT_TEAM` variant; it does not make a mostly-optional common structure.

```ts
type ApplicationResolvedTeamLaunchBaselineScope = Readonly<{
  teamAddress: string; // canonical rooted address; root is "/"
  displayName: string;
  teamDefinitionId: string;
  runtimeKind: string | null;
  llmModelIdentifier: string | null;
  llmConfig: Record<string, unknown> | null;
  provenance: Readonly<{
    runtimeKind: ApplicationLaunchDefinitionValueSource | null;
    llmModelIdentifier: ApplicationLaunchDefinitionValueSource | null;
    llmConfig: ApplicationLaunchDefinitionValueSource | null;
  }>;
}>;

type ApplicationEffectiveTeamLaunchProfile = Readonly<{
  teamAddress: string;
  displayName: string;
  teamDefinitionId: string;
  runtimeKind: string;
  llmModelIdentifier: string;
  llmConfig: Record<string, unknown> | null;
  workspaceRootPath: string;
  provenance: Readonly<{
    runtimeKind: ApplicationLaunchValueSource;
    llmModelIdentifier: ApplicationLaunchValueSource;
    llmConfig: ApplicationLaunchValueSource | null;
    workspaceRootPath: "HOST_OVERRIDE" | "APPLICATION_RUNTIME";
  }>;
}>;

type ApplicationEffectiveTeamLaunchConfiguration = Readonly<{
  slotKey: string;
  executionResourceRef: ApplicationExecutionResourceRef;
  resourceDefinitionId: string;
  resourceKind: "AGENT_TEAM";
  teamScopes: readonly ApplicationEffectiveTeamLaunchProfile[];
  leaves: readonly ApplicationEffectiveLeafLaunchProfile[];
}>;
```

The exact names, field sets, nullability, and diagnostic-versus-wire mapping above are normative. Agent configuration has no Team scopes; Team configuration has complete Team scopes and complete Agent leaves; baseline fields may be incomplete; runnable fields may not.

### Package precedence

Application packages retain their approved application-owned definition precedence, deliberately specialized above Personal's generic Team authoring surface:

- Team scope: current application-owned Team definition default -> nearest outer application-owned Team defaults.
- Agent leaf: innermost application-owned Team default -> outer Team defaults nearest-first -> leaf Agent default.
- Host effective overlay: exact host member override -> host slot/team override -> selected-resource definition-derived baseline.
- `llmConfig` remains atomic and only survives when its layer is compatible with the effective runtime/model.

This does not change Personal's ordinary Studio Team form rule that an embedded definition does not silently seed a generic Team launch. The specialization is confined to self-contained application-package baseline resolution, where the user already approved application-owned agent/team definition defaults. Both paths converge before the shared `TeamRunService` as complete Team/Agent inputs.

### Maintained package baseline

Brief and Socratic root `team-config.json` files gain portable `defaultLaunchConfig` values:

```json
{
  "defaultLaunchConfig": {
    "runtimeKind": "codex_app_server",
    "llmModelIdentifier": "gpt-5.6-luna"
  }
}
```

Existing leaf Agent defaults remain the same. Package validation rejects a standalone-capable Team resource if any effective Team scope or Agent leaf lacks runtime/model. Credentials, endpoints, secrets, and workspace paths remain host-owned and forbidden in package defaults.

### Launch input

The `memberConfigs` branch becomes one exact complete topology configuration rather than root-only Team default plus leaves:

```ts
type ApplicationTeamScopeLaunchConfig = Readonly<{
  teamAddress: string;
  llmModelIdentifier: string;
  autoExecuteTools: boolean;
  skillAccessMode: ApplicationSkillAccessMode;
  workspaceRootPath: string;
  llmConfig?: Record<string, unknown> | null;
  runtimeKind: string;
}>;

type ApplicationTeamMemberLaunchConfig = Readonly<{
  memberAddress: string;
  displayName: string;
  agentDefinitionId: string;
  llmModelIdentifier: string;
  autoExecuteTools: boolean;
  skillAccessMode: ApplicationSkillAccessMode;
  workspaceRootPath: string;
  llmConfig?: Record<string, unknown> | null;
  runtimeKind: string;
}>;

type ApplicationTeamRunLaunch =
  | Readonly<{
      kind: "AGENT_TEAM";
      mode: "preset";
      launchPreset: ApplicationTeamRunPreset;
    }>
  | Readonly<{
      kind: "AGENT_TEAM";
      mode: "memberConfigs";
      teamConfigs: readonly ApplicationTeamScopeLaunchConfig[];
      memberConfigs: readonly ApplicationTeamMemberLaunchConfig[];
    }>;
```

`teamDefaultConfig` is not retained beside `teamConfigs`; that would create two root authorities. The preset branch remains the explicit compact/root-inherited path used by generic/root-only callers. The application backend SDK emits the complete `teamConfigs` and `memberConfigs` from the authoritative effective configuration.

`ApplicationTeamRunLaunch` contains neither `teamDefinitionId` nor `applicationBinding`: `executionResourceRef` identifies the selected Team and the server creates the application binding from the launch request. The exact mapping is:

| Effective field / host policy | Application SDK wire | Personal service input | Classification |
| --- | --- | --- | --- |
| Team `teamAddress` | `ApplicationTeamScopeLaunchConfig.teamAddress` | `TeamRunTeamConfigInput.teamAddress` | Rooted identity; carried end to end |
| Team runtime/model, atomic `llmConfig`, resolved `workspaceRootPath` | Same fields on `ApplicationTeamScopeLaunchConfig`; null config may be omitted after clone | Same fields on `TeamRunTeamConfigInput`; absent config normalizes to null | Required launch semantics; never inferred downstream |
| Team `displayName`, `teamDefinitionId`, field provenance | Not emitted | Not emitted | Diagnostic/evaluation-only; retained in configuration/readiness views |
| Leaf address/display/definition/runtime/model/config/workspace | Same fields on `ApplicationTeamMemberLaunchConfig` | Run binding drops only `displayName`; remaining fields map to `TeamRunMemberConfigInput` | Launch semantics plus application-wire diagnostic label |
| Leaf field provenance | Not emitted | Not emitted | Diagnostic/evaluation-only |
| Existing host policy `autoExecuteTools=true`, `skillAccessMode=PRELOADED_ONLY` | Added by `buildEffectiveTeamRunLaunch` to every scope/member | Carried unchanged | Explicit mapping-owner policy, not inference |

The backend builder requires every effective scope/member workspace to be nonblank, trims it, structured-clones non-null `llmConfig`, and does not recompute definitions, precedence, runtime, model, workspace, or provenance. The run-binding service may normalize runtime/nullability only; it cannot invent an omitted value.


## Data-Flow Spines

### DS-018 — Application Team package/readiness spine

`application-owned Team/Agent definitions -> ApplicationLaunchResourceBaselineBuilder (Team scopes + leaves + provenance) -> ApplicationLaunchConfigurationService sparse overlay -> current model/host capability validation for every scope and leaf -> RUNNABLE or explicit issue -> backend SDK complete topology launch input`

Governing owner: `ApplicationLaunchConfigurationService` with its baseline and validation concerns. Meaningful outcome: a Team launch contains no hidden/inferred runtime/model value.

### DS-019 — Application Team creation spine

`application business command -> requireRunnable -> backend SDK -> ApplicationRunBindingLaunchService -> TeamRunService.createTeamRun({teamConfigs, memberConfigs, applicationBinding}) -> TeamDefinitionTopologyPlanner exact coverage/validation -> Team/Agent identity allocation -> AgentTeamRunManager -> V2 execution tree + binding/history`

Return/event spine:

`V2 configured Agent nodes -> application binding members (rooted memberAddress + exact agentRunId) -> input/events/publication -> application projection`

No execution is created at application-platform construction; only a later business launch traverses this spine.

### DS-020 — Historical TeamRun transition spine

`AppDataMigrationRunner -> TeamRunExecutionTreeV1 migration -> TeamAgentMemoryLayout migration -> TeamRunExecutionTreeV2 migration -> atomic writer/reread -> TeamRunPackageCatalog rebuild/admission -> V2-only history/restore/runtime readers`

The V2 migration copies each Team's direct coordinator launch snapshot as that historical Team default, preserves `applicationBinding`, handoffs, tasks, identities, and Agent snapshots, and fails closed on invalid/ambiguous input. Current runtime never reads V1.

### DS-021 — Stored memory classification spine

`startup snapshot migration -> RuntimeMemoryLocationClassifier -> stored-only TeamRunExecutionTreeLocationService -> V2 TeamExecutionIndex physical scope -> canonical Agent memory path -> snapshot migration`

The stored-only service is a named narrow construction variant, not a compatibility reader and not a generic service locator.

### DS-022 — Studio editable/stored form spine

`RunConfigPanel-owned controlled workspace + Team launch draft/current catalogs -> editable Team form model -> root/nested Team/Agent controls -> complete replacement -> readiness/launch`

and

`persisted V2 tree -> immutable TeamRunConfigurationView -> stored form model -> same presentation with stored-only capability -> exact disabled historical values`

Provider rows/snapshots/settled discovery remain owned by the existing provider store/composables. Stored mode never fabricates editable intent or consults current definitions to replace persisted topology.

### DS-023 — Package regeneration spine

`canonical SDK/application source -> SDK/devkit builds -> devkit pack -> temporary generated backend/UI/vendor/importable package -> validate + exact package parity -> cleanup generated working output`

The 30 modify/delete paths remain absent from maintained source. Verification regenerates them; it does not hand-merge or recommit them as parallel authority.

## Exact Conflict Disposition

### Thirteen content conflicts

| Path | Combined resolution |
| --- | --- |
| `autobyteus-application-backend-sdk/src/launch-profile.ts` | Keep the ticket's effective-configuration builders and host-managed skill behavior; extend Team output to required `teamConfigs` plus `memberConfigs`. Do not restore Personal's older configured-resource resolver or root-only `teamDefaultConfig` authority. |
| `autobyteus-application-backend-sdk/tests/application-agent-target-address.test.ts` | Preserve exact `agentRunId` target authorization and no logical-member fallback; accept Personal's clearer AgentRun wording/input correction. Add complete Team launch contract tests separately. |
| `autobyteus-server-ts/src/agent-memory/services/runtime-memory-location-classifier.ts` | Use Personal V2 runtime value directly; preserve ticket stored-only execution-tree location construction so startup classification cannot consult the process-global manager. |
| `autobyteus-server-ts/src/application-orchestration/services/application-run-binding-launch-service.ts` | Keep all ticket dependencies required and current-model policy injected. Preset uses `createTeamRunFromRootConfig`; complete topology input validates every Team/Agent selection then calls `createTeamRun`. Remove explicit root ID allocation; planner owns allocation after validation. |
| `autobyteus-server-ts/src/run-history/services/team-run-execution-tree-location-service.ts` | Adopt Personal V2 node type and `TeamRunPackageCatalog`; retain the named `STORED_TEAM_RUNS_ONLY` construction and exported stored-only factory. No V1/current union. |
| `autobyteus-server-ts/src/server-runtime.ts` | Keep current ticket Studio builder, application lifecycle pre-listen/recovery, prerequisite unwind, host stop, and fatal semantics. Replace V1 catalog/status with Personal `TeamRunPackageCatalog`/V2 status and preserve readable-provider gate plus all current ordered phases. |
| `autobyteus-server-ts/tests/integration/application-backend/application-context-capabilities.integration.test.ts` | Keep current four-projection engine/orchestration capability path, `requireRunnable`, current-model policy, exact target/address/event contracts, and graph-local dependencies. Update Team launch input and execution-tree fixtures to complete Team/Agent configs and V2 node shape; do not restore Personal's retired host service/configuration paths. |
| `autobyteus-server-ts/tests/unit/application-orchestration/application-run-binding-launch-service.test.ts` | Combine current required dependencies/current-model failure-before-side-effect assertions with Personal validation-before-allocation and hierarchical Team/Agent coverage. Assert direct `createTeamRun`, preset expansion, no explicit allocation, and exact application binding. |
| `autobyteus-server-ts/tests/unit/server-runtime-app-data-migration-gate.test.ts` | Retain current ticket builder/lifecycle/unwind/readable-provider proof; update TeamRun gate/catalog expectations to V2 and add exact V1 -> memory -> V2 ordering/current-admission cases. Do not restore Personal's pre-composition singleton server. |
| `autobyteus-web/components/workspace/config/MemberOverrideItem.vue` | Accept Personal's editable/stored `TeamFormAgentNode`, stored exact-value rendering, hierarchy/accessibility, and retry behavior. Preserve the ticket nullable-runtime boundary by passing `effectiveRuntimeKind ?? ''` to string-only helpers/emits. |
| `autobyteus-web/components/workspace/config/__tests__/AgentRunConfigForm.spec.ts` | Combine Personal stored/history/form contract with the ticket's controlled workspace and provider-granular callable snapshot/settlement fixture. |
| `autobyteus-web/components/workspace/config/__tests__/MemberOverrideItem.spec.ts` | Use Personal editable/stored node fixtures and exact historical assertions while retaining inherited/unavailable provider behavior and null-runtime coverage. |
| `autobyteus-web/components/workspace/config/__tests__/TeamRunConfigForm.spec.ts` | Combine Personal root/nested Team/Agent hierarchy and stored-mode assertions with controlled workspace relay and provider-granular callable snapshot/settlement fixtures. |

### Thirty modify/delete conflicts

All 30 paths listed in `evidence/solution/latest-base-refresh-round-5-conflict-inventory.txt` stay deleted from maintained source. They are SDK `dist`, maintained-application backend vendor, UI vendor declaration/map, and importable-package outputs. The current source and official build/pack pipelines absorb the new contract; derived outputs are regenerated only for build/validation/parity evidence and cleaned before final source integrity review.

### Seven textually auto-merged overlaps

| Path | Mandatory semantic audit |
| --- | --- |
| `autobyteus-application-devkit/templates/basic/application.json` | Preserve current manifest/default template and accept Personal contract-compatible Team launch example; no hidden generated source. |
| `autobyteus-application-devkit/tests/application-devkit.test.mjs` | Retain atomic package/parity/default validation and add Team-scope completeness/package contract proof. |
| `autobyteus-application-sdk-contracts/README.md` | Document complete Team scopes + leaves and preset/root-inherited distinction using one current contract only. |
| `autobyteus-application-sdk-contracts/src/index.ts` | Merge v6 exact application identity/URL/event contracts with required `ApplicationTeamScopeLaunchConfig` and non-redundant `teamConfigs`. |
| `autobyteus-server-ts/src/agent-team-execution/services/agent-team-run-manager.ts` | Accept Personal V2 tree/runtime behavior while preserving current application graph-local manager injection, lifecycle, cleanup, and publication identities. |
| `autobyteus-server-ts/tests/integration/application-backend/brief-studio-imported-package.integration.test.ts` | Preserve real imported-package/application binding behavior and update V2 Team defaults/Agent snapshots without weakening Codex/Luna and package immutability proof. |
| `autobyteus-web/components/launch-config/RuntimeModelConfigFields.vue` | Accept Personal historical stored-value warning/rendering, but retain ticket nullable-runtime call: `ensureModelsForRuntime(resolveEffectiveScopedRuntimeKind(effectiveRuntimeKind.value))`. |

## Construction And Dependency Contract

Application construction adds one explicit `TeamRunIdentityAllocator` for the graph-local `TeamRunService`. The existing `AgentRunIdentityAllocator`, Team definition service, manager, catalog, workspace manager, memory location, and token readiness remain explicitly injected. The reusable general-process `TeamRunService` may retain named defaults in general assembly; application construction must satisfy the architecture omission rule for the new Team allocator as well.

Allowed direction:

`application assembly -> explicit graph-local TeamRunService dependencies -> TeamRunService -> topology planner/manager/catalog`

Forbidden:

- application run-binding -> `TeamRunIdentityAllocator` directly;
- application run-binding -> `AgentTeamRunManager` or definition traversal;
- application SDK/UI -> Team topology planner;
- application construction omitting Team allocator and activating reusable process defaults;
- request-time process-global service lookup;
- a second topology/preference resolver in the backend SDK or web.

## Persisted-Data Decision Matrix

| Persisted subject | Decision | Treatment |
| --- | --- | --- |
| Application launch override rows | `Directly Usable — No Migration` | Existing rooted sparse rows remain read-only on read and explicit Save/Reset on write. The new Team-scope projection is recomputed from definitions + row; no row seeding/rewrite. |
| Provider credentials, model identifiers, workspace rows | `Directly Usable — No Migration` | Preserve current Personal readers/owners and exact values. |
| Current V2 TeamRun packages | `Directly Usable — No Migration` | Exact V2 reader admits them idempotently. |
| Existing V1 TeamRun packages | `Migration Required` | Personal V2 migration reconstructs each Team default from its direct coordinator snapshot and atomically writes exact V2 before current readers. |
| Old flat nested Team Agent memory | `Migration Required` | Existing SR-005 memory-layout migration runs before V2; no runtime dual read. |
| Generated SDK/vendor/importable output | `Discard or Rebuild` | Rebuild deterministically from source for verification; do not preserve as maintained authority. |
| Editable web draft state | `Not Persisted / Not Affected` | Personal hierarchy is current transient authoring state; no data migration. |

Migration order is normative:

1. TeamRun execution-tree V1 promotion.
2. Team Agent physical-memory layout migration.
3. TeamRun execution-tree V2 migration.
4. Later snapshot/history/token/current migrations according to existing prerequisites.
5. `TeamRunPackageCatalog` rebuild and strict V2 admission.
6. Application platform preparation/readiness.

A V2 migration `SUCCEEDED_WITH_WARNINGS`, missing, or failed status preserves Personal's current strict-admission warning policy; the catalog still admits only exact current packages. The readable-provider migration remains a separate hard startup gate. The host's existing prerequisite unwind and fatal contract remain unchanged.

## Add / Modify / Remove Inventory

### Add from Personal

Accept Personal's current Team launch/V2 owners and focused tests, including:

- `team-run-identity-allocator.ts`
- `team-definition-topology-planner.ts` and its current tests
- `team-run-execution-tree-v2-app-data-migration.ts` and tests
- V1 migration-only schema/types/builder/mutator/index files
- `team-run-package-catalog.ts` and tests (rename from V1 catalog)
- hierarchical Team form model/resolver/components/utilities and focused tests
- hierarchical GraphQL/runtime/production-upgrade coverage

The full addition list is the `A`/rename portion of `evidence/solution/latest-base-refresh-round-5-path-inventory.txt`.

### Modify for the semantic junction

- `autobyteus-application-sdk-contracts/src/execution-resources.ts`
- `autobyteus-application-sdk-contracts/src/index.ts`
- `autobyteus-application-sdk-contracts/README.md`
- `autobyteus-application-backend-sdk/src/launch-profile.ts`
- `autobyteus-server-ts/src/application-platform/launch-configuration/application-launch-resource-baseline-builder.ts`
- `autobyteus-server-ts/src/application-platform/launch-configuration/application-launch-override-overlay.ts`
- `autobyteus-server-ts/src/application-platform/launch-configuration/application-launch-configuration-service.ts`
- `autobyteus-server-ts/src/application-platform/launch-configuration/application-standalone-package-validator.ts`
- `autobyteus-server-ts/src/application-platform/launch-configuration/application-launch-host-capability-validator.ts`
- `autobyteus-server-ts/src/application-platform/launch-configuration/application-current-model-selection-guard.ts`
- `autobyteus-server-ts/src/application-platform/runtime/application-runtime-definition-validator.ts`
- `autobyteus-server-ts/src/application-orchestration/services/application-run-binding-launch-service.ts`
- `autobyteus-server-ts/src/application-platform/runtime/create-application-run-services.ts`
- `autobyteus-server-ts/src/agent-memory/services/runtime-memory-location-classifier.ts`
- `autobyteus-server-ts/src/run-history/services/team-run-execution-tree-location-service.ts`
- `autobyteus-server-ts/src/server-runtime.ts`
- Brief and Socratic root `team-config.json`
- the 13 conflicted durable-test/component paths and 7 auto-merged overlap paths above
- application architecture omission test/fixture table for explicit Team allocator construction
- focused application baseline/overlay/validator/backend-SDK/package/V2 tests implied by AC-030–AC-035

Implementation may modify directly coupled current Personal types/tests named by the 633-path inventory, but must record each additional path and tie it to this exact contract; no new owner or behavior is implicit.

### Remove / keep removed

- Personal `TeamRunV1PackageCatalog` path after rename.
- Personal-obsolete flat Team form helper/tree files removed by v1.4.58.
- All 30 generated modify/delete conflict paths.
- No `teamDefaultConfig` compatibility field beside application `teamConfigs`.
- No V1/V2 current runtime union, old-schema reader, compatibility alias, inferred coordinator fallback in live launch, or generated-output source authority.

## Refactor / Integration Sequence

1. Re-fetch and require exact reviewed Personal ref. If it moved, stop before merge and return for renewed analysis.
2. Preserve checkpoint and all delivery/review-owned dirty artifacts; perform one history-preserving merge.
3. Resolve/accept Personal Team topology/V2/migration/history source first, including the V1 -> memory -> V2 registry order and current package catalog.
4. Tighten SDK application launch types to Team scopes + leaves; remove `teamDefaultConfig` dual authority.
5. Extend application baseline/overlay/readiness/package validation with Team scopes and add maintained root Team Codex/Luna defaults.
6. Adapt backend SDK and run-binding service to exact `teamConfigs`/`memberConfigs`; inject the Team identity allocator explicitly and remove application-side identity allocation.
7. Resolve stored-only V2 location/classifier and Studio lifecycle/server migration conflict without restoring process globals or old server composition.
8. Accept Personal hierarchical/stored web architecture; apply only the controlled-workspace/provider/null-runtime junction corrections.
9. Keep 30 generated paths deleted; build SDK/devkit, pack both applications into disposable output, validate, compare parity, and clean outputs.
10. Run focused source/tests, then source review, API/E2E coverage investigation/execution, proportional durable-test review, and delivery latest-base/Electron verification.

## Verification Matrix

| Area | Required evidence |
| --- | --- |
| Git/inventory | exact target ancestry; 13/13 content, 30/30 modify-delete, 50/50 changed-both dispositions; clean index/markers; protected checkpoint retained |
| SDK/contracts | Agent vs Team discriminated shapes; Team scope/rooted identity; complete `teamConfigs` + `memberConfigs`; no `teamDefaultConfig` dual field; exact v6 identity/URL/event contracts |
| Package defaults | Brief/Socratic root Team + every effective leaf resolve Codex/Luna; incomplete Team scope fails pack/validate; secret/endpoint/path rejection retained |
| Precedence/overlay | nested application Team defaults/provenance, outer inheritance, leaf fallback, host slot overlay across scopes/leaves, exact member overlay leaf-only, atomic LLM config |
| Readiness/providers | every Team scope and leaf validated; two dynamic sources retain fresh per-selection lookup; missing Team runtime/model/credential fails before Save/upsert/run allocation |
| Run creation | exact Team/Agent coverage; validation before all Team/Agent allocation; planner-owned root/nested IDs; binding members from V2 configured Agents; preset root inheritance retained |
| V2/migration | current V2 create/persist/query/restore; V1 direct/skip/fresh; direct-coordinator reconstruction; applicationBinding preservation; V1 -> memory -> V2 order; strict admission/failure/retry |
| Stored memory | stored-only classifier has no global manager lookup; V2 physical-scope paths; snapshot migration remains current |
| Web | root/nested Team/Agent editable hierarchy; stored exact V2 values; controlled workspace preservation; provider-granular settlement; unavailable/historical model warning; nullable runtime |
| Dual-host | real Brief and Socratic Codex/Luna Studio/standalone launch, Agent Tools handoff/publication/projection, recovery/restart/remount, cleanup, route separation |
| Packaging | SDK/devkit builds, both pack/validate/start paths, exact package parity, no tracked generated resurrection |
| Product | current Personal hierarchical GraphQL/runtime/history/migration suites; current provider/workspace suites; Electron v1.4.58 build/smoke on the same integrated commit |

## Explicitly Rejected Alternatives

- Take Personal wholesale for conflicted application/server tests/services: rejects the verified dual-host/current boundaries.
- Keep the current leaf-only application effective shape and infer Team defaults from a coordinator at live launch: duplicates policy and makes dynamic Agents depend on hidden fallback.
- Keep both `teamDefaultConfig` and `teamConfigs`: overlapping root authorities.
- Flatten application package behavior to a single root Team default: discards already-approved application-owned nested Team precedence.
- Let embedded Team defaults change Personal's generic Team launch UI: unnecessary cross-scope behavior change; application package resolution is the intentional specialization.
- Restore V1 readers or add V1/V2 unions: forbidden compatibility path.
- Use a process-global manager during stored migration/classification: boundary bypass and startup-order defect.
- Hand-merge/recommit generated SDK/vendor/importable files: duplicate source truth.
- Add a new mode-switched server builder, service locator, generic DI container, generic event bus, or fallback singleton: no owned benefit.

## Self-Validation

- Approved production reality: Pass — both the previously verified application behavior and Personal's completed hierarchical/V2 behavior are explicitly assigned.
- Spine span: Pass — launch, execution, return/event, migration, stored-memory, UI, and package spines reach meaningful outcomes.
- Ownership: Pass — precedence remains application-owned; topology/allocation/persistence remain Personal Team execution-owned; migration remains startup-owned.
- Authoritative boundary: Pass — run binding consumes complete launch input through `TeamRunService`; it does not traverse definitions or allocate IDs.
- Shared shape tightness: Pass — Team scopes exist only on Team variants; baseline, effective diagnostic, application SDK wire, and Personal service shapes are exact; atomic config/resolved workspace are carried; diagnostic-only provenance/labels are explicitly excluded; no redundant root field.
- Product reachability: Pass — every material mechanism is tied to maintained application execution, dynamic Team behavior, ordinary history upgrade, Studio editing/history, or devkit packaging.
- Persisted data: Pass — only V1 execution trees and old flat nested memory require isolated migrations; other rows are directly usable or transient.
- Clean-cut replacement: Pass — no V1 runtime, dual Team default field, generated source authority, alias, or fallback.
- Proportionality: Pass — broad Personal owners are accepted, while ticket-specific code changes are restricted to the demonstrated launch/migration/hosting junction.
