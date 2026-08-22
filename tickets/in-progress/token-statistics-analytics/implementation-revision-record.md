# Implementation Revision Record

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture reviewer / `design-review-report.md` / initial implementation | N/A | `Initial Baseline` | `SR-001`, `ARCH-REV-001` | Reviewed analytics design implemented and locally validated; ready for code review. |
| IR-002 | Code reviewer / `code-review-report.md` / round 1 | F-001, F-002, F-003 | `Local Fix` | `SR-001`, `ARCH-REV-001`, `CRR-001` | Preserved mixed-run identity, elapsed pace alignment, and exact chart/table/CSV evidence corrected; ready for code-review round 2. |
| IR-003 | Code reviewer / `code-review-report.md` / round 2 | F-003 | `Local Fix` | `SR-001`, `ARCH-REV-001`, `CRR-002` | Cumulative pace quality now follows canonical COMPLETE + LOCAL precedence; ready for code-review round 3. |

## Revision Entries

### IR-001 — Initial token usage analytics implementation baseline

- Triggering role, report path, and round: Architecture reviewer; `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-analytics/tickets/in-progress/token-statistics-analytics/design-review-report.md`; initial implementation
- Triggering finding IDs: `N/A`
- Classification: `Initial Baseline`
- Prior authoritative result: `N/A`
- Current authoritative result: persisted daily analytics projection, server GraphQL analytics result, separate Analytics/Run details frontend, exact CSV, clean removal, local checks, and rendered frontend evidence are complete and ready for code review.
- Related solution revision IDs: `SR-001`
- Related architecture-review revision IDs: `ARCH-REV-001`
- Related code-review revision IDs: `N/A`
- Related API/E2E revision IDs: `N/A`
- Related delivery revision IDs: `N/A`
- Why this baseline or implementation revision is recorded: establishes the first complete implementation handoff against the passing reviewed design.
- Approved behavior or requirement IDs affected: `BEH-001`–`BEH-006`; `REQ-001`–`REQ-025`; `AC-001`–`AC-035`
- Implementation delta: added additive projection schema/coverage, canonical facet projection and atomic write, shared accounting aggregation, analytics range/read/API, generated client operation, Analytics components/store/CSV/localization; split preserved Run details; removed the superseded common/embedded chart.
- Changed files or areas: `autobyteus-server-ts/prisma`, backend token-usage domain/projections/repositories/services/provider/GraphQL/startup, and `autobyteus-web` token-usage settings/query/store/types/components/localization/generated GraphQL/CSV.
- Local validation and result: backend and frontend production builds passed; targeted backend 15/15 and frontend 11/11 unit checks passed; boundary/localization guards passed; migrated SQLite/provider narrow check reconciled; desktop/narrow browser rendering and interactions passed without page/console errors after the formatter fix.
- Next recipient or routing: `/code_reviewer`
- Remaining limitations or risks: independent API/E2E coverage investigation remains required, especially cross-run SQLite contention, SafeInt extremes, digest/cardinality cases, and full state/render matrix.

### IR-002 — Restore preserved run semantics and exact analytics evidence

- Triggering role, report path, and round: Code reviewer; `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-analytics/tickets/in-progress/token-statistics-analytics/code-review-report.md`; code-review round 1
- Triggering finding IDs: `F-001`, `F-002`, `F-003`
- Classification: `Local Fix`
- Prior authoritative result: `IR-001` at commit `f5be85b04`; code review `CRR-001` failed with bounded source defects.
- Current authoritative result: run-specific mixed identity summaries are preserved; pace is plotted by elapsed UTC days with exact point evidence; trend/breakdown tooltips and tables expose quality/captured status/currency/share; local cost has no invented currency; CSV status columns are unambiguous.
- Related solution revision IDs: `SR-001`
- Related architecture-review revision IDs: `ARCH-REV-001`
- Related code-review revision IDs: `CRR-001`
- Related API/E2E revision IDs: `N/A`
- Related delivery revision IDs: `N/A`
- Why this baseline or implementation revision is recorded: records the bounded local-fix delta requested by code-review round 1 without changing the approved design.
- Approved behavior or requirement IDs affected: `BEH-001`, `BEH-002`, `BEH-004`, `BEH-005`; `REQ-008`, `REQ-010`, `REQ-012`, `REQ-019`, `REQ-022`–`REQ-025`; `AC-006`, `AC-011`–`AC-012`, `AC-024`, `AC-027`–`AC-031`, `AC-034`
- Implementation delta: the run aggregate overlays its established distinct-value summary on the shared numeric/cost result; pace series use `{x: elapsedDays, y: cumulative}` points and exact current/prior tables; trend/breakdown evidence is complete; breakdown share is metric/comparability aware; local formatting is currency-safe; CSV exports captured and derived statuses separately.
- Changed files or areas: backend run aggregate and focused fold regression; frontend pace/trend/breakdown/exact-table components, analytics presentation utility, CSV serializer, localization, and focused component/serializer fixtures/tests.
- Local validation and result: backend/frontend production builds passed; backend focused tests 18/18; frontend focused tests 16/16; guards/audit passed; elapsed 8-vs-7 bucket endpoints both reconcile to day 213; shorter prior month remains day 28 versus current day 31; development renderer/CSV checks passed without console/page errors.
- Next recipient or routing: `/code_reviewer` for round 2
- Remaining limitations or risks: independent downstream API/E2E coverage remains required after code review, including contention, SafeInt extremes, digest/cardinality, and the full state/render matrix.

### IR-003 — Align cumulative pace quality with canonical local/no-bill policy

- Triggering role, report path, and round: Code reviewer; `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-analytics/tickets/in-progress/token-statistics-analytics/code-review-report.md`; code-review round 2
- Triggering finding IDs: `F-003`
- Classification: `Local Fix`
- Prior authoritative result: `IR-002` at commit `ea55b27bd`; code review `CRR-002` verified F-001/F-002 and narrowed F-003 to cumulative quality merging.
- Current authoritative result: cumulative pace quality applies the canonical provider precedence, so completely priced remote usage plus explicitly local/no-bill usage remains `COMPLETE` and matches `selectedCostQuality` at the endpoint.
- Related solution revision IDs: `SR-001`
- Related architecture-review revision IDs: `ARCH-REV-001`
- Related code-review revision IDs: `CRR-002`
- Related API/E2E revision IDs: `N/A`
- Related delivery revision IDs: `N/A`
- Why this baseline or implementation revision is recorded: records the final bounded F-003 policy correction requested by code-review round 2 without changing the approved server contract or design.
- Approved behavior or requirement IDs affected: `BEH-002`, `BEH-004`; `REQ-012`, `REQ-022`–`REQ-023`; `AC-027`–`AC-029`, `AC-034`
- Implementation delta: extracted one reusable cumulative merge for server-derived bucket qualities with provider-equivalent precedence; `LOCAL` is non-missing unless all contributions are local, while missing/partial and mixed-currency cases retain their established precedence. Pace points now consume that merged result for quality, currency, and missing dimensions.
- Changed files or areas: `autobyteus-web/utils/tokenUsageAnalyticsPresentation.ts`; focused pace component regression in `components/settings/token-usage/analytics/__tests__/TokenUsagePaceChart.spec.ts`; implementation handoff/revision artifacts.
- Local validation and result: frontend production build passed; the full targeted frontend set passed 8 files / 17 tests; the focused rework subset passed 3 files / 6 tests. The added mounted regression proves separate COMPLETE/USD/estimated and LOCAL/null/local-no-bill buckets end as COMPLETE/USD, matching `selectedCostQuality`, while captured status remains `mixed` in exact evidence.
- Next recipient or routing: `/code_reviewer` for round 3
- Remaining limitations or risks: independent downstream API/E2E coverage remains required after code review, including contention, SafeInt extremes, digest/cardinality, cost-quality combinations, and the full state/render matrix.
