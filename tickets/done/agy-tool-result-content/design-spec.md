# Design Spec — agy-tool-result-content

## Solution And Approval Basis
- Revision `SR-001`; requirements approved by the Solution Designer within the direction (user informed). User approval of the design: `Not required`. Status: `Ready`.
- Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-tool-result-content/tickets/in-progress/agy-tool-result-content/investigation-notes.md` (F-01…F-11). Authorities read: skill references (principles 16, 17 included), `DESIGN.md` (rules 4, 5, 6, 7, 11; rule 12 does not apply: no build input changes), `TESTING.md`.

## Current-State Read
`AgyAgentRunBackend.handleMessage` receives each stream message in an event queue. For a native tool step it first asks the converter whether the call's **arguments** need recovery (`getPendingNativeToolArgumentLookup`), awaits `readAgyNativeToolArguments` (a strict reverse scan of the CLI's `transcript_full.jsonl` through `scanAgyBrainJsonLinesReverse`; failure ⇒ `null` ⇒ the stream's summary), then calls `converter.convert(message, nativeArguments)`. `convert` → `tool()` emits `TOOL_EXECUTION_SUCCEEDED` with `result: { provider_state: "DONE", output: info.output }`, i.e. whatever the stream said (F-01, F-05). The journal's Antigravity translation renders the recorded result (`normalizeAgyResult`, `readFile`).

## Task Size And Architectural Risk
- Task size: `Medium` (one shared identification helper and a results reader, the arguments reader reworked onto the helper, three touched backend/converter files, two journal files, the scripted CLI fixture, tests, two docs). Architectural risk: `Low`: the owner, the safety rules and the failure mode already exist for the arguments (F-05); the event shape is unchanged (a longer `output` string); no stored shape changes; raw traces already stored are untouched.
- Escalation trigger: the lag measurement (D-3) shows the row is often not there at DONE and a retry or a deferred second event is needed (ordering effect on the event queue); or the `grep_search` row does not identify by position and name; back to me, and architecture review if the event order changes.

## Data Contract (Principle 17)
No record or message is added. One field gets a richer value:
- `TOOL_EXECUTION_SUCCEEDED.payload.result.output` (written by the Antigravity converter; read by the raw-trace recorder, the Activity tab, the Work Journal): today the stream's `tool_info.output` (`null` or `"<N> lines, <M> bytes"` for the gap tools); after: the text the CLI persisted for the step (verbatim, bounded at 256 KiB with a marker).
- Examples (synthetic): `read_file {Path: "/work/notes.txt", StartLine: 5, EndLine: 9}` → `output: "Created At: 2026-11-23T10:00:00+01:00\nCompleted At: 2026-11-23T10:00:00+01:00\nCreated At: …\nCompleted At: …\nShowing lines 5-9 of 40\n5: line 5 alpha\n6: line 6 alpha\n7: …\n8: …\n9: …"`; `grep_search` with no matches → the CLI's text; unrecoverable → `"40 lines, 1005 bytes"` or `null` as before.
- Walked: SCN-001…005 against the data (F-03 shapes on 465 stored conversations; probe rows); the old size-only record and the new content record both render (AC-008, AC-009). Existing data reaches the contract by not being touched (Principle 5, REQ-008).

## Intended Change

### D-1 The reader (new): `stream/agy-native-tool-result-reader.ts`
`readAgyNativeToolResult(conversationId, lookup: { stepIndex, toolName }, options: { signal?, brainRoot?, maxBytes? }): Promise<{ text: string } | { reason: AgyToolResultUnrecoveredReason }>`, built on `scanAgyBrainJsonLinesReverse` like the arguments reader (same file `.system_generated/logs/transcript_full.jsonl`, same guarded descriptor, same 2 MiB row bound; the brain root is a parameter with the default, no global state, Principle 16). Algorithm (newest row first):
1. Skip rows with index above `stepIndex`. The row with index `stepIndex` must be `source MODEL`, `type GENERIC`, `status DONE`, with a string `content` (non-empty after the header strip is not required here).
2. Continue to older rows: each must have a strictly smaller index and, until the batch's planner row, be `GENERIC` with index exactly one less than the previous (a consecutive batch). The first non-`GENERIC` row must be a `PLANNER_RESPONSE` with a `tool_calls` array; its position `k = stepIndex − plannerIndex − 1` must be below `tool_calls.length` and `tool_calls[k].name === toolName`.
3. Anything else (index out of order or duplicated, another row type, a planner row without that call, a name mismatch, a missing row) ⇒ `{ reason }` with one of `ROW_NOT_FOUND`, `ROW_NOT_CORROBORATED`, `TRANSCRIPT_UNREADABLE` (the scan returned false or threw), `INVALID_IDENTITY` (bad conversation id or step index).
4. Cap: UTF-8 content over `maxBytes` (default `AGY_RESULT_MAX_BYTES = 256 * 1024`) is cut at a character boundary and followed by `\n…[<n> bytes of this result were not recorded]`.
It reads from the end and stops at the batch's planner row (QR-001); it never throws (a thrown error is `TRANSCRIPT_UNREADABLE`).

### D-2 The converter and the backend
- `agy-stream-event-converter.ts`: `getPendingNativeToolResultLookup(message)`: returns `{ stepIndex, toolName }` when the message is a tool `step_update` of the current conversation and turn, `state === "DONE"`, the step is not yet terminal, the tool is native (not `call_mcp_tool`, not `generate_image`), `info.error` is absent, and `isLossyAgyOutput(info.output)` (null, undefined, or a string matching `/^\d+ lines, \d+ bytes$/` after trim); else `null`. `convert(message, nativeArguments, nativeResult)` uses `nativeResult.text` as the success `output` when it is given; with none it behaves as today (it also keeps the `mcpCall`/`nativeImage` branches unchanged).
- `backend/agy-agent-run-backend.ts`: `handleMessage` asks for the result lookup after the arguments lookup, with the same abort controller discipline (`this.argumentLookup` becomes `this.stepLookup`, one controller for the pending lookup), awaits the reader, and on `{ reason }` logs `AGY_TOOL_RESULT_UNRECOVERED run=<runId> step=<n> tool=<name> reason=<reason>` and passes `null`. An abort or a closed turn behaves as the arguments lookup does today.

### D-3 Timing: measure, then decide
The first implementation step is a live measurement (AC-012) of the row's presence at DONE over at least 50 live steps (read, grep, find, run_command; one grep_search row shape captured, U-2). Rule: **no retry** when every step's row is present; when a miss occurs, one bounded re-read (up to 5 attempts 40 ms apart, abortable, inside the same lookup) and the result recorded in the implementation handoff. A larger miss rate (more than 5% after the retry) goes back to me (escalation).

### D-4 The journal (Antigravity translation only)
In `rendering/runtimes/antigravity-translation.ts`:
- `normalizeAgyResult`'s `normalizeText` drops the leading Antigravity header (`^(?:(?:Created At|Completed At):[^\n]*\n)+\n?`) of the text and of a spilled-output preview (561's rule applies it to the preview). The raw trace keeps the text verbatim.
- `readFile` (registered for `read_file` and `view_file`): when the normalized result is not the size-only form, it drops Antigravity's wrapper lines at the start of the output (`Showing lines …`, `File Path:`, `Total Lines:`, `Total Bytes:`, and the sentence `The following code has been modified to include a line number …`) and shows the lines through `toCatNumberedLinesLoose` (the common `cat -n` layout, as AutoByteus and Claude do), with the command from the arguments as today (`sed -n 'a,bp' <path>` or `cat <path>`). The size-only branch is kept for records that hold only the size.
- `WORK_JOURNAL_RENDERER_REVISION` 4 → 5.

### D-6 One identification for arguments and results (SR-002)
The arguments reader's single-call rule is replaced by one shared helper `identifyAgyToolCall(rows, stepIndex, toolName)` (new file `stream/agy-transcript-step.ts`, using `scanAgyBrainJsonLinesReverse`), used by both readers: the planner row is the nearest `PLANNER_RESPONSE` row with an index below `stepIndex` (rows in between, if present, must be `GENERIC` and consecutive; sibling rows that are not written yet are not required, F-14); `position = stepIndex − plannerIndex − 1` must be below `tool_calls.length` and `tool_calls[position].name` must equal `toolName`. The arguments reader returns `tool_calls[position].args` under its existing corroboration of the stream's summary and its existing strictness (status DONE, strictly decreasing indices, no duplicates); a single-call response is position 0, so its behavior does not change. The results reader (D-1) takes the row at `stepIndex` after the same identification. Parallel batches therefore recover both arguments (at the first observation) and results (at DONE). Duplicated indices, a name mismatch, or a planner row not within range keep the stream's values.

### D-7 More journal rules (SR-002)
In `antigravity-translation.ts`: table entries `write_file` (`Path`, `Content`, `Append`) → `writeFileLine` like `write_to_file`; `edit_file` (`Path`, `Target`, `Replacement`) → `editFileLine` with `diffTexts` like `replace_file_content`; `read_url_content` (`Url`) → `convertedCommandLine(curlCommand(url), result)`; `search_web` (`query`) → `searchWebLine([query], result)`. The `runCommand` converter reads the normalized result text: `^Command exited with code (\d+)\.\n+Command output:\n?([\s\S]*)$` becomes outcome `ok` (0) or the `exit` outcome (N) with the output only; another wording is left as recorded. `manage_task`, `generate_image`, `list_resources` stay on the generic and platform rules (low volume; media has its own path). The same revision bump (5) covers them.

### D-5 The scripted CLI
`tests/fixtures/agy-failure-cli.mjs` gets one case (name chosen by the implementation, e.g. `native_read_results`) that, for `read_file`, `view_file`, `grep_search` and `find_by_name` steps, emits the size summary / no output in the stream and writes the matching `GENERIC` rows (and the planner rows) into `<HOME>/.gemini/antigravity-cli/brain/<conversation>/.system_generated/logs/transcript_full.jsonl`, as the fixture already writes message files there; one case writes no transcript. The built-server case asserts the raw trace and the journal. (The in-process unit tests use a temp brain root through the reader's parameter.)

## Change Scope (Mandatory)
- In scope: UC-001, UC-002, UC-003: `stream/agy-native-tool-result-reader.ts` and `stream/agy-transcript-step.ts` (new), `stream/agy-native-tool-arguments-reader.ts` (onto the shared helper), `stream/agy-stream-event-converter.ts`, `backend/agy-agent-run-backend.ts`, `rendering/runtimes/antigravity-translation.ts`, `domain/work-journal-models.ts`, `tests/fixtures/agy-failure-cli.mjs`, their tests, `autobyteus-server-ts/docs/modules/agent_work_journal.md` and `antigravity_cli_runtime.md`.
- Derived consumers: raw-trace recorder, Activity tab, journal readers, memory search (more text in some results; the fingerprint includes the revision: automatic catch-up).
- Deliberately left alone: MCP results; stored raw traces (backfill is the founder's option); other runtimes; autobyteus-183.
- Follow-ups: none open (the two first recorded are now in scope, DEC-8, DEC-9).

## Relevant Behavior And Production-Path Map
BEH-001…004: AGY CLI stream `step_update` DONE → `AgyAgentRunBackend.handleMessage` → ★ `getPendingNativeToolResultLookup` → ★ `readAgyNativeToolResult` (transcript_full.jsonl) → `converter.convert` → `TOOL_EXECUTION_SUCCEEDED { result.output }` → raw-trace recorder / Activity tab. BEH-005: raw trace → `WorkJournalFileRenderer` → Antigravity translation (★ header drop, ★ `readFile`) → journal.

## Task Design Health Assessment (Mandatory)
- Posture: `Bug Fix`. Current design issue: `No` structural: the backend already owns "recover what the stream loses from the CLI's own record" (arguments, native image); the results were the missing half. Triggers checked: Duplicated Policy (the reader reuses the scanner and the arguments reader's rules; the two readers share `scanAgyBrainJsonLinesReverse` and the transcript path; a small shared constant for the transcript path is acceptable), Boundary (the journal never reads the CLI's files; only the backend does), Dependency (a new brain read goes through `agy-brain-file.ts`, as its doc requires).
- Alternatives rejected: DEC-1 (b), (c), (d); a journal-side recovery (the journal has no CLI access and must stay a pure renderer); a second event that amends the result later (changes the event contract and order).
- Refactor needed now: `No` (the `argumentLookup` controller is renamed to cover both lookups).

## Legacy Removal / Persisted Data
No legacy path kept. Persisted: raw traces already stored unchanged (REQ-008); new records carry more text; the journal is derived: `Discard or Rebuild` through the revision bump (331/560/561 precedent): re-render of all runs, re-index of the files whose text changes (Antigravity files with reads, searches or `run_command` previews).

## Ownership, Dependency Rules, Interfaces
Owner of "the content of an Antigravity step the stream dropped": the backend's reader. Owner of "what the journal shows of it": the Antigravity translation. Interfaces: `getPendingNativeToolResultLookup` / `convert(…, nativeResult)` between backend and converter; no change to `RuntimeTranslation`.

## Backward-Compatibility Rejection Log
None.

## Change / Refactor Sequence
1. Live measurement and failing tests (AC-001, 008, the reader's AC-004…007). 2. Reader. 3. Converter and backend. 4. Journal and revision. 5. Fixture and built-server case. 6. Docs.

## Key Tradeoffs
The raw trace grows by the recovered text (about 13 MB over the founder's 202 runs, less than Claude's reads). The recorded text carries the CLI's header verbatim; the journal drops it.

## Risks
(1) The transcript layout changes: `null` + warning, today's behavior (U-3). (2) A row not yet written at DONE: D-3. (3) A parallel batch with two calls of the same tool name could swap contents only if the CLI wrote rows out of call order (measured: in order). (4) Raw-trace growth: QR/F-08.

## Guidance For Implementation
- **Reproduction first** (synthetic): a converter/backend unit test with a size-only `read_file` DONE step and a temp brain root holding the matching rows: today the recorded output is `"40 lines, 1005 bytes"` (the founder's symptom). The live probe `evidence/INV-01-live-timing-probe.mjs` shows the real CLI's rows; copy its approach for AC-012 (it adds a small synthetic conversation to the local agy history; say so in the report; scratch folder only, no private paths).
- Tests (TESTING.md layers): reader unit tests (AC-004…007, QR-001) with temp transcripts; converter tests (AC-001…003, nothing read for `run_command`/`list_dir`/MCP/`generate_image`); renderer tests (AC-008…010; the 561 spill/wrapper tests adapt to the header drop); a service test for AC-011; a built-server case with the scripted CLI (AC-001, 002, 007); a live case (AC-012, gated, real `agy`). Existing arguments, native-image, 560 and 561 tests stay green.
- Synthetic fixtures only; never copy a real transcript row, path or conversation id. Do not touch stored raw traces or the user's agy data.
