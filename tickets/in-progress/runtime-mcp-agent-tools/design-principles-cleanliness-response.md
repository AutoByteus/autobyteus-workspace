# Design Principles Cleanliness Response

## Status

- Owner: `solution_designer`
- Date: 2026-06-13
- User question: "According to the design principles, do you think your design is clean? Did you load the design principles?"
- Answer: yes, the `solution-designer` skill and `design-principles.md` were reloaded before this assessment. The core design direction is clean; the design artifact was not clean enough while the runtime-memory/run-history rework lived mostly as an appended design-impact section. The design spec has now been consolidated so the memory trace spine is part of the primary spine inventory, ownership boundaries, dependency rules, implementation sequence, and acceptance coverage.

## Cleanliness Assessment Against Design Principles

| Principle | Assessment | Evidence / Fix |
| --- | --- | --- |
| Spine-first design and span sufficiency | Clean after consolidation | `design-spec.md` now includes DS-RMCP-007 from Claude SDK tool chunks through GraphQL memory readback, and DS-RMCP-008 from team creation/restore through `AgentRunManager` registration. |
| Ownership clarity | Clean | MemoryDir derivation is owned by `MixedTeamRunBackendFactory`, `TeamRunMetadataMapper`, and `MixedTeamMemberRegistry`; `MixedAgentMemberHandle` only asserts/consumes; `AgentRunMemoryRecorder` only persists canonical events. |
| Authoritative boundary rule | Clean | Claude uses `AgentToolMcpSessionService` descriptor output; MCP route executes only through `SendMessageToDispatcher`; memory persistence is only through `AgentRunManager`/recorder, not the MCP route. |
| Off-spine concerns | Clean | Descriptor materialization, tool-name normalization, memory location derivation, and raw trace persistence each serve a clear owner and are not mixed into the route. |
| No legacy/compat fallback | Clean | Old `mcp__autobyteus_team__send_message_to`, route-side memory writer, member-handle fallback memoryDir, and stale `{ accepted: true }` E2E result expectation are explicitly rejected. |
| Design-impact integration | Clean after update | The prior appended reroute section was collapsed into concise branch-comparison evidence; the actionable design now lives in the main spine/ownership/dependency/test sections. |

## User-Facing Answer: Why `origin/personal` Worked

The old `origin/personal` path worked because Claude's in-process `ClaudeSendMessageToolCallHandler` was both executor and synthetic lifecycle emitter. It manually emitted canonical send-message tool lifecycle events around `SendMessageToDispatcher`, so `AgentRunMemoryRecorder` saw canonical events and wrote raw traces.

The new route-backed path is cleaner but stricter: the Agent Tools MCP route executes the tool and returns MCP content to Claude; canonical lifecycle events must then come from the generic Claude SDK tool-use observation path, and memory must be persisted by the standard AgentRun recorder sidecar. That exposes the invariant that active recordable team-member runs must already have a concrete `memoryDir` and the memory writer/readback must share the same app memory root.

## Updated Artifact

- Revised design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-mcp-agent-tools/tickets/in-progress/runtime-mcp-agent-tools/design-spec.md`
