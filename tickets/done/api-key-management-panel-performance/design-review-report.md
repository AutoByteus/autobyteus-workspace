# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/api-key-management-panel-performance/tickets/in-progress/api-key-management-panel-performance/requirements.md`
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/api-key-management-panel-performance/tickets/in-progress/api-key-management-panel-performance/investigation-notes.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/api-key-management-panel-performance/tickets/in-progress/api-key-management-panel-performance/design-spec.md`
- Supplemental Task Artifacts Reviewed:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/api-key-management-panel-performance/tickets/in-progress/api-key-management-panel-performance/ui-ux-spec.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/api-key-management-panel-performance/tickets/in-progress/api-key-management-panel-performance/api-key-panel-loading.png`
- Solution Revision Record Reviewed: `/Users/normy/autobyteus_org/autobyteus-worktrees/api-key-management-panel-performance/tickets/in-progress/api-key-management-panel-performance/solution-revision-record.md`
- Relevant Solution Revision IDs: `SR-007` over the user-approved `SR-005` / reviewed `SR-006` replacement basis; `SR-001`–`SR-004` retained only as superseded history
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/api-key-management-panel-performance/tickets/in-progress/api-key-management-panel-performance/architecture-review-revision-record.md`
- Triggering Downstream Reports Reviewed:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/api-key-management-panel-performance/tickets/in-progress/api-key-management-panel-performance/implementation-handoff.md` (`IR-003`, superseded by code-review result)
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/api-key-management-panel-performance/tickets/in-progress/api-key-management-panel-performance/implementation-revision-record.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/api-key-management-panel-performance/tickets/in-progress/api-key-management-panel-performance/code-review-report.md` (`CRR-001`)
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/api-key-management-panel-performance/tickets/in-progress/api-key-management-panel-performance/code-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-008`
- Current Review Round: `8`
- Trigger: `SR-007` rework after `CRR-001` for `CODE-001`–`CODE-004` and `CR-PREM-001`–`CR-PREM-003`
- Prior Review Round Reviewed: `ARCH-REV-007` (`Pass`); downstream trigger `CRR-001` (`Fail / Design Impact`)
- Latest Authoritative Round: `ARCH-REV-008`
- Current-State Evidence Basis: bootstrap `HEAD 122adc91c184a75541489eea670ac29fcb43f4ab`; current Server Settings editor/store/service paths, Pinia catalog request guards, full endpoint consumers, source registries/lifecycle, provider-state projection, canonical identifier builders, and the paused `IR-003` source/code-review evidence were inspected. `IR-003` remains non-authoritative pending correction and repeat code review.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`
- Approved requirements / intended behavior understood: `Yes` — static rows are local and immediate; only the named dynamic sources discover; successful process snapshots are reused without a normal cache-hit request; Reload is selected-dynamic-provider only; credentials are independent.
- Relevant existing behavior and evidence confirmed: `Yes` — in addition to the original timing/root-cause evidence, `CRR-001` establishes reachable authority-only endpoint retention, a missing Server Settings-to-catalog client return path, mixed-kind freshness mislabeling, and four undeleted obsolete items in paused `IR-003`.
- Scope guardrail confirmed: `Yes` — the correction remains exact-source/store-local. It adds no global/static Reload, event bus, aggregate row cache, FIFO, durable cache, compatibility path, identifier rewrite, persistence change, migration, inference timeout change, or broad UI redesign.
- Approved change, preserved behavior, and outside scope understood: `Yes`.
- Every prospective blocking `Design Impact` finding is traceable to an approved requirement, acceptance criterion, or preserved-behavior ID: `Yes`; no blocking finding remains.
- Remaining material ambiguity, if any: none.

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `BEH-001` | User | Pass | Pass | Pass | Confirmed | None |
| `BEH-002` | Contract | Pass | Pass | Pass | Confirmed | None |
| `BEH-003` | System | Pass | Pass | Pass | Confirmed | None |
| `BEH-004` | User | Pass | Pass | Pass | Confirmed | None |
| `BEH-005` | User | Pass | Pass | Pass | Confirmed | None |
| `BEH-006` | Operational | Pass | Pass | Pass | Confirmed | None |
| `BEH-007` | System | Pass | Pass | Pass | Confirmed | None |
| `BEH-008` | Contract | Pass | Pass | Pass | Confirmed | None |

`SR-007` preserves the approved `SR-005` / reviewed `SR-006` product boundary. It completes the already-approved host-change journey, truthful partial/stale meanings, and clean-cut removal contract proven incomplete by `CRR-001`; it does not introduce a new product decision.

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? | Linked To Relevant Core Artifacts? | Internally Complete? | Consistent With Related Core Artifacts? | Status And Approval Applicability Are Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `api-key-panel-loading.png` | Pass | Pass | Pass | Pass | Pass | None; current-state whole-panel wait evidence. |
| `ui-ux-spec.md` | Pass | Pass | Pass | Pass | Pass | None; exact host-change convergence, mixed partial/stale copy, success-first AutoByteus publication, and no global/static Reload are coherent with the canonical requirements/design. |

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Performance + Behavior Change + Refactor is explicit. | None |
| Root-cause classification is explicit and evidence-backed | Pass | Coupled credential/catalog critical path, eager dynamic initialization, duplicate rows, and accidental initialization dependency are source-backed. | None |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | Refactor is required now. | None |
| Refactor decision is supported by concrete design sections or residual-risk rationale | Pass | Credential split, registry ownership, exact source lifecycle, local operations, identifier availability, and removals implement it. | None |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | Ownership Is Clear? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `DS-001` | Credential entry | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| `DS-002` | Network-free snapshot | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| `DS-003` | Cold exact-source ensure | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| `DS-004` | Terminal cache hit | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| `DS-005` | Provider-local Reload | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| `DS-006` | Command result and observable contained work | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| `DS-007` | AutoByteus host fan-out | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| `DS-008` | Persisted dynamic construction | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| `DS-009` | Keyed frontend publication | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| `DS-010` | Host-setting server/client convergence | Pass | Pass | Pass | Pass | Pass | Pass | Pass |

`DS-010` supplies the previously missing return path: durable setting commit -> server full-source clear/detached exact ensure -> successful Server Settings client result -> direct non-awaited mapped Pinia clear-and-ensure -> guarded shared publication. It does not depend on API Keys being mounted or on the later settings-list reload succeeding.

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Credential configuration | Pass | Pass | Pass | Pass | Catalog neither derives configured state nor reads secrets. |
| `ProviderModelCatalogService` | Pass | Pass | Pass | Pass | One facade owns source mapping/lifecycle; registries own rows. |
| Source-owned registries | Pass | Pass | Pass | Pass | Prepare adapters cannot publish; commit is exact and synchronous. |
| `ModelAvailabilityService` | Pass | Pass | Pass | Pass | It invokes producer-owned parsers, verifies current provider/host identity, and ensures at most one source. |
| Pinia catalog store | Pass | Pass | Pass | Pass | Exact runtime/owner keys and request/epoch guards govern the post-save response too. |
| Server Settings client action | Pass | Pass | Pass | Pass | It owns the durable-result-dependent handoff and calls only the catalog store's narrow mapped convergence action. |
| Discovery endpoint identity | Pass | Pass | Pass | Pass | One SDK-owned full endpoint normalization governs adapter input, fingerprints, row provenance, membership, and availability. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Credential -> catalog notification | Pass | Pass | Pass | Pass | Server notification is post-durable and non-awaited; client credential action remains model-free. |
| Catalog -> lifecycle/adapters/registries | Pass | Pass | Pass | Pass | No aggregate row cache or direct adapter publication. |
| Execution -> availability -> catalog/factory | Pass | Pass | Pass | Pass | Server owns configured source mapping; SDK producers own identifier grammar. |
| UI -> Pinia -> GraphQL | Pass | Pass | Pass | Pass | API Keys composes success then independent model action; components do not own discovery policy. |
| Server Settings Pinia -> catalog Pinia | Pass | Pass | Pass | Pass | One-way exact-key coordination is allowed; reverse dependency, event bus, and global catalog action are forbidden. |
| Endpoint consumers -> SDK normalization | Pass | Pass | Pass | Pass | Server fingerprint/availability and adapters share full identity rather than `URL.host`. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `providerCredentialSettings(runtimeKind)` | Pass | Pass | Pass | Low | Pass |
| `providerModelCatalogSnapshots(runtimeKind)` | Pass | Pass | Pass | Low | Pass |
| `ensureProviderModelCatalog(providerId, runtimeKind)` | Pass | Pass | Pass | Low | Pass |
| `reloadProviderModelCatalog(providerId, runtimeKind)` | Pass | Pass | Pass | Low | Pass |
| `notifyCredentialRevision(providerId)` | Pass | Pass | Pass | Low | Pass |
| `notifySettingsChange(settingKey)` | Pass | Pass | Pass | Medium | Pass |
| `replaceSourceModels(sourceKey, rows)` | Pass | Pass | Pass | Low | Pass |
| `normalizeDiscoveryEndpointIdentity(endpoint)` | Pass | Pass | Pass | Low | Pass |
| `ensureModelAvailable(identifier, kind, runtimeKind)` | Pass | Pass | Pass | Medium | Pass |
| Producer-owned `parse*ModelIdentifier(identifier)` | Pass | Pass | Pass | Low | Pass |
| Pinia keyed snapshot/actions | Pass | Pass | Pass | Low | Pass |
| Pinia `convergeAfterDiscoverySettingCommit(runtime, mapping)` | Pass | Pass | Pass | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Credential authority | Pass | Pass | N/A | Pass | Reuses provider/secret owners. |
| Executable model rows | Pass | Pass | N/A | Pass | Extends existing factory registries. |
| Dynamic I/O | Pass | Pass | N/A | Pass | Existing adapters become prepare-only. |
| Source lifecycle | Pass | Pass | Pass | Pass | Small exact-source state replaces aggregate cache/FIFO. |
| Persisted-ID availability | Pass | Pass | Pass | Pass | Server-owned context plus SDK producer parsers is proportionate. |
| Client request publication | Pass | Pass | N/A | Pass | Existing Pinia authority and API Keys runtime are retained. |
| Host-setting client convergence | Pass | Pass | N/A | Pass | Extends the existing Server Settings action and catalog Pinia public action; no new bus/coordinator. |
| Full endpoint identity | Pass | Pass | Pass | Pass | A single SDK/model-discovery identity helper prevents duplicated authority-only policy. |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Provider configuration | Pass | Pass | Pass | Pass | Credential-only critical path. |
| Model catalog coordination | Pass | Pass | Pass | Pass | Lifecycle only, no duplicate rows. |
| SDK model runtime | Pass | Pass | Pass | Pass | Network-free static init and registry authority. |
| Dynamic adapters | Pass | Pass | Pass | Pass | Source preparation only. |
| Execution availability | Pass | Pass | Pass | Pass | Producer grammar and server mapping responsibilities are separated. |
| Web catalog state/UI | Pass | Pass | Pass | Pass | Exact credential and host-setting pulls publish without a global fetch or model-command wait. |
| Server Settings client state | Pass | Pass | Pass | Pass | Durable setting result owns the one-way mapped catalog handoff before ordinary list reload. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? | Shared File Choice Is Sound? | Ownership Of Shared Structure Is Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Source key/kind/status | Pass | Pass | Pass | Pass | Tight catalog-owned structure. |
| Provider descriptor/catalog mode | Pass | Pass | Pass | Pass | Credential-free identity is preserved. |
| Identifier build/parse contracts | Pass | Pass | Pass | Pass | Parsers are colocated with canonical producers; availability does not duplicate syntax. |
| Full discovery endpoint normalization | Pass | Pass | Pass | Pass | Shared by adapter/fingerprint/provenance/membership/availability consumers and carries no credentials. |
| Frontend snapshot/status types | Pass | Pass | Pass | Pass | Client projection only. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Risk Is Controlled? | Shared Core Vs Specialized Variant / Composition Decision Is Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `ProviderDescriptor` | Pass | Pass | Pass | Pass | Pass | No configured state or rows. |
| `ProviderCredentialSetting` | Pass | Pass | Pass | Pass | Pass | Sole aggregate configured Boolean. |
| `ModelDiscoverySourceKey` | Pass | Pass | Pass | Pass | Pass | Discovery owner remains distinct from actual provider. |
| `DynamicSourceRecord` | Pass | Pass | Pass | Pass | Pass | Lifecycle only; no duplicate `ModelInfo[]`. |
| `ProviderModelCatalogSnapshot` | Pass | Pass | Pass | Pass | Pass | Registry projection, not a second cache. |
| Pinia provider snapshot | Pass | Pass | Pass | Pass | Pass | Runtime/owner/request identity is explicit. |
| Provider presentation lattice | Pass | Pass | Pass | Pass | Pass | Derived from exact per-kind statuses; current partial and retained stale are not stored as overlapping authority. |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? | Responsibility Matches The Intended Owner/Boundary? | Responsibilities Were Re-Tightened After Shared-Structure Extraction? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `llm-providers/domain/models.ts` | Pass | Pass | Pass | Pass | Tight descriptor/credential/catalog types. |
| `model-catalog-service.ts` | Pass | Pass | Pass | Pass | Public facade only. |
| `dynamic-model-source-lifecycle.ts` | Pass | Pass | Pass | Pass | Exact lifecycle invariant. |
| `model-availability-service.ts` | Pass | Pass | Pass | Pass | Invokes producer parsers; owns only current source verification/ensure. |
| SDK identifier producer files | Pass | Pass | Pass | Pass | Unchanged builders plus matching exact parsers. |
| SDK discovery endpoint identity helper | Pass | Pass | Pass | Pass | Canonical full adapter-base identity only. |
| SDK factory/provider files | Pass | Pass | Pass | Pass | Registry versus preparation split is explicit. |
| Pinia/runtime command integration | Pass | Pass | Pass | Pass | Credential action stays singular; API Keys runtime owns the success-then-model composition. |
| `stores/serverSettings.ts` / exact setting map | Pass | Pass | Pass | Pass | Starts mapped convergence after durable success and before later list reload. |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? | Folder Matches Owning Boundary? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| SDK factory/provider/identity areas | Pass | Pass | Low | Pass | Existing model runtime/producer boundary. |
| Server catalog/lifecycle/availability services | Pass | Pass | Low | Pass | Separate files for separate invariants. |
| GraphQL provider types | Pass | Pass | Low | Pass | Thin transport. |
| Web store/runtime/components | Pass | Pass | Low | Pass | Existing client/UI boundary. |
| Obsolete video service/provider files | Pass | Pass | Low | Pass | Explicit deletion; static `VideoClientFactory` remains authoritative without a replacement wrapper. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? | Replacement Owner / Structure Is Clear? | Removal / Decommission Scope Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Coupled provider-settings model read | Pass | Pass | Pass | Pass | Clean credential/catalog split. |
| Global/static Reload | Pass | Pass | Pass | Pass | No alias or hidden fan-out. |
| Aggregate model-row cache | Pass | Pass | Pass | Pass | Registry is sole row owner. |
| Global registry FIFO | Pass | Pass | Pass | Pass | Same-source generation plus disjoint commit replaces it. |
| Eager Ollama/LM Studio/custom/AutoByteus discovery | Pass | Pass | Pass | Pass | First-demand exact source only. |
| Discovery-triggering legacy queries/actions | Pass | Pass | Pass | Pass | Generated artifacts and callers are included. |
| Dormant video reload/cache files | Pass | Pass | Pass | Pass | Delete `video-model-service.ts`, `cached-video-model-provider.ts`, tests/imports; no alias or targeted video reload. |
| Superseded provider domain types | Pass | Pass | Pass | Pass | Delete unused `LlmProviderWithModels` and `CustomProviderReloadStatus`. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| GraphQL/store/UI reload paths | No | Pass | Pass | Removed, not translated. |
| Aggregate cache/FIFO | No | Pass | Pass | Paused `IR-001` machinery must be removed rather than adapted as a second path. |
| Persisted identifiers | No | Pass | Pass | Existing identifiers remain authoritative; mistaken alternate grammar is rejected. |
| Video cached/reload wrappers and old provider shapes | No | Pass | Pass | `SR-007` names exact deletions with no replacement aliases. |

## Persisted-Data Transition Verdict

| Area / Stored Subject | Approved Decision | Representative Reader / Semantic / Invariant Evidence Is Sufficient? | Direct Use, Rebuild, Or Migration Choice Is Proportionate? | Migration Safety Is Complete If Required? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Credentials, server hosts, custom-provider records, saved model identifiers | `Not Affected` | Pass | Pass | N/A | Pass | Full endpoint comparison consumes existing host strings without rewriting them; existing canonical identifiers remain unchanged and authority-only ambiguity fails conservatively. Lifecycle/source index/client state is process memory only. No migration, rewrite, or compatibility path is required. |

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Credential/catalog cutover | Pass | Pass | Pass | Pass |
| Source registry/lifecycle cutover | Pass | Pass | Pass | Pass |
| Client command/catalog publication | Pass | Pass | Pass | Pass |
| Availability/persisted-ID cutover | Pass | Pass | Pass | Pass |
| Global/aggregate removal and paused-code realignment | Pass | Pass | Pass | Pass |
| `IR-003` host-convergence/freshness/cleanup correction | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? | Example Is Present And Clear? | Bad / Avoided Shape Is Explained When Helpful? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Static versus cold/warm dynamic provider | Yes | Pass | Pass | Pass | Static immediate, cold exact ensure, and warm no-network paths are explicit. |
| Same-source stale completion | Yes | Pass | Pass | Pass | Credential and host overlap examples are proportionate. |
| AutoByteus credential save UI convergence | Yes | Pass | Pass | Pass | C1/C2/C3 example reaches exact guarded Pinia publication and one adapter call per source. |
| Persisted custom provider construction | Yes | Pass | Pass | Pass | Exact canonical identifier survives delimiter-bearing model names and ensures one provider. |
| Same-authority endpoint change | Yes | Pass | Pass | Pass | Example clears the full server source and exact client provider before joining current discovery. |
| Mixed AutoByteus kind freshness | Yes | Pass | Pass | Pass | Lattice and example distinguish current partial rows from retained stale rows. |

## Material Premise Validation

### `PREM-AUTOBYTEUS-CLIENT-PUBLICATION-006` — AutoByteus post-save work must return to the mounted client snapshot

- Related approved requirement or established contract: `REQ-003`, `REQ-005`, `REQ-013`; `AC-003`, `AC-007`, `AC-015`; approved `UXJ-006`.
- Relevant behavior ID(s): `BEH-002`, `BEH-005`.
- Initiating basis kind: `User`.
- Independent product-supported initiating trigger or applicable governing contract: in **Settings -> API Keys**, select AutoByteus and save a valid API key while its model section is mounted.
- Support evidence: the existing form is an exposed product surface; the approved UI/UX requires credential success first and then localized AutoByteus refreshing/final state.
- Forward current or approved target production caller/event path that exercises the initiating basis and reaches the claimed state: API Keys form -> credential Pinia action -> GraphQL mutation -> durable server save -> synchronous generation/fingerprint change -> server invokes exact AutoByteus LLM/audio/image ensures -> credential response -> Pinia applies credential setting -> API Keys clears saving and shows success -> API Keys invokes non-awaited exact AutoByteus store ensure -> targeted GraphQL ensure joins/reads the server source attempts -> request-key/epoch-guarded AutoByteus snapshot publication.
- Lifecycle preconditions and material consequence at the claimed point: an old terminal AutoByteus snapshot may be retained in Pinia. The explicit post-save client action deliberately bypasses only that local READY short-circuit, while the server source single-flight prevents duplicate adapter requests and unrelated provider/runtime keys stay untouched.
- Reachability: `Reachable`.
- Review consequence / proportionate response: `SR-006` implements the required existing exact-provider pull path without coupling the credential promise or adding an event bus/polling mechanism. `DI-004` is resolved.

### `PREM-CUSTOM-IDENTIFIER-006` — Persisted custom model construction uses the canonical producer output

- Related approved requirement or established contract: `REQ-016`; `AC-021`; preserved provider/model identity and `Not Affected` persistence.
- Relevant behavior ID(s): `BEH-007`.
- Initiating basis kind: `User`.
- Independent product-supported initiating trigger or applicable governing contract: create/select a custom OpenAI-compatible model, persist that selection through the supported application configuration surface, restart the process, and launch with the saved model.
- Support evidence: custom-provider creation and persisted model selection/execution are supported product paths; current `buildOpenAICompatibleEndpointModelIdentifier()` emits `openai-compatible:<providerId>:<modelName>`.
- Forward current or approved target production caller/event path that exercises the initiating basis and reaches the claimed state: custom create's mandatory probe -> canonical builder creates row identifier -> user saves model selection -> process restart clears process rows/lifecycle but retains provider/selection -> agent execution -> availability service sees missing registry row -> producer-owned canonical parser returns exact provider/model suffix -> current-provider verification -> targeted provider ensure -> registry recheck -> factory construction.
- Lifecycle preconditions and material consequence at the claimed point: the registry is cold while the durable custom provider and exact identifier remain. Model names may contain `:`; split-once-after-prefix parsing must retain the full suffix or construction cannot find the original row.
- Reachability: `Reachable`.
- Review consequence / proportionate response: `SR-006` colocates exact parsers with the unchanged producers, adds round-trip/current-source coverage, and rejects the mistaken alternate grammar. No rewrite, compatibility path, or migration is introduced. `DI-005` is resolved.

### `CR-PREM-001` — A supported endpoint edit can change discovery identity without changing URL authority

- Related approved requirement or established contract: `REQ-017`, `REQ-018`; `AC-013`; approved `UXJ-007`.
- Relevant behavior ID(s): `BEH-008`.
- Initiating basis kind: `User`.
- Independent product-supported initiating trigger or applicable governing contract: in **Settings -> Server Settings**, edit the exposed protocol or path for an AutoByteus, Ollama, or LM Studio endpoint while retaining the same hostname/port, then save.
- Support evidence: `ServerSettingsEndpointCards.vue` exposes protocol, host, port, and path inputs and saves the three canonical discovery-setting keys through `serverSettings.updateServerSetting`.
- Forward current or approved target production caller/event path that exercises the initiating basis and reaches the claimed state: endpoint card -> Server Settings mutation -> durable `ServerSettingsService.updateSetting` -> typed catalog notification -> source generation advance/full-source row removal -> detached current-fingerprint ensure -> registry publication/availability lookup.
- Lifecycle preconditions and material consequence at the claimed point: the source already owns rows and the user changes scheme or path without changing authority. `IR-003` reduces configured membership to `URL.host`, so the old row remains executable while or after replacement discovery fails.
- Reachability: `Reachable`.
- Review consequence / proportionate response: `SR-007` defines one normalized full adapter endpoint identity for fingerprints, provenance, membership, and availability, and clears the complete affected source on commit. Existing host-only persisted identifiers remain unchanged and map only to a unique current full endpoint. The design response to `CODE-001` is complete; implementation and code re-review remain required.

### `CR-PREM-002` — A host-setting save can leave a previously READY shared Pinia catalog stale

- Related approved requirement or established contract: `REQ-017`; `AC-013`; approved `UXJ-007`; `DS-009` guarded publication.
- Relevant behavior ID(s): `BEH-008`.
- Initiating basis kind: `User`.
- Independent product-supported initiating trigger or applicable governing contract: visit **Settings -> API Keys**, then **Server Settings**, save a supported discovery endpoint change, and return to API Keys in the same session.
- Support evidence: the Settings surface switches between the API Keys and Server Settings components while Pinia survives unmount; the current settings action reloads only settings, and the current catalog read returns an existing local `READY` snapshot.
- Forward current or approved target production caller/event path that exercises the initiating basis and reaches the claimed state: API Keys populates Pinia -> section switch -> endpoint save -> server full-source invalidation/detached ensure -> confirmed setting mutation response -> Server Settings action directly invokes non-awaited mapped catalog convergence -> exact provider request token advance/row clear -> targeted non-forcing ensure -> epoch/provider/request-guarded publication while API Keys is unmounted -> return reads current shared state.
- Lifecycle preconditions and material consequence at the claimed point: Pinia already holds terminal rows. Without an explicit client return path, a normal warm read and selected-provider check both trust those rows and can display them indefinitely despite new server state.
- Reachability: `Reachable`.
- Review consequence / proportionate response: new `DS-010` completes the narrow return/event spine before the action's later settings-list reload, works even over prior `READY`, fences older client responses, and introduces no event bus/global fetch/model wait. `CODE-002` is resolved at design level; implementation and code re-review remain required.

### `CR-PREM-003` — AutoByteus can have current rows for one kind while a peer kind is cold unavailable

- Related approved requirement or established contract: `REQ-015`; `AC-007`, `AC-019`, `AC-020`; approved provider-local model-state contract.
- Relevant behavior ID(s): `BEH-006`.
- Initiating basis kind: `Contract`.
- Independent product-supported initiating trigger or applicable governing contract: the approved AutoByteus provider contract independently ensures LLM/audio/image sources and must summarize partial/total outcomes without losing per-kind freshness.
- Support evidence: selecting AutoByteus starts three exact source promises; one can return current rows while another has no prior rows and fails, a first-class approved partial/cold-failure combination.
- Forward current or approved target production caller/event path that exercises the initiating basis and reaches the claimed state: API Keys AutoByteus selection -> targeted ensure -> three source lifecycle outcomes -> provider snapshot with e.g. LLM `READY` rows plus audio/image `ERROR` -> Pinia -> provider presentation derivation -> model-section copy.
- Lifecycle preconditions and material consequence at the claimed point: visible rows are current, not retained from a failed refresh. `IR-003` labels the combination stale because it derives partial only from source `PARTIAL` and treats any error plus rows as stale.
- Reachability: `Reachable`.
- Review consequence / proportionate response: `SR-007` supplies an exact derived freshness lattice: current success plus any peer problem is provider partial; stale copy requires retained `STALE_ERROR` rows without a current successful payload. Per-kind DTOs remain authoritative and no duplicate provider status is stored. The design response to `CODE-003` is complete; implementation and code re-review remain required.

No additional material premise was introduced by the removal-only `CODE-004` response; its authority is the existing clean-cut decommission contract (`BEH-004`, `BEH-008`, `AC-022`).

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

`Pass` — `SR-007` completes the reachable host-setting return path and gives actionable bounded corrections for `CODE-001`, `CODE-003`, and `CODE-004` without widening the approved architecture. The paused implementation may be corrected and then must return through code review.

## Findings

None.

## Classification

N/A — no open finding.

## Recommended Recipient

`/implementation_engineer`

## Residual Risks

- A legitimate AutoByteus model-list request exceeding `30,000ms` fails that host attempt; inference/media deadlines remain unchanged.
- Clearing an explicitly changed discovery source temporarily removes otherwise unchanged peer-endpoint rows, but prevents ambiguous old-endpoint execution and touches no unrelated source.
- Dynamic snapshots intentionally disappear on process restart; no durable/offline cache is introduced.
- Host-only persisted identifiers cannot encode scheme/path; availability resolves them only to one unique current full endpoint and fails conservatively when zero/multiple candidates exist.
- Obsolete detached probes may consume resources until they settle but cannot publish current rows/status or delay settings/credential completion.
- Paused `IR-003` must implement `SR-007` and return through code review before API/E2E. Its earlier passing focused suites do not cover `CR-PREM-001`–`003`.
- Final tracked-base integration remains delivery-owned.
- Persisted data remains `Not Affected`; there is no migration, rewrite, durable cache, or compatibility path.

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate: `Pass`
- Notes: `SR-007` passes. `DS-010`, full endpoint identity, the provider freshness lattice, and the exact removal inventory close the design impact exposed by `CRR-001` while preserving the simpler source-local architecture. Implementation remains paused until corrected; API/E2E remains blocked until repeat code review passes.
