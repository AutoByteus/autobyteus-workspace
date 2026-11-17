# Episodic Catalog Contract

The exact files the system writes for an agent's episodic memory, what each
holds, and the exact text of each line. Implementation renders exactly this; it
does not invent its own wording or fields. Tests compare against the examples
below.

- Package: `per-agent-episodic-catalog` (Task autobyteus-493)
- Owner: Solution Designer. Requested by the user on 2026-11-17 ("create a
  contract file … the file and attribute to the content").
- Realizes: REQ-001 (folder), REQ-002 (entry fields), REQ-003 (one Markdown
  file, header), REQ-004 (privacy, About), REQ-009 (overview), REQ-010 (written
  only when changed); AC-001, AC-003, AC-008, AC-013.
- Status: Current (SR-002). A change to a file, field or line here is a
  requirements change (renewed approval).

## 1. The files

| File | One per | Written by | Read by |
| --- | --- | --- | --- |
| `<memory>/episodic/index.md` | node | the system | agents (memory analysis, observer) |
| `<memory>/episodic/<folder name>/catalog.md` | agent definition with at least one run on the node, or an existing catalog folder | the system | the agent itself, memory-analysis agents |

- `<memory>` is the server's memory folder (`appConfig.getMemoryDir()`,
  normally `<server data dir>/memory`).
- `<folder name>` is `encodeURIComponent(<agent definition id>)`, exactly the
  name of the agent's semantic memory folder (`<memory>/semantic/<folder name>`).

| Agent definition id | Folder name |
| --- | --- |
| `project-task-manager` | `project-task-manager` |
| `team-local-agent:software-engineering-team:solution-designer` | `team-local-agent%3Asoftware-engineering-team%3Asolution-designer` |

- Nothing else is written under `<memory>/episodic/`, and nothing outside it.
  No JSON, no state file, no lock file (temporary files of an atomic write are
  removed by the rename).
- Files are UTF-8, `\n` line endings, ending with exactly one `\n`.
- A file is written only when its new content differs from the file on disk,
  and then as a whole (write a temporary file, then rename).

## 2. catalog.md

### 2.1 Shape

```text
# Episodic catalog: <agent name>

<N> runs, oldest first.
Maintained by the system: do not edit. Each run's Work Journal stays in its run folder; this catalog only points to it and quotes no conversation.

<entry>

<entry>
…
```

- Line 1: `# Episodic catalog: ` + agent name (§2.3).
- Line 3: `<N> runs, oldest first.`; for one run `1 run, oldest first.`; for none
  `0 runs.`
- Line 4: the fixed sentence above, exactly.
- Then each entry (§2.2), separated by one empty line. A catalog with no runs
  ends after line 4.

### 2.2 One entry

```text
## <start> → <last activity> UTC · <run id>
- About: <Task title>
- Workspace: `<workspace path>`
- Journal: `<journal folder path>`
  - <file name> · <from> – <to> · <size>
  - <file name> · <from> – <to> · <size>
```

| Attribute | Line | Source | Rule | When absent |
| --- | --- | --- | --- | --- |
| start | heading | the first journal file's start time (its header); without a journal, the start the run's records hold | `YYYY-MM-DD HH:MM` (UTC, minutes) | Heading reads `## start unknown · <run id>` |
| last activity | heading | the last journal file's end time (its header) | `YYYY-MM-DD HH:MM` (UTC) | Heading reads `## <start> UTC · <run id>` (no arrow) |
| run id | heading | the run folder's name | as is | never absent |
| About | `- About: ` | the title of the run's current Project Task (Task records, any role: assigned, sub-work, brought in) | the title as stored, line breaks replaced by one space, trimmed | the line is left out (no Task, a Task without a Project, or a Task that cannot be read) |
| Workspace | `- Workspace: ` | the run's recorded workspace root | absolute path in single backticks | the line is left out |
| Journal folder | `- Journal: ` | the run's `work_journal` folder | absolute path in single backticks, no trailing separator | `- Journal: no journal yet (run folder `<run folder path>`)` and no file lines |
| Journal file | `  - ` (two spaces, dash) | each file the run's journal manifest lists, in manifest order | `<name> · <from> – <to> · <size>` | a file whose header has no time range: `<name> · <size>` |
| from / to | file line | the file's header time range | `YYYY-MM-DD HH:MM` both sides (UTC is in the heading); a header range within one day (`2026-11-18 10:00 – 11:00 UTC`) is written with the full date on both sides | see above |
| size | file line | the file's size in bytes | under 1,024: `<n> B`; under 1,048,576: `<n> KB` (rounded, base 1,024); else `<n.n> MB` (one decimal, base 1,048,576) | never absent |

Entry order: by start, oldest first; entries with `start unknown` last; equal
starts by run id. The runs of every kind (standalone, delegated copy, team
member, task agent, org member) are listed alike.

### 2.3 Agent name

One rule: the newest run's `agentName` exactly as run-folder discovery reports
it, with no transformation. Today that is, for a standalone run, the run-history
row's agent name (else the definition id, else the name discovery derives from
the folder); for a team or org member, the basename of its member address (for
`/sub_team/writer`, `writer`). A catalog with no runs uses its decoded
definition id.

### 2.4 Never in a catalog (privacy and scope)

- Any text from a message, tool call, tool result, journal line or Task
  description; the run-history summary (it is the user's first message).
- The Task key, the team, org or member address, who delegated the run, the
  node, the runtime or model, the run's state (running, archived), a file's
  open/closed state, an "updated" time, a content hash.

### 2.5 Example

```text
# Episodic catalog: solution_designer

2 runs, oldest first.
Maintained by the system: do not edit. Each run's Work Journal stays in its run folder; this catalog only points to it and quotes no conversation.

## 2026-11-17 15:36 → 2026-11-18 09:10 UTC · solution_designer_703182187282472484b90793eac8be40
- About: A per-agent episodic index: a system-maintained timeline of all runs (and their work journals) of one agent definition
- Workspace: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo`
- Journal: `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_a7e92f8ba01f4a1aa0c3b88a5d633d16/solution_designer_703182187282472484b90793eac8be40/work_journal`
  - work_journal_000001.md · 2026-11-17 15:36 – 2026-11-18 02:10 · 1.5 MB
  - work_journal_active.md · 2026-11-18 02:10 – 2026-11-18 09:10 · 120 KB

## 2026-11-18 10:02 UTC · solution_designer_9b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e
- Workspace: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo`
- Journal: no journal yet (run folder `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_0f1e2d3c4b5a69788796a5b4c3d2e1f0/solution_designer_9b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e`)
```

## 3. index.md

```text
# Episodic catalogs on this node

One folder per agent; each holds catalog.md.

- <agent name> · `<folder name>/catalog.md` · <N> runs · last activity <YYYY-MM-DD HH:MM> UTC
- …
```

| Attribute | Rule |
| --- | --- |
| agent name | as in §2.3 |
| folder | `<folder name>/catalog.md`, relative to `<memory>/episodic/`, in single backticks |
| runs | `<N> runs`, `1 run`, `0 runs` |
| last activity | the newest last activity among the agent's runs; `no activity` when none has a journal |
| order | by agent name, then folder name |

Example:

```text
# Episodic catalogs on this node

One folder per agent; each holds catalog.md.

- Project Task Manager · `project-task-manager/catalog.md` · 3 runs · last activity 2026-11-17 16:00 UTC
- solution_designer · `team-local-agent%3Asoftware-engineering-team%3Asolution-designer/catalog.md` · 597 runs · last activity 2026-11-18 09:10 UTC
```

## 4. When the files change

| Event | Files rewritten (only if their content changed) | Within |
| --- | --- | --- |
| A run's journal file is written or removed | that run's agent's `catalog.md` (all runs of its root are refreshed), `index.md` | 60 s (a pass starts 5 s after the latest request, at most 30 s after the oldest) |
| A run (agent, team or org) is deleted | the catalogs of the agents its runs belonged to, `index.md` | 60 s |
| A run is archived | nothing | — |
| Server start | every catalog whose content differs from what the records and journals give now, including agents whose runs are all gone (they become `0 runs.`), and `index.md` | background, after start |

A hand-edited catalog is rewritten at the next event or start that touches it.
