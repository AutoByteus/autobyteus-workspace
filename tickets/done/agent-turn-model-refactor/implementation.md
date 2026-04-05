# Implementation

## Scope Classification

- Classification: `Medium`
- Reasoning: the refactor changes runtime state, event models, stream payloads, handler ownership, tests, and docs inside `autobyteus-ts`, plus the touched `autobyteus-server-ts` consumers and the touched `autobyteus-web` stream protocol types that must stay aligned on canonical `turnId` / `turn_id` naming.
- Workflow Depth:
  - `Medium` -> proposed design doc -> future-state runtime call stack -> future-state runtime call stack review -> `implementation.md` baseline -> implementation execution

## Upstream Artifacts (Required)

- Workflow state: `tickets/done/agent-turn-model-refactor/workflow-state.md`
- Investigation notes: `tickets/done/agent-turn-model-refactor/investigation-notes.md`
- Requirements: `tickets/done/agent-turn-model-refactor/requirements.md`
  - Current Status: `Refined`
- Runtime call stacks: `tickets/done/agent-turn-model-refactor/future-state-runtime-call-stack.md`
- Future-state runtime call stack review: `tickets/done/agent-turn-model-refactor/future-state-runtime-call-stack-review.md`
- Proposed design: `tickets/done/agent-turn-model-refactor/proposed-design.md`

## Document Status

- Current Status: `Implemented`
- Notes:
  - The original pre-implementation stop gate was lifted by the user on `2026-04-04`.
  - After Stage 10 re-entry on `2026-04-04`, implementation must keep `AgentTurn` and `ToolInvocationBatch` as the explicit type names while restoring canonical field/payload naming to `turnId` / `turn_id`.
  - Persisted memory trace serialization remains on `turn_id` for this ticket so the low-level storage schema stays stable while the runtime model becomes explicit.
  - Touched `autobyteus-server-ts` consumers must be cleaned up in the same wave rather than carrying `agentTurnId` / `agent_turn_id` aliases.
  - The touched `autobyteus-web` segment payload types must also declare `turn_id` explicitly so the frontend stream contract mirrors the backend even before turn-aware UI behavior is added.

## Plan Baseline (Freeze Until Replanning)

### Preconditions (Must Be True Before Finalizing The Baseline)

- `requirements.md` is at least `Design-ready` (`Refined` allowed): `Yes`
- Acceptance criteria use stable IDs (`AC-*`) with measurable expected outcomes: `Yes`
- `workflow-state.md` is current and Stage 5 review-gate evidence is recorded: `Yes`
- Runtime call stack review artifact exists and is current: `Yes`
- All in-scope use cases reviewed: `Yes`
- No unresolved blocking findings: `Yes`
- Future-state runtime call stack review has `Go Confirmed` with two consecutive clean deep-review rounds (no blockers, no required persisted artifact updates, no newly discovered use cases): `Yes`
- Missing-use-case discovery sweeps completed for the final two clean rounds: `Yes`
- No newly discovered use cases in the final two clean rounds: `Yes`

### Solution Sketch

- Use Cases In Scope:
  - `UC-001`, `UC-002`, `UC-003`, `UC-004`, `UC-005`
- Spine Inventory In Scope:
  - `DS-001`, `DS-002`, `DS-003`, `DS-004`
- Primary Spine Span Sufficiency Rationale:
  - the implementation keeps the user-input -> active turn -> LLM/tool lifecycle -> stream emission path visible across the changed runtime owners
- Primary Owners / Main Domain Subjects:
  - `AgentTurn`
  - `ToolInvocationBatch`
  - `AgentRuntimeState`
  - `MemoryManager`
  - stream payload models / emission boundary
- Requirement Coverage Guarantee:
  - every requirement maps to at least one planned change and at least one Stage 6 or Stage 7 verification asset
- Design-Risk Use Cases:
  - `UC-003`: explicit `turn_id` must be required on streamed segment events and passed at construction time rather than patched later
- Target Architecture Shape:
  - `AgentRuntimeState.activeTurn: AgentTurn | null`
  - `AgentTurn.turnId` owns turn-local lifecycle and active batch reference
  - `ToolInvocationBatch` owns grouped tool settlement only
  - `MemoryManager` remains agent-scoped infrastructure
  - segment-event payloads and tool lifecycle payloads carry `turn_id`, segment events are constructed with that turn identity up front, and touched frontend segment payload types explicitly declare the same field
- New Owners/Boundary Interfaces To Introduce:
  - `autobyteus-ts/src/agent/agent-turn.ts`
  - `autobyteus-ts/src/agent/tool-invocation-batch.ts`
- Primary file/task set: see `Implementation Work Table`
- API/Behavior Delta:
  - runtime event and invocation objects use `turnId`
  - stream payloads use `turn_id`
  - memory trace serialization stays on `turn_id` in this ticket
- Key Assumptions:
  - the explicit type names (`AgentTurn`, `ToolInvocationBatch`) plus canonical `turnId` / `turn_id` field naming are the clearest maintainable combination for the user’s concern
  - low-level memory storage schema stability is preferable to a larger trace-schema migration in this ticket
- Known Risks:
  - existing in-flight tests and touched downstream consumers may still assume the temporary `agentTurnId` / `agent_turn_id` names from the earlier implementation wave
  - handler and payload breadth may hide alias remnants unless searched and tested systematically

### Runtime Call Stack Review Gate Summary

| Round | Review Result | Findings Requiring Persisted Updates | New Use Cases Discovered | Persisted Updates Completed | Classification (`Design Impact`/`Requirement Gap`/`Unclear`/`N/A`) | Required Re-Entry Path | Round State (`Reset`/`Candidate Go`/`Go Confirmed`) | Clean Streak After Round |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Pass | No | No | N/A | N/A | N/A | Candidate Go | 1 |
| 2 | Pass | No | No | N/A | N/A | N/A | Go Confirmed | 2 |
| 3 | Pass | No | No | N/A | N/A | N/A | Candidate Go | 1 |
| 4 | Pass | No | No | N/A | N/A | N/A | Go Confirmed | 2 |

### Go / No-Go Decision

- Decision: `Go`
- Evidence:
  - Final review round: `4`
  - Clean streak at final round: `2`
  - Final review gate line (`Implementation can start`): `Yes`

### Principles

- Bottom-up: implement new runtime models before updating dependent handlers.
- Test-driven: add or update focused unit/integration tests alongside implementation.
- Spine-led implementation rule: preserve the longer user-input -> active turn -> handler -> stream path.
- Mandatory modernization rule: no backward-compatibility shims for the old ambiguous runtime names in the changed scope.
- Mandatory cleanup rule: remove dead or replaced runtime names (`ToolInvocationTurn`, `activeToolInvocationTurn`, loose `activeTurnId`) in the changed scope.
- Mandatory ownership/decoupling/SoC rule: keep `MemoryManager` agent-scoped and keep batch settlement local to `ToolInvocationBatch`.
- Mandatory `Authoritative Boundary Rule`: callers above the turn subject should use `AgentTurn`, not a loose turn id plus batch state.
- Mandatory file-placement rule: keep new runtime owners under `src/agent/`, not under `src/memory/` or `src/agent/streaming/`.

### File Placement Plan (Mandatory)

| Item | Current Path | Target Path | Owning Concern / Platform | Action (`Keep`/`Move`/`Split`/`Promote Shared`) | Verification |
| --- | --- | --- | --- | --- | --- |
| Outer turn runtime aggregate | `N/A` | `autobyteus-ts/src/agent/agent-turn.ts` | agent runtime | Create | unit + integration |
| Inner batch settlement owner | `autobyteus-ts/src/agent/tool-invocation-turn.ts` | `autobyteus-ts/src/agent/tool-invocation-batch.ts` | agent runtime | Move | unit + integration |
| Runtime state owner fields | `autobyteus-ts/src/agent/context/agent-runtime-state.ts` | same | agent runtime context | Modify | unit |
| Runtime events / invocation models | `autobyteus-ts/src/agent/events/agent-events.ts`, `autobyteus-ts/src/agent/tool-invocation.ts` | same | agent runtime | Modify | unit |
| Segment + tool lifecycle stream payloads | `autobyteus-ts/src/agent/streaming/segments/segment-events.ts`, `autobyteus-ts/src/agent/streaming/events/stream-event-payloads.ts`, `autobyteus-ts/src/agent/handlers/tool-lifecycle-payload.ts` | same | streaming boundary | Modify | unit + Stage 7 |
| Frontend stream payload types | `autobyteus-web/services/agentStreaming/protocol/messageTypes.ts`, `autobyteus-web/services/agentStreaming/handlers/segmentHandler.ts`, `autobyteus-web/services/agentStreaming/handlers/toolLifecycleHandler.ts` | same | frontend streaming protocol | Modify | unit |
| Runtime handlers | `autobyteus-ts/src/agent/handlers/*.ts`, `autobyteus-ts/src/agent/input-processor/memory-ingest-input-processor.ts` | same | agent runtime handlers | Modify | unit + integration |
| Touched downstream consumers | `autobyteus-server-ts/src/agent-execution/backends/autobyteus/*.ts`, `autobyteus-server-ts/src/external-channel/runtime/channel-reply-bridge-support.ts` | same | runtime event consumption | Modify | Stage 7 |

### Implementation Work Table (Primary Tracker)

| Change ID | Spine ID(s) | Owner | Concern | Current Path | Target Path | Action (`Create`/`Modify`/`Move`/`Split`/`Remove`) | Depends On | Implementation Status (`Planned`/`In Progress`/`Completed`/`Blocked`) | Unit Test File | Unit Test Status (`Planned`/`Passed`/`Failed`/`N/A`) | Integration Test File | Integration Test Status (`Planned`/`Passed`/`Failed`/`N/A`) | Stage 8 Review Status (`Planned`/`Passed`/`Failed`/`N/A`) | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-001 | DS-001, DS-002 | agent runtime | add `AgentTurn` and rename batch owner | `autobyteus-ts/src/agent/tool-invocation-turn.ts` | `autobyteus-ts/src/agent/agent-turn.ts`, `autobyteus-ts/src/agent/tool-invocation-batch.ts` | Create + Move | none | Completed | `autobyteus-ts/tests/unit/agent/context/agent-runtime-state.test.ts`, `autobyteus-ts/tests/unit/agent/tool-invocation.test.ts` | Passed | `autobyteus-ts/tests/integration/agent/tool-approval-flow.test.ts` | Passed | Passed | runtime model backbone |
| C-002 | DS-001, DS-004 | agent runtime handlers | switch handlers and events to canonical `turnId` while keeping `AgentTurn` explicit | `autobyteus-ts/src/agent/events/agent-events.ts`, `autobyteus-ts/src/agent/handlers/*.ts`, `autobyteus-ts/src/agent/tool-execution-result-processor/memory-ingest-tool-result-processor.ts` | same | Modify | C-001 | Completed | `autobyteus-ts/tests/unit/agent/handlers/*.test.ts`, `autobyteus-ts/tests/unit/agent/events/agent-events.test.ts` | Passed | `autobyteus-ts/tests/integration/agent/tool-approval-flow.test.ts` | Passed | Passed | includes tool approval / execution / result flow |
| C-003 | DS-003 | streaming boundary | add `turn_id` to segment and lifecycle payloads and remove `agent_turn_id` aliases | `autobyteus-ts/src/agent/streaming/segments/segment-events.ts`, `autobyteus-ts/src/agent/streaming/events/stream-event-payloads.ts`, `autobyteus-ts/src/agent/handlers/tool-lifecycle-payload.ts` | same | Modify | C-002 | Completed | `autobyteus-ts/tests/unit/agent/streaming/events/stream-event-payloads.test.ts`, `autobyteus-ts/tests/unit/agent/streaming/segments/segment-events.test.ts`, `autobyteus-ts/tests/unit/agent/handlers/llm-user-message-ready-event-handler.test.ts` | Passed | Stage 7 scenario harness | Passed | Passed | explicit outbound correlation |
| C-004 | DS-001 | memory boundary | keep memory infrastructure agent-scoped while updating naming touch points | `autobyteus-ts/src/memory/memory-manager.ts`, `autobyteus-ts/src/agent/llm-request-assembler.ts` | same | Modify | C-001 | Completed | `autobyteus-ts/tests/unit/agent/input-processor/memory-ingest-input-processor.test.ts` | Passed | `autobyteus-ts/tests/integration/agent/memory-tool-call-flow.test.ts`, `autobyteus-ts/tests/integration/agent/memory-llm-flow.test.ts` | Passed | Passed | storage schema remains `turn_id` |
| C-005 | DS-001, DS-002, DS-003, DS-004 | tests + docs | durable validation and docs sync inputs | `autobyteus-ts/tests/**/*`, `autobyteus-ts/docs/turn_terminology.md` | same | Modify | C-001, C-002, C-003, C-004 | Completed | all touched unit tests | Passed | Stage 7 validation artifact + integration tests | Passed | Passed | docs updated in Stage 9 |
| C-006 | DS-003, DS-004 | downstream runtime consumption | clean touched server-side consumers back to canonical `turnId` / `turn_id` handling | `autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend.ts`, `autobyteus-server-ts/src/agent-execution/backends/autobyteus/events/autobyteus-stream-event-converter.ts`, `autobyteus-ts/src/external-channel/runtime/channel-reply-bridge-support.ts` | same | Modify | C-002, C-003 | Completed | `autobyteus-server-ts/tests/unit/agent-execution/backends/autobyteus/autobyteus-agent-run-backend.test.ts`, `autobyteus-server-ts/tests/unit/agent-execution/backends/autobyteus/events/autobyteus-stream-event-converter.test.ts`, `autobyteus-server-ts/tests/unit/external-channel/runtime/channel-agent-run-reply-bridge.test.ts` | Passed | targeted Stage 7 unit-style executable validation | Passed | Passed | no alias retention |

### Requirement, Spine, And Design Traceability

| Requirement | Acceptance Criteria ID(s) | Spine ID(s) | Design Section | Use Case / Call Stack | Planned Task ID(s) | Stage 6 Verification (Unit/Integration) | Stage 7 Scenario ID(s) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| R-001 | AC-001, AC-002 | DS-001 | ownership map / architecture direction | UC-001 | C-001, C-002 | unit + integration | AV-001 |
| R-002 | AC-003 | DS-002, DS-004 | ownership map / bounded local spine | UC-002, UC-003 | C-001, C-002 | unit + integration | AV-002 |
| R-003 | AC-004 | DS-001 | ownership boundary | UC-001, UC-004 | C-001, C-004 | unit + integration | AV-001 |
| R-004 | AC-005, AC-006 | DS-003 | return/event spine | UC-003 | C-002, C-003 | unit | AV-003 |
| R-005 | AC-002, AC-003, AC-006 | DS-001, DS-002, DS-003, DS-004 | legacy removal policy | UC-001, UC-002, UC-003 | C-001, C-002, C-003 | unit + integration | AV-001, AV-002, AV-003 |
| R-006 | AC-007 | DS-001, DS-002, DS-003, DS-004 | Stage 7 planned coverage | UC-005 | C-005 | unit + integration | AV-001, AV-002, AV-003, AV-004 |

### Stage 7 Planned Coverage Mapping (Input Only)

| Acceptance Criteria ID | Requirement ID | Spine ID(s) | Expected Outcome | Stage 7 Scenario ID(s) | Test Level (`API`/`E2E`) | Initial Status (`Planned`/`Blocked`) |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | R-001 | DS-001 | user-originated input creates and stores one explicit active `AgentTurn` | AV-001 | API | Planned |
| AC-003 | R-002 | DS-002, DS-004 | one batch groups one or more tool invocations and settles in invocation order | AV-002 | API | Planned |
| AC-005 | R-004 | DS-003 | streamed segment events expose `turn_id` | AV-003 | API | Planned |
| AC-007 | R-006 | DS-001, DS-002, DS-003, DS-004 | executable evidence covers outer turn, batch settlement, stream identity propagation, and downstream runtime consumption | AV-004 | API | Planned |

### Design Delta Traceability

| Change ID (from proposed design doc) | Planned Task ID(s) | Includes Remove/Rename Work | Verification |
| --- | --- | --- | --- |
| C-001 | C-001 | Yes | Unit + AV-001 + AV-002 |
| C-002 | C-002 | Yes | Unit + Integration |
| C-003 | C-003 | Yes | Unit + AV-003 |
| C-004 | C-004 | No | Unit + Integration |

### Decommission / Rename Execution Tasks

| Task ID | Item | Action (`Remove`/`Rename`/`Move`) | Cleanup Steps | Risk Notes |
| --- | --- | --- | --- | --- |
| T-DEL-001 | `ToolInvocationTurn` | Rename / Move | replace imports, runtime state fields, and tests with `ToolInvocationBatch` | broad test touch surface |
| T-DEL-002 | `activeTurnId`, `activeToolInvocationTurn` | Remove / Rename | replace with `activeTurn` and `AgentTurn` helpers | handler churn |
| T-DEL-003 | `agentTurnId` / `agent_turn_id` alias names | Remove | replace with canonical `turnId` / `turn_id` in changed runtime, stream, test, and touched downstream scope | broad rename touch surface |

### Step-By-Step Plan

1. Introduce `AgentTurn` and `ToolInvocationBatch`, then rewire `AgentRuntimeState`.
2. Update runtime event models, handlers, and tool lifecycle payload builders to use explicit outer-turn ownership with canonical `turnId`.
3. Add explicit `turn_id` to segment-event and tool lifecycle stream payloads while removing `agent_turn_id`.
4. Update unit and integration tests to cover the new runtime model and stream contract.
5. Run Stage 7 validation, then Stage 8 review, Stage 9 docs sync, and Stage 10 handoff.

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
- Changed source implementation files kept within proactive size-pressure guardrails (`>500` avoided; `>220` pressure assessed/acted on): `Yes`

### Code Review Gate Plan (Stage 8)

- Gate artifact path: `tickets/done/agent-turn-model-refactor/code-review.md`
- Scope (source + tests):
  - runtime models
  - handler flow
  - streaming payload models
  - touched unit/integration tests
- line-count measurement command (`effective non-empty`):
  - `rg -n "\\S" <file-path> | wc -l`
  - `git diff --numstat origin/personal...HEAD -- <file-path>`
- `>500` effective-line source file hard-limit policy and expected design-impact action:
  - split any changed source file that crosses the hard limit before Stage 8 can pass
- per-file diff delta gate (`>220` changed lines) assessment approach:
  - check each changed source file after implementation and split or document pressure handling before Stage 8
- file-placement review approach:
  - ensure outer-turn runtime logic stays in `src/agent/`, not `src/memory/`

### Test Strategy

- Unit tests:
  - `AgentRuntimeState`
  - `AgentTurn`
  - `ToolInvocationBatch`
  - `LLMUserMessageReadyEventHandler`
  - `ToolResultEventHandler`
  - stream payload parsers
- Integration tests:
  - memory + tool-call flow
  - tool approval / execution / denial flow
  - memory + LLM flow
- Stage 6 boundary:
  - file and handler/service-level verification only
- Stage 7 handoff notes for API/E2E and executable validation:
  - canonical artifact path: `tickets/done/agent-turn-model-refactor/api-e2e-testing.md`
  - expected acceptance criteria count: `7`
  - critical flows to validate:
    - outer turn creation and reuse
    - grouped tool settlement
    - segment-event `turn_id`
    - tool lifecycle payload `turn_id`
    - touched frontend segment payload symmetry and synthetic segment construction
  - expected scenario count: `5`
  - known environment constraints:
    - live LM Studio memory scenarios require an explicit extended test timeout in the current environment
    - full `autobyteus-server-ts` package compilation is currently blocked by unrelated workspace dependency issues, so downstream validation is targeted to the touched compatibility seam tests
- Stage 8 handoff notes for code review:
  - canonical artifact path: `tickets/done/agent-turn-model-refactor/code-review.md`
  - expected scorecard drag areas:
    - event-model rename breadth
    - stream contract consistency
  - files likely to exceed size/ownership/SoC thresholds:
    - `autobyteus-ts/src/agent/handlers/llm-user-message-ready-event-handler.ts`
    - `autobyteus-ts/src/agent/handlers/tool-result-event-handler.ts`

## Execution Tracking (Update Continuously)

### Kickoff Preconditions Checklist

- Workflow state is current (`tickets/done/agent-turn-model-refactor/workflow-state.md`): `Yes`
- `workflow-state.md` shows `Current Stage = 6` and `Code Edit Permission = Unlocked` before source edits: `Yes`
- Scope classification confirmed (`Small`/`Medium`/`Large`): `Yes`
- Investigation notes are current (`tickets/done/agent-turn-model-refactor/investigation-notes.md`): `Yes`
- Requirements status is `Design-ready` or `Refined`: `Yes`
- Future-state runtime call stack review final gate is `Implementation can start: Yes`: `Yes`
- Future-state runtime call stack review reached `Go Confirmed` with two consecutive clean deep-review rounds: `Yes`
- No unresolved blocking findings: `Yes`

### Progress Log

- 2026-04-04: Stage 6 baseline created and implementation plan recorded.
- 2026-04-04: Introduced `AgentTurn` and `ToolInvocationBatch`, removed `ToolInvocationTurn`, and rewired runtime state around the explicit outer turn model.
- 2026-04-04: Stage 10 re-entry changed the canonical naming decision back to `turnId` / `turn_id`, so the in-flight implementation must remove `agentTurnId` / `agent_turn_id` and retest the touched downstream consumers.
- 2026-04-04: Cleaned the touched `autobyteus-server-ts` autobyteus adapters back to canonical `turnId` / `turn_id`, using `activeTurn.turnId` as the single runtime source of truth.
- 2026-04-04: Stage 6 verification passed with `autobyteus-ts` build success, green handler/unit suites, green memory/tool approval integration coverage, and green targeted `autobyteus-server-ts` seam tests.

- 2026-04-04: Re-entry implementation completed for mandatory segment-event `turn_id`, including producer-chain enforcement in the streaming factory, parser config/context, parser event emitter, direct reasoning emission, and touched downstream consumers.
- 2026-04-04: Focused validation passed for the streaming unit slice, targeted runtime/handler unit coverage, parser integration coverage, a targeted memory/tool integration flow, the touched server seam tests, and `pnpm -C autobyteus-ts build`.

- 2026-04-04: Touched `autobyteus-web` now declares `turn_id` on segment payload types, threads it through synthetic segment construction for out-of-order content and tool lifecycle materialization, and logs it in both agent and team streaming services.
- 2026-04-04: Frontend validation passed after preparing Nuxt types and rerunning the full `services/agentStreaming` Vitest slice so the web stream contract stays symmetric with the backend.
