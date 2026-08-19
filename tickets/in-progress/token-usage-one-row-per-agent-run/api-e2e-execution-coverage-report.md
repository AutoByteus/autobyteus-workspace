# API/E2E Execution Coverage Report

## Execution Round Meta

- API/E2E Revision: `API-REV-005`
- Trigger: `DR-004` production-shaped failure followed by reviewed `SR-007` / `ARCH-REV-007` / `IR-007` / `CRR-011`, reachable `MP-004`, and deterministic migration-only transport `DS-009`.
- Upstream revisions: `SR-007`; `ARCH-REV-007`; `IR-007`; `CRR-011`; prior `API-REV-004`; delivery rework `DR-004`.
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run`
- Ticket: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run`
- Execution date / host: 2026-08-19; macOS 26.5.2 arm64; Europe/Berlin.
- Result: `Pass`.
- Final validation confidence: `97.4%`.
- Broader validation: `Required` and completed through a refreshed 154,100-row released-scale probe; browser repetition was not required and Electron rebuild/user verification remains delivery-owned.
- Durable coverage changed in the candidate this round: `Yes`; two IR-007 test files were added upstream. API/E2E did not edit, add, or remove another durable path.
- Required next gate: `/code_reviewer` proportional test-code review before delivery.

## Investigation And Execution Basis

Execution followed the round-5 DS-009 investigation written before any API-REV-005 execution or API/E2E-owned durable editing in:
`/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run/api-e2e-coverage-investigation.md`.

The focused proof target was AC-026 and the affected transition lifecycle: the actual Prisma/SQLite query must preserve four leading `NULL` values followed by exact `integer:28826658` and `integer:28987545`, strict invalid source must rollback and retry without cleanup, and the built server must continue to classify a failed consolidation as capability-scoped while gating history/old restore and admitting only new current runs. Because DS-009 changes SQL work for every released row, the released-scale probe also required refresh.

The DR-004 live verification failure is the trigger, not acceptance evidence. Automated execution used only disposable fixtures and never opened or mutated the user's live database. Two new durable IR-007 tests already covered the reviewed gap, so API/E2E planned no further durable edit unless execution exposed another deficiency; none did.

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

## Prior API-REV-003 Repository Coverage Baseline

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

## Prior API-REV-003 Validation Confidence Scorecard

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

## Prior API-REV-003 Broader Validation Decision And Execution

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

## Prior API-REV-003 Tests Implemented Or Updated

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

## Prior API-REV-003 Durable Coverage Changed In The Codebase

- Repository-resident durable coverage changed: `Yes`.
- Added/updated paths: 17, listed above.
- Removed paths: `None`.
- Successful post-API test-code review: `CRR-008` Pass.
- Routing consequence at that revision: satisfied before the latest-base integration triggered this focused round.

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

## Prior API-REV-003 Result Summary

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

## Prior API-REV-003 Preliminary Classification

- Classification: `Pass`.
- Prior failure resolution: `APIE2E-F002` is resolved by reviewed source and direct rerun. The later historical-unknown failure was stale coverage and is replaced by the actual released migration case.
- Open critical finding: `None`.
- Known non-product issue: Nuxt typecheck toolchain package-export incompatibility, separately evidenced and not hidden.

## Prior API-REV-003 Recommended Recipient

`/code_reviewer` for the mandatory proportional review of the 17 API/E2E-owned durable coverage changes. This gate completed as `CRR-008` Pass before IR-006.

## Prior API-REV-003 Authoritative Result

- Result: `Pass`.
- Final validation confidence: `97.1%`.
- Default clean target met: `Yes`.
- Applicable categories below 90%: `None`.
- Critical acceptance criteria unproven: `None`.
- Durable coverage changed: `Yes`; proportional review completed in `CRR-008`.
- Required next recipient at that revision: `/code_reviewer` (completed).

## API-REV-004 Focused Integrated Revalidation

### Execution Matrix

All commands ran from `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/autobyteus-server-ts` with repository-locked dependencies, normal Prisma reset/migration setup, and isolated test-owned data.

| ID | Command / execution surface | Result | Evidence |
| --- | --- | --- | --- |
| IR006-001 | `pnpm -C autobyteus-server-ts build` | Pass: shared packages, Prisma generation, server TypeScript build, assets, and bootstrap smoke | `test-results/api-e2e/logs/31-ir006-integrated-server-build.log` |
| IR006-002 | `pnpm test --run --maxWorkers=1 tests/e2e/app-data-migrations/team-run-v1-production-upgrade.e2e.test.ts -t 'keeps the server healthy after failed consolidation, admits a new current run, and imports disjoint legacy rows on restart retry'` | Pass: 1 selected actual built-server test; 3 filtered cases skipped | `logs/32-ir006-built-server-restore-retry.log` |
| IR006-003 | Temporary exact inactive-delete GraphQL probe plus TeamRun unit/integration coverage | Final pass: 4 files / 23 tests | `logs/34-ir006-managed-offline-graphql-delete-pass.log` |
| IR006-004 | Focused durable delegated-task admission/settlement file | Pass: 1 file / 9 tests | `logs/35-ir006-task-admission-settlement.log` |
| IR006-005 | Final integrated manager/service/task/archive GraphQL selection | Pass: 7 files / 37 tests | `logs/36-ir006-final-integrated-focused-suite.log` |
| IR006-006 | `pnpm exec tsc -p tsconfig.build.json --noEmit --pretty false`; `git diff --check`; base ancestry/divergence; temp-probe/data/process cleanup checks | Pass; HEAD `cbbedd6ea0e6d466a3e3741c7216f03887b0182e`; latest base ancestor; `0 behind / 2 ahead` | `logs/37-ir006-ts-diff-cleanup.log` |

### Requirement-Linked Outcomes

1. **Actual built-server recovery lifecycle — Pass.** A deliberately invalid released source caused consolidation failure without taking down the server. The unmanaged historical TeamRun restore was rejected before provider construction, a newly allocated current run was admitted and persisted, the corrected source was imported on restart retry, source rows were deleted atomically, and the historical run then restored successfully.
2. **Managed/offline identity and exact inactive GraphQL lifecycle — Pass.** The current manager-owned root remains the same identity even while offline and does not take the unmanaged historical readiness path. Exact-ID transition-lane integration preserves delete/restore serialization. The temporary current GraphQL probe deleted only the inactive package/index/history record and rejected deletion of the managed root with the active/stopping classification.
3. **Delegated-task admission and settlement cleanup — Pass.** The newly added durable assertion proves `assertCurrentSchemaReady()` runs before delegated agent-run allocation, TeamRun lookup, or task record materialization. Existing integrated coverage proves accepted settlement calls `unregisterTerminated()` once after committed teardown and does not unregister when cleanup rejects.

### Temporary Fixture Diagnostic

The initial copied GraphQL probe run reported `1 failed / 22 passed` because its local copied archive test fixture did not implement the latest-base manager method `withUnmanagedHistoryDeletion`. This method is a required mock boundary for the existing resolver, not an implementation defect. The coverage investigation already classified the exact inactive-delete journey as a temporary probe; the fixture was updated, the identical four-file command passed `23/23`, and the temporary test file was deleted. Diagnostic evidence is retained in `logs/33-ir006-managed-offline-graphql-delete.log`; the authoritative rerun is `logs/34-ir006-managed-offline-graphql-delete-pass.log`. No product failure ID was opened.

### Durable Coverage Delta

- Updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/autobyteus-server-ts/tests/unit/agent-team-execution/task-delegation-current-invariants.test.ts`
- Added files: `None`.
- Removed files: `None`.
- New assertion: current-schema readiness rejection occurs before delegated agent-run allocation, TeamRun resolution, or materialization.
- Review status: proportional test-code review is required because repository-resident durable coverage changed after `CRR-009`.

### Confidence Scorecard

| Confidence category | Score | Evidence / residual uncertainty |
| --- | ---: | --- |
| Requirement and acceptance-criteria proof | 98% | All three material IR-006 lifecycle seams pass; the complete API-REV-003 requirement map remains applicable |
| Changed-boundary execution directness | 99% | Actual built server/restart/released SQLite lifecycle and direct current service/task execution |
| Cross-boundary integration realism and mock gap | 98% | Real built-server GraphQL path and real manager/service integration; exact delete mutation uses a controlled current resolver fixture |
| Environment, configuration, identity, and fixture fidelity | 97% | Integrated merge, normal build, reset/migrated SQLite, exact released fixtures, and exact managed/unmanaged identities |
| Failure, edge-case, lifecycle, and recovery evidence | 98% | Consolidation failure/retry, old rejection/new admission, exact delete/restore, offline identity, admission rejection, and teardown cleanup |
| User-surface, browser, and desktop-shell confidence | 95% | Prior normal/degraded/fatal Chrome evidence remains valid; IR-006 changes no frontend or Electron-shell source |
| Durable regression coverage quality and relevance | 96% | One narrow readiness-order case closes the only focused gap; final 37-test selection passes; proportional review is pending |

- Overall final confidence: `97.3%` (simple average, rounded from 97.29%).
- Default clean target met: `Yes`.
- Any applicable category below 90%: `No`.
- Critical acceptance criteria unproven: `None`.

### Broader Validation Decision

- Decision: `Not Required` for API-REV-004.
- Rationale: the actual built-server recovery path, current GraphQL mutation, real TeamRun manager/service integration, and direct task lifecycle tests exercise the complete changed IR-006 boundary. No focused result suggests impact to previously passed scale, pricing, SafeInt, frontend, or browser behavior.
- Retained prior evidence: API-REV-003 released-scale (~154k rows), pricing/SafeInt, broad API, and Chrome normal/degraded/fatal results.
- Electron execution: not selected; there is still no IPC, preload, native, window, packaging, or shell lifecycle delta.

### Cleanup And Residual Risk

- The temporary GraphQL probe file is absent.
- No run-specific `token-consolidation-retry-startup` or IR-006 SQLite residue was found.
- No matching owned Node process remained after execution.
- Ticket logs are retained intentionally; production profile/data, external accounts, and Electron were never touched.
- Known non-product limitation retained: Nuxt typecheck remains blocked by the previously recorded `vue-tsc`/TypeScript package-export incompatibility. Production frontend evidence was not invalidated by IR-006.

## Prior Authoritative Result — API-REV-004

- Result: `Pass`.
- Final validation confidence: `97.3%`.
- Broader validation: `Not Required` for the focused delta.
- New or remaining failure IDs: `None`.
- Durable coverage changed this round: `Yes`; exactly one updated path, no additions or removals.
- Required next recipient: `/code_reviewer` for proportional review of the changed test. Delivery and Electron work remain paused through that gate.

## API-REV-005 DS-009 Migration And Lifecycle Revalidation

### Execution Matrix

All commands used the assigned worktree and repository-locked dependencies. Prisma/SQLite and built-server fixtures were disposable and test-owned. The user's live database and profile were not used.

| ID | Command / execution surface | Result | Evidence |
| --- | --- | --- | --- |
| DS009-001 | `pnpm -C autobyteus-server-ts build` | Pass: shared package builds, Prisma generation, server TypeScript/build output, managed assets, and sanitized built-in bootstrap smoke | `test-results/api-e2e/logs/38-ir007-integrated-server-build.log` |
| DS009-002 | `pnpm test --run --maxWorkers=1` with the two new source-token transport/decoder files | Pass: 2 files / 32 tests | `logs/39-ir007-ds009-leading-null-decoder.log` |
| DS009-003 | Four-file migration selection: the two new tests plus app-data migration and legacy fold | Pass: 4 files / 43 tests | `logs/40-ir007-four-file-migration-regression.log` |
| DS009-004 | Entire actual built-server `team-run-v1-production-upgrade.e2e.test.ts` | Pass: 1 file / 4 tests covering success/relaunch, warnings, degraded retry/restore, and overlap | `logs/41-ir007-built-server-production-upgrade-lifecycle.log` |
| DS009-005 | `node tickets/.../probes/released-scale-token-consolidation.mjs` against rebuilt server dist | Pass: 154,100 rows / 1,269 runs / 880,848,896-byte seed; exact validation and cleanup | `logs/42-ir007-released-scale-154k.log`; `test-results/api-e2e/scale-probe-result.json` |
| DS009-006 | Final combined five-file migration/lifecycle selection | Pass: 5 files / 47 tests | `logs/43-ir007-final-migration-lifecycle-suite.log` |
| DS009-007 | Server `tsc -p tsconfig.build.json --noEmit`; `git diff --check`; 15-field/boundary/coercion scans; ancestry; scale-result and resource cleanup audit | Pass | `logs/44-ir007-ts-boundary-cleanup.log` |
| DS009-008 | Final canonical artifact/evidence/durable-path/diff/resource audit | Pass | `logs/45-ir007-final-artifact-audit.log` |

### Exact AC-026 Evidence

- One disposable real Prisma-client/SQLite database applied the released ledger/pricing/display/address/name schemas plus the current run-record schema.
- One ordered six-row run contained four missing cumulative-source values followed by JSON integers `28826658` and `28987545` in the same batch.
- SQLite confirmed source types `null, null, null, null, integer, integer`; the actual repository query returned `null, null, null, null, integer:28826658, integer:28987545`.
- The actual consolidation transaction returned `SUCCEEDED`, scanned six reports, created exactly one current record, retained one compact series checkpoint ending at `28987545n`, validated totals/report count, and deleted all six source rows only after validation.
- Real Prisma/SQLite JSON real, text, boolean, array, object, negative integer, and `9007199254740992` inputs each returned a field-specific type/grammar/range failure, retained the source, left the target empty, and repeated the same result on ordinary retry.
- Focused decoder coverage admits only zero, positive canonical digits, and exact `Number.MAX_SAFE_INTEGER`; it rejects untagged values, malformed tags, signs, leading zero, fraction, exponent, whitespace, extra separators, unsupported types, and first overflow.

### Affected Built-Server Lifecycle

The complete actual built-server E2E passed all four production-upgrade cases:

1. supported released cohort migrates, serves history and new work, and remains immutable on relaunch;
2. independent root/token/history warnings remain bounded while health, valid history, new work, and relaunch continue;
3. failed consolidation leaves the server healthy, gates token history and unmanaged old TeamRun restoration, admits and persists one new current run, then a corrected restart retry imports the disjoint legacy rows, deletes source, and restores the old TeamRun successfully;
4. an injected legacy/current run-ID overlap fails before source cleanup while preserving both stores and history gating.

This directly revalidates the capability classification and affected GraphQL history/restore/new-run surfaces. It does not rely on the failed Electron package.

### Refreshed Released-Scale Evidence

| Metric | API-REV-005 result |
| --- | ---: |
| Released source rows | 154,100 |
| Distinct current runs | 1,269 |
| Seeded SQLite bytes | 880,848,896 |
| Consolidation latency | 12,804 ms |
| Peak WAL bytes | 12,112,832 |
| Peak SQLite temp bytes | 0 |
| Peak process RSS bytes | 193,183,744 |
| Legacy rows after commit | 0 |
| Current rows after commit | 1,269 |
| Reports/input/output totals | 154,100 / 154,100 / 154,100 |
| Integrity | `ok` |
| Reusable freelist pages | 215,037 |

The prior query completed in 11.287 seconds; the deterministic 15-field transport completed in 12.804 seconds while preserving the same peak WAL, zero temp spill, exact output, and reusable-page conclusion. This supersedes the prior latency measurement and keeps the released-scale resource decision current.

### Retained Evidence Decision

- Current store/fold/pricing/SafeInt/GraphQL/API evidence from API-REV-003: `Still Valid`. No current runtime/API source changed, and the actual migration produces the same validated current record contract.
- Chrome normal/degraded/fatal evidence from API-REV-003: `Still Valid`. No renderer, frontend, resolver shape, error code, readiness, or layout source changed; actual built-server degraded classification was re-executed.
- Managed/offline delete and delegated-task evidence from API-REV-004: `Still Valid`. No TeamRun/task source changed; the unmanaged restore path was directly rechecked.
- DR-003 Electron package: `Stale / not acceptance evidence`. Delivery must rebuild and request renewed user verification after this review gate.

### Durable Coverage Delta

Two durable test files were added by IR-007 and executed unchanged by API/E2E:

1. `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/autobyteus-server-ts/tests/unit/app-data-migrations/token-usage-run-records-v1-source-token-decoding.test.ts`
2. `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/autobyteus-server-ts/tests/unit/app-data-migrations/legacy-token-usage-source-decoder.test.ts`

- API/E2E-owned durable changes in API-REV-005: `None`.
- Other durable files added, updated, or removed: `None`.
- Required test review: proportional review of both new files before delivery.

### Confidence Scorecard

| Confidence category | Score | Evidence / residual uncertainty |
| --- | ---: | --- |
| Requirement and acceptance-criteria proof | 98% | AC-026, affected AC-022/024 lifecycle, rollback/retry, cleanup, scale, and retained one-row contract all pass |
| Changed-boundary execution directness | 99% | Actual Prisma query/transaction, real SQLite, actual built server, and rebuilt-dist scale execution |
| Cross-boundary integration realism and mock gap | 98% | Real adapter/database, migration runner/startup, GraphQL lifecycle, current target read, restart, and cleanup |
| Environment, configuration, identity, and fixture fidelity | 97% | Exact observed values and result order on released schemas; disposable rather than live production data by design |
| Failure, edge-case, lifecycle, and recovery evidence | 99% | Type/grammar/range, atomic rollback/retry, cleanup failure, degraded gate, overlap, warnings, relaunch, and scale integrity |
| User-surface, browser, and desktop-shell confidence | 95% | Source-current Chrome evidence retained; corrected Electron package and user verification intentionally remain downstream |
| Durable regression coverage quality and relevance | 96% | Two focused files and combined 47-test pass; proportional review is pending |

- Overall final confidence: `97.4%` (simple average, rounded from 97.43%).
- Default clean target met: `Yes`.
- Any applicable category below 90%: `No`.
- Critical acceptance criterion unproven: `None`.

### Broader Validation, Cleanup, And Residual Risk

- Broader validation: `Required` and completed with the refreshed released-scale probe.
- Browser repetition: `Not Required` because no user-interface or transport contract changed and the affected backend classification was exercised directly.
- Electron execution: not selected. The failed package is invalid; delivery owns a new README-guided build/integrity pass and explicit user verification after test review.
- Cleanup: scale temp root removed; actual-server databases/runtime roots removed; no matching owned Node process remained; ticket logs/result JSON retained intentionally; production data/profile untouched.
- Known non-product limitations retained: Nuxt `vue-tsc`/TypeScript package-export incompatibility and external-provider opt-in tests. Neither boundary changed.

## Latest Authoritative Result — API-REV-005

- Result: `Pass`.
- Final validation confidence: `97.4%`.
- New or remaining failure IDs: `None`.
- DR-004 root-cause regression: resolved in disposable automated evidence; delivery remains blocked until a fresh Electron artifact passes renewed explicit user verification.
- Durable coverage changed in the candidate: `Yes`; two upstream additions, no API/E2E edits/removals.
- Required next recipient: `/code_reviewer` for proportional review of both new durable test paths. Delivery remains paused through that gate.
