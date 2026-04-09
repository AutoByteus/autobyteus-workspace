# Proposed Design Document

## Design Version

- Current Version: `v1`

## Revision History

| Version | Trigger | Summary Of Changes | Related Review Round |
| --- | --- | --- | --- |
| v1 | Initial draft | Captured the attribution strategy, removed non-required Codex token persistence from the backend hot path, added team metadata refresh coalescing, and kept long-turn cadence probes as durable validation assets. | 1 |

## Artifact Basis

- Investigation Notes: `tickets/done/codex-stream-stall/investigation-notes.md`
- Requirements: `tickets/done/codex-stream-stall/requirements.md`
- Requirements Status: `Design-ready`

## Summary

The design does not attempt to hide or rewrite native `codex app-server` cadence behavior. Instead it does three things:

1. prove attribution with same-run raw-vs-backend measurement and native direct probing,
2. remove a non-required Codex-specific side effect from the backend event path,
3. reduce an identified AutoByteus team-stream amplifier by coalescing metadata refresh work.

## Goal / Intended Change

- Determine whether the progressive slowdown is created by AutoByteus or already present in native Codex output.
- Keep AutoByteus from adding avoidable extra work to the streaming path.
- Preserve useful performance probes as future regression tools.

## Legacy Removal Policy

- Policy: `No backward compatibility; remove legacy code paths.`
- In-scope removal: Codex token-usage persistence in the backend run path.
- No compatibility wrapper is needed because Codex token persistence is not a retained requirement.

## Requirements And Use Cases

| Requirement ID | Description | Acceptance Criteria ID(s) | Acceptance Criteria Summary | Use Case IDs |
| --- | --- | --- | --- | --- |
| R-001 | Attribute the stall scientifically | AC-001, AC-002 | Same-run raw-vs-backend comparison and direct native probing exist | UC-001, UC-005 |
| R-002 | Avoid false product claims | AC-003 | Final outcome states whether AutoByteus is root cause or local amplifier | UC-001, UC-002 |
| R-003 | Remove non-required Codex token persistence | AC-004 | Backend no longer persists Codex token usage into AutoByteus stats store | UC-003 |
| R-004 | Reduce local team-path amplification | AC-005 | Team metadata refresh is coalesced instead of executed per event | UC-002, UC-004 |
| R-005 | Leave durable validation | AC-006 | Unit and probe coverage remain available for future regressions | UC-003, UC-005 |

## Current-State Read

| Area | Findings | Evidence (files/functions) | Open Unknowns |
| --- | --- | --- | --- |
| Entrypoints / Current Spine Or Fragmented Flow | Codex thread messages enter `CodexAgentRunBackend`, are converted, and are dispatched to runtime listeners. | `src/agent-execution/backends/codex/backend/codex-agent-run-backend.ts` | Frontend render cadence still needs separate instrumentation. |
| Current Ownership Boundaries | Team websocket handling and team metadata refresh live together in `AgentTeamStreamHandler`. | `src/services/agent-streaming/agent-team-stream-handler.ts` | None in the changed scope. |
| Current Coupling / Fragmentation Problems | Codex token persistence added a store write into the backend event path even though Codex usage accounting is not a product requirement. | prior `persistReadyTurnTokenUsages` path in `CodexAgentRunBackend` | None. |
| Existing Constraints / Compatibility Facts | Native `codex app-server` already shows the same slow/silent phases, so AutoByteus cannot claim a full fix here. | `investigation-notes.md`, `paired-cadence-measurements.md` | UI-side amplification remains a follow-up topic. |
| Relevant Files / Components | Backend event bridge, team stream handler, unit tests, token-usage e2e test, long-turn probe tests. | changed files in `autobyteus-server-ts` | None. |

## Data-Flow Spine Inventory

| Spine ID | Scope | Start | End | Owning Node / Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | Native `codex app-server` notification | AutoByteus runtime event listeners | `CodexAgentRunBackend` | This is the attribution spine that proves whether the backend adds measurable backlog. |
| DS-002 | Return-Event | Team run event callback | Metadata refresh write | `AgentTeamStreamHandler` | This is the local amplification spine where repeated work was identified. |
| DS-003 | Bounded Local | Probe test execution | Ticket evidence and test output | probe tests under `tests/integration/runtime-execution/codex-app-server/thread` | This preserves scientific evidence as durable validation. |

## Primary Execution / Data-Flow Spine(s)

- `codex app-server -> CodexThread -> CodexAgentRunBackend -> CodexThreadEventConverter -> dispatchRuntimeEvent -> listeners`
- `TeamRun -> AgentTeamStreamHandler event callback -> websocket send -> scheduleMetadataRefresh -> TeamRunService.refreshRunMetadata`

## Spine Narratives

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | Raw Codex messages are converted into runtime events and dispatched immediately, without a Codex-specific token-store write in the middle. | `CodexThread`, `CodexAgentRunBackend`, `CodexThreadEventConverter` | Codex backend runtime bridge | test probes, logging |
| DS-002 | Team-run events still reach the websocket immediately, but metadata refresh work is coalesced so the stream does not perform a write per event. | `TeamRun`, `AgentTeamStreamHandler`, `TeamRunService` | team stream handler | websocket transport |
| DS-003 | Durable probe tests generate long tasks and record cadence evidence so future regressions can be attributed instead of guessed. | integration probe tests, ticket evidence | test layer | temporary workspaces, Codex runtime availability |

## Ownership Map

| Node / Owner | Owns | Must Not Own | Notes |
| --- | --- | --- | --- |
| `CodexAgentRunBackend` | dispatching converted runtime events for a Codex run | AutoByteus token accounting for Codex runs | Removing token persistence restores single-purpose ownership. |
| `AgentTeamStreamHandler` | websocket delivery plus bounded scheduling of metadata refresh work | one metadata write per streamed event | Coalescing keeps IO off the hottest part of the stream. |
| Probe tests | long-turn cadence evidence | product behavior changes | They are validation assets, not runtime logic. |

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Serves Which Owner | Responsibility | Must Stay Off Main Line? |
| --- | --- | --- | --- |
| Token usage statistics | AutoByteus-native runtime reporting | Persist usage for runtimes that require AutoByteus-owned accounting | Yes |
| Metadata refresh | team run UI summaries | update team summary fields after stream activity | Yes |
| Performance probes | engineering validation | attribute slowdown and compare cadence series | Yes |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Codex event dispatch | `agent-execution/backends/codex` | Reuse | The existing backend already owns Codex thread message handling. | N/A |
| Team metadata refresh coalescing | `services/agent-streaming` | Extend | The handler already owns stream-event fanout. | N/A |
| Long-turn performance evidence | integration test area under `runtime-execution/codex-app-server/thread` | Extend | Probe tests belong beside other Codex runtime execution tests. | N/A |

## Ownership-Driven Dependency Rules

- Allowed dependency directions:
  - `CodexThread -> CodexAgentRunBackend -> runtime listeners`
  - `TeamRun -> AgentTeamStreamHandler -> TeamRunService`
- Authoritative public entrypoints versus internal owned sub-layers:
  - `CodexAgentRunBackend` remains the only backend entrypoint for run-event dispatch.
  - `AgentTeamStreamHandler` remains the owner of team websocket delivery.
- Authoritative Boundary Rule per domain subject:
  - callers above the Codex backend should consume backend runtime events, not backend internals plus token-store details.
  - callers above the team stream handler should consume websocket output, not force direct metadata writes.
- Forbidden shortcuts:
  - reintroducing Codex-specific token writes into the event dispatch loop,
  - adding direct metadata writes per event outside the handler scheduling boundary.

## Architecture Direction Decision

- Chosen direction: `Keep the main bridge shape, remove the non-required Codex side effect, and throttle the local team-path side effect.`
- Rationale: this preserves the proven-good backend dispatch spine while removing avoidable local amplification.
- Data-flow spine clarity assessment: `Yes`
- Spine inventory completeness assessment: `Yes`
- Ownership clarity assessment: `Yes`
- Off-spine concern clarity assessment: `Yes`
- Authoritative Boundary Rule assessment: `Yes`
- File placement within the owning subsystem assessment: `Yes`
- Outcome: `Keep` + `Remove` + `Modify`

## Change Inventory (Delta)

| Change ID | Change Type | Current Path | Target Path | Rationale | Impacted Areas | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| C-001 | Modify | `src/agent-execution/backends/codex/backend/codex-agent-run-backend.ts` | same | Remove Codex token-usage persistence from the hot path. | Codex backend | Keeps dispatch single-purpose. |
| C-002 | Modify | `src/services/agent-streaming/agent-team-stream-handler.ts` | same | Coalesce team metadata refresh work. | Team streaming | Reduces local amplification. |
| C-003 | Modify | existing unit/e2e tests | same | Align tests with the removed Codex token persistence and new team coalescing behavior. | validation | One GraphQL e2e becomes intentionally skipped. |
| C-004 | Add | N/A | `tests/integration/runtime-execution/codex-app-server/thread/*.probe.test.ts` | Keep durable performance probes for attribution work. | validation | Must stay opt-in because they are long-running live tests. |

## Removal / Decommission Plan

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope | Notes |
| --- | --- | --- | --- | --- |
| Codex token-usage persistence in `CodexAgentRunBackend` | Codex usage accounting is not an AutoByteus requirement and should not sit in the dispatch path | no replacement for Codex runtime; AutoByteus-native runtimes keep their own accounting path | In This Change | associated Codex GraphQL assertion is skipped |

## Final Design Decision

- Keep the performance probe tests in-repo as durable validation assets.
- Guard those live probes behind explicit opt-in execution so they remain useful without turning normal test runs into multi-minute Codex jobs.
