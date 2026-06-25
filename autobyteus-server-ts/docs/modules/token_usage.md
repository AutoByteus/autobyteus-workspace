# Token Usage

## Scope

Token usage is the server-owned accounting spine for model/runtime usage. The
current source of truth is the append-only `token_usage_ledger_events` table,
not frontend state, message rendering metadata, runtime memory, or the historical
role-split `token_usage_records` table.

The ledger answers, per usage observation:

- which agent run and turn consumed the tokens;
- which team/member/task context owned the usage when the run is inside a team;
- which runtime, model provider, and model identifier produced the usage;
- which token counts were reported by the provider/runtime and which accounting
  delta is safe to aggregate;
- whether estimated API price could be calculated from trusted catalog pricing;
- which raw provider/runtime usage payload was observed for audit/debugging.

## TS Source

- Domain/event payloads: `src/agent-execution/domain/agent-run-token-usage.ts`
- Event enrichment/persistence pipeline:
  - `src/agent-execution/events/default-agent-run-event-pipeline.ts`
  - `src/agent-execution/events/processors/token-usage/`
- Runtime ingestion:
  - Native AutoByteus: `autobyteus-ts` emits `TOKEN_USAGE_UPDATED` from
    `LlmPhase` using `LlmTokenUsageObservation` provider normalizers.
  - Codex App Server: `src/agent-execution/backends/codex/thread/` parses
    `thread/tokenUsage/updated`; `codex-agent-run-backend.ts` emits ready
    `TOKEN_USAGE_UPDATED` events.
  - Claude Agent SDK: `src/agent-execution/backends/claude/session/` extracts
    terminal result/model-usage data into `TOKEN_USAGE_UPDATED` events.
- Ledger/pricing/projections: `src/token-usage`
- SQL repository: `src/token-usage/repositories/sql/token-usage-ledger-repository.ts`
- GraphQL API: `src/api/graphql/types/token-usage-stats.ts`
- Prisma model/migration:
  - `prisma/schema.prisma` model `TokenUsageLedgerEvent`
  - `prisma/migrations/20260624090000_add_token_usage_ledger_events/`

## Event Pipeline

`TOKEN_USAGE_UPDATED` is a normalized `AgentRunEvent`. Before downstream
processors run, `TokenUsageEventEnrichmentTransformer` converts raw runtime
payloads into the ledger/event contract:

1. `createTokenUsageUpdatedPayload(...)` normalizes reported usage, model
   identity, scope, raw JSON, quality flags, and idempotency fields.
2. `TokenUsageContextEnricher` adds canonical run/team/member/task/workspace
   identity from `AgentRunContext` / `AgentRunConfig` / `MemberTeamContext`.
3. `TokenUsageSnapshotDeltaNormalizer` converts provider readings into
   aggregatable accounting deltas. `per_call` and `per_turn` readings are direct
   deltas; `cumulative_snapshot` readings are diffed by snapshot series so a
   Codex cumulative total cannot be summed repeatedly.
4. `TokenCostCalculator` resolves trusted model pricing through the shared
   `autobyteus-ts` model catalog and annotates nullable estimated API cost
   fields plus cost status.
5. `TokenUsageEventPersistenceProcessor` schedules an async append through
   `TokenUsageLedgerStore`. Persistence failures are logged and must not block
   runtime streaming/event dispatch.

## Ledger Semantics

The ledger separates **reported** provider/runtime readings from **accounting**
deltas:

- `reported_input_tokens`, `reported_output_tokens`, and `reported_total_tokens`
  preserve what the runtime said.
- `accounting_input_tokens`, `accounting_output_tokens`, and
  `accounting_total_tokens` are the only fields that summaries/statistics add.
- `usage_scope` is `per_call`, `per_turn`, or `cumulative_snapshot`.
- `raw_usage_json` and `raw_event_json` preserve provider/runtime details such
  as cache and reasoning token fields when available.
- `quality_flags` record missing/partial usage observations without fabricating
  token counts.

Cost is always an **estimated API-price** interpretation over accounting token
deltas. It is separate from token counts and is nullable:

- `api_cost_status = estimated` only when trusted input/output pricing resolves
  from the shared catalog.
- `price_missing` means tokens were stored but no trusted price was available.
- `partial_price_missing` means only part of the needed price dimensions were
  trusted.
- `mixed` is used by aggregate summaries/statistics when rows have different
  cost statuses.

Constructor/default-zero price values are not trusted free prices. Unknown,
placeholder, local, or unmatched models remain token-only until trusted pricing
is added.

## SQL Storage

`token_usage_ledger_events` is append-oriented and idempotent:

- `usage_event_id` is unique.
- `idempotency_key` is unique.
- run/time, team/time, and snapshot-series indexes support summaries and
  cumulative snapshot diffing.

The old `token_usage_records` table was a lossy role-split storage shape and is
not used as the current accounting source. `TokenUsageStore`,
`SqlTokenUsageRecordRepository`, and `TokenUsagePersistenceProcessor` should not
be reintroduced as compatibility writers.

## GraphQL / Statistics

`TokenUsageStatisticsResolver` exposes ledger-backed reads:

- `totalCostInPeriod(startTime, endTime)` returns nullable estimated total cost.
- `usageStatisticsInPeriod(startTime, endTime)` groups accounting tokens and
  nullable costs by model.
- `getAgentRunTokenUsageSummary(runId)` returns a run summary.
- `getTeamRunTokenUsageSummary(teamRunId)` returns a team aggregate.
- `getTeamMemberTokenUsageSummary(teamRunId, memberAgentRunId?, memberRouteKey?)`
  returns focused member usage.

All summary token totals are computed from accounting deltas, not reported
cumulative snapshots.

## Frontend Contract

The frontend treats token usage as display-only state:

- live `TOKEN_USAGE_UPDATED` WebSocket events update `tokenUsageMeterStore`;
- reopening/focusing runs hydrates from the GraphQL summary queries;
- `TokenUsageHeaderChip` and the right-side `Usage` tab render tokens,
  nullable estimated API costs, price status, model/runtime metadata, and latest
  context pressure;
- the frontend does not compute authoritative accounting deltas or model prices.

"Unpriced" means token usage exists but trusted API-price metadata was missing;
it must not be displayed as `$0`.

## Browser Frontend Evidence

Delivery evidence exercised the browser-facing Usage UI against real local
backend/frontend stacks and the ledger-backed GraphQL hydration path. The latest
reviewed evidence covers all three requested runtime families:

| Runtime proof | How usage reached the browser | Verified Usage UI state |
| --- | --- | --- |
| AutoByteus + LM Studio qwen3.5 | Built backend + Nuxt frontend, seeded historical run metadata, and one ledger event loaded through the workspace route. | Header `366 tok · unpriced`; Usage tokens `321 / 45 / 366`; cost cards `unpriced`; `apiCostStatus = price_missing`; model `qwen3.5-27b:lmstudio@127.0.0.1:1234`; runtime `autobyteus`; event count `1`; context pressure `12.2%` with `500 / 4.096` context tokens; header chip reopened Usage after switching tabs. |
| Codex App Server | Real backend GraphQL-created run and WebSocket turn emitted `TOKEN_USAGE_UPDATED`, persisted one ledger event, then the persisted run opened in Nuxt Usage. | Header `12.7k tok · 0,0096 $ est`; Usage tokens `12.695 / 26 / 12.721`; estimated cost cards; `apiCostStatus = estimated`; model `gpt-5.4-mini`; runtime `codex_app_server`; event count `1`. |
| Claude Agent SDK | Real backend GraphQL-created run and WebSocket turn emitted `TOKEN_USAGE_UPDATED`, persisted one ledger event, then the persisted run opened in Nuxt Usage. | Header `22.3k tok · unpriced`; Usage tokens `22.270 / 39 / 22.309`; cost cards `unpriced`; `apiCostStatus = price_missing`; model `sonnet`; runtime `claude_agent_sdk`; event count `1`. |

Together these proofs confirm the current browser contract over server-owned
ledger data for both estimated-price and missing-price cases. The frontend must
continue to render server-provided cost status and nullable estimated costs; it
must not synthesize prices or display missing prices as `$0`.

The browser proofs are one-off delivery evidence rather than a committed browser
or screenshot automation harness. Durable frontend regression coverage still
comes from store/handler tests, production build/guards, and any future browser
E2E harness the project chooses to add.

## Runtime E2E Coverage

Real runtime token usage coverage is intentionally environment-gated so default
CI and local developer runs do not require live LM Studio, Codex App Server, or
Claude Agent SDK processes. When those runtimes are configured, run:

```sh
RUN_RUNTIME_TOKEN_USAGE_E2E=1 \
RUNTIME_TOKEN_USAGE_E2E_TIMEOUT_MS=300000 \
LMSTUDIO_MODEL_ID='qwen3.5-27b:lmstudio@127.0.0.1:1234' \
CODEX_E2E_TOOL_MODEL='gpt-5.4-mini' \
CLAUDE_E2E_MODEL='sonnet' \
pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/token-usage-runtime-graphql.e2e.test.ts
```

The reviewed delivery evidence for the token usage ledger change recorded this
command passing for three real runtime cases: AutoByteus with LM Studio
qwen3.5-family model, Codex App Server, and Claude Agent SDK. Each case creates
a run, opens the agent websocket, sends `SEND_MESSAGE`, observes
`TOKEN_USAGE_UPDATED` with positive token totals and the expected
runtime/ingestion kind, waits for idle, and verifies ledger-backed GraphQL
summary/statistics projections.

With `RUN_RUNTIME_TOKEN_USAGE_E2E` unset, the suite remains safely skipped by
design.

## Operational Notes

- No local tokenizer estimate should feed persisted accounting.
- Native provider adapters preserve raw/cache/reasoning usage details in
  `LlmTokenUsageObservation` before the server turns observations into ledger
  events.
- Deterministic unit/integration/E2E coverage validates the ledger, cost,
  GraphQL, and frontend meter contracts; the environment-gated runtime E2E above
  provides live-runtime confirmation when configured runtimes are available.
