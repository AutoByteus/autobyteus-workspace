# Run Runtime Switch Contract — files on disk and the data model (autobyteus-316)

Status: **Draft for the design** (requirements SR-003, `Ready for Approval`; DEC-4 open). This is the contract the design, the code and the checks are written against, like `work-journal-contract.md` for the journal. It changes nothing by itself. Every statement marked *Measured* was checked on the user's real memory (read-only, 2026-10-29); *Read* means read in code; *Decision* is this contract's choice; *Open* is settled in the design phase by the named unknown.

Words: **run** = one agent run identified by `runId` (the platform's agent-run ID, never changes); **provider binding** = `runtimeKind` + model + model settings + `platformAgentRunId` (the provider's own session ID); **switch** = replacing the provider binding of a stopped run; **segment** = one raw-trace file (`raw_traces_NNNNNN.jsonl`, or the active file); **previous agent** = the backend that ran an earlier segment.

## 1. Principle

One run folder. The run keeps its `runId`, its folder, its chat and its history row. A switch replaces only the provider binding and starts a new segment. Nothing the old backend wrote is edited or deleted. History is append-only; the current binding is the one mutable fact (`run_metadata.json`).

## 2. Layout of a run folder (run switched Codex → Claude → Codex)

```
<run memory folder>/                      # unchanged location; runId unchanged
  run_metadata.json                       # CURRENT binding (+ pending switch, see 3.1)
  raw_traces_000001.jsonl                 # archived segment: Codex records (compaction boundary)
  raw_traces_000002.jsonl                 # archived segment: Codex records, ends before the switch record #1
  raw_traces_000003.jsonl                 # archived segment: Claude records, ends before switch record #2
  raw_traces_active.jsonl                 # open segment: starts with switch record #2, then Codex records
  raw_traces_manifest.json                # one entry per archived segment, with its runtime_kind (3.2)
  run_summary.md                          # OPTIONAL, written by an agent if it wants (3.5); not derived
  work_journal/                           # derived, deletable, rebuilt from raw traces (3.4)
    work_journal_000001.md … work_journal_000003.md, work_journal_active.md, work_journal_manifest.json
  file_changes.json  communication_messages_active.jsonl  seen_skill_versions.json
  context_files/  collaboration/          # runtime-neutral, unchanged by a switch
  working_context_snapshot.json           # native backend only (3.6)
  agy-project/  runtime-skill-profiles/   # owned by the Antigravity / Codex-Claude backends (3.6)
```

Ownership: raw traces + manifest = memory recorders (`RunMemoryFileStore`); `run_metadata.json` = the standalone lifecycle service only (existing rule); `work_journal/` = journal service only; `run_summary.md` = the agent (optional); native and provider files = their backend.

## 3. Files and data model

### 3.1 `run_metadata.json` (existing file; one new optional field)

*Scope:* standalone Agent runs (first delivery, DEC-4). *Measured:* only 525 of 3,721 run folders have this file; a team or org member keeps its binding (`platformAgentRunId`, runtime) in the team's or org's tree instead (`team_run_execution_tree.json`, with the existing no-conversation binding replacement). The member case is the second delivery and gets its own section here; sections 3.2 to 3.7 (segments, switch record, journal, summary) are identical for members.

Existing fields keep their meaning (`runId`, `agentDefinitionId`, `workspaceRootPath`, `memoryDir`, `llmModelIdentifier`, `llmConfig`, `autoExecuteTools`, `runtimeKind`, `platformAgentRunId`, `preparedAt`, `startedAt`, …). A switch changes `runtimeKind`, `llmModelIdentifier`, `llmConfig`, `platformAgentRunId` and sets:

```ts
pendingRuntimeSwitch?: {
  requestedAt: string;                 // ISO time of the settings save
  from: { runtimeKind: RuntimeKind; llmModelIdentifier: string; platformAgentRunId: string | null };
  stopReason?: { message: string; code?: string };   // provider's own words, redacted; never classified
}
```

- Written by the settings save (stopped run only). `platformAgentRunId` becomes `null`. A second save before the first message keeps the first `from` (so A→B→A before any message is a no-op and clears the field).
- Cleared by the activation commit (3.3 step 6).
- *Decision:* this is the only new persisted "state"; the history of switches is not duplicated here (it is in the raw traces and manifest).

### 3.2 `raw_traces_manifest.json` (existing; one new `boundary_type` value)

*Read:* `RawTraceArchiveSegmentEntry` has `index, file_name, boundary_type, boundary_key, boundary_trace_id, runtime_kind, source_event, archived_at, first/last_trace_id, first/last_ts, record_count, status`. `boundary_type` is `native_compaction | provider_compaction_boundary`.
*Measured:* 820 runs have segment files, all with a manifest; 3,786 segments, **every** one has `runtime_kind` (`CODEX` 3,648, `AUTOBYTEUS` 61, `CLAUDE` 75, `ANTIGRAVITY` 2); no segment file is missing from its manifest and no manifest entry lacks its file.

New value: `boundary_type: "runtime_switch"`, `source_event: "runtime_switch"`, `boundary_key: "runtime_switch:<runId>:<requestedAt>"` (idempotency key), `boundary_trace_id` = the id of the switch record, `runtime_kind` = the runtime of the **archived** records (the previous agent), in the manifest's existing spelling (`CODEX`, `CLAUDE`, `ANTIGRAVITY`, `AUTOBYTEUS`, and the Grok spelling the Grok recorder uses; *Open U-8*: the single mapping function from `RuntimeKind`).
**Runtime of a segment (the lookup rule):** archived segment → its manifest entry's `runtime_kind`; the active segment → `run_metadata.runtimeKind`. No scanning of records.

### 3.3 Switch record (new raw-trace record type `runtime_switch`)

Added to the closed `RuntimeMemoryTraceType` union next to `provider_compaction_boundary`, whose shape it follows (payload in the record's result field):

```ts
{ id, ts, turn_id: null, trace_type: "runtime_switch", source_event: "runtime_switch",
  tool_result: { switch_key: string;                       // = boundary_key
                 from: { runtime_kind, model, platform_agent_run_id|null };
                 to:   { runtime_kind, model };
                 stop_reason?: { message, code? } } }
```

It is the **first record of the new active segment**. No secrets: model settings are not copied (only the model identifier); provider messages are redacted by the existing redaction.

**Write order at the first message after a switch (the activation)** — one lane per run (the existing transition lane):
1. Read metadata; `pendingRuntimeSwitch` present → switch activation (else normal restore).
2. Prepare the new backend as a fresh session (`beginActivation({kind:"new", runId, config})`); nothing is published yet.
3. Make the old runtime's journal current (`ensureCurrent`, before the rotation moves the records).
4. Append the switch record to the active file; rotate before it (`rotateActiveRawTracesBeforeBoundary`, `boundaryKey` as above). If the active file has no records before the marker nothing is archived (the primitive returns `null`) and the record simply starts the file.
5. Commit metadata with the new `platformAgentRunId` (existing `persistAndPublish`).
6. Publish the run; clear `pendingRuntimeSwitch` in the same metadata commit as step 5.
7. Deliver the hand-over notice with the user's first input (3.7).

**Crash behavior (idempotent by `boundary_key`):** before step 4 → nothing changed except a discarded candidate; between 4 and 5 → on retry the key is found in the manifest/active file, steps 3–4 are skipped (the existing retry-from-marker rule), 5–7 run; after 5 → normal. A switch record is never written twice for one key.

### 3.4 `work_journal/` (existing, derived)

One journal file per raw-trace file stays. Each journal file is rendered with **its segment's runtime** (3.2 lookup rule), so Claude records get Claude's tool translation and Codex records Codex's. The journal manifest's `runtime_kind` moves from the run to each file entry (a missing per-file value reads as "render again", the existing tolerance). The switch record renders as `Notice: Runtime switched from <X> to <Y>` as the first entry of its file, with the stop reason if any. *Decision:* `WORK_JOURNAL_RENDERER_REVISION` is **not** raised: files without a switch record render byte-identically, so the 3,700+ existing journals are not rebuilt.

### 3.5 `run_summary.md` (optional; written by the agent; not derived)

The hand-over notice suggests this path (`<run folder>/run_summary.md`, beside the raw traces, not inside the derived `work_journal/`) as the place to leave a summary for the next agent. *Decision (the user, 2026-10-30):* the system does not limit what the agent does: no tool, no size limit, no required headings, no required header line, no requirement that it is written at all. The agent writes it with its normal file tool, if it wants and if its runtime allows (*Open U-2*). If the file exists, the next notice lists it; nothing validates it. It is copied by memory sync like any file in the folder; memory search does not index it in this slice.

### 3.6 Files that belong to one backend

A switch never edits or deletes them.
- `working_context_snapshot.json` (native runtime only: *Read* its only writer and reader is the native memory manager in `autobyteus-ts/src/memory/`; the server only counts it as memory for listing and has migrations for it. *Measured* in 313 native runs; 2 Antigravity runs from 2026-06-15 still hold an old schema-v4 copy, left from before the migration `remove-external-runtime-working-context-snapshots`, and nothing reads them): after a switch away it stays as is. A native activation after a switch starts with an empty working context and relies on the hand-over (*Open U-7*: confirm what native `new` does with an existing snapshot and raw traces; if it overwrites, that is accepted because the old content is in the journal; if it fails, the design adds a rename step).
- `agy-project/`, `runtime-skill-profiles/`: untouched.
- `seen_skill_versions.json`: a switch is a fresh session, so the existing "new" activation gives the current skills; no change.

### 3.7 Hand-over notice (the message the new backend receives; not a file)

One system message placed before the user's first input after the switch, through the existing next-input preface route, with its own system sender (like the skill-update notice), so the chat shows it as a system notice and the agent does not take it for the user's words. Sent once per switch. Delivered ⇔ a notice record after the switch record exists in the active segment (a crash before delivery repeats it, never loses it). Built by the server from facts only; no model writes it. Draft text (the design finalizes wording). Facts and pointers only; the agent decides how to proceed. The user's last request is not repeated (the user's message follows the notice, and the journal has the history):

```
[System: runtime hand-over]
This run was worked on by a previous agent on a different runtime: <from runtime/model>, now
<to runtime/model>. Reason it stopped: <provider's own message, or "the user changed the runtime">.

Its work is recorded in work journals: <run folder>/work_journal/
- Readable Markdown, one file per earlier stretch of work, oldest first:
  work_journal_000001.md, work_journal_000002.md, ... and work_journal_active.md for the latest.
  <file> | <runtime/model> | <period> | <size, lines>
- Entries look like "[HH:MM:SS] User: ...", "Agent: ...", "Command: ... -> ok", "Tool: ...".
  Each entry ends with a link to the raw trace record with the full content; long output is shortened.
- To see what was done most recently, read the end of work_journal_active.md. For earlier work or the
  original request, read the earlier files or search them (search_memory).
- Not in the journals: the previous agent's private reasoning, and results of tool calls that were still
  running when it stopped.
A summary left by an earlier agent may exist at <run folder>/run_summary.md.
```

The user's own message follows unchanged. Facts the notice needs and where each comes from: runtimes, models and time from the pending switch (3.1); stop reason from the same field; journal files, periods and sizes from the journal and raw-trace manifests.

## 4. Invariants (checkable)

| ID | Invariant |
| --- | --- |
| I-1 | `runId`, `memoryDir`, `agentDefinitionId`, `workspaceRootPath`, `startedAt` of `run_metadata.json` never change at a switch. |
| I-2 | Every manifest segment has a `runtime_kind` and its file exists; every `raw_traces_NNNNNN.jsonl` is in the manifest. |
| I-3 | A segment with `boundary_type: runtime_switch` is followed (in the next segment) by a first record of type `runtime_switch` whose `switch_key` equals the entry's `boundary_key`. |
| I-4 | The `runtime_kind` of the archived segment before a switch equals `tool_result.from.runtime_kind`; the active segment's runtime equals `run_metadata.runtimeKind` and the last switch record's `to`. |
| I-5 | No two switch records share a `switch_key`. |
| I-6 | `pendingRuntimeSwitch` present ⇒ `platformAgentRunId` is null and no switch record with that key exists yet. |
| I-7 | Every record written by one backend lies in segments whose runtime is that backend's (no segment holds two runtimes' records). |
| I-8 | Old segments and old journal files are byte-unchanged by a switch. |
| I-9 | `run_summary.md`, if present, is a regular file in the run folder (no other check). |

## 5. Validation plan (before and after the build)

1. **Now (done):** the manifest facts in 3.2 *Measured*; probe `probes/run_folder_contract_probe.py` checked I-2, I-5, I-6, I-9 on all 3,721 real run folders and 3,786 segments (read-only): 0 violations, 0 existing switch segments, so the contract starts from a clean baseline.
2. **Design phase:** U-7 (native `new` on an existing folder) and U-8 (runtime-name mapping) *Reproduced* on a copy.
3. **Build:** the same probe, extended with I-1, I-3, I-4, I-7, I-8, runs on folders produced by (a) tests with scripted runtimes including a crash injected at each point of 3.3, (b) a real switch on isolated data (two available runtimes). A failing invariant is a failing test.
