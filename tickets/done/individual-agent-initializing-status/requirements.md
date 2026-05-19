# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Refined — backend-owned lifecycle architecture, command-correlated overlay replacement rework incorporated

## Goal / Problem Statement

When a user sends a message to a standalone agent that is offline/inactive, backend must treat runtime activation/restore/start as part of the `Initializing` lifecycle and publish that status before slow runtime work. Frontend must not orchestrate `RestoreAgentRun -> connect websocket -> send message` as separate lifecycle truth, and frontend must not invent lifecycle status locally.

Correct target architecture:

```text
Frontend: send this message to this agent target.
Backend: accept command, publish lifecycle status, create/restore/start runtime if needed, deliver message.
```

This aligns standalone agents with agent-team members, where the team container publishes member `Initializing` before the member runtime is restored/started.

## Current User-Reported Problem

On 2026-05-18, the user reported:

- Standalone Codex agent: after sending a message to an offline individual agent, UI remains `Offline` for a long time, then jumps to `Running`.
- Agent team member using Codex runtime: after sending a message to an offline member, UI shows `Initializing` promptly.

The user clarified that the solution should fix the architecture: backend is source of truth for lifecycle status, and restore/start belongs to `Initializing`.

## Investigation Findings

- Standalone current flow is frontend-orchestrated: local user message -> `RestoreAgentRun`/`CreateAgentRun` -> wait for runtime restore/create -> connect websocket -> websocket `SEND_MESSAGE` -> `AgentRun.postUserMessage()` emits `Initializing`.
- Standalone backend `Initializing` is emitted too late for the slow restore/create phase.
- Codex restore can be visibly slow because restore includes Codex thread resume/startup (`restoreBackend()` -> `restoreThread()` -> app-server `thread/resume`).
- Agent team member flow has a healthier boundary: the team run container receives a member command, publishes member `Initializing`, then restores/starts the member runtime.
- A backend-owned standalone command/lifecycle boundary is the correct fix, but post-delivery validation exposed an additional invariant: restored-runtime readiness/status snapshots must not replace the accepted command overlay. Visible `Running` must come from command-correlated live execution, not from runtime attachment.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Larger Requirement / Architecture Bug Fix
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue + Missing Invariant
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Needed now
- Evidence basis: Frontend currently coordinates backend runtime lifecycle that backend should own. Standalone websocket/session handling requires active runtime before status can be observed. Team member command overlay shows the healthier boundary.
- Requirement or scope impact: Introduce a backend-owned standalone command coordinator, runId-scoped command status overlay, status projection service, prepared-run identity state, exact command idempotency policy, and a command-correlated overlay replacement gate that excludes runtime-readiness snapshots.

## Scope Classification (`Small`/`Medium`/`Large`)

Large

Rationale: This changes ownership boundaries for standalone create/restore/send/status lifecycle and touches backend command routing, websocket/session behavior, run identity preparation, history/status projection, frontend send orchestration, and external standalone send callers.

## In-Scope Use Cases

- UC-001: User sends a message to an existing active standalone run.
- UC-002: User sends a message to an existing offline/inactive standalone run.
- UC-003: User sends the first message to a completely new standalone agent.
- UC-004: Backend restores/starts runtime slowly, especially Codex thread resume/start.
- UC-005: Frontend observes backend-owned `Initializing` before restore/start completes.
- UC-006: Backend runtime live status replaces command-level `Initializing` with `Running`, `Idle`, `Error`, or `Offline`.
- UC-007: Activation/create/restore fails after command acceptance.
- UC-008: User/client retries a command during activation.
- UC-009: User/client sends a different command while activation is already in progress.
- UC-010: Agent team member behavior remains the reference and is not regressed.
- UC-011: External channel standalone message dispatch uses the same backend command boundary.
- UC-012: Restored runtime reports `running` before the accepted offline-send command is forwarded or command-correlated; UI must not show an intermediate `running` before returning to `initializing`.

## Out of Scope

- Replacing the existing team command-status overlay unless a small shared payload helper is clearly useful.
- Changing provider/runtime execution semantics beyond lifecycle ownership and command routing.
- Component-level status display workarounds.
- Frontend lifecycle-status optimism as the primary fix.
- Full redesign of context-file upload ownership; frontend may still prepare identity before finalizing attachments.

## Functional Requirements

- REQ-001: Backend must be the source of truth for standalone agent lifecycle status, including `Initializing` during create/restore/start.
- REQ-002: Standalone send to an inactive/offline run must be accepted by a backend command/lifecycle boundary that publishes `Initializing` before runtime restore begins or while it begins.
- REQ-003: Runtime restore/start for standalone agents must be considered part of `Initializing`.
- REQ-004: Frontend must not call `RestoreAgentRun` as a precondition before sending a user message to an inactive standalone run.
- REQ-005: Frontend must not wait for a fully restored `AgentRun` before connecting to a status/command channel for an existing run identity.
- REQ-006: For a completely new agent first message, backend must create a durable prepared run identity without starting runtime; the first message command then publishes `Initializing`, activates runtime through create mechanics, and delivers the message.
- REQ-007: Active standalone runs must deliver messages through the same command coordinator without unnecessary restore/start.
- REQ-008: Backend command-level `Initializing` must be replaced by live runtime status events when runtime emits them.
- REQ-009: Run history/status snapshots must reflect command-level `Initializing` during create/restore/start and must not collapse it to generic `Running` or `Offline` before live runtime status exists.
- REQ-010: Team member lifecycle must remain correct and can serve as the architectural reference.
- REQ-011: The solution must be runtime-agnostic: Codex is the visible repro, but standalone lifecycle ownership applies to all runtimes.
- REQ-012: Standalone websocket `SEND_MESSAGE` must include required command identity fields: `message_id` and `dedupe_key`. Backend must validate them and use `(runId, message_id)` as the idempotency key.
- REQ-013: Same-run same-`message_id` retries must be idempotent: backend must not forward/persist the user message twice and must return the current/original `AGENT_COMMAND_ACK` acknowledgement.
- REQ-014: Same-run different-`message_id` while a command is activating/running must be rejected, not queued, with code `RUN_COMMAND_IN_PROGRESS`.
- REQ-015: The command registry must retain in-process command records for at least 15 minutes after terminal acknowledgement/failure, and until completion for in-progress commands.
- REQ-016: Backend status projection must expose a concrete projection contract: `status`, `isActive`, `lastKnownStatus`, `statusSource`, `canInterrupt`, and `shouldConnectStream`.
- REQ-017: Projection precedence must be command overlay first, active runtime second, prepared/historical metadata fallback third.
- REQ-018: Overlay `Initializing` must project `isActive=true`, `shouldConnectStream=true`, `status=initializing`, `lastKnownStatus=ACTIVE`, and `statusSource=COMMAND_OVERLAY`.
- REQ-019: Overlay clearing/replacement must be session-independent: live runtime status must clear/replace the overlay even if the initiating websocket disconnects.
- REQ-020: Prepared run metadata must explicitly distinguish prepared-new identities from historical offline identities via an activation/provisioning state, not by guessing from `platformAgentRunId` alone.
- REQ-021: Backend must provide an activation method below the coordinator, e.g. `activatePreparedRun(runId)`, that creates runtime for prepared identities exactly once and differs from historical `restoreAgentRun(runId)`.
- REQ-022: Prepared identities abandoned before first command must have cleanup behavior: explicit cancel plus TTL-based cleanup for stale prepared runs.
- REQ-023: External standalone send callers above the runtime boundary must use `AgentRunCommandCoordinator` rather than directly restoring and calling `AgentRun.postUserMessage()`.
- REQ-024: During an accepted command that starts from an inactive/offline standalone run, restored-runtime readiness snapshots and runtime-attachment status must not clear the command overlay or publish visible `running`.
- REQ-025: Command overlay replacement must be command-correlated: visible `Running` may replace command `Initializing` only from a live event produced after command handoff for that command, such as `TURN_STARTED`, command-correlated `AGENT_STATUS running`, or equivalent runtime execution evidence; command failure/error may replace it with `Error`.

## Acceptance Criteria

- AC-001: Existing offline standalone run send no longer sequences frontend `RestoreAgentRun -> websocket connect -> SEND_MESSAGE`; backend command handling owns restore/start/send.
- AC-002: For an offline standalone Codex run, backend publishes `Initializing` before Codex `thread/resume` or equivalent slow restore completes.
- AC-003: Frontend receives/renders backend-owned `Initializing` during standalone restore/start without a local lifecycle-status placeholder.
- AC-004: Completely new standalone first-message flow calls `PrepareAgentRun`, receives a prepared runId, finalizes attachments, sends `SEND_MESSAGE`, and observes backend-owned `Initializing` before runtime start completes.
- AC-005: Active standalone run message flow remains direct and does not regress normal `Running`/`Idle` behavior.
- AC-006: Backend live runtime status replaces command-level overlay/status after runtime starts or errors.
- AC-007: History/sidebar/status snapshots show `status=initializing`, `isActive=true`, `lastKnownStatus=ACTIVE`, and `statusSource=COMMAND_OVERLAY` during command-level create/restore/start.
- AC-008: Same `message_id` retry during blocked restore returns duplicate/in-progress `AGENT_COMMAND_ACK` and does not call `AgentRun.postUserMessage()` or persist the message twice.
- AC-009: Different `message_id` while activation is blocked is rejected with `RUN_COMMAND_IN_PROGRESS` and does not queue or forward the second command.
- AC-010: Command registry entries expire according to the 15-minute retention rule after terminal result and are scoped per run.
- AC-011: Prepared run identity test verifies metadata/history are created with `activationState=PREPARED`, `platformAgentRunId=null`, `lastKnownStatus=IDLE`, and no active runtime is registered.
- AC-012: First command for a prepared identity calls `activatePreparedRun(runId)` / create mechanics, transitions activation state to activated, writes platform id when available, and creates no duplicate metadata/history row.
- AC-013: Failed prepared activation projects backend `Error`, records failure, and allows explicit cancel or retry according to the design contract.
- AC-014: Abandoned prepared identity can be cancelled explicitly and stale prepared identities are TTL-cleaned without affecting activated/historical runs.
- AC-015: External channel standalone dispatch uses the command coordinator and inherits the same command status/idempotency behavior.
- AC-016: Team member offline-send behavior remains unchanged or improves through shared low-level helpers only.
- AC-017: Regression test with restored runtime snapshot/status immediately `running` during offline standalone send verifies emitted/visible sequence is `offline -> initializing -> running`, with no intermediate `running` before the command-correlated execution event.
- AC-018: Source review/test verifies `AgentRunCommandCoordinator` has no restore-snapshot bridge that calls `activeRun.getStatusSnapshot()` and publishes it while a STARTING command overlay is active.

## Constraints / Dependencies

- Backend status authority is mandatory for lifecycle status.
- Frontend may optimistically show the submitted user message/composer state, but not lifecycle status as primary truth.
- Websocket/status channel for an existing run identity must not require a fully restored runtime object.
- New-agent first message needs a durable run identity before attachments can be finalized and websocket can connect.
- Different-command queuing is explicitly out of scope for this change; concurrent different command attempts are rejected.

## Assumptions

- Run metadata/history exists for previously shown offline runs even when runtime is inactive.
- Backend can validate run identity from metadata without restoring runtime.
- Backend can publish command-level status events/snapshots independent of an active `AgentRun` object.
- Existing run-history `lastKnownStatus` can remain coarse (`ACTIVE`/`IDLE`/`ERROR`/`TERMINATED`), while visible `status` carries transient `initializing`.

## Risks / Open Questions

- Runtime event integration must ensure overlay clearing is not tied to websocket session lifetime.
- Prepared-run cleanup must coordinate with existing context-file ownership so finalized files from abandoned prepared runs do not leak.
- Existing external channel send paths must be migrated carefully because they currently call active runtime directly.

## Requirement-To-Use-Case Coverage

| Requirement | Covered Use Cases |
| --- | --- |
| REQ-001 | UC-001, UC-002, UC-003, UC-006 |
| REQ-002 | UC-002, UC-004, UC-005 |
| REQ-003 | UC-002, UC-004 |
| REQ-004 | UC-002 |
| REQ-005 | UC-002, UC-005 |
| REQ-006 | UC-003, UC-005 |
| REQ-007 | UC-001 |
| REQ-008 | UC-006, UC-007 |
| REQ-009 | UC-005, UC-006 |
| REQ-010 | UC-010 |
| REQ-011 | UC-001, UC-002, UC-003 |
| REQ-012 | UC-008, UC-009 |
| REQ-013 | UC-008 |
| REQ-014 | UC-009 |
| REQ-015 | UC-008, UC-009 |
| REQ-016 | UC-005, UC-006, UC-007 |
| REQ-017 | UC-005, UC-006 |
| REQ-018 | UC-005 |
| REQ-019 | UC-006, UC-007 |
| REQ-020 | UC-003 |
| REQ-021 | UC-003 |
| REQ-022 | UC-003, UC-007 |
| REQ-023 | UC-011 |
| REQ-024 | UC-002, UC-004, UC-005, UC-012 |
| REQ-025 | UC-002, UC-003, UC-006, UC-012 |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criterion | Scenario Intent |
| --- | --- |
| AC-001 | Removes frontend restore-before-send. |
| AC-002 | Proves Codex restore is covered by backend `Initializing`. |
| AC-003 | Proves no frontend lifecycle placeholder is needed. |
| AC-004 | Covers new agent first-message path. |
| AC-005 | Protects active-run behavior. |
| AC-006 | Proves live replacement. |
| AC-007 | Proves projection contract. |
| AC-008 | Proves same-id idempotency. |
| AC-009 | Proves different-id concurrency rejection. |
| AC-010 | Proves registry retention. |
| AC-011 | Proves prepared identity is not runtime activation. |
| AC-012 | Proves prepared activation handoff. |
| AC-013 | Proves failure projection/cleanup behavior. |
| AC-014 | Proves abandoned prepared cleanup. |
| AC-015 | Enforces authoritative boundary for external send callers. |
| AC-016 | Protects team reference path. |
| AC-017 | Proves restored-runtime `running` does not leak before command execution. |
| AC-018 | Proves premature restore-snapshot bridge is removed. |

## Approval Status

User clarified architectural preference: pursue backend-owned lifecycle/status correctness rather than a frontend optimistic status patch. Requirements are refined after architecture review findings AR-002, AR-003, AR-004, and post-delivery user validation showing a standalone-only `Initializing -> Running -> Initializing` flicker caused by premature runtime-readiness status exposure.
