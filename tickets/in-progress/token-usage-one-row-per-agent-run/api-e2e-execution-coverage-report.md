# API/E2E Execution Coverage Report

## Execution Round Meta

- API/E2E Revision: `API-REV-003`
- Trigger: `IR-005` / `CRR-007` Pass, resuming after `API-REV-002` and `APIE2E-F002`.
- Upstream revisions: `SR-006`; `ARCH-REV-006`; `IR-005`; `CRR-007`.
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run`
- Ticket: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run`
- Execution date / host: 2026-08-19; macOS 26.5.2 arm64; Europe/Berlin.
- Result: `Pass`.
- Final validation confidence: `97.1%`.
- Broader validation: `Required` and completed through released-scale real SQLite plus actual-server Chrome.
- Durable coverage changed by API/E2E: `Yes`; 17 paths; no file removed.
- Required next gate: `/code_reviewer` proportional test-code review before delivery.

## Investigation And Execution Basis

Execution followed the round-3 plan written first in:
`/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/api-e2e-coverage-investigation.md`.

The approved proof target is the strict current one-row model plus deterministic released-data transition: current folds and APIs never inspect the legacy event table; migration-only code source-shapes and consolidates released rows; incomplete consolidation gates history/restores but not new runs; invalid current schema is fatal; unsafe public integers reject without losing exact persistence; settings uses created-in-range/lifetime totals.

The exact prior failure was rechecked before expansion. The corrected local first-observation state passed. The later failing historical-unknown case was a stale test setup because it injected through current normalization; it was retargeted to actual released-row consolidation and current output. Two GraphQL assertions already classified as event-model remnants were corrected without changing production source.

## Compatibility / Legacy Scope Check

- Approved persisted-data outcome: `Migration Required`.
- Current runtime compatibility policy: forward-only; no dual reader/writer, event summary reconstruction, legacy fallback, protocol marker, checkpoint seed, or runtime overlap guard.
- Legacy knowledge observed: retained under registered app-data migration boundaries and migration fixtures only.
- Static scan: no reference to removed ledger store/repository/summary adapter/persistence processor outside migration isolation.
- Actual runtime evidence: current GraphQL/store work after consolidation; degraded readiness consults migration status; fatal schema path emits versioned platform-fatal evidence; no path reactivates legacy runtime behavior.
- Source cleanup: zero supported legacy rows after successful validation; SQLite freelist grows; no startup `VACUUM` or same-release physical table drop required.

## Changed Boundary And Evidence Matrix

| Requirement / AC Group | Direct Evidence | Outcome |
| --- | --- | --- |
| REQ-001–REQ-005 / AC-001–AC-005: one row, direct/cumulative fold, concurrency, replay/regression, bounded state | Fold/accumulator/store/repository suites; pipeline drain; ninth-series eviction/reappearance/later advance; 8-series/64-digest and byte caps | Pass |
| REQ-006–REQ-010 / AC-006–AC-010: cumulative facts, exact run/team/member, costs/mixed/unit prices, live message, date/lifetime UI | Current GraphQL suites, statistics/display integration, pricing unit tests, GPT-5.6 live `TOKEN_USAGE_UPDATED`, Chrome normal table/copy | Pass |
| REQ-012–REQ-016, REQ-022 / AC-011–AC-015, AC-021: repaired source shaping | Real adapter/runner startup E2Es, failure/atomic-batch retry/sibling continuation, capped detail tests, scale fixture with 154,100 rows but only 144 SQL-filtered candidates | Pass |
| REQ-017–REQ-021 / AC-016–AC-020: consolidation, atomic validation/delete, rollback, reusable pages | Migration unit with injected cleanup failure and retry; built-server upgrade/relaunch; 154,100-row probe; source 0/current 1,269/integrity ok/freelist 215,037 | Pass |
| REQ-023–REQ-026 / AC-022–AC-025: forward-only degraded/fatal gate | Actual server failed consolidation -> healthy -> old restore reject -> new run -> retry import; injected overlap; standalone plus root/nested/delegated/task-team restore service tests; fatal current schema Chrome target; static scan | Pass |
| Public SafeInt / post-commit quality | Real Prisma stores 9007199254740992n and revision/report 2; GraphQL returns null and `TOKEN_USAGE_SAFE_INTEGER_EXCEEDED:accounting_input_tokens`; lifecycle reports public-summary unavailable, not persistence unavailable | Pass |

## Additional Repository Coverage Execution

All commands ran from the assigned worktree with repository-locked dependencies and isolated test data.

| ID | Command / Surface | Result | Evidence |
| --- | --- | --- | --- |
| REP-001 | Focused provider-semantics F002 rerun against reset/migrated Prisma/SQLite + GraphQL | Required local case passed; stale historical setup isolated | `test-results/api-e2e/logs/14-api-e2e-f002-round3-recheck.log` |
| REP-002 | Focused corrected general/provider GraphQL | 2 files / 6 tests passed | `logs/15-round3-graphql-current-migration.log` |
| REP-003 | All 13 originally API/E2E-owned paths | 12 executable files / 43 tests passed | `logs/16-all-13-api-e2e-owned-durable-paths.log` |
| REP-004 | Two source-shaping startup E2Es | 2 files / 4 tests passed | `logs/17-source-shaping-startup-current-coverage.log` |
| REP-005 | `pnpm -C autobyteus-server-ts build` | Pass: shared builds, Prisma generation, TypeScript build, built-in agent bootstrap smoke | `logs/18-server-build.log` |
| REP-006 | Production built-server released upgrade/relaunch | 2 selected tests passed | `logs/19-production-upgrade-built-server.log` |
| REP-007 | Built-server failed consolidation/new run/retry and overlap | 2 selected tests passed | `logs/20-built-server-consolidation-lifecycle.log` |
| REP-008 | Migration rollback/freelist/empty relaunch | 1 file / 3 tests passed | `logs/21-rollback-freelist-relaunch.log` |
| REP-009 | Unsafe SafeInt GraphQL/persistence | 1 selected test passed; 2 unrelated cases skipped by filter | `logs/22-unsafe-safeint-graphql-persistence.log` |
| REP-010 | Final `pnpm test --run --maxWorkers=1` across 28 selected lifecycle/API files | 27 files / 125 tests passed; external-runtime file / 3 opt-in tests skipped | `logs/28-final-broad-server-lifecycle-api-suite.log` |
| REP-011 | Server `tsc -p tsconfig.build.json --noEmit`, `git diff --check`, removed-runtime-boundary scan | Pass | `logs/29-server-ts-diff-legacy-boundary.log` |
| REP-012 | Nuxt component and boundary/localization checks | 1 file / 4 tests; all three guards/audits passed | `logs/25-web-component-and-guards.log` |
| REP-013 | `pnpm build` in `autobyteus-web` | Nuxt client/server/prerender production build passed | `logs/27-nuxt-production-build.log` |
| REP-014 | `pnpm exec nuxi typecheck` | Blocked before project checking by known `vue-tsc`/TypeScript `ERR_PACKAGE_PATH_NOT_EXPORTED`; not a product failure | `logs/26-nuxt-typecheck-known-toolchain-block.log` |

### Final Broad Suite Details

The 125 passing cases include actual built-server startup/relaunch, current GraphQL, store/repository, source shaping, runner/status, current-schema readiness, standalone restore gate, root/nested/delegated/task-team restore gate, exact migration fold, unsafe public projection lifecycle, pricing, ninth-series and byte caps. The only three skipped cases are explicitly gated by `RUN_RUNTIME_TOKEN_USAGE_E2E=1` and require external LM Studio/Codex/Claude runtimes; no provider implementation changed.

## Validation Confidence Scorecard

| Confidence Category | Post-Repository | Final | Evidence Gained By Broader Validation | Residual Uncertainty |
| --- | ---: | ---: | --- | --- |
| Requirement and acceptance-criteria proof | 95% | 97% | Released scale, source filtering, actual renderer classifications | External provider services were not re-run because unchanged |
| Changed-boundary execution directness | 97% | 98% | Actual built server and released-row migration at scale | Synthetic rather than copied field rows |
| Cross-boundary integration realism and mock gap | 94% | 97% | Nuxt proxy + actual server + Chrome normal/degraded/fatal | Electron shell is unchanged and out of scope |
| Environment/configuration/fixture fidelity | 94% | 97% | Exact migration SQL, 840 MiB SQLite, owned data/ports, Chrome 151 | Synthetic distribution only |
| Failure, edge, lifecycle, recovery | 96% | 98% | Scale resources, fatal protocol, renderer error states | Deliberately excludes power/kernel/adversarial fault taxonomy |
| User-surface/browser/desktop-shell | 88% | 97% | Semantic Chrome checks, compact screenshots, production build | Browser is not claimed as shell proof |
| Durable regression quality/relevance | 96% | 96% | Final 125-test pass and focused reruns | Proportional test-code review pending |

- Overall post-repository confidence: `94.3%`.
- Overall final confidence: `97.1%`.
- Calculation: simple average of seven applicable categories.
- Every critical acceptance criterion directly proven: `Yes`.
- Applicable category below 90%: `No`.
- Default 95% target met: `Yes`.

## Broader Validation Decision And Execution

- Decision: `Required`.
- Modes: released-scale real SQLite probe; actual built server; Nuxt dev proxy; local installed Chrome headless; semantic DOM assertions and screenshots; Nuxt production build.
- Scale target: 154,100 wide released rows, 1,269 run IDs, 880,848,896 seeded DB bytes, WAL journal, temp store file, 30-minute consolidation timeout expectation.
- Source-shaping result: only 144 AutoByteus custom candidates were transferred from ~154k rows; 141 model values migrated, three malformed/conflicting/missing cases produced bounded warnings; provider name migrated 142 and capped two warnings.
- Consolidation result: 11.287 seconds; peak WAL 12,112,832 bytes; peak temp 0; peak RSS 192,937,984 bytes; free-disk delta during consolidation 29,089,792 bytes; final source 0/current 1,269; totals each 154,100; integrity `ok`; freelist 215,037 pages; no forced physical shrink.
- Browser result: Chrome `151.0.7922.138`; normal row/model values 42 input and 8 output with lifetime copy; degraded exact migration guidance and navigation; fatal server exit 1 with `autobyteus.embedded-server.platform-fatal.v1` / `TOKEN_USAGE_CURRENT_SCHEMA_INVALID`, browser `Failed to fetch`, navigation intact.
- Result: `Pass`.

## Desktop Application Validation

- Strategy: browser-preferred validation for the web-equivalent Nuxt renderer.
- Normal screenshot: `test-results/api-e2e/screenshots/normal-token-statistics-chrome.png` — readable 1440x1000 model table, lifetime range copy, 42/8 totals, truthful missing-price cells/chart note.
- Degraded screenshot: `test-results/api-e2e/screenshots/degraded-token-statistics-chrome.png` — readable 820x900 actionable migration warning, controls and navigation remain usable.
- Fatal screenshot: `test-results/api-e2e/screenshots/fatal-server-unavailable-token-statistics-chrome.png` — readable nonempty error with settings navigation still available; correlated server evidence supplies the specific fatal code.
- Electron: not launched. No shell-specific code changed; this report does not claim Chrome proves IPC/preload/native behavior.

## Platform / Runtime Targets

- Host: macOS 26.5.2 (Build 25F84), arm64.
- Node: 22.23.1; pnpm: 10.28.2; Vitest: 4.0.18.
- Database: repository Prisma 5.22 SQLite and Node SQLite probes; exact released migration SQL.
- Browser: installed Google Chrome 151.0.7922.138 through `playwright-core`.
- Frontend: Nuxt 3.21.1, Vite 7.3.1, Vue 3.5.28.
- Auth/secrets/external providers: not required; no production credentials used.

## Lifecycle / Upgrade / Restart / Persisted-Data Checks

| Journey | Observed Result |
| --- | --- |
| Supported released upgrade and relaunch | Both source-shaping records plus consolidation recorded once; source empty; current totals exact; relaunch immutable |
| Consolidation failure | Built server remains healthy/degraded; history GraphQL unavailable with migration status; no partial history shown |
| Restore gates | Standalone and root/nested/delegated/task-team pre-existing restores reject before provider construction |
| New run during degraded state | Actual AgentRun API admits a newly allocated run and current store persists it |
| Normal retry | Corrected legacy row imports exactly once; new current run stays unchanged; old restore becomes available |
| Injected overlap | Retry fails with `TOKEN_USAGE_RUN_ID_INTERSECTION` before cleanup; legacy and current stores remain intact |
| Injected cleanup failure | Real Prisma transaction rolls back attempted current writes and source deletion; ordinary retry succeeds |
| Empty-source relaunch | Scans/migrates zero and leaves current rows unchanged |
| Fatal current schema | Built server exits 1 with bounded versioned platform-fatal current-schema evidence; no legacy fallback |
| Reusable pages | Legacy row deletion raises SQLite freelist; physical DB may stay same/grow and no `VACUUM` runs |

## Tests Implemented Or Updated

API/E2E added or updated 17 repository-resident paths:

1. `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/autobyteus-server-ts/tests/helpers/token-usage-run-record-fixtures.ts`
2. `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/autobyteus-server-ts/tests/unit/token-usage/projections/token-usage-snapshot-delta-normalizer.test.ts`
3. `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/autobyteus-server-ts/tests/unit/token-usage/projections/token-usage-unit-price-summary.test.ts`
4. `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/autobyteus-server-ts/tests/integration/token-usage/providers/default-agent-run-event-pipeline-lifecycle.integration.test.ts`
5. `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/autobyteus-server-ts/tests/integration/token-usage/repositories/token-usage-record-repository.integration.test.ts`
6. `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/autobyteus-server-ts/tests/integration/token-usage/providers/token-usage-store.integration.test.ts`
7. `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/autobyteus-server-ts/tests/integration/token-usage/providers/statistics-provider.integration.test.ts`
8. `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/autobyteus-server-ts/tests/integration/token-usage/providers/token-usage-display-field-capturer.integration.test.ts`
9. `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/autobyteus-server-ts/tests/unit/agent-execution/events/token-usage-event-enrichment-transformer.test.ts`
10. `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/autobyteus-server-ts/tests/e2e/token-usage/gpt56-token-usage-accounting-graphql.e2e.test.ts`
11. `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/autobyteus-server-ts/tests/e2e/token-usage/token-usage-ledger-graphql.e2e.test.ts`
12. `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/autobyteus-server-ts/tests/e2e/token-usage/token-usage-ledger-provider-semantics.e2e.test.ts`
13. `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/autobyteus-server-ts/tests/e2e/token-usage/token-usage-unit-prices-graphql.e2e.test.ts`
14. `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/autobyteus-server-ts/tests/e2e/token-usage/token-usage-custom-provider-model-value-backfill-startup.e2e.test.ts`
15. `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/autobyteus-server-ts/tests/e2e/token-usage/token-usage-provider-name-snapshot-backfill-startup.e2e.test.ts`
16. `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/autobyteus-server-ts/tests/e2e/app-data-migrations/team-run-v1-production-upgrade.e2e.test.ts`
17. `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/autobyteus-server-ts/tests/unit/app-data-migrations/token-usage-run-records-v1-app-data-migration.test.ts`

## Tests Removed As Stale Or Obsolete

- Test files removed: `None`.
- Removed within retained tests: imports and assertions tied to deleted append/list/aggregate ledger APIs, event-bucket reconstruction, old source-shaping whole-ledger helpers, and obsolete global-fatal behavior.
- Replacement: current record/fold/repository/GraphQL owners and capability-scoped startup/lifecycle evidence listed above.

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage changed: `Yes`.
- Added/updated paths: 17, listed above.
- Removed paths: `None`.
- Successful post-API test-code review: `Pending`.
- Routing consequence: delivery is not eligible until `/code_reviewer` completes proportional review.

## Other Execution Artifacts

All paths below are under:
`/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/test-results/api-e2e/`.

| Artifact | Purpose |
| --- | --- |
| `logs/14-api-e2e-f002-round3-recheck.log` | Exact prior failure recheck and stale historical setup diagnostic |
| `logs/15-round3-graphql-current-migration.log` | Corrected GraphQL/current migration proof |
| `logs/16-all-13-api-e2e-owned-durable-paths.log` | Original owned coverage pass |
| `logs/17-source-shaping-startup-current-coverage.log` | Source-shaping startup pass |
| `logs/18-server-build.log` | Full server build |
| `logs/19-production-upgrade-built-server.log` | Actual upgrade/relaunch |
| `logs/20-built-server-consolidation-lifecycle.log` | Degraded/new-run/retry/overlap lifecycle |
| `logs/21-rollback-freelist-relaunch.log` | Rollback/freelist/empty relaunch |
| `logs/22-unsafe-safeint-graphql-persistence.log` | Exact unsafe persistence + public rejection |
| `logs/23-released-scale-154k-774mib.log`; `scale-probe-result.json` | Released-scale measurements and validation |
| `logs/24-chrome-normal-degraded-fatal.log`; `browser-probe-result.json`; `screenshots/*.png` | Actual Chrome evidence |
| `logs/25-web-component-and-guards.log` | Nuxt component and boundary/localization checks |
| `logs/26-nuxt-typecheck-known-toolchain-block.log` | Exact independent toolchain blocker |
| `logs/27-nuxt-production-build.log` | Production frontend build |
| `logs/28-final-broad-server-lifecycle-api-suite.log` | Final 125-test broad pass |
| `logs/29-server-ts-diff-legacy-boundary.log` | TypeScript, diff, forward-only static pass |
| `logs/30-probe-syntax-and-cleanup-audit.log` | Probe syntax/resource cleanup audit |

## Temporary Execution Methods / Scaffolding

- `test-results/api-e2e/probes/released-scale-token-consolidation.mjs`: temporary because a 154,100-row/840 MiB database is unsuitable for routine CI. It applies exact released SQL, measures resources, validates totals/integrity/freelist, and removes its temp root.
- `test-results/api-e2e/probes/token-usage-chrome-browser.mjs`: temporary correlated normal/degraded/fatal journey using the repository live-E2E bootstrap, local Nuxt, Playwright Core, and installed Chrome. It reserves ports and deletes its runtime/DB targets.
- Both probes are retained as reproducible ticket evidence and pass `node --check`.

## Dependencies Mocked Or Emulated

- No database, GraphQL schema, built server, Nuxt renderer, or browser boundary was mocked for decisive evidence.
- Deterministic provider price/name readers are used only where the fact being tested is the migration/fold behavior; no paid provider call is required.
- Failure injection uses a delegating real Prisma adapter or deliberate released fixture state; atomicity is supplied by real SQLite transactions.
- External LM Studio/Codex/Claude runtime calls are not emulated and their opt-in E2E remains skipped.

## Result Summary

| Result | Scenario IDs | Summary |
| --- | --- | --- |
| Pass | `APIE2E-F001`, `APIE2E-F002`, current fold/API/UI/lifecycle/scale scenarios | Both prior defects resolved; corrected stale tests pass; all critical requirements have direct evidence |
| Fail | None | No implementation, API, E2E, browser, scale, or cleanup failure remains |
| Blocked check | Nuxt typecheck only | Known `vue-tsc`/TypeScript package export incompatibility; production build and product evidence pass |
| Not selected | External provider runtime and Electron shell | Unchanged boundaries; not claimed as executed |

## Cleanup Performed

| Resource | Cleanup | Result |
| --- | --- | --- |
| Scale SQLite/temp root | Recursive removal in probe `finally` | Complete |
| Browser normal/degraded/fatal DBs and runtime roots | Repository owned-runtime remover | Complete |
| Built server and Nuxt children | Graceful stop with kill timeout fallback | Complete |
| Chrome context/process | Browser close | Complete |
| Ports | Child termination releases unique reserved loopback ports | Complete |
| Vitest DB/temp roots | Test harness teardown | Complete |
| Production profile/DB/Electron | Never touched | Safe |
| Ticket logs/results/screenshots/probes | Retained | Intentional evidence, 720 KiB at final cleanup audit |

Final process and filesystem audit found no owned probe/server process and no `token-browser-*` or released-scale DB/runtime residue.

## Preliminary Classification

- Classification: `Pass`.
- Prior failure resolution: `APIE2E-F002` is resolved by reviewed source and direct rerun. The later historical-unknown failure was stale coverage and is replaced by the actual released migration case.
- Open critical finding: `None`.
- Known non-product issue: Nuxt typecheck toolchain package-export incompatibility, separately evidenced and not hidden.

## Recommended Recipient

`/code_reviewer` for the mandatory proportional review of the 17 API/E2E-owned durable coverage changes. Do not advance directly to delivery.

## Latest Authoritative Result

- Result: `Pass`.
- Final validation confidence: `97.1%`.
- Default clean target met: `Yes`.
- Applicable categories below 90%: `None`.
- Critical acceptance criteria unproven: `None`.
- Durable coverage changed: `Yes`; proportional review pending.
- Required next recipient: `/code_reviewer`.
