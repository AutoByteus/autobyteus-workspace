# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete; dedicated task worktree and task branch created.
- Current Status: Code investigation complete; requirements refined and explicitly approved by the user on 2026-04-30 after clarifying that Codex/Claude persistence is storage-only recording, not runtime memory management. Follow-up user clarification added: the shared memory structure/format should be reusable from `autobyteus-ts` and imported by the server rather than duplicated. Follow-up compaction investigation corrected after official OpenAI doc/local Codex inspection and user scope decision: native Autobyteus compaction is destructive/local with trace-id pruning; Codex does compact and the installed CLI exposes `thread/compacted` / compaction item protocol evidence, but our current server integration does not convert it; Claude SDK exposes compact-boundary/status messages. Codex/Claude boundaries should be captured and used for non-destructive active raw-trace rotation into boundary-specific archive segment files, not semantic compaction. Native Autobyteus archival should share that same segmented archive manager. Design-principles recheck completed: archive segmentation should be an owned shared storage refactor with a `RunMemoryFileStore` facade and internal `RawTraceArchiveManager`, not provider-specific patches or a catch-all store.
- Investigation Goal: Understand current Autobyteus runtime memory persistence, Codex/Claude runtime event/output flows, schema/read APIs, team-member layout behavior, and the right shared server boundary for runtime-neutral memory persistence.
- Scope Classification (`Small`/`Medium`/`Large`): Medium
- Scope Classification Rationale: Cross-runtime memory persistence touches runtime orchestration, normalized runtime events, memory file storage, team member config, run-history projection fallback, and validation. The scope excludes future memory-analysis cron/background agents and historical backfill.
- Scope Summary: Add or design durable memory persistence for Codex and Claude runtime runs equivalent in location and normalized memory shape to existing Autobyteus runtime memory persistence.
- Primary Questions To Resolve:
  - Which subsystem owns current Autobyteus memory persistence?
  - Where do Codex and Claude runtime outputs enter normalized server run/turn/event flow?
  - Where should accepted user input be captured for runtimes that do not emit user-message events?
  - How are standalone and team-member memory directories provisioned today?
  - Which schema/API/projection changes are required for runtime provenance and future analyzers?
  - What validation should prove cross-runtime parity?
  - Do Codex or Claude emit compact/compaction events, and if so are those events safe to use for local memory files?

## Request Context

User reports that the server supports multiple runtimes, but only the native Autobyteus runtime stores agent memory. Codex and Claude runs do not store comparable memory, which blocks later background agents or cronjob agents that should analyze memory and improve the skills used by agents.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-runtime-memory-persistence`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-runtime-memory-persistence/tickets/in-progress/cross-runtime-memory-persistence`
- Current Branch: `codex/cross-runtime-memory-persistence`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-runtime-memory-persistence`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin --prune` succeeded on 2026-04-30.
- Task Branch: `codex/cross-runtime-memory-persistence`, created from `origin/personal` at `b7a4e1465b6c0ff684d9cfcefdc26d0b58753835`.
- Expected Base Branch (if known): `origin/personal`
- Expected Finalization Target (if known): `personal`
- Bootstrap Blockers: None.
- Notes For Downstream Agents: The user's original checkout `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` had untracked `docs/future-features/`; no changes were made there. All authoritative artifacts for this task are in the dedicated worktree above.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-04-30 | Command | `pwd && git rev-parse --show-toplevel && git status --short --branch && git remote -v` | Bootstrap current repo state | Root was `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo`; current branch was shared `personal`; untracked `docs/future-features/` existed. | No |
| 2026-04-30 | Command | `git remote show origin` and `git branch -vv --all --no-abbrev` | Resolve base branch and worktree reuse | Remote HEAD points to `origin/personal`; no existing `codex/cross-runtime-memory-persistence` branch/worktree existed. | No |
| 2026-04-30 | Command | `git fetch origin --prune` | Refresh tracked refs before task worktree creation | Fetch completed successfully. | No |
| 2026-04-30 | Command | `git worktree add -b codex/cross-runtime-memory-persistence /Users/normy/autobyteus_org/autobyteus-worktrees/cross-runtime-memory-persistence origin/personal` | Create dedicated task worktree | Dedicated worktree created from latest tracked `origin/personal`. | No |
| 2026-04-30 | Doc | `/Users/normy/autobyteus_org/autobyteus-agents/agent-teams/software-engineering-team/agents/solution-designer/design-principles.md` | Required shared design guidance | Design must be spine-first, ownership-led, and avoid backward-compatible dual paths. | Apply during design |
| 2026-04-30 | Command | `rg -n "memory\|Memory\|memories\|agent memory\|AgentMemory\|runtime.*memory\|run.*memory" ...` | Locate memory-related server/runtime code | Found server `agent-memory` reader/index services, Autobyteus TS memory writers, run memory layouts, and team member memory layouts. | No |
| 2026-04-30 | Code | `autobyteus-ts/src/memory/memory-manager.ts` | Identify native memory ownership | Native `MemoryManager` writes raw traces for user, assistant, tool intent/result, tool continuation, and persists working context snapshot. | No |
| 2026-04-30 | Code | `autobyteus-ts/src/memory/store/file-store.ts` | Verify durable raw memory files and write behavior | `FileMemoryStore` appends `raw_traces.jsonl` and manages `episodic.jsonl`, `semantic.jsonl`, and `raw_traces_archive.jsonl` in the run directory. | No |
| 2026-04-30 | Code | `autobyteus-ts/src/memory/store/working-context-snapshot-store.ts` and `autobyteus-ts/src/memory/working-context-snapshot-serializer.ts` | Verify snapshot file shape | `working_context_snapshot.json` schema version is 3, contains `agent_id`, `epoch_id`, `last_compaction_ts`, and serialized messages. | No |
| 2026-04-30 | Code | `autobyteus-ts/src/agent/factory/agent-factory.ts` | Confirm native runtime wiring | Native Autobyteus runtime creates `MemoryManager` and memory stores for the configured memory directory. | No |
| 2026-04-30 | Code | `autobyteus-ts/src/agent/input-processor/memory-ingest-input-processor.ts` and `autobyteus-ts/src/agent/tool-execution-result-processor/memory-ingest-tool-result-processor.ts` | Confirm how native memory gets user/tool input | Native runtime captures processed user messages and tool results inside Autobyteus pipeline, not in server runtime manager. | No |
| 2026-04-30 | Code | `autobyteus-server-ts/src/agent-memory/domain/models.ts` | Inspect server memory domain model | Memory view currently exposes `traceType`, content/tool/media/turn/seq/ts, but omits raw-trace `id` and `source_event`. | Design should preserve or expose source event/provenance if analyzers need it |
| 2026-04-30 | Code | `autobyteus-server-ts/src/agent-memory/store/memory-file-store.ts` | Verify server memory read layer | Server store reads existing memory files and indexes directories but has no writer. | Add a separate writer owned by `agent-memory` |
| 2026-04-30 | Code | `autobyteus-server-ts/src/agent-memory/services/agent-memory-service.ts` | Verify memory view behavior | Parses snapshots and raw traces for GraphQL/API use; raw trace parser should be extended if new provenance fields are surfaced. | Yes |
| 2026-04-30 | Code | `autobyteus-server-ts/src/agent-memory/services/agent-memory-index-service.ts` and `team-memory-index-service.ts` | Verify standalone/team memory index behavior | Index services already detect memory directories and standard file names under `agents` and `agent_teams`. | No layout change needed |
| 2026-04-30 | Code | `autobyteus-server-ts/src/agent-execution/services/agent-run-service.ts` | Verify standalone run provisioning | `prepareFreshRun` creates a run memory directory for every runtime kind and stores `memoryDir` in `AgentRunConfig`; metadata records `memoryDir` and `runtimeKind`. | No |
| 2026-04-30 | Code | `autobyteus-server-ts/src/agent-execution/services/agent-run-manager.ts` | Find active-run attachment point | Manager already attaches off-spine services (`RunFileChangeService`, `ApplicationPublishedArtifactRelayService`) to every active run. This is the correct always-on attachment boundary for a memory recorder. | Yes |
| 2026-04-30 | Code | `autobyteus-server-ts/src/agent-execution/domain/agent-run.ts` | Inspect command/event boundary | `AgentRun.postUserMessage` delegates directly to backend; it does not emit a user-message event. Need an internal accepted-command observer seam. | Yes |
| 2026-04-30 | Code | `autobyteus-server-ts/src/agent-execution/domain/agent-run-event.ts` | Inspect normalized event types | Normalized events include turn lifecycle, segment content/end, tool approval/execution, status, artifacts, file changes, and errors; no user-message event type. | Yes |
| 2026-04-30 | Command | `rg -n "COMPACTION_STATUS|AGENT_COMPACTION_STATUS_UPDATED|requestCompaction|PendingCompactionExecutor|pruneRawTracesById|raw_traces_archive|compact_boundary|compacting|compact" autobyteus-ts/src autobyteus-server-ts/src/agent-execution autobyteus-server-ts/src/services autobyteus-server-ts/node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts -g '*.ts' -g '*.d.ts'` | Investigate native/Codex/Claude compaction signal support | Native Autobyteus has compaction status and trace pruning/archive behavior; Claude SDK typings include compact-boundary/status messages; Codex integration has no compact event name. | No |
| 2026-04-30 | Code | `autobyteus-server-ts/src/agent-execution/backends/autobyteus/events/autobyteus-stream-event-converter.ts`, `autobyteus-ts/src/agent/handlers/llm-user-message-ready-event-handler.ts`, `autobyteus-ts/src/memory/compaction/pending-compaction-executor.ts`, `autobyteus-ts/src/memory/compaction/compactor.ts` | Verify native compaction semantics | Autobyteus maps `StreamEventType.COMPACTION_STATUS` to `AgentRunEventType.COMPACTION_STATUS`; after budget request, pending compaction emits started/completed/failed, writes compacted memories/snapshot state, and prunes eligible raw trace ids to archive. | No |
| 2026-04-30 | Code | `autobyteus-server-ts/src/agent-execution/backends/codex/events/codex-thread-event-name.ts`, `codex-thread-lifecycle-event-converter.ts`, `codex-thread-event-converter.ts` | Check whether Codex currently emits a usable compaction event through server integration | Codex event names include token-usage and reasoning-summary events but no compact/compaction event; token-usage updates return null in lifecycle conversion; `codex/event/*` internals are dropped after debug logging. | Optional raw-event probe for upstream Codex if product needs proof beyond current integration |
| 2026-04-30 | Code | `autobyteus-server-ts/node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts`, `autobyteus-server-ts/src/agent-execution/backends/claude/events/claude-session-event-name.ts`, `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session.ts`, `claude-runtime-message-normalizers.ts` | Check whether Claude issues compaction signals and whether current server converts them | Claude SDK defines `SDKCompactBoundaryMessage` (`subtype: 'compact_boundary'`, trigger/pre_tokens) and `SDKStatusMessage` with `status: 'compacting'`, but current Claude session/event names/conversion only emit text/tool/turn/error events and do not convert these system messages. | Future marker mapping possible; must remain non-destructive |
| 2026-04-30 | Web | Official OpenAI docs: `https://developers.openai.com/api/docs/guides/compaction`, `https://developers.openai.com/api/reference/resources/responses/methods/compact`, `https://openai.com/index/unrolling-the-codex-agent-loop/` | Verify whether Codex/OpenAI Responses compaction emits stream-visible items | Docs state server-side compaction emits an encrypted compaction item in the response stream; `/responses/compact` returns a `response.compaction` object whose output contains `type: 'compaction'`; Codex automatically uses this compaction endpoint when `auto_compact_limit` is exceeded. | Yes: correct prior Codex finding |
| 2026-04-30 | Command | `strings $(npm root -g)/@openai/codex/node_modules/@openai/codex-darwin-arm64/vendor/aarch64-apple-darwin/codex/codex | grep ...` against Codex CLI 0.125.0 | Inspect installed Codex protocol surface for compaction notifications | Binary contains `thread/compacted`, `ContextCompactedNotification`, `ContextCompactedEvent`, `ContextCompactionItem`, `RawResponseItemCompletedNotification`, `model_auto_compact_token_limit`, and `/responses/compact`. This indicates Codex app-server/protocol has a compaction notification/item path. | Update design: current server drops/misses this event |
| 2026-04-30 | Code | `autobyteus-server-ts/src/agent-execution/domain/agent-operation-result.ts` | Inspect accepted command result | `AgentOperationResult` carries `accepted`, `turnId`, `platformAgentRunId`, and optional member identity. This can link user input to turn memory after backend accepts it. | No |
| 2026-04-30 | Code | `autobyteus-server-ts/src/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.ts` and backend | Compare native runtime behavior | Autobyteus backend factory creates/uses memory dir by injecting it into native agent config; native runtime then writes memory itself. | New recorder should skip Autobyteus to avoid duplicate traces |
| 2026-04-30 | Code | `autobyteus-server-ts/src/agent-execution/backends/codex/backend/codex-agent-run-backend.ts` and factory | Inspect Codex runtime path | Codex backend sends user turns and emits normalized events, but does not create or use a memory writer. | Yes |
| 2026-04-30 | Code | `autobyteus-server-ts/src/agent-execution/backends/claude/backend/claude-agent-run-backend.ts` and factory | Inspect Claude runtime path | Claude backend sends user turns and emits normalized events, but does not create or use a memory writer. | Yes |
| 2026-04-30 | Code | `autobyteus-server-ts/src/agent-execution/backends/codex/events/*converter*.ts` | Inspect Codex event normalization | Codex converters emit turn, text/reasoning segment, tool lifecycle, tool denial/success/failure, and file-change events with usable `invocation_id`, `tool_name`, `arguments`, `result`, `error`, `delta`, and `segment_type` payload fields. | Yes |
| 2026-04-30 | Code | `autobyteus-server-ts/src/agent-execution/backends/claude/events/claude-session-event-converter.ts` | Inspect Claude event normalization | Claude converter emits turn, text segment, tool approval/execution, and error events with similarly normalized payload fields. | Yes |
| 2026-04-30 | Code | `autobyteus-server-ts/src/services/agent-streaming/agent-stream-handler.ts` and team stream handler | Check whether websocket stream is persistence owner | Stream handlers only forward run events to clients. Memory persistence must not live here because headless/background runs may have no websocket. | No |
| 2026-04-30 | Command | `rg -n "\.postUserMessage\(" autobyteus-server-ts/src` | Identify user-message call sites | Calls enter through stream handler, application orchestration host, external channel facade, inter-agent/team managers, and team managers. A single `AgentRun.postUserMessage` observer covers these sources. | No |
| 2026-04-30 | Review/User | Architecture Review Round 7 plus user follow-up | Resolve archive naming/scope after review and user correction | Architecture review identified stale single-archive/marker-shape/rotation-contract gaps. User clarified the right architecture is segmented archive files: each native compaction or provider boundary should produce an individual archive segment, backed by a manifest/reader policy. | Design updated |
| 2026-04-30 | Code | `autobyteus-server-ts/src/agent-team-execution/backends/codex/codex-team-run-backend-factory.ts` | Verify Codex team member memory | Codex team factory assigns each member a `TeamMemberMemoryLayout` directory when one is not provided. | No |
| 2026-04-30 | Code | `autobyteus-server-ts/src/agent-team-execution/backends/mixed/mixed-team-run-backend-factory.ts` | Verify mixed team member memory | Mixed runtime member configs are given member memory directories. | No |
| 2026-04-30 | Code | `autobyteus-server-ts/src/agent-team-execution/backends/claude/claude-team-run-backend-factory.ts` | Verify Claude team member memory | Claude single-runtime team member configs currently pass through `memberConfig.memoryDir` and do not default to `TeamMemberMemoryLayout`. | Fix needed |
| 2026-04-30 | Code | `autobyteus-server-ts/src/agent-team-execution/services/team-run-runtime-context-support.ts` | Verify restored team runtime context | Restore path gives Codex member configs memory dirs but omits memory dirs for Claude member configs. | Fix needed |
| 2026-04-30 | Code | `autobyteus-server-ts/src/run-history/projection/providers/autobyteus-run-view-projection-provider.ts` | Inspect local-memory run-history fallback | Explicit `memoryDir` path builds a store at `path.dirname(memoryDir)` with root subdir empty, but still uses `platformRunId ?? runId` as the local memory id. For Codex/Claude this would read the wrong folder when platform id differs from run id. | Fix needed |
| 2026-04-30 | Code | `autobyteus-server-ts/src/run-history/projection/providers/codex-run-view-projection-provider.ts` and `providers/claude-run-view-projection-provider.ts` | Distinguish history provider from durable memory | Codex/Claude run-history providers reconstruct history from runtime-specific thread/session sources, not from server-owned memory files. | Local memory fallback should complement, not replace, these providers |
| 2026-04-30 | Code | `autobyteus-server-ts/src/run-history/projection/transformers/raw-trace-to-historical-replay-events.ts` | Inspect raw trace replay support | Transformer handles `user`, `assistant`, `tool_call`, and `tool_result`; it ignores `reasoning`. | Extend for reasoning if recorder writes reasoning traces |
| 2026-04-30 | Code | `autobyteus-server-ts/tests/integration/agent-execution/agent-run-manager.memory-layout.real.integration.test.ts` and related memory/run-history tests | Identify validation anchors | Existing tests cover memory layout and native projection. New tests should target recorder mapping, manager attachment, team memory parity, and projection fallback. | Yes |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary:
  - Standalone runs are created through `AgentRunService.createAgentRun(...)`, which prepares an `AgentRunConfig` containing `runtimeKind` and `memoryDir`, then delegates active runtime creation to `AgentRunManager`.
  - Live user input enters through `AgentRun.postUserMessage(...)` and then each runtime backend's `postUserMessage(...)`.
  - Runtime output enters the server as backend-specific Codex/Claude events and is converted into common `AgentRunEvent` values.
- Current execution flow:
  - Native Autobyteus: `AgentRunService` prepares `memoryDir` -> Autobyteus backend factory injects that directory into native agent config -> `autobyteus-ts` `MemoryManager` writes `raw_traces.jsonl` and `working_context_snapshot.json` during native agent processing.
  - Codex: `AgentRunService` prepares `memoryDir` -> Codex backend sends turns to Codex app server and emits normalized `AgentRunEvent`s -> stream/history consumers can observe events, but no memory writer appends files.
  - Claude: `AgentRunService` prepares `memoryDir` -> Claude backend sends turns to Claude session and emits normalized `AgentRunEvent`s -> stream/history consumers can observe events, but no memory writer appends files.
- Ownership or boundary observations:
  - Server `agent-memory` is the correct capability area for durable memory reading/indexing and should be extended with a writer/recorder rather than putting memory writes in runtime adapters or websocket stream handlers.
  - `AgentRunManager.registerActiveRun(...)` is the correct always-on attachment boundary for recorder lifecycle because it already owns active-run sidecars and is independent of client websocket attachment.
  - `AgentRun.postUserMessage(...)` is the only single command boundary that sees accepted user messages across stream, external channel, application orchestration, and team sources.
- Current behavior summary:
  - The memory layout and metadata are mostly present for standalone Codex/Claude runs, but no server-owned memory writer consumes their commands/events. Team member parity is incomplete for Claude member memory dirs. Local memory projection fallback has an identity mismatch that would prevent external-runtime memory folders from being read correctly when `platformAgentRunId` differs from the server run id.

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-ts/src/memory/memory-manager.ts` | Native runtime memory ingestion and snapshot persistence | Handles user, assistant, tool intent/result, and tool continuation memory for native runtime only. | Preserve as authoritative native writer; do not duplicate for Autobyteus server events. |
| `autobyteus-ts/src/memory/store/file-store.ts` | Native file-backed memory store | Appends standard JSONL files and supports archive/compaction files. | New server writer should produce compatible file names and raw record shape. |
| `autobyteus-ts/src/memory/working-context-snapshot-serializer.ts` | Snapshot schema serializer | Snapshot schema version 3 with serialized message array. | New server writer should write snapshot-compatible payloads. |
| `autobyteus-server-ts/src/agent-memory/store/memory-file-store.ts` | Server memory file reader | Read-only store for existing memory files. | Add write responsibility in a new sibling writer file, not by overloading read store. |
| `autobyteus-server-ts/src/agent-memory/services/agent-memory-service.ts` | Server memory view assembly | Parses working context and raw traces, but drops `id` and `source_event`. | Extend model/parser only if source event/provenance should be visible to APIs/analyzers. |
| `autobyteus-server-ts/src/agent-memory/services/agent-memory-index-service.ts` | Standalone memory directory index | Already scans `memory/agents/<runId>`. | No layout change required for standalone runs. |
| `autobyteus-server-ts/src/agent-memory/services/team-memory-index-service.ts` | Team memory directory index | Already scans `memory/agent_teams/<teamRunId>/<memberRunId>`. | No layout change required if member memory dirs are populated and written. |
| `autobyteus-server-ts/src/agent-execution/services/agent-run-service.ts` | Standalone run provisioning, metadata, restore | Provides `memoryDir` for all runtime kinds and persists metadata. | Existing run metadata can be used as run-level provenance. |
| `autobyteus-server-ts/src/agent-execution/domain/agent-run.ts` | Runtime-independent active run facade over backend | Delegates `postUserMessage` without a user-message event or observer. | Add an internal accepted-command observer seam here. |
| `autobyteus-server-ts/src/agent-execution/services/agent-run-manager.ts` | Active run lifecycle and sidecar service attachment | Attaches file-change/artifact sidecars to active runs. | Add memory recorder attachment here to persist headless runs. |
| `autobyteus-server-ts/src/agent-execution/domain/agent-run-event.ts` | Common normalized event contract | Has turn, segment, tool, status, artifact, and error events; no user-message event. | Use events for assistant/tool/reasoning; use command observer for user input. |
| `autobyteus-server-ts/src/agent-execution/backends/codex/events/*` | Codex provider event conversion | Normalizes text/reasoning segment and tool lifecycle payloads. | Recorder can consume common event payload fields with small normalization helpers. |
| `autobyteus-server-ts/src/agent-execution/backends/claude/events/claude-session-event-converter.ts` | Claude provider event conversion | Normalizes text segment and tool lifecycle payloads. | Same recorder can consume Claude events through common event types. |
| `autobyteus-server-ts/src/services/agent-streaming/agent-stream-handler.ts` | WebSocket run stream forwarding | Only client-connected forwarding. | Must not own durable memory persistence. |
| `autobyteus-server-ts/src/agent-team-execution/backends/codex/codex-team-run-backend-factory.ts` | Codex team backend context construction | Defaults member memory dirs with `TeamMemberMemoryLayout`. | Good reference shape for Claude team fix. |
| `autobyteus-server-ts/src/agent-team-execution/backends/claude/claude-team-run-backend-factory.ts` | Claude team backend context construction | Does not default missing member memory dirs. | Must add `TeamMemberMemoryLayout` defaulting. |
| `autobyteus-server-ts/src/agent-team-execution/services/team-run-runtime-context-support.ts` | Team restore context construction | Codex restore includes member memory dir; Claude restore omits it. | Must add Claude restore memory dir. |
| `autobyteus-server-ts/src/run-history/projection/providers/autobyteus-run-view-projection-provider.ts` | Local raw-trace projection provider | Uses `platformRunId ?? runId` even for explicit memoryDir reads. | For explicit memoryDir, read by basename/local memory id, not provider platform id. |
| `autobyteus-server-ts/src/run-history/projection/transformers/raw-trace-to-historical-replay-events.ts` | Raw trace -> historical replay event mapping | Ignores `reasoning` trace type. | Extend transformer or deliberately fold reasoning into assistant snapshot. |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-04-30 | Setup | `git fetch origin --prune` then `git worktree add -b codex/cross-runtime-memory-persistence ... origin/personal` | Dedicated worktree and branch were created successfully. | Investigation and artifacts are isolated from the shared `personal` checkout. |
| 2026-04-30 | Probe | Static code search and targeted source reads listed in Source Log | No runtime test execution was needed to identify the ownership gap. | Validation should be added during implementation using focused unit/integration tests. |
| 2026-04-30 | Probe | Static compaction-event search and targeted source reads listed in Source Log | No live long-context Codex/Claude run was executed. Official OpenAI docs and installed Codex CLI 0.125.0 binary inspection establish that Codex has compaction item/notification paths, but current server code does not normalize them. Claude SDK has compact-boundary/status types not currently mapped. | Do not design local trace pruning around external runtime compaction; optional future raw-event probe can inspect opaque Codex events. |

## External / Public Source Findings

- Public API / spec / issue / upstream source: None used.
- Version / tag / commit / freshness: N/A.
- Relevant contract, behavior, or constraint learned: N/A.
- Why it matters: This analysis is based on local repository state and product-owned runtime contracts.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: None for investigation. Implementation validation will likely use fake backends/events rather than live Codex/Claude providers for unit/integration coverage.
- Required config, feature flags, env vars, or accounts: None for investigation.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: Dedicated worktree creation only.
- Cleanup notes for temporary investigation-only setup: None.

## Findings From Code / Docs / Data / Logs

1. Existing native memory is runtime-internal, not server-owned.
   - Native Autobyteus writes memory through `MemoryManager` inside `autobyteus-ts`.
   - User/tool/assistant capture happens inside native input/tool/result/assistant processing.
   - Therefore Codex/Claude cannot get memory parity by reusing native internals unless the server creates a separate recorder at the common run/event boundary.

2. Server memory subsystem is currently a read/index capability.
   - `agent-memory` reads `working_context_snapshot.json`, `raw_traces.jsonl`, `raw_traces_archive.jsonl`, `episodic.jsonl`, and `semantic.jsonl`.
   - It has the right domain ownership for memory files, but lacks write-side code for external runtimes.

3. Standalone Codex/Claude runs already have memory directory metadata.
   - `AgentRunService.prepareFreshRun(...)` creates `memoryDir` for all runtime kinds.
   - `run_metadata.json` records `memoryDir`, `runtimeKind`, `platformAgentRunId`, agent definition, workspace, model, config, and status.
   - The missing piece is the recorder/writer, not layout provisioning for standalone runs.

4. Normalized runtime events are sufficient for most non-user memory capture.
   - Codex and Claude both emit common `AgentRunEvent` types for turn lifecycle, text segments, tool starts/approval/results/denial, and errors.
   - Codex emits reasoning segment events; Claude currently does not appear to emit a dedicated reasoning segment in the inspected converter.
   - Tool events expose common fields such as `invocation_id`, `tool_name`, `arguments`, `result`, and `error`.

5. User input needs a command observer, not event-only persistence.
   - No `USER_MESSAGE` event exists in `AgentRunEventType`.
   - Codex converter intentionally drops provider user-message item events.
   - `AgentRun.postUserMessage(...)` can observe all accepted user commands after backend acceptance and use `AgentOperationResult.turnId` when available.
   - Adding a public stream event for user messages would require frontend/team stream mapping decisions and could duplicate user display behavior; an internal observer is lower-risk for memory.

6. Persistence must be independent of WebSocket streaming.
   - `AgentStreamHandler` only forwards events when clients are attached.
   - Future background or cron-driven runs may not have a live browser stream.
   - `AgentRunManager.registerActiveRun(...)` is the right active-run lifecycle hook because it already owns always-on off-spine attachments.

7. Team member memory parity is incomplete for Claude.
   - Codex team and mixed team member configs default memory dirs with `TeamMemberMemoryLayout`.
   - Claude single-runtime team factory and Claude restore context currently omit this default, so member recorder writes would have no configured directory unless callers provided one.

8. Run-history local memory fallback needs identity correction.
   - The local memory projection provider reads explicit `memoryDir` by making a root from its parent directory, but then still uses `platformRunId ?? runId` as the id to read.
   - For external runtimes, platform id is Codex thread id or Claude session id, not necessarily the local memory directory basename.
   - The provider should read explicit memory dirs by local directory basename or an explicit local memory identity, so stored Codex/Claude raw traces can be used when runtime-specific provider history is unavailable.

9. External runtime compaction signals are not equivalent to native Autobyteus compaction.
   - Native Autobyteus compaction is local-memory-aware: it emits `COMPACTION_STATUS`, creates compacted memory/snapshot state, and currently prunes known raw trace ids into monolithic `raw_traces_archive.jsonl`; target design refactors this to shared segmented archive files.
   - Official OpenAI docs state server-side compaction emits a compaction item in the response stream, and the Codex article says Codex automatically uses `/responses/compact` when `auto_compact_limit` is exceeded.
   - Installed Codex CLI 0.125.0 contains app-server/protocol strings for `thread/compacted` and `ContextCompactedNotification`; our server currently lacks this enum/converter handling and also drops raw response items unless they are function-call outputs.
   - Claude SDK typings expose `compact_boundary` and `status: 'compacting'`, but those messages provide trigger/pre-token metadata, not local raw trace ids or generated semantic/episodic records.
   - Therefore provider compaction signals/items must not drive local semantic compaction or deletion. The user confirmed they should now be in scope as non-destructive provenance markers and active-file rotation boundaries.

10. Long-running external-runtime runs raise a storage/rotation concern separate from compaction.
   - The current server recorder appends raw traces to active `raw_traces.jsonl`; appending itself is cheap, but memory views/projections may become expensive if they need to read large active and archive files.
   - The recorder also rewrites `working_context_snapshot.json` after snapshot updates, so an unbounded external-runtime snapshot can become a separate long-run growth problem.
   - Existing readers can include archive traces and merge/sort active plus archive, so active-file rotation is feasible only if all relevant readers continue treating active+archive as the complete trace corpus.
   - Provider-boundary rotation should move settled records from active `raw_traces.jsonl` to a manifest-indexed archive segment after a recorded compaction marker, keeping active files small for long-running Codex/Claude agents while preserving full raw history.
   - This is not equivalent to native compaction: without generated semantic/episodic memory, rotation can reduce active file size but not total retained trace storage.

11. Segmented raw-trace archives are the target archive architecture.
   - The user clarified that each native compaction or provider-boundary rotation should produce its own archive file so the records before that boundary remain inspectable as an individual segment.
   - Target layout keeps `raw_traces.jsonl` as the active file and adds `raw_traces_archive_manifest.json` plus `raw_traces_archive/<index>_<timestamp>_<boundary_hash>.jsonl` segment files.
   - Native Autobyteus compaction and Codex/Claude provider-boundary rotation should use the same archive segment manager and reader contract.
   - Design-principles recheck concluded that the target owner split should be `RunMemoryFileStore` as the authoritative memory-directory facade and an internal `RawTraceArchiveManager` as the manifest/segment lifecycle owner. Provider converters, server recorder services, native `FileMemoryStore`, and readers should not directly own archive file layout.
   - This replaces the monolithic archive write target; compression and snapshot windowing remain future policy work.

## Constraints / Dependencies / Compatibility Facts

- Must not use the shared `personal` checkout for authoritative task artifacts.
- Must preserve existing memory directory layout:
  - standalone: `memory/agents/<runId>/...`
  - team member: `memory/agent_teams/<teamRunId>/<memberRunId>/...`
- Must preserve native Autobyteus runtime memory behavior and avoid duplicate server-side traces for `RuntimeKind.AUTOBYTEUS`.
- Must use normalized `AgentRunEvent` as the shared assistant/tool/reasoning event boundary.
- Must capture user input at `AgentRun.postUserMessage(...)` because user input is not a normalized run event.
- Must not require WebSocket/client attachment for persistence.
- Must not make provider-specific raw logs the authoritative memory source.
- Must not delete raw traces, rewrite trace content, or semantically compact local Codex/Claude memory based on provider-internal compact-boundary/status events; archive-preserving active-to-segment rotation is allowed and required at safe boundaries.
- Historical Codex/Claude runs without memory files are not automatically backfilled by the proposed scope.

## Open Unknowns / Risks

- Some Codex/Claude tool events may omit `turnId`; recorder state must infer from active turn and have deterministic fallbacks.
- Assistant output can arrive as multiple segments per turn; implementation must choose a stable combine/finalization strategy for raw traces and working context.
- Reasoning capture can increase disk use; implementation should record normalized reasoning only, not raw provider logs.
- The server memory domain currently omits raw trace `id` and `source_event`; future analyzers may need those exposed through service/GraphQL types.
- Initial investigation found that `autobyteus-ts` already defined raw trace items and snapshot serialization but lacked a sufficiently explicit direct-memory-directory facade and archive manager boundary for server reuse. The target design adds/uses `RunMemoryFileStore` as that facade and an internal `RawTraceArchiveManager` for archive segment lifecycle so the server does not duplicate file names, JSON field serialization, or archive semantics.
- Exact payload variance across Codex/Claude versions should be covered by converter-focused unit tests and recorder normalization tests.
- Provider compact-boundary markers are now in scope as explicit `provider_compaction_boundary` raw trace records; the marker schema should preserve trigger/status metadata without overloading tool fields or pretending a local semantic compaction plan occurred.
- Provider-boundary active raw-trace rotation is now in scope for Codex/Claude recording, and native Autobyteus archival should share the same segmented archive manager. Archive compression and working-context snapshot retention remain future policy work.

## Notes For Architect Reviewer

Requirements are refined and approved by the user as of 2026-04-30. The key clarified constraints are: Codex/Claude persistence is storage-only recording, not runtime memory management; and the common memory file structure/format should be made reusable from `autobyteus-ts` for server import instead of duplicated. Recommended design direction is a server-owned `AgentRunMemoryRecorder` under `agent-memory`, attached by `AgentRunManager`, with an internal `AgentRun` accepted-command observer for user messages and a normalized event accumulator for assistant/reasoning/tool output. Native Autobyteus memory should remain owned by `autobyteus-ts` and be skipped by the server recorder; only the low-level file-format/store kit should be shared. Corrected compaction finding and scope update: native compaction is local-memory destructive/archive-aware; Codex exposes compaction item/notification paths (`type=compaction`, `thread/compacted`) but the current server integration misses/drops them; Claude SDK exposes compact-boundary/status messages. External compaction signals/items should now be captured as non-destructive provider metadata and used as active raw-trace rotation boundaries, not as local semantic-compaction or deletion triggers. The design-principles pass now requires a reusable archive owner (`RawTraceArchiveManager`) behind the shared `RunMemoryFileStore` facade so native and provider-boundary rotation share manifest/segment semantics without provider-specific archive code.
