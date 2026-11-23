# Follow-ups — agy-tool-result-content

None open. The two first recorded here (the arguments of parallel calls; the exit-code wrapper and current tool names) are in scope since SR-002 (DEC-8, DEC-9). Optional for the founder, not a follow-up of the team: backfilling stored raw traces (requirements doc, last section).

| ID | Found by | What is wrong, where | Evidence | Why outside this ticket | Urgent | Suggested Task | Sent |
| --- | --- | --- | --- | --- | --- | --- | --- |
| FU-1 | Implementation engineer (handoff), confirmed live by API/E2E | `AGY_NATIVE_TOOL_NAMES` (the `tools:` list written into the agent.md capsule) still names `view_file`, `grep_search`, `find_by_name`; agy 1.5.15 offers `read_file, write_file, edit_file, run_command, manage_task, generate_image` only. Asked for find_by_name, grep_search and view_file, the real agent used `run_command` and `read_file` | `evidence/api-e2e/API-03c-live-search-tools.log` | The recording and the journal work without it; the list is the capsule's tool declaration | No | "Compare AGY_NATIVE_TOOL_NAMES with the tools agy 1.5.x offers and update the agent.md tools list; check whether the unknown names are ignored or change tool availability" | Not sent |
