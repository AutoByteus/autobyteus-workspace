# Run Runtime Switch Contract — files on disk and the data model (autobyteus-316), v2

Status: **v2, aligned with the design** (SR-004). It replaces v1 of 2026-10-29: the switch marker is now a platform notice record (not a new raw-trace record type), the journal manifest records each file's runtime, the settings save records only a pending switch, and the folder test (§5) has been run. Every statement marked *Read* is from code on `origin/personal` @ `9d59ab82ec`; *Reproduced* was run on synthetic data in an isolated temp folder (`probes/runtime-switch-folder.probe.test.ts`); *Measured* is a read-only count on the user's real memory.

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
  from: { runtimeKind: RuntimeKind; llmModelIdentifier: string;
          llmConfig: Record<string, unknown> | null; platformAgentRunId: string | null };   // the whole previous binding
}
```

- Written by the settings save of a **stopped, unarchived, standalone agent run** that is not application-owned and not system-owned (`isCollaborationEligibleStandaloneRun`). A second save before the first message keeps the first `from`. A save that selects the original runtime again (`from.runtimeKind`) writes `from` back as the binding and clears the field (nothing happened).
- Cleared by the activation commit (3.3 step 5). The history of switches is not duplicated here (it is in the raw-trace manifest and the marker records).
- Optional field whose absence means "no pending switch": **Directly Usable — No Migration** (data-migration guideline § 2: a compatible change).

### 3.2 `raw_traces_manifest.json` (existing; one new `boundary_type` value)

*Read:* `RawTraceArchiveSegmentEntry {index, file_name, boundary_type, boundary_key, boundary_trace_id, runtime_kind, source_event, archived_at, first/last_trace_id, first/last_ts, record_count, status}`; `boundary_type` is the union `native_compaction | provider_compaction_boundary` (`autobyteus-ts/src/memory/store/raw-trace-archive-manifest.ts:8-11`). *Measured:* every one of 3,786 segments in the user's 820 runs has a `runtime_kind` and its file; no orphan. The spelling in data is the short label: `CODEX` 3,648, `AUTOBYTEUS` 61, `CLAUDE` 75, `ANTIGRAVITY` 2 (and `GROK_BUILD` in the Grok payload, *Read* `grok-build-compaction-status-payload.ts:51`).

New value: `boundary_type: "runtime_switch"` (one added member of the library's union), `source_event: "runtime_switch"`, `boundary_key: "runtime_switch:<runId>:<requestedAt>"` (the idempotency key), `boundary_trace_id` = the marker's id, `runtime_kind` = the label of the **archived** records' runtime (the previous agent), in the existing spelling. One owner maps `RuntimeKind` ⇄ label (`agent-memory`), instead of five string literals in five backends.

**Runtime of a segment (lookup rule):** an archived segment → its entry's `runtime_kind`; the active file → the run's current runtime (`run_metadata.json`).

### 3.3 The switch marker (a platform notice record; no new raw-trace record type)

*Why not a new trace type:* the history projection turns raw `system_task_notification` records into chat notices and ignores unknown types (`raw-trace-to-historical-replay-events.ts:201-216`), and the journal already renders them as `Notice:`; so a notice gives the chat marker and the journal line with no change to either reader. Record: `trace_type: "system_task_notification"`, `sender_id: "system.runtime_handover"` (a new sender id beside the existing ones in `system-task-notification-senders.ts`; it is deliberately NOT added to `RECORDED_SYSTEM_NOTICE_SENDER_IDS`: the marker is recorded once at activation, the live notice of 3.6 only shows it), content one short line: `Runtime switched from <Codex> (<model>) to <Claude> (<model>).` It carries the boundary key as its `correlation_id` (the memory writer's notice branch is extended to keep a correlation id, as the compaction boundary branch does), so a retry finds it with the store's existing lookup by correlation id (`findActiveRawTraceByCorrelationId`), the way the provider compaction boundary recorder does.

**Write order at the first message after a switch** (inside the run's existing transition lane, `StandaloneAgentRunLifecycleService.withTransition`):
1. Read metadata: `pendingRuntimeSwitch` present and `platformAgentRunId` null → the switch activation (else the normal restore).
2. Prepare the new backend as a fresh session (`beginActivation({kind:"new", runId, config}).prepare()`, the same call a prepared run uses); validate; nothing is published.
3. Switch recorder (`agent-memory`): if the active file does not yet contain a record with the key as correlation id, append the marker; rotate the active file before it (`RunMemoryFileStore.rotateActiveRawTracesBeforeBoundary`, idempotent by `boundary_key`; with nothing before the marker it moves nothing and the marker simply starts the file).
4. Commit metadata through the lifecycle's existing `persistAndPublish`: new `platformAgentRunId`, `pendingRuntimeSwitch` removed.
5. Publish the run; register the hand-over facts in memory for the first input (3.6).

**Crash behavior:** before step 3 nothing changed but a discarded candidate; between 3 and 4 the metadata is still pending and the retry finds the marker and the manifest key and skips step 3; after 4 it is a normal run. The marker is never written twice for one key. A crash after 4 and before the first input loses the in-memory hand-over notice only (an interrupted-execution edge, outside the supported scenarios; the user can restate the task).

*Reproduced* (`probes/runtime-switch-folder.probe.test.ts`, real `RunMemoryFileStore`, synthetic data): after the marker and the rotation the folder holds `raw_traces_000001.jsonl` (the 8 old records) and `raw_traces_active.jsonl` (marker first, then the new records appended); the manifest has one `complete` entry `runtime_switch` / `CLAUDE` / 8 records; a second rotation with the same key returns `null` and moves nothing; the marker exists once.

### 3.4 `work_journal/` (derived)

One journal file per raw-trace file stays. Each file is rendered with **its segment's runtime** (3.2 lookup rule) so a previous agent's tool calls get that runtime's rules. *Reproduced* (today's code on the probe folder): both files are rendered with the single runtime passed for the run; Claude's `Bash` call in the archived file prints as `Tool: Bash command="git status"` instead of `Command: git status` when the run's current runtime is Codex, which is why the per-file runtime is required. The journal manifest's entries gain `runtime_kind` (the file's runtime); the reuse check compares per file; an entry without it means "render again" (the manifest is derived data: no migration, no renderer revision change, because no existing run has a switch). The marker renders as `Notice: Runtime switched from … to ….` as the first entry of the new file.

### 3.5 Files that belong to one backend

A switch never edits or deletes them.
- `working_context_snapshot.json` (the native runtime only, *Read*: its only writer and reader is the native memory manager; two old Antigravity copies from before the 2026-07-31 cleanup migration are unread): after a switch away it stays. A native activation on a folder that has it starts a fresh working context: `createAgentWithId` builds the memory manager with no restore options, and the snapshot is only read by `restoreAgent` (`agent-factory.ts:93-119,167-179`); the memory store appends to the existing active file (`file-store.ts`, `run-memory-file-store.ts:115-150`); the native turn ids restart at `turn_0001` on every agent construction, restores included (`turn-tracker.ts`, no caller passes a start), so a switch adds no new risk there. The old content is in the journals and the hand-over.
- `agy-project/`, `runtime-skill-profiles/`: untouched. `seen_skill_versions.json`: the fresh session gets the current skills.

### 3.6 Hand-over notice (the message the new agent receives)

A platform notice delivered through the existing next-input route (`AgentRunPlatformNotices`, a third source beside the tool-list and skill-update notices), with its own system sender, so the agent does not take it for the user's words. It has two texts (the preface type already separates them): the **model text** (below), and the **presentation** (the one short marker line of 3.3, published live as the run's system notice). It is sent once per switch with the first external input and built by the server from facts only; no model writes it. Facts and pointers only; the agent decides how to proceed; the user's last request is not repeated (the user's message follows the notice and the journal has the history):

```
[System: runtime hand-over]
This run was worked on by a previous agent on a different runtime: <from runtime/model>, now
<to runtime/model>.

Its work is recorded in work journals: <run folder>/work_journal/
- Readable Markdown, one file per earlier stretch of work, oldest first:
  <file> | <runtime/model> | <period> | <size, lines>   (one line per file; work_journal_active.md is the latest)
- Entries look like "[HH:MM:SS] User: …", "Agent: …", "Command: … → ok", "Edit file: …", "Message to … → delivered".
  Each entry ends with a link to the raw trace record with the full content; long output is shortened.
- To see what was done most recently, read the end of work_journal_active.md. For earlier work or the
  original request, read the earlier files or search them (search_memory).
- Not in the journals: the previous agent's private reasoning, and results of tool calls that were still
  running when it stopped.
```

Facts and where each comes from: runtimes and models from the pending switch (3.1) and the current binding; the journal files, periods, sizes and each file's runtime from the journal service (`ensureCurrent`, `listJournalFiles`, the per-file runtime of 3.4). If the notice cannot be delivered with the first input (the dispatch is rejected or requeued) it stays pending in memory for the next input (the existing preface settle rules).

## 4. Invariants (checkable)

| ID | Invariant |
| --- | --- |
| I-1 | `runId`, `memoryDir`, `agentDefinitionId`, `workspaceRootPath`, `startedAt` of `run_metadata.json` never change at a switch. |
| I-2 | Every manifest segment has a `runtime_kind` and its file exists; every `raw_traces_NNNNNN.jsonl` is in the manifest. |
| I-3 | The first record of the active file after a `runtime_switch` segment is a `system_task_notification` whose id equals the entry's `boundary_trace_id` and whose correlation id equals its `boundary_key`. |
| I-4 | The `runtime_kind` label of the archived segment before a switch equals the label of `from.runtimeKind` of the switch that made it; the active file's runtime is `run_metadata.runtimeKind`. |
| I-5 | No two manifest entries share a `boundary_key`; one marker record per key. |
| I-6 | `pendingRuntimeSwitch` present ⇒ no marker with its key exists yet, or the activation has not committed: `platformAgentRunId` is null until the commit. |
| I-7 | No segment holds records of two runtimes (the rotation precedes the first record of the new runtime). |
| I-8 | Old segments and old journal files are byte-unchanged by a switch. |
| I-9 | The journal manifest entry of a file has `runtime_kind` equal to the segment's runtime by the 3.2 rule. |

## 5. Validation (what has been done, what is planned)

1. **Done, on the real data (read-only):** the manifest facts of 3.2 and probe `probes/run_folder_contract_probe.py`: I-2, I-5, I-6 on all 3,724 run folders and 3,792 segments, 0 violations, 0 switch segments.
2. **Done, isolated and synthetic (the folder test, U-7):** `probes/runtime-switch-folder.probe.test.ts`: the rotation and marker sequence of 3.3, its idempotence, and today's journal rendering one runtime for every file (3.4). Output: `evidence/folder-test-output.txt`.
2b. **Done, isolated and synthetic (data-model validation, 2026-10-30):** `probes/runtime-switch-data-model.probe.test.ts`, output `evidence/data-model-validation-output.txt`: Claude work → switch → Codex work → switch back → Claude work, with the real store, raw-trace readers, journal renderer and chat projection: I-2, I-3, I-4, I-5, I-7, I-8 pass; each journal file reads correctly with its own runtime and shows the marker as its first entry; the chat projection yields both markers in order; today's service prints the Codex file wrongly with the run's current runtime.
3. **Read:** the native memory manager on an existing folder (3.5).
4. **Build:** tests with scripted runtimes including a crash injected at each point of 3.3, the same probe extended with I-1, I-3, I-4, I-7, I-8, I-9 on folders the tests produce, and a real switch on isolated data between two available runtimes.

## 6. Decision log

- 2026-10-29, the user: the runtime is a setting of the same run; rotate at a switch or not "whichever is simpler" (decided: rotate, DEC-7); a marker in the chat (DEC-3).
- 2026-10-30, the user: no stop reason; no summary tool, no summary file, no limits; the notice says "previous agent" and describes the journals instead of repeating the last message.
- 2026-10-30, the user: the first delivery covers a single standalone agent; teams come later (DEC-4).
