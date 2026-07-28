# GraphQL Token Count Contract

## Status

Current protocol/API contract supplement. Related requirements: REQ-001 and REQ-002. Related acceptance criteria: AC-001, AC-002, and AC-005. Approval: included in the user-approved requirements basis on 2026-07-28. This supplement constrains the technical transport contract without adding a new product feature.

Core artifact links:

- [Requirements doc](/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-int-overflow/tickets/in-progress/token-statistics-int-overflow/requirements-doc.md)
- [Investigation notes](/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-int-overflow/tickets/in-progress/token-statistics-int-overflow/investigation-notes.md)
- [Design spec](/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-int-overflow/tickets/in-progress/token-statistics-int-overflow/design-spec.md)

## Evidence

- `/Users/normy/.autobyteus/logs/app.log` records built-in GraphQL `Int` failing at `usageStatisticsInPeriod[0].inputTokens` for `3136827911`.
- Read-only SQL against `/Users/normy/.autobyteus/server-data/db/production.db` reproduces the exact `3136827911` sum for `codex_app_server` / `gpt-5.6-sol` over 2026-07-21T00:00:00Z through 2026-07-28T00:00:00Z.
- The authoritative schema/mapping owner is `autobyteus-server-ts/src/api/graphql/types/token-usage-stats.ts`.
- `graphql-scalars@1.25.0` local runtime probes prove `GraphQLSafeInt.serialize(3136827911)` returns the exact JavaScript number and rejects unsafe-integer values; existing domain normalization independently establishes non-negativity.
- A disposable GraphQL Code Generator 4.1.6 probe proves an unmapped custom `SafeInt` scalar becomes `any`; explicit frontend codegen mapping is required.

## Current Contract

- Token-valued fields in `TokenUsageCostSummaryAggregateGraphql`, `UsageStatistics`, and `TokenUsageRunSummaryGraphql` use built-in GraphQL `Int`.
- Built-in `Int` rejects results outside signed 32-bit range during GraphQL response serialization.
- The provider projection, SQLite storage, Pinia store normalization, shared frontend token types, and report formatters use JavaScript `number` and already preserve the observed safe integer.
- `usageReportCount` is a report-row count, not a token value, and remains outside this contract change.

## Target Contract

- Use `GraphQLSafeInt` from the existing `graphql-scalars` dependency for every token-valued output field in the token-usage GraphQL type family:
  - all token components in `TokenUsageCostSummaryAggregateGraphql`;
  - `UsageStatistics.inputTokens`, `promptTokens`, `cacheReadInputTokens`, `cacheCreationInputTokens`, `outputTokens`, `assistantTokens`, `thinkingTokens`, and `reasoningTokens`;
  - `TokenUsageRunSummaryGraphql.latestPromptTokens` and `effectiveContextWindowTokens`.
- Keep `usageReportCount` and unrelated integer identities/counts on built-in `Int` unless a separate requirement establishes a range defect.
- Keep all JSON response values numeric. The approved target does not stringify token counts or introduce `bigint` in the client.
- Explicitly configure `autobyteus-web/codegen.ts` so scalar `SafeInt` has TypeScript input/output type `number`, then regenerate `autobyteus-web/generated/graphql.ts` from the matching backend schema.
- Use the existing full integer formatter for the primary Settings Task-table input/output cells so a large token count is visible as exact decimal digits; compact notation remains allowed only for secondary explanatory cache/thinking sublines.
- Leave aggregation, persistence, query selections, date filtering, grouping, pricing, loading, empty, and unrelated-error behavior unchanged.

## Invariants

1. Returned token counts are whole, non-negative JavaScript safe integers.
2. A supported non-negative response value from `0` through `Number.MAX_SAFE_INTEGER` is serialized without a 32-bit GraphQL limit.
3. The existing ingestion/projection domain remains the owner of the non-negative invariant; the GraphQL scalar rejects fractional, non-finite, or unsafe-integer values rather than silently coercing them.
4. Existing persisted ledger rows are consumed without transformation.
5. Client-generated types remain numeric and explicit, never `any` for the new scalar.

## Rejected Alternatives

- `GraphQL Int`: rejected because it reproduces the signed 32-bit failure.
- `GraphQLNonNegativeInt`: considered but not selected because supported domain normalization already owns non-negativity; duplicating that policy at transport is unnecessary for the observed range defect.
- `GraphQLFloat`: rejected because token counts are integral domain values.
- `GraphQLBigInt`: rejected because it changes the cross-client runtime/type contract and can serialize larger values as strings; no such range is required here.
- `String`: rejected because it weakens numeric semantics and forces parsing changes throughout the client.
- Capping at `2147483647`, dropping rows, truncating, or rounding: rejected because each corrupts the report.
- Database migration or rewrite: rejected because SQLite already stores the source data correctly and the defect is transport-only.
- Relying only on the scalar package's `codegenScalarType` extension: rejected because endpoint introspection does not preserve it and the verified generator emits `any` without explicit configuration.

## Codegen / Runtime Consequence

The backend schema will expose `scalar SafeInt`. `autobyteus-web/codegen.ts` must map it explicitly to `{ input: number; output: number }`. The regenerated `Scalars` entry and all affected token fields must use `Scalars['SafeInt']['output']`; existing store and display code continue to receive numbers.

## Required Coverage Shape

1. Build the real backend GraphQL schema and persist isolated token-usage events whose individual values are valid and whose selected-period/runtime-model aggregate exceeds `2_147_483_647` (prefer the observed `3136827911`).
2. Query both `usageStatisticsInPeriod` and the task-statistics aggregate path used concurrently by the page; assert no GraphQL errors and exact numeric values.
3. Exercise a shared run-summary token field or validate the built schema field types so the whole token-usage GraphQL type family cannot retain a stray token-valued `Int`.
4. Preserve existing smaller-count aggregation and unrelated frontend error-state coverage.
5. Regenerate frontend GraphQL output and verify `SafeInt` is numeric rather than `any`.
6. Render a large token value through the Task table and assert the primary input/output cells show exact decimal digits, allowing locale separators; compact secondary sublines must not be the only representation.
