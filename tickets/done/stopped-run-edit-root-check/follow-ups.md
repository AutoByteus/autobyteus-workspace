# Follow-ups — stopped-run-edit-root-check

(FU-004 and FU-001 of autobyteus-316 are Task autobyteus-396; FU-005 is covered, notes F-08.)

| ID | Found by | What is wrong, where | Evidence | Why outside this ticket | Urgent | Suggested Task | Sent |
| --- | --- | --- | --- | --- | --- | --- | --- |
| FU-1 | API/E2E engineer, report round 1 | `autobyteus-server-ts/src/standalone-agent-run-root/domain/standalone-agent-run-root.ts` holds exactly 500 non-empty lines (526 total), so the next change there needs a split. | `grep -c .` shows 500 | The change added a few lines and stayed within the guardrail; a split is a refactor of its own | No | "Split standalone-agent-run-root.ts before its next change (the file is at the 500-line guardrail)." | |

