# Handoff — switch-back-eexist (Architecture Design Complete, Small / Low, direct route)

Task autobyteus-440 (Project project_a1377344-25db-482a-97cc-ecfdb0fb495a), requested by /project_task_manager on the user's report. Requirements approved by the Solution Designer within the direction; user informed. Design Ready; no independent architecture review. SR-001.

Workspace: /Users/normy/autobyteus_org/autobyteus-worktrees/switch-back-eexist, branch codex/switch-back-eexist, base origin/personal @ 31aa11b241 (head with the documents 5e1dbcc792), finalization target origin/personal. The worktree has untracked `*/dist/` of two packages from the build; never commit them. The server is already built here.

Cause (reproduced): the Antigravity runtime makes its project folder `<memory folder>/agy-project` with an exclusive mkdir; the first Antigravity era leaves it; the second era's start (a switch back) gets EEXIST. The failed attempt writes nothing; the run keeps its pending switch, so it recovers at its next message once the fix is installed (no repair of the user's data).

Your change: one function, `createAgyRunCapsule`: remove the existing capsule folder before creating it (design-spec "Intended Change"). Tests and a Team-member reproduction first: see "Guidance For Implementation". Private data: use only the isolated server; the user's node 8001 is not read.

Open risks: the real Antigravity CLI is not run (ASM-001); a live second process of the same run is excluded by the activation lanes (escalation trigger). Release: the user's decision (DEC-3), not part of this ticket.

Ticket folder: /Users/normy/autobyteus_org/autobyteus-worktrees/switch-back-eexist/tickets/in-progress/switch-back-eexist
