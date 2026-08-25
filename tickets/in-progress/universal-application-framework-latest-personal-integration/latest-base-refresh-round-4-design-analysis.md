# Latest-Base Refresh Round 4 Design Analysis — Personal v1.4.57

## Status And Decision

- Current status: implemented, reviewed, and verified in DR-009; retained as historical v1.4.57 authority while SR-009 governs the v1.4.58 refresh.
- Solution revision: `SR-008`.
- Protected ticket checkpoint: `95c63b5a982ba90ccbb8c6345af66a9485fa5a78` (`DR-007`, verified v1.4.56 candidate).
- Prior integrated Personal base: `52b4be02ea793f2071fe5a63a94664ab25196433`.
- Current required target: `origin/personal@389748b0b9f0dea051aaed18641de131cf0adbbb` (`v1.4.57`).
- Decision: **bounded Design Impact with no production refactor**. Accept Personal's controlled workspace-selection production change and resolve the two durable-test conflicts by composing, rather than choosing between, the workspace and provider-granular fixture contracts.
- Repository safety: the merge preview is non-mutating; `HEAD` remains protected; the index has zero unmerged paths; no production source was edited during solution design.

Personal is four commits ahead of the integrated base. The delta contains 95 paths (`81` adds, `14` modifications) and produces exactly two changed-both paths and two content conflicts. Both conflicts are component tests. The five production workspace files and adjacent Personal tests auto-merge cleanly. The 81 additions are primarily the completed Personal ticket package/evidence plus the shared `WorkspaceSelectionState` type; they do not create an application-platform owner.

## Governing Behavior Contract

1. `RunConfigPanel` is the sole owner of transient `WorkspaceSelectionState` for the active Agent or Team draft.
2. `WorkspaceSelector` is controlled: it renders `modelValue`, emits a complete `update:modelValue`, and owns no second mode/path/selected-workspace copy.
3. `AgentRunConfigForm` and `TeamRunConfigForm` are thin relays through `workspaceSelection` / `update:workspaceSelection`; they do not reset workspace intent when runtime, model, member, or other configuration fields change.
4. Explicit New mode and its raw path survive unrelated configuration edits and delayed workspace discovery. At launch, `RunConfigPanel` alone trims/registers the New path, replaces the active config with the canonical workspace ID, and then delegates to the existing launch owner. Failure preserves the visible New choice and does not launch a stale Existing/Temp workspace.
5. The already-integrated provider-granular form contract remains unchanged: `providersWithModelsForSelection(runtimeKind)` is callable, `providerSnapshots(runtimeKind)` supplies source status, and `ensureMissingDynamicProviders(runtimeKind)` settles provider discovery. Workspace state neither owns nor resets provider state.
6. Existing workspace registry/history data is directly usable. This refresh changes transient frontend ownership only and introduces no migration, compatibility event, dual path, or stored workspace rewrite.

## Product-Reachability Matrix

| Premise | Supported trigger | Forward production path | Reachability | Material consequence |
| --- | --- | --- | --- | --- |
| A user chooses New, enters a remote path, then changes Team runtime/model/member configuration before launch. | Normal Studio Team draft editing. | `RunConfigPanel state -> Team form relay -> WorkspaceSelector render -> unrelated Team edit -> same panel state -> pre-launch registration -> Team launch` | Reachable | Split/local selector state can revert to a prior workspace and launch in the wrong location. |
| Workspace discovery completes after the user explicitly chose New. | Open the form while remote workspace discovery is delayed. | `workspaceStore fetch -> selector options update -> controlled state check -> preserve explicit New/path` | Reachable | Automatic Existing/Temp selection must not overwrite explicit user intent. |
| A user changes runtime/model while provider discovery is settling. | Normal Agent/Team form editing with a dynamic provider. | `RuntimeModelConfigFields -> useRuntimeScopedModelSelection -> provider snapshot/ensure -> form rerender`, in parallel with the controlled workspace relay | Reachable | A combined test fixture must retain callable provider getters/status while proving workspace state is unchanged. |
| A New workspace registration fails. | Press Run with an invalid/unavailable remote path. | `RunConfigPanel -> workspaceStore.createWorkspace -> failure -> workspace error -> controlled selector` | Reachable | No stale workspace launch may occur; the New path remains visible for correction. |

No premise requires standalone workspace selection, a new provider API, a new application-platform service, or a synthetic mutation of internal state.

## Current And Target Spines

### Primary workspace spine

`Studio RunConfigPanel -> authoritative WorkspaceSelectionState -> AgentRunConfigForm or TeamRunConfigForm -> controlled WorkspaceSelector -> complete replacement event -> RunConfigPanel`

At accepted launch:

`New path -> RunConfigPanel validation -> workspaceStore.createWorkspace on bound node -> canonical workspace ID/config -> existing Agent/Team launch owner -> persisted run/history projection`

### Provider/model spine preserved beside it

`Agent/Team form -> RuntimeModelConfigFields -> useRuntimeScopedModelSelection -> fetchProvidersWithModels(runtime) -> callable providersWithModelsForSelection(runtime) + providerSnapshots(runtime) -> background ensureMissingDynamicProviders(runtime) -> settled rows/status -> model options`

These spines meet only in the form's presentation composition. Workspace intent does not flow through the provider store, and provider snapshots do not flow through the workspace owner.

### Failure return spine

`workspace registration failure -> RunConfigPanel workspace error -> controlled WorkspaceSelector renders same New/path + error -> no Agent/Team launch`

## Exact Conflict Resolution Contract

### `AgentRunConfigForm.spec.ts`

Combine the current ticket fixture and Personal test as follows:

- change the `WorkspaceSelector` stub to `modelValue` and `update:modelValue`; remove retired `workspaceId`, `select-existing`, and `workspace-input-change` test contracts;
- retain a callable `providersWithModelsForSelection(runtimeKind)` backed by the test's filtered selection rows;
- retain callable `providerSnapshots(runtimeKind)` and async `ensureMissingDynamicProviders(runtimeKind)` because `useRuntimeScopedModelSelection` consumes both;
- supply a complete `workspaceSelection` to every mount;
- retain all existing provider/model/runtime/read-only assertions;
- add Personal's exact controlled-value relay assertion: the selector receives the same complete object and the form emits the exact replacement through `update:workspaceSelection` without local mutation.

### `TeamRunConfigForm.spec.ts`

Combine the fixtures as follows:

- retain `providersWithModelsForSelection(runtimeKind)` as a callable runtime-keyed getter and filter out provider rows without models;
- retain callable `providerSnapshots(runtimeKind)` and `ensureMissingDynamicProviders(runtimeKind)`;
- make the existing `buildWrapper` supply a complete default `workspaceSelection` while allowing an explicit override;
- retain all runtime/member/model/provider/read-only tests;
- add Personal's exact controlled-value relay assertion and remove no provider-granular assertion.

`providerSnapshots` is required in both fixtures. The current model-selection composable reads it when it publishes source status after the initial catalog read and after discovery settlement. Omitting it would make the fixture describe a retired store boundary even if a narrow happy-path assertion happened to pass.

## Auto-Merged Production Disposition

| Path | Disposition | Reason |
| --- | --- | --- |
| `autobyteus-web/types/workspace/WorkspaceSelectionState.ts` | Accept from Personal | One tight transient state shape for mode, inactive Existing ID buffer, and inactive New path buffer. |
| `.../config/WorkspaceSelector.vue` | Accept semantic auto-merge | Controlled input surface; no local authoritative mode/path and no compatibility events. |
| `.../config/AgentRunConfigForm.vue` | Accept semantic auto-merge | Thin complete-state relay; provider/model UI remains independently owned by `RuntimeModelConfigFields`. |
| `.../config/TeamRunConfigForm.vue` | Accept semantic auto-merge | Thin complete-state relay; Team edit and provider/runtime behavior remain unchanged. |
| `.../config/RunConfigPanel.vue` | Accept semantic auto-merge after focused review | Governing state/reset/readiness/register-before-launch owner; must preserve explicit New state across unrelated edits and delayed discovery. |
| `.../__tests__/WorkspaceSelector.spec.ts` | Accept from Personal and execute | Proves controlled render/emission, delayed discovery, Temp proposal, browse, disabled, and error behavior. |
| `.../__tests__/RunConfigPanel.spec.ts` | Accept from Personal and execute | Proves context identity, path preservation, registration-before-launch, failure/no-fallback, and selected-run read-only behavior. |

There is no production adaptation for the provider/application framework in SR-008. If the merged production files do not pass the combined suite, implementation must reroute the concrete failure rather than weakening either contract.

## Ownership And Dependency Rules

Allowed:

- `RunConfigPanel -> WorkspaceSelectionState -> forms -> WorkspaceSelector` for controlled workspace presentation and replacement events;
- `RunConfigPanel -> workspaceStore -> current Agent/Team launch owner` for registration and launch sequencing;
- forms/`RuntimeModelConfigFields -> useRuntimeScopedModelSelection -> llmProviderConfig` for runtime/model options and provider source status.

Forbidden:

- local authoritative mode/path state in `WorkspaceSelector` or either form;
- compatibility support for `select-existing`, `workspace-input-change`, `workspaceId`, or `initialPath` on the replaced controlled seam;
- resetting workspace state because a Team draft object changed while its stable draft identity did not;
- silently launching the dormant Existing/Temp workspace when New registration fails;
- array-shaped or property-shaped `providersWithModelsForSelection` fixtures;
- omitting `providerSnapshots` or replacing provider-granular settlement with a workspace-owned refresh;
- a generic form coordinator, service locator, cross-store event bus, or new persistence/migration owner.

## Persisted-Data Decision

`Directly Usable — No Migration` for workspace registry, run history, and saved Agent/Team configuration. `WorkspaceSelectionState` is transient frontend state. Successful New registration continues through the existing `workspaceStore` and existing config/run persistence; existing IDs and history rows require no rewrite. The previously integrated nested Team Agent memory migration and token-analytics Prisma migration remain unaffected and must not be removed.

## Exact Change Inventory

### Accept from Personal

- the five production/type paths in the production disposition table;
- `RunConfigPanel.spec.ts` and `WorkspaceSelector.spec.ts`;
- the completed Personal ticket package/evidence, documentation, release metadata, and v1.4.57 version changes in the 95-path inventory.

### Modify while resolving conflicts

- `autobyteus-web/components/workspace/config/__tests__/AgentRunConfigForm.spec.ts`;
- `autobyteus-web/components/workspace/config/__tests__/TeamRunConfigForm.spec.ts`.

### Add as solution evidence only

- `latest-base-refresh-round-4-design-analysis.md`;
- `evidence/solution/latest-base-refresh-round-4-merge-preview.log`;
- `evidence/solution/latest-base-refresh-round-4-conflict-inventory.txt`;
- `evidence/solution/latest-base-refresh-round-4-overlap-inventory.txt`;
- `evidence/solution/latest-base-refresh-round-4-path-inventory.txt`.

### Remove / do not restore

- retired partial WorkspaceSelector props/events and their test stubs;
- no production file, provider assertion, existing migration, or prior durable coverage is removed by this refresh.

## Implementation Sequence

1. Re-fetch `origin/personal`; if it differs from `389748b0b9f0dea051aaed18641de131cf0adbbb`, stop before merge for renewed source-impact classification.
2. Preserve the `95c63b5a...` checkpoint and all owner-specific evidence.
3. Perform one history-preserving merge of the reviewed ref.
4. Accept the auto-merged production/type changes only after reviewing them against the ownership table.
5. Resolve the two tests with the exact combined fixtures; do not select either whole side.
6. Run focused web tests and build/type checks, then the normal source-review, API/E2E, proportional durable-test review, and delivery/Electron gates.

## Verification Matrix

| Proof group | Required evidence |
| --- | --- |
| Git | target ancestry, merge parents, 2/2 conflict ledger, 2/2 changed-both ledger, no unmerged entries/markers |
| Combined form contract | both conflicted tests pass with controlled workspace relay and callable provider rows/snapshots/settlement retained |
| Workspace owner | `WorkspaceSelector.spec.ts` and `RunConfigPanel.spec.ts` pass delayed-discovery, explicit-New preservation, registration-before-launch, failure/no-fallback, and read-only cases |
| Provider owner | `useRuntimeScopedModelSelection.spec.ts`, `llmProviderConfigStore.test.ts`, and relevant runtime-model component tests retain callable/runtime-keyed snapshots and settled discovery behavior |
| Frontend | affected Nuxt type/build checks and full relevant web suite pass |
| Real Studio | explicit New Team path survives runtime/model/member edit and delayed discovery, registers on the bound node, launches once, and appears under the canonical workspace/history; failure retains New/path and launches nothing |
| Preserved foundation | focused architecture/source gates, maintained package parity, real Studio/standalone regressions, cleanup/recovery, and Electron v1.4.57 rebuild/smoke remain green |

## Design-Principles Self-Validation

- **Spine span:** covers edit, delayed return, registration, launch, and history—not only the two conflict markers.
- **Authoritative boundary:** one panel owns transient workspace intent; provider state stays in its existing store/composable owner.
- **Proportionality:** two test resolutions plus acceptance of a source-backed Personal production change; no application-platform refactor.
- **Clean cut:** old partial selector props/events are removed, not aliased.
- **Data transition:** explicit no-migration decision for this transient state change; existing cumulative migrations remain intact.
- **No empty indirection:** no new facade, coordinator, service, container, event bus, or persistence owner.
- **Reachability:** every material premise begins at supported Studio draft editing or launch behavior.

