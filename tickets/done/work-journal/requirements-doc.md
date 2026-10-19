# Work Journal — requirements

## Status
- Package work-journal; revision SR-014; status **Approved**. The SR-008 corrections stay within the approved direction. The SR-014 content scope change (DEC-W11) was approved by the user on 2026-10-19 (U23–U28). DEC-W12 (rollback rule) is the user's decision (U29–U31). The user delegated the remaining decisions (U17); approved by the Solution Designer within the user's stated direction.
- Workspace /Users/normy/autobyteus_org/autobyteus-worktrees/work-journal; branch codex/work-journal; base origin/personal @ 55bff1f5e (refreshed 2026-10-18); finalization target origin/personal.
- Program: Step 1B of runtime-independent agent memory (Step 1A per-runtime compaction rotation complete for all five runtimes). Step 2 (work notes: one note per journal file, then combined notes) follows and is out of scope here.
- Evidence: investigation-notes.md J01, U01–U03; earlier findings in the archived runtime-work-transfer-analysis (E16–E21, E28, E41, E45–E49) re-checked on 2026-10-07: the existing work-trace export (autobyteus-server-ts/src/agent-work-traces) is used only by skill improvement; its renderer still drops reasoning, system notices and system instructions, labels teammate messages as "user", ignores attachments, and caps values at 20,000 characters without a marker or pointer.

## Problem
Raw traces record each runtime's own vocabulary (shell = run_bash / Bash / run_command; read = read_file / Read / view_file; edit = edit_file / Edit / replace_file_content …; J01). Reading an agent's past work requires knowing each runtime's tools, and the existing export loses or mislabels information. The memory program needs one readable, runtime-independent record of the work, split into stable files that work notes can later summarize one by one.

## Vocabulary
- **Raw trace**: recorded runtime events; the unchanged source of truth.
- **Work Journal**: a readable, chronological, runtime-independent Markdown record generated from raw traces. It replaces the concept and name "work trace".
- **Journal file**: the journal for one raw-trace file (one per compaction segment, plus the open file for current work).
- **Action**: the plain, meaningful label a journal line uses for what the agent did, regardless of the runtime's tool name.

## Behavior
| ID | Current | Desired | Preserved |
|---|---|---|---|
| BEH-W1 | Tool calls appear under runtime-specific names, or not at all outside the work-trace export | Each runtime's built-in tools appear as plain actions (Command, Write file, Edit file, Search web); every other tool (AutoByteus shared tools, any MCP server) appears through one generic "Tool: <name>" line | Raw traces unchanged |
| BEH-W2 | Teammate messages shown as "user"; notices/attachments dropped; long values cut silently | Sender shown; notices and attachments included; long content shortened visibly with a link to the full original | History UI unchanged |
| BEH-W3 | Export built only on demand, all files rewritten each time | Journal kept current; closed journal files never change | Skill improvement keeps receiving the agent's work history |

## Scenarios
- SCN-W1: an agent runs on any of the five runtimes; its journal reads the same way for the same kind of work.
- SCN-W2: a team member receives messages from teammates and system notices; the journal shows who sent what.
- SCN-W3: a command (including a file read rendered as `cat`) produces a very long output; the journal shows the start and the end, marks the cut and links to the full output.
- SCN-W4: an edit touches a file; the journal shows the file, the size of the change and a short diff (longer diffs truncated with a link).
- SCN-W5: a compaction rotates the raw traces; the journal file for that segment is written once and never changes.
- SCN-W6: a run recorded before this feature is opened; its journal is generated from its existing raw traces.
- SCN-W7: a tool that is not one of the runtime's mapped built-ins (e.g. Claude Skill, AGY manage_task, send_message_to, or a tool from an MCP server the user just installed) appears as "Tool: <name>" with its arguments and result. It is never dropped, never misfiled, and needs no change to the journal.

## Requirements and acceptance
| REQ | Outcome | Acceptance |
|---|---|---|
| REQ-W1 Plain actions | Tools fall into two categories, decided by the run's runtime. **(1) Built-in tools:** a small fixed table per runtime (work-journal-contract.md §4) maps them to plain actions with their key details: Command (command text, result/exit code, output), Write file (path, size), Edit file (path, +added/−removed, diff), Search web (query). Built-ins with a real, standard command equivalent are shown as Command with that equivalent built from their arguments and the tool's actual result: file search/listing (e.g. Claude Grep/Glob, AGY grep_search/find_by_name/list_dir → `grep -rn "x" src/`, `find`, `ls src`), reading files (Read/read_file/view_file → `cat src/x.ts`, with a line range when partial) and reading web pages (WebFetch/read_url → `curl <url>`). No command is invented where none truthfully exists. **(2) Every other tool** (other built-ins, AutoByteus's shared tools, any MCP server): one generic rule, "Tool: <name as recorded>" with its arguments and result, after removing the runtime's result envelope (contract §5–§6). No per-tool list is needed. The original tool name is kept in the evidence link. Equivalent built-in calls from different runtimes produce the same journal line. | AC-W1: fixtures from Claude, Codex, AGY, Grok and AutoByteus doing the same work (command, file search, read, write, edit, web) render identically apart from timestamps; a Claude Grep and a Codex `grep` command both render as Command; Claude Read and AGY view_file both render as Command `cat <path>`; a tool name never seen before renders as "Tool: <name>" with arguments and result; AGY, MCP and content-block result envelopes are removed and image data is not reproduced. |
| REQ-W2 Nothing lost silently | Every raw-trace record either appears in the journal or is intentionally omitted with a documented reason (model reasoning is omitted). The journal holds the agent's work: messages to the agent (user and named teammate/agent senders, with attachments as references), notices delivered to the agent, user interruptions, the agent's text, and its tool calls with their results. Runtime machinery is omitted with a documented reason (DEC-W11): compaction, system instructions, model-request recovery, output-limit continuation and reasoning. | AC-W2: a team fixture shows the teammate sender, not "user"; attachments and Claude background-task notices appear; no compaction, system-instruction or recovery lines appear; rendered + intentionally omitted records = source records per file. |
| REQ-W3 Visible shortening | Short content is shown in full. Long command/tool outputs show the first and last lines (default 20 each), long diffs show the first lines (default 40), and each cut is marked with the omitted size and a link to the raw record. Limits are configurable. | AC-W3: a >1,000-line output renders start + end with an "…[N lines omitted; full output: raw#<id>]" marker that resolves to the raw record. |
| REQ-W4 Links to evidence | Each journal entry carries a link to its raw-trace record(s). | AC-W4: every link in a generated journal resolves to a record in the run's raw traces or archives. |
| REQ-W5 Stable files | One journal file per raw-trace file (closed segments plus the open file). A closed journal file is written once and never changes; regenerating it from the same raw traces gives identical content. | AC-W5: two regenerations of a closed file are byte-identical; a non-compacting run has one open journal file. |
| REQ-W6 Kept current | The open journal file is updated at the end of each turn; a closed journal file is written when its raw-trace file closes; old runs get their journal the first time it is needed. Journal problems never affect the run or its raw traces and are recorded visibly. | AC-W6: after a turn ends, the open file includes it; a forced journal-write failure leaves the run and raw traces intact and is logged. |
| REQ-W7 Deterministic and cheap | Generation is a fixed translation per runtime, without model calls. | AC-W7: generation works with no model configured and the source runtime unavailable. |
| REQ-W8 One name | "Work Journal" replaces "work trace" in code, storage and docs; skill improvement uses the Work Journal. | AC-W8: no remaining "work trace" concept; skill-improvement tests pass on Work Journal output. |
| REQ-W9 No regression | Raw-trace recording, compaction/rotation, restore and run-history display unchanged. | AC-W9: existing suites pass. |

## Decisions
- DEC-W1 Labels as in REQ-W1, confirmed with the user (U03–U06): Command, Write file, Edit file, Search web, Tool: <name>. Command covers shell commands plus built-ins with a true standard command equivalent (file search/listing, reading files, reading web pages); no invented commands.
- DEC-W7 Two categories (U14–U16): per-runtime built-in tables plus one generic rule for every other tool, defined on raw-trace contents (with the adapter code as their origin). This replaces the exhaustive tool register. No label overlay for AutoByteus's own tools (contract D1). Contract decisions D1–D4 are part of this approval.
- DEC-W8 Recorded text is history, not instructions (SR-008, from the user's goal U18 that any runtime can read a journal naturally and continue). Every journal file states this in its header. Notes that AutoByteus or a runtime addressed to the original agent are replaced by plain statements of what happened (contract §6, §8): e.g. an interrupted turn's "do not retry" note, or Claude's "STOP what you are doing" rejection text.
- DEC-W9 Where the journal is made (U19): the journal is rendered from raw traces by one renderer, not written inside the runtime adapters. Adapters keep their role of recording facts. A fact the adapter knows but the raw trace lacks is fixed by enriching the raw trace, a follow-up outside this ticket: Codex exit code (seen by codex-tool-payload-parser.ts:517-520, not stored), Codex file-change kind, Grok exit code as a field.
- DEC-W10 Placement (U20–U21): inside each agent run, i.e. in the run's own memory folder beside its raw traces, under a `work_journal/` subfolder. One journal file per raw-trace file with the same number (`work_journal_000001.md` … from `raw_traces_000001.jsonl`, and `work_journal_active.md` from `raw_traces_active.jsonl`), plus `work_journal_manifest.json`. The manifest holds the source file, the last record rendered and the renderer version. Closed files never change for the same renderer version. The old on-demand `work_traces/` folders (7 runs) are removed by the migration, because they can be regenerated.
- DEC-W2 Edits: change size plus a short diff (first 40 lines), longer diffs linked.
- DEC-W3 Long outputs: first and last 20 lines, cut marked and linked.
- DEC-W4 Model reasoning (thinking) is omitted from the journal (it records what the agent said and did).
- DEC-W12 Rollback rule (user, U29–U31, 2026-10-19): the user judged the RELEASE.md rule "newer data must stay readable by the rollback build" too broad and asked for an immediate fix in this change. The rule now applies only to releases with an app-data migration that converts existing data: the converted data stays readable by the older build, or the release notes say rollback past the release is unsupported. Ordinary writer changes need no rollback compatibility. As a consequence, the improver_session.json writer drops `schemaVersion` as originally designed (SR-016 withdrawn).
- DEC-W11 Content scope (U23–U28, user approval 2026-10-19; recommendation by the Solution Designer, accepted by the user).
  - **Rule:** include what was said to the agent, what the agent said, and what the agent did; exclude what the runtime does to manage the agent.
  - **Included:** `User:`, `Message from <teammate>:`, `Agent:`, every tool call with its result, `Notice:` (messages delivered to the agent, e.g. background-task results and platform notices) and `Turn interrupted by the user.`
  - **Excluded:** context compaction (the journal file boundary already marks it), system instructions, model-request recovery, output-limit continuation and reasoning.
  - The label stays `Agent:`, not `assistant`, which is chat-API vocabulary.
- DEC-W5 Scope: every agent run that records raw traces — standalone runs, team/org members and (since base 55bff1f5e) task agents, which are normal runs with their own memory folder. Journal files live in each run's memory folder next to its raw traces.
- DEC-W6 No new UI in this ticket; the journal is readable files used by agents and later by work notes. A journal view can follow separately.

## Out of scope
Work notes and summarization (Step 2); runtime switching; changing raw traces or compaction; UI for the journal; deleting old work_traces folders beyond what the rename requires (handled per the repository's migration conventions in design).
