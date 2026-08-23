# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete
- Current Status: `Design-ready` — `ARCH-REV-007` passed `SR-006`; `CRR-001` then returned `IR-003` with `CODE-002` Design Impact and bounded `CODE-001`, `CODE-003`, and `CODE-004` corrections. `SR-007` re-investigates and closes that exact host-setting/client convergence, endpoint identity, result semantics, and cleanup scope without reopening the approved product basis.
- Investigation Goal: identify the blocking owner behind API Key Management entry and define the smallest correct credential/catalog lifecycle.
- Scope Classification: `Medium`
- Scope Classification Rationale: frontend behavior, GraphQL/service contracts, SDK registries, dynamic adapters, and non-Settings model consumers all participate, but persisted data and the broader Settings layout do not change.
- Scope Summary: API Keys entry/save/reload, static initialization, source-local dynamic discovery, AutoByteus host policy, and other model selection/construction entry paths.
- Primary Questions To Resolve: blocking request/owner, static-versus-dynamic inventory, cache miss/hit behavior, command invalidation, cross-surface initialization, deadline, and required concurrency protection. All are resolved for design.
- Primary Result: local credential state is blocked by eager aggregate model discovery; configured AutoByteus hosts account for about `77s` of a representative `78.276s` cold read.

## Request Context

The user reports that opening API Key Management is repeatedly very slow. The supplied screenshot shows the Settings shell and heading rendered while one central spinner hides the provider-management content. The user subsequently clarified and approved that credential configuration must work without models, static models need no Reload, and live discovery should be source-local and cached only in process.

## Environment Discovery / Bootstrap Context

- Project Type: Git
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/api-key-management-panel-performance`
- Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/api-key-management-panel-performance/tickets/in-progress/api-key-management-panel-performance`
- Current Branch: `codex/api-key-management-panel-performance`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/api-key-management-panel-performance`
- Bootstrap Base: refreshed `origin/personal` at `122adc91c184a75541489eea670ac29fcb43f4ab`
- Remote Refresh Result: `git fetch --prune origin` succeeded on 2026-08-21 before worktree creation.
- Task Branch: `codex/api-key-management-panel-performance`
- Expected Base Branch: `origin/personal`
- Expected Finalization Target: `personal`
- Bootstrap Blockers: None
- Downstream Note: work only in this dedicated worktree. The current uncommitted `IR-003` tree is paused evidence after code review and must not advance to API/E2E until `SR-007` passes architecture review and implementation is corrected.

## Supplemental Artifact Inventory

| Artifact Path | Purpose And Scope | Evidence / Decision Captured | Core Artifacts Supported | Related IDs | Status | Approval State | Follow-Up |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/api-key-management-panel-performance/tickets/in-progress/api-key-management-panel-performance/api-key-panel-loading.png` | Current API Keys visual evidence | Shell/header visible while central content is blocked | Requirements, investigation, design | `BEH-001`, `REQ-001`, `AC-001` | Current evidence | N/A | None |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/api-key-management-panel-performance/tickets/in-progress/api-key-management-panel-performance/ui-ux-spec.md` | Provider-local credential/model interaction contract | No global/static Reload; approved static/dynamic states, host-change convergence, and journeys | Requirements, design | `REQ-001`–`REQ-018`, `AC-001`–`AC-022` | Refined | User-approved 2026-08-23; `SR-007` is a within-scope clarification | Keep aligned through review |

## Source Log

| Date | Source Type | Exact Source / Activity | Why Consulted | Relevant Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-08-21 | Other | User report and `api-key-panel-loading.png` | Establish the supported symptom | Settings shell renders while provider content is gated by a central spinner. | Trace request boundary |
| 2026-08-21 | Code | `ProviderAPIKeyManager.vue`; `useProviderApiKeySectionRuntime.ts`; `stores/llmProviderConfig.ts`; GraphQL provider queries | Trace frontend gating and fan-out | Initialization awaits provider settings, Gemini, and Qwen together; one loading flag gates the full content. | Time individual requests |
| 2026-08-21 | Code | GraphQL `llm-provider.ts`; `llm-provider-service.ts`; `model-catalog-service.ts`; cached providers; preloader | Trace server query composition | `providerSettings` assembles credential facts and four model kinds; cold reads join catalog preloading. | Trace network source |
| 2026-08-21 | Code | AutoByteus remote LLM/audio/image providers; `autobyteus-client.ts` | Locate the remote deadline/ordering owner | Each kind iterates configured hosts sequentially; Axios has `timeout: 0`. | Causal probe |
| 2026-08-21 | Trace | Exact packaged-server cold GraphQL against sanitized consistent data | Reproduce production-shaped latency | `providerSettings`: `78.276s`; Gemini: `13.981ms`; Qwen: `14.279ms`; warm: `3.15–6.47ms`. | Isolate gateway |
| 2026-08-21 | Trace | Same server with only configured AutoByteus hosts disabled | Establish causality | Cold `providerSettings` dropped to `1.282s`, isolating roughly `77s` of remote discovery. | Root cause confirmed |
| 2026-08-21 | Test | Nuxt dev + Playwright navigation against warm packaged server | Separate renderer from server wait | Repeat entry settled in `46.8–89.9ms`; Electron rendering is not the cold owner. | Preserve browser validation |
| 2026-08-23 | Other | Credential independence discussion | Resolve product behavior | Models may be absent/loading, but provider selection and API-key entry remain usable. | Split lifecycles |
| 2026-08-23 | Code | Pinia credential actions; `LlmProviderService.setProviderApiKey()` | Check post-save coupling | Ordinary saves refetch coupled settings; AutoByteus save awaits full reload. | Define command finality |
| 2026-08-23 | Doc/Code | `ARCH-REV-001`–`003`; provider records; runtime store; custom sync | Preserve valid prior findings | Earlier designs exposed false configured-state projections, unsafe runtime publication, and stale custom publication. | Preserve authority/generation fixes |
| 2026-08-23 | Doc/Code | `ARCH-REV-004`; cached catalog/reload variants | Understand the prior race solution | Aggregate FIFO is coherent only for the former global lifecycle. | Superseded by product reset |
| 2026-08-23 | Doc | `ARCH-REV-005`, `RG-001`, `PREM-DYNAMIC-RELOAD-005` | Establish reset boundary | No global/static Reload; re-evaluate aggregate cache/FIFO; map consumers/deadline. | Re-analyze source |
| 2026-08-23 | Code | `autobyteus-ts/src/llm/llm-factory.ts`; supported providers; Ollama/LM Studio; custom provider | Classify static/dynamic registry behavior | Static definitions are registered before eagerly awaited Ollama/LM Studio; dynamic rows already live in the registry. | Make static init network-free |
| 2026-08-23 | Code | `model-catalog-service.ts`; `model-metadata-provisioning-service.ts`; remote/custom sync | Bound aggregate waits/row duplication | Catalog also awaits custom, AutoByteus, and optional live metadata; static definitions need none of them. | Make enrichment/discovery independent |
| 2026-08-23 | Code | selection stores/composables; agent/message/history flows; `LLMFactory.createLLM()`; media resolver | Map other model consumers | Direct construction cannot restore a missing dynamic model after restart unless a catalog page initialized it. | Add targeted availability ensure |
| 2026-08-23 | Code | `ServerSettingsService` and AutoByteus/Ollama/LM Studio host setters | Determine source-change invalidation | Host changes do not notify a source lifecycle. | Add exact notification |
| 2026-08-23 | Code | model identifiers/runtime/provider fields; gateway mapping | Separate model identity from discovery owner | Runtime distinguishes dynamic sources; custom IDs retain provider ID; gateway rows preserve upstream provider/runtime/host. | Specify source key/index |
| 2026-08-23 | Other | Latest user conversation after source re-analysis | Lock replacement requirements | Approved static immediate/no Reload, first-miss discovery, process reuse, provider Reload, AutoByteus post-save refresh, `30,000ms`, local invalidation, no durable cache. | Produce `SR-005` |
| 2026-08-23 | Doc | `design-review-report.md`; `architecture-review-revision-record.md`; `ARCH-REV-006` | Review `SR-005` target-path completeness | Simplified architecture passed centrally; client publication after AutoByteus save and canonical custom identifier parsing remained incomplete. | Correct as `SR-006` |
| 2026-08-23 | Code | `autobyteus-web/stores/llmProviderConfig.ts`; `useProviderApiKeySectionRuntime.ts` | Validate `DI-004` / mounted post-save path | Credential action applies the setting and can start contained work, but the approved target needs an explicit exact-AutoByteus ensure response to update Pinia; UI runtime is the success-first orchestration point. | Add non-awaited post-success store ensure |
| 2026-08-23 | Code | `autobyteus-ts/src/llm/openai-compatible-endpoint-model.ts`; `models.ts`; audio/image model getters; persisted custom-ID tests | Validate `DI-005` and every dynamic producer | Custom IDs are `openai-compatible:<providerId>:<modelName>`; host-scoped LLM IDs are `<name>:<runtime>@<host>`; AutoByteus media IDs are `<name>@<host>`. Model names can contain `:`, so split-all parsing is unsafe. | Bind availability to producer-owned parsers |
| 2026-08-23 | Doc/Test | `code-review-report.md`; `code-review-revision-record.md`; `CRR-001`; focused SDK/server/web reruns | Re-evaluate reviewed `IR-003` against approved journeys | Focused suites pass but do not cover four reachable gaps; overall result is Fail / Design Impact because the host-setting path has no client return. | Produce `SR-007`; re-run architecture review |
| 2026-08-23 | Code | `autobyteus-web/stores/serverSettings.ts`; `ServerSettingsEndpointCards.vue`; `stores/llmProviderConfig.ts`; `useProviderApiKeySectionRuntime.ts` | Trace `CODE-002` / `CR-PREM-002` | Server setting save/reload updates only settings. Pinia survives section unmount, `fetchProvidersWithModels` returns local `READY`, and selected ensure only runs for client `IDLE`; no caller advances the exact catalog provider. | Add direct post-commit exact-provider Pinia convergence; no event bus/global fetch |
| 2026-08-23 | Code | `model-catalog-service.ts`; `model-availability-service.ts`; endpoint editor fields | Trace `CODE-001` / `CR-PREM-001` | Retention and availability reduce endpoints to `URL.host`; same-authority scheme/path changes keep old `hostUrl` rows executable while or after replacement discovery fails. | Normalize full adapter endpoint identity and clear all affected-source rows on setting commit |
| 2026-08-23 | Code | `useProviderApiKeySectionRuntime.ts`; `ProviderModelSection.vue`; AutoByteus three-kind snapshot DTO | Trace `CODE-003` / `CR-PREM-003` | Current rows for one kind plus cold `ERROR` for another have no per-source `PARTIAL`, so the provider renders stale-row copy although its visible rows are current. | Define provider mixed-current result as partial; reserve stale copy for retained stale rows |
| 2026-08-23 | Code | `video-model-service.ts`; `cached-video-model-provider.ts`; `llm-providers/domain/models.ts` | Trace `CODE-004` clean-cut removal | Two dormant video reload/cache files and unused `LlmProviderWithModels` / `CustomProviderReloadStatus` declarations remain with no production callers. | Delete, including obsolete imports/tests; no aliases |

## Relevant Existing Behavior And Production Paths

| Behavior ID | Kind | Current Supported Trigger / Contract | Current Production Path And Lifecycle | Meaningful Current Outcome / Invariants | Evidence |
| --- | --- | --- | --- | --- | --- |
| `BEH-001` | User | Settings -> API Keys | Component mount -> runtime `initialize` -> coupled provider/catalog query -> whole-content loading flag | Provider form waits for every catalog dependency | Screenshot; frontend trace; `78.276s` cold probe |
| `BEH-002` | Contract | Provider/configured-state read | `LlmProviderService` descriptors/secret status are projected alongside catalog-capable provider records | Credential values remain write-only, but configured state can be duplicated as placeholder catalog data | Domain/GraphQL trace; `DI-001` |
| `BEH-003` | System | First model-registry read | `LLMFactory.ensureInitialized` -> static definitions -> awaited Ollama/LM Studio; server aggregate adds custom/AutoByteus/metadata | Static availability inherits dynamic network latency | Factory/catalog trace |
| `BEH-004` | User | Header or selected-provider Reload | Frontend reload -> GraphQL global/targeted variants -> aggregate/factory mutation -> full catalog response | Reload can gate the same catalog UI; global/static actions exist | Runtime/store/GraphQL trace |
| `BEH-005` | User | Credential or custom-provider command | Command commit -> coupled refetch and, for AutoByteus, awaited full reload; custom create/delete previously awaited convergence | Durable credential result can be delayed or mislabeled by model work | Save-path trace; prior review premises |
| `BEH-006` | Operational | AutoByteus model-list request | LLM/audio/image adapter -> configured-host loop -> `AutobyteusClient` with `timeout: 0` | Hosts are serial and an unreachable host is effectively unbounded | SDK/server trace; causal runtime control |
| `BEH-007` | System | Model selector or runtime construction | Shared aggregate store/factory lookup; API Keys/catalog visit may initialize dynamic rows first | Persisted dynamic model may be absent after restart despite valid configuration | Consumer and construction call-site trace |
| `BEH-008` | Contract | Concurrent fill/reload/mutation | Async workers mutate shared registries and aggregate cached snapshots with several invalidation owners | Same-source late publication can restore obsolete rows; aggregate serialization was designed for the superseded surface | `ARCH-REV-001`–`005`; race premises |

`ARCH-REV-006` added two target-path facts: `BEH-005` needs a client-received exact-provider ensure response after credential success because server-detached work alone cannot update mounted Pinia; `BEH-007` must parse the canonical custom producer form `openai-compatible:<providerId>:<modelName>`. `CRR-001` establishes the analogous reachable `BEH-008` host-setting path: server-detached work alone cannot advance a previously `READY` shared Pinia snapshot, authority-only endpoint comparison is unsafe, and mixed current/cold AutoByteus kinds must remain partial rather than stale.

## Design Health Assessment Evidence

- Change posture: `Performance` + `Behavior Change` + `Refactor`.
- Candidate root cause classification: `Boundary Or Ownership Issue` with `Duplicated Policy Or Coordination`.
- Refactor posture evidence summary: a UI-only or timeout-only fix leaves credential commands, static initialization, and non-Settings consumers on the same wrong boundary. Refactor is required now, but only into existing credential, registry, and discovery capability areas.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| Cold/controlled timing | About `77s` disappears when gateway discovery is removed | External discovery is incorrectly on a local credential critical path | Split authority/lifecycle |
| Factory/catalog source | Registry already owns rows while aggregate cache copies them | Duplicate row authority creates invalidation complexity | Remove aggregate row cache |
| `ARCH-REV-005` + user approval | Global/static reload no longer exists as a product behavior | Global FIFO/cache is disproportionate | Use exact source lifecycle |
| Consumer source | Execution relies on prior initialization side effects | Entry-path ownership is incomplete | Add targeted availability boundary |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-web/components/settings/ProviderAPIKeyManager.vue` and runtime composable | API Keys orchestration | `IR-003` has the approved fast credential/provider-local surface; the remaining UI defect is mixed-kind aggregation/copy | Preserve decoupling; correct `CODE-003` only |
| `autobyteus-web/stores/llmProviderConfig.ts` | Credential and model client state | Runtime/provider guards are implemented, but no exact provider invalidation/convergence action is called after a host save | Add exact clear-and-ensure action that fences older client requests |
| `autobyteus-web/stores/serverSettings.ts`; `ServerSettingsEndpointCards.vue` | Durable host-setting client action/UI | Setting success reloads only server settings; no production caller updates model Pinia | After successful exact key save, directly invoke but do not await model-store convergence |
| `autobyteus-server-ts/src/api/graphql/types/llm-provider.ts` | Transport resolver/DTOs | `IR-003` implements separated credential/local snapshot/targeted operations | Preserve; no new setting/catalog GraphQL operation is required |
| `autobyteus-server-ts/src/llm-management/services/model-catalog-service.ts` | Catalog orchestration | Source-local target is implemented, but host retention compares authority only | Use full normalized endpoint identity and clear exact affected-source rows before detached ensure |
| `autobyteus-server-ts/src/llm-management/services/autobyteus-remote-model-discovery-service.ts` | Gateway discovery | Natural owner for host fan-out/status | Concurrent bounded preparation, no registry mutation |
| `autobyteus-server-ts/src/llm-management/llm-providers/services/custom-llm-provider-runtime-sync-service.ts` | Custom discovery/sync | `IR-003` uses per-provider preparation/current-generation commit | Preserve |
| `autobyteus-ts/src/llm/llm-factory.ts` | LLM registry/construction | `IR-003` has network-free static initialization and source index | Preserve; full endpoint cleanup stays catalog-owned |
| AutoByteus LLM/audio/image provider files | Per-host network mapping | Preserve upstream identity and host provenance | Discovery-only `30,000ms` signal/deadline |
| `autobyteus-server-ts/src/services/server-settings-service.ts` | Durable host settings | `IR-003` now invokes exact server notification before returning, but there is no client convergence result/event | Preserve server notification; complete client-side direct store handoff after success |
| `autobyteus-web/components/settings/providerApiKey/useProviderApiKeySectionRuntime.ts`; `ProviderModelSection.vue` | Provider-level state derivation/presentation | `READY` rows plus peer cold `ERROR` are mislabeled stale | Derive mixed current/cold as partial; stale requires retained stale rows |
| `autobyteus-server-ts/src/multimedia-management/services/video-model-service.ts`; `providers/cached-video-model-provider.ts`; provider domain models | Dormant superseded shapes | No production callers; global reload/duplicate cache/dead types remain | Delete as required by the existing removal contract |
| Agent backend and media generation/resolver paths | Persisted model construction | `IR-003` calls the catalog-owned availability facade | Preserve; full endpoint identity validation must replace authority-only matching |

## Runtime / Probe Findings

| Date | Method | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-08-21 | Probe | Direct GraphQL timing against running packaged server | Warm provider settings about `2.1–2.7ms`; browser repeat entry `46.8–89.9ms` | Renderer/local database are not primary |
| 2026-08-21 | Repro | Sanitized isolated exact packaged server, consistent SQLite backup, copied encryption/config | Cold provider settings `78.276s`; Gemini/Qwen about `14ms` | Coupled catalog is blocking |
| 2026-08-21 | Causal control | Same probe with configured AutoByteus hosts disabled | Cold provider settings `1.282s` | Gateway discovery contributes about `77s` |
| 2026-08-21 | Browser test | Nuxt + Playwright Settings navigation | Warm re-entry consistently sub-`100ms` | Browser-equivalent validation is suitable |
| 2026-08-21 | Desktop setup | Existing packaged Electron Playwright adapter | Executable rejects injected debug flag before launch | Bounded tooling limitation; not product-owner evidence |

## External / Public Source Findings

- Public API/spec/upstream source: N/A; the causal behavior and approved workflow are repository- and user-contract-specific.
- Freshness: local task branch/source and packaged runtime were inspected in August 2026.
- Why it matters: no external contract requires retaining global reload, durable cache, or current timeout behavior.

## Reproduction / Environment Setup

- Required services/fixtures: exact packaged AutoByteus server; sanitized consistent copy of representative SQLite/config/encryption material; controlled configured gateway hosts.
- Required flags/accounts: no external account was used; real credential values were neither recorded nor logged.
- Setup commands: direct GraphQL timing, Nuxt development server, Playwright browser-equivalent Settings navigation, and controlled host-disable comparison as recorded in the source log.
- Cleanup: isolated server/data copies were investigation-only; no authoritative persisted data was mutated.

## Findings From Code / Docs / Data / Logs

## Reproduction And Timing Detail

1. A healthy local server may accept requests while catalog preloading is still pending.
2. Opening API Keys calls the canonical provider-settings query.
3. That query joins the same cold catalog promises and therefore waits for external model sources.
4. The representative cold request lasted `78.276s`; local-only work with configured gateway hosts disabled lasted `1.282s`.
5. Warm reads are fast, explaining why the problem can appear startup/network dependent.
6. AutoByteus discovery is serial and unbounded, so an unreachable earlier host delays later peers and every consumer waiting on the aggregate result.

## Current Ownership Map

### Credential plane

- Server provider configuration and secret managers own configured state and encrypted values.
- The frontend requires only provider descriptors plus an `apiKeyConfigured` Boolean.
- Catalog projections currently reuse configured-state-capable records, including synthesized false values; earlier review proved this must be removed rather than ignored.

### Model-row plane

- LLM, audio, image, and video factories/registries already own in-process model rows used for construction.
- Static LLM definitions can be registered locally.
- Ollama, LM Studio, custom OpenAI-compatible, and AutoByteus adapters populate dynamic rows.
- A cached aggregate `ModelInfo[]` collection duplicates registry content and is not needed under provider-local discovery.

### Lifecycle plane

- Current initialization and reload APIs mix static registration, live discovery, registry mutation, and aggregate caching.
- The required lifecycle state is smaller: exact source key, configuration/credential fingerprint, last completed fingerprint/status, one in-flight attempt, and a monotonic generation.
- Each current-generation success atomically replaces only that source's rows. Stale attempts settle without publishing.

## Static And Dynamic Inventory

| Discovery Owner | Model Kind(s) | Mode | Source Identity / Notes |
| --- | --- | --- | --- |
| OpenAI, Anthropic, Mistral, Gemini, DeepSeek, Grok, Kimi, Qwen, GLM, MiniMax | LLM | Static | Curated local definitions; optional metadata is non-authoritative |
| AutoByteus | LLM, audio, image | Dynamic | One UI owner, three kind-scoped source keys; rows retain actual upstream provider/runtime/host |
| Ollama | LLM | Dynamic | Host fingerprint identifies source configuration |
| LM Studio | LLM | Dynamic | Host fingerprint identifies source configuration |
| Each custom OpenAI-compatible provider ID | LLM | Dynamic | Provider ID is the exact lifecycle/registry owner; create probe seeds initial snapshot |
| Current video/local factory rows | As currently registered | Static unless a live adapter is explicitly identified | No new discovery/reload behavior is introduced |

## Other Model-Consumer Mapping

| Consumer | Required Target Behavior |
| --- | --- |
| API Keys selected provider | Read credential state independently; read local snapshot; ensure only selected cold dynamic provider |
| General LLM selector / messaging presets | Render static + cached rows immediately; start configured missing dynamic sources independently, without one aggregate wait |
| Agent run/history/message surfaces | Use runtime-keyed catalog state; do not depend on whichever runtime Settings last published |
| Direct `LLMFactory.createLLM` path | Before final lookup, catalog boundary invokes canonical producer-owned parsers (custom: `openai-compatible:<providerId>:<modelName>`), verifies the current provider/host, and ensures only that missing source |
| Audio/image model selectors and execution resolver | Same static/current snapshot rule and targeted AutoByteus ensure; no dependency on API Keys |
| Custom create/delete | Probe result seeds exact provider snapshot; deletion removes exact provider rows/state |

## Approved Cache, Refresh, And Invalidation Semantics

- A “cache” is the current registry rows plus source lifecycle completion state; there is no duplicate aggregate row cache.
- First source demand without a successful current-fingerprint completion starts discovery.
- Concurrent same-source demand joins one in-flight attempt.
- A completed successful snapshot is reused for the process lifetime without TTL, navigation refresh, or background hit refresh.
- Provider-local manual Reload is the only general force-refresh.
- AutoByteus credential save is the narrow exception: durable credential success returns first, then AutoByteus LLM/audio/image generations advance and background ensures start.
- The mounted API Keys runtime separately starts a non-awaited exact-AutoByteus client ensure after applying/reporting credential success. Its GraphQL result is the return path into Pinia; the explicit action must send the non-forcing server ensure even if the client retained a prior `READY` snapshot, then join the server source single-flight (one adapter invocation per exact source key) rather than starting duplicate discovery.
- Static/Gemini/Qwen credential saves do not touch model lifecycles.
- Custom create commits its own successful validation probe rows as ready; an optional earlier preview probe remains separate, and there is no additional post-commit discovery. Delete invalidates/removes only that provider.
- Endpoint/host identity change advances only affected generations, uses normalized full adapter endpoint identity (scheme + authority + path, not authority alone), removes every row for the exact affected source immediately, and schedules a contained non-blocking ensure. Clearing the full source intentionally prefers a brief cold/loading state over executing an ambiguously retained old endpoint.
- After the setting action receives durable success, the Server Settings client directly advances/clears only the mapped runtime/provider Pinia key and starts—but does not await—the normal targeted ensure even when its prior state was `READY`. The server started the matching source ensure before its response, so this client request joins or observes current terminal state; it is the pull-based return path while API Keys is unmounted or after return.
- Process restart loses all dynamic completion state; first demand rediscovers.

## Concurrency And Publication Conclusions

1. Source-local single-flight is required so repeated selection does not duplicate traffic.
2. A generation/token is required because custom mutation, credential revision, host change, and manual Reload can overtake older work.
3. Generation must be checked immediately before synchronous registry/status publication.
4. Cleanup must be promise-identity guarded so an old completion cannot clear a newer in-flight reference.
5. Registry replacement/removal must be exact by runtime, model kind, and discovery owner.
6. Disjoint source writes eliminate the need for the superseded global registry FIFO.
7. AutoByteus provider-level operations fan out to LLM/audio/image concurrently; each kind retains its own current-generation commit.
8. No credential command may await old or newly scheduled model work.
9. Server-detached publication and client publication are separate concerns: registry/status can update without a client event, so pull-based UI must issue an exact provider ensure to receive/publish the final snapshot.
10. Persisted identifier parsing must delegate to or be colocated with canonical builders. For custom identifiers, parse the first delimiter after the `openai-compatible:` prefix so a model name containing `:` remains intact.
11. A host-setting save needs two separately owned publications: synchronous server registry/lifecycle invalidation plus an explicit exact-provider client request/publication. Shared Pinia makes a direct store handoff sufficient; a subscription or event bus is unnecessary.
12. Client host-change invalidation must allocate a newer exact provider request token before clearing rows so an older ensure/reload response cannot restore them; the subsequent targeted ensure owns the next token and publishes under the existing epoch/key guard.
13. AutoByteus provider-level state is `PARTIAL` when at least one kind supplies current successful rows and a peer kind is cold unavailable. `STALE_ERROR` describes retained rows at the source that failed refresh, not any provider that merely has rows plus some error.

## Considered Strategies

| Strategy | Evaluation | Decision |
| --- | --- | --- |
| Hide the spinner but keep the coupled query | Cosmetic; leaves command and error coupling. | Rejected |
| Bound discovery only | Reduces delay but still blocks credentials. | Insufficient |
| Move preload before readiness | Moves the delay to startup and may block readiness. | Rejected |
| Persist model snapshots | Adds staleness/migration/security lifecycle not requested. | Rejected |
| Keep global Reload and an aggregate cache/FIFO | Coherent for the superseded surface, but disproportionate after global/static Reload removal and duplicates registry rows. | Superseded/rejected |
| Refresh every dynamic source on every visit | Wastes network time and violates approved successful-cache reuse. | Rejected |
| Refresh models after every credential save | Static credentials do not affect static model definitions. | Rejected |
| AutoByteus-only post-save background refresh | Its credential is consumed by its dynamic discovery; returns credential success before contained refresh. | Approved |
| Use registry rows plus source-local lifecycle/generation | Matches existing construction authority, minimizes state, and prevents stale publication without global serialization. | Recommended |
| Depend on server-detached AutoByteus refresh to update Pinia | There is no subscription/event and the credential result contains no model snapshot. | Rejected; issue a non-awaited exact client ensure after success |
| Handwrite `:openai_compatible@provider` parsing | Contradicts the current canonical producer and breaks persisted custom launch. | Rejected; export/use producer-owned parse/build contracts |
| Depend on server-detached host refresh and refresh API Keys only when client state is cold | A shared `READY` Pinia snapshot cannot observe a server fingerprint revision and survives Settings-section navigation. | Rejected; exact post-save client clear-and-ensure |
| Add a catalog-wide event bus/subscription for host changes | Broader machinery than one in-process Settings-store-to-model-store dependency; risks reintroducing global coordination. | Rejected |
| Retain endpoint rows whose URL authority still appears | Scheme/path changes are part of the adapter identity and can leave obsolete executable rows. | Rejected; clear the exact affected source and refill |

## Persisted Data Transition Evidence

- Stored subjects: encrypted provider credentials, non-secret configured hosts, custom-provider metadata, and persisted model identifiers.
- Storage/model representation change: none.
- Dynamic snapshots/lifecycle: ephemeral process memory only.
- Migration, rewrite, backfill, compatibility, or maintenance window: not applicable.
- Secret constraint: no credential may appear in catalog transport, logs, screenshots, or diagnostics.

## Constraints / Dependencies / Compatibility Facts

- The `30,000ms` deadline applies only to each AutoByteus model-list host request, not inference or media operations.
- Multiple AutoByteus hosts start concurrently but results must flatten in configured-host order.
- Credential values remain write-only and cannot be inputs to fingerprints, catalog DTOs, logs, or evidence.
- Existing provider/model identifiers and persisted stores remain authoritative; no compatibility translation is authorized.
- Custom identifier authority is `buildOpenAICompatibleEndpointModelIdentifier()` with exact output `openai-compatible:<providerId>:<modelName>`; the target adds a matching parser without changing output.
- Static and dynamic classification comes from the local provider catalog, not from current row presence.
- Deterministic concurrency tests require injected/deferred adapters rather than public endpoints.

## Open Unknowns / Risks

- A legitimate host slower than `30,000ms` is unavailable for that attempt; stale/partial rules keep this model-local.
- A legacy persisted media identifier may not expose an unambiguous source owner. Resolution must be centralized and conservative; it must not trigger global discovery.
- Optional metadata may arrive after curated static rows.
- The packaged Electron Playwright adapter rejects its injected debugging flag. Browser-equivalent UI evidence plus exact packaged-server timing remains acceptable because no Electron-specific owner was found.
- No requirement or design decision remains blocked. Full-source clearing after host edits deliberately trades temporary row retention for endpoint correctness. Identifier ambiguity and the packaged validation limitation remain bounded residual risks for implementation/review.

## Notes For Architecture Reviewer

Review `SR-007` against `CRR-001`. `CODE-002` is closed by the direct successful Server Settings action -> exact provider Pinia clear-and-ensure -> guarded publication path, which works while API Keys is unmounted and introduces no event bus or global refresh. Carry `CODE-001` full-endpoint clearing, `CODE-003` mixed-current partial semantics, and `CODE-004` exact deletions as bounded implementation corrections. Preserve the `ARCH-REV-007` simplifications and decisions: no global/static Reload, duplicate aggregate rows, global FIFO, compatibility identifier, durable cache, or migration.
