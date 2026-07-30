# Design Spec

## Current-State Read

Custom OpenAI-compatible models intentionally have two identities. The shared LLM catalog constructs `openai-compatible:<providerId>:<modelName>` as the canonical `modelIdentifier` so identical model names from different saved endpoints remain distinct. The model object and token-usage observation also carry the short `modelValue`; the ledger persists both fields. This is healthy runtime and persistence design.

The defect is at the Token Statistics presentation boundary. `buildTokenUsageCostSummaryAggregate` currently exposes only `observed_model_identifiers`. `TokenUsageStatisticsProvider` groups by runtime plus that canonical identifier and returns it as `modelIdentifier`; GraphQL maps it directly to `llmModel`. The task tree copies the same raw list to `models`. The Vue model and task tables render those values verbatim. The provider-scoped identity therefore leaks into a user-facing column even though the short model value is already available in the ledger. The requested AutoByteus presentation additionally needs the provider display name. The current registry and built-in mapping can supply it, but the new target also captures it once at ingestion in one nullable ledger `provider_name` snapshot so future rows remain readable after provider rename/deletion.

The target design keeps the current identity and accounting aggregate owners. It adds one nullable `provider_name` ledger snapshot for AutoByteus events, propagated from the existing model metadata through observation, domain payload, SQL repository, and Prisma, plus a separate provider-aware model-display projection beside the accounting aggregate. The projection prefers the persisted snapshot and uses a provider-name context only for legacy AutoByteus rows without one. This avoids changing the shared cost aggregate consumed by total-cost, run-summary, and GraphQL summary paths. The Model and recursive Task statistics paths carry raw identity plus display metadata through GraphQL and frontend hydration, render `<provider name>:<model name>` only for AutoByteus rows, and preserve existing labels for other runtimes. Direct Codex/Claude events retain nullable `provider_name` and their existing non-AutoByteus behavior. Two idempotent app-data corrections are ordered after the schema migration: the existing value-only composite `model_value` backfill and an AutoByteus provider-name snapshot backfill for recoverable null/empty values. Neither changes `model_identifier`, grouping, pricing, or counts.

## Intended Change

1. Add optional `providerName` to the canonical token-usage model identity and observation schema. For AutoByteus events, populate it from the model’s existing `providerName` on the shared normalizer path; direct Codex/Claude producers remain nullable because no configured/saved provider name exists in scope. Keep `modelProvider`, `modelIdentifier`, and `modelValue` semantics unchanged. Map the optional value into the server domain payload and nullable Prisma/SQL `provider_name` column.
2. Add a token-usage-owned display-name resolver beside the existing raw identifier normalizer. The resolver accepts runtime/provider/model facts, persisted `provider_name`, and a provider-name context; it does not read files or credentials itself.
3. For `runtime_kind = autobyteus`, prefer a non-empty persisted `provider_name`; for legacy null/empty snapshots, resolve the provider portion from the current custom-provider `{id,name}` map for `OPENAI_COMPATIBLE`, or from the existing built-in provider-display-name mapping. Resolve the model portion from non-empty `model_value`; if that value is itself a validated composite identifier, normalize it to its complete suffix. If it is unavailable, recognize `openai-compatible:<providerId>:<modelName>` in `model_identifier` and preserve the complete suffix, including additional `:` characters.
4. Return `<provider name>:<model name>` for AutoByteus. If provider/model metadata is missing, use a deterministic non-empty fallback that leaves raw identity available. For non-AutoByteus runtimes, preserve the current visible model-label behavior.
5. Add a separate `TokenUsageModelDisplayEntry` projection beside the accounting aggregate. It returns one `{modelIdentifier, modelDisplayName}` entry per unique raw identifier, ordered exactly like the existing `observed_model_identifiers` order. Keep `TokenUsageCostSummaryAggregate` accounting-only so `getTotalCost`, run-summary adaptation, synthetic `summaryAggregate()`, pricing, and existing aggregate GraphQL mappings remain unchanged.
6. Add `modelDisplayName` to runtime/model statistics rows and `modelDisplayNames` to task statistics rows. Keep raw `modelIdentifier`/`llmModel` and `models` fields unchanged for grouping, attribution, diagnostics, and future consumers. Task arrays must be equal length and positionally aligned; duplicate display names are retained when raw identifiers differ.
7. Have `TokenUsageStatisticsProvider` load the custom-provider name map once per statistics query and pass it to the display projection and recursive task-tree aggregation. Do not perform one registry read per event or row. Total-cost and run-summary consumers use the accounting aggregate without the display projection.
8. Expose the new display fields in GraphQL and request them in the frontend statistics queries. Normalize them in the Pinia store with a raw-field fallback only when the display field is absent/empty, then render display fields in the model table/chart and task table.
9. Add two required app-data migration definitions registered with the existing `AppDataMigrationRegistry`: retain the fixed-ID value migration for legacy composite `model_value`, and add `20260730_token_usage_provider_name_snapshot_backfill` after it and before legacy-path cleanup. The new migration is scoped to AutoByteus rows and fills only null/empty `provider_name` values when the built-in provider mapping or current custom-provider registry recovers an exact name; direct Codex/Claude rows are scope mismatches, and deleted/unavailable custom IDs are warned and never guessed. Both migrations update rows idempotently through an owned database boundary, preserve row counts/raw identifiers/accounting, and follow the runner lifecycle contract below.
10. Add focused ingestion, schema/repository, server, migration, and frontend tests covering every named AutoByteus shared normalizer, direct Codex/Claude null preservation, nested/top-level payload precedence and conflict flag, `alibaba_cloud:qwen3.8-max-preview`, built-in AutoByteus provider:model output, preserved non-AutoByteus labels, two providers with the same model name remaining separate raw rows, colon-containing suffixes, missing/deleted provider fallback, missing/unknown model fallback, aligned recursive Task arrays, all accounting aggregate consumers, migration idempotence, partial progress, retry, and row-preserving skips.

## Provider-Name Ingestion Source Matrix (Mandatory)

The provider-name snapshot is an AutoByteus ingestion contract, not a statistics-time inference. Every supported AutoByteus shared-normalizer producer below must populate `provider_name` before the event reaches the common payload boundary. Direct Codex/Claude producers are named preserved nullable paths: they have no configured/saved provider name in this feature scope, so their `provider_name` stays null and their existing model facts remain unchanged. The source shape is intentionally explicit because shared `autobyteus-ts` observations are nested while direct Codex/Claude events are top-level.

| Producer family / exact source | Provider-name source and value | Event shape and propagation | Persistence and required proof |
| --- | --- | --- | --- |
| Shared AutoByteus `autobyteus-ts` normalizer: `src/llm/api/autobyteus-token-usage-normalizer.ts:createAutoByteusTokenUsageObservation` | `LlmTokenUsageModelIdentity.providerName` / `model.providerName`, already resolved by `LLMModel` from explicit metadata or the existing readable provider mapping. This snapshot is required when the event runtime is AutoByteus; for a shared path used outside that runtime, it remains nullable. | `src/llm/utils/llm-token-usage-observation.ts:LlmTokenUsageObservationSchema.provider_name` and `buildLlmTokenUsageObservation` add the nested field; the same central field is used by `openai-compatible-token-usage-normalizer.ts:createOpenAICompatibleTokenUsageObservation`, `anthropic-token-usage-normalizer.ts:createAnthropicTokenUsageObservationFromAccumulator` and its wrapper, `gemini-token-usage-normalizer.ts:createGeminiTokenUsageObservation`, and the inline response observation in `ollama-llm.ts`. Shared notifier/stream payloads retain it at nested `usage.provider_name`. | Test each named AutoByteus normalizer (including the Anthropic accumulator/wrapper and Ollama inline path) plus nested event-to-ledger read-back. `model_provider`, `model_identifier`, `model_value`, token counts, and costs remain unchanged. |
| Preserved direct Codex server producer: `src/agent-execution/backends/codex/thread/codex-thread-token-usage.ts:resolveCodexThreadTokenUsage` and `src/agent-execution/backends/codex/backend/codex-agent-run-backend.ts:consumeReadyTokenUsageEvents` | No configured/saved provider name exists for Codex in this feature scope. Preserve nullable `provider_name`; retain the existing `model_provider = OPENAI`, `model_identifier`, and model value. Do not use the catalog mapping to invent `OpenAI` here. | `CodexReadyTokenUsageUpdate` keeps top-level model fields and nullable `provider_name`; the backend forwards them unchanged into the common `AgentRunEvent` payload. `codex-app-server-model-normalizer.ts` has a related display mapping but is not a token-event provider-name source. | Test direct Codex producer -> backend forwarding -> common payload -> ledger persistence and read-back, asserting null remains null and raw identity/accounting are unchanged. |
| Preserved direct Claude server producer: `src/agent-execution/backends/claude/session/claude-session-token-usage.ts:buildClaudeTokenUsageEvent` and `src/agent-execution/backends/claude/events/claude-session-event-converter.ts` | No configured/saved provider name exists for Claude Code in this feature scope. Preserve nullable `provider_name`; retain the existing `model_provider = ANTHROPIC`, `model_identifier`, and model value. Do not invent `Anthropic` here. | The `TOKEN_USAGE_UPDATED` session event carries top-level `params` model fields with nullable `provider_name`; the converter serializes `event.params` unchanged into the common `AgentRunEvent` payload, which then follows normal enrichment/persistence. | Test direct Claude producer -> session converter -> common payload -> ledger persistence and read-back, asserting null remains null and raw identity/accounting are unchanged. |
| Common payload canonicalization: `src/agent-execution/domain/agent-run-token-usage.ts:createTokenUsageUpdatedPayload` | No provider lookup. It selects the producer-supplied snapshot when one exists. | A non-empty `source.provider_name` (top-level) wins; otherwise a non-empty `source.usage.provider_name` (nested) is used. If both are non-empty and differ after the defined normalization, retain the top-level value and add quality flag `provider_name_top_level_nested_conflict`. Missing both remains nullable for direct Codex/Claude and unsupported/legacy synthetic payloads; the boundary never fabricates a value from provider type or model identity. | Test nested-only AutoByteus payload, direct Codex/Claude payload with null, equal duplicate values, conflicting values/flag, and missing-value compatibility. |
| Common enrichment, forwarding, and storage: `token-usage-event-enrichment-transformer.ts`, `token-usage-context-enricher.ts`, persistence processor, `TokenUsageLedgerStore`, SQL repository, and `prisma/schema.prisma` | Preserve the selected snapshot or null; do not replace it from run configuration, current provider registry, or runtime kind. | Context enrichment may add/normalize run context and accounting basis but must leave `provider_name` unchanged. Event forwarding carries it to the ledger append; SQL/Prisma map `provider_name` <-> `providerName` and repository read-back returns the same snapshot/null. | Test AutoByteus nested, direct Codex null, and direct Claude null round trips through enrichment, forwarding, SQL/Prisma, and ledger read-back; separately assert raw identity, grouping, attribution, counts, pricing, and accounting are unchanged. |

The direct Codex/Claude decision is intentionally the preserved nullable contract, not a built-in provider-name mapping: those runtimes have no configured/saved provider name in this feature scope and are outside the AutoByteus custom-provider readability use case. The snapshot exists because AutoByteus custom rows have generic `OPENAI_COMPATIBLE` in `model_provider` and need their configured custom name; AutoByteus built-in provider IDs already correspond to readable names. No direct runtime label is guessed, and no new event relies on a statistics-time registry lookup.

### Provider-Name Payload Precedence

The common payload boundary is the only place that reconciles nested and top-level shapes. A non-empty top-level `provider_name` is authoritative; a non-empty nested `usage.provider_name` is the fallback. If both are present but differ, preserve the top-level value and attach `provider_name_top_level_nested_conflict`; do not overwrite either raw identity field and do not fail the event solely for this display-metadata conflict. If neither is present, preserve null—including for direct Codex/Claude. Context enrichment, event forwarding, and persistence are pass-through for the selected snapshot/null.

## Display Resolution Policy

The implementation must keep this policy in one pure server-side resolver so Model and recursive Task statistics cannot diverge. The resolver never reads files; each event supplies its persisted `provider_name` when available, and the statistics provider supplies an immutable current provider-name map only for legacy null/empty snapshots and records whether loading it failed.

### Exact Precedence And Fallback Contract

1. Normalize `runtime_kind` with `trim().toLowerCase()` for policy selection. Only `autobyteus` receives a provider prefix. Every other runtime uses the existing raw identity precedence: trimmed `model_identifier`, then trimmed `model_value`, then `Unknown`.
2. Parse a composite only with the anchored grammar `^openai-compatible:([^:]+):(.+)$` after trimming the whole value. The provider ID and suffix must both be non-empty after trimming. The suffix preserves every subsequent colon and character, including `org/model:tag`.
3. For custom AutoByteus rows, inspect `model_identifier` and `model_value` as follows:
   - If `model_value` is non-empty and does not begin with `openai-compatible:`, use it as the model name, including ordinary model names containing additional colons.
   - If `model_value` begins with `openai-compatible:` but fails the anchored grammar, classify it as malformed for display: ignore it, then use the valid raw composite suffix/provider when available; otherwise use the exact `Unknown Provider:Unknown Model` fallback. It is never treated as an ordinary model name.
   - If `model_value` is composite and `model_identifier` is empty, use the value’s parsed provider ID and suffix for display but classify the row as `RAW_IDENTITY_MISSING` for migration.
   - If both values are composite and their provider IDs and suffixes match after trimming, use the suffix.
   - If both values are composite but disagree, ignore the conflicting `model_value` for display and use the raw `model_identifier` provider ID/suffix; migration classifies it as `CONFLICTING_COMPOSITE_VALUES`.
   - If `model_value` is composite and `model_identifier` is non-composite or disagrees, use the raw identifier as the authoritative model source when it is non-empty; otherwise use the parsed value only for display fallback.
   - If `model_value` is empty, use the parsed `model_identifier` suffix when available; otherwise use the raw value.
4. Resolve the AutoByteus provider label exactly in this order:
   - A non-empty trimmed persisted `provider_name` snapshot -> that snapshot. It is display metadata only and is never used for grouping or provider routing.
   - With a null/empty snapshot, a matching custom provider ID in the successfully loaded map -> its trimmed saved `name`.
   - With a null/empty snapshot, a missing/deleted custom provider ID or provider-map load failure -> `OpenAI-Compatible (<providerId>)`.
   - With a null/empty snapshot, a recognized built-in provider enum -> `getLlmProviderDisplayName(model_provider)`.
   - A non-empty unrecognized provider -> `Unknown Provider (<trimmed model_provider>)`.
   - Missing provider -> `Unknown Provider`.
5. Resolve the AutoByteus model label exactly in this order: validated model suffix from the authoritative raw composite (or matching composite value); non-composite non-empty `model_value`; non-empty raw identifier only when it is not a malformed composite marker; `Unknown Model`.
6. For AutoByteus, return `${providerLabel}:${modelLabel}`. Thus missing values remain non-empty and deterministic, e.g. `OpenAI-Compatible (provider_123):qwen3`, `Unknown Provider:deepseek-v4-flash`, or `Unknown Provider:Unknown Model`.
7. The resolver never throws, never changes raw grouping, and never uses display labels as row IDs or deduplication keys. Provider-map load failure is treated exactly like a missing custom-provider record for display and does not fail the statistics query.

### Model/Task Display-Entry Alignment Contract

The display projection returns `TokenUsageModelDisplayEntry[]` in the same deterministic order as the existing raw identifier list: unique raw identifiers sorted by the existing `uniqueStrings` ordering, with exactly one entry per raw identifier. For Model rows, each grouped event set has one runtime kind because the raw grouping key is `runtimeKind + modelIdentifier`, so `modelDisplayName` is resolved from that group. For a Task row, if one raw identifier appears under multiple runtime kinds, there is no single truthful runtime-specific label; that entry deliberately uses the unchanged normalized raw identifier rather than incorrectly applying the AutoByteus prefix to every runtime. Task rows copy the resulting entry sequence into two arrays:

```text
models[i] === modelDisplayEntries[i].modelIdentifier
modelDisplayNames[i] === modelDisplayEntries[i].modelDisplayName
models.length === modelDisplayNames.length
```

Display names are not independently sorted or deduplicated. If two different raw identifiers resolve to the same display label, both positions remain present. Every recursive constructor (`buildStandaloneAgentRow`, `buildTeamRow`, `toRow`, `buildLegacyMemberRow`) and the empty-children/empty-model path uses this same entry sequence; no constructor may rebuild either array independently.

## Legacy Data Correction / App-Data Migration

The persisted-data change has two separate, narrowly owned corrections. Both run only after the Prisma schema migration has created nullable `provider_name`. Neither rewrites the canonical `model_identifier`, changes row identity/grouping, changes token/cost fields, or merges rows. The display resolver remains safe before, between, or after the app-data migrations.

### Schema And Ingestion Prerequisite

- Extend `TokenUsageLedgerEvent` with nullable `providerName String? @map("provider_name")`.
- Extend the central `LlmTokenUsageModelIdentity` and observation schema/builder with optional `providerName`; AutoByteus shared normalizers pass the model’s existing `providerName` through the shared builder.
- The shared AutoByteus producer list is exact: `createAutoByteusTokenUsageObservation`, `createOpenAICompatibleTokenUsageObservation`, `createAnthropicTokenUsageObservationFromAccumulator` and its wrapper, `createGeminiTokenUsageObservation`, and the inline `OllamaLLM` response observation. Each passes `model.providerName` so the nested observation contains `provider_name`; this is required only when the event runtime is AutoByteus.
- Direct producers are separate from the shared builder: `resolveCodexThreadTokenUsage` and `buildClaudeTokenUsageEvent` preserve nullable top-level `provider_name` and their existing model fields. Their server forwarders preserve null and do not add `OpenAI`/`Anthropic` labels.
- Extend the server agent-run token-usage payload, SQL repository create/read mapping, and Prisma migration. A missing value is allowed for old rows and legacy runtimes during rollout.
- New AutoByteus built-in events persist the readable mapping name, for example `provider_name = DeepSeek` with `model_provider = DEEPSEEK`. New custom endpoint events persist the configured endpoint `name`, for example `provider_name = alibaba_cloud` with `model_provider = OPENAI_COMPATIBLE` and `model_identifier = openai-compatible:provider_A:qwen3.8-max-preview`.
- `provider_name` is display metadata only. It is not a routing key, provider ID, grouping key, pricing key, or secret. The canonical provider-scoped identity remains `model_identifier`.

### Migration A: Legacy Composite `model_value`

| Concern | Design |
| --- | --- |
| Migration ID | `20260730_token_usage_custom_provider_model_value_backfill` (fixed; referenced by tests and operational logs). |
| Startup ordering | `requiredOnStartup = true`; register after `TokenUsageExecutionAddressBackfillMigration`, then register the provider-name snapshot migration, and keep both before `TokenUsageLegacyPathColumnsDropMigration`. Prisma migrations run before both app-data definitions. |
| Scan scope | List ledger rows with non-empty `model_value` and classify scope as `trim(runtime_kind).toLowerCase() === "autobyteus"` and `trim(model_provider).toUpperCase() === "OPENAI_COMPATIBLE"`. Current provider-registry membership is not required; deleted providers can still have their model suffix repaired. Other rows are `SKIPPED_SCOPE_MISMATCH`. |
| Exact parser | Parse only values matching the case-sensitive anchored grammar `^openai-compatible:([^:]+):(.+)$` after trimming the whole value. Capture provider ID as group 1 and the complete suffix as group 2; trim both captures for validation/comparison and preserve every interior suffix colon/character. |
| Exact decision matrix | Scope mismatch -> `SKIPPED_SCOPE_MISMATCH`. In-scope value beginning with `openai-compatible:` but failing the grammar -> `SKIPPED_INVALID_COMPOSITE_MODEL_VALUE`. Valid non-composite value -> `SKIPPED_VALID_NON_COMPOSITE`. Valid composite plus missing raw identifier -> `SKIPPED_RAW_IDENTITY_MISSING`. Both composite with equal provider ID and suffix -> `MIGRATE`. Both composite with any difference -> `SKIPPED_CONFLICTING_COMPOSITE_VALUES`. Composite value plus non-composite raw identifier -> `SKIPPED_RAW_IDENTITY_NOT_COMPOSITE`. All decisions occur before a write. |
| Transformation | For `MIGRATE`, update only `model_value` to the parsed complete suffix. Use compare-and-set on row ID and original `model_value`; zero affected rows becomes `SKIPPED_SOURCE_CHANGED`. Leave `model_identifier`, provider fields, token fields, costs, timestamps, attribution, pricing, and identity columns untouched. |
| Safety/idempotence | Do not require provider registry membership; do not infer provider names; do not rewrite a valid ordinary colon-containing model name such as `org/model:tag`; do not guess when raw/value disagree. A normalized short value is skipped on rerun, while independently completed rows remain durable. |

### Migration B: Provider-Name Snapshot Backfill

| Concern | Design |
| --- | --- |
| Migration ID | `20260730_token_usage_provider_name_snapshot_backfill` (fixed; referenced by tests and operational logs). |
| Startup ordering | `requiredOnStartup = true`; register immediately after Migration A and before `TokenUsageLegacyPathColumnsDropMigration`. The registry order is authoritative; do not rely on filesystem order. |
| Scan scope | List ledger rows whose `provider_name` is null, empty, or whitespace-only, then classify only `trim(runtime_kind).toLowerCase() === "autobyteus"` as eligible. Existing non-empty snapshots are `SKIPPED_ALREADY_POPULATED`; non-AutoByteus rows, including direct Codex/Claude events, are `SKIPPED_SCOPE_MISMATCH`. The migration is value-only and does not scan or rewrite rows with a usable snapshot. |
| Provider-name source | Within AutoByteus scope, a recognized built-in `model_provider` uses `getLlmProviderDisplayName(model_provider)`. For `OPENAI_COMPATIBLE`, parse the canonical `model_identifier` with `^openai-compatible:([^:]+):(.+)$`, look up that provider ID in the current custom-provider registry snapshot, and use the trimmed configured `name` only when it is non-empty. |
| Unrecoverable classification | A deleted/unknown custom provider ID, empty/malformed canonical identity, missing provider type, or empty configured name becomes `SKIPPED_PROVIDER_NAME_UNRECOVERABLE` with the raw row ID/provider identity in migration details. A global provider-map load failure is a migration `FAILED` dependency error, not a warning classification, so a retry can recover it. The migration never guesses `OpenAI-Compatible`, extracts a name from an opaque ID, or copies `model_identifier` into `provider_name`. |
| Transformation | For a recoverable name, update only `provider_name` through compare-and-set on row ID and null/empty original state (`provider_name IS NULL OR trim(provider_name) = ''`). Trim the saved name before writing. A zero affected row becomes `SKIPPED_SOURCE_CHANGED`; another writer’s non-empty value wins. |
| Invariants | Preserve row count, raw `model_identifier`, `model_value`, provider type, token/cost/accounting fields, timestamps, and raw JSON. Never store API keys, base URLs, or credentials. |
| Existing-data limitation | A legacy row created before snapshots cannot recover the historical name of a deleted provider from the opaque ID alone. It remains null, displays the deterministic current/fallback label, and is reported as a warning. An explicit operator-supplied mapping is a separate future operation, not an implicit guess. |

### Shared Migration Lifecycle, Partial Update, And Recovery Contract

- Both definitions use the existing `AppDataMigrationRegistry`/`AppDataMigrationRunner`. The runner executes definitions in registry order after Prisma migrations, records status/log details, catches definition failures so startup continues, and does not make Token Statistics unavailable while a migration is pending or failed.
- Each successful row update is committed independently through an injected database boundary. A run may make durable partial progress; it is not an all-rows transaction.
- A row-update error is recorded as a failed detail and scanning continues. If any update error occurs, that migration returns `FAILED`; already committed updates remain valid and a later retry skips completed rows and retries unresolved eligible rows.
- A scan, provider-map load, preflight/final count, database connectivity, or invariant failure returns `FAILED` with preserved partial-progress counts. A row-count change or raw-identity change is a failed invariant.
- If there are no update errors, safe skips such as scope mismatch, valid non-composite values, already-populated snapshots, and source-changed rows that no longer need this migration return `SUCCEEDED`. Unsafe/ambiguous/unrecoverable classifications such as invalid composites, raw/value conflicts, missing identity, or deleted provider names return `SUCCEEDED_WITH_WARNINGS`.
- `runPending()` treats `SUCCEEDED` and `SUCCEEDED_WITH_WARNINGS` as terminal; it retries `NOT_RUN` and `FAILED`. Explicit `runMigration(id)` may rerun a warning migration after an operator changes provider configuration or supplies a recovery condition; reruns remain idempotent and only update null/empty provider snapshots or still-composite values.
- Read-time display is safe in pending, failed, warning-complete, partially updated, and fully complete states. New ingestion snapshots make future rows independent of provider-registry availability; unresolved legacy rows use the exact fallback contract.
- Tests must cover schema/repository round-trip, every named AutoByteus ingestion normalizer, AutoByteus built-in/custom new rows, direct Codex/Claude nullable round-trip preservation, provider rename/deletion after AutoByteus ingestion, current-registry recovery for legacy AutoByteus rows, unrecoverable deleted IDs, provider-map load failure, partial durable updates, startup continuation, warning terminal status, failed retry, explicit recovery rerun, and row-count/raw-identity/accounting invariants.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind (`User`/`System`/`Operational`/`Contract`) | Approved Requirement / Intent And Acceptance-Criteria IDs | Approved Trigger Or Governing Contract | Relevant Existing Behavior And Evidence Reference | Approved Change Or Preserved Outcome | Target Production Path / Lifecycle And Spine ID(s) |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-TOKMODEL-001 | User | `REQ-TOKMODEL-001`; `AC-TOKMODEL-001`, `AC-TOKMODEL-002` | User fetches a Token Statistics date range and chooses Task or Model grouping. | Raw AutoByteus custom identifier flows through GraphQL and is rendered verbatim; see investigation `TokenUsageStatisticsProvider`, GraphQL resolver, and both Vue tables. | Render `<provider name>:<model name>` in both modes, preferring the persisted snapshot and using current saved metadata only for legacy null/empty snapshots; preserve raw identity. | Ledger events + persisted/current provider-name context -> accounting aggregate + model-display projection -> GraphQL display fields -> store -> tables/chart (`DS-TOKMODEL-002`). |
| BEH-TOKMODEL-002 | System / Contract | `REQ-TOKMODEL-002`; `AC-TOKMODEL-003` | Token usage contract records provider, canonical identifier, and model value. | `OpenAICompatibleEndpointModel` intentionally builds the composite identifier; SQL ledger stores both values, but current events do not store provider display name. | Keep raw identifier as grouping, row ID, attribution, pricing, and diagnostic identity. Add one display snapshot without replacing raw data. | Runtime model identity -> observation -> enrichment -> ledger (`DS-TOKMODEL-001`); raw grouping remains in `DS-TOKMODEL-002`. |
| BEH-TOKMODEL-003 | User | `REQ-TOKMODEL-001`, `REQ-TOKMODEL-002`; `AC-TOKMODEL-001`, `AC-TOKMODEL-002`, `AC-TOKMODEL-004` | User chooses Task grouping. | Task builder copies raw identifiers into `models`, and task table renders it. | Keep raw `models`; add `modelDisplayNames` from the same ordered display-entry sequence for every recursive row. | Ledger events + provider-name context -> task tree builder + display projection -> GraphQL task row -> store -> task table (`DS-TOKMODEL-002`). |
| BEH-TOKMODEL-004 | Contract | `REQ-TOKMODEL-003`; `AC-TOKMODEL-003` | Ledger row is built-in AutoByteus or belongs to another runtime. | Current projection returns raw model identity and tables render it. | Use provider:model for AutoByteus built-ins; preserve current non-AutoByteus visible labels. | Display resolver and runtime-specific policy (`DS-TOKMODEL-002`). |
| BEH-TOKMODEL-005 | Contract | `REQ-TOKMODEL-004`; `AC-TOKMODEL-005` | Ledger row lacks `model_value`, has malformed identity, or has missing provider configuration. | Current identifier normalizer returns raw identifier/`Unknown`; no display-specific handling exists. | Apply the exact provider/model precedence and fallback contract; never throw or merge raw groups. | Model-display projection and store fallback (`DS-TOKMODEL-002`). |
| BEH-TOKMODEL-006 | Operational / Contract | `REQ-TOKMODEL-005`; `AC-TOKMODEL-006` | Existing ledger row contains the composite custom identity in `model_value`. | Statistics may expose the long stored value; no legacy-value backfill exists. | Apply the exact classifier and lifecycle contract; backfill only the validated model suffix, preserve `model_identifier`, and keep display resolution safe before/without migration. | Startup app-data migration -> ledger row update -> model-display projection (`DS-TOKMODEL-004`, `DS-TOKMODEL-002`). |
| BEH-TOKMODEL-007 | Contract | `REQ-TOKMODEL-006`; `AC-TOKMODEL-008` | The accounting aggregate is shared by total-cost, run-summary, synthetic GraphQL summary, and Model/Task statistics. | Provider display context is not currently part of the aggregate contract. | Keep the accounting aggregate unchanged for every shared consumer; add display metadata only in the Model/Task model-display projection. | Accounting aggregate consumers remain on `DS-TOKMODEL-002` without display context. |
| BEH-TOKMODEL-008 | Contract | `REQ-TOKMODEL-007`; `AC-TOKMODEL-008` | Recursive Task constructors each copy aggregate model observations into row arrays. | No parallel display array exists and constructor drift is possible. | Derive raw/display arrays from one ordered entry sequence for all four constructors and empty paths. | Task tree builder + model-display projection (`DS-TOKMODEL-002`). |
| BEH-TOKMODEL-009 | System / Contract | `REQ-TOKMODEL-008`, `REQ-TOKMODEL-009`; `AC-TOKMODEL-009`, `AC-TOKMODEL-010` | A new AutoByteus token-usage event is persisted for a built-in or custom provider. | Current observation/domain/ledger path carries provider type and canonical identity but no provider display snapshot. Custom rows expose generic `OPENAI_COMPATIBLE`, so the configured custom name is needed; built-in IDs already map to readable names. | Capture one nullable `provider_name` for AutoByteus, map it through Prisma/SQL, prefer it for display, and backfill only recoverable legacy AutoByteus gaps. Direct Codex/Claude provider_name remains nullable and irrelevant. | AutoByteus model identity -> observation -> agent-run payload -> SQL ledger -> snapshot-first display projection (`DS-TOKMODEL-001`, `DS-TOKMODEL-004`). |
| BEH-TOKMODEL-010 | System / Contract | `REQ-TOKMODEL-008`, `REQ-TOKMODEL-010`; `AC-TOKMODEL-003`, `AC-TOKMODEL-009`, `AC-TOKMODEL-011` | Supported token usage arrives from AutoByteus shared normalizers or preserved direct Codex/Claude producers. | AutoByteus shared observations carry nested `usage.provider_name`; direct Codex/Claude events carry top-level model fields, bypass the shared builder, and leave provider_name nullable. | Implement the scope matrix: AutoByteus shared paths use `model.providerName`; direct Codex/Claude preserve null; common normalization selects a supplied top-level value over nested, records `provider_name_top_level_nested_conflict`, and context enrichment/storage preserve the selected value/null. | AutoByteus normalizers/direct nullable producers -> common payload -> enrichment/event forwarding -> SQL/Prisma ledger round-trip (`DS-TOKMODEL-001`). |

## Relevant Supplemental Task Artifacts

None. The requirements, investigation notes, and design spec fully capture the intended behavior and evidence; no separate UI/UX or data-mapping supplement materially improves this narrow table/API change.

## Task Design Health Assessment (Mandatory)

- Change posture: `Bug Fix` / `Behavior Change`
- Current design issue found: `Yes`
- Root cause classification: `Boundary Or Ownership Issue`
- Refactor needed now: `No`
- Evidence: The LLM catalog and ledger already separate canonical `model_identifier` from short `model_value`, but some historical deployments may have the composite value in both fields. The custom-provider store and built-in display mapping already own provider names; the missing boundary is propagating the model’s existing provider name through AutoByteus ingestion into one ledger snapshot. Direct Codex/Claude have no configured/saved provider name in scope and must remain nullable. The remaining work is a read-time statistics projection, complete Model/Task propagation, and correction of only recoverable legacy AutoByteus gaps.
- Design response: Keep provider identity construction, canonical ledger identity, accounting aggregate, statistics grouping, GraphQL raw fields, and existing UI components. Add one nullable `provider_name` snapshot for AutoByteus ingestion, preserve null on direct Codex/Claude paths, add a snapshot-first token-usage model-display projection with current-provider context only for legacy AutoByteus rows, explicit API/UI display fields, and two bounded app-data backfills.
- Refactor rationale: A larger identity/catalog refactor would increase risk and would be unrelated to the observed defect. A frontend provider-catalog lookup or raw-string parser would put server data semantics in the wrong owner and fail when the catalog is unavailable.
- Intentional deferrals and residual risk, if any: New AutoByteus events snapshot the provider display name, so rename/deletion does not change their historical label. Direct Codex/Claude events remain nullable and keep their existing non-AutoByteus display. Legacy AutoByteus rows with null/empty snapshots still depend on current configuration and may fall back after deletion; the backfill cannot recover a deleted provider’s old name and reports such rows without guessing. Rows with no usable `model_value` rely on the documented suffix/raw fallback.

## Terminology

- **Canonical model identifier:** Provider/runtime-scoped identity used to route, group, price, and attribute usage; for custom providers it is `openai-compatible:<providerId>:<modelName>`.
- **Provider:model display name:** For AutoByteus rows, `<provider name>:<model name>`; prefer the event’s persisted `provider_name`, then use the current saved provider registry/built-in mapping only for legacy null/empty AutoByteus snapshots. Codex/Claude and other non-AutoByteus rows retain their existing labels; nullable `provider_name` is irrelevant to their display. It is not a grouping key.
- **Raw model fields:** Existing API fields `modelIdentifier`/`llmModel` and `models`; they remain canonical identity data even though the tables stop rendering them.

## Design Reading Order

1. The display resolver is safe before migration; the two required app-data backfills correct legacy composite `model_value` and recoverable null/empty AutoByteus `provider_name` rows.
2. The runtime model object already supplies `providerName`, raw identity, and normally short model value; the ingestion spine must persist that provider name before ledger insertion.
3. The statistics provider owns one-per-query provider-name context loading only for legacy rows; the separate token-usage model-display projection owns snapshot-first display derivation for Task and Model statistics.
4. Migration A owns legacy-value classification; Migration B owns provider-name recovery. Both write through a database boundary and do not change canonical identity.
5. GraphQL carries raw identity and display label as separate fields.
6. Frontend tables render display fields without provider-catalog lookups or raw-string parsing.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- There is no obsolete file or storage path to remove. The in-scope legacy behavior is the direct use of raw identifiers as visible labels; remove that use from both Token Statistics table renderers.
- Retain raw API fields intentionally because they are canonical contract data, not compatibility wrappers. Do not introduce a second grouping path or replace raw row IDs.
- Do not add a frontend parser, per-row provider-catalog lookup, dual GraphQL field selection, or canonical-identity rewrite as a compatibility mechanism. The server statistics provider may load the current provider-name map once per query only as a legacy AutoByteus fallback. The explicitly scoped app-data migrations may normalize only validated legacy composite `model_value` values or fill null/empty AutoByteus `provider_name` with an exact recoverable name; they must not fill direct Codex/Claude nulls.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- Stored subject, location, representative shape, and approximate volume: `token_usage_ledger_events.provider_name`, `model_identifier`, and `model_value`; current local data includes `provider_name` absent in the current schema, `OPENAI_COMPATIBLE`, `openai-compatible:provider_25bbbdb1e3af4f958c597a3577d1fa:qwen3.8-max-preview`, and `qwen3.8-max-preview`.
- Relevant code-model, serialization, semantic, or physical-store change: Add nullable ledger `provider_name` and propagate it through observation/domain/SQL/Prisma. AutoByteus shared ingestion fills the snapshot; direct Codex/Claude remain nullable. Migration A performs a value-only correction to legacy `model_value`; Migration B fills recoverable null/empty AutoByteus `provider_name`; the read-time provider-name context, model-display projection/API/UI fields are extended while the accounting aggregate remains unchanged.
- Normal reader/writer behavior and representative evidence: Runtime observation normally writes both model fields; `SqlTokenUsageLedgerRepository` round-trips both. Existing rows with short values are unchanged; legacy composite values are corrected only by the guarded backfill.
- Required semantics and invariants under direct use: Raw identity, provider separation, pricing lookup, token/cost totals, row grouping, and historical visibility remain unchanged.
- Physical-store, privacy/security, disposal/rebuild, and operational constraints: The migration writes only validated derived `model_value` suffixes, does not access provider credentials, does not expose secrets, and must preserve row count and canonical identity. Startup ordering provides the normal ledger quiescence boundary; migration logs provide audit evidence.
- Decision: `Migration Required` for the nullable `provider_name` schema/ingestion rollout, legacy composite `model_value` correction, and provider-name snapshot backfill.
- Decision rationale, including concrete benefit versus I/O, downtime, corruption, recovery, and rollout cost: The user reports existing rows where the derived model value is already long and wants future ledger rows self-contained. The schema/ingestion change makes new rows independent of provider registry lifetime; read-time fallback keeps old rows safe while two bounded app-data backfills improve recoverable historical data. Updates are idempotent, row-preserving, and skip-safe; unrecoverable names remain null rather than being guessed. No canonical identity rewrite or second provider identity column is introduced.
- Acceptance criteria or design constraints supported by this decision: `REQ-TOKMODEL-002`, `REQ-TOKMODEL-004`, `REQ-TOKMODEL-005`, `REQ-TOKMODEL-006`, `REQ-TOKMODEL-007`, `REQ-TOKMODEL-008`, `REQ-TOKMODEL-009`, `AC-TOKMODEL-004`, `AC-TOKMODEL-005`, `AC-TOKMODEL-006`, `AC-TOKMODEL-007`, `AC-TOKMODEL-008`, `AC-TOKMODEL-009`, `AC-TOKMODEL-010`.

Migration implementation boundary: `TokenUsageCustomProviderModelValueBackfillMigration` and `TokenUsageProviderNameSnapshotBackfillMigration` are registered in `autobyteus-server-ts/src/app-data-migrations/app-data-migration-registry.ts`, run after the Prisma schema migration, and use injected database interfaces for list/update/count operations so classification and row-preservation behavior can be unit tested. Provider-name snapshot is the only added persisted display field; no second provider identity column is added.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-TOKMODEL-001 | `Primary End-to-End` | BEH-TOKMODEL-002, BEH-TOKMODEL-009, BEH-TOKMODEL-010 | AutoByteus shared observation or preserved direct Codex/Claude token producer | Persisted token-usage ledger event | Shared nested observation/direct top-level event -> `createTokenUsageUpdatedPayload` -> context enrichment/event forwarding -> SQL/Prisma | Establishes that AutoByteus supported producers supply the configured/readable snapshot, while direct Codex/Claude preserve nullable provider_name and all paths carry raw identity/accounting fields unchanged. |
| DS-TOKMODEL-002 | `Primary End-to-End` | BEH-TOKMODEL-001, BEH-TOKMODEL-003, BEH-TOKMODEL-004, BEH-TOKMODEL-005, BEH-TOKMODEL-006, BEH-TOKMODEL-007, BEH-TOKMODEL-008, BEH-TOKMODEL-009 | Ledger events in requested period plus persisted provider-name snapshots and legacy fallback context | Visible Token Statistics table/chart | `TokenUsageStatisticsProvider`, `TokenUsageTaskStatisticsTreeBuilder`, and model-display projection | Carries separate raw identity/grouping and snapshot-first provider:model display label through both UI modes, including legacy values before/after backfills, while accounting-only consumers remain unchanged. |
| DS-TOKMODEL-003 | `Return-Event` | BEH-TOKMODEL-001 | GraphQL response | Pinia state and rendered cells/chart labels | Frontend statistics store and table components | Ensures the display field, not raw identity, reaches user-facing labels. |
| DS-TOKMODEL-004 | `Bounded Local` | BEH-TOKMODEL-006, BEH-TOKMODEL-009 | Startup app-data migration scans | Corrected historical `model_value`/`provider_name` rows and migration records/logs | Two token-usage migration definitions plus token-usage database boundary | Repairs only validated derived values or recoverable snapshots, preserves raw identities/row count/accounting, and reports skips/failures. |

## Primary Execution Spine(s)

`Token usage ledger events -> TokenUsageStatisticsProvider / TokenUsageTaskStatisticsTreeBuilder -> TokenUsageStatisticsResolver -> Apollo query -> tokenUsageStatistics store -> TokenUsageModelStatisticsTable or TokenUsageTaskStatisticsTable`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-TOKMODEL-001 | Each AutoByteus observation carries the model’s provider type, provider display name, canonical identifier, and request value; direct Codex/Claude events carry their existing model facts with nullable provider_name. Enrichment fills run context and the SQL ledger persists the optional provider snapshot plus model fields. | LLM model, token usage observation, direct runtime event, enrichment transformer, ledger repository | Existing runtime/token-usage ingestion owners | Pricing resolution, token delta normalization, raw usage JSON |
| DS-TOKMODEL-002 | The statistics provider reads ledger events and loads a custom-provider `{id,name}` map once for legacy null/empty snapshots. It groups Model rows using runtime plus raw canonical identifier, while the model-display projection prefers persisted `provider_name`, resolves `<provider name>:<model name>` for legacy AutoByteus rows, and preserves current labels for other runtimes. The task tree carries raw `models` plus an aligned `modelDisplayNames` array from the same display-entry sequence. GraphQL exposes both. | Ledger event, provider-name context, accounting aggregate, model-display entry, model statistics row, task statistics row, GraphQL resolver | `TokenUsageStatisticsProvider` and `TokenUsageTaskStatisticsTreeBuilder` | Date filtering, accounting aggregate summaries, recursive task hierarchy |
| DS-TOKMODEL-003 | The frontend queries explicit display fields, normalizes them with raw-field fallback only for absent/empty payloads, and renders display values in the model cells, chart labels, and task model column. | GraphQL response, Pinia store, model table, task table, bar chart | Frontend statistics store/components | Localization, sorting, responsive table overflow |
| DS-TOKMODEL-004 | At startup, the app-data migration scans the ledger through a narrow database interface, classifies only validated composite `model_value` rows, updates the complete model suffix, and records migrated/skipped/failed details. | Migration definition, row classifier, ledger database adapter, migration runner | App-data migration owner plus token-usage persistence boundary | Startup ordering, retry semantics, row-count preservation, migration logs |

## Spine Actors / Main-Line Nodes

- `TokenUsageLedgerStore` / SQL repository: reads and writes canonical persisted events, including nullable `provider_name`.
- Runtime observation/enrichment path: owns propagation of the model’s provider display name into the ledger event.
- `TokenUsageStatisticsProvider`: owns raw runtime/model grouping, one-per-query custom-provider name-map loading for legacy rows, and model-row construction.
- `buildTokenUsageCostSummaryAggregate`: owns accounting totals and raw observed model metadata; it remains unchanged for total-cost/run-summary/synthetic aggregate consumers.
- `buildTokenUsageModelDisplayEntries`: owns pure provider/model display resolution and aligned raw/display entries for Model and Task statistics.
- `TokenUsageTaskStatisticsTreeBuilder`: owns recursive task/team grouping and row construction using the same display context and ordered display entries.
- `TokenUsageStatisticsResolver`: authoritative GraphQL boundary; maps domain rows to raw and display fields.
- `TokenUsageCustomProviderModelValueBackfillMigration`: owns one-time legacy-value classification/backfill and migration summary.
- `TokenUsageProviderNameSnapshotBackfillMigration`: owns recovery of null/empty provider snapshots and migration summary. Neither migration may rewrite canonical identity.
- `tokenUsageStatistics` Pinia store: hydrates GraphQL rows into typed frontend state.
- `TokenUsageModelStatisticsTable` and `TokenUsageTaskStatisticsTable`: render user-facing display labels only.

## Ownership Map

- **LLM model catalog:** owns canonical identity construction and model `name`/`value`; unchanged.
- **Token-usage ingestion and ledger:** owns persisted usage facts; extend the event/repository schema with one nullable provider display snapshot for AutoByteus while leaving direct Codex/Claude null, provider routing, and canonical identity unchanged.
- **Token-usage accounting aggregate:** owns token/cost totals and raw observed model metadata; all existing total-cost, run-summary, and GraphQL summary consumers remain on this accounting-only contract.
- **Token-usage model-display projection:** owns normalization of provider/model display metadata from event facts plus an immutable provider-name context. It must not change grouping or accounting semantics.
- **Legacy-data migrations:** own correction of validated composite `model_value` values and recovery of null/empty AutoByteus `provider_name` values through database interfaces; direct Codex/Claude nulls are out of scope and remain unchanged.
- **Statistics provider:** owns one-per-query custom-provider name-map loading, grouping by raw runtime/model identity, and row display attachment; it must not group by display name.
- **Task tree builder:** owns recursive task hierarchy and returns raw `models` plus display `modelDisplayNames` copied positionally from one ordered display-entry sequence.
- **GraphQL resolver:** is a thin public mapping boundary. It owns field names and maps raw and display values; it does not re-derive names.
- **Frontend store:** owns transport normalization and the defensive empty-display fallback; it does not inspect provider registry state.
- **Vue tables/chart:** own visual rendering only; they must not parse identifiers or perform model lookup.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `TokenUsageStatisticsResolver` | Statistics provider/tree builder and model-display projection | GraphQL transport contract and DTO mapping | Grouping, model parsing, accounting, or provider catalog I/O |
| `TokenUsageModelStatisticsTable` / `TokenUsageTaskStatisticsTable` | Frontend statistics store plus server display projection | Visible table/chart presentation | Canonical identity derivation or statistics semantics |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| Raw `llmModel` use as visible model-table text/chart label | It exposes provider registry identity. | `UsageStatistics.modelDisplayName` mapped from the token-usage model-display projection. | `In This Change` | Raw `llmModel` remains in the API for identity/debugging. |
| Raw `models` use as visible task-table model text | It exposes the same provider-scoped identity in Task mode. | `TokenUsageTaskStatisticsRow.modelDisplayNames`. | `In This Change` | Raw `models` remains unchanged in the API. |
| Frontend provider-catalog lookup or identifier parser | It would duplicate server model semantics and depend on catalog availability. | Server-owned display derivation. | `N/A` | Never add it for this task. |

## Return Or Event Spine(s) (If Applicable)

`GraphQL statistics query -> GraphQL response (raw identity + display field) -> Pinia normalization -> table/chart render`

The response is synchronous query data, not a runtime event. No WebSocket token-meter path changes because the defect is confined to historical Token Statistics projections.

## Bounded Local / Internal Spines (If Applicable)

The model-display projection performs a bounded array projection (`events -> unique ordered raw/display entries`) but no lifecycle loop or state machine materially shapes the normal statistics design. The startup migration is separately specified as `DS-TOKMODEL-004`.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Pricing/cost aggregate | DS-TOKMODEL-002 | Token-usage aggregate | Preserve token/cost semantics while model display metadata is added. | Statistics rows already carry cost summaries. | Display fix could accidentally alter accounting or price grouping. |
| Recursive task hierarchy | DS-TOKMODEL-002 | Task tree builder | Preserve team/member/task-child identity and sorting. | Task mode uses nested rows. | A model-label change must not flatten or regroup rows. |
| Generated GraphQL client artifact | DS-TOKMODEL-003 | Frontend build/codegen | Reflect the new query/schema fields. | Repository tracks `autobyteus-web/generated/graphql.ts`. | Stale generated types can hide a contract mismatch. |
| Localization/formatting | DS-TOKMODEL-003 | Vue tables | Existing model header/formatting remains unchanged. | No new user-facing copy is required. | Adding provider-specific wording would broaden scope. |
| Legacy-value backfill | DS-TOKMODEL-004 | App-data migration owner | Correct historical composite `model_value` rows before normal runtime/API reads. | Existing deployments may contain the long derived value. | Running parsing or writes in the statistics query would add latency and partial-update risk. |

## Ownership Boundaries

The authoritative identity boundary remains the token-usage event/ledger contract. The display boundary begins in the token-usage statistics provider, which joins current provider-name metadata once per Model/Task query, and continues in the separate model-display projection shared by those two statistics paths. The accounting aggregate remains an independent raw/cost boundary for all shared accounting consumers. GraphQL transports the two meanings separately. Frontend components consume the explicit display projection and do not reconstruct it.

The GraphQL resolver is an authoritative public boundary for statistics consumers. It calls the provider/tree builder and performs field mapping only. The aggregate normalizer is an internal owned mechanism encapsulated by the token-usage projection module.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `TokenUsageStatisticsProvider.getStatisticsPerRuntimeModel` | One-per-query provider-name context, raw runtime/model grouping, and aggregate construction | GraphQL resolver and tests | Grouping frontend rows by display name or provider ID; reading provider files per row | Return explicit raw identifier plus display name on each row and pass one immutable context. |
| `TokenUsageTaskStatisticsTreeBuilder.buildRows` | Recursive task hierarchy and per-row aggregate/display metadata | GraphQL resolver and tests | Rebuilding hierarchy or display values in Vue | Return explicit raw and display model arrays. |
| `TokenUsageStatisticsResolver` | Domain-to-GraphQL mapping | Apollo frontend clients | Reading repository/ledger from web code | Add explicit GraphQL display fields. |
| `TokenUsageCustomProviderModelValueBackfillMigration.execute` | Legacy derived-value correction | Startup migration runner and migration tests | Updating canonical `model_identifier`, grouping rows, or guessing malformed values | Return per-row counts/details and use an injected database boundary. |

## Dependency Rules

- Runtime/catalog code may continue to produce canonical identifiers and model values; this task must not make it depend on statistics/UI code.
- Token-usage accounting aggregate code may consume event accounting/raw fields only; it must not acquire provider-name context or change its accounting/raw contract.
- Token-usage model-display projection may consume event `runtime_kind`, `model_provider`, `provider_name`, `model_identifier`, and `model_value` plus an immutable provider-name context; it must not read files, query the provider registry, or access credentials itself.
- Statistics provider code may use `CustomLlmProviderStore.listProviders()` once per statistics query to build the provider-name context; it must not perform one lookup per event or row.
- Statistics grouping must use `runtimeKind + raw modelIdentifier`, never `modelDisplayName`.
- Migration A may update only validated composite `model_value` rows; Migration B may update only null/empty AutoByteus `provider_name` rows with an exact built-in mapping or current registry name. Direct Codex/Claude rows are scope mismatches. Neither may rewrite `model_identifier`, regroup rows, or infer a provider name from an untrusted/malformed value.
- The migration database adapter owns SQL list/update/count operations; the classifier owns parsing and safety decisions; the migration runner owns status, retry, and logs.
- GraphQL maps server fields; it must not parse custom-provider identifiers.
- Frontend store and tables may consume display fields and raw identity fields but must not call `LLMFactory`, read custom provider files, or parse identifier delimiters.
- The display field must never be used as a row ID, pricing key, deduplication key, or grouping key.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `normalizeTokenUsageModelIdentifier(event)` | Raw model identity | Return non-empty canonical raw identity or `Unknown`. | `model_identifier`, fallback `model_value` | Existing behavior preserved. |
| `TokenUsageModelDisplayContext` (new internal value) | Query-scoped legacy provider metadata | Carry an immutable `customProviderId -> name` map and provider-map load status for one statistics query. | Current `CustomLlmProviderStore.listProviders()` result | Used only when persisted `provider_name` is null/empty; no credentials. |
| `buildTokenUsageModelDisplayEntries(events, context)` (new) | Model presentation metadata | Return one ordered raw/display pair per unique raw identifier under the exact fallback contract. | `runtime_kind`, `model_provider`, `provider_name`, `model_value`, `model_identifier`, immutable provider-name context | Provider-specific display policy belongs in the model-display projection; config I/O stays in the statistics provider. |
| `TokenUsageRuntimeModelStatisticsRow` | Model diagnostics row | Carry raw grouping identity and display label. | `modelIdentifier` + `modelDisplayName` | Raw row ID remains based on raw identity. |
| `TokenUsageTaskStatisticsRow` | Task statistics row | Carry raw model list and display model list. | `models` + `modelDisplayNames` | Both arrays are aggregate-derived. |
| `TokenUsageCustomProviderModelValueBackfillMigration` | Legacy derived-value correction | Scan, classify, and idempotently update composite `model_value` rows. | `model_value` + validated `model_identifier` | Does not alter canonical identity. |
| `TokenUsageProviderNameSnapshotBackfillMigration` | Legacy display-metadata correction | Fill null/empty AutoByteus `provider_name` only from exact recoverable provider metadata; classify direct Codex/Claude as scope mismatches. | `runtime_kind` + `provider_name` + provider type/identity | Does not guess deleted names, fill direct nulls, or rewrite identity. |
| GraphQL `UsageStatistics` | Public model stats | Expose `llmModel` and `modelDisplayName`. | Raw + display strings | No replacement/rename of `llmModel`. |
| GraphQL `TokenUsageTaskStatisticsRowGraphql` | Public task stats | Expose `models` and `modelDisplayNames`. | Raw + display string arrays | No identity conflation. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `TokenUsageStatisticsProvider` query methods | Yes | Yes | Low | Load one provider-name context and pass it to all aggregate/tree work for the query. |
| `TokenUsageStatisticsProvider.getStatisticsPerRuntimeModel` | Yes | Yes | Low | Separate raw key and display field. |
| `TokenUsageTaskStatisticsTreeBuilder.buildRows` | Yes | Yes | Low | Add parallel display list; keep hierarchy unchanged. |
| GraphQL statistics types | Yes | Yes | Low | Add explicit `modelDisplayName(s)` fields. |
| Frontend table components | Yes | Yes | Low | Render display fields only. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Canonical identity | `modelIdentifier` / `llmModel` / `models` | Yes | Medium because `llmModel` sounds display-oriented | Preserve current public field for contract stability; document new display field. |
| Presentation label | `modelDisplayName` / `modelDisplayNames` | Yes | Low | Use consistently across server, GraphQL, store, and UI. |
| Raw/display pairing | `TokenUsageModelDisplayEntry` | Yes | Low | Use the entry as the source of truth for positional Task arrays; never independently sort/deduplicate display names. |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Canonical model identity | `autobyteus-ts` LLM model/catalog | `Reuse` | It already creates stable provider-scoped identifiers and short model values. | N/A |
| Token usage display projection | `autobyteus-server-ts/src/token-usage/projections` | `Create New` | A focused model-display projection avoids changing the accounting aggregate shared by total-cost/run-summary/GraphQL summary paths. | The accounting aggregate is not the correct owner for provider-name presentation because it has consumers that do not load provider context. |
| Custom provider display metadata | `autobyteus-server-ts/src/llm-management/llm-providers/stores/custom-llm-provider-store.ts` | `Reuse` | Existing store already owns current saved provider IDs and user-facing names; statistics loads a map once per query. | N/A |
| Legacy data migration lifecycle | `autobyteus-server-ts/src/app-data-migrations` and token-usage SQL repository | `Extend` | Existing runner, registry, status records, and token-usage backfill database pattern support two ordered retry-safe corrections. | N/A |
| Statistics transport | Existing token-usage GraphQL resolver | `Extend` | The resolver already maps row DTOs and is the correct public boundary. | N/A |
| UI presentation | Existing Token Statistics store/tables | `Extend` | Existing components already own table/chart labels. | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| LLM model catalog | Canonical identifier and short model value | DS-TOKMODEL-001 | Runtime adapters | `Reuse` | No changes. |
| Token usage ledger/projection | Provider snapshot propagation, raw model metadata, and accounting aggregate semantics | DS-TOKMODEL-001, DS-TOKMODEL-002, DS-TOKMODEL-004 | Ingestion, statistics provider/tree builder, and legacy migrations | `Extend` | Add nullable provider snapshot through observation/domain/SQL/Prisma; accounting aggregate remains stable; display projection receives snapshot plus immutable legacy context; migrations update only derived values. |
| Token usage GraphQL API | Raw/display statistics contract | DS-TOKMODEL-002, DS-TOKMODEL-003 | Web clients | `Extend` | Add explicit fields. |
| Token Statistics frontend | Hydration and visible labels | DS-TOKMODEL-003 | User | `Extend` | Render display fields in both modes. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/token-usage/projections/token-usage-model-display-projection.ts` | Token usage projection | Model-display owner | Pure provider-aware display resolution and ordered raw/display entries | Model and Task statistics share display policy without altering the accounting aggregate. | Existing raw normalization; provider context |
| `autobyteus-server-ts/src/token-usage/providers/statistics-provider.ts` | Token statistics | Model stats owner | Load provider-name context once, preserve raw grouping, and attach the matching model-display entry | Query lifecycle and row construction already live here. | Model-display entry projection; custom provider store |
| `autobyteus-server-ts/src/token-usage/providers/task-statistics-tree-builder.ts` | Token statistics | Task tree owner | Raw/display model arrays per task row from one ordered entry sequence | Recursive row construction already lives here; all four constructors share the same mapping helper. | Model-display projection |
| `autobyteus-ts/src/llm/utils/llm-token-usage-observation.ts`, `autobyteus-ts/src/llm/api/{autobyteus,openai-compatible,anthropic,gemini}-token-usage-normalizer.ts`, `autobyteus-ts/src/llm/api/ollama-llm.ts`, and `autobyteus-ts/src/llm/models.ts` | AutoByteus runtime ingestion | Model/observation owner | For AutoByteus events, carry `providerName` through the central identity and every named shared normalizer. | `LLMModel` already owns provider display metadata; nested event shape is explicit in the source matrix. | Server agent-run payload |
| `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread-token-usage.ts` and `codex/backend/codex-agent-run-backend.ts` | Direct Codex runtime ingestion | Preserved direct-producer owner | Preserve existing top-level model fields and nullable `provider_name`; do not invent a provider label. | Codex is outside the AutoByteus provider-name use case. | Common agent-run payload |
| `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session-token-usage.ts` and `claude/events/claude-session-event-converter.ts` | Direct Claude runtime ingestion | Preserved direct-producer owner | Preserve existing top-level session-event model fields and nullable `provider_name`; do not invent a provider label. | Claude Code is outside the AutoByteus provider-name use case. | Common agent-run payload |
| `autobyteus-server-ts/src/agent-execution/domain/agent-run-token-usage.ts` | Token usage domain | Ingestion contract | Carry optional provider name into server persistence without replacing null. | Existing event payload owner. | SQL repository |
| `autobyteus-server-ts/prisma/schema.prisma` | Persistence | Ledger schema owner | Add nullable `providerName @map("provider_name")`. | Prisma is the schema migration boundary. | App-data migration logic |
| `autobyteus-server-ts/src/token-usage/repositories/sql/token-usage-ledger-repository.ts` | Persistence | Ledger repository | Round-trip provider snapshot without changing accounting fields. | Existing create/read mapping owner. | Statistics projection |
| `autobyteus-server-ts/src/app-data-migrations/migrations/token-usage-custom-provider-model-value-backfill-migration.ts` | App-data migration | Legacy data owner | Classify and backfill composite `model_value` rows through an injected database interface. | Migration lifecycle and retry semantics already live in app-data migrations. | Token usage ledger database boundary |
| `autobyteus-server-ts/src/app-data-migrations/migrations/token-usage-provider-name-snapshot-backfill-migration.ts` | App-data migration | Legacy data owner | Recover exact provider names into null/empty AutoByteus `provider_name` rows; skip direct Codex/Claude scope. | Separate owner prevents value migration from guessing display metadata. | Token usage ledger database boundary |
| `autobyteus-server-ts/src/api/graphql/types/token-usage-stats.ts` | GraphQL | Public resolver | DTO fields and mapping | Existing statistics schema is centralized here. | Domain row types |
| `autobyteus-web/stores/tokenUsageStatistics.ts` | Frontend statistics | Store | Query payload hydration/fallback | Existing state normalization belongs here. | Frontend types |
| `autobyteus-web/components/settings/token-usage/*.vue` | Frontend statistics | Tables | Render display values | Existing table owners already own label rendering. | Store rows |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Raw/display model metadata from one statistics projection | `token-usage-model-display-projection.ts` | Token usage projection | Model and Task statistics share the same ordered display-entry policy. | Yes — do not add a second model identity field to ledger events. | Yes — raw and display meanings stay explicit instead of replacing one another. | A generic frontend model-label utility, display field in the accounting aggregate, or per-event provider registry query. |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| `TokenUsageCostSummaryAggregate` raw/accounting model arrays | Yes | Yes | Low | Keep accounting/raw aggregate unchanged; display entries live in the specialized projection. |
| `TokenUsageModelDisplayEntry[]` | Yes | Yes | Low | One raw/display pair per unique raw identifier; Task arrays are derived positionally. |
| `TokenUsageRuntimeModelStatisticsRow` | Yes | Yes | Low | `modelIdentifier` is grouping identity; `modelDisplayName` is presentation. |
| `TokenUsageTaskStatisticsRow` | Yes | Yes | Low | `models` is raw identity list; `modelDisplayNames` is presentation list. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/token-usage/projections/token-usage-cost-summary-aggregate.ts` | Token usage projection | Accounting aggregate owner | Preserve existing accounting/raw aggregate contract and all current consumers. | Avoids display context coupling in total-cost/run-summary/synthetic summary paths. | Yes |
| `autobyteus-server-ts/src/token-usage/projections/token-usage-model-display-projection.ts` | Token usage projection | Model-display owner | `buildTokenUsageModelDisplayEntries(events, context)` and exact fallback/parser policy. | Single pure source for display derivation and Task alignment. | Yes |
| `autobyteus-server-ts/src/token-usage/domain/statistics-models.ts` | Token usage domain | Statistics DTO owner | Add `modelDisplayName` and `modelDisplayNames` fields. | Keeps model/task row contracts explicit. | Aggregate metadata |
| `autobyteus-server-ts/src/token-usage/providers/statistics-provider.ts` | Token statistics | Model stats owner | Load provider-name context once, preserve raw group key, and select display entry for each model row. | Query lifecycle and grouping are owned here. | Accounting aggregate; model-display projection; custom provider store |
| `autobyteus-server-ts/src/token-usage/providers/task-statistics-tree-builder.ts` | Token statistics | Task tree owner | Add display list to every row constructor from one ordered display-entry sequence. | Ensures recursive rows are consistent. | Model-display projection |
| `autobyteus-server-ts/src/app-data-migrations/migrations/token-usage-custom-provider-model-value-backfill-migration.ts` | App-data migration | Legacy data owner | Scan, classify, update only safe composite values, and report counts/details. | Keeps one-time data correction outside normal statistics code. | Token usage SQL boundary; migration runner |
| `autobyteus-server-ts/src/app-data-migrations/migrations/token-usage-provider-name-snapshot-backfill-migration.ts` | App-data migration | Legacy data owner | Scan null/empty provider snapshots, recover exact names, and report warnings/details. | Keeps provider-name recovery separate from value normalization. | Token usage SQL boundary; migration runner |
| `autobyteus-server-ts/src/app-data-migrations/app-data-migration-registry.ts` | App-data migration | Registry | Register the required migration after the existing token-usage migration definitions. | Existing registry is the startup discovery boundary. | Migration definition |
| `autobyteus-server-ts/src/api/graphql/types/token-usage-stats.ts` | GraphQL | Public boundary | Add fields and map values. | Existing GraphQL owner. | Domain DTOs |
| `autobyteus-web/graphql/queries/token_usage_statistics_queries.ts` | Frontend API | Query owner | Request display fields. | Existing query document. | GraphQL contract |
| `autobyteus-web/types/tokenUsageStatistics.ts` | Frontend domain | Typed store model | Add required display fields. | Existing statistics type owner. | GraphQL response |
| `autobyteus-web/stores/tokenUsageStatistics.ts` | Frontend state | Store owner | Normalize display fields and safe fallback. | Existing hydration boundary. | Frontend types |
| `autobyteus-web/components/settings/token-usage/TokenUsageModelStatisticsTable.vue` | Frontend UI | Model table | Render display field in cell and chart label. | Existing model view. | Store rows |
| `autobyteus-web/components/settings/token-usage/TokenUsageTaskStatisticsTable.vue` | Frontend UI | Task table | Render display-name array. | Existing task view. | Store rows |
| `autobyteus-web/generated/graphql.ts` | Frontend generated contract | Codegen output | Refresh generated operations/types. | Tracked generated artifact. | Query/schema |

## Applied Patterns (If Any)

- Existing token-usage projection pattern: aggregate provider/runtime facts once and expose named summary fields to GraphQL.
- Existing app-data migration pattern: define an injectable database boundary, classify rows deterministically, preserve row counts, return item-level summary details, and let the runner own retry/status/log persistence.
- Existing GraphQL mapping pattern: domain snake_case fields are mapped to explicit camelCase GraphQL fields; raw and display fields remain distinct.
- Existing frontend hydration pattern: Pinia normalizes nullable/unknown transport values before components render them.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/token-usage/projections/token-usage-cost-summary-aggregate.ts` | `Module` | Accounting aggregate | Preserve accounting totals/raw model metadata for all existing consumers. | Shared by total-cost, run-summary, Model, Task, and GraphQL summary paths. | Provider-name lookup or display policy. |
| `autobyteus-server-ts/src/token-usage/projections/token-usage-model-display-projection.ts` | `Module` | Model-display projection | Resolve exact provider:model labels and ordered raw/display entries. | Shared by Model and recursive Task statistics only. | Accounting totals, file I/O, or GraphQL/Vue concerns. |
| `autobyteus-server-ts/src/token-usage/domain/statistics-models.ts` | `Module` | Domain DTO | Describe raw/display row meanings. | Domain contract is the right place for explicit fields. | Parsing provider config. |
| `autobyteus-server-ts/src/token-usage/providers/statistics-provider.ts` | `Module` | Model statistics provider | Load current provider-name map once for legacy AutoByteus rows, keep raw group key, and attach the matching display entry. | Query lifecycle and grouping are owned here. | Display parsing duplicated from projection or per-row provider I/O. |
| `autobyteus-server-ts/src/token-usage/providers/task-statistics-tree-builder.ts` | `Module` | Task tree provider | Attach aligned display labels to every recursive row constructor. | Task hierarchy owner; shared mapping helper prevents drift. | Frontend label policy or independent array sorting. |
| `autobyteus-server-ts/src/app-data-migrations/migrations/token-usage-custom-provider-model-value-backfill-migration.ts` | `Module` | App-data migration | Correct only validated legacy composite `model_value` values and report safe skips. | Existing app-data migration boundary owns startup backfills. | GraphQL/UI concerns or canonical identity rewrites. |
| `autobyteus-server-ts/src/app-data-migrations/migrations/token-usage-provider-name-snapshot-backfill-migration.ts` | `Module` | App-data migration | Fill only null/empty `provider_name` values with exact recoverable names and report warnings. | Separate migration keeps provider-name recovery independent and retryable. | GraphQL/UI concerns or canonical identity rewrites. |
| `autobyteus-server-ts/src/app-data-migrations/app-data-migration-registry.ts` | `Module` | App-data migration registry | Register the migration for startup execution/status tracking. | Existing registry is the canonical migration lifecycle owner. | Migration parsing or SQL details. |
| `autobyteus-server-ts/src/api/graphql/types/token-usage-stats.ts` | `Module` | GraphQL boundary | Expose raw/display fields and map them. | Existing public statistics boundary. | Repository queries or derived policy. |
| `autobyteus-web/stores/tokenUsageStatistics.ts` | `Module` | Frontend hydration boundary | Normalize new fields and fallback empty display values. | Existing API state owner. | Provider catalog access. |
| `autobyteus-web/components/settings/token-usage/TokenUsageModelStatisticsTable.vue` | `Module` | Model UI | Render display name in cells/charts. | Existing visual owner. | Canonical identity/grouping logic. |
| `autobyteus-web/components/settings/token-usage/TokenUsageTaskStatisticsTable.vue` | `Module` | Task UI | Render display-name array. | Existing visual owner. | Provider-specific parsing. |
| `autobyteus-server-ts/prisma/schema.prisma` and Prisma migrations | `Folder` / `File` | Persistence | Add nullable `provider_name` before startup app-data corrections. | The ledger must become self-contained for new provider display names. | Provider-name lookup logic or migration status handling. |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/token-usage` | `Main-Line Domain-Control` plus existing provider/projection subfolders | Yes | Low | Reuse existing token-usage structure; no new generic folder. |
| `autobyteus-server-ts/src/api/graphql/types` | `Transport` | Yes | Low | Only maps domain fields to GraphQL. |
| `autobyteus-web/stores` and `components/settings/token-usage` | `Transport` / UI | Yes | Low | Store and components remain separate. |
| `autobyteus-server-ts/prisma` | `Persistence-Provider` | Yes | Low | Nullable schema expansion runs before the two app-data migrations; runtime migrations do not own schema DDL. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| AutoByteus custom provider display | Raw key `openai-compatible:provider_A:qwen3.8-max-preview`, saved provider name `alibaba_cloud`, display `alibaba_cloud:qwen3.8-max-preview`, row ID still contains raw key. | Replace raw key with `alibaba_cloud:qwen3.8-max-preview` before grouping. | The provider:model label is readable, while two providers with the same model remain separate accounting rows. |
| AutoByteus built-in provider display | Provider `DEEPSEEK`, model `deepseek-v4-flash`, display `DeepSeek:deepseek-v4-flash`. | Display only `deepseek-v4-flash` or the raw enum. | Built-in provider display names already have a canonical mapping. |
| Non-AutoByteus display | Codex raw model `gpt-5.6-luna`, display remains `gpt-5.6-luna`. | Prefix every runtime row with a provider name. | The provider:model policy is scoped to AutoByteus runtime. |
| Colon-containing model | Raw key `openai-compatible:provider_A:org/model:tag`, display from `model_value` or fallback `org/model:tag`. | `split(':')[2]` returning only `org/model`. | Model names may contain separators; suffix parsing must preserve the complete model name. |
| Deleted custom provider | Raw key `openai-compatible:provider_A:qwen3`, provider map has no `provider_A`, display `OpenAI-Compatible (provider_A):qwen3`. | Throwing, omitting the row, or replacing it with a generic model-only label. | The provider ID remains diagnostic and the row remains non-empty without depending on registry membership. |
| Malformed/missing AutoByteus metadata | Malformed `model_value = openai-compatible:provider_A` with no valid raw composite -> `Unknown Provider:Unknown Model`; missing provider with raw suffix -> `Unknown Provider:qwen3`. | Treating a malformed composite as a valid ordinary model or silently guessing a provider. | Fallback precedence is deterministic and malformed data cannot alter grouping. |
| Unknown legacy value | Non-AutoByteus raw key `legacy-model` retains `legacy-model`; AutoByteus with no usable provider/model uses `Unknown Provider:Unknown Model`. | Throwing, blank cell, or merging the row into another model. | Historical/unknown records remain attributable and visible. |
| Task alignment | Raw entries `[rawA, rawB]` produce `[displayA, displayB]` at the same positions; equal display labels are retained twice; empty input produces two empty arrays. | Independently sorting/deduplicating `modelDisplayNames`, or rebuilding only one recursive constructor. | Positional alignment survives standalone, team, nested, and legacy-member rows. |
| Cross-runtime raw collision | If one Task aggregate contains the same raw identifier under AutoByteus and another runtime, that entry displays the unchanged raw identifier; Model rows remain runtime-specific because their grouping key includes runtime. | Applying `provider:model` to the mixed Task slot or splitting one raw slot into a new raw array. | One display slot cannot truthfully represent two runtime policies; raw fallback preserves meaning without changing grouping/array shape. |
| Legacy backfill | `model_identifier = openai-compatible:provider_A:org/model:tag`, `model_value` equal to it -> update only `model_value` to `org/model:tag`; rerun skips it as normalized. | Rewriting `model_identifier`, requiring a provider record, or changing row counts. | Existing derived data is repaired without changing canonical identity or accounting. |
| Migration partial failure/recovery | Rows `[id1 eligible, id2 update error, id3 eligible]` commit `id1`, record `id2` as `FAILED`, continue and commit `id3`, return `FAILED`; a later `runPending()`/explicit rerun skips normalized `id1`/`id3` and retries `id2`. | Abort on the first row, roll back already committed rows, or mark a partial update as successful without a failure status. | The existing runner continues startup while durable progress and unresolved work remain visible and retryable. |
| Frontend boundary | `row.modelDisplayName` in cell/chart; `row.llmModel` retained for raw contract. | UI calls `LLMFactory`, reads provider files, or splits `llmModel` to infer a name. | The server has persisted facts and current provider metadata, and owns the cross-runtime policy. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Replace `model_identifier` with `model_value` globally | Would make the visible value short. | `Rejected` | Keep canonical raw identifier and add display fields. |
| Group statistics by short display name | Would avoid returning long strings. | `Rejected` | Continue grouping by raw runtime/model identity; display is non-key metadata. |
| Frontend-only parser for `openai-compatible:` | Small apparent UI change. | `Rejected` | Derive once in server token-usage projection and expose explicit fields. |
| Frontend provider-catalog lookup | Could recover the friendly provider name. | `Rejected` | Resolve the current provider-name map once in the server statistics provider; keep UI free of catalog I/O. |
| Add a persisted provider-name/display snapshot column | Makes the ledger self-contained and stabilizes new historical labels after custom-provider deletion/rename. | `Accepted — user-approved refinement` | Add only one nullable `provider_name` column; keep `model_provider` as provider type and `model_identifier` as canonical identity. Backfill recoverable legacy gaps; leave unrecoverable names null with warning/fallback. |
| Rewrite canonical `model_identifier` to provider:model | Would make existing stored values look short. | `Rejected` | Preserve provider-scoped identity; backfill only legacy composite `model_value` to the model suffix. |
| Value-only legacy composite `model_value` backfill | Repairs existing deployments where the derived value is also long. | `Accepted` | Register an idempotent app-data migration with strict parsing and row-preserving skips. |
| Keep rendering raw values in one table as a fallback path | Would avoid changing every UI consumer. | `Rejected` | Both Task and Model tables consume display fields; raw fields remain API/debug only. |

## Derived Layering (If Useful)

`Prisma schema migration -> ordered app-data corrections (legacy model_value, AutoByteus provider_name snapshot) -> runtime ingestion (AutoByteus providerName -> ledger provider_name; direct Codex/Claude nullable) -> Ledger facts + legacy AutoByteus provider-name context -> Accounting aggregate (unchanged raw/cost facts) + snapshot-first model-display projection (ordered raw/display entries) -> Statistics provider/tree builder (raw grouping + display row DTO) -> GraphQL transport (raw + display fields) -> Pinia normalization -> Vue display`

The separate model-display projection is intentional rather than a generic abstraction: `getTotalCost`, run-summary adaptation, synthetic `summaryAggregate()`, and existing aggregate GraphQL consumers remain on the accounting-only aggregate and do not need provider context. Model and Task statistics are the only consumers of the provider-aware display projection.

## Change / Refactor Sequence

1. Add the nullable Prisma/SQL field and extend the central observation/domain/repository path; test AutoByteus built-in/custom provider-name round trips across every named shared normalizer plus direct Codex/Claude null-preserving round trips.
2. Add and unit-test the immutable legacy provider-name context and snapshot-first display projection with the exact parser, malformed-value fallback, deleted-provider fallback, provider-map failure, raw/value conflict, empty, and colon-preserving cases.
3. Enumerate and test every shared accounting consumer (`getTotalCost`, `token-usage-run-summary-adapter.ts`, synthetic GraphQL `summaryAggregate()`, and existing aggregate GraphQL mappings) to prove they remain on the unchanged accounting aggregate without display context.
4. Add Migration A and Migration B with fixed IDs, exact classifier matrices, injected database interfaces, registry order, CAS updates, independent durability, startup continuation, terminal-warning/failure mapping, retry/recovery, and row-count/raw-identity/accounting invariant tests.
5. Add domain row fields and populate Model plus all four recursive Task constructors from one ordered display-entry sequence; assert equal lengths, positional correspondence, duplicate display labels, and empty rows.
6. Add GraphQL fields and mappings; update the frontend query documents and regenerate `autobyteus-web/generated/graphql.ts`.
7. Add frontend types/store normalization and update both table components/chart labels to consume display fields while retaining raw fields for diagnostics/fallback.
8. Add/adjust server statistics tests and frontend store/component tests for custom provider:model, built-in provider:model, non-AutoByteus unchanged labels, same-model/different-provider, colon suffix, provider deletion/missing context, and all fallback scenarios.
9. Run implementation-scoped typechecks/unit tests. API/E2E engineer then decides broader GraphQL/browser coverage and executes it.
10. Remove no provider identity/storage path; remove only the obsolete raw-as-visible-label uses from both table modes. Keep the nullable snapshot, accounting aggregate, model-display projection, and two migrations as the new owners.

## Key Tradeoffs

- **Separate fields versus replacing raw fields:** adds a small GraphQL/type surface but makes identity versus presentation explicit and protects grouping/debugging semantics.
- **Separate display projection versus extending the accounting aggregate:** keeps provider I/O and presentation out of `getTotalCost`, run-summary, synthetic GraphQL summary, and other shared accounting consumers; Model/Task statistics receive an explicit ordered projection instead of forcing every aggregate caller to carry display context.
- **Server versus frontend derivation:** server derivation uses persisted facts consistently across Task and Model views and joins the current provider-name map once per query; it avoids duplicate policy and per-row frontend catalog I/O.
- **Persisted snapshot versus current provider lookup:** one nullable AutoByteus ingestion-time `provider_name` makes custom-provider rows self-contained and stable across provider rename/deletion, at the cost of preserving the old name when configuration is renamed. Current provider lookup remains only for legacy AutoByteus null/empty rows; direct Codex/Claude remain nullable. One column is simpler than a normalized provider-history table and does not duplicate provider identity.
- **`model_value` versus parser:** a non-composite `model_value` is the preferred model label and preserves arbitrary model names. The anchored parser handles only the provider-scoped composite shape and preserves the complete suffix; malformed composite markers are not treated as ordinary names.
- **Schema plus two bounded migrations:** the Prisma field and ingestion path are required for self-contained future rows. Migration A repairs composite legacy values; Migration B fills recoverable names. Read-time fallback keeps rollout safe, while malformed/deleted legacy rows remain visible and are reported rather than guessed.
- **One snapshot column versus additional provider identity columns:** `model_provider` remains the stable provider type and `model_identifier` remains the provider-scoped identity. `provider_name` is display metadata only; no second provider ID or normalized history table is needed.
- **Independent row updates versus all-rows transaction:** independent commits let a large ledger make durable partial progress and allow safe retry, while explicit FAILED details and final row-count checks make update errors observable rather than silently partial.

## Risks

- Some old rows may lack both a short value and a valid custom-provider identifier; they will show their raw identity or `Unknown`, which is explicit and deterministic.
- If a provider emits an incorrect `model_value`, the display can be incorrect while raw identity remains correct; this is preferable to changing accounting identity and is visible in raw diagnostics.
- Adding GraphQL fields requires schema/codegen refresh and coordinated server/frontend rollout; implementation and API/E2E checks must verify the generated contract.
- A task row containing multiple provider identities may show duplicate provider:model display names if provider names/model names match; raw `models` remains available for diagnostics, and grouping is not collapsed.
- New AutoByteus rows preserve the ingestion-time provider name after custom-provider rename/deletion. Legacy AutoByteus rows without a recovered snapshot can still change with current configuration or fall back to `OpenAI-Compatible (<providerId>)`; direct Codex/Claude remain unchanged and nullable. The migration reports this limitation without affecting accounting.
- Legacy rows with malformed or conflicting composite `model_value`/`model_identifier` are skipped and reported; they still render through the runtime fallback path.

## Guidance For Implementation

- Do not modify `buildOpenAICompatibleEndpointModelIdentifier`, provider registration, routing, or pricing lookup. Extend the existing token-usage observation and SQL schema only to carry optional `providerName`/`provider_name`; populate it for AutoByteus and preserve null for direct Codex/Claude.
- Load custom provider names through `CustomLlmProviderStore.listProviders()` once per Model/Task statistics query only for legacy AutoByteus null/empty snapshots; pass an immutable map/context to the model-display projection and tree builder. Do not read provider configuration from the accounting aggregate or frontend. If loading fails, pass a failure marker so the AutoByteus projection emits `OpenAI-Compatible (<providerId>)` rather than throwing; direct Codex/Claude labels remain unchanged.
- Register required `TokenUsageCustomProviderModelValueBackfillMigration` and `TokenUsageProviderNameSnapshotBackfillMigration` in the app-data registry using the fixed IDs/order. Use injected database interfaces, validated anchored parsing, CAS updates, independent durability, and the exact runner lifecycle; Migration B is scoped to AutoByteus rows and does not fill direct Codex/Claude nulls. Do not rewrite `model_identifier` or accounting fields.
- Keep `normalizeTokenUsageModelIdentifier` unchanged for raw identity semantics. Add a separate model-display projection with an explicit provider/prefix check and expose the ordered `TokenUsageModelDisplayEntry[]` as the only source for Model/Task display arrays.
- For `runtime_kind = autobyteus`, use a trimmed persisted `provider_name` first. Only when it is null/empty use `getLlmProviderDisplayName` for AutoByteus built-in provider names or the saved custom-provider `name` for AutoByteus custom providers. Apply the exact raw/value precedence and conflict matrix above; use a parser that removes exactly the `openai-compatible:<providerId>:` prefix and preserves the rest, not a naïve fixed-index split. A value beginning with that prefix but failing the grammar is malformed, not an ordinary model name. For Codex/Claude and every other non-AutoByteus runtime, do not use provider_name to prefix or reformat the display.
- For non-AutoByteus runtimes, preserve the current model display behavior rather than applying the provider:model prefix.
- Add `modelDisplayName`/`modelDisplayNames` to domain and GraphQL contracts; keep `modelIdentifier`/`llmModel` and `models` unchanged.
- Preserve raw row IDs and sorting/grouping behavior.
- Render only display fields in both tables and chart labels. Use the exact provider:model format for AutoByteus; do not add new localization copy or reformat other runtimes.
- Regenerate tracked GraphQL output after query changes and run the repository’s web boundary/localization guards if required by the implementation environment.
