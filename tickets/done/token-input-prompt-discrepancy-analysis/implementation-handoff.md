# Implementation Handoff

## Upstream Artifact Package

- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-input-prompt-discrepancy-analysis/tickets/token-input-prompt-discrepancy-analysis/requirements.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-input-prompt-discrepancy-analysis/tickets/token-input-prompt-discrepancy-analysis/investigation-notes.md`
- Provider probe matrix: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-input-prompt-discrepancy-analysis/tickets/token-input-prompt-discrepancy-analysis/provider-probe-matrix.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-input-prompt-discrepancy-analysis/tickets/token-input-prompt-discrepancy-analysis/design-spec.md`
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-input-prompt-discrepancy-analysis/tickets/token-input-prompt-discrepancy-analysis/design-review-report.md`

## What Changed

- Added explicit server-owned token input semantics and cache state before pricing:
  - `gross_includes_cache`, `base_excludes_cache`, and `unknown` input semantics.
  - `positive`, `zero_reported`, `not_reported`, `unsupported_or_local`, and `unknown` cache states.
  - Component-basis resolver now runs before pricing so gross-input providers and Anthropic-style additive/base providers are not priced through one global `input - cache` formula.
- Expanded token usage canonical payloads, ledger persistence, GraphQL summaries, and frontend DTOs around user-facing fields:
  - `grossInputTokens`, `standardInputTokens`, cache read/write/token-rate fields, output/reasoning/billable output, cost groups, price status, missing dimensions, policy/tier metadata, latest prompt/context window fields, and `usageReportCount`.
  - `accounting_input_tokens` remains server-internal gross delta; frontend live aggregation uses server `meter_delta_*` fields and component/cost fields, not old accounting aliases.
- Reworked pricing into a policy resolver plus component-cost calculator:
  - Custom OpenAI-compatible models no longer receive trusted zero pricing by default.
  - Local runtimes are explicitly `local_no_api_bill` instead of pretending paid-provider zero pricing.
  - Missing/untrusted dimensions produce `price_missing` / `partial_price_missing`; mixed currencies suppress fake monetary totals while preserving token totals.
- Updated provider/runtime usage normalization:
  - OpenAI-compatible: gross input semantic, cache read/miss fields, Grok reasoning included in billable output.
  - Anthropic: base-excludes-cache semantic, cache read/write and 5m/1h cache write fields.
  - Gemini: gross input semantic, cache read, thoughts-only billable-output handling.
  - Codex and Claude runtime adapters emit semantic/cache/current-prompt fields.
- Replaced Token Meter UI hierarchy and labels:
  - Current prompt.
  - Gross input / Output / Total estimate cards.
  - Input breakdown.
  - Pricing details.
  - `Usage reports` details row instead of unexplained primary `events`.
  - No compaction/compression decision text.
- Added Prisma migration for new ledger fields.
- Added/updated unit coverage around pricing, delta normalization, event enrichment, Codex/Claude adapters, model catalog pricing, frontend store, and Token Meter rendering.

## Key Files Or Areas

- Server token usage domain/projection/pricing:
  - `autobyteus-server-ts/src/token-usage/domain/token-usage-component-basis.ts`
  - `autobyteus-server-ts/src/token-usage/projections/token-usage-component-basis-resolver.ts`
  - `autobyteus-server-ts/src/token-usage/projections/token-usage-snapshot-delta-normalizer.ts`
  - `autobyteus-server-ts/src/token-usage/pricing/token-pricing-policy.ts`
  - `autobyteus-server-ts/src/token-usage/pricing/token-price-config-provider.ts`
  - `autobyteus-server-ts/src/token-usage/pricing/token-cost-calculator.ts`
- Ledger/API:
  - `autobyteus-server-ts/prisma/schema.prisma`
  - `autobyteus-server-ts/prisma/migrations/20260625193000_token_usage_component_pricing_explainability/migration.sql`
  - `autobyteus-server-ts/src/agent-execution/domain/agent-run-token-usage.ts`
  - `autobyteus-server-ts/src/token-usage/repositories/sql/token-usage-ledger-repository.ts`
  - `autobyteus-server-ts/src/token-usage/providers/token-usage-ledger-store.ts`
  - `autobyteus-server-ts/src/api/graphql/types/token-usage-stats.ts`
- Provider/runtime normalization:
  - `autobyteus-ts/src/llm/api/openai-compatible-token-usage-normalizer.ts`
  - `autobyteus-ts/src/llm/api/anthropic-token-usage-normalizer.ts`
  - `autobyteus-ts/src/llm/api/gemini-token-usage-normalizer.ts`
  - `autobyteus-server-ts/src/agent-execution/backends/codex/thread/codex-thread-token-usage.ts`
  - `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session-token-usage.ts`
- Catalog/config:
  - `autobyteus-ts/src/llm/utils/llm-config.ts`
  - `autobyteus-ts/src/llm/llm-factory.ts`
  - `autobyteus-ts/src/llm/supported-model-definitions.ts`
  - `autobyteus-ts/src/llm/openai-compatible-endpoint-model.ts`
- Frontend:
  - `autobyteus-web/types/tokenUsageMeter.ts`
  - `autobyteus-web/graphql/queries/token_usage_meter_queries.ts`
  - `autobyteus-web/stores/tokenUsageMeterStore.ts`
  - `autobyteus-web/components/workspace/usage/TokenUsageMeterPanel.vue`
  - `autobyteus-web/components/workspace/usage/TokenUsageHeaderChip.vue`
  - `autobyteus-web/localization/messages/en/shell.ts`
  - `autobyteus-web/localization/messages/zh-CN/shell.ts`

## Important Assumptions

- Provider catalog prices are treated as estimates only when dimensions are trusted; absent/untrusted dimensions are not defaulted to zero.
- Local LM Studio/Ollama usage has no provider API bill and is shown as `local_no_api_bill` rather than a paid API estimate.
- Existing persisted historical rows can physically remain, but rows without semantic fields are not reinterpreted with the old formula. They become `unknown` / `partial_price_missing` where unsafe.
- Frontend is display-only. It computes aggregate counts/cost sums from server-owned event/summary fields for live display but does not inspect provider catalogs or calculate provider pricing.
- Current prompt percentage uses the effective total context window denominator; input budget after reservations/compaction threshold is not shown as the denominator.

## Known Risks

- Pricing catalog freshness remains conservative by design. Endpoint/region/service-tier metadata not trusted by the model catalog becomes missing/partial rather than an asserted total.
- Mixed provider/model/currency summaries intentionally avoid fake monetary totals; downstream API/E2E should verify this behavior through durable coverage.
- Mistral/MiniMax live probes were explicitly deferred upstream; implementation did not add live-probe-specific logic for them.
- Existing API/E2E tests may still refer to removed or renamed Token Meter/API fields; coverage investigation is intentionally left for `api_e2e_engineer` per team workflow.
- One early manual server start targeted the default AutoByteus data directory before being corrected to a temp data dir; final REQ-031 validation used `/tmp/autobyteus-token-readme-data`.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Larger Requirement: bug fix + behavior change + UI explainability + targeted refactor.
- Reviewed root-cause classification: Missing Invariant; Boundary Or Ownership Issue; Duplicated Policy Or Coordination; Shared Structure Looseness.
- Reviewed refactor decision (`Refactor Needed Now`/`No Refactor Needed`/`Deferred`): Refactor Needed Now.
- Implementation matched the reviewed assessment (`Yes`/`No`): Yes.
- If challenged, routed as `Design Impact` (`Yes`/`No`/`N/A`): N/A.
- Evidence / notes: Implemented the approved component-basis resolver, pricing policy resolver, expanded ledger/API/UI contract, and Token Meter UI hierarchy. No design gap or cross-cutting ambiguity required reroute.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`.
- Legacy old-behavior retained in scope: `No`.
- Dead/obsolete code, obsolete files, unused helpers/tests/flags/adapters, and dormant replaced paths removed in scope: `Yes`.
- Shared structures remain tight (no one-for-all base or overlapping parallel shapes introduced): `Yes`.
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: `Yes`.
- Changed source implementation files stayed within proactive size-pressure guardrails (`>500` avoided; `>220` assessed/acted on): `Yes`.
- Notes:
  - Removed/replaced the old global `input - cache` pricing assumption with semantic component basis.
  - Removed trusted-zero custom OpenAI-compatible pricing default.
  - Removed frontend accounting-token live fallback and raw reported/accounting fields from the frontend Token Meter type; live UI uses `meter_delta_*` plus server component/cost/status fields.
  - Replaced ambiguous primary `Input`/raw `events` UI semantics with `Gross input` and details-only `Usage reports`.
  - Historical records without semantics are classified/suppressed as unknown/partial rather than emulating old pricing.

## Environment Or Dependency Notes

- No new package dependency was added.
- Prisma client generation ran as part of `pnpm -C autobyteus-server-ts build`.
- Manual REQ-031 validation followed README startup guidance:
  - Backend: `DATA_DIR=/tmp/autobyteus-token-readme-data DATABASE_URL=file:/tmp/autobyteus-token-readme-data/db/production.db CODEX_APP_SERVER_SANDBOX=danger-full-access node autobyteus-server-ts/dist/app.js --data-dir /tmp/autobyteus-token-readme-data --host 0.0.0.0 --port 8000`
  - Frontend: `pnpm -C autobyteus-web dev` (Nuxt on `http://0.0.0.0:3000/`)
- In-app browser and Chrome extension browser targets were unavailable in this session, so the final visual inspection screenshot was captured with standalone Playwright/Chrome against the README-started frontend.

## Local Implementation Checks Run

Implementation-scoped checks only:

- `pnpm -C autobyteus-server-ts build` — passed.
- `pnpm -C autobyteus-server-ts exec vitest run tests/unit/token-usage/pricing/token-cost-calculator.test.ts tests/unit/token-usage/projections/token-usage-snapshot-delta-normalizer.test.ts tests/unit/agent-execution/events/token-usage-event-enrichment-transformer.test.ts tests/unit/agent-execution/backends/codex/codex-agent-run-backend.test.ts tests/unit/agent-execution/backends/codex/thread/codex-thread.test.ts tests/unit/agent-execution/backends/claude/session/claude-session-token-usage.test.ts` — passed, 6 files / 42 tests.
- `pnpm -C autobyteus-web exec nuxi prepare` — passed.
- `pnpm -C autobyteus-web exec cross-env NUXT_TEST=true vitest run stores/__tests__/tokenUsageMeterStore.spec.ts components/workspace/usage/__tests__/TokenUsageMeterPanel.spec.ts` — passed, 2 files / 7 tests. Re-run after removing frontend accounting fallback.
- `pnpm -C autobyteus-web guard:localization-boundary` — passed.
- `pnpm -C autobyteus-web guard:web-boundary` — passed.
- `pnpm -C autobyteus-web build` — passed. Existing large chunk warning remains.
- `pnpm -C autobyteus-ts exec vitest run tests/unit/llm/api/token-usage-normalizers.test.ts tests/unit/llm/extensions/token-usage-tracking-extension.test.ts tests/unit/llm/utils/llm-config.test.ts tests/unit/llm/supported-model-definitions.test.ts` — passed, 4 files / 39 tests.
- `git diff --check` — passed.

Known baseline / not counted as pass:

- `pnpm -C autobyteus-server-ts typecheck` still fails because the existing TypeScript config includes `tests` outside `rootDir: src`; this predates the change. Server compile coverage is represented by `pnpm -C autobyteus-server-ts build`.

REQ-031 running-app visual validation:

- Backend and frontend started from README commands above.
- Simple agent run used:
  - Agent definition: `codex`
  - Runtime: `codex_app_server`
  - Model: `gpt-5.5`
  - Workspace root: `/tmp/autobyteus-token-readme-data/temp_workspace`
  - Run ID: `codex_83d2fc2370fa4d90bf2899e491bdc7f4`
  - Prompt: `Reply with exactly one short sentence: token meter visual QA completed.`
- Server summary after real token-emitting run:
  - `grossInputTokens=10248`
  - `standardInputTokens=5256`
  - `cacheReadInputTokens=4992`
  - `outputTokens=10`
  - `totalTokens=10258`
  - `cacheState=positive`
  - `estimatedApiTotalCost=0.029076 USD`
  - `apiCostStatus=estimated`
  - `latestPromptTokens=10248`
  - `effectiveContextWindowTokens=258400`
  - `contextWindowUsagePercent=3.96594427244582`
  - `usageReportCount=1`
- Evidence:
  - Summary JSON: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-input-prompt-discrepancy-analysis/tickets/token-input-prompt-discrepancy-analysis/implementation-evidence/2026-06-25-codex-gpt55-token-meter-summary.json`
  - UI inspection report: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-input-prompt-discrepancy-analysis/tickets/token-input-prompt-discrepancy-analysis/implementation-evidence/2026-06-25-codex-gpt55-token-meter-ui-report.json`
  - Screenshot: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-input-prompt-discrepancy-analysis/tickets/token-input-prompt-discrepancy-analysis/implementation-evidence/2026-06-25-codex-gpt55-token-meter.png`
- Visual QA result: approved hierarchy visible and readable with realistic data (`Current prompt`, `Gross input`, `Output`, `Total estimate`, `Input breakdown`, `Pricing details`, `Usage reports`); no unexplained raw `events` primary label and no compaction/compression text.

## Downstream Coverage Hints / Suggested Scenarios

- API/GraphQL coverage should verify the expanded run/team/member token summary fields and removal of old public context-field names.
- E2E coverage should exercise:
  - Live token update and GraphQL reload converge to the same Token Meter breakdown.
  - Cached OpenAI/Codex/gross-input provider summary: gross input stays gross, cache read discounted, standard input separate.
  - Anthropic/base-excludes-cache provider summary: gross input adds cache read/write to base input, with cache write TTL prices surfaced when present.
  - Historical rows missing `input_token_semantic` become unknown/partial rather than priced with the old flat formula.
  - Mixed currencies show aggregate tokens but no fake aggregate cost.
  - Custom OpenAI-compatible models without trusted pricing show missing/partial instead of trusted zero.
  - Local runtime rows show `local_no_api_bill`.
  - Token Meter labels remain `Gross input`, `Input breakdown`, `Pricing details`, and `Usage reports`, not primary `Input`/`events`.

## API / E2E / Executable Coverage Investigation And Execution Still Required

Required. Per team workflow, API/E2E coverage investigation, durable coverage edits, broader executable environment setup, and final executable validation belong to `api_e2e_engineer` after code review. Implementation did not update repository-resident API/E2E coverage beyond implementation-scoped unit/component tests.
