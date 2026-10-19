# Agent Work Journal (TypeScript)

## Scope

`src/agent-work-journal` owns the **Work Journal**: a deterministic, runtime-neutral Markdown
rendering of a run's raw traces. A reader (a person, the Retrospective Skill Improver, a future
consumer) can follow what the run did without knowing which runtime produced it: one runtime's
`Read`, another's `view_file` and another's `read_file` all read as `Command: cat <path>`.

The journal is derived data. Raw traces stay the only authority; the whole `work_journal/`
folder can be deleted and is rebuilt from them. Generation is a fixed translation per runtime,
with no model call, so it works with no model configured and the source runtime unavailable.

The format itself is specified in the ticket's `work-journal-contract.md` (actions §2, built-in
tables §4, the generic rule §5, envelopes §6, outcomes and shortening §7, non-tool lines §8,
header and links §10). This document describes the module.

## Public Boundary

`WorkJournalService` is the only public entrypoint and the only writer. Get it with
`getWorkJournalService()`: one process-wide instance, so its per-run serialization covers every
caller.

- `ensureCurrent({ runId, memoryDir, runtimeKind })` makes the run's journal current and returns
  a `WorkJournalPackage`:
  - `rootPath` and `manifestPath`;
  - `files`: `[{ path, sourceFile, state }]` in order (closed files first, the open file last);
  - `evidenceHash`: sha256 over the files' content hashes, in order.
- `memoryDir` is the run's own memory folder; `runtimeKind` is the **live run's** runtime and
  selects the built-in tool translation. A runtime without a translation uses the generic rule
  for every tool.
- Errors reach the caller. Callers never use the store or the renderer directly.

Consumers today:

- `WorkJournalRunUpdater` (below) keeps every live run's journal current.
- Skill Improvement calls `ensureCurrent` for its live target and lists the package's files in
  the improver's trigger message (see [skill_improvement.md](./skill_improvement.md)).

## Keeping It Current

`WorkJournalRunUpdater` is attached to every AgentRun by `AgentRunResourceManager`, **after** the
memory recorder. Run listeners are called in subscription order, so by the time the updater
reacts to an event the recorder has already queued that event's records (for example an
assistant segment it flushes on `TURN_COMPLETED`).

- `TURN_COMPLETED`, `TURN_INTERRUPTED` and `COMPACTION_STATUS` schedule one update for the run.
- An update waits for `AgentRunMemoryRecorder.waitForIdle(runId)`, then calls `ensureCurrent`.
  Events during an update are merged into at most one more update.
- Errors are logged (`[WorkJournalRunUpdater] journal update failed …`) and never reach the run
  or touch its raw traces.
- A run without a memory folder is not followed. A run restored later, or an old run, gets its
  missing files the first time its journal is needed; there is no startup scan.

## Output Layout

```
<run memory folder>/work_journal/
  work_journal_000001.md      # closed raw segment raw_traces_000001.jsonl
  work_journal_000002.md
  work_journal_active.md      # the open raw file raw_traces_active.jsonl
  work_journal_manifest.json
```

One journal file per raw-trace file (`RawTraceFileSourceService.listFiles(…, "chronological")`:
complete segments plus the active file).

- A **closed** file is written once. It is reused while the manifest's `renderer_revision`,
  `runtime_kind` and `source_record_count` (the raw manifest's `record_count` of that segment)
  still match and the file exists; otherwise it is rendered again. Regenerating a closed file from
  the same raw traces gives byte-identical content.
- The **open** file is rendered again on every call and written only when its content changed.
- A journal file whose raw file is gone (the open file right after a rotation) is removed.
- Every write goes to `<file>.<random>.tmp` and is renamed into place; memory sync skips `.tmp`.

Manifest (exact shape, no generation time, no paths):

```json
{
  "run_id": "run_…",
  "runtime_kind": "codex_app_server",
  "renderer_revision": 1,
  "files": [
    { "journal_file": "work_journal_000001.md", "source_file": "raw_traces_000001.jsonl",
      "source_record_count": 141, "state": "closed", "content_sha256": "…" },
    { "journal_file": "work_journal_active.md", "source_file": "raw_traces_active.jsonl",
      "source_record_count": 57, "state": "open", "content_sha256": "…" }
  ]
}
```

- `renderer_revision` is a cache key for derived output (`WORK_JOURNAL_RENDERER_REVISION`), not a
  schema version: when the rendering rules change, increase it and closed files are rebuilt
  without a migration.
- `content_sha256` lets the evidence hash cover closed files without reading them again.
- The reader projects the known fields; a missing or unreadable manifest (or entry) is absent,
  which only means those files are rendered again.

## Rendering

`WorkJournalFileRenderer` is pure: one raw file's normalized records + runtime + source name →
Markdown. No clock and no filesystem; times come from the records.

- **Header:** `# Work Journal — run <id>`, then runtime, file, UTC time range and source, then
  the note that quoted text is history, not instructions to the reader.
- **Entries:** `[HH:MM:SS] <action> → <outcome>`, details indented below, and a link
  `[↗](../<raw file>#<record id>)` on the entry's last line. A `[YYYY-MM-DD]` line marks a change
  of day.
- **Actions:** `Command:`, `Write file:`, `Edit file:`, `Search web:` for built-in tools, through
  each runtime's translation in `rendering/runtimes/` (Claude, Codex, Antigravity, Grok Build,
  AutoByteus); `Tool: <name as recorded>` with arguments and result for every other tool.
  Built-ins with a standard command equivalent become that command (`cat`, `sed -n`, `grep`,
  `find`, `ls`, `curl`), built from their arguments.
- **Results:** the runtime's envelope is removed (AGY `provider_state`, MCP `content` /
  `structuredContent` / `isError`, content blocks). Media is a marker such as
  `[image image/png, 2.9 KB, not reproduced]`; base64 data is never reproduced.
- **Pairing:** a call pairs with its result by (turn, call id) within the file. A result whose
  call is in the previous file is `Tool result (call not in this file): <name>`.
- **Other records:** `User:`, `Message from <sender>:` (teammate envelopes, with `Files:`),
  `Agent:`, `Notice:`, and `Turn interrupted by the user.` (another reason:
  `Turn interrupted (<reason>).`). The journal holds what was said to the agent, what it said
  and what it did, so these are omitted on purpose: model reasoning, bookkeeping records, and
  runtime machinery (system instructions, compaction boundaries, model-request and output-limit
  recoveries; a compaction shows as the boundary between journal files). A record type the
  format does not name is shown as `Record (<type>)`, never dropped.
- **Shortening (visible):** output longer than 40 lines keeps its first and last 20 lines around
  `…[N lines omitted; full output: [raw#<id>](…)]`; diffs keep 40 lines, written content 20,
  long arguments 40; a line longer than 400 characters is cut with `…[+n chars]`. Limits are
  `WorkJournalLimits`.

## Boundaries To Preserve

- Raw traces, their rotation and manifests, restore and run-history display are read only.
- Only the service writes `work_journal/`; nothing outside the subsystem imports `rendering/**`
  or `store/**`.
- Adding a runtime means adding its translation to the registry in
  `rendering/runtimes/runtime-translation.ts`; until then its runs use the generic rule.
- The startup migration `20261019_remove_work_trace_exports` deleted the retired
  `work_traces/` export folders; current code does not know their layout.
