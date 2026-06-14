# Design-Impact Response Round 1: Route-Backed Send Message Memory Trace Spine

## Status

- Owner: `solution_designer`
- Date: 2026-06-13
- Routing status: Not yet sent to architecture review per user instruction. This response first answers why `origin/personal` memory worked and why the route-backed `send_message_to` path exposed the failure.
- Updated artifacts:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-mcp-agent-tools/tickets/in-progress/runtime-mcp-agent-tools/requirements-doc.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-mcp-agent-tools/tickets/in-progress/runtime-mcp-agent-tools/investigation-notes.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-mcp-agent-tools/tickets/in-progress/runtime-mcp-agent-tools/design-spec.md`

## User Question Answered

Why did memory storage work on `origin/personal`, but not with the new route-backed `send_message_to`?

The relevant memory subsystem is not materially different. `AgentRunMemoryRecorder`, `RuntimeMemoryEventAccumulator`, team memory layout, and mixed-team memoryDir materialization are essentially the same between `origin/personal` and this base. The difference is the source of Claude `send_message_to` lifecycle events and result shape.

### Old `origin/personal` Path

```text
Claude SDK in-process MCP tool mcp__autobyteus_team__send_message_to
  -> ClaudeSendMessageToolCallHandler.handle(...)
  -> handler manually emits ITEM_ADDED + ITEM_COMMAND_EXECUTION_STARTED
  -> handler calls SendMessageToDispatcher
  -> handler manually emits ITEM_COMMAND_EXECUTION_COMPLETED + ITEM_COMPLETED
  -> ClaudeSessionEventConverter converts canonical send_message_to events
  -> AgentRunMemoryRecorder writes raw_traces.jsonl
```

The old path worked because the Claude-specific handler was both the executor and a synthetic canonical lifecycle emitter. It returned an application object result (`{ accepted: true, code, message }`) and the old converter/coordinator suppressed raw `mcp__autobyteus_team__send_message_to` provider events because the handler had already emitted canonical events.

### New Route-Backed Path

```text
Claude SDK remote MCP tool mcp__autobyteus_agent_tools__send_message_to
  -> /mcp/agent-tools/:sessionId tools/call
  -> Agent Tools MCP route/dispatcher/executor
  -> SendMessageToDispatcher
  -> MCP content result returned to Claude
  -> generic ClaudeSessionToolUseCoordinator observes SDK chunks
  -> ClaudeSessionEventConverter emits canonical send_message_to AgentRun events
  -> AgentRunMemoryRecorder writes raw_traces.jsonl if attached with correct memoryDir/root
```

The new route should not write memory directly. It must persist through canonical AgentRun lifecycle events. The live E2E proved the route and canonical stream lifecycle were alive. Because memory readback returned `Observed traces: []`, the failure is most likely one of these invariants:

1. the sender `AgentRunConfig.memoryDir` was missing/blank when `AgentRunManager` registered the run, so `AgentRunMemoryRecorder` skipped subscription; or
2. memory was written under a stale/cached app memory root while `getTeamMemberRunMemoryView` read from the current app memory root; and
3. after traces exist, the memory assertion must expect the new MCP content result shape rather than the old `{ accepted: true }` handler result object.

## Design Decision

- Keep the route-backed Agent Tools MCP path.
- Do not reintroduce `mcp__autobyteus_team__send_message_to` fallback.
- Do not make the Agent Tools MCP route/dispatcher write raw traces.
- Do not let `MixedAgentMemberHandle` derive a fallback memoryDir.
- Make the memoryDir/root invariant explicit and test it before/at AgentRun creation.

## Authoritative Owners

| Concern | Authoritative Owner |
| --- | --- |
| Fresh standard mixed-team member memoryDir | `MixedTeamRunBackendFactory` using `AgentMemoryLocationService.getTeamAgentRunLocation(...)` |
| Restore member memoryDir | `TeamRunMetadataMapper` using metadata + `AgentMemoryLocationService` |
| Task-agent memoryDir | `MixedTeamMemberRegistry` using `AgentMemoryLocationService.getTaskAgentLocation(...)` |
| Last-mile assertion/consumer | `MixedAgentMemberHandle` |
| Active run sidecar attachment | `AgentRunManager` |
| Canonical event to raw trace persistence | `AgentRunMemoryRecorder` + `RuntimeMemoryEventAccumulator` |
| MCP transport/tool execution | Agent Tools MCP route/dispatcher/executor + `SendMessageToDispatcher` |

## Required Implementation Follow-Up

1. Add/keep focused tests proving standard and task-agent member configs have non-empty memoryDir before `AgentRunConfig` construction.
2. Add fail-fast assertion in `MixedAgentMemberHandle` if a recordable non-AutoByteus executable member config lacks memoryDir.
3. Add/keep event-to-memory test proving canonical `send_message_to` lifecycle events create `tool_call` / `tool_result` raw traces.
4. Update live E2E memory trace result expectation to preserve the route-backed MCP content result shape.
5. If stale app-memory-root singleton state is reproduced, fix it at the service lifecycle/test bootstrap boundary, not as a member-handle fallback.
