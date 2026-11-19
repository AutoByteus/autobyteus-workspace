# Requirements Document — journal-omit-agy-schema-reads

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-001`
- Package identifier: `journal-omit-agy-schema-reads`
- Request / ticket: Project Task `autobyteus-560` (Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`), the founder's observation of 2026-11-19: Antigravity CLI reads an MCP tool's schema file before each lazily loaded MCP tool; those reads are runtime plumbing and clutter the Work Journal and memory search.
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), for the founder
- Requirements owner: Solution Designer
- Date: 2026-11-19
- Approved by and reference: Solution Designer within the direction (the Task states the intended behavior in its Direction); the user is informed in the Solution Designer's conversation.
- Exact approved baseline: this document at `SR-001`. Supplements: none.

## Problem And Desired Outcome

- Problem: every lazily loaded MCP tool on Antigravity CLI is preceded by a read of its schema file, and the Work Journal shows it (`Tool: read_file Path=".../mcp/<server>/<tool>.json" → ok`, or `Command: cat …`). Other runtimes never produce these lines; they say nothing about the agent's work and make the journal and `search_memory` noisier (`investigation-notes.md` F-01…F-04).
- Desired outcome: the rendered Work Journal of an Antigravity CLI run does not show successful reads of Antigravity's MCP schema files; the raw traces keep every call.
- Observable success: the journal of a synthetic Antigravity run with a schema read followed by an MCP call shows the MCP call and not the read; the raw trace file still holds both records.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Scenarios | Current | Desired | Preserved | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | SCN-001 | A successful schema read is a journal line (generic `Tool: read_file …` or `Command: cat …`) | No journal line, no card text for it | Raw traces untouched; every other call renders as today | F-02, F-03 |
| BEH-002 | System | SCN-002 | A failed schema read is a journal line with its failure | Unchanged: shown | The failure text | F-08 |
| BEH-003 | System | SCN-003 | A read of any other file (including a repository's own `mcp/…/*.json`, skill files, the spilled-output files) renders as today | Unchanged | All existing rendering and other runtimes | F-04, F-10 |

## Stakeholders, Actors, And Outcomes

| Actor | Goal | Outcome | Constraint |
| --- | --- | --- | --- |
| The founder / users of memory search | A journal that records the agent's work | No runtime plumbing lines | Nothing real is hidden |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases
| ID | Use Case | Scenarios |
| --- | --- | --- |
| UC-001 | The journal of an Antigravity CLI run omits successful reads of Antigravity's MCP schema files | SCN-001…003 |

### Out Of Scope
Raw traces; other runtimes; the `read_file` table entry (follow-up FU-1); the spilled-output reads under `.system_generated` (follow-up FU-2); the journal format, limits and header; the `call_mcp_tool` unwrap; memory search's own logic; any change to the founder's stored data by hand.

### Non-Goals
Hiding any read that is not an Antigravity MCP schema file; guessing other layouts of the Antigravity data folder (U-1).

### Preserved Behavior Boundary
BEH-002, BEH-003; the 331 vocabulary and the skill-load rule.

### Prerequisites
None.

### Review Authority
As the template.

## Requirements

| ID | Requirement | Behavior | Priority | Rationale | Feasibility | Source |
| --- | --- | --- | --- | --- | --- | --- |
| REQ-001 | The journal of an Antigravity CLI run omits a tool call (and its result) that successfully reads one file of Antigravity's MCP folder, `<home>/.gemini/antigravity*/mcp/<server>/<tool>.json` or `<server>/instructions.md`, whether done by the read tools (`read_file`, `view_file`) or by a plain shell read (`cat`, `sed -n`, `head`, `nl` of that one file) in `run_command` or `Bash`. | BEH-001 | Medium | F-01…F-03 | Measured shapes (F-02) | The Task |
| REQ-002 | A schema read that fails, or whose result is not in the same journal file, stays visible as today. | BEH-002 | Medium | F-08; no hidden breakage | Read | The Task ("keep failed reads visible") |
| REQ-003 | Only Antigravity's own MCP folder is matched; a read of any other path renders unchanged, on every runtime. | BEH-003 | High | F-04 | Measured | DEC-1 |
| REQ-004 | Raw traces are not altered. | BEH-001 | High | The Task | Read | The Task |
| REQ-005 | Journals already rendered are brought in line without a data migration. | BEH-001 | Medium | F-07 | Read | DEC-2 |

## Acceptance Criteria

| AC | Req | Scenario | Trigger | Expected | Verification |
| --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001 | SCN-001 | Synthetic Antigravity records: `read_file {Path: <synthetic>/.gemini/antigravity-cli/mcp/example_server/example_tool.json}` with a DONE result, then an MCP call | The journal has the MCP call and no line for the read; the result record is not an orphan | Renderer unit test |
| AC-002 | REQ-001 | SCN-001 | The same with `view_file {AbsolutePath}`; with `run_command` `cat <path>`, `sed -n '1,60p' <path>`; with `Bash` `cat <path>`; with `instructions.md`; with the data folder `.gemini/antigravity` | Omitted | Renderer unit tests |
| AC-003 | REQ-002 | SCN-002 | The same read with an error result (e.g. file not found) or a non-DONE state; a read with no result in the file | The line is shown as today | Unit tests |
| AC-004 | REQ-003 | SCN-003 | Antigravity reads of: an ordinary file; a repository path with `/mcp/<x>/<y>.json` outside `.gemini/antigravity*`; a `.system_generated/.../output.txt`; a skill file; a `cat` of two files; and the same schema path on the Claude, Codex and generic runtimes | Rendered exactly as before | Unit tests (the existing rendering tests stay green) |
| AC-005 | REQ-004 | SCN-001 | Render through the journal service from a raw-trace folder holding the schema read | The raw file still holds both records; the journal omits them; the manifest's record counts are the raw counts | Service-level test |
| AC-006 | REQ-005 | SCN-001 | A closed journal written by the previous revision | It is rendered again by the new revision and loses the schema lines; an unaffected file is byte-identical | Service test on a synthetic run (`WORK_JOURNAL_RENDERER_REVISION` raised) |

## Relevant Scenarios And Journeys

| ID | Kind | Initiator | Goal | Trigger | Start | Steps | Outcome | Validity |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | System | Antigravity agent | Call a lazily loaded MCP tool | The agent reads the tool's schema file, then calls it | An Antigravity run with MCP tools | read, call | Journal shows the call only | Supported Normal Scenario (measured, F-01/F-02) |
| SCN-002 | System | Antigravity agent | Same, but the lookup is broken | The schema read fails | Same | read (error), call | The failed read is visible | Supported Explicit Edge Scenario (the Task asks for it) |
| SCN-003 | System | Any agent | Read other files | Any other read | Any run | read | Unchanged | Supported Normal Scenario |

## UI, Interaction, And Experience Requirements
N/A — not applicable.

## Quality And Non-Functional Requirements
None beyond: the rule is pure (no I/O), like the renderer.

## Data Continuity And Acceptable Loss

- Persisted data affected: `Yes` (derived): the Work Journal files and manifest `renderer_revision`. Must be preserved: raw traces, everything else. Acceptable: re-rendering journals and re-indexing the changed files once (F-07). No migration; the journal is derived and disposable.

## External Contracts And Dependencies

| Contract | Constraint | Authority | Risk |
| --- | --- | --- | --- |
| Antigravity CLI's MCP schema folder layout and tool names | `.gemini/antigravity*/mcp/<server>/…`; `read_file`/`view_file` | Measured on two hosts (F-01, F-02); not a documented contract | A different layout keeps the lines visible (U-1) |

## Supplemental Artifacts
None.

## Assumptions
| ID | Assumption | Why | Validation | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | A schema read always stays within one read call | The measured shapes | F-02 | Noted |

## Decisions
| ID | Question | Options / evidence | Reasoning and recommendation | Owner | Status |
| --- | --- | --- | --- | --- | --- |
| DEC-1 | How is "an Antigravity schema read" recognized? | (a) by path only on every runtime; (b) by the Antigravity runtime plus its MCP folder path; (c) also by the next call being `call_mcp_tool`; (d) by the file name `*.json` only | (b): the noise is Antigravity-specific, so the Antigravity translation owns it (the architecture's runtime table); the path `<home>/.gemini/antigravity*/mcp/<server>/<file>` is the precise marker, so a repository's own `mcp/…` files (F-04) and other runtimes are never touched; (c) adds order dependence; (d) matches real files | Solution Designer | Decided |
| DEC-2 | Raise `WORK_JOURNAL_RENDERER_REVISION` (2 → 3)? | Without it, closed journals already written keep the lines until a user runs Rebuild with regenerate (the cache key says a closed file is reused only when the current rules wrote it); with it, the next Journals pass renders every run again (cost: reading the journals of 4,443 runs; re-index only of changed files: at most 231 of 9,136 files, F-04; 331 changed 82% of files) | Raise it: the revision is the documented cache key for exactly this change, the rebuild is deterministic and uses no model, and a journal that mixes eras of rules would keep the clutter in `search_memory` for the oldest runs, which is the complaint. Re-index impact is small (the changed files only). Recorded in the design's persisted-data decision | Solution Designer | Decided |
| DEC-3 | Failed and result-less reads? | The Task: "keep failed schema reads visible, or confirm the edge case" | Failed: shown. A read with no result in this file (interrupted, or result in the next file): shown, because "successful" is not known; a result without its call stays an orphan line (unchanged) | Solution Designer | Decided |

## Traceability
| REQ | UC | BEH | AC | SCN |
| --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-001 | AC-001, 002 | SCN-001 |
| REQ-002 | UC-001 | BEH-002 | AC-003 | SCN-002 |
| REQ-003 | UC-001 | BEH-003 | AC-004 | SCN-003 |
| REQ-004 | UC-001 | BEH-001 | AC-005 | SCN-001 |
| REQ-005 | UC-001 | BEH-001 | AC-006 | SCN-001 |

## Architecture Phase Input
Owner is the Antigravity translation; preserve the 331 lookup order and the revision cache key; verify the revision effect with a service test.

## Readiness Check
Content ready: `Yes`. Approval recorded: `Yes`. Ready for design: `Yes`.
