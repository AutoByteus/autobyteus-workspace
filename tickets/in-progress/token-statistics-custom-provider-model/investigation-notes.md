# Investigation Notes

## Investigation Status

- Bootstrap Status: `Complete` — dedicated ticket worktree created from refreshed `origin/personal`; Draft requirements were created before deep investigation.
- Current Status: `Investigation complete; solution package revised for ARCH-F-001 through ARCH-F-005 and ready for architecture review`
- Investigation Goal: Determine why Token Statistics exposes an opaque custom-provider model identity, define a safe provider:model display projection for the AutoByteus runtime, and assess correction of historical rows whose stored `model_value` is also composite.
- Scope Classification (`Small`/`Medium`/`Large`): `Medium`.
- Scope Classification Rationale: The root cause is narrow, but the fix crosses the server statistics projection, current custom-provider registry lookup, GraphQL fields, frontend query/store, both table modes, the existing app-data migration runner/ledger database boundary, and durable tests. No schema migration is needed, but a value-only legacy backfill is required for the clarified existing-data case.
- Scope Summary: Keep canonical raw identity for accounting while displaying `<provider name>:<model name>` for AutoByteus runtime rows; normalize only legacy composite `model_value` values.
- Primary Questions To Resolve:
  1. Where is `openai-compatible:provider_<id>:<model>` created and persisted? Resolved.
  2. Which API fields drive Model and Task columns? Resolved.
  3. Is the short model value already persisted? Resolved: `model_value` is stored separately.
  4. Where is the configured provider name available? Resolved: current custom-provider registry; built-in display mapping already exists.
  5. Does the requested format apply to all runtimes? Resolved from user clarification: apply provider:model formatting when `runtime_kind = autobyteus`; preserve other runtime labels.
  6. Is historical provider name captured in each event? Resolved: no; a read-time display resolver has a rename/deletion caveat.
  7. Can existing composite `model_value` rows be corrected safely? Resolved: yes, with an idempotent app-data backfill that extracts a validated suffix and leaves `model_identifier` unchanged.
  8. Which shared consumers must remain accounting-only? Resolved: `getTotalCost`, `token-usage-run-summary-adapter.ts`, synthetic GraphQL `summaryAggregate()`, and existing aggregate GraphQL mappings remain on the unchanged accounting aggregate; Model/Task use a separate ordered display projection.
  9. What exact fallback, Task alignment, classifier, and migration lifecycle contracts are required? Resolved in the revised design: anchored parser/matrix, explicit fallback strings, one ordered display-entry sequence for all recursive constructors, fixed migration registration/lifecycle, and read-time safety in every migration state.

## Request Context

The user supplied a Token Statistics screenshot showing built-in `gpt-5.6-luna` and a custom-provider value rendered as `openai-compatible:provider_25bb...d1fa:qwen3.8-max-preview`. The user clarified that, when the AutoByteus runtime is selected, the readable value should be the provider name plus the model name, for example `alibaba_cloud:qwen3.8-max-preview`, including existing statistics rows where the stored model value is already long.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): `Git`
- Task Workspace Root: `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model`
- Task Artifact Folder: `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/tickets/in-progress/token-statistics-custom-provider-model`
- Current Branch: `codex/token-statistics-custom-provider-model`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin personal` succeeded before worktree creation.
- Task Branch: `codex/token-statistics-custom-provider-model`
- Expected Base Branch (if known): `personal`
- Expected Finalization Target (if known): `personal` after delivery review.
- Bootstrap Blockers: None.
- Notes For Downstream Agents: Base worktree was dirty and behind; no work was performed there. All authoritative artifacts belong to this dedicated worktree.

## Supplemental Task Artifact Inventory

| Artifact Path | Purpose And Scope | Evidence, Context, Or Decision Captured | Core Artifact(s) Supported | Related Requirement / Acceptance-Criteria IDs (When Applicable) | Status | Approval Applicability / State | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| None | No separate supplement promoted. | N/A | N/A | N/A | N/A | N/A | None; the issue is fully captured by the core artifacts. |

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-07-30 | Setup | `git fetch origin personal && git worktree add -b codex/token-statistics-custom-provider-model /Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model origin/personal` | Establish isolated task workspace from current tracked remote state. | Dedicated branch/worktree created successfully from `origin/personal`. | No |
| 2026-07-30 | Other | User screenshot at `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_f364ca0e175d4d40bbe5d2dc0f7b014d/solution_designer_19192af872d74a33ba858e74f105aaa0/context_files/ctx_e3e9bb540b7c__image.png` | Observe reported UI behavior. | Custom provider model renders with `openai-compatible:provider_<opaque-id>:` prefix; built-in model does not. | No |
| 2026-07-30 | Other | User follow-up: “if autobyteus runtime is selected ... store the model as provider name plus the model name” | Refine intended presentation scope and format. | AutoByteus runtime rows should use `<provider name>:<model name>`; other runtimes should retain current labels. | No |
| 2026-07-30 | Other | User follow-up: some existing Token Statistics model values are already long | Determine whether a historical-data correction is required rather than relying only on a read-time display projection. | Existing rows may have the composite value in `model_value`; the design must support an idempotent legacy backfill while preserving canonical identity. | No |
| 2026-07-30 | Command | `rg -n --hidden -g '!node_modules' -g '!electron-dist' "openai-compatible|tokenUsageStatistics|usageStatisticsInPeriod|model_identifier|model_value" autobyteus-ts autobyteus-server-ts autobyteus-web` | Locate identifier construction, ledger fields, GraphQL mapping, and UI owner. | Found canonical custom identifier construction in `autobyteus-ts/src/llm/openai-compatible-endpoint-model.ts`, token usage aggregate/API in `autobyteus-server-ts/src/token-usage` and `src/api/graphql/types/token-usage-stats.ts`, and rendering in `autobyteus-web/components/settings/token-usage`. | No |
| 2026-07-30 | Code | `autobyteus-ts/src/llm/openai-compatible-endpoint-model.ts:9-12,24-40`; `autobyteus-ts/src/llm/openai-compatible-endpoint-discovery.ts:98-114` | Verify custom-provider identity grammar and short model metadata. | Identifier is intentionally `openai-compatible:<providerId>:<modelName>`; discovered model `id`, `name`, `value`, and `canonicalName` are the short endpoint model ID. | No |
| 2026-07-30 | Code | `autobyteus-ts/src/llm/api/openai-compatible-token-usage-normalizer.ts:52-61`; `autobyteus-server-ts/src/agent-execution/domain/agent-run-token-usage.ts:98-100,306-308`; `autobyteus-server-ts/src/token-usage/repositories/sql/token-usage-ledger-repository.ts:40-66,160-167` | Verify token usage facts before statistics query. | Token usage stores `model_provider`, canonical `model_identifier`, and short `model_value`; the SQL ledger has separate columns and round-trips them. It does not store `providerName` or `providerId` as a separate display field. | No |
| 2026-07-30 | Code | `autobyteus-ts/src/llm/provider-display-names.ts`; `autobyteus-ts/src/llm/providers.ts` | Find built-in provider display names. | Existing mapping provides names such as `DeepSeek`, `OpenAI-Compatible`, and `AutoByteus`. | No |
| 2026-07-30 | Code | `autobyteus-server-ts/src/llm-management/llm-providers/stores/custom-llm-provider-store.ts`; `/Users/normy/.autobyteus/server-data/llm/custom-llm-providers.json` | Verify current custom provider-name source. | `CustomLlmProviderStore.listProviders()` reads saved records with `id` and user-facing `name`; the local record for the screenshot provider has `name = alibaba_cloud`. | No |
| 2026-07-30 | Code | `autobyteus-server-ts/src/token-usage/projections/token-usage-cost-summary-aggregate.ts:92-155`; `autobyteus-server-ts/src/token-usage/providers/statistics-provider.ts:45-70`; `autobyteus-server-ts/src/token-usage/providers/task-statistics-tree-builder.ts:201-347` | Trace how model values reach both statistics modes. | Aggregate `observed_model_identifiers` prefers `model_identifier`; Model statistics groups on it and maps it to GraphQL `llmModel`; Task rows copy it to `models`. No provider-aware display projection exists. | No |
| 2026-07-30 | Code | `autobyteus-server-ts/src/token-usage/providers/statistics-provider.ts:32-66`; `autobyteus-server-ts/src/token-usage/projections/token-usage-run-summary-adapter.ts:17-76`; `autobyteus-server-ts/src/api/graphql/types/token-usage-stats.ts:392-431,501`; `autobyteus-server-ts/src/token-usage/projections/token-usage-cost-summary-aggregate.ts:1-155` | Enumerate every shared cost aggregate consumer for ARCH-F-003. | `getTotalCost`, run-summary adaptation, synthetic GraphQL `summaryAggregate()`, and aggregate GraphQL mappings consume accounting fields. The display projection must remain separate and these paths must not receive provider-name context. | Implementation review must verify no consumer is accidentally changed. |
| 2026-07-30 | Code | `autobyteus-server-ts/src/api/graphql/types/token-usage-stats.ts:264-271,446-491`; `autobyteus-web/graphql/queries/token_usage_statistics_queries.ts:82-107`; `autobyteus-web/stores/tokenUsageStatistics.ts:45-57,182-189`; `autobyteus-web/components/settings/token-usage/TokenUsageModelStatisticsTable.vue:20-36,71`; `TokenUsageTaskStatisticsTable.vue:147-149` | Verify the user-facing boundary. | GraphQL/frontend preserve only raw model strings in the current Model/Task data shape, and both tables render those strings verbatim. | No |
| 2026-07-30 | Data | `sqlite3 -header -column /Users/normy/.autobyteus/server-data/db/production.db "select model_provider, model_identifier, model_value, runtime_kind, count(*) as n from token_usage_ledger_events group by model_provider, model_identifier, model_value, runtime_kind order by n desc limit 30;"` | Check representative real stored usage. | The local ledger includes 41 `autobyteus` events for `openai-compatible:provider_25bbbdb1e3af4f4d958c597a3577d1fa:qwen3.8-max-preview` with `model_value = qwen3.8-max-preview`, plus other provider/model combinations. | No |
| 2026-07-30 | Data | `sqlite3 ... "SELECT runtime_kind, model_provider, model_identifier, model_value, COUNT(*) ... WHERE model_value LIKE 'openai-compatible:%' ..."` and longest-value comparison query | Check whether the task-base database itself has composite `model_value` rows. | The inspected local database has no `model_value` beginning with `openai-compatible:`; its custom-provider rows have short values. The long visible statistics value is the raw `model_identifier` currently exposed as `llmModel`/`models`. This does not disprove the user’s other historical deployment data, so the migration is designed for that legacy shape. | No |
| 2026-07-30 | Code / Doc | `autobyteus-server-ts/src/app-data-migrations/app-data-migration-registry.ts`; `app-data-migration-runner.ts`; `src/app-data-migrations/migrations/token-usage-execution-address-backfill-migration.ts`; `src/app-data-migrations/migrations/token-usage-legacy-path-columns-drop-migration.ts`; `docs/ARCHITECTURE.md:30-39,82-89` | Assess whether an app-data migrator can safely correct existing ledger values. | Existing registry/runner records status, retries failures, writes logs, and runs required migrations after Prisma schema migrations. Existing token-usage backfill exposes an injectable list/update database boundary; this task can reuse that pattern without a schema change. | Architecture review must confirm migration ID/order and exact classifier. |
| 2026-07-30 | Test/source | `autobyteus-server-ts/tests/integration/token-usage/providers/statistics-provider.integration.test.ts`; `autobyteus-web/components/settings/token-usage/__tests__/TokenUsageModelStatisticsTable.spec.ts`; `autobyteus-web/stores/__tests__/tokenUsageStatistics.spec.ts` | Inspect current durable coverage. | Server coverage asserts raw runtime/model grouping; frontend coverage asserts visible model text/chart labels; fixtures omit display fields. Targeted provider:model display assertions are required. | Downstream API/E2E engineer decides final coverage edits/execution. |
| 2026-07-30 | Review | `design-review-report.md` and `architecture-review-revision-record.md` (`ARCH-REV-002`) | Incorporate the architecture reviewer’s Design Impact findings before implementation authorization. | ARCH-F-001 required exact fallback precedence; ARCH-F-002 required recursive Task raw/display alignment; ARCH-F-003 required all shared aggregate consumers; ARCH-F-004 required an exact legacy composite classifier/conflict matrix; ARCH-F-005 required exact app-data registration, runner, failure, partial-update, terminal-status, retry, and recovery semantics. | Revised requirements, design, and this evidence record; return through architecture review. |

## Relevant Existing Behavior And Production Paths

| Behavior ID | Kind (`User`/`System`/`Operational`/`Contract`) | Current Supported Trigger Or Governing Contract | Current Production Path And Lifecycle | Meaningful Current Outcome / Invariants | Evidence |
| --- | --- | --- | --- | --- | --- |
| BEH-TOKMODEL-001 | User | User opens Token Statistics and fetches a date range. | `TokenUsageStatistics` fetches `usageStatisticsInPeriod`; `TokenUsageStatisticsProvider` groups by runtime plus canonical model identifier; GraphQL maps it to `UsageStatistics.llmModel`; `TokenUsageModelStatisticsTable` renders `row.llmModel` in the model cell and chart label. | AutoByteus custom-provider label exposes the provider registry ID. | Screenshot; `statistics-provider.ts:45-70`; `token-usage-stats.ts:468-491`; `TokenUsageModelStatisticsTable.vue:20-36,71`. |
| BEH-TOKMODEL-002 | System / Contract | Runtime model calls emit provider, canonical identifier, and model value. | `OpenAICompatibleEndpointModel` creates the canonical identifier; `createOpenAICompatibleTokenUsageObservation` emits identifier/value; enrichment/persistence round-trip both into `token_usage_ledger_events`; statistics grouping consumes the identifier. | Raw identity distinguishes identical model names from different custom endpoints and must remain the accounting/grouping key. | Model and normalizer sources; ledger repository; local DB sample. |
| BEH-TOKMODEL-003 | User | User selects Task grouping. | `TokenUsageTaskStatisticsTreeBuilder` builds rows and copies `aggregate.observed_model_identifiers` to `models`; GraphQL and frontend pass it through; task table renders `entry.row.models`. | Task mode exposes the same opaque identity and needs a provider:model display projection without changing raw `models`. | `task-statistics-tree-builder.ts:201-347`; GraphQL task type; task table. |
| BEH-TOKMODEL-004 | User / Contract | User views AutoByteus built-in or non-AutoByteus runtime rows. | Current statistics returns raw model identity and tables render it; built-in/non-AutoByteus labels are not provider-prefixed by the current UI. | Non-AutoByteus behavior is outside the requested change; AutoByteus built-in rows need provider:model labels. | Runtime kind normalizer; provider-display-name mapping; screenshot comparison. |
| BEH-TOKMODEL-005 | Contract | A legacy/unknown usage event may lack `model_value` or provider registry data. | Current statistics falls back to a non-empty raw identifier or `Unknown`; no provider-aware display fallback exists. | Must remain visible and deterministic, never crash or collapse distinct raw rows. | `normalizeTokenUsageModelIdentifier`; acceptance scope. |
| BEH-TOKMODEL-006 | Operational / Contract | Existing historical ledger data may have the composite custom-provider identity in `model_value`. | Current statistics exposes the long stored/raw value; no legacy-value correction exists. | Backfill only the validated model suffix in `model_value`, preserve `model_identifier`, and keep the read-time resolver safe before/without migration. | User clarification; app-data migration framework; token ledger schema/repository. |
| BEH-TOKMODEL-007 | Contract | Shared accounting consumers use the cost summary aggregate. | No display context is required by `getTotalCost`, run-summary adaptation, synthetic `summaryAggregate()`, or existing aggregate GraphQL mappings. | Keep those consumers on the unchanged accounting-only aggregate; use a separate display projection only in Model/Task statistics. | Architecture finding ARCH-F-003; aggregate consumer trace. |
| BEH-TOKMODEL-008 | Contract | Recursive Task rows derive raw model arrays in four constructors. | No display array exists and independent mapping would risk length/order drift. | Use one ordered raw/display entry sequence for standalone, team, nested, and legacy-member rows, including empty and duplicate cases. | Architecture finding ARCH-F-002; task-tree trace. |

## Design Health Assessment Evidence

- Change posture: `Bug Fix` / `Behavior Change`.
- Candidate root cause classification: `Boundary Or Ownership Issue` — canonical identity and user-facing display label are conflated in the statistics projection.
- Refactor posture evidence: `Likely Not Needed`; current LLM catalog, custom-provider store, token ledger, statistics providers, GraphQL resolver, and frontend tables have coherent ownership. Add a small display projection and lookup context rather than refactoring provider identity or storage.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| User screenshot and follow-up | AutoByteus custom-provider model is shown as a long `openai-compatible:provider_<id>:model`; user asks for provider:model. | Add runtime-specific display policy; do not mutate the canonical identifier. | Resolved in refined requirements/design. |
| `OpenAICompatibleEndpointModel` | Identifier intentionally includes `openai-compatible:<providerId>:` while model `name`/`value` remain short. | Provider identity is correct and should not be removed globally. | Reuse `model_value` for model portion. |
| `CustomLlmProviderStore` and local JSON | Saved provider record maps the opaque ID to `alibaba_cloud`. | Current provider metadata can supply the friendly provider portion at read time. | Review rename/deletion fallback. |
| Provider display mapping | `getLlmProviderDisplayName` covers built-in provider enum values. | Built-in AutoByteus labels can use existing canonical names. | No new mapping needed. |
| Token usage ledger schema/data | `model_identifier` and `model_value` are stored independently; provider name is not stored per event. | No schema migration is required; a value-only app-data backfill is needed only for deployments with composite legacy `model_value`. Historical labels still follow current provider config. | Exact fallback and legacy classifier are now fixed in the requirements/design. |
| Shared aggregate consumers | `TokenUsageCostSummaryAggregate` is also consumed by `getTotalCost`, `token-usage-run-summary-adapter.ts`, synthetic GraphQL `summaryAggregate()`, and existing aggregate GraphQL mappings. | Provider-aware display metadata must not be added to that shared accounting boundary. Model/Task use a separate `TokenUsageModelDisplayEntry[]` projection. | Verify all consumers remain unchanged in implementation review. |
| App-data migration framework | Startup runs Prisma migrations first, then registered required app-data migrations; runner records status/logs and existing token-usage backfills use injected database interfaces. | A value-only legacy correction is structurally supported without adding a schema column. | Add classifier, migration definition, registry entry, and tests. |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-ts/src/llm/openai-compatible-endpoint-model.ts` | Custom provider model identity/catalog object | Creates provider-scoped canonical identifier while retaining short model metadata. | Keep identity construction unchanged; use its short value as model display source. |
| `autobyteus-ts/src/llm/api/openai-compatible-token-usage-normalizer.ts` | Runtime token usage observation | Emits `modelIdentifier` and `modelValue`, but not provider display name. | No ingestion/schema change for this task. |
| `autobyteus-ts/src/llm/provider-display-names.ts` | Built-in provider labels | Already maps provider enum values to readable names. | Reuse for AutoByteus built-in display labels. |
| `autobyteus-server-ts/src/llm-management/llm-providers/stores/custom-llm-provider-store.ts` | Saved custom-provider configuration | Reads current `{id,name}` records asynchronously. | Statistics provider may load a name map once per query; aggregate remains pure. |
| `autobyteus-server-ts/src/token-usage/projections/token-usage-cost-summary-aggregate.ts` | Token usage accounting aggregate and observed raw model metadata | Shared by total-cost, run-summary, synthetic summary, and statistics paths. | Keep its accounting/raw contract unchanged; do not inject provider display context. |
| `autobyteus-server-ts/src/token-usage/projections/token-usage-model-display-projection.ts` | Model/Task display projection | No current module resolves provider-aware labels or ordered raw/display pairs. | Add a pure projection with the exact fallback/parser contract and one entry sequence for Model/Task. |
| `autobyteus-server-ts/src/token-usage/providers/statistics-provider.ts` | Model statistics grouping | Groups by raw runtime/model identity and returns raw identifier. | Preserve grouping; attach provider:model display label. |
| `autobyteus-server-ts/src/token-usage/providers/task-statistics-tree-builder.ts` | Task/team statistics tree | Copies raw identifiers into task row `models`. | Attach a parallel display-name array to recursive rows. |
| `autobyteus-server-ts/src/app-data-migrations/app-data-migration-registry.ts` and `app-data-migration-runner.ts` | App-data migration lifecycle | Registry discovers definitions in order; runner runs required definitions after Prisma, records status/logs, skips terminal successes/warnings in `runPending()`, retries `NOT_RUN`/`FAILED`, and supports explicit reruns. | Register the fixed-ID migration after execution-address backfill and before legacy-path drop; return exact warning/failure statuses without changing the runner. |
| `autobyteus-server-ts/src/app-data-migrations/migrations/token-usage-execution-address-backfill-migration.ts` | Existing token-usage backfill pattern | Provides a narrow injectable database interface for list/update operations and row classification. | Reuse the ownership/test shape for model-value correction; do not copy its execution-address semantics. |
| `autobyteus-server-ts/src/api/graphql/types/token-usage-stats.ts` | Token statistics GraphQL contract | Exposes raw `llmModel` and `models` only. | Add explicit display fields and map raw fields unchanged. |
| `autobyteus-web/graphql/queries/token_usage_statistics_queries.ts` | Statistics query documents | Requests raw model fields. | Request display fields. |
| `autobyteus-web/stores/tokenUsageStatistics.ts` | GraphQL hydration and normalization | Normalizes raw model rows/task rows. | Hydrate display fields and use raw fallback only for absent/legacy payloads. |
| `autobyteus-web/components/settings/token-usage/TokenUsageModelStatisticsTable.vue` | Model mode table/chart | Renders raw `llmModel` in cells and chart labels. | Render display field. |
| `autobyteus-web/components/settings/token-usage/TokenUsageTaskStatisticsTable.vue` | Task mode model column | Renders raw `models`. | Render display-name array. |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-07-30 | Screenshot review | Inspect supplied image | Value wraps across lines and visibly contains a provider registry prefix plus opaque ID. | User-facing display should use a concise provider:model label while preserving identity internally. |
| 2026-07-30 | Data probe | Read-only `sqlite3` query recorded in Source Log | Real stored AutoByteus custom-provider rows contain the exact long identifier and short `model_value`; the screenshot provider record is present in custom-provider JSON. | Required label can be derived without contacting the provider or rewriting data. |
| 2026-07-30 | Framework trace | Read `autobyteus-server-ts/docs/ARCHITECTURE.md`, `app-data-migration-registry.ts`, `app-data-migration-runner.ts`, and token-usage backfill migration sources | Startup ordering and migration lifecycle support a required idempotent ledger backfill after Prisma migrations; existing token-usage migration pattern uses injectable list/update/count operations and item-level summaries. | Implement a value-only migration without schema change; API display resolver remains safe if migration is pending/partial. |

## External / Public Source Findings

- Public API / spec / issue / upstream source: None consulted; issue is local implementation behavior.
- Version / tag / commit / freshness: Repository base `origin/personal` at commit `596094be1`.
- Relevant contract, behavior, or constraint learned: None beyond user clarification and local code/data.
- Why it matters: N/A.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: Repository unit/integration tests; no live provider is required to establish the root cause. Downstream may add fixture-backed GraphQL/browser coverage.
- Required config, feature flags, env vars, or accounts: None for code/data investigation; local production SQLite and custom-provider JSON were read-only.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: `git fetch origin personal`; `git worktree add ...`.
- Cleanup notes for temporary investigation-only setup: Dedicated worktree is the task workspace; no temporary external setup.

## Findings From Code / Docs / Data / Logs

1. **Why it is long:** custom-provider model identifiers are deliberately composite. The model catalog creates `openai-compatible:<providerId>:<modelName>` so identical models from different saved endpoints remain distinct.
2. **Why it leaks into Token Statistics:** `normalizeTokenUsageModelIdentifier` prefers `model_identifier`. `TokenUsageStatisticsProvider` uses that value both as the raw grouping key and as the returned model string. GraphQL maps it to `llmModel`; the Model table renders it, and the Task path similarly renders `models`. The accounting aggregate is shared beyond these views, so display context must be projected beside it rather than added to it.
3. **Why the short model name is available:** runtime models carry short `name`/`value`; the normalizer normally persists `model_value` separately. The real local database confirms `model_value = qwen3.8-max-preview` for the reported long identifier. The user reports that some existing deployments have the composite value in `model_value` too, so the resolver must normalize that shape before migration and the app-data backfill must repair it.
4. **Where the provider name comes from:** custom provider records in `custom-llm-providers.json` expose the saved `name` (`alibaba_cloud`) keyed by the opaque provider ID; built-in providers have `getLlmProviderDisplayName` mapping. Token event payloads do not currently carry a provider display name.
5. **Correct boundary:** preserve the canonical raw identity for grouping, accounting, pricing, row IDs, and diagnostics. Add a separate server-owned display projection beside the accounting aggregate. For AutoByteus, resolve provider name and combine it with the exact normalized model value; for other runtimes preserve current display behavior. The projection returns one ordered raw/display entry per unique raw ID for Model/Task alignment.
6. **Existing-data correction:** the long visible statistics value is currently sourced from `model_identifier`; if a historical `model_value` is also composite, the display resolver can safely use its suffix immediately, and a required app-data migration can normalize only that derived field. Rewriting `model_identifier` is unsafe because it would remove provider scoping.
7. **Migration capability:** the existing app-data registry/runner supports required startup definitions, `NOT_RUN`/`FAILED` retry through `runPending()`, explicit `runMigration(id)`, `SUCCEEDED_WITH_WARNINGS`, durable status/log records, and startup continuation after a definition failure. Startup runs Prisma migrations first, so a value-only backfill needs no schema migration. The migration should scan/classify through an injected database interface, independently commit safe row updates, preserve row count, and report skipped/ambiguous/failed rows with the exact status mapping in the design.

## Persisted Data Transition Evidence (When Applicable)

- Current stored subject, location, representative shape, and approximate volume: `token_usage_ledger_events` in `/Users/normy/.autobyteus/server-data/db/production.db`; representative rows have `model_provider=OPENAI_COMPATIBLE`, `model_identifier=openai-compatible:provider_<id>:qwen3.8-max-preview`, `model_value=qwen3.8-max-preview`, and `runtime_kind=autobyteus`.
- Current provider metadata source: `/Users/normy/.autobyteus/server-data/llm/custom-llm-providers.json`; provider `id` maps to mutable user-facing `name`.
- Relevant code-model, serialization, semantic, or physical-store change: No schema/serialization change. The statistics aggregate and GraphQL projection gain display-only fields, and the app-data migration may update only legacy composite `model_value` text.
- Normal readers and writers, including unknown/extra-field behavior: Runtime writers normally write both model columns; SQL repository reads both; missing or composite `model_value` remains possible for legacy/unknown rows and must fall back safely. Provider-name lookup may return no record.
- Required semantics and invariants preserved by direct use: `Yes` — raw identity/grouping/accounting/pricing remain unchanged; the backfill changes only a validated derived value.
- Physical storage, privacy/security, disposal, rebuild, or operational constraints: Preserve usage history and attribution; no credential access; startup migration must preserve row count, be retry-safe, and log outcomes.
- Concrete benefit, cost, and risk of migration if it remains a candidate: The user reports existing composite values, so a value-only backfill improves stored derived data for future consumers. It adds bounded startup I/O and migration failure/skip handling but avoids the far riskier canonical-identity rewrite. No schema migration or provider-name snapshot is proposed.
- Existing migration framework or lifecycle constraints, only if migration may be required: `AppDataMigrationRegistry`/`AppDataMigrationRunner` runs required definitions after Prisma startup migrations; existing token-usage execution-address backfill demonstrates the injectable database boundary pattern.

## Constraints / Dependencies / Compatibility Facts

- The UI needs `<provider name>:<model name>` only for AutoByteus runtime rows, but the system still needs the opaque identity to distinguish provider configurations.
- Provider names may change or disappear; resolver fallbacks must not affect raw identity.
- Model names may contain separators; `model_value` is authoritative, and any fallback parser must preserve all suffix text after the provider-ID delimiter.
- Existing composite `model_value` rows must be classified against a validated canonical identifier; malformed/conflicting rows are skipped and reported rather than guessed.
- Existing built-in provider labels and token math are unchanged except for the explicit AutoByteus provider:model display requirement.
- The GraphQL contract should expose raw identity and display label separately; do not replace or rename raw identity fields.

## Open Unknowns / Risks

- Exact fallback wording is fixed by the revised design: `OpenAI-Compatible (<providerId>)` for missing/deleted custom providers or provider-map load failure, `Unknown Provider (<provider>)` for an unrecognized provider, `Unknown Provider` when missing, and `Unknown Model` when missing.
- Historical display labels follow current provider configuration because provider name is not captured in ledger events. A future immutable-history requirement would need an ingestion/schema change outside this task.
- Migration ID/order and lifecycle are fixed for implementation: `20260730_token_usage_custom_provider_model_value_backfill`, required at startup, after execution-address backfill and before legacy-path drop; the database-adapter method names remain implementation details, but CAS, row-count, independent-update, status, and retry semantics are not.
- Browser/live GraphQL execution setup is not established during solution design; API/E2E engineer owns coverage and environment decisions after implementation review.

## Notes For Architecture Reviewer

The raw value is an intentional provider-scoped identity. The revised design must add server-owned display fields and a provider-name lookup context rather than parsing or mutating identifiers in the frontend. For `runtime_kind = autobyteus`, display `<custom saved provider name>:<normalized model value>` or `<built-in provider display name>:<model name>`; for other runtimes preserve current labels. The display resolver must use the exact malformed/deleted/missing fallback contract and be safe before/without migration. Keep all shared accounting consumers on the unchanged aggregate; Model/Task use one ordered display-entry projection and all four recursive constructors must preserve positional alignment. Add the required value-only app-data backfill with the fixed ID/order and exact classifier/status/retry semantics, but keep `model_identifier` unchanged and avoid a schema migration/provider-name snapshot. Requirements are `Refined` from the user’s explicit clarification; no intended-behavior supplemental artifact applies. Architecture findings ARCH-F-001 through ARCH-F-005 are addressed in this revision; next gate is architecture review.
