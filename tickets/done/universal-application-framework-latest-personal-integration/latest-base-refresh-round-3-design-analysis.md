# Latest-Base Refresh Round 3 Design Analysis — Personal v1.4.56

## Status And Decision

- Current status: **Implemented and verified in DR-007**. This file is retained as the historical v1.4.56 provider/physical-scope authority. The current unmerged v1.4.57 delta is governed by `latest-base-refresh-round-4-design-analysis.md` and must not reinterpret the decisions below.
- Solution revision: `SR-007` (revises SR-006 after `ARCH-REV-006` AR-004/AR-005).
- Protected ticket checkpoint: `a23849f165879050e2c9b676a2e9652d8a593c93`.
- Integrated Personal base: `7edfb162559ec5a6eb4c00c23a929920eabe3dc1`.
- Superseded reviewed target: `a00f0d07d00450785c424b6ab79d2ca8fe828869`.
- Current required target: `origin/personal@c5b87df4d6db15969ba70adee9dfd8394b1e7385` (`v1.4.56`).
- Decision: **bounded Design Impact corrected for re-review**. Keep the history-preserving semantic-merge strategy and all passed application-platform behavior; use Personal's real provider-granularity discovery and snapshot-settled UI contract; remove runtime-only cross-leaf model caching.
- Repository safety: the merge preview was non-mutating; `HEAD` is unchanged and the index has zero unmerged entries. No production source was edited during solution design.

The current target is 22 commits beyond the integrated Personal base and 17 commits beyond the previously reviewed `a00f0d...` target. That delta changes 2,194 paths (`2,069` add, `98` modify, `27` delete; 474,977 insertions and 6,504 deletions). A fresh merge-tree preview still has five content conflicts and ten changed-both paths. Production/runtime semantics remain unchanged after `3ab4946c7...`: the six later commits change 1,942 paths (`1,938` add, `4` modify), consisting only of 1,934 files under isolated `ui-prototypes/autobyteus-web-prototype` and eight prototype/API-key ticket or delivery-record paths. Root `pnpm-workspace.yaml` and shared production/runtime source are unchanged. The large raw delta is therefore a completed Personal provider-catalog/API-key feature plus an independent approved prototype baseline; the application-framework adaptation remains bounded to its model-selection/readiness seam, one shared web composable, the already-designed physical-scope seam, and coupled tests.

## Governing Behavior Contract

1. Latest Personal is authoritative for provider descriptors, credential settings, static catalog initialization, provider/kind-keyed dynamic lifecycle, identifier-to-provider resolution, provider-granularity discovery, exact identifier/endpoint post-check, source snapshots, GraphQL/store contracts, media catalog ownership, and provider settings UI behavior.
2. The verified ticket remains authoritative for explicit Studio/standalone assembly, four narrow application-platform projections, package defaults, sparse host overrides, application readiness, graph-local run/session/memory dependencies, scoped Agent Tools, publication/projection, and build-once application developer experience.
3. Application model validation delegates a selected dynamic identifier to Personal's owning-provider availability operation and then reads a fresh exact `ModelInfo` for every leaf. It does not copy provider catalogs, perform eager all-provider discovery, create endpoint-local lifecycle state, resurrect deleted provider services, or retain a runtime-only model cache.
4. Studio and standalone retain different host startup/ingress. After application readiness, both execute the same application configuration and business paths.
5. The previously approved `TeamRunPhysicalScope` and memory migration design remains mandatory and is combined with the new provider delta in the same semantic merge.
6. The post-`3ab` prototype subtree remains Personal-owned isolated evidence/product-prototype content. Merge it byte-for-byte, keep it outside the root pnpm workspace and production dependency graph, and do not treat its copied/vendored snapshot as a second application-platform implementation.

## Product-Reachability Matrix

| Premise | Independent supported trigger | Forward path | Reachability | Material consequence |
| --- | --- | --- | --- | --- |
| A package or saved Studio override selects an AutoByteus model whose provider is dynamic. | Open a maintained application in Studio or start a standalone-capable package, then evaluate readiness. | package/saved selection -> application configuration service -> current-model policy -> Personal identifier-to-provider resolution/provider ensure -> exact endpoint post-check -> fresh leaf model lookup -> host readiness | Reachable | A static-only check or endpoint-local assumption would falsely reject a valid model or contradict Personal's provider owner. |
| One team has two leaves backed by different dynamic providers in the AutoByteus runtime. | Configure distinct per-member models in Studio or package defaults, then evaluate readiness. | leaf A provider ensure -> fresh A lookup -> credential A -> leaf B provider ensure mutates registry -> fresh B lookup -> credential B | Reachable | A runtime-only model-list cache captured after A can falsely reject B. |
| A provider credential is present or missing after Personal separates credential rows from model snapshots. | Evaluate an AutoByteus-runtime application selection. | resolved model -> serving-runtime credential-owner mapping -> network-free credential setting -> runnable or authentication issue | Reachable | Calling removed `listProviderSettings()` would not compile; treating the model creator as the discovery owner can check the wrong secret. |
| Studio edits a sparse application launch profile while a dynamic provider fails. | Select/edit an application agent or team member in the existing setup panel. | inherited runtime -> immediate snapshot -> missing-provider actions -> failed provider records `ERROR`/`STALE_ERROR` -> `Promise.allSettled` fulfills -> composable re-reads rows/status | Reachable | Treating `.catch` as the normal failure owner misses Personal's status authority and can lose stale rows. |
| The application uses a static current model or a removed static model identifier. | Read, Save, or directly launch a package/default/override. | exact identifier -> static membership -> runnable or `CURRENT_MODEL_SELECTION_REQUIRED` | Reachable | Removed values must stay visible and block without rewrite; current values must not incur network discovery. |
| A nested configured/task member starts after upgrade. | Run or restore a nested team in either host. | team physical scope -> injected memory/session family -> prepared activation -> provider -> exact cleanup | Reachable | Selecting either conflict side wholesale loses either current nested memory placement or application graph-local isolation. |

No material premise depends on a hypothetical public API, a new host mode, or an unsupported application package.

## Semantic Authority Matrix

| Concern | Authoritative source/owner | Target treatment | Forbidden alternative |
| --- | --- | --- | --- |
| Provider descriptors and credentials | Personal `BuiltInLlmProviderCatalog` + `LlmProviderService` credential methods | Accept current descriptor/credential contracts; application credential adapter calls the exact network-free credential read | restore aggregate provider settings containing model rows |
| Static LLM/media rows | Personal factories and `ModelCatalogService` | Initialize/list locally without network | eager remote discovery at process/application startup |
| Dynamic catalogs | Personal `DynamicModelSourceLifecycle` + `ModelCatalogService` | Preserve provider/kind-keyed ensure/reload, fingerprints, snapshots, publication, and each provider's configured-host/kind breadth | global all-provider reload, endpoint-local application lifecycle, application cache, or parallel lifecycle |
| Exact selected-model availability | Personal `ModelAvailabilityService` consumed by application current-model policy, then fresh host-validator lookup | Static identifiers use current membership; canonical dynamic identifiers resolve one provider, run that provider ensure, pass exact registration/endpoint post-check, then obtain a fresh exact `ModelInfo` per leaf | runtime-only model cache, application endpoint discovery, or accepting name aliases |
| Application launch/readiness | Ticket `ApplicationLaunchConfigurationService`, guard, host validator, run binding service | Retain package baseline, sparse override, no-write read, readiness, Save, and pre-allocation direct-run enforcement | Personal's retired application configuration owner or read-time repair |
| Credential ownership | Personal model `runtime` plus credential setting owner | API -> model provider; OpenAI-compatible -> custom provider; AutoByteus gateway -> `AUTOBYTEUS`; Ollama/LM Studio -> no API key; Codex/Claude retain native auth checks | creator-provider lookup for gateway/local models or model discovery inside credential check |
| Studio model picker | Personal `llmProviderConfig` snapshot store + ticket inherited runtime semantics | Publish initial snapshot immediately, await `Promise.allSettled` missing-provider attempts, then re-read rows and `ERROR`/`STALE_ERROR` source status | normal-failure `.catch`, old array getter, blocking global discovery, or losing null inherited runtime |
| Isolated UI prototype | Personal `ui-prototypes/autobyteus-web-prototype/**` | Preserve the approved subtree exactly as non-workspace content; verify root workspace membership and production imports are unchanged | semantic merge edits, application-platform ownership, root workspace inclusion, or using prototype copies as production authority |
| Nested team physical data | Personal `TeamRunPhysicalScope` and migration | Preserve SR-005 exact combined implementation | root-only path, runtime dual read, or global session/memory lookup |

## Target Model-Selection And Credential Contract

### Identifier classification

`ApplicationCurrentModelSelectionPolicy` remains the one application-facing policy used by readiness, Save, and direct launch. Its AutoByteus-runtime branch is revised as follows:

1. Trim and validate the exact identifier; aliases and model display names are never accepted.
2. Classify canonical dynamic identifiers only through Personal's parsers:
   - `parseOpenAICompatibleEndpointModelIdentifier` for custom endpoints;
   - `parseHostScopedLlmModelIdentifier` for Ollama, LM Studio, and AutoByteus gateway identifiers.
3. For a static identifier, call `LLMFactory.requireCurrentModelIdentifier`. This is network-free after Personal's static initialization. A removed/blank static identifier remains `CurrentModelSelectionRequiredError`.
4. For a canonical dynamic identifier, call the process-owned `ModelAvailabilityService.ensureModelAvailable(identifier, "LLM", "autobyteus")`. It resolves one provider ID, invokes `ModelCatalogService.ensureProviderModelCatalog(providerId, runtime)`, and then checks exact registered identifier/endpoint identity. Ollama/LM Studio providers enumerate configured hosts; AutoByteus settles its LLM/audio/image source operations; a custom provider is one endpoint record. Application code does not narrow that provider work to an endpoint-local lifecycle.
5. A canonical dynamic identifier whose source/model cannot be resolved throws an application-safe `ApplicationModelAvailabilityError` from the existing policy module. Readiness and Save map it to a blocking `MODEL_UNAVAILABLE` issue; direct run rejects before allocation. It is not mislabeled as a removed static selection.
6. Codex and Claude identifiers bypass AutoByteus catalog/availability and retain their runtime-owned model/authentication paths.

The policy owns no provider catalog, cache, store, discovery state, or credential. Its dependencies are explicit: `ensureAutoByteusModelAvailable` for dynamic identifiers and `requireCurrentAutoByteusModelIdentifier` for static identifiers.

### Fresh exact model handoff across leaves

`ApplicationLaunchHostCapabilityValidator` removes its `modelsByRuntime` map. After the policy finishes for each runtime-enabled leaf, it immediately calls `ModelCatalogService.listLlmModels(runtimeKind)`, exact-matches that leaf identifier, and carries that `ModelInfo` into credential resolution before advancing. No runtime list survives a later provider mutation. With dynamic leaves A and B, the enforced order is:

`ensure provider A -> fresh exact A model -> credential authority A -> ensure provider B -> fresh exact B model -> credential authority B`

This is a bounded change to the current policy/validator seam, not a new resolver, catalog, or two-phase coordinator.

### Credential readiness after exact model resolution

`ApplicationProviderCredentialReadinessAdapter` is adapted to Personal's split boundary:

- dependency changes from removed `listProviderSettings` to `getProviderCredentialSetting`;
- the credential read is network-free and does not list/ensure models;
- credential owner is derived from the resolved `ModelInfo.runtime`, not blindly from `provider_id`:
  - `LLMRuntime.API` -> `model.provider_id`;
  - `LLMRuntime.OPENAI_COMPATIBLE` -> `model.provider_id` (custom provider ID);
  - `LLMRuntime.AUTOBYTEUS` -> `LLMProvider.AUTOBYTEUS`;
  - `LLMRuntime.OLLAMA` or `LLMRuntime.LMSTUDIO` -> configured without an API-key requirement after exact host/model availability;
  - unknown runtime -> fail closed with a safe readiness reason.
- Codex continues to use its account read; Claude continues to use its authentication status command.

The adapter additionally owns a small `ApplicationCredentialAuthority` union and stable typed-tuple equivalence key (`JSON.stringify([authorityKind, exactIdentity...])`). Provider credentials key by the resolved credential-owner provider ID and do not include workspace; Codex keys by normalized workspace root; Claude keys once per process; Ollama and LM Studio key by their no-credential serving runtime; unsupported runtime returns a null key and is not cached. The validator calls `resolveAuthority` and caches only identical non-null keys, so delimiter-bearing IDs cannot collide and neither `model.provider_id` alone nor a runtime-only bucket silently defines equivalence.

This preserves the distinction Personal now makes between **catalog owner/serving runtime** and **model creator/provider identity**.

### Read, Save, and direct-run outcomes

| Condition | Read/readiness | Save | Direct run |
| --- | --- | --- | --- |
| Current static model | normal credential/runtime checks | accepted | allowed after full readiness |
| Removed static AutoByteus model | saved/package value and provenance retained; `HOST_REQUIREMENT_MISSING` + `CURRENT_MODEL_SELECTION_REQUIRED` | rejected before upsert | rejected before allocation |
| Valid canonical dynamic model/provider | selected provider ensured, fresh exact leaf model resolved, credential authority checked | accepted | allowed after full readiness |
| Dynamic source/model unavailable | value retained; `HOST_REQUIREMENT_MISSING` + `MODEL_UNAVAILABLE` | rejected before upsert | rejected before allocation |
| Required credential missing | value retained; `HOST_REQUIREMENT_MISSING` + `RUNTIME_AUTHENTICATION_UNAVAILABLE` | structurally valid override may be saved; returned view remains non-runnable | normal business launch is rejected by `requireRunnableConfiguration` before provider execution |
| Codex/Claude model | provider-runtime catalog/auth path only | existing behavior | existing behavior |

No path rewrites package bytes or a saved override merely because a source is unavailable.

## Studio Model-Picker Contract

The merged `useRuntimeScopedModelSelection` keeps both sides' required semantics:

1. Effective runtime precedence remains explicit stored runtime -> inherited runtime -> default only when `useDefaultRuntimeFallback !== false`.
2. If no effective runtime exists, do not query a model catalog and expose no provider/model options.
3. For a resolved runtime, call Personal's `fetchProvidersWithModels(runtime)` and immediately copy `providersWithModelsForSelection(runtime)` into the runtime bucket.
4. Start `ensureMissingDynamicProviders(runtime)` without blocking the initial publication. Its normal provider failures are recorded by the store as `ERROR`/`STALE_ERROR` and consumed through `Promise.allSettled`, so the aggregate normally fulfills. After settlement, re-read that runtime's option rows and provider source statuses; stale rows remain. Retain `.catch` only for unexpected aggregate failure (for example initial whole-catalog transport/programming failure), then log safely and re-read/preserve store state.
5. Cache buckets by normalized runtime and preserve existing runtime availability warnings/options.
6. The new Personal composable test is extended with ticket cases for inherited runtime, explicit blank/no-default behavior, immediate rows, and asynchronous dynamic refresh.

The composable consumes the store; application editors do not reproduce provider snapshots or dynamic-source policy.

## Primary And Return Spines

### P1 — Current refresh integration

`protected a23849f checkpoint -> mandatory re-fetch confirms c5b87df4d -> one history-preserving merge -> preserve isolated prototype byte-for-byte -> resolve five conflicts -> audit all ten changed-both paths -> apply bounded application model/credential/web adaptations -> compile/test/review -> dual-host/Electron candidate`

### P2 — Standalone application readiness

`pnpm dev/start -> process migrations/vault/tool readiness -> selected package baseline -> ordered leaves -> per leaf static membership OR selected-provider ensure/exact endpoint post-check -> fresh exact leaf ModelInfo -> resolved credential authority/check -> RUNNABLE or explicit host issue -> listen/bootstrap -> application business execution`

Standalone does not perform eager all-provider discovery. A valid Codex/Luna package continues to start from package defaults without a setup UI or seeded override.

### P3 — Studio application readiness and override editing

`Studio start -> network-free provider descriptors/static snapshots -> import/open app -> package baseline + optional sparse override -> fresh per-leaf model readiness -> application shell OR diagnostics -> editor runtime (stored/inherited) -> immediate current model rows -> background missing-provider ensure -> settled provider source status -> refreshed/stale-retained options -> explicit Save/Reset`

Studio overrides remain separate from immutable package content.

### P4 — Provider/model return lifecycle

`settings/credential/host change -> Personal provider/kind invalidation/targeted provider ensure -> snapshot/source status publication -> model picker post-settlement re-read or later selected-provider readiness ensure`

This return path is process-owned and shared by hosted applications. It does not pass through the application worker or application SDK.

### P5 — Application execution/return

`requireRunnable -> graph-local agent/team launch -> provider -> internal scoped Agent Tools -> recipient handoff/publication -> application delivery/projection -> business UI -> exact run/session/resource cleanup`

No provider-catalog change alters the already-passed application run, publication, projection, or cleanup spine.

## Conflict Resolution Map

| Conflict | Resolution |
| --- | --- |
| `mixed-agent-member-handle.ts` | Use Personal `{ ...teamContext.physicalScope, agentRunId }`; retain ticket-injected `AgentMemoryLocationService`, `AgentToolMcpSessionManager`, prepared activation/platform binding, and exact `revokeAgentToolMcpSessionsForRun`. |
| `qwen-configuration-lifecycle-graphql.e2e.test.ts` | Use Personal credential/catalog GraphQL split (`providerCredentialSettings`, command result, `providerModelCatalogSnapshots`, `ownerProvider`, `llmModels`) and retain the ticket's current GLM assertion: identifier/value `glm-5.3`, `maxContextTokens: 1_000_000`. |
| `mixed-agent-member-handle-memory-invariant.test.ts` | Combine Personal root/nested physical-scope fixtures with exact injected memory/session services and ticket prepared activation/platform-binding assertions. |
| `mixed-team-member-registry-task-agent-memory.test.ts` | Combine Personal nested task-agent physical scope with ticket seal/durability/commit/release and exact dependency assertions. |
| `model-catalog-service.test.ts` | Accept Personal's provider/kind-keyed catalog lifecycle test. Do not restore deleted aggregate catalog/provider owners. Preserve current Gemini/GLM inventory proof in the existing supported-model and GraphQL provenance suites. |

## Changed-Both Audit

| Path | Result |
| --- | --- |
| `mixed-agent-member-handle.ts` | conflict; semantic combination above |
| `team-run-execution-tree-location-service.ts` | retain Personal indexed physical-scope lookup plus ticket stored-only service construction |
| Qwen GraphQL E2E | conflict; current GraphQL split plus current GLM assertion |
| `mixed-task-delegation.e2e.test.ts` | combine ticket `AgentToolRegistryReadiness` setup with Personal `providerModelCatalogSnapshots.llmModels` model lookup |
| MCP cleanup test | combine exact renamed run-session revocation with root physical-scope fixture |
| member memory invariant test | conflict; semantic combination above |
| member termination test | combine exact renamed run-session revocation with root physical-scope fixture |
| task-agent memory test | conflict; semantic combination above |
| model catalog service test | conflict; Personal current owner wins, no retired import |
| `useRuntimeScopedModelSelection.ts` | semantic auto-merge correction required: Personal snapshot/dynamic lifecycle plus ticket inherited/no-default runtime semantics |

All other previous-to-latest paths are Personal-owned non-overlapping changes unless compilation or a focused test proves a concrete interaction. They are not invitations to redesign the application platform.

## Ownership And Dependency Rules

Allowed:

- application configuration -> explicit application current-model policy;
- current-model policy -> process-owned `ModelAvailabilityService` and `LLMFactory` exact membership;
- host validator -> process `ModelCatalogService` read and network-free `LlmProviderService.getProviderCredentialSetting` through the adapter;
- application model picker -> Personal Pinia catalog snapshot actions/getters;
- Personal model catalog -> dynamic source lifecycle/factories/credential vault through its existing owners;
- both host builders -> the same application configuration/readiness services.

Forbidden:

- application code or UI owning a provider catalog, source lifecycle, provider credential store, or model discovery cache;
- process/Studio startup awaiting every dynamic provider;
- `listProviderSettings`, old aggregate catalog providers, cached media providers, or compatibility wrappers for their deleted APIs;
- treating `model.provider_id` as the credential owner for `autobyteus`, `ollama`, or `lmstudio` serving runtimes;
- a second application configuration store, read-time repair, model alias, fallback selection, or silent package mutation;
- generic DI/service locator/event bus, one mode-switched server builder, global run/session fallback, or provider-specific application package branch.

## Persisted-Data Decision

| Subject | Outcome | Reason |
| --- | --- | --- |
| Application launch override rows | `Directly Usable — No Migration` | Runtime/model identifiers remain strings in the current sparse rooted shape; reads retain values/provenance and perform no writes. |
| Provider credentials, custom provider rows, host settings, defaults | `Directly Usable — No Migration` | Personal changes service/catalog presentation and in-memory lifecycle, not these stored schemas. |
| Dynamic model source state | `Not Persisted / Not Affected` | Source status/catalog rows are process memory reconstructed through exact ensure/snapshot operations. |
| TeamRun V1 metadata | `Directly Usable — No Migration` after its existing prerequisite | Physical scope derives from current indexed containing-TeamRun identity. |
| Old flat nested Team Agent memory | `Migration Required` | Preserve SR-005's registered whole-directory migration; no new migration is added by the provider refresh. |

No new schema, persistence service, seed, backfill, or compatibility read is authorized by SR-006/SR-007.

## Exact Change Inventory

### Accept from Personal merge

- All 2,194 paths in `evidence/solution/latest-base-refresh-round-3-path-inventory.txt`, subject to the five conflict decisions and ten-path overlap audit. The isolated 1,934-file prototype subtree is accepted byte-for-byte and receives no semantic application-framework edit.
- In particular: `available-llm-construction.ts`, `dynamic-model-source-lifecycle.ts`, `model-availability-service.ts`, current `model-catalog-service.ts`, provider credential/catalog GraphQL types, new Pinia catalog publication/store contracts, endpoint/model identifier parsers, and current media factory ownership.
- Also accept `ui-prototypes/autobyteus-web-prototype/**` and its three prototype task records as isolated Personal-owned content; root workspace manifests and production imports remain untouched.
- Keep Personal-deleted aggregate/cached provider/media owner files deleted.

### Modify semantically after/while resolving merge

- `autobyteus-server-ts/src/application-platform/launch-configuration/application-current-model-selection-policy.ts`
- `autobyteus-server-ts/src/application-platform/launch-configuration/application-current-model-selection-guard.ts`
- `autobyteus-server-ts/src/application-platform/launch-configuration/application-launch-host-capability-validator.ts`
- `autobyteus-server-ts/src/application-platform/launch-configuration/application-provider-credential-readiness-adapter.ts`
- `autobyteus-server-ts/src/application-platform/runtime/create-application-orchestration-services.ts`
- `autobyteus-web/composables/useRuntimeScopedModelSelection.ts`
- the five conflict paths and remaining changed-both paths listed above.

### Add/modify durable proof

- add `autobyteus-server-ts/tests/unit/application-platform/application-provider-credential-readiness-adapter.test.ts`;
- modify `application-current-model-selection-policy.test.ts` for static/dynamic/external-runtime classification and selected-provider invocation semantics;
- cover current-model guard mapping through the existing `application-launch-configuration-service.test.ts` (no separate guard test exists at the protected checkpoint);
- modify `application-launch-host-capability-validator.test.ts` for dynamic model unavailable/current static removed, two leaves backed by distinct dynamic providers, ordered fresh `listLlmModels` reads, exact leaf `ModelInfo`, and adapter-owned credential authority/cache outcomes;
- modify `application-launch-configuration-service.test.ts` and `application-run-binding-launch-service.test.ts` for typed dynamic availability plus the two-leaf leaf-B failure no-upsert/no-allocation ordering;
- retain/extend Personal `model-availability-service.test.ts` to assert identifier-to-provider invocation and exact endpoint post-check without endpoint-local lifecycle claims;
- retain/extend Personal `llmProviderConfigStore.test.ts` so one missing-provider mutation rejects, `ensureMissingDynamicProviders` fulfills, and source state/rows are `ERROR` or `STALE_ERROR` as appropriate;
- modify Personal's `autobyteus-web/composables/__tests__/useRuntimeScopedModelSelection.spec.ts` for immediate/background, inherited/null runtime, post-settlement re-read/status retention, and defensive unexpected aggregate rejection;
- resolve/modify the five conflicted tests and changed-both E2E tests exactly as recorded;
- retain Personal provider catalog/model availability/store/GraphQL suites and the ticket application architecture/dual-host suites.

### Remove / do not restore

- `autobyteus-server-ts/src/llm-management/providers/autobyteus-llm-model-provider.ts`
- `.../cached-autobyteus-llm-model-provider.ts`
- `.../services/autobyteus-model-catalog.ts`
- deleted cached audio/image/video providers and old multimedia model services;
- old aggregate provider GraphQL/store fields and `listProviderSettings` calls;
- any compatibility alias added only to make a ticket-era test compile.

No new production module is required; the safe dynamic availability error belongs in the existing application current-model policy module.

## Implementation Sequence

1. Immediately fetch `origin/personal`; if it is not exactly `c5b87df4d...`, stop for renewed semantic analysis before merging.
2. Protect the current checkpoint and dirty evidence; perform one history-preserving merge of the exact reviewed Personal ref.
3. Preserve the isolated prototype subtree exactly, then resolve the five conflicts by the table, inspect all ten changed-both paths, and preserve Personal deletions. Assert root workspace membership and production imports did not change.
4. Apply the bounded application model-policy, host-validator, credential-adapter, construction, and web-composable adaptations.
5. Run formatting/diff checks, TypeScript/build checks, and focused provider/application/web tests before committing the integrated source.
6. Route through implementation source review; then API/E2E performs coverage investigation and complete latest-Personal plus dual-host validation.
7. If API/E2E changes durable tests, return them through code review. Delivery then re-fetches, verifies integrated ancestry, regenerates packages, rebuilds Electron, and records the exact final state.

## Verification Matrix

| Proof group | Required evidence |
| --- | --- |
| Git/inventory | latest ref ancestry, merge parents, clean index, no markers, 5/5 conflict ledger, 10/10 overlap ledger, deleted-owner absence |
| Isolated newest-Personal content | `git diff c5b87df4d...HEAD -- ui-prototypes/autobyteus-web-prototype` is empty after merge; root `pnpm-workspace.yaml` remains unchanged; no production import resolves into the prototype subtree |
| Personal provider core | static initialization network-free; identifier-to-provider mapping; provider-granularity ensure and provider/kind once/concurrency/reload/error; exact endpoint post-check; current model inventory; media factory ownership |
| Credential/catalog API | credential settings remain separate from model snapshots; Qwen/Gemini/custom mutations and safe failures; new GraphQL/store contracts |
| Application model policy/validator | current/removed static; valid/unavailable dynamic; selected-provider invocation; two leaves/two dynamic providers; fresh exact model read after each ensure; no runtime-only model cache; Codex/Claude bypass; safe typed mapping and pre-upsert/pre-allocation failure |
| Application credentials | provider/AutoByteus/Ollama/LM Studio mapping; Codex-workspace and Claude-process auth; adapter-owned authority keys/equivalence; unsupported non-caching; no model discovery in credential read |
| Studio picker | inherited runtime; explicit no-default null; immediate snapshot; `Promise.allSettled` missing-provider fulfillment; post-settlement re-read; `ERROR`/`STALE_ERROR` stale/static row retention; defensive aggregate catch only |
| Physical scope/migration | full SR-005 root/nested, migration order/outcomes, activation, graph-local session/memory, cleanup matrix |
| Dual host | real Brief/Socratic package defaults, override/reset, internal Agent Tools, team handoff, publication/projection, restart/recovery/cleanup |
| Package/Electron | dev/build/validate/start, package byte parity, refreshed Electron build and smoke on the integrated latest ref |

Prior `a23849f` and latest Personal test results are characterization inputs, not proof of their merge.

## Design-Principles Self-Validation

| Check | Result |
| --- | --- |
| Approved production reality | Pass — integrates two already-approved production states and carries the separately approved isolated prototype unchanged; no speculative provider or application mode |
| Product reachability | Pass — package/saved readiness, Studio editing, standalone start, provider configuration, and nested teams are maintained paths |
| Spine span sufficiency | Pass — readiness spans every ordered leaf through selected-provider ensure, fresh exact model, credential authority and runnable/issue; Studio provider changes return through settled snapshots; execution return remains complete |
| Authoritative boundary | Pass — Personal owns catalogs/credentials; application policy consumes them; UI consumes the store |
| Ownership and dependency direction | Pass — no provider lifecycle or credential persistence moves into application code |
| Empty indirection | Pass — existing policy/adapter/composable absorb integration; no facade/container/coordinator added |
| Clean-cut modernization | Pass — deleted aggregate/cached owners stay deleted; no alias or dual path |
| Persisted-data safety | Pass — launch/provider rows are direct; only the already-approved nested memory migration remains |
| Host parity | Pass — both hosts use one readiness policy; only host startup/ingress differs |
| Failure semantics | Pass — static retirement, dynamic unavailability, credential absence, and Studio `ERROR`/`STALE_ERROR` source state remain distinct; normal per-provider failure is not mislabeled aggregate rejection |
| Verification proportionality | Pass — focused integration proofs plus the already-required full dual-host/Electron matrix |

## Rejected Alternatives

1. **Merge the previously reviewed `a00f0d...` first:** violates the user's newest-Personal requirement and immediately creates another unreviewed provider integration.
2. **Select all Personal application-adjacent files:** loses sparse inherited application runtime/override behavior and exact application-scoped construction.
3. **Retain old aggregate provider APIs behind aliases:** creates two provider/catalog truths and hides compile-time migration work.
4. **Eagerly discover every dynamic provider before server/application readiness:** adds network startup coupling, latency, and failures Personal explicitly removed.
5. **Build an application-local model catalog/cache:** duplicates the process authority and can diverge across Studio applications.
6. **Treat every missing dynamic model as a removed static model:** produces false `CURRENT_MODEL_SELECTION_REQUIRED` diagnostics for host/source unavailability.
7. **Treat every model creator as credential owner:** checks the wrong credential for gateway and local serving runtimes.
8. **Block the model picker until all dynamic sources settle:** regresses immediate static/current model selection and makes unrelated sources gate editing.
9. **Rebase/cherry-pick the finalized ticket:** rewrites verified history and fragments the auditable integration.
