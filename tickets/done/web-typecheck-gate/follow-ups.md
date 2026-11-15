# Follow-ups

| ID | Found by (role, document) | What is wrong, where | Evidence | Why it is outside this ticket | Urgent (`Yes`/`No`) | Suggested Task description | Sent (to, date) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| FU-001 | Solution Designer, investigation-notes.md | `RELEASE.md:23-26` names the main checkout as `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo`; that path does not exist. The main checkout is `/Users/normy/autobyteus-org/autobyteus-workspace` | `ls -d /Users/normy/autobyteus_org/autobyteus-workspace-superrepo` → No such file or directory; `git worktree list` in the main checkout | Release-guide wording; this ticket's fix and gate work without it | No | Correct the main-checkout path in RELEASE.md "Finalization Target" (delivery engineer owns RELEASE.md) |  |
