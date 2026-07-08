# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)
Design-ready

## Goal / Problem Statement

Refactor the existing self-evolution-owned work-trace projection into a shared **Agent Work Trace Projection** capability. The shared capability must transform canonical raw trace files into readable Markdown work-trace files on demand, store those derived work traces in a common per-run memory location, and let self-evolution consume the shared output without owning the projection. This prepares the codebase for a follow-up memory compaction redesign that will also consume the same readable work traces.

Current problem: the raw-trace-to-readable-work-trace pipeline already exists, but it is named and stored as if it belongs only to self-evolution:

```text
<memoryDir>/self_evolution/work_traces/
```

The transformation is more general. It converts internal runtime raw trace records into a readable account of the agent's work/process. That derived representation is useful for self-evolution, memory compaction, and future review/debug/reporting agents.

## Investigation Findings

- `SelfEvolutionWorkTraceProjectionService.ensureCurrent` currently owns source discovery, rendering, manifest reuse, trace-file writes, and summary hashing for self-evolution only.
- `SelfEvolutionWorkTraceStore` writes derived work traces under `<memoryDir>/self_evolution/work_traces/`; file names already match the desired common convention.
- `SelfEvolutionWorkTraceRenderer` renders through the already-shared `buildHistoricalReplayEvents` transformer and covers user messages, worker messages, reasoning, tool activity/results/errors, and provider compaction boundary events.
- `RawTraceWorkTraceSourceReader` is physically under `agent-memory`, but it imports self-evolution domain/context types, creating an inverted feature dependency for shared work-trace projection.
- Latest `origin/personal` renamed the canonical active raw trace file to `raw_traces_active.jsonl` via `RAW_TRACES_ACTIVE_MEMORY_FILE_NAME`; runtime steady-state no longer treats old `raw_traces.jsonl` as an alias. The shared projection should continue to consume active/segment raw sources through `RawTraceFileSourceService` rather than hardcoding raw trace filenames.
- `SelfEvolutionCompanionTriggerMessageBuilder` already uses a safe path-only evidence-package shape: it sends work trace manifest/root/file paths rather than inlining full trace content.
- Current projection tests assert the old self-evolution path and should be updated/replaced to assert the shared path.
- The target common disk layout is:

```text
<memoryDir>/work_traces/
  work_traces_manifest.json
  work_trace_active.md
  work_trace_000000.md
  work_trace_000001.md
```

- Raw trace remains the canonical internal evidence. Work traces are derived, readable, on-demand projections.
- This ticket must not implement the memory compaction redesign. It only creates the shared projection boundary and migrates self-evolution to it.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Refactor / shared capability extraction
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue; File Placement Or Responsibility Drift; Shared Structure Looseness
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Likely Needed now before memory compaction redesign
- Evidence basis: Current projection, renderer, store, and DTO names/paths are self-evolution-specific even though the same raw-trace-to-readable-work-trace capability is needed by memory compaction. `RawTraceWorkTraceSourceReader` also imports self-evolution-specific types from `agent-memory`.
- Requirement or scope impact: Extract/rename/generalize the projection capability first; memory compaction can then build on the shared work traces in a later ticket instead of duplicating or depending on self-evolution internals.

## Recommendations

- Name the shared code-level/domain capability **Agent Work Trace Projection**.
- Keep simple output file names without an `agent_` prefix: `work_trace_active.md`, `work_trace_000000.md`, `work_traces_manifest.json`.
- Store shared derived work traces at `<memoryDir>/work_traces/`.
- Keep self-evolution-specific package/session state under `<memoryDir>/self_evolution/...`, but do not keep the shared work trace cache under that directory.
- Prefer a clean-cut migration: self-evolution should consume the shared work trace projection rather than retaining a parallel self-evolution-owned projection path.
- Do not implement memory compaction changes in this ticket; only ensure the shared projection is ready for compaction to consume later.

## Scope Classification (`Small`/`Medium`/`Large`)

Medium

## In-Scope Use Cases

- UC-WT-001: Project a target agent run's raw trace files into readable Markdown work traces using a shared subsystem.
- UC-WT-002: Store generated work traces in the common per-run memory location `<memoryDir>/work_traces/`.
- UC-WT-003: Migrate self-evolution to consume the shared work trace package while preserving current self-evolution behavior.
- UC-WT-004: Preserve existing work-trace file naming conventions and manifest semantics where still valid.
- UC-WT-005: Prepare a stable boundary that future memory compaction can call without depending on self-evolution code.

## Out of Scope

- Redesigning memory compaction.
- Changing the compactor agent, episodic/semantic memory format, or compacted-memory output contract.
- Replacing canonical raw trace storage.
- Adding a new UI or user-facing reporting surface for work traces.
- Migrating old generated files from `<memoryDir>/self_evolution/work_traces/`; raw traces remain canonical and work traces can be regenerated on demand.
- Maintaining dual self-evolution and shared work-trace generation paths as steady-state behavior.

## Functional Requirements

- REQ-WT-001: The system must expose a shared Agent Work Trace Projection capability that reads raw trace sources for a target run and produces readable work trace files.
- REQ-WT-002: The shared projection must write derived work trace files under `<memoryDir>/work_traces/` for the target run.
- REQ-WT-003: The shared projection must write a manifest named `work_traces_manifest.json` in the shared work traces directory.
- REQ-WT-004: The shared projection must retain the current readable Markdown rendering semantics for user messages, worker messages, reasoning, tool activity, tool results/errors, and provider compaction boundary events unless the implementation team identifies a concrete current bug.
- REQ-WT-005: The shared projection must preserve source fingerprinting/reuse behavior for unchanged archived raw trace segments.
- REQ-WT-006: Self-evolution must use the shared Agent Work Trace Projection output instead of a self-evolution-owned work trace projection/store.
- REQ-WT-007: Self-evolution trigger messages must continue to pass work trace manifest/root/file paths to the companion agent, not inline full trace content.
- REQ-WT-008: Shared work trace domain types, services, renderer output title, and source folder names must not identify the projection as self-evolution-specific.
- REQ-WT-009: The implementation must remove or decommission obsolete self-evolution-specific projection/store/renderer/domain files or wrappers that become redundant after the shared boundary exists.
- REQ-WT-010: The shared capability must not make memory compaction depend on self-evolution modules; dependency direction should allow future memory compaction to depend on the shared work-trace subsystem directly.
- REQ-WT-011: Self-evolution-specific metadata keys/session fields may remain self-evolution-specific when they describe self-evolution state, but they must point to the shared work-trace package paths.
- REQ-WT-012: The shared source reader must consume active raw trace sources through the canonical raw-trace file boundary (`RawTraceFileSourceService` / `RAW_TRACES_ACTIVE_MEMORY_FILE_NAME`) so the active source is `raw_traces_active.jsonl` and no steady-state fallback to old `raw_traces.jsonl` is introduced.

## Acceptance Criteria

- AC-WT-001: For a target run with active raw traces, invoking self-evolution creates or refreshes work traces under `<memoryDir>/work_traces/` rather than `<memoryDir>/self_evolution/work_traces/`.
- AC-WT-002: The generated manifest is located at `<memoryDir>/work_traces/work_traces_manifest.json` and lists the generated `work_trace_*.md` files with source fingerprints, source kinds, record counts, timestamps, and generated timestamp metadata.
- AC-WT-003: The Markdown output remains readable and includes equivalent information to the current self-evolution renderer for messages, reasoning, tools, and compaction boundaries.
- AC-WT-004: The self-evolution companion receives the shared manifest path, shared root path, and shared work trace file paths in its task message/metadata.
- AC-WT-005: Re-running projection after an unchanged archived segment does not unnecessarily rewrite that archived segment's work trace file.
- AC-WT-006: No self-evolution-specific work-trace projection/store/renderer remains as the authoritative owner for raw-trace-to-readable-work-trace conversion.
- AC-WT-007: The shared work-trace code is placed outside the self-evolution feature folder and can be imported by self-evolution and future memory compaction without circular dependencies.
- AC-WT-008: Existing self-evolution tests or equivalent replacement coverage pass after the migration.
- AC-WT-009: New or updated durable coverage verifies the common disk layout and self-evolution consumption of the shared projection.
- AC-WT-010: Repository search after implementation shows no remaining production import from `agent-memory` or shared work-trace code into `self-evolution/domain/work-traces` or self-evolution work-trace service files.
- AC-WT-011: New/updated projection coverage uses `raw_traces_active.jsonl` for active raw trace fixtures and verifies active raw trace projection without reintroducing `raw_traces.jsonl` runtime fallback behavior.

## Constraints / Dependencies

- Work must be performed in dedicated worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/shared-work-trace-projection` on branch `codex/shared-work-trace-projection`.
- Base branch resolved as `origin/personal`; ticket worktree was created at `af277ad891dca3a20017314e2a7504571ca9cfe8`, fast-forwarded to `4bc35319905224d8622256a6cec92c49b21fd969`, then refreshed again to latest `origin/personal` @ `f2c6643ed94d839a06f662bbfbbd3bc8ca4b9628` on 2026-07-07.
- Current self-evolution work trace behavior must remain functionally intact.
- Current base branch uses `raw_traces_active.jsonl` as the canonical active raw trace file name; source/test changes must not hardcode or revive old active raw trace filename behavior.
- Raw trace remains canonical; work trace files are derived artifacts.
- File names should stay `work_trace_active.md`, `work_trace_000000.md`, and `work_traces_manifest.json`; do not add an `agent_` prefix to output files.
- Local test dependencies were not installed in the ticket worktree during investigation; downstream implementation/validation should install or use the repo's normal dependency setup before executing tests.

## Assumptions

- `<memoryDir>` means the memory directory for the target agent run whose raw traces are being projected.
- The next ticket will redesign memory compaction to consume shared work traces; this ticket should not start that redesign.
- It is acceptable to move/rename TypeScript files and types to make ownership clear.
- Existing old generated work trace files under the self-evolution directory are regenerable from canonical raw traces and do not require an in-place migration for this ticket.

## Risks / Open Questions

- Whether any deployed external integration reads `<memoryDir>/self_evolution/work_traces/` directly is unknown; no code evidence in the inspected repository path required preserving that old generated-cache location.
- Existing tests assert the old self-evolution-specific path and need clean-cut updates.
- Exact final folder name is a design choice; the key requirement is that the owner is not self-evolution and dependency direction stays future-compaction-safe.
- The shared projection should remain purpose-neutral; avoid adding compaction-specific fields during this ticket.

## Requirement-To-Use-Case Coverage

- REQ-WT-001 -> UC-WT-001, UC-WT-005
- REQ-WT-002 -> UC-WT-002
- REQ-WT-003 -> UC-WT-002, UC-WT-004
- REQ-WT-004 -> UC-WT-001, UC-WT-003
- REQ-WT-005 -> UC-WT-004
- REQ-WT-006 -> UC-WT-003
- REQ-WT-007 -> UC-WT-003
- REQ-WT-008 -> UC-WT-005
- REQ-WT-009 -> UC-WT-003, UC-WT-005
- REQ-WT-010 -> UC-WT-005
- REQ-WT-011 -> UC-WT-003
- REQ-WT-012 -> UC-WT-001, UC-WT-004

## Acceptance-Criteria-To-Scenario Intent

- AC-WT-001 -> Common on-disk layout scenario.
- AC-WT-002 -> Manifest correctness scenario.
- AC-WT-003 -> Rendering continuity scenario.
- AC-WT-004 -> Self-evolution consumer migration scenario.
- AC-WT-005 -> Archived segment cache/reuse scenario.
- AC-WT-006 -> Ownership cleanup scenario.
- AC-WT-007 -> Dependency boundary scenario.
- AC-WT-008 -> Existing behavior regression scenario.
- AC-WT-009 -> Durable coverage scenario.
- AC-WT-010 -> Production import cleanup scenario.
- AC-WT-011 -> Active raw trace filename alignment scenario.

## Approval Status

Design-ready requirements basis approved for solution design by the solution designer on 2026-07-07, using the user-confirmed direction captured in the upstream compaction/work-trace design conversation and this ticket's bootstrap handoff. Scope remains constrained to shared work-trace projection extraction; memory compaction redesign is explicitly out of scope.
