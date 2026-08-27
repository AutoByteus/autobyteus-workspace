# API/E2E Coverage Investigation

## Investigation Meta
- Requirements Doc: `/home/autobyteus/workspace/autobyteus-workspace-deepseek-pricing-schedule-validity/tickets/in-progress/deepseek-pricing-schedule-validity/requirements.md`
- Investigation Notes: `/home/autobyteus/workspace/autobyteus-workspace-deepseek-pricing-schedule-validity/tickets/in-progress/deepseek-pricing-schedule-validity/investigation-notes.md`
- Design Spec: `/home/autobyteus/workspace/autobyteus-workspace-deepseek-pricing-schedule-validity/tickets/in-progress/deepseek-pricing-schedule-validity/design-spec.md`
- Supplemental Task Artifacts: `/home/autobyteus/workspace/autobyteus-workspace-deepseek-pricing-schedule-validity/provider-error-and-pricing-contract.md`
- Solution Revision Record: `/home/autobyteus/workspace/autobyteus-workspace-deepseek-pricing-schedule-validity/tickets/in-progress/deepseek-pricing-schedule-validity/solution-revision-record.md`
- Design Review Report: `/home/autobyteus/workspace/autobyteus-workspace-deepseek-pricing-schedule-validity/tickets/in-progress/deepseek-pricing-schedule-validity/design-review-report.md`
- Architecture Review Revision Record: `/home/autobyteus/workspace/autobyteus-workspace-deepseek-pricing-schedule-validity/tickets/in-progress/deepseek-pricing-schedule-validity/architecture-review-revision-record.md`
- Implementation Handoff: `/home/autobyteus/workspace/autobyteus-workspace-deepseek-pricing-schedule-validity/tickets/in-progress/deepseek-pricing-schedule-validity/implementation-handoff.md`
- Implementation Revision Record: `/home/autobyteus/workspace/autobyteus-workspace-deepseek-pricing-schedule-validity/tickets/in-progress/deepseek-pricing-schedule-validity/implementation-revision-record.md`
- Code Review Report: `/home/autobyteus/workspace/autobyteus-workspace-deepseek-pricing-schedule-validity/tickets/in-progress/deepseek-pricing-schedule-validity/code-review-report.md`
- Code Review Revision Record: `/home/autobyteus/workspace/autobyteus-workspace-deepseek-pricing-schedule-validity/tickets/in-progress/deepseek-pricing-schedule-validity/code-review-revision-record.md`
- Current API/E2E Revision ID: `API-REV-003`
- Current Investigation Round: `3`
- Trigger: CRR-011 final confidence-arithmetic correction after API-REV-003 durable E2E pass.
- Prior Investigation Reviewed: API-REV-001 and API-REV-002; latest authoritative result is API-REV-003.

## Current Requirement And Design Basis
The changed behavior is effective-dated DeepSeek V4 pricing selected from observation time, with explicit UTC windows and Asia/Shanghai weekday calendar, exact historical/current rates, fail-closed invalid timestamps, selected-policy provenance, immutable persisted snapshots, and unchanged non-DeepSeek/local/generic pricing paths. Critical acceptance criteria are AC-001–AC-011; AC-012 requires no stale pre-cutover expectation.

## Changed Behavior Summary
| Behavior / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
|---|---|---|---|
| BEH-001/002: history, cutovers, weekday/timezone/window selection | Changed | REQ-001–REQ-007; AC-001–AC-007; DS-001/DS-004 | focused selector/provider/catalog coverage; no UI needed |
| BEH-003: invalid time fail closed | Preserved | REQ-008; AC-008 | provider regression coverage |
| BEH-004: provenance and policy identity | Changed | REQ-009; AC-009 | provider coverage; persistence boundary inspection/execution |
| BEH-005: observation processing and immutable stored results | Preserved/extended | REQ-010; AC-010–AC-011; DS-002/DS-003 | run existing token-usage E2E plus targeted executable observation path |
| Provider-neutral and contract behavior | Preserved/changed | REQ-011/REQ-012; AC-011 | focused catalog/provider tests and contract review |

## Changed Surface And Boundary Classification
| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised | Candidate Broader Validation Mode |
|---|---|---|---|---|---|
| Domain/backend logic | Yes | catalog history, selector, provider policy mapping | selector/provider/catalog tests | real persistence event path | API/E2E executable |
| API/transport/contract | Indirect | token usage payload and GraphQL projections consume snapshots | token-usage GraphQL E2E suites | provider-generated policy through API | Live API/E2E |
| Frontend/browser/desktop | No | backend pricing-only | N/A | none | None |
| Process/lifecycle | No material change | no startup/migration path changed | existing migration tests | none for change | None |
| Persisted-data transition | No | approved `Not Affected`; stored outcomes immutable | implementation/code review evidence | representative old snapshot through current reader not directly tied to new code | targeted persistence E2E if feasible |
| Worker/distributed/external integration | No | none | N/A | none | None |

## Project Execution Discovery
- Assigned worktree: `/home/autobyteus/workspace/autobyteus-workspace-deepseek-pricing-schedule-validity`
- Stack: pnpm workspace, TypeScript, Vitest, Fastify/GraphQL server, Prisma test setup.
- Required secrets: no secrets required for deterministic pricing tests; live provider calls are not appropriate.

| Instruction / Configuration Path | Authority / Constraints |
|---|---|
| `autobyteus-server-ts/AGENTS.md` | all tests: `pnpm -C autobyteus-server-ts exec vitest`; integration: `... vitest run tests/integration --no-watch`; single file: `... vitest run <file> --no-watch` |
| `autobyteus-server-ts/package.json` | build/typecheck/test scripts; test pre-hook prepares shared packages |
| `autobyteus-server-ts/vitest.config.ts` | Node environment, fork pool, Prisma setup/global setup, tests/**/*.test.ts |
| `autobyteus-ts/package.json` | build command is `pnpm --filter autobyteus-ts build` |
| root `package.json` | documented e2e command `pnpm test:e2e` and real-e2e preflight; no frontend relevance |

| Component | Setup / Readiness | Cleanup |
|---|---|---|
| Server Vitest + Prisma global setup | invoked by Vitest; setup files provision test DB | Vitest exits and global teardown handles owned test resources |
| autobyteus-ts build | compile/package prerequisite | generated dist is ignored/expected |

## Persisted Data Transition Coverage Basis
- Approved decision: `Not Affected`.
- Basis: design spec, implementation handoff, and CRR-006 explicitly state no migration/read-time repricing; existing snapshots remain immutable.
- Evidence planned: run existing token-usage GraphQL persistence/read suites; do not invent migration coverage.

## Existing Durable Coverage Inventory
| Path / Scenario | Intent | Decision | Evidence / Action |
|---|---|---|---|
| `tests/unit/token-usage/pricing/token-pricing-schedule-selector.test.ts` | history/calendar/window/cutover selector | Still Valid | already 14/14; rerun |
| `tests/unit/token-usage/pricing/token-price-config-provider.test.ts` | provider rates/provenance/invalid time | Still Valid | already 10/10; rerun |
| `tests/unit/llm/supported-model-definitions.test.ts` | catalog history projection | Still Valid | already 5/5; rerun |
| `tests/e2e/token-usage/token-usage-unit-prices-graphql.e2e.test.ts` | persisted token-usage GraphQL unit-price projection plus DeepSeek provider-to-Prisma scenario | Still Valid, updated | durable E2E directly proves provider selection, persistence, and structured provenance |
| `tests/e2e/runtime/token-usage-runtime-graphql.e2e.test.ts` | runtime token usage GraphQL path | Still Valid, bounded | suite loads; live-agent cases remain explicitly environment-gated |
| token-usage integration suites under `tests/integration/token-usage` | storage/projection persistence | Still Valid | provider/store/lifecycle regression suites pass |
| stale historical expectations | Stale / Remove | AC-012; code review confirms none remain | no removal planned |

## Stale Or Obsolete Coverage Decisions
None. No durable coverage is removed.

## Durable Coverage To Add / Update / Remove
- Add/update: `autobyteus-server-ts/tests/e2e/token-usage/token-usage-unit-prices-graphql.e2e.test.ts` now contains a durable DeepSeek observed_at-to-Prisma persistence scenario.
- The scenario registers its run ID for teardown, resolves the real provider/calculator boundary, reads the persisted Prisma row back, and asserts policy identity, output cost, and structured schedule provenance.
- Remove: none.

## API-REV-003 Execution Results
| Scenario | Boundary | Result | Evidence |
|---|---|---|---|
| API-001 | catalog/history/selector/provider | Pass | `api-e2e-evidence/01`, `02`, `03` |
| API-002 | calculator/observation enrichment | Pass | `api-e2e-evidence/02`, `06` |
| API-004 | Prisma persistence and GraphQL hydration | Pass | `api-e2e-evidence/16-final-deepseek-provider-persistence-e2e.log` |
| API-005 | token-usage store/integration/lifecycle | Pass | `api-e2e-evidence/11-rerun-token-usage-integration.log`, `12-rerun-persistence-lifecycle.log` |
| API-006 | DeepSeek observed_at → policy → Prisma read-back | Pass | `api-e2e-evidence/16-final-deepseek-provider-persistence-e2e.log` |

Commands completed: `pnpm -C autobyteus-server-ts prepare:shared`; targeted token-usage E2E (2/2); provider integration (6/6); persistence lifecycle (3/3); pricing summary (2/2). The live-runtime suite loaded successfully; its three live-agent cases remain explicitly environment-gated/skipped.

## Current Confidence Scorecard
| Category | Score | Current Evidence | Residual |
|---|---:|---|---|
| Requirement and acceptance-criteria proof | 96% | history/cutover/invalid-time and direct AC-009/AC-010 assertions | no live external provider call, intentionally unnecessary |
| Changed-boundary execution directness | 96% | real provider, calculator, Prisma store, and Prisma read-back | none material |
| Cross-boundary integration realism and mock gap | 95% | Prisma-backed E2E and integration pass | live runtime cases gated |
| Environment/config/fixture fidelity | 95% | repository_prisma 1.0.10 and shared build preparation pass | none material |
| Failure/edge-case/lifecycle/recovery | 95% | focused edge tests and persistence/lifecycle suites pass | no migration required |
| User/browser/desktop-shell | N/A | backend-only change | not applicable |
| Durable regression coverage quality and relevance | 95% | cleanup-safe structured durable E2E | none material |
- Overall confidence: `95.3%` (572 / 6 = 95.333..., rounded to one decimal).
- Any applicable category below 90%: `No`.
- Default 95% target met: `Yes`.

## Current Broader Validation Decision
- Decision: `Not Required` beyond the completed deterministic Prisma-backed E2E.
- Rationale: the changed backend boundary is directly exercised from observed_at through policy resolution, calculation, persistence, and read-back; no browser/UI boundary changed.
- Persisted-data decision: `Not Affected`; representative newly processed data was exercised and no migration/read-time repricing/dual path exists.

## Current Investigation Decision
- Proceed to delivery workflow after bounded proportional durable-test review: `Yes`.
- Durable coverage changed: `Yes`.
- Reroute required before validation execution: `No`.
- Current routing: `/code_reviewer` for the bounded proportional review requested by CRR-011, then `/delivery_engineer` after approval.
- Current authoritative result: `API-REV-003 Pass`, `95.3%` confidence.
- Historical blocked outcomes are maintained only in `api-e2e-revision-record.md`, not as current investigation conclusions.
