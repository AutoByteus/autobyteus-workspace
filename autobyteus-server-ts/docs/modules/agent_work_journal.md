# Agent Work Journal (TypeScript)

## Scope

`src/agent-work-journal` owns the **Work Journal**: a deterministic, runtime-neutral Markdown
rendering of a run's raw traces. A reader (a person, or an agent asked to review a run) can follow what the run did without knowing which runtime produced it: one runtime's
`Read`, another's `view_file` and another's `read_file` all read as `Command: cat <path>`.

The journal is derived data. Raw traces stay the only authority; the whole `work_journal/`
folder can be deleted and is rebuilt from them. Generation is a fixed translation per runtime,
with no model call, so it works with no model configured and the source runtime unavailable.

This document is the durable description of the module and of the journal's vocabulary (see
[Vocabulary](#vocabulary) for what each kind of tool call reads as).

## Public Boundary

`WorkJournalService` is the only public entrypoint and the only writer. Get it with
`getWorkJournalService()`: one process-wide instance, so its per-run serialization covers every
caller.

- `ensureCurrent({ runId, memoryDir, runtimeKind }, { regenerate? })` makes the run's journal current
  and returns a `WorkJournalPackage` (`regenerate: true` renders every file again, even a closed one
  whose manifest already has the current revision; only Rebuild passes it):
  - `rootPath` and `manifestPath`;
  - `files`: `[{ path, sourceFile, state }]` in order (closed files first, the open file last);
  - `evidenceHash`: sha256 over the files' content hashes, in order.
- `memoryDir` is the run's own memory folder; `runtimeKind` is the agent runtime that wrote the run's **open**
  raw-trace file (the live run's own, or while an agent runtime switch is pending the previous one:
  `openRawTraceRuntimeKind(metadata)`). It selects the tool translation of the open file. Each **closed** file
  uses the agent runtime recorded for its own segment (`runtime_kind` of the raw manifest, a `RuntimeKind`
  value), so a run that switched agent runtimes reads each file with the rules of the agent runtime that
  wrote it. A runtime without a translation, or a file whose runtime is not recorded (`null`), uses the
  generic rule for every tool, and the journal manifest's entry for that file has `runtime_kind: null`.
- `rendererRevision`: the revision this build writes (`WORK_JOURNAL_RENDERER_REVISION`). Memory search
  reads it from the service, never from the constant.
- `onJournalChanged(listener)` is called after `ensureCurrent` wrote or removed a journal file
  (never when nothing changed), with the run's `memoryDir`. A listener's error is logged
  (`WORK_JOURNAL_CHANGE_LISTENER_FAILED`) and never fails `ensureCurrent`. Returns the unsubscribe.
- Reading (no generation; a run without a journal answers empty or `null`):
  - `journalFileVersions(memoryDir)`: each file's name, state and `content_sha256` from the
    manifest, without reading the files;
  - `listJournalFiles(memoryDir)`: each file's size, line count and days (`[YYYY-MM-DD]` lines);
  - `readJournalFile(memoryDir, file)` and `readJournalLines(memoryDir, file, {start, end})` (at
    most 400 lines, `MAX_JOURNAL_LINES_PER_READ`): only files the manifest names;
  - `journalFilePath(memoryDir, file)`: where the file is, for a file tool.
- `reading/journal-entry-reader.ts` (`readJournalEntries`) splits a journal file into entries
  (request, reply, action, notice, note) with line ranges and days. It reads the format; it does
  not render it.
- Errors reach the caller. Callers never use the store or the renderer directly, and nothing but
  this service reads raw traces to make a journal.

Consumers today:

- `WorkJournalRunUpdater` (below) keeps every live run's journal current.
- Memory search ([memory_search.md](memory_search.md)) makes every run's journal current in its
  Journals step, follows `onJournalChanged`, and reads journal files to index and to show snippets.
- The Memory page reads a run's Work Journal through the memory view (`workJournal` window of 300
  lines, `api/graphql/types/work-journal-view.ts`).

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
  missing files the first time its journal is needed (for example memory search's Journals step,
  when the user builds the memory index); there is no startup scan.

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

- A **closed** file is written once. It is reused while the manifest's `renderer_revision`, its own entry's
  `runtime_kind` (the agent runtime of its segment) and `source_record_count` (the raw manifest's
  `record_count` of that segment) still match and the file exists; otherwise it is rendered again. A manifest
  entry without its own `runtime_kind` (written before files recorded one) is dropped, so the file is rendered again. Regenerating a closed file from
  the same raw traces gives byte-identical content.
- The **open** file is rendered again on every call and written only when its content changed.
- A journal file whose raw file is gone (the open file right after a rotation) is removed.
- Every write goes to `<file>.<random>.tmp` and is renamed into place; memory sync skips `.tmp`.

Manifest (exact shape, no generation time, no paths):

```json
{
  "run_id": "run_…",
  "renderer_revision": 2,
  "files": [
    { "journal_file": "work_journal_000001.md", "source_file": "raw_traces_000001.jsonl",
      "source_record_count": 141, "state": "closed", "content_sha256": "…", "runtime_kind": "claude_agent_sdk" },
    { "journal_file": "work_journal_active.md", "source_file": "raw_traces_active.jsonl",
      "source_record_count": 57, "state": "open", "content_sha256": "…", "runtime_kind": "codex_app_server" }
  ]
}
```

- `renderer_revision` is a cache key for derived output (`WORK_JOURNAL_RENDERER_REVISION`), not a
  schema version: when the rendering rules change, increase it and journals are rebuilt without a
  migration (see [Changing The Wording](#changing-the-wording)).
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
- **Actions:** every tool call becomes one neutral line that says what was done, not which tool did
  it. The lookup has three steps, in order (`rendering/tool-call-line.ts` owns it): (1) the run's
  **runtime translation** (`rendering/runtimes/`: it unwraps the runtime's envelope, splits a
  qualified name, then reads that runtime's own table, runtime-only tools included); (2) the
  **platform converters** (`rendering/platform/`: the same line on every runtime, for an unqualified
  name); (3) the **generic line**, `Tool: <tool> [(via <server>)] <arguments> → <result>`. A plain
  read of a skill file is the one cross-cutting rule (`rendering/skill-load.ts`, applied inside
  `commandLine`). See [Vocabulary](#vocabulary).
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

## Vocabulary

The journal reads the same whichever runtime produced it. Each line is `[HH:MM:SS] <action> → <outcome>`.
Outcomes: `ok` (`ok (note)`), `delivered` (a message the platform accepted), `exit <code>`,
`failed[: <message>]`, `denied[: <reason>]`, `rejected by the user`, `interrupted`, `timed out`,
`no result in this file`, `started pid <pid>`.

**Built-in tools** (per-runtime tables in `rendering/runtimes/`; each tool of a runtime has one row):

| Action line | Meaning |
| --- | --- |
| `Command: <command>` | a shell command; a file read, search, listing or fetch becomes its standard command (`cat`, `sed -n`, `grep`, `find`, `ls`, `curl`); `(background)` for a background command; `(in <dir>)` when the working folder is recorded |
| `Write file: <path> (<n> lines)` / `Edit file: <path> (+a −r)` | file changes; a diff follows |
| `Search web: "<query>"` | web search |

**Runtime-only tools** (a tool one runtime has, converted in that runtime's table):

| Runtime | Tool | Line |
| --- | --- | --- |
| Claude | `Skill` | `Load skill: <name>` |
| Claude | `TodoWrite` | `Update to-do list (<n> items)`, items below as `[done]`, `[doing]`, `[todo]` |
| Claude | `Agent` | `Spawn sub-agent: <description>` (`(background)`), task text below |
| Claude | `ToolSearch` | `Look up tools: "<query>"` |
| Claude | `TaskCreate`, `TaskUpdate` | `Create task: <subject>`, `Update task <id>: <status>` |
| Claude | `TaskOutput`, `TaskStop` | `Read output of background task <id>`, `Stop background task <id>` |
| Claude | `Workflow` | `Run workflow: <name>` |
| Codex | `js`, `js_reset`, `js_add_node_module_dir` | `Run JavaScript: <title>`, `Reset JavaScript environment`, `Add JavaScript module folder: <path>` |
| Codex | `speak` | `Speak: "<text>"` (`(not played)`) |
| Antigravity | `Bash` | `Command: <command>` |
| AutoByteus | `get_process_output`, `stop_background_process` | `Read output of background task <pid>`, `Stop background task <pid>` |
| AutoByteus | `replace_in_file` | `Edit file: <path> (+a −r)` |
| AutoByteus | `download_media`, `download_video`, `convert_video_format` | `Download file: <url> to <folder>/<file>`, `Download video: <url> (<format>)`, `Convert video: <input> to <format> (<output>)` |
| AutoByteus | `submit_task_result` | `Submit task result` |

**Platform tools** (the tools every runtime can call; `rendering/platform/`, one converter family per file):

| Family | Lines |
| --- | --- |
| Messages | `Message to <recipient> (<type>) → delivered` or `→ failed: <platform's message>`; `Message to run <id>` when addressed by run ID; the text and `Files:` below. `Delegate task <id> to <recipient>`. `Check handoff rules` |
| Project task board | `Create project task: <title>`, `Update project task <id>: status <status>`, `Create or update project task: <first line>`, `Read project task <id>`, `List project tasks (project <id>)`, `Search project tasks "<query>"`; projects: `Create project: <name>`, `Update project <id>`, `Create or update project: <name>`, `List projects` |
| Browser | `Browser: open <url>`, `go to <url> (tab <id>)`, `close tab <id>`, `list tabs`, `read page`, `screenshot`, `page snapshot`, `run script`, `set device emulation <mode>` |
| Media | `Generate image: "<prompt>"`, `Edit image: "<prompt>" (<n> input image)`, `Generate speech`, `Generate video: "<prompt>"`; `File: <path>` below |
| Discovery and others | `List available agents`, `List peer nodes`, `List available agent runtimes`, `Search memory "<query>"`, `Publish artifacts: <paths>`, `Submit launch choices (<n> agents)` |

- The platform table is keyed by string literals, not by the tools' name constants: a journal of an
  earlier run keeps the name the tool had then, so it also lists recorded-history names
  (`create_or_update_task`, `create_or_update_project`, `manage_task`). AutoByteus's removed
  `read_media_file` keeps its media marker in its own table.
- A message a recipient refused prints `failed: <the platform's message>`; the outcome is read from
  the result (or from the call's error on Antigravity). A message call recorded with no recipient
  prints `Message to (recipient not recorded)`.
- Older native-runtime message results are plain text with no `accepted` field and print `→ ok`.

**Skill load.** A plain read (`cat`, `cat -n`, `sed -n '<range>'`, `head`, `nl`, or `cat -n <path>` with a
`sed -n` range) of one path `<skills folder>/<name>/SKILL.md` (a folder whose name ends with `skills`, or
`.system` under one) is `Load skill: <name> → <outcome>`, the skill's text is not repeated, on every
runtime. Any other command (`cd … && cat`, several files, another pipe) stays a `Command:`. The label may
be wrong when an agent only reviews a skill; the line stays true, since the text reached its context.

**Generic line.** Any tool without a converter: `Tool: <tool> <arguments> → <result>`, with
`(via <server>)` for a qualified name (Codex `<server>.<tool>`, Antigravity `mcp__<server>__<tool>`). A
qualified name never reaches the platform table, so another server's tool that shares a platform tool's
name is not mistaken for it. The user's own tools and a run whose runtime is not recorded stay generic.

A converter is pure (no clock, no I/O, no model) and only rephrases what the record holds; the line
links to the raw record, which keeps the original tool name and data.

**Guards.** `tests/agent-work-journal/rendering/platform-completeness.test.ts` reads the platform's tool
registry: every current platform tool needs a converter or an entry on the (empty) "generic on purpose"
list, so a new tool fails the test until someone decides. `neutral-vocabulary.test.ts` checks that the
same job reads the same words on every runtime.

## Changing The Wording

The journal is derived, so a change of wording is a revision, not a migration:

1. Change the converters and increase `WORK_JOURNAL_RENDERER_REVISION`.
2. The first memory-search catch-up pass after the upgrade renders every journal again: the Journals
   step's fingerprint of a run includes the revision (`rawTraceFingerprint(memoryDir, rendererRevision)`),
   so every run counts as changed once, and a closed file with an older manifest revision is replaced in
   place. A second start renders nothing. Raw traces are never touched.
3. **Rebuild** passes `regenerate`, so it renders every file again even when its manifest already has the
   current revision; **Index now** does not.
4. The new text feeds the existing consumers unchanged (entry reader, chunker, cards); the cards of
   changed entries are embedded again in the background on the first search or live update after the pass.
   Measured on a copy of a real node when the vocabulary was introduced: 82% of journal files changed, entry
   counts stayed identical, about 22 minutes of card embedding, +0.5% index size (the file may keep free
   pages; the product does not vacuum).

## Boundaries To Preserve

- Raw traces, their rotation and manifests, restore and run-history display are read only.
- Only the service writes `work_journal/`; nothing outside the subsystem imports `rendering/**`
  or `store/**`.
- Adding a runtime means adding its translation to the registry in
  `rendering/runtimes/runtime-translation.ts`; until then its runs use the generic rule.
- Adding a platform tool means adding its converter in `rendering/platform/` (the completeness test
  fails until then); a tool only one runtime has goes in that runtime's table.
- Platform converters import no runtime translation and no tool module.
- The startup migration `20261019_remove_work_trace_exports` deleted the retired
  `work_traces/` export folders; current code does not know their layout.
