# Stage 7 Executable Validation (API/E2E)

## Validation Round Meta

- Current Validation Round: `4`
- Trigger Stage: `6`
- Prior Round Reviewed: `3`
- Latest Authoritative Round: `4`

## Scope

- Ticket: `agent-turn-model-refactor`
- Runtime targets:
  - `autobyteus-ts` turn-owned streaming producer chain
  - `autobyteus-ts` parser / streaming handler utilities
  - touched `autobyteus-server-ts` autobyteus-consumer seam
  - touched `autobyteus-web` streaming protocol + handler/service layer
- Contract under validation:
  - segment events require `turn_id`
  - segment producers must construct events with `turnId` instead of mutating `turn_id` later
  - touched frontend segment payload types explicitly declare `turn_id` and synthetic segment paths thread it through
  - canonical naming remains `turnId` / `turn_id`

## Round History

| Round | Trigger | Prior Unresolved Failures Rechecked (`Yes`/`No`/`N/A`) | New Failures Found (`Yes`/`No`) | Gate Result (`Pass`/`Fail`/`Blocked`) | Latest Authoritative (`Yes`/`No`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Stage 6 exit | N/A | No | Pass | No | Superseded by later reruns. |
| 2 | Stage 6 re-entry implementation | Yes | No | Pass | No | Superseded by the mandatory segment-event `turn_id` rerun. |
| 3 | Stage 6 re-entry implementation | Yes | No | Pass | No | Validation reran after making `turn_id` mandatory on `SegmentEvent` and pushing turn identity through the producer chain. |
| 4 | Stage 6 re-entry implementation | Yes | No | Pass | Yes | Validation reran after aligning the touched `autobyteus-web` streaming payload types and synthetic segment paths on explicit `turn_id`. |

## Acceptance Criteria Coverage

| Acceptance Criteria ID | Requirement ID | Criterion Summary | Scenario ID(s) | Status | Last Updated |
| --- | --- | --- | --- | --- | --- |
| AC-001 | R-001 | explicit `AgentTurn` exists and runtime stores `activeTurn` | AV-001 | Passed | 2026-04-04 |
| AC-002 | R-001, R-005 | loose outer-turn runtime fields and misnamed inner-turn runtime state are removed in changed scope | AV-001, AV-002 | Passed | 2026-04-04 |
| AC-003 | R-002, R-005 | `ToolInvocationBatch` handles single and grouped settlement | AV-002 | Passed | 2026-04-04 |
| AC-004 | R-003 | `MemoryManager` remains agent-scoped | AV-001, AV-002 | Passed | 2026-04-04 |
| AC-005 | R-004 | segment events require `turn_id` and expose it in serialized payloads | AV-003 | Passed | 2026-04-04 |
| AC-006 | R-004, R-005 | runtime, lifecycle, and touched frontend stream payloads use canonical `turnId` / `turn_id` consistently | AV-003, AV-004, AV-005 | Passed | 2026-04-04 |
| AC-007 | R-006 | durable tests plus executable evidence cover turn creation, batch settlement, tool-loop identity, segment correlation, and touched frontend stream symmetry | AV-001, AV-002, AV-003, AV-004, AV-005 | Passed | 2026-04-04 |

## Scenario Catalog

| Scenario ID | Spine ID(s) | Objective | Durable Validation Asset(s) | Command / Harness | Status |
| --- | --- | --- | --- | --- | --- |
| AV-001 | DS-001, DS-004 | prove that one explicit outer `AgentTurn` is created, stored, and used as the runtime outer-turn owner | `autobyteus-ts/tests/unit/agent/context/agent-runtime-state.test.ts`, `autobyteus-ts/tests/unit/agent/handlers/llm-user-message-ready-event-handler.test.ts` | `pnpm -C autobyteus-ts exec vitest run tests/unit/agent/handlers/llm-user-message-ready-event-handler.test.ts tests/unit/agent/streaming/events/stream-event-payloads.test.ts tests/unit/agent/context/agent-runtime-state.test.ts --reporter=dot` | Passed |
| AV-002 | DS-002, DS-004 | prove that one outer turn can contain grouped tool settlements and preserve `turnId` through tool loops | `autobyteus-ts/tests/unit/agent/streaming/handlers/api-tool-call-streaming-response-handler.test.ts`, `autobyteus-ts/tests/integration/agent/memory-tool-call-flow.test.ts` | `pnpm -C autobyteus-ts exec vitest run tests/integration/agent/streaming/parser/streaming-parser.test.ts tests/integration/agent/streaming/json-tool-styles-integration.test.ts tests/integration/agent/memory-tool-call-flow.test.ts --reporter=dot` | Passed |
| AV-003 | DS-003 | prove that streamed segment events require `turn_id` and are constructed with turn identity already attached | `autobyteus-ts/tests/unit/agent/streaming/segments/segment-events.test.ts`, `autobyteus-ts/tests/unit/agent/streaming/events/stream-event-payloads.test.ts`, `autobyteus-ts/tests/unit/agent/streaming/handlers/parsing-streaming-response-handler.test.ts`, `autobyteus-ts/tests/unit/agent/streaming/handlers/streaming-handler-factory.test.ts`, `autobyteus-ts/tests/unit/agent/streaming/parser/**/*.test.ts` | `pnpm -C autobyteus-ts exec vitest run tests/unit/agent/streaming --reporter=dot` | Passed |
| AV-004 | DS-003, DS-004 | prove that touched downstream server-side consumers still resolve the outer turn with canonical names and required segment `turn_id` | `autobyteus-server-ts/tests/unit/agent-execution/backends/autobyteus/events/autobyteus-stream-event-converter.test.ts`, `autobyteus-server-ts/tests/unit/external-channel/runtime/channel-agent-run-reply-bridge.test.ts`, `autobyteus-server-ts/tests/unit/agent-execution/backends/autobyteus/autobyteus-agent-run-backend.test.ts` | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-execution/backends/autobyteus/events/autobyteus-stream-event-converter.test.ts tests/unit/external-channel/runtime/channel-agent-run-reply-bridge.test.ts tests/unit/agent-execution/backends/autobyteus/autobyteus-agent-run-backend.test.ts --reporter=dot` | Passed |
| AV-005 | DS-003 | prove that touched frontend stream payload types explicitly declare `turn_id` and preserve it through out-of-order content recovery and synthetic tool lifecycle segment construction | `autobyteus-web/services/agentStreaming/handlers/__tests__/segmentHandler.spec.ts`, `autobyteus-web/services/agentStreaming/handlers/__tests__/toolLifecycleOrdering.spec.ts`, `autobyteus-web/services/agentStreaming/protocol/__tests__/segmentTypes.spec.ts`, `autobyteus-web/services/agentStreaming/__tests__/AgentStreamingService.spec.ts`, `autobyteus-web/services/agentStreaming/__tests__/TeamStreamingService.spec.ts` | `pnpm -C autobyteus-web exec nuxt prepare && pnpm -C autobyteus-web exec vitest run services/agentStreaming --reporter=dot` | Passed |

## Additional Verification

| Command | Purpose | Result |
| --- | --- | --- |
| `pnpm -C autobyteus-ts build` | compile the changed runtime after the mandatory segment-event `turn_id` re-entry | Passed |
| `pnpm -C autobyteus-web exec nuxt prepare` | materialize `.nuxt/tsconfig.json` so frontend streaming validation can run in the worktree | Passed |
| `pnpm -C autobyteus-web exec vitest run services/agentStreaming --reporter=dot` | validate the touched frontend streaming protocol, handlers, services, and browser/transport support slice after the `turn_id` symmetry update | Passed |

## Environment Notes

- `autobyteus-ts/.env.test`, `autobyteus-server-ts/.env`, and `autobyteus-server-ts/.env.test` were copied from the main repo into the worktree before validation.
- The main repo does not currently contain `autobyteus-ts/.env`, so there was no source file to copy for that path.
- The targeted memory/tool integration command passed in this environment even though LM Studio discovery logged a connection warning for `http://127.0.0.1:1234`; that warning was non-blocking for this validation slice.
- `autobyteus-web` required `pnpm -C autobyteus-web exec nuxt prepare` in this worktree before Vitest could resolve `.nuxt/tsconfig.json`; after preparation, the full `services/agentStreaming` slice passed.

## Stage 7 Gate Decision

- Latest authoritative round: `4`
- Decision: `Pass`
- Stage 7 complete: `Yes`
- All in-scope acceptance criteria mapped to scenarios: `Yes`
- All executable in-scope acceptance criteria passed: `Yes`
- All relevant spines passed: `Yes`
- Ready to enter Stage 8 code review: `Yes`
- Notes:
  - the mandatory `turn_id` segment contract is now validated at the segment model, producer-chain, parser/handler utility, downstream seam, and touched frontend stream-consumption layers
  - no remaining turn-less segment emission paths were observed in the validated runtime surfaces or the touched frontend stream payload models
