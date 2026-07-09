# Agent Work Trace Projection (TypeScript)

## Scope

`src/agent-work-traces` owns the shared Agent Work Trace Projection capability.
It converts canonical raw trace files for a target run into readable Markdown
work trace files that other features can pass around by path. Work traces are
derived generated artifacts, not canonical evidence; raw traces remain
authoritative.

The first consumer is manual Skill Improvement. Future memory compaction work
should consume this shared package instead of importing self-evolution internals
or duplicating rendering policy.

## Public Boundary

Consumers call `AgentWorkTraceProjectionService.ensureCurrent({ target,
memoryDir, targetDisplayName })` and receive an `AgentWorkTracePackage`. The
context is intentionally small:

- `target`: `{ kind: "agent_run", runId }` or `{ kind: "team_member_run",
  teamRunId, memberRunId }`
- `memoryDir`: the target run/member memory directory whose raw trace files are
  being projected
- `targetDisplayName`: optional metadata-only target display name

The projection package includes target identity, optional `targetDisplayName`,
the shared work trace root path, manifest path, manifest metadata, file entries,
and a summary hash over target identity plus rendered evidence content. Target
display names are metadata only; they are not Markdown body speaker labels.
Consumers should use the public projection service and package only; source
reading, rendering, redaction, and store classes remain inside the shared
capability.

## Source Inputs

`AgentWorkTraceSourceReader` adapts raw trace files into projection sources. It
uses `RawTraceFileSourceService` from `agent-memory` so raw trace discovery,
normalization, and canonical filename policy stay with the raw trace subsystem.

Current steady-state inputs are:

- active raw traces from `raw_traces_active.jsonl`
- complete rotated raw-trace segment files such as `raw_traces_000001.jsonl`

Runtime projection must not revive `raw_traces.jsonl` as an active read/write
fallback. Old active filename handling is migration-only and remains owned by the
agent-memory/app-data migration path.

## Output Layout

Projection writes derived files directly under the target memory directory:

```text
<memoryDir>/work_traces/
  work_traces_manifest.json
  work_trace_active.md
  work_trace_000001.md
```

`AgentWorkTraceStore` owns this layout, manifest writing, file naming, and atomic
writes. Current projection regenerates work trace Markdown files and rewrites the
manifest for each `ensureCurrent()` call. It does not use renderer versions,
render fingerprints, source fingerprints, old manifest fallback, dual rendering,
or generated-file compatibility reads.

The previous self-evolution-owned cache root
`<memoryDir>/self_evolution/work_traces/` is obsolete. The current runtime does
not dual-write, fallback-read, or migrate that generated cache path because work
traces are regenerable from canonical raw traces.

## Rendering And Privacy

`AgentWorkTraceRenderer` converts raw trace records through the run-history
historical replay transformer and emits readable Markdown for visible user
messages, visible assistant messages, tool calls/results/errors, corrections,
retries, feedback signals, and neutral trace events such as compaction-boundary
notes when present.

Each Markdown file starts exactly with `# Work Trace`. Body entries use canonical
role/event labels:

- `user:` for user-originated content
- `assistant:` for assistant-originated visible message content
- `tool:` for tool calls/results/errors, with `name`, `status`, and optional
  `arguments`, `result`, or `error` sections
- `trace_event:` for neutral provider/projection notes

Separate assistant/internal reasoning records are omitted from the readable body
and from the improver-visible summary hash. Visible rationale written as normal
assistant message content remains visible as `assistant:` content.

`AgentWorkTraceRedactor` hides backend/protocol noise and common sensitive
values before content reaches the Markdown files. Hidden or redacted content
includes raw trace ids, turn/sequence/source/correlation/tool-call/provider ids,
raw JSON envelopes, provider internals, tokens, secrets, credentials, and email
addresses. Exact work trace paths remain visible because consumers need file
references.

## Consumer Contract

Self-evolution is a consumer, not the projection owner. Before it triggers the
Retrospective Skill Improver, `SelfEvolutionService` asks the shared projection
service for a current package and sends only manifest/root/file paths and summary
metadata through its path-based Skill Improvement request. Self-evolution session
metadata keys may remain self-evolution-specific because they describe workflow
state, but the generated files and rendering policy are owned by
`agent-work-traces`.

A background projection worker is not part of the current runtime. Freshness is
provided on demand by each `ensureCurrent()` call.

## Boundaries To Preserve

- `agent-work-traces` may depend on raw trace and run-history projection
  boundaries, but it must not import self-evolution.
- `agent-memory` must not import work-trace or self-evolution projection types.
- Consumers should not instantiate `AgentWorkTraceSourceReader`,
  `AgentWorkTraceRenderer`, or `AgentWorkTraceStore` directly.
- Do not add compatibility wrappers, dual paths, old manifest fallback, or old
  generated-path reads for `<memoryDir>/self_evolution/work_traces/`.
- Keep compaction-specific fields out of the shared package until the memory
  compaction redesign defines them.
