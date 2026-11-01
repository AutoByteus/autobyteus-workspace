# Follow-ups — autobyteus-348

The Task's later items (FU-004, FU-001, FU-005, FU-008 of autobyteus-316) are items of this Task, not follow-ups. Numbering below is this ticket's own.

| ID | Found by | What is wrong, where | Evidence | Why outside this ticket | Urgent | Suggested Task | Sent |
| --- | --- | --- | --- | --- | --- | --- | --- |
| FU-C1 | Architecture review ARCH-REV-001 (F-001), notes F-11 | The effective-launch rule of a delegated copy exists three times: `effectiveCopyAgentLaunch` (server) and the mirrors `collaborationCopyAgentLaunch` and `teamCopyAgentLaunch` (the two stream-contract packages); a change must be made three times | `run-execution-tree-shared-records.ts:223`, `agent-org-execution-dtos.ts:99`, `team-execution-view-dtos.ts:95`; web call sites | This ticket extends all three and adds a parity test (smallest safe change); converging them needs a decision about the contract packages' independence | No | "Reduce the three effective-launch rules of delegated copies to one owner (the server importing the contract's function, or one contract package re-exporting) and remove the mirrors and the parity test" | Not yet |
