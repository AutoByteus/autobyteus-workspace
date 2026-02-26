# Design-Based Runtime Call Stacks (Debug-Trace Style)

## Conventions

- Frame format: `path/to/file.ts:functionName(args?)`
- Boundary tags:
  - `[ENTRY]` external entrypoint (API/CLI/event)
  - `[ASYNC]` async boundary (`await`, queue handoff, callback)
  - `[STATE]` in-memory mutation
  - `[IO]` file/network/database/cache IO
  - `[FALLBACK]` non-primary branch
  - `[ERROR]` error path

## Design Basis

- Scope Classification: `Small`
- Source Artifact:
  - `Small`: `tickets/agent-event-monitor-autoscroll/implementation-plan.md` (draft solution sketch as lightweight design basis)
- Referenced Sections:
  - `Solution Sketch`
  - `Step-By-Step Plan`

## Use Case Index

- Use Case 1: Sticky auto-scroll while streaming when user is near bottom
- Use Case 2: Preserve manual scroll position when user is not near bottom

---

## Use Case 1: Sticky auto-scroll while streaming when user is near bottom

### Goal
Keep the conversation viewport pinned to the latest content during live streaming updates.

### Preconditions
- Agent conversation panel is visible.
- Scroll container exists.
- User is currently at/near bottom.

### Expected Outcome
As streamed content updates the conversation view, the viewport scrolls to bottom automatically when pinned.

### Primary Runtime Call Stack

```text
[ENTRY] services/agentStreaming/AgentStreamingService.ts:dispatchMessage(message, context)
├── services/agentStreaming/AgentStreamingService.ts:dispatchMessage(...) [STATE] # updates context.conversation.updatedAt
├── components/workspace/agent/AgentWorkspaceView.vue:<template> # passes conversation as prop into AgentEventMonitor
├── Vue render cycle: component update commit [ASYNC]
└── components/workspace/agent/AgentEventMonitor.vue:onUpdated()
    └── components/workspace/agent/AgentEventMonitor.vue:syncAutoScrollIfPinned()
        ├── components/workspace/agent/AgentEventMonitor.vue:getConversationScrollContainer() [STATE] # lookup by container id
        ├── components/workspace/agent/AgentEventMonitor.vue:scrollToBottom() [STATE] # element.scrollTop = element.scrollHeight
        └── components/workspace/agent/AgentEventMonitor.vue:updatePinnedStateFromScrollPosition() [STATE]
└── Browser DOM: scroll viewport now shows latest streamed content
```

### Branching / Fallback Paths

```text
[FALLBACK] scroll container missing (unmounted or not ready)
components/workspace/agent/AgentEventMonitor.vue:syncAutoScrollIfPinned()
└── return without mutation
```

### State And Data Transformations

- WebSocket stream event -> conversation content mutation.
- Conversation mutation -> Vue re-render + `onUpdated`.
- `onUpdated` callback -> conditional DOM `scrollTop` update.

### Observability And Debug Points

- Debug point: `onUpdated` trigger in `AgentEventMonitor`.
- Debug point: computed bottom distance before/after scroll.

### Design Smells / Gaps

- None.

### Open Questions

- None for this scope.

---

## Use Case 2: Preserve manual scroll position when user is not near bottom

### Goal
Avoid forcing viewport jumps when user scrolls up to inspect prior content.

### Preconditions
- Scroll container exists.
- User scrolled upward beyond near-bottom threshold.

### Expected Outcome
Streaming updates do not force-scroll; viewport stays where user positioned it.

### Primary Runtime Call Stack

```text
[ENTRY] Browser DOM scroll event on conversation container
├── components/workspace/agent/AgentEventMonitor.vue:handleConversationScroll(event)
│   └── components/workspace/agent/AgentEventMonitor.vue:updatePinnedStateFromScrollPosition() [STATE] # pinned=false
[ENTRY] services/agentStreaming/AgentStreamingService.ts:dispatchMessage(message, context)
├── services/agentStreaming/AgentStreamingService.ts:dispatchMessage(...) [STATE] # mutates conversation
└── components/workspace/agent/AgentEventMonitor.vue:onUpdated()
    └── components/workspace/agent/AgentEventMonitor.vue:syncAutoScrollIfPinned()
        └── branch: pinned=false -> no scroll mutation
```

### Branching / Fallback Paths

```text
[FALLBACK] user scrolls back near bottom
components/workspace/agent/AgentEventMonitor.vue:handleConversationScroll(event)
└── pinned=true; next render update resumes auto-scroll behavior
```

```text
[ERROR] none expected
```

### State And Data Transformations

- User scroll position -> pinned boolean state.
- Pinned boolean + render update -> conditional scroll mutation/no-op.

### Observability And Debug Points

- Debug point: `pinned` state transitions on `scroll`.

### Design Smells / Gaps

- None.

### Open Questions

- None.
