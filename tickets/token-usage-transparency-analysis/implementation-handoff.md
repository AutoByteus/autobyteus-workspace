# Implementation Handoff

## Upstream Artifact Package

- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-transparency-analysis/tickets/token-usage-transparency-analysis/requirements.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-transparency-analysis/tickets/token-usage-transparency-analysis/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-transparency-analysis/tickets/token-usage-transparency-analysis/design-spec.md`
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-transparency-analysis/tickets/token-usage-transparency-analysis/design-review-report.md`
- Additional upstream context:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-transparency-analysis/tickets/token-usage-transparency-analysis/analysis-report.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-transparency-analysis/tickets/token-usage-transparency-analysis/latest-origin-personal-refresh-report.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-transparency-analysis/tickets/token-usage-transparency-analysis/design-review-round-1-rework-report.md`
- Code review round 1 report: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-transparency-analysis/tickets/token-usage-transparency-analysis/code-review-report.md`

## What Changed

Implemented the reviewed no-legacy token usage transparency/storage design across the native runtime, Codex runtime, Claude runtime, server ledger, API summaries, and frontend meter surfaces.

- Added a native `TOKEN_USAGE_UPDATED` event boundary in `autobyteus-ts`, with provider-owned `LlmTokenUsageObservation` normalizers that preserve raw/provider-specific usage data before response normalization.
- Replaced the old optional/role-split server token usage path with a server-owned append-only `token_usage_ledger_events` ledger, event enrichment transformer, context enricher, cumulative snapshot delta normalizer, trusted-pricing cost enricher, and async/failure-isolated persistence processor.
- Added Codex and Claude token usage extraction paths that emit normalized `TOKEN_USAGE_UPDATED` events through the same server pipeline instead of direct store writes.
- Added ledger-backed GraphQL run/team/member summary queries and moved settings statistics onto the ledger.
- Added frontend display-only live usage handling: stream handler/store, Usage right-tab panel, header chip, summary queries, and localization.
- Removed/demoted old live authority paths: old `TokenUsagePersistenceProcessor`, `TokenUsageStore`, old SQL record repository/converter, `TokenUsageRecord` Prisma model, and native `TokenUsageTrackingExtension`.

## Code Review Round 1 Local Fix Update

Addressed all round-1 Local Fix findings from `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-transparency-analysis/tickets/token-usage-transparency-analysis/code-review-report.md`:

- CR-001: Replaced stale old token usage tests so they no longer import deleted `TokenUsagePersistenceProcessor`, `TokenUsageTrackingExtension`, `TokenUsageStore`, `SqlTokenUsageRecordRepository`, or old `TokenUsageRecord` paths. Startup coverage now asserts the old response processor is not registered; token usage tests cover the new observation/ledger/statistics paths. Deleted the stale generated JS old repository test counterpart.
- CR-002: Settings token statistics table/store/API now carry server currency/status through the stats projection, preserve nullable aggregate costs, display all-unpriced totals as unpriced, and display mixed/partial estimates explicitly. The remaining chart-specific CR-002 issue was addressed in the round-2 Local Fix update below.
- CR-003: Extracted Claude terminal token usage emission into `claude-session-token-usage.ts`; `claude-session.ts` is now 494 effective non-empty lines, below the >500 hard limit.

## Code Review Round 2 Local Fix Update

Addressed the remaining CR-002 chart finding from `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-transparency-analysis/tickets/token-usage-transparency-analysis/code-review-report.md`:

- `TokenUsageStatistics.vue` no longer converts `null`/unpriced `totalCost` values into ordinary zero-valued chart points. Chart data now preserves `null` cost values, chart tooltips reuse the same server-status-aware cost formatter as the table, and an explicit localized note tells users that unpriced rows are omitted from the cost chart.
- `BarChart.vue` no longer contains token-cost-specific Euro semantics. Dataset label, x-axis label, y-axis label, and tooltip labels are passed by the owning token usage statistics component; the y-axis includes a currency code only when all priced chart rows share one server-provided currency.
- Residual search after the fix found no `totalCost ?? 0`, Euro symbol tooltip/axis labels, `Cost (€)`, or `label: 'Total Cost'` in `TokenUsageStatistics.vue` or `BarChart.vue`.

## Key Files Or Areas

### Native runtime (`autobyteus-ts`)

- New observation and normalizers:
  - `autobyteus-ts/src/llm/utils/llm-token-usage-observation.ts`
  - `autobyteus-ts/src/llm/api/openai-compatible-token-usage-normalizer.ts`
  - `autobyteus-ts/src/llm/api/anthropic-token-usage-normalizer.ts`
  - `autobyteus-ts/src/llm/api/gemini-token-usage-normalizer.ts`
  - `autobyteus-ts/src/llm/api/autobyteus-token-usage-normalizer.ts`
- Native event/stream integration:
  - `autobyteus-ts/src/agent/loop/llm-phase.ts`
  - `autobyteus-ts/src/agent/events/notifiers.ts`
  - `autobyteus-ts/src/events/event-types.ts`
  - `autobyteus-ts/src/agent/streaming/events/stream-events.ts`
  - `autobyteus-ts/src/agent/streaming/events/stream-event-payload-token-usage.ts`
- Provider adapter updates preserve raw usage/cache/reasoning fields and model identity in `CompleteResponse.usage`.
- Pricing trust support added in `autobyteus-ts/src/llm/utils/llm-config.ts` and `autobyteus-ts/src/llm/llm-factory.ts`.

### Server ledger and stream/API surface (`autobyteus-server-ts`)

- New ledger schema/migration:
  - `autobyteus-server-ts/prisma/schema.prisma`
  - `autobyteus-server-ts/prisma/migrations/20260624090000_add_token_usage_ledger_events/migration.sql`
- Domain and pipeline:
  - `autobyteus-server-ts/src/agent-execution/domain/agent-run-token-usage.ts`
  - `autobyteus-server-ts/src/agent-execution/events/agent-run-event-transformer.ts`
  - `autobyteus-server-ts/src/agent-execution/events/agent-run-event-pipeline.ts`
  - `autobyteus-server-ts/src/agent-execution/events/processors/token-usage/*`
- Ledger store/repository/pricing/delta normalization:
  - `autobyteus-server-ts/src/token-usage/repositories/sql/token-usage-ledger-repository.ts`
  - `autobyteus-server-ts/src/token-usage/providers/token-usage-ledger-store.ts`
  - `autobyteus-server-ts/src/token-usage/projections/token-usage-snapshot-delta-normalizer.ts`
  - `autobyteus-server-ts/src/token-usage/pricing/token-price-config-provider.ts`
  - `autobyteus-server-ts/src/token-usage/pricing/token-cost-calculator.ts`
- Runtime adapters:
  - `autobyteus-server-ts/src/agent-execution/backends/autobyteus/events/autobyteus-stream-event-converter.ts`
  - `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread-token-usage.ts`
  - `autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-agent-run-backend.ts`
  - `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session-token-usage.ts`
- API/messaging:
  - `autobyteus-server-ts/src/api/graphql/types/token-usage-stats.ts`
  - `autobyteus-server-ts/src/services/agent-streaming/models.ts`
  - `autobyteus-server-ts/src/services/agent-streaming/agent-run-event-message-mapper.ts`

### Frontend meter (`autobyteus-web`)

- New meter state, types, stream handler, and queries:
  - `autobyteus-web/types/tokenUsageMeter.ts`
  - `autobyteus-web/stores/tokenUsageMeterStore.ts`
  - `autobyteus-web/services/agentStreaming/handlers/tokenUsageHandler.ts`
  - `autobyteus-web/graphql/queries/token_usage_meter_queries.ts`
- Usage UI:
  - `autobyteus-web/components/workspace/usage/TokenUsageHeaderChip.vue`
  - `autobyteus-web/components/workspace/usage/TokenUsageMeterPanel.vue`
  - `autobyteus-web/components/layout/RightSideTabs.vue`
  - `autobyteus-web/components/workspace/agent/AgentWorkspaceView.vue`
  - `autobyteus-web/components/workspace/team/TeamWorkspaceView.vue`
- Existing settings statistics now accept nullable server costs and render unpriced instead of implying zero-cost estimates:
  - `autobyteus-web/stores/tokenUsageStatistics.ts`
  - `autobyteus-web/components/settings/TokenUsageStatistics.vue`
  - `autobyteus-web/components/common/BarChart.vue`

## Important Assumptions

- Native provider adapters are the only place where provider-specific raw usage can be captured reliably; server code does not try to reconstruct cache/reasoning/raw usage after lossy response normalization.
- Missing/unmatched/placeholder/default-zero pricing is token-only: costs remain `null` and API cost status is `price_missing` or `partial_price_missing`; frontend formats server-supplied cost only and does not calculate prices.
- `per_call` and `per_turn` readings are already deltas. `cumulative_snapshot` readings are normalized server-side into accounting deltas using per-run/snapshot-series previous readings plus DB lookup.
- First cumulative snapshot is treated as run-origin baseline and marked with a quality flag, per the accepted residual-risk approach.
- The historical `token_usage_records` table remains only in old migrations/legacy app-data migration script; it is not represented in the current Prisma schema and no live source code reads or writes it for this feature.

## Known Risks

- Cumulative snapshot normalization is process-local plus DB-backed. DB uniqueness protects idempotent persistence; in-memory normalization avoids duplicate live deltas for repeated idempotency keys during the same process.
- First cumulative snapshots may overcount if the runtime reports a pre-existing thread/session cumulative total instead of a run-origin total; those events are flagged `first_cumulative_snapshot_assumed_run_origin`.
- Cache pricing dimensions are not trusted unless explicitly available. Cache-read/write usage can therefore produce `partial_price_missing` even when standard input/output pricing is trusted.
- Frontend `nuxi typecheck` still fails on broad pre-existing baseline issues unrelated to the new usage meter path; the production Nuxt build passes.
- Existing large files were touched surgically for event integration; `claude-session.ts` was brought back below the >500 effective non-empty source-file limit after code review round 1.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Yes — implemented the architecture-approved refactor rather than preserving the old optional/role-split accounting path.
- Reviewed root-cause classification: Yes — addressed boundary/ownership, raw usage preservation, pricing trust, context identity, and mixed-scope accounting issues from the design package.
- Reviewed refactor decision (`Refactor Needed Now`/`No Refactor Needed`/`Deferred`): `Refactor Needed Now`.
- Implementation matched the reviewed assessment (`Yes`/`No`): Yes.
- If challenged, routed as `Design Impact` (`Yes`/`No`/`N/A`): N/A — no implementation-time design blocker required reroute.
- Evidence / notes: Runtime adapters now emit one normalized token-usage event boundary; server owns enrichment/delta/cost/persistence; frontend only displays server/accounting totals.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`.
- Legacy old-behavior retained in scope: `No` for live source code paths. Old historical migration artifacts remain but are not live compatibility paths.
- Dead/obsolete code, obsolete files, unused helpers/tests/flags/adapters, and dormant replaced paths removed in scope: `Yes` — removed old `TokenUsagePersistenceProcessor`, `TokenUsageStore`, old SQL token usage repository/converter, old `TokenUsageRecord` Prisma model, and native token usage tracking extension.
- Shared structures remain tight (no one-for-all base or overlapping parallel shapes introduced): `Yes` — usage observation, server ledger payload, GraphQL summary, and frontend meter types have distinct boundary-specific responsibilities.
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: `Yes`.
- Changed source implementation files stayed within proactive size-pressure guardrails (`>500` avoided; `>220` assessed/acted on): `Yes` with note — no new >500-line files; two new cohesive files exceed 220 lines (`agent-run-token-usage.ts`, ledger repository) and were kept focused. Existing >500-line files were touched only with small integration changes.
- Notes: `rg` confirms no live references to `TokenUsagePersistenceProcessor`, `TokenUsageStore`, `SqlTokenUsageRecordRepository`, `TokenUsageRecordRepository`, `TokenUsageRecord`, or `TokenUsageTrackingExtension` in server/runtime source or active tests, except the startup no-registration assertion for `TokenUsagePersistenceProcessor`. Only old migration/support script references remain outside live source.

## Environment Or Dependency Notes

- Ran root dependency install earlier in implementation (`pnpm install`) successfully.
- `pnpm -C autobyteus-server-ts run prepare:shared` built shared workspace packages successfully earlier; direct `autobyteus-ts` build also passed after final changes.
- Prisma client was regenerated after schema changes.
- No API/E2E environment setup was performed by implementation.

## Local Implementation Checks Run

- `pnpm -C autobyteus-ts run build` — passed.
- `pnpm -C autobyteus-server-ts exec prisma generate --schema ./prisma/schema.prisma` — passed.
- `pnpm -C autobyteus-server-ts run build:full` — passed, including TypeScript build, managed messaging asset copy, and built-in agents bootstrap smoke check.
- `pnpm -C autobyteus-web run guard:web-boundary` — passed.
- `pnpm -C autobyteus-web run guard:localization-boundary` — passed.
- `pnpm -C autobyteus-web run audit:localization-literals` — passed with zero unresolved findings. Non-blocking Node module-type warning emitted from existing localization audit setup.
- `pnpm -C autobyteus-web run build` — passed. Existing chunk-size warnings only.
- `pnpm -C autobyteus-server-ts exec vitest run tests/unit/startup/agent-customization-loader.test.ts tests/unit/agent-customization/processors/persistence/token-usage-persistence-processor.test.ts` — passed (4 tests).
- `pnpm -C autobyteus-ts exec vitest run tests/unit/llm/extensions/token-usage-tracking-extension.test.ts tests/integration/llm/extensions/token-usage-tracking-extension.test.ts` — passed (3 tests).
- `pnpm -C autobyteus-server-ts exec vitest run tests/integration/token-usage/repositories/token-usage-record-repository.integration.test.ts tests/integration/token-usage/providers/token-usage-store.integration.test.ts tests/integration/token-usage/providers/statistics-provider.integration.test.ts tests/e2e/runtime/token-usage-runtime-graphql.e2e.test.ts` — passed (7 tests, 1 skipped Codex environment-owned E2E).
- `git diff --check origin/personal` — passed.
- Source size audit — `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session.ts` is 494 effective non-empty lines after CR-003 fix.
- Post-CR2 reruns for the chart fix:
  - `pnpm -C autobyteus-web run guard:web-boundary && pnpm -C autobyteus-web run guard:localization-boundary && pnpm -C autobyteus-web run audit:localization-literals` — passed; audit passed with zero unresolved findings. Non-blocking Node module-type warning emitted from existing localization audit setup.
  - `pnpm -C autobyteus-web run build` — passed. Existing chunk-size warnings only.
  - `pnpm -C autobyteus-web exec nuxi typecheck` — failed on broad existing baseline type errors (examples: build script type-only imports, test wrapper typing, missing generated/query types, existing transcription store typing). Post-CR2 grep found no `TokenUsageStatistics`, `BarChart`, `tokenUsageStatistics`, or `token_usage_statistics` diagnostics.
  - `git diff --check origin/personal` — passed.

## Downstream Coverage Hints / Suggested Scenarios

- Native AutoByteus run with a provider that returns cache/reasoning/raw usage: verify `TOKEN_USAGE_UPDATED` stream payload contains raw usage and ledger row preserves it.
- Native provider with trusted catalog pricing: verify `api_cost_status=estimated`, cost fields non-null, and frontend header/panel updates live without frontend price calculation.
- Unknown/unpriced model: verify ledger stores token counts, cost fields remain `null`, and frontend displays unpriced/price missing rather than `$0`.
- Codex app-server run with `tokenUsage.last`: verify per-turn ledger deltas and idempotency key uniqueness by turn.
- Codex app-server run with only cumulative usage: verify snapshot delta normalization, first snapshot flag, and no double-count on duplicate idempotency key.
- Claude terminal result chunk with usage/modelUsage: verify per-turn usage event and ledger row.
- Team run/member context: verify server-enriched `root_team_run_id`, `member_agent_run_id`, `member_path`, `member_route_key`, and team/member summary queries.
- Existing settings token statistics: verify nullable costs render as unpriced and ledger-backed stats do not read old `token_usage_records`.

## API / E2E / Executable Coverage Investigation And Execution Still Required

Required. API/E2E engineer should investigate and execute durable coverage around the stream event boundary, ledger persistence/idempotency, pricing-status contract, GraphQL summaries, and frontend live display behavior. Implementation intentionally did not own API/E2E coverage setup or execution.
