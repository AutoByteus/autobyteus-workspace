# Architecture Review Revision Record

The latest `design-review-report.md` remains authoritative. This record retains the concise architecture-review chronology.

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| `ARCH-REV-001` | Round 1 / initial solution package | `SR-001` | `N/A` | `Fail` | `DI-001`, `DI-002`, `DI-003` |
| `ARCH-REV-002` | Round 2 / `SR-002` rework | `SR-001`, `SR-002` | `Fail` | `Fail` | `DI-001`, `DI-002`, `DI-003` |
| `ARCH-REV-003` | Round 3 / `SR-003` targeted rework | `SR-001`, `SR-002`, `SR-003` | `Fail` | `Fail` | `DI-003` |
| `ARCH-REV-004` | Round 4 / `SR-004` targeted rework | `SR-001`, `SR-002`, `SR-003`, `SR-004` | `Fail` | `Pass` | `DI-003` |
| `ARCH-REV-005` | Round 5 / post-pass user reload-scope change | `SR-001`–`SR-004` superseded pending revision | `Pass` | `Blocked` | `RG-001` |
| `ARCH-REV-006` | Round 6 / `SR-005` source-local reset re-review | `SR-005` | `Blocked` | `Fail` | `RG-001`, `DI-004`, `DI-005` |
| `ARCH-REV-007` | Round 7 / `SR-006` targeted path-completion re-review | `SR-005`, `SR-006` | `Fail` | `Pass` | `DI-004`, `DI-005` |
| `ARCH-REV-008` | Round 8 / `SR-007` re-review after `CRR-001` | `SR-005`–`SR-007` | `Pass` | `Pass` | `CODE-001`–`CODE-004` |

## Revision Entries

### ARCH-REV-001 — Initial authority, command, and shared-store review baseline

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/api-key-management-panel-performance/tickets/in-progress/api-key-management-panel-performance/design-review-report.md`
- Review round and trigger: round 1, initial architecture review of solution package `SR-001`
- Triggering role, report path, and finding IDs: `/solution_designer`; initial package, no prior downstream report; findings `DI-001`, `DI-002`, `DI-003`
- Relevant solution revision IDs: `SR-001`
- Prior authoritative decision: `N/A`
- Current authoritative decision: `Fail`
- What changed in the review result or what baseline was established: confirmed the measured root cause, approved two-lifecycle behavior, clean removal posture, bounded concurrent discovery owner, UI localization, and no-migration decision. Established three blocking design impacts: catalog/credential configured-state shape overlap, unguarded shared catalog-store publication across runtime-scoped consumers, and incomplete command-result/post-commit catalog boundaries for preserved specialty/custom commands.

#### Prior Finding Resolution

None.

- New or remaining finding IDs: `DI-001`, `DI-002`, `DI-003`
- Material classification changes: `N/A` — initial baseline
- Recommended recipient: `/solution_designer`
- Remaining risks or uncertainty: the business requirements are sufficiently approved; no requirement gap is open. The duplicate `BEH-007` reference should be normalized with canonical `BEH-005`. Final integration refresh remains downstream responsibility.

### ARCH-REV-002 — Authority and store findings resolved; custom invalidation remains

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/api-key-management-panel-performance/tickets/in-progress/api-key-management-panel-performance/design-review-report.md`
- Review round and trigger: round 2, solution rework `SR-002` for the three round-1 findings
- Triggering role, report path, and finding IDs: `/solution_designer`; `solution-revision-record.md`; `DI-001`, `DI-002`, `DI-003`
- Relevant solution revision IDs: `SR-001`, `SR-002`
- Prior authoritative decision: `Fail`
- Current authoritative decision: `Fail`
- What changed in the review result or what baseline was established: verified the credential-free catalog descriptor/credential-setting split, Qwen duplicate removal, runtime-keyed Pinia snapshots, epoch/request guards, explicit consumer mapping, exact command results, and explicit removal of both custom awaited reloads. Re-review of the proposed replacement found that synchronous custom-sync/cache invalidation does not yet control a pre-mutation in-flight sync/cache fill, so `DI-003` remains open under `PREM-CUSTOM-SYNC-003`.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| `DI-001` | Open | Resolved | `SR-002` | `LlmProviderDescriptor` and `CatalogProviderObject` are credential-free; `ProviderCredentialSetting` is the only aggregate configured-state shape; catalog placeholders and Qwen's duplicate Boolean are removed. |
| `DI-002` | Open | Resolved | `SR-002`, `PREM-STORE-001` | `catalogByRuntimeKind`, store epoch, monotonic request IDs, same-runtime stale rejection, guarded finally/error, explicit-runtime accessors, reset semantics, all named consumer mappings, and deterministic overlap tests are specified. |
| `DI-003` | Open | Partially Resolved — Remains Open | `SR-002`, `PREM-CUSTOM-001`, `PREM-CUSTOM-002`, `PREM-CUSTOM-SYNC-003` | Command matrix/results and wait removals are complete, but proposed invalidation lacks generation/serialization and cache-promise fencing for already-running custom sync work. |

- New or remaining finding IDs: `DI-003`
- Material classification changes: `DI-001` and `DI-002` changed from open to resolved; `DI-003` remains `Design Impact`. No new finding ID was created because the remaining defect is part of the same command/post-commit convergence issue.
- Recommended recipient: `/solution_designer`
- Remaining risks or uncertainty: no requirement gap; targeted custom sync/cache lifecycle rework only. `BEH-007` normalization is verified. Final integration refresh remains downstream responsibility.

### ARCH-REV-003 — Custom sync fencing resolved; reload registry writes remain outside the cache generation

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/api-key-management-panel-performance/tickets/in-progress/api-key-management-panel-performance/design-review-report.md`
- Review round and trigger: round 3, targeted solution rework `SR-003` for remaining `DI-003` / `PREM-CUSTOM-SYNC-003`
- Triggering role, report path, and finding IDs: `/solution_designer`; `solution-revision-record.md`; `DI-003`
- Relevant solution revision IDs: `SR-001`, `SR-002`, `SR-003`
- Prior authoritative decision: `Fail`
- Current authoritative decision: `Fail`
- What changed in the review result or what baseline was established: verified separate custom/cache generations, detached old operations, stale loops, identity-guarded cleanup, side-effect-free custom preparation, synchronous current-generation registry/status/completion commit, guarded cache assignment, and deterministic old-sync coverage. Re-reading the supported explicit-reload path found that a detached global or targeted reload can still perform a later `LLMFactory` registry write after the current-generation cache has published, while only its final cache assignment is rejected. `DI-003` therefore remains open under `PREM-RELOAD-MUTATION-004`.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| `DI-001` | Resolved | Resolved | `SR-002` | Credential-free catalog descriptor and sole aggregate credential-setting Boolean remain intact. |
| `DI-002` | Resolved | Resolved | `SR-002`, `PREM-STORE-001` | Runtime-keyed snapshots, request/epoch guards, explicit-runtime consumers, and overlap coverage remain intact. |
| `DI-003` | Partially Resolved — Open | Partially Resolved — Remains Open | `SR-003`, `PREM-CUSTOM-SYNC-003`, `PREM-RELOAD-MUTATION-004` | `SR-003` closes stale custom sync/status/cache assignment and fresh single-flight convergence. It does not govern the shared-registry side effect inside an older global/targeted reload before the rejected cache assignment. |

- New or remaining finding IDs: `DI-003`
- Material classification changes: `PREM-CUSTOM-SYNC-003` is resolved by `SR-003`; no new finding ID is created because the remaining defect is still the same command/post-mutation catalog convergence boundary. `PREM-RELOAD-MUTATION-004` records the newly verified supported overlap.
- Recommended recipient: `/solution_designer`
- Remaining risks or uncertainty: no requirement gap and no data migration. The correction should remain inside the existing cache/provider/factory lifecycle without delaying credential commands. Final integration refresh remains delivery-owned; tracked-base changes in `llm-factory.ts` must be integrated rather than overwritten.

### ARCH-REV-004 — Persistent model-registry ordering resolves final convergence finding

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/api-key-management-panel-performance/tickets/in-progress/api-key-management-panel-performance/design-review-report.md`
- Review round and trigger: round 4, targeted solution rework `SR-004` for remaining `DI-003` / `PREM-RELOAD-MUTATION-004`
- Triggering role, report path, and finding IDs: `/solution_designer`; `solution-revision-record.md`; `DI-003`
- Relevant solution revision IDs: `SR-001`, `SR-002`, `SR-003`, `SR-004`
- Prior authoritative decision: `Fail`
- Current authoritative decision: `Pass`
- What changed in the review result or what baseline was established: verified one persistent FIFO owned by the production singleton cached AutoByteus LLM provider; synchronous enqueue-before-await for ordinary fill, global reload, and all targeted branches; full worker/factory side effects plus direct no-initialize snapshot inside the slot; generation-guarded cache publication; invalidation that never resets or bypasses the tail; normalized error cleanup; post-slot current-generation repair for stale explicit reloads; production-bypass removal; and deterministic C2-attempts-before-C1 coverage. This prevents a newer cache from being overtaken by an older registry write without placing credential commands on the model queue.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| `DI-001` | Resolved | Resolved | `SR-002` | Credential-free catalog descriptors and the sole aggregate credential-setting Boolean remain unchanged. |
| `DI-002` | Resolved | Resolved | `SR-002`, `PREM-STORE-001` | Runtime-keyed snapshots, epoch/request guards, explicit-runtime consumers, and deterministic overlap coverage remain unchanged. |
| `DI-003` | Partially Resolved — Open | Resolved | `SR-003`, `SR-004`, `PREM-CUSTOM-SYNC-003`, `PREM-RELOAD-MUTATION-004` | `SR-003` fences obsolete custom synchronization and cache assignment. `SR-004` serializes every production AutoByteus LLM catalog registry operation, keeps the order across invalidation/errors, snapshots after final side effects, and makes stale reload completion await current cache repair. |

- New or remaining finding IDs: none
- Material classification changes: `DI-003` changes from partially resolved/open to resolved. `PREM-RELOAD-MUTATION-004` remains `Reachable` and is now handled by the reviewed design. The authoritative decision changes from `Fail` to `Pass`.
- Recommended recipient: `/implementation_engineer`
- Remaining risks or uncertainty: model-only FIFO waiting, the approved per-host deadline tradeoff, no durable catalog cache, bounded obsolete probes, packaged Electron validation limitation, and final tracked-base integration. Persisted data remains `Not Affected`; no migration, rewrite, or compatibility path is required.

### ARCH-REV-005 — User removes global/static reload and resets the solution basis

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/api-key-management-panel-performance/tickets/in-progress/api-key-management-panel-performance/design-review-report.md`
- Review round and trigger: round 5, explicit post-pass user direction that global Reload is unsupported, static providers expose no Reload, and only providers requiring real-time discovery expose provider-specific Reload
- Triggering role, report path, and finding IDs: user clarification after `ARCH-REV-004`; canonical report; `RG-001`
- Relevant solution revision IDs: `SR-001`–`SR-004` are retained as history but their reload/cache basis is superseded pending a new solution revision
- Prior authoritative decision: `Pass`
- Current authoritative decision: `Blocked`
- What changed in the review result or what baseline was established: the user replaced the prior global/selected reload contract with a narrower static-versus-dynamic provider surface. The old package's aggregate cache and persistent FIFO are no longer implementation-authoritative because they principally preserve a removed global capability. Requirements, UI/UX, provider inventory, cache-miss/invalidation behavior, and the discovery deadline must be canonicalized before a simpler provider-scoped design can be reviewed.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| `DI-001` | Resolved | Resolved / Still Applicable | `SR-002` | Credential/catalog authority separation remains required under the revised surface. |
| `DI-002` | Resolved | Resolved / Revalidate Mapping | `SR-002` | Exact-runtime client publication remains useful, but provider-scoped catalog state must be remapped. |
| `DI-003` | Resolved | Obsolete With Superseded Design Basis | `SR-003`, `SR-004` | The FIFO design correctly resolved the old global-reload overlap, but that surface is no longer supported and the machinery must not be carried forward without renewed evidence. |
| `RG-001` | N/A | Open | `PREM-DYNAMIC-RELOAD-005` | Canonical requirements/UI still require global reload and do not yet define the revised dynamic-provider cache/reload lifecycle. |

- New or remaining finding IDs: `RG-001`
- Material classification changes: the prior `Pass` is superseded and implementation readiness is withdrawn. This is a requirement reset, not a regression in `SR-004`'s internal correctness.
- Recommended recipient: `/solution_designer`
- Remaining risks or uncertainty: exact first-cache-miss behavior, post-credential/provider-change invalidation behavior, dynamic-provider inventory, exact per-host deadline, and other model-consumer entry paths. Persisted data remains `Not Affected`; no durable cache or migration is approved.

### ARCH-REV-006 — Simplified source-local architecture confirmed; two target-path defects remain

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/api-key-management-panel-performance/tickets/in-progress/api-key-management-panel-performance/design-review-report.md`
- Review round and trigger: round 6, solution rework `SR-005` resolving `ARCH-REV-005` / `RG-001` / `PREM-DYNAMIC-RELOAD-005`
- Triggering role, report path, and finding IDs: `/solution_designer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/api-key-management-panel-performance/tickets/in-progress/api-key-management-panel-performance/solution-revision-record.md`; `RG-001`
- Relevant solution revision IDs: `SR-005`; `SR-001`–`SR-004` retained only as superseded history
- Prior authoritative decision: `Blocked`
- Current authoritative decision: `Fail`
- What changed in the review result or what baseline was established: verified the user-approved static/dynamic inventory, network-free static initialization, no global/static Reload, no duplicate aggregate model-row cache or global FIFO, exact source registry ownership, same-source single-flight/generation/fingerprint stale rejection, concurrent `30,000ms` AutoByteus host policy, credential/model authority split, provider-local UI states, and `Not Affected` persistence outcome. `RG-001` is resolved. Full target-path tracing found that the server-detached AutoByteus post-save refresh has no client response/event that can publish into the mounted Pinia model snapshot (`DI-004`), and that `DS-008` specifies a custom identifier grammar different from the current canonical `openai-compatible:<providerId>:<modelName>` producer (`DI-005`).

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| `DI-001` | Resolved / Still Applicable | Resolved | `SR-002`, `SR-005` | Credential-free `ProviderDescriptor` and sole aggregate `ProviderCredentialSetting.apiKeyConfigured` remain explicit. |
| `DI-002` | Resolved / Revalidate Mapping | Resolved | `SR-002`, `SR-005` | Client snapshots are now keyed by normalized runtime plus discovery owner with model-kind status and epoch/request guards. |
| `DI-003` | Obsolete With Superseded Design Basis | Obsolete / Replaced By Source-Local Invariant | `SR-005` | The aggregate/global registry-write surface is removed. Prepare-only adapters plus immediate current-generation exact-source commit and identity cleanup govern reachable same-source overlap without a FIFO. |
| `RG-001` | Open | Resolved | `SR-005`, `PREM-DYNAMIC-RELOAD-005` | Canonical requirements/UI now define no global/static Reload, exact dynamic inventory, first-demand and warm-cache semantics, provider-local Reload, post-save rules, other-consumer contract, `30,000ms` deadline, and no persistence. |

- New or remaining finding IDs: `DI-004`, `DI-005`
- Material classification changes: the prior requirement gap is resolved; the decision advances from `Blocked` to a completed `Fail` based on two within-scope `Design Impact` findings. New reachable premises are `PREM-AUTOBYTEUS-CLIENT-PUBLICATION-006` and `PREM-CUSTOM-IDENTIFIER-006`.
- Recommended recipient: `/solution_designer`
- Remaining risks or uncertainty: the core simplified architecture is proportionate and should not be expanded. Rework is limited to completing the existing exact-provider client publication path and correcting the canonical custom identifier parse/build contract. Persisted data remains `Not Affected`; no migration, durable cache, global action, aggregate cache, FIFO, or compatibility branch is permitted.

### ARCH-REV-007 — Client convergence and canonical identifier resolution complete the simplified design

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/api-key-management-panel-performance/tickets/in-progress/api-key-management-panel-performance/design-review-report.md`
- Review round and trigger: round 7, targeted solution rework `SR-006` for `DI-004`, `DI-005`, `PREM-AUTOBYTEUS-CLIENT-PUBLICATION-006`, and `PREM-CUSTOM-IDENTIFIER-006`
- Triggering role, report path, and finding IDs: `/solution_designer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/api-key-management-panel-performance/tickets/in-progress/api-key-management-panel-performance/solution-revision-record.md`; `DI-004`, `DI-005`
- Relevant solution revision IDs: `SR-005`, `SR-006`; `SR-001`–`SR-004` retained only as superseded history
- Prior authoritative decision: `Fail`
- Current authoritative decision: `Pass`
- What changed in the review result or what baseline was established: verified that the server invokes exact AutoByteus LLM/audio/image ensures before returning the credential result while assigning source single-flights before their first awaits; the credential action remains model-free; the API Keys runtime reports success and then invokes a separate non-awaited exact-provider store ensure; and the targeted response publishes only the guarded AutoByteus key without duplicate adapter work. Also verified producer-owned build/parse contracts for the unchanged custom, host-scoped LLM, and AutoByteus media identifiers, including delimiter preservation and exact post-reset source targeting. The approved source-local architecture, static network-free initialization, no-global/static-Reload surface, registry-only row ownership, and no-migration decision remain intact.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| `DI-004` | Open | Resolved | `SR-006`, `PREM-AUTOBYTEUS-CLIENT-PUBLICATION-006` | Server scheduling precedes the credential response; each exact source single-flight is established synchronously. After configured-state application and success notification, API Keys invokes an independent exact AutoByteus client ensure even over an old Pinia `READY` snapshot. It joins or reads server terminal state, publishes under exact request/epoch guards, and deterministic coverage requires one adapter invocation per LLM/audio/image source. |
| `DI-005` | Open | Resolved | `SR-006`, `PREM-CUSTOM-IDENTIFIER-006` | `parseOpenAICompatibleEndpointModelIdentifier` is owned beside the unchanged canonical builder, splits once after `openai-compatible:`, and preserves the full model suffix. Equivalent producer-owned helpers cover current Ollama/LM Studio/AutoByteus identifiers; exact post-reset custom construction ensures only its provider. The mistaken grammar is rejected with no rewrite, fallback, or migration. |

- New or remaining finding IDs: none
- Material classification changes: `DI-004` and `DI-005` change from open to resolved; the authoritative decision changes from `Fail` to `Pass`. Both prior premises remain `Reachable` and are now handled proportionately by the reviewed design.
- Recommended recipient: `/implementation_engineer`
- Remaining risks or uncertainty: the paused `IR-001` tree must be cleanly realigned rather than incrementally preserving its aggregate cache/FIFO/global/static-reload machinery; dynamic snapshots remain process-local; legitimate AutoByteus discovery beyond `30,000ms` fails that host attempt; current media identifiers fail conservatively when unmatched; final tracked-base integration remains delivery-owned. Persisted data remains `Not Affected`; no migration exists or is required.

### ARCH-REV-008 — Host-setting return path, endpoint identity, freshness, and cleanup are design-complete

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/api-key-management-panel-performance/tickets/in-progress/api-key-management-panel-performance/design-review-report.md`
- Review round and trigger: round 8, solution rework `SR-007` after implementation review `CRR-001` exposed `CODE-001`–`CODE-004` / `CR-PREM-001`–`CR-PREM-003`
- Triggering role, report path, and finding IDs: `/solution_designer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/api-key-management-panel-performance/tickets/in-progress/api-key-management-panel-performance/code-review-report.md`; `CODE-001`, `CODE-002`, `CODE-003`, `CODE-004`
- Relevant solution revision IDs: `SR-005`, `SR-006`, `SR-007`; `SR-001`–`SR-004` retained only as superseded history
- Prior authoritative decision: `Pass` (`ARCH-REV-007`); downstream implementation review then failed at `CRR-001`
- Current authoritative decision: `Pass`
- What changed in the review result or what baseline was established: verified new `DS-010` from a supported Server Settings save through server full-source clear/detached ensure, confirmed client mutation result, direct non-awaited exact-provider Pinia clear-and-ensure, and guarded shared publication while API Keys is unmounted. Verified one SDK-owned normalized full endpoint identity across adapter input, fingerprint, provenance, membership, and availability, with unchanged authority-only persisted identifiers resolving only to a unique current full endpoint. Verified a derived per-kind freshness lattice that treats current-success-plus-peer-failure as partial and reserves stale copy for retained `STALE_ERROR` rows. Verified exact deletion inventory for dormant video cache/reload files and unused coupled/reload domain types. The no-global/static-Reload, registry-only rows, source-local lifecycle, `30,000ms` discovery deadline, secret separation, and no-migration basis remain intact.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| `CODE-001` | Open / Local Fix | Design Response Complete — Implementation Pending | `SR-007`, `CR-PREM-001` | Full endpoint normalization is singular and reused; every affected source row is removed synchronously on setting commit before detached refill; same-authority scheme/path success/failure coverage and current-host availability checks are specified. |
| `CODE-002` | Open / Design Impact | Resolved At Design Level — Implementation Pending | `SR-007`, `DS-010`, `CR-PREM-002` | The Server Settings action starts exact mapped convergence immediately after confirmed mutation success and before its later settings-list reload. The catalog action fences old responses, clears only mapped kinds, sends targeted non-forcing ensure even over `READY`, and guardedly publishes while API Keys is unmounted, without an event bus/global fetch/model wait. |
| `CODE-003` | Open / Local Fix | Design Response Complete — Implementation Pending | `SR-007`, `CR-PREM-003` | The explicit derived lattice reports current-success-plus-peer-problem as provider partial, reserves stale copy for actual retained `STALE_ERROR` rows, preserves exact per-kind statuses, and has deterministic composed-snapshot coverage. |
| `CODE-004` | Open / Local Fix | Design Response Complete — Implementation Pending | `SR-007`, `AC-022` | Removal inventory names `video-model-service.ts`, `cached-video-model-provider.ts`, obsolete tests/imports, `LlmProviderWithModels`, and `CustomProviderReloadStatus`; static video factory ownership remains and no aliases/replacements are permitted. |

- New or remaining architecture finding IDs: none
- Material classification changes: the architecture decision remains `Pass`; `CODE-002` changes from an open downstream Design Impact to resolved at design level. `CODE-001`, `CODE-003`, and `CODE-004` now have complete reviewed design instructions but remain implementation/code-review findings until corrected and re-reviewed by their owner.
- Recommended recipient: `/implementation_engineer`
- Remaining risks or uncertainty: full-source clearing briefly removes unchanged peer rows after an explicit setting edit; current host-only identifiers fail conservatively when full-endpoint mapping is ambiguous; dynamic snapshots remain process-local; legitimate AutoByteus discovery beyond `30,000ms` fails that host attempt; paused `IR-003` tests do not cover the three reachable premises; final tracked-base integration remains delivery-owned. Persisted data remains `Not Affected`; no migration, rewrite, durable cache, or compatibility path exists or is required.
