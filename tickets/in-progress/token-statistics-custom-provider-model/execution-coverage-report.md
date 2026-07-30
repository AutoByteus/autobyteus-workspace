# API/E2E Execution Coverage Report

## Execution Round Meta

- Requirements Doc: `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/tickets/in-progress/token-statistics-custom-provider-model/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/tickets/in-progress/token-statistics-custom-provider-model/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/tickets/in-progress/token-statistics-custom-provider-model/design-spec.md`
- Supplemental Task Artifacts: `None`
- Solution Revision Record: `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/tickets/in-progress/token-statistics-custom-provider-model/solution-revision-record.md`
- Design Review Report: `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/tickets/in-progress/token-statistics-custom-provider-model/design-review-report.md`
- Architecture Review Revision Record: `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/tickets/in-progress/token-statistics-custom-provider-model/architecture-review-revision-record.md`
- Implementation Handoff: `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/tickets/in-progress/token-statistics-custom-provider-model/implementation-handoff.md`
- Implementation Revision Record: `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/tickets/in-progress/token-statistics-custom-provider-model/implementation-revision-record.md`
- Code Review Report: `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/tickets/in-progress/token-statistics-custom-provider-model/code-review-report.md`
- Code Review Revision Record: `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/tickets/in-progress/token-statistics-custom-provider-model/code-review-revision-record.md`
- Delivery Revision Record (delivery re-entry only): `N/A`
- Relevant Delivery Revision IDs: `N/A`
- Coverage Investigation: `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/tickets/in-progress/token-statistics-custom-provider-model/coverage-investigation.md`
- API/E2E Revision Record: `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/tickets/in-progress/token-statistics-custom-provider-model/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Execution Round: `1`
- Trigger: `code_reviewer` CRR-002 source-review Pass for implementation commit `6176e1525`
- Prior Round Reviewed: `None` (no prior API/E2E result or revision record)
- Latest Authoritative Round: This file

## Investigation And Execution Basis

- Coverage investigation artifact: The canonical coverage investigation above.
- Investigation completed before durable coverage changes or final execution: `Yes`
- Investigation plan followed: `Yes` — the planned GraphQL and migration E2E gaps were added, repository checks ran narrow-to-broad, then live backend/frontend/browser validation closed the remaining user-surface gap.
- Existing coverage decisions revised during execution, with evidence: The GraphQL E2E scenario changed from `Needs Update` to `Updated / Validated`; the statistics-provider integration scenario remained valid because live GraphQL E2E supplied the additive recursive assertion. No tests were removed.
- Reroute required before or during execution: `No`
- Notes: The browser probe used the Nuxt development runtime and configured live backend endpoint. It did not mock or intercept GraphQL responses. The observed Apollo requests were HTTP `200` with no GraphQL errors.

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No` — the approved persisted-data transition is a required one-time migration, not a normal-runtime compatibility wrapper.
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Approved persisted-data transition followed without unnecessary migration or version-specific runtime fallback: `Yes`
- Durable coverage added or retained only for compatibility-only behavior: `No`
- If compatibility-related invalid scope was observed, reroute classification used: `N/A`
- Upstream recipient notified: `N/A`

## Changed Boundary And Evidence Matrix

| Scenario ID | Behavior / Requirement / Acceptance-Criteria IDs | Changed Boundary | Execution Surface / Mode | Evidence Type | Result | Evidence / Artifact |
| --- | --- | --- | --- | --- | --- | --- |
| `UNIT-DISPLAY-001` | REQ-001/003/004/007; AC-001/003/005/007/008 | Model display projection and fallback policy | Vitest unit | Durable | Pass | `token-usage-model-display-projection.test.ts`; 4 tests passed, including corrected malformed cases. |
| `INT-STATS-001` | REQ-001/002/007; AC-001/002/004/008 | Statistics provider and recursive task builder | Vitest integration | Durable | Pass | `statistics-provider.integration.test.ts`; 8 tests passed. |
| `MIG-UNIT-001` | REQ-005/006; AC-006/007 | Migration definition and skip/update policy | Vitest unit | Durable | Pass | `token-usage-custom-provider-model-value-backfill-migration.test.ts`; 3 tests passed. |
| `API-GQL-001` | REQ-001/002/003/006; AC-001/003/004/008 | Real Prisma ledger -> GraphQL Model fields and accounting | Server GraphQL E2E | Durable / Live | Pass | `token-usage-ledger-graphql.e2e.test.ts`; 4 tests passed. |
| `API-GQL-002` | REQ-004/007; AC-002/005/008 | Real recursive Task rows, raw/display arrays, collision fallback | Server GraphQL E2E | Durable / Live | Pass | Same GraphQL E2E scenario; positional arrays and raw IDs asserted. |
| `API-MIG-001` | REQ-005/006; AC-006/007 | Real Prisma migration adapter and warning completion | Server lifecycle E2E | Durable / Live | Pass | `token-usage-custom-provider-model-value-backfill-startup.e2e.test.ts`; warning terminal/explicit retry path passed. |
| `API-MIG-002` | REQ-005/006; AC-006/007 | Partial row failure, durable progress, retry | Server lifecycle E2E | Durable / Live | Pass | Same migration E2E; injected row failure -> `FAILED`, sibling continued, cleared retry -> `SUCCEEDED`. |
| `API-MIG-003` | REQ-006; AC-007 | Full token-usage E2E regression | Server E2E suite | Durable | Pass | `tests/e2e/token-usage --no-watch`: 8 files / 16 tests. |
| `WEB-UNIT-001` | AC-001/002/003/004 | Pinia store and Model/Task table rendering | Nuxt Vitest/happy-dom | Durable | Pass | 3 files / 6 tests passed. |
| `BROWSER-TOK-001` | AC-001/002/003/004 | Settings route, grouping interaction, live data rendering | Chrome + Playwright-core against built server/Nuxt dev runtime | Browser / Live / Temporary | Pass | `probes/api-e2e/browser-result.json`, screenshots, and live GraphQL response. |
| `BUILD-001` | Implementation packaging/build integrity | Production server build and whitespace | pnpm build + diff check | Durable / Build | Pass | Production build and bootstrap smoke passed; `git diff --check` clean. |

## Additional Repository Coverage Execution

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/token-usage/projections/token-usage-model-display-projection.test.ts tests/integration/token-usage/providers/statistics-provider.integration.test.ts tests/unit/app-data-migrations/token-usage-custom-provider-model-value-backfill-migration.test.ts --no-watch` | Worktree root; Vitest project DB reset | Focused server projection/provider/migration regression | Pass — 3 files / 15 tests | Terminal result. |
| 2 | `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/token-usage/token-usage-ledger-graphql.e2e.test.ts tests/e2e/token-usage/token-usage-custom-provider-model-value-backfill-startup.e2e.test.ts --no-watch` | Worktree root; real Prisma E2E DB | Added live GraphQL and migration lifecycle coverage | Pass — 2 files / 6 tests | Terminal result. |
| 3 | `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/token-usage --no-watch` | Worktree root; full token-usage E2E setup | Broader token-usage regression | Pass — 8 files / 16 tests | Terminal result. |
| 4 | `pnpm test:nuxt --run stores/__tests__/tokenUsageStatistics.spec.ts components/settings/token-usage/__tests__/TokenUsageModelStatisticsTable.spec.ts components/settings/token-usage/__tests__/TokenUsageTaskStatisticsTable.spec.ts` | `autobyteus-web`; Nuxt/happy-dom | Frontend store/table regression | Pass — 3 files / 6 tests | Terminal result; expected warnings only. |
| 5 | `pnpm exec nuxt prepare && pnpm guard:web-boundary && pnpm guard:localization-boundary` | `autobyteus-web` | Nuxt generated types and boundary guards | Pass | Terminal result. |
| 6 | `pnpm -C autobyteus-server-ts build && git diff --check` | Worktree root | Production build/bootstrap and whitespace | Pass | Terminal result. |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | Change | New / Final Supporting Evidence | Residual Uncertainty |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 92% | 97% | +5 | Live GraphQL fields, real migration lifecycle, startup migration record, and browser labels close all critical AC paths. | External provider request/credential path is not in scope. |
| Changed-boundary execution directness | 92% | 97% | +5 | Chrome exercises the real Settings route and live backend; API/migration boundaries were already direct. | Electron shell unchanged and not launched. |
| Cross-boundary integration realism and mock gap | 90% | 95% | +5 | Real SQLite/Prisma, HTTP GraphQL, Nuxt runtime, Apollo fetch, and Chrome DOM; no response mocks. | Development browser run used the configured backend endpoint directly, not a Vite proxy hop. |
| Environment, configuration, identity, and fixture fidelity | 91% | 95% | +4 | Isolated `.env`, SQLite, provider metadata, startup migration, deterministic dates, no secrets, and raw identity assertions. | External provider discovery/network not exercised. |
| Failure, edge-case, lifecycle, and recovery evidence | 95% | 95% | 0 | Real warning/failure/retry/sibling continuation E2E plus startup success; unit fallback matrix passed. | No destructive process-level injected startup failure. |
| User-surface, browser, and desktop-shell confidence | 75% | 95% | +20 | Browser semantics, grouping switch, four successful GraphQL responses, and retained screenshots. | Electron packaging/preload/window lifecycle out of scope. |
| Durable regression coverage quality and relevance | 95% | 95% | 0 | Two narrow durable E2E additions plus existing unit/integration/frontend suites and full token-usage E2E. | Browser probe remains temporary; proportional test-code review is pending. |

- Overall post-repository confidence: `90%` (630 / 7, simple average)
- Overall final confidence: `96%` (669 / 7 = 95.57%, rounded)
- Calculation method: simple average of applicable category scores; `N/A` was not used.
- Confidence change produced by broader validation: `+6` percentage points overall, with the largest gain in the browser/user-surface category.
- Every critical acceptance criterion directly proven: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`
- Confidence-limiting residual risks: real external provider network/credentials and Electron shell packaging are not tested because neither is a changed boundary.

## Broader Validation Decision And Execution

- Decision and selected execution mode from the coverage investigation: `Required` — Live API, Lifecycle, and Browser.
- Material deviation from the planned mode or rationale: No material deviation. The browser client resolved the configured live backend URL directly; this is still a real HTTP frontend/backend journey, but it does not claim a Vite proxy hop.
- Confidence gap or residual risk actually addressed: additive GraphQL transport, startup migration execution, provider metadata configuration, Nuxt/Apollo live data, Task/Model grouping, and rendered labels.
- If `Not Required`, direct evidence that made broader validation unnecessary: `N/A`
- If `Blocked`, exact unavailable dependency or access and attempted alternatives: `N/A`
- Startup order, commands, and readiness results: Created isolated `/tmp/token-statistics-custom-provider-browser-pw0Zay` with `.env`, SQLite schema via `prisma migrate deploy`, v2 provider metadata, and two ledger rows; started built server on `127.0.0.1:38201`; `/rest/health` returned `{"status":"ok","message":"Server is running"}`; direct GraphQL returned data and migration status; started Nuxt on `127.0.0.1:38202`; `/settings` returned HTTP `200`; Playwright/Chrome completed both grouping journeys.
- Environment choices that materially affected the run: macOS host, Node 22, isolated SQLite, loopback-only ports, no provider credentials, UTC ledger observations within the default 7-day UI range.
- Seed data, fixtures, identities, authentication, permissions, or session state: `provider_browser` / `alibaba_cloud`; AutoByteus composite `openai-compatible:provider_browser:qwen3.8-max-preview` with legacy composite `model_value`; non-AutoByteus Codex `gpt-5.6-luna`; no authentication or special permissions.

| Scenario / Journey Step | Expected Observable Result | Actual Observable Result | DOM / Screenshot / Log / API / Process Evidence | Result |
| --- | --- | --- | --- | --- |
| Startup and readiness | Isolated server starts against temp DB and migration runner completes | Health returned 200/OK; live `getAppDataMigrations` showed `20260730_token_usage_custom_provider_model_value_backfill` `SUCCEEDED`, attempts `1` | `live-graphql-response.json`; server console; temp root removed after run | Pass |
| Live GraphQL Model query | Raw composite remains `llmModel`; display is `alibaba_cloud:qwen3.8-max-preview`; Codex label remains unchanged | Exactly observed; costs/tokens remained `100/10/1.25` custom and `20/5/0.25` Codex | `live-graphql-response.json` | Pass |
| Live GraphQL Task query | `models` and `modelDisplayNames` remain same length and positionally aligned | Custom row returned raw model plus provider-aware display; arrays aligned; children were empty for standalone seeded rows | `live-graphql-response.json` | Pass |
| Browser route and default Task grouping | Settings page selects Token Statistics and renders custom Task display | `/settings` loaded; `task` selected; Task table contained `alibaba_cloud:qwen3.8-max-preview` and Codex row | `browser-result.json`, `token-usage-task.png` | Pass |
| Browser Model grouping | Selecting `model` renders provider-aware label and does not leak raw composite | `model` selected; label visible; raw `openai-compatible:provider_browser:qwen3.8-max-preview` absent from visible Model table | `browser-result.json`, `token-usage-model.png` | Pass |
| Browser/backend request correlation | Real GraphQL requests succeed without errors | Four observed requests to live backend returned HTTP 200, GraphQL data present, no errors | `browser-result.json` | Pass |

## Desktop Application Validation (When Applicable)

- Validation approach executed and any deviation from the investigation: Browser-first validation was executed for the web-equivalent Nuxt renderer. Electron was not launched because no preload, IPC, native, packaging, or shell lifecycle code changed.
- Browser-tested web-equivalent behavior and evidence: Settings Token Statistics date range, Task/Model selector, provider-aware Model/Task labels, live GraphQL data, and chart were rendered in Chrome; see screenshots and result JSON.
- Shell-specific or lifecycle behavior and evidence: No shell-specific behavior is in scope or changed.
- Effect on any already-running desktop application: `None` — only owned loopback processes were started and stopped.
- Behavior not directly proven and confidence consequence: Electron package/preload/window lifecycle remains unproven but has no material consequence for this web-equivalent change.

## Platform / Runtime Targets

- Operating system / platform: macOS (Apple Silicon host)
- Runtime and relevant framework versions: Node.js 22.x; pnpm workspace; Fastify/type-graphql server; Prisma 5.22.0; Nuxt 3.21.1; Vue 3.5.28; Vitest server 4.0.18 / web 3.2.4.
- Browser / engine and version, when applicable: Installed Google Chrome executable `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`; Playwright-core 1.58.2; headless.
- Device, viewport, locale, timezone, or accessibility settings, when applicable: `1440x1000` viewport; Europe/Berlin host timezone; localized English UI rendered as `Token Statistics`.

## Lifecycle / Upgrade / Restart / Persisted-Data Checks

- Approved persisted-data decision: `Migration Required` for legacy composite `model_value`; canonical raw identity and read-time display are directly usable.
- Representative existing data exercised: Real Prisma ledger rows scoped to `runtime_kind=autobyteus`, `model_provider=OPENAI_COMPATIBLE`, with `model_identifier` and `model_value` equal to `openai-compatible:provider_browser:qwen3.8-max-preview`.
- Direct-use, discard/rebuild, or migration result and evidence: Startup migration changed only `model_value` to `qwen3.8-max-preview`; live GraphQL continued returning raw `modelIdentifier`/`llmModel` and provider-aware display.
- Migration completion/recovery evidence, only when `Migration Required`: Real migration E2E covered warning terminal behavior, explicit retry, row failure with durable partial progress, sibling continuation, and successful retry. Live startup record showed `SUCCEEDED`, attempts `1`.
- Version-specific runtime branch, dual read/write, or compatibility fallback observed: `No`
- Residual untested persisted-data risk: No material in-scope risk remains; destructive process-level migration failure was not injected into a live server process.

## Tests Implemented Or Updated

| Path / Scenario | Change | Requirement / Boundary | Execution Result | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/token-usage/token-usage-ledger-graphql.e2e.test.ts` / `API-GQL-001/002` | Updated | GraphQL Model/Task display fields, raw identity, accounting, recursive alignment | Pass — 4 tests; full token-usage E2E also passed | Adds provider metadata fixture and real schema assertions. |
| `autobyteus-server-ts/tests/e2e/token-usage/token-usage-custom-provider-model-value-backfill-startup.e2e.test.ts` / `API-MIG-001..004` | Added | Prisma migration adapter, runner lifecycle, startup continuation, retry/recovery | Pass — 2 tests; full token-usage E2E also passed | Uses unique rows/records and cleans test state. |

## Tests Removed As Stale Or Obsolete

None.

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes`
- Paths added or updated: `autobyteus-server-ts/tests/e2e/token-usage/token-usage-ledger-graphql.e2e.test.ts`; `autobyteus-server-ts/tests/e2e/token-usage/token-usage-custom-provider-model-value-backfill-startup.e2e.test.ts`
- Paths removed: `None`
- Added or updated paths attached for proportional test-code review: `Yes`
- Diff or repository evidence supplied for removed paths: `N/A`

## Other Execution Artifacts

| Artifact Path | Type / Purpose | Retained Or Temporary | Notes |
| --- | --- | --- | --- |
| `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/tickets/in-progress/token-statistics-custom-provider-model/probes/api-e2e/live-graphql-response.json` | Live GraphQL response and startup migration record | Retained | Direct backend response; includes raw/display/task fields and migration status. |
| `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/tickets/in-progress/token-statistics-custom-provider-model/probes/api-e2e/browser-result.json` | Browser semantic assertions and HTTP response summary | Retained | Four HTTP 200 GraphQL responses, grouping states, visible text. |
| `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/tickets/in-progress/token-statistics-custom-provider-model/probes/api-e2e/token-usage-task.png` | Rendered Task table | Retained | Supporting visual evidence. |
| `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/tickets/in-progress/token-statistics-custom-provider-model/probes/api-e2e/token-usage-model.png` | Rendered Model table/chart | Retained | Supporting visual evidence. |
| `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/tickets/in-progress/token-statistics-custom-provider-model/probes/api-e2e/provider-fixture.json` | Secret-free provider metadata fixture | Retained | Documents isolated provider identity. |
| `/Users/normy/autobyteus_worktrees/token-statistics-custom-provider-model/tickets/in-progress/token-statistics-custom-provider-model/probes/api-e2e/README.md` | Evidence index and cleanup note | Retained | Explains retained artifacts and removed temp root. |

## Temporary Execution Methods / Scaffolding

| Path / Method | Why Needed | Result / Evidence | Cleanup Result |
| --- | --- | --- | --- |
| Temporary Node Prisma seed script and Playwright-core browser probe under `/tmp` | Project has no Token Statistics browser harness; live seed and semantic browser journey were required | Seeded isolated rows/provider metadata; browser probe passed Task/Model assertions | Scripts, browser, Nuxt/backend processes, and isolated data root removed after evidence capture. |
| Isolated `/tmp/token-statistics-custom-provider-browser-pw0Zay` data root | Prevent use of development or user data while exercising startup migration | Real Prisma deploy, app-data migration, and live GraphQL succeeded | Removed after copying reviewable evidence. |

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| External custom-provider API | Not invoked; provider metadata only | Display behavior depends on saved local provider name, not network discovery or model generation | Real provider credentials/network are untested and out of scope. |
| GraphQL response in browser | No mock/interception; live HTTP backend | Real backend was safe and available locally | None for in-scope API/display path. |

## Result Summary

| Result | Scenario IDs | Summary / Reason |
| --- | --- | --- |
| Pass | `UNIT-DISPLAY-001`, `INT-STATS-001`, `MIG-UNIT-001`, `API-GQL-001/002`, `API-MIG-001..004`, `WEB-UNIT-001`, `BROWSER-TOK-001`, `BUILD-001` | All repository, live API, lifecycle, and browser scenarios passed; final confidence 96%. |
| Not Tested / Out Of Scope | `EXT-PROVIDER-001`, `ELECTRON-SHELL-001` | No real provider request/credentials and no Electron shell changes. Neither blocks the in-scope result. |

## Cleanup Performed

| Resource / Process / Data | Ownership | Cleanup Action | Result |
| --- | --- | --- | --- |
| Nuxt dev server on port 38202 | API/E2E run | Sent SIGINT to owned session after browser probe | Stopped cleanly. |
| Built server on port 38201 | API/E2E run | Sent SIGINT to owned session after GraphQL/browser checks | Server logged clean shutdown. |
| Temporary SQLite DB, `.env`, provider file, logs, and generated data directories | API/E2E run | Removed isolated `/tmp/token-statistics-custom-provider-browser-pw0Zay` after copying evidence | Removed; no user/development DB touched. |
| Browser context and temporary `/tmp` probes | API/E2E run | Closed browser; removed temporary scripts after execution | Cleaned. |
| Vitest rows/records | Test-owned setup | Existing E2E afterEach/afterAll cleanup and test DB reset | Passed without residual test data. |

## Preliminary Classification

- Classification: `N/A` — no failure or blocker occurred.
- No local fix, design impact, requirement gap, or unclear finding was discovered.

## Recommended Recipient

`code_reviewer` — successful API/E2E result requires the separate proportional test-code review of the two changed durable test paths.

## Evidence / Notes

- CRR-002 source review Pass was treated only as authorization; API/E2E independently executed the changed boundaries.
- The production server build and `git diff --check` passed after the durable test additions.
- Browser screenshots are supporting evidence; semantic DOM and live HTTP assertions are the pass basis.
- No API/E2E failure IDs exist.

## Latest Authoritative Result

- Result values: `Pass`
- Result: `Pass`
- Final validation confidence: `96%`
- Default `95%` confidence target met: `Yes`
- Any final applicable confidence category below `90%`: `No`
- Broader validation decision: `Required` and completed — Live API, Lifecycle, Browser
- Critical acceptance criteria lacking direct proof: `None`
- Required next recipient: `code_reviewer` for proportional test-code review
- Notes: Preserve the cumulative package and retained live evidence. Delivery must wait for the proportional test-code review result before proceeding.
