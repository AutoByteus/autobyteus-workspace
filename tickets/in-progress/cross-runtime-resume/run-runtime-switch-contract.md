# Run Runtime Switch Contract — files on disk and the data model (autobyteus-316), v2

Status: **v3: data model and shapes only; the sequences are in `design-spec.md`** (SR-004). It replaces v1 of 2026-10-29: the switch marker is now a platform notice record (not a new raw-trace record type), the journal manifest records each file's runtime, the settings save records only a pending switch, and the folder test (§5) has been run. Every statement marked *Read* is from code on `origin/personal` @ `9d59ab82ec`; *Reproduced* was run on synthetic data in an isolated temp folder (`probes/runtime-switch-folder.probe.test.ts`); *Measured* is a read-only count on the user's real memory.

Words: **run** = one agent run identified by `runId` (never changes); **provider binding** = `runtimeKind` + model + model settings + `platformAgentRunId` (the provider's own session ID); **switch** = replacing the provider binding of a stopped standalone agent run; **segment** = one raw-trace file (`raw_traces_NNNNNN.jsonl` or the active file); **previous agent** = the backend that ran an earlier segment.

## 1. Principle

One run folder. The run keeps its `runId`, folder, chat and history row. A switch replaces only the provider binding and starts a new raw-trace segment. Nothing the previous agent wrote is edited or deleted. History is append-only; the current binding is the one mutable fact (`run_metadata.json`).

## 2. Layout of a run folder (run switched Codex → Claude)

```
<run memory folder>/                      # location and runId unchanged
  run_metadata.json                       # CURRENT binding (+ pendingRuntimeSwitch between the settings save and the first message, 3.1)
  raw_traces_000001.jsonl                 # archived segment: the Codex records, ends before the switch marker
  raw_traces_active.jsonl                 # open segment: first record = the switch marker (a platform notice), then Claude's records
  raw_traces_manifest.json                # one entry per archived segment: boundary_type "runtime_switch", runtime_kind of the archived records (3.2)
  work_journal/                           # derived, deletable, rebuilt from raw traces
    work_journal_000001.md  work_journal_active.md  work_journal_manifest.json   # manifest entries carry each file's runtime (3.4)
  file_changes.json  communication_messages_active.jsonl  seen_skill_versions.json  context_files/  collaboration/   # runtime-neutral, untouched
  working_context_snapshot.json           # native runtime only (3.5)
  agy-project/  runtime-skill-profiles/   # owned by their backends (3.5)
```

Writers: raw traces and their manifest = the memory recorders / `RunMemoryFileStore`; `run_metadata.json` = the standalone lifecycle service only (existing rule); `work_journal/` = the journal service only.

## 3. Files and data model

### 3.1 `run_metadata.json` (existing; one new optional field, parsed by its own schema file like `delegatedFrom`)

*Read:* the store normalizes by explicit fields (`agent-run-metadata-store.ts:34-56`), so a new field must be added to its normalizer; `systemRunOwner` and `delegatedFrom` are the precedents for optional markers. A switch changes `runtimeKind`, `llmModelIdentifier`, `llmConfig`, sets `platformAgentRunId: null` and records:

```ts
pendingRuntimeSwitch?: {
  requestedAt: string;                                   // ISO time of the settings save; part of the switch key
  from: RunProviderBinding;   // the previous binding: Pick<AgentRunMetadata, "runtimeKind" | "llmModelIdentifier" | "llmConfig" | "platformAgentRunId">, one type shared with the metadata, not a copy
}
```

- Written by the settings save of a **stopped, unarchived, standalone agent run** that is not application-owned and not system-owned (`isCollaborationEligibleStandaloneRun`). A second save before the first message keeps the first `from`. A save that selects the original runtime again (`from.runtimeKind`) is the undo: the original session ID (`from.platformAgentRunId`) is restored and the field is cleared, and the model and settings the user chose in that save are written (a different model of the original runtime is kept, not lost).
- Cleared by the activation commit (design-spec, Activation Sequence). The history of switches is not duplicated here (it is in the raw-trace manifest and the marker records).
- **Stored before and after the activation commit** (the commit writes the new session ID and removes the pending field in the same write; `startedAt` is unchanged):
  ```
  before: { runId, runtimeKind: "codex_app_server", llmModelIdentifier: "…", llmConfig: {…}, platformAgentRunId: null,
            startedAt: "2026-10-29T…", pendingRuntimeSwitch: { requestedAt: "2026-10-30T10:00:00Z",
              from: { runtimeKind: "claude_agent_sdk", llmModelIdentifier: "…", llmConfig: {…}, platformAgentRunId: "sess-1" } }, … }
  after:  { runId, runtimeKind: "codex_app_server", llmModelIdentifier: "…", llmConfig: {…}, platformAgentRunId: "thread-9",
            startedAt: "2026-10-29T…", … }          // no pendingRuntimeSwitch key
  ```
- Optional field whose absence means "no pending switch": **Directly Usable — No Migration** (data-migration guideline § 2: a compatible change).

### 3.2 `raw_traces_manifest.json` (existing; one new `boundary_type` value)

*Read:* `RawTraceArchiveSegmentEntry {index, file_name, boundary_type, boundary_key, boundary_trace_id, runtime_kind, source_event, archived_at, first/last_trace_id, first/last_ts, record_count, status}`; `boundary_type` is the union `native_compaction | provider_compaction_boundary` (`autobyteus-ts/src/memory/store/raw-trace-archive-manifest.ts:8-11`). *Measured (2026-10-30: 825 manifests, 3,794 segments):* every segment has a `runtime_kind` and its file; no orphan. Today's stored spelling is the short label: `CODEX` 3,648, `CLAUDE` 83, `AUTOBYTEUS` 61, `ANTIGRAVITY` 2 (and `GROK_BUILD` in the Grok payload, *Read* `grok-build-compaction-status-payload.ts:51`); PRE-1 changes it.

New value: `boundary_type: "runtime_switch"` (one added member of the library's union), `source_event: "runtime_switch"`, `boundary_key: "runtime_switch:<runId>:<requestedAt>"` (the idempotency key), `boundary_trace_id` = the marker's id, `runtime_kind` = the `RuntimeKind` value of the **archived** records' runtime (the previous agent, `from.runtimeKind`). **Prerequisite PRE-1 (autobyteus-343) is delivered and merged (2026-10-30):** before it the stored values were the short labels `CODEX/CLAUDE/ANTIGRAVITY/GROK_BUILD/AUTOBYTEUS`; PRE-1 makes the backends write, and a sealed migration rewrite in the manifests, the `RuntimeKind` values (`codex_app_server`, `claude_agent_sdk`, `antigravity_cli`, `grok_build`, `autobyteus`). This contract assumes that state: a segment's runtime is `runtimeKindFromString(entry.runtime_kind)` (null when absent or unknown, then rendered with the no-runtime rules as today), and no mapping file exists.

**Runtime of a segment (lookup rule):** an archived segment → its entry's `runtime_kind`. The open (active) file → the runtime that wrote it: `pendingRuntimeSwitch.from.runtimeKind` while a switch is pending (the metadata already holds the new runtime, the open file still holds the previous runtime's records), otherwise `run_metadata.runtimeKind`. One function derives this fact (`openRawTraceRuntimeKind(metadata)`, `run-history/store/agent-run-pending-runtime-switch.ts`, beside the pending-switch parse) and the journal's callers use it (`memory-run-discovery.ts:146` supplies the journal target's runtime for standalone runs); a live run has no pending switch, so its own runtime is the same fact.

### 3.3 The switch marker (a platform notice record; no new raw-trace record type)

*Why not a new trace type:* the history projection turns raw `system_task_notification` records into chat notices and ignores unknown types (`raw-trace-to-historical-replay-events.ts:201-216`), and the journal already renders them as `Notice:`; so a notice gives the chat marker and the journal line with no change to either reader. Record: `trace_type: "system_task_notification"`, `sender_id: "system.runtime_handover"` (a new sender id beside the existing ones in `system-task-notification-senders.ts`; it is deliberately NOT added to `RECORDED_SYSTEM_NOTICE_SENDER_IDS`: the marker is recorded once at activation, the live notice of 3.6 only shows it), content one short line: `Agent runtime changed from <Codex App Server> (<model>) to <Claude Agent SDK> (<model>).` (names as in GLOSSARY.md, `agentRuntimeName`; no short forms) It carries the boundary key as its `correlation_id` (the memory writer's notice branch is extended to keep a correlation id, as the compaction boundary branch does), so a retry finds it with the store's existing lookup by correlation id (`findActiveRawTraceByCorrelationId`), the way the provider compaction boundary recorder does.

**Identity.** The switch key is `runtime_switch:<runId>:<requestedAt>`. The marker's trace id is derived from it (`rt_runtime_switch_` + the first 24 hex characters of the SHA-256 of the key), so it is the same on every attempt and equals the segment's `boundary_trace_id` (I-3).

**The archive step (one library call, `RunMemoryFileStore.rotateActiveRawTracesForRuntimeSwitch({boundary, marker, throughTraceId})`, built on the same private `archiveAndRewriteActive` as the other rotations).** Rules:
1. If a complete segment with the key exists, the watermark (`throughTraceId`) is ignored: the ids that segment holds are removed from the active file and the marker is ensured first.
2. Otherwise the records through the watermark are archived as the `runtime_switch` segment (none when the watermark is absent: no segment is made) and the active file becomes the marker followed by the records after the watermark.
3. The marker is written only if no record with the key as correlation id is in the active file; it is always first.

Idempotent: a repeated call, a retry after a failed commit, and a call after an interrupted rewrite complete what is missing and write nothing twice.

**What a switch leaves in the folder** (`L` = the last record of the previous era, `S` = a record the new agent's candidate writes while it prepares: a native agent's system instruction, Grok's captured instructions; `M` = the marker):

| Case | Active file | Manifest |
| --- | --- | --- |
| Before any attempt | `[r1 … L]` | `[… earlier entries]` |
| First attempt, success (after `record`) | `[M, S, …]` | `+ {boundary_type: runtime_switch, boundary_key: K, boundary_trace_id: M, runtime_kind: from.runtimeKind, status: complete}`; the segment file holds `[r1 … L]` |
| First attempt, the start fails after `S` was written (after the lifecycle's discard) | `[r1 … L]` (the failed candidate's records are gone) | unchanged |
| Retry after that | as "first attempt, success" | as "first attempt, success" |
| Retry after a failed metadata commit (the first `record` succeeded) | `[M, S, …]` unchanged: the watermark is ignored (rule 1), the marker is present, an identical instruction is not written again | unchanged |
| Retry after an interrupted rewrite (segment exists, active not yet rewritten) | `[r1 … L, S]` → the archived ids are removed, `M` is put first → `[M, S]` | the segment entry is complete |

**Sequence, failure rules and the per-target table live in the design (`design-spec.md`, "Activation Sequence").** The contract holds what ends up on disk.

### 3.4 `work_journal/` (derived)

One journal file per raw-trace file stays. Each file is rendered with **its segment's runtime** (3.2 lookup rule) so a previous agent's tool calls get that runtime's rules. *Reproduced* (today's code on the probe folder): both files are rendered with the single runtime passed for the run; Claude's `Bash` call in the archived file prints as `Tool: Bash command="git status"` instead of `Command: git status` when the run's current runtime is Codex, which is why the per-file runtime is required. The journal manifest's entries gain `runtime_kind` (the file's runtime); the reuse check compares per file; an entry without it means "render again" (the manifest is derived data: no migration, no renderer revision change, because no existing run has a switch). The marker renders as `Notice: Agent runtime changed from … to ….` as the first entry of the new file.

### 3.5 Files that belong to one backend

A switch never edits or deletes them.
- `working_context_snapshot.json` (the native runtime only, *Read*: its only writer and reader is the native memory manager; two old Antigravity copies from before the 2026-07-31 cleanup migration are unread): after a switch away it stays. A native activation on a folder that has it starts a fresh working context: `createAgentWithId` builds the memory manager with no restore options, and the snapshot is only read by `restoreAgent` (`agent-factory.ts:93-119,167-179`); the memory store appends to the existing active file (`file-store.ts`, `run-memory-file-store.ts:115-150`); the native turn ids restart at `turn_0001` on every agent construction, restores included (`turn-tracker.ts`, no caller passes a start), so a switch adds no new risk there. The old content is in the journals and the hand-over.
- `agy-project/`, `runtime-skill-profiles/`: untouched. `seen_skill_versions.json`: the fresh session gets the current skills.

### 3.6 Hand-over notice (the message the new agent receives)

A platform notice delivered through the existing next-input route (`AgentRunPlatformNotices`, a third source beside the tool-list and skill-update notices), with its own system sender, so the agent does not take it for the user's words. It has two texts (the preface type already separates them): the **model text** (below), and the **presentation** (the one short marker line of 3.3, published live as the run's system notice). It is sent once per switch with the first external input and built by the server from facts only; no model writes it. **Whether a hand-over is pending is derived from the raw traces, not stored or remembered:** it is pending while the first record of the active file is the hand-over marker and no `user` record follows it (read from the start of the file; the scan stops at the first `user` record, so a run that never switched is decided by its first record). After the input is recorded as a `user` record the hand-over is done. So it survives a restart and cannot be lost with a process. Written as one person handing over to another: it says there was earlier work, where the journal is, where to start, and that the rest is there if wanted. Facts and pointers only; the agent decides what to read and how to proceed; the user's last request is not repeated (the user's message follows the notice and the journal has the history):

```
[System: runtime hand-over]
Another agent worked on this run before you and kept a work journal as it went. You are taking over.

The journals are in <run folder>/work_journal/. The latest one, work_journal_active.md, shows what was
done most recently, so it is a good place to start. The earlier ones are there too, oldest first, if you
want to look further back:
  <file> | <period> | <size, lines>     (one line per file)

Each entry is one line, such as "[HH:MM:SS] User: …", "Agent: …" or "Command: … → ok", and ends with a
link to the full record. Long output is shortened.
```

Facts and where each comes from: the journal files, their periods, sizes and lines from the journal service (`ensureCurrent`, `listJournalFiles`). The notice names no agent runtime or model: the agent acts on where the work is recorded, not on which product recorded it (the user, 2026-10-30). The runtimes appear only in the chat marker (3.3), which is for the user, and inside the journal service, which uses each file's runtime to render it (3.4). If the notice cannot be delivered with the first input (the dispatch is rejected or requeued) no `user` record follows the marker, so it is pending again for the next input (the existing preface settle rules). If a dispatch forwards the notice and the process ends before the `user` record is written, the next input carries it again.

### 3.7 What the chat reads (BEH-005, REQ-011, REQ-014)

The history projection of a run (`LocalMemoryRunViewProjectionProvider.buildProjection` and `buildActiveTracePage`) reads the active file only, because compaction deliberately shows only the records after the latest compaction (the earlier ticket's BEH-A4; unchanged). Archiving the previous agent's records at a switch would therefore empty the chat on reload (CRR-002 F-2, measured: `chat-projection.json`). Rule: the chat reads the records of the run's `runtime_switch` segments (manifest `boundary_type`), oldest first, followed by the active file; segments of any other boundary type are not read. One reader, `MemoryFileStore.readChatRawTraces` / `AgentMemoryService.getChatRawTraceSnapshot`, serves both projection methods, so the first page, the paging of earlier events and the generation of the page cursor (device, inode and latest manifest generation, as today) see one sequence. Effect: a run that never switched reads the active file only (unchanged); a switched run shows the previous agent's conversation (which already excluded what its own compaction had hidden), the marker and the new agent's records; after a later compaction in the new era the chat shows the previous era and the active file after that compaction (the marker, archived by that compaction, is then not shown — compaction's rule applies to the new era).

## 4. Invariants (checkable)

| ID | Invariant |
| --- | --- |
| I-1 | `runId`, `memoryDir`, `agentDefinitionId`, `workspaceRootPath`, `startedAt` of `run_metadata.json` never change at a switch. |
| I-2 | Every manifest segment has a `runtime_kind` and its file exists; every `raw_traces_NNNNNN.jsonl` is in the manifest. |
| I-3 | The first record of the active file after a `runtime_switch` segment is a `system_task_notification` whose id equals the entry's `boundary_trace_id` and whose correlation id equals its `boundary_key`. |
| I-4 | The `runtime_kind` of the archived segment before a switch equals `from.runtimeKind` of the switch that made it; the open file's runtime is `openRawTraceRuntimeKind(metadata)`: `from.runtimeKind` while a switch is pending, otherwise `run_metadata.runtimeKind`. |
| I-5 | No two manifest entries share a `boundary_key`; one marker record per key. |
| I-6 | `pendingRuntimeSwitch` present ⇒ the activation has not committed: `platformAgentRunId` is null until the commit, and the commit removes the field in the same write that sets the session ID. A marker with the key may already exist (a failed activation sent again finds it). |
| I-7 | No file holds records of two runtimes, on the first attempt and on every retry: no record a candidate wrote is in the previous agent's segment, and no record the previous agent wrote is in the new era's file. A failed attempt that did not reach `record` leaves nothing of the candidate in the previous era's file. |
| I-8 | Old segments and old journal files are byte-unchanged by a switch. |
| I-9 | The journal manifest entry of a file has `runtime_kind` equal to the file's runtime by the 3.2 rule (an archived segment: its entry; the open file: `openRawTraceRuntimeKind(metadata)`). |
| I-10 | The chat of a switched run is built from its `runtime_switch` segments in index order followed by the active file (3.7). |
| I-11 | A pending hand-over is derived: the first record of the active file is the hand-over marker and no `user` record follows it. No flag is stored. |

## 5. Validation (what has been done, what is planned)

1. **Done, on the real data (read-only):** the manifest facts of 3.2 and probe `probes/run_folder_contract_probe.py`: I-2, I-5, I-6 on all 3,724 run folders and 3,792 segments, 0 violations, 0 switch segments.
2. **Done, isolated and synthetic (the folder test, U-7):** `probes/runtime-switch-folder.probe.test.ts`: the rotation and marker sequence of 3.3, its idempotence, and today's journal rendering one runtime for every file (3.4). Output: `evidence/folder-test-output.txt`.
2b. **Done, isolated and synthetic (data-model validation, 2026-10-30):** `probes/runtime-switch-data-model.probe.test.ts`, output `evidence/data-model-validation-output.txt`: Claude work → switch → Codex work → switch back → Claude work, with the real store, raw-trace readers, journal renderer and chat projection: I-2, I-3, I-4, I-5, I-7, I-8 pass; each journal file reads correctly with its own runtime and shows the marker as its first entry; the chat projection yields both markers in order; today's service prints the Codex file wrongly with the run's current runtime.
3. **Read:** the native memory manager on an existing folder (3.5).
4. **Build:** tests with scripted runtimes including a failure injected at each point of 3.3, the same probe extended with I-1, I-3, I-4, I-7, I-8, I-9 on folders the tests produce, and a real switch on isolated data between two available runtimes.

## 6. Decision log

- 2026-10-29, the user: the runtime is a setting of the same run; rotate at a switch or not "whichever is simpler" (decided: rotate, DEC-7); a marker in the chat (DEC-3).
- 2026-10-30, the user: no stop reason; no summary tool, no summary file, no limits; the notice says "previous agent" and describes the journals instead of repeating the last message.
- 2026-10-30, the user: the first delivery covers a single standalone agent; teams come later (DEC-4).
