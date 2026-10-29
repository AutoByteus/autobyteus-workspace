# Follow-ups — autobyteus-316

| ID | Found by | What is wrong, where | Evidence | Why outside this ticket | Urgent | Suggested Task | Sent |
| --- | --- | --- | --- | --- | --- | --- | --- |
| FU-001 | Solution Designer, notes F-04 | No raw-trace record for a failed turn: a run that ends on an error leaves no reason in its saved memory | Measured on 713 runs | Whether it is a prerequisite or part of this ticket is decided by the design (REQ-002 asks for the stop reason; the first slice may take it from the live event) | No | "Record the terminal failure of a turn (kind, provider message, structured code if any) as a raw-trace record on every runtime." | Not yet |
| FU-002 | Solution Designer, notes F-12 | A runtime-neutral run summary layer is missing (autobyteus-185 FU-005 deferred it) | `tickets/done/work-journal-search/follow-ups.md` FU-005 | Second step of this design; first slice works without it | No | See REQ-008 | Not yet |
