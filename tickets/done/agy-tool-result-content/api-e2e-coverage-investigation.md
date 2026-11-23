# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `requirements-doc.md` (REQ-001..011, AC-001..AC-015); Investigation Notes: `investigation-notes.md`; Solution Revision Record: `solution-revision-record.md` (SR-001, SR-002); Design Spec: `design-spec.md` (D-1..D-7); Supplemental: `solution-designer-handoff.md`, `follow-ups.md`
- Design / Architecture / Code Review reports: `N/A — not applicable` (Medium / Low, direct route)
- Implementation Handoff: `implementation-handoff.md` (IMP-01..06); Implementation Revision Record: `implementation-revision-record.md` (IR-001)
- API/E2E Revision Record: `api-e2e-revision-record.md`; Current API/E2E Revision ID: `API-REV-001`
- Round 1; Trigger: implementation engineer's direct-route handoff, code `7069972efe`, tip `dbfae1e493` (documents only after the code commit); Prior investigation: none

## Current Requirement And Design Basis

Antigravity's stream gives a size summary (or nothing) for read/search steps and a lossy summary for the arguments of parallel calls. The backend now recovers both from the CLI's `transcript_full.jsonl` through one shared identification (`identifyAgyToolCall`: nearest planner row, position, tool name), records the row's `content` as the success output (cap 256 KiB, bounded re-read for a row not yet written, `AGY_TOOL_RESULT_UNRECOVERED` warning on any miss), and the Work Journal (renderer revision 5) drops the timestamp header, shows reads as `cat -n` lines, renders `write_file`, `edit_file`, `read_url_content`, `search_web` like their older equivalents and shows the `run_command` exit code as the outcome. Left to API/E2E (handoff): AC-012's live run (ranged read, write/edit batch in one response, non-zero exit), a live parallel-batch check, the warning on a broken transcript, and a large-read spot check.

## Supported Scenarios And Real Usage

SCN-001..006. Real triggers: an Antigravity agent's turn on the built server with the real `agy`. Not tested as unsupported: none.

## Changed Behavior Summary

| Behavior | Change | Coverage |
| --- | --- | --- |
| Native read/search results recovered from the transcript | Changed | unit (IMP-05), scripted NR-01..03, LIVE LN-01, LN-02, LN-05 |
| Arguments of parallel calls recovered | Changed | unit, scripted NR-02 / E-002b, LIVE LN-02 (30 parallel reads), LN-03 (3-call write/edit batch) |
| Journal: header dropped, cat -n lines, current tool names, exit code | Changed | renderer unit, scripted, LIVE LN-01, LN-03, LN-04 |
| Misses degrade to the stream result plus a warning | Changed | unit, scripted NR-03 |
| Stored raw traces | Preserved | service unit (revision 4 → 5, raw bytes identical) |

## Changed Surface And Boundary Classification

| Surface | Affected? | Boundary | Evidence available | Risk not exercised | Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | Antigravity backend, converter, readers | 154 focused unit tests, scripted built-server e2e | the real CLI's transcript layout and timing | Live API (real agy) |
| External integration | Yes | the CLI's undocumented transcript file | none live except the implementer's timing probe | real parallel batches, real exit code | Live API |
| Persisted-data transition | Yes (`Discard or Rebuild`, derived journal) | journal files, manifest revision | service unit | | covered by unit |
| Other surfaces | No | | | | |

## Project Execution Discovery

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-tool-result-content`; testing guideline `TESTING.md` (server e2e, scripted AGY, "Antigravity CLI (agy) sign-in state": the host login with the real HOME when no separate token file exists; live runs add conversations to the user's agy history, say so); `DESIGN.md`; `AGENTS.md`. Conflicts: none. Secrets: none read.
- Components: built server (`startBuiltTestServer`) with an owned runtime root; scripted CLI for the in-process cases.

## Existing Durable Coverage Inventory

| Path / Test | Decision | Action |
| --- | --- | --- |
| `tests/unit/agent-execution/backends/antigravity/agy-native-tool-*.test.ts`, `tests/agent-work-journal/**` (new and adapted) | Still Valid | rerun |
| `agy-native-tool-result-content-scripted-agy.e2e.test.ts` (NR-01..03), `agy-native-tool-arguments-transport.e2e.test.ts` (E-002b replaces the declining case) | Still Valid | rerun; base probe |
| other scripted AGY e2e files | Still Valid | five rerun as regression |

## Planned Cases

| Case ID | Criteria | Surface | Kind | Steps |
| --- | --- | --- | --- | --- |
| IMP-02..06 | all | typecheck, unit suite, scripted e2e group | Reused | code unchanged since `7069972efe`; the full unit suite and the 20-file group are not repeated |
| API-01 / API-02 | AC-001, 002, 004, 005, 007, 013 | scripted e2e on a rebuilt server; and on the base source | Existing Test / Temporary Probe | the new cases fail on the base |
| API-03 | AC-001, 005, 008, 012, 013, 014, 015 | LIVE built server, real agy | Durable (gated) | LN-01 ranged read, LN-02 60 live read steps, LN-03 write/edit batch, LN-04 exit code, LN-05 large read, LN-06 search tools; twice |
| API-03b | | live base probe | Temporary Probe | the live LN-01/LN-04 against the base source |
| API-04 | | unit, typecheck, regression e2e | Existing Test | independent rerun |

- Test progress log needed: `Yes`

## Durable Coverage To Add

`autobyteus-server-ts/tests/e2e/runtime/agy-native-tool-result-content-live.e2e.test.ts` (LN-01..06), gated by `RUN_AGY_RESULT_CONTENT_LIVE_E2E=1`.

## Not Tested / Infeasible / Deferred

| Behavior | Reason | Risk | User-only? |
| --- | --- | --- | --- |
| A live `grep_search`, `find_by_name`, `view_file` result (AC-002 live part, AC-012's grep and find) | the real agy 1.5.15 does not offer these tools; asked for them it used `run_command` and `read_file` (LN-06); no older CLI is available and the host's stored conversations of older versions are the user's private data, not read | the real row shape for these tools may differ from the synthetic rows and the F-02 measurement the design cites | No |
| A live broken-transcript warning | cannot corrupt the real CLI's own transcript safely; scripted NR-03 and the reader unit tests cover the reasons | low | No |
| The founder's journals and stored raw traces | not read, not changed | | Yes |

## Ambiguities Or Reroute Triggers

The grep/find live proof cannot run in this environment (When A Check Cannot Run Here): an evidence decision is requested from the Solution Designer.

## Investigation Decision

- Proceed: `Yes`; durable coverage added: `Yes`; reroute: `No`; evidence decision requested for the grep/find live part.
