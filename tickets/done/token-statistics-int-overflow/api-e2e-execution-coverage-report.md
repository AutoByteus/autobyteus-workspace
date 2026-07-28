# API/E2E Execution Coverage Report

## Execution Round Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-int-overflow/tickets/done/token-statistics-int-overflow/requirements-doc.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-int-overflow/tickets/done/token-statistics-int-overflow/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-int-overflow/tickets/done/token-statistics-int-overflow/design-spec.md`
- Supplemental Task Artifact: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-int-overflow/tickets/done/token-statistics-int-overflow/graphql-token-count-contract.md`
- Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-int-overflow/tickets/done/token-statistics-int-overflow/solution-revision-record.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-int-overflow/tickets/done/token-statistics-int-overflow/implementation-handoff.md`
- Implementation Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-int-overflow/tickets/done/token-statistics-int-overflow/implementation-revision-record.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-int-overflow/tickets/done/token-statistics-int-overflow/code-review-report.md`
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-int-overflow/tickets/done/token-statistics-int-overflow/code-review-revision-record.md`
- Coverage Investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-int-overflow/tickets/done/token-statistics-int-overflow/api-e2e-coverage-investigation.md`
- API/E2E Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-int-overflow/tickets/done/token-statistics-int-overflow/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Execution Round: `2`
- Trigger: source review passed after `SR-001`, `IR-001`, and `CRR-002`; API/E2E resumed to complete native AppConfig setup, Task query coverage, live API, and browser validation.
- Prior Round Reviewed: `Yes` — prior provisional round stopped at 61% and rerouted the compact-primary display conflict.
- Latest Authoritative Round: this report.

## Investigation And Execution Basis

- Coverage investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-int-overflow/tickets/done/token-statistics-int-overflow/api-e2e-coverage-investigation.md`
- Investigation completed before durable coverage changes/final execution: `Yes`.
- Investigation plan followed: `Yes`, with two execution corrections: existing regression files required a temporary AppConfig harness, and Nuxt was restarted with an explicit live backend URL after the generic test script selected unused port 8000.
- Existing coverage decisions revised during execution: the retained provider candidate was valid after adding native AppConfig and the missing `tokenUsageTaskStatisticsInPeriod` selection/assertion. No stale tests were removed.
- Reroute required: `No`.

## Compatibility / Legacy Scope Check

- Requirements/design introduce or tolerate backward compatibility in scope: `No`.
- Compatibility-only or legacy-retention behavior observed: `No`.
- Approved persisted-data transition followed without unnecessary migration or runtime fallback: `Yes` — normal ledger rows were written and read in the current isolated SQLite database.
- Durable coverage retained only for compatibility behavior: `No`.
- Upstream recipient notified: `N/A`.

## Changed Boundary And Evidence Matrix

| Scenario ID | Behavior / Acceptance Criteria | Changed Boundary | Execution Surface / Mode | Evidence Type | Result | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| API-001 | AC-001/AC-002/AC-005 exact overflow through Task, runtime/model, and run-summary paths | Ledger → provider → GraphQL | Native persistence-backed Vitest E2E; live HTTP GraphQL | Durable + Live | Pass | `server-provider-semantics.log`; `api-e2e-live-overflow-check.txt` |
| API-002 | AC-003 smaller counts, recursive task/date/grouping semantics | Existing GraphQL projections | Native persistence-backed Vitest E2E with temporary AppConfig harness | Durable | Pass | `server-regressions-rerun.log` |
| API-003 | AC-003 pricing/aggregate projection regression | Existing pricing GraphQL projections | Native persistence-backed Vitest E2E with temporary AppConfig harness | Durable | Pass | `server-regressions-rerun.log` |
| CONTRACT-001 | SafeInt field inventory and `usageReportCount: Int` | Source schema → generated client | Source schema probe, live introspection, codegen | Durable + Live | Pass | `schema-codegen-contract.log`; `api-e2e-live-schema-check.txt` |
| WEB-001 | AC-002/AC-004 large number retained in Pinia and error lifecycle preserved | GraphQL-shaped payload → store | Nuxt/Vitest store test | Durable | Pass | `web-focused.log` |
| WEB-002 | AC-002 exact primary digits and compact explanatory sublines | Task table renderer | Nuxt/Vitest component test; live browser | Durable + Browser | Pass | `web-focused.log`; `api-e2e-browser-check.txt`; screenshot |
| WEB-003 | AC-003/AC-004 Settings controls, date/grouping/fetch/empty state | Settings component | Nuxt/Vitest component test | Durable | Pass | `web-settings.log` |

## Additional Repository Coverage Execution

| Order | Command | Working Directory / Configuration | Boundary Proven | Result | Evidence |
| --- | --- | --- | --- | --- | --- |
| 1 | `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/token-usage/token-usage-ledger-provider-semantics.e2e.test.ts --no-watch` | Worktree; native Prisma global setup plus per-file temp AppConfig | API-001 | Pass — 1 file / 2 tests | `server-provider-semantics.log` |
| 2 | `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/token-usage/token-usage-ledger-graphql.e2e.test.ts tests/e2e/token-usage/token-usage-unit-prices-graphql.e2e.test.ts --no-watch` | Worktree; rerun under temporary native AppConfig harness | API-002/API-003 | Pass — 2 files / 4 tests | `server-regressions-rerun.log` |
| 3 | `pnpm -C autobyteus-web test:nuxt stores/__tests__/tokenUsageStatistics.spec.ts components/settings/token-usage/__tests__/TokenUsageTaskStatisticsTable.spec.ts components/settings/__tests__/TokenUsageStatistics.spec.ts --run` | Worktree; Nuxt Vitest | WEB-001/WEB-002/WEB-003 | Pass — 3 files / 8 tests | `web-focused.log`, `web-settings.log` |
| 4 | Source schema probe plus `BACKEND_GRAPHQL_BASE_URL=<live>/graphql pnpm -C autobyteus-web codegen` | Disposable SDL/probe and running source-built backend | CONTRACT-001 | Pass | `schema-codegen-contract.log`, `api-e2e-live-schema-check.txt` |
| 5 | `pnpm -C autobyteus-server-ts build` | Worktree; Prisma/shared builds and built-in-agent smoke | Backend source/package build | Pass | source-review evidence; `server-build-typecheck-corrected.log` |
| 6 | `pnpm -C autobyteus-web build` | Worktree; Nuxt production client/server/prerender | Frontend bundle | Pass; existing large-chunk warning only | `broader-checks.log` |
| 7 | `git diff --check` | Worktree | Patch hygiene | Pass | `broader-checks.log` / source-review report |

The package `pnpm ... typecheck` command was also attempted and failed with repository-wide pre-existing `TS6059` errors because `tsconfig.json` includes tests outside `rootDir`. This does not fail the implementation source build, which passed; the exact output is retained in `broader-checks.log`.

## Validation Confidence Scorecard

| Confidence Category | Post-Repository Score | Final Score | Change | New / Final Supporting Evidence | Residual Uncertainty |
| --- | ---: | ---: | --- | --- | --- |
| Requirement and acceptance-criteria proof | 95% | 100% | +5 | Native/live Task, model, run-summary, store, table, and browser evidence all use exact values. | Above `Number.MAX_SAFE_INTEGER` is out of scope. |
| Changed-boundary execution directness | 95% | 100% | +5 | Live source-built GraphQL plus persistence-backed E2E and generated client inventory. | None in approved range. |
| Cross-boundary integration realism and mock gap | 90% | 95% | +5 | Live DB → GraphQL → HTTP → Nuxt browser journey closes the major mock gap. | No production auth/session flow; unchanged boundary. |
| Environment/configuration/identity/fixture fidelity | 90% | 95% | +5 | Native AppConfig, isolated SQLite, unique IDs, explicit backend URL, audited cleanup. | Initial inherited-env disposable probe was immediately deleted. |
| Failure/edge/lifecycle/recovery evidence | 90% | 95% | +5 | Overflow boundary, smaller/pricing regressions, store error lifecycle, no-error browser assertion, process/database cleanup. | SafeInt rejection outside safe range not run. |
| User-surface/browser/desktop-shell confidence | 90% | 95% | +5 | Chrome Settings journey verified exact digits; no shell-specific source changed. | Packaged Electron artifact not executed. |
| Durable regression coverage quality and relevance | 95% | 95% | 0 | API Task query is durable; store/table/settings paths are narrow, deterministic, and passed. | Separate proportional review remains. |

- Overall post-repository confidence: `92%` (simple average, before live/browser validation).
- Overall final confidence: `96%` (675 / 7 = 96.4%, rounded down conservatively).
- Confidence change from broader validation: `+4 percentage points` overall; it removed the material live transport/proxy/rendering uncertainty.
- Every critical acceptance criterion directly proven: `Yes`.
- Any final applicable category below 90%: `No`.
- Default final confidence target of 95% met: `Yes`.
- Confidence-limiting residual risks: packaged Electron shell, authenticated deployment, and out-of-range SafeInt rejection were not tested; none is material to the approved changed boundary.

## Broader Validation Decision And Execution

- Decision: `Required` → completed.
- Selected mode: built backend with owned live test runtime, direct HTTP GraphQL, live schema/codegen, and Chrome browser validation of Settings → Token Statistics.
- Confidence gap addressed: mocked store/component tests did not prove source schema serialization, HTTP integration, proxy configuration, or the final user-visible decimal rendering.
- Startup and readiness: `pnpm server:test` built and reported `TEST_SERVER_READY http://127.0.0.1:59864`; Nuxt dev server was started at `http://127.0.0.1:3000` with `BACKEND_NODE_BASE_URL=http://127.0.0.1:59864`.
- Environment: test runtime root under `autobyteus-server-ts/tests/.tmp/live-e2e-runtime`, SQLite `autobyteus-server-ts/db/test.db`; unique dates/IDs; no credentials.
- Seed: two ledger rows, `1_500_000_000 + 1_636_827_911`, expected gross input `3_136_827_911`, output `30`, total `3_136_827_941`, report count `2`.

| Journey Step | Expected | Actual | Evidence | Result |
| --- | --- | --- | --- | --- |
| Introspect live schema | SafeInt on scoped token outputs; report count remains Int | Exact schema inventory and empty queries had no GraphQL errors | `api-e2e-live-schema-check.txt` | Pass |
| Query live Task aggregate | Task row returns exact numeric overflow aggregate | `grossInputTokens=3136827911`, `outputTokens=30`, `totalTokens=3136827941`, `usageReportCount=2` | `api-e2e-live-overflow-check.txt` | Pass |
| Query live model/run summaries | Same exact aggregate on model and run summary paths | Exact values returned on both paths | `api-e2e-live-overflow-check.txt` | Pass |
| Run Settings → Token Statistics in Chrome | Primary Task input cell shows full decimal digits and no GraphQL error | `3,136,827,911` visible; compact `3.14B` absent from primary cell; error absent | `api-e2e-browser-check.txt`, screenshot | Pass |

## Desktop Application Validation

- Browser-tested shared web-equivalent renderer behavior: yes; Chrome semantic DOM assertions and screenshot are retained.
- Electron shell-specific validation: not run; no preload, IPC, packaging, or shell lifecycle boundary changed.
- Effect on already-running desktop applications: `None`.
- Consequence: packaged artifacts may require delivery/rebuild to receive source changes; this is delivery-stage residual risk.

## Platform / Runtime Targets

- OS/platform: macOS, local worktree.
- Runtime: Node `v22.23.1`; server Vitest `v4.0.18`; web Vitest `v3.2.4`; Nuxt `3.21.1`; Nitro `2.13.1`; Vite `7.3.1`; Vue `3.5.28`.
- Browser: Google Chrome `150.0.7871.127`, Playwright Core `1.58.2`.
- Browser URL/viewport: `http://127.0.0.1:3000/settings`; default local viewport; date inputs `2026-07-21` to `2026-07-28`.

## Lifecycle / Persisted-Data Checks

- Approved persisted-data decision: `Not Affected`.
- Representative existing data: normal Prisma token ledger events written to isolated SQLite and read through the unchanged ledger provider and current GraphQL projections.
- Result: direct use succeeded; no migration, rewrite, cap, compatibility branch, or dual read/write path observed.
- Version-specific runtime fallback observed: `No`.
- Residual persisted-data risk: none for the approved reader and field range; values outside JavaScript safe integer range remain out of scope.

## Tests Implemented Or Updated

| Path / Scenario | Change | Requirement / Boundary | Execution Result | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/token-usage/token-usage-ledger-provider-semantics.e2e.test.ts` / API-001 | Updated | AC-001/AC-002/AC-005; live GraphQL Task path | Pass, 2/2 | API/E2E-owned: native AppConfig setup, Task selection/assertion, unique fixture cleanup. |
| `autobyteus-web/stores/__tests__/tokenUsageStatistics.spec.ts` / WEB-001 | Updated upstream; independently executed | AC-002/AC-004; Pinia numeric state/error lifecycle | Pass, 2/2 | Source-reviewed upstream test change. |
| `autobyteus-web/components/settings/token-usage/__tests__/TokenUsageTaskStatisticsTable.spec.ts` / WEB-002 | Updated upstream; independently executed | AC-002/AC-003; exact primary and compact secondary rendering | Pass, 3/3 | Source-reviewed upstream test change. |
| `autobyteus-web/components/settings/__tests__/TokenUsageStatistics.spec.ts` / WEB-003 | Rechecked | AC-003/AC-004; Settings controls and empty state | Pass, 3/3 | No change needed this round. |

## Tests Removed As Stale Or Obsolete

None. No stale assertion was removed.

## Durable Coverage Changed In The Codebase

- Durable coverage changed: `Yes`.
- Paths added/updated: `autobyteus-server-ts/tests/e2e/token-usage/token-usage-ledger-provider-semantics.e2e.test.ts`; upstream-updated `autobyteus-web/stores/__tests__/tokenUsageStatistics.spec.ts`; upstream-updated `autobyteus-web/components/settings/token-usage/__tests__/TokenUsageTaskStatisticsTable.spec.ts`.
- Paths removed: none.
- Added/updated paths attached for proportional test-code review: `Yes`.
- Removed-path evidence: `N/A`.

## Other Execution Artifacts

| Artifact Path | Purpose | Retained / Temporary | Notes |
| --- | --- | --- | --- |
| `tickets/done/token-statistics-int-overflow/api-e2e-live-schema-check.txt` | Live schema and empty-query assertions | Retained | Source-built GraphQL evidence. |
| `tickets/done/token-statistics-int-overflow/api-e2e-live-overflow-check.txt` | Live HTTP exact aggregate assertions | Retained | Task/model/run-summary evidence and cleanup record. |
| `tickets/done/token-statistics-int-overflow/api-e2e-browser-check.txt` | Browser semantic output | Retained | Exact decimal visible, compact primary absent, no GraphQL error. |
| `tickets/done/token-statistics-int-overflow/api-e2e-settings-token-statistics.png` | Supporting browser screenshot | Retained | Supporting evidence, not sole assertion. |
| `tickets/done/token-statistics-int-overflow/api-e2e-evidence/*.log` | Repository/live setup output | Retained | Includes initial setup failures and corrected reruns. |

## Temporary Execution Methods / Scaffolding

| Method | Why Needed | Result / Evidence | Cleanup |
| --- | --- | --- | --- |
| Temporary AppConfig harness around unchanged regression E2E files | Existing files assume native AppConfig but do not initialize it in this direct invocation | Rerun passed 2 files / 4 tests | Harness/config/temp dirs removed; cleanup reports zero residual ticket rows. |
| Live seed/query scripts and SQLite cleanup | Prove real HTTP transport and browser data without adding a permanent browser fixture | Live API and browser assertions passed | Scripts removed from `/tmp`; run IDs deleted; runtime/database removed. |
| Nuxt custom dev invocation | Generic `pnpm web:test` selected backend port 8000 while live server used 59864 | Corrected browser journey passed | Nuxt process stopped cleanly. |

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| Store unit GraphQL client | Existing test mock | Unit test isolates Pinia state/error behavior | Live HTTP and browser probes separately covered the real transport. |
| External LLM/provider services | Not used | Token ledger rows are sufficient and external services are outside the changed boundary | No provider-network behavior claimed. |

## Result Summary

| Result | Scenario IDs | Summary |
| --- | --- | --- |
| Pass | API-001, API-002, API-003, CONTRACT-001, WEB-001, WEB-002, WEB-003 | Durable repository checks, live schema/HTTP overflow, codegen alignment, and browser Settings journey all passed. |
| Not Tested / Out Of Scope | SAFEINT-OUT-OF-RANGE, ELECTRON-PACKAGED | Above-safe-integer rejection and packaged Electron artifact were not exercised; neither is a critical approved boundary for this ticket. |

## Cleanup Performed

| Resource / Process / Data | Ownership | Cleanup Action | Result |
| --- | --- | --- | --- |
| Focused/regression Vitest test DB | Test runner / owned worktree | Removed `tests/.tmp/autobyteus-server-test.db*` after residual-row audit | No residual test DB/files. |
| Per-file AppConfig temp dirs | API/E2E run | `afterAll` reset provider and removed temp directories | `server-provider-cleanup.log`: none remaining. |
| Live server | API/E2E run | Sent SIGINT after schema/API/browser checks | Closed cleanly. |
| Nuxt dev server | API/E2E run | Sent SIGINT after browser check | Stopped; no owned process remains. |
| Live ledger rows | API/E2E run | Deleted exact API and browser probe run IDs; audited counts | API cleanup completed; browser `before=2`, `after=0`; regression cleanup found zero residual rows. |
| Live runtime root and DB | API/E2E run | Project `removeOwnedTestRuntime` helper | Removed owned runtime and `autobyteus-server-ts/db/test.db`. |
| Temporary scripts | API/E2E run | Removed disposable `/tmp/token-statistics-*` probes | Removed. |

## Classification

- API/E2E outcome: `Pass`.
- No design impact, requirement gap, or implementation failure remains.
- Non-product execution corrections were bounded `Local Fix` items owned by API/E2E and are documented above.

## Recommended Recipient

`code_reviewer` — successful API/E2E requires separate proportional review of changed durable test code.

## Evidence / Notes

- Exact live overflow evidence is independently backed by native repository E2E and live HTTP GraphQL.
- `tokenUsageTaskStatisticsInPeriod` is explicitly selected and asserted in the durable API test, covering the primary Settings page path requested by the supplemental contract.
- The browser result asserts full decimal digits rather than relying on a screenshot alone.
- One initial disposable live-seeder invocation inherited production environment variables and was immediately cleaned by unique run ID (`before=2`, `after=0`); all subsequent execution explicitly unset inherited DB/server variables and used isolated test storage.

## Latest Authoritative Result

- Result: `Pass`.
- Final validation confidence: `96%`.
- Default 95% confidence target met: `Yes`.
- Any final applicable confidence category below 90%: `No`.
- Broader validation decision: `Required` and completed.
- Critical acceptance criteria lacking direct proof: none.
- Required next recipient: `code_reviewer` for proportional test-code review.
