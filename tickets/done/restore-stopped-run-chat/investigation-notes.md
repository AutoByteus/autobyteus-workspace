# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete
- Current Status: Complete for design handoff
- Investigation Goal: Find why follow-up chat to a stopped team/member conversation returns `Team run '<id>' not found` and determine the correct restore/resume-on-send design for team and individual agent runs.
- Scope Classification (`Small`/`Medium`/`Large`): Medium
- Scope Classification Rationale: Crosses UI chat send path, WebSocket stream connection/command routing, team and single-agent runtime/session recovery, and frontend run-history active-state parity.
- Scope Summary: Ensure stopped-but-recoverable team/member and individual-agent conversations can resume on user send or stream open instead of failing because the in-memory active runtime was removed.
- Primary Questions To Resolve:
  - Which frontend send entrypoint produced the failing request? Resolved: `agentTeamRunStore.sendMessageToFocusedMember(...)` opens `TeamStreamingService`, which connects to `/ws/agent-team/:teamRunId` and sends `SEND_MESSAGE` after connection.
  - Which backend endpoint/manager returned `Team run ... not found`? Resolved: `AgentTeamStreamHandler.connect(...)` emits `TEAM_NOT_FOUND` when `getTeamRun(...)` returns null.
  - Is the stopped run persisted/history-backed and therefore recoverable? Resolved architecturally: team and agent services already expose restore-capable `resolve*Run(...)` boundaries that read persisted metadata and restore.
  - Does individual agent follow-up after Stop have the same failure mode? Resolved structurally: yes, the single-agent stream handler also uses active-only `getAgentRun(...)` for WebSocket connect/send despite `resolveAgentRun(...)` existing.
  - Which existing runtime/session owner should materialize recoverable stopped runs? Resolved: `TeamRunService.resolveTeamRun(...)` and `AgentRunService.resolveAgentRun(...)` are the authoritative backend recovery owners.

## Request Context

User reported a frontend-visible bug with a screenshot. They ran an agent team, clicked Stop after thinking the task was done, then sent `what is your workspace pwd` to one member (`api_e2e_engineer`) under the stopped team. The UI rendered an error card: `Team run 'team_software-engineering-team_9620bbbd' not found`. User expects stopped team to restore/restart and route the message to the selected team member. User is unsure whether single-agent stop/follow-up has the same issue.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/restore-stopped-run-chat`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/restore-stopped-run-chat/tickets/in-progress/restore-stopped-run-chat`
- Current Branch: `codex/restore-stopped-run-chat`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/restore-stopped-run-chat`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin --prune` completed successfully on 2026-04-25 before creating worktree.
- Task Branch: `codex/restore-stopped-run-chat`
- Expected Base Branch (if known): `origin/personal`
- Expected Finalization Target (if known): `personal`
- Bootstrap Blockers: None
- Notes For Downstream Agents: Source-code edits must be made in the dedicated task worktree, not the shared `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` checkout.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-04-25 | Command | `pwd && git rev-parse --show-toplevel && git status --short --branch` | Identify repo/worktree context | Initial user cwd is the superrepo on `personal`; created dedicated worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/restore-stopped-run-chat`. | No |
| 2026-04-25 | Command | `git symbolic-ref refs/remotes/origin/HEAD`, `git fetch origin --prune`, `git worktree add -b codex/restore-stopped-run-chat ... origin/personal` | Resolve base and create isolated ticket branch | Remote default is `origin/personal`; worktree created successfully at `cef84464`. | No |
| 2026-04-25 | Other | User screenshot and report | Capture observable bug | UI error card reports `Team run 'team_software-engineering-team_9620bbbd' not found` after follow-up message to stopped `api_e2e_engineer` team member. | Design recovery. |
| 2026-04-25 | Command | `rg -n "Team run .*not found|Agent run .*not found|agent-team|SEND_MESSAGE|restoreAgentTeamRun|restoreAgentRun" autobyteus-web autobyteus-server-ts autobyteus-ts ...` | Locate failing string and adjacent send/restore paths | Found failing backend string in `agent-team-stream-handler.ts`; found analogous single-agent stream handler; found frontend GraphQL restore mutations and stream send paths. | No |
| 2026-04-25 | Code | `autobyteus-server-ts/src/services/agent-streaming/agent-team-stream-handler.ts` | Inspect failing backend stream boundary | `connect(...)` calls active-only `getTeamRun(...)`, emits `TEAM_NOT_FOUND`, closes `4004`; `handleSendMessage(...)` calls active-only `resolveCommandRun(...)` -> `getTeamRun(...)`. | Modify to use restore-capable service boundary for connect/send. |
| 2026-04-25 | Code | `autobyteus-server-ts/src/services/agent-streaming/agent-stream-handler.ts` | Check individual-agent parity | `connect(...)` calls active-only `getActiveRun(...)`; `handleSendMessage(...)` calls active-only `getActiveRun(...)`; missing run emits `AGENT_NOT_FOUND`. | Modify to use `resolveAgentRun(...)` for recoverable connect/send. |
| 2026-04-25 | Code | `autobyteus-server-ts/src/agent-team-execution/services/team-run-service.ts` | Find authoritative team recovery owner | `resolveTeamRun(...)` returns active run if present, otherwise calls `restoreTeamRun(...)` from persisted metadata; `restoreTeamRun(...)` records restored state in history. | Reuse; do not duplicate restore logic in stream handler. |
| 2026-04-25 | Code | `autobyteus-server-ts/src/agent-execution/services/agent-run-service.ts` | Find authoritative single-agent recovery owner | `resolveAgentRun(...)` returns active run if present, otherwise calls `restoreAgentRun(...)` from persisted metadata; `restoreAgentRun(...)` records restored state in history. | Reuse; do not duplicate restore logic in stream handler. |
| 2026-04-25 | Code | `autobyteus-server-ts/src/api/websocket/agent.ts` | Verify WebSocket route can support async restore | Route already calls async `handler.connect(...).then(...)`; message path returns `SESSION_NOT_READY` until connect resolves. | No route redesign needed. |
| 2026-04-25 | Code | `autobyteus-web/stores/agentTeamRunStore.ts` | Inspect team send/terminate frontend paths | `sendMessageToFocusedMember(...)` optionally calls `RestoreAgentTeamRun` only if cached resume config exists and `isActive === false`, then opens stream. `terminateTeamRun(...)` does not mark run-history team inactive or refresh after termination. | Add frontend inactive-state parity and rely on backend for authoritative restore. |
| 2026-04-25 | Code | `autobyteus-web/stores/agentRunStore.ts` | Compare single-agent behavior | `sendUserInputAndSubscribe(...)` optionally calls `RestoreAgentRun` based on resume config; `terminateRun(...)` marks run inactive and refreshes history after backend termination. | Mirror relevant inactive-state behavior for teams. |
| 2026-04-25 | Code | `autobyteus-web/services/agentStreaming/TeamStreamingService.ts`, `AgentStreamingService.ts`, `transport/WebSocketClient.ts`, `handlers/agentStatusHandler.ts` | Understand how backend error reaches UI | Stream `ERROR` payloads are parsed and appended as error segments. WebSocket close code `4004` is non-retryable. | Backend should avoid sending not-found when restore is possible. |
| 2026-04-25 | Code | `autobyteus-server-ts/tests/unit/services/agent-streaming/agent-team-stream-handler.test.ts`, `agent-stream-handler.test.ts` | Identify validation placement | Existing unit tests cover connect, missing-run close, send, tool approvals. They can be extended for resolve-on-connect and recover-on-send. | Add/adjust tests during implementation. |
| 2026-04-25 | Doc | `autobyteus-server-ts/docs/modules/agent_team_execution.md`, `agent_streaming.md`, `run_history.md` | Check documented ownership | Docs state agent-team execution owns restoring persisted team activity and streaming through a server-owned boundary; run-history owns persisted resume metadata; streaming bridges runtime stream events. | Design should preserve these ownership boundaries. |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary: User sends chat text from the frontend member conversation view after the team has been stopped/terminated.
- Current execution flow:
  1. `AgentUserInputTextArea.vue` calls `activeContextStore.send()`.
  2. For team selection, `activeContextStore` calls `agentTeamRunStore.sendMessageToFocusedMember(...)`.
  3. If cached `teamResumeConfigByTeamRunId[teamRunId]` exists and `isActive === false`, frontend calls GraphQL `RestoreAgentTeamRun`; otherwise it assumes the stream can connect.
  4. Store pushes the user message locally, marks history active, then calls `ensureTeamStreamConnected(...)`.
  5. `TeamStreamingService.connect(...)` opens `/ws/agent-team/:teamRunId`.
  6. Backend `AgentTeamStreamHandler.connect(...)` calls active-only `TeamRunService.getTeamRun(teamRunId)`.
  7. If the in-memory run was stopped/terminated/unregistered, the handler sends `ERROR { code: TEAM_NOT_FOUND, message: "Team run '<id>' not found" }` and closes with code `4004`.
- Ownership or boundary observations:
  - `TeamRunService` is already the authoritative owner for create/restore/get/terminate and history updates.
  - The stream handler is a transport/session owner, not the durable runtime materialization owner.
  - The current stream handler bypasses the authoritative recovery boundary and directly depends on an active-only query.
  - The single-agent stream handler repeats the same active-only shape despite `AgentRunService.resolveAgentRun(...)` existing.
- Current behavior summary: Stopped-but-persisted team/member follow-up message can surface backend `Team run ... not found` because WebSocket stream connection requires an already-active in-memory run. The frontend explicit restore path is cache-dependent and not sufficient as the authoritative recovery path.

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-server-ts/src/services/agent-streaming/agent-team-stream-handler.ts` | Team WebSocket session, team event subscription, client command dispatch | Uses `getTeamRun(...)` on connect and send; emits `TEAM_NOT_FOUND` for inactive-but-restorable runs. | Change connect and user-message command to use `TeamRunService.resolveTeamRun(...)`; keep not-found only when resolve returns null. |
| `autobyteus-server-ts/src/services/agent-streaming/agent-stream-handler.ts` | Single-agent WebSocket session, event subscription, client command dispatch | Uses `getAgentRun(...)`/`getActiveRun(...)` on connect and send; emits `AGENT_NOT_FOUND` for inactive-but-restorable runs. | Change connect and user-message command to use `AgentRunService.resolveAgentRun(...)`; keep not-found only when resolve returns null. |
| `autobyteus-server-ts/src/agent-team-execution/services/team-run-service.ts` | Authoritative team run lifecycle and persisted restore owner | Provides `resolveTeamRun(...)` and `restoreTeamRun(...)`; restore records history state. | Reuse this service boundary; do not duplicate metadata restore in streaming. |
| `autobyteus-server-ts/src/agent-execution/services/agent-run-service.ts` | Authoritative individual agent run lifecycle and persisted restore owner | Provides `resolveAgentRun(...)` and `restoreAgentRun(...)`; restore records history state. | Reuse this service boundary; do not duplicate metadata restore in streaming. |
| `autobyteus-server-ts/src/api/websocket/agent.ts` | Fastify WebSocket route adapter | Already supports async `connect(...)` and guards messages until session ready. | No route-level architectural change required. |
| `autobyteus-web/stores/agentTeamRunStore.ts` | Frontend team lifecycle/send orchestration | Has cache-dependent explicit restore on send; termination does not mark team inactive in run-history store. | Keep explicit restore but do not rely on it as authority; add inactive-state parity after successful termination. |
| `autobyteus-web/stores/agentRunStore.ts` | Frontend individual agent lifecycle/send orchestration | Marks run inactive and refreshes history after terminate; explicit restore on send uses cached resume config. | Use as parity model for team termination state. |
| `autobyteus-server-ts/tests/unit/services/agent-streaming/*` | Unit validation for stream handlers | Existing tests mock active-only services; missing resolve-on-connect cases. | Update mocks and add regression tests. |
| `autobyteus-web/stores/__tests__/agentTeamRunStore.spec.ts` | Frontend team store tests | Existing terminate/stop tests can be extended for `markTeamAsInactive`/refresh parity. | Add frontend regression coverage. |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-04-25 | Static trace | Code path trace from `activeContextStore.send()` to `/ws/agent-team/:teamRunId` to `AgentTeamStreamHandler.connect(...)` | The screenshot error can be produced without GraphQL mutation failure: server sends stream `ERROR` before close when active team run is absent. | Fix must include backend WebSocket stream recovery, not only frontend cache state. |
| 2026-04-25 | Static parity probe | Compared `AgentTeamStreamHandler` and `AgentStreamHandler` | Both use active-only stream connect/send despite restore-capable services. | Include individual-agent parity in scope. |

## External / Public Source Findings

- Public API / spec / issue / upstream source: None used.
- Version / tag / commit / freshness: N/A.
- Relevant contract, behavior, or constraint learned: N/A.
- Why it matters: N/A.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: Runtime/backend reproduction likely requires local server plus at least one persisted stopped team run. Unit tests can reproduce the core handler behavior with mocked services.
- Required config, feature flags, env vars, or accounts: None identified for unit coverage.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: `git fetch origin --prune`; `git worktree add -b codex/restore-stopped-run-chat /Users/normy/autobyteus_org/autobyteus-worktrees/restore-stopped-run-chat origin/personal`.
- Cleanup notes for temporary investigation-only setup: Dedicated worktree should be removed after finalization by delivery engineer.

## Findings From Code / Docs / Data / Logs

- The backend already has the desired restore semantics at the service layer; the bug is primarily that stream handlers bypass those semantics and rely on active-only map lookup.
- The frontend already contains explicit restore mutations, but they are cache-dependent and can be stale/absent after termination/stop. Backend must therefore be robust enough to restore on stream connection or follow-up send.
- Team frontend termination lacks inactive-state parity with single-agent termination. This can leave the UI more likely to skip explicit restore and attempt direct stream connection to a no-longer-active backend run.
- Existing unit test locations are sufficient for targeted regression coverage; no new test framework is required.

## Constraints / Dependencies / Compatibility Facts

- `TeamRunService.resolveTeamRun(...)` and `AgentRunService.resolveAgentRun(...)` return `null` for missing/unrecoverable runs, preserving the existing not-found stream error path.
- `restoreTeamRun(...)` and `restoreAgentRun(...)` update persisted history as active/restored; stream handlers should not do separate history writes for the restoration itself.
- User messages should still record run activity after `postMessage`/`postUserMessage` succeeds.
- Stop-generation and tool approval are not user-message resume actions and should not be used to materialize stopped runtimes.

## Open Unknowns / Risks

- Runtime-specific restore behavior for Codex/Claude/AutoByteus may have backend-specific race windows. Unit tests can prove handler ownership; API/E2E should validate at least one realistic persisted team path if environment permits.
- The exact frontend Stop control the user clicked may be stop-generation or terminate. The proposed fix covers both stale inactive backend cases by making stream open/send recoverable, and also improves terminate-state parity.

## Notes For Architect Reviewer

The design should be judged on whether it correctly re-centers restore authority inside `TeamRunService`/`AgentRunService` and keeps the stream handlers as transport/session owners. The likely implementation is compact but cross-cutting: two backend stream handlers, one frontend team store parity update, and tests.
