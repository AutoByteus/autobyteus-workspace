# Agent Episodic Catalog

## Scope

`src/agent-episodic-catalog` keeps, for every agent definition with runs on this node, an **episodic catalog**: one
Markdown file that lists that agent's runs in time order and points to their Work Journals. One agent definition runs
standalone, as a delegated copy, as a team member and as an org member, so its history is spread over many run folders;
the catalog lets a memory-analysis agent (the reflection skill, the observer team, a "dream" pass) read an agent's whole
history on the node from one file, with its file tools.

The journals stay in their run folders; the catalog only points to them. It never renders a journal and never writes
in a run folder: it writes only under `<memory>/episodic/`. The word is defined in
[GLOSSARY.md § Memory](../../../GLOSSARY.md#memory). It is unrelated to the retired `episodic.jsonl` rows of old run
folders (see [agent_memory.md](agent_memory.md)).

## Files

```text
<memory>/episodic/
  index.md                                   the node overview: every agent that has a catalog
  <encodeURIComponent(agentDefinitionId)>/
    catalog.md                               that agent's runs, oldest first
```

- `<memory>` is the server's memory folder (`appConfig.getMemoryDir()`).
- The folder name is the agent's semantic memory folder name (`AgentMemoryLayout.getAgentEpisodicDirPath`, the same
  encoding as `getAgentSemanticMemoryDirPath`): `project-task-manager`,
  `team-local-agent%3Asoftware-engineering-team%3Asolution-designer`. A reader that knows an agent's semantic folder
  finds its catalog at `<memory>/episodic/<same name>/catalog.md`.
- Files are UTF-8 with `\n` line endings. Nothing else is written there: no JSON, no state file, no lock file.

## Format

The exact lines were fixed by the ticket's contract, kept with the archived ticket
([episodic-catalog-contract.md](../../../tickets/done/per-agent-episodic-catalog/episodic-catalog-contract.md),
autobyteus-493); the renderer (`rendering/catalog-markdown-renderer.ts`) and its unit tests follow it. Agents and
skills read these lines, so a change to one is a change of behavior: change the renderer, its tests and this section
together.

```md
# Episodic catalog: solution_designer

2 runs, oldest first.
Maintained by the system: do not edit. Each run's Work Journal stays in its run folder; this catalog only points to it and quotes no conversation.

## 2026-11-17 15:36 → 2026-11-18 09:10 UTC · solution_designer_7031…
- About: <the title of the run's current Project Task>
- Workspace: `/Users/me/repo`
- Journal: `<run folder>/work_journal`
  - work_journal_000001.md · 2026-11-17 15:36 – 2026-11-18 02:10 · 1.5 MB
  - work_journal_active.md · 2026-11-18 02:10 – 2026-11-18 09:10 · 120 KB

## 2026-11-18 10:02 UTC · solution_designer_9b1c…
- Workspace: `/Users/me/repo`
- Journal: no journal yet (run folder `<run folder>`)
```

- **Entry:** start → last activity (UTC minutes), run ID; About (the Task title, when the Task records name one);
  Workspace; the journal folder and, per journal file, its name, the time range its header states and its size. Nothing
  else: no team, org or member address, delegation, node, runtime, run state, Task key or file state.
- **Start** is the first journal file's start; without a journal, the start the run's records hold; else
  `## start unknown · <run id>`. **Last activity** is the last journal file's end; without one the heading has no arrow.
- **Order:** by start, oldest first; `start unknown` last; equal starts by run ID.
- **Header name:** the newest run's agent name exactly as run-folder discovery reports it (the run-history row's name
  for an agent run, the member address's last part for a team or org member). A catalog whose runs are all gone lists
  `0 runs.` and is named by its decoded folder name, which is the agent definition ID.
- **Lines:** a title (the Task's title) is written on one line: line breaks become one space and the ends are
  trimmed. A journal file line is `<name> · <from> – <to> · <size>`, or `<name> · <size>` when its header states no
  time range. A size under 1,024 bytes reads `<n> B`, under 1 MB `<n> KB` (rounded), else `<n.n> MB`. A run without a
  recorded workspace has no Workspace line.
- **index.md:** the title `# Episodic catalogs on this node` and the line `One folder per agent; each holds
  catalog.md.`, then one line per agent, `- <agent name> · \`<folder>/catalog.md\` · <N> runs · last activity <time>
  UTC` (or `no activity`), ordered by agent name, then folder name.

## Privacy

An entry is built (`services/catalog-entry-builder.ts`) from exactly three inputs: the run as discovery attributes it,
its journal files' header spans and the title of its current Project Task. So no text from a message, tool call, tool
result, journal line or Task description can reach a catalog, and never the run-history summary (the user's first
message). The title comes from `DelegationIndex.currentTaskOf(run)` (any role: assigned, sub-work, brought in) and
`ProjectTaskService.taskTitleOf(taskId)`, which returns the title only; a Task with no Project has none.

## Which runs

Runs come from `RunFolderDiscovery` (`src/agent-memory/services/run-folder-discovery.ts`), the one owner of "which
run folders exist and whose are they", shared with memory search. Discovery gives each run one attribution
(`DiscoveredRun.attribution`), and the catalog switches on it:

- `attributed`: the agent definition its records name: the run metadata of an agent run (delegated or not), the
  configured placement of a team or org member. Only these runs get entries. (The run history lists an agent run only
  when its metadata is present, so a history row never decides the definition.)
- `unattributed`: no record names an agent (old folders without metadata, agent-root collaboration folders, a team
  folder no tree lists). Not catalogued, silently.
- `unreadable`: the record that would name it exists but cannot be read: a team or org root's tree the run-package
  readiness index did not admit (`team_run_execution_tree.json`, `agent_org_run_execution_tree.json`; a failed scan of
  every root marks every unlocated team member folder), or an agent run's `run_metadata.json` that exists but cannot be
  read (with or without a history row). Not catalogued; discovery logs `RUN_FOLDER_DISCOVERY_RECORD_UNREADABLE { root, record, reason,
  runFolders }`, one line per root and record and reason (`runFolders`: how many run folders it leaves out), at most once
  in a discovery instance's lifetime. The catalog's and memory search's discoveries each log it once per server start;
  a refresh of that root does not repeat it, and a changed reason logs again. `record` names the file that would have
  named the run's definition (the family's tree file, or `run_metadata.json`). When the run package itself is at fault
  (`ROOT_RUN_PACKAGE_MANIFEST_INVALID`, `…_NOT_DIRECTORY`, `ROOT_RUN_FAMILY_CONFLICT`, `FAILED_ATTEMPT`), `record`
  still names the tree file although the tree is not the broken record; `reason` starts with the diagnostic's own code,
  which says what is wrong.

Recorded ID forms are used as they are: runs recorded under an older ID form get their own folder. Imported memory
(`memory/imports/`) and other nodes are not included; Memory Sync does not carry `episodic/`. Archived runs stay
listed; deleted runs leave.

## Keeping It Current

`EpisodicCatalog` (`services/episodic-catalog.ts`) is the governing owner. It keeps every catalog's entries in memory
and never reads its own files back.

- **Start** (`start({ taskTitles })`, once): subscribes to `WorkJournalService.onJournalChanged` and runs the start
  pass in the background: one `RunFolderDiscovery.findRuns()`, every existing catalog folder
  (`EpisodicCatalogStore.listCatalogDefinitionIds`), each attributed run's `readJournalSpans`, then every catalog and
  `index.md`. Server start and runs are not delayed.
- **Journal change:** the changed run folder's root (`RunFolderDiscovery.rootOf`) is queued; a pass refreshes each
  queued root with `findRunsOfRoot(root)`, replacing all of that root's entries.
- **Delete:** after a committed delete, `AgentRunHistoryService`, `TeamRunHistoryService` and `AgentOrgRunService` call
  `runDeleted(root)`; the next pass drops the root's entries. Archive tells it nothing.
- **Timing:** a pass starts 5 s after the latest request and at most 30 s after the oldest; one pass at a time, the
  start pass first.
- **Writes:** `EpisodicCatalogStore` writes a file only when its content differs from the file on disk, as a whole
  (a temporary file renamed over it). A catalog has no "updated" time, so an unchanged catalog is never rewritten, and a
  hand-edited one is rewritten at the next pass that touches it or the next start.
- **A journal manifest that cannot be read** (present, but not JSON or without a file list): the run is left out and
  the catalog logs `EPISODIC_CATALOG_RUN_LEFT_OUT { root, run, reason }`, once per run and reason for the catalog's
  lifetime. A run with no manifest at all is listed with "no journal yet".
- **Failures** are logged and never reach a run, a journal update or a delete: `EPISODIC_CATALOG_REFRESH_FAILED` (a
  root, or a run whose Task title or journal headers fail unexpectedly; that run is left out),
  `EPISODIC_CATALOG_WRITE_FAILED`, `EPISODIC_CATALOG_PASS_FAILED`.
- **Stop** (`stop()`): unsubscribes and waits for the running pass; waiting requests are dropped, because the next
  start rebuilds everything.

## Composition

Both composition roots that run agents keep catalogs for their own memory folder, `buildStudioServer` and
`startStandaloneApplicationHost`, in the same order: after steps 1–2 (`composeTaskSide`) they create it with
`createEpisodicCatalog({ memoryDir, journals: getWorkJournalService(), tasks: taskSide.tree })`; step 3
(`createGeneralProcessRunSupervisor`) and steps 4–8 (`composeCollaboration`) pass it to the three run services as
`Pick<EpisodicCatalog, "runDeleted">`; right after `composeCollaboration` the root calls
`start({ taskTitles: collaboration.tasks })`; it stops it when it closes.

The Memory page reads the catalogs too (autobyteus-554): `agentDefinitionIds()`, `runsOf(id)` (the entries in memory,
any order) and `whenStartPassDone()` (settles when the start pass has ended, built, failed or stopped; never rejects).
The explorer service is built per GraphQL request, so it reaches the catalog through a process binding: each root calls
`setProcessEpisodicCatalog(catalog)` right after creating it (before the HTTP server serves) and
`releaseProcessEpisodicCatalog(catalog)` after stopping it; `getProcessEpisodicCatalog()` throws
`EPISODIC_CATALOG_NOT_COMPOSED` when no root has set it. The catalog does not use the explorer.

## Key Source Files

- Owner: `src/agent-episodic-catalog/services/episodic-catalog.ts`
- Entry and privacy rule: `src/agent-episodic-catalog/services/catalog-entry-builder.ts`
- Markdown: `src/agent-episodic-catalog/rendering/catalog-markdown-renderer.ts`
- Files: `src/agent-episodic-catalog/store/episodic-catalog-store.ts`
- Types: `src/agent-episodic-catalog/domain/episodic-catalog-models.ts`
- Run attribution: `src/agent-memory/services/run-folder-discovery.ts`
- Journal spans: `WorkJournalService.readJournalSpans` ([agent_work_journal.md](agent_work_journal.md))
