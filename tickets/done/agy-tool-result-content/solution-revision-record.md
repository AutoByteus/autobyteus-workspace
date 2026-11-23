# Solution Revision Record — agy-tool-result-content

| Revision ID | Phase | Trigger | Finding IDs | Prior | Current | Affected IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Mixed | Task autobyteus-377 (the founder's report of 2026-11-03 and 2026-11-23) | F-01…F-11 | N/A | Requirements Approved; design Ready | REQ-001…008; AC-001…012; DEC-1…7 | Medium / Low; direct route |

### SR-001 — The backend records the CLI's persisted result for the tools whose stream result is a size summary; the journal shows the lines
- Classification: Initial Baseline (one round). Intended behavior: as the Task; no new product decision. Approval: Solution Designer within the direction; user informed (2026-11-23).
- Evidence: reproduced with the real CLI (the stream sends the whole file's size for a ranged read); measured on the founder's data (counts only): 4,820 of 5,921 `view_file` and 201 of 244 `read_file` results size-only; the CLI persists every step's result in `transcript_full.jsonl`, which the backend already reads for arguments.
- Decisions: DEC-1 the CLI transcript (not ACP, not `output.txt`, not the disk file), DEC-2 a rule not a tool list, DEC-3 256 KiB and measure the timing, DEC-4 strict identification and never worse than today, DEC-5 the journal drops the header, DEC-6 renderer revision 5 and no migration, DEC-7 autobyteus-183 stays separate.
- Next action: implementation (direct route).

### SR-002 — Every Antigravity tool problem found, in one package (2026-11-23)
- Trigger: the founder asked whether all Antigravity tool problems can be fixed, after the Solution Designer's journal review.
- Evidence added: the census (F-12) of all Antigravity tools against the journal table and the recorded arguments; F-13 (most writes of a batching agent lose their arguments because the arguments reader accepts only single-call responses); F-14 (a batch is identified by position and name without the sibling rows); F-15 (the `run_command` wrapper).
- Changed: REQ-009…011, BEH-006/007, SCN-006, UC-003, AC-013…015, DEC-8/9; design D-6 (one shared identification for arguments and results) and D-7 (current tool names, exit code). Intended behavior extended within the founder's request; the earlier requirements are unchanged. Approval: Solution Designer within the direction; the founder informed in the conversation.
- Classification unchanged: Medium / Low (the arguments reader is reworked onto a shared helper; its single-call behavior is preserved and tested).
- Not covered, by decision: backfilling stored raw traces (the founder's option; needs approval and a backup); autobyteus-183 (Codex/Grok).
- Next action: implementation (direct route); the first handoff (SR-001) is extended, not replaced.

### SR-003 — Evidence decision DEC-10 (2026-11-23)
- Trigger: the API/E2E engineer's request: no real `grep_search`, `find_by_name` or `view_file` row can be produced by agy 1.5.15 (the tools are no longer offered).
- Decision: `Accepted Unverified Risk` for AC-002 and the grep/find part of AC-012, on the unit, scripted and stored-shape evidence; the real-CLI read results (243 live steps) are proven. Neither the requirements nor the design change. Decided by the Solution Designer within the direction; the founder informed.
