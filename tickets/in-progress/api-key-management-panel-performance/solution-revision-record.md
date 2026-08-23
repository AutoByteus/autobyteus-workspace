# Solution Revision Record

The latest requirements, investigation notes, design spec, and supplements remain authoritative. This record indexes the initial baseline and later rework without duplicating those artifacts.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Result |
| --- | --- | --- | --- | --- |
| `SR-001` | Solution designer initial approved solution package | N/A | `Initial Baseline` | Approved requirements and UI behavior translated into an architecture-review-ready decoupled credential/catalog design |
| `SR-002` | `/architecture_reviewer`; `design-review-report.md`; round 1 / `ARCH-REV-001` | `DI-001`, `DI-002`, `DI-003` | `Design Impact` | Corrected credential/catalog shapes, runtime-safe store publication, and every credential/provider command boundary; returned for round 2 |
| `SR-003` | `/architecture_reviewer`; `design-review-report.md`; round 2 / `ARCH-REV-002` | `DI-003`; `PREM-CUSTOM-SYNC-003` | `Design Impact` | Added exact generation-fenced custom sync/registry/cache invalidation and fresh convergence lifecycle; returned for round 3 |
| `SR-004` | `/architecture_reviewer`; `design-review-report.md`; round 3 / `ARCH-REV-003` | `DI-003`; `PREM-RELOAD-MUTATION-004` | `Design Impact` | Added persistent FIFO serialization for every AutoByteus LLM catalog registry operation plus deterministic stale-reload cache repair; returned for round 4 |
| `SR-005` | User product reset; `ARCH-REV-005` after superseded round-4 pass | `RG-001`; `PREM-DYNAMIC-RELOAD-005` | `Requirement Gap` | Replaced global/static Reload and aggregate cache/FIFO with approved static-immediate and source-local dynamic discovery workflow; returned for new architecture review |
| `SR-006` | `/architecture_reviewer`; `ARCH-REV-006` review of `SR-005` | `DI-004`, `DI-005`; `PREM-AUTOBYTEUS-CLIENT-PUBLICATION-006`, `PREM-CUSTOM-IDENTIFIER-006` | `Design Impact` | Completed success-first AutoByteus client publication and bound availability to canonical dynamic identifier producers; returned for re-review |
| `SR-007` | `/code_reviewer`; `code-review-report.md`; `CRR-001` review of `IR-003` | `CODE-001`–`CODE-004`; `CR-PREM-001`–`CR-PREM-003` | `Design Impact` | Completed exact host-setting client convergence, full endpoint identity, mixed-result meaning, and explicit clean-cut removals; returned for architecture re-review |

## Revision Entries

### SR-001 — Decoupled credential management and bounded model discovery baseline

- Triggering role, report path, and round: solution designer initial investigation/design round; no upstream report
- Triggering finding IDs: N/A
- Prior authoritative result: `N/A`
- Current authoritative result: root cause confirmed; requirements and UI/UX behavior approved by the user on 2026-08-23; initial design completed for architecture review
- Why this baseline or revision entry is recorded: establish the first complete solution package after production-shaped measurement proved a `78.276s` catalog wait and the user approved keeping API-key configuration usable while only the selected provider's model section loads.
- Resolution: separate local provider/credential state from the existing catalog lifecycle; make credential command completion authoritative and independent; remove the mixed `providerSettings` path; localize model states; centralize concurrent `3,000ms` per-host discovery with deterministic partial/last-known behavior.
- Approved behavior or requirement IDs affected: `BEH-001`–`BEH-006`; `REQ-001`–`REQ-013`; `AC-001`–`AC-015`
- Canonical artifacts and sections updated:
  - `requirements.md` — approved refined behavior, scope, requirements, and acceptance criteria
  - `investigation-notes.md` — code/runtime evidence, causal probe, save-path coupling, and correction analysis
  - `design-spec.md` — initial target spines, owners, contracts, removals, file mapping, and sequence
- Supplemental artifacts updated, added, or removed:
  - `ui-ux-spec.md` added and approved for independent credential/model loading and error behavior
  - `api-key-panel-loading.png` retained as current-state evidence
- Downstream and architecture-review impact: architecture review must verify a real service/API/store/component lifecycle split, clean removal of the coupled query/state, authoritative post-save result, and one bounded concurrent discovery owner without compatibility fallbacks.
- Next recipient or routing: `/architecture_reviewer`
- Remaining gaps or risks: architecture review decision pending; a slow legitimate gateway may exceed the approved discovery deadline; no durable catalog cache is added; Electron Playwright packaged-launch limitation remains bounded by browser-equivalent UI and exact packaged-server validation.

### SR-002 — Tight authority, safe runtime publication, and complete command boundaries

- Triggering role, report path, and round: `/architecture_reviewer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/api-key-management-panel-performance/tickets/in-progress/api-key-management-panel-performance/design-review-report.md`; architecture review round 1 / `ARCH-REV-001`
- Triggering finding IDs: `DI-001`, `DI-002`, `DI-003`; material premises `PREM-STORE-001`, `PREM-CUSTOM-001`, `PREM-CUSTOM-002`
- Prior authoritative result: `Fail` / `Design Impact`; implementation was blocked
- Current authoritative result: all three design impacts are resolved in the authoritative design and supporting investigation; the approved requirements/UI contract is unchanged; package is ready for architecture re-review
- Why this revision entry is recorded: the initial direction separated page lifecycles but retained three implementation-blocking ambiguities: catalog provider DTOs could still publish false configured state, the shared store could publish an older/different-runtime result over a supported consumer, and specialty/custom command completion was not defined consistently.
- Resolution:
  - `DI-001`: replace configured-state-capable catalog provider reuse with credential-free `LlmProviderDescriptor`/`CatalogProviderObject`; make `ProviderCredentialSetting` in credential reads/results the only aggregate `apiKeyConfigured` shape; remove catalog placeholders and the duplicate Qwen setup Boolean.
  - `DI-002`: replace one mutable catalog snapshot with `catalogByRuntimeKind`; require explicit runtime on actions/accessors; use monotonic request IDs, same-runtime stale-result rejection, retained-data errors, and deterministic cross/same-runtime overlap coverage; update every named non-Settings consumer.
  - `DI-003`: define generic, AutoByteus, Gemini save/activation, Qwen, custom create, and custom delete result/clear/invalidation/failure behavior. Remove both server custom post-commit reload waits; preserve explicit probes and compensation; use synchronous non-I/O invalidation plus contained later catalog refresh.
  - Normalize the duplicate `BEH-007` reference into canonical `BEH-005`; `SR-001`'s affected-ID range was factually corrected to `BEH-001`–`BEH-006`.
- Approved behavior or requirement IDs affected: `BEH-002`, `BEH-004`–`BEH-006`; `REQ-002`–`REQ-006`, `REQ-009`–`REQ-012`; `AC-002`–`AC-007`, `AC-012`–`AC-014`
- Canonical artifacts and sections updated:
  - `investigation-notes.md` — `ARCH-REV-001` source/evidence, corrected behavior inventory, catalog-shape/store-overlap/custom-command findings, strategies, constraints, and reviewer guidance
  - `design-spec.md` — current-state facts, intended change, `DS-007`, descriptor/credential shapes, runtime publication contract, command matrix, removals, file/consumer mapping, examples, sequence, risks, and validation guidance
  - `requirements.md` — unchanged; remains the approved behavior authority
- Supplemental artifacts updated, added, or removed: none; `ui-ux-spec.md` remains aligned and approved, and `api-key-panel-loading.png` remains current-state evidence
- Downstream and architecture-review impact: architecture re-review should reuse `DI-001`–`DI-003` and verify each is closed before routing to implementation. Implementation must not retain schema/store compatibility aliases or any custom post-commit reload wait.
- Next recipient or routing: `/architecture_reviewer`
- Remaining gaps or risks: architecture re-review decision pending; final integration refresh remains delivery-owned; legitimate hosts beyond the approved deadline remain model-only unavailable for that attempt; no durable catalog cache is added.

### SR-003 — Fence in-flight custom synchronization and cache publication

- Triggering role, report path, and round: `/architecture_reviewer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/api-key-management-panel-performance/tickets/in-progress/api-key-management-panel-performance/design-review-report.md`; architecture review round 2 / `ARCH-REV-002`
- Triggering finding IDs: remaining `DI-003`; material premise `PREM-CUSTOM-SYNC-003`
- Prior authoritative result: `Fail` / `Design Impact`; `DI-001` and `DI-002` resolved, `DI-003` partially resolved but open
- Current authoritative result: remaining `DI-003` is resolved in the target design; command results/wait removals remain unchanged, and custom invalidation now revokes all pre-mutation sync/registry/status/cache publication authority while preserving nonblocking command finality
- Why this revision entry is recorded: `SR-002` advanced/cleared custom sync and cache state but did not govern already-running `syncPromise`/`cachePromise` work. A supported delete during background model loading could therefore let an old provider snapshot republish and suppress the intended fresh convergence.
- Resolution:
  - Add `DS-008` with separate monotonic `customGeneration` and `cacheGeneration`, generation-stamped operations, synchronous detach-on-invalidate, stale-result loops, and identity-guarded cleanup.
  - Split the SDK custom endpoint registry path into side-effect-free async `prepareOpenAICompatibleEndpointModels()` and synchronous `commitOpenAICompatibleEndpointModels()`. The custom sync owner performs the final generation check with no await before registry/last-known/status/completion publication.
  - Replace Boolean `hasEverSynced` with `completedGeneration`; generation-stamp the status snapshot so old results cannot make the new generation current.
  - Fence initial fill, global refresh, and targeted refresh cache writers; a stale fill cannot assign or clear the current operation, and a post-mutation list starts the fresh generation rather than joining the old promise.
  - Make `ModelCatalogService.invalidateCustomProviderModelsAfterMutation(providerId)` the one synchronous, nonthrowing coordinator over custom sync then LLM cache generation invalidation. Remove unused runtime-mutating `clearUnavailableProviders()` and do not involve the unrelated metadata resolver.
  - Define the contained network-only catalog request as the exact fresh convergence execution, plus deterministic deferred-promise tests covering old sync completion, new registry/cache commit, guarded cleanup, and final Pinia stale-request rejection.
- Approved behavior or requirement IDs affected: `BEH-004`, `BEH-005`; `REQ-003`, `REQ-005`, `REQ-009`–`REQ-011`; `AC-003`, `AC-005`, `AC-013`
- Canonical artifacts and sections updated:
  - `investigation-notes.md` — round-2 review evidence, `PREM-CUSTOM-SYNC-003` production trace, affected sync/cache/factory owners, strategy decisions, constraints, and residual risk
  - `design-spec.md` — `SR-003` disposition, `DS-008` generation lifecycle, publication boundaries, removal/dependency/interface/file maps, race example, sequencing, risks, and deterministic coverage guidance
  - `requirements.md` — unchanged; remains approved authority
- Supplemental artifacts updated, added, or removed: none; approved `ui-ux-spec.md` and screenshot evidence remain aligned
- Downstream and architecture-review impact: architecture re-review should reuse `DI-003` and verify generation advancement, stale publication rejection, post-mutation fresh execution, guarded cleanup, affected cache ownership, and deferred-promise coverage before implementation routing.
- Next recipient or routing: `/architecture_reviewer`
- Remaining gaps or risks: architecture round-3 decision pending; obsolete endpoint probes may consume resources until they settle but cannot publish or delay commands; final integration refresh remains delivery-owned; persisted data remains `Not Affected` with no migration.

### SR-004 — Serialize reload registry writes with current-generation cache convergence

- Triggering role, report path, and round: `/architecture_reviewer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/api-key-management-panel-performance/tickets/in-progress/api-key-management-panel-performance/design-review-report.md`; architecture review round 3 / `ARCH-REV-003`
- Triggering finding IDs: remaining `DI-003`; material premise `PREM-RELOAD-MUTATION-004`
- Prior authoritative result: `Fail` / `Design Impact`; `DI-001` and `DI-002` remained resolved and `SR-003` resolved `PREM-CUSTOM-SYNC-003`, but side-effectful older reload work could still outlive cache-generation authority
- Current authoritative result: remaining `DI-003` is resolved in `SR-004` by a persistent cached-provider registry-operation order and post-stale repair contract; credential command finality and all prior authority/generation corrections remain unchanged; package is ready for architecture round-4 re-review
- Why this revision entry is recorded: in the approved API Keys UI, a user can start selected-provider Reload Models and delete a custom provider while that model-only operation is pending. Under `SR-003`, contained C2 could publish a current cache first, after which C1 could replace shared `LLMFactory` rows and lose only its final cache assignment, leaving registry and cache inconsistent and omitting the supported reload result.
- Resolution:
  - Make `CachedAutobyteusLlmModelProvider` own one persistent FIFO `registryOperationTail`. Ordinary fill, global reload, and every targeted reload variant append synchronously before any await and hold the slot through all underlying provider/factory side effects and a final direct registry snapshot.
  - Preserve the tail across custom and AutoByteus cache-generation invalidation. Invalidation advances cache authority and detaches only the generation-specific `activeFill`; a contained C2 is enqueued behind C1 and cannot publish before C1's last registry write.
  - Enumerate global `LLMFactory.reinitialize`, targeted custom prepare/commit, targeted AutoByteus remote sync, targeted Ollama/LM Studio `reloadModels`, and non-reloadable target paths. Require all workers to await registry side effects and forbid production server bypass around the cached owner.
  - Keep cache assignment generation-guarded and fill cleanup identity-guarded. Normalize the persistent tail on success/failure so no error poisons later operations; on possibly partial reload error take a final registry snapshot or clear a known-inconsistent cache.
  - After an explicit reload releases its slot, re-check the live generation and, when stale or unsnapshotted, establish/join and loop to current-generation fill before the public model-operation promise settles. Repair occurs outside the queue callback to prevent self-deadlock; the credential/provider mutation command does not await C1, C2, or repair.
  - Add deterministic deferred coverage for every registry-writing class and cleanup. In the canonical C2-attempts-before-C1-settles case, prove C2 cannot read/publish until C1 writes, C1 cannot settle until current repair, and final cache includes C1 reload rows while excluding the deleted custom provider.
- Approved behavior or requirement IDs affected: `BEH-004`, `BEH-005`; `REQ-003`, `REQ-005`, `REQ-006`, `REQ-009`–`REQ-011`; `AC-003`, `AC-005`, `AC-007`, `AC-012`, `AC-013`
- Canonical artifacts and sections updated:
  - `investigation-notes.md` — `ARCH-REV-003`, `PREM-RELOAD-MUTATION-004` source trace, affected worker/factory paths, owner choice, alternatives, constraints, risks, and reviewer guidance
  - `design-spec.md` — `SR-004` disposition; `DS-004`/`DS-008` persistent FIFO, final snapshot, stale-repair/error/cleanup contracts; owner/dependency/interface/file maps; examples; sequence; risks; deterministic validation guidance
  - `requirements.md` — unchanged; remains the approved behavior authority
- Supplemental artifacts updated, added, or removed: none; approved `ui-ux-spec.md` and `api-key-panel-loading.png` evidence remain aligned
- Downstream and architecture-review impact: architecture round 4 should reuse `DI-003` and verify the persistent enqueue-before-await ordering, global/all targeted side-effect coverage, invalidation that never resets the tail, final snapshot/error cleanup, post-slot current-generation repair, and the deterministic attempted-C2-before-C1 test. Implementation remains blocked until that review passes.
- Next recipient or routing: `/architecture_reviewer`
- Remaining gaps or risks: architecture round-4 decision pending; model-only FIFO wait is permitted while credentials remain usable; obsolete bounded probes may still consume resources; final integration refresh and newer base `llm-factory.ts` changes remain delivery/integration concerns; persisted data remains `Not Affected` with no migration.

### SR-005 — Static-immediate, provider-local dynamic discovery reset

- Triggering role, report path, and round: user-approved product reset after `ARCH-REV-004`; `/architecture_reviewer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/api-key-management-panel-performance/tickets/in-progress/api-key-management-panel-performance/design-review-report.md`; superseding `ARCH-REV-005`
- Triggering finding IDs: `RG-001`; material premise `PREM-DYNAMIC-RELOAD-005`
- Prior authoritative result: the `SR-004` architecture Pass and implementation authorization were superseded because they implemented a now-unsupported global/static Reload surface and disproportionate aggregate cache/FIFO.
- Current authoritative result: requirements, UI/UX, investigation, and design are reset to the user-approved workflow and ready for a new architecture review. Implementation remains paused until that review passes.
- Why this revision entry is recorded: after source-code re-analysis, the user confirmed that static providers need neither discovery nor Reload; dynamic discovery should occur only on first source demand, reuse its process snapshot without refresh-on-hit, and force-refresh only through the selected dynamic provider. The user also approved AutoByteus post-save background refresh and the exact `30,000ms` per-host deadline.
- Resolution:
  - Define the static inventory and dynamic sources (AutoByteus LLM/audio/image, Ollama, LM Studio, and each custom provider).
  - Remove global Reload, static-provider Reload, the duplicate aggregate `ModelInfo[]` cache, and the global registry FIFO.
  - Make SDK static initialization network-free and retain model rows solely in factory registries.
  - Add exact runtime/owner/model-kind source keys, terminal-attempt process reuse, same-source single-flight, generation/fingerprint stale-result rejection, identity-guarded cleanup, and atomic source replacement.
  - Preserve model provider identity separately from discovery ownership, including AutoByteus gateway rows.
  - Specify source-targeted local snapshot, ensure, and reload contracts; cache-hit ensure performs no network work.
  - Make AutoByteus key save return exact credential success before scheduling LLM/audio/image refresh; keep static/Gemini/Qwen saves discovery-free; seed custom creation from its required probe.
  - Map host-setting invalidation and every other selector/construction path so old-host rows cannot execute and API Keys is not an initialization prerequisite.
  - Bound AutoByteus model discovery to concurrent `30,000ms` attempts per valid host with deterministic ordering and localized partial/total failure.
- Approved behavior or requirement IDs affected: `BEH-001`–`BEH-008`; `REQ-001`–`REQ-018`; `AC-001`–`AC-022`
- Canonical artifacts and sections updated:
  - `requirements.md` — fully reset authoritative behavior, inventory, scope, requirements, criteria, persistence result, and user approval
  - `investigation-notes.md` — re-analysis of static initialization, dynamic adapters, other consumers, identity, settings changes, source-local lifecycle, and superseded strategy
  - `design-spec.md` — complete `SR-005` spines, state machine, registry boundary, operations, mutation matrix, consumer mapping, removal plan, file map, and verification matrix
- Supplemental artifacts updated, added, or removed:
  - `ui-ux-spec.md` fully reset to no global/static Reload, static-immediate rows, first-demand loading, warm no-request reuse, retained rows during dynamic Reload, and independent command feedback
  - `api-key-panel-loading.png` remains current-state evidence
- Downstream and architecture-review impact: review this package as replacement authority. Verify that source-local generation and exact registry ownership cover same-source races without a global queue, static initialization has no network dependency, terminal cache behavior is exact, all consumer entry paths are mapped, and removed global/aggregate behavior is not retained as compatibility.
- Next recipient or routing: `/architecture_reviewer`
- Remaining gaps or risks: architecture decision pending; legacy identifiers can be ambiguous and require conservative centralized resolution; process restart intentionally rediscovers; the paused uncommitted `IR-001` tree must be realigned rather than partially preserved; persisted data remains `Not Affected`.

### SR-006 — Complete post-save client convergence and canonical persisted identifier resolution

- Triggering role, report path, and round: `/architecture_reviewer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/api-key-management-panel-performance/tickets/in-progress/api-key-management-panel-performance/design-review-report.md`; architecture review round 6 / `ARCH-REV-006`
- Triggering finding IDs: `DI-004`, `DI-005`; material premises `PREM-AUTOBYTEUS-CLIENT-PUBLICATION-006`, `PREM-CUSTOM-IDENTIFIER-006`
- Prior authoritative result: `Fail` / `Design Impact`; `RG-001` and the central simplified architecture passed, but the mounted client had no pull/event to receive the server-detached AutoByteus result and `DS-008` used a non-canonical custom identifier grammar.
- Current authoritative result: both narrow design impacts are resolved without changing approved product behavior. The `SR-005` no-global/static-Reload, source-local lifecycle, registry-only row cache, secret, and no-migration decisions remain unchanged.
- Why this revision entry is recorded: server registry publication alone cannot change an already-mounted Pinia snapshot, and a persisted custom identifier after restart must be decoded from the actual producer contract rather than an invented runtime suffix.
- Resolution:
  - Extend `DS-006` and `DS-009`: the server invokes/owns AutoByteus LLM/audio/image ensures before returning but does not await them; after Pinia/UI applies configured state and reports credential success, API Keys starts—but does not await—one exact-AutoByteus model-store ensure.
  - Make the client ensure the pull-based return path: it sends the targeted non-forcing server request even when Pinia retains an old `READY` snapshot, marks only AutoByteus loading/refreshing, receives the new snapshot, and publishes under existing runtime/provider request guards.
  - Require source `inFlight` assignment before the server ensure's first await so the later client ensure joins or reads terminal state. Deterministic coverage proves one adapter invocation per AutoByteus source key despite server and client demand.
  - Replace the mistaken `:openai_compatible@<providerId>` grammar with an exported parser colocated with `buildOpenAICompatibleEndpointModelIdentifier()`, preserving exact `openai-compatible:<providerId>:<modelName>` output and delimiter-bearing model suffixes.
  - Revalidate Ollama, LM Studio, AutoByteus LLM, and AutoByteus audio/image through matching parsers owned beside their current identifier producers; `ModelAvailabilityService` only maps parsed identity to current configured source and ensures it.
  - Add builder/parser round-trip and post-registry-reset persisted custom construction coverage; no alternate identifier, rewrite, compatibility branch, or migration is introduced.
- Approved behavior or requirement IDs affected: `BEH-002`, `BEH-005`, `BEH-007`; `REQ-003`, `REQ-005`, `REQ-013`, `REQ-014`, `REQ-016`; `AC-003`, `AC-007`, `AC-015`, `AC-016`, `AC-021`
- Canonical artifacts and sections updated:
  - `requirements.md` — clarified already-approved AutoByteus client observability/single-flight criteria and canonical identifier construction criterion
  - `investigation-notes.md` — `ARCH-REV-006` evidence, client publication trace, canonical producers, identifier delimiter constraints, and corrected strategy
  - `design-spec.md` — `SR-006` disposition; `DS-006`, `DS-008`, `DS-009`; return/event flow; producer-owned identity boundary; command/store/component/file mappings; examples; sequence; coverage
- Supplemental artifacts updated, added, or removed:
  - `ui-ux-spec.md` clarifies the existing approved success-first AutoByteus transition through a non-awaited exact-provider model action
  - screenshot evidence remains unchanged
- Downstream and architecture-review impact: architecture re-review should reuse `DI-004` and `DI-005` and verify exact client action ordering/publication/single-flight evidence plus canonical producer/parser round trips and post-reset custom construction. Implementation remains blocked until Pass.
- Next recipient or routing: `/architecture_reviewer`
- Remaining gaps or risks: architecture decision pending; current AutoByteus media identifiers remain kind/host-disambiguated and fail conservatively when unmatched; process snapshots remain ephemeral; paused `IR-001` remains non-authoritative; persisted data remains `Not Affected`.

### SR-007 — Complete host-setting convergence and reviewed cleanup

- Triggering role, report path, and round: `/code_reviewer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/api-key-management-panel-performance/tickets/in-progress/api-key-management-panel-performance/code-review-report.md`; implementation review `CRR-001` of `IR-003`
- Triggering finding IDs: `CODE-001`, `CODE-002`, `CODE-003`, `CODE-004`; material premises `CR-PREM-001`, `CR-PREM-002`, `CR-PREM-003`
- Prior authoritative result: `Fail` / `Design Impact`; `ARCH-REV-007` had passed `SR-006`, but code review proved the supported API Keys -> Server Settings host edit -> API Keys path had no client return into previously `READY` Pinia state. It also found authority-only endpoint retention, mixed current/cold results mislabeled stale, and four undeleted obsolete items.
- Current authoritative result: the exact cross-section return path and three bounded corrections are design-complete and ready for architecture re-review. API/E2E remains blocked until review passes and implementation/code review are repeated.
- Why this revision entry is recorded: server-detached source work cannot update a shared pull-based client snapshot by itself, and endpoint identity cannot be reduced to URL authority when the user can edit scheme/path. The implementation evidence also requires exact presentation semantics and completion of the already-authorized removal plan.
- Resolution:
  - Add `DS-010`: immediately after a supported host-setting mutation result confirms durable success—and before the action's ordinary settings-list reload—the Server Settings Pinia action uses an exact constant map to invoke but not await the catalog store's mapped provider/model-kind clear-and-ensure action. A later settings-list reload failure therefore cannot suppress convergence; no event bus, global catalog request, or API Keys mount is required.
  - Advance the exact provider client request token before clearing mapped rows/state so older ensure/reload responses cannot restore them; send the normal targeted non-forcing ensure even over prior `READY`, and publish only through the existing epoch/provider/request guard while API Keys may be unmounted.
  - Preserve server command finality and single-flight: the server removes all mapped source rows, advances generation, and starts its detached ensure before returning; the later client request joins or reads current terminal state rather than duplicating adapter work.
  - Replace URL-authority retention with one normalized full adapter endpoint identity used by fingerprints, configured membership, row provenance, and availability. Clear the full affected source on host commit; same-authority scheme/path changes cannot leave old `hostUrl` rows executable.
  - Define provider aggregation: current rows from one AutoByteus kind plus cold error from another are partial. Stale copy is reserved for actual retained `STALE_ERROR` rows.
  - Require deletion of `video-model-service.ts`, `cached-video-model-provider.ts`, obsolete tests/imports, and unused `LlmProviderWithModels` / `CustomProviderReloadStatus` declarations, with no aliases.
- Approved behavior or requirement IDs affected: `BEH-006`, `BEH-008`; `REQ-003`, `REQ-010`, `REQ-015`, `REQ-017`, `REQ-018`; `AC-007`, `AC-013`, `AC-019`, `AC-020`, `AC-022`
- Canonical artifacts and sections updated:
  - `requirements.md` — clarified exact host-change client convergence, full endpoint identity, mixed partial/stale meanings, deterministic criteria, and removal inventory
  - `investigation-notes.md` — recorded `CRR-001`, `CR-PREM-001`–`003`, current IR-003 code paths, owner conclusions, alternatives, and reviewer guidance
  - `design-spec.md` — added `SR-007` disposition, `DS-010`, full endpoint boundary, provider aggregation lattice, exact store/server interfaces, setting map, removal rows, sequence, examples, and verification
- Supplemental artifacts updated, added, or removed:
  - `ui-ux-spec.md` clarifies the already-approved Settings success -> exact shared loading/result transition and current-partial versus retained-stale copy
  - screenshot evidence remains unchanged
- Downstream and architecture-review impact: architecture re-review should verify the exact non-global store-to-store return path, server/client stale-response fencing, full-source clearing, status lattice, and cleanup inventory. On Pass, route the cumulative package plus code-review evidence to `/implementation_engineer`; the paused `IR-003` source must not resume beforehand.
- Next recipient or routing: `/architecture_reviewer`
- Remaining gaps or risks: architecture decision pending; clearing a changed source temporarily removes otherwise unchanged peer-host rows by design; authority-only persisted identifiers remain conservatively resolvable only to a unique current full endpoint; process snapshots remain ephemeral. Persisted data remains `Not Affected`: no migration, rewrite, compatibility branch, or durable cache is introduced.
