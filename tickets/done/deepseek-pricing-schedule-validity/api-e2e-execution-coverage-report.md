# API/E2E Execution Coverage Report

## Execution Round Meta
- Requirements: `/home/autobyteus/workspace/autobyteus-workspace-deepseek-pricing-schedule-validity/tickets/in-progress/deepseek-pricing-schedule-validity/requirements.md`
- Investigation: `/home/autobyteus/workspace/autobyteus-workspace-deepseek-pricing-schedule-validity/tickets/in-progress/deepseek-pricing-schedule-validity/api-e2e-coverage-investigation.md`
- Design Spec: `/home/autobyteus/workspace/autobyteus-workspace-deepseek-pricing-schedule-validity/tickets/in-progress/deepseek-pricing-schedule-validity/design-spec.md`
- Implementation Handoff: `/home/autobyteus/workspace/autobyteus-workspace-deepseek-pricing-schedule-validity/tickets/in-progress/deepseek-pricing-schedule-validity/implementation-handoff.md`
- Code Review: `/home/autobyteus/workspace/autobyteus-workspace-deepseek-pricing-schedule-validity/tickets/in-progress/deepseek-pricing-schedule-validity/code-review-report.md` (CRR-008 Pass)
- Coverage Investigation: `/home/autobyteus/workspace/autobyteus-workspace-deepseek-pricing-schedule-validity/tickets/in-progress/deepseek-pricing-schedule-validity/api-e2e-coverage-investigation.md`
- API/E2E Revision Record: `/home/autobyteus/workspace/autobyteus-workspace-deepseek-pricing-schedule-validity/tickets/in-progress/deepseek-pricing-schedule-validity/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-003`
- Current Execution Round: `3`
- Trigger: CRR-011 requested final confidence-arithmetic correction; targeted E2E already passed.
- Prior Round Reviewed: API-REV-002 Blocked, then API-REV-003 initial Pass.
- Latest Authoritative Round: API-REV-003.

## Investigation And Execution Basis
- Investigation completed before durable coverage change: `Yes`.
- Plan followed: `Yes`; repository_prisma 1.0.10 was installed, shared packages prepared, blocked scenarios rerun, and one focused durable E2E scenario added.
- Reroute required: `No`; CRR-009/TR-001–TR-003 were local test/report fixes and are resolved.

## Compatibility / Legacy Scope Check
- Invalid compatibility scope: `No`.
- Compatibility-only behavior observed: `No`.
- Approved persisted-data decision followed: `Yes — Not Affected`; no migration/read-time repricing.
- Durable coverage for compatibility-only behavior: `No`.

## Changed Boundary And Evidence Matrix
| Scenario | Requirements | Boundary / Surface | Mode | Evidence | Result |
|---|---|---|---|---|---|
| API-001 | AC-001–AC-009, AC-012 | catalog/history/selector/provider | Vitest | `api-e2e-evidence/01`, `02`, `03` | Pass |
| API-002 | AC-011 | calculator/observation enrichment | Vitest | `api-e2e-evidence/02`, `06` | Pass |
| API-003 | AC-010 | provider→calculator | executable probe | `api-e2e-evidence/07-temporary-provider-calculator-probe.log` | Pass |
| API-004 | AC-010–AC-011 | Prisma persistence + GraphQL hydration | E2E | `api-e2e-evidence/16-final-deepseek-provider-persistence-e2e.log` | Pass |
| API-005 | AC-010–AC-011 | token-usage store/integration/lifecycle | integration | `api-e2e-evidence/11-rerun-token-usage-integration.log`, `12-rerun-persistence-lifecycle.log` | Pass |
| API-006 | AC-010, AC-009 | real DeepSeek observed_at→policy→Prisma row | durable E2E | `api-e2e-evidence/16-final-deepseek-provider-persistence-e2e.log` | Pass |

## Additional Repository Coverage Execution
| Order | Command | Result | Evidence |
|---:|---|---|---|
| 1 | `pnpm -C autobyteus-server-ts prepare:shared` | Pass | `api-e2e-evidence/09-prepare-shared.log` |
| 2 | `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/token-usage/token-usage-unit-prices-graphql.e2e.test.ts --no-watch` | Pass, 2/2 | `api-e2e-evidence/16-final-deepseek-provider-persistence-e2e.log` |
| 3 | provider integration + lifecycle suites | Pass, 6/6 and 5/5 | `11-rerun-token-usage-integration.log`, `12-rerun-persistence-lifecycle.log` |

## Validation Confidence Scorecard
| Category | Post-Repository | Final | Change | Evidence / Residual |
|---|---:|---:|---:|---|
| Requirement and acceptance proof | 95% | 96% | +1 | focused history and direct provider-to-persistence assertions |
| Changed-boundary directness | 95% | 96% | +1 | real provider, calculator, store, Prisma read-back |
| Cross-boundary realism and mock gap | 90% | 95% | +5 | Prisma-backed E2E and integration pass |
| Environment/config/fixture fidelity | 90% | 95% | +5 | repository_prisma 1.0.10 and shared build prepare succeed |
| Failure/edge/lifecycle/recovery | 90% | 95% | +5 | invalid/cutover tests plus persistence/lifecycle suites |
| User/browser/desktop-shell | N/A | N/A | 0 | backend-only change |
| Durable regression quality/relevance | 95% | 95% | 0 | focused durable E2E with cleanup and structured assertions |
- Overall post-repository confidence: `90.8%`.
- Overall final confidence: `95.3%` (572 / 6 = 95.333..., rounded to one decimal).
- Every critical acceptance criterion directly proven: `Yes` for the changed deterministic boundary.
- Any applicable category below 90%: `No`.
- Default 95% target met: `Yes`.
- Residual risk: live external-agent runtime tests remain environment-gated/skipped; no live provider credentials are required or appropriate for deterministic catalog pricing.

## Broader Validation Decision And Execution
- Decision: `Not Required` beyond the completed Prisma-backed deterministic E2E.
- Rationale: the changed backend boundary is directly exercised from real provider resolution through calculator and Prisma persistence/read-back; no browser/UI boundary changed.
- Browser validation: not applicable.
- Startup/readiness: Vitest reset SQLite and applied all migrations; shared package build completed.
- Runtime live-agent suite: loaded successfully; 3 tests skipped by explicit environment gate.

## Lifecycle / Persisted Data
- Approved decision: `Not Affected`.
- Representative newly processed observation: DeepSeek Pro at `2026-08-29T02:00:00Z`.
- Result: persisted Prisma row was read back and matched policy identity, output cost `1.98`, pricing summary, and enriched snapshot provenance (schedule, off_peak, effective instant, UTC, peak days, Asia/Shanghai).
- Migration/read-time repricing/dual path: `No`.

## Tests Implemented Or Updated
| Path / Scenario | Change | Requirement / Boundary | Result |
|---|---|---|---|
| `autobyteus-server-ts/tests/e2e/token-usage/token-usage-unit-prices-graphql.e2e.test.ts` — DeepSeek observed_at persistence | Added | AC-009, AC-010; provider→calculator→Prisma | Pass, 2/2 file |

## Durable Coverage Changed In The Codebase
- Repository-resident durable coverage changed: `Yes`.
- Path added/updated: `autobyteus-server-ts/tests/e2e/token-usage/token-usage-unit-prices-graphql.e2e.test.ts`.
- Paths removed: `None`.
- Attached for proportional review: `Yes`.
- Cleanup tracking: new run ID is registered in `createdRunIds`; persisted row is deleted in teardown.

## Temporary Execution Methods / Scaffolding
- Temporary provider/calculator probe was used in API-REV-001 and deleted; no temporary scaffolding remains.

## Dependencies Mocked Or Emulated
- No pricing or persistence dependency mocked in API-006. External LLM provider network calls were not needed; catalog data is deterministic.

## Result Summary
| Result | Scenarios | Summary |
|---|---|---|
| Pass | API-001–API-006 | reviewed pricing behavior and direct provider-to-Prisma persistence evidence pass |

## Cleanup Performed
| Resource / Process / Data | Ownership | Action | Result |
|---|---|---|---|
| Vitest SQLite database | test harness | reset/setup/teardown | Complete |
| DeepSeek E2E run row | test-owned | `createdRunIds` teardown deletion | Complete |
| Generated backend SDK/contract dist | validation-generated | removed after setup | Complete |

## Preliminary Classification
`Pass` — delivery-ready after proportional durable-test review.

## Recommended Recipient
`/code_reviewer` for one bounded proportional durable-test review, then `/delivery_engineer`.

## Latest Authoritative Result
- Result: `Pass`.
- Final validation confidence: `95.3%`.
- Default 95% target met: `Yes`.
- Any final applicable confidence category below 90%: `No`.
- Broader validation decision: `Not Required`.
- Critical acceptance criteria lacking direct proof: `None` for the changed deterministic boundary.
- Required next recipient: `/code_reviewer` for proportional durable-test review.
