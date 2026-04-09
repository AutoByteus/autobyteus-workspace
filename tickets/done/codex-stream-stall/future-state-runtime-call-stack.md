# Future-State Runtime Call Stacks

## Design Basis

- Scope Classification: `Medium`
- Call Stack Version: `v1`
- Requirements: `tickets/done/codex-stream-stall/requirements.md` (status `Design-ready`)
- Source Design Version: `v1`
- Source Design Basis: `tickets/done/codex-stream-stall/proposed-design.md`

## Use Case Index

| use_case_id | Spine ID(s) | Spine Scope | Governing Owner | Source Type | Requirement ID(s) | Design-Risk Objective | Use Case Name | Coverage Target |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| UC-001 | DS-001 | Primary End-to-End | `CodexAgentRunBackend` | Requirement | R-001, R-002 | N/A | Attribute native Codex cadence versus backend cadence | Primary/Error |
| UC-002 | DS-002 | Return-Event | `AgentTeamStreamHandler` | Requirement | R-004 | N/A | Team stream emits immediately while metadata refresh is coalesced | Primary/Error |
| UC-003 | DS-001 | Bounded Local | `CodexAgentRunBackend` | Requirement | R-003 | remove non-required store IO from the dispatch path | Dispatch without Codex token persistence | Primary/Error |
| UC-005 | DS-003 | Bounded Local | integration probe tests | Requirement | R-001, R-005 | preserve durable scientific measurement | Keep long-turn cadence probe tests opt-in and durable | Primary/Error |

## Transition Notes

- No temporary compatibility logic is planned.
- The target state removes the Codex token-persistence branch rather than wrapping or deferring it.

## Use Case: UC-001 Attribute native Codex cadence versus backend cadence

### Spine Context

- Spine ID(s): `DS-001`
- Spine Scope: `Primary End-to-End`
- Governing Owner: `CodexAgentRunBackend`
- Why This Use Case Matters To This Spine: attribution is only valid if the same raw Codex events and backend events can be compared without additional backend buffering.

### Goal

Measure one large real Codex turn and prove whether the backend adds delay beyond native `codex app-server` event cadence.

### Preconditions

- A live Codex runtime is available.
- The probe test creates a temporary workspace and a live thread.

### Expected Outcome

- Raw `item/agentMessage/delta` cadence and backend `SEGMENT_CONTENT` cadence remain aligned within negligible dispatch delay.

### Primary Runtime Call Stack

```text
[ENTRY] tests/integration/runtime-execution/codex-app-server/thread/codex-raw-vs-backend-cadence.probe.test.ts:it(...)
├── src/runtime-management/codex/client/codex-app-server-client-manager.ts:CodexAppServerClientManager.createClient(...) [IO]
├── src/agent-execution/backends/codex/thread/codex-thread-manager.ts:CodexThreadManager.createThread(...) [ASYNC]
├── src/agent-execution/backends/codex/backend/codex-agent-run-backend.ts:CodexAgentRunBackend.subscribeToEvents(...)
├── src/agent-execution/backends/codex/thread/codex-thread.ts:CodexThread.subscribeAppServerMessages(...)
├── src/agent-execution/backends/codex/backend/codex-agent-run-backend.ts:CodexAgentRunBackend.postUserMessage(...) [ASYNC]
├── src/agent-execution/backends/codex/backend/codex-agent-run-backend.ts:CodexAgentRunBackend.handleAppServerMessage(...)
│   ├── src/agent-execution/backends/codex/events/codex-thread-event-converter.ts:CodexThreadEventConverter.convert(...)
│   └── src/agent-execution/backends/shared/runtime-event-dispatch.ts:dispatchRuntimeEvent(...) [STATE]
└── tests/integration/runtime-execution/codex-app-server/thread/codex-raw-vs-backend-cadence.probe.test.ts:buildCumulativeRows(...)
```

### Branching / Fallback Paths

```text
[ERROR] if thread startup or completion times out
tests/integration/runtime-execution/codex-app-server/thread/codex-raw-vs-backend-cadence.probe.test.ts:waitFor(...)
└── throw Error(...)
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`

## Use Case: UC-002 Team stream emits immediately while metadata refresh is coalesced

### Spine Context

- Spine ID(s): `DS-002`
- Spine Scope: `Return-Event`
- Governing Owner: `AgentTeamStreamHandler`
- Why This Use Case Matters To This Spine: the websocket send path must stay immediate while the metadata write becomes bounded side work.

### Goal

Keep streamed team events visible to the client without performing one metadata refresh per event.

### Preconditions

- A websocket connection is bound to a `TeamRun`.

### Expected Outcome

- Every event is still sent immediately.
- Metadata refresh work is scheduled once per debounce window, not once per event.

### Primary Runtime Call Stack

```text
[ENTRY] src/services/agent-streaming/agent-team-stream-handler.ts:AgentTeamStreamHandler.bindSessionToTeamRun(...)
├── TeamRun.subscribeToEvents(event => ...)
│   ├── src/services/agent-streaming/agent-team-stream-handler.ts:AgentTeamStreamHandler.convertTeamEvent(...)
│   ├── WebSocketConnection.send(...) [IO]
│   └── src/services/agent-streaming/agent-team-stream-handler.ts:AgentTeamStreamHandler.scheduleMetadataRefresh(...) [STATE]
└── setTimeout(..., TEAM_METADATA_REFRESH_DEBOUNCE_MS) [ASYNC]
    └── src/agent-team-execution/services/team-run-service.ts:TeamRunService.refreshRunMetadata(...) [IO]
```

### Branching / Fallback Paths

```text
[ERROR] if websocket send fails
src/services/agent-streaming/agent-team-stream-handler.ts:AgentTeamStreamHandler.bindSessionToTeamRun(...)
└── logger.error(...)
```

```text
[ERROR] if metadata refresh fails
src/services/agent-streaming/agent-team-stream-handler.ts:AgentTeamStreamHandler.scheduleMetadataRefresh(...)
└── logger.error(...)
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`

## Use Case: UC-003 Dispatch without Codex token persistence

### Spine Context

- Spine ID(s): `DS-001`
- Spine Scope: `Bounded Local`
- Governing Owner: `CodexAgentRunBackend`
- Why This Use Case Matters To This Spine: the backend hot path should only convert and dispatch runtime events.

### Goal

Ensure Codex backend event dispatch does not block on AutoByteus token-store persistence.

### Expected Outcome

- Runtime events dispatch directly from converted Codex messages.
- Late token-usage updates do not generate persistence work or new runtime events.

### Primary Runtime Call Stack

```text
[ENTRY] src/agent-execution/backends/codex/backend/codex-agent-run-backend.ts:CodexAgentRunBackend.handleAppServerMessage(...)
├── src/agent-execution/backends/codex/events/codex-thread-event-converter.ts:CodexThreadEventConverter.convert(...)
└── src/agent-execution/backends/shared/runtime-event-dispatch.ts:dispatchRuntimeEvent(...)
```

### Branching / Fallback Paths

```text
[ERROR] if conversion or dispatch throws
src/agent-execution/backends/codex/backend/codex-agent-run-backend.ts:CodexAgentRunBackend.constructor(...)
└── logger.error(...)
```

### Coverage Status

- Primary Path: `Covered`
- Fallback Path: `N/A`
- Error Path: `Covered`

## Use Case: UC-005 Keep long-turn cadence probes opt-in and durable

### Spine Context

- Spine ID(s): `DS-003`
- Spine Scope: `Bounded Local`
- Governing Owner: integration probe tests
- Why This Use Case Matters To This Spine: probe tests are useful future evidence, but they must stay explicitly opt-in because they are long and live-runtime dependent.

### Goal

Preserve the probe tests in the repository without turning normal test runs into live Codex load tests.

### Expected Outcome

- Probe tests stay committed.
- Probe tests run only when the Codex binary is available and `RUN_CODEX_E2E=1` is set.

### Primary Runtime Call Stack

```text
[ENTRY] vitest runtime -> describeLiveProbe(...)
├── node:child_process:spawnSync("codex", ["--version"]) [IO]
├── process.env.RUN_CODEX_E2E gate [STATE]
└── test body executes only when both gates pass
```

### Branching / Fallback Paths

```text
[FALLBACK] if Codex is unavailable or live probes are not enabled
describe.skip(...)
```

### Coverage Status

- Primary Path: `Missing`
- Fallback Path: `Covered`
- Error Path: `N/A`
