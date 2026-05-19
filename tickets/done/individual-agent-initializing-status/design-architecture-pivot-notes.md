# Architecture Pivot Notes

## Trigger

The user clarified that the preferred solution is the architecture-right one: backend remains source of truth for lifecycle status, and runtime restore/start should be considered `Initializing`.

This supersedes the prior frontend accepted-send placeholder design and the AR-001 rework around preserving frontend local placeholders.

## Key Decision

Introduce a backend-owned standalone command/lifecycle boundary, analogous in responsibility to the agent-team container/member command overlay.

Current standalone flow:

```text
RestoreAgentRun -> wait for runtime restore -> connect websocket -> SEND_MESSAGE -> postUserMessage emits Initializing
```

Target standalone flow:

```text
SEND_MESSAGE to run identity -> backend command coordinator publishes Initializing -> backend restores/starts runtime if needed -> backend forwards message -> live runtime status replaces command status
```

For new runs, separate durable run identity preparation from runtime activation:

```text
PrepareAgentRun(identity only) -> finalize attachments/connect stream -> SEND_MESSAGE -> backend activates runtime under Initializing
```

## Architectural Principle

- Frontend can optimistically render the submitted user message.
- Backend owns lifecycle status.
- Create/restore/start are all part of `Initializing`.
- Websocket/status observation for an existing run identity must not require a fully restored active runtime object.
- Status snapshots/history must use one backend projection owner so overlay/live/history precedence is consistent.

## Superseded Worktree State Warning

The worktree currently contains uncommitted frontend-placeholder implementation changes from the superseded approach. They are not the target design. The implementation phase should remove/reset those code changes before implementing the backend-owned lifecycle architecture.

## Authoritative Revised Artifacts

- Requirements: `/Users/normy/autobyteus_org/autobyteus-worktrees/individual-agent-initializing-status/tickets/in-progress/individual-agent-initializing-status/requirements.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/individual-agent-initializing-status/tickets/in-progress/individual-agent-initializing-status/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/individual-agent-initializing-status/tickets/in-progress/individual-agent-initializing-status/design-spec.md`

## Round-2 Architecture Review Rework

The current design spec resolves the three blockers from the fresh backend-owned lifecycle review:

- AR-002: chooses same-`message_id` idempotency, rejects different commands during `STARTING`/`FORWARDED` with `RUN_COMMAND_IN_PROGRESS`, defines exact `AGENT_COMMAND_ACK` payload, and sets 15-minute terminal command-record retention.
- AR-003: defines `AgentRunStatusProjection` with `status`, `isActive`, `lastKnownStatus`, `statusSource`, `canInterrupt`, and `shouldConnectStream`; projection precedence is command overlay, active runtime, then prepared/historical metadata; overlay clearing is session-independent.
- AR-004: defines prepared metadata via `activationState`, introduces `PrepareAgentRun` as identity-only, adds `activatePreparedRun(runId)` create mechanics below the command coordinator, and specifies cancel/failure/TTL cleanup.

## Use-Case Data-Flow Coverage

The revised design spec contains an explicit `Use Case Data-Flow Span Matrix` covering:

- existing active standalone send;
- existing offline standalone send;
- completely new standalone first message;
- slow Codex restore/start;
- status observation/history while activation is in progress;
- live runtime replacement;
- activation failure;
- team member reference path;
- duplicate/retry command handling.
- different-command concurrency rejection;
- external standalone dispatch through the same command boundary;
- restored-runtime `running` suppression until command-correlated execution.

## Post-Delivery Overlay Replacement Correction

After implementation delivery, user validation found a standalone-only fast flicker:

```text
offline -> initializing -> running -> initializing -> running
```

Source inspection found the delivered standalone coordinator clearing command overlay from a restored runtime snapshot (`clearOverlayForRuntimeOwnedStatus`). This violates the intended backend-owned command lifecycle because restored runtime readiness is not the same as command execution.

The current revised design makes the clean-cut correction:

- Runtime readiness status remains internal while an inactive-start command is `STARTING`.
- Command overlay remains visible through restore/create and runtime attachment.
- Overlay clears/replaces only from command-correlated events after message handoff.
- The restore-snapshot bridge is removed entirely; no legacy/backward-compatible branch or feature flag.
