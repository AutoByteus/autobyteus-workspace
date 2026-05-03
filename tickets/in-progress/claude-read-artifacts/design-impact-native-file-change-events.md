# Design Impact: Superseded Two-Event Addendum

## Status

Superseded by the revised one-event design on 2026-05-03.

## Decision

The earlier addendum proposed `FILE_CHANGE_OBSERVED -> RunFileChangeService -> FILE_CHANGE_UPDATED`. The user correctly pointed out that two file-change event names are redundant for this codebase.

The accepted revised direction is:

```txt
Runtime raw event
  -> runtime-specific normalizer
  -> base AgentRunEvent[]
  -> AgentRunEventPipeline
  -> FileChangeEventProcessor appends FILE_CHANGE when appropriate
  -> final AgentRunEvent[] published
```

There is one public normalized file-change event:

```ts
AgentRunEventType.FILE_CHANGE
```

`RunFileChangeService` consumes `FILE_CHANGE` for projection/persistence only. It does not derive from arbitrary tool events and does not publish a second file-change event.

## Rationale

- `FILE_CHANGE_UPDATED` is redundant wording because the event already means a file change happened.
- `FILE_CHANGE_OBSERVED` plus `FILE_CHANGE_UPDATED` splits one product concept into two public events and creates avoidable mental overhead.
- A post-normalization processor chain gives the future extension point the user wants: file-change is one processor; future custom/semantic events can be added as more processors.
- The architecture keeps raw-provider conversion, derived-event generation, durable projection, and UI rendering as separate owners.

## Replacement Artifact

See the revised design spec:

`/Users/normy/autobyteus_org/autobyteus-worktrees/claude-read-artifacts/tickets/in-progress/claude-read-artifacts/design-spec.md`
