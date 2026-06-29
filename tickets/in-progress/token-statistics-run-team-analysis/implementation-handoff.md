# Implementation Handoff

## Upstream Artifact Package

- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-run-team-analysis/tickets/in-progress/token-statistics-run-team-analysis/requirements.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-run-team-analysis/tickets/in-progress/token-statistics-run-team-analysis/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-run-team-analysis/tickets/in-progress/token-statistics-run-team-analysis/design-spec.md`
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-run-team-analysis/tickets/in-progress/token-statistics-run-team-analysis/design-review-report.md`
- Supporting design rework notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-run-team-analysis/tickets/in-progress/token-statistics-run-team-analysis/design-rework-round2.md`
- UI prototype spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-run-team-analysis/ui-prototypes/token-statistics-task-cost/ui-prototype-spec.md`
- UI behavior matrix: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-run-team-analysis/ui-prototypes/token-statistics-task-cost/ui-behavior-test-matrix.md`

## What Changed

- Implemented the Token Statistics task-oriented redesign with `By Task` as the default view and `By Model` as a runtime/model diagnostic view.
- Kept `TokenUsageStatisticsProvider` as the authoritative historical projection owner. GraphQL now maps provider DTOs rather than owning aggregation behavior.
- Added an identity-free token usage cost aggregate for shared cost/tokens/pricing math, and added a separate run-summary adapter for focused run/team/member summaries.
- Added task statistics projection that groups top-level standalone runs and root team runs, presents team members only as child rows, and sorts by created time descending in the UI.
- Changed the model statistics projection to group by `(runtimeKind, modelIdentifier)` and expose runtime visibility.
- Reworked Settings > Token Statistics UI around task rows, expandable team members, runtime/model rows, static `Usage during period` help text, cost details, and metadata fallbacks.
- Removed the obsolete `src/token-usage/domain/models.ts` stats shape and removed the old private ledger-store summary builder in favor of the new run-summary adapter.

## Key Files Or Areas

- Backend projection/domain additions:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-run-team-analysis/autobyteus-server-ts/src/token-usage/domain/statistics-models.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-run-team-analysis/autobyteus-server-ts/src/token-usage/projections/token-usage-cost-summary-aggregate.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-run-team-analysis/autobyteus-server-ts/src/token-usage/projections/token-usage-run-summary-adapter.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-run-team-analysis/autobyteus-server-ts/src/token-usage/providers/token-usage-run-history-enricher.ts`
- Backend projection/API updates:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-run-team-analysis/autobyteus-server-ts/src/token-usage/providers/statistics-provider.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-run-team-analysis/autobyteus-server-ts/src/token-usage/providers/token-usage-ledger-store.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-run-team-analysis/autobyteus-server-ts/src/api/graphql/types/token-usage-stats.ts`
- Backend focused integration coverage updated for the provider shape:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-run-team-analysis/autobyteus-server-ts/tests/integration/token-usage/providers/statistics-provider.integration.test.ts`
- Frontend UI/store/query updates:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-run-team-analysis/autobyteus-web/components/settings/TokenUsageStatistics.vue`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-run-team-analysis/autobyteus-web/components/settings/token-usage/TokenUsageTaskStatisticsTable.vue`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-run-team-analysis/autobyteus-web/components/settings/token-usage/TokenUsageModelStatisticsTable.vue`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-run-team-analysis/autobyteus-web/components/settings/token-usage/TokenUsageCostBreakdown.vue`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-run-team-analysis/autobyteus-web/components/settings/token-usage/tokenUsageStatisticsUi.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-run-team-analysis/autobyteus-web/stores/tokenUsageStatistics.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-run-team-analysis/autobyteus-web/graphql/queries/token_usage_statistics_queries.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-run-team-analysis/autobyteus-web/types/tokenUsageStatistics.ts`
- Localization and small typing cleanup:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-run-team-analysis/autobyteus-web/localization/messages/en/settings.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-run-team-analysis/autobyteus-web/localization/messages/zh-CN/settings.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-run-team-analysis/autobyteus-web/components/workspace/usage/tokenUsageFormatting.ts`

## Important Assumptions

- The MVP date range continues to mean usage observed during the selected period; no `rangeMode` GraphQL argument or range-mode dropdown was added.
- Task `createdAt` metadata uses run/team history when available and falls back to first usage observed for legacy/incomplete records, with explicit fallback source labeling.
- Legacy records without display names, workspace names, runtime, model, or provider metadata are represented with `Unknown`/`unknown` style fallbacks rather than blocking the projection.
- Pricing/currency aggregation remains event-led and reports mixed or missing pricing dimensions through aggregate metadata rather than trying to infer unavailable costs.
- Generated frontend GraphQL artifacts were not regenerated because the repository codegen configuration depends on a live backend GraphQL base URL. The token statistics store uses local result interfaces instead of importing stale generated result types.

## Known Risks

- Frontend broad `nuxi typecheck` remains red due existing repository-wide issues unrelated to this token statistics implementation; a filtered token-statistics pass showed no `TokenUsage`/`token-usage` matches in the captured error log.
- The generated frontend GraphQL file remains stale for the new operations until project-specific codegen is run against a live/available backend schema.
- UI behavior was implemented from the prototype/design but has not been visually or E2E verified by this implementation pass.
- Large date ranges continue to use the current in-memory period read behavior accepted by the design review as residual risk.
- Some legacy member rows may show first-observed timestamps when historical member creation metadata is unavailable.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Feature / product UX behavior improvement with targeted projection refactor.
- Reviewed root-cause classification: Shared Structure Looseness, with boundary risk if runtime/model diagnostics reused run summary payloads or pseudo run IDs.
- Reviewed refactor decision (`Refactor Needed Now`/`No Refactor Needed`/`Deferred`): Refactor Needed Now.
- Implementation matched the reviewed assessment (`Yes`/`No`): Yes.
- If challenged, routed as `Design Impact` (`Yes`/`No`/`N/A`): N/A.
- Evidence / notes: The implementation adds a tight identity-free aggregate, a separate run-summary adapter, task-specific DTOs, runtime/model-specific DTOs, and keeps provider-owned aggregation with GraphQL as a mapper. No requirement or design gap was encountered that required rerouting.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None` for in-scope behavior. The existing `usageStatisticsInPeriod` GraphQL operation name remains as the model-diagnostic entrypoint, and alias fields are retained on the GraphQL row class for query compatibility, but old model-only UI behavior and old private aggregation paths were removed.
- Legacy old-behavior retained in scope: `No`.
- Dead/obsolete code, obsolete files, unused helpers/tests/flags/adapters, and dormant replaced paths removed in scope: `Yes`.
- Shared structures remain tight (no one-for-all base or overlapping parallel shapes introduced): `Yes`.
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: `Yes`.
- Changed source implementation files stayed within proactive size-pressure guardrails (`>500` avoided; `>220` assessed/acted on): `Yes`.
- Notes: Effective non-empty line counts for changed source implementation files are all below 500. The largest changed implementation source is `token-usage-stats.ts` at 424 effective non-empty lines. The task table was split into helper/detail components and is 217 effective non-empty lines.

## Environment Or Dependency Notes

- `pnpm install --frozen-lockfile` completed successfully before checks.
- Server Prisma generation was run through the package-local Prisma command.
- Frontend Nuxt preparation was run before the frontend typecheck attempt.
- No new package dependency was added.
- No API/E2E environment setup was performed by implementation; that remains downstream-owned.

## Local Implementation Checks Run

Implementation-scoped checks only:

- `pnpm install --frozen-lockfile` — passed.
- `pnpm -C autobyteus-server-ts typecheck` — failed due existing broad project `TS6059` test/rootDir mismatch with test files outside `rootDir`; not specific to this implementation.
- `pnpm -C autobyteus-server-ts exec prisma generate --schema ./prisma/schema.prisma` — passed.
- `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit` — passed.
- `pnpm -C autobyteus-server-ts exec vitest run tests/integration/token-usage/providers/statistics-provider.integration.test.ts tests/integration/token-usage/providers/token-usage-store.integration.test.ts` — passed, 2 files / 12 tests.
- `pnpm -C autobyteus-server-ts build` — passed, including shared builds, Prisma generation, TypeScript build, asset copy, and smoke built-in agents bootstrap.
- From `autobyteus-server-ts`: `node -e "import('reflect-metadata').then(() => import('./dist/api/graphql/schema.js')).then(async m => { await m.buildGraphqlSchema(); console.log('schema ok'); })"` — passed with `schema ok`.
- `pnpm -C autobyteus-web guard:web-boundary` — passed.
- `pnpm -C autobyteus-web guard:localization-boundary && pnpm -C autobyteus-web audit:localization-literals` — passed; audit emitted only the existing module-type warning.
- `pnpm -C autobyteus-web exec nuxi prepare` — passed.
- `pnpm -C autobyteus-web exec nuxi typecheck` — failed due existing broad repository issues such as build-script type-only imports, old tests, missing generated/store imports, and stale generated GraphQL types. After fixing the token-usage translator typing issue, a captured filtered log at `/tmp/token-stats-web-typecheck.log` had zero matches for `TokenUsage|token-usage`; the full log had 230 TypeScript error lines.

## Downstream Coverage Hints / Suggested Scenarios

Suggested coverage investigation targets for `api_e2e_engineer`:

- GraphQL task query returns top-level standalone runs and root team runs only, with team members nested as child rows and no double counting between parent and children.
- GraphQL model query groups rows by `(runtimeKind, modelIdentifier)`, including the case where the same model identifier appears under multiple runtimes.
- Runtime/model rows expose input/output/cache/thinking token and cost breakdowns plus runtime visibility.
- Settings > Token Statistics defaults to `By Task`, uses the static `Usage during period` help text, sends no `rangeMode`, sorts top-level task rows by created time descending, and supports expanding/collapsing team member rows.
- Cost detail panel shows input/cache/output/thinking costs, missing pricing dimensions, mixed currency/provider/model/runtime status, and unavailable/partial states.
- Metadata fallback scenarios show `Unknown` and `First usage observed` as designed for legacy/incomplete records.
- Empty, loading, and error states for both `By Task` and `By Model` tabs.

## API / E2E / Executable Coverage Investigation And Execution Still Required

API/E2E and broader executable coverage investigation/execution are still required and should be owned by `api_e2e_engineer` after code review. This implementation handoff does not claim API, E2E, or broader executable validation as complete.
