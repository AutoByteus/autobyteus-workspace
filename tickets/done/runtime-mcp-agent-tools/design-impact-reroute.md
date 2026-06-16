# Design Impact Reroute: Runtime MCP Agent Tools Memory Trace Boundary

## Classification

- Reroute type: Design Impact
- Ticket: `runtime-mcp-agent-tools`
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-mcp-agent-tools`
- Current owner routing from: `implementation_engineer`
- Requested next owner: `solution_designer`
- Reason: The API/E2E failure is not confined to Claude Agent SDK MCP materialization. Investigating it exposed an under-specified runtime-memory/run-history invariant for team member agent runs after replacing the old Claude in-process `send_message_to` handler with route-backed Agent Tools MCP.

## Short Summary

The implementation passed code review and most focused checks, but live Claude API/E2E failed after successful route-backed inter-agent delivery because sender memory raw traces were absent:

```text
Timed out waiting for ping send_message_to memory traces for invocation call_00_zP1JfTrUulPyngiliMzE0120. Observed traces: []
```

API/E2E evidence says the real Claude run did call route-backed `send_message_to` in both directions and emitted canonical stream lifecycle/events before failing only on runtime-memory raw trace verification. This maps to `REQ-RMCP-007`, but the current design primarily specifies Claude provider-name canonicalization; it does not explicitly define the persistence spine that turns the canonical lifecycle event into a durable memory raw trace for a team member run.

## Why This Is Not A Safe Local Fix

A first implementation attempt tried to treat the empty raw traces as a missing `AgentRunConfig.memoryDir` issue and add a member-level memoryDir fallback. That was the wrong posture for this team standard because:

1. `memoryDir` is a runtime-memory/run-history invariant, not a Claude materializer detail.
2. Deriving a memory directory inside `MixedAgentMemberHandle` when config is missing is effectively fallback behavior for a missing upstream invariant.
3. The attempted broader changes to rebind memory/run-history/team-run service singletons by current app memory dir touched global service lifecycle and crossed well beyond the approved Claude MCP materializer scope.
4. The correct design should identify the authoritative owner that guarantees member run memory roots for fresh and restored team/member runs, then enforce that invariant cleanly. It should not preserve a nullable path and patch around it downstream.

The unreviewed local-fix attempt has been removed from the active working tree and preserved only as diagnostic evidence here:

- Attempt diff: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-mcp-agent-tools/tickets/in-progress/runtime-mcp-agent-tools/design-impact-memory-local-fix-attempt.diff`

## Relevant Existing Requirements / Design Points

From the current requirements/design package:

- `REQ-RMCP-007`: Claude event conversion must normalize `mcp__autobyteus_agent_tools__send_message_to` to canonical `send_message_to` for segment metadata, approval events, execution lifecycle events, run history, and memory traces.
- `REQ-RMCP-008`: Claude event handling must not suppress the new Agent Tools MCP `send_message_to` raw tool lifecycle as duplicate noise.
- Current design explicitly removes the old Claude in-process `autobyteus_team` send-message handler path and keeps a single active execution path: Agent Tools MCP Server plus shared dispatcher.
- Current design does not name the full memory persistence spine for team member tool traces after route-backed MCP execution.

## Observed Failure Boundary

The failure boundary appears to be after route-backed execution and canonical stream event emission, but before or during durable memory raw trace persistence/readback.

Working technical observations:

1. `AgentRunMemoryRecorder` records raw traces from `AgentRun` events, but only when `AgentRunConfig.memoryDir` exists. If missing, the recorder skips the run rather than creating a writer.
2. `RuntimeMemoryEventAccumulator` records tool calls/results from canonical `TOOL_EXECUTION_STARTED`, `TOOL_EXECUTION_SUCCEEDED`, `TOOL_EXECUTION_FAILED`, and `TOOL_EXECUTION_DENIED` events.
3. `ClaudeSessionEventConverter` now normalizes the provider wire name `mcp__autobyteus_agent_tools__send_message_to` to canonical `send_message_to`.
4. API/E2E observed canonical stream lifecycle/events and successful ping/pong delivery, so the route and event conversion path appears alive.
5. The sender memory raw trace query observed no matching traces, which suggests either:
   - the sender `AgentRun` had no memory recorder because `memoryDir` was missing;
   - the recorder wrote to a different memory root than the run-history/memory readback path;
   - the live route-backed event shape was visible to stream assertions but not accepted by the memory accumulator/projection path;
   - or the old in-process handler previously satisfied a memory/run-history assumption that was not captured in the new route-backed design.

## Attempted Local Fix That Should Not Be Treated As Accepted Design

The paused local-fix attempt did two things:

1. Added a `MixedAgentMemberHandle` method to derive a team-scoped member `memoryDir` when `this.options.config.memoryDir` is missing, including task-agent memory location derivation.
2. Added memoryDir-aware singleton rebinding to these services/factories:
   - `src/agent-memory/services/agent-memory-location-service.ts`
   - `src/run-history/services/team-run-metadata-service.ts`
   - `src/run-history/services/team-run-history-service.ts`
   - `src/agent-team-execution/services/team-run-service.ts`
   - `src/agent-team-execution/services/agent-team-run-manager.ts`
   - `src/agent-team-execution/backends/mixed/mixed-team-run-backend-factory.ts`

This is diagnostic only. It indicates the suspected area, not the approved answer. The design should decide whether any of these concerns belong in scope and where the authoritative invariant should live.

## Design Questions For Solution Designer

Please revisit the design with these questions:

1. Which boundary must own the invariant that every team member `AgentRun` that can emit tool lifecycle events has a concrete durable memory directory?
   - Candidate boundaries include team-run provisioning, mixed-team backend factory, member registry/member handle construction, agent-run provisioning, or memory-location service.
   - Avoid downstream fallback. If `memoryDir` is required, enforce it at creation/provisioning time and fail early if absent.
2. Should `AgentRunConfig.memoryDir` remain nullable for active team member runs, or should the runtime distinguish inactive/restored/no-memory modes from executable runs?
3. How should task-agent member memory paths be derived after the route-backed send-message cutover?
   - Is the task-agent memory location rooted under the logical member run id, the task-agent run id, or both through an existing `AgentMemoryLocationService` identity shape?
4. Is the observed failure truly a missing `memoryDir`, a stale app memory-root singleton problem in the live E2E harness, or an event-shape/projection problem?
   - If singleton rebinding is needed, that is broader memory/run-history service lifecycle design and should be explicitly designed and reviewed.
   - If it is only test setup, the design should say so and keep production runtime code unchanged.
5. Should runtime-memory raw traces be recorded only from the canonical Claude `AgentRun` lifecycle events, or should the server-hosted Agent Tools MCP route/dispatcher also emit/persist anything?
   - Current design points toward the former, but the memory persistence spine should be explicit.
6. What old in-process Claude handler behavior, if any, implicitly satisfied memory trace/run-history persistence, and how should the clean-cut route-backed path preserve the same application-facing invariant without legacy/fallback compatibility?

## Recommended Design Posture

- Treat this as a `Boundary Or Ownership Issue` or `Missing Invariant`, not a local Claude materializer bug.
- Update the design spec to include the memory/run-history trace spine:

```text
Claude SDK tool use
  -> ClaudeSessionEventConverter canonical send_message_to lifecycle
  -> AgentRun event dispatch
  -> AgentRunMemoryRecorder / RuntimeMemoryEventAccumulator
  -> RunMemoryWriter raw trace file under the authoritative member memoryDir
  -> run-history/memory readback surfaces
```

- Name the authoritative owner for the member memoryDir invariant and remove any nullable/fallback path for executable team member runs if memory traces are required.
- Keep the clean-cut rule: no old `mcp__autobyteus_team__send_message_to` fallback, no compatibility branch, and no hidden member-level fallback for a missing memory root.
- After design revision, route through architecture review before implementation resumes.

## Current Active Working Tree Note

The active working tree still contains the approved Claude Agent Tools MCP implementation and the API/E2E durable coverage update that exposed this issue. The unreviewed memory fallback/singleton-local-fix attempt was reverted from source and preserved only in the diagnostic diff artifact above.

## Cumulative Artifact Package

Current ticket artifacts:

- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-mcp-agent-tools/tickets/in-progress/runtime-mcp-agent-tools/requirements-doc.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-mcp-agent-tools/tickets/in-progress/runtime-mcp-agent-tools/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-mcp-agent-tools/tickets/in-progress/runtime-mcp-agent-tools/design-spec.md`
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-mcp-agent-tools/tickets/in-progress/runtime-mcp-agent-tools/design-review-report.md`
- Implementation handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-mcp-agent-tools/tickets/in-progress/runtime-mcp-agent-tools/implementation-handoff.md`
- Code review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-mcp-agent-tools/tickets/in-progress/runtime-mcp-agent-tools/code-review-report.md`
- API/E2E coverage investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-mcp-agent-tools/tickets/in-progress/runtime-mcp-agent-tools/api-e2e-coverage-investigation.md`
- API/E2E execution coverage report: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-mcp-agent-tools/tickets/in-progress/runtime-mcp-agent-tools/api-e2e-execution-coverage-report.md`
- Design-impact reroute artifact: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-mcp-agent-tools/tickets/in-progress/runtime-mcp-agent-tools/design-impact-reroute.md`
- Diagnostic attempted-fix diff: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-mcp-agent-tools/tickets/in-progress/runtime-mcp-agent-tools/design-impact-memory-local-fix-attempt.diff`

Prior lineage:

- Prior requirements: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-mcp-agent-tools/tickets/done/streamable-mcp-runtime-tools/requirements-doc.md`
- Prior investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-mcp-agent-tools/tickets/done/streamable-mcp-runtime-tools/investigation-notes.md`
- Prior design: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-mcp-agent-tools/tickets/done/streamable-mcp-runtime-tools/design-spec.md`
- Prior implementation handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-mcp-agent-tools/tickets/done/streamable-mcp-runtime-tools/implementation-handoff.md`
