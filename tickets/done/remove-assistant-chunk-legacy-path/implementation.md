# Implementation

## Scope Classification

- Classification: `Small`
- Reasoning: The live architecture is already segment-first. The task is a bounded decommission pass across a small set of runtime, CLI, and test files.

## Upstream Artifacts (Required)

- Workflow state: `tickets/done/remove-assistant-chunk-legacy-path/workflow-state.md`
- Investigation notes: `tickets/done/remove-assistant-chunk-legacy-path/investigation-notes.md`
- Requirements: `tickets/done/remove-assistant-chunk-legacy-path/requirements.md`

## Document Status

- Current Status: `Completed`
- Notes: Stage 6 execution completed on `2026-04-08`. The assistant chunk cleanup landed without re-entry, targeted unit/integration validation passed, and downstream gate artifacts are recorded in `api-e2e-testing.md`, `code-review.md`, and `docs-sync.md`.

## Plan Baseline (Freeze Until Replanning)

### Preconditions (Must Be True Before Finalizing The Baseline)

- `requirements.md` is at least `Design-ready` (`Refined` allowed): `Yes`
- Acceptance criteria use stable IDs (`AC-*`) with measurable expected outcomes: `Yes`
- `workflow-state.md` is current and Stage 5 review-gate evidence is recorded: `Yes`
- Runtime call stack review artifact exists and is current: `Yes`
- All in-scope use cases reviewed: `Yes`
- No unresolved blocking findings: `Yes`
- Future-state runtime call stack review has `Go Confirmed` with two consecutive clean deep-review rounds: `Yes`

### Solution Sketch

- Use Cases In Scope:
  - `UC-001` Local runtime emits assistant deltas through segment events only.
  - `UC-002` CLI/team displays consume segment events and final completion without chunk fallback.
  - `UC-003` Server/runtime tests assert segment-first forwarding with no chunk protocol branch.
- Spine Inventory In Scope:
  - `DS-001` `LLMUserMessageReadyEventHandler -> AgentExternalEventNotifier -> AgentEventStream -> CLI/team consumers`
  - `DS-002` `StreamEvent -> AutoByteusStreamEventConverter -> AgentRunEvent -> websocket integration test`
- Primary Spine Span Sufficiency Rationale:
  - The cleanup must preserve the full assistant streaming path from runtime emission through consumer rendering rather than only deleting a local enum member.
- Primary Owners / Main Domain Subjects:
  - `autobyteus-ts` agent runtime and CLI streaming consumers
  - `autobyteus-server-ts` runtime event conversion tests/boundary
- Requirement Coverage Guarantee:
  - `R-001`/`R-002` map to `DS-001`
  - `R-003`/`R-004` map to `DS-002` plus direct protocol/test cleanup
- Target Architecture Shape:
  - One incremental assistant path: `SEGMENT_EVENT`
  - One final assistant payload path: `ASSISTANT_COMPLETE_RESPONSE`
  - No chunk event enum/member/notifier/generator/fallback branches in in-scope production code
- New Owners/Boundary Interfaces To Introduce:
  - None
- API/Behavior Delta:
  - Remove chunk-specific internal event types and compatibility rendering branches
  - Preserve segment and completion behavior
- Key Assumptions:
  - In-repo consumers are the decision boundary for this cleanup
  - No external runtime still expects `ASSISTANT_CHUNK`
- Known Risks:
  - Dormant tests may need substantial rewrites because they were built directly around chunk payloads

### Runtime Call Stack Review Gate Summary (Required)

| Round | Review Result | Findings Requiring Persisted Updates | New Use Cases Discovered | Persisted Updates Completed | Classification (`Design Impact`/`Requirement Gap`/`Unclear`/`N/A`) | Required Re-Entry Path | Round State (`Reset`/`Candidate Go`/`Go Confirmed`) | Clean Streak After Round |
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
| 1 | `DS-001` | `autobyteus-ts` runtime | Remove chunk notifier, stream event type, and bridge mapping | Stage 5 go-confirmed | Removes dead producer-side contract first |
| 2 | `DS-001` | `autobyteus-ts` CLI | Remove chunk-only fallback rendering/state handling | Runtime event cleanup | Consumers should only reflect the surviving segment contract |
| 3 | `DS-002` | `autobyteus-server-ts` | Remove chunk-drop branch/tests that only exist because upstream enum still exists | Runtime event cleanup | Server boundary should align with the tightened upstream contract |
| 4 | `DS-001`,`DS-002` | tests | Rewrite unit/integration tests to segment-only expectations | All source changes | Validation closes the contract cleanup |

### File Placement Plan (Mandatory)

| Item | Current Path | Target Path | Owning Concern / Platform | Action (`Keep`/`Move`/`Split`/`Promote Shared`) | Verification |
| --- | --- | --- | --- | --- | --- |
| chunk event definitions | `autobyteus-ts/src/events/event-types.ts`, `autobyteus-ts/src/agent/streaming/events/stream-events.ts` | same | `autobyteus-ts` runtime streaming | `Keep` | Remove obsolete members in place |
| chunk compatibility rendering | `autobyteus-ts/src/cli/...` files | same | CLI streaming display/state | `Keep` | Simplify handlers in place to segment-only |
| server converter/test boundary | `autobyteus-server-ts/src/...`, `autobyteus-server-ts/tests/...` | same | server runtime bridge | `Keep` | Remove obsolete branch/expectations in place |

### Implementation Work Table (Primary Tracker)

| Change ID | Spine ID(s) | Owner | Concern | Current Path | Target Path | Action (`Create`/`Modify`/`Move`/`Split`/`Remove`) | Depends On | Implementation Status (`Planned`/`In Progress`/`Completed`/`Blocked`) | Unit Test File | Unit Test Status (`Planned`/`Passed`/`Failed`/`N/A`) | Integration Test File | Integration Test Status (`Planned`/`Passed`/`Failed`/`N/A`) | Stage 8 Review Status (`Planned`/`Passed`/`Failed`/`N/A`) | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-001 | `DS-001` | `autobyteus-ts` runtime | Remove chunk event definitions and notifier APIs | `autobyteus-ts/src/events/event-types.ts`, `autobyteus-ts/src/agent/events/notifiers.ts`, `autobyteus-ts/src/agent/streaming/events/stream-events.ts`, `autobyteus-ts/src/agent/streaming/streams/agent-event-stream.ts` | same | Modify/Remove | Stage 5 go-confirmed | Completed | `autobyteus-ts/tests/unit/agent/events/notifiers.test.ts`, `autobyteus-ts/tests/unit/agent/streaming/streams/agent-event-stream.test.ts`, `autobyteus-ts/tests/unit/agent/streaming/events/stream-events.test.ts`, `autobyteus-ts/tests/unit/events/event-types.test.ts` | Passed | N/A | N/A | Passed | Removed `AGENT_DATA_ASSISTANT_CHUNK`, `ASSISTANT_CHUNK`, related payload classes, and the chunk-only stream generator. |
| C-002 | `DS-001` | `autobyteus-ts` CLI | Remove chunk compatibility rendering/state branches | `autobyteus-ts/src/cli/agent/cli-display.ts`, `autobyteus-ts/src/cli/agent-team/state-store.ts`, `autobyteus-ts/src/cli/agent-team/widgets/focus-pane-history.ts` | same | Modify | C-001 | Completed | `autobyteus-ts/tests/unit/cli/agent-team-state-store.test.ts` | Passed | N/A | N/A | Passed | CLI/team consumers now react to `SEGMENT_EVENT` plus `ASSISTANT_COMPLETE_RESPONSE` only. |
| C-003 | `DS-002` | `autobyteus-server-ts` | Remove now-unreachable server branch and align tests | `autobyteus-server-ts/src/agent-execution/backends/autobyteus/events/autobyteus-stream-event-converter.ts`, `autobyteus-server-ts/tests/unit/agent-execution/backends/autobyteus/events/autobyteus-stream-event-converter.test.ts`, `autobyteus-server-ts/tests/integration/agent/agent-team-websocket.integration.test.js` | same | Modify | C-001 | Completed | `autobyteus-server-ts/tests/unit/agent-execution/backends/autobyteus/events/autobyteus-stream-event-converter.test.ts` | Passed | `autobyteus-server-ts/tests/integration/agent/agent-team-websocket.integration.test.ts` | Passed | Passed | Removed the dead converter drop branch and aligned active/stale server-side expectations to the segment-only websocket contract. |

### Requirement, Spine, And Design Traceability

| Requirement | Acceptance Criteria ID(s) | Spine ID(s) | Design Section | Use Case / Call Stack | Planned Task ID(s) | Stage 6 Verification (Unit/Integration) | Stage 7 Scenario ID(s) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `R-001` | `AC-001` | `DS-001` | Solution Sketch | `UC-001` | `C-001` | Unit | `AV-001` |
| `R-002` | `AC-002` | `DS-001` | Solution Sketch | `UC-001`,`UC-002` | `C-001`,`C-002` | Unit | `AV-002` |
| `R-003` | `AC-003` | `DS-002` | Solution Sketch | `UC-003` | `C-003` | Unit/Integration | `AV-003` |
| `R-004` | `AC-004` | `DS-001`,`DS-002` | Solution Sketch | `UC-001`,`UC-002`,`UC-003` | `C-001`,`C-002`,`C-003` | Unit/Integration | `AV-004` |

### Stage 7 Planned Coverage Mapping (Input Only)

| Acceptance Criteria ID | Requirement ID | Spine ID(s) | Expected Outcome | Stage 7 Scenario ID(s) | Test Level (`API`/`E2E`) | Initial Status (`Planned`/`Blocked`) |
| --- | --- | --- | --- | --- | --- | --- |
| `AC-001` | `R-001` | `DS-001` | No production caller or notifier method remains for assistant chunk emission | `AV-001` | API | Planned |
| `AC-002` | `R-002` | `DS-001` | CLI/runtime stream handling is segment-only | `AV-002` | API | Planned |
| `AC-003` | `R-003` | `DS-002` | Active server tests remain segment-only and web protocol stays unchanged | `AV-003` | API | Planned |
| `AC-004` | `R-004` | `DS-001`,`DS-002` | In-scope dead code/tests are removed or rewritten | `AV-004` | API | Planned |

### Decommission / Rename Execution Tasks

| Task ID | Item | Action (`Remove`/`Rename`/`Move`) | Cleanup Steps | Risk Notes |
| --- | --- | --- | --- | --- |
| `T-DEL-001` | Assistant chunk event members and generator methods | Remove | Delete enum members, notifier method, stream mappings, and related tests | External consumers could break if they relied on these exports |
| `T-DEL-002` | CLI chunk fallback branches | Remove | Simplify render/state logic to segments plus completion | Must preserve speaking-state UX |

### Step-By-Step Plan

1. Remove assistant chunk definitions and bridge APIs from `autobyteus-ts`.
2. Simplify CLI/team consumers to segment-only streaming.
3. Remove obsolete server branch and align active/stale tests in scope.
4. Run targeted validation and complete review/docs artifacts.

### Backward-Compat And Decoupling Guardrails (Mandatory)

- Backward-compatibility mechanisms introduced: `None`
- Legacy code retained for old behavior: `No`
- Dead/obsolete code or unused helpers/tests/flags/adapters left in scope: `Target is No`
- Shared data structures remain tight: `Yes`
- Spine Span Sufficiency preserved: `Yes`
- Authoritative Boundary Rule preserved: `Yes`
- Decoupling impact assessment completed: `Yes`
- New tight coupling or cyclic dependency introduced: `No`

## Execution Tracking

### Current Execution Status

- Stage 6 started on `2026-04-08` after `Go Confirmed`.
- Stage 6 source cleanup completed on `2026-04-08` with no classified re-entry.
- Validation executed on the final tree:
  - `pnpm -C autobyteus-ts exec vitest run tests/unit/events/event-types.test.ts tests/unit/agent/events/notifiers.test.ts tests/unit/agent/streaming/events/stream-event-payloads.test.ts tests/unit/agent/streaming/events/stream-events.test.ts tests/unit/agent/streaming/reexports.test.ts tests/unit/agent/streaming/streams/agent-event-stream.test.ts tests/unit/cli/agent-team-state-store.test.ts tests/unit/agent-team/streaming/agent-event-bridge.test.ts tests/unit/agent-team/streaming/agent-team-event-notifier.test.ts` -> `9` files passed, `39` tests passed
  - `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-execution/backends/autobyteus/events/autobyteus-stream-event-converter.test.ts tests/integration/agent/agent-team-websocket.integration.test.ts --no-watch` -> `2` files passed, `25` tests passed
- Cleanup audit on `2026-04-08`:
  - `rg -n "ASSISTANT_CHUNK|AGENT_DATA_ASSISTANT_CHUNK|AssistantChunkData|createAssistantChunkData|notifyAgentDataAssistantChunk|streamAssistantChunks" autobyteus-ts/src autobyteus-ts/tests autobyteus-server-ts/src autobyteus-server-ts/tests autobyteus-web || true` -> no matches
- Downstream gate status pointers:
  - Stage 7 executable validation: `api-e2e-testing.md`
  - Stage 8 code review: `code-review.md`
  - Stage 9 docs sync: `docs-sync.md`
