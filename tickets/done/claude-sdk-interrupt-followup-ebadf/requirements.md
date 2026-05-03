# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Design-ready

## Goal / Problem Statement

When an agent team is running with the Claude Agent SDK runtime, the frontend primary input button changes from send to interrupt/stop while the focused member is sending. Pressing that interrupt control successfully interrupts the current turn, but the next user message in the same team session can fail with `Error: spawn EBADF`. The interrupt-then-follow-up sequence is a common business flow and must be reliable and covered by durable E2E validation.

## Investigation Findings

- The frontend primary action button is the stop/send button next to the voice/audio button. When `isSending` is true it calls `activeContextStore.stopGeneration()` and shows the stop icon (`autobyteus-web/components/agentInput/AgentUserInputTextArea.vue:38-49`, `:260-270`).
- For teams, `agentTeamRunStore.stopGeneration()` sends `STOP_GENERATION` on the existing team WebSocket and immediately sets the focused member `isSending = false` before backend interrupt completion or an idle/status event arrives (`autobyteus-web/stores/agentTeamRunStore.ts:417-442`). The single-agent store has the same immediate local reset (`autobyteus-web/stores/agentRunStore.ts:329-351`).
- The backend team WebSocket handler routes `STOP_GENERATION` to `TeamRun.interrupt()` and routes later `SEND_MESSAGE` to `TeamRun.postMessage()` (`autobyteus-server-ts/src/services/agent-streaming/agent-team-stream-handler.ts:141-156`, `:313-334`).
- For Claude teams, `ClaudeTeamManager.interrupt()` interrupts every active member run but keeps the member run/session reusable for later messages (`autobyteus-server-ts/src/agent-team-execution/backends/claude/claude-team-manager.ts:170-181`). Later `postMessage()` reuses the same active member run when it remains active (`:93-107`).
- `ClaudeSession.sendTurn()` starts a detached `runTurn()` task and returns immediately after setting `activeTurnId` and an `AbortController`; the task clears the active turn only in its `finally` block (`autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session.ts:152-208`).
- `ClaudeSession.interrupt()` aborts and clears the active abort controller, clears pending approvals, calls `sdkClient.interruptQuery(...)`, and immediately emits `TURN_INTERRUPTED` while `activeTurnId` may still be set and while the query cleanup task may still be running (`autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session.ts:224-240`). The event converter maps `TURN_INTERRUPTED` to `TURN_COMPLETED` plus `AGENT_STATUS IDLE` (`autobyteus-server-ts/src/agent-execution/backends/claude/events/claude-session-event-converter.ts:76-120`), so the UI can be told the member is idle before per-turn process/query resources have settled.
- `ClaudeSession.executeTurn()` only passes an `AbortSignal` internally and does not pass the turn `AbortController` to the Claude Agent SDK query options (`autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session.ts:301-326`). `ClaudeSdkClient.startQueryTurn()`/`buildQueryOptions()` also do not accept or forward `abortController` (`autobyteus-server-ts/src/runtime-management/claude/client/claude-sdk-client.ts:209-233`, `:346-383`).
- The installed Claude Agent SDK primary type declarations say query options support `abortController` and that aborting it stops the query and cleans resources. The same declarations say `Query.interrupt()` is a control request and control requests are only supported when streaming input/output is used. `Query.close()` forcefully terminates the underlying process and cleans resources. Source: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/node_modules/.pnpm/@anthropic-ai+claude-agent-sdk@0.2.71_zod@4.3.6/node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts:663-668`, `:1309-1319`, `:1448-1455`.
- Existing Claude team E2E coverage is live-gated by `RUN_CLAUDE_E2E=1` and covers create/terminate/restore/continue, but no Claude team E2E currently sends `STOP_GENERATION` and then a follow-up message in the same active WebSocket/team run (`autobyteus-server-ts/tests/e2e/runtime/claude-team-inter-agent-roundtrip.e2e.test.ts:17-22`, `:969-1231`). Repository search found no `STOP_GENERATION` in that Claude team E2E file.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix plus E2E validation coverage.
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing Invariant.
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Likely Needed, bounded to Claude turn lifecycle state and SDK cancellation boundary.
- Evidence basis: The current Claude session owner emits idle/interrupted before active turn/query cleanup is complete and uses the SDK `interrupt()` control request instead of forwarding the supported query `abortController` for the single-turn prompt path. The frontend also locally clears `isSending` before backend lifecycle confirmation.
- Requirement or scope impact: The fix must strengthen the Claude session interrupt invariant and the frontend send/stop readiness signal, not merely suppress `spawn EBADF` text.

## Recommendations

- Make `ClaudeSession` the authoritative owner for the interrupt lifecycle: a turn is not idle/interrupted for upstream callers until its SDK query/process resources have been aborted/closed, pending approvals have been denied, active query registration has been removed, and `activeTurnId` has been cleared.
- Pass the per-turn `AbortController` through `ClaudeSdkClient.startQueryTurn()` into the Claude Agent SDK query options; avoid using `Query.interrupt()` for the current string-prompt single-turn path.
- Treat SDK abort/interrupt shutdown as a non-error terminal path. Do not emit `ERROR` or successful `TURN_COMPLETED` for a user-requested interrupt.
- Let backend lifecycle/status events clear `isSending` in the frontend; do not make the stop button locally advertise send readiness immediately after placing a `STOP_GENERATION` message on the WebSocket.
- Add a live Claude team E2E flow that creates a Claude team run, reaches a running/pending tool-approval state, sends `STOP_GENERATION`, waits for the interrupted/idle lifecycle event, then sends a follow-up message on the same WebSocket/team run and asserts no `spawn EBADF`/`ERROR` regression.
- Add lower-level unit coverage for abort-controller forwarding and the Claude session interrupt-settle invariant so the lifecycle behavior is covered even when live Claude E2E is skipped.

## Scope Classification (`Small`/`Medium`/`Large`)

Medium.

The behavioral fix is localized to Claude runtime lifecycle and frontend stop readiness, but it crosses frontend WebSocket state, team runtime command handling, Claude session process/query lifecycle, SDK adapter options, and live E2E coverage.

## In-Scope Use Cases

- UC-001: A user interrupts a currently running Claude Agent SDK-backed team member turn from the frontend stop/interrupt control.
- UC-002: The same user sends a new message after interruption in the same active team chat/session/WebSocket, and the Claude team runtime accepts and processes it.
- UC-003: Automated E2E validation reproduces the common Claude team interrupt-then-follow-up business flow.
- UC-004: Frontend send/stop control readiness reflects backend turn lifecycle instead of a local optimistic stop send.

## Out of Scope

- Redesigning the visual layout or iconography of the stop/audio/send controls.
- Changing Claude model selection or provider authentication.
- Replacing the WebSocket streaming protocol.
- Broadly redesigning team orchestration or memory persistence.
- Changing non-Claude runtime cancellation semantics beyond removing the same premature frontend `isSending` reset if shared UI correctness requires it.
- Making live Claude E2E run by default without `RUN_CLAUDE_E2E=1`.

## Functional Requirements

- REQ-001: The team frontend interrupt action must send the existing `STOP_GENERATION` command for the active team run without marking the focused member ready for another send until backend lifecycle/status events indicate that the turn is no longer active.
- REQ-002: A Claude Agent SDK session must not emit `TURN_INTERRUPTED`/idle status for a turn until the active turn has reached a settled interrupt state: SDK query aborted/closed, active query unregistered, pending approvals cleared, abort state resolved, and `activeTurnId` cleared.
- REQ-003: A user-requested Claude interrupt must be treated as a normal interrupted terminal path, not as a successful completed turn and not as an error segment.
- REQ-004: The Claude SDK adapter must pass the per-turn `AbortController` to SDK query options so cancellation uses the SDK-supported abort mechanism.
- REQ-005: The current single-turn Claude prompt path must not rely on `Query.interrupt()` control requests as the primary interruption mechanism.
- REQ-006: After an interrupted Claude team turn is settled, sending a follow-up message in the same active team run/WebSocket must start a new turn without reusing invalid closed query/process resources and without surfacing `Error: spawn EBADF`.
- REQ-007: Durable automated coverage must include a Claude team E2E scenario that starts a turn, interrupts it through the WebSocket/API path used by the UI, then sends a follow-up message in the same team run and observes normal runtime progress.
- REQ-008: Lower-level unit coverage must protect the SDK abort-controller forwarding and the Claude session interrupt-settle lifecycle invariant.

## Acceptance Criteria

- AC-001: Given a Claude Agent SDK-backed team member is actively processing or awaiting tool approval, when `STOP_GENERATION` is sent over the team WebSocket, the backend clears pending approvals and aborts/closes the active Claude SDK query before emitting the interrupted/idle lifecycle status.
- AC-002: The frontend does not enable the send action solely because the stop command was sent; it becomes send-ready because `TURN_COMPLETED`/`AGENT_STATUS IDLE`/error lifecycle handling updates the focused member state.
- AC-003: Given AC-001 has completed, when the user sends a follow-up message in the same team run/WebSocket, the backend accepts the message and starts a new Claude turn.
- AC-004: The follow-up turn emits normal assistant progress or completion events and does not emit `ERROR` with `spawn EBADF` or any `CLAUDE_RUNTIME_TURN_FAILED` caused by stale interrupted-turn resources.
- AC-005: A user interrupt does not append a successful assistant completion for the interrupted turn and does not mark `hasCompletedTurn` based only on an aborted turn.
- AC-006: `ClaudeSdkClient` unit coverage proves `abortController` is included in query options when provided.
- AC-007: `ClaudeSession` unit coverage proves interrupt aborts the active turn, waits for the active turn to settle, clears active state, suppresses abort-as-error behavior, and emits the interrupted lifecycle only after settlement.
- AC-008: A live-gated Claude team E2E test fails on the current regression path and passes after the implementation by exercising `SEND_MESSAGE -> STOP_GENERATION -> SEND_MESSAGE` in one team run.

## Constraints / Dependencies

- The authoritative backend cancellation owner for Claude SDK per-turn resources is `ClaudeSession`.
- Existing team command surfaces remain `TeamStreamingService.stopGeneration()` / WebSocket `STOP_GENERATION` / `AgentTeamStreamHandler.handleStopGeneration()` / `TeamRun.interrupt()`.
- Existing frontend completion handlers (`handleTurnCompleted`, `handleAgentStatus`, `handleError`) already clear `isSending` on backend lifecycle events and should remain the source of readiness after stop.
- Live Claude E2E remains gated by `RUN_CLAUDE_E2E=1` and installed/authenticated `claude` CLI.
- Use the installed Claude Agent SDK contract as the current integration authority for this task.

## Assumptions

- The user's observed `spawn EBADF` is a symptom of stale/invalid Claude SDK process/query resources after interrupt, exposed by a follow-up turn spawn in the same team runtime.
- The frontend screenshot represents a team run using `claude_agent_sdk` runtime.
- A pending tool approval is a reliable E2E point for an interruptable live Claude turn without needing an artificially long generation.

## Risks / Open Questions

- The exact low-level file descriptor that produces `spawn EBADF` is inside Node/Claude SDK process spawning; the design fixes the violated cancellation/resource-settlement invariant rather than matching the errno string directly.
- Live Claude E2E can be slow/flaky due to model behavior and local CLI authentication; unit coverage must cover the invariant deterministically.
- If SDK abort and close are not idempotent in all versions, implementation must guard duplicate close calls in `ClaudeSdkClient` or `ClaudeSession`.

## Requirement-To-Use-Case Coverage

| Requirement | Use Case(s) |
| --- | --- |
| REQ-001 | UC-001, UC-004 |
| REQ-002 | UC-001, UC-002 |
| REQ-003 | UC-001, UC-002 |
| REQ-004 | UC-001, UC-002 |
| REQ-005 | UC-001, UC-002 |
| REQ-006 | UC-002 |
| REQ-007 | UC-003 |
| REQ-008 | UC-003 |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criteria | Scenario Intent |
| --- | --- |
| AC-001 | Backend interruption settles Claude SDK resources before idle. |
| AC-002 | Frontend cannot send too early because of optimistic local stop state. |
| AC-003 | Follow-up after settled interrupt is accepted in the same team run. |
| AC-004 | Reported EBADF/error symptom is absent in the follow-up turn. |
| AC-005 | Interrupted turns are not recorded as successful completed turns. |
| AC-006 | SDK adapter uses the supported cancellation option. |
| AC-007 | Claude session lifecycle invariant is deterministic and unit-tested. |
| AC-008 | Common business flow is protected at the API/WebSocket E2E level. |

## Approval Status

Design-ready. The user explicitly requested investigation and E2E coverage for this bug; no additional product-scope questions block design. Final implementation can proceed after architecture review.
