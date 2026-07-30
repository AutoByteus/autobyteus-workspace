# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

`Refined`

## Goal / Problem Statement

When the `AutoByteus` runtime is selected, Token Statistics currently exposes the internal custom-provider model identity (`openai-compatible:provider_<opaque-id>:<model>`) as the visible model value. That string is useful as a stable accounting identity but is unnecessarily long and difficult to read. Some historical records may also have the composite value stored in `model_value`, so the fix must cover existing data as well as newly queried rows. Token Statistics should expose a provider-aware display label in the form `<provider name>:<model name>`, while retaining the canonical raw identity for attribution and grouping. The ledger should become self-contained for future display: persist one `provider_name` snapshot alongside the existing provider type, canonical identifier, and model value.

## Current And Desired Behavior (Mandatory)

| Behavior ID | Current Behavior | Desired Behavior | Preserved / Unchanged Behavior | Related Requirement / Acceptance-Criteria IDs |
| --- | --- | --- | --- | --- |
| BEH-TOKMODEL-001 | For `runtime_kind = autobyteus`, Token Statistics displays the raw custom-provider identity, including `openai-compatible` and an opaque provider ID. | Display the persisted provider-name snapshot followed by the model name, separated by `:`; for a legacy row without a snapshot, use current provider metadata and the deterministic fallback. | The configured provider name is captured at event time for new rows; no provider rename is introduced by this task. | REQ-TOKMODEL-001, REQ-TOKMODEL-009, AC-TOKMODEL-001, AC-TOKMODEL-010 |
| BEH-TOKMODEL-002 | Token usage rows and model grouping use the same raw model identity that supports usage attribution. | Keep the canonical raw identity as the accounting/grouping key and expose it separately from the display label. | Token counts, cache counts, date filtering, pricing, row IDs, and distinct raw-model grouping remain unchanged. | REQ-TOKMODEL-002, AC-TOKMODEL-004 |
| BEH-TOKMODEL-003 | Task mode exposes the same raw opaque identity in each task row's model list. | Task mode displays a provider:model label for each AutoByteus model while retaining the raw model list in the API. | Recursive task/team hierarchy and raw `models` values remain unchanged. | REQ-TOKMODEL-001, REQ-TOKMODEL-002, AC-TOKMODEL-002, AC-TOKMODEL-004 |
| BEH-TOKMODEL-004 | Non-AutoByteus runtimes display their existing model labels. | Preserve the existing non-AutoByteus display behavior for this change. | Codex, Claude SDK, and other runtime labels are not reformatted by this task. | REQ-TOKMODEL-003, AC-TOKMODEL-003 |
| BEH-TOKMODEL-005 | Missing, legacy, or malformed model metadata has no provider-aware display policy. | Use a deterministic readable fallback without crashing or conflating distinct raw rows. | Unknown usage remains visible and attributable. | REQ-TOKMODEL-004, AC-TOKMODEL-005 |
| BEH-TOKMODEL-006 | Existing historical custom-provider rows may have the composite identifier in `model_value`, in addition to `model_identifier`. | The statistics path must display the provider:model label for those rows; an idempotent app-data backfill may normalize only the legacy `model_value` while preserving `model_identifier`. | Existing raw identity, counts, grouping, and rows must remain unchanged. | REQ-TOKMODEL-005, AC-TOKMODEL-006 |
| BEH-TOKMODEL-007 | Shared aggregate consumers currently receive the accounting aggregate without provider-display context. | Keep `getTotalCost`, run-summary adaptation, synthetic `summaryAggregate()`, and existing aggregate GraphQL mappings on the unchanged accounting-only aggregate; add display metadata only to Model/Task statistics projections. | Accounting totals, pricing, raw model metadata, and summary semantics remain unchanged. | REQ-TOKMODEL-006, AC-TOKMODEL-008 |
| BEH-TOKMODEL-008 | Recursive Task rows derive raw model arrays from aggregate observations, but have no display-array alignment contract. | Derive raw and display arrays from one ordered entry sequence for standalone, team, nested, and legacy-member constructors, including empty and duplicate cases. | Hierarchy, row identity, ordering, and raw `models` remain unchanged. | REQ-TOKMODEL-007, AC-TOKMODEL-008 |
| BEH-TOKMODEL-009 | AutoByteus token-usage ledger rows store provider type, canonical identity, and model value, but custom rows have no persisted readable provider name. | Persist one nullable `provider_name` snapshot for AutoByteus events; custom providers use the configured custom name at event time, while AutoByteus built-in provider IDs already map to readable names. | `model_provider` remains the generic provider type/enum (for example `OPENAI_COMPATIBLE`); `model_identifier` remains the stable provider-instance/model identity; Codex/Claude provider_name is irrelevant/nullable; no provider ID column or identity rewrite is introduced. | REQ-TOKMODEL-008, REQ-TOKMODEL-009, AC-TOKMODEL-009, AC-TOKMODEL-010 |
| BEH-TOKMODEL-010 | Supported token-usage events arrive through both the shared AutoByteus `autobyteus-ts` model-normalizer path and independent server Codex/Claude producers. | AutoByteus shared observations carry a readable snapshot inside `usage.provider_name`; direct Codex/Claude events remain nullable for `provider_name` and retain their existing top-level model facts. Common normalization preserves a supplied top-level value over nested when both exist, without inventing one when neither exists. | Provider snapshots are in scope only for AutoByteus events: custom providers use the configured custom name and AutoByteus built-ins use their readable provider name. Direct runtimes have no configured/saved provider name in this feature scope and remain unchanged. | REQ-TOKMODEL-008, REQ-TOKMODEL-010, AC-TOKMODEL-003, AC-TOKMODEL-009, AC-TOKMODEL-011 |

## Investigation Findings

The long value is intentional as a canonical runtime identity, not a corrupt model name. `autobyteus-ts` constructs custom-provider identifiers as `openai-compatible:<providerId>:<modelName>` so two providers exposing the same model remain distinct for routing and accounting. Token usage observations persist both this canonical `model_identifier` and the short `model_value`; the SQL ledger keeps both fields.

The statistics projection currently groups by the canonical identifier and returns that same identifier as `UsageStatistics.llmModel` and task-row `models`, so the frontend prints the internal identity directly. The supplied database contains the exact reported identity with `model_value = qwen3.8-max-preview`.

The requested provider name is not currently persisted on each token event. Custom provider names are currently resolved from the saved custom-provider registry by provider ID; built-in provider names use the existing provider-display-name mapping. The revised direction is to add one nullable ledger `provider_name` snapshot populated during ingestion for AutoByteus events. This is specifically needed because custom AutoByteus rows have generic `model_provider = OPENAI_COMPATIBLE`, while the configured custom-provider name makes the statistics label readable; AutoByteus built-in provider IDs already have readable names. For new AutoByteus rows, the snapshot makes display independent of later custom-provider deletion or rename. Codex and Claude Code are outside this provider-name use case, so their `provider_name` remains irrelevant/nullable and their existing non-AutoByteus display is unchanged. The raw ledger identity remains authoritative. Rows without a snapshot continue to use current-registry lookup when applicable and a deterministic fallback when not. This is intentionally one simple display-metadata column, not a second provider identity column.

The ingestion boundary has two supported producer families with deliberately different scope. The shared AutoByteus `autobyteus-ts` path emits `TokenUsageUpdatedData` with a nested `usage` observation created by `buildLlmTokenUsageObservation`; its model identity already exposes `providerName`, and the shared normalizers are AutoByteus, OpenAI-compatible, Anthropic, Gemini, and Ollama. For AutoByteus events, this path supplies the provider-name snapshot. Independent server producers are `resolveCodexThreadTokenUsage` -> `CodexAgentRunBackend.consumeReadyTokenUsageEvents` and `buildClaudeTokenUsageEvent` -> `ClaudeSessionEventConverter`; these produce top-level model payload fields and do not pass through the shared model normalizers. Codex and Claude have no configured/saved provider name in this feature scope, so their `provider_name` remains nullable and their existing model facts and non-AutoByteus display remain unchanged. The design covers both families before `createTokenUsageUpdatedPayload`, context enrichment, persistence, and SQL/Prisma round trip, including a null-preservation test for direct producers.

The user clarified that some existing statistics data may already have the composite value in `model_value`. The current local database probe on the task base contains short `model_value` values for its sampled custom-provider rows, but the codebase app-data migration framework can support an idempotent legacy backfill for deployments where `model_value` is composite. The backfill must derive only the model suffix from a validated canonical identifier, leave `model_identifier` untouched, and report skipped/ambiguous rows rather than guessing.

## Relevant Supplemental Task Artifacts

None. The requirements, investigation notes, and design spec fully capture the intended behavior and evidence; no separate UI/UX or data-mapping supplement materially improves this narrow table/API change.

## Design Health Assessment (Mandatory)

- Change posture: `Bug Fix` / `Behavior Change`
- Initial design issue signal: `Yes`
- Root cause classification: `Boundary Or Ownership Issue`
- Refactor posture: `Likely Not Needed`
- Evidence basis: The LLM catalog and ledger already separate canonical model identity from short model value, while the statistics projection exposes the identity as presentation. The provider registry already owns configured custom-provider names and the LLM package already owns built-in provider display names. The missing behavior is a provider-aware display projection, an ingestion-time display snapshot, and bounded corrections for legacy composite `model_value` and recoverable provider-name rows.
- Requirement or scope impact: Preserve raw accounting identity, add provider-aware display labels only for AutoByteus runtime rows, retain current labels for other runtimes, persist one provider-name snapshot for future rows, and add idempotent app-data backfills for legacy composite `model_value` values and recoverable provider names.

## Recommendations

Trace the canonical model identity and provider display name from runtime usage through the token-statistics ledger, read API, and Vue display. Add one nullable `provider_name` ledger field populated at ingestion, retain the current custom-provider lookup only as a legacy-row fallback, derive `<provider name>:<model name>` for AutoByteus, and leave raw identity/grouping unchanged. Prefer the existing explicit display field over frontend database-like composition or raw-field replacement.

## Scope Classification (`Small`/`Medium`/`Large`)

`Medium`; the behavior is narrow, but the fix crosses token-usage ingestion/observation and Prisma schema, the server statistics projection, provider-name lookup fallback, GraphQL contract, frontend query/store, both Token Statistics table modes, and the existing app-data migration runner/ledger repository.

## In-Scope Use Cases

- View Model statistics for AutoByteus runs using a saved custom OpenAI-compatible provider.
- View Task statistics for AutoByteus runs using one or multiple providers/models.
- View Model or Task statistics for AutoByteus runs using built-in providers.
- View non-AutoByteus statistics and verify their existing labels remain unchanged.
- Record direct Codex and Claude token events and verify `provider_name` remains null, is not replaced by a guessed label, and existing provider type/canonical model identity and non-AutoByteus display remain unchanged.
- View rows whose provider configuration is missing or whose model identity is malformed/legacy.
- Run the guarded app-data backfill for historical rows whose `model_value` contains the composite custom-provider identity.
- Record new token usage for built-in and custom providers and verify the ledger contains a readable `provider_name` snapshot.
- Delete or rename a custom provider after usage was recorded and verify historical Token Statistics still uses the stored provider name.
- Run the provider-name snapshot backfill for existing rows whose provider name can still be recovered from built-in metadata or the current custom-provider registry.

## Out of Scope

- Changing provider registration IDs, runtime provider selection, or model routing.
- Changing token accounting, pricing, cache-token computation, filtering semantics, or raw grouping.
- Renaming providers in the provider configuration UI.
- Rewriting canonical historical `model_identifier` values or merging rows by display name.
- Reformatting non-AutoByteus runtime model labels.
- Adding a second provider identity column; the existing composite `model_identifier` already contains the custom provider instance ID.

## Functional Requirements

- `REQ-TOKMODEL-001`: When `runtime_kind` is `autobyteus`, the visible Token Statistics model label must be `<provider name>:<model name>`. Prefer a non-empty persisted `provider_name` snapshot. For a legacy row without one, use the current saved custom-provider `name` resolved from its provider ID, or the exact deterministic fallback. `<model name>` is the non-empty `model_value` or a safe identifier suffix fallback. Example: `alibaba_cloud:qwen3.8-max-preview`.
- `REQ-TOKMODEL-002`: The canonical raw model identity must remain unchanged in storage, grouping, row identity, attribution, pricing, and raw API fields. The provider:model display label must not replace or merge raw identities.
- `REQ-TOKMODEL-003`: For AutoByteus built-in providers, use the existing canonical provider display name plus the model name, such as `DeepSeek:deepseek-v4-flash`. For runtimes other than AutoByteus, preserve the current visible model-label behavior.
- `REQ-TOKMODEL-004`: Display normalization must be deterministic and safe for unknown, deleted, malformed, and legacy provider/model values. It must not crash, blank the row, or silently conflate distinct raw identities. A raw identity remains available when a friendly provider name cannot be resolved. If one Task raw identifier is observed under multiple runtime kinds and therefore cannot have one unambiguous runtime-specific label, the display projection must retain that raw identifier as the non-reformatted fallback.
- `REQ-TOKMODEL-005`: Existing historical rows whose `model_value` contains a validated `openai-compatible:<providerId>:<modelName>` composite must be handled by the statistics display path and, when the app-data migration runs, normalized to the complete `<modelName>` suffix only. The migration must be idempotent, preserve `model_identifier`, and skip/report rows that cannot be safely classified.
- `REQ-TOKMODEL-006`: The display resolver and legacy backfill must use the same anchored composite grammar and explicit conflict matrix: migration scope is `trim(runtime_kind).toLowerCase() === "autobyteus"` plus `trim(model_provider).toUpperCase() === "OPENAI_COMPATIBLE"`; valid composite values are eligible only when that scope matches; malformed composites, missing raw identity, raw/value conflicts, and non-composite raw identities are skipped by the backfill with reason codes and never guessed. The accounting aggregate and every shared consumer (`getTotalCost`, run-summary adaptation, synthetic `summaryAggregate()`, and existing GraphQL summary mappings) must remain display-context-free and unchanged.
- `REQ-TOKMODEL-007`: Model and Task display metadata must be derived from one ordered raw/display entry sequence. Task `models` and `modelDisplayNames` must always have equal length and positional correspondence, including recursive rows, duplicate display labels, and empty-model rows.
- `REQ-TOKMODEL-008`: Persist one nullable `provider_name` snapshot on each new **AutoByteus** token-usage ledger event. For AutoByteus custom providers it is the configured provider `name` at ingestion; for AutoByteus built-ins it is the existing human-readable provider display name. Direct Codex and Claude events are explicitly nullable because those runtimes have no configured/saved provider name in this feature scope; do not guess one. Keep `model_provider` as the stable provider type/enum, keep `model_identifier` as the canonical provider-instance/model identity, and do not store secrets.
- `REQ-TOKMODEL-009`: Token Statistics display resolution must prefer the trimmed persisted `provider_name` snapshot, then use current provider-registry lookup only for legacy rows where the snapshot is null/empty, then use the exact deterministic fallback. A provider rename or deletion after ingestion must not change or erase the stored historical display name for rows with a snapshot. An empty configured name is not a usable snapshot.
- `REQ-TOKMODEL-010`: Supported ingestion-source contract: (a) for **AutoByteus** events, the shared `autobyteus-ts` normalizers `createAutoByteusTokenUsageObservation`, `createOpenAICompatibleTokenUsageObservation`, `createAnthropicTokenUsageObservationFromAccumulator`, `createGeminiTokenUsageObservation`, and the `OllamaLLM` response normalizer copy `model.providerName` into nested `usage.provider_name`; (b) `resolveCodexThreadTokenUsage` and `buildClaudeTokenUsageEvent` are preserved direct producers whose `provider_name` remains nullable because Codex/Claude have no configured/saved provider name in scope; (c) `createTokenUsageUpdatedPayload` resolves a non-empty top-level `source.provider_name` first and nested `source.usage.provider_name` second, adds quality flag `provider_name_top_level_nested_conflict` for a non-equal conflict while retaining the top-level value, and context enrichment never replaces a supplied value—including null—with run configuration, a guessed built-in label, or registry lookup. All producer outputs then pass unchanged through context enrichment, event forwarding, SQL/Prisma persistence, and repository read-back.

## Acceptance Criteria

- `AC-TOKMODEL-001`: A Model-statistics row for the supplied AutoByteus custom provider renders `alibaba_cloud:qwen3.8-max-preview` (or the configured saved provider name plus `qwen3.8-max-preview`) and does not render the `openai-compatible:provider_<id>:` prefix.
- `AC-TOKMODEL-002`: A Task-statistics row for the same AutoByteus custom provider renders the same provider:model display label in its model column; recursive task rows and raw model identity remain intact.
- `AC-TOKMODEL-003`: A non-AutoByteus row such as Codex or Claude SDK retains its current model label and is not prefixed with a provider name by this change.
- `AC-TOKMODEL-004`: API payloads, raw model fields, token counts, cache counts, pricing, grouping, filtering, and row/task identity retain their existing semantics; only the explicitly designated display field changes.
- `AC-TOKMODEL-005`: Unknown/deleted-provider, missing-`model_value`, malformed, and colon-containing model identities render a deterministic non-empty fallback, preserve the complete model suffix where available, and do not fail the statistics view or merge raw rows.
- `AC-TOKMODEL-006`: A historical row with `model_value = openai-compatible:provider_<id>:org/model:tag` is displayed as `<provider name>:org/model:tag`; after a successful backfill, its `model_value` is `org/model:tag`, its `model_identifier` is unchanged, and rerunning the migration does not change it again. Ambiguous rows are reported as skipped rather than modified.
- `AC-TOKMODEL-007`: A deleted custom provider displays `OpenAI-Compatible (<providerId>):<model>` when the raw provider ID is recoverable; a provider-map load failure follows the same fallback; a missing provider with a usable model is `Unknown Provider:<model>`, and when both provider and model are missing the result is `Unknown Provider:Unknown Model`; malformed or conflicting values never throw and retain raw grouping/visibility. The backfill uses fixed ID `20260730_token_usage_custom_provider_model_value_backfill`, is required at startup, continues startup after failure, permits independently durable partial updates, returns `SUCCEEDED`, `SUCCEEDED_WITH_WARNINGS`, or `FAILED` according to the specified matrix, retries `FAILED` rows on `runPending()` and retries unresolved warning rows only through explicit `runMigration(id)`, without rewriting completed rows.
- `AC-TOKMODEL-008`: For every Model row and recursive Task/team/member row, `modelDisplayName`/`modelDisplayNames` is derived from the same ordered raw identifiers; equal display names for distinct raw identifiers remain as distinct positions, a cross-runtime raw collision uses the unchanged raw label rather than a misleading prefix, and `getTotalCost`, run-summary, synthetic `summaryAggregate()`, and existing aggregate GraphQL consumers retain their prior accounting-only input/output semantics.
- `AC-TOKMODEL-009`: A newly persisted **AutoByteus** built-in event stores its readable provider name (for example `DeepSeek`) in `provider_name` while retaining `model_provider = DEEPSEEK`; a newly persisted AutoByteus custom event stores its configured name (for example `alibaba_cloud`) while retaining `model_provider = OPENAI_COMPATIBLE` and the provider-scoped `model_identifier`. Direct Codex/Claude events persist nullable `provider_name` and are not assigned `OpenAI`/`Anthropic` by this feature. No API key, base URL, or other secret is stored in this field.
- `AC-TOKMODEL-010`: After a custom provider is renamed or deleted, a historical row with `provider_name = alibaba_cloud` still displays `alibaba_cloud:<model>`; legacy rows with null/empty `provider_name` use current lookup/fallback. The provider-name backfill is idempotent, updates only null/empty `provider_name`, preserves row count/raw identity/model value/accounting fields, reports unrecoverable old IDs as warnings, and never guesses a name.
- `AC-TOKMODEL-011`: Producer-specific persistence tests prove that an AutoByteus shared nested observation reaches `TokenUsageUpdatedPayload.provider_name` and the ledger unchanged, while direct Codex and direct Claude events reach the same boundaries with `provider_name = null` unchanged. Direct null is never replaced by `OpenAI`, `Anthropic`, current registry data, or `model_identifier`; a supplied top-level provider name still wins over a conflicting nested value with `provider_name_top_level_nested_conflict` for applicable payloads.

## Constraints / Dependencies

- Must respect the actual API contract and existing token-statistics row/grouping model.
- New rows carry their provider display name in the ledger; only legacy rows with null/empty `provider_name` depend on the saved custom-provider registry being readable at statistics-query time. The raw identity must remain available if it is not.
- Supported ingestion paths are the shared AutoByteus model-normalizer family plus preserved direct Codex and Claude server producers. Only AutoByteus events receive a provider-name snapshot; direct Codex/Claude `provider_name` remains nullable. New-event persistence must not perform a statistics-time provider-registry lookup or invent a direct-runtime provider name.
- Must not expose provider secrets. A configured provider name is display metadata; raw opaque IDs remain diagnostic data, not the preferred visible label.
- Must retain enough raw identity for debugging and attribution.
- Existing screenshot reference: `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_f364ca0e175d4d40bbe5d2dc0f7b014d/solution_designer_19192af872d74a33ba858e74f105aaa0/context_files/ctx_e3e9bb540b7c__image.png`.

## Persisted Data Outcome (When Applicable)

- Stored subject / location: `token_usage_ledger_events.provider_name`, `model_identifier`, and `model_value`, read through the SQL token-usage ledger repository. The current custom-provider registry stores provider `id` and user-facing `name` separately.
- Required outcome: `Migration Required` for the schema expansion, new-event ingestion, and two legacy-data corrections; the display resolver must still work safely before/without either app-data backfill.
- Existing data to preserve, discard/rebuild, transform, or quarantine: Preserve all usage records and canonical identities. Transform only legacy composite `model_value` values to their validated model suffix and fill null/empty `provider_name` only when the provider name is recoverable from built-in metadata or the current custom-provider registry; skip/report ambiguous or deleted-provider rows rather than guessing.
- Unacceptable data loss or corruption: Any loss of provider/model attribution or merging of distinct raw identities.
- Relevant availability, maintenance-window, or rollout constraints: Use a Prisma schema migration before startup app-data migrations, then run the provider-name and model-value backfills through the existing runner. New token events must populate `provider_name` before ledger insertion; app-data updates must be retry-safe and row-count preserving.
- Historical-name policy: `provider_name` is an ingestion-time snapshot. Provider rename/deletion does not change historical rows that contain a snapshot; legacy rows without one retain current lookup/fallback behavior.
- Migration caveat: The provider-name backfill cannot recover a deleted provider’s old name without an explicit mapping; it must report those rows rather than guessing. The existing model-value backfill remains value-only.
- Related requirement and acceptance-criteria IDs: REQ-TOKMODEL-001, REQ-TOKMODEL-002, REQ-TOKMODEL-004, REQ-TOKMODEL-005, REQ-TOKMODEL-008, REQ-TOKMODEL-009, AC-TOKMODEL-004, AC-TOKMODEL-005, AC-TOKMODEL-006, AC-TOKMODEL-009, AC-TOKMODEL-010.

## Assumptions

- The opaque prefix is an internal provider identity; the configured provider `name` is the intended user-facing provider label.
- `model_value` is the authoritative concise model label when present.
- `provider_name` is an ingestion-time display snapshot, not a provider routing key or secret.
- The user expects the `provider:model` display format for AutoByteus runtime statistics, not a change to provider configuration or ledger identity.

## Risks / Open Questions

- Provider names are mutable configuration metadata, so the new snapshot intentionally preserves the historical name even after a rename; the raw identity remains authoritative.
- Deleted-provider legacy rows created before the snapshot column still cannot be recovered automatically. The fallback must remain non-empty and deterministic while raw identity remains available.
- Some existing deployments may have composite values in `model_value`; the backfill must validate the canonical shape, preserve model names containing `:`, remain idempotent, and report ambiguous rows without guessing.
- Schema expansion and ingestion propagation must roll out before relying on `provider_name`; nullable reads and current lookup/fallback preserve older rows during rollout.
- The exact fallback is fixed: a missing/deleted custom provider or provider-map load failure uses `OpenAI-Compatible (<providerId>)`; an unrecognized non-empty provider uses `Unknown Provider (<provider>)`; a missing provider uses `Unknown Provider`; a missing model uses `Unknown Model`. The fallback must not crash or merge rows.
- Existing tests asserting raw visible text need to be updated to assert display fields while retaining raw API/grouping assertions.

## Requirement-To-Use-Case Coverage

| Requirement ID | In-Scope Use Case(s) |
| --- | --- |
| REQ-TOKMODEL-001 | AutoByteus custom-provider Model and Task statistics |
| REQ-TOKMODEL-002 | All token-statistics views and grouping/filtering |
| REQ-TOKMODEL-003 | AutoByteus built-in providers; all non-AutoByteus runtimes |
| REQ-TOKMODEL-004 | Unknown/deleted/malformed/legacy token-statistics rows |
| REQ-TOKMODEL-005 | Existing legacy token-usage rows and app-data migration |
| REQ-TOKMODEL-006 | Legacy classifier, accounting-consumer preservation, and migration lifecycle |
| REQ-TOKMODEL-007 | Model/Task ordered display-entry alignment and recursive rows |
| REQ-TOKMODEL-008 | New-event provider-name snapshot and provider-type/name separation |
| REQ-TOKMODEL-009 | Snapshot-first display resolution and deletion/rename stability |
| REQ-TOKMODEL-010 | AutoByteus snapshot propagation plus preserved nullable direct Codex/Claude paths |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criteria ID | Scenario Intent |
| --- | --- |
| AC-TOKMODEL-001 | Supplied custom-provider Model row uses saved provider name:model label |
| AC-TOKMODEL-002 | Task row uses the same display label without changing raw task data |
| AC-TOKMODEL-003 | Non-AutoByteus labels remain unchanged |
| AC-TOKMODEL-004 | Raw API/accounting semantics remain unchanged |
| AC-TOKMODEL-005 | Fallbacks are readable, complete, non-empty, and non-merging |
| AC-TOKMODEL-006 | Existing composite `model_value` is safely backfilled to the model suffix |
| AC-TOKMODEL-007 | Exact fallback, migration registration/status/retry, and startup-continuation behavior |
| AC-TOKMODEL-008 | Shared aggregate consumers stay accounting-only and all Task arrays stay positionally aligned |
| AC-TOKMODEL-009 | New built-in/custom events persist provider display names without changing provider type identity |
| AC-TOKMODEL-010 | Historical snapshot display survives rename/deletion and legacy backfill is safe/idempotent |
| AC-TOKMODEL-011 | AutoByteus shared persistence, direct null preservation, and top-level/nested precedence |

## Approval Status

The user clarified and approved the self-contained historical-display behavior in follow-up: persist one nullable `provider_name` value with each **AutoByteus** token-usage ledger event because custom AutoByteus rows expose only the generic `OPENAI_COMPATIBLE` provider type and need the configured custom name for readable statistics. AutoByteus built-in provider IDs already correspond to readable names. Use the snapshot directly for provider-aware display, keep `model_provider` as the provider type, and preserve the canonical provider-scoped `model_identifier`. Codex and Claude Code are outside this provider-name use case; their `provider_name` remains irrelevant/nullable and their existing non-AutoByteus display behavior is unchanged. This refined requirements basis includes schema/ingestion work plus idempotent legacy-data backfills and is ready for the ARCH-REV-005 architecture gate; no intended-behavior supplemental artifact applies.
