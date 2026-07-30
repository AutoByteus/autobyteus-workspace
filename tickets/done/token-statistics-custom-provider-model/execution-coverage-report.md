# API/E2E Execution Coverage Report

## Execution Round Meta

- Requirements Doc: `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/tickets/done/token-statistics-custom-provider-model/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/tickets/done/token-statistics-custom-provider-model/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/tickets/done/token-statistics-custom-provider-model/design-spec.md`
- Supplemental Task Artifacts: `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/tickets/done/token-statistics-custom-provider-model/probes/api-e2e/api-rev-002/` (retained evidence; approval `N/A`)
- Solution Revision Record: `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/tickets/done/token-statistics-custom-provider-model/solution-revision-record.md`
- Design Review Report: `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/tickets/done/token-statistics-custom-provider-model/design-review-report.md`
- Architecture Review Revision Record: `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/tickets/done/token-statistics-custom-provider-model/architecture-review-revision-record.md`
- Implementation Handoff: `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/tickets/done/token-statistics-custom-provider-model/implementation-handoff.md`
- Implementation Revision Record: `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/tickets/done/token-statistics-custom-provider-model/implementation-revision-record.md`
- Code Review Report: `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/tickets/done/token-statistics-custom-provider-model/code-review-report.md`
- Code Review Revision Record: `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/tickets/done/token-statistics-custom-provider-model/code-review-revision-record.md`
- Delivery Revision Record: `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/tickets/done/token-statistics-custom-provider-model/delivery-revision-record.md` (stale downstream context only)
- Relevant Delivery Revision IDs: `DR-N/A`; delivery artifacts predate `SR-006`.
- Coverage Investigation: `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/tickets/done/token-statistics-custom-provider-model/coverage-investigation.md`
- API/E2E Revision Record: `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/tickets/done/token-statistics-custom-provider-model/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-002`
- Current Execution Round: `2`
- Trigger: `code_reviewer` CRR-005 Pass for commit `9e3d8d86e` (`IR-004`) after `SR-006`; prior API/E2E artifacts were stale.
- Prior Round Reviewed: `API-REV-001` / pre-`SR-006` execution
- Latest Authoritative Round: This report

## Investigation And Execution Basis

- Coverage investigation: `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/tickets/done/token-statistics-custom-provider-model/coverage-investigation.md`
- Investigation completed before durable coverage changes/final execution: `Yes`
- Investigation plan followed: `Yes`, with one bounded fixture correction. The first full E2E run failed because the legacy-path test's manually selected SQL migrations omitted the new `provider_name` schema migration; the fixture was updated and the targeted plus full reruns passed.
- Existing coverage decision revised during execution: `token-usage-legacy-path-columns-drop-startup.e2e.test.ts` changed from `Still Valid` setup to `Needs Update`; it now applies the current provider schema before importing the current Prisma client.
- Reroute required: `No`; this was API/E2E-owned `Local Fix`, completed before final result.

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce or tolerate backward compatibility in scope: `No` beyond the explicitly approved persisted-data migration.
- Compatibility-only/runtime legacy retention observed: `No`.
- Approved persisted-data transition followed without a runtime version shim: `Yes`.
- Durable coverage added only for compatibility-only behavior: `No`; coverage proves the approved Migration A/B data transition.
- Reroute classification: `Local Fix` for the stale isolated test schema fixture; no upstream recipient required.

## Changed Boundary And Evidence Matrix

| Scenario ID | Behavior / Acceptance Criteria | Boundary | Execution Surface / Mode | Evidence Type | Result | Evidence / Artifact |
| --- | --- | --- | --- | --- | --- | --- |
| `API-PROD-001` | New AutoByteus observation persists provider snapshot; direct Codex remains nullable | Producer -> Prisma | Unit/integration plus real Prisma E2E | Durable | Pass | `agent-run-token-usage-provider-name.test.ts`; normalizer tests; GraphQL E2E persisted-row assertion |
| `API-GQL-003` | Raw composite remains raw identity while display includes provider; built-in and direct labels remain correct | GraphQL | Real Prisma GraphQL E2E and live HTTP | Durable/Live | Pass | `token-usage-ledger-graphql.e2e.test.ts`; `live-graphql-before-provider-delete.json` |
| `API-GQL-004` | Recursive Task `models`/`modelDisplayNames` remain aligned with accounting and row identity | GraphQL/task projection | Real GraphQL E2E and Chrome | Durable/Live/Browser | Pass | Full token-usage E2E; browser screenshots/result |
| `API-MIG-005` | Migration B startup maps custom/built-in names and skips direct scope | Persistence/lifecycle | Real Prisma adapter + AppDataMigrationRunner | Durable/Live | Pass | `token-usage-provider-name-snapshot-backfill-startup.e2e.test.ts`; live migration status |
| `API-MIG-006` | Warning terminal behavior, explicit retry, injected failure, durable partial progress, sibling continuation | Migration lifecycle | Real runner E2E | Durable | Pass | New Migration B startup E2E (`2` tests) |
| `API-MIG-007` | Migration B preserves all non-provider fields and row count | Persistence invariant | Real Prisma E2E plus direct live Prisma read | Durable/Live | Pass | `persisted-rows-before-provider-delete.json`; migration summary invariant |
| `API-GQL-005` | Historical display remains stable after custom provider config deletion | Snapshot-first read | Live GraphQL after file deletion | Live | Pass | `live-graphql-after-provider-delete.json` |
| `BROWSER-TOK-002` | Settings Task/Model grouping renders persisted provider display and hides raw composite | Nuxt/Apollo/browser | Playwright-core + Chrome | Browser | Pass | `browser-result.json`, `token-usage-task.png`, `token-usage-model.png` |
| `BUILD-002` | Production server build, Prisma generation, bootstrap smoke, web guards | Build/package boundary | pnpm build/guards | Durable | Pass | Command output; `git diff --check` |

## Additional Repository Coverage Execution

| Order | Command | Working Directory / Configuration | Boundary / Scenario | Result | Evidence |
| --- | --- | --- | --- | --- | --- |
| 1 | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/app-data-migrations/token-usage-provider-name-snapshot-backfill-migration.test.ts tests/unit/app-data-migrations/token-usage-custom-provider-model-value-backfill-migration.test.ts tests/unit/token-usage/projections/token-usage-model-display-projection.test.ts tests/unit/agent-execution/domain/agent-run-token-usage-provider-name.test.ts tests/integration/token-usage/providers/statistics-provider.integration.test.ts tests/integration/token-usage/repositories/token-usage-record-repository.integration.test.ts --no-watch` | Workspace root | Migration A/B, projection, producer, provider, SQL | Pass — `6` files / `28` tests | Vitest output; new schema migration applied |
| 2 | `pnpm exec vitest run tests/unit/llm/api/token-usage-normalizers.test.ts --no-watch` | `autobyteus-ts` | Shared provider propagation | Pass — `1` file / `9` tests | Vitest output |
| 3 | `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/token-usage/token-usage-provider-name-snapshot-backfill-startup.e2e.test.ts --no-watch` | Workspace root | Migration B real runner | Pass — `1` file / `2` tests | Vitest output |
| 4 | `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/token-usage/token-usage-ledger-graphql.e2e.test.ts --no-watch` | Workspace root | GraphQL provider snapshot/deletion E2E | Pass — `1` file / `4` tests | Vitest output |
| 5 | Initial `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/token-usage --no-watch` | Workspace root | Full token-usage E2E | Initial `Fail` in legacy fixture before product path; classified Local Fix | Missing provider schema SQL; captured in investigation |
| 6 | `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/token-usage/token-usage-legacy-path-columns-drop-startup.e2e.test.ts --no-watch` | Workspace root | Updated legacy fixture | Pass — `1` file / `2` tests | Vitest output |
| 7 | Final `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/token-usage --no-watch` | Workspace root | Full token-usage E2E | Pass — `9` files / `18` tests | Final Vitest output |
| 8 | `pnpm test:nuxt stores/__tests__/tokenUsageStatistics.spec.ts components/settings/token-usage/__tests__/TokenUsageModelStatisticsTable.spec.ts components/settings/token-usage/__tests__/TokenUsageTaskStatisticsTable.spec.ts --run` | `autobyteus-web` | Store and tables | Pass — `3` files / `6` tests | Vitest output |
| 9 | `pnpm exec nuxt prepare && pnpm guard:web-boundary && pnpm guard:localization-boundary` | `autobyteus-web` | Generated types and boundary guards | Pass | Nuxt/guard output |
| 10 | `pnpm -C autobyteus-server-ts build && git diff --check` | Workspace root | Production build, Prisma generation, smoke, whitespace | Pass | Build output; no diff-check errors |

## Validation Confidence Scorecard

| Confidence Category | Post-Repository Score | Final Score | Change | New / Final Supporting Evidence | Residual Uncertainty |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | `92%` | `97%` | `+5` | Live GraphQL, startup records, direct Prisma facts, and deletion stability cover AC-001..011. | No external provider invocation. |
| Changed-boundary execution directness | `92%` | `97%` | `+5` | Real Prisma/runner, HTTP GraphQL, Nuxt route, Apollo fetch, and Chrome DOM. | Electron shell not launched. |
| Cross-boundary integration realism and mock gap | `90%` | `95%` | `+5` | Isolated built backend and live Nuxt/browser; no response interception. | Provider network excluded. |
| Environment/configuration/identity/fixture fidelity | `90%` | `95%` | `+5` | Production-like temp `.env`, real migration deploy, provider file, deterministic rows/dates, clean ports. | macOS/SQLite only. |
| Failure/edge/lifecycle/recovery evidence | `95%` | `95%` | `0` | Real runner warning/failure/retry/sibling evidence plus live A/B startup statuses. | No live destructive failure injection. |
| User-surface/browser/desktop-shell confidence | `75%` | `95%` | `+20` | Chrome semantic assertions, four live backend GraphQL responses, screenshots, Task/Model switch. | Electron shell remains out of scope. |
| Durable regression coverage quality/relevance | `95%` | `95%` | `0` | Two new/updated durable E2E paths, current-schema fixture, full folder pass. | Separate proportional test-code review pending. |

- Overall post-repository confidence: `90%` (simple average; `89.86%` rounded).
- Overall final confidence: `96%` (simple average `95.57%`, rounded).
- Confidence change from broader validation: `+6` percentage points.
- Every critical acceptance criterion directly proven: `Yes`.
- Any final applicable category below `90%`: `No`.
- Default final confidence target of `95%` met: `Yes`.
- Residual risks: external provider credentials/network, alternate DB engines, and Electron packaging/preload/window lifecycle remain untested and out of scope.

## Broader Validation Decision And Execution

- Decision: `Required`, completed as `Live API + Lifecycle + Browser`.
- Deviation: Browser GraphQL requests went directly to configured backend `http://127.0.0.1:38301/graphql`, not through a Vite proxy hop; this is reported accurately and still proves real frontend/backend transport.
- Gap addressed: built-server startup migrations, persisted provider snapshot, provider deletion stability, live GraphQL fields, Nuxt route, and rendered Task/Model tables.
- Startup/setup: created isolated temp root; applied all `19` Prisma migrations; seeded three rows; started built server on `38301`; GraphQL returned status and data; started Nuxt on `38302`; `/settings` returned `200`; Playwright/Chrome passed both grouping journeys.
- Cleanup: SIGINT stopped both owned sessions cleanly; browser closed; temp data root and scripts removed; ports confirmed free.

| Journey Step | Expected | Actual | Evidence | Result |
| --- | --- | --- | --- | --- |
| Startup and migration status | Migrations A and B complete after Prisma startup | A `SUCCEEDED` `attempts=1`, B `SUCCEEDED` `attempts=1`; B summary `scanned=3`, `migrated=2`, `skipped=1`, `failed=0`; legacy cleanup also succeeded | `live-graphql-before-provider-delete.json` | Pass |
| Direct persisted row check | Custom has provider `alibaba_cloud` and normalized suffix; built-in has `DeepSeek`; Codex remains null; accounting unchanged | Exactly observed; all three rows retain `accountingTotalTokens=110` and cost `1.25` | `persisted-rows-before-provider-delete.json` | Pass |
| Live Model/Task GraphQL | Raw composite remains raw; provider-aware display and task arrays are aligned | Custom `llmModel` stayed composite and display was `alibaba_cloud:qwen3.8-max-preview`; built-in and Codex labels were correct | before/after live GraphQL JSON | Pass |
| Provider deletion stability | Removing current provider config must not change historical snapshot display | Provider file deleted while backend stayed up; same custom display returned | `live-graphql-after-provider-delete.json` | Pass |
| Browser Task grouping | Settings route and Task grouping render provider-aware labels | Token Statistics selected; custom, DeepSeek, and Codex labels visible | `browser-result.json`, `token-usage-task.png` | Pass |
| Browser Model grouping | Model table shows display labels and hides raw composite | Model selected; `alibaba_cloud:qwen3.8-max-preview` visible; raw composite absent | `browser-result.json`, `token-usage-model.png` | Pass |
| Browser transport | Live frontend/backend GraphQL responses succeed | Four backend GraphQL responses, all HTTP `200`, data present, no errors; no console errors | `browser-result.json` | Pass |

## Desktop Application Validation

- Browser-first validation was executed for the web-equivalent Nuxt renderer. Electron was not launched because no shell-specific code changed.
- Proven in browser: Settings route, Token Statistics selector, date range fetch, Task/Model grouping, provider-aware labels, chart, and live GraphQL transport.
- Not directly proven: Electron preload/IPC/window/package lifecycle; no material consequence for this web-equivalent scope.
- Effect on any already-running desktop app: `None`; only owned loopback processes were used.

## Platform / Runtime Targets

- macOS Apple Silicon; Node.js 22.x; pnpm workspace; Prisma 5.22.0; server Vitest 4.0.18; Nuxt 3.21.1; Vue 3.5.28; web Vitest 3.2.4.
- Installed Google Chrome `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`; Playwright-core 1.58.2; headless.
- Browser viewport `1440x1200`, loopback-only ports, Europe/Berlin host timezone, English UI (`Token Statistics`).

## Lifecycle / Upgrade / Persisted-Data Checks

- Approved transition: `Migration Required` for legacy composite value and AutoByteus provider snapshot; no runtime compatibility shim.
- Existing data exercised: legacy custom composite, built-in null snapshot, direct Codex null snapshot, and a current provider registry file.
- Result: Migration A normalized only the custom `model_value`; Migration B wrote provider snapshots only to eligible AutoByteus rows; direct Codex stayed null; GraphQL and direct Prisma showed preserved raw/accounting values.
- Recovery: durable E2E proved warning terminal behavior, explicit retry, injected update failure, partial progress, sibling continuation, and successful retry; live startup proved terminal success and ordering.
- Version-specific runtime branch/dual read/write/fallback: `No`.
- Residual persisted-data risk: no material in-scope risk remains; non-SQLite engine behavior and destructive process failure were not tested.

## Tests Implemented Or Updated

| Path / Scenario | Change | Requirement / Boundary | Execution Result | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/token-usage/token-usage-ledger-graphql.e2e.test.ts` | Updated | Provider snapshot persistence, GraphQL display, provider deletion | Pass — `4` tests; full suite pass | Adds real Prisma persisted-row and deletion assertions. |
| `autobyteus-server-ts/tests/e2e/token-usage/token-usage-provider-name-snapshot-backfill-startup.e2e.test.ts` | Added | Migration B real lifecycle/recovery/invariants | Pass — `2` tests; full suite pass | Uses real Prisma/runner and deterministic cleanup. |
| `autobyteus-server-ts/tests/e2e/token-usage/token-usage-legacy-path-columns-drop-startup.e2e.test.ts` | Updated | Current schema fixture validity | Pass — `2` tests; full suite pass | Adds the new provider_name schema migration to manually applied setup. |

## Tests Removed As Stale Or Obsolete

None.

## Durable Coverage Changed In The Codebase

- Added/updated/removed this round: `Yes` — two paths updated and one added.
- Paths: the three E2E paths listed above.
- Paths removed: `None`.
- Attached for proportional test-code review: `Yes`.

## Other Execution Artifacts

| Artifact Path | Type / Purpose | Retained / Temporary | Notes |
| --- | --- | --- | --- |
| `probes/api-e2e/api-rev-002/live-graphql-before-provider-delete.json` | Startup/live GraphQL response and migration records | Retained | Direct backend response before deleting provider file. |
| `probes/api-e2e/api-rev-002/live-graphql-after-provider-delete.json` | Historical display stability response | Retained | Same display after provider config deletion. |
| `probes/api-e2e/api-rev-002/persisted-rows-before-provider-delete.json` | Direct Prisma persisted facts | Retained | Provider, raw value, and accounting proof. |
| `probes/api-e2e/api-rev-002/browser-result.json` | Browser semantic assertions and HTTP response summary | Retained | Four live GraphQL `200` responses; no console errors. |
| `probes/api-e2e/api-rev-002/token-usage-task.png` | Rendered Task view | Retained | Supporting visual evidence. |
| `probes/api-e2e/api-rev-002/token-usage-model.png` | Rendered Model view/chart | Retained | Supporting visual evidence. |
| `probes/api-e2e/api-rev-002/provider-fixture.json` | Secret-free provider metadata | Retained | No credentials. |
| `probes/api-e2e/api-rev-002/README.md` | Evidence index | Retained | Scope and cleanup recorded. |

## Temporary Execution Methods / Scaffolding

| Method | Why Needed | Result | Cleanup |
| --- | --- | --- | --- |
| Temporary Prisma seed and Playwright probe under `/tmp` | No focused durable browser harness; live provider/migration data needed | Live startup/API/browser pass | Scripts removed. |
| Isolated temp SQLite/data root | Avoid development/user data | Real schema/migration/GraphQL startup pass | Root removed; ports free. |

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Not Real | Limitation |
| --- | --- | --- | --- |
| External custom-provider API | Not invoked; local metadata only | Display/migration contract does not call provider | Provider credentials/network untested; out of scope. |
| GraphQL in browser | No mock/interception; direct live HTTP | Local backend available | None for in-scope transport. |

## Result Summary

| Result | Scenario IDs | Summary |
| --- | --- | --- |
| Pass | `API-PROD-001`, `API-GQL-003/004/005`, `API-MIG-005/006/007`, `BROWSER-TOK-002`, `BUILD-002` | Focused, full E2E, live startup/API, browser, build, and guards passed. Final confidence `96%`. |
| Out Of Scope / Not Tested | `EXT-PROVIDER-001`, `ELECTRON-SHELL-001` | No provider calls or Electron packaging; neither is a changed boundary. |

## Cleanup Performed

| Resource | Ownership | Action | Result |
| --- | --- | --- | --- |
| Nuxt session port `38302` | API/E2E run | SIGINT after browser probe | Stopped. |
| Built backend port `38301` | API/E2E run | SIGINT after GraphQL/browser checks | Clean shutdown logged. |
| Temp SQLite, `.env`, provider file, logs, memory/download dirs | API/E2E run | Removed isolated temp root | Removed; no shared DB touched. |
| Browser and temporary scripts | API/E2E run | Closed/removed after evidence copy | Cleaned. |
| Vitest DB rows/records | Test-owned setup | Existing hooks and resets | No residual test data. |

## Preliminary Classification

- Final classification: `N/A` — no product failure or blocker remained.
- Intermediate initial full-suite failure: `Local Fix` owned by `api_e2e_engineer`; stale manual schema fixture was corrected and all reruns passed.

## Recommended Recipient

`code_reviewer` — successful API/E2E result requires the separate proportional test-code review of the three changed durable E2E paths.

## Evidence / Notes

- CRR-005 was treated only as authorization; API/E2E independently exercised Migration B through real Prisma/runner, GraphQL, startup, and browser paths.
- F-001 and F-002 remain resolved upstream; no API/E2E failure IDs exist.
- Browser screenshots support, but do not replace, semantic DOM and live HTTP assertions.
- External provider credentials/network and Electron packaging remain explicitly out of scope.

## Latest Authoritative Result

- Result: `Pass`
- Final validation confidence: `96%`
- Default `95%` target met: `Yes`
- Any final applicable category below `90%`: `No`
- Broader validation: `Required` and completed — Live API, Lifecycle, Browser
- Critical acceptance criteria lacking direct proof: `None`
- Required next recipient: `code_reviewer` for proportional test-code review
- Notes: Preserve current evidence and cumulative package; delivery artifacts must be refreshed after test-code review.
