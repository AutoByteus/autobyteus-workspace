# Agent Work Trace Projection (TypeScript)

## Scope

`src/agent-work-traces` owns the shared Agent Work Trace Projection capability.
It converts canonical raw trace files for a target run into readable Markdown
work trace files that other features can pass around by path. Work traces are
derived cache artifacts, not canonical evidence; raw traces remain authoritative.

The first consumer is manual self-evolution. Future memory compaction work should
consume this shared package instead of importing self-evolution internals or
duplicating rendering policy.

## Public Boundary

Consumers call `AgentWorkTraceProjectionService.ensureCurrent({ target,
memoryDir, agentName })` and receive an `AgentWorkTracePackage`. The context is
intentionally small:

- `target`: `{ kind: "agent_run", runId }` or `{ kind: "team_member_run",
  teamRunId, memberRunId }`
- `memoryDir`: the target run/member memory directory whose raw trace files are
  being projected
- `agentName`: the target agent display name used to render agent-authored
  Markdown subject labels

The projection package includes the shared work trace root path, manifest path,
manifest metadata, render context metadata, target identity, file entries, and a
summary hash over target, render context, and source fingerprints. Consumers
should use the public projection service and package only; source reading,
rendering, redaction, and store classes remain inside the shared capability.

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
writes. Archive segment work trace files are reused when the source fingerprint
and normalized render context fingerprint are unchanged; the active trace file is
regenerated when active raw trace content changes. The manifest is rewritten for
the current package on each projection.

The previous self-evolution-owned cache root
`<memoryDir>/self_evolution/work_traces/` is obsolete. The current runtime does
not dual-write, fallback-read, or migrate that generated cache path because work
traces are regenerable from canonical raw traces.

## Rendering And Privacy

`AgentWorkTraceRenderer` converts raw trace records through the run-history
historical replay transformer and emits readable Markdown for user messages,
target-agent messages, reasoning, meaningful tool calls, tool results/errors,
corrections, retries, feedback signals, and compaction-boundary notes when
present.

Agent-authored entries use the normalized target agent display name as the
subject label, preserving configured casing while trimming and collapsing
whitespace. Blank display names fall back to `Agent`. Tool sections use
`<Agent Name> tool call:` and user messages remain `user:`.

`AgentWorkTraceRedactor` hides backend/protocol noise and common sensitive
values before content reaches the Markdown files. Hidden or redacted content
includes raw trace ids, turn/sequence/source/correlation/tool-call/provider ids,
raw JSON envelopes, provider internals, tokens, secrets, credentials, and email
addresses. Exact work trace paths remain visible because consumers need file
references.

## Consumer Contract

Self-evolution is a consumer, not the projection owner. Before it triggers the
visible skill-evolver companion, `SelfEvolutionService` asks the shared
projection service for a current package and sends only manifest/root/file paths
and summary metadata through its path-based companion request. Self-evolution
session metadata keys may remain self-evolution-specific because they describe
the companion workflow state, but the generated files and rendering policy are
owned by `agent-work-traces`.

A background projection worker is not part of the current runtime. Freshness is
provided on demand by each `ensureCurrent()` call.

## Boundaries To Preserve

- `agent-work-traces` may depend on raw trace and run-history projection
  boundaries, but it must not import self-evolution.
- `agent-memory` must not import work-trace or self-evolution projection types.
- Consumers should not instantiate `AgentWorkTraceSourceReader`,
  `AgentWorkTraceRenderer`, or `AgentWorkTraceStore` directly.
- Do not add compatibility wrappers, dual paths, or old generated-path fallback
  reads for `<memoryDir>/self_evolution/work_traces/`.
- Keep compaction-specific fields out of the shared package until the memory
  compaction redesign defines them.
