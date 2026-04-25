# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Design-ready

## Goal / Problem Statement

After a user stops or terminates a previously running team/agent runtime, sending another chat message from that still-open conversation must not fail just because the in-memory active runtime was removed. A stopped-but-persisted team run or individual agent run must be restored through the existing backend runtime/session owner and then receive the follow-up message. Truly missing/deleted/unrecoverable runs must still fail clearly.

The reported concrete failure is a team-member follow-up message to `api_e2e_engineer` after stopping a team, where the UI shows the backend stream error `Team run 'team_software-engineering-team_9620bbbd' not found`.

## Investigation Findings

- The failing string is emitted by `autobyteus-server-ts/src/services/agent-streaming/agent-team-stream-handler.ts` during `/ws/agent-team/:teamRunId` connect when `TeamRunService.getTeamRun(...)` returns no in-memory active run.
- `TeamRunService` already owns durable recovery through `resolveTeamRun(teamRunId)`, which returns an active run or restores it from persisted team metadata. The stream handler bypasses that recovery boundary by calling the active-only `getTeamRun(...)` path.
- The single-agent stream handler has the same active-only shape: `/ws/agent/:runId` connect uses `AgentRunService.getAgentRun(...)`, while `AgentRunService.resolveAgentRun(runId)` already exists and restores from persisted metadata.
- Frontend send paths can explicitly call GraphQL restore when cached resume config says a run is inactive, but that cache can be stale or absent after local stop/termination. Backend stream entrypoints therefore must be authoritative for restore-on-connect/send rather than requiring the frontend to guess runtime materialization state.
- `autobyteus-web/stores/agentTeamRunStore.ts#terminateTeamRun` lacks parity with `agentRunStore.terminateRun`: it updates local team/member status and calls the backend terminate mutation, but does not mark the run-history read model/team resume config inactive or refresh history after termination.

## Recommendations

- Move recover-on-stream ownership into the backend stream handlers by using `AgentRunService.resolveAgentRun(...)` and `TeamRunService.resolveTeamRun(...)` for connect and user-message send paths.
- Keep Stop/terminate semantics separate from Send: tool approvals and stop-generation commands should not restore a stopped runtime just to stop or approve; only connection establishment for a selected conversation and user follow-up send should materialize a persisted run.
- Add the missing frontend team-termination read-model update so team stop/terminate state mirrors single-agent behavior and the UI has a better chance of calling explicit restore before opening the stream.
- Validate both team and individual-agent parity because both handlers currently share the same active-only stream-connect pattern.

## Scope Classification (`Small`/`Medium`/`Large`)

Medium

## In-Scope Use Cases

- UC-001: User stops/terminates an active team run, later sends a message to one team member in that run, and the message is delivered by restoring/restarting the team runtime instead of surfacing `Team run ... not found`.
- UC-002: User stops/terminates an active individual agent run, later sends a message to that same agent conversation, and the message is delivered by restoring/restarting the agent runtime if the stale-active-runtime condition exists.
- UC-003: UI and backend error behavior distinguish truly missing/deleted/unrecoverable run records from stopped-but-recoverable runs.
- UC-004: Team termination updates frontend run-history active/inactive state consistently with individual-agent termination.

## Out of Scope

- Redesigning the Stop button UX or changing the difference between stop-generation/interrupt and terminate beyond this recover-on-send behavior.
- Reworking unrelated run-history display, file explorer, artifact, or team-member hydration behavior.
- Creating frontend-only fake runtime state or a compatibility-only fallback that hides backend restore failures.
- Changing persisted run metadata schemas unless implementation discovers a strict need.

## Functional Requirements

- FR-001: Stopped/inactive team runs that still have persisted team metadata must be recoverable when a user opens the team WebSocket stream or sends a new message to a member conversation.
- FR-002: Stopped/inactive individual agent runs that still have persisted metadata must be recoverable when a user opens the agent WebSocket stream or sends a new message to the agent conversation.
- FR-003: The WebSocket streaming layer must use the existing runtime service recovery boundaries (`resolveTeamRun` / `resolveAgentRun`) for recoverable connect/send paths rather than depending solely on active in-memory maps.
- FR-004: Truly missing, deleted, or unrecoverable runs must continue to return clear not-found stream errors and must not create ghost runtime records.
- FR-005: Tool approval and stop-generation commands must not implicitly restore stopped runtimes; restoration is for conversation opening/follow-up user message delivery.
- FR-006: Team termination from the frontend must update the run-history/team resume active state and refresh history similarly to individual agent termination.
- FR-007: The fix must preserve authoritative runtime restoration ownership inside backend runtime/session services; the frontend may request or observe recovery but must not synthesize backend runtime state.

## Acceptance Criteria

- AC-001: Given a persisted but inactive team run, when `/ws/agent-team/:teamRunId` is opened, the backend attempts `TeamRunService.resolveTeamRun(...)`; if restore succeeds, the socket receives `CONNECTED` and an initial status instead of `TEAM_NOT_FOUND`.
- AC-002: Given a team stream session whose run becomes inactive before a follow-up `SEND_MESSAGE`, the user-message path restores/rebinds the team run and posts the message to the selected member.
- AC-003: Given a truly unknown or metadata-missing team run id, opening `/ws/agent-team/:teamRunId` still closes with code `4004` and an `ERROR` payload containing code `TEAM_NOT_FOUND`.
- AC-004: Given a persisted but inactive individual agent run, opening `/ws/agent/:runId` or sending a follow-up user message restores the run via `AgentRunService.resolveAgentRun(...)` and posts the message instead of surfacing `AGENT_NOT_FOUND`.
- AC-005: Given a truly unknown or metadata-missing individual agent run id, opening `/ws/agent/:runId` still closes with code `4004` and an `ERROR` payload containing code `AGENT_NOT_FOUND`.
- AC-006: Given a user terminates a non-temporary team run from the frontend, the run-history store marks that team inactive and schedules a quiet history refresh after successful backend termination.
- AC-007: Targeted unit tests cover team stream recover-on-connect, team stream missing-run negative path, single-agent stream recover-on-connect, single-agent missing-run negative path, and frontend team termination active-state parity. If practical, add a team follow-up `SEND_MESSAGE` recovery test as well.

## Constraints / Dependencies

- Existing recovery APIs already exist:
  - `TeamRunService.resolveTeamRun(teamRunId): Promise<TeamRun | null>`
  - `AgentRunService.resolveAgentRun(runId): Promise<AgentRun | null>`
- Existing GraphQL restore mutations remain valid and should not be removed.
- WebSocket route code already handles asynchronous `connect(...)`; stream handler connection methods may await recovery.
- Runtime restoration depends on persisted metadata in `memory/agents/<runId>/...` and `memory/agent_teams/<teamRunId>/...`.

## Assumptions

- The user expects continued conversation context for stopped-but-persisted runs, not a brand-new unrelated run id.
- If runtime metadata is missing/deleted, not-found remains correct.
- Restore-on-connect is acceptable because selecting/opening a live conversation stream is already a runtime materialization action for persisted active/inactive runs.

## Risks / Open Questions

- Some runtime backends may return active false after an interrupt but still have in-flight cleanup; resolving/restoring too aggressively could race. Implementation should use the service boundary and preserve existing not-found behavior if restore fails.
- `resolveTeamRun` / `resolveAgentRun` currently swallow restore errors into `null`; this is acceptable for stream not-found behavior, but implementation should avoid hiding successful concurrent restore races if discovered.
- Full browser reproduction may require a local backend/runtime setup; unit tests can cover the core regression quickly, with API/E2E adding executable coverage where feasible.

## Requirement-To-Use-Case Coverage

| Requirement | UC-001 | UC-002 | UC-003 | UC-004 |
| --- | --- | --- | --- | --- |
| FR-001 | Yes | No | Yes | No |
| FR-002 | No | Yes | Yes | No |
| FR-003 | Yes | Yes | Yes | No |
| FR-004 | Yes | Yes | Yes | No |
| FR-005 | Yes | Yes | Yes | No |
| FR-006 | No | No | Yes | Yes |
| FR-007 | Yes | Yes | Yes | Yes |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criterion | Scenario Intent |
| --- | --- |
| AC-001 | Backend team stream restores stopped-but-persisted team on open. |
| AC-002 | Existing/stale team stream user-message path can recover before posting. |
| AC-003 | Deleted/missing team run remains a clear not-found error. |
| AC-004 | Single-agent stream has the same recoverable stopped-run behavior. |
| AC-005 | Deleted/missing individual agent run remains a clear not-found error. |
| AC-006 | Frontend team termination state matches individual-agent termination state. |
| AC-007 | Regression coverage prevents reintroducing active-only stream connect/send behavior. |

## Approval Status

User explicitly requested analysis and fix for the reported bug. Requirements are design-ready with no blocking clarification; downstream reviewers should reroute only if implementation reveals a requirement gap or runtime-backend constraint that changes expected behavior.
