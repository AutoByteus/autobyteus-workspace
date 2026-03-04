# Implementation Plan

## Inputs
- Requirements: `requirements.md` (`Design-ready`)
- Design: `proposed-design.md`
- Runtime review gate: `future-state-runtime-call-stack-review.md` (`Go Confirmed`)

## Tasks
- `T-001` Update `AgentRunManager` single-agent config wiring so normal create/restore does not force explicit memory root in `AgentConfig`.
- `T-002` Add/extend integration test to assert create/restore pass no explicit memory dir for single-agent flows.
- `T-003` Add/extend e2e test coverage for run history projection with canonical run-scoped memory layout expectations.
- `T-004` Run targeted tests for changed areas.
- `T-005` Update implementation progress + gate artifacts.

## Verification Plan
- `pnpm -C autobyteus-server-ts exec vitest run tests/integration/agent-execution/agent-run-manager.integration.test.ts --no-watch`
- `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/run-history/run-history-graphql.e2e.test.ts --no-watch`
