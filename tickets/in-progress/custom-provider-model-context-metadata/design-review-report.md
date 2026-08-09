# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/requirements.md`
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/investigation-notes.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/design-spec.md`
- Supplemental Task Artifacts Reviewed: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/qwen-native-provider-setup-ui-spec.md`; `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/custom-provider-readable-id-migration-spec.md`
- Solution Revision Record Reviewed: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/solution-revision-record.md`
- Relevant Solution Revision IDs: `SR-016` is the current user-approved material replacement for legacy custom-provider transition; `SR-010`–`SR-012` remain authoritative for unchanged exact-only custom metadata and native Qwen; `SR-013`–`SR-015` and `ARCH-REV-009` are historical evidence for the superseded secret-preserving transition
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-010`
- Current Review Round: `10`
- Trigger: Fresh cumulative review of the user-approved `SR-016` empty-V3 reset, selector transition, provider-absent interval, and ordinary recreation replacement
- Prior Review Round Reviewed: `ARCH-REV-009` (`Pass`, now superseded as implementation authority by the material product replacement)
- Latest Authoritative Round: `ARCH-REV-010`
- Current-State Evidence Basis: Ticket branch `codex/custom-provider-model-context-metadata` recorded at `f31f378d712b1b1f4e839a671104c410b51c6d06`; review covered the baseline and dirty current app-data runner/records/registry, V1 migration, token provider-name snapshot, current selector writers/readers, custom create/delete/key boundaries, model-factory activation failures, application agent/team editors, grouped selector behavior, and all cumulative solution artifacts. Dirty SR-015 source/tests and prior downstream reports are superseded evidence only and do not prove SR-016. Delivery retains tracked-base refresh ownership.

## SR-016 Scope Delta / Complexity Check

- **Added narrowly:** secretless V1 staging, transient legacy-name selector mapping, empty-V3-last reset, best-effort old-secret removal by identity only, a thin terminal status gate, and one application-agent missing-selector retention correction.
- **Removed:** provider/Base-URL preservation, credential transfer, secret resolution/re-encryption, migrated credential state, reconnect API/UI, journal/backups/receipt/phases, dedicated recovery/lock state, runner timestamp bypass, and crash-perfect coverage.
- **Preserved:** fixed migration prerequisites/final registry position, ordinary runner semantics, exact selector suffixes, V3-only runtime, historical exclusions, unchanged add-custom-provider flow, and all passed Qwen/custom-metadata behavior.
- **Incremental complexity verdict:** Materially simpler and proportionate. The remaining work directly preserves deterministic non-secret selection intent or enforces normal startup ordering; no transition mechanism exists solely to preserve re-enterable credentials or guarantee immediate crash convergence.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status (`Confirmed`/`Contradicted`/`Blocked`): `Confirmed`
- Approved requirements / intended behavior understood: `Confirmed`. New provider IDs remain readable/name-derived, while legacy records, Base URLs, and credentials are deliberately discarded. Only exact allowlisted non-secret selectors move to future readable prefixes; users recreate providers through the existing form.
- Relevant existing behavior and evidence confirmed: `Confirmed`. Current create already accepts/probes/saves `{name,baseUrl,apiKey}` and rolls back its record on secret-save failure. Missing selector strings survive in the reviewed config/binding/run paths and fail exact factory activation without fallback; `SearchableGroupedSelect` displays an absent raw value. `ApplicationAgentLaunchProfileEditor` is the verified clearing exception. The existing runner/order/old-ID token consumer and selector-writer evidence remains applicable.
- Approved change, preserved behavior, and outside scope understood: `Confirmed`. V1 becomes secretless V2 only to retain mapping; the final readable migration attempts exact rewrites, commits empty V3 last, never resolves an old key, accepts manually repairable skips as warnings, and relies on ordinary stale-run retry. No provider reconnect/credential record, runtime alias, historical rewrite, or custom recovery protocol remains.
- Remaining material ambiguity, if any: None. User re-entry, temporarily unavailable selectors, ordinary restart delay, manually repairable skipped selectors, and inaccessible orphan secrets are explicit approved outcomes.

| Behavior ID | Kind | Design Alignment With Approved Intent (`Pass`/`Fail`) | Approved Trigger / Contract And Current-State Evidence (`Pass`/`Fail`/`Unclear`) | Target Outcome / Path / Spine Coherence (`Pass`/`Fail`/`Unclear`) | Status (`Confirmed`/`Needs Correction`/`Unclear`) | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `BEH-001` | User/System | Pass | Pass | Pass | Confirmed | Preserve advertised custom metadata and discovery resilience. |
| `BEH-002` | System/Contract | Pass | Pass | Pass | Confirmed | Remove profiles/aliases and retain exact-value fallback only. |
| `BEH-003` | System/User | Pass | Pass | Pass | Confirmed | Preserve resolved metadata propagation and let only the existing token snapshot owner fill a missing historical provider name before reset. |
| `BEH-004` | User | Pass | Pass | Pass | Confirmed | Retain the reviewed Qwen pair command and compensation. |
| `BEH-005` | System | Pass | Pass | Pass | Confirmed | Retain configured/default native Qwen endpoint resolution. |
| `BEH-006` | User/System | Pass | Pass | Pass | Confirmed | Retain the four exact Qwen definitions and setup status. |
| `BEH-007` | User/Operational/Startup | Pass | Pass | Pass | Confirmed | Map exact selectors from valid legacy names, publish empty V3 last, keep unavailable values visible/failing explicitly, and restore usability only through ordinary same-name recreation or reselection. |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? (`Pass`/`Fail`) | Linked To Relevant Core Artifacts? (`Pass`/`Fail`) | Internally Complete? (`Pass`/`Fail`) | Consistent With Related Core Artifacts? (`Pass`/`Fail`) | Status And Approval Applicability Are Clear? (`Pass`/`Fail`) | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `qwen-native-provider-setup-ui-spec.md` | Pass | Pass | Pass | Pass | Pass | None; unchanged reviewed authority. |
| `custom-provider-readable-id-migration-spec.md` | Pass | Pass | Pass | Pass | Pass | None; SR-016 clearly owns reset, exact selector inventory, optimistic interruption, provider-absent behavior, recreation, removal, and coverage. |

## Task Design Health Assessment Verdict

| Assessment Area | Result (`Pass`/`Fail`) | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | The package distinguishes current readable identity, selector transition, deliberate provider/credential discard, and provider-absent UX. | None. |
| Root-cause classification is explicit and evidence-backed | Pass | UUID generation/split uniqueness, misplaced endpoint policy, and prior unnecessary secret/recovery coordination are grounded in current code and user tradeoff. | None. |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | Codec/V3/store/exact selector migration and one UI correction are required; reconnect, secret transfer, generalized identity/recovery, and immediate crash convergence are rejected. | None. |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | Spines, empty-V3-last sequence, exact target inventory, missing-model lifecycle, decommission plan, files, examples, and coverage support the simplified approach. | None. |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? (`Pass`/`Fail`) | Narrative Is Clear? (`Pass`/`Fail`) | Facade Vs Governing Owner Is Clear? (`Pass`/`Fail`/`N/A`) | Main Domain Subject Naming Is Clear? (`Pass`/`Fail`) | Ownership Is Clear? (`Pass`/`Fail`) | Off-Spine Concerns Stay Off Main Line? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `DS-001` | Qwen Settings pair save/status | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| `DS-002` | Qwen selection to provider request | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| `DS-003` | Generic custom metadata to compaction | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| `DS-004` | Catalog/token/setup projection | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| `DS-005` | Custom create/recreate to readable identity/catalog | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| `DS-006` | Required startup selector transition and empty-V3 reset | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| `DS-007` | Provider-absent selector display/failure/recreation | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| `LS-001` | Exact custom fallback | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| `LS-002` | One legacy mapping/managed selector attempt | Pass | Pass | N/A | Pass | Pass | Pass | Pass |

SR-016 makes the simplified transition readable end to end: existing migrations finish, exact selectors are attempted, empty V3 commits last, the ordinary runner records a terminal result, and the thin gate allows runtime. Provider absence is an explicit user journey rather than hidden fallback or credential-state machinery.

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? (`Pass`/`Fail`) | Internal Owned Mechanisms Stay Internal? (`Pass`/`Fail`) | Caller Bypass Risk Is Controlled? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Core identity codec / V3 store | Pass | Pass | Pass | Pass | Pure codec and store-atomic commit remain authoritative. |
| V1 secretless staging | Pass | Pass | Pass | Pass | Historical V1 owner atomically removes inline values into V2 without touching the vault. |
| `CustomProviderReadableIdAppDataMigration` | Pass | Pass | Pass | Pass | One definition owns fixed prerequisites, transient mapping, exact adapter attempts, empty-V3-last commit, and best-effort identity-only cleanup. |
| Migration-only name reader / prerequisite guard | Pass | Pass | Pass | Pass | V2 names and fixed terminal-status policy remain confined to migrations; readable identity stays final. |
| Thin readable terminal gate | Pass | Pass | Pass | Pass | Server runtime accepts only the ordinary terminal-success set and owns no retry, journal, receipt, or recovery inference. |
| Missing-selector UI/factory boundaries | Pass | Pass | Pass | Pass | Config owners retain raw values; exact model lookup remains the failure authority; only the verified clearing editor changes. |
| Qwen/AppConfig/custom metadata owners | Pass | Pass | Pass | Pass | Prior reviewed boundaries remain unchanged. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? (`Pass`/`Fail`) | Forbidden Shortcuts Are Explicit? (`Pass`/`Fail`) | Direction Is Coherent With Ownership? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Custom create/V3 runtime | Pass | Pass | Pass | Pass | Runtime has no migration/V2/alias dependency. |
| Migration to secret/selector stores | Pass | Pass | Pass | Pass | Selector adapters use exact atomic/transactional owners; secret service is removal-only and never exposes a value. |
| Ordinary runner to thin startup gate | Pass | Pass | Pass | Pass | Existing status semantics remain unchanged; server runtime neither retries nor interprets private state. |
| Migration registry/prerequisites | Pass | Pass | Pass | Pass | Existing relative order is retained; token snapshot uses the migration-only name projection; readable reset is final with fixed status proof. |
| Provider-absent config to model factory | Pass | Pass | Pass | Pass | Raw selectors persist across UI/config owners and exact factory failure prevents silent fallback. |
| Qwen and exact custom metadata | Pass | Pass | Pass | Pass | SR-016 introduces no dependency change. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? (`Pass`/`Fail`) | Responsibility Is Singular? (`Pass`/`Fail`) | Identity Shape Is Explicit? (`Pass`/`Fail`) | Generic Boundary Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- |
| `normalizeProviderName` / `buildCustomProviderId` | Pass | Pass | Pass | Low | Pass |
| `CustomLlmProviderStore.createProvider(...)` | Pass | Pass | Pass | Low | Pass |
| `createCustomProvider({name,baseUrl,apiKey})` | Pass | Pass | Pass | Low | Pass |
| `CustomProviderReadableIdAppDataMigration.execute()` | Pass | Pass | Pass | Low | Pass |
| `CustomProviderMigrationNameSnapshotReader.read()` | Pass | Pass | Pass | Low | Pass |
| `CustomProviderReadableIdPrerequisiteGuard.requireTerminalSuccess()` | Pass | Pass | Pass | Low | Pass |
| Post-`runPending` readable terminal-status gate | Pass | Pass | Pass | Low | Pass |
| Existing Qwen commands and exact metadata resolver | Pass | Pass | Pass | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? (`Pass`/`Fail`) | Reuse / Extension Decision Is Sound? (`Pass`/`Fail`) | New Support Piece Is Justified? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Identity/store/atomic files/SQLite/secret removal | Pass | Pass | N/A | Pass | Existing owners are reused; migration never resolves or transfers a credential. |
| Ordinary runner status/stale retry | Pass | Pass | N/A | Pass | User-approved optimistic behavior needs no runner extension. |
| Existing custom provider creation | Pass | Pass | N/A | Pass | The unchanged form/service already accepts the full replacement name/Base URL/key input and reloads models. |
| Existing migration registry/order | Pass | Pass | N/A | Pass | Existing relative order is preserved; the readable migration is appended last and a registry invariant checks every exact prerequisite. |
| Missing-model selection/presentation | Pass | Pass | N/A | Pass | Existing raw-value display and exact activation failure are reused; one clearing watcher is corrected. |
| Qwen and exact fallback | Pass | Pass | N/A | Pass | Prior reuse decisions remain valid. |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? (`Pass`/`Fail`) | Reuse / Extend / Create-New Decision Is Sound? (`Pass`/`Fail`) | Supports The Right Spine Owners? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Core identity / custom persistence | Pass | Pass | Pass | Pass | Current identity and store invariant are bounded. |
| Readable-ID reset/selector migration | Pass | Pass | Pass | Pass | Transient mapping, exact adapters, empty V3, and cleanup are bounded to one ordinary definition. |
| Generic runner | Pass | Pass | Pass | Pass | Unchanged ordinary stale/retry/status behavior; no new API. |
| Registry/startup lifecycle | Pass | Pass | Pass | Pass | Final definition plus thin terminal gate protects runtime without custom recovery. |
| Provider-absent UI/runtime | Pass | Pass | Pass | Pass | Config owners retain/display selections and factory/activation remains the exact failure boundary. |
| Qwen/config/metadata/UI | Pass | Pass | Pass | Pass | Prior allocations remain sound. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? (`Pass`/`Fail`) | Shared File Choice Is Sound? (`Pass`/`Fail`/`N/A`) | Ownership Of Shared Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Name normalization and ID derivation | Pass | Pass | Pass | Pass | One core owner prevents drift. |
| Composite custom model identity | Pass | N/A | Pass | Pass | Existing string contract remains sufficient. |
| Old/future selector prefix mapping | Pass | Pass | Pass | Pass | One migration-local type feeds every exact physical adapter and carries no endpoint or secret. |
| Prerequisite status and migration-only provider-name projection | Pass | Pass | Pass | Pass | Exact allowlists and `{id,name}` keep ordering proof and V2 knowledge migration-private. |
| Qwen URL/status and metadata source semantics | Pass | Pass | Pass | Pass | Unchanged reviewed owners remain valid. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Pass`/`Fail`) | Redundant Attributes Removed? (`Pass`/`Fail`) | Overlapping Representation Risk Is Controlled? (`Pass`/`Fail`) | Shared Core Vs Specialized Variant / Composition Decision Is Sound? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| V3 custom-provider record | Pass | Pass | Pass | Pass | Pass | Same four fields and exact ID-from-name invariant. |
| Composite model identifier | Pass | Pass | Pass | Pass | Pass | Provider component changes; exact value does not. |
| Transient migration mapping | Pass | Pass | Pass | Pass | Pass | Old/future IDs and prefixes exist only for the current attempt; no alias, receipt, endpoint, or secret representation remains. |
| Prerequisite result / name snapshot projection | Pass | Pass | Pass | Pass | Pass | Only allowlisted ID/status pairs and `{id,name}` cross their respective migration-local boundaries. |
| Qwen/setup/model/source structures | Pass | Pass | Pass | Pass | Pass | No generalized attributes. |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? (`Pass`/`Fail`) | Responsibility Matches The Intended Owner/Boundary? (`Pass`/`Fail`) | Responsibilities Were Re-Tightened After Shared-Structure Extraction? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Core identity/config and custom store/service | Pass | Pass | Pass | Pass | Codec, V3 schema, store authority, and service feedback are separated. |
| `custom-provider-v1-app-data-migration.ts` | Pass | Pass | Pass | Pass | Historical-ID owner stages V1 without vault interaction and removes inline secret bytes. |
| `custom-provider-readable-id-app-data-migration.ts` | Pass | Pass | Pass | Pass | Optimistic transition sequencer; no private recovery/state responsibility. |
| JSON/SQLite selector migrators | Pass | Pass | Pass | Pass | Exact allowlisted transformations remain separated by physical atomicity owner. |
| `custom-provider-migration-name-snapshot-reader.ts` / prerequisite guard | Pass | Pass | Pass | Pass | Migration-only historical projection and exact status policy remain outside the V3 store/runtime. |
| `app-data-migration-registry.ts` / `server-runtime.ts` | Pass | Pass | Pass | Pass | Registry appends readable last; runtime performs only the terminal ordinary-status gate. |
| `ApplicationAgentLaunchProfileEditor.vue` | Pass | Pass | Pass | Pass | Retains raw unavailable value and reports not-ready instead of silently clearing. |
| Prior Qwen/metadata/UI files | Pass | Pass | Pass | Pass | Responsibilities remain bounded. |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? (`Pass`/`Fail`) | Folder Matches Owning Boundary? (`Pass`/`Fail`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Core identity and custom-provider store/service | Pass | Pass | Low | Pass | Existing owners. |
| Readable-ID migration sequencer/name guard/adapters | Pass | Pass | Medium | Pass | Small named files correspond to transition coordination, historical projection, ordering, and physical stores; recovery files are removed. |
| Generic runner and server startup | Pass | Pass | Low | Pass | Runner remains unchanged; startup adds one terminal gate. |
| Application setup missing-selector correction | Pass | Pass | Low | Pass | Existing editor is the verified clearing owner. |
| Qwen/metadata/UI placement | Pass | Pass | Low | Pass | Unchanged from ARCH-REV-006. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? (`Pass`/`Fail`) | Replacement Owner / Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Removal / Decommission Scope Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Random UUID creation / normal V2 reader / UUID alias | Pass | Pass | Pass | Pass | Codec plus empty-V3 reset/exact selector mapping replace them cleanly. |
| Secret migrator, journal, backups, receipt, recovery coordinator, runner bypass | Pass | Pass | Pass | Pass | Explicitly deleted with their state/crash-specific tests; ordinary recreation and runner status replace them. |
| Endpoint profiles/aliases / preview Qwen | Pass | Pass | Pass | Pass | Prior removals remain explicit. |
| Generalized provider/offering/recovery schema | Pass | N/A | Pass | Pass | Explicitly rejected. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? (`Yes`/`No`) | Clean-Cut Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- |
| V1/V2 custom-provider records / UUID model aliases | No | Pass | Pass | Legacy names exist only transiently in migrations; empty V3 and exact selector rewrite create a clean cut. |
| Legacy custom credentials | No | Pass | Pass | Values are discarded/re-entered; no lookup, copy, reconnect state, or compatibility path remains. |
| Custom endpoint profiles / preview Qwen | No | Pass | Pass | No compatibility path. |
| Existing key-only Qwen install | No | Pass | Pass | Direct current-data use via absent setting. |

## Persisted-Data Transition Verdict (When Applicable)

| Area / Stored Subject | Approved Decision | Representative Reader / Semantic / Invariant Evidence Is Sufficient? (`Pass`/`Fail`) | Direct Use, Rebuild, Or Migration Choice Is Proportionate? (`Pass`/`Fail`) | Migration Safety Is Complete If Required? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Qwen secret and optional `.env` URL | `Directly Usable — No Migration` | Pass | Pass | N/A | Pass | Existing key remains valid; absent URL preserves default. |
| Legacy provider records and Base URLs | `Discard / Recreate` | Pass | Pass | N/A | Pass | Valid names are transient mapping input only; empty V3 is the explicit commit outcome. |
| V1 inline and V2 vault custom secrets | `Discard / User Re-entry` | Pass | Pass | N/A | Pass | V1 stages without vault writes; V2 values are never resolved/copied; post-V3 deletion is best-effort and recreation uses the existing form. |
| Exact active/default/resumable selectors | `Migration Required` | Pass | Pass | Pass | Pass | Fixed prerequisites, exact allowlist/suffix preservation, per-store atomicity, idempotent pre-V3 retry, empty-V3-last commit, and thin terminal gate are complete. |
| Raw/work traces, token usage identity, free text, model-free indexes | `Directly Usable — No Rewrite` | Pass | Pass | N/A | Pass | Historical identity remains untouched; existing provider-name snapshot backfill runs while old IDs remain resolvable. |

## Change / Refactor Safety Verdict

| Area | Sequence Is Realistic? (`Pass`/`Fail`) | Temporary Seams Are Explicit? (`Pass`/`Fail`) | Cleanup / Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- |
| Exact custom metadata and native Qwen | Pass | Pass | Pass | Pass |
| New custom-provider creation/V3 invariant | Pass | Pass | Pass | Pass |
| Secretless V1 and optimistic empty-V3 reset | Pass | Pass | Pass | Pass |
| Exact selector migration / ordinary interruption retry | Pass | Pass | Pass | Pass |
| Migration registry/prerequisite/terminal gate | Pass | Pass | Pass | Pass |
| Provider-absent UI/runtime and ordinary recreation | Pass | Pass | Pass | Pass |
| Downstream revalidation after superseded evidence | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? (`Yes`/`No`) | Example Is Present And Clear? (`Pass`/`Fail`/`N/A`) | Bad / Avoided Shape Is Explained When Helpful? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Readable IDs/collisions and exact wire value | Yes | Pass | Pass | Pass | Identity examples remain clear. |
| Exact selector mapping and empty-V3 reset | Yes | Pass | Pass | Pass | Valid/invalid legacy data, suffix preservation, warning skips, V3 publication failure, and ordinary stale retry are explicit. |
| Provider-absent interval and recreation | Yes | Pass | Pass | Pass | Raw unavailable selector, same-name exact restoration, different-name/missing-suffix reselection, and no fallback are explicit. |
| Direct upgrade with other pending migrations | Yes | Pass | Pass | Pass | AC-019 covers provider-name snapshot, existing selector writers, empty V3, token-history preservation, and same-name recreation through the unchanged form. |
| Qwen save/status and exact fallback | Yes | Pass | Pass | Pass | Prior examples remain valid. |

## Material Premise Validation (Only When Needed)

### `PREM-CPMIG-003` — A supported direct upgrade needs old-ID token snapshot recovery before reset

- Related approved requirement or established contract: `BEH-003`, `BEH-007`, `REQ-004`, `REQ-014`; existing required token-usage provider-name snapshot backfill.
- Relevant behavior ID(s): `BEH-003`, `BEH-007`.
- Initiating basis kind: `System`
- Independent product-supported initiating trigger or applicable governing contract: Server startup on an existing installation whose V1/V2 custom providers and legacy token rows make multiple required app-data migrations pending in one upgrade. Running all pending required migrations is the current startup contract.
- Support evidence: Current registry/backfill behavior parses the UUID from historical `model_identifier` and resolves its name from the custom-provider map (`app-data-migration-registry.ts:23-47`; `token-usage-provider-name-snapshot-backfill-migration.ts:38-65,339-357`). SR-016 retains the migration-only missing/V2/V3 `{id,name}` projection, makes the token backfill a fixed prerequisite, and publishes empty V3 only afterward (`custom-provider-readable-id-migration-spec.md:152-168,213-236`).
- Forward current or approved target production caller/event path that exercises the initiating basis and reaches the claimed state: `server startup -> V1 stages secretless V2 if needed -> token provider-name backfill reads UUID/name through migration-only projection and fills a missing snapshot -> remaining current definitions finish -> final readable reset proves prerequisite status -> empty V3 publication removes the current provider map while historical token identifier/name remain unchanged`.
- Lifecycle preconditions and material consequence at the claimed point: The token row and old provider-name map coexist only before reset. Ordering retains recoverable historical display information without copying credentials, rewriting token identity, or retaining a runtime V2 reader.
- Reachability: `Reachable`
- Review consequence / proportionate response: `Resolved by SR-016`; the exact prerequisite and two-field migration projection remain necessary and sufficient despite removal of the secret/recovery protocol.

### `PREM-CPMIG-004` — Current selector writers can overwrite transition targets if readable reset runs first

- Related approved requirement or established contract: `REQ-014`, `AC-018`; existing required app-data migrations over run/team/binding metadata.
- Relevant behavior ID(s): `BEH-007`.
- Initiating basis kind: `System`
- Independent product-supported initiating trigger or applicable governing contract: A supported direct upgrade can make the readable transition and existing run/team/binding cleanup migrations pending together. Current `runPending` continues across definitions rather than creating an implicit exclusive transaction.
- Support evidence: Current runner continuation and `RemoveGlobalSkillDiscoveryModeMigration` writes to `run_metadata.json`, `team_run_metadata.json`, and `bindings.json` (`app-data-migration-runner.ts:71-90`; `remove-global-skill-discovery-mode-migration.ts:14-18,153-176`). SR-016 preserves current relative order, checks the exact target writers as prerequisites, and registers readable reset last (`custom-provider-readable-id-migration-spec.md:152-168,286-298`).
- Forward current or approved target production caller/event path that exercises the initiating basis and reaches the claimed state: `server startup -> current selector writers complete in retained order -> final readable definition proves their terminal records -> exact selector attempts -> empty V3 publication -> ordinary runner terminal record -> thin status gate -> runtime/listen`.
- Lifecycle preconditions and material consequence at the claimed point: Current cleanup writes cannot overwrite newly mapped selectors after reset. A non-terminal prerequisite causes no readable mutation, and a registry test rejects a current definition appended after the reset.
- Reachability: `Reachable`
- Review consequence / proportionate response: `Resolved by SR-016`; fixed prerequisite proof and final placement remain proportionate, while the obsolete coordinator/journal machinery is removed.

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

`Pass`: SR-016 is a coherent, implementation-ready replacement. It migrates only deterministic structured selector intent, commits empty V3 last, discards credentials and provider records by approved policy, reuses ordinary recreation and missing-model behavior, and removes the crash-perfect protocol. Exact prerequisites, atomic per-target writes, ordinary retry, terminal startup gating, explicit unavailable UX, and proportional coverage are sufficient for the approved optimistic contract.

## Findings

None.

## Classification

`N/A — Pass`

## Recommended Recipient

`implementation_engineer`

## Residual Risks

- Same-name recreation restores migrated selectors only when the canonical name and advertised exact model suffix still match; otherwise the user must reselect.
- Non-derivable/colliding legacy data and malformed/read-only/concurrently changed selector targets intentionally reset or remain stale with sanitized warnings rather than receiving guessed mappings.
- Process interruption may block startup through the ordinary fifteen-minute recent-`RUNNING` window; immediate recovery is explicitly not promised.
- Best-effort old UUID secret deletion may leave unreachable orphan ciphertext; normal V3 lookup has no alias or fallback to it.
- Vendor model facts remain source/date-sensitive and do not justify aliases or producer/offering attributes.
- Dirty SR-015 source/tests must be removed or simplified rather than adapted implicitly. The branch is behind its tracked base, and all downstream evidence predating SR-016 is superseded for the readable-identity scope. Full implementation, review, coverage, docs, integration, and build stages must repeat; delivery retains refresh/integration ownership.

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate (`Pass`/`Fail`/`Blocked`): `Pass`
- Notes: `ARCH-REV-010` freshly passes the user-approved SR-016 material replacement. `ARCH-DESIGN-006` is obsolete because immediate crash recovery was removed; `ARCH-DESIGN-007` remains resolved through retained exact prerequisites/final placement; `ARCH-DESIGN-001`–`ARCH-DESIGN-005` remain resolved/obsolete. Route the cumulative package to implementation; reconcile and remove superseded SR-015 machinery, and repeat all downstream validation.
