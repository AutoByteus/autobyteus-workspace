# API / E2E Testing

- Ticket: `codex-run-history-e2e-artifact-leakage`
- Stage: `7 - API/E2E Test Gate`

## Acceptance Criteria Matrix

| acceptance_criteria_id | Scenario IDs | Status |
| --- | --- | --- |
| AC-001 | S7-001 | Passed |
| AC-002 | S7-002, S7-004 | Passed |
| AC-003 | S7-003 | Passed |
| AC-004 | S7-005 | Passed |
| AC-005 | S7-005 | Passed |

## Scenario Results

| scenario_id | acceptance_criteria_id | requirement_id | use_case_id | source_type | level | expected_outcome | command/harness | result |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| S7-001 | AC-001 | REQ-001/REQ-002 | UC-001 | Requirement | API/E2E | Confirm source of leaked prefix and persistence path | `rg` evidence in test files + `autobyteus-server-ts/memory/run_history_index.json` | Passed |
| S7-002 | AC-002 | REQ-001 | UC-001 | Requirement | E2E | Running codex runtime continue test does not increase default index e2e prefix counts | `RUN_CODEX_E2E=1 vitest ... codex-runtime-graphql ... continueRun` + before/after count checks | Passed |
| S7-003 | AC-003 | REQ-003/REQ-004 | UC-002 | Requirement | API/E2E | Cleanup command removes only known codex e2e artifact rows | `pnpm -C autobyteus-server-ts run cleanup:codex-e2e-history --memory-dir ./memory` | Passed |
| S7-004 | AC-002 | REQ-002 | UC-001 | Design-Risk | E2E | Team roundtrip live test does not pollute default run-history index | `RUN_CODEX_E2E=1 vitest ... codex-team-inter-agent-roundtrip ...` + before/after count checks | Passed |
| S7-005 | AC-004/AC-005 | REQ-003/REQ-004 | UC-003 | Requirement | API | Script behavior validated by automated unit scenarios (dry-run + apply) | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/scripts/cleanup-codex-e2e-run-history.test.ts --maxWorkers=1` | Passed |

## Gate Decision

- Stage 7 Gate: `Pass`
- In-scope acceptance criteria: all mapped and passed.
- Infeasible scenarios: none.
