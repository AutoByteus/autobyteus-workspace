# API/E2E Execution Coverage Report

## Execution Round Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-run-team-analysis/tickets/in-progress/token-statistics-run-team-analysis/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-run-team-analysis/tickets/in-progress/token-statistics-run-team-analysis/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-run-team-analysis/tickets/in-progress/token-statistics-run-team-analysis/design-spec.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-run-team-analysis/tickets/in-progress/token-statistics-run-team-analysis/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-run-team-analysis/tickets/in-progress/token-statistics-run-team-analysis/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-run-team-analysis/tickets/in-progress/token-statistics-run-team-analysis/code-review-report.md`
- Coverage Investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-run-team-analysis/tickets/in-progress/token-statistics-run-team-analysis/api-e2e-coverage-investigation.md`
- Current Execution Round: 1
- Trigger: Code review passed and requested API/E2E coverage investigation/execution for Settings > Token Statistics task/team run redesign.
- Prior Round Reviewed: N/A — first API/E2E execution round.
- Latest Authoritative Round: Round 1 in this report.

## Round History

| Round | Trigger | Prior Unresolved Failures Rechecked | New Failures Found | Result | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Code-review handoff to API/E2E | N/A | None | Pass | Yes | Durable backend GraphQL E2E and frontend store/component coverage added; focused API/E2E/executable checks passed. |

## Execution Basis

Execution followed the approved requirements/design and the coverage investigation decisions. The tested scope was the real API/UI boundary for the historical Settings token usage redesign: task/team grouping, team member nesting/no double counting, runtime/model diagnostics, created-time fallback, explicit `Usage during period` semantics with no `rangeMode`, cost breakdown/status copy, and generated GraphQL document/schema consistency.

## Pre-Execution Coverage Investigation

- Coverage investigation artifact: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-run-team-analysis/tickets/in-progress/token-statistics-run-team-analysis/api-e2e-coverage-investigation.md`
- Completed before final test execution, durable coverage edits, durable coverage removals, or failure rerouting: `Yes`
- Existing durable coverage inventory reviewed: `Yes`
- Existing tests treated as authority without current-requirement validity review: `No`
- Stale or obsolete coverage found: `No`
- New durable coverage needed: `Yes`
- Reroute required from investigation: `No`
- Notes: Existing provider/ledger tests remained valid. Backend GraphQL and Settings UI/store durable coverage gaps were filled.

## Existing Durable Coverage Decision Summary

| Path / Scenario | Validity Decision (`Still Valid`/`Needs Update`/`Stale / Remove`/`Replace`/`Out Of Scope`/`Unclear`) | Action Taken | Evidence |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/integration/token-usage/providers/statistics-provider.integration.test.ts` | Still Valid | Retained and executed | Passed in focused integration run, 5 tests in file. |
| `autobyteus-server-ts/tests/integration/token-usage/providers/token-usage-store.integration.test.ts` | Still Valid | Retained and executed | Passed in focused integration run, 7 tests in file. |
| `autobyteus-server-ts/tests/e2e/token-usage/token-usage-ledger-graphql.e2e.test.ts` | Needs Update | Updated with task statistics and runtime/model GraphQL E2E scenario | Passed, 3 tests total. |
| `autobyteus-server-ts/tests/e2e/token-usage/token-usage-ledger-provider-semantics.e2e.test.ts` | Still Valid | Retained; not required for focused new-path run because cost status semantics are also covered by provider tests and updated GraphQL E2E | Existing durable coverage remains valid. |
| `autobyteus-server-ts/tests/e2e/runtime/token-usage-runtime-graphql.e2e.test.ts` | Still Valid / Out Of Scope for mandatory local run | Not executed; env-gated real-runtime coverage | Not required for historical Settings statistics projection. |
| `autobyteus-web/stores/tokenUsageStatistics.ts` | Needs Update (coverage missing) | Added store durable coverage | `autobyteus-web/stores/__tests__/tokenUsageStatistics.spec.ts` passed, 2 tests. |
| `autobyteus-web/components/settings/TokenUsageStatistics.vue` | Needs Update (coverage missing) | Added page durable coverage | `autobyteus-web/components/settings/__tests__/TokenUsageStatistics.spec.ts` passed, 3 tests. |
| `autobyteus-web/components/settings/token-usage/TokenUsageTaskStatisticsTable.vue` | Needs Update (coverage missing) | Added task-table durable coverage | `TokenUsageTaskStatisticsTable.spec.ts` passed, 2 tests. |
| `autobyteus-web/components/settings/token-usage/TokenUsageModelStatisticsTable.vue` | Needs Update (coverage missing) | Added model-table durable coverage | `TokenUsageModelStatisticsTable.spec.ts` passed, 1 test. |

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Durable coverage added or retained only for compatibility-only behavior: `No`
- If compatibility-related invalid scope was observed, reroute classification used: N/A
- Upstream recipient notified: N/A

Evidence: implementation handoff legacy section was reviewed; focused static scan after validation returned no source matches for `rangeMode`, `Tasks created in period`, or `getStatisticsPerModel` outside tests that assert absence.

## Execution Surfaces / Modes

- Backend GraphQL E2E against the TypeGraphQL schema and SQLite test ledger store.
- Backend provider/ledger integration tests against the test database/mocked enricher seams.
- Frontend Pinia store/component tests under Nuxt/Vitest/happy-dom.
- Static checks for range-mode absence and generated GraphQL drift.
- Build/schema/codegen probes against built server output.

## Platform / Runtime Targets

- Host: macOS local worktree.
- Node/pnpm workspace packages already installed.
- Backend: `autobyteus-server-ts` Vitest/TypeScript/build, SQLite test DB.
- Frontend: `autobyteus-web` Nuxt/Vitest.
- No real Codex/Claude/Autobyteus runtime execution required for this historical projection/UI validation.

## Lifecycle / Upgrade / Restart / Migration Checks

No native desktop lifecycle, installer, updater, restart, or data migration behavior is in scope. Database migration reset was exercised by backend Vitest setup for token usage E2E/integration tests.

## Coverage Matrix

| Scenario ID | Surface | Behavior Covered | Result | Evidence |
| --- | --- | --- | --- | --- |
| API-001 | Backend GraphQL E2E | `tokenUsageTaskStatisticsInPeriod` returns repeated root team rows and standalone rows sorted by created time, nests members, avoids standalone duplication of team members, exposes fallback `FIRST_USAGE_OBSERVED`, aggregate tokens/cost/status/missing dimensions | Pass | `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/token-usage/token-usage-ledger-graphql.e2e.test.ts` passed, 3 tests. |
| API-002 | Backend GraphQL E2E | `usageStatisticsInPeriod` groups same model by runtime/model pair and exposes runtime plus aggregate fields | Pass | Same GraphQL E2E run passed. |
| WEB-STORE-001 | Frontend store | Store sends only `startTime`/`endTime` to both queries, no `rangeMode`, normalizes task/member/model aggregates, unknown fallbacks, and GraphQL errors | Pass | `tokenUsageStatistics.spec.ts` passed, 2 tests. |
| WEB-UI-001 | Settings page | `By Task` default, static `Usage during period`, no range-mode copy, fetch button/date range behavior, tab switching, empty states | Pass | `TokenUsageStatistics.spec.ts` passed, 3 tests. |
| WEB-UI-002 | Task table | Created-time default sort, fallback label, mixed runtime/model display, team expansion, member attachment, top-level cost sort, cost breakdown, thinking included, missing dimensions | Pass | `TokenUsageTaskStatisticsTable.spec.ts` passed, 2 tests. |
| WEB-UI-003 | Model table | Runtime column, same model under Codex/Autobyteus separate rows, Unknown runtime fallback, cache/thinking diagnostics, chart labels | Pass | `TokenUsageModelStatisticsTable.spec.ts` passed, 1 test. |
| PROBE-001 | Build/schema | Built GraphQL schema loads from server dist | Pass | `schema ok` probe passed. |
| PROBE-002 | Codegen consistency | Built schema and frontend documents are compatible; generated artifact drift detected | Pass with residual delivery note | Schema-file codegen passed; `generated/graphql.ts` would change by 629 lines and was restored because this API/E2E pass did not persist generated output. |
| PROBE-003 | Static legacy scan | No source `rangeMode`, `Tasks created in period`, or `getStatisticsPerModel` residue | Pass | `rg` command produced no source matches. |

## Test Scope

In scope:
- Task/team and runtime/model statistics API results.
- Settings page, store, task table, model table, and cost details behavior.
- No-double-counting, fallback, empty/error/loading-adjacent states, static MVP date semantics.
- Focused build/schema/codegen consistency.

Out of scope:
- Full browser/Electron visual smoke.
- Real runtime token event production.
- Future `Tasks created in period` mode.

## Execution Setup / Environment

- Working directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-run-team-analysis`
- Backend tests used the repository's Vitest Prisma reset against `autobyteus-server-ts/tests/.tmp/autobyteus-server-test.db`.
- Frontend tests used existing Nuxt Vitest test setup; warnings observed were the existing KaTeX quirks-mode warning and non-Electron server initialization messages.
- Codegen probe used a built server schema printed to `/tmp/token-api-e2e-schema.graphql` and ran `BACKEND_GRAPHQL_BASE_URL=/tmp/token-api-e2e-schema.graphql pnpm -C autobyteus-web codegen`.

## Tests Implemented Or Updated

- Updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-run-team-analysis/autobyteus-server-ts/tests/e2e/token-usage/token-usage-ledger-graphql.e2e.test.ts`
  - Added task statistics/runtime-model GraphQL E2E scenario for task rows, repeated teams, no member double-counting, fallback metadata, nested members, status/missing dimensions, and runtime/model grouping.
- Added: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-run-team-analysis/autobyteus-web/stores/__tests__/tokenUsageStatistics.spec.ts`
- Added: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-run-team-analysis/autobyteus-web/components/settings/__tests__/TokenUsageStatistics.spec.ts`
- Added: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-run-team-analysis/autobyteus-web/components/settings/token-usage/__tests__/TokenUsageTaskStatisticsTable.spec.ts`
- Added: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-run-team-analysis/autobyteus-web/components/settings/token-usage/__tests__/TokenUsageModelStatisticsTable.spec.ts`

## Tests Removed As Stale Or Obsolete

| Path / Scenario | Obsolete Assertion | Upstream Evidence | Replacement Coverage Or No-Replacement Rationale |
| --- | --- | --- | --- |
| None | N/A | N/A | N/A |

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes`
- Paths added or updated:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-run-team-analysis/autobyteus-server-ts/tests/e2e/token-usage/token-usage-ledger-graphql.e2e.test.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-run-team-analysis/autobyteus-web/stores/__tests__/tokenUsageStatistics.spec.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-run-team-analysis/autobyteus-web/components/settings/__tests__/TokenUsageStatistics.spec.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-run-team-analysis/autobyteus-web/components/settings/token-usage/__tests__/TokenUsageTaskStatisticsTable.spec.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-run-team-analysis/autobyteus-web/components/settings/token-usage/__tests__/TokenUsageModelStatisticsTable.spec.ts`
- Paths removed: None
- If `Yes`, returned through `code_reviewer` before delivery: `Pending` — handoff from this report must go to `code_reviewer`.
- Post-API/E2E coverage code review artifact: Pending.

## Other Execution Artifacts

- `/tmp/token-api-e2e-web-typecheck.log` — broad web typecheck failure log; grep for `TokenUsage|token-usage|tokenUsageStatistics` produced zero matches after fixing the local test typing issue.
- `/tmp/token-api-e2e-schema.graphql` — temporary printed built schema for the codegen probe.
- `/tmp/token-api-e2e-generated-graphql.before.ts` — temporary backup used to restore generated output after codegen drift probe.

## Temporary Execution Methods / Scaffolding

- Temporary codegen/schema probe files were created under `/tmp` only.
- An initial live Fastify URL codegen attempt reached `Load GraphQL schemas` and did not complete within local probe time; it was interrupted and left no generated diff. A schema-file codegen probe from the same built GraphQL schema then passed quickly and provided the needed document/schema consistency evidence.
- `autobyteus-web/generated/graphql.ts` was restored after the schema-file codegen probe because the probe was not intended to introduce non-coverage generated source changes during API/E2E. The detected generated-output drift remains a delivery/finalization note.

## Dependencies Mocked Or Emulated

- Frontend tests mocked localization and Apollo client/store dependencies where appropriate.
- Backend GraphQL E2E wrote synthetic ledger events through `TokenUsageLedgerStore` and used missing run-history metadata intentionally to exercise `First usage observed` fallback.
- No external provider/runtime was mocked for real token generation because that boundary is outside this change.

## Prior Failure Resolution Check (Mandatory On Round >1)

| Prior Round | Scenario / Failure Reference | Previous Classification | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| N/A | N/A | N/A | N/A | First execution round. | N/A |

## Scenarios Checked

Commands run and latest outcomes:

- `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/token-usage/token-usage-ledger-graphql.e2e.test.ts` — passed, 1 file / 3 tests.
- `pnpm -C autobyteus-server-ts exec vitest run tests/integration/token-usage/providers/statistics-provider.integration.test.ts tests/integration/token-usage/providers/token-usage-store.integration.test.ts` — passed, 2 files / 12 tests.
- `pnpm -C autobyteus-web exec vitest run components/settings/__tests__/TokenUsageStatistics.spec.ts components/settings/token-usage/__tests__/TokenUsageTaskStatisticsTable.spec.ts components/settings/token-usage/__tests__/TokenUsageModelStatisticsTable.spec.ts stores/__tests__/tokenUsageStatistics.spec.ts` — passed, 4 files / 8 tests.
- `git diff --check` — passed.
- `rg -n "rangeMode|Tasks created in period|getStatisticsPerModel" autobyteus-server-ts/src autobyteus-web/components autobyteus-web/stores autobyteus-web/graphql autobyteus-web/types autobyteus-web/localization --glob '!**/__tests__/**'` — no matches.
- `pnpm -C autobyteus-web guard:web-boundary && pnpm -C autobyteus-web guard:localization-boundary && pnpm -C autobyteus-web audit:localization-literals` — passed; audit emitted only the known Node module-type warning.
- `pnpm -C autobyteus-web exec nuxi prepare` — passed.
- `pnpm -C autobyteus-web exec nuxi typecheck` — failed on existing broad baseline issues; `/tmp/token-api-e2e-web-typecheck.log` had zero token-usage matches.
- `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit` — passed.
- `pnpm -C autobyteus-server-ts build` — passed.
- From `autobyteus-server-ts`: `node -e "import('reflect-metadata').then(() => import('./dist/api/graphql/schema.js')).then(async m => { await m.buildGraphqlSchema(); console.log('schema ok'); })"` — passed with `schema ok`.
- `BACKEND_GRAPHQL_BASE_URL=/tmp/token-api-e2e-schema.graphql pnpm -C autobyteus-web codegen` after printing built schema — passed; generated output drift detected and restored.

## Passed

All API/E2E-owned focused scenarios passed. Durable coverage now exists for the backend GraphQL task/runtime-model boundary and the frontend Settings token usage store/page/table behavior.

## Failed

No API/E2E failures requiring implementation or design reroute.

Known broad baseline failure:
- `pnpm -C autobyteus-web exec nuxi typecheck` remains red on repository-wide pre-existing issues. The latest log at `/tmp/token-api-e2e-web-typecheck.log` had zero matches for `TokenUsage`, `token-usage`, or `tokenUsageStatistics`.

## Not Tested / Out Of Scope

- Full browser/Electron visual smoke for the Settings page.
- Real provider/runtime token usage generation.
- Future range mode / `Tasks created in period` behavior, explicitly out of scope and absent.

## Blocked

None for API/E2E pass. Generated GraphQL artifact freshness is a residual delivery/finalization decision: codegen compatibility passed, but `autobyteus-web/generated/graphql.ts` was not persisted in this API/E2E round.

## Cleanup Performed

- Restored `autobyteus-web/generated/graphql.ts` after codegen drift probe.
- Left only `/tmp` temporary probe files/logs outside repository.
- No temporary repository-resident scaffolding remains.

## Classification

No reroute classification required; result is Pass.

## Recommended Recipient

`code_reviewer` — repository-resident durable coverage was added/updated after the initial code review and must receive the required coverage-code re-review before delivery.

## Evidence / Notes

- Durable coverage additions are narrow and boundary-local.
- No stale coverage removals were needed.
- No compatibility wrappers, fake range-mode selector, or old model-only default path were found.
- The UI component coverage is executable component-level coverage, not a full rendered browser visual pass.
- Generated GraphQL drift probe confirmed documents/schema compatibility but detected generated artifact drift; this should be reviewed/decided downstream rather than silently ignored.

## Latest Authoritative Result

- Result values: `Pass` / `Fail` / `Blocked`
- Result: `Pass`
- Notes: API/E2E validation passed. Because durable coverage changed after code review, route to `code_reviewer` for coverage-code re-review.
