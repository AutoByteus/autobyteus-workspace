# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

`Refined` — user-approved on 2026-08-23 and clarified in `SR-007` after `CRR-001` / `CODE-001`–`CODE-004`. The clarification completes the already-approved endpoint-change convergence, mixed-result semantics, and clean-cut removal boundary; it adds no new product capability. This document supersedes every earlier requirement that mentioned global Reload, Reload for static providers, automatic refresh on a cache hit, a duplicated aggregate catalog cache, a global registry FIFO, or a `3,000ms` AutoByteus deadline.

## Goal / Problem Statement

Make **Settings -> API Keys** a credential-management surface that is never blocked by external model discovery. Static models must be immediately available. Models requiring live discovery use source-local, in-process snapshots: the first demand starts only that source, later reads reuse its successful snapshot, and only an explicit provider-local Reload forces another request. Credential commands finish independently from this model lifecycle.

## Current And Desired Behavior (Mandatory)

| Behavior ID | Current Behavior | Desired Behavior | Preserved / Unchanged Behavior | Related IDs |
| --- | --- | --- | --- | --- |
| `BEH-001` | API Keys waits for a provider-settings result containing credentials and all model catalogs; a representative cold request took `78.276s`. | Provider navigation and value-free credential state come from local authorities and are usable without model discovery. | Existing Settings route and provider-specific forms remain recognizable. | `REQ-001`–`REQ-004`, `AC-001`–`AC-004` |
| `BEH-002` | One spinner/error boundary hides credentials while models load. | Credential and model states have independent lifecycles; only the affected model section shows model progress/failure. | Provider identity continues to join credential and model views. | `REQ-002`–`REQ-006`, `AC-002`–`AC-007` |
| `BEH-003` | Static and dynamic models are assembled through one eager aggregate path. | Static/pre-provided models render synchronously from the process registry; dynamic sources populate independent in-process snapshots. | Existing provider/model identifiers remain authoritative. | `REQ-007`–`REQ-010`, `AC-008`–`AC-012` |
| `BEH-004` | Global and selected-provider Reload paths can block or replace the main content. | There is no global Reload. Reload exists only for a selected source that genuinely requires live discovery and never hides credential controls. | Explicit refresh remains available where remote state can change. | `REQ-008`–`REQ-011`, `AC-009`–`AC-013` |
| `BEH-005` | Ordinary key save refetches the coupled query; AutoByteus key save awaits full model reload. | A credential command reports success after its durable server commit. For AutoByteus, the server schedules its exact background refresh and, after the client applies/reports credential success, the mounted client independently starts/joins the exact AutoByteus ensure so refreshing/final state is published without being awaited by the credential action. | Validation, durable commit, configured state, and error ownership stay server-side. | `REQ-005`, `REQ-012`–`REQ-014`, `AC-005`–`AC-006`, `AC-014`–`AC-016` |
| `BEH-006` | AutoByteus hosts are attempted serially with Axios `timeout: 0`; the reviewed UI also confuses current rows from one model kind plus cold failure from another with retained stale rows. | Valid hosts are attempted concurrently with a `30,000ms` deadline per host; host- and kind-level partial/total failure semantics remain distinct, and stale copy is reserved for rows retained from a failed refresh of their own source. | Successful hosts still contribute deterministically ordered models. | `REQ-015`, `AC-007`, `AC-017`–`AC-020` |
| `BEH-007` | API Keys is an accidental trigger for initialization used by other model consumers. | Every model-consuming entry path gets static rows immediately and independently ensures only missing dynamic sources it needs. Persisted dynamic identifiers remain constructible after restart without first visiting API Keys. | Existing selectors and runtime construction remain functionally available. | `REQ-016`, `AC-021` |
| `BEH-008` | Catalog ownership is spread across an aggregate service and mutable factory registries, creating stale-publication races. The reviewed implementation later added server-side host invalidation but retained rows by URL authority and did not advance an already-ready Pinia provider snapshot. | Factory registries own model rows. Each dynamic source owns only lifecycle/fingerprint state and atomically replaces its own rows; a committed discovery-setting change clears and converges the exact server source and shared client provider snapshot without global refresh. No duplicate aggregate model cache or cross-provider FIFO is introduced. | In-memory-only behavior and no persisted-data change are preserved. | `REQ-009`, `REQ-010`, `REQ-017`, `REQ-018`, `AC-013`, `AC-022` |

## Investigation Findings

- `ProviderAPIKeyManager.initialize()` awaits provider settings, Gemini setup, and Qwen setup together; the entire content stays behind one spinner.
- The causal request is `GetProviderSettings`: cold `78.276s`; disabling configured AutoByteus gateway discovery reduced it to `1.282s`, isolating about `77s` of remote-discovery wait.
- AutoByteus LLM/audio/image providers iterate configured hosts sequentially through clients configured with `timeout: 0`.
- `LLMFactory.initializeRegistry()` eagerly awaits Ollama and LM Studio; the aggregate catalog additionally awaits AutoByteus, custom synchronization, and optional live metadata enrichment.
- Model factories are already the authoritative in-process registries. A second aggregate `ModelInfo[]` cache duplicates their content and complicates invalidation.
- Existing direct LLM/media construction paths do not ensure a missing dynamic source after process restart; catalog-page initialization currently masks that gap.
- The reviewed `IR-003` implementation notifies the server catalog after AutoByteus/Ollama/LM Studio host saves, but it retains rows by URL authority only and has no client return path into an already-ready Pinia catalog. A same-authority scheme/path change can therefore leave an old endpoint executable, and API Keys -> Server Settings -> API Keys can display old rows indefinitely.
- The reviewed AutoByteus UI derives partial state only from a per-kind `PARTIAL`; current rows for one kind plus a cold `ERROR` for another are consequently mislabeled as stale rows.
- The approved design must retain AutoByteus-discovered models' actual upstream provider/runtime/host identity even though AutoByteus owns the discovery section and Reload action.

## Relevant Supplemental Task Artifacts

| Artifact Path | Type / Purpose | Related Requirement IDs | Related Acceptance-Criteria IDs | Status / Approval | Relationship To Requirements |
| --- | --- | --- | --- | --- | --- |
| `tickets/in-progress/api-key-management-panel-performance/api-key-panel-loading.png` | User-supplied screenshot evidence | `REQ-001`, `REQ-003` | `AC-001`, `AC-003` | Evidence; approval N/A | Establishes current whole-panel model wait. |
| `tickets/in-progress/api-key-management-panel-performance/ui-ux-spec.md` | Provider-local model-state and credential-independence interaction contract | `REQ-001`–`REQ-016` | `AC-001`–`AC-021` | `Refined`; user-approved 2026-08-23 | Defines observable states/actions without owning technical structure. |

## Design Health Assessment (Mandatory)

- Change posture: `Performance correction plus lifecycle/ownership refactor`.
- Design issue signal: `Confirmed`.
- Root cause: local credential management, static model registration, and external discovery are coupled behind one aggregate asynchronous boundary.
- Required posture: separate the credential control plane from source-local catalog lifecycles; keep row ownership in existing model registries; add minimal per-source stale-result protection.
- Scope impact: GraphQL/service/store/components and dynamic-source adapters change; credential custody, identifiers, and persisted representations do not.

## Recommendations

1. Keep provider descriptors/credential state on a network-free authority and remove model fields from that read.
2. Make static registry initialization network-free and use current factory registries as the only model-row cache.
3. Coordinate each dynamic source with exact source identity, terminal process state, one in-flight attempt, and stale-result generation protection.
4. Expose only local snapshot, provider ensure, and dynamic-provider Reload operations; remove global/static reloads and their compatibility paths.
5. Trigger AutoByteus post-key refresh and endpoint/host-change convergence only after the governing durable command has completed. A host save must use one exact setting-key-to-provider mapping to invalidate both the server source and the shared Pinia provider key, then start a non-awaited targeted ensure; it must not introduce a global refresh or event bus.
6. Add targeted discovery participation to model selectors and execution so API Keys is never an initialization prerequisite.

## Scope Classification (`Small`/`Medium`/`Large`)

`Medium` — the correction spans Settings, GraphQL/service boundaries, shared model registries, dynamic discovery adapters, and other model-consuming entry paths, without persistence or broad visual redesign.

## Scope Guardrail (Mandatory)

### Dynamic And Static Inventory

- Static/pre-provided LLM providers: OpenAI, Anthropic, Mistral, Gemini, DeepSeek, Grok, Kimi, Qwen, GLM, and MiniMax. Their curated rows render immediately and expose no Reload.
- Dynamic discovery sources: AutoByteus gateway (LLM, audio, and image), Ollama, LM Studio, and each custom OpenAI-compatible provider.
- Optional live metadata enrichment for static providers is supplementary only. It may run in the background or use already cached metadata, but it must not delay static row presence or create a Reload action.

### In-Scope Use Cases

- `UC-001`: Open API Keys with cold/unreachable dynamic sources and immediately select/configure any provider.
- `UC-002`: View a static provider's immediate models without any Reload action.
- `UC-003`: Select a cold dynamic provider; only its model section loads while credential controls stay usable.
- `UC-004`: Revisit a dynamic provider with a successful in-process snapshot; render it without network refresh.
- `UC-005`: Manually Reload one dynamic provider while keeping cached rows and credential controls visible.
- `UC-006`: Save ordinary, AutoByteus, Gemini, or Qwen credentials, and create/delete a custom provider, without unrelated model waits.
- `UC-007`: Change a discovery endpoint/host and invalidate/refresh only the affected source.
- `UC-008`: Use model selectors or construct a persisted dynamic model after restart without first opening API Keys.

### Out Of Scope

- A global Reload action or Reload for a static provider.
- Durable/offline model cache, persistence rewrite, compatibility path, or data migration.
- Periodic refresh, refresh-on-visit after a successful snapshot, TTL expiry, or background refresh on an ordinary cache hit.
- Broad Settings/navigation or model-card redesign.
- Changing provider/model identifiers, secret storage, explicit custom-provider validation, or Qwen validation.
- Applying the model-discovery deadline to inference, streaming, or media-generation operations.

### Preserved Behavior Boundary

- Configured state remains a server-owned Boolean and credential values remain write-only.
- Model presence never determines credential configured state.
- A credential save succeeds only after its provider-specific validation and durable commit. Later model work cannot reverse or relabel it.
- Custom-provider creation retains its mandatory `/models` probe; its successful probe result becomes the initial source snapshot instead of causing a second fetch.
- AutoByteus rows retain actual upstream provider identity; UI grouping by discovery source cannot rewrite identity.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that introduces new product behavior, policy, threat model, migration obligation, or operational contract is a `Requirement Gap` and must return for explicit user approval.
- An adjacent concern outside this boundary may be a non-blocking risk/recommendation or separate ticket; it is not an authorized implementation correction.
- A downstream comment does not amend this basis. Canonical requirements and applicable supplements must be revised and re-approved before scope-changing behavior becomes authoritative.

## Functional Requirements

- `REQ-001`: API Keys must make provider selection and the selected credential controls usable without waiting for any model discovery.
- `REQ-002`: Provider descriptors and value-free configured state must come from a local authoritative read that performs no external model request.
- `REQ-003`: Credential and model lifecycles must have independent request/loading/error state. Model state must be localized to the selected provider's model section.
- `REQ-004`: A model loading/failure/empty state must not hide, disable, or relabel a credential form or provider navigation.
- `REQ-005`: A credential command must return after its own validation and durable commit; it must not await pre-existing or newly started model discovery.
- `REQ-006`: Credential reads/responses/logs must expose only value-free configured state and must never expose a stored credential.
- `REQ-007`: Static/pre-provided model rows must be available immediately from local process state, without a live metadata or discovery dependency, and their providers must expose no Reload.
- `REQ-008`: On the first in-process demand for a dynamic source with no successful snapshot, discovery must start automatically for only that source.
- `REQ-009`: A successful dynamic snapshot must be reused for the lifetime of the process. A normal cache hit must perform no network request or background refresh.
- `REQ-010`: Model factories/registries remain the only owners of model rows. Source lifecycle state may reference registry rows but must not maintain a duplicate aggregate `ModelInfo[]` cache.
- `REQ-011`: Only a dynamic provider exposes provider-local Reload. Manual Reload must force only that source, retain the last successful rows while pending, and atomically replace them on current-generation success.
- `REQ-012`: Saving a non-AutoByteus static-provider, Gemini, or Qwen credential must not trigger model discovery.
- `REQ-013`: After an AutoByteus credential is durably saved, the command must return/report success first. The server invalidates and schedules AutoByteus-only LLM/audio/image discovery without awaiting it; after applying/reporting the credential success, an already-mounted client must independently start/join the exact AutoByteus ensure without the credential action awaiting that model promise, so provider-local refreshing/final state becomes observable.
- `REQ-014`: Successful custom-provider creation must reuse the required probe result as that provider's initial ready snapshot; deletion must remove/invalidate only that provider's lifecycle and registry rows.
- `REQ-015`: AutoByteus discovery must attempt valid configured hosts concurrently, apply a `30,000ms` deadline per host, aggregate successes in deterministic configured-host order, and contain partial/total failure within the AutoByteus model section.
- `REQ-016`: All model-consuming selectors and construction paths must obtain static rows immediately and independently ensure only identifiable missing dynamic sources; API Keys must not be the sole initialization trigger. Identifier-to-source resolution must use parsers bound to the canonical identifier producers, including `openai-compatible:<providerId>:<modelName>` for custom providers, without rewriting stored identifiers or accepting a compatibility grammar.
- `REQ-017`: Credential revision or discovery identity changes must advance only the affected source generation/fingerprint. Stale work cannot publish rows/status. After a supported endpoint/host mutation is confirmed durably committed, the exact affected server source must remove all of its old rows before contained discovery starts, and the client settings action must invalidate/clear only the corresponding runtime/provider/model-kind Pinia rows and start a non-awaited targeted ensure even if that snapshot was previously `READY`. This handoff must occur from the confirmed mutation result even if the action's later settings-list reload fails. Unaffected kinds (including video) and unrelated providers remain unchanged. The settings command must not await model work, and returning to API Keys in the same session must not expose the pre-change snapshot.
- `REQ-018`: Source-local replacement and cleanup must be atomic and disjoint by exact runtime, model kind, and discovery owner. Discovery identity must use the normalized full adapter endpoint (including scheme, authority, and path rather than authority alone), while existing persisted model identifiers remain unchanged and ambiguous host-only identifiers fail conservatively. No global reload serialization/FIFO, event bus, durable cache, migration, or compatibility branch is permitted.

## Acceptance Criteria

- `AC-001`: With a deliberately nonresponding gateway, API Keys renders provider navigation and the selected credential form within `1,500ms` of entry in the representative healthy-local-server environment.
- `AC-002`: With zero discovered models, a user can select a provider, enter a credential, and submit it.
- `AC-003`: While any dynamic source is loading/refreshing, provider navigation and credential controls remain rendered and interactive except for a form's own in-flight command.
- `AC-004`: Five warm credential-descriptor reads each complete within `250ms` and perform no model-discovery request.
- `AC-005`: A deterministic pending-discovery test proves a durably committed credential reports success without awaiting that discovery.
- `AC-006`: Credential values are absent from all catalog/credential reads, logs, diagnostics, fixtures, and model lifecycle state.
- `AC-007`: Loading, refreshing, empty, partial, stale-warning, and unavailable states are confined to the affected model section and retain their distinct meaning: a mixed snapshot with current rows from one AutoByteus kind and a cold failure from another is partial, while stale-warning copy appears only when visible rows were retained from a failed refresh of their own source.
- `AC-008`: Every static inventory provider renders its curated rows before any dynamic promise settles and has no Reload control.
- `AC-009`: Selecting a cold Ollama, LM Studio, AutoByteus, or custom source starts one source-specific discovery; concurrent demands join that same source attempt.
- `AC-010`: Revisiting a successfully discovered source performs no network call and immediately shows its process snapshot.
- `AC-011`: Manual Reload is absent globally and for static providers, and present only for the selected dynamic provider.
- `AC-012`: During manual Reload, last-known rows remain visible; current-generation success replaces only that source, and failure retains rows with a localized warning.
- `AC-013`: A stale completion after a newer invalidation/reload cannot publish rows or lifecycle state. Deterministic tests cover (a) same-authority scheme/path endpoint changes with success and failure, proving all old affected-source rows are removed before discovery, and (b) API Keys -> Server Settings host save -> API Keys with an initially `READY` Pinia snapshot, proving only the exact provider is cleared/loading, a targeted non-forcing ensure is sent without delaying settings success, its guarded response publishes while unmounted or after return, and no old client rows remain indefinitely.
- `AC-014`: Static/Gemini/Qwen credential saves cause zero model-discovery calls.
- `AC-015`: AutoByteus credential save applies configured state and reports success before the mounted API Keys runtime starts a non-awaited exact-AutoByteus client ensure, even when Pinia retained a prior `READY` snapshot. That explicit post-save action sends the non-forcing targeted server ensure rather than returning the old client snapshot; the model section shows refreshing/final state, and it joins the server-scheduled LLM/audio/image single-flights so each exact source adapter is invoked once rather than duplicated.
- `AC-016`: The create mutation reuses the result of its own required validation/probe as the ready snapshot and makes no additional post-commit discovery; an optional earlier user-invoked preview probe remains a separate validation action. Deletion affects only the exact provider ID.
- `AC-017`: All valid AutoByteus hosts start before a pending peer resolves, and every request enforces a `30,000ms` model-discovery-only deadline.
- `AC-018`: Multiple successful hosts contribute models in configured-host order while preserving each model's actual upstream provider/runtime/host identity.
- `AC-019`: Partial AutoByteus failure publishes successful host rows and a localized partial warning. Provider-level aggregation also reports partial when any AutoByteus model kind has current successful rows while a peer kind is cold-error/unavailable; it does not label those current rows as last-known/stale.
- `AC-020`: Total failure retains a prior snapshot as stale-warning, or reports cold unavailable when none exists, without affecting credentials.
- `AC-021`: A model selector renders static rows without API Keys initialization. After registry/lifecycle reset, the exact persisted custom identifier `openai-compatible:<providerId>:<modelName>` is parsed through the canonical producer-owned contract, ensures that provider exactly once, and then constructs; equivalent supported Ollama, LM Studio, AutoByteus LLM, and AutoByteus media identifiers resolve through their canonical producer-bound parsers. No compatibility form or global discovery is used.
- `AC-022`: Tests and source inspection prove no duplicate aggregate model-row cache, global reload action, global registry FIFO, durable cache write, migration, or compatibility path remains in the target flow. The dormant `video-model-service.ts`, `cached-video-model-provider.ts`, and obsolete tests/imports, plus unused `LlmProviderWithModels` and `CustomProviderReloadStatus` domain types, are deleted rather than retained or aliased.

## Constraints / Dependencies

- Runtime and provider identity must be explicit in every catalog request/store key; runtime-scoped results cannot publish into another runtime.
- The AutoByteus provider-level model section represents three source keys (LLM/audio/image), refreshed concurrently, while each registry update stays model-kind scoped.
- Deterministic tests must use controlled/deferred ports or fake timers rather than public network behavior.
- Browser validation is required for UI independence; exact packaged-server validation is required for the cold latency regression.
- The current `IR-003` working tree is paused after `CRR-001` and must not advance until `SR-007` passes architecture review and the exact corrections are implemented/re-reviewed. Superseded `IR-001` global Reload/aggregate cache/FIFO machinery remains forbidden.

## Persisted Data Outcome

- Stored subject / location: encrypted provider credentials, non-secret server settings/hosts, custom-provider records, and saved model identifiers in their existing stores.
- Required outcome: `Not Affected`.
- Existing data to preserve: every value and identifier remains directly authoritative in its current representation.
- Unacceptable loss/corruption: any credential, custom provider, configured host, or saved model reference may not be rewritten, dropped, logged, or relabeled.
- Availability/rollout: dynamic lifecycle state is process memory only and may be rebuilt on first demand after restart; no maintenance window is required.
- Related IDs: `REQ-006`, `REQ-017`, `REQ-018`; `AC-006`, `AC-021`, `AC-022`.

## Assumptions

- The built-in catalog remains the authoritative static inventory listed above.
- A dynamic provider descriptor can be classified locally without contacting its endpoint.
- Canonical producer-bound parsers can identify the supported dynamic cases in `REQ-016`; model names may contain delimiters, so parsers must preserve the complete producer-defined suffix. Ambiguous legacy media identifiers fail conservatively.
- The representative local environment used for `AC-001` and `AC-004` is healthy apart from deliberately controlled model endpoints.

## Risks / Open Questions

- A legitimate AutoByteus host taking longer than `30,000ms` to return a model list fails that source attempt; inference/media operation deadlines are unchanged.
- Some legacy media identifiers encode host rather than an explicit discovery owner. The implementation must centralize supported identifier-to-source resolution and fail clearly when an exact current source cannot be identified; it must not refresh every source.
- Optional provider metadata may appear after curated static rows. This is acceptable because metadata enrichment is non-authoritative for model presence.

## Requirement-To-Use-Case Coverage

| Use Case | Covered Requirements |
| --- | --- |
| `UC-001` | `REQ-001`–`REQ-006` |
| `UC-002` | `REQ-007`, `REQ-010` |
| `UC-003` | `REQ-003`, `REQ-004`, `REQ-008`, `REQ-015` |
| `UC-004` | `REQ-009`, `REQ-010` |
| `UC-005` | `REQ-003`, `REQ-011`, `REQ-017`, `REQ-018` |
| `UC-006` | `REQ-005`, `REQ-012`–`REQ-014` |
| `UC-007` | `REQ-017`, `REQ-018` |
| `UC-008` | `REQ-007`, `REQ-008`, `REQ-016` |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criteria | Scenario Intent |
| --- | --- |
| `AC-001`–`AC-004` | Prove the credential surface is fast, local, and independent from model work. |
| `AC-005`–`AC-007` | Prove command finality, secret safety, and localized model states. |
| `AC-008`–`AC-013` | Prove static-immediate behavior, dynamic single-flight/cache reuse, provider-local Reload, and stale-result rejection. |
| `AC-014`–`AC-016` | Prove provider-specific command behavior, AutoByteus success-first client publication/single-flight joining, and custom probe-result reuse. |
| `AC-017`–`AC-020` | Prove the exact AutoByteus deadline, concurrency, ordering, and failure behavior. |
| `AC-021` | Prove non-Settings selectors/execution use canonical producer-bound dynamic identifiers and no longer depend on API Keys initialization. |
| `AC-022` | Prove clean removal and the `Not Affected` persistence decision. |

## Approval Status

Approved by the user on 2026-08-23 after source-code re-analysis. The user explicitly accepted the simplified workflow, including AutoByteus post-save background refresh, no global/static Reload, first-demand dynamic discovery, indefinite in-process reuse, provider-local manual Reload, the `30,000ms` AutoByteus per-host deadline, source-local invalidation, and no durable cache. `SR-006` completed the already-approved mounted-client observability and preserved-identifier execution paths. `SR-007` completes the same approved endpoint-change journey, state meanings, and decommission contract after code review; it introduces no new product behavior, persistence, migration, or compatibility machinery requiring renewed approval.
