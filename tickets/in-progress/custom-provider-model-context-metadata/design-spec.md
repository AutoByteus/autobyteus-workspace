# Design Spec

## Current-State Read

The ticket has four related paths on the current DR-009 v1.4.46 branch:

1. **Custom metadata:** `Settings -> GraphQL -> LlmProviderService -> saved custom provider/key -> GET /models -> strict row normalization -> custom metadata resolver -> LLMModel -> LLMFactory -> server catalog -> token budget/compaction/meter`. SR-016's advertised/exact-only behavior is implemented; Alibaba profiles/aliases are removed.
2. **Native Qwen routing:** `supported definition -> LLMFactory -> QwenLLM -> OpenAI-compatible client`. User-configured Base URL/key, server-owned endpoint source, four exact Qwen offerings, collision-safe `modelIdentifierOverride`, and exact `model.value` request behavior are implemented and covered.
3. **Custom identity:** New providers use name-derived readable V3 identity; legacy provider reset/selector migration and provider-absent handling are implemented. `ARCH-REV-010` passed this contract and current downstream evidence remains authoritative for it.
4. **Qwen presentation:** `Qwen definition -> GraphQL ModelInfo -> getModelSelectionOptionLabel -> Settings card/grouped option/selected label`. Live rows already expose distinct `name`, `modelIdentifier`, `value`, and `providerType`. The helper special-cases custom OpenAI-compatible friendly names, then uses `modelIdentifier` for other default-AutoByteus models. API-REV-009 therefore reproduces visible `qwen:...` prefixes even though Qwen friendly names exist. The selected option ID and outbound request remain correct.

The current presentation owner is healthy: Settings provider cards, shared runtime-scoped agent/team/application/member selectors, channel binding launch selectors, and media defaults already call the same helper. Missing/current choices without a live catalog row are synthesized by their caller as raw identifiers and must remain exact. The unused legacy `components/agentInput/GroupedSelect.vue` has no active source consumer and is not a reason to broaden this change.

No core/server/catalog/GraphQL/persistence change is needed for SR-017. `providerType=QWEN` is already available at the shared helper boundary, Qwen definitions already carry the intended names, and OpenAI-compatible request construction already sends `this.model.value`.

The current worktree contains API-REV-009/DR-009 report and probe edits that are downstream-owned evidence. The solution designer changes only authoritative solution artifacts. Production/test edits for SR-017 begin only after fresh architecture review.

## Intended Change

The implemented SR-016 design remains unchanged:

1. Preserve strict provider-advertised metadata as highest priority per field.
2. Simplify custom fallback to exact, case-sensitive built-in `value` lookup only; unknown/near-match values remain unknown.
3. Remove all custom-provider endpoint profiles, Alibaba URL/region/plan logic, and aliases.
4. Let the user configure native Qwen with a Base URL and API key; use the saved URL dynamically and retain the historical URL only as an absent-setting default.
5. Save the Qwen pair through one probe plus bounded key compensation and a strict durable URL write; expose server-owned default/configured status.
6. Native Qwen owns exact values `qwen3.8-max`, `deepseek-v4-pro`, `deepseek-v4-flash-0731`, and `glm-5.2`; remove `qwen3.8-max-preview` and preserve exact wire values.
7. Derive new custom provider IDs from the normalized user-entered name and enforce custom name/ID uniqueness inside the store commit. Add no provider attribute or frontend ID field.
8. Keep custom model identity `openai-compatible:<derived-provider-id>:<exact-model-value>`; do not introduce a structured registry refactor.
9. Use valid unique legacy names only to derive old-to-future selector prefixes, rewrite exact allowlisted active/default/resumable selectors, and atomically publish an empty V3 provider list last.
10. Do not preserve a legacy provider record, Base URL, or credential value. Never resolve, copy, or re-encrypt an old secret; old UUID secret removal after empty V3 is best-effort only.
11. Reuse the unchanged add-custom-provider flow for re-entry of name, Base URL, and key. The same canonical name recreates the same readable ID. Do not add reconnect service/UI branches or a credential-state attribute.
12. Keep unavailable selectors stored and visible with no fallback. Launch, external dispatch, and resume fail through existing missing-model/activation paths until recreation or reselection.
13. Retain only required migration ordering and gating: five exact prerequisites, readable migration last, empty-V3-last publication, ordinary runner retry semantics, and one terminal status gate before runtime/listen.
14. Remove the private journal, backups, receipt, secret migrator, recovery coordinator, special runner method, and crash-perfect fault matrix.
15. Extend the existing shared model-selection label policy: for a live row with `providerType === 'QWEN'` and a nonblank `name`, return the trimmed name before applying the generic default-AutoByteus identifier rule.
16. Apply that one policy through every existing helper consumer rather than adding a Settings-only branch. Settings cards, grouped runtime/binding options, and selected labels then remain consistent.
17. Keep option IDs, persisted values, GraphQL `modelIdentifier`, factory lookup, and diagnostics on the exact collision-safe selector. Keep provider requests on exact `model.value`. A missing selector without a live row continues to render raw through its existing unavailable/current-value path.

### Minimal Representation Constraint

The design adds only:

- optional non-secret `QWEN_BASE_URL`;
- Qwen command input `{baseUrl, apiKey}`;
- Qwen status `{effectiveBaseUrl, endpointSource, apiKeyConfigured}`;
- one pure custom name/ID codec;
- provider file version 3 with the same record attributes as V2 but a stronger invariant.

It does not add provider producer/origin/offering/deployment/route/region/plan/revision/alias fields, credential state fields, frontend-supplied IDs, per-model serving overrides, runtime UUID aliases, or migration transaction/recovery schemas.

SR-017 adds no data field at all. Existing `ModelInfo.name`, `providerType`, `modelIdentifier`, and `value` retain one meaning each: presentation, provider classification, selection/routing identity, and wire identity.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Approved Requirement / Intent And Acceptance-Criteria IDs | Approved Trigger Or Governing Contract | Relevant Existing Behavior And Evidence Reference | Approved Change Or Preserved Outcome | Target Production Path / Lifecycle And Spine ID(s) |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User/System | REQ-001, REQ-008; AC-001, AC-002 | Custom provider probe/reload returns model rows | Current discovery normalizes strict optional positive integers; retained coverage passes | Preserve advertised metadata and resilience | DS-003, LS-001 |
| BEH-002 | System/Contract | REQ-002, REQ-003; AC-003, AC-004 | One or more discovered limit fields are absent | Current resolver is advertised/exact-only; profiles/aliases are removed | Preserve exact built-in `value` fallback only | DS-003, LS-001 |
| BEH-003 | System/User | REQ-004, REQ-009; AC-005, AC-006 | Runtime consumes known/unknown capacity | Current canonical fields feed budget/compaction/meter with reduced source union | Preserve propagation | DS-003, DS-004 |
| BEH-004 | User | REQ-005, REQ-008, REQ-011; AC-007, AC-012, AC-013 | User submits Qwen Base URL/key in Settings | Current Qwen command implements probe, key-first mutation, strict URL durability, and bounded compensation | Preserve pair contract | DS-001 |
| BEH-005 | User/System | REQ-006; AC-008, AC-011 | Qwen runtime instance is constructed | Current adapter resolves configured URL or historical absent-setting default | Preserve effective route resolution | DS-002 |
| BEH-006 | User/System | REQ-007, REQ-010, REQ-012; AC-009–AC-011, AC-014 | Qwen catalog/status is queried or a Qwen model is selected | Current branch exposes four exact offerings and Qwen-only status; API-REV-009 confirms identity triples | Preserve catalog/status/routing; presentation changes only through BEH-008 | DS-001, DS-002, DS-004 |
| BEH-007 | User/Operational | REQ-013–REQ-015; AC-015–AC-019 | Create custom provider; startup resets V1/V2; user opens/launches/resumes saved selector; user recreates | ARCH-REV-010 and downstream evidence confirm readable V3 creation, selector reset/mapping, ordinary recreation, and retained missing selections | Preserve SR-016 unchanged | DS-005–DS-007, LS-002 |
| BEH-008 | User | REQ-007, REQ-016; AC-010, AC-020, AC-021 | User opens Settings/Qwen or a live AutoByteus model selector and sees a Qwen-served duplicate | API-REV-009: live GraphQL returns distinct selector/name/value; real Chrome shows selector because shared helper's generic AutoByteus branch wins | Use existing friendly Qwen name across shared live-catalog presentation; retain internal selector and exact wire value | DS-002, DS-008 |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related Requirement / Acceptance-Criteria IDs | Relationship To This Design | Status / Approval Applicability |
| --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/qwen-native-provider-setup-ui-spec.md` | Qwen connection journey, default/configured states, errors, accessibility, and friendly live-catalog presentation | REQ-005–REQ-008, REQ-010–REQ-012, REQ-016; AC-007–AC-014, AC-020, AC-021 | Observable contract for DS-001 and DS-008 | Refined for SR-017; hands-on label intent established; architecture review pending |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/custom-provider-model-context-metadata/tickets/in-progress/custom-provider-model-context-metadata/custom-provider-readable-id-migration-spec.md` | Name/ID codec, legacy reset/selector transition, exact order, provider-absent interval, recreation | REQ-013–REQ-015; AC-015–AC-019 | Detailed contract for DS-005–DS-007 and LS-002 | SR-016 authority passed by ARCH-REV-010; no SR-017 change |

## Task Design Health Assessment (Mandatory)

- Change posture: cumulative `Behavior Change / Refactor`; SR-017 delta `Presentation Behavior Change`
- Current design issue found: `Yes`
- Root cause classification: cumulative findings remain as recorded; SR-017 is `Missing Invariant`.
- Refactor needed now: `No` for SR-017; previous structural work is already implemented.
- Evidence: The live API shape is tight and routing is correct. One shared helper already owns option and selected labels for the identified active surfaces. Its current generic AutoByteus branch simply lacks the rule that Qwen's collision key is internal when a friendly catalog name exists.
- Design response: Extend the shared helper with one Qwen/nonblank-name condition and its focused regression coverage. Do not branch in components or create a generalized provider presentation schema.
- Refactor rationale: The current owner, boundary, file placement, and `ModelInfo` fields are correct for this scope. A local shared-policy change fixes every active consumer and preserves dependency direction.
- Intentional deferrals and residual risk: Provider rename/Base-URL edit, multiple simultaneous Qwen endpoints, dynamic native model discovery, and a global `{providerId,value}` registry refactor remain out of scope. Missing selectors remain strings and can require manual reselection when an offering disappears.

## Terminology

- **Exact built-in fallback:** Per-field metadata inference from definitions whose `value` exactly equals the discovered model ID.
- **Qwen connection:** One effective native Qwen Base URL plus the Qwen API-key secret for an installation.
- **Endpoint source:** `DEFAULT` when no non-empty `QWEN_BASE_URL` is saved; `CONFIGURED` otherwise, even if the saved string equals the default.
- **Canonical custom-provider name:** NFKC, trimmed, internal Unicode whitespace collapsed to one space, lowercase form used for uniqueness.
- **Readable provider ID:** Immutable `provider_<name-derived-body>` generated without randomness/hash/counter suffixes.
- **Managed selector:** An exact allowlisted structured `llmModelIdentifier` used by current/default launch or supported resume.
- **Provider-absent interval:** Period after empty-V3 publication and before the user recreates a provider; migrated selectors can reference the future readable ID while no record/model exists.
- **Empty-V3 publication:** Atomic replacement of `custom-llm-providers.json` with version 3 and `providers: []`; the reset commit point.
- **Optimistic transition:** Bounded idempotent rewrites using existing migration status/retry, without private rollback/recovery state or immediate crash convergence.
- **Internal Qwen selector:** Collision-safe `modelIdentifier` such as `qwen:deepseek-v4-pro`, used by option identity, persistence, and `LLMFactory`, not as the live friendly label.
- **Friendly Qwen label:** Trimmed nonblank Qwen catalog `name`, used only for live catalog-backed option/card/selected-value presentation.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Remove Alibaba endpoint profiles, URL canonicalization/plan matching, model aliases/references, and the `endpoint_profile` metadata source.
- Remove `qwen3.8-max-preview`; do not alias it to `qwen3.8-max`.
- Remove UUID generation for new providers; do not grandfather UUID IDs in current V3.
- Remove all SR-015 private migration state, backups, receipt, secret transfer, startup recovery, and runner bypass.
- Keep V1/V2 readers only inside app-data migration sources/tests. Normal store/runtime is V3-only.
- Preserve absent Qwen URL as default-setting semantics, not as a legacy runtime branch.
- Remove the shared helper's exposure of a live Qwen internal selector as its user-facing label. Do not remove or rename the selector itself.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- Stored subject, location, representative shape, and approximate volume:
  - Qwen key in secret vault; optional `.env` setting is new.
  - `llm/custom-llm-providers.json`: small V1/V2 provider array.
  - Old custom key entries keyed by UUID provider ID.
  - Structured selector fields in agent/team configs, external bindings, application SQLite rows, run/team metadata, and improver sessions.
  - Historical traces/token rows/model-free history indexes, potentially much larger.
- Relevant code-model/semantic change: New custom identity becomes deterministic name-derived V3; legacy provider records reset to empty while active selectors move to future readable prefixes.
- Normal reader/writer behavior and evidence: Target provider store parses V3 only. Structured config readers retain arbitrary nonempty model strings and factory validates at use. Existing custom creation recreates a record/secret/models from user input.
- Required semantics and invariants under direct use: V2 UUID selectors cannot directly select a V3 readable provider. Historical token/trace identity remains truthful and must not be rewritten.
- Physical-store/privacy/operational constraints: V1 inline secret must leave the provider file. Migration cannot log/serialize secret or endpoint contents. JSON publication must be atomic; application database updates use per-database transactions.
- Decision: `Migration Required` only for exact active/default/resumable selectors; `Discard or Rebuild` by ordinary frontend recreation for legacy provider records, Base URLs, and credentials; `Directly Usable — No Migration` for Qwen key-only installs and historical traces/token/index data.
- Decision rationale: Selector mapping is deterministic and preserves meaningful choices. Provider/Base-URL/secret preservation would require extra migration/reconnect behavior the user does not value. Empty V3 plus existing creation is simpler. Historical rewrites provide no runtime benefit. Optimistic partial selector skips are acceptable because missing selectors remain visible/actionable.
- Acceptance criteria/design constraints: REQ-010, REQ-013–REQ-016; AC-011, AC-015–AC-021. SR-017 has no persisted-data transition.

### Migration Plan (Only When Decision Is `Migration Required`)

- Current canonical schema/version: Custom provider file V3; records `{id,name,providerType,baseUrl}` with `id === buildCustomProviderId(name)`.
- Older versions: V1 inline-secret file; V2 non-secret provider file plus optional UUID vault entries.
- Why direct use/discard are insufficient: UUID selectors cannot address future readable providers, so exact structured selectors require mapping. Provider records/Base URLs/credentials are disposable because the user accepts ordinary recreation.
- Trigger: Required startup app-data migrations.
- Migration owner: `CustomProviderV1AppDataMigration` for V1 secretless staging; `CustomProviderReadableIdAppDataMigration` for selector mapping plus empty-V3 reset.
- Normal business/runtime path: V3-only store and derived IDs; no UUID alias/reader.
- Historical decoders: Confined to app-data migration files.
- Completion marker: Existing migration runner terminal status. No journal/receipt/private completion marker.
- Restart safety/idempotency: Exact old prefix rewrites accept already-new/unrelated values; V3 entry is no-op after validation. An interrupted `RUNNING` retries only under ordinary stale-run policy.
- Validation before runtime: Exact prerequisite guard before writes; atomic empty-V3 publication last; after ordinary `runPending`, terminal readable status gate before provider/runtime/bootstrap/listen.
- Backup/rollback/operator recovery: No custom backup/rollback protocol. Provider-file publication failure retains V2 and blocks startup; individual selector failures warn and remain manually repairable; old-secret deletion failure leaves unreachable orphan.
- Concurrent access: Startup migration runs before runtime/listen and uses existing file/database atomicity. No supported concurrent old/new application process is introduced.
- Historical migration retention: Keep historical V1 migration ID for installed ledger compatibility, but direct V1 behavior is secretless. Keep readable migration as final current required definition.

| Migration Step | Source Shape / Version | Target Shape / Version | Transformation Owner | Validation | Failure / Recovery Behavior |
| --- | --- | --- | --- | --- | --- |
| 1. V1 staging | Valid V1 with inline key | Secretless V2 | `CustomProviderV1AppDataMigration` | Strict V2 parse; inline field absent | Atomic publish failure fails; no vault write; warning requires key re-entry |
| 2. Prerequisites | Migration result ledger | Five terminal successes | `CustomProviderReadableIdPrerequisiteGuard` | Exact IDs are `SUCCEEDED` or `SUCCEEDED_WITH_WARNINGS` | Incomplete status causes no readable write and later startup gate blocks |
| 3. Mapping | Valid V2 provider records | In-memory old ID -> future derived ID; no target records | Readable migration + core codec | Names derive uniquely | Invalid/colliding set has no selector map and continues to empty V3 with warning |
| 4. Selector attempts | Exact allowlisted old prefixes | Exact future readable prefixes; suffix unchanged | JSON/SQLite selector adapters | Re-read/transaction success per target | Individual failure warning; stale selector remains visible/unavailable |
| 5. Reset commit | Any classified legacy state | Atomic empty V3 provider file | Readable migration | Strict `{version:3,providers:[]}` parse | Publication failure is fatal; V2 remains; startup blocked |
| 6. Cleanup | Optional old UUID secret entries | Entry absent if deletion succeeds | Readable migration via secret service remove | Removal result only; never resolve value | Best-effort warning; empty V3 remains; orphan is unreachable |
| 7. Runtime gate | Runner status | Startup allowed/blocked | `server-runtime` thin status gate | Exact terminal success set | Missing/NOT_RUN/RUNNING/FAILED blocks; no special rerun |

#### Exact Migration Ordering

Readable identity is the final current `requiredOnStartup` definition. Before it reads/mutates legacy state it requires terminal `SUCCEEDED | SUCCEEDED_WITH_WARNINGS` for:

| Migration ID | Reason |
| --- | --- |
| `20260727_custom_provider_v1_secret_migration` | Removes V1 inline secret and produces missing/V2/current V3 |
| `20260706_remove_global_skill_discovery_mode` | Can write bindings and run/team metadata |
| `20260517_team_run_metadata_member_tree` | Can rewrite team run metadata |
| `20260730_token_usage_provider_name_snapshot_backfill` | Must resolve old UUID provider names before V3 removes old map key |
| `20260623_remove_self_evolution_run_metadata` | Can write run/team metadata |

`TokenUsageProviderNameSnapshotBackfillMigration` uses a migration-only strict missing/V2/V3 reader returning only `{id,name}`. It remains the only owner that updates token provider-name snapshots. Readable identity never rewrites token identifiers or rows.

A registry invariant test asserts readable is last and all five IDs precede it. This is a fixed local guard, not dependency metadata on every migration.

#### Exact Managed Selector Inventory

| Store / Location | Exact Fields |
| --- | --- |
| Shared/application/team-local `agent-config.json` | `defaultLaunchConfig.llmModelIdentifier` |
| Shared/application `team-config.json` | `defaultLaunchConfig.llmModelIdentifier` |
| `external-channel/bindings.json` | each persisted agent/team binding `launchPreset.llmModelIdentifier` |
| `applications/*/db/platform.sqlite`, `__autobyteus_resource_configurations.launch_profile_json` | agent root `llmModelIdentifier`; team `defaults.llmModelIdentifier`; every `memberProfiles[].llmModelIdentifier` |
| Same table, `launch_defaults_json` | legacy root `llmModelIdentifier` |
| `memory/agents/*/run_metadata.json` | root `llmModelIdentifier` |
| `memory/agent_teams/*/team_run_metadata.json` | every current agent member node recursively |
| `memory/**/skill_improvement/**/improver_session.json` | root `llmModelIdentifier` |

No arbitrary recursive key search or text replacement is permitted. Raw/work traces, token model identifiers/accounting, prompts, logs, application run-binding summaries, and model-free indexes are excluded.

JSON adapters use same-directory temp write/fsync/atomic rename. Each application database uses one transaction. They replace only:

```text
openai-compatible:<exact-old-provider-id>:<suffix>
->
openai-compatible:<exact-new-provider-id>:<same byte sequence suffix>
```

#### Optimistic Interruption Contract

- Before empty-V3 publication: V2 remains authoritative; any completed exact selector rewrites are idempotent. The existing recent-`RUNNING` window can block immediate restart. A later ordinary retry derives the same map and continues.
- After empty-V3 publication: Every target was attempted and legacy providers are gone. An interrupted runner record may still block immediate restart; later ordinary retry sees strict V3 and returns no-op success.
- No private state, backup, completion receipt, PID-specific recovery, timestamp bypass, or custom runner method exists.
- A provider-file publication failure is fatal because normal runtime is V3-only.
- Selector-target/old-secret cleanup failures are warnings; they do not roll back empty V3.

## Implementation Contracts Required Before Coding

### Custom Metadata Contract

```ts
type ResolvedMetadataSource =
  | { kind: 'live' }
  | { kind: 'inferred_builtin'; provider: LLMProvider; value: string; provenance: StaticModelMetadataProvenance }
  | { kind: 'static_definition'; provenance: StaticModelMetadataProvenance }
  | { kind: 'unknown' };
```

For each limit independently:

```text
valid advertised integer
  ?? lowest valid candidate among exact SupportedModelDefinition.value matches
  ?? null
```

The exact index performs no case folding, suffix/prefix stripping, display-name lookup, family matching, URL inspection, or aliasing. It retains candidate provenance and uses deterministic provider/source tie-breaking.

### Qwen Configuration Contract

Core Qwen endpoint owner:

```ts
export const QWEN_BASE_URL_ENV_VAR = 'QWEN_BASE_URL';
export const DEFAULT_QWEN_BASE_URL =
  'https://dashscope-intl.aliyuncs.com/compatible-mode/v1';
export function resolveQwenBaseUrl(configured?: string): string;
```

`resolveQwenBaseUrl` validates/normalizes absolute HTTP(S) and uses the default only for missing/blank setting. `QwenLLM` obtains it when constructed; no route literal remains in the adapter.

GraphQL/service command input remains narrow:

```ts
type QwenConfigurationInput = { baseUrl: string; apiKey: string };
type QwenSetupStatus = {
  effectiveBaseUrl: string;
  endpointSource: 'DEFAULT' | 'CONFIGURED';
  apiKeyConfigured: boolean;
};
```

`LlmProviderService.saveQwenConfiguration` sequence:

1. normalize/validate both values;
2. probe pair; on failure write nothing;
3. retain previous Qwen `SecretValue` in command scope when configured;
4. save new key;
5. call narrow `AppConfig.setDurably('QWEN_BASE_URL', normalizedUrl)` that writes same-directory temp, fsyncs file/directory, atomically replaces `.env`, and changes runtime memory only after success;
6. if step 5 fails, restore previous key or remove the newly created key;
7. if compensation succeeds, return `QWEN_CONFIGURATION_SAVE_FAILED_PREVIOUS_RESTORED`; if compensation fails, return `QWEN_CONFIGURATION_REPAIR_REQUIRED`; never return success;
8. on success reload/project Qwen status.

`endpointSource` derives from presence of a saved non-empty setting, not URL equality. Generic provider records gain no Qwen fields.

### Native Qwen Definitions

| Friendly `name` / Internal global `modelIdentifier` | Exact `value` / Wire Model | Context | Notes |
| --- | --- | ---: | --- |
| `qwen3.8-max` | `qwen3.8-max` | 1,000,000 | No preview alias |
| `DeepSeek V4 Pro (Qwen)` / `qwen:deepseek-v4-pro` | `deepseek-v4-pro` | 1,000,000 | Direct-provider entry remains distinct |
| `DeepSeek V4 Flash 0731 (Qwen)` / `qwen:deepseek-v4-flash-0731` | `deepseek-v4-flash-0731` | 1,000,000 | Preserve exact Alibaba wire value |
| `GLM-5.2 (Qwen)` / `qwen:glm-5.2` | `glm-5.2` | 198,000 | Direct-provider entry remains distinct |

Input/output limits remain null unless route-specific evidence is recorded. Static definitions carry source URL and verification date. `modelIdentifierOverride` is internal catalog identity only and never changes the API `model` value.

### Qwen Live-Selection Presentation Contract

`autobyteus-web/utils/modelSelectionLabel.ts` remains the single owner for catalog-backed option and selected-value text. Extend its existing narrow provider exception; do not change `shouldUseModelIdentifierLabel` or duplicate a Qwen branch in a component:

```ts
const normalizedName = model.name?.trim();

if (model.providerType === 'OPENAI_COMPATIBLE' && normalizedName) {
  return normalizedName;
}

if (model.providerType === 'QWEN' && normalizedName) {
  return normalizedName;
}

if (shouldUseModelIdentifierLabel(runtimeKind)) {
  return model.modelIdentifier;
}

return normalizedName || model.modelIdentifier;
```

The exact condition order is part of the contract:

- custom OpenAI-compatible friendly labels remain unchanged;
- a live Qwen row uses its existing nonblank name on every helper-backed AutoByteus surface;
- unrelated built-in AutoByteus models retain identifier labels;
- non-AutoByteus fallback behavior remains name then identifier;
- missing/unavailable selections do not have a live `ModelInfo`, so their existing caller-owned raw-identifier option remains unchanged.

Consumer contract:

| Consumer | Display input | Selected/persisted value | Required SR-017 result |
| --- | --- | --- | --- |
| `ProviderModelBrowser.vue` | Shared option label | N/A | Friendly Qwen model card text |
| `useRuntimeScopedModelSelection.ts` consumers | Shared option + selected labels | Exact `modelIdentifier` | Friendly agent/team/application/member model choices |
| `launch-preset-model-selection.ts` | Shared option + selected labels | Exact `modelIdentifier` | Friendly external binding model choices |
| `useMediaDefaultModelsCard.ts` | Shared live catalog labels; caller-owned raw missing choice | Exact `modelIdentifier` | Same policy if a Qwen row is applicable; missing fallback unchanged |

No GraphQL operation/type, Qwen definition, store schema, factory key, selected option ID, or request builder changes. Focused tests must assert both the new Qwen case and the existing generic/custom cases. One UI/component or browser-level assertion must cover Settings and one shared selection surface so the design is not implemented as a Settings-only branch.

### Custom Provider Identity And Store Contract

Core owner:

```ts
export function normalizeProviderName(value: string): string;
export function buildCustomProviderId(displayName: string): string;
```

Normalization and examples are authoritative in the supplement. No random/hash/counter collision suffix exists. Invalid empty derivation fails `CUSTOM_PROVIDER_NAME_INVALID`.

`CustomLlmProviderStore.createProvider` under its existing locked update:

1. normalize name and derive ID;
2. parse V3 only;
3. reject canonical name conflict;
4. reject derived ID conflict;
5. append `{id,name,providerType,baseUrl}` and return committed record.

The service retains built-in-name and friendly early checks but cannot be commit authority. Browser/GraphQL input stays `{name,baseUrl,apiKey}`. The ID is immutable; provider rename/Base-URL edit is out of scope.

### V1 Secretless Staging Contract

Keep migration ID `20260727_custom_provider_v1_secret_migration` for installed ledger compatibility:

- missing/strict V2/strict V3 -> not required;
- valid V1 -> atomically publish V2 with only `id,name,providerType,baseUrl`, clear owned inline value/source bytes, and return warning `CUSTOM_PROVIDER_V1_RECONFIGURATION_REQUIRED`;
- invalid/unsafe V1 -> existing reset/reconfiguration-required outcome;
- never call secret batch/save/resolve/compensation;
- do not access the vault during V1 staging; the readable transition may remove any old UUID entry only after empty-V3 publication.

### Existing Custom Provider Recreation Contract

Do not extend `saveProviderApiKey` for custom IDs and do not add a key editor to saved custom details. After empty-V3 reset there is no migrated record to repair.

Reuse the existing add-custom-provider path without a new schema or branch:

1. User opens the existing custom provider form.
2. User enters provider name, Base URL, and API key again.
3. Existing `createCustomProvider` validation/probe runs before mutation.
4. Store derives the readable ID from the submitted name, atomically creates the V3 record, and existing secret save/runtime reload complete.
5. Reusing the same canonical legacy name recreates the future ID already embedded in migrated selectors.
6. A bad pair creates no provider/secret. A different name creates a different readable ID and old selectors remain unavailable until manually reselected.

There is no persisted credential-missing flag, no preserved provider/Base URL, no custom branch in the built-in key mutation, and no new UI/API path.

### Provider-Absent Selection Contract

After empty-V3 publication and before recreation:

- no migrated custom provider record, Base URL, readable-ID secret, model group, or credential-state attribute exists;
- exact migrated/stale selectors remain stored and shown as unavailable, never changed to another model;
- new agent/team launch, external dispatch, application launch, and resume fail through existing missing-model/activation error paths;
- history remains viewable;
- `ApplicationAgentLaunchProfileEditor.vue` retains the raw missing selector on load and reports not-ready/unavailable instead of clearing it;
- same-name recreation restores usability only if the endpoint advertises the exact suffix; otherwise manual reselection is required.

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-004, BEH-006 | Qwen Settings query/submit | Truthful status or sanitized all-old/repair-required failure | `LlmProviderService` | Owns Qwen pair sequencing/durability |
| DS-002 | Primary End-to-End | BEH-005, BEH-006 | User selects/starts native Qwen model | OpenAI-compatible call to configured Alibaba route with exact model | `LLMFactory` + `QwenLLM` adapter | Proves catalog identity and wire identity stay separate |
| DS-003 | Primary End-to-End | BEH-001–BEH-003 | Custom provider probe/reload | Model with known/inferred/unknown metadata reaches runtime | Custom discovery/provider | Preserves generic metadata behavior |
| DS-004 | Return-Event | BEH-003, BEH-006 | Model/status/token state | GraphQL catalog/Settings/token meter | Server projection owners | Makes source and default/configured state observable |
| DS-005 | Primary End-to-End | BEH-007 | User creates/recreates custom provider | Readable provider/model catalog becomes usable | `LlmProviderService` + store commit | Reuses existing create flow and establishes readable identity |
| DS-006 | Primary End-to-End | BEH-007 | Server startup with V1/V2/V3 data | Exact selectors mapped, empty V3 published, terminal status permits runtime | App-data runner + readable migration | Resets providers while preserving deterministic selector intent |
| DS-007 | Primary End-to-End | BEH-007 | User opens/launches/resumes unavailable saved selector | Explicit unavailable/activation failure or restored execution after recreation | Config owner + `LLMFactory` | Prevents silent fallback/data loss |
| DS-008 | Return/Event | BEH-008 | Live Qwen `ModelInfo` enters web catalog state | Friendly card/option/selected text reaches user while exact selector remains the option value | Shared `modelSelectionLabel` policy | Keeps presentation distinct from storage/routing/wire identity across active surfaces |
| LS-001 | Bounded Local | BEH-001–BEH-003 | One discovered model row | Per-field resolved metadata | Custom metadata resolver | Exact deterministic precedence |
| LS-002 | Bounded Local | BEH-007 | One legacy mapping/managed target | Exact prefix rewrite or warning | Readable migration | Optimistic bounded transition |

## Primary Execution Spine(s)

- DS-001: `Qwen Settings -> GraphQL -> LlmProviderService -> endpoint probe -> SecretManagementService -> AppConfig.setDurably -> QwenSetupStatus -> Settings`
- DS-002: `Model selector -> LLMFactory -> QwenLLM -> resolveQwenBaseUrl -> OpenAI-compatible client -> configured Alibaba endpoint`
- DS-003: `Custom provider reload -> endpoint discovery -> strict normalization -> exact metadata resolver -> custom LLMModel -> token budget/compaction`
- DS-005 create/recreate: `Existing custom form -> GraphQL -> LlmProviderService -> probe -> CustomLlmProviderStore locked readable-ID commit -> secret save -> runtime sync -> model group`
- DS-006: `server startup -> ordinary ordered runPending -> V1/other prerequisites -> final readable migration -> selector attempts -> empty-V3 publication/cleanup -> runner terminal record -> thin status gate -> runtime/listen`
- DS-007: `Stored future-readable selector -> UI/config owner retains raw value -> launch/resume -> explicit unavailable failure OR same-name recreation/reload -> exact model execution`
- DS-008: `Qwen definitions -> GraphQL ModelInfo{name,modelIdentifier,value,providerType} -> web catalog store -> shared modelSelectionLabel -> Settings/runtime/binding option and selected label -> user sees friendly name`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | Settings submits one Qwen pair. Service proves pair, commits key, durably commits URL, compensates key on URL failure, and returns server-owned source/status. | form, service command, secret, durable setting, status | `LlmProviderService` | URL normalization, GraphQL error mapping |
| DS-002 | Catalog selects provider-specific global identity, while adapter sends the unchanged exact value through the dynamically resolved route. | selector, registry model, adapter, provider | Registry/adapter | static metadata provenance |
| DS-003 | Discovery owns raw endpoint interpretation; resolver owns only advertised/exact precedence; runtime receives canonical fields. | endpoint row, resolved metadata, model, budget | Custom provider lifecycle | definition index/provenance |
| DS-005 | Existing create flow establishes readable identity, endpoint, key, and models after reset. Same-name recreation matches migrated selectors without a new repair path. | create form/command, store record, secret, runtime models | Service/store | probe and store-atomic uniqueness |
| DS-006 | Existing migrations finish old-ID and target writes; final readable migration stages V1 without keys, maps exact selectors from legacy names, publishes empty V3 last, and relies on ordinary runner status/gate. | migration ledger, legacy names, selectors, empty V3, startup gate | Readable migration | migration-only name reader, atomic adapters, best-effort secret removal |
| DS-007 | Provider-absent selectors remain data, not fallback instructions. UI shows unavailable and runtime fails explicitly until same-name recreation returns the exact model or the user reselects. | stored selector, editor, factory, activation | Each config owner + factory | model-group refresh/error copy |
| DS-008 | The catalog returns singular presentation/routing/wire fields. The shared web policy chooses the friendly Qwen name without changing the option ID; every active helper consumer receives the same label. | Qwen catalog row, web catalog state, label policy, option/card/selected text | `modelSelectionLabel` | missing-row synthesis remains caller-owned |

## Spine Actors / Main-Line Nodes

- Qwen setup form: input and user-visible submission state only.
- `LlmProviderService`: Qwen/custom workflow sequencing, probes, secret commands, reload/status.
- `AppConfig`: authoritative non-secret durable write result.
- Qwen endpoint resolver/adapter: effective route and client construction.
- Custom metadata resolver: pure per-field precedence.
- Identity codec: pure canonical name/derived ID.
- `CustomLlmProviderStore`: V3 record and atomic uniqueness authority.
- App-data runner/readable migration: startup transition lifecycle and terminal status.
- Config/application/run owners: exact selector persistence.
- `LLMFactory`: final model availability/identity lookup.
- Shared model-selection label policy: catalog-backed option/card/selected text only; never selected identity or request value.

## Ownership Map

| Owner | Owns | Must Not Own |
| --- | --- | --- |
| `LlmProviderService` | Provider workflow sequencing, probe, key mutation, runtime reload, Qwen status | File-format migration, catalog metadata facts, UI state |
| `AppConfig` | Strict durable `.env` replacement and truthful result | Secret compensation or Qwen workflow |
| Qwen endpoint resolver | Env key/default/normalization | Secrets, Settings, model list |
| Qwen definitions | Exact values, unique identifiers, static provenance | User endpoint or keys |
| Custom metadata resolver | Exact index and per-field precedence | Endpoint URL/profile/alias/provider-name policy |
| Identity codec | Deterministic name normalization/ID | Persistence, conflict resolution, suffix allocation |
| `CustomLlmProviderStore` | V3 parse, locked uniqueness, append/delete | Probe, secret write, V2 conversion |
| V1 migration | Inline-secret removal and secretless V2 | Readable ID mapping or runtime aliases |
| Readable migration | Exact prerequisites, transient mapping, selector attempts, empty-V3-last publication, best-effort old-secret removal | Provider/Base-URL preservation, secret value transfer, token-row rewrite, generic recovery framework |
| Migration-only name reader | Strict missing/V2/V3 `{id,name}` projection | Normal runtime/store reads |
| Config/UI owners | Persist/display exact selector | Selecting fallback on missing model |
| `LLMFactory` | Exact global selector lookup | UI clearing or provider-ID migration |
| `modelSelectionLabel` | Friendly-versus-identifier text for live catalog rows | Option IDs, persistence, model routing, missing-row synthesis, or provider wire values |

## Thin Entry Facades / Public Wrappers

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| GraphQL provider query/mutations | `LlmProviderService` | Auth/schema/error projection | Probe/write order or custom/built-in identity rules |
| `ProviderAPIKeyManager.vue` | Settings runtime/store | Compose provider-specific forms/details | Server source inference or key persistence |
| `server-runtime.ts` migration gate | Runner result + readable migration definition | Stop before runtime on non-terminal result | Rerun/recovery/state interpretation |
| Settings/selection components and composables | Shared `modelSelectionLabel` policy | Render catalog rows in their owning surface | Provider-specific label logic or display-text persistence |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope | Notes |
| --- | --- | --- | --- | --- |
| Custom endpoint profiles/Alibaba URL tables | Native Qwen owns route configuration; generic custom inference is exact | Qwen endpoint config + exact resolver | In This Change | Delete tests/types too |
| Custom model aliases/references including dated DeepSeek remap | Exact native offering exists; custom values remain exact | Native Qwen definitions / exact fallback | In This Change | No suffix normalization |
| `endpoint_profile` source union branch | No producer remains | `live`, `inferred_builtin`, `static_definition`, `unknown` | In This Change | Update server projection/tests |
| Qwen constructor URL literal | Blocks regional/Token Plan endpoints | `qwen-provider-config.ts` | In This Change | One historical default remains |
| `qwen3.8-max-preview` | User says production exact value is non-preview | `qwen3.8-max` exact definition | In This Change | No alias/migration |
| `randomUUID` custom ID creation | Opaque identity and split invariant | core codec + store commit | In This Change | No collision suffix |
| `custom-provider-readable-id-migration-state.ts` and validator/state-specific result if unused | Private journal/receipt state is superseded | Existing runner status + idempotent exact operations | In This Change | Delete source/tests |
| `custom-provider-readable-id-startup-recovery.ts` | Immediate recovery no longer required | Thin terminal status gate | In This Change | No coordinator |
| `custom-provider-readable-id-secret-migrator.ts` | Secret transfer explicitly rejected | Empty-V3 reset plus ordinary provider recreation | In This Change | Migration never resolves old value |
| `AppDataMigrationRunner.resumePersistedRunningAtStartup` and type/test changes supporting it | Special timestamp bypass superseded | Ordinary stale-`RUNNING` policy | In This Change | Preserve normal runner |
| Migration journal/backups/completion receipt/phase/lock machinery beyond ordinary atomic store utilities | Crash-perfect protocol rejected | Optimistic empty-V3-last transition | In This Change | Remove PID-recovery-specific files/tests |
| Crash-point/receipt/runner-handoff test matrix | No longer acceptance authority | Ordinary interruption/idempotency/status-gate tests | In This Change | Keep proportional failure tests |
| Application-agent missing-selector clearing watcher | Conflicts with provider-absent selector contract | Retain-and-block state | In This Change | Align team/editor behavior |
| Live Qwen `modelIdentifier` as user-facing text in the generic AutoByteus label branch | Internal collision key is not presentation when `name` exists | Qwen/nonblank-name branch in shared `modelSelectionLabel` | SR-017 | Keep selector unchanged as option ID/persisted/routing identity |

## Return Or Event Spine(s)

DS-004:

`resolved model/Qwen status -> provider/model service -> GraphQL typed projection -> web store/runtime -> model group, source state, token meter, or error UI`.

Secrets and raw causes never enter this return path. Metadata source/provenance and Qwen endpoint source are explicit server projections.

DS-008:

`Qwen ModelInfo -> web catalog store -> shared label policy -> Settings card or grouped option/selected label`. The return text uses the friendly `name`; the forward selection path continues to carry exact `modelIdentifier`, and DS-002 continues to send exact `value`.

## Bounded Local / Internal Spines

- LS-001 parent: custom metadata resolver. `advertised field -> exact candidate set -> deterministic minimum/tie-break -> typed source/null`.
- LS-002 parent: readable migration. `transient old/future map -> enumerate exact owned targets -> compare exact prefix -> atomic replace/transaction or warning -> continue -> publish empty V3 last`.
- Qwen compensation loop is command-local rather than a reusable transaction framework: `key saved -> durable URL failure -> restore old/remove new -> truthful code`.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine IDs | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Static metadata provenance | DS-002–DS-004 | Definition/resolver | Source URL/date and selected candidate | Auditability | Catalog or UI starts inventing facts |
| Strict URL normalization | DS-001, DS-002 | Qwen endpoint owner/service | Absolute HTTP(S), canonical form | Shared route invariant | UI/runtime disagree |
| Secret management | DS-001, DS-005, DS-006 | Service/migration | Save/status/remove without exposure | Existing security boundary | Migration/UI handles plaintext |
| Atomic JSON/SQLite adapters | DS-006, LS-002 | Readable migration | Shape-specific exact writes | Storage semantics differ | Migration becomes broad text rewriter |
| Migration-only provider names | DS-006 | Token snapshot/readable migration | Historical `{id,name}` lookup | Old-ID consumer ordering | Normal store gains V2 alias |
| Missing-model presentation | DS-007 | Config editors | Retain raw value and mark unavailable | Actionable repair | UI silently changes user choice |
| Live model label policy | DS-008 | Web model-selection surfaces | Choose friendly versus identifier text once | Cross-surface consistency | Settings/runtime/binding diverge or display text becomes identity |

## Ownership Boundaries

- GraphQL and Vue components call `LlmProviderService`; they do not sequence vault/AppConfig/store internals.
- Qwen runtime and server status use one endpoint policy; UI does not compare against the default URL.
- Store creation is authoritative for custom name/ID uniqueness; service prechecks are advisory.
- Migration owns old schema/mapping and exact selector adapters; normal provider/config/runtime code never reads UUID aliases.
- Secret service owns values. Readable migration may request removal by old consumer identity only; it never resolves the value.
- Each selector store's adapter owns its physical atomicity; readable migration owns enumeration/order and exact mapping.
- `server-runtime` only checks terminal migration status; it does not implement retry/recovery or infer completion from V3.
- Catalog components/composables call the shared label owner and keep `modelIdentifier` as option ID. They do not format Qwen identifiers locally or persist display text.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanisms | Upstream Callers | Forbidden Bypass Shape | If API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `LlmProviderService` | probe, vault, AppConfig, store, runtime sync | GraphQL | resolver/UI directly writes vault/env/store | Add subject-specific service method |
| `AppConfig.setDurably` | temp file/fsync/rename/runtime update | Qwen command | service writes `.env` itself | Strengthen result/error contract |
| `CustomLlmProviderStore.createProvider` | lock, V3 parse, derive/recheck/append | provider service | service generates ID/appends file | Return committed record/conflict code |
| Readable migration definition | prerequisites, transient mapping, target adapters, empty-V3 commit/cleanup | app-data runner | server runtime invokes adapters/state | Keep one execute boundary |
| `LLMFactory` | registry exact lookup | launch/resume backends | caller silently substitutes default | Surface not-found |
| `getModelSelectionOptionLabel` / `getModelSelectionSelectedLabel` | provider-scoped live label policy | Settings/runtime/binding catalog consumers | components reimplement Qwen formatting or use the label as identity | Extend the shared policy and tests |

## Dependency Rules

Allowed:

- Web GraphQL store -> GraphQL provider boundary -> `LlmProviderService`.
- `LlmProviderService` -> discovery, secret service, AppConfig, custom store, runtime sync.
- Qwen adapter/server projection -> core Qwen endpoint resolver.
- Custom store/schema/migration -> core identity codec.
- Readable migration -> migration-only name reader/prerequisite guard/shape adapters/secret removal.
- Token snapshot migration -> migration-only name reader.
- Active catalog-backed Settings/runtime/binding selectors -> shared `modelSelectionLabel` policy.

Forbidden:

- Generic custom resolver depending on Base URL, Alibaba plan, provider display name, or alias table.
- UI generating provider IDs or inferring Qwen endpoint source.
- Service treating its precheck as final uniqueness authority.
- Normal store/service/runtime importing V1/V2 readers or UUID maps.
- Readable migration resolving/copying legacy secret values or rewriting token/history/free text.
- `server-runtime` bypassing runner/definition boundaries or implementing custom recovery.
- Missing selector code selecting a fallback or clearing persisted value solely because catalog entry is absent.
- Component-local Qwen label branches, changing option IDs to friendly names, or sending `modelIdentifier` rather than `value` to Alibaba.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `saveQwenConfiguration({baseUrl,apiKey})` | Qwen connection | Probe and durable pair command | Qwen singleton | Subject-specific |
| `qwenSetupStatus` | Qwen connection | Project effective URL/source/key flag | Qwen singleton | No secret |
| `saveProviderApiKey(providerId,apiKey)` | Built-in provider credential | Preserve current built-in key behavior only | Built-in provider ID | Do not add a custom-reset branch |
| `createCustomProvider({name,baseUrl,apiKey})` | New custom provider | Probe/create/save/reload | Name-derived server ID | Browser supplies no ID |
| `CustomLlmProviderStore.createProvider` | Custom V3 record | Derive ID and atomically commit uniqueness | Canonical name/derived ID | Returns record |
| `resolveOpenAICompatibleEndpointModelMetadata(row)` | Custom discovered model | Per-field advertised/exact resolution | Exact model value | No endpoint argument |
| `CustomProviderMigrationNameSnapshotReader.read()` | Migration provider-name projection | Strict missing/V2/V3 `{id,name}` | Historical/current provider IDs | Migration-only |
| `CustomProviderReadableIdPrerequisiteGuard.requireTerminalSuccess()` | Readable prerequisites | Fixed exact status check | Five migration IDs | No graph/framework |
| `CustomProviderReadableIdAppDataMigration.execute()` | Reset/selector transition | Map/rewrite/empty-V3-last/cleanup | Complete transient V2 old->future mapping | No record/Base-URL/secret preservation |
| `getModelSelectionOptionLabel(model,runtimeKind)` | Live catalog presentation | Choose friendly Qwen/custom or existing identifier/name policy | Existing `ModelInfo` fields | Returns display text only; no identity mutation |

## Interface Boundary Check

| Interface | Responsibility Is Singular? | Identity Shape Is Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Qwen configuration command | Yes | Yes | Low | Keep two-field input |
| Existing key mutation | Yes | Yes | Low | Keep built-in-only; custom re-entry uses create |
| Custom create/store | Yes | Yes | Low | Store derives ID |
| Exact metadata resolver | Yes | Yes | Low | Remove endpoint/profile input |
| Readable migration | Yes | Yes | Medium | Exact prefix inventory and suffix preservation |
| Missing selector runtime | Yes | Yes | Medium | Preserve raw value; exact factory failure |
| Shared selection label | Yes | Yes | Low | Qwen friendly-name branch; option ID remains exact selector |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Natural/Self-Descriptive? | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Qwen endpoint policy | `qwen-provider-config.ts` | Yes | Low | Keep only endpoint setting/default/resolve |
| Custom identity | `custom-llm-provider-identity.ts` | Yes | Low | No generic slug helper |
| Migration-only names | `custom-provider-migration-name-snapshot.ts` | Yes | Low | Keep migration namespace/shape |
| Readable transition | `custom-provider-readable-id-app-data-migration.ts` | Yes | Low | Remove recovery/state duties |
| Custom saved details | `CustomProviderDetailsCard.vue` | Yes | Low | No change; reset leaves no migrated record to repair |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Custom endpoint probe | Discovery | Reuse | Already validates URL/key/model rows | N/A |
| Key save/status/remove | Secret management | Reuse | Existing secure owner | N/A |
| Strict Qwen URL durability | AppConfig | Extend | Existing non-secret config owner | N/A |
| Legacy custom re-entry | Existing custom create form/service | Reuse | Already accepts/probes/saves name/Base URL/key | N/A |
| Name/ID policy | Core LLM provider domain | Create New file | Shared pure invariant across server/store/migration | Generic utility would lose domain meaning |
| Legacy provider names | App-data migrations | Create New migration-only file | Normal store must stay V3-only | N/A |
| Selector rewrites | App-data migration adapters | Extend/Add bounded files | Store-specific atomicity | No general text migration |
| Migration dependencies/recovery | Existing runner/records | Reuse ordinary status only | Special framework not required | N/A |
| Friendly live Qwen labels | Existing shared `modelSelectionLabel` utility | Extend | Already owns option and selected labels for every identified active catalog-backed surface | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine IDs | Governing Owner(s) Served | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| Core LLM/Qwen | Endpoint policy, adapter, exact definitions | DS-002 | Qwen runtime/catalog | Extend | No Settings/secret concerns |
| Core metadata | Advertised/exact inference/source types | DS-003, LS-001 | Custom provider | Simplify | Delete route policy |
| Server provider management | Qwen commands/status and custom create/probe/reload/store | DS-001, DS-005 | `LlmProviderService`/store | Extend only for readable create ID | No reconnect branch |
| App-data migrations | V1 staging, ordering, transient mapping, exact adapters, empty-V3 commit | DS-006, LS-002 | App-data runner | Simplify existing/new | No private recovery subsystem |
| Web Settings | Qwen form and existing custom create/delete UI | DS-001, DS-005 | Settings runtime/store | Reuse/extend Qwen only | No custom reconnect/credential state |
| Web application setup | Missing selector presentation/readiness | DS-007 | Application editors | Modify | Align agent/team behavior |
| Web model selection | Live catalog option/card/selected labels | DS-008 | Shared label policy | Extend one narrow condition | No Settings-only formatting or identity change |

## Draft File Responsibility Mapping

| Candidate File | Subsystem | Owner / Boundary | Concrete Concern | Why One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `qwen-provider-config.ts` | Core Qwen | Endpoint policy | env key/default/normalize/resolve | Cohesive route concern | URL normalizer |
| `custom-llm-provider-identity.ts` | Core provider | Identity codec | canonical name + ID | Shared pure invariant | N/A |
| `llm-provider-service.ts` | Server provider | Workflow | Qwen save/status and existing custom create | Existing command owner | discovery/secret/AppConfig/store |
| readable migration | Migration | Transition sequencer | prerequisites/transient map/adapters/empty-V3/cleanup | One migration lifecycle | codec/readers/adapters |
| name snapshot | Migration | Historical projection | missing/V2/V3 `{id,name}` | Narrow shared migration data | codec/parsers |
| JSON/SQLite selector migrators | Migration | Physical adapters | Exact shape-specific atomic writes | Separate physical stores | mapping shape |
| `modelSelectionLabel.ts` | Web model selection | Presentation policy | Qwen friendly label before generic AutoByteus identifier fallback | One existing cross-surface owner | Existing `ModelInfo` fields |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? | Overlapping Representations Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Provider name/ID normalization | `autobyteus-ts/src/llm/custom-llm-provider-identity.ts` | Core provider | Store/schema/service/migration need exact same invariant | Yes | Yes | Generic slug/alias framework |
| Qwen effective endpoint | `autobyteus-ts/src/llm/qwen-provider-config.ts` | Core Qwen | Runtime and server status must agree | Yes | Yes | General provider route bag |
| Old/new selector prefix | Migration-local mapping type | App-data migration | Every adapter needs exact pair | Yes | Yes | Public model identity type |
| Migration provider name | `custom-provider-migration-name-snapshot.ts` | App-data migration | Token snapshot/readable mapping need legacy names | Yes | Yes | Runtime dual reader |
| Catalog option/selected text | `autobyteus-web/utils/modelSelectionLabel.ts` | Web model selection | Settings/runtime/binding consumers already need identical policy | Yes | Yes | A general provider presentation schema |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Parallel Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Qwen configuration input | Yes | Yes | Low | Exactly URL/key |
| Qwen setup status | Yes | Yes | Low | Exactly effective URL/source/key flag |
| V3 provider record | Yes | Yes | Low | Same four fields; ID/name invariant |
| Custom model selector | Yes | Yes | Medium | Keep current composite; no second structured identity |
| Migration mapping | Yes | Yes | Low | Old/new IDs/prefixes only; no secrets |
| `ModelInfo` label/identity/value fields | Yes: `name`/`modelIdentifier`/`value` | Yes | Low | Reuse as-is; never add `displayName` or overwrite identity for SR-017 |

## Final File Responsibility Mapping

| File | Subsystem | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/llm/qwen-provider-config.ts` | Core Qwen | Endpoint policy | setting/default/effective URL | One cohesive policy | URL normalizer |
| `autobyteus-ts/src/llm/api/qwen-llm.ts` | Core Qwen | Adapter | construct client with resolver | Existing provider adapter | endpoint policy |
| `autobyteus-ts/src/llm/qwen-supported-model-definitions.ts` | Core catalog | Qwen facts | four exact entries/metadata/overrides | Existing Qwen definition owner | static metadata helper |
| `autobyteus-ts/src/llm/metadata/openai-compatible-endpoint-model-metadata.ts` | Core metadata | Exact resolver | advertised/exact per-field only | One pure policy | supported definitions |
| `autobyteus-ts/src/llm/metadata/model-metadata-resolver.ts` | Core metadata | Source type | reduced source union | Existing type owner | N/A |
| `autobyteus-ts/src/llm/custom-llm-provider-identity.ts` | Core provider | Identity | canonical name/readable ID | Shared pure owner | N/A |
| `autobyteus-ts/src/llm/custom-llm-provider-config.ts` | Core provider | Current schema | strict V3 parser/invariant | Existing schema owner | identity codec |
| `autobyteus-server-ts/src/config/app-config.ts` | Server config | Durable setting | narrow strict atomic setter | Existing config authority | file utilities |
| `autobyteus-server-ts/src/llm-management/llm-providers/services/llm-provider-service.ts` | Server provider | Command/status | Qwen pair; readable custom create | Existing provider workflow owner | discovery/secret/store/runtime sync |
| `autobyteus-server-ts/src/llm-management/llm-providers/stores/custom-llm-provider-store.ts` | Server provider | Persistence | V3-only atomic uniqueness/create/delete | Existing store | codec/update utility |
| `autobyteus-server-ts/src/llm-management/llm-providers/domain/models.ts` | Server provider | Domain projections | Qwen status; shared identity import as needed | Existing domain owner | core codec |
| `autobyteus-server-ts/src/api/graphql/types/llm-provider.ts` | GraphQL | Transport | Qwen status/save; preserve existing custom create and key mutation behavior | Existing provider schema | service |
| `autobyteus-server-ts/src/app-data-migrations/migrations/custom-provider-v1-app-data-migration.ts` | Migration | V1 staging | secretless V2/direct V2/V3 handling | Historical ID owner | migration file codec |
| `.../custom-provider-migration-name-snapshot.ts` | Migration | Historical names | strict missing/V2/V3 `{id,name}` | Migration-only shared projection | codec |
| `.../custom-provider-readable-id-prerequisite-guard.ts` | Migration | Ordering | five exact terminal checks | Fixed local policy | record repository |
| `.../custom-provider-readable-id-json-selector-migrator.ts` | Migration | JSON adapter | exact allowlisted atomic rewrites | JSON store semantics | mapping |
| `.../custom-provider-readable-id-application-selector-migrator.ts` | Migration | SQLite adapter | exact application row transaction | SQLite semantics | mapping |
| `.../custom-provider-readable-id-app-data-migration.ts` | Migration | Sequencer | transient map, attempt targets, empty V3 last, best-effort cleanup | One transition lifecycle | guard/adapters/codec |
| `autobyteus-server-ts/src/app-data-migrations/migrations/token-usage-provider-name-snapshot-backfill-migration.ts` | Migration | Token snapshot | use migration-only names before readable | Existing token owner | name reader |
| `autobyteus-server-ts/src/app-data-migrations/app-data-migration-registry.ts` | Migration registry | Order | readable final + invariant tests | Existing registry owner | definition |
| `autobyteus-server-ts/src/server-runtime.ts` | Startup | Thin gate | accept terminal readable status only | Existing lifecycle owner | runner result |
| `autobyteus-web/components/settings/providerApiKey/QwenSetupForm.vue` | Web Settings | Form | URL/key journey/states | Distinct Qwen UI | runtime/store |
| `autobyteus-web/components/applications/setup/ApplicationAgentLaunchProfileEditor.vue` | Web application | Selector editor | retain unavailable raw value and block readiness | Existing owner | grouped select/readiness patterns |
| `autobyteus-web/utils/modelSelectionLabel.ts` | Web model selection | Shared presentation policy | Qwen/custom friendly names and existing runtime identifier policy | Existing active cross-surface owner | `ModelInfo` |
| `autobyteus-web/utils/__tests__/modelSelectionLabel.spec.ts` | Web model selection tests | Shared presentation contract | Qwen friendly option/selected labels plus retained generic/custom cases | One focused unit contract | production helper |
| Existing `ProviderModelBrowser`, runtime-scoped selection, binding selection, and relevant component/browser tests | Web surfaces | Policy consumers/evidence | Prove Settings and one shared selection surface receive friendly text while IDs remain exact | Existing consumer paths | shared helper |
| GraphQL ops/store/runtime/generated types/locales/tests | Web Settings | Client boundary | query/mutation/status refresh/copy | Existing frontend paths | provider GraphQL |

## Applied Patterns

- **Thin transport, owning service:** GraphQL exposes provider commands but service owns workflow.
- **Pure domain codec:** Name/ID policy is reusable without persistence or UI.
- **Current-schema runtime with isolated migration:** V1/V2 knowledge stays in app-data migrations.
- **Empty-V3-last optimistic reset:** Exact repairable target failures warn; provider reset publication is the hard boundary.
- **Server-owned UI projection:** Qwen endpoint source is explicit, not inferred in browser.
- **Shared presentation policy:** Existing `ModelInfo` stays singular; one helper chooses live display text while consumers retain exact option identity.

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/llm/` | Folder | Core LLM domain | Qwen policy/catalog, custom identity | Shared provider concepts | GraphQL/UI/migrations |
| `autobyteus-ts/src/llm/metadata/` | Folder | Metadata policy | Generic advertised/exact resolution | Existing metadata owner | Alibaba endpoints/aliases |
| `autobyteus-server-ts/src/llm-management/llm-providers/` | Folder | Provider management | Commands/status/store/runtime sync | Existing provider boundary | Legacy file conversion |
| `autobyteus-server-ts/src/app-data-migrations/migrations/` | Folder | Startup transitions | Historical parsers, exact adapters, readable sequencing | Existing migration owner; flat bounded set is clearest | Runtime aliases/public schemas |
| `autobyteus-web/components/settings/providerApiKey/` | Folder | Settings | Qwen form plus unchanged existing custom create/delete flow | Existing provider settings area | Migration/reconnect logic |
| `autobyteus-web/components/applications/setup/` | Folder | Application setup | Missing selector readiness/presentation | Existing application editor owner | Migration mapping |
| `autobyteus-web/utils/modelSelectionLabel.ts` | File | Web model-selection presentation | Provider/runtime-aware live label policy shared by active surfaces | Existing narrow owner; no new folder/module justified | Store/routing/wire mutation |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth | Ownership Boundary Is Clear? | Mixed/Over-Split Risk | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| core `llm/` | Main-Line Domain-Control | Yes | Low | Provider facts/pure identity belong together |
| core `llm/metadata/` | Off-Spine Concern | Yes | Low | Pure inference separated from provider adapter |
| server provider management | Main-Line Domain-Control/Persistence | Yes | Medium | Service/store subfolders already separate authority |
| app-data migrations | Main-Line transition + bounded adapters | Yes | Medium | Keep small named adapters; remove state/recovery proliferation |
| web provider settings | Transport/UI | Yes | Low | Reuse existing editor/runtime |
| web shared model-selection utility | Off-spine presentation concern | Yes | Low | One file already serves all identified active consumers; a new subsystem would be empty indirection |

## Concrete Examples / Shape Guidance

| Topic | Good Example | Bad / Avoided Shape | Why It Matters |
| --- | --- | --- | --- |
| Qwen duplicate offering | selector `qwen:deepseek-v4-pro`; wire model `deepseek-v4-pro` | send `qwen:deepseek-v4-pro` to Alibaba | Registry identity and API value differ intentionally |
| Custom model identity | `openai-compatible:provider_alibaba_cloud:deepseek-v4-flash-0731` | UUID provider or structured attributes added everywhere | Existing composite is sufficient once provider ID is readable |
| Exact fallback | discovered `glm-5.2` -> exact built-in candidates -> conservative field | `glm-*`, URL, provider name, or nearest-family match | Avoids unsafe guesses |
| Selector migration | change exact provider prefix; copy suffix bytes | normalize `0731`, rewrite free text/traces | Preserves actual wire selection/history |
| Provider-absent interval | show retained selector unavailable; recreate/reselect | clear it or choose a default | No silent user-choice loss |
| Secret transition | empty V3 has no provider/key; user recreates | decrypt/re-encrypt old key or runtime alias | Matches explicit simplification/security posture |
| Qwen live presentation | label `DeepSeek V4 Pro (Qwen)`; option ID `qwen:deepseek-v4-pro`; wire `deepseek-v4-pro` | display internal selector, persist friendly name, or send prefixed value | Keeps presentation, routing, and provider protocol singular and separate |
| Missing Qwen selector | show raw `qwen:...` in existing unavailable/current state | invent a stale friendly label or clear/fallback | No live catalog row exists to authorize a friendly name |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why Considered | Decision | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Custom endpoint profiles/aliases | Fill missing Alibaba metadata | Rejected | Exact built-in fallback + native Qwen |
| Preview-to-production alias | Preserve old selector | Rejected | Exact production value; user reselects old preview |
| Grandfather UUID providers | Avoid migration | Rejected | Deterministic selector mapping plus empty V3 |
| Runtime UUID -> readable alias | Keep old selectors/secrets | Rejected | Exact structured rewrite; no alias |
| Old secret lookup/copy/re-encryption | Seamless credentials | Rejected | Empty V3 and ordinary recreation |
| Delete all legacy providers/selectors | Simplest reset | Rejected | User asked to preserve easy deterministic non-secret state |
| Journal/backups/receipt/runner bypass | Crash-perfect migration | Rejected | Ordinary retry + optimistic empty-V3-last transition |
| Broad selector rewrite | Find every UUID occurrence | Rejected | Exact allowlisted structured inventory |
| New reconnect mutation/editor/credential field | Repair a preserved record | Rejected | Do not preserve the record; reuse existing create flow |
| Structured `{providerId,value}` registry | Cleaner long-term identity | Rejected for scope | Keep existing composite selector |
| Settings-only Qwen label branch | Fast visual fix | Rejected | Extend shared label owner so every active catalog-backed selection surface is consistent |
| New `displayName`/`isInternalIdentifier` field | Could encode presentation explicitly | Rejected | Existing `name` and `providerType` fully express the narrow rule |
| Remove Qwen prefix from `modelIdentifier` | Would make label pretty by collapsing identity | Rejected | Keep collision-safe selector; change display text only |

## Derived Layering (If Useful)

`Web/GraphQL transport -> provider/configuration owners -> core provider identity/catalog/metadata -> persistence/secret/provider adapters`.

Startup transition is a separate lane: `server runtime -> app-data runner -> migration definition/adapters -> current V3 runtime`. Normal provider services do not cross into migration internals.

## Change / Refactor Sequence

1. Treat the implemented SR-016 custom metadata, Qwen configuration/catalog/routing, readable identity/reset, and missing-selector behavior as a locked baseline; do not reopen it for presentation.
2. Modify only `autobyteus-web/utils/modelSelectionLabel.ts` to use a nonblank Qwen `name` before the generic default-AutoByteus identifier branch.
3. Extend the focused helper unit contract for Qwen option/selected text while retaining generic built-in and custom OpenAI-compatible assertions.
4. Verify Settings plus at least one shared runtime/binding consumer displays friendly names, keeps exact `qwen:...` option identity, and retains prior exact `model.value` wire evidence.
5. Repeat focused source review, API/E2E coverage investigation/execution, and delivery packaging for the presentation delta. Run broader regressions only where downstream investigation finds them applicable.

No temporary runtime dual reader, alias, or secret fallback is permitted at any step.

## Key Tradeoffs

- **Exact safety over reach:** Unknown custom values remain unknown rather than guessed.
- **Native Qwen usefulness over compiled simplicity:** One user-configured route supports region/workspace/Token Plan without provider attributes.
- **Readable deterministic identity over collision auto-resolution:** Canonical collisions fail instead of receiving opaque suffixes.
- **Preserve selectors, reset provider records:** Legacy names are used transiently for mapping, while Base URLs/records are re-entered.
- **Ordinary recreation over reconnect/seamlessness:** Users enter name, Base URL, and key again through an existing path, eliminating secret-transfer and repair branches.
- **Optimistic transition over immediate crash convergence:** Ordinary runner delay and manual stale-selector repair are accepted; no custom transaction protocol.
- **Current composite selector over global registry refactor:** Solves the present identity defect without broad churn.
- **Friendly presentation over exposing registry syntax:** Users recognize provider-qualified model names; internal collision safety remains unchanged.
- **Shared policy over Settings expedience:** One additional condition updates every active catalog-backed surface and avoids inconsistent copy.

## Risks

1. A recreated endpoint may no longer advertise a saved model suffix, or the user may choose a different name; the migrated selector remains unavailable until reselection.
2. Canonical/slug collisions or invalid legacy names reset the provider set to empty V3 with warnings; users recreate/reselect.
3. Individual unwritable/malformed/concurrently changed selector targets remain stale by design.
4. Process interruption can block immediate startup until ordinary stale-`RUNNING` retry; this is explicit product posture.
5. Old secret cleanup can leave unreachable vault orphan; no runtime fallback may use it.
6. Qwen URL and key span two owners; bounded compensation covers single write failures, while double failure is explicitly repair-required.
7. Future required migrations appended after readable can violate ordering; registry invariant/review must catch it.
8. API-REV-009 current evidence proves the old display and correct routing, but it must not be mistaken for approval to keep the old display after SR-017.
9. Branch divergence remains delivery-owned integration risk.
10. A future active model-selection surface could bypass the shared helper and re-expose internal selectors; source review and focused inventory tests mitigate this without a generalized UI framework.
11. A blank future Qwen `name` must fall back to the identifier; the nonblank guard prevents an empty label.

## Guidance For Implementation

- Treat `requirements.md`, this design, and both supplements as authority. Preserve the ARCH-REV-010/DR-009 SR-016 baseline; do not touch migration, provider identity, Qwen persistence, or core catalog/routing for this presentation change.
- Preserve exact model suffix bytes, internal selectors, and wire values. Never send `modelIdentifierOverride` to a provider.
- Keep UI missing selections raw and visible; do not add a historical label map, clear the selection, or choose a fallback.
- Implement SR-017 in `autobyteus-web/utils/modelSelectionLabel.ts`; do not edit Qwen definitions merely to hide the prefix, because their names/identifiers/values are already correct.
- Keep `id: model.modelIdentifier` in grouped options and keep selected/persisted values exact. Only `name`/`selectedLabel` text changes.
- Do not add Qwen presentation logic to `ProviderModelBrowser.vue`, `SearchableGroupedSelect.vue`, individual application forms, or binding components.
- Extend `modelSelectionLabel.spec.ts` with a Qwen duplicate and assert option plus provider-qualified selected text. Preserve the generic AutoByteus built-in and custom OpenAI-compatible regression cases.
- Add/adjust only proportionate consumer/browser coverage: Settings plus one shared runtime/binding selector, and retain exact GraphQL/request-value assertions. API/E2E must not reinterpret friendly text as the selected ID.
- A missing catalog selector remains raw because no `ModelInfo` reaches the helper. Do not maintain a historical label map.
- Implementation engineer owns source changes and `implementation-handoff.md`; solution artifacts must not be replaced by implementation notes.
