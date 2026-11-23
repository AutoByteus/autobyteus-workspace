# Requirements Document — agy-tool-result-content

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-001`
- Package identifier: `agy-tool-result-content`
- Request / ticket: Project Task `autobyteus-377` (Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`): the founder's report (2026-11-03, again 2026-11-23): the results of Antigravity's `view_file`, `read_file` and `grep_search` show only `{"provider_state": "DONE", "output": "3957 lines, 285596 bytes"}`, "we don't have such problem in other runtimes"; the Work Journal, made from the raw trace, inherits the gap.
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), for the founder
- Requirements owner: Solution Designer
- Date: 2026-11-23
- Approved by and reference: Solution Designer within the direction (the Task states the intended behavior: the raw trace and journal show what was read or found, as far as the CLI provides it; explain what cannot be fixed); the user is informed in the Solution Designer's conversation.
- Exact approved baseline: this document at `SR-001`. Supplements: none.

## Problem And Desired Outcome

- Problem: for Antigravity's read tools the CLI's event stream gives a size summary of the **whole file** instead of the lines read (`investigation-notes.md` F-01, F-02, F-11), and for `grep_search` and `find_by_name` it often gives nothing; AutoByteus records the stream as sent. The raw trace, the Activity tab, the Work Journal, `search_memory` and a switched agent that continues from the journal therefore know that a file was read, not what was read.
- Cause (established): the CLI's stream-json drops the content; the CLI does persist every step's full result text in its per-conversation transcript (F-03), which AutoByteus already reads for the lossy tool arguments (F-05).
- Desired outcome: for these tools the recorded result is the text the CLI gave the model, within a stated size bound, so the raw trace, the Activity tab and the journal say what was read or found; where the CLI offers nothing, today's summary stays and the reason is logged.
- Observable success: a scripted Antigravity run that reads lines 5–9 of a file records those five numbered lines in the raw trace and shows them in the journal as `Command: sed -n '5,9p' <path>` with the lines; a grep with matches records the matches; with the transcript unreadable the old summary is recorded and nothing fails.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Scenarios | Current | Desired | Preserved | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | SCN-001 | `read_file`/`view_file` results are `N lines, M bytes` of the whole file | The result is the lines viewed (with the CLI's range and numbering) | The tool's arguments, outcome, order and ids; other tools' results | F-01, F-03 |
| BEH-002 | System | SCN-002 | `grep_search` and `find_by_name` results are often empty | The result is the matches or found paths the CLI gave the model | As above | F-02 |
| BEH-003 | System | SCN-003 | A tool result the stream already carries (`run_command`, `list_dir`, MCP calls) is recorded as sent | Unchanged | The 560 omission, the 561 spill marker, MCP projection | F-02 |
| BEH-004 | System | SCN-004 | Not applicable (no recovery exists) | When the CLI's persisted result is missing, unreadable, not corroborated or too large to take whole, the stream's result (or its bounded head) is recorded; the turn continues; one warning names the run, step and reason | Turn flow, tool lifecycle events | F-05, F-08 |
| BEH-005 | System | SCN-005 | The journal shows a ranged read as "content not recorded: <file size>" | The journal shows the lines read, in the `cat -n` layout other runtimes use, without Antigravity's header and wrapper lines; a record that still holds only the size keeps its line | Journal vocabulary (331); other runtimes | F-09 |

## Stakeholders, Actors, And Outcomes

| Actor | Goal | Outcome | Constraint |
| --- | --- | --- | --- |
| The founder, an agent reading a journal or `search_memory`, a switched agent | Know what an Antigravity agent read or found | The content, as for Claude or Codex | The trace does not become huge; private data is not copied into fixtures |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases
| ID | Use Case | Scenarios |
| --- | --- | --- |
| UC-001 | The Antigravity backend records the persisted result of native tool steps whose stream result is a size summary or empty | SCN-001…004 |
| UC-002 | The Antigravity translation renders the recorded lines | SCN-005 |

### Out Of Scope
Raw traces already stored (no migration); other runtimes; MCP tool results; `run_command`'s exit code and the wrapper lines beyond the timestamp header (561's FU-1 remainder; autobyteus-183: exit code and file-change kind for Codex/Grok); native tool arguments of parallel calls (follow-up FU-2); the ACP move (autobyteus-386); the Activity tab's presentation; the CLI.

### Non-Goals
Recording content the CLI did not give the model; reconstructing results from the files on disk (they may have changed); a retry loop for a missing row beyond what the measurement (D-3) shows is needed.

### Preserved Behavior Boundary
BEH-003; the 560 omission rule; the 561 `read_file` converter and spill marker; the tool event lifecycle.

### Prerequisites
None.

### Review Authority
As the template.

## Requirements

| ID | Requirement | Behavior | Priority | Rationale | Feasibility | Source |
| --- | --- | --- | --- | --- | --- | --- |
| REQ-001 | When a native (non-MCP) Antigravity tool step completes with state DONE and the stream's result is absent or is a size summary of the form `<N> lines, <M> bytes`, the recorded result `output` is the text the CLI persisted for that step. | BEH-001, 002 | High | F-01…F-03 | Reproduced (probe); the owner exists (F-05) | The Task; DEC-1, 2 |
| REQ-002 | The persisted text is taken only when the step is identified exactly: the same conversation, the step's `GENERIC`/`DONE` row from the CLI, preceded in its call batch by a `PLANNER_RESPONSE` whose call at that position has the same tool name. Anything else records the stream's result unchanged. | BEH-004 | High | Never attach another step's content | Read (F-07) | DEC-4 |
| REQ-003 | A recovered result longer than 256 KiB (UTF-8) is recorded as its first 256 KiB plus a marker naming the number of bytes not recorded; a row over the scanner's row bound is not read. | BEH-004 | Medium | F-08; "large files must not make the trace huge" | Measured (CLI max 49 KB seen) | The Task; DEC-3 |
| REQ-004 | A missing, unreadable, unsafe, unidentified or oversized-row transcript never fails or delays the turn beyond the lookup's own bound: the stream's result is recorded and one warning `AGY_TOOL_RESULT_UNRECOVERED run=… step=… reason=…` is logged. | BEH-004 | High | F-05 failure mode | Read | DEC-4 |
| REQ-005 | The Work Journal shows a recovered `read_file`/`view_file` result as the lines read in the `cat -n` layout, drops Antigravity's `Created At`/`Completed At` header and its `Showing lines…`/`File Path`/`Total…`/numbering-sentence wrapper from the shown output, and keeps the range in the command (`sed -n 'a,bp'`); a record that holds only the size keeps today's line. | BEH-005 | High | F-09 | Pattern exists (AutoByteus, Claude) | DEC-5 |
| REQ-006 | The journal drops the leading `Created At`/`Completed At` header lines of every Antigravity result text. | BEH-005 | Medium | The recovered text carries the header twice; `run_command` previews carry it once (561 FU-1 part) | Read | DEC-5 |
| REQ-007 | `WORK_JOURNAL_RENDERER_REVISION` is raised (4 → 5). | BEH-005 | Medium | 331/560/561 precedent | Read | DEC-6 |
| REQ-008 | Raw traces already stored are not changed; no migration. | BEH-001…005 | High | The Task: no stored-data change without approval and a backup | Read | DEC-6 |

## Acceptance Criteria

| AC | Req | Scenario | Trigger | Expected | Verification |
| --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001, 002 | SCN-001 | Synthetic transcript and stream: `read_file` step with a size summary; the CLI row has `Showing lines 5-9 of 40` and five numbered lines | The `TOOL_EXECUTION_SUCCEEDED` result `output` is the row's content; the recorded raw trace holds it | Converter/backend unit test; scripted-CLI built-server case |
| AC-002 | REQ-001 | SCN-002 | `grep_search` and `find_by_name` steps whose stream output is `null` | `output` is the matches / found paths from the row | Unit test; scripted-CLI case |
| AC-003 | REQ-001 | SCN-003 | `run_command` and `list_dir` (stream has the text), an MCP call, `generate_image` | Unchanged; no transcript read for them | Unit test (no read is attempted) |
| AC-004 | REQ-002 | SCN-004 | Transcript rows: missing step; duplicate or out-of-order indices; a row that is not `GENERIC`/`DONE`; a planner row naming another tool; a multi-call batch where position 2 is asked and position 1 differs | Stream result recorded; warning with the reason; the turn completes | Reader unit tests |
| AC-005 | REQ-002 | SCN-001 | A parallel batch of two calls (`read_file`, `grep_search`) | Each result is its own row's content | Reader unit test |
| AC-006 | REQ-003 | SCN-004 | A recovered text of 300 KiB; a row of 3 MiB | First 256 KiB plus marker; the 3 MiB row is unreadable: stream result, warning | Reader unit tests |
| AC-007 | REQ-004 | SCN-004 | The brain folder is absent, a symlink, or the file is unreadable | Stream result; one warning; no exception | Reader unit tests; built-server case with no transcript |
| AC-008 | REQ-005 | SCN-005 | Journal render of a record with the recovered `read_file` content (ranged) | `Command: sed -n '5,9p' <path> → ok` and the five lines in `cat -n` layout; none of the header or wrapper lines | Renderer unit tests incl. `view_file`'s wrapper |
| AC-009 | REQ-005 | SCN-005 | Journal render of an old record: size-only result | `… → ok (content not recorded: N lines, M bytes)` as today | Renderer unit test |
| AC-010 | REQ-006 | SCN-005 | Journal render of a `run_command` result with the header | The two header lines are gone; the rest is as before | Renderer unit test; the 561 spill and wrapper tests adapted |
| AC-011 | REQ-007, 008 | SCN-001 | A closed journal written by revision 4 on a synthetic run | Rendered again by revision 5; the raw file byte-identical | Service test (as 560/561) |
| AC-012 | REQ-001 | SCN-001 | The real `agy` CLI, one live run on a synthetic file (read a range; grep; find) | The recorded results hold the lines/matches; the lag of the row after DONE is measured on at least 50 live steps and reported | Executed by API/E2E (live gate); evidence in the report |

## Relevant Scenarios And Journeys

| ID | Kind | Initiator | Goal | Trigger | Start | Steps | Outcome | Validity |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | System | Antigravity agent | Read part of a file | `read_file`/`view_file` | An Antigravity run | read | Lines recorded | Supported Normal Scenario (reproduced F-01) |
| SCN-002 | System | Antigravity agent | Search | `grep_search`, `find_by_name` | Same | search | Matches recorded | Supported Normal Scenario (measured F-02) |
| SCN-003 | System | Antigravity agent | A tool whose result the stream carries | `run_command`, `list_dir`, MCP | Same | call | Unchanged | Supported Normal Scenario |
| SCN-004 | System | Platform | The CLI's persisted result is unusable | Missing/changed layout | Same | read | Summary kept, warning | Supported Explicit Edge Scenario (the layout is undocumented, F-05, U-3) |
| SCN-005 | System | A reader of the journal | See what was read | Journal render | A recorded result | render | Lines shown | Supported Normal Scenario |

## UI, Interaction, And Experience Requirements
N/A — not applicable (the Activity tab shows the recorded `result` unchanged in shape; it will show the lines).

## Quality And Non-Functional Requirements

| ID | Related | Area | Requirement | Verification |
| --- | --- | --- | --- | --- |
| QR-001 | REQ-001, 004 | Performance | The lookup reads from the end of the transcript and stops at the step's row: at most the rows after it plus one batch; it never reads the whole file for a step near the end. Reading adds no wait beyond the bounded lookup | Reader unit test on a 50 MB synthetic transcript: bytes read are bounded |

## Data Continuity And Acceptable Loss

- Persisted data affected: new raw-trace records hold longer `tool_result` text for these tools (F-08: about 13 MB over the founder's 202 Antigravity runs if replayed); the journal and its manifest `renderer_revision` (derived, re-rendered once). Raw traces already stored are untouched; they keep the size-only text and render as today. No migration.

## External Contracts And Dependencies

| Contract | Constraint | Authority | Risk |
| --- | --- | --- | --- |
| The CLI's `transcript_full.jsonl` layout and its row timing | As measured on 1.5.15 and the stored conversations of earlier versions (465 conversations) | Undocumented (`agy-brain-file.ts` says so) | A change makes recovery return `null`: today's behavior plus a warning (U-3) |

## Supplemental Artifacts
`evidence/INV-01-live-timing-probe.mjs`.

## Assumptions
| ID | Assumption | Why | Validation | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | The persisted content equals what the model saw | The CLI writes it as the step's result | The sizes match the stream's byte counts (F-03) | Noted |

## Decisions
| ID | Question | Options / evidence | Reasoning and recommendation | Owner | Status |
| --- | --- | --- | --- | --- | --- |
| DEC-1 | Where does the content come from? | (a) the CLI's transcript the backend already reads for arguments; (b) `steps/<n>/output.txt`; (c) wait for ACP (386); (d) read the file from disk | (a): present for every tool step (26/26, 27/27), covers parallel calls, same reader module and failure mode as the arguments (F-05, F-06). (b) missing for read steps (0/26). (c) not delivered; a different runtime path, its timeline unknown (F-10). (d) shows today's file, not what the agent saw | Solution Designer | Decided |
| DEC-2 | Which tools? | Only `view_file`/`read_file`/`grep_search`/`find_by_name`, or a rule | A rule: a native DONE step whose stream result is absent or a size summary. It is evidence-based (F-02), covers new tools, touches no tool whose stream result is complete, and excludes MCP calls and `generate_image` (own paths). Write/edit tools gain their confirmation text, which the journal already shows as `→ ok` | Solution Designer | Decided |
| DEC-3 | Size bound and timing | 256 KiB per result; the lookup's wait | 256 KiB: far above the CLI's own bounds (max 49 KB seen), below the row bound (2 MiB), well below Claude's recorded reads. Timing: read at DONE (F-04); no retry unless the measurement of AC-012 shows misses: then one bounded re-read (≤ 5 × 40 ms), decided and recorded by the implementation | Solution Designer | Decided |
| DEC-4 | How strict, how safe? | Identify by index only, or by position and name; fail how? | Position and name (a wrong row would silently attach another step's content to a call); every miss keeps the stream result and logs one warning: the recorded result is never worse than today | Solution Designer | Decided |
| DEC-5 | Where is the header dropped? | In the recorded text, or in the journal | The raw trace keeps the CLI's text verbatim (it is evidence); the journal drops the plumbing (one rule in the Antigravity normalizer, which also removes the timestamp header from `run_command` previews: a part of 561's FU-1) | Solution Designer | Decided |
| DEC-6 | Revision and stored data | Bump or not; migrate | Bump 4 → 5 (the documented cache key; one re-render; only changed files re-indexed); no migration, the raw traces are not changed | Solution Designer | Decided |
| DEC-7 | One ticket or two with autobyteus-183? | 183: exit code and file-change kind that Codex and Grok report; here: result text of Antigravity reads | Two: different runtimes, different fields; 183 stays its own Task | Solution Designer | Decided |

## Traceability
| REQ | UC | BEH | AC | SCN |
| --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-001, 002 | AC-001, 002, 003, 012 | SCN-001…003 |
| REQ-002 | UC-001 | BEH-004 | AC-004, 005 | SCN-001, 004 |
| REQ-003 | UC-001 | BEH-004 | AC-006 | SCN-004 |
| REQ-004 | UC-001 | BEH-004 | AC-007 | SCN-004 |
| REQ-005 | UC-002 | BEH-005 | AC-008, 009 | SCN-005 |
| REQ-006 | UC-002 | BEH-005 | AC-010 | SCN-005 |
| REQ-007, 008 | UC-002 | BEH-001…005 | AC-011 | SCN-001 |

## Architecture Phase Input
Preserve the arguments reader's strictness and the converter's lookup-then-convert order; verify the lag (U-1) and a live `grep_search` row (U-2) in the first step.

## Readiness Check
Content ready: `Yes`. Approval recorded: `Yes`. Ready for design: `Yes`.
