# Design Spec

## Current-State Read

Custom OpenAI-compatible models intentionally have two identities. The shared LLM catalog constructs `openai-compatible:<providerId>:<modelName>` as the canonical `modelIdentifier` so identical model names from different saved endpoints remain distinct. The model object and token-usage observation also carry the short `modelValue`; the ledger persists both fields. This is healthy runtime and persistence design.

The defect is at the Token Statistics presentation boundary. `buildTokenUsageCostSummaryAggregate` currently exposes only `observed_model_identifiers`. `TokenUsageStatisticsProvider` groups by runtime plus that canonical identifier and returns it as `modelIdentifier`; GraphQL maps it directly to `llmModel`. The task tree copies the same raw list to `models`. The Vue model and task tables render those values verbatim. The provider-scoped identity therefore leaks into a user-facing column even though the short model value is already available in the ledger. The requested AutoByteus presentation additionally needs the configured provider name, which is available from the current custom-provider registry or the existing built-in provider-display-name mapping but is not stored on each token event.

The target design keeps the current identity and accounting aggregate owners. It adds a separate provider-aware model-display projection beside the accounting aggregate, using a provider-name context loaded once per statistics query. This avoids changing the shared cost aggregate consumed by total-cost, run-summary, and GraphQL summary paths. The Model and recursive Task statistics paths carry raw identity plus display metadata through GraphQL and frontend hydration, render `<provider name>:<model name>` only for AutoByteus rows, and preserve existing labels for other runtimes. It also adds an idempotent app-data backfill for legacy rows where `model_value` itself contains the validated composite identifier; the backfill changes only that derived value and never changes `model_identifier`, grouping, pricing, or counts.

## Intended Change

1. Add a token-usage-owned display-name resolver beside the existing raw identifier normalizer. The resolver accepts runtime/provider/model facts plus a provider-name context; it does not read files or credentials itself.
2. For `runtime_kind = autobyteus`, resolve the provider portion from the current custom-provider `{id,name}` map for `OPENAI_COMPATIBLE`, or from the existing built-in provider-display-name mapping. Resolve the model portion from non-empty `model_value`; if that value is itself a validated composite identifier, normalize it to its complete suffix. If it is unavailable, recognize `openai-compatible:<providerId>:<modelName>` in `model_identifier` and preserve the complete suffix, including additional `:` characters.
3. Return `<provider name>:<model name>` for AutoByteus. If provider/model metadata is missing, use a deterministic non-empty fallback that leaves raw identity available. For non-AutoByteus runtimes, preserve the current visible model-label behavior.
4. Add a separate `TokenUsageModelDisplayEntry` projection beside the accounting aggregate. It returns one `{modelIdentifier, modelDisplayName}` entry per unique raw identifier, ordered exactly like the existing `observed_model_identifiers` order. Keep `TokenUsageCostSummaryAggregate` accounting-only so `getTotalCost`, run-summary adaptation, synthetic `summaryAggregate()`, pricing, and existing aggregate GraphQL mappings remain unchanged.
5. Add `modelDisplayName` to runtime/model statistics rows and `modelDisplayNames` to task statistics rows. Keep raw `modelIdentifier`/`llmModel` and `models` fields unchanged for grouping, attribution, diagnostics, and future consumers. Task arrays must be equal length and positionally aligned; duplicate display names are retained when raw identifiers differ.
6. Have `TokenUsageStatisticsProvider` load the custom-provider name map once per statistics query and pass it to the display projection and recursive task-tree aggregation. Do not perform one registry read per event or row. Total-cost and run-summary consumers use the accounting aggregate without the display projection.
7. Expose the new display fields in GraphQL and request them in the frontend statistics queries. Normalize them in the Pinia store with a raw-field fallback only when the display field is absent/empty, then render display fields in the model table/chart and task table.
8. Add a required app-data migration definition registered with the existing `AppDataMigrationRegistry`. It scans only legacy composite `model_value` rows classified by the exact matrix below, derives the complete model suffix from a validated canonical identifier, updates rows idempotently through an owned database boundary, preserves row counts and raw identifiers, and reports skipped/ambiguous rows. Its exact status, partial-update, retry, and recovery semantics follow the migration lifecycle contract below.
9. Add focused server, migration, and frontend tests covering `alibaba_cloud:qwen3.8-max-preview`, built-in AutoByteus provider:model output, preserved non-AutoByteus labels, two providers with the same model name remaining separate raw rows, colon-containing suffixes, missing/deleted provider fallback, missing/unknown model fallback, aligned recursive Task arrays, all accounting aggregate consumers, migration idempotence, partial progress, retry, and row-preserving skips.

## Display Resolution Policy

The implementation must keep this policy in one pure server-side resolver so Model and recursive Task statistics cannot diverge. The resolver never reads files; the statistics provider supplies an immutable provider-name map and records whether loading it failed.

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
   - A matching custom provider ID in the successfully loaded map -> its trimmed saved `name`.
   - A missing/deleted custom provider ID, or provider-map load failure -> `OpenAI-Compatible (<providerId>)`.
   - A recognized built-in provider enum -> `getLlmProviderDisplayName(model_provider)`.
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

The migration addresses only historical rows where the derived `model_value` is itself the composite custom-provider identity. It does not rewrite the canonical `model_identifier`.

| Concern | Design |
| --- | --- |
| Migration ID | `20260730_token_usage_custom_provider_model_value_backfill` (fixed; referenced by tests and operational logs). |
| Startup ordering | Fix the ID as `20260730_token_usage_custom_provider_model_value_backfill`; set `requiredOnStartup = true`; register immediately after `TokenUsageExecutionAddressBackfillMigration` and before `TokenUsageLegacyPathColumnsDropMigration`. It has no data dependency on the former, but this deterministic token-usage order keeps backfills together. Prisma migrations remain the only schema prerequisite. |
| Scan scope | List ledger rows with non-empty `model_value` and classify scope as `trim(runtime_kind).toLowerCase() === "autobyteus"` and `trim(model_provider).toUpperCase() === "OPENAI_COMPATIBLE"`. The migration does not require current provider-registry membership, so deleted providers can still be repaired; every other row becomes `SKIPPED_SCOPE_MISMATCH`. |
| Exact parser | Parse only values matching the case-sensitive anchored grammar `^openai-compatible:([^:]+):(.+)$` after trimming the whole value. Capture provider ID as group 1 and the entire suffix as group 2; trim both captures for validation/comparison, reject empty/whitespace-only captures, and preserve every interior suffix colon/character in the returned suffix. |
| Exact decision matrix | First, runtime/provider mismatch -> `SKIPPED_SCOPE_MISMATCH`. For in-scope rows, a value beginning with `openai-compatible:` but failing the anchored grammar -> `SKIPPED_INVALID_COMPOSITE_MODEL_VALUE`; a valid non-composite value -> `SKIPPED_VALID_NON_COMPOSITE`. A valid composite value + missing raw identifier -> `SKIPPED_RAW_IDENTITY_MISSING`. Both composite with equal provider ID and suffix -> `MIGRATE`. Both composite with any difference -> `SKIPPED_CONFLICTING_COMPOSITE_VALUES`. A composite value + non-composite raw identifier -> `SKIPPED_RAW_IDENTITY_NOT_COMPOSITE`. These checks occur before any write. |
| Transformation | For `MIGRATE`, write only the parsed `model_value` suffix. The update uses a compare-and-set predicate on row ID and original `model_value`; zero affected rows becomes `SKIPPED_SOURCE_CHANGED`. Leave `model_identifier`, token fields, costs, timestamps, attribution, pricing, and identity columns untouched. |
| Safety | Do not require provider registry membership; do not infer provider names; do not rewrite a valid ordinary colon-containing model name such as `org/model:tag`; do not guess when raw/value disagree. |
| Idempotence | A normalized short value is `SKIPPED_VALID_NON_COMPOSITE` on rerun. Completed updates are individually durable; interrupted runs resume by re-scanning and skip completed rows while retrying unprocessed eligible rows. |
| Provider name | The backfill does not snapshot provider names. The display resolver still obtains the current saved name at statistics-query time; immutable historical provider labels would be a separate schema/ingestion change. |
| Evidence | The local task-base database currently has short custom-provider `model_value` values, but the user reports deployments with composite existing values; the migration covers that legacy shape without harming current rows. |

### Migration Lifecycle, Partial Update, And Recovery Contract

- The migration definition is `requiredOnStartup = true`, but the existing runner catches a failed definition, records its result, and continues startup. A pending/failed/warning migration must never prevent the server or Token Statistics query from starting.
- Each successful row update is committed independently through the injected database boundary. This intentionally permits partial progress; the migration is not an all-rows transaction.
- A row-update error is recorded as `FAILED` detail and scanning continues. If any row-update error occurs, the migration returns `FAILED`; already committed updates remain valid and the next manual/startup retry skips them through the decision matrix.
- If scanning, preflight count, final count, or database connectivity fails before/after updates, return `FAILED` with the error and preserve the partial-progress counts. A final row-count change is itself a `FAILED` invariant violation.
- If there are no update errors but one or more ambiguous/unsafe rows are skipped, return `SUCCEEDED_WITH_WARNINGS`; safe non-composite/already-normalized rows alone return `SUCCEEDED`.
- The existing runner treats `SUCCEEDED` and `SUCCEEDED_WITH_WARNINGS` as terminal for automatic `runPending()` reruns; it retries `NOT_RUN` and `FAILED` definitions during startup. The explicit `runMigration(id)` command executes the registered definition again when an operator requests it (the status snapshot exposes `canRetry` for `NOT_RUN`, `FAILED`, and `SUCCEEDED_WITH_WARNINGS`). The migration summary/log must identify each skip reason so an operator can correct data and retry.
- Read-time display remains safe in every state: pending, failed, warning-complete, partially updated, and fully complete. Composite `model_value` rows are normalized by the display resolver even if the migration did not update them.
- Tests must cover startup continuation after `FAILED`, partial durable updates, retry skipping completed rows, warning terminal status, final row-count/raw-identity invariants, and resolver output in every migration state.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind (`User`/`System`/`Operational`/`Contract`) | Approved Requirement / Intent And Acceptance-Criteria IDs | Approved Trigger Or Governing Contract | Relevant Existing Behavior And Evidence Reference | Approved Change Or Preserved Outcome | Target Production Path / Lifecycle And Spine ID(s) |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-TOKMODEL-001 | User | `REQ-TOKMODEL-001`; `AC-TOKMODEL-001`, `AC-TOKMODEL-002` | User fetches a Token Statistics date range and chooses Task or Model grouping. | Raw AutoByteus custom identifier flows through GraphQL and is rendered verbatim; see investigation `TokenUsageStatisticsProvider`, GraphQL resolver, and both Vue tables. | Render `<provider name>:<model name>` in both modes, using the current saved custom-provider name; preserve raw identity. | Ledger events + provider-name context -> accounting aggregate + model-display projection -> GraphQL display fields -> store -> tables/chart (`DS-TOKMODEL-002`). |
| BEH-TOKMODEL-002 | System / Contract | `REQ-TOKMODEL-002`; `AC-TOKMODEL-003` | Token usage contract records provider, canonical identifier, and model value. | `OpenAICompatibleEndpointModel` intentionally builds the composite identifier; SQL ledger stores both values. | Keep raw identifier as grouping, row ID, attribution, pricing, and diagnostic identity. Add display value without replacing raw data. | Runtime observation -> enrichment -> ledger (`DS-TOKMODEL-001`); raw grouping remains in `DS-TOKMODEL-002`. |
| BEH-TOKMODEL-003 | User | `REQ-TOKMODEL-001`, `REQ-TOKMODEL-002`; `AC-TOKMODEL-001`, `AC-TOKMODEL-002`, `AC-TOKMODEL-004` | User chooses Task grouping. | Task builder copies raw identifiers into `models`, and task table renders it. | Keep raw `models`; add `modelDisplayNames` from the same ordered display-entry sequence for every recursive row. | Ledger events + provider-name context -> task tree builder + display projection -> GraphQL task row -> store -> task table (`DS-TOKMODEL-002`). |
| BEH-TOKMODEL-004 | Contract | `REQ-TOKMODEL-003`; `AC-TOKMODEL-003` | Ledger row is built-in AutoByteus or belongs to another runtime. | Current projection returns raw model identity and tables render it. | Use provider:model for AutoByteus built-ins; preserve current non-AutoByteus visible labels. | Display resolver and runtime-specific policy (`DS-TOKMODEL-002`). |
| BEH-TOKMODEL-005 | Contract | `REQ-TOKMODEL-004`; `AC-TOKMODEL-005` | Ledger row lacks `model_value`, has malformed identity, or has missing provider configuration. | Current identifier normalizer returns raw identifier/`Unknown`; no display-specific handling exists. | Apply the exact provider/model precedence and fallback contract; never throw or merge raw groups. | Model-display projection and store fallback (`DS-TOKMODEL-002`). |
| BEH-TOKMODEL-006 | Operational / Contract | `REQ-TOKMODEL-005`; `AC-TOKMODEL-006` | Existing ledger row contains the composite custom identity in `model_value`. | Statistics may expose the long stored value; no legacy-value backfill exists. | Apply the exact classifier and lifecycle contract; backfill only the validated model suffix, preserve `model_identifier`, and keep display resolution safe before/without migration. | Startup app-data migration -> ledger row update -> model-display projection (`DS-TOKMODEL-004`, `DS-TOKMODEL-002`). |
| BEH-TOKMODEL-007 | Contract | `REQ-TOKMODEL-006`; `AC-TOKMODEL-008` | The accounting aggregate is shared by total-cost, run-summary, synthetic GraphQL summary, and Model/Task statistics. | Provider display context is not currently part of the aggregate contract. | Keep the accounting aggregate unchanged for every shared consumer; add display metadata only in the Model/Task model-display projection. | Accounting aggregate consumers remain on `DS-TOKMODEL-002` without display context. |
| BEH-TOKMODEL-008 | Contract | `REQ-TOKMODEL-007`; `AC-TOKMODEL-008` | Recursive Task constructors each copy aggregate model observations into row arrays. | No parallel display array exists and constructor drift is possible. | Derive raw/display arrays from one ordered entry sequence for all four constructors and empty paths. | Task tree builder + model-display projection (`DS-TOKMODEL-002`). |

## Relevant Supplemental Task Artifacts

None. The requirements, investigation notes, and design spec fully capture the intended behavior and evidence; no separate UI/UX or data-mapping supplement materially improves this narrow table/API change.

## Task Design Health Assessment (Mandatory)

- Change posture: `Bug Fix` / `Behavior Change`
- Current design issue found: `Yes`
- Root cause classification: `Boundary Or Ownership Issue`
- Refactor needed now: `No`
- Evidence: The LLM catalog and ledger already separate canonical `model_identifier` from short `model_value`, but some historical deployments may have the composite value in both fields. The custom-provider store and built-in display mapping already own provider names; the missing boundaries are joining that metadata to a read-time statistics projection, propagating it through every Model/Task path, and correcting only the legacy derived value.
- Design response: Keep provider identity construction, canonical ledger identity, accounting aggregate, statistics grouping, GraphQL raw fields, and existing UI components. Add a separate token-usage model-display projection with immutable provider-name context, expose explicit API/UI display fields, and add a bounded app-data backfill for validated composite `model_value` rows.
- Refactor rationale: A larger identity/catalog refactor would increase risk and would be unrelated to the observed defect. A frontend provider-catalog lookup or raw-string parser would put server data semantics in the wrong owner and fail when the catalog is unavailable.
- Intentional deferrals and residual risk, if any: Provider names are resolved from current configuration because the ledger does not snapshot them. Historical labels can follow provider renames and use fallback after deletion; raw identity remains stable. The backfill cannot recover a provider name from malformed/deleted configuration and reports such rows without guessing. Rows with no usable `model_value` rely on the documented suffix/raw fallback.

## Terminology

- **Canonical model identifier:** Provider/runtime-scoped identity used to route, group, price, and attribute usage; for custom providers it is `openai-compatible:<providerId>:<modelName>`.
- **Provider:model display name:** For AutoByteus rows, `<provider name>:<model name>`; custom provider names come from the current saved provider registry and built-in names come from the existing provider-display-name mapping. It is not a grouping key.
- **Raw model fields:** Existing API fields `modelIdentifier`/`llmModel` and `models`; they remain canonical identity data even though the tables stop rendering them.

## Design Reading Order

1. The display resolver is safe before migration, while the required app-data backfill corrects legacy composite `model_value` rows.
2. The runtime observation spine already supplies the raw identity and normally short model value; the current provider registry supplies the display provider name.
3. The statistics provider owns one-per-query provider-name context loading; the separate token-usage model-display projection owns pure display derivation for Task and Model statistics.
4. The app-data migration owns legacy-value classification and writes through a database boundary; it does not change canonical identity.
5. GraphQL carries raw identity and display label as separate fields.
6. Frontend tables render display fields without provider-catalog lookups or raw-string parsing.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- There is no obsolete file or storage path to remove. The in-scope legacy behavior is the direct use of raw identifiers as visible labels; remove that use from both Token Statistics table renderers.
- Retain raw API fields intentionally because they are canonical contract data, not compatibility wrappers. Do not introduce a second grouping path or replace raw row IDs.
- Do not add a frontend parser, per-row provider-catalog lookup, dual GraphQL field selection, or canonical-identity rewrite as a compatibility mechanism. The server statistics provider may load the current provider-name map once per query because that is the required display source. The explicitly scoped app-data migration may normalize only validated legacy composite `model_value` values.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- Stored subject, location, representative shape, and approximate volume: `token_usage_ledger_events.model_identifier` and `model_value`; real local data includes `OPENAI_COMPATIBLE`, `openai-compatible:provider_25bbbdb1e3af4f4d958c597a3577d1fa:qwen3.8-max-preview`, and `qwen3.8-max-preview`.
- Relevant code-model, serialization, semantic, or physical-store change: No ledger schema change. The app-data migration performs a value-only correction to legacy `model_value`; the read-time provider-name context, model-display projection/API/UI fields are extended while the accounting aggregate remains unchanged.
- Normal reader/writer behavior and representative evidence: Runtime observation normally writes both model fields; `SqlTokenUsageLedgerRepository` round-trips both. Existing rows with short values are unchanged; legacy composite values are corrected only by the guarded backfill.
- Required semantics and invariants under direct use: Raw identity, provider separation, pricing lookup, token/cost totals, row grouping, and historical visibility remain unchanged.
- Physical-store, privacy/security, disposal/rebuild, and operational constraints: The migration writes only validated derived `model_value` suffixes, does not access provider credentials, does not expose secrets, and must preserve row count and canonical identity. Startup ordering provides the normal ledger quiescence boundary; migration logs provide audit evidence.
- Decision: `Migration Required` for legacy composite `model_value` correction; no schema migration is required.
- Decision rationale, including concrete benefit versus I/O, downtime, corruption, recovery, and rollout cost: The user reports existing rows where the derived model value is already long. Read-time fallback can display them safely, but the requested existing-data cleanup requires a bounded app-data backfill. Rewriting only the validated suffix improves future consumers without changing accounting identity. The migration is idempotent and skip-safe; it does not snapshot mutable provider names or rewrite canonical identifiers.
- Acceptance criteria or design constraints supported by this decision: `REQ-TOKMODEL-002`, `REQ-TOKMODEL-004`, `REQ-TOKMODEL-005`, `REQ-TOKMODEL-006`, `REQ-TOKMODEL-007`, `AC-TOKMODEL-004`, `AC-TOKMODEL-005`, `AC-TOKMODEL-006`, `AC-TOKMODEL-007`, `AC-TOKMODEL-008`.

Migration implementation boundary: `TokenUsageLegacyModelValueBackfillMigration` is registered in `autobyteus-server-ts/src/app-data-migrations/app-data-migration-registry.ts`, runs after Prisma startup migrations, and uses an injected database interface for list/update/count operations so classification and row-preservation behavior can be unit tested. No new persisted display column is part of this change.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-TOKMODEL-001 | `Primary End-to-End` | BEH-TOKMODEL-002 | Runtime model call | Persisted token-usage ledger event | Runtime observation/enrichment pipeline | Establishes that raw identity and short value are both available without changing provider or storage ownership. |
| DS-TOKMODEL-002 | `Primary End-to-End` | BEH-TOKMODEL-001, BEH-TOKMODEL-003, BEH-TOKMODEL-004, BEH-TOKMODEL-005, BEH-TOKMODEL-006, BEH-TOKMODEL-007, BEH-TOKMODEL-008 | Ledger events in requested period plus current provider-name context | Visible Token Statistics table/chart | `TokenUsageStatisticsProvider`, `TokenUsageTaskStatisticsTreeBuilder`, and model-display projection | Carries separate raw identity/grouping and provider:model display label through both UI modes, including legacy values before/after backfill, while accounting-only consumers remain unchanged. |
| DS-TOKMODEL-003 | `Return-Event` | BEH-TOKMODEL-001 | GraphQL response | Pinia state and rendered cells/chart labels | Frontend statistics store and table components | Ensures the display field, not raw identity, reaches user-facing labels. |
| DS-TOKMODEL-004 | `Bounded Local` | BEH-TOKMODEL-006 | Startup app-data migration scan | Corrected historical `model_value` rows and migration record/log | `TokenUsageLegacyModelValueBackfillMigration` plus token-usage database boundary | Repairs only validated legacy derived values, preserves raw identities/row count, and reports skips/failures. |

## Primary Execution Spine(s)

`Token usage ledger events -> TokenUsageStatisticsProvider / TokenUsageTaskStatisticsTreeBuilder -> TokenUsageStatisticsResolver -> Apollo query -> tokenUsageStatistics store -> TokenUsageModelStatisticsTable or TokenUsageTaskStatisticsTable`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-TOKMODEL-001 | Each runtime observation carries the model’s provider, canonical identifier, and request value. Enrichment fills run context and the SQL ledger persists both model fields. | LLM model, token usage observation, enrichment transformer, ledger repository | Existing runtime/token-usage ingestion owners | Pricing resolution, token delta normalization, raw usage JSON |
| DS-TOKMODEL-002 | The statistics provider reads ledger events and loads a custom-provider `{id,name}` map once for the query. It groups Model rows using runtime plus raw canonical identifier, while the model-display projection resolves `<provider name>:<model name>` for AutoByteus and preserves current labels for other runtimes. The task tree carries raw `models` plus an aligned `modelDisplayNames` array from the same display-entry sequence. GraphQL exposes both. | Ledger event, provider-name context, accounting aggregate, model-display entry, model statistics row, task statistics row, GraphQL resolver | `TokenUsageStatisticsProvider` and `TokenUsageTaskStatisticsTreeBuilder` | Date filtering, accounting aggregate summaries, recursive task hierarchy |
| DS-TOKMODEL-003 | The frontend queries explicit display fields, normalizes them with raw-field fallback only for absent/empty payloads, and renders display values in the model cells, chart labels, and task model column. | GraphQL response, Pinia store, model table, task table, bar chart | Frontend statistics store/components | Localization, sorting, responsive table overflow |
| DS-TOKMODEL-004 | At startup, the app-data migration scans the ledger through a narrow database interface, classifies only validated composite `model_value` rows, updates the complete model suffix, and records migrated/skipped/failed details. | Migration definition, row classifier, ledger database adapter, migration runner | App-data migration owner plus token-usage persistence boundary | Startup ordering, retry semantics, row-count preservation, migration logs |

## Spine Actors / Main-Line Nodes

- `TokenUsageLedgerStore` / SQL repository: reads canonical persisted events.
- `TokenUsageStatisticsProvider`: owns raw runtime/model grouping, one-per-query custom-provider name-map loading, and model-row construction.
- `buildTokenUsageCostSummaryAggregate`: owns accounting totals and raw observed model metadata; it remains unchanged for total-cost/run-summary/synthetic aggregate consumers.
- `buildTokenUsageModelDisplayEntries`: owns pure provider/model display resolution and aligned raw/display entries for Model and Task statistics.
- `TokenUsageTaskStatisticsTreeBuilder`: owns recursive task/team grouping and row construction using the same display context and ordered display entries.
- `TokenUsageStatisticsResolver`: authoritative GraphQL boundary; maps domain rows to raw and display fields.
- `TokenUsageLegacyModelValueBackfillMigration`: owns one-time legacy-value classification/backfill and migration summary; it must not rewrite canonical identity or display provider names.
- `tokenUsageStatistics` Pinia store: hydrates GraphQL rows into typed frontend state.
- `TokenUsageModelStatisticsTable` and `TokenUsageTaskStatisticsTable`: render user-facing display labels only.

## Ownership Map

- **LLM model catalog:** owns canonical identity construction and model `name`/`value`; unchanged.
- **Token-usage ingestion and ledger:** owns persisted usage facts; unchanged.
- **Token-usage accounting aggregate:** owns token/cost totals and raw observed model metadata; all existing total-cost, run-summary, and GraphQL summary consumers remain on this accounting-only contract.
- **Token-usage model-display projection:** owns normalization of provider/model display metadata from event facts plus an immutable provider-name context. It must not change grouping or accounting semantics.
- **Legacy-value migration:** owns correction of only validated composite `model_value` values through a database interface; it is not part of normal statistics aggregation.
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
| `TokenUsageLegacyModelValueBackfillMigration.execute` | Legacy derived-value correction | Startup migration runner and migration tests | Updating canonical `model_identifier`, grouping rows, or guessing malformed values | Return per-row counts/details and use an injected database boundary. |

## Dependency Rules

- Runtime/catalog code may continue to produce canonical identifiers and model values; this task must not make it depend on statistics/UI code.
- Token-usage accounting aggregate code may consume event accounting/raw fields only; it must not acquire provider-name context or change its accounting/raw contract.
- Token-usage model-display projection may consume event `runtime_kind`, `model_provider`, `model_identifier`, and `model_value` plus an immutable provider-name context; it must not read files, query the provider registry, or access credentials itself.
- Statistics provider code may use `CustomLlmProviderStore.listProviders()` once per statistics query to build the provider-name context; it must not perform one lookup per event or row.
- Statistics grouping must use `runtimeKind + raw modelIdentifier`, never `modelDisplayName`.
- The legacy app-data migration may update only validated composite `model_value` rows; it must never rewrite `model_identifier`, regroup rows, or infer a provider name from an untrusted/malformed value.
- The migration database adapter owns SQL list/update/count operations; the classifier owns parsing and safety decisions; the migration runner owns status, retry, and logs.
- GraphQL maps server fields; it must not parse custom-provider identifiers.
- Frontend store and tables may consume display fields and raw identity fields but must not call `LLMFactory`, read custom provider files, or parse identifier delimiters.
- The display field must never be used as a row ID, pricing key, deduplication key, or grouping key.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `normalizeTokenUsageModelIdentifier(event)` | Raw model identity | Return non-empty canonical raw identity or `Unknown`. | `model_identifier`, fallback `model_value` | Existing behavior preserved. |
| `TokenUsageModelDisplayContext` (new internal value) | Query-scoped provider metadata | Carry an immutable `customProviderId -> name` map for one statistics query. | Current `CustomLlmProviderStore.listProviders()` result | No event or ledger schema change; no credentials. |
| `buildTokenUsageModelDisplayEntries(events, context)` (new) | Model presentation metadata | Return one ordered raw/display pair per unique raw identifier under the exact fallback contract. | `runtime_kind`, `model_provider`, `model_value`, `model_identifier`, immutable provider-name context | Provider-specific display policy belongs in the model-display projection; config I/O stays in the statistics provider. |
| `TokenUsageRuntimeModelStatisticsRow` | Model diagnostics row | Carry raw grouping identity and display label. | `modelIdentifier` + `modelDisplayName` | Raw row ID remains based on raw identity. |
| `TokenUsageTaskStatisticsRow` | Task statistics row | Carry raw model list and display model list. | `models` + `modelDisplayNames` | Both arrays are aggregate-derived. |
| `TokenUsageLegacyModelValueBackfillMigration` (new) | Legacy derived-value correction | Scan, classify, and idempotently update composite `model_value` rows. | `model_value` + validated `model_identifier` | Does not alter canonical identity or require a new column. |
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
| Legacy data migration lifecycle | `autobyteus-server-ts/src/app-data-migrations` and token-usage SQL repository | `Extend` | Existing runner, registry, status records, and token-usage backfill database pattern support a retry-safe value correction. | N/A |
| Statistics transport | Existing token-usage GraphQL resolver | `Extend` | The resolver already maps row DTOs and is the correct public boundary. | N/A |
| UI presentation | Existing Token Statistics store/tables | `Extend` | Existing components already own table/chart labels. | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| LLM model catalog | Canonical identifier and short model value | DS-TOKMODEL-001 | Runtime adapters | `Reuse` | No changes. |
| Token usage ledger/projection | Raw model metadata and accounting aggregate semantics | DS-TOKMODEL-001, DS-TOKMODEL-002, DS-TOKMODEL-004 | Statistics provider/tree builder and legacy migration | `Extend` | Accounting aggregate remains stable; separate display projection receives immutable provider-name context; migration updates only legacy derived value. |
| Token usage GraphQL API | Raw/display statistics contract | DS-TOKMODEL-002, DS-TOKMODEL-003 | Web clients | `Extend` | Add explicit fields. |
| Token Statistics frontend | Hydration and visible labels | DS-TOKMODEL-003 | User | `Extend` | Render display fields in both modes. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/token-usage/projections/token-usage-model-display-projection.ts` | Token usage projection | Model-display owner | Pure provider-aware display resolution and ordered raw/display entries | Model and Task statistics share display policy without altering the accounting aggregate. | Existing raw normalization; provider context |
| `autobyteus-server-ts/src/token-usage/providers/statistics-provider.ts` | Token statistics | Model stats owner | Load provider-name context once, preserve raw grouping, and attach the matching model-display entry | Query lifecycle and row construction already live here. | Model-display entry projection; custom provider store |
| `autobyteus-server-ts/src/token-usage/providers/task-statistics-tree-builder.ts` | Token statistics | Task tree owner | Raw/display model arrays per task row from one ordered entry sequence | Recursive row construction already lives here; all four constructors share the same mapping helper. | Model-display projection |
| `autobyteus-server-ts/src/app-data-migrations/migrations/token-usage-legacy-model-value-backfill-migration.ts` | App-data migration | Legacy data owner | Classify and backfill composite `model_value` rows through an injected database interface | Migration lifecycle and retry semantics already live in app-data migrations. | Token usage ledger database boundary |
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
| `autobyteus-server-ts/src/app-data-migrations/migrations/token-usage-legacy-model-value-backfill-migration.ts` | App-data migration | Legacy data owner | Scan, classify, update only safe composite values, and report counts/details. | Keeps one-time data correction outside normal statistics code. | Token usage SQL boundary; migration runner |
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
| `autobyteus-server-ts/src/token-usage/providers/statistics-provider.ts` | `Module` | Model statistics provider | Load current provider-name map once, keep raw group key, and attach the matching display entry. | Query lifecycle and grouping are owned here. | Display parsing duplicated from projection or per-row provider I/O. |
| `autobyteus-server-ts/src/token-usage/providers/task-statistics-tree-builder.ts` | `Module` | Task tree provider | Attach aligned display labels to every recursive row constructor. | Task hierarchy owner; shared mapping helper prevents drift. | Frontend label policy or independent array sorting. |
| `autobyteus-server-ts/src/app-data-migrations/migrations/token-usage-legacy-model-value-backfill-migration.ts` | `Module` | App-data migration | Correct only validated legacy composite `model_value` values and report safe skips. | Existing app-data migration boundary owns startup backfills. | GraphQL/UI concerns or canonical identity rewrites. |
| `autobyteus-server-ts/src/app-data-migrations/app-data-migration-registry.ts` | `Module` | App-data migration registry | Register the migration for startup execution/status tracking. | Existing registry is the canonical migration lifecycle owner. | Migration parsing or SQL details. |
| `autobyteus-server-ts/src/api/graphql/types/token-usage-stats.ts` | `Module` | GraphQL boundary | Expose raw/display fields and map them. | Existing public statistics boundary. | Repository queries or derived policy. |
| `autobyteus-web/stores/tokenUsageStatistics.ts` | `Module` | Frontend hydration boundary | Normalize new fields and fallback empty display values. | Existing API state owner. | Provider catalog access. |
| `autobyteus-web/components/settings/token-usage/TokenUsageModelStatisticsTable.vue` | `Module` | Model UI | Render display name in cells/charts. | Existing visual owner. | Canonical identity/grouping logic. |
| `autobyteus-web/components/settings/token-usage/TokenUsageTaskStatisticsTable.vue` | `Module` | Task UI | Render display-name array. | Existing visual owner. | Provider-specific parsing. |
| `autobyteus-server-ts/prisma/*` | `Folder` | Persistence | No schema change; existing columns suffice for the value-only backfill. | The requested correction does not need a new column. | Provider-name snapshot column or canonical identity rewrite. |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/token-usage` | `Main-Line Domain-Control` plus existing provider/projection subfolders | Yes | Low | Reuse existing token-usage structure; no new generic folder. |
| `autobyteus-server-ts/src/api/graphql/types` | `Transport` | Yes | Low | Only maps domain fields to GraphQL. |
| `autobyteus-web/stores` and `components/settings/token-usage` | `Transport` / UI | Yes | Low | Store and components remain separate. |
| `autobyteus-server-ts/prisma` | `Persistence-Provider` | Yes | Low | Schema remains unchanged; the app-data migration runs after Prisma startup migrations. |

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
| Add a persisted provider-name/display snapshot column | Could make historical provider labels immutable. | `Rejected for this change` | Use current provider-name lookup plus the value-only legacy backfill; reserve a schema/ingestion snapshot for a separate immutable-history requirement. |
| Rewrite canonical `model_identifier` to provider:model | Would make existing stored values look short. | `Rejected` | Preserve provider-scoped identity; backfill only legacy composite `model_value` to the model suffix. |
| Value-only legacy composite `model_value` backfill | Repairs existing deployments where the derived value is also long. | `Accepted` | Register an idempotent app-data migration with strict parsing and row-preserving skips. |
| Keep rendering raw values in one table as a fallback path | Would avoid changing every UI consumer. | `Rejected` | Both Task and Model tables consume display fields; raw fields remain API/debug only. |

## Derived Layering (If Useful)

`Startup app-data migration (legacy model_value correction) -> Ledger facts + current provider-name context -> Accounting aggregate (unchanged raw/cost facts) + model-display projection (ordered raw/display entries) -> Statistics provider/tree builder (raw grouping + display row DTO) -> GraphQL transport (raw + display fields) -> Pinia normalization -> Vue display`

The separate model-display projection is intentional rather than a generic abstraction: `getTotalCost`, run-summary adaptation, synthetic `summaryAggregate()`, and existing aggregate GraphQL consumers remain on the accounting-only aggregate and do not need provider context. Model and Task statistics are the only consumers of the provider-aware display projection.

## Change / Refactor Sequence

1. Add and unit-test the immutable provider-name context and pure display projection with the exact parser, malformed-value fallback, deleted-provider fallback, provider-map failure, raw/value conflict, empty, and colon-preserving cases.
2. Enumerate and test every shared accounting consumer (`getTotalCost`, `token-usage-run-summary-adapter.ts`, synthetic GraphQL `summaryAggregate()`, and existing aggregate GraphQL mappings) to prove they remain on the unchanged accounting aggregate without display context.
3. Add the app-data migration definition with fixed ID `20260730_token_usage_custom_provider_model_value_backfill`, exact classifier matrix, injected database interface, registry order, CAS update, independent durability, startup continuation, terminal-warning/failure mapping, retry, recovery, and row-count/raw-identity invariant tests.
4. Add domain row fields and populate Model plus all four recursive Task constructors from one ordered display-entry sequence; assert equal lengths, positional correspondence, duplicate display labels, and empty rows.
5. Add GraphQL fields and mappings; update the frontend query documents and regenerate `autobyteus-web/generated/graphql.ts`.
6. Add frontend types/store normalization and update both table components/chart labels to consume display fields while retaining raw fields for diagnostics/fallback.
7. Add/adjust server statistics tests and frontend store/component tests for custom provider:model, built-in provider:model, non-AutoByteus unchanged labels, same-model/different-provider, colon suffix, provider deletion/missing context, and all fallback scenarios.
8. Run implementation-scoped typechecks/unit tests. API/E2E engineer then decides broader GraphQL/browser coverage and executes it.
9. Remove no storage/provider code; remove only the obsolete raw-as-visible-label uses from both table modes. Keep the accounting aggregate, model-display projection, and migration as the new owners.

## Key Tradeoffs

- **Separate fields versus replacing raw fields:** adds a small GraphQL/type surface but makes identity versus presentation explicit and protects grouping/debugging semantics.
- **Separate display projection versus extending the accounting aggregate:** keeps provider I/O and presentation out of `getTotalCost`, run-summary, synthetic GraphQL summary, and other shared accounting consumers; Model/Task statistics receive an explicit ordered projection instead of forcing every aggregate caller to carry display context.
- **Server versus frontend derivation:** server derivation uses persisted facts consistently across Task and Model views and joins the current provider-name map once per query; it avoids duplicate policy and per-row frontend catalog I/O.
- **Current provider name versus ingestion snapshot:** current provider configuration provides the requested readable name without schema migration; the tradeoff is that historical labels follow rename/deletion state. Raw identity remains stable. An ingestion snapshot is deferred because it would require a larger data-contract change.
- **`model_value` versus parser:** a non-composite `model_value` is the preferred model label and preserves arbitrary model names. The anchored parser handles only the provider-scoped composite shape and preserves the complete suffix; malformed composite markers are not treated as ordinary names.
- **No schema migration:** historical rows benefit immediately when they already carry `model_value` and a current provider record; the value-only app-data backfill repairs composite legacy values, while malformed or deleted-provider rows remain visible with deterministic fallback rather than being guessed.
- **Value-only migration versus no data change:** the display resolver remains safe without migration, but the requested cleanup of deployments with composite `model_value` requires the bounded backfill. It does not snapshot provider names or rewrite canonical identity.
- **Independent row updates versus all-rows transaction:** independent commits let a large ledger make durable partial progress and allow safe retry, while explicit FAILED details and final row-count checks make update errors observable rather than silently partial.

## Risks

- Some old rows may lack both a short value and a valid custom-provider identifier; they will show their raw identity or `Unknown`, which is explicit and deterministic.
- If a provider emits an incorrect `model_value`, the display can be incorrect while raw identity remains correct; this is preferable to changing accounting identity and is visible in raw diagnostics.
- Adding GraphQL fields requires schema/codegen refresh and coordinated server/frontend rollout; implementation and API/E2E checks must verify the generated contract.
- A task row containing multiple provider identities may show duplicate provider:model display names if provider names/model names match; raw `models` remains available for diagnostics, and grouping is not collapsed.
- A provider rename changes the display label of historical rows, and a deleted provider falls back to `OpenAI-Compatible (<providerId>)` when the raw ID is recoverable. This is a read-time presentation limitation, not an accounting risk.
- Legacy rows with malformed or conflicting composite `model_value`/`model_identifier` are skipped and reported; they still render through the runtime fallback path.

## Guidance For Implementation

- Do not modify `buildOpenAICompatibleEndpointModelIdentifier`, provider registration, runtime token observation, SQL schema, or pricing lookup.
- Load custom provider names through `CustomLlmProviderStore.listProviders()` once per Model/Task statistics query in the statistics provider; pass an immutable map/context to the model-display projection and tree builder. Do not read provider configuration from the accounting aggregate or frontend. If loading fails, pass a failure marker so the projection emits `OpenAI-Compatible (<providerId>)` rather than throwing.
- Register a required `TokenUsageLegacyModelValueBackfillMigration` in the app-data registry. Use a validated anchored prefix parser, preserve suffix colons, update only `model_value`, and expose an injectable database interface for tests. Do not rewrite `model_identifier` or add a schema column for this change.
- Keep `normalizeTokenUsageModelIdentifier` unchanged for raw identity semantics. Add a separate model-display projection with an explicit provider/prefix check and expose the ordered `TokenUsageModelDisplayEntry[]` as the only source for Model/Task display arrays.
- For `runtime_kind = autobyteus`, use `getLlmProviderDisplayName` for built-in provider names and the saved custom-provider `name` for custom providers. Apply the exact raw/value precedence and conflict matrix above; use a parser that removes exactly the `openai-compatible:<providerId>:` prefix and preserves the rest, not a naïve fixed-index split. A value beginning with that prefix but failing the grammar is malformed, not an ordinary model name.
- For non-AutoByteus runtimes, preserve the current model display behavior rather than applying the provider:model prefix.
- Add `modelDisplayName`/`modelDisplayNames` to domain and GraphQL contracts; keep `modelIdentifier`/`llmModel` and `models` unchanged.
- Preserve raw row IDs and sorting/grouping behavior.
- Render only display fields in both tables and chart labels. Use the exact provider:model format for AutoByteus; do not add new localization copy or reformat other runtimes.
- Regenerate tracked GraphQL output after query changes and run the repository’s web boundary/localization guards if required by the implementation environment.
