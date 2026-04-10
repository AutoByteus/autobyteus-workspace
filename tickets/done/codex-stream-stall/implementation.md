# Implementation

## Scope Classification

- Classification: `Medium`
- Reasoning: the ticket required cross-layer attribution work, durable probe coverage, and two source changes in separate runtime areas.

## Upstream Artifacts

- Workflow state: `tickets/done/codex-stream-stall/workflow-state.md`
- Investigation notes: `tickets/done/codex-stream-stall/investigation-notes.md`
- Requirements: `tickets/done/codex-stream-stall/requirements.md`
  - Current Status: `Design-ready`
- Runtime call stacks: `tickets/done/codex-stream-stall/future-state-runtime-call-stack.md`
- Future-state runtime call stack review: `tickets/done/codex-stream-stall/future-state-runtime-call-stack-review.md`
- Proposed design: `tickets/done/codex-stream-stall/proposed-design.md`

## Document Status

- Current Status: `Ready For Implementation`
- Notes: Stage 6 implementation work is complete and validated; downstream executable validation is the current authority.

## Plan Baseline

### Preconditions

- `requirements.md` is at least `Design-ready`: `Yes`
- Acceptance criteria use stable IDs: `Yes`
- `workflow-state.md` is current and Stage 5 review-gate evidence is recorded: `Yes`
- Runtime call stack review artifact exists and is current: `Yes`
- Future-state runtime call stack review has `Go Confirmed`: `Yes`

### Solution Sketch

- Use Cases In Scope: `UC-001`, `UC-002`, `UC-003`, `UC-005`
- Spine Inventory In Scope: `DS-001`, `DS-002`, `DS-003`
- Primary Owners / Main Domain Subjects: `CodexAgentRunBackend`, `AgentTeamStreamHandler`, integration probe tests
- Requirement Coverage Guarantee: every requirement maps to at least one use case and at least one Stage 7 scenario
- Design-Risk Use Cases: long-running live Codex probes must remain opt-in to avoid accidental multi-minute test runs
- Target Architecture Shape:
  - keep the backend event bridge direct,
  - remove Codex token persistence from the backend hot path,
  - coalesce team metadata refresh work,
  - keep performance probes as durable but opt-in validation assets.
- New Owners/Boundary Interfaces To Introduce: `None`
- API/Behavior Delta:
  - Codex runtime no longer writes token-usage records into the AutoByteus token store.
  - Team metadata refresh work is scheduled instead of executed on every streamed event.
  - Probe tests are committed but remain explicitly gated for live execution.
- Key Assumptions:
  - Native Codex cadence remains upstream behavior.
  - Skipping the Codex token-usage GraphQL e2e is acceptable because the feature is intentionally removed.
- Known Risks:
  - frontend-side stalls remain a separate investigation path,
  - live probe tests are expensive and must stay opt-in.

### Runtime Call Stack Review Gate Summary

| Round | Review Result | Findings Requiring Persisted Updates | New Use Cases Discovered | Persisted Updates Completed | Classification | Required Re-Entry Path | Round State | Clean Streak After Round |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Pass | No | No | N/A | N/A | N/A | Candidate Go | 1 |
| 2 | Pass | No | No | N/A | N/A | N/A | Go Confirmed | 2 |

### Go / No-Go Decision

- Decision: `Go`
- Evidence:
  - Final review round: `2`
  - Clean streak at final round: `2`
  - Final review gate line (`Implementation can start`): `Yes`

### Spine-Led Dependency And Sequencing Map

| Order | Spine ID | Owner | Task / File | Depends On | Why This Order |
| --- | --- | --- | --- | --- | --- |
| 1 | DS-001 | `CodexAgentRunBackend` | remove Codex token persistence from `src/agent-execution/backends/codex/backend/codex-agent-run-backend.ts` | N/A | backend ownership must be simplified first |
| 2 | DS-002 | `AgentTeamStreamHandler` | coalesce metadata refreshes in `src/services/agent-streaming/agent-team-stream-handler.ts` | N/A | team-path amplification is independent of DS-001 |
| 3 | DS-003 | probe tests | add and guard long-turn cadence probes | 1 | probes should validate the final backend shape |
| 4 | DS-001 / DS-002 | unit/e2e tests | align unit tests and skip removed Codex token-usage e2e | 1, 2, 3 | validation follows implementation |

### File Placement Plan

| Item | Current Path | Target Path | Owning Concern / Platform | Action | Verification |
| --- | --- | --- | --- | --- | --- |
| Codex backend event bridge | `src/agent-execution/backends/codex/backend/codex-agent-run-backend.ts` | same | Codex runtime backend | Keep | dispatch remains in Codex backend owner |
| Team metadata scheduling | `src/services/agent-streaming/agent-team-stream-handler.ts` | same | team websocket stream handler | Keep | scheduling remains in stream owner |
| Performance probes | `tests/integration/runtime-execution/codex-app-server/thread/*.probe.test.ts` | same | Codex runtime execution validation | Keep | live probes stay near other Codex runtime tests |

### Implementation Work Table

| Change ID | Spine ID(s) | Owner | Concern | Current Path | Target Path | Action | Depends On | Implementation Status | Unit Test File | Unit Test Status | Integration Test File | Integration Test Status | Stage 8 Review Status | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-001 | DS-001 | `CodexAgentRunBackend` | remove Codex token persistence | `src/agent-execution/backends/codex/backend/codex-agent-run-backend.ts` | same | Modify | N/A | Completed | `tests/unit/agent-execution/backends/codex/codex-agent-run-backend.test.ts` | Passed | `tests/integration/runtime-execution/codex-app-server/thread/codex-raw-vs-backend-cadence.probe.test.ts` | Planned | Planned | hot path now only converts and dispatches |
| C-002 | DS-002 | `AgentTeamStreamHandler` | coalesce metadata refresh writes | `src/services/agent-streaming/agent-team-stream-handler.ts` | same | Modify | N/A | Completed | `tests/unit/services/agent-streaming/agent-team-stream-handler.test.ts` | Passed | N/A | N/A | Planned | debounce window replaces per-event refresh |
| C-003 | DS-001 | validation layer | align tests with removed Codex token persistence | `tests/e2e/runtime/token-usage-runtime-graphql.e2e.test.ts` | same | Modify | C-001 | Completed | `tests/unit/agent-execution/backends/codex/codex-agent-run-backend.test.ts` | Passed | `tests/e2e/runtime/token-usage-runtime-graphql.e2e.test.ts` | Skipped by design | Planned | Codex token-usage GraphQL e2e is intentionally disabled |
| C-004 | DS-003 | validation layer | add long-turn cadence probes | N/A | `tests/integration/runtime-execution/codex-app-server/thread/codex-long-turn-cadence.probe.test.ts`, `tests/integration/runtime-execution/codex-app-server/thread/codex-raw-vs-backend-cadence.probe.test.ts` | Create | C-001 | Completed | N/A | N/A | both probe tests | Passed manually during investigation and rerun in Stage 7 | Planned | durable scientific evidence retained |
| C-005 | DS-003 | validation layer | make live probes explicitly opt-in | probe test files | same | Modify | C-004 | Completed | N/A | N/A | both probe tests | Passed | Planned | `RUN_CODEX_E2E=1` is now required for live execution |

### Requirement, Spine, And Design Traceability

| Requirement | Acceptance Criteria ID(s) | Spine ID(s) | Design Section | Use Case / Call Stack | Planned Task ID(s) | Stage 6 Verification | Stage 7 Scenario ID(s) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| R-001 | AC-001, AC-002 | DS-001, DS-003 | Data-Flow Spine Inventory | UC-001, UC-005 | C-004, C-005 | live probes | AV-001, AV-002 |
| R-002 | AC-003 | DS-001 | Goal / Intended Change | UC-001 | C-001, C-004 | artifact review | AV-001 |
| R-003 | AC-004 | DS-001 | Change Inventory C-001 | UC-003 | C-001, C-003 | backend unit tests | AV-003 |
| R-004 | AC-005 | DS-002 | Change Inventory C-002 | UC-002 | C-002 | team stream unit tests | AV-004 |
| R-005 | AC-006 | DS-001, DS-003 | Final Design Decision | UC-003, UC-005 | C-003, C-004, C-005 | unit + probe validation | AV-001, AV-002, AV-003, AV-004 |

### Stage 7 Planned Coverage Mapping

| Acceptance Criteria ID | Requirement ID | Spine ID(s) | Expected Outcome | Stage 7 Scenario ID(s) | Test Level | Initial Status |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | R-001 | DS-001, DS-003 | same-run raw and backend cadence remain aligned | AV-001 | Integration | Planned |
| AC-002 | R-001 | DS-003 | native direct probing reproduces the slowdown | AV-002 | Integration | Planned |
| AC-004 | R-003 | DS-001 | backend no longer persists Codex token usage | AV-003 | Unit | Planned |
| AC-005 | R-004 | DS-002 | team metadata refresh is coalesced | AV-004 | Unit | Planned |
| AC-006 | R-005 | DS-001, DS-003 | durable validation remains committed and opt-in | AV-001, AV-002 | Integration | Planned |

### Step-By-Step Plan

1. Finalize ticket-local workflow artifacts for stages 2 through 6.
2. Add the opt-in execution guard to the live probe tests.
3. Rerun targeted Codex-focused unit and live integration validation.
4. Advance through Stage 7, Stage 8, Stage 9, and Stage 10 if the gates pass.

### Backward-Compat And Decoupling Guardrails

- Backward-compatibility mechanisms introduced: `None`
- Legacy code retained for old behavior: `No`
- Dead/obsolete code or unused helpers/tests/flags/adapters left in scope: `No`
- Shared design/common-practice rules reapplied during implementation: `Yes`
- Authoritative Boundary Rule preserved: `Yes`
- Decoupling impact assessment completed: `Yes`
- New tight coupling or cyclic dependency introduced: `No`

## Execution Tracking

### Progress Log

- 2026-04-09: investigation confirmed native `codex app-server` already reproduces the progressive slowdown.
- 2026-04-09: removed Codex token persistence from the backend hot path.
- 2026-04-09: added metadata refresh coalescing for team streaming.
- 2026-04-09: added durable cadence probe tests and ticket-local measurement artifacts.
- 2026-04-09: added the explicit `RUN_CODEX_E2E=1` opt-in execution guard for the live probe tests.
- 2026-04-09: reran the Codex-focused unit suite and the live paired cadence probe successfully.

### Downstream Stage Status Pointers

| Stage | Canonical Artifact | Current Status | Last Updated | Notes |
| --- | --- | --- | --- | --- |
| 7 API/E2E + Executable Validation | `tickets/done/codex-stream-stall/api-e2e-testing.md` | In Progress | 2026-04-09 | Stage 6 is complete; executable validation record is being written |
| 8 Code Review | `tickets/done/codex-stream-stall/code-review.md` | Not Started | 2026-04-09 | not started |
| 9 Docs Sync | `tickets/done/codex-stream-stall/docs-sync.md` | Not Started | 2026-04-09 | not started |
