# Codex Same-Turn Steering / Stale-Running Evidence

## Artifact Status

- Purpose: Evidence-only record for the live Electron verification defect where a Codex team member remains `running` after provider completion and every visible interrupt request is rejected.
- Scope: One supported Article Writing Team execution, the server/frontend command path including local socket admission, the AutoByteus external-runtime trace, the native Codex rollout, the current Codex app-server protocol, and the relevant source owners.
- Approval applicability: N/A. This artifact records observed facts; the desired behavior remains authoritative in `requirements.md`.
- Related behavior / requirement / acceptance IDs: BEH-010–BEH-011; REQ-002, REQ-005, REQ-012, REQ-019, REQ-021–REQ-022; AC-002, AC-004, AC-011, AC-027–AC-029.
- Investigation date: 2026-08-03.

## Live Subject

| Subject | Identity / path |
| --- | --- |
| Electron candidate | `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-stream-driven-status/autobyteus-web/electron-dist/mac-arm64/AutoByteus.app` |
| Embedded server | `127.0.0.1:29695` |
| Server log | `/Users/normy/.autobyteus/server-data/logs/server.log` |
| Team run | `article_writing_team_85f2bf39747e40a59b36a579f0309d6d` |
| Writer member run | `article_writer_cffa8c1fe0664951a95f8c6b99136bde` |
| Writer member route | `article_writer` |
| Reviewer member run | `article_reviewer_4e2e77dcc5024178a9cdce7dae4b958d` |
| Codex thread/platform run | `019f550a-e49b-7e31-aec5-6895d23df204` |
| Team metadata | `/Users/normy/.autobyteus/server-data/memory/agent_teams/article_writing_team_85f2bf39747e40a59b36a579f0309d6d/team_run_metadata.json` |
| Writer AutoByteus trace | `/Users/normy/.autobyteus/server-data/memory/agent_teams/article_writing_team_85f2bf39747e40a59b36a579f0309d6d/article_writer_cffa8c1fe0664951a95f8c6b99136bde/raw_traces_active.jsonl` |
| Native Codex rollout | `/Users/normy/.codex/sessions/2026/07/12/rollout-2026-07-12T08-36-45-019f550a-e49b-7e31-aec5-6895d23df204.jsonl` |
| User screenshots | `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_07ac2d23b27f428ab16b435dd5a41dbc/solution_designer_d451145ec83142bfbc153440937b2cad/context_files/ctx_638f89bebf84__image.png`, `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_07ac2d23b27f428ab16b435dd5a41dbc/solution_designer_d451145ec83142bfbc153440937b2cad/context_files/ctx_3456bc49f3dc__image.png` |

The Electron app was not stopped, restarted, modified, or sent an investigation command. The only live probe opened a team WebSocket, read its initial messages, sent no payload, and closed after 1.2 seconds.

## Observable Failure

The screenshots show all three user-visible facts simultaneously:

1. `article_writer` is labeled `Running` with the blue agent-running dot.
2. The final assistant content states that the work and final review are complete; no further provider output arrives.
3. The red interrupt control is visible, but repeated clicks appear to do nothing.

The button is not disabled and the target routing is not missing. Server log lines 2,391,374–2,391,390 record 17 received attempts with the same exact rejection:

```text
INTERRUPT_GENERATION rejected for team run article_writing_team_85f2bf39747e40a59b36a579f0309d6d: [RUNTIME_COMMAND_FAILED] Failed to interrupt run for runtime 'codex_app_server': Error: No active turn id is available for interruption.
```

This proves the click reaches the correct team command handler and member runtime. It fails because the Codex backend has no active turn.

## Read-Only Live Snapshot

Command shape:

```bash
node --input-type=module - <<'JS'
// connect to ws://127.0.0.1:29695/ws/agent-team/<teamRunId>,
// print CONNECTED / relevant AGENT_STATUS / TEAM_RUN_LIFECYCLE,
// send nothing, close after 1200 ms
JS
```

Observed result:

```json
{"type":"AGENT_STATUS","payload":{"status":"running","agent_id":"article_writer_cffa8c1fe0664951a95f8c6b99136bde","agent_name":"article_writer","member_route_key":"article_writer","member_path":["article_writer"],"source_route_key":"article_writer","source_path":["article_writer"]}}
{"type":"AGENT_STATUS","payload":{"status":"idle","agent_id":"article_reviewer_4e2e77dcc5024178a9cdce7dae4b958d","agent_name":"article_reviewer","member_route_key":"article_reviewer","member_path":["article_reviewer"],"source_route_key":"article_reviewer","source_path":["article_reviewer"]}}
{"type":"TEAM_RUN_LIFECYCLE","payload":{"team_run_id":"article_writing_team_85f2bf39747e40a59b36a579f0309d6d","is_active":true}}
```

The stale `running` value is therefore a fresh server snapshot, not merely stale Vue state. Team `is_active=true` is correct and unrelated: the live team run still exists even though this member has no active provider turn.

## Provider Turn Timeline

The native Codex rollout is authoritative for what the Codex provider treated as the current turn:

| Native line | Timestamp (UTC) | Fact |
| --- | --- | --- |
| 6096 | `2026-08-03T14:50:34.173Z` | `task_started` for turn A = `019fc81a-e735-7982-a002-e3a096271f9e`. |
| 6098 | `2026-08-03T14:50:34.511Z` | User input `continue please`, metadata turn A. |
| 6109–6110 | `2026-08-03T14:51:57Z` | Writer successfully sends the final-review request while A remains active. |
| 6174–6175 | `2026-08-03T14:57:08.265Z` | Reviewer message is inserted as a user message into the same native turn A. |
| 6178 | `2026-08-03T14:57:17.219Z` | Writer answers the reviewer message under A. |
| 6180 | `2026-08-03T14:57:17.330Z` | `task_complete` for A. No later native `task_started` exists. |

The AutoByteus trace agrees for all provider output, tools, and final assistant content: those records use A. It disagrees only for the accepted reviewer input, which is recorded as a distinct turn B = `019fc820-c1aa-72c1-bf1a-b57a210bfa48` at trace line 281. `RuntimeMemoryEventAccumulator.recordAcceptedUserMessage()` takes that ID from `AgentOperationResult.turnId`; it does not synthesize a new ID when an explicit result ID is present.

Therefore:

- Codex executed the reviewer delivery as same-turn steering into A.
- AutoByteus accepted and installed B as though it were a new current turn.
- Codex later completed A, not B.

## Source-Level Root Cause

### 1. Busy input reaches the existing active run

Supported inter-agent delivery follows:

```text
send_message_to
  -> TeamMemberDeliveryCoordinator
  -> MixedAgentMemberHandle.deliverInterMemberMessage
  -> InterAgentMessageRouter.deliver
  -> recipient AgentRun.postUserMessage
  -> CodexAgentRunBackend.postUserMessage
  -> CodexThread.sendTurn
```

The delivery message includes `input_origin: "inter_agent_delivery"`. Global direct delivery and task notifications also enter `AgentRun.postUserMessage`; the provider boundary, not an origin-specific UI branch, must preserve current-turn identity.

### 2. `AgentRun` correctly refuses to open a second local command lifecycle

`AgentTurnLifecycleState.beginCommand()` returns `null` when a current turn already exists. `AgentRun.postUserMessage()` still forwards the message to the backend, preserving supported busy inter-agent delivery without manufacturing a local startup overlay.

### 3. `CodexThread.sendTurn()` always invokes `turn/start`

Current source:

```text
await client.request("turn/start", ...)
turnId = resolveTurnId(payload)
markTurnStarted(turnId)
```

It does this even when `CodexThread.activeTurnId` already identifies A. The active `turn/start` is accepted by the provider as same-turn steering, but the response ID B is unconditionally installed into:

- `CodexThread.runContext.runtimeContext.activeTurnId`, and
- later, through runtime snapshot/event reconciliation, the canonical `AgentTurnLifecycleState.activeTurn`.

The same source read exposes a bounded idle-start ordering risk that the correction must not preserve: `codex-thread-notification-handler.ts` calls `markTurnStarted(S)` for `turn/started(S)`, while `sendTurn()` independently calls it after the `turn/start` response. Notifications remain processable while the request is in flight. The current `lastCompletedTurnId` is not read and does not cover exact turn failure. Therefore a delayed response must recognize an already-active S, a bounded renamed `lastTerminalTurnId=S`, or a fresher conflicting active identity; it must not blindly reopen S after completion, failure, interruption, or an identified provider-idle terminal transition.

### 4. Correct old-turn safeguards then preserve the wrong identity

When provider `TURN_COMPLETED(A)` arrives:

- `CodexThread.markTurnCompleted(A)` does not clear B because it only clears an exact active-turn match.
- `AgentTurnLifecycleState.observeTurnTerminal(A)` retires A but does not clear active B.
- a later Codex idle status clears the backend's `activeTurnId`, which is why interrupt reports no active provider turn;
- `AgentTurnLifecycleState.reconcileRuntimeSnapshot()` intentionally does not let an otherwise-racy `currentTurn=NONE` snapshot close an identified active turn, so it preserves phantom B as `running`.

The current/retired-turn safeguards are correct for genuine A/B concurrency. The defect is earlier: a same-turn steering input must never replace A with phantom B.

## Current Codex Protocol Evidence

The running local binary reports `codex-cli 0.146.0-alpha.3.1`. A read-only schema bundle was generated under `/tmp/codex-app-schema-0146` with:

```bash
codex app-server generate-json-schema --out /tmp/codex-app-schema-0146 --experimental
```

The generated contract exposes `turn/steer`:

```text
TurnSteerParams {
  threadId: string;
  expectedTurnId: string; // required active-turn precondition
  input: UserInput[];
  clientUserMessageId?: string | null;
}

TurnSteerResponse { turnId: string }
```

The schema explicitly states that the request fails if `expectedTurnId` does not match the currently active turn. It also defines `activeTurnNotSteerable` for an active turn kind that cannot accept same-turn steering. This is the exact provider operation needed to preserve A and make completion/steer races explicit instead of silently installing a new identity.

## Silent Interrupt Result Defect

The frontend sends the exact route/run guard correctly:

```text
AgentUserInputTextArea.handleStop
  -> activeContextStore.interruptGeneration
  -> agentTeamRunStore.interruptFocusedMemberGeneration
  -> TeamStreamingService.interruptGeneration
  -> INTERRUPT_GENERATION { target_member_route_key, target_member_run_id }
```

The team stream handler calls `interruptMember()` and receives the rejection above. For `RUNTIME_COMMAND_FAILED`, it only logs. It returns a client error only for invalid target codes. The standalone stream handler also only logs rejected interrupt results.

`AGENT_COMMAND_ACK` currently describes only standalone `SEND_MESSAGE`; the team streaming service has no interrupt-result handler. Consequently the red button click reaches the server and fails, but the Electron UI receives neither success acknowledgement nor failure feedback.

The generic stream `ERROR` event is not an appropriate substitute: it represents agent/runtime output and is dispatched into an agent conversation. Interrupt acceptance/rejection is a control-command result and must remain separate from the agent's five-state lifecycle.

### Immediate local admission edge (`ARCH-FIND-004`)

Canonical `running` and Stop availability intentionally do not depend on socket attachment. The stores retain `AgentStreamingService` / `TeamStreamingService` during automatic reconnection, while `WebSocketClient.state` can be `DISCONNECTED`, `CONNECTING`, or `RECONNECTING`. Its exact send contract is synchronous:

```ts
send(message: string): void {
  if (this._state !== ConnectionState.CONNECTED || !this.ws) {
    throw new Error('WebSocket is not connected');
  }
  this.ws.send(message);
}
```

Therefore an earlier disconnect callback cannot report a Stop command created afterward. Even after a `CONNECTED` check, the underlying send can throw. Registering pending state without an immediate state/send rollback leaves a stale entry and makes the store's current boolean success meaning false. The frontend service boundary must own register, connected check, send, delete-on-failure, exactly-once local callback, and boolean result as one transition; a later disconnect may complete only entries still pending.

## Required Invariants For The Design Revision

1. If Codex has no current turn, additional input uses `turn/start` and may establish the returned turn ID; response reconciliation must not duplicate a prior start notification or reinstall S after terminal S.
2. If Codex has identified current turn A, additional supported input uses `turn/steer` with `expectedTurnId=A`; success must return/preserve A and must not call `markTurnStarted` with another ID.
3. A completion/interruption/failure for A then settles the canonical lifecycle normally; no timeout or snapshot heuristic is added.
4. A steer precondition race or non-steerable active turn returns a structured operation failure and leaves current-turn identity unchanged; it must not fabricate B.
5. Every standalone or team-member interrupt request receives a discriminated command acknowledgement/result, including accepted, rejected, and failed outcomes. Team results echo the exact target route/run guard needed by the originating surface.
6. Command acknowledgement is control-plane feedback, not an `AGENT_STATUS` substitute and not a generic runtime `ERROR` event. Accepted interrupt waits for provider terminal/status events to change lifecycle; rejected interrupt is visibly reported.
7. A local interrupt attempted while disconnected/connecting/reconnecting or during a synchronous send throw is not a transmitted request: it is removed from pending state, reported once with exact command/target as local transport failure, and returns not-admitted without a fabricated server acknowledgement.
8. Preserve the accepted current/retired-turn state machine, companion-status finalizer, binary team liveness, exact nested member identity, and frontend `running -> Stop` policy.

## Recommended Focused Coverage

- `CodexThread` unit: idle send uses `turn/start`; active A send uses `turn/steer(expectedTurnId=A)`; result A is returned; no `markTurnStarted(B)`/identity replacement occurs; started/terminal notifications racing the start response do not duplicate or reopen S.
- `CodexThread` unit: completion A after successful steer clears backend active identity and yields idle.
- `CodexThread` unit: steer precondition/non-steerable failure preserves A and propagates a failed operation result.
- `AgentRun`/memory integration: an accepted busy inter-agent delivery is recorded under A, and `TURN_COMPLETED(A)` makes the canonical snapshot idle.
- Team delivery integration: reviewer-to-writer delivery during active Codex A uses the same turn and keeps exact team member routing.
- Standalone/team stream handler units: every interrupt result emits the discriminated acknowledgement with exact command/target identity; no-active/rejection is not log-only.
- Frontend service/store/component coverage: a rejected interrupt produces visible feedback and never reports false success or locally invents idle; accepted interruption still settles from lifecycle events.
- Frontend admission coverage for both services: already-disconnected, connecting, reconnecting, and send-throw paths return false, remove pending state, and report exact local failure once; reentrant disconnect-plus-throw, ack-plus-disconnect, and repeated disconnect never duplicate feedback or fabricate an ack/`ErrorSegment`/status change.
- Real Codex app-server integration, when environment permits: start A, steer an input into A, observe returned A and terminal A, then verify reconnect snapshot `idle` and unavailable Stop.

## Safety / Data Outcome

- Persisted transcripts, raw traces, team metadata, platform thread IDs, and task records remain directly usable; no migration is required.
- The bad historical trace row carrying B is retained as evidence. The change prevents future mis-correlation; it does not rewrite user history.
- The read-only probe created only a transient WebSocket session and closed it. No runtime command, repository source change, app restart, or persisted live-work mutation was performed during reproduction.
