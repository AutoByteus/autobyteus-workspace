# Implementation Handoff

## Upstream Artifact Package

- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/requirements.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/design-spec.md`
- Supplemental task artifacts:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/token-usage-data-model-analysis.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/data-migration-conventions.md`
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/solution-revision-record.md`
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/design-review-report.md`
- Architecture review revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/architecture-review-revision-record.md`
- Triggering rework report and revision record:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/code-review-report.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/code-review-revision-record.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/api-e2e-coverage-investigation.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/api-e2e-execution-coverage-report.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/api-e2e-revision-record.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/test-results/api-e2e/logs/07-api-e2e-f001-round2-recheck.log`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/test-results/api-e2e/logs/09-six-api-e2e-durable-changes-round2-pass.log`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/test-results/api-e2e/logs/10-broad-token-suite-round2-diagnostic.log`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/test-results/api-e2e/logs/12-current-record-api-suite-round2.log`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/test-results/api-e2e/logs/13-local-cache-state-failure.log`

## Current Implementation Summary

The implementation replaces the append-only token ledger runtime with an awaited, transactional, one-row-per-canonical-run fold. Current token services, repositories, statistics, GraphQL, activation, and bootstrap use only `token_usage_run_records`. Historical table knowledge is confined to registered app-data migrations. Incomplete consolidation gates historical reads and every pre-existing-run restore before provider construction while permitting unrelated capabilities and newly allocated current-only runs. Consolidation rejects any source/target run-ID intersection before mutation and otherwise imports, validates, and deletes source rows in one SQLite transaction. Both released 20260730 source-shaping migrations are repaired in place with bounded keyset/CAS/scalar work. Settings copy and typed errors describe run-created-range/lifetime-total semantics and degraded migration state truthfully. `IR-002` fixes the BigInt commit/public SafeInt boundary and structural ownership, `IR-003` makes mixed currency govern pricing explanation, and `IR-004` excludes the zero-record cache placeholder from semantic reduction. `IR-005` completes the released-data transformation: non-local rows whose released input semantic is unknown retain the predecessor reader's uncertain component/cache/input-cost meaning, while the local-no-bill exception remains intact. The same normalized facts govern fold, scalar validation, current persistence, and cleanup.

- Implementation cycle: `Rework`
- Implementation revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/implementation-revision-record.md`
- Current implementation revision ID: `IR-005`
- Related solution revision IDs: `SR-006`
- Related architecture-review revision IDs: `ARCH-REV-006`
- Related code-review revision IDs: `CRR-006`
- Related API/E2E revision IDs: `API-REV-002`
- Related delivery revision IDs: `N/A`
- Triggering finding IDs: `CR-006`; `CR-001`–`CR-005`, `APIE2E-F001`, `APIE2E-F002`'s local assertion, and historical `AR-001`–`AR-004` remain resolved.

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 | Atomically fold direct and cumulative observations into one current row; serialize rapid updates; block old-run replay while consolidation is incomplete. | `src/agent-execution/events/default-agent-run-event-pipeline.ts`; `.../token-usage-run-persistence-transformer.ts`; `src/token-usage/services/token-usage-run-accumulator.ts`; `src/token-usage/projections/token-usage-run-fold.ts`; `src/token-usage/projections/token-usage-run-record-state.ts`; `src/token-usage/repositories/sql/token-usage-run-repository.ts`; standalone/team/task lifecycle gates. | Awaited persistence replaces detached scheduling. The transaction now returns the exact persisted record and commits before the live/public summary is built. A post-commit SafeInt projection failure is typed and is not mislabeled as persistence failure. Exact replays are no-ops; regressions do not subtract; strict checkpoint/digest caps remain enforced. The zero-report record placeholder never participates in cache-state reduction; the first admitted observation establishes state directly. |
| BEH-002 | Read current run/member/team records directly and preserve public summary semantics without event-array reconstruction or double counting. | `src/token-usage/providers/token-usage-run-store.ts`; `src/token-usage/projections/token-usage-run-aggregate.ts`; `src/token-usage/projections/token-usage-pricing-summary.ts`; `src/token-usage/providers/task-statistics-tree-builder.ts`; `src/api/graphql/types/token-usage-stats.ts`. | Current summaries retain token components, costs/statuses, cache semantics, report count, latest facts, identity/display values, and exact concrete-run grouping. A first explicit local/unsupported fact persists and returns publicly as `unsupported_or_local`; real admitted `unknown` remains substantive in later reduction. Unsafe BigInt-to-number narrowing throws rather than rounding. Mixed currency is canonicalized at the shared pricing owner: null public currency/costs, mixed cost status, mixed/null relevant unit prices, and preserved not-applicable zero-use components. |
| BEH-003 | Select runs by creation/fallback time and display lifetime totals with truthful copy. | `src/token-usage/providers/statistics-provider.ts`; current repository range query; `autobyteus-web/components/settings/TokenUsageStatistics.vue`; English and Chinese settings localization. | UI range controls remain, but text no longer claims usage deltas were observed only inside the selected period. Task/model switching, empty state, and migration error state were mounted and exercised. |
| BEH-004 | Repair both unchanged-ID 20260730 migrations with bounded SQL candidates, <=250 batches, CAS updates, scalar invariants, and <=50 examples; keep display repair capability-scoped. | `src/app-data-migrations/migrations/token-usage-custom-provider-model-value-backfill-migration.ts`; `.../token-usage-provider-name-snapshot-backfill-migration.ts`; `.../token-usage-source-shaping-constants.ts`; registry and readable-ID prerequisite update. | Whole-ledger snapshots and unbounded detail accumulation are removed. Retry remains under the existing migration IDs and runner. |
| BEH-005 | Expand to current records, consolidate legacy rows once, keep failed-interval new-run rows disjoint, reject overlap, validate, then clean up atomically. | Prisma schema/migration; `src/app-data-migrations/migrations/token-usage-run-records-v1/*`; shared record/pricing/cache fold; migration registry; canonical allocator/current-schema admission paths. | One transaction spans preflight, normalized fold/import, target round-trip, independent normalized scalar aggregate validation, and source deletion. Migration-owned mapping preserves the released non-local unknown-input uncertainty and local-no-bill exception before folding; bounded missing dimensions cannot expand without limit. Existing disjoint current rows are preserved; any source/target intersection aborts before mutation. |
| BEH-006 | Distinguish valid-current-schema capability degradation from critical current-schema failure without legacy fallback. | `src/startup/token-usage-current-schema-readiness.ts`; `src/token-usage/providers/token-usage-migration-readiness.ts`; `src/server-runtime.ts`; `src/startup/embedded-server-platform-fatal.ts`; typed GraphQL/UI error mapping. | Missing required current table/column/single-column unique constraint is bootstrap-fatal. Incomplete app-data consolidation keeps the server healthy but gates history/restores. Manual startup-only consolidation reports restart-required instead of racing runtime writes. |

## Key Files Or Areas

- Current schema and persistence: `autobyteus-server-ts/prisma/schema.prisma`, `prisma/migrations/20260819090000_add_token_usage_run_records/`, `src/token-usage/domain/`, `src/token-usage/projections/token-usage-run-*`, `src/token-usage/repositories/sql/token-usage-run-*`.
- Current write/read owners: `src/token-usage/services/token-usage-run-accumulator.ts`, `src/token-usage/providers/token-usage-run-store.ts`, current statistics/tree providers, and awaited event-pipeline persistence.
- Focused projection ownership: `src/token-usage/projections/token-usage-run-record-state.ts` owns record lifecycle/contribution, including the distinction between a zero-report placeholder and admitted cache observations; `token-usage-pricing-summary.ts` owns reusable pricing creation/merge, and `token-usage-run-aggregate.ts` owns checked public mapping.
- Migration-only historical boundary: both repaired 20260730 files, moved TeamRun V1 token repository, and `src/app-data-migrations/migrations/token-usage-run-records-v1/`. The latter owns released unknown-input normalization plus independently matching scalar validation; no current owner imports it.
- Readiness and activation: `src/token-usage/providers/token-usage-migration-readiness.ts`, `src/startup/token-usage-current-schema-readiness.ts`, `src/server-runtime.ts`, standalone/team/task activation services.
- Task delegation structure: `task-delegation-service.ts` retains command/lifecycle authority; `task-delegation-service-contract.ts` owns its host/activation contract and `task-delegation-record-resolver.ts` owns task-record/assignee lookup.
- UI/API: current GraphQL token statistics and `autobyteus-web/components/settings/TokenUsageStatistics.vue` plus localizations/tests.
- Removed runtime/event-ledger ownership: old persistence processor, ledger store/repository, run-summary adapter, provider-name row snapshot helper, and their obsolete lifecycle test.

## Important Assumptions

- Migration execution has one writer, stable normal SQLite behavior, sufficient permissions/resources, and the existing runner's ordinary retry semantics, as approved by `data-migration-conventions.md`.
- Quit, kill, shutdown, and power loss are one ordinary incomplete SQLite attempt; no cause-specific recovery machinery is required.
- The canonical run allocator remains the new-run uniqueness authority. Consolidation independently enforces zero legacy/current `run_id` intersection before mutation, so allocator correctness is not the only safety check.
- Legacy numeric IDs and public numeric conversions must satisfy explicit safe-integer boundaries. Durable token totals remain BigInt/SQLite integer values until an API boundary deliberately narrows them.
- No hostile tampering, arbitrary corruption, compromised/adversarial writers, or kernel/device/syscall recovery contract is in scope.

## Known Risks

- The representative ~154k-row/~774.5 MiB consolidation was not load-tested locally. The 30-minute SQLite transaction timeout, WAL/temp/disk use, and production-scale latency remain required downstream evidence areas.
- While consolidation is incomplete, historical token statistics and every pre-existing standalone/team/nested/delegated/task-team restoration are intentionally unavailable.
- A ninth or reappearing evicted cumulative series is baselined without charge to prevent overcount, so a bounded undercount and quality flag are an approved tradeoff.
- API number fields reject values outside JavaScript's safe-integer range instead of rounding. Consumers must handle that explicit error path.
- Source deletion makes SQLite pages reusable but does not shrink the physical database file; VACUUM and same-release physical legacy-table removal are intentionally out of scope.
- API/E2E round `API-REV-002` remains stopped. `APIE2E-F001`, the original six durable changes, and the local `APIE2E-F002` assertion now pass; the combined provider-semantics run advanced to a historical-unknown case that must be retargeted by its owner to migration/current-record output. All 13 API/E2E-owned durable changes were not edited during `IR-005`; they still require successful final execution and proportional test-code review after source re-pass.
- Full browser/CSS viewport inspection was unavailable. Component mounting exercised the changed states and interactions, but pixel/layout behavior in a real browser remains unverified.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: `Larger Requirement`, `Behavior Change`, `Refactor`, and persisted-data contraction.
- Reviewed root-cause classification: primary `Boundary Or Ownership Issue`; contributing `Missing Invariant`, `Shared Structure Looseness`, and `Legacy Or Compatibility Pressure`.
- Reviewed refactor decision: `Refactor Needed Now`; physical empty-source contract removal and physical file shrink are deferred.
- Implementation matched the reviewed assessment: `Yes`.
- If challenged, routed as `Design Impact`: `N/A`.
- Evidence / notes: the current cumulative subject, awaited write owner, current-only readers, migration-only legacy boundary, activation readiness, and startup classification changed together. No implementation finding invalidated the reviewed root-cause or lifecycle assessment.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`.
- Legacy old-behavior retained in scope: `No`.
- Dead/obsolete code, obsolete files, unused helpers/tests/flags/adapters, and dormant replaced paths removed in scope: `Yes`.
- Shared structures remain tight: `Yes`; the record, pricing summary, compact-state codec, summary codec, fold, aggregate, repository, and migration-source types have distinct owners.
- Canonical shared design guidance was reapplied during implementation: `Yes`; no file-level design impact required upstream rerouting.
- Changed source implementation files stayed within proactive size-pressure guardrails: `Yes`; all are under 500 effective non-empty lines. After normal import formatting and real extraction, `task-delegation-service.ts` is 486 effective lines; its contract and record-resolution helpers are 61 and 48. `token-usage-run-record-state.ts` is 182 and the shared pricing-summary owner is 96. After `IR-005`, the cohesive migration-only row mapper is 256, consolidation repository is 209, and legacy fold is 110 effective lines; the round adds far fewer than 220 changed lines to any source.
- Notes: `TokenUsageLedgerEvent` remains only as the dormant Prisma declaration needed for schema-before-data ordering and within registered migration code. Static review found no token legacy-table/row/overlap reference in current token, execution, team, GraphQL, activation, startup, or runtime code.

## Persisted Data Transition Check

- Approved decision: `Migration Required`.
- Design-spec decision reference: `Persisted Data / State Transition Decision`, `Degraded Forward-Only Capability Gate`, and `Migration Plan` in `design-spec.md` (`REQ-001`–`REQ-026`; `AC-001`–`AC-025`).
- Implementation follows the approved decision without an unapproved migration or version-specific runtime fallback: `Yes`.
- Migration implementation and focused checks:
  - Prisma expand adds one BigInt-backed current row keyed uniquely by `run_id`; the source declaration remains dormant/migration-only.
  - Both released source-shaping definitions use SQL-filtered keyset batches of at most 250, CAS updates, scalar counts, and at most 50 examples.
  - Consolidation performs scalar overlap preflight, bounded `(run_id,id)` reads, deterministic released-shape normalization and legacy `(observed_at,id)` folding, target insert/round-trip and independently normalized scalar aggregate validation, and source deletion inside one real SQLite transaction.
  - Durable direct-upgrade SQLite coverage passes for a pre-component row defaulted to unknown, a representative later non-local unknown row, and the released local exception. Temporary SQLite smokes also pass for current concurrent direct folds plus exact replay, successful disjoint consolidation, mandatory later-overlap rejection, injected rollback, target codec validation, and current-schema readiness.
- Deviation from the reviewed transition decision: `None`.

## Environment Or Dependency Notes

- No dependency manifest was changed. The API/E2E environment now contains real dependency directories; this implementation rework neither created nor modified their dependency manifests.
- Prisma format and client generation succeeded against the changed schema.
- `pnpm exec nuxt typecheck` could not reach project diagnostics because the installed `vue-tsc`/TypeScript toolchain fails resolving the package subpath `./lib/tsc`. This is recorded as an environment/dependency limitation, not a passing typecheck.

## Local Implementation Checks Run

- `pnpm exec prisma format` — passed; unrelated formatting was reverted.
- `pnpm exec prisma generate` — passed.
- `./node_modules/.bin/tsc -p tsconfig.build.json --noEmit --pretty false` — passed.
- Focused server Vitest run covering released unknown-input normalization/consolidation, first-admitted current/migration cache semantics, real persisted/public local cache state, mixed-currency owner/aggregate semantics, exact BigInt commit before public rejection, fold bounds/replay, both released repairs, app-migration execution policy, current persistence lifecycle, task-delegation invariants, schema/bootstrap classification, standalone/team restore gates, current Prisma lifecycle, moved TeamRun migration code, and canonical allocator collisions — 19 files / 94 tests passed.
- Released unknown-input migration regression — 2 files / 9 tests passed. Unit coverage confirms exact non-local normalization, the local-no-bill exception, first-cache semantics, and per-row/cross-row dimension bounds. A disposable SQLite direct-upgrade fixture inserts a 20260624 row before applying the 20260625 defaulting migration, adds representative later unknown/local rows, applies the remaining released/current schemas, runs real consolidation, validates normalized current records/public summary, and confirms atomic source cleanup.
- Cache-state defect regression — 3 focused files / 17 tests passed. The current and legacy folds exclude the zero-record sentinel, preserve a real admitted `unknown`, and cover representative precedence combinations. A real Prisma/SQLite accumulator test proves OLLAMA/local pricing persists and returns `unsupported_or_local` in the authoritative event payload and public `run_summary_after_event`. The API/E2E-owned GraphQL reproducer was not rerun here and remains owned by the returning API/E2E stage.
- Mixed-currency owner/aggregate regression — 2 tests passed: equal numeric USD/CNY prices produce mixed status and relevant mixed/null prices while unused components remain not-applicable; aggregate read canonicalizes a deliberately inconsistent stored mixed-currency summary. The API/E2E current-store reproducer was not rerun here and remains owned by the returning API/E2E stage.
- Real Prisma/SQLite SafeInt boundary regression — passed: an observation crossing `Number.MAX_SAFE_INTEGER` committed `9007199254740992n`, incremented revision/report count, and then rejected the public mapper with `TokenUsageSafeIntegerExceededError`; the transformer classified it as public-summary unavailable rather than persistence unavailable.
- Temporary real-SQLite current persistence smoke — passed: concurrent direct updates plus exact replay left one row at revision/report count 2 with exact totals.
- Temporary real-SQLite consolidation smoke — passed: disjoint import/cleanup, current-row preservation, mandatory overlap rejection before cleanup, injected rollback preserving source/no partial import, and target codec round-trip validation.
- Temporary migrated-SQLite current-schema readiness smoke — passed.
- `pnpm exec nuxt prepare` — passed.
- `pnpm test:nuxt components/settings/__tests__/TokenUsageStatistics.spec.ts --run` — 4 tests passed.
- `pnpm guard:localization-boundary` — passed.
- `pnpm audit:localization-literals` — passed with the repository's module-type warning.
- `pnpm exec nuxt typecheck` — blocked before project diagnostics by the installed `vue-tsc`/TypeScript package export incompatibility described above.
- Static dependency/query checks — passed for current-runtime exclusion of token legacy types/tables/overlap machinery and for bounded repaired/consolidation query shapes; `git diff --check` passed.

## Frontend Rendered-Result Check

- Affected surfaces / journeys: Settings > Token Statistics date range, task/model table selection, empty state, and typed migration-degraded alert.
- Approved references: `BEH-003`, `BEH-006`, `REQ-011`, `REQ-019`, `AC-010`, `AC-019`, and `AC-024`.
- Existing design system / adjacent surfaces reviewed: existing settings controls, table styles, empty-state treatment, and shared alert semantics in `TokenUsageStatistics.vue`.
- Development / rendered surface used: Nuxt preparation plus Vue Test Utils component mounting through the repository's `test:nuxt` configuration.
- States and interactions inspected: default task table, model selector switch, empty result, date controls, and the migration-required role-alert copy.
- Issues found and corrected: date copy was changed from observed-period semantics to run-created/lifetime-total semantics; migration errors now render an explicit amber alert instead of being indistinguishable from an empty table.
- Remaining limitation: no full browser/Electron CSS viewport was available, so visual spacing/responsiveness beyond mounted component structure is not claimed.

## Downstream Coverage Hints / Suggested Scenarios

- After source re-pass, retarget the historical-unknown API/E2E case to seed the released schema and assert migrated current-record/GraphQL output instead of submitting an old persisted shape through the current observation store. Then rerun provider semantics, finish the other two stale GraphQL assertions and source-shaping coverage maintenance, complete the stopped `API-REV-002` scale/lifecycle/API/live/browser plan, and review all 13 API/E2E-owned durable changes proportionately.
- Exercise `AC-022` as a system lifecycle: failed consolidation, healthy app, old-run restore rejected before provider creation, globally new current run recorded, disjoint retry imports old exactly once, and injected overlap rejects before cleanup.
- Exercise standalone, direct team, nested team, delegated agent, and task-team restore gates through their real entry points.
- Load-test a released-scale legacy fixture under the actual SQLite transaction timeout and record WAL/temp/disk/latency evidence.
- Extend the focused SQLite/Prisma SafeInt regression through actual GraphQL and live-client boundaries, confirming explicit rejection/quality semantics without rounding or lost persistence.
- Test ninth-series eviction/reappearance and all encoded checkpoint/digest byte limits through durable repository paths.
- Verify degraded/fatal GraphQL/UI error typing in a real rendered client and confirm unrelated settings/new-run functionality remains healthy.
- Confirm deleted source pages enter SQLite freelist after successful validation without requiring startup VACUUM.

## API / E2E / Executable Coverage Investigation And Execution Still Required

Source implementation is ready for code review. API/E2E coverage investigation, durable coverage maintenance, released-scale execution, and independent system evidence remain owned by `/api_e2e_engineer` after code review passes.
