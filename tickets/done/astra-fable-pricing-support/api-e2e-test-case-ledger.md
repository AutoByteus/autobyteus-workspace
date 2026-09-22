# API/E2E Test-Case Ledger

## Ledger Meta

- Package: `astra-fable-pricing-support`
- API/E2E round: `1` / planned `API-REV-001`
- Canonical investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/astra-fable-pricing-support/tickets/in-progress/astra-fable-pricing-support/api-e2e-coverage-investigation.md`
- Execution coverage report: `/Users/normy/autobyteus_org/autobyteus-worktrees/astra-fable-pricing-support/tickets/in-progress/astra-fable-pricing-support/api-e2e-execution-coverage-report.md`
- API/E2E revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/astra-fable-pricing-support/tickets/in-progress/astra-fable-pricing-support/api-e2e-revision-record.md`
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/astra-fable-pricing-support`
- Initialized: 2026-09-22 before durable coverage changes and final execution.
- Constraint: No paid `gpt-6-astra` or `claude-fable-5-1` inference; all cases are credential-free and non-network for target models.

## Planned Cases

| Case ID | Case | Related Requirements / Acceptance Criteria | Planned Surface | Status |
| --- | --- | --- | --- | --- |
| `API-CASE-001` | Shared exact catalog and provider request coverage | REQ-001–006; AC-001–006 | Focused shared-package Vitest | Pass |
| `API-CASE-002` | Server exact policy and tier calculation | REQ-001–003; AC-001–003 | Focused server unit Vitest | Pass |
| `API-CASE-003` | Target catalog-to-public-summary convergence | REQ-001–003/006/010; AC-001–003/006/010 | In-process GraphQL E2E | Pass |
| `API-CASE-004` | Broader affected API/persistence regression | REQ-006/007/010; AC-006/007/010 | Server token-usage E2E directory | Pass |
| `API-CASE-005` | Production build/bootstrap | REQ-006/008; AC-006/008 | Shared/server build | Pass |
| `API-CASE-006` | Known baseline reproduction | REQ-006/008; AC-006/008 | Full factory file and server typecheck | Pass (classification check) |
| `API-CASE-007` | Static scope/docs/no-migration audit | REQ-006–009; AC-006–009 | Git/docs audit | Pass |

## Event Log

| Timestamp | Case ID | Event | Result / Checkpoint | Evidence |
| --- | --- | --- | --- | --- |
| 2026-09-22 | Ledger | Initialized before execution | Planned cases recorded; no execution result inferred | This file |
| 2026-09-22 | `API-CASE-003` | First focused E2E attempt | Checkpoint, unresolved: test import stopped before collection because `@autobyteus/application-sdk-contracts` build output was absent. This matches the documented prerequisite for non-network GraphQL checks; build required local workspace contracts and retry. | `api-e2e-evidence/API-REV-001/04-target-accounting-e2e.log` |
| 2026-09-22 | `API-CASE-003` | Second focused E2E attempt after shared-contract setup | Checkpoint, unresolved: 3/4 cases passed. The Fable case exposed the existing public contract's correct generic-cache status as `not_applicable`, while the new test expected `none`; implementation behavior and prices/costs were correct. Test expectation updated for the established projection vocabulary. | `api-e2e-evidence/API-REV-001/04-target-accounting-e2e.log` |
| 2026-09-22 | `API-CASE-003` | Final focused E2E retry | **Pass** — 1 file / 4 tests. Exact Astra at 272,000 and 272,001, exact Fable 5.1 cache subtypes/costs, event mapping, persistence, GraphQL public summaries, and an unsupported near-match were directly exercised without network access. | `api-e2e-evidence/API-REV-001/04-target-accounting-e2e.log` |
| 2026-09-22 | `API-CASE-001` | Shared catalog/provider focused execution | **Pass** — 3 unit files / 55 tests plus 3 selected factory integration tests (1 unrelated case skipped by filter). Exact metadata/pricing/tier/provenance, no aliases, existing GPT-5.6/Fable preservation, Astra Responses payload, and Fable request sanitization passed without network access. | `api-e2e-evidence/API-REV-001/01-autobyteus-ts-focused.log`; `02-factory-targeted.log` |
| 2026-09-22 | `API-CASE-002` | Focused server pricing execution | **Pass** — 2 files / 28 tests. Real catalog policy resolution returned all exact target dimensions and missing aliases; calculator selected the exact 272,000/272,001 tier boundary and expected costs. | `api-e2e-evidence/API-REV-001/03-server-pricing.log` |
| 2026-09-22 | `API-CASE-004` | Full token-usage E2E directory attempt | Checkpoint, unresolved: 9/10 files and 29/31 tests passed. `token-usage-analytics-graphql.e2e.test.ts` saw extra `1,000,000` output tokens/report and a safe-integer row from concurrently running sibling files sharing the same test database. This indicates directory-parallel isolation interference, not a target assertion. Retry the failed file alone before classification. | `api-e2e-evidence/API-REV-001/06-token-usage-e2e.log` |
| 2026-09-22 | `API-CASE-004` | Isolated retry of parallel-contaminated analytics file | **Pass** — the previously affected file passed 5/5 alone. Reconciled broader result: all 10 token-usage E2E files / 31 tests pass when the shared-database analytics file is isolated; the directory-parallel invocation exposes a pre-existing test-isolation limitation, not a product or target failure. | `api-e2e-evidence/API-REV-001/06-token-usage-e2e.log` |
| 2026-09-22 | `API-CASE-005` | Shared and server production builds | **Pass** — shared TypeScript build/runtime dependency verification passed; server prebuild/shared contracts, Prisma generation, TypeScript build, managed assets, built-in agent bootstrap, and sanitized bootstrap smoke all passed. | `api-e2e-evidence/API-REV-001/07-builds.log` |
| 2026-09-22 | `API-CASE-006` | Reproduced documented unrelated baselines | **Pass (classification check)** — full factory file had exactly the documented stale `gemini-3.5-flash` expectation while all three GPT-5.6/Astra/Fable cases passed; server `typecheck` exited 2 exclusively with the documented TS6059 `tests` outside `rootDir: src` pattern. Neither originates in this package; the production builds passed. | `api-e2e-evidence/API-REV-001/08-baselines.log` |
| 2026-09-22 | `API-CASE-007` | Static scope, documentation, whitespace, and cleanup audit | **Pass** — only one production source file changed; no migration/schema/frontend/provider-adapter/server pricing production file changed; target docs contain exact IDs, rates, limits, dates, variant exclusions, prospective semantics, and no-paid-test decision; whitespace checks passed. Generated contract `dist` outputs created by validation were removed. | `api-e2e-evidence/API-REV-001/09-static-audit.log` |

## Re-entry And Reconciliation

- Last durably recorded event: `API-CASE-007` completed `Pass`.
- Last completed case and result: `API-CASE-007` / `Pass`.
- Cases still running, interrupted, or not started: None.
- Next case or recovery action: None; round complete.
- Interruption, context-compression, or rerun note: Target E2E setup and assertion retries plus the broader analytics isolation retry are recorded above; all final case results are resolved.
- Reconciled into execution coverage report: `Yes` — `/Users/normy/autobyteus_org/autobyteus-worktrees/astra-fable-pricing-support/tickets/in-progress/astra-fable-pricing-support/api-e2e-execution-coverage-report.md`, `Test-Case Ledger Reconciliation`.
- Reconciliation note for any case missing a terminal result: None.
