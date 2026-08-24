# Design Spec

## Status

`SR-007 — Ready for architecture re-review after CRR-001`.

`ARCH-REV-007` passed the `SR-006` simplified architecture. Code review of `IR-003` then exposed a missing host-setting client return path (`CODE-002`) plus bounded endpoint-identity, mixed-state, and removal defects (`CODE-001`, `CODE-003`, `CODE-004`). `SR-007` closes those exact gaps without changing the user-approved product workflow, adding global coordination, or changing persistence.

## Current-State Read

API Keys currently obtains credential facts and all model catalogs through one provider-settings lifecycle. The frontend gates its central content on that lifecycle. Server catalog assembly in turn:

- initializes static LLM definitions and eagerly discovers Ollama/LM Studio;
- synchronizes custom OpenAI-compatible endpoints;
- discovers AutoByteus gateway LLM/audio/image models;
- may await live metadata enrichment;
- exposes global and provider-targeted reload variants;
- duplicates factory registry rows in an aggregate cache.

The production-path measurement is decisive: a representative cold `providerSettings` request took `78.276s`; with only configured AutoByteus gateway hosts disabled it took `1.282s`. AutoByteus model-list requests are serial across hosts and use Axios `timeout: 0`.

The model factories already own the rows used for model construction. The simpler target is therefore not another model-row cache. It is network-free static registration plus small, exact dynamic-source lifecycle records governing discovery into those registries.

The paused `IR-003` tree implements most of that target and is the current code-review evidence. Its server settings writer invokes source invalidation, but row retention collapses endpoints to URL authority and its client action reloads only settings. Because the shared Pinia catalog survives Settings-section unmount and returns a local `READY` snapshot, API Keys -> Server Settings host edit -> API Keys can retain old rows indefinitely. The same review also found incorrect provider-level mixed-result copy and incomplete removal of dormant video/global-cache shapes. These are target-design corrections, not a return to the former aggregate architecture.

## Intended Change

1. Keep a single credential authority, returning credential-free provider descriptors plus server-owned `apiKeyConfigured`.
2. Make static model registration network-free and immediately readable.
3. Treat AutoByteus, Ollama, LM Studio, and each custom provider as exact dynamic discovery owners.
4. Keep discovered rows in existing factory registries and keep only lifecycle/fingerprint/in-flight/generation state beside them.
5. Make snapshot reads local and non-discovering.
6. Start discovery only through a provider-targeted ensure/reload command:
   - first current-fingerprint demand ensures once;
   - terminal cache hit performs no network work;
   - explicit provider Reload forces another attempt.
7. Remove global/static Reload, the aggregate duplicate cache, and the global registry FIFO.
8. Preserve credential command finality. AutoByteus save alone schedules AutoByteus LLM/audio/image refresh after success.
9. Add targeted ensure to every selector/construction path so API Keys is not an initialization prerequisite.
10. Bound each AutoByteus host discovery request to `30,000ms` and fan valid hosts out concurrently.
11. On a supported host-setting commit, remove every row for the exact affected server source and directly advance/clear the corresponding shared Pinia provider key before a non-awaited targeted ensure; do not add a global fetch, event bus, or settings-to-model wait.
12. Preserve provider-level `PARTIAL` meaning for mixed current/cold AutoByteus kinds, and complete the explicit old video/cache/type deletions.

## Architecture / Code-Review Rework Disposition

| Finding / Premise | Disposition In SR-007 |
| --- | --- |
| `DI-001` | Remains resolved: catalog DTOs use `ProviderDescriptor` only; configured state exists only in `ProviderCredentialSetting`. |
| `DI-002` / `PREM-STORE-001` | Remains resolved and narrowed: client catalog state is keyed by normalized runtime plus discovery owner, with same-key request/generation publication guards. |
| `DI-003` / `PREM-CUSTOM-SYNC-003` | Resolved by the source-local generation protocol; custom prepare/probe publication is current-generation only and cleanup is promise-identity guarded. |
| `PREM-RELOAD-MUTATION-004` | The global/aggregate write race is structurally removed. Every registry replacement is exact by source key; stale same-source publication is generation-rejected. Disjoint sources do not need a FIFO. |
| `RG-001` / `PREM-DYNAMIC-RELOAD-005` | Resolved through approved static/dynamic inventory, first-demand and terminal-cache semantics, post-save behavior, other-consumer mapping, and exact `30,000ms` host deadline. |
| `DI-004` / `PREM-AUTOBYTEUS-CLIENT-PUBLICATION-006` | Resolved: after credential state/success is applied, API Keys starts but does not await one exact-AutoByteus Pinia ensure. Its targeted GraphQL response is the pull-based return path into the mounted model section and joins the server source single-flights. |
| `DI-005` / `PREM-CUSTOM-IDENTIFIER-006` | Resolved: availability parsing imports producer-owned parsers. Custom identity is exactly `openai-compatible:<providerId>:<modelName>`; supported host-scoped LLM/media forms likewise use builders/parsers colocated with their canonical producers. No identifier rewrite or compatibility branch exists. |
| `ARCH-REV-007` | Prior Pass remains valid for the central source-local architecture; `SR-007` only repairs paths subsequently proven incomplete by `CRR-001`. |
| `CODE-001` / `CR-PREM-001` | Carried bounded correction: one normalized full endpoint identity is used by adapter input, fingerprint, row provenance, and configured-source validation. A supported host-setting commit clears every row for the exact affected source before detached refill, so same-authority scheme/path changes cannot retain executable rows. |
| `CODE-002` / `CR-PREM-002` | Resolved design impact through new `DS-010`: as soon as the setting mutation result confirms durable success, the client action directly invokes but does not await an exact provider Pinia clear-and-ensure action before its ordinary settings-list reload. That action runs even over prior `READY`, publishes under existing runtime/provider request guards while API Keys is unmounted, and never refreshes unrelated providers. |
| `CODE-003` / `CR-PREM-003` | Carried bounded correction: provider aggregation distinguishes current partial results from retained stale rows. `READY` rows in one AutoByteus kind plus cold `ERROR` in another produce provider `PARTIAL`; stale copy requires an actual `STALE_ERROR` source with retained rows. |
| `CODE-004` | Carried bounded clean-cut correction: delete dormant `video-model-service.ts`, `cached-video-model-provider.ts`, obsolete tests/imports, and unused `LlmProviderWithModels` / `CustomProviderReloadStatus` declarations. No aliases remain. |

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Approved Intent / IDs | Approved Trigger / Contract | Existing Behavior / Evidence | Approved Change / Preserved Outcome | Target Path / Spine |
| --- | --- | --- | --- | --- | --- | --- |
| `BEH-001` | User | Fast independent credential entry; `REQ-001`–`REQ-004`; `AC-001`–`AC-004` | Settings -> API Keys | Component waits for coupled provider/catalog lifecycle; screenshot and `78.276s` probe | Local credential read renders provider/form without discovery | UI -> credential query -> `LlmProviderService`; `DS-001` |
| `BEH-002` | Contract | Separate truthful credential/model state; `REQ-002`–`REQ-006`; `AC-002`–`AC-007` | Credential/catalog read contracts | Catalog-capable provider record can project placeholder configured state; investigation behavior table | Descriptor is credential-free; only credential setting carries Boolean | credential facade vs catalog facade; `DS-001`, `DS-002`, `DS-009` |
| `BEH-003` | System | Static immediate, dynamic source-local; `REQ-007`–`REQ-010`; `AC-008`–`AC-012` | Any model snapshot/selection | Static registry init awaits Ollama/LM Studio and aggregate sources | Network-free static init; dynamic first-demand lifecycle | registry snapshot / source ensure; `DS-002`–`DS-004` |
| `BEH-004` | User | No global/static Reload; targeted refresh retains UI/rows; `REQ-008`–`REQ-011`; `AC-009`–`AC-013` | Selected dynamic provider Reload | Global/targeted reloads share aggregate lifecycle | Only exact dynamic provider is forced; stale work rejected | UI -> targeted mutation -> source owner; `DS-005`, `DS-009` |
| `BEH-005` | User | Credential command finality and observable narrow post-save work; `REQ-005`, `REQ-012`–`REQ-014`; `AC-005`, `AC-014`–`AC-016` | Save/create/delete | Commands refetch/await model work; save-path trace | Durable result/success first; server schedules exact work; client independently joins and publishes it | credential command -> sync notify -> detached server work; success -> non-awaited client ensure -> keyed publication; `DS-006`, `DS-009` |
| `BEH-006` | Operational | Bounded deterministic gateway discovery and truthful partial/stale semantics; `REQ-015`; `AC-007`, `AC-017`–`AC-020` | AutoByteus source ensure/reload | Serial host loop, `timeout: 0`; `CR-PREM-003` mixed-kind mislabel | Concurrent `30,000ms` per-host, ordered all-settled result; provider mixed current/cold is partial, not stale | source lifecycle -> remote adapter -> hosts -> provider projection; `DS-007`, `DS-009` |
| `BEH-007` | System | All consumers initialize correctly using canonical identifiers; `REQ-016`; `AC-021` | Selector entry or persisted dynamic execution | API Keys/catalog visit can be accidental prerequisite | Static/current rows immediately; producer-bound identifier parsing targets the missing source | selector fan-out / availability facade; `DS-002`, `DS-003`, `DS-008`, `DS-009` |
| `BEH-008` | Contract | One row owner, exact concurrency, and endpoint-change convergence; `REQ-009`, `REQ-010`, `REQ-017`, `REQ-018`; `AC-013`, `AC-022` | Concurrent ensure/reload/mutation or supported host save | Registry plus aggregate cache/FIFO history; `CR-PREM-001` authority-only retention and `CR-PREM-002` missing client return | Registry rows source-indexed; same-source generations; full-source clear on endpoint commit; exact Pinia clear-and-ensure; no duplicate cache/FIFO | registry commit + local lifecycle + settings return; `DS-003`–`DS-007`, `DS-009`, `DS-010` |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related IDs | Relationship To Design | Status / Approval |
| --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/api-key-management-panel-performance/tickets/in-progress/api-key-management-panel-performance/api-key-panel-loading.png` | Current whole-panel blocking evidence | `REQ-001`, `AC-001` | Grounds the `DS-001` critical-path removal | Current evidence; approval N/A |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/api-key-management-panel-performance/tickets/in-progress/api-key-management-panel-performance/ui-ux-spec.md` | Approved lifecycle/content/control contract | `REQ-001`–`REQ-018`, `AC-001`–`AC-022` | Governs UI/store observable outcomes for `DS-001`, `DS-003`, `DS-005`, `DS-009`, `DS-010` | Refined; user-approved 2026-08-23; `SR-007` within-scope clarification |

## Task Design Health Assessment

- Change posture: `Performance` + `Behavior Change` + `Refactor`.
- Current design issue found: `Yes`.
- Root cause classification: `Boundary Or Ownership Issue` and `Duplicated Policy Or Coordination`.
- Refactor needed now: `Yes`.
- Evidence: the local credential query waits on external catalog work; static initialization awaits live adapters; model rows exist both in factories and an aggregate cache; other consumers rely on initialization side effects.
- Design response: one credential authority, registry-owned model rows, and exact source lifecycle coordination.
- Refactor rationale: a component-only or timeout-only change cannot satisfy command independence, static-immediate availability, or post-restart construction.
- Intentional deferrals/residual risk: identifier formats do not change; ambiguous legacy media identifiers fail conservatively. Durable/offline caching is explicitly out of scope.

## Terminology

- **Provider descriptor**: credential-free local identity/configuration metadata used by credential and catalog projections.
- **Credential setting**: provider descriptor plus server-owned Boolean `apiKeyConfigured`.
- **Model provider identity**: the actual provider attached to a model row, e.g. OpenAI.
- **Discovery owner**: the source whose configuration and network operation produced rows, e.g. AutoByteus. These identities may differ.
- **Source key**: exact `{ runtimeKind, ownerProviderId, modelKind }`.
- **Fingerprint**: non-secret process-local identity of discovery inputs. It includes normalized endpoint/host configuration and an opaque process credential revision, never a credential value.
- **Terminal attempt**: current-fingerprint discovery that completed as ready, ready-empty, partial, stale-error, or error. A normal ensure does not repeat a terminal attempt.
- **Snapshot**: a credential-free view of current registry rows and lifecycle status; reading it performs no network I/O.

## Design Reading Order

Read `DS-001`–`DS-010`, then the source state machine, endpoint-identity boundary, aggregation rules, boundary contracts, mutation matrix, removal plan, file mapping, and verification matrix.

## Legacy Removal Policy

The target is one clean path. Remove:

- the coupled provider-settings catalog projection;
- `reloadLlmModels` and separate global audio/image/video reload transport;
- header/global Reload controls and static-provider Reload;
- aggregate cached `ModelInfo[]` ownership in `CachedAutobyteusLlmModelProvider` (and equivalent media wrappers where they duplicate registry rows);
- the persistent global registry FIFO introduced by paused `IR-001`;
- eager Ollama/LM Studio work from static initialization;
- any compatibility aliases that silently map removed global reload operations to multiple targeted reloads.

Generated GraphQL artifacts are regenerated after schema changes; obsolete operations and test fixtures are deleted.

## Persisted Data / State Transition Decision

- Stored subject/location/shape/volume: existing encrypted credentials, server-setting host strings/lists, custom-provider rows, and saved model identifier strings in their current stores; volume is unchanged and irrelevant because no record is transformed.
- Relevant code-model/serialization/storage change: none. New source index, fingerprint, credential revision, and lifecycle fields are process memory only.
- Normal reader/writer behavior and evidence: existing provider/secret/settings repositories continue to read/write the same data; investigation reproduced the issue without modifying persisted representation.
- Required semantics/invariants: all stored identifiers and values retain their current meaning; credentials remain secret; host changes continue through the current settings writer.
- Physical/privacy/operational constraints: no secret logging; no database scan, maintenance window, backup, or rollback step.
- Decision: `Not Affected`.
- Decision rationale: runtime coordination can be rebuilt from existing configuration and registry definitions; any migration would add I/O/corruption/rollout risk with no benefit.
- Supported IDs: `REQ-006`, `REQ-017`, `REQ-018`; `AC-006`, `AC-021`, `AC-022`.

### Migration Plan

N/A because the decision is `Not Affected`.

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behavior IDs | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| `DS-001` | Primary End-to-End | `BEH-001`, `BEH-002` | API Keys entry | Credential form ready | `LlmProviderService` credential boundary | Removes external discovery from the critical path |
| `DS-002` | Primary End-to-End | `BEH-003`, `BEH-007` | Snapshot/selector read | Static + current rows | `ProviderModelCatalogService` local snapshot boundary | Makes model reads useful without network |
| `DS-003` | Primary End-to-End | `BEH-003`, `BEH-007`, `BEH-008` | Cold dynamic demand | Exact source terminal state | Dynamic source lifecycle | Discovers only what is missing |
| `DS-004` | Bounded Local | `BEH-003`, `BEH-008` | Warm/terminal ensure | Existing snapshot | Dynamic source lifecycle | Enforces no-network cache hits |
| `DS-005` | Primary End-to-End | `BEH-004`, `BEH-008` | Provider Reload/Retry | Exact source refreshed | Dynamic source lifecycle | Forces only approved dynamic source |
| `DS-006` | Return-Event | `BEH-005`, `BEH-008` | Durable command commit | Credential result first, then independently observable exact-source convergence | Credential command owner + API Keys runtime | Keeps command finality independent while completing the client return path |
| `DS-007` | Bounded Local | `BEH-006` | AutoByteus source worker | Deterministic prepared result | Remote discovery service | Bounds and parallelizes hosts |
| `DS-008` | Primary End-to-End | `BEH-007` | Persisted model construction | Exact source ensured/factory lookup | `ModelAvailabilityService` | Removes API Keys prerequisite |
| `DS-009` | Return-Event | `BEH-001`–`BEH-005`, `BEH-007` | Async frontend response | Correct keyed snapshot | Pinia catalog store | Prevents cross-runtime/source publication |
| `DS-010` | Return-Event | `BEH-008` | Supported server-setting save | Exact server source and shared Pinia provider converge | Server Settings action + catalog store | Completes cross-section host-change publication without global refresh |

## Primary Execution Spine(s)

- `DS-001`: API Keys -> section runtime -> Pinia credential action -> GraphQL credential query -> `LlmProviderService` -> descriptor/secret-status owners -> form.
- `DS-002/003/005`: Model consumer -> Pinia/server caller -> local snapshot or targeted mutation -> `ProviderModelCatalogService` -> source lifecycle -> adapter prepare -> source registry commit -> snapshot.
- `DS-008`: Agent/media execution -> `ModelAvailabilityService` -> identifier/source resolver -> targeted ensure (only if missing) -> existing factory construction.
- `DS-010`: Server Settings save -> server exact-source invalidate/clear/detached ensure -> successful client settings action -> direct exact-provider Pinia clear-and-ensure -> guarded snapshot publication.

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| `DS-001` | Read only local descriptors/configured Booleans and render credentials. | credential setting, provider descriptor | `LlmProviderService` | secret redaction, specialty setup |
| `DS-002` | Initialize static definitions without I/O and project current registry rows/status. | provider snapshot, model row | `ProviderModelCatalogService` | cached metadata |
| `DS-003` | Ensure one cold source with single-flight and current-generation commit. | source key, lifecycle record | dynamic source lifecycle | adapter errors, safe status |
| `DS-004` | Return a terminal current-fingerprint snapshot without network. | terminal attempt | dynamic source lifecycle | none |
| `DS-005` | Force one dynamic source while retaining last-known rows and rejecting stale completion. | source generation, snapshot | dynamic source lifecycle | localized notification |
| `DS-006` | Finish durable command, notify/schedule exact server work, return/apply success, then start a non-awaited exact client ensure that publishes the shared result. | credential command, AutoByteus source snapshot | command service + API Keys runtime | compensation, detached error handling |
| `DS-007` | Start all valid hosts, apply per-host deadline, and prepare an ordered partial/complete result. | host attempt set | remote discovery service | URL validation, cancellation |
| `DS-008` | Parse missing persisted identifier, ensure at most exact source, then construct. | model identifier, source key | `ModelAvailabilityService` | ambiguity/error mapping |
| `DS-009` | Publish response only into the originating runtime/provider request slot. | client snapshot/request token | Pinia catalog store | unmount/reset |
| `DS-010` | After a supported host save, clear and converge only its server source and shared client provider without waiting or broadcasting. | discovery setting, provider snapshot | Server Settings action + catalog store | same-value saves, rapid edits, safe detached errors |

## Spine Actors / Main-Line Nodes

- API Keys section runtime and general selector composables.
- Server Settings endpoint editor and Pinia settings action.
- Pinia credential/catalog store.
- GraphQL credential/catalog resolver.
- `LlmProviderService`.
- `ProviderModelCatalogService` and its exact dynamic source lifecycle.
- Source discovery adapters.
- Source-owned model registries.
- `ModelAvailabilityService`.
- Existing agent/media construction factories.

## Detailed Spine Narratives

### `DS-001` — Credential entry

1. `ProviderAPIKeyManager` starts the credential read.
2. GraphQL calls `LlmProviderService.listProviderCredentialSettings(runtimeKind)`.
3. The service reads built-in/custom provider descriptors and secret-manager configured Booleans only.
4. It returns without touching model catalog/factory/discovery services.
5. The component renders provider navigation and the selected form.
6. Model snapshot/ensure work is launched separately and cannot modify the credential result.

### `DS-002` — Network-free snapshot

1. A frontend consumer requests `providerModelCatalogSnapshots(runtimeKind)`.
2. `ProviderModelCatalogService` ensures only static registry initialization.
3. Static initialization registers curated model definitions and returns without Ollama/LM Studio, metadata, custom, or AutoByteus I/O.
4. The service reads current rows from each factory by exact source ownership and joins lifecycle status.
5. The GraphQL response contains provider descriptor, catalog mode, source statuses, and model details; no credential state.

### `DS-003` — Cold source ensure

1. A selected model section or consumer invokes `ensureProviderModelCatalog(providerId, runtimeKind)`.
2. The service expands the provider to exact source keys: one LLM key for Ollama/LM Studio/custom; LLM/audio/image keys for AutoByteus.
3. For each key, the source owner computes the current fingerprint.
4. If there is no terminal attempt for the fingerprint, it starts or joins one in-flight promise.
5. Discovery prepares models without mutating a registry.
6. Immediately before publication, the owner checks generation, fingerprint, and in-flight identity.
7. A current result atomically replaces only that key's rows and publishes terminal lifecycle state.
8. The response returns the provider snapshot. Credential controls were never awaiting it.

### `DS-004` — Terminal cache hit

1. `ensure` sees `attemptedFingerprint === currentFingerprint` and no active forced attempt.
2. It reads current rows/status and returns without network activity.
3. This applies to ready, ready-empty, partial, stale-error, and cold-error terminal states. Retry requires explicit Reload unless inputs change.

This terminal-failure caching prevents provider re-selection from repeatedly contacting an unavailable endpoint.

### `DS-005` — Provider-local force Reload

1. Only a dynamic provider exposes Reload.
2. `reloadProviderModelCatalog` advances the affected source generation(s) and starts fresh promises even if a terminal attempt or obsolete promise exists.
3. Existing rows remain in registries; lifecycle becomes `REFRESHING` when rows exist or `LOADING` when none exist.
4. Current-generation success atomically replaces exact source rows.
5. Current-generation failure retains rows as `STALE_ERROR`, or publishes `ERROR` if cold.
6. Older completions fail the publication check and cannot modify rows/status or clear the current promise.

### `DS-006` — Commands and contained invalidation

- Ordinary static-provider/Gemini/Qwen credential command: validate/commit, return exact configured state, no catalog call.
- AutoByteus key save (server): validate/commit, compute response, synchronously advance three source generations using an opaque credential revision, retain last-known rows, and directly invoke `void ensureProvider(AUTOBYTEUS, forceForChangedFingerprint=true).catch(safeStatusHandler)` before returning. Each source `ensure` assigns its `inFlight` reference synchronously before its first await; the command does not await the returned model promise. This invocation-before-return contract guarantees a later client ensure can only join or observe the terminal result.
- AutoByteus key save (mounted client return path): the Pinia credential action applies the exact `ProviderCredentialSetting` and returns; `useProviderApiKeySectionRuntime.saveProviderApiKey` clears credential saving state, applies the success notification, then invokes `void store.ensureProviderModelCatalog(runtimeKind, AUTOBYTEUS)`. This is a separate model action/promise and is never returned or awaited by the credential action. It immediately owns only the AutoByteus Pinia request state, retains prior rows as refreshing, receives the final targeted snapshot, and publishes it under `DS-009`. Since the server scheduled its ensure before returning the credential response, the client request either joins the in-flight source promises or reads their terminal current-fingerprint result; it cannot cause a second adapter invocation.
- Custom create: perform the create mutation's existing authenticated `/models` probe before durable create; after durable provider+secret commit, register the source and synchronously commit those already prepared rows as the first `READY` snapshot. No post-commit discovery. An optional earlier user-invoked preview probe remains an independent validation action and is not trusted as the create mutation's authority.
- Custom delete: durable delete/secret cleanup under existing semantics; advance exact source generation, detach old promise, remove exact registry rows/lifecycle, return `{providerId, deleted}`.
- Host setting change: after durable setting write, map the exact setting key to source key(s), advance generation, remove every row for the affected source immediately, and schedule a contained fresh ensure. The settings command does not await discovery. Client convergence is completed separately by `DS-010`; server-detached work alone is not treated as observable Pinia publication.

### `DS-007` — AutoByteus host fan-out

1. Snapshot normalized configured hosts in configured order.
2. Reject invalid URLs as source-local failed entries without attempting them.
3. Start every valid host request before awaiting any peer.
4. Apply an AbortSignal/deadline of `30,000ms` independently to each model-list request.
5. Await all with settled semantics.
6. Flatten successful models in original configured-host order.
7. Preserve each row's upstream `providerId`, `providerType`, AutoByteus runtime, and `hostUrl`.
8. Publish `PARTIAL` when some valid/invalid hosts fail and at least one succeeds; publish ready/empty on fully authoritative success; use stale/cold error rules on total failure.

### `DS-008` — Persisted dynamic construction

1. The server execution boundary receives a saved model identifier.
2. It first checks the local registry.
3. If absent, `ModelAvailabilityService.ensureModelAvailable(identifier, kind, runtimeKind)` delegates to canonical producer-bound parsers:
   - `parseOpenAICompatibleEndpointModelIdentifier` recognizes exactly `openai-compatible:<providerId>:<modelName>`, splitting only the first delimiter after the prefix so the complete model-name suffix (including `:`) is retained; it maps to the exact custom provider ID after verifying the provider still exists.
   - The generic LLM producer/parser recognizes the existing host-scoped `<modelName>:ollama@<host>`, `<modelName>:lmstudio@<host>`, and `<modelName>:autobyteus@<host>` outputs and maps them to Ollama, LM Studio, and AutoByteus respectively.
   - The multimedia producer/parser recognizes the current AutoByteus `<modelName>@<host>` form for audio/image and maps it only when the parsed host matches an exact currently configured AutoByteus host.
   - API/static or unrecognized identifiers do not trigger discovery.
4. It ensures at most the identifiable source and rechecks the registry.
5. If provider/host identity is missing, removed, ambiguous, or the ensure is terminally unavailable, it throws a safe model-unavailable error; it never tries another grammar or discovers every provider.
6. `AutobyteusAgentRunBackendFactory` and media client construction call this boundary before their existing factory lookup.

### `DS-009` — Runtime/source-safe frontend publication

1. Pinia stores credential settings separately from catalog snapshots.
2. Catalog maps are keyed by normalized `runtimeKind` and `ownerProviderId`; source statuses additionally use `modelKind`.
3. Each ensure/reload records request ID plus store epoch.
4. A response publishes only if epoch and same-key request ID remain current.
5. Settings unmount does not clear the shared snapshot or invalidate a legitimate exact-key request; its result remains safe/useful to workspace consumers because it cannot overwrite another key.
6. An explicit application/test store reset advances the global epoch, clears keyed snapshots/in-flight references, and rejects every pre-reset response.
7. All getters require explicit runtime and provider/source identity; no mutable “active runtime” determines publication.
8. AutoByteus post-save uses this same public model action: it allocates only the AutoByteus request ID, marks only that snapshot loading/refreshing, and guardedly applies its targeted ensure response. The preceding credential mutation/action never awaits or adopts the model promise.

### `DS-010` — Host-setting server/client convergence

1. `ServerSettingsEndpointCards` calls the existing `serverSettings.updateServerSetting(key, value)` action; it does not call the catalog directly.
2. The server validates and durably commits the setting. For exactly `AUTOBYTEUS_LLM_SERVER_HOSTS`, `OLLAMA_HOSTS`, or `LMSTUDIO_HOSTS`, `ServerSettingsService` synchronously calls the typed catalog notification before returning.
3. The catalog notification maps the exact constant to AutoByteus, Ollama, or LM Studio; advances only its source generation(s); synchronously removes **all** registry rows for those affected source keys; and starts non-forcing detached ensure(s). It does not retain by URL authority, wait for discovery, or touch unrelated sources.
4. The GraphQL setting result returns independently. As soon as the client Server Settings action verifies that this result confirms durable success, it uses the same exact constant map to invoke `void llmProviderConfig.convergeAfterDiscoverySettingCommit(PROVIDER_SETTINGS_RUNTIME_KIND, { providerId, modelKinds }).catch(safeClientHandler)`, then continues the existing awaited settings-list reload and command result. This order ensures a later settings-list reload failure cannot suppress model convergence after a real commit. It is a direct Pinia-to-Pinia coordination call, not an application event bus.
5. `convergeAfterDiscoverySettingCommit` advances the exact `{runtimeKind, providerId}` request token before clearing only the mapped model-kind arrays/source counts/messages and prior terminal state. AutoByteus clears LLM/audio/image but preserves video; Ollama/LM Studio clear only LLM. This fences any older client ensure/reload response. If no provider snapshot is present, it still continues to the targeted request.
6. It immediately invokes the existing non-forcing `ensureProviderModelCatalog` transport action even when the prior local snapshot was `READY`. The new request owns the next exact-key token and transitions only the affected provider to loading.
7. Because the server scheduled source work synchronously before returning the setting result, the client ensure joins the current source single-flight or reads its current terminal snapshot; it does not force a second adapter call. Its response publishes only through the `DS-009` epoch/key/request guard.
8. Pinia persists while API Keys is unmounted, so the final snapshot is shared with selectors immediately and is present when the user returns. New failure remains cold `ERROR` with no old rows; it cannot relabel the successful settings command.
9. Unrelated setting keys invoke no catalog action. Rapid consecutive saves are safe because newer server generations and client request tokens reject older completions. No global catalog read, global loading state, subscription, durable cache, or model wait is introduced.

## Ownership Map

| Subject | Sole Owner | Not An Owner |
| --- | --- | --- |
| Credential value and configured Boolean | Secret/provider configuration services | Catalog, model presence, frontend inference |
| Provider descriptor | Built-in/custom provider catalog | Model row projection |
| Model rows used for execution | LLM/audio/image/video factory registries | Aggregate server cache, Pinia as server authority |
| Dynamic lifecycle | Provider model catalog source owner | Credential form, individual components |
| Discovery network protocol | Dynamic source adapter | GraphQL resolver/store |
| UI snapshot and request state | Pinia runtime/provider maps | Component-local duplicate catalog arrays |
| Reload eligibility | Provider descriptor `catalogMode` | “has models” heuristic |

## Thin Entry Facades / Public Wrappers

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| GraphQL credential query/mutations | `LlmProviderService` | Transport/auth/error mapping | credential inference or model discovery |
| GraphQL catalog query/mutations | `ProviderModelCatalogService` | Validate runtime/provider and map DTOs | lifecycle maps, registry mutation, global fan-out policy |
| Pinia actions | Server credential/catalog boundaries | Client request orchestration/publication | server row authority or credential truth |
| `ModelAvailabilityService` | Provider catalog source lifecycle | Safe construction entry for persisted IDs | model construction or broad discovery |

## Return Or Event Spine(s)

- `DS-006` ordinary/custom/settings: durable command -> exact result assembled -> synchronous non-I/O source notification when applicable -> command result returned; any detached ensure settles only server lifecycle state.
- `DS-006` AutoByteus client-observable path: server durable credential commit -> server schedules exact LLM/audio/image ensures -> credential response -> Pinia applies configured setting -> API Keys clears credential saving state and shows success -> API Keys invokes but does not await exact-AutoByteus Pinia ensure -> targeted GraphQL response -> guarded AutoByteus snapshot publication. The client request joins server single-flight/terminal state and does not duplicate discovery.
- `DS-009`: server snapshot response -> same runtime/provider request-token check -> Pinia key publication -> component/selector derives localized view.
- `DS-010`: durable supported host-setting commit -> server exact-source generation advance/full row clear/detached ensure -> successful Server Settings client action -> direct non-awaited exact-provider Pinia clear-and-ensure -> same-key guarded publication while API Keys may be unmounted -> current state visible on return.

No distributed event bus is required. Server post-commit notification and client Store-to-Store convergence are typed in-process calls using the same exact setting-key map. Detached server and client promises are independently owned/error-contained; neither changes command finality.

## Bounded Local / Internal Spines

| Parent Owner | Spine | Arrow Chain | Why It Matters |
| --- | --- | --- | --- |
| Dynamic source lifecycle | `DS-003/004/005` | reconcile fingerprint -> terminal/single-flight check -> prepare -> token check -> atomic registry/status commit -> identity cleanup | Governs all same-source ordering without global serialization |
| Remote discovery service | `DS-007` | validate hosts -> start valid peers -> per-host deadline -> all-settled -> configured-order aggregation | Prevents serial/unbounded gateway delay |
| Pinia catalog store | `DS-009/010` | allocate invalidation/request ID -> exact clear when required -> request -> epoch/key check -> publish -> identity cleanup | Rejects wrong-runtime/provider or pre-setting late responses |

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spines | Serves Which Owner | Responsibility | Why It Exists | Risk If Placed On Main Line |
| --- | --- | --- | --- | --- | --- |
| Secret resolution/redaction | `DS-001`, `DS-006`, `DS-007` | credential/discovery adapters | Resolve credentials only at trusted use boundary | Preserves write-only contract | Credential leakage into DTO/fingerprint/log |
| Optional metadata enrichment | `DS-002` | static registry/catalog projection | Improve existing row metadata when cached/available | Metadata is helpful but non-authoritative | Reintroduces static loading delay |
| Safe error/status normalization | `DS-003`, `DS-005`, `DS-007` | source lifecycle | Bound messages/codes and partial counts | UI needs localized recovery state | Transport/client details or secrets leak |
| Command compensation | `DS-006` | custom/Qwen command owner | Restore prior durable state when command commit fails | Existing command invariant | Model lifecycle begins before durable truth |
| Localization/accessibility | `DS-009` | API Keys UI | State copy, announcements, focus stability | Approved UX contract | Discovery logic fragments in components |
| Test-owned reset/shutdown | `DS-003`–`DS-007` | lifecycle singleton | Await/retire owned promises between tests/shutdown | Deterministic isolation | Detached work leaks across test/process boundary |

## Ownership Boundaries

- The credential boundary owns secret validation/commit/configured state. It may notify catalog after commit but cannot wait for or interpret model availability.
- The provider catalog boundary is the authoritative public model-lifecycle entry. It owns source mapping and lifecycle records, while delegating row storage to registries and network mapping to adapters.
- Registry source APIs own atomic row/index invariants. They never decide when to discover.
- Discovery adapters own only external I/O and conversion to prepared rows/status inputs; they never publish.
- The availability boundary owns supported identifier-to-source resolution and targeted ensure before execution; factories remain construction owners.
- Pinia owns client snapshots/request publication only; components must not implement cache/fingerprint rules.

## Source Registry Boundary

The SDK registries gain an internal source ownership index without changing public model identifiers:

```ts
type ModelKind = 'LLM' | 'AUDIO' | 'IMAGE' | 'VIDEO'

type ModelDiscoverySourceKey = Readonly<{
  runtimeKind: string
  ownerProviderId: string
  modelKind: ModelKind
}>

interface SourceOwnedModelRegistry<TModel> {
  ensureStaticInitialized(): Promise<void> // network-free
  listAll(): readonly TModel[]
  listBySource(source: ModelDiscoverySourceKey): readonly TModel[]
  replaceSourceModels(source: ModelDiscoverySourceKey, models: readonly TModel[]): void
  removeSourceModels(source: ModelDiscoverySourceKey): void
}
```

`replaceSourceModels` is one JavaScript run-to-completion commit:

1. validate every candidate's runtime/kind and unique identifier;
2. reject any identifier owned by another source rather than stealing it;
3. remove identifiers previously indexed to this source;
4. add the new models and source index;
5. expose the new source snapshot.

Static rows use an internal static source marker. Source ownership is process metadata only and is not added to persisted identifiers.

## Full Discovery Endpoint Identity

One reusable SDK-owned `normalizeDiscoveryEndpointIdentity(input)` helper governs AutoByteus, Ollama, and LM Studio adapter endpoints. It:

1. trims and parses the URL;
2. rejects missing protocol/authority and credential-bearing URLs;
3. lowercases scheme/hostname and lets URL canonicalization normalize default ports;
4. preserves non-default port, normalized path, and query because they affect the adapter request base;
5. drops only the fragment and redundant trailing root slash; and
6. returns the canonical full base URL used as adapter input and stored as model `hostUrl`.

Ordered endpoint lists in fingerprints are arrays of this full identity, not `URL.host`. The same helper feeds configured-endpoint membership and execution-availability validation. Existing persisted model identifier builders remain unchanged and may encode only authority. After reset, an authority-only parsed identifier is mapped to a current configured full endpoint only when exactly one candidate has that authority; zero or multiple candidates fail safely. A registry row, when present, must have a `hostUrl` whose full normalized identity is still configured. This prevents path/scheme drift without rewriting identifiers or adding compatibility syntax.

Host-setting commits intentionally clear every row for the mapped source rather than trying to retain row subsets. Since one settings value is the source fingerprint and host-only identifiers can collide across scheme/path, full-source clearing is the only unambiguous rule. Unchanged peers are rediscovered by the same contained source attempt; unrelated provider/model-kind source keys remain untouched.

## Source Lifecycle State Machine

```ts
type SourceState =
  | 'IDLE'
  | 'LOADING'
  | 'READY'
  | 'PARTIAL'
  | 'REFRESHING'
  | 'STALE_ERROR'
  | 'ERROR'

type DynamicSourceRecord = {
  generation: number
  currentFingerprint: string
  attemptedFingerprint: string | null
  successfulFingerprint: string | null
  state: SourceState
  safeMessage: string | null
  successfulUnitCount: number
  failedUnitCount: number
  inFlight: Promise<void> | null
}
```

### Fingerprint inputs

| Source | Non-secret fingerprint inputs |
| --- | --- |
| AutoByteus kind | ordered list of normalized full adapter endpoint identities + process-local opaque credential revision + model kind |
| Ollama | ordered list of normalized full adapter endpoint identities + LLM kind |
| LM Studio | ordered list of normalized full adapter endpoint identities + LLM kind |
| Custom provider | provider ID + normalized full base URL + process-local opaque credential revision |

Credential strings, hashes derived from credential strings, and header values are forbidden.

### Ensure algorithm

```text
ensure(key, force = false):
  reconcile record.currentFingerprint with current non-secret inputs
  if !force and inFlight belongs to current fingerprint: join it
  if !force and attemptedFingerprint == currentFingerprint: return local snapshot

  generation += 1
  capture token = { generation, fingerprint }
  create worker and assign as inFlight before awaiting
  state = rowsExist ? REFRESHING : LOADING

  worker:
    prepare discovery result without registry writes
    if token is not current: return without publication
    synchronously replace exact source rows on usable success
    set attemptedFingerprint = fingerprint
    set successfulFingerprint on ready/partial
    publish READY/PARTIAL/STALE_ERROR/ERROR and safe counts/message
    finally clear inFlight only when record.inFlight === worker
```

`force=true` detaches an obsolete in-flight attempt by advancing generation and starts a fresh worker; cancellation may be used as optimization but is not the correctness mechanism.

### Failure semantics

- Fully successful zero rows: `READY`, model count 0.
- Partial AutoByteus success: replace with successful-host rows and `PARTIAL`; this is a successful reusable snapshot.
- Total/cold failure: no row replacement, `ERROR`, current fingerprint marked attempted.
- Failure with prior safe rows for the same logical source: keep rows, `STALE_ERROR`, current fingerprint marked attempted.
- Host identity change removes every row for the affected source before ensure, so its failure is cold/error rather than offering obsolete executable rows. No scheme/path-equivalent-by-authority row is retained.

## Provider-Level Aggregation

`ProviderModelCatalogService` maps provider ID to source keys:

- static provider -> no dynamic key;
- `OLLAMA` -> `{autobyteus, OLLAMA, LLM}`;
- `LMSTUDIO` -> `{autobyteus, LMSTUDIO, LLM}`;
- custom ID -> `{autobyteus, customId, LLM}`;
- `AUTOBYTEUS` -> three keys for LLM/audio/image.

AutoByteus ensure/reload starts its three kind promises together and uses `Promise.allSettled`. The provider snapshot exposes all three statuses; one kind's failure does not reject successful peers or block the credential command.

The UI/store derives provider presentation from per-kind states using this deterministic lattice; it does not replace the source statuses in the DTO:

1. Any active source yields provider loading/refreshing while rows remain governed per source.
2. If at least one source has a **current** successful payload (`READY` or `PARTIAL`) and any peer is `ERROR`, `STALE_ERROR`, or `PARTIAL`, provider presentation is `PARTIAL`. Current peer rows are never described as last-known merely because another kind failed.
3. If no source has a current successful payload, but one or more `STALE_ERROR` sources retain rows, provider presentation is `STALE_ERROR` and stale copy is allowed for those retained rows.
4. If every terminal source is cold `ERROR` and there are no rows, provider presentation is unavailable/error.
5. If all terminal sources are `READY`, provider presentation is ready/ready-empty. A source-level `PARTIAL` always makes the provider partial.

Per-kind diagnostics remain authoritative. In a combination such as LLM `READY` with rows plus audio `ERROR` and image `ERROR` without rows, the provider shows the LLM rows with **Some model sources were unavailable**; it does not show **Showing last known models**. A mixed current-plus-stale combination is also provider partial while the stale kind retains its per-kind warning metadata.

The frontend derivation is explicit rather than encoded as a second cached status:

```text
hasCurrentRows = any source in READY/PARTIAL with modelCount > 0
hasStaleRows   = any source in STALE_ERROR with modelCount > 0
hasProblem     = any source in PARTIAL/ERROR/STALE_ERROR
showPartial    = any source in PARTIAL OR (hasCurrentRows AND hasProblem)
showStale      = NOT showPartial AND NOT hasCurrentRows AND hasStaleRows
showUnavailable= NOT hasCurrentRows AND NOT hasStaleRows AND any source in ERROR/STALE_ERROR
```

Loading/refreshing copy is derived separately from active sources and can coexist with retained rows. These booleans are presentation projections only; Pinia continues storing the server's exact per-kind source statuses and model arrays.

## GraphQL / Service Boundary

### DTOs

```ts
type CatalogMode = 'STATIC' | 'DISCOVERED'

type ProviderDescriptor = {
  id: string
  name: string
  providerType: string
  isCustom: boolean
  baseUrl: string | null
  catalogMode: CatalogMode
}

type ProviderCredentialSetting = {
  provider: ProviderDescriptor
  apiKeyConfigured: boolean
}

type ModelSourceStatus = {
  modelKind: ModelKind
  state: SourceState
  modelCount: number
  successfulUnitCount: number
  failedUnitCount: number
  safeMessage: string | null
}

type ProviderModelCatalogSnapshot = {
  runtimeKind: string
  ownerProvider: ProviderDescriptor
  sources: ModelSourceStatus[]
  llmModels: ModelDetail[]
  audioModels: ModelDetail[]
  imageModels: ModelDetail[]
  videoModels: ModelDetail[]
}
```

`ModelDetail.providerId/providerType/runtime/hostUrl/modelIdentifier` remains actual model identity. `ownerProvider` is display/discovery ownership.
Provider/model availability and error text exist only in `ModelSourceStatus`; `ProviderDescriptor` does not carry the current custom-sync `status/statusMessage` fields because those are discovery facts, not provider identity or credential state.

### Operations

| Operation | Type | Network-discovery behavior |
| --- | --- | --- |
| `providerCredentialSettings(runtimeKind)` | Query | None |
| `providerModelCatalogSnapshots(runtimeKind)` | Query | None; local static/current registry read |
| `ensureProviderModelCatalog(providerId, runtimeKind)` | Mutation | Ensures only that dynamic provider; static is a no-op snapshot |
| `reloadProviderModelCatalog(providerId, runtimeKind)` | Mutation | Rejects static/unknown owner; forces only that dynamic provider |

The former coupled provider-settings-with-models query and all global reload mutations are removed. “Reload all dynamic providers” is not a private compatibility translation.

## Credential / Provider Command Completion Matrix

| Command | Before Durable Commit | Immediate Current-Process Catalog Action | Command Awaits Catalog? | Result |
| --- | --- | --- | --- | --- |
| Ordinary static key save | Existing validation | None | No | Exact `ProviderCredentialSetting` |
| AutoByteus key save | Existing validation | Server: advance three generations, retain rows, detached three-kind ensure. Mounted API Keys: after applying/reporting credential success, start a separate non-awaited exact-provider client ensure that joins/publishes server state. | Credential action: No. Model action is independent. | Exact `ProviderCredentialSetting`; later targeted catalog snapshot through existing ensure mutation |
| Gemini save/activate | Existing setup validation | None; optional metadata refresh is separately detached/non-authoritative | No | Setup + exact credential setting |
| Qwen save | Existing endpoint/key validation | None | No | Setup + exact credential setting |
| Custom probe | Authenticated `/models` call | None | It is the explicit probe | Discovered safe model IDs/names |
| Custom create | Its existing authoritative probe; existing durable/secret compensation | Commit that command's prepared probe rows as initial `READY` snapshot | No post-commit discovery | Exact credential setting/provider plus ready snapshot or creation result containing it |
| Custom delete | Existing durable/secret semantics | Advance/remove exact source state and rows | No | `{providerId, deleted}` |
| Host setting save | Existing settings validation/commit | Server: exact generation advance, full affected-source row removal, detached ensure. Client immediately after confirmed mutation success and before settings-list reload: exact Pinia clear plus separate non-awaited targeted ensure/publication. | Settings action: No. Model action is independent. | Existing setting result; later targeted catalog snapshot through existing ensure mutation |

Detached work must end with an internal `.catch` that records only safe source/status codes. It must not generate an unhandled rejection or log credential material.

## Metadata Enrichment Boundary

`ModelMetadataProvisioningService` no longer wraps the synchronous static catalog read.

- Curated fields ship with static rows immediately.
- Already-cached live metadata may be applied synchronously.
- Missing live metadata is scheduled independently per supported provider and can update only metadata for existing static rows.
- Metadata failure does not create `ERROR`, does not remove a row, and does not enable Reload on a static provider.
- The manual dynamic-provider Reload action does not invalidate unrelated metadata.

## Other Consumer Boundary

### Frontend selectors

The catalog store exposes:

- `providerSnapshots(runtimeKind)`;
- `providerSnapshot(runtimeKind, ownerProviderId)`;
- `ensureProviderModelCatalog(runtimeKind, ownerProviderId)`;
- `reloadProvider(runtimeKind, ownerProviderId)`;
- `convergeAfterDiscoverySettingCommit(runtimeKind, { ownerProviderId, modelKinds })`;
- explicit runtime-scoped combined selectors derived from local snapshots.

Calling the Pinia `ensureProviderModelCatalog` action always sends the provider-targeted, non-forcing server ensure mutation; it does not short-circuit on a locally `READY` snapshot because the client cannot observe a server-side credential/host fingerprint revision by itself. Normal selection/selector callers preserve no-network warm behavior by consulting the local snapshot and invoking the action only for a cold/nonterminal source. The AutoByteus post-save caller deliberately invokes it even when the retained client snapshot is `READY`, so it can join and receive the server-scheduled new-fingerprint result. Force refresh remains a different `reloadProviderModelCatalog` action.

`setLLMProviderApiKey` remains credential-only: mutate, apply the returned setting, and return it. The API Keys runtime—not the credential action—orders the user flow:

```ts
const setting = await store.setLLMProviderApiKey(providerId, apiKey)
saving.value = false
showCredentialSuccess(setting)
if (providerId === 'AUTOBYTEUS') {
  void store.ensureProviderModelCatalog(PROVIDER_SETTINGS_RUNTIME_KIND, 'AUTOBYTEUS')
    .catch(() => undefined) // provider snapshot already carries localized failure
}
```

This sequencing makes success visibly authoritative before the model snapshot enters loading/refreshing. The contained call remains store-owned after navigation and publishes only its exact guarded key.

A general model picker:

1. reads static/current snapshots immediately;
2. renders them without a global loading gate;
3. concurrently invokes `ensureProvider` for configured dynamic descriptors lacking a terminal attempt;
4. applies each result independently.

### Server execution

Add a server-owned `ModelAvailabilityService`; do not make the shared SDK depend on server configuration services. Update:

- `autobyteus-agent-run-backend-factory.ts` before `LLMFactory.createLLM`;
- media generation/client resolution paths before image/audio client factory lookup;
- any other repository call site that constructs by persisted dynamic identifier.

Schema-description helpers that are synchronous may use only current local rows and tolerate missing optional dynamic metadata; they must not start network I/O.

## Canonical Dynamic Identifier Boundary

Availability does not invent identifier syntax. The current producer is made an explicit build/parse contract and both creation and resolution use it.

```ts
// openai-compatible-endpoint-model.ts (or a colocated identity file it owns)
const OPENAI_COMPATIBLE_MODEL_PREFIX = 'openai-compatible:'

buildOpenAICompatibleEndpointModelIdentifier(providerId, modelName)
  // unchanged output: openai-compatible:<providerId>:<modelName>

parseOpenAICompatibleEndpointModelIdentifier(identifier)
  // { providerId, modelName } | null
  // remove exact prefix, split once at the first remaining ':'
```

For `openai-compatible:provider_acme:org/model:tag`, parsing yields provider ID `provider_acme` and model name `org/model:tag`. Splitting every colon is forbidden.

The existing default LLM generator is likewise extracted/delegated to an exported host-scoped build/parse helper without changing output:

```text
<modelName>:ollama@<host>
<modelName>:lmstudio@<host>
<modelName>:autobyteus@<host>
```

The parser is end-anchored on one of the known `:<runtime>@` markers and preserves the complete preceding model name; it does not split arbitrary colons.

The existing audio/image AutoByteus getter delegates to a shared multimedia host-scoped build/parse helper without changing `<modelName>@<host>`; the parser splits at the last `@` so an earlier delimiter remains part of the model name. Because that form does not encode runtime, `ModelAvailabilityService` accepts it only with an audio/image kind and a host equal to a currently configured AutoByteus host. Video is not added to the dynamic inventory.

Parser tests are round-trip tests against the builders, including model names containing `:`, `/`, and tags. The parser has no legacy alternate syntax and no migration responsibility.

## AutoByteus Client Deadline

The existing client gains a discovery-only deadline option or accepts the adapter-owned `AbortSignal`. Do not change the client's inference/media defaults globally.

```ts
const AUTOBYTEUS_MODEL_DISCOVERY_HOST_TIMEOUT_MS = 30_000
```

The timeout error exposed to lifecycle status is a stable safe code/message, not the Axios config or headers. Invalid configured hosts fail locally and do not prevent valid peers from starting.

## Server Settings Invalidation Map

| Setting key | Server affected source keys | Client provider key | Server row action | Client action after settings success |
| --- | --- | --- | --- | --- |
| `AUTOBYTEUS_LLM_SERVER_HOSTS` | AutoByteus LLM/audio/image | `{autobyteus, AUTOBYTEUS}` | Remove every row for all three source keys before detached ensure | Fence/clear only AutoByteus snapshot, then non-awaited exact ensure |
| `OLLAMA_HOSTS` | Ollama LLM | `{autobyteus, OLLAMA}` | Remove every Ollama source row before detached ensure | Fence/clear only Ollama snapshot, then non-awaited exact ensure |
| `LMSTUDIO_HOSTS` | LM Studio LLM | `{autobyteus, LMSTUDIO}` | Remove every LM Studio source row before detached ensure | Fence/clear only LM Studio snapshot, then non-awaited exact ensure |
| Unrelated setting | None | None | Unchanged | No catalog action |

Both server and web use repository constants/a shared tight mapping, never string-prefix matching. `AUTOBYTEUS_LLM_SERVER_HOSTS` is the verified current owner for all three AutoByteus dynamic kinds. If that ownership changes in later source, add the exact new constant-to-kind entry rather than widening matching. The client does not infer affected providers from setting values and does not inspect model identifiers.

## Boundary Encapsulation Map

| Authoritative Boundary | Encapsulated Mechanisms | Upstream Callers | Forbidden Bypass | If API Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `LlmProviderService` | secret lookup/storage/validation and descriptor mapping | GraphQL credential resolvers | catalog infers configured state or reads secret | add an exact credential command/result |
| `ProviderModelCatalogService` | source map, lifecycle records, fingerprints, adapters | GraphQL catalog resolver, command notifications, availability service | direct adapter/factory reload from server caller | add exact snapshot/ensure/reload/notify method |
| Registry source APIs | identifier/source index and atomic commit | catalog lifecycle only | adapter mutates registry | add source-specific prepare/commit port |
| Per-source adapter | HTTP client, fan-out, mapping | catalog lifecycle | GraphQL/store calls adapter | add adapter input/result type |
| `ModelAvailabilityService` | producer-parser invocation, current provider/host mapping, and targeted ensure | agent/media construction | construction code hand-parses or reloads catalog broadly | add exact producer parser/current-source resolver case |
| GraphQL transport | validation and DTO mapping | Pinia/actions | component calls server factory/catalog internals | add explicit operation |
| Pinia store | Apollo request IDs/epochs and keyed snapshots | components/composables | component maintains duplicate catalog cache | add getter/action under store |
| Server Settings client action | durable settings result plus exact dependent-store notification | endpoint editor and generic setting callers | UI component emits a broad model event or waits for discovery | add exact constant-map call to catalog store |

## Dependency Rules

1. GraphQL resolvers depend on credential/catalog facades, never SDK factories directly.
2. Credential services notify catalog through synchronous, non-network methods after durable commit; catalog never reads secret values.
3. Catalog depends on factory registry ports and discovery adapters.
4. Discovery adapters prepare rows; they do not mutate registries.
5. Model factories do not depend on server GraphQL, Pinia, or credential storage.
6. Model execution depends on `ModelAvailabilityService` before factory lookup.
7. UI components depend on Pinia/composables, not Apollo or discovery rules directly.
8. `ModelAvailabilityService` imports producer-owned SDK parsers; it must not duplicate identifier grammar.
9. The API Keys runtime may compose a credential action followed by a contained model action, but the credential store action cannot return/await the model promise.
10. `serverSettings` may depend on the catalog Pinia public convergence action for the three exact discovery-setting constants; the catalog store must not depend back on `serverSettings`, and neither store may add an event bus or global catalog action.
11. Full endpoint normalization is owned once in the SDK/model-discovery identity area and reused by server fingerprint/availability code. `URL.host` alone is forbidden for endpoint validity or row-retention decisions.

## Interface Boundary Mapping

| Interface / API / Method | Subject Owned | Responsibility | Accepted Identity Shape | Notes |
| --- | --- | --- | --- | --- |
| `listProviderCredentialSettings(runtimeKind)` | credential settings | Local descriptor + configured Boolean read | normalized runtime | No catalog dependency |
| `listProviderSnapshots(runtimeKind)` | catalog snapshot | Network-free static/current projection | normalized runtime | May return cold dynamic status |
| `ensureProvider(providerId, runtimeKind)` | dynamic lifecycle | Non-forcing exact-provider ensure | runtime + descriptor owner ID | Static is local no-op |
| `reloadProvider(providerId, runtimeKind)` | dynamic lifecycle | Force exact dynamic provider | runtime + validated dynamic owner ID | Static/unknown rejected |
| `notifyCredentialRevision(providerId)` | source invalidation | Advance exact credential-sensitive generations and schedule contained ensure | built-in/custom provider ID | Never accepts credential value |
| `notifySettingsChange(settingKey)` | source invalidation | Map exact setting constant to affected keys | canonical setting constant | No prefix matching |
| `replaceSourceModels(sourceKey, rows)` | registry rows | Atomic exact-source commit | runtime + owner + model kind | Internal only |
| `normalizeDiscoveryEndpointIdentity(endpoint)` | discovery endpoint identity | Canonicalize full adapter base and compare configured/current row provenance | URL string | Preserves scheme/authority/path/query; no authority-only reduction |
| `ensureModelAvailable(identifier, kind, runtimeKind)` | construction availability | Targeted missing-source ensure and recheck | persisted identifier + kind + runtime | Never global |
| producer-owned `parse*ModelIdentifier(identifier)` | model identity | Decode the exact current builder output | canonical persisted identifier | No alternate/legacy grammar |
| Pinia `applyProviderSnapshot` | client snapshot | Current epoch/request-key publication | runtime + owner + request ID | Server response only |
| Pinia `convergeAfterDiscoverySettingCommit` | client host-change convergence | Fence prior request, clear mapped provider-kind rows/state, send targeted non-forcing ensure | runtime + mapped owner ID/model kinds | Called non-awaited only after setting success |

## Interface Boundary Check

| Interface | Singular Responsibility? | Explicit Identity? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Credential settings | Yes | Yes | Low | Keep model fields/services absent |
| Local snapshots | Yes | Yes | Low | Keep read non-discovering |
| Provider ensure/reload | Yes | Yes | Low | Validate descriptor `catalogMode` |
| Source registry commit | Yes | Yes | Low | Reject cross-source identifier collision |
| Credential/settings notification | Yes | Yes | Medium | Typed provider/setting mapping; forbid generic invalidation |
| Model availability | Yes | Yes for supported IDs | Medium for legacy media IDs | Central conservative resolver; never fan out globally |
| Producer-owned identifier parsers | Yes | Yes | Low | Round-trip against canonical builders; preserve suffix delimiters |
| Pinia publication | Yes | Yes | Low | Require runtime/owner/request token |
| Settings-to-catalog convergence | Yes | Yes | Low | Exact constant map and direct store action; no global event/fetch |

Checks:

- Catalog shapes cannot represent configured state.
- Provider descriptor marks Reload eligibility explicitly; UI does not infer it from row count.
- Actual model identity is never overwritten by discovery grouping.
- Command results contain exact server-owned state and require no coupled refetch.

## Main Domain Subject Naming Check

| Node / Subject | Proposed Name | Natural? | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Public catalog facade | `ProviderModelCatalogService` | Yes | “catalog” mistaken for duplicate cache | Document registry-backed snapshots |
| Per-source controller | `DynamicModelSourceLifecycle` | Yes | Generic helper becoming global coordinator | Instance/record always keyed by exact source |
| Compound identity | `ModelDiscoverySourceKey` | Yes | Confusion with model provider | Retain explicit `ownerProviderId` field |
| Construction precondition | `ModelAvailabilityService` | Yes | Factory responsibility creep | It ensures/rechecks only; factory constructs |
| Non-forcing operation | `ensureProviderModelCatalog` | Yes | Misread as refresh | Terminal-current attempt returns locally |
| Forcing operation | `reloadProviderModelCatalog` | Yes | Misused for static/global | Validate dynamic descriptor |

Do not retain “cached AutoByteus provider” for an aggregate cache that no longer exists. “AutoByteus source” is gateway discovery ownership; “model provider” is the actual upstream identity.

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability | Decision | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Provider/credential authority | Built-in/custom catalogs + secret/config services | Reuse | Already owns identities and configured truth | N/A |
| Model-row storage/construction | LLM/audio/image/video factories | Extend | Already authoritative for executable rows | N/A |
| External source I/O | Existing AutoByteus/Ollama/LM Studio/custom adapters | Extend | Preserve protocol/mapping code; separate prepare from commit | N/A |
| Source lifecycle | Current catalog/cache invalidation code | Create new owned module while replacing old cache coordination | No existing owner expresses exact source terminal state/generation without duplicate rows | Aggregate cache is the defect |
| Catalog public boundary | `ModelCatalogService` | Refactor/rename | Natural facade, but responsibilities must narrow | Do not add a competing peer facade |
| Persisted-ID availability | Current direct factory call sites + SDK identifier producers | Create `ModelAvailabilityService`, extend producer modules with parsers | Server configuration/source mapping must not enter shared SDK factory, while grammar must stay producer-owned | Factory should not depend on server services |
| Client request authority | Existing Pinia store/runtime normalization | Extend | Already shared by Settings/workspace | N/A |
| UI notification/forms | Existing components/localization | Reuse | Preserve interaction patterns | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spines | Governing Owner(s) | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| Provider configuration | descriptors, credentials, custom durable commands | `DS-001`, `DS-006` | `LlmProviderService` | Extend | No discovery awaits |
| Model catalog coordination | snapshots, source map, lifecycle, invalidation | `DS-002`–`DS-007` | `ProviderModelCatalogService` | Refactor | No duplicate rows |
| SDK model runtime | static init, registry/source index, construction | `DS-002`–`DS-005`, `DS-008` | factories | Extend | Network-free initialization |
| Dynamic adapters | remote/probe preparation | `DS-003`, `DS-005`, `DS-007` | per-source adapters | Extend | No registry writes |
| Execution availability | identifier resolution and targeted ensure | `DS-008` | `ModelAvailabilityService` | Create | Server-owned |
| GraphQL transport | DTO mapping and validated entry | `DS-001`–`DS-006` | resolver | Refactor | Thin facade |
| Web catalog state | runtime/provider request publication | `DS-001`–`DS-005`, `DS-009` | Pinia store | Refactor | Credentials separate |
| API Keys UI | approved localized interaction | `DS-001`, `DS-003`, `DS-005`, `DS-009` | section runtime/components | Refactor | No global/static reload |

## Draft File Responsibility Mapping

| Candidate File | Subsystem | Owner / Boundary | Concrete Concern | Why One File | Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| existing `model-catalog-service.ts` | catalog coordination | public catalog facade | snapshot/ensure/reload/notifications | One supported service entry | source domain types |
| new `dynamic-model-source-lifecycle.ts` | catalog coordination | source state machine | record/generation/single-flight algorithm | Independently testable invariant | source key/status |
| new `model-availability-service.ts` | execution availability | construction precondition | invoke producer parsers, map/verify source, ensure/recheck | Distinct from listing/reload UI | source resolver |
| existing factory files | SDK runtime | registry authority | static init/source-owned rows | Registry invariant belongs with factory | source key port |
| existing resolver/store/component files | transport/web | thin entries/client state/UI | map and render owner state | Existing feature boundaries remain natural | GraphQL/domain DTOs |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? | Overlap Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| source key, kind, lifecycle status | catalog domain module near `model-catalog-service` | catalog coordination | Server, adapters, registry ports need exact identity | Yes | Yes | provider/credential record |
| provider descriptor/catalog mode | `llm-providers/domain/models.ts` | provider configuration | Credential and catalog views share identity only | Yes | Yes | carrier of model rows or secret |
| identifier build/parse contracts | parser beside each canonical SDK producer; source mapping inside `ModelAvailabilityService` | SDK identity + execution availability | Producer owns syntax; server owns configured source selection | Yes | Yes | second handwritten grammar or compatibility decoder |
| frontend snapshot/status types | `llmProviderConfigSupport.ts` | web catalog state | Store/components/selectors share one client projection | Yes | Yes | server authority |

## Shared Structure / Data Model Tightness Check

| Shared Structure | One Meaning Per Field? | Redundant Attributes Removed? | Overlap Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `ProviderDescriptor` | Yes | Yes | Low | No configured Boolean/model rows |
| `ProviderCredentialSetting` | Yes | Yes | Low | Only credential read/result may expose it |
| `ModelDiscoverySourceKey` | Yes | Yes | Low | Keep owner distinct from model provider |
| `ModelSourceStatus` | Yes | Yes | Low | Safe status/counts only; no rows/credentials |
| `ProviderModelCatalogSnapshot` | Yes | Yes | Low | Rows are registry projections, not stored aggregate cache |
| Pinia provider snapshot | Yes | Yes | Medium | Key explicitly by runtime/owner and guard request |

## Final File Responsibility Mapping

The mappings below are final responsibilities; exact new filenames may follow repository naming conventions without merging distinct owners.

| File | Subsystem | Owner / Boundary | Concrete Concern | Why One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `llm-providers/domain/models.ts` | provider configuration | shared provider domain | descriptor, credential setting, catalog mode | Tight identity shapes | Yes |
| `model-catalog-service.ts` (renamed if clearer) | catalog | public facade | local snapshots, provider dispatch, typed notifications | One supported boundary | Yes |
| `dynamic-model-source-lifecycle.ts` | catalog | internal governing owner | exact state machine | Central invariant, no transport | Yes |
| `autobyteus-remote-model-discovery-service.ts` | dynamic adapter | gateway adapter | concurrent bounded host preparation | Protocol-specific | Yes |
| `custom-llm-provider-runtime-sync-service.ts` | dynamic adapter | custom source adapter | exact provider prepare/probe commit input | Custom semantics | Yes |
| `model-availability-service.ts` | execution | availability facade | invoke canonical parsers, verify provider/host, targeted ensure | Separate execution responsibility; no grammar ownership | Yes |
| SDK factory files | SDK runtime | registry owner | static init and source-owned row mutation | Construction/data invariant | Yes |
| GraphQL `llm-provider.ts` | transport | thin resolver | exact DTO/operation mapping | Existing transport boundary | Yes |
| Pinia support/store files | web state | client catalog owner | types, maps, guards, actions | Shared cross-component state | Yes |
| `serverSettings.ts` plus exact mapping helper/constant | web state | successful settings command coordinator | notify exact catalog provider after durable success without awaiting | Existing settings action is the only shared host-save boundary | Yes |
| API Keys runtime/components | UI | presentation orchestrator | selection and localized state | Existing feature cohesion | Yes |

## Removal / Decommission Plan

| Item To Remove / Decommission | Why Unnecessary | Replacement Owner / Structure | Scope | Notes |
| --- | --- | --- | --- | --- |
| Coupled `ProviderWithModels` credential authority | Mixes subjects and permits false configured state | descriptor + credential setting/snapshot DTOs | In This Change | No dual shape |
| Descriptor `status/statusMessage` sourced from custom model sync | Places discovery health on identity/credential reads | `ModelSourceStatus` in catalog snapshot | In This Change | Descriptor remains local identity/capability only |
| Discovery-triggering `available*ProvidersWithModels` queries | Local reads must not trigger I/O | `providerModelCatalogSnapshots` | In This Change | Update all callers |
| Global LLM/audio/image/video Reload operations | Unsupported product behavior | provider-targeted dynamic reload | In This Change | No alias/fan-out |
| Global `reloadModels` Pinia/runtime/component action | Same | targeted provider action | In This Change | Remove header control |
| Static-provider selected Reload | No discovery exists | descriptor-driven absent action | In This Change | Reject static mutation calls |
| `CachedAutobyteusLlmModelProvider` aggregate rows/FIFO | Duplicates registry and serializes disjoint sources | registry rows + source lifecycle | In This Change | Collapse/delete as appropriate |
| Eager Ollama/LM Studio in `LLMFactory.initializeRegistry` | Violates static-immediate rule | source adapter invoked by ensure/reload | In This Change | Static init remains network-free |
| Custom “sync all endpoints” on catalog read | One slow provider gates peers | per-provider lifecycle; caller fan-out | In This Change | No aggregate promise |
| Live metadata awaited by snapshot | Metadata is non-authoritative | cached-only + detached enrichment | In This Change | Static rows never wait |
| AutoByteus save followed by frontend full reload | Delays command and refreshes unrelated sources | server detached AutoByteus-only notify | In This Change | Return result first |
| `src/multimedia-management/services/video-model-service.ts` | Dormant global `reloadModels` facade with no production caller | Static `VideoClientFactory` rows through normal snapshot projection | In This Change | Delete file and obsolete tests/imports; do not replace with targeted video reload |
| `src/multimedia-management/providers/cached-video-model-provider.ts` | Duplicate dormant `VideoModel` cache around the authoritative factory | `VideoClientFactory` | In This Change | Delete file and obsolete tests/imports |
| `LlmProviderWithModels` and `CustomProviderReloadStatus` in `llm-providers/domain/models.ts` | Unused superseded coupled/reload shapes weaken current authority | `ProviderModelCatalogSnapshot` + `ModelSourceStatus` | In This Change | Delete declarations; no aliases |

Tests and generated operation types referencing removed surfaces are deleted/rewritten in the same change. No compatibility alias remains.

## Subsystem / File Responsibility Mapping

### `autobyteus-ts`

| File / Area | Responsibility |
| --- | --- |
| `src/llm/llm-factory.ts` | Network-free static initialization; source index; exact list/replace/remove; retain model construction |
| shared discovery endpoint identity helper in the SDK model/endpoint area | Normalize full adapter base URL for fingerprints, provenance, and current-configuration comparison; never reduce to authority only |
| `src/llm/openai-compatible-endpoint-model.ts` (or colocated owned identity file) | Preserve canonical custom builder and export its exact parser |
| `src/llm/models.ts` plus an owned identifier helper if extracted | Preserve default host-scoped identifier output and expose matching Ollama/LM Studio/AutoByteus parser |
| Ollama/LM Studio/custom provider modules | Prepare source rows without global registry mutation |
| `src/llm/autobyteus-provider.ts` | Prepare one host's LLM rows using discovery-only signal/deadline |
| `src/multimedia/audio/autobyteus-audio-provider.ts` | Same for audio |
| `src/multimedia/image/autobyteus-image-provider.ts` | Same for image |
| multimedia model identifier helper used by audio/image models | Preserve `<modelName>@<host>` output and expose matching parser |
| `src/clients/autobyteus-client.ts` | Accept request-scoped abort/deadline without changing inference defaults |
| multimedia factory/model-service equivalents | Exact source list/replace/remove for AutoByteus rows |

### `autobyteus-server-ts`

| File / Area | Responsibility |
| --- | --- |
| `src/llm-management/llm-providers/domain/models.ts` | Tight descriptor, credential setting, catalog mode |
| built-in/custom provider catalogs | Local descriptor inventory and dynamic/static classification |
| `src/llm-management/services/model-catalog-service.ts` | Evolve/rename to provider catalog facade: local snapshots, targeted ensure/reload, invalidation |
| new source-lifecycle module under `llm-management/services` | Exact record/state machine and adapter dispatch |
| `autobyteus-remote-model-discovery-service.ts` | Concurrent `30,000ms` per-host all-settled preparation and safe status |
| `custom-llm-provider-runtime-sync-service.ts` | Per-provider prepare/commit; seed from create probe; no all-provider page-load sync |
| `llm-provider-service.ts` | Credential command results and post-commit notifications |
| `audio-model-service.ts`, `image-model-service.ts` | Registry-backed source operations, not aggregate caches |
| `model-metadata-provisioning-service.ts` | Cached-only immediate enrichment plus detached best effort |
| `src/services/server-settings-service.ts` | Exact post-commit source invalidation notifications |
| new `model-availability-service.ts` | Invoke canonical parsers, validate current provider/host ownership, and target pre-construction ensure |
| `autobyteus-agent-run-backend-factory.ts`, media execution | Call availability facade before lookup |
| `src/api/graphql/types/llm-provider.ts` | New DTOs/local queries/targeted mutations; remove global operations |

### `autobyteus-web`

| File / Area | Responsibility |
| --- | --- |
| `graphql/queries/llm_provider_queries.ts` | Separate credential and local snapshot operations |
| `graphql/mutations/llm_provider_mutations.ts` | Provider-targeted ensure/reload only |
| `generated/graphql.ts` | Regenerated exact contracts |
| `stores/llmProviderConfigSupport.ts` | Provider/source snapshot and lifecycle types |
| `stores/llmProviderConfig.ts` | Runtime/provider keyed local snapshots, request guards, credential-only save action, and independent targeted model action |
| `stores/serverSettings.ts` plus a tight discovery-setting mapping helper if extracted | After durable settings success/reload, map only the three supported keys and invoke non-awaited exact-provider catalog convergence |
| `useProviderApiKeySectionRuntime.ts` | Fast credential init; success-first AutoByteus save orchestration followed by non-awaited exact ensure; selected dynamic ensure; no global reload |
| `ProviderAPIKeyManager.vue` | No page-header Reload/whole model spinner |
| `ProviderModelBrowser.vue` / `ProviderModelSection*.vue` | Static/no-action and dynamic localized states; mixed current/cold partial copy distinct from retained stale copy |
| other runtime/model-selection composables/stores | Explicit runtime reads and independent missing-source ensures |
| localization files | Approved loading/refreshing/partial/stale/unavailable copy |

The paused `IR-003` tree is corrected in place only after architecture Pass. Its descriptor separation, source lifecycle, and runtime request guards remain valid; the four `CRR-001` corrections and complete aggregate/global cleanup are mandatory before re-review.

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner / Boundary | Responsibility | Why Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/llm/llm-factory.ts` | File | LLM registry | Static init; source index/replace/remove; construction | Existing executable row authority | Server settings, GraphQL, discovery orchestration |
| `autobyteus-ts/src/.../discovery-endpoint-identity.ts` (exact capability-local filename) | File | Discovery endpoint identity | Full URL normalization reused by adapters/server | Endpoint syntax is SDK/protocol-level, not GraphQL/UI policy | Secrets, configured-provider lookup, authority-only identity |
| `autobyteus-ts/src/llm/openai-compatible-endpoint-model.ts` and host-scoped identifier helper | Files | Canonical LLM identity producers | Unchanged builders plus exact exported parsers | Prevent grammar drift in availability | Server provider lookup or compatibility syntax |
| `autobyteus-ts/src/llm/*provider*.ts` | Files | LLM adapters | Prepare provider-specific model objects | Existing provider protocol area | Global registry mutation during prepare |
| `autobyteus-ts/src/multimedia/{audio,image}` plus shared owned identity helper | Folders/Files | Media registries/adapters/identity producer | Equivalent source ownership/preparation and unchanged `name@host` builder/parser | Existing media capability areas | Aggregate cross-kind state or source policy |
| `autobyteus-server-ts/src/llm-management/llm-providers/domain/models.ts` | File | Provider domain | Descriptor/credential/catalog mode | Existing provider shape owner | Model arrays, secret values |
| `autobyteus-server-ts/src/llm-management/services/model-catalog-service.ts` | File | Catalog facade | Local snapshot, targeted dispatch, typed notifications | Existing public service entry | Duplicate row cache or global reload |
| `autobyteus-server-ts/src/llm-management/services/dynamic-model-source-lifecycle.ts` | New file | Source lifecycle | State machine/single-flight/generation | Same subsystem, separately testable | GraphQL/UI or credentials |
| `autobyteus-server-ts/src/llm-management/services/model-availability-service.ts` | New file | Availability facade | Invoke SDK parsers, validate current source, and target ensure | Server owns configured source context | Identifier grammar, factory construction, or global fan-out |
| `autobyteus-server-ts/src/llm-management/services/autobyteus-remote-model-discovery-service.ts` | File | Gateway adapter | Host fan-out/deadlines/ordered result | Existing remote discovery owner | Registry publication |
| `autobyteus-server-ts/src/api/graphql/types/llm-provider.ts` | File | Transport facade | DTOs/local queries/targeted mutations | Existing schema area | Lifecycle/cache policy |
| `autobyteus-server-ts/src/services/server-settings-service.ts` | File | Settings command owner | Exact post-commit catalog notifications | Existing durable writer | Discovery waits |
| `autobyteus-server-ts/src/multimedia-management/services/video-model-service.ts`; `.../providers/cached-video-model-provider.ts` | Files to delete | Obsolete global/cache owners | No replacement file | Static video registry is already authoritative | Retention or aliases |
| `autobyteus-web/stores/llmProviderConfig*.ts` | Files | Client catalog owner | Runtime/provider maps, guards, independent credential/model actions | Existing Pinia authority | Server truth inference or credential awaiting model |
| `autobyteus-web/stores/serverSettings.ts` and tight exact-key mapping helper if extracted | File(s) | Client settings command owner | After success, directly start non-awaited exact-provider convergence | Covers all callers of supported setting keys while preserving component thinness | Event bus, global catalog reset, awaited discovery |
| `autobyteus-web/components/settings/providerApiKey/*` | Folder | API Keys UI | Approved selected-provider presentation and success-first contained AutoByteus ensure orchestration | Existing cohesive feature folder | Apollo/discovery/fingerprint policy |
| GraphQL query/mutation/generated/localization files | Files | Web transport/content | Exact operations/types/copy | Existing capability folders | Obsolete global operations |

## Folder Boundary Check

| Path / Folder | Structural Depth | Clear Ownership? | Risk | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `autobyteus-ts/src/llm` | Main-Line Domain-Control + adapter (existing justified mix) | Yes | Medium | Keep registry APIs in factory and provider I/O in provider files; do not add server coordination |
| `autobyteus-server-ts/src/llm-management/services` | Main-Line Domain-Control | Yes | Low | Catalog lifecycle/availability share model-management subject but separate files |
| `autobyteus-server-ts/src/llm-management/llm-providers` | Persistence-Provider/domain | Yes | Low | Provider descriptor/custom durable concerns remain separate from catalog lifecycle |
| `autobyteus-server-ts/src/api/graphql/types` | Transport | Yes | Low | Resolver remains thin |
| `autobyteus-server-ts/src/services` | Mixed existing top-level services | Medium | Medium | Server settings remains in place; only typed post-commit call crosses to catalog |
| `autobyteus-web/stores` | Main-Line client state | Yes | Low | Catalog Pinia owns model snapshots; Server Settings calls its narrow public convergence action after exact saves, with no reverse dependency |
| `autobyteus-web/components/settings/providerApiKey` | Presentation | Yes | Low | Localized state only; logic stays in runtime/store |

## Applied Patterns

- Command/query separation: local snapshot query versus targeted side-effectful ensure/reload.
- Single-flight per exact source.
- Generation-checked stale-result suppression.
- Prepare/commit: asynchronous discovery prepares rows; synchronous current-generation commit mutates registry.
- Stale-while-refreshing display for explicit/manual or post-credential refresh.
- Source-indexed registry ownership.
- Adapter isolation for host/network policy.
- Direct keyed store coordination for the one cross-section host-save return path; no event bus.
- Success-first command composition: credential action settles, then UI fires an independent exact model action whose response completes the pull-based client lifecycle.
- Producer-owned build/parse identity contracts.

## Concrete Examples / Shape Guidance (Mandatory)

| Topic | Good Example | Bad / Avoided Shape | Why It Matters |
| --- | --- | --- | --- |
| Credential/catalog split | Credential query returns descriptor + Boolean only | Catalog row supplies `apiKeyConfigured: false` | Keeps one truthful authority |
| Cache hit | `attemptedFingerprint === currentFingerprint` returns registry snapshot | Navigation silently refetches | Matches approved manual-refresh workflow |
| Same-source race | Prepare -> token check -> synchronous exact-source commit | Async adapter writes registry before owner check | Prevents obsolete publication |
| Cross-source concurrency | Ollama and custom replace disjoint source keys concurrently | Global FIFO serializes all registries | Keeps design proportional |
| Persisted construction | Parse exact source -> ensure one -> recheck | “Model missing” triggers reload all | Avoids broad latency and ambiguity |
| Custom creation | Create mutation probe rows seed ready snapshot | Commit then start another `/models` request | Avoids duplicate post-commit work |
| AutoByteus save publication | Credential success -> `void ensure(AUTOBYTEUS)` -> guarded provider snapshot | Server-detached work with no client pull/event | Makes approved mounted UI transition observable |
| Host-setting publication | Setting success -> exact mapped provider/kinds clear -> `void ensure(provider)` -> guarded shared snapshot | Server-only invalidation or whole-catalog reset/event | Makes cross-section change observable without global coordination |
| Endpoint identity | Full normalized adapter base; clear exact source on commit | Retain by `URL.host` | Prevents old scheme/path rows from executing |
| Mixed kind state | LLM `READY` + audio `ERROR` -> provider partial/current copy | `hasModels && hasError` -> stale copy | Preserves freshness meaning |
| Custom persisted identity | Producer/parser round-trip `openai-compatible:provider_acme:org/model:tag` | Handwritten `:openai_compatible@provider` grammar | Ensures exact provider after restart without migration |

### Static provider selection

```text
select OPENAI
 -> local snapshot contains curated OpenAI rows
 -> no ensure mutation
 -> no Reload control
```

### Cold Ollama selection

```text
select OLLAMA
 -> local snapshot state IDLE, zero rows
 -> ensureProviderModelCatalog(OLLAMA, autobyteus)
 -> only Ollama adapter runs
 -> current generation replaces OLLAMA/LLM source rows
```

### Warm Ollama revisit

```text
select OLLAMA
 -> attemptedFingerprint equals current host fingerprint
 -> rows render
 -> no network request
```

### AutoByteus key replacement while old discovery is pending

```text
C1 generation 4 is pending
credential commit succeeds
invalidate LLM/audio/image -> generation 5, retain safe rows
schedule C2 for generation 5
return credential success
Pinia applies configured state; API Keys clears saving and shows success
API Keys starts (does not await) exact AutoByteus client ensure C3
C3 joins C2 for LLM/audio/image or reads its terminal result
C1 resolves -> token mismatch -> no row/status/cleanup publication
C2 resolves -> exact kind commits, identity-guarded cleanup
C3 response guardedly replaces only Pinia[autobyteus][AUTOBYTEUS]
adapter calls: one per exact AutoByteus source key, not one for C2 plus another for C3
```

### Persisted custom provider after process reset

```text
producer persists openai-compatible:provider_acme:org/model:tag
process reset clears dynamic registry/lifecycle; durable custom provider remains
agent launch requests the exact persisted identifier
canonical custom parser -> { providerId: provider_acme, modelName: org/model:tag }
availability verifies provider_acme, ensures only its LLM source once, rechecks registry
LLMFactory constructs the exact original identifier
```

### Host change while manual Reload is pending

```text
C1 reload for http://gateway.example/base-a, generation 7, pending
Pinia[autobyteus][AUTOBYTEUS] is READY with base-a rows
host setting commits https://gateway.example/base-b (same authority)
server generation 8 + full endpoint fingerprint; all AutoByteus rows removed; C2 scheduled
setting response returns; settings success is independent
Server Settings calls non-awaited convergeAfterDiscoverySettingCommit(autobyteus, AUTOBYTEUS, [LLM,AUDIO,IMAGE])
client request token advances; exact AutoByteus LLM/audio/image Pinia rows clear; C3 targeted ensure starts
C3 joins C2; API Keys may remain unmounted
C2 publishes base-b rows; C3 guarded response publishes exact Pinia key
C1 resolves later -> rejected before registry commit; older client response also token-rejected
return to API Keys -> base-b rows/current status, never base-a rows
```

Because both C1/C2 target the same exact source, generation ordering suffices. A different source writes a disjoint source index, so no global FIFO is needed.

## Backward-Compatibility Rejection Log

| Candidate | Decision / Rationale |
| --- | --- |
| Keep old coupled provider-settings query for hidden callers | Rejected; preserves accidental discovery trigger and false credential authority. Update all callers. |
| Keep global Reload as an unadvertised alias | Rejected; contradicts approved product surface and recreates aggregate coordination. |
| Allow Reload on static provider as a no-op | Rejected; misleading UX and unnecessary transport. |
| Retain aggregate cache as “optimization” | Rejected; registry already stores rows; duplicate invalidation/race risk exceeds benefit. |
| Retain global FIFO around registry writes | Rejected; exact source replacement makes disjoint writes safe; same-source generation controls order. |
| Add durable cache to improve restart | Rejected; no persistence behavior was approved. |
| Change saved model identifiers to encode source more explicitly | Rejected for this ticket; persisted data is Not Affected. Use centralized parser/current configuration. |
| Accept both canonical custom IDs and the mistaken `:openai_compatible@provider` form | Rejected; the latter was never the authoritative producer output and would create needless compatibility policy. Parse only the canonical existing builder output. |
| Add an event bus/subscription or reset/fetch the whole client catalog after host save | Rejected; one exact direct store action covers the supported cross-section path without broad coordination or unrelated loading. |
| Retain same-authority endpoint rows across a host-setting change | Rejected; scheme/path are adapter identity and host-only persisted identifiers cannot make retention unambiguous. Clear the exact source. |

## Derived Layering

```text
Web presentation
  -> Pinia credential/catalog client boundary -> GraphQL transport facades
  -> Server Settings action -> GraphQL settings facade
                            --exact successful host key--> catalog Pinia convergence action
GraphQL transport facades
      -> Provider configuration owner         -> secret/custom/settings stores
      -> Provider model catalog owner
           -> dynamic source lifecycle
              -> discovery adapters
              -> source-owned SDK registries

Agent/media execution
  -> Model availability facade
    -> provider model catalog owner (only if missing)
    -> existing SDK factory construction
```

The catalog facade is a governing owner for discovery lifecycle, not a row repository. The SDK factories are governing owners for executable rows, not discovery timing. This division is the reason the aggregate cache and global FIFO are unnecessary.

## Change / Refactor Sequence

1. Preserve/rebase the already-correct descriptor/credential split and remove obsolete configured-state catalog fields.
2. Refactor SDK static initialization, introduce exact source registry indexing/APIs, and export parse helpers beside canonical dynamic identifier builders without changing output.
3. Introduce source lifecycle and prepare/commit adapters with deterministic tests.
4. Implement local snapshot, provider ensure/reload, AutoByteus host policy, and removal of aggregate cache/FIFO/global reload.
5. Rewire credential/custom/host commands to synchronous lifecycle notifications and detached refresh rules; normalize full endpoint identity and clear exact sources on host commit.
6. Replace GraphQL contracts and regenerate client types.
7. Refactor Pinia to runtime/provider snapshots, exact host-change clear-and-ensure convergence, and independent credential/targeted model operations; remove global actions.
8. Update API Keys and Server Settings composition to approved provider-local UX, including credential-success-first AutoByteus ensure, successful host-save direct store convergence, and truthful mixed partial/stale copy.
9. Update all other selector and execution paths to explicit static/current reads, canonical producer parser use, and targeted ensure.
10. Delete obsolete code/tests, including the two dormant video files and two dead provider domain types; run implementation-scoped checks and hand off to code review.

## Verification Matrix

| Concern | Required Coverage |
| --- | --- |
| Credential independence/performance | Server query spy proves no catalog call; browser pending-discovery state; packaged cold `<=1,500ms` surface |
| Static immediate | Delayed all discovery/metadata promises while every static row is readable |
| Cache hit | Adapter call count unchanged on repeat ensure/visit after every terminal state |
| Source single-flight | Two same-key ensures share one deferred adapter promise |
| Stale publication | C2-before-C1 and C1-before-C2 deferred tests for manual reload, key change, custom delete, and host change on both server generation and client provider request token |
| Disjoint replacement | Concurrent Ollama/custom/AutoByteus updates preserve every unrelated source |
| AutoByteus fan-out | All host calls observed started before release; `30,000ms` signal/deadline; configured order; partial/total failure |
| Command finality | Credential/custom/host command settles before detached model promise; no unhandled rejection |
| AutoByteus client publication | Start with old Pinia AutoByteus `READY`; deferred server refresh + credential mutation + client ensure proves: configured state/success first; credential action settles without model promise; explicit client action does not short-circuit old snapshot; only AutoByteus becomes refreshing; final rows/status publish; each LLM/audio/image adapter is called once because client demand joins server single-flight |
| Full endpoint invalidation | For AutoByteus, Ollama, and LM Studio, change `http://host/path-a` to `https://host/path-b` with the same authority; before replacement settles assert all exact-source registry rows are absent. Cover replacement success and failure; no old `hostUrl` can construct. |
| Host-setting client convergence | Seed exact provider Pinia `READY`; navigate API Keys -> Server Settings; save each supported key while deferred server ensure is pending; assert settings action/success settles, only mapped provider token/rows/state advances, targeted non-forcing ensure is sent, older client response is rejected, final response publishes while API Keys is unmounted, and return never shows old rows. Unrelated key makes zero catalog calls. |
| Mixed AutoByteus state | Compose LLM `READY` rows plus audio/image cold `ERROR`; provider renders current rows with partial copy and no stale copy. Cover all-stale and current-plus-stale lattice branches. |
| Custom probe reuse | Create mutation makes its one authoritative `/models` probe, uses those rows as ready, and makes zero post-commit discovery calls; optional preview probe is tested separately |
| UI affordances | No global button; no static Reload; dynamic Reload only; rows retained while refreshing |
| Runtime publication | Settings -> Workspace overlap, AutoByteus post-save navigation, host-save section navigation, and store reset reject wrong runtime/source response |
| Identifier contracts | Builder/parser round trips cover custom `openai-compatible:<providerId>:<modelName>`, host-scoped Ollama/LM Studio/AutoByteus LLM, and AutoByteus media; delimiter-bearing model names are preserved; mistaken compatibility grammar is rejected |
| Other consumers | Selector shows static while sources pend; after registry/lifecycle reset, exact saved `openai-compatible:provider_acme:org/model:tag` ensures `provider_acme` once and constructs; equivalent current Ollama/LM Studio/AutoByteus identifiers ensure exact sources |
| Secrets | GraphQL/log/error snapshots contain no credential material |
| Persistence | No schema/migration/write path added |
| Legacy removal | Repository search proves obsolete GraphQL/store/component global reload and aggregate cache/FIFO paths absent; `video-model-service.ts`, `cached-video-model-provider.ts`, `LlmProviderWithModels`, and `CustomProviderReloadStatus` are absent with no aliases/imports/tests |

## Key Tradeoffs

- A failed terminal attempt is cached until explicit Retry or input change. This avoids repeated unwanted network work but means recovery is not automatic.
- Process restart loses dynamic snapshots. This keeps the design migration-free and matches user approval.
- Exact source ownership adds an internal registry index, but removes duplicate aggregate rows and makes invalidation tractable.
- Clearing the full affected source on host edits briefly discards rows from unchanged peers in that source list, but it prevents ambiguous scheme/path retention and only runs on explicit configuration change.
- AutoByteus provider-level Reload fans out three model kinds, but preserves kind-scoped registry commits and partial status.
- `30,000ms` is materially longer than the superseded 3s proposal, favoring legitimate gateways while still bounding the prior indefinite wait; credential UI does not wait for it.

## Risks

- Current AutoByteus media `name@host` and host-scoped LLM identifiers do not encode full scheme/path; kind plus unique configured full-endpoint resolution is required, and ambiguous/unmatched values fail conservatively.
- Source collision validation may expose pre-existing ambiguous identifiers; diagnostics must identify source keys without secrets.
- Detached work must be owned through shutdown/test reset so it cannot leak between tests.
- The paused `IR-003` focused suites passed without covering `CR-PREM-001`–`003`; implementation and review must execute the new deterministic cases rather than infer correctness from those earlier results.

## Guidance For Implementation

- Treat this document and `requirements.md` as authority over the uncommitted paused source.
- Implement one representative LLM source end-to-end first, validate lifecycle invariants, then apply the same source contract to other dynamic kinds.
- Keep discovery “prepare” functions free of registry/status mutation.
- Make source-key replacement synchronous and test it directly.
- Mark terminal failure attempts so provider navigation does not auto-retry.
- Never derive a fingerprint from a secret or log request headers.
- Never await detached model work from a credential/settings command.
- Invoke client host-change convergence only after successful durable settings mutation/reload; advance the exact provider token before clearing, and contain the detached client rejection.
- Use the full normalized adapter endpoint everywhere source identity is compared. Never use `URL.host` as an endpoint identity or attempt same-authority row retention.
- Derive partial/stale provider presentation from per-source freshness semantics, not simply `hasModels && hasError`.
- Remove obsolete paths in the same change; do not leave compatibility aliases.
- Do not create `implementation-handoff.md` from design work; the implementation engineer owns it after realignment.
