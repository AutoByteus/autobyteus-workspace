# Stage 7 Executable Validation (API/E2E)

## Validation Round Meta

- Current Validation Round: `1`
- Trigger Stage: `6`
- Prior Round Reviewed: `None`
- Latest Authoritative Round: `1`

## Testing Scope

- Ticket: `codex-stream-stall`
- Scope classification: `Medium`
- Workflow state source: `tickets/done/codex-stream-stall/workflow-state.md`
- Requirements source: `tickets/done/codex-stream-stall/requirements.md`
- Call stack source: `tickets/done/codex-stream-stall/future-state-runtime-call-stack.md`
- Design source: `tickets/done/codex-stream-stall/proposed-design.md`
- Interface/system shape in scope: `Integration`, `CLI`, `Worker/Process`
- Platform/runtime targets: local `pnpm` + `vitest`, live `codex app-server`, SQLite-backed test environment
- Lifecycle boundaries in scope: `Startup`

## Validation Asset Strategy

- Durable validation assets to add/update in the repository:
  - `tests/unit/agent-execution/backends/codex/codex-agent-run-backend.test.ts`
  - `tests/unit/services/agent-streaming/agent-team-stream-handler.test.ts`
  - `tests/integration/runtime-execution/codex-app-server/thread/codex-long-turn-cadence.probe.test.ts`
  - `tests/integration/runtime-execution/codex-app-server/thread/codex-raw-vs-backend-cadence.probe.test.ts`
- Temporary validation methods or setup to use only if needed:
  - direct native raw JSON-RPC probe against `codex app-server` recorded in `investigation-notes.md`
- Cleanup expectation for temporary validation:
  - no retained temporary files; only ticket-local evidence remains

## Round History

| Round | Trigger | Prior Unresolved Failures Rechecked | New Failures Found | Gate Result | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Stage 6 exit | N/A | No | Pass | Yes | unit, skip-path, live paired probe, and prior native direct probe evidence all agree |

## Acceptance Criteria Coverage Matrix

| Acceptance Criteria ID | Requirement ID | Criterion Summary | Scenario ID(s) | Current Status | Last Updated |
| --- | --- | --- | --- | --- | --- |
| AC-001 | R-001 | same-run raw and backend cadence are compared for one large Codex turn | AV-001 | Passed | 2026-04-09 |
| AC-002 | R-001 | native direct probing reproduces the slowdown without AutoByteus | AV-002 | Passed | 2026-04-09 |
| AC-004 | R-003 | backend no longer persists Codex token usage | AV-003 | Passed | 2026-04-09 |
| AC-005 | R-004 | team metadata refreshes are coalesced | AV-004 | Passed | 2026-04-09 |
| AC-006 | R-005 | durable validation remains committed and opt-in | AV-001, AV-005 | Passed | 2026-04-09 |

## Spine Coverage Matrix

| Spine ID | Spine Scope | Governing Owner | Scenario ID(s) | Coverage Status | Notes |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | `CodexAgentRunBackend` | AV-001, AV-003 | Passed | raw-vs-backend live probe and backend unit tests both passed |
| DS-002 | Return-Event | `AgentTeamStreamHandler` | AV-004 | Passed | metadata refresh coalescing test passed |
| DS-003 | Bounded Local | probe tests | AV-001, AV-002, AV-005 | Passed | live probe ran with explicit opt-in; direct native evidence retained |

## Scenario Catalog

| Scenario ID | Spine ID(s) | Source Type | Acceptance Criteria ID(s) | Requirement ID(s) | Use Case ID(s) | Validation Mode | Platform / Runtime | Lifecycle Boundary | Objective/Risk | Expected Outcome | Durable Validation Asset(s) | Temporary Validation Method / Setup | Command/Harness | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| AV-001 | DS-001, DS-003 | Requirement | AC-001, AC-006 | R-001, R-005 | UC-001, UC-005 | Integration | local `vitest` + live `codex app-server` | Startup | prove the backend is not adding backlog relative to native raw deltas | average dispatch delay stays negligible while the same long silent phases appear in both series | `codex-raw-vs-backend-cadence.probe.test.ts` | none | `RUN_CODEX_E2E=1 pnpm -C autobyteus-server-ts exec vitest run tests/integration/runtime-execution/codex-app-server/thread/codex-raw-vs-backend-cadence.probe.test.ts` | Passed |
| AV-002 | DS-003 | Requirement | AC-002 | R-001 | UC-001 | Other | direct `codex app-server` JSON-RPC | Startup | prove native Codex already reproduces the slowdown | native text-delta stream shows the same progressive bursty/silent pattern | none | direct raw JSON-RPC harness recorded in `investigation-notes.md` | investigation-time native probe | Passed |
| AV-003 | DS-001 | Requirement | AC-004 | R-003 | UC-003 | Integration | local `vitest` | None | prove Codex backend dispatch no longer depends on token persistence | backend unit tests pass with no token store interaction and token-usage GraphQL e2e stays intentionally skipped | `codex-agent-run-backend.test.ts` | none | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-execution/backends/codex/codex-agent-run-backend.test.ts tests/unit/agent-execution/backends/codex/thread/codex-thread.test.ts tests/e2e/runtime/token-usage-runtime-graphql.e2e.test.ts` | Passed |
| AV-004 | DS-002 | Requirement | AC-005 | R-004 | UC-002 | Integration | local `vitest` | None | prove team metadata refresh work is coalesced | burst of streamed events results in one metadata refresh after the debounce window | `agent-team-stream-handler.test.ts` | none | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/services/agent-streaming/agent-team-stream-handler.test.ts` | Passed |
| AV-005 | DS-003 | Design-Risk | AC-006 | R-005 | UC-005 | Integration | local `vitest` | Startup | prevent accidental always-on live probe execution | long-turn probe files are skipped unless `RUN_CODEX_E2E=1` is set | both probe tests | none | `pnpm -C autobyteus-server-ts exec vitest run tests/integration/runtime-execution/codex-app-server/thread/codex-long-turn-cadence.probe.test.ts tests/integration/runtime-execution/codex-app-server/thread/codex-raw-vs-backend-cadence.probe.test.ts` | Passed |

## Validation Assets Implemented Or Updated

| Asset Path / Name | Asset Type | Durable In Repo | Scenario ID(s) | Notes |
| --- | --- | --- | --- | --- |
| `tests/unit/agent-execution/backends/codex/codex-agent-run-backend.test.ts` | API Test | Yes | AV-003 | aligned with removal of Codex token persistence |
| `tests/unit/services/agent-streaming/agent-team-stream-handler.test.ts` | API Test | Yes | AV-004 | includes burst coalescing check |
| `tests/integration/runtime-execution/codex-app-server/thread/codex-long-turn-cadence.probe.test.ts` | Process Probe | Yes | AV-005 | retained as future long-turn probe |
| `tests/integration/runtime-execution/codex-app-server/thread/codex-raw-vs-backend-cadence.probe.test.ts` | Process Probe | Yes | AV-001, AV-005 | live paired cadence validation |

## Temporary Validation Methods / Setup Used

| Method / Setup | Why Needed | Scenario ID(s) | Cleanup Required | Cleanup Status |
| --- | --- | --- | --- | --- |
| direct native raw JSON-RPC probe against `codex app-server` | no durable repo test existed yet for raw native cadence without AutoByteus in the middle | AV-002 | No | complete |

## Feasibility And Risk Record

- Any infeasible scenarios: `No`
- Environment constraints: live probes require a working `codex` binary plus credentials and are intentionally opt-in
- Compensating automated evidence:
  - live paired cadence probe completed successfully in this turn
  - unit and skip-path suite completed successfully in this turn
- Residual risk notes:
  - frontend receive/render cadence is still outside this ticket's executable scope
  - native Codex long silent phases remain upstream behavior
- User waiver for infeasible acceptance criteria recorded: `N/A`
- Temporary validation-only scaffolding cleaned up: `Yes`

## Stage 7 Gate Decision

- Latest authoritative round: `1`
- Latest authoritative result: `Pass`
- Stage 7 complete: `Yes`
- Durable executable validation that should live in the repository was implemented or updated: `Yes`
- All in-scope acceptance criteria mapped to scenarios: `Yes`
- All relevant spines mapped to scenarios: `Yes`
- All executable in-scope acceptance criteria status = `Passed`: `Yes`
- All executable relevant spines status = `Passed`: `Yes`
- Critical executable scenarios passed: `Yes`
- Any infeasible acceptance criteria: `No`
- Explicit user waiver recorded for each infeasible acceptance criterion (if any): `N/A`
- Temporary validation-only scaffolding cleaned up or intentionally retained with rationale: `Yes`
- Unresolved escalation items: `No`
- Ready to enter Stage 8 code review: `Yes`
- Notes:
  - latest paired live run summary:
    - duration `171532ms`
    - raw text delta count `935`
    - backend text delta count `935`
    - average dispatch delay `0.0535ms`
    - `p99` dispatch delay `1ms`
    - raw gaps over `5s`: `6`
    - backend gaps over `5s`: `6`
