# API/E2E Execution Coverage Report

## Execution Round Meta

- API/E2E Revision: `API-REV-008`
- Trigger: `CRR-019` requested current-scope executable proof after `SR-012` / `ARCH-REV-012` / `IR-011`: actual GraphQL recovery-action transport, failed required startup-only consolidation, localized disabled/no-dispatch Settings guidance, later ordinary-startup retry, and preservation of the complete `SR-010` audit removal/nonmutation boundary.
- Upstream revisions: `SR-012` current; `SR-010` audit withdrawal; `ARCH-REV-012`; `IR-011` current; source `CRR-019` Pass. `API-REV-005` remains the applicable token/DS-009 baseline; `API-REV-006`/`API-REV-007` audit-compaction behavior and `DR-007` are withdrawn evidence.
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run`
- Ticket: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/tickets/in-progress/token-usage-one-row-per-agent-run`
- Execution date / host: 2026-08-20; macOS arm64; Europe/Berlin.
- Result: `Pass`.
- Final validation confidence: `97.9%`.
- Broader validation: `Required` and completed through the actual rebuilt-server GraphQL/degraded/restart lifecycle. Scale/pricing/SafeInt/Chrome repetition was not required; Electron rebuild/user verification remains delivery-owned.
- Durable coverage changed in the current candidate: `Yes`; five current durable paths updated/added and four withdrawn audit-only durable paths removed. API/E2E updated one of the five current paths.
- Required next gate: `/code_reviewer` proportional test-code review before delivery.

## Prior API-REV-005 Investigation And Execution Basis

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

## API-REV-006 Terminal Audit Read/Compaction Revalidation

### Execution Matrix

All commands used the assigned worktree, repository-locked dependencies, disposable Prisma/SQLite databases, and the repository live-E2E runtime harness. No command opened or mutated the user's live database/profile.

| ID | Command / execution surface | Result | Evidence |
| --- | --- | --- | --- |
| AUDIT-001 | `pnpm -C autobyteus-server-ts build` | Pass: shared builds, Prisma generation, server TypeScript/build output, managed assets, and sanitized bootstrap smoke | `test-results/api-e2e/logs/44-ir009-server-build.log` |
| AUDIT-D01 | Initial new-test collection with a cross-package runtime import of the frontend query module | Did not collect: the server Vitest package does not directly link the frontend-only `graphql-tag` dependency. Classified as test-harness package isolation; Nuxt production execution later passed. | `logs/45-ir009-built-server-audit-compaction-e2e.log` |
| AUDIT-002 | New durable built-server test reading and executing the exact tracked `GetAppDataMigrations` template text | Pass: 1 file / 1 actual-system test, three built-server lifecycles, 100,001-detail/>10 MiB sources/logs | `logs/46-ir009-built-server-audit-compaction-e2e-rerun.log` |
| AUDIT-003 | DS-010/DS-011 repository, runner, and compactor selection | Pass: 3 files / 33 tests | `logs/47-ir009-bounds-runner-compactor-suite.log` |
| AUDIT-004 | Mounted Settings component plus app-data migration store | Pass: 2 files / 3 tests | `logs/48-ir009-settings-store-suite.log` |
| AUDIT-005 | `pnpm -C autobyteus-web build` | Pass: Nuxt client, server, 15-route prerender production build | `logs/49-ir009-nuxt-production-build.log` |
| AUDIT-006 | Final combined actual-server/repository/runner/compactor selection | Pass: 4 files / 34 tests | `logs/50-ir009-final-audit-compaction-suite.log` |
| AUDIT-007 | Server `tsc -p tsconfig.build.json --noEmit`; `git diff --check`; token-table/fatal-gate/test-exclusivity scans; exact document audit; owned runtime/database cleanup | Pass | `logs/51-ir009-ts-static-cleanup.log` |
| AUDIT-008 | Canonical report/revision/durable-path/evidence/diff/process final audit | Pass | `logs/52-ir009-final-artifact-audit.log` |

The initial collection result is not an implementation failure and is not the authoritative test result. The durable test deliberately avoids a new test-only dependency or partial symlink: it reads the exact tracked frontend source, extracts only the `GetAppDataMigrations` tagged template body, and submits that exact document to the actual built server. The regular Nuxt build proves the product's normal module/bundler path.

### Exact Frontend Document And Built-Startup Evidence

The actual-system test performed this sequence:

1. Started rebuilt `dist/app.js` on an owned runtime/database and let normal startup migrations finish.
2. Persisted a valid current token row (`17` input, `5` output, one report).
3. Replaced the two already-terminal 20260730 audit summaries with one shared 100,001-detail valid summary exceeding 10 MiB, wrote an owned >10 MiB log for each, preserved distinct terminal statuses/attempts/timestamps/error, and removed only the compactor record to emulate the supported released state.
4. While the first server was live, executed the exact frontend `GetAppDataMigrations` document. Every returned summary was <=65,536 bytes; both sources retained their four exact aggregate counts and returned one omission marker; total response was bounded by the finite registry and per-record envelope; the raw stored summaries remained >10 MiB.
5. Stopped and restarted the actual built server. The only supported production scheduler created the compactor result as `SUCCEEDED`, `attempts=1`, `requiredOnStartup=true`, `canRetry=false`, with two migrated sources. Both original source ID/status/attempt/start/completion/error/log-path tuples and all four counts remained exact; only row-linear details and owned logs became <=65,536 bytes.
6. Compared both actual token tables before and after and found them identical. The live current-token summary remained `17/5/1`, proving current statistics/readiness stayed healthy.
7. Seeded a malformed oversized supported source and removed only the compactor record, then restarted the built server again. Startup remained healthy; the exact frontend document returned a bounded unavailable marker for the source and `SUCCEEDED_WITH_WARNINGS/attempts=1/canRetry=false` for the compactor; raw unsupported source and token tables remained unchanged; current token GraphQL still succeeded.

This is direct evidence that the compactor is reached by built-server ordinary startup rather than direct definition execution or manual mutation, and that warning nonfatality/public retry semantics survive the full repository-runner-resolver-document boundary.

### Failure, Retry, Ownership, And Bound Evidence

The passing 33-test focused repository suite adds the cases intentionally unsuitable for a spawned production server:

- SQL-projected exact small summary; oversized valid summary; malformed JSON; wrong count/detail shapes; unsafe count; and absent running summary.
- Instrumented `listStatuses()`/`runPending()` paths observe no materialized summary above 65,536 bytes.
- Owned log successfully compacted followed by injected database-summary update failure records `FAILED`; the next ordinary `runPending()` treats the bounded log as a no-op, compacts the summary, and finishes at attempt 2.
- Source compaction committed followed by injected terminal compactor-status persistence failure leaves a retryable result; the next ordinary `runPending()` recognizes already-bounded source and finishes at attempt 2 without duplicate mutation.
- `SUCCEEDED_WITH_WARNINGS` is terminal/skipped and exposes `canRetry=false`; startup-only `FAILED` and stale `RUNNING` remain eligible only through later `runPending()`; direct manual execution remains restart-required.
- Malformed/wrong-shaped summary, missing log, outside-owned log, nonregular log, and unwritable log preserve unsupported content and emit bounded nonfatal evidence.
- The registered compactor remains after both source migrations, before consolidation, absent from consolidation prerequisites and explicit ServerRuntime fatal gates, with no production reference to either token table/model.
- Real token sentinels remain equal across compaction.

### Settings/User-Surface Evidence

- The mounted `ServerMigrationsManager` test renders `canRetry=false` as a disabled Retry button and proves no `runMigration` dispatch occurs.
- An otherwise identical executable warning control remains enabled and dispatches exactly once, preventing a false blanket disable.
- The store test proves status fetch and mutation/refetch behavior through the existing GraphQL store contract.
- The Nuxt production client/server/prerender build passes. No layout, style, routing, or renderer implementation changed, so a new Chrome visual journey would not add material evidence beyond the direct mounted interaction and actual backend contract.

### Durable Coverage Delta

All repository-resident durable test/fixture changes since the prior successful API/E2E baseline are:

1. Added upstream: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/autobyteus-server-ts/tests/helpers/app-data-migration-audit-fixtures.ts`
2. Added upstream: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/autobyteus-server-ts/tests/unit/app-data-migrations/app-data-migration-record-repository-bounds.test.ts`
3. Updated upstream: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/autobyteus-server-ts/tests/unit/app-data-migrations/app-data-migration-runner.test.ts`
4. Added upstream: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/autobyteus-server-ts/tests/unit/app-data-migrations/token-usage-migration-audit-compaction-v1.test.ts`
5. Added upstream: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/autobyteus-web/components/settings/__tests__/ServerMigrationsManager.spec.ts`
6. Added by API/E2E: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/autobyteus-server-ts/tests/e2e/app-data-migrations/token-usage-migration-audit-compaction-startup.e2e.test.ts`

- Removed durable paths: `None`.
- Stale assertions removed: `None` in this round.
- Required next gate: proportional test-code review of all six paths before delivery.

### Retained Prior Evidence Decision

- API-REV-005 exact DS-009 scalar transport, invalid-source rollback/retry, actual consolidation degraded/restore lifecycle, and refreshed 154,100-row/WAL/temp/freelist result: `Still Valid`. DS-010/DS-011 do not alter those sources, and the new actual startup ran the complete registry and current-token health path.
- API-REV-003 current fold/pricing/SafeInt/GraphQL/API and Chrome normal/degraded/fatal renderer result: `Still Valid`. No current token or renderer source changed; focused API execution found no widened impact.
- API-REV-004 integrated TeamRun/offline/delegated-task evidence: `Still Valid`. No TeamRun/task source changed.
- DR-006 live 31 MB observation: remains the reachable trigger, not target-code acceptance evidence.
- Prior Electron artifact: stale for SR-009/IR-009 and not acceptance evidence. Delivery owns a fresh build and renewed user verification after this gate.

### Confidence Scorecard

| Confidence category | Score | Evidence / residual uncertainty |
| --- | ---: | --- |
| Requirement and acceptance-criteria proof | 98% | AC-027 material cases pass directly; prior unaffected requirements remain covered |
| Changed-boundary execution directness | 99% | Real Prisma/SQLite, exact tracked frontend document, actual rebuilt server and restarts |
| Cross-boundary integration realism and mock gap | 97% | Real API/process path plus real repository; deterministic fault injection is intentionally in-process |
| Environment, configuration, identity, and fixture fidelity | 98% | Production repository/schema/startup with 100,001-detail/>10 MiB owned fixtures and isolated config |
| Failure, edge-case, lifecycle, and recovery evidence | 98% | Both partial retries, terminal warning, malformed/shapes/path ownership, nonfatal restart, immutability |
| User-surface, browser, and desktop-shell confidence | 95% | Mounted disabled/no-dispatch action plus Nuxt build; fresh Electron package/user verification remains delivery-owned |
| Durable regression coverage quality and relevance | 98% | Six cohesive changed paths including one actual-system E2E; proportional review is pending |

- Overall final confidence: `97.6%` (simple average, rounded from 97.57%).
- Default clean target met: `Yes`.
- Applicable category below 90%: `None`.
- Critical acceptance criteria unproven: `None`.

### Broader Validation, Cleanup, And Residual Risk

- Broader validation: `Required and completed` through the durable actual-built-server/API journey.
- New Chrome/browser execution: `Not Required`; the only changed user contract is the action capability, directly covered by mounted interaction, exact API response, and a production build. Prior Chrome evidence remains applicable.
- Electron execution: not selected. API/E2E does not claim shell/package evidence; delivery must build the post-SR-009 package and obtain explicit user verification.
- Cleanup: every spawned built server was stopped; owned runtime/database/log roots were removed; no `token-audit-compaction` database/runtime or matching server process remained. Ticket logs were retained intentionally. Production data/profile was never touched.
- Known independent limitation retained: Nuxt `vue-tsc`/TypeScript package-export incompatibility. The production build passes. External provider opt-in runtime remains unchanged and not selected.

## Latest Authoritative Result — API-REV-006

- Result: `Pass`.
- Final validation confidence: `97.6%`.
- New or remaining failure IDs: `None`.
- `REQ-028` / `AC-027`: directly proven across SQL/repository, runner/retry, actual built startup, exact frontend GraphQL document, current token health, and mounted Settings action.
- Durable coverage changed: `Yes`; five upstream paths and one API/E2E-owned path, no removals.
- Required next recipient: `/code_reviewer` for proportional review of all six changed durable paths. Delivery/Electron work remains paused through that gate.

## API-REV-007 TCR-001 Canonical Compacted-Log Assertion Fix

### Finding And Correction

`CRR-015` correctly found that the two successful owned-log scenarios proved only `size <= 65,536`. An empty or unrelated short file would have passed even though `REQ-028` / `AC-027` requires canonical bounded evidence derived from the preserved source outcome.

The Local Fix updated only:

1. `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/autobyteus-server-ts/tests/unit/app-data-migrations/token-usage-migration-audit-compaction-v1.test.ts`
2. `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/autobyteus-server-ts/tests/e2e/app-data-migrations/token-usage-migration-audit-compaction-startup.e2e.test.ts`

Both paths retain the byte bound, read each real successfully replaced owned log, and compare its complete deterministic body with the seeded source tuple/counts. The assertions cover:

- migration ID and display name;
- original terminal `SUCCEEDED` or `SUCCEEDED_WITH_WARNINGS` status;
- attempts `5` or `6`;
- exact ISO start/completion timestamps;
- `errorState=absent` or `present` matching the source;
- exact scanned/migrated/skipped/failed counts;
- `detailsOmitted=100001`;
- `reason=historical audit detail exceeded 65,536 bytes`;
- terminating newline and retained `<=65,536` byte size.

No implementation source, shared fixture, other test, requirement, or runtime configuration changed.

### Focused Execution Matrix

| ID | Command / surface | Result | Evidence |
| --- | --- | --- | --- |
| TCR001-001 | Focused `token-usage-migration-audit-compaction-v1.test.ts` | Pass: 1 file / 9 tests; canonical content asserted after real Prisma/SQLite `runPending()` compaction | `test-results/api-e2e/logs/53-tcr001-unit-compacted-log-content.log` |
| TCR001-002 | Focused actual built-startup E2E | Pass: 1 file / 1 test; canonical content asserted after the exact frontend-document/built restart lifecycle | `logs/54-tcr001-built-startup-compacted-log-content.log` |
| TCR001-003 | Combined authoritative rerun | Pass: 2 files / 10 tests | `logs/55-tcr001-final-two-file-rerun.log` |
| TCR001-004 | Server TypeScript, `git diff --check`, all ten canonical-field assertions in both paths, no `.only`/`.skip`/`.todo`, owned runtime/database/process cleanup | Pass | `logs/56-tcr001-ts-assertion-cleanup.log` |
| TCR001-005 | Canonical report/revision/evidence/diff/cleanup final audit | Pass | `logs/57-tcr001-final-artifact-audit.log` |

### Evidence Applicability And Confidence

- API-REV-006 product execution remains valid; the reviewer attributed no source defect and requested only assertion hardening.
- The actual built-startup path was nevertheless rerun because the missing assertion concerned its observable output. It again passed the >10 MiB source/log, exact frontend query, restart scheduling, source tuple/count preservation, warning isolation, token immutability, and current-health lifecycle while now proving the replacement content.
- Repeating the server build, DS-010 repository/runner-only selection, Settings/store, Nuxt build, consolidation scale, SafeInt/API, Chrome, or Electron would add no TCR-001 evidence. Those API-REV-006 results remain applicable.
- Overall confidence is `97.7%`. Durable regression quality rises from `98%` to `99%`; the other six scorecard categories remain unchanged. The simple average is `97.7%` after rounding.
- Broader validation: `Required and completed` through the actual built-startup rerun.
- Cleanup: complete; production profile/database never touched.

## Latest Authoritative Result — API-REV-007

- Result: `Pass`.
- Final validation confidence: `97.7%`.
- Resolved finding: `TCR-001`.
- New or remaining failure IDs: `None`.
- Durable Local Fix: exactly two updated test paths, no additions/removals and no production-source change.
- Required next recipient: `/code_reviewer` for proportional re-review of the two corrected paths. Delivery/Electron work remains paused through that gate.

## API-REV-008 Current Recovery Action And Audit-Withdrawal Revalidation

### Scope Correction And Evidence Applicability

- `API-REV-006`/`API-REV-007` validated a later audit-summary projection/compactor that the user withdrew in `SR-010`. Their compactor, response-bound, and log-rewrite results are historical only and are not current acceptance evidence. `TCR-001` is obsolete because the implementation and both tests it concerned are deleted.
- `API-REV-005` remains the applicable direct DS-009/token transition baseline: exact nullable Prisma/SQLite scalar transport, invalid-source rollback/retry, 154,100-row scale/WAL/temp/freelist, built-server history/restore gating, and current one-row output. `IR-011` changes none of those storage, fold, pricing, SafeInt, or scale boundaries.
- `API-REV-003` current token API/pricing/SafeInt/Chrome evidence and `API-REV-004` TeamRun/task evidence remain applicable to unchanged surfaces. The affected consolidation/degraded/restore lifecycle was nevertheless rerun through the actual current built server.

### Execution Matrix

All commands ran from the assigned worktree with repository-locked dependencies, isolated test HOME/runtime/database/log paths, and the repository live-E2E harness. No command opened or mutated the user's live profile, database, migration records, summaries, log paths, or historical log files.

| ID | Command / execution surface | Result | Evidence |
| --- | --- | --- | --- |
| RECOVERY-001 | `pnpm -C autobyteus-server-ts run build:full` | Pass: clean TypeScript build, managed assets, built-in bootstrap smoke, sanitized built-module bootstrap | `test-results/api-e2e/logs/58-ir011-integrated-server-build.log` |
| RECOVERY-002 | Focused runner plus GraphQL schema/resolver selection | Pass: 2 files / 20 tests | `logs/59-ir011-runner-graphql-suite.log` |
| RECOVERY-003 | Selected actual built-server failed-consolidation/restart case | Pass: 1 selected test; 3 unrelated cases filtered | `logs/60-ir011-built-server-recovery-action-restart.log` |
| RECOVERY-004 | Mounted Settings plus Pinia store selection | Pass: 2 files / 4 tests, exact English and zh-CN guidance, disabled/no-dispatch startup action, retained manual action | `logs/61-ir011-settings-store-localized-suite.log` |
| RECOVERY-005 | Complete actual built production-upgrade suite | Pass: 1 file / 4 tests covering supported relaunch, warning isolation, failed consolidation/retry, and overlap rejection | `logs/62-ir011-full-built-production-upgrade-suite.log` |
| RECOVERY-006 | `pnpm -C autobyteus-web build` | Pass: Nuxt client/server production build and 15-route prerender including `/settings` | `logs/63-ir011-nuxt-production-build.log` |
| RECOVERY-007 | Server build TypeScript; localization guards; recovery transport trace; withdrawn source/test/build residue scan; exact deletion checks; no `.only`/`.skip`; `git diff --check`; owned database/runtime cleanup | Pass | `logs/64-ir011-static-localization-cleanup-audit.log` |
| RECOVERY-008 | Canonical report/revision metadata, all seven execution logs, exact nine-path durable delta, `git diff --check`, database/runtime/process cleanup | Pass | `logs/65-ir011-final-artifact-audit.log` |

### Actual GraphQL, Degraded Lifecycle, And Restart Proof

The API/E2E-owned update extends the existing cohesive production-upgrade E2E instead of adding another lifecycle harness. Its actual `getAppDataMigrations` document now requests `recoveryAction` and `canRetry`.

1. A disposable released-shape database contains the supported legacy team/token cohort plus a deliberate blank canonical run ID. Ordinary rebuilt-server startup executes registered `runPending()` and leaves consolidation `FAILED`, `attempts=1`.
2. The actual live GraphQL record returns `recoveryAction=RESTART_TO_RETRY` and `canRetry=false`, with the exact blank-ID failure. Token history and old TeamRun restore remain rejected, while a globally new AgentRun is admitted and persists one current token row.
3. The first server is stopped normally; the test repairs only its deliberate invalid test row. A second ordinary rebuilt-server startup, not a direct migration mutation, executes `runPending()` again.
4. The actual live GraphQL record returns `SUCCEEDED`, `attempts=2`, `recoveryAction=NONE`, and `canRetry=false`. The source is empty, all three current rows are present, and the pre-existing TeamRun restore succeeds and terminates cleanly.
5. The complete file also passes supported immutable relaunch, mixed warning isolation, and mandatory legacy/current run-ID overlap rejection with both stores preserved.

This closes the resolver-local/mock gap: the recovery enum is registered in the rebuilt schema, serialized by the actual server, and changes across the real process restart according to the same scheduling path that executes the migration.

### Visible Localized Settings And No-Dispatch Proof

- The tracked web query requests `recoveryAction`; the generated client and Pinia record carry it without migration-ID, status, or execution-policy inference.
- Mounted `ServerMigrationsManager` renders the exact English text, **“This migration can only be retried during startup. Restart AutoByteus to try again.”**, and the exact Simplified Chinese text, **“此迁移只能在启动时重试。请重启 AutoByteus 后再试。”**
- The `RESTART_TO_RETRY` button is disabled and clicking it causes no store mutation. A `MANUAL_RETRY` row remains enabled and dispatches exactly once; `MANUAL_RETRY` and `NONE` rows render no restart guidance.
- The Nuxt production build succeeds through the real generated-query/component/localization bundling path. A new Chrome or Electron execution was not selected: the delta has no browser API, layout, IPC, preload, or shell behavior; mounted semantic DOM plus the production build directly proves the changed renderer contract. Delivery remains responsible for the fresh Electron package and renewed user verification.

### SR-010 Removal And Nonmutation Proof

- Static and rebuilt-output scans find no audit compactor ID/class, summary-projection module, omission-marker implementation, or historical-log rewrite code in current server source/tests/web or rebuilt `dist`.
- The compactor folder, summary-projection file, audit fixture, bounds unit test, compactor unit test, and compactor startup E2E are all absent. The registry contains no audit-only migration.
- The actual built-server fixture seeds one terminal released migration with a parsed summary exceeding 64 KiB and a real test-owned historical log exceeding 64 KiB. Before and after both the failed startup and successful restart:
  - live GraphQL returns the exact complete summary rather than a projection;
  - the complete persisted migration-record tuple, including `summary_json` and `log_path`, remains byte/value exact;
  - the historical log path and bytes remain exact;
  - the terminal source record stays `SUCCEEDED/attempts=1/recoveryAction=NONE/canRetry=false`.
- The >64 KiB sentinel is only a regression detector for removed projection/compaction behavior. The accepted production-scale approximately 14 MiB summaries and approximately 31 MiB response are not reclassified as an acceptance bound and were not copied or mutated.

### Durable Coverage Delta

Current repository-resident durable coverage changes that must receive proportional review are:

1. Updated by API/E2E: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/autobyteus-server-ts/tests/e2e/app-data-migrations/team-run-v1-production-upgrade.e2e.test.ts`
2. Updated upstream: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/autobyteus-server-ts/tests/unit/app-data-migrations/app-data-migration-runner.test.ts`
3. Added upstream: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/autobyteus-server-ts/tests/unit/api/graphql/types/app-data-migrations.test.ts`
4. Updated upstream: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/autobyteus-web/components/settings/__tests__/ServerMigrationsManager.spec.ts`
5. Updated upstream: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/autobyteus-web/stores/__tests__/appDataMigrationsStore.spec.ts`
6. Removed as stale/withdrawn: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/autobyteus-server-ts/tests/e2e/app-data-migrations/token-usage-migration-audit-compaction-startup.e2e.test.ts`
7. Removed as stale/withdrawn: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/autobyteus-server-ts/tests/helpers/app-data-migration-audit-fixtures.ts`
8. Removed as stale/withdrawn: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/autobyteus-server-ts/tests/unit/app-data-migrations/app-data-migration-record-repository-bounds.test.ts`
9. Removed as stale/withdrawn: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-usage-one-row-per-agent-run/autobyteus-server-ts/tests/unit/app-data-migrations/token-usage-migration-audit-compaction-v1.test.ts`

No other durable coverage path was added, updated, or removed by API/E2E. Ticket execution logs and the coverage artifacts are evidence, not product test code.

### Final Confidence Scorecard

| Confidence category | Score | Evidence / residual uncertainty |
| --- | ---: | --- |
| Requirement and acceptance-criteria proof | 98% | DS-012 failure/restart/UI behavior and SR-010 nonmutation pass directly; the complete applicable API-REV-005 token baseline is retained |
| Changed-boundary execution directness | 99% | Actual rebuilt schema/server/GraphQL plus ordinary process restart; semantic mounted UI in both locales |
| Cross-boundary integration realism and mock gap | 97% | Real runner/repository/process/API lifecycle and production web build; UI/backend are correlated rather than one browser-hosted journey |
| Environment, configuration, identity, and fixture fidelity | 98% | Production Prisma migrations/registry/build output, isolated HOME/runtime/SQLite, real historical file, exact released-shape lifecycle |
| Failure, edge-case, lifecycle, and recovery evidence | 99% | Failed consolidation, blocked old restore/history, new-run admission, restart retry, overlap rejection, immutable relaunch, no audit mutation |
| User-surface, browser, and desktop-shell confidence | 96% | Exact mounted English/zh-CN visibility/action semantics and Nuxt build; no changed browser/shell boundary, fresh Electron verification remains delivery-owned |
| Durable regression coverage quality and relevance | 98% | Closed runner matrix, schema mapping, store/component contract, and one cohesive actual-system lifecycle; proportional review pending |

- Overall final confidence: `97.9%` (simple average, rounded from 97.86%).
- Critical acceptance criteria unproven: `None`.
- Applicable category below 90%: `None`.
- Default 95% clean target met: `Yes`.
- Broader validation: `Required and completed` through the durable actual built-server/GraphQL/restart journey.

### Cleanup And Residual Risk

- Every spawned server stopped; each API/E2E-owned SQLite database, runtime root, isolated HOME, and historical-audit sentinel was removed by the harness. Static cleanup found no matching database/runtime residue. The production profile metadata and live user data were never accessed or changed.
- The known independent Nuxt `vue-tsc`/TypeScript package-export incompatibility remains a typecheck limitation; the production build passes. External provider opt-in runtime and Electron shell/package execution are unchanged/not selected.
- Delivery must remain paused until proportional review of all nine current durable coverage changes passes.

## Latest Authoritative Result — API-REV-008

- Result: `Pass`.
- Final validation confidence: `97.9%`.
- New or remaining failure IDs: `None`.
- `CR-009` / `DS-012`: actual transport, visible localized disabled/no-dispatch UI, and later ordinary-startup recovery are directly proven.
- `SR-010`: withdrawn audit source/tests remain absent; a real >64 KiB summary/log sentinel remains unprojected and unmodified across failed/successful startups.
- Required next recipient: `/code_reviewer` for proportional review of all nine current durable coverage changes before delivery/Electron/user verification resumes.
