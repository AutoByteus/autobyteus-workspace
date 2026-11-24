# Handoff Summary — agy-tool-result-content (Task autobyteus-377)

## Ticket
- `task_size=Medium`, `architectural_risk=Low`; direct route (reviews Not Applicable). SR-001 and SR-002. API/E2E Pass (93%). Archived at `tickets/done/agy-tool-result-content/`.

## What Changed
- **Server (Antigravity):** the stream gives only a size summary for `read_file` and a null output for several native tools. A reader now recovers each result's content from the CLI's transcript row (`agy-native-tool-result-reader.ts`), and the arguments of parallel calls from their planner row (`agy-native-tool-arguments-reader.ts`), both identifying a step through one shared helper (`identifyAgyToolCall`). The recovered text is capped at 256 KiB with a marker; a missing, symlinked, unreadable or ambiguous transcript falls back to today's stream result with one `AGY_TOOL_RESULT_UNRECOVERED` warning, never an exception.
- **Work Journal (renderer revision 5):** a ranged `read_file` shows `Command: sed -n '5,9p' <path> → ok` with `cat -n` lines (an old size-only record keeps `→ ok (content not recorded: N lines, M bytes)`); `run_command`'s `Command exited with code N. / Command output:` wrapper shows the output alone with `→ ok` or `→ exit N`; `write_file`, `edit_file`, `read_url_content` and `search_web` render as `Write file`, `Edit file`, `Command: curl` and `Search web`. The journals re-render once; memory search re-indexes the changed ones; no migration. Stored raw traces are unchanged.
- **Tests:** unit tests of both readers, the lifecycle and the renderer; a scripted case on a real server; a gated live case on the real agy 1.5.15 (`agy-native-tool-result-content-live.e2e.test.ts`).
- **Docs:** `agent_work_journal.md` (the manifest example's revision corrected to 5 by delivery), `antigravity_cli_runtime.md`.

## Integration
- `origin/personal` @ `1f761bc8db` has nothing beyond the ticket's base; no merge needed. On the head: typecheck, 648 unit tests, server build and four scripted-Antigravity e2e files pass at load about 42.

## Verification
- From the evidence; no user check. On the base source the scripted cases fail (5 of 8) and the live ranged-read and exit-code cases fail; on the change the live cases passed twice on the real agy 1.5.15: ranged `read_file` lines recorded and journalled, 120 parallel read steps all recovered with each result naming its own call's file (120 of 120), a write/edit batch of three calls with full arguments, `run_command` exit 3 as `→ exit 3`, a 2,400-line read recorded as 46,474 bytes; the late-row share was one in 243 steps (within 5 ms).
- **Accepted unverified risk, DEC-10** (Solution Designer, in `requirements-doc.md`, SR-003): AC-002 and the grep/find part of AC-012 have no real-CLI row. agy 1.5.15 no longer offers `grep_search`, `find_by_name` or `view_file`, so a live run cannot produce them (API/E2E asked for them in LN-06 and the CLI used `run_command` and `read_file`). They are proven by unit tests, the scripted case (its fixture corrected to the stored shapes: `view_file` with `Showing lines 1 to 3`, `find_by_name` with `Found 1 results`) and the Solution Designer's earlier read-only measurement of 465 stored conversations (746 `view_file`, 124 `grep_search`, 44 `find_by_name` rows). If a real shape differs, the reader logs `AGY_TOOL_RESULT_UNRECOVERED` and keeps today's stream result: nothing breaks and nothing is hidden. DEC-10 covers exactly what was not tested.
- Unit-only (not DEC-10): the `read_url_content` and `search_web` journal lines (no live web call was made), the 256 KiB cap, and a broken transcript on the real CLI.

## For the user
- The founder's journals and stored raw traces were not read and not changed. Journals re-render at revision 5 at their next turn or memory pass after a build with this change runs; already stored raw traces keep their size-only text (backfilling them is an optional founder decision, not done).
- The live runs used the real HOME and the host `agy` login and added synthetic conversations to the user's `agy` history, which cannot be removed.

## Release
- `No release`: not requested. `release-notes.md` is ready. The change is on `personal` but in no release.

## For The Solution Designer
- FU-1 (`AGY_NATIVE_TOOL_NAMES`, the `tools:` list written into the agent.md capsule, still names `view_file`, `grep_search` and `find_by_name`; agy 1.5.15 offers `read_file, write_file, edit_file, run_command, …`).
