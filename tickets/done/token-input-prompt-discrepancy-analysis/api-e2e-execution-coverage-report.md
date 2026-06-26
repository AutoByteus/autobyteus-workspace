# API/E2E Execution Coverage Report

## Execution Round Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-input-prompt-discrepancy-analysis/tickets/token-input-prompt-discrepancy-analysis/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-input-prompt-discrepancy-analysis/tickets/token-input-prompt-discrepancy-analysis/investigation-notes.md`
- Provider Probe Matrix: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-input-prompt-discrepancy-analysis/tickets/token-input-prompt-discrepancy-analysis/provider-probe-matrix.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-input-prompt-discrepancy-analysis/tickets/token-input-prompt-discrepancy-analysis/design-spec.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-input-prompt-discrepancy-analysis/tickets/token-input-prompt-discrepancy-analysis/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-input-prompt-discrepancy-analysis/tickets/token-input-prompt-discrepancy-analysis/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-input-prompt-discrepancy-analysis/tickets/token-input-prompt-discrepancy-analysis/code-review-report.md`
- Coverage Investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-input-prompt-discrepancy-analysis/tickets/token-input-prompt-discrepancy-analysis/api-e2e-coverage-investigation.md`
- Current Execution Round: 1
- Trigger: Coverage investigation found stale existing token-usage API/E2E/integration coverage after the reviewed implementation changed the public summary/event contract.
- Prior Round Reviewed: N/A
- Latest Authoritative Round: 1

## Round History

| Round | Trigger | Prior Unresolved Failures Rechecked | New Failures Found | Result | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Initial API/E2E coverage execution after code review pass | N/A | No | Pass | Yes | Durable coverage was updated, and all executed targeted checks passed. |

## Execution Basis

Coverage executed the latest reviewed implementation plus API/E2E-owned durable coverage edits. The coverage investigation classified the old summary-field assertions as stale because `inputTokens`, `eventCount`, and `latestContextInputTokens`/`effectiveContextBudgetTokens`/`contextPressurePercent` are no longer the approved Token Meter/GraphQL boundary. Current approved coverage uses `grossInputTokens`, `usageReportCount`, `latestPromptTokens`, `effectiveContextWindowTokens`, and `contextWindowUsagePercent`, plus component token/cost/status fields.

## Pre-Execution Coverage Investigation

- Coverage investigation artifact: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-input-prompt-discrepancy-analysis/tickets/token-input-prompt-discrepancy-analysis/api-e2e-coverage-investigation.md`
- Completed before final test execution, durable coverage edits, durable coverage removals, or failure rerouting: `Yes`
- Existing durable coverage inventory reviewed: `Yes`
- Existing tests treated as authority without current-requirement validity review: `No`
- Stale or obsolete coverage found: `Yes`
- New durable coverage needed: `Yes`
- Reroute required from investigation: `No`
- Notes: Stale assertions were coverage/API contract drift, not implementation defects. They were updated according to the investigation plan.

## Existing Durable Coverage Decision Summary

| Path / Scenario | Validity Decision (`Still Valid`/`Needs Update`/`Stale / Remove`/`Replace`/`Out Of Scope`/`Unclear`) | Action Taken | Evidence |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/token-usage/token-usage-ledger-graphql.e2e.test.ts` | Needs Update | Updated to expanded GraphQL summary fields and cached gross-input/mixed-currency assertions; split model-list and provider-semantics scenarios into focused sibling E2E files. | Passed in targeted server token-usage E2E/integration command. |
| `autobyteus-server-ts/tests/e2e/token-usage/token-usage-ledger-provider-semantics.e2e.test.ts` | Add Durable Coverage | Added for Anthropic additive/cache-write, custom endpoint missing price, local/no-bill, and historical unknown/partial GraphQL summaries. | Passed in targeted server token-usage E2E/integration command. |
| `autobyteus-server-ts/tests/e2e/token-usage/token-usage-model-list.e2e.test.ts` | Still Valid / Split | Preserved pre-existing MiniMax M2.7 removal regression in focused file while shrinking the main GraphQL E2E file. | Passed in targeted server token-usage E2E/integration command. |
| `autobyteus-server-ts/tests/e2e/runtime/token-usage-runtime-graphql.e2e.test.ts` | Needs Update | Updated gated live WebSocket/GraphQL assertions to new summary/event field names. | Default execution passed as skipped: 1 file / 3 skipped because `RUN_RUNTIME_TOKEN_USAGE_E2E` was not enabled. |
| `autobyteus-server-ts/tests/integration/token-usage/providers/token-usage-store.integration.test.ts` | Needs Update | Updated ledger summary assertions and added cached gross, Anthropic additive/cache-write, local/no-bill, custom missing price, historical unknown/partial behavior. | Passed in targeted server token-usage E2E/integration command. |
| `autobyteus-server-ts/tests/integration/token-usage/repositories/token-usage-record-repository.integration.test.ts` | Needs Update | Added SQL round-trip coverage for new semantic/component/pricing/context columns. | Passed in targeted server token-usage E2E/integration command. |
| `autobyteus-server-ts/tests/integration/token-usage/providers/statistics-provider.integration.test.ts` | Still Valid | Retained and executed unchanged; settings statistics API still intentionally uses `promptTokens`/`assistantTokens`. | Passed in targeted server token-usage E2E/integration command. |
| `autobyteus-web/stores/__tests__/tokenUsageMeterStore.spec.ts` | Still Valid | Executed as frontend live/hydration state coverage. | Passed. |
| `autobyteus-web/components/workspace/usage/__tests__/TokenUsageMeterPanel.spec.ts` | Still Valid | Executed as UI hierarchy/rendering coverage. | Passed. |
| Code-review unit test suites | Still Valid | Re-ran targeted server and `autobyteus-ts` unit suites after durable coverage edits. | Passed. |

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Durable coverage added or retained only for compatibility-only behavior: `No`
- If compatibility-related invalid scope was observed, reroute classification used: N/A
- Upstream recipient notified: N/A

The durable coverage does not preserve old public `inputTokens`/`eventCount`/context-pressure field names for the changed Token Meter summary boundary. Historical unknown rows are covered as `partial_price_missing` with missing dimensions instead of using the old flat cache formula.

## Execution Surfaces / Modes

- Server GraphQL API E2E against an in-process TypeGraphQL schema and Prisma SQLite test database.
- Server ledger-store and SQL repository integration tests with Prisma migration reset.
- Gated real-runtime WebSocket/GraphQL E2E static/default execution path (`describe.skip` without `RUN_RUNTIME_TOKEN_USAGE_E2E=1`).
- Frontend Pinia/store and Vue component executable tests for live update, hydration replacement, and Token Meter hierarchy.
- Existing server and `autobyteus-ts` unit regressions as broader executable confidence for core provider semantics and pricing.

## Platform / Runtime Targets

- Host: macOS/Darwin local worktree environment.
- Node/pnpm project runtimes used by repository scripts.
- Prisma SQLite test database: `autobyteus-server-ts/tests/.tmp/autobyteus-server-test.db`, reset by Vitest global setup.
- No live paid-provider calls were made in this API/E2E round.

## Lifecycle / Upgrade / Restart / Migration Checks

- Prisma migrations were applied by test global setup on every server Vitest run, including `20260625193000_token_usage_component_pricing_explainability`.
- No installer/updater/restart/migration-lifecycle scenario beyond Prisma test DB migration was in scope.

## Coverage Matrix

| Scenario ID | Boundary | Durable / Temporary | Result | Evidence |
| --- | --- | --- | --- | --- |
| API-COV-001 | GraphQL cached gross-input summary exposes component fields/costs/rates/current prompt/usage reports | Durable | Pass | `token-usage-ledger-graphql.e2e.test.ts`; targeted server E2E command passed. |
| API-COV-002 | GraphQL Anthropic additive/base-excludes-cache and cache-write subtype summary | Durable | Pass | `token-usage-ledger-provider-semantics.e2e.test.ts`; targeted server E2E command passed. |
| API-COV-003 | Custom OpenAI-compatible missing pricing remains price-missing/null cost | Durable | Pass | GraphQL provider-semantics E2E + ledger-store integration passed. |
| API-COV-004 | Local/no-provider-bill status remains `local_no_api_bill` and zero cost | Durable | Pass | GraphQL provider-semantics E2E + ledger-store integration passed. |
| API-COV-005 | Historical unknown semantic rows are partial/missing, not legacy-priced | Durable | Pass | GraphQL provider-semantics E2E + ledger-store integration passed. |
| API-COV-006 | SQL repository round-trips new component/pricing/context columns | Durable | Pass | SQL repository integration passed. |
| API-UPD-002 | Gated real-runtime WebSocket/GraphQL E2E field names updated | Durable | Skipped by default, file executed successfully as skipped | `tests/e2e/runtime/token-usage-runtime-graphql.e2e.test.ts` run: 3 skipped because env flag not enabled. |
| WEB-COV-001 | Frontend live payload aggregation and reload summary replacement | Durable | Pass | `tokenUsageMeterStore.spec.ts` passed. |
| WEB-COV-002 | Token Meter displays approved hierarchy/labels and omits raw `Events` | Durable | Pass | `TokenUsageMeterPanel.spec.ts` passed. |

## Test Scope

Focused on the changed API/E2E and executable coverage surfaces for token usage summary hydration, live update readiness, provider-specific semantics, persistence, and UI display. It intentionally did not repeat upstream paid-provider live probes or full app visual validation because those were already captured in upstream evidence and implementation handoff; this round updates deterministic durable coverage suitable for local/CI execution.

## Execution Setup / Environment

Commands were executed from `/Users/normy/autobyteus_org/autobyteus-worktrees/token-input-prompt-discrepancy-analysis`. Server Vitest global setup reset the SQLite test DB. Frontend tests used `NUXT_TEST=true`.

## Tests Implemented Or Updated

Repository-resident durable coverage changed this round:

- Updated: `autobyteus-server-ts/tests/e2e/token-usage/token-usage-ledger-graphql.e2e.test.ts`
- Added: `autobyteus-server-ts/tests/e2e/token-usage/token-usage-ledger-provider-semantics.e2e.test.ts`
- Added: `autobyteus-server-ts/tests/e2e/token-usage/token-usage-model-list.e2e.test.ts`
- Updated: `autobyteus-server-ts/tests/e2e/runtime/token-usage-runtime-graphql.e2e.test.ts`
- Updated: `autobyteus-server-ts/tests/integration/token-usage/providers/token-usage-store.integration.test.ts`
- Updated: `autobyteus-server-ts/tests/integration/token-usage/repositories/token-usage-record-repository.integration.test.ts`

## Tests Removed As Stale Or Obsolete

| Path / Scenario | Obsolete Assertion | Upstream Evidence | Replacement Coverage Or No-Replacement Rationale |
| --- | --- | --- | --- |
| None removed | N/A | N/A | Obsolete assertions were updated or split into current coverage. |

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes`
- Paths added or updated:
  - `autobyteus-server-ts/tests/e2e/token-usage/token-usage-ledger-graphql.e2e.test.ts`
  - `autobyteus-server-ts/tests/e2e/token-usage/token-usage-ledger-provider-semantics.e2e.test.ts`
  - `autobyteus-server-ts/tests/e2e/token-usage/token-usage-model-list.e2e.test.ts`
  - `autobyteus-server-ts/tests/e2e/runtime/token-usage-runtime-graphql.e2e.test.ts`
  - `autobyteus-server-ts/tests/integration/token-usage/providers/token-usage-store.integration.test.ts`
  - `autobyteus-server-ts/tests/integration/token-usage/repositories/token-usage-record-repository.integration.test.ts`
- Paths removed: None
- If `Yes`, returned through `code_reviewer` before delivery: `No` at report write time; this report is being prepared for return to `code_reviewer`.
- Post-API/E2E coverage code review artifact: Pending code reviewer follow-up.

## Other Execution Artifacts

- Coverage investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-input-prompt-discrepancy-analysis/tickets/token-input-prompt-discrepancy-analysis/api-e2e-coverage-investigation.md`
- Execution report: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-input-prompt-discrepancy-analysis/tickets/token-input-prompt-discrepancy-analysis/api-e2e-execution-coverage-report.md`
- Upstream implementation visual evidence remains available:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/token-input-prompt-discrepancy-analysis/tickets/token-input-prompt-discrepancy-analysis/implementation-evidence/2026-06-25-codex-gpt55-token-meter-summary.json`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/token-input-prompt-discrepancy-analysis/tickets/token-input-prompt-discrepancy-analysis/implementation-evidence/2026-06-25-codex-gpt55-token-meter-ui-report.json`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/token-input-prompt-discrepancy-analysis/tickets/token-input-prompt-discrepancy-analysis/implementation-evidence/2026-06-25-codex-gpt55-token-meter.png`

## Temporary Execution Methods / Scaffolding

No temporary repository scaffolding was added. No temporary files require cleanup beyond normal test database reset behavior.

## Dependencies Mocked Or Emulated

- Server API/E2E and integration tests use deterministic constructed token usage payloads and an in-process GraphQL schema.
- Prisma uses a reset SQLite test database.
- Frontend tests mock the token usage store or use Pinia in test mode.
- No live provider credentials, paid API calls, or external network dependencies were required.

## Prior Failure Resolution Check (Mandatory On Round >1)

| Prior Round | Scenario / Failure Reference | Previous Classification | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| N/A | N/A | N/A | N/A | N/A | First execution round. |

## Scenarios Checked

- GraphQL run/team/member expanded summary hydration for cached gross input and component costs.
- GraphQL settings statistics still aggregate persisted ledger fields correctly.
- GraphQL mixed currency behavior returns aggregate token totals but null monetary totals/status `mixed`.
- GraphQL provider-specific semantics for Anthropic additive input/cache-write subtypes.
- GraphQL custom endpoint missing price, local/no-bill, and historical unknown/partial behavior.
- SQL repository round-trip of new columns.
- Ledger store aggregation of component tokens/costs/rates/statuses.
- Gated runtime WebSocket/GraphQL E2E updated to current field names and verified as skipped by default.
- Frontend live store aggregation/reload replacement and Token Meter component hierarchy.
- Existing provider normalizer/pricing/event-enrichment unit coverage.

## Passed

- `pnpm -C autobyteus-server-ts exec vitest run tests/integration/token-usage/providers/token-usage-store.integration.test.ts tests/integration/token-usage/repositories/token-usage-record-repository.integration.test.ts tests/integration/token-usage/providers/statistics-provider.integration.test.ts tests/e2e/token-usage/token-usage-ledger-graphql.e2e.test.ts tests/e2e/token-usage/token-usage-ledger-provider-semantics.e2e.test.ts tests/e2e/token-usage/token-usage-model-list.e2e.test.ts` — passed, 6 files / 19 tests.
- `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/token-usage-runtime-graphql.e2e.test.ts` — passed as skipped by default, 1 file / 3 skipped (`RUN_RUNTIME_TOKEN_USAGE_E2E` not enabled).
- `pnpm -C autobyteus-web exec cross-env NUXT_TEST=true vitest run stores/__tests__/tokenUsageMeterStore.spec.ts components/workspace/usage/__tests__/TokenUsageMeterPanel.spec.ts` — passed, 2 files / 7 tests.
- `pnpm -C autobyteus-server-ts exec vitest run tests/unit/token-usage/pricing/token-cost-calculator.test.ts tests/unit/token-usage/projections/token-usage-snapshot-delta-normalizer.test.ts tests/unit/agent-execution/events/token-usage-event-enrichment-transformer.test.ts tests/unit/agent-execution/backends/codex/codex-agent-run-backend.test.ts tests/unit/agent-execution/backends/codex/thread/codex-thread.test.ts tests/unit/agent-execution/backends/claude/session/claude-session-token-usage.test.ts` — passed, 6 files / 42 tests.
- `pnpm -C autobyteus-ts exec vitest run tests/unit/llm/api/token-usage-normalizers.test.ts tests/unit/llm/extensions/token-usage-tracking-extension.test.ts tests/unit/llm/utils/llm-config.test.ts tests/unit/llm/supported-model-definitions.test.ts` — passed, 4 files / 39 tests.
- `git diff --check` — passed.

## Failed

None.

## Not Tested / Out Of Scope

- Paid-provider live probes were not repeated; upstream probe matrix and evidence cover them, and durable CI coverage intentionally uses deterministic payloads.
- Full running-app browser visual QA was not repeated; implementation handoff already includes REQ-031 visual QA commands, run ID, screenshot, and summary/UI evidence.
- Gated real-runtime WebSocket E2E was not executed with `RUN_RUNTIME_TOKEN_USAGE_E2E=1`; default execution confirmed the updated file loads and skips cleanly.
- Delivery-stage durable docs sync is out of API/E2E scope.

## Blocked

None.

## Cleanup Performed

- No temporary execution scaffolding was left in the repository.
- Server Vitest global setup reset the test database for each server test command.

## Classification

- `Local Fix`: N/A
- `Design Impact`: N/A
- `Requirement Gap`: N/A
- `Unclear`: N/A

No failure classification applies. The result is a pass with durable coverage changes.

## Recommended Recipient

`code_reviewer`

Because repository-resident durable coverage was added and updated after the earlier code review, the package must return through `code_reviewer` before delivery.

## Evidence / Notes

- Current branch remains behind `origin/personal` by 1 commit; per workflow, delivery owns base refresh before final handoff.
- No implementation source changes were made in API/E2E stage; only durable coverage files and API/E2E artifacts were added/updated.
- Existing runtime-live E2E remains environment-gated and should be used for manual/runtime validation when credentials and runtime services are intentionally enabled.

## Latest Authoritative Result

- Result values: `Pass` / `Fail` / `Blocked`
- Result: `Pass`
- Notes: Durable API/E2E/integration coverage now matches the reviewed implementation's token usage summary contract. Because coverage code changed, this pass is pending code review before delivery.
