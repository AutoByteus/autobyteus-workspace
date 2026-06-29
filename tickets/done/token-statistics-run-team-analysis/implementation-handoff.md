# Implementation Handoff

## Upstream Artifact Package

- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/token-statistics-run-team-analysis/requirements.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/token-statistics-run-team-analysis/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/token-statistics-run-team-analysis/design-spec.md`
- Design review report: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/token-statistics-run-team-analysis/design-review-report.md`
- Round 5 field-policy rework: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/token-statistics-run-team-analysis/design-rework-round5-final-field-policy.md`
- Supporting UI prototype spec: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/ui-prototypes/token-statistics-task-cost/ui-prototype-spec.md`
- Supporting UI behavior matrix: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/ui-prototypes/token-statistics-task-cost/ui-behavior-test-matrix.md`
- Superseded/historical context, still relevant for reviewer awareness:
  - `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/token-statistics-run-team-analysis/design-rework-round2.md`
  - `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/token-statistics-run-team-analysis/design-rework-round3-user-verification.md`
  - `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/token-statistics-run-team-analysis/design-rework-round4-self-contained-display-context.md`
  - `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/token-statistics-run-team-analysis/user-verification-member-roster-probe.json`

## What Changed

- Replaced the paused Round 3 roster/no-usage implementation direction with the Round 5 usage/cost-report behavior.
- Added exactly five token-usage-owned persisted display fields to the ledger payload/schema/mapping: `teamName`, `agentName`, `runSummary`, `runCreatedAt`, and `memberName`.
- Added `TokenUsageDisplayFieldCapturer` under the token-usage provider boundary. It reads run-history catalog/metadata only to capture/backfill the five display fields and does not expose roster/workspace/full-definition data.
- Wired the ledger store to capture display fields on append and to opportunistically backfill missing display fields on period reads before returning statistics events.
- Kept `TokenUsageStatisticsProvider` as the task/runtime-model projection owner and changed task rows to read persisted display fields from ledger events rather than live run-history joins.
- Restored usage-derived team expansion: expanded team rows contain selected-period member usage groups only, grouped by `memberAgentRunId` first and `memberRouteKey`/`runId` fallback for incomplete legacy events.
- Removed Round 3 roster/no-usage artifacts from the Settings statistics shape: no roster merge, no no-usage aggregate rows, no `periodUsageState`, no member-created-time fields, no configured no-usage runtime/model labels, no workspace display fields.
- Kept runtime/model diagnostics grouped by runtime/model identity and kept focused run/team/member summaries on the separate run-summary adapter path.
- Updated GraphQL/backend/frontend task statistics DTO/query/store/table shapes to match the tightened Round 5 contract.
- Preserved the UI refinements: compact `Usage during period`, no `rangeMode`/created-period selector, `By Task` default, and `Created Time` as the last visible By Task column. Member `Created Time` cells render a muted `—` because member-created-time is out of scope.

## Key Files Or Areas

- Persistence and payload fields:
  - `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-server-ts/prisma/schema.prisma`
  - `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-server-ts/prisma/migrations/20260629120000_add_token_usage_display_fields/migration.sql`
  - `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-server-ts/src/agent-execution/domain/agent-run-token-usage.ts`
  - `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-server-ts/src/token-usage/repositories/sql/token-usage-ledger-repository.ts`
- Token-usage provider/projection changes:
  - `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-server-ts/src/token-usage/providers/token-usage-display-field-capturer.ts`
  - `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-server-ts/src/token-usage/providers/token-usage-ledger-store.ts`
  - `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-server-ts/src/token-usage/providers/statistics-provider.ts`
  - `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-server-ts/src/token-usage/domain/statistics-models.ts`
  - Removed `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-server-ts/src/token-usage/providers/token-usage-run-history-enricher.ts`
- GraphQL/frontend Settings statistics changes:
  - `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-server-ts/src/api/graphql/types/token-usage-stats.ts`
  - `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-web/graphql/queries/token_usage_statistics_queries.ts`
  - `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-web/generated/graphql.ts`
  - `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-web/types/tokenUsageStatistics.ts`
  - `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-web/stores/tokenUsageStatistics.ts`
  - `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-web/components/settings/TokenUsageStatistics.vue`
  - `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-web/components/settings/token-usage/TokenUsageTaskStatisticsTable.vue`
- Focused implementation coverage updated/added:
  - `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-server-ts/tests/integration/token-usage/providers/statistics-provider.integration.test.ts`
  - `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-server-ts/tests/integration/token-usage/providers/token-usage-display-field-capturer.integration.test.ts`
  - `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-web/components/settings/token-usage/__tests__/TokenUsageTaskStatisticsTable.spec.ts`
  - `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-web/stores/__tests__/tokenUsageStatistics.spec.ts`
  - `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-web/components/settings/__tests__/TokenUsageStatistics.spec.ts`
- Durable docs touched to remove stale roster/workspace wording:
  - `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-server-ts/docs/modules/token_usage.md`
  - `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-web/docs/settings.md`
  - `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-web/docs/agent_execution_architecture.md`

## Important Assumptions

- Selected date range remains observed usage during period; no `rangeMode` GraphQL argument or created-period mode was added.
- Settings > Token Statistics remains a usage/cost report, not a live roster viewer. Inactive/no-usage roster members are intentionally omitted in MVP.
- `runSummary` is optional display text. Missing summaries do not block task statistics rows.
- Imported or already-captured display fields win over current metadata so historical rows remain stable after run-history metadata renames.
- Legacy rows whose display fields cannot be captured/backfilled still use explicit fallback labels (`Unknown ...`, `First usage observed`).
- The new period-read backfill is best-effort and non-fatal; if metadata is gone or unreadable, statistics still render from ledger facts and fallbacks.

## Known Risks

- Broad frontend `nuxi typecheck` remains red from repository-wide baseline issues outside the focused token-statistics check scope; see checks below.
- Manual update of `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-web/generated/graphql.ts` was required because project codegen depends on a live backend GraphQL base URL.
- Opportunistic display-field backfill on period reads adds metadata lookups for legacy events missing core display fields; large ranges already carry accepted in-memory-read risk and should be revisited if performance regresses.
- Existing legacy rows without run-history metadata may still show fallback labels by design.
- API/E2E coverage and realistic environment validation are still downstream-owned.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Feature/product UX improvement with targeted projection refactor and data-shape tightening.
- Reviewed root-cause classification: Boundary/Ownership Issue for self-contained historical display fields; Shared Structure Looseness avoided for runtime/model diagnostics.
- Reviewed refactor decision (`Refactor Needed Now`/`No Refactor Needed`/`Deferred`): Refactor Needed Now.
- Implementation matched the reviewed assessment (`Yes`/`No`): Yes.
- If challenged, routed as `Design Impact` (`Yes`/`No`/`N/A`): N/A.
- Evidence / notes: The implementation keeps provider-owned statistics projections, a token-usage-owned display-field capturer/backfill path, identity-free aggregates, and no live roster merge or broad display-context snapshot.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None` for the removed roster/no-usage Settings shape. Existing focused run/team/member token summary APIs remain on their focused summary path.
- Legacy old-behavior retained in scope: `No`.
- Dead/obsolete code, obsolete files, unused helpers/tests/flags/adapters, and dormant replaced paths removed in scope: `Yes`.
- Shared structures remain tight (no one-for-all base or overlapping parallel shapes introduced): `Yes`.
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: `Yes`.
- Changed source implementation files stayed within proactive size-pressure guardrails (`>500` avoided; `>220` assessed/acted on): `Yes`.
- Notes: Effective non-empty line counts for changed source implementation files are below 500. Larger touched files such as the SQL repository remain under the guardrail; table/store/provider files remain focused.

## Environment Or Dependency Notes

- No new package dependency was added.
- Prisma client generation was run via server build/generate commands after schema migration changes.
- No API/E2E environment setup was performed by implementation.

## Local Implementation Checks Run

Implementation-scoped checks only:

- `pnpm -C autobyteus-server-ts exec prisma generate` — passed.
- `pnpm -C autobyteus-server-ts exec prisma format` — passed.
- `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit` — passed.
- `pnpm -C autobyteus-server-ts exec vitest run tests/integration/token-usage/providers/statistics-provider.integration.test.ts tests/integration/token-usage/providers/token-usage-display-field-capturer.integration.test.ts tests/integration/token-usage/providers/token-usage-store.integration.test.ts` — passed, 3 files / 16 tests.
- `pnpm -C autobyteus-server-ts build` — passed, including shared builds, Prisma generation, TypeScript build, managed messaging asset copy, and built-in agents bootstrap smoke check.
- `pnpm -C autobyteus-web exec vitest run components/settings/token-usage/__tests__/TokenUsageTaskStatisticsTable.spec.ts stores/__tests__/tokenUsageStatistics.spec.ts components/settings/__tests__/TokenUsageStatistics.spec.ts` — passed, 3 files / 7 tests.
- `pnpm -C autobyteus-web guard:web-boundary` — passed.
- `pnpm -C autobyteus-web guard:localization-boundary` — passed.
- `pnpm -C autobyteus-web exec nuxi prepare` — passed.
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm -C autobyteus-web exec nuxi typecheck` — failed with broad repository baseline errors outside the focused token-statistics check scope (examples in first output include build script type-only import errors, missing `~/stores/agents`, unrelated component/test prop typing, and missing `@vue/apollo-composable` declarations). This remains a broad-check blocker, not claimed fixed by this implementation.

## Downstream Coverage Hints / Suggested Scenarios

Suggested investigation targets for `api_e2e_engineer` after code review:

- GraphQL task query returns only selected-period usage-derived team members; no inactive/no-usage roster members appear.
- Ledger rows with captured `teamName`/`agentName`/`runSummary`/`runCreatedAt`/`memberName` render stable labels even if live run-history metadata changes or disappears.
- Legacy rows missing display fields backfill when metadata is available and fall back to `Unknown` / `First usage observed` when it is not.
- Task rows group top-level standalone runs and root team runs without double-counting member usage as standalone rows.
- By Model diagnostics group by runtime/model pair and preserve runtime visibility.
- UI defaults to By Task, keeps `Usage during period` compact, sends no `rangeMode`, shows Created Time as the last visible column, and renders member Created Time as `—`.
- Cost breakdown and price-status states still behave for estimated, partial, missing-price, mixed-currency, cache-positive, reasoning-token, and local/no-bill scenarios.

## API / E2E / Executable Coverage Investigation And Execution Still Required

API/E2E and broader executable coverage investigation/execution are still required and should be owned by `api_e2e_engineer` after code review. This implementation handoff does not claim API, E2E, or broader executable validation as complete.
