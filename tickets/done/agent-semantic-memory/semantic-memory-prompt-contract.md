# Semantic Memory Prompt Contract

The exact instruction text an agent receives about its semantic memory, where it
goes and when it appears. Implementation copies this text; it does not write its
own. Tests compare against the examples below.

- Package: `agent-semantic-memory` (Task autobyteus-12)
- Owner: Solution Designer. Requested by the user on 2026-11-10 ("write the prompt
  into a contract file … so the implementation engineer doesn't invent it").
- Realizes: REQ-005 (content), REQ-004 (same path for every run), REQ-008
  (absent when off), REQ-009 (composed at start/restore); AC-001, AC-005.
- Status: Current (SR-004). A change to this text is a requirements change
  (renewed approval).

## 1. When the section is present

| Case | Section |
| --- | --- |
| The run's effective agent definition has `semanticMemoryEnabled: true` (from `agent-config.json` or a personal setting) | Present |
| `semanticMemoryEnabled` absent or `false` | Absent: no heading, no text, no extra blank line. The whole prompt is byte-identical to the base branch's for the same inputs. |

It is the same for every runtime (AutoByteus, Codex, Claude, Grok, DeepSeek
harness, Antigravity) and every run kind (standalone, team member, Org member,
delegated copy). It is decided each time instructions are composed (run create,
and restore where the runtime composes again).

## 2. The exact text

The section is exactly these three lines (a heading, one empty line, one
paragraph), with `<FOLDER>` replaced by the folder path (§3):

```text
## Semantic Memory

Your semantic memory is the folder `<FOLDER>`. It belongs to you and is shared by all your runs, in every Project and team. Write the reusable knowledge you learn there as documents; how you organize them is up to you and your skills.
```

- One paragraph, no line breaks inside it, no trailing spaces, no trailing newline
  of its own (the composer joins sections with one empty line, `"\n\n"`).
- The path is wrapped in single backticks, as `Agent workspace` is in the
  Working Environment section.
- Wording is fixed: "Project" and "team" as written (capital P, the glossary's
  Project); no extra rules (structure, concurrency, secrets) — the user's
  decision DEC-010.
- `<FOLDER>` is a placeholder of this document only; the code renders the path
  directly (the composer already refuses unresolved `{{…}}` placeholders).

## 3. The folder path

- `<memory dir>/semantic/<encodeURIComponent(agent definition ID)>`, where
  `<memory dir>` is the server's memory directory (`appConfig.getMemoryDir()`,
  normally `<server data dir>/memory`).
- Absolute, resolved, with the platform's separators, no trailing separator.
- Rendered exactly as `AgentSemanticMemory.folderOf(definition)` returns it; the
  composer does not change it and asserts it is absolute.

| Definition ID | Folder name |
| --- | --- |
| `computer-use-operator` (shared) | `computer-use-operator` |
| `team-local-agent:marketing-team:marketing-reply-scout` (team-local) | `team-local-agent%3Amarketing-team%3Amarketing-reply-scout` |

## 4. Placement

Sections in composition order (existing order unchanged; the new section is
inserted at ★):

1. `## Agent Identity`
2. `## Team Instruction` (members with an authored team instruction)
3. collaboration sections (`## AgentTeam Addressing`, `## Working With Other Agents`, … per role)
4. `## Project` (runs started under a Project)
5. ★ `## Semantic Memory` (enabled agents)
6. native AutoByteus only: `## Working Environment`, `## Bash Operating Practice`, `## File And Directory Practice`

So it follows the last shared section that is present and comes before the
native-only sections.

## 5. Examples (exact excerpts)

### 5.1 Enabled, standalone, under a Project, native AutoByteus

Memory dir `/home/u/.autobyteus/server-data/memory`, definition `computer-use-operator`,
Project "Marketing" (`project_abc`), workspace `/home/u/work/marketing`. The prompt
contains exactly this run of text (the Project section is the existing one):

```text
## Project

You work in the Project Marketing (Project ID project_abc). Use this Project ID with the Project tools; ask the user before working on another Project.

## Semantic Memory

Your semantic memory is the folder `/home/u/.autobyteus/server-data/memory/semantic/computer-use-operator`. It belongs to you and is shared by all your runs, in every Project and team. Write the reusable knowledge you learn there as documents; how you organize them is up to you and your skills.

## Working Environment

- Agent workspace: `/home/u/work/marketing`
```

### 5.2 Enabled, team member, no Project, Codex (shared composer)

The same agent as member `computer_use_operator` of a team run not started under
a Project: the prompt ends with the last collaboration section, one empty line,
then the Semantic Memory section with the **same folder** as 5.1, and nothing
after it.

### 5.3 Enabled on Windows

```text
Your semantic memory is the folder `C:\Users\u\.autobyteus\server-data\memory\semantic\computer-use-operator`. It belongs to you …
```

### 5.4 Disabled

No `## Semantic Memory` heading anywhere; for 5.1's inputs the Project section
is followed directly (one empty line) by `## Working Environment`, exactly as on
the base branch.

## 6. Verification

- Unit (composer): 5.1 excerpt exact; 5.2 ends with the section; 5.4 output equal
  to the output for the same inputs without the feature (`semanticMemoryPath: null`);
  a relative path is refused.
- Unit (layout/owner): §3 table.
- Real-runtime E2E: the run's captured instructions (where the runtime records
  them) contain the 5.1 paragraph with the real path.
