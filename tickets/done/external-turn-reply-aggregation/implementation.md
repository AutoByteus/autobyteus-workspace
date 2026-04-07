# Implementation

## Scope Classification

- Classification: `Medium`
- Reasoning: The fix touches the accepted receipt runtime, multiple unit tests, and an ingress integration test, but stays inside the external-channel subsystem.

## Upstream Artifacts (Required)

- Workflow state: `tickets/in-progress/external-turn-reply-aggregation/workflow-state.md`
- Investigation notes: `tickets/in-progress/external-turn-reply-aggregation/investigation-notes.md`
- Requirements: `tickets/in-progress/external-turn-reply-aggregation/requirements.md`
  - Current Status: `Design-ready`
- Runtime call stacks: `tickets/in-progress/external-turn-reply-aggregation/future-state-runtime-call-stack.md`
- Future-state runtime call stack review: `tickets/in-progress/external-turn-reply-aggregation/future-state-runtime-call-stack-review.md`
- Proposed design: `tickets/in-progress/external-turn-reply-aggregation/proposed-design.md`

## Document Status

- Current Status: `Complete`
- Notes: Stage 6 source changes and targeted verification are complete; downstream workflow gates are recorded separately.

## Plan Baseline (Freeze Until Replanning)

### Preconditions

- `requirements.md` is at least `Design-ready`: `Yes`
- Acceptance criteria use stable IDs (`AC-*`) with measurable expected outcomes: `Yes`
- `workflow-state.md` is current and Stage 5 review-gate evidence is recorded: `Yes`
- Runtime call stack review artifact exists and is current: `Yes`
- All in-scope use cases reviewed: `Yes`
- No unresolved blocking findings: `Yes`
- Future-state runtime call stack review has `Go Confirmed`: `Yes`

### Solution Sketch

- Use Cases In Scope: `UC-001`, `UC-002`, `UC-003`
- Spine Inventory In Scope: `DS-001`, `DS-002`, `DS-003`
- Primary Owners / Main Domain Subjects: `AcceptedReceiptRecoveryRuntime`, `ChannelAgentRunReplyBridge`, `ReplyCallbackService`
- Requirement Coverage Guarantee: Runtime ordering and test updates will cover `R-001` through `R-005`.
- Target Architecture Shape: Live observation first for active accepted turns, persisted recovery only after live observation is unavailable or unresolved.
- API/Behavior Delta: No public API changes; external reply timing changes from early partial publish to final accumulated same-turn publish.
- Key Assumptions: `TURN_COMPLETED` remains authoritative for active live turns.
- Known Risks: Team-path tests and delayed fallback behavior must stay correct after control-flow changes.

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
| 1 | DS-003 | `AcceptedReceiptRecoveryRuntime` | `autobyteus-server-ts/src/external-channel/runtime/accepted-receipt-recovery-runtime.ts` | Stage 5 Go Confirmed | Runtime ordering change is the root fix |
| 2 | DS-003 | `AcceptedReceiptRecoveryRuntime` tests | `autobyteus-server-ts/tests/unit/external-channel/runtime/accepted-receipt-recovery-runtime.test.ts` | Runtime patch | Unit tests codify the old broken behavior |
| 3 | DS-001 | ingress integration | `autobyteus-server-ts/tests/integration/api/rest/channel-ingress.integration.test.ts` | Runtime patch + unit test intent | End-to-end validation of final same-turn reply publishing |

### File Placement Plan (Mandatory)

| Item | Current Path | Target Path | Owning Concern / Platform | Action | Verification |
| --- | --- | --- | --- | --- | --- |
| Accepted receipt orchestration | `autobyteus-server-ts/src/external-channel/runtime/accepted-receipt-recovery-runtime.ts` | same | external-channel runtime | Keep/Modify | Unit + integration tests |
| Runtime regression tests | matching unit/integration test files | same | external-channel validation | Keep/Modify | `vitest` targeted runs |

### Implementation Work Table (Primary Tracker)

| Change ID | Spine ID(s) | Owner | Concern | Current Path | Target Path | Action | Depends On | Implementation Status | Unit Test File | Unit Test Status | Integration Test File | Integration Test Status | Stage 8 Review Status | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-001 | DS-003 | `AcceptedReceiptRecoveryRuntime` | Reorder active accepted-turn processing to prefer live observation before persisted recovery | `autobyteus-server-ts/src/external-channel/runtime/accepted-receipt-recovery-runtime.ts` | same | Modify | None | Complete | `autobyteus-server-ts/tests/unit/external-channel/runtime/accepted-receipt-recovery-runtime.test.ts` | Passed | `autobyteus-server-ts/tests/integration/api/rest/channel-ingress.integration.test.ts` | Passed | Pass | Added closed-observation fallback and active-run lookup guardrails |
| C-002 | DS-003 | runtime tests | Replace early persisted-publish expectations with live-first expectations | `autobyteus-server-ts/tests/unit/external-channel/runtime/accepted-receipt-recovery-runtime.test.ts` | same | Modify | C-001 | Complete | same | Passed | `autobyteus-server-ts/tests/integration/api/rest/channel-ingress.integration.test.ts` | Passed | Pass | Covers agent/team binding plus closed-observation fallback |
| C-003 | DS-001 | ingress integration | Verify final turn reply is published without a second inbound message and without premature recovery | `autobyteus-server-ts/tests/integration/api/rest/channel-ingress.integration.test.ts` | same | Modify | C-001 | Complete | N/A | N/A | same | Passed | Pass | Confirms one accumulated turn reply is published |

### Requirement, Spine, And Design Traceability

| Requirement | Acceptance Criteria ID(s) | Spine ID(s) | Design Section | Use Case / Call Stack | Planned Task ID(s) | Stage 6 Verification (Unit/Integration) | Stage 7 Scenario ID(s) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| R-001 | AC-001, AC-003 | DS-001, DS-003 | Proposed Behavior | UC-001, UC-002, UC-003 | C-001, C-002, C-003 | Unit + Integration | AV-001 |
| R-002 | AC-001 | DS-001, DS-002 | Proposed Behavior | UC-001 | C-001, C-002, C-003 | Unit + Integration | AV-002 |
| R-003 | AC-002 | DS-003 | Proposed Behavior | UC-001, UC-002 | C-001, C-002 | Unit | AV-003 |
| R-004 | AC-003 | DS-001 | Proposed Behavior | UC-001, UC-002, UC-003 | C-001, C-002, C-003 | Unit + Integration | AV-004 |
| R-005 | AC-004 | DS-001 | Proposed Behavior | UC-002, UC-003 | C-001, C-002, C-003 | Unit + Integration | AV-005 |

### Stage 7 Planned Coverage Mapping (Input Only)

| Acceptance Criteria ID | Requirement ID | Spine ID(s) | Expected Outcome | Stage 7 Scenario ID(s) | Test Level | Initial Status |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | R-001 | DS-001, DS-002 | Same-turn multi-leg reply publishes once with accumulated text | AV-001 | API | Passed |
| AC-002 | R-003 | DS-003 | No premature persisted publish while live observation is available | AV-001 | API | Passed |
| AC-003 | R-004 | DS-001 | Final callback remains deduplicated | AV-001 | API | Passed |
| AC-004 | R-005 | DS-001 | Single-leg and fallback cases still publish | AV-002 | Runtime Harness | Passed |

### Backward-Compat And Decoupling Guardrails (Mandatory)

- Backward-compatibility mechanisms introduced: `None`
- Legacy code retained for old behavior: `No`
- Dead/obsolete code or unused helpers/tests/flags/adapters left in scope: `No`
- Shared data structures remain tight: `Yes`
- Shared design/common-practice rules reapplied during implementation: `Yes`
- Spine Span Sufficiency preserved: `Yes`
- Authoritative Boundary Rule preserved: `Yes`
- Decoupling impact assessment completed: `Yes`
- New tight coupling or cyclic dependency introduced: `No`

### Test Strategy

- Unit tests: targeted runtime recovery tests for active observation, delayed fallback, direct turn binding, and team turn binding.
- Integration tests: ingress runtime harness publishing final reply without requiring a second inbound message.

## Execution Tracking (Update Continuously)

### Kickoff Preconditions Checklist

- Workflow state is current: `Yes`
- `workflow-state.md` shows `Current Stage = 6` and `Code Edit Permission = Unlocked` before source edits: `Yes`
- Scope classification confirmed (`Small`/`Medium`/`Large`): `Yes`
- Investigation notes are current: `Yes`
- Requirements status is `Design-ready` or `Refined`: `Yes`
- Future-state runtime call stack review final gate is `Implementation can start: Yes`: `Yes`
- Future-state runtime call stack review reached `Go Confirmed`: `Yes`
- No unresolved blocking findings: `Yes`

### Progress Log

- 2026-04-07: Stage 6 baseline created and implementation execution started.
- 2026-04-07: Updated `accepted-receipt-recovery-runtime.ts` to observe live active turns before persisted recovery and to retry persisted recovery only after live observation is unavailable or closes without a reply.
- 2026-04-07: Updated targeted runtime tests to assert no persisted publish while live observation is pending and to cover fallback after closed observation.
- 2026-04-07: Updated ingress integration coverage to assert one accumulated turn reply is published without a second inbound message.
- 2026-04-07: Verified Stage 6 with `pnpm -C autobyteus-server-ts test tests/unit/external-channel/runtime/accepted-receipt-recovery-runtime.test.ts` and `pnpm -C autobyteus-server-ts test tests/integration/api/rest/channel-ingress.integration.test.ts`.
