# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Refined

## Goal / Problem Statement

Autobyteus server supports multiple agent runtimes, but durable agent memory is only produced by the native Autobyteus runtime. Codex and Claude runs currently have run metadata and stream/run-history events, but they do not write the durable memory files (`raw_traces.jsonl`, `working_context_snapshot.json`, and later compacted memory inputs) that the memory inspector and future background/cron agents can analyze. This blocks planned agents that should inspect historical run memory and improve the skills used by those agents.

The target behavior is to make Codex and Claude runtime runs produce server-owned durable memory equivalent in location and normalized shape to Autobyteus runtime memory, without building the future background analyzers in this change. For Codex and Claude this is explicitly storage-only recording: the server must not try to manage, influence, retrieve for, compact for, or replace those runtimes' own internal memory/session handling.

## Investigation Findings

- Native Autobyteus memory is written inside `autobyteus-ts` by `MemoryManager`, `FileMemoryStore`, and `WorkingContextSnapshotStore` under each run/member memory directory.
- The server-side `agent-memory` subsystem currently reads memory files for GraphQL memory index/view, but it does not own any writer for Codex or Claude runtime events.
- `AgentRunService` already prepares a `memoryDir` for all standalone runtime kinds and persists `run_metadata.json`; Codex and Claude backends simply do not write memory into that directory.
- Codex and Claude backends already normalize provider/runtime output into common `AgentRunEvent` values (`TURN_*`, `SEGMENT_*`, `TOOL_*`, `ERROR`). This is the right shared event boundary for assistant, reasoning, and tool memory.
- User input is not represented as an `AgentRunEvent`; it enters through `AgentRun.postUserMessage(...)`. A memory design must capture accepted user messages at this command boundary rather than relying only on runtime callbacks.
- Team Codex member configs already get a member `memoryDir`; mixed-runtime members also get `memoryDir`; Claude single-runtime team members currently do not reliably receive a member `memoryDir` and must be fixed for parity.
- Current run-history providers can reconstruct Codex/Claude views from runtime-specific thread/session history, but that is not server-owned durable memory and is insufficient for future memory-analysis cron agents.
- Native Autobyteus emits normalized compaction status events and its compactor prunes selected raw trace ids from active `raw_traces.jsonl` into `raw_traces_archive.jsonl` while writing compacted memory/snapshot state; it does not simply create a replacement active raw-traces file.
- Official OpenAI compaction docs state that server-side Responses compaction emits an encrypted `type=compaction` item in the response stream, and the official Codex agent-loop article says Codex automatically uses `/responses/compact` when `auto_compact_limit` is exceeded.
- The installed Codex CLI 0.125.0 binary contains app-server/protocol evidence for `thread/compacted`, `ContextCompactedNotification`, `ContextCompactedEvent`, `ContextCompactionItem`, and raw response item completion, but the current server Codex integration does not list or convert `thread/compacted` and drops raw response items unless they are function-call outputs.
- The installed Claude Agent SDK typings define compaction-related system messages (`compact_boundary` and status `compacting`), but the current server integration does not convert them; their payload lacks local raw-trace ids or summary output, so they are not equivalent to native Autobyteus compaction.

## Recommendations

- Add a server-owned storage-only `AgentRunMemoryRecorder` under the `agent-memory` subsystem and attach it from `AgentRunManager` for non-native runtime runs.
- Extract or standardize reusable low-level memory file-format/store primitives from `autobyteus-ts` so the server recorder imports the same raw-trace and working-context file structure instead of duplicating serialization/layout code.
- Capture accepted user commands through an `AgentRun` command-observer seam and capture assistant/tool/reasoning output through normalized `AgentRunEvent` subscriptions.
- Write Codex/Claude memory directly to the existing `run.config.memoryDir` / team-member memory directory using the current flat memory file names.
- Preserve native Autobyteus memory writing as-is and explicitly skip duplicate recording for `RuntimeKind.AUTOBYTEUS`.
- Fix Claude team member memory directory provisioning so team Claude member runs receive the same durable memory layout as Codex and mixed-runtime members.
- Update run-history local memory fallback so explicit `memoryDir` reads use the memory directory's run id/member run id rather than the provider platform id.
- Do not use Codex/Claude provider-internal compaction signals to prune, delete, rewrite, or semantically compact local memory files. Codex `thread/compacted` / `type=compaction` and Claude compact boundaries may be used as non-destructive provenance markers or safe active-file rotation boundaries unless a runtime supplies a local trace-id compaction plan.
- Treat long-running Codex/Claude raw-trace growth as a storage/log-rotation concern separate from memory compaction; a future rotation policy may move settled traces from active `raw_traces.jsonl` to archive/chunk files while preserving full analyzability.

## Scope Classification (`Small`/`Medium`/`Large`)

Medium

## In-Scope Use Cases

- UC-001: Persist durable memory for standalone Codex runtime runs.
- UC-002: Persist durable memory for standalone Claude runtime runs.
- UC-003: Persist durable memory for Codex and Claude team member runs, including mixed-runtime teams.
- UC-004: Preserve existing native Autobyteus runtime memory behavior without duplicate memory writes.
- UC-005: Make persisted memory usable by future background/cron analyzers through normalized traces, working-context snapshots, and run/member metadata provenance.
- UC-006: Preserve run-history and memory-view visibility over the persisted local memory files.

## Out of Scope

- Building the future background/cronjob agents.
- Designing or changing skill-improvement algorithms.
- Retrofitting durable memory for historical Codex/Claude runs that already completed without memory files.
- Adding Codex/Claude semantic/episodic compaction in the runtime path; future cron/background agents may derive those later from the persisted raw traces.
- Changing frontend UX beyond any schema/type adjustments required to surface already-existing memory files.
- Persisting raw provider-specific logs as the memory source of truth.
- Managing, retrieving, compacting, or injecting memory into Codex/Claude runtime contexts.
- Pruning, deleting, rewriting, or semantically compacting local Codex/Claude `raw_traces.jsonl` based on provider-internal compact/compaction events.
- Implementing long-run raw-trace rotation, compressed archive chunking, or working-context snapshot retention policies beyond the storage-only recorder.

## Functional Requirements

- REQ-001: The server must write `raw_traces.jsonl` memory records for accepted standalone Codex runtime user turns, assistant output, reasoning output when available, and tool lifecycle outcomes.
- REQ-002: The server must write `working_context_snapshot.json` for standalone Codex runtime runs in the existing snapshot-compatible shape.
- REQ-003: The server must write `raw_traces.jsonl` memory records for accepted standalone Claude runtime user turns, assistant output, reasoning output when available, and tool lifecycle outcomes.
- REQ-004: The server must write `working_context_snapshot.json` for standalone Claude runtime runs in the existing snapshot-compatible shape.
- REQ-005: The same memory recording path must support Codex and Claude team member runs under `memory/agent_teams/<teamRunId>/<memberRunId>/...`.
- REQ-006: Native Autobyteus runtime memory persistence must continue to be owned by the existing native memory manager and must not be duplicated by the new server-side recorder.
- REQ-007: Persisted records must preserve enough provenance for future analyzers to determine run id/member run id, runtime kind, platform runtime id, agent definition id, turn id, sequence, event/trace type, tool identity, and chronological order without parsing provider-specific raw logs.
- REQ-008: Memory writing must be independent of WebSocket/client attachment; Codex/Claude memory must persist even if no browser is connected to the live run stream.
- REQ-009: The run-history local memory projection path must be able to build conversation/activity views from the persisted Codex/Claude raw traces when runtime-specific history is unavailable.
- REQ-010: The implementation must avoid per-runtime duplicate writer implementations; runtime-specific adapters may normalize event payload differences, but file writing and trace/snapshot ownership must remain in the `agent-memory` subsystem.
- REQ-011: Codex/Claude memory persistence must be storage-only recording; it must not instantiate a Codex/Claude memory manager, drive external-runtime context retrieval/compaction, or inject recorded memory back into those runtimes.
- REQ-012: Raw-trace file shape, working-context snapshot shape, memory file names, and direct memory-directory read/write helpers must be reusable from `autobyteus-ts` or an explicitly shared memory package; the server recorder must not duplicate those serialization/layout definitions.

## Acceptance Criteria

- AC-001: Given a standalone Codex run, when an accepted user message is posted and the runtime emits assistant text and turn completion, then `<memoryDir>/raw_traces.jsonl` contains normalized `user` and `assistant` trace records for the same turn and `<memoryDir>/working_context_snapshot.json` contains corresponding user/assistant messages.
- AC-002: Given a standalone Claude run, when an accepted user message is posted and the runtime emits assistant text and turn completion, then `<memoryDir>/raw_traces.jsonl` contains normalized `user` and `assistant` trace records for the same turn and `<memoryDir>/working_context_snapshot.json` contains corresponding user/assistant messages.
- AC-003: Given Codex or Claude tool lifecycle events, the memory trace file records one `tool_call` per invocation and one terminal `tool_result` record for success, failure, or denial without duplicating the same invocation because multiple segment/lifecycle events were observed.
- AC-004: Given a Codex or Claude run with reasoning segment events, persisted memory contains a normalized reasoning record or assistant snapshot reasoning field sufficient for later analysis.
- AC-005: Given a Codex or Claude team member run, memory files are written under the member memory directory and the team memory index/view can detect the member's stored raw traces.
- AC-006: Given a native Autobyteus run, existing memory files are still written by native runtime memory and are not doubled by server-side event recording.
- AC-007: Given a Codex/Claude run with no live browser connected, memory files are still written because the recorder is attached by `AgentRunManager`, not by WebSocket streaming.
- AC-008: Given a post-change Codex/Claude run whose runtime-specific history provider cannot read the provider history, the local persisted memory fallback can still build run-history conversation/activity projection from `raw_traces.jsonl`.
- AC-009: Targeted unit/integration validation covers the recorder's event mapping, standalone Codex persistence, standalone Claude persistence, team member memory directory parity, and native Autobyteus no-duplicate behavior.
- AC-010: Code review can verify there is one shared storage-only recorder/writer for Codex and Claude and no new per-runtime `MemoryManager` implementation or memory injection path for those runtimes.
- AC-011: Code review can verify the server recorder uses shared `autobyteus-ts` memory file-format/store primitives for raw traces and working-context snapshots rather than maintaining an independent duplicate file-format implementation.

## Constraints / Dependencies

- Must use the existing memory directory layout:
  - standalone: `memory/agents/<runId>/...`
  - team member: `memory/agent_teams/<teamRunId>/<memberRunId>/...`
- Must preserve existing Autobyteus memory manager behavior.
- Must use normalized `AgentRunEvent` as the runtime-event boundary for assistant/tool/reasoning output.
- Must capture user input at the `AgentRun.postUserMessage(...)` command boundary because no normalized user-message event currently exists.
- Must not require WebSocket stream subscribers to be present for memory to persist.
- Must not store provider-specific raw logs as the authoritative memory model.
- Must keep Codex/Claude persistence storage-only; the server recorder must not be treated as the runtime memory manager for external runtimes.
- Must treat external-runtime compaction signals as provider/session metadata only; Codex `thread/compacted` / `type=compaction` and Claude compact boundaries must not trigger local raw-trace deletion or semantic memory compaction in this scope.
- Must keep low-level memory file schema/layout definitions reusable and singular; if the server needs convenience wrappers, they must delegate to shared memory primitives rather than redefine the format.

## Assumptions

- The immediate needed memory for Codex/Claude is normalized raw traces plus working-context snapshots; semantic/episodic derivation can be handled by future analyzers or a separate compaction ticket and must not run inside the Codex/Claude runtime path in this scope.
- Run-level provenance can rely on existing `run_metadata.json`; team-member provenance can rely on `team_run_metadata.json` plus member metadata, while trace records preserve turn/source/tool ordering.
- Existing memory inspector and run-history readers should remain consumers of the same persisted file names.
- `autobyteus-ts` can expose a direct-memory-directory store/facade without requiring the server to instantiate native `MemoryManager`.
- Provider-internal compaction events/items do not currently provide enough information to map provider compaction to server-owned raw trace ids or compacted semantic/episodic records.

## Risks / Open Questions

- OQ-001: Some Codex/Claude runtime payloads may omit turn ids for tool events; the recorder must maintain active-turn state and deterministic fallbacks.
- OQ-002: Segment events can contain multiple assistant text segments per turn; implementation must define whether working context appends each assistant segment or one combined assistant message per turn.
- OQ-003: Reasoning persistence may increase disk usage; implementation should keep raw reasoning normalized and avoid provider raw-log dumps.
- OQ-004: Historical Codex/Claude runs that lack memory files will remain dependent on existing runtime-specific history providers unless a future migration/import ticket is created.
- OQ-005: A future product decision is needed on whether to persist provider compact-boundary markers as explicit raw traces or a separate runtime-event file; either choice must stay non-destructive unless the runtime supplies local trace-id mapping.
- OQ-006: Long-running external-runtime runs can grow active raw traces and working-context snapshots; a future policy should decide whether to rotate active traces by size/turn/provider boundary and whether to keep snapshots to a recent window while raw traces remain complete.

## Requirement-To-Use-Case Coverage

- REQ-001 -> UC-001, UC-005
- REQ-002 -> UC-001, UC-005
- REQ-003 -> UC-002, UC-005
- REQ-004 -> UC-002, UC-005
- REQ-005 -> UC-003, UC-005
- REQ-006 -> UC-004
- REQ-007 -> UC-005
- REQ-008 -> UC-001, UC-002, UC-003
- REQ-009 -> UC-006
- REQ-010 -> UC-001, UC-002, UC-003, UC-004
- REQ-011 -> UC-001, UC-002, UC-003, UC-004, UC-005
- REQ-012 -> UC-001, UC-002, UC-003, UC-004, UC-005, UC-006

## Acceptance-Criteria-To-Scenario Intent

- AC-001 -> Standalone Codex memory persistence scenario.
- AC-002 -> Standalone Claude memory persistence scenario.
- AC-003 -> Tool lifecycle normalization and de-duplication scenario.
- AC-004 -> Reasoning capture scenario.
- AC-005 -> Team member memory parity scenario.
- AC-006 -> Native Autobyteus regression/no-duplication scenario.
- AC-007 -> Headless/background execution persistence scenario.
- AC-008 -> Run-history fallback from local memory scenario.
- AC-009 -> Executable validation completeness scenario.
- AC-010 -> Storage-only/no-duplicated-manager architecture scenario.
- AC-011 -> Shared memory file-format/no duplicated serialization scenario.

## Approval Status

Approved by user on 2026-04-30 after clarification that Codex/Claude persistence is storage-only recording, not runtime memory management. The user explicitly approved proceeding with design, then further clarified that the common memory structure/format should be reusable from `autobyteus-ts` and imported by the server instead of duplicated.
