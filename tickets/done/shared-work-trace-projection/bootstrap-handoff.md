# Bootstrap Handoff — Shared Work Trace Projection

## Ticket

Shared Agent Work Trace Projection refactor.

## Why this ticket comes first

Memory compaction should later consume readable work traces. If memory compaction starts first, it will either duplicate the current self-evolution work-trace renderer or depend on self-evolution internals. This refactor creates the shared boundary first.

## Target outcome

```text
Raw trace remains canonical.
Work trace is generated on demand as a readable derived projection.
Self-evolution consumes the shared work trace projection.
Memory compaction can consume it in a later ticket.
```

## Target disk layout

```text
<memoryDir>/work_traces/
  work_traces_manifest.json
  work_trace_active.md
  work_trace_000000.md
  work_trace_000001.md
```

`<memoryDir>` means the target agent run memory directory.

## Current starting points

- `autobyteus-server-ts/src/self-evolution/services/work-traces/self-evolution-work-trace-projection-service.ts`
- `autobyteus-server-ts/src/self-evolution/services/work-traces/self-evolution-work-trace-store.ts`
- `autobyteus-server-ts/src/self-evolution/services/work-traces/self-evolution-work-trace-renderer.ts`
- `autobyteus-server-ts/src/self-evolution/services/work-traces/self-evolution-work-trace-redactor.ts`
- `autobyteus-server-ts/src/self-evolution/domain/work-traces.ts`
- `autobyteus-server-ts/src/agent-memory/services/raw-trace-work-trace-source-reader.ts`
- `autobyteus-server-ts/src/run-history/projection/transformers/raw-trace-to-historical-replay-events.ts`
- `autobyteus-server-ts/src/self-evolution/services/companion/self-evolution-companion-trigger-message-builder.ts`

## Explicit non-goals

- Do not redesign memory compaction in this ticket.
- Do not replace raw trace storage.
- Do not introduce duplicate self-evolution and shared work-trace generation paths as steady state.

## Artifact package

- Requirements: `/Users/normy/autobyteus_org/autobyteus-worktrees/shared-work-trace-projection/tickets/done/shared-work-trace-projection/requirements.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/shared-work-trace-projection/tickets/done/shared-work-trace-projection/investigation-notes.md`
- This handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/shared-work-trace-projection/tickets/done/shared-work-trace-projection/bootstrap-handoff.md`
- Prior compaction assessment context: `/Users/normy/autobyteus_org/autobyteus-worktrees/compression-current-behavior/tickets/in-progress/compression-current-behavior/compaction-design-assessment.md`
