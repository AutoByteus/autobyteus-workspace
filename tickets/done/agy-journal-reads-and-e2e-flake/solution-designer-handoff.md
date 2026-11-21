# Handoff — agy-journal-reads-and-e2e-flake (Architecture Design Complete, Medium / Low, direct route)

Task autobyteus-561 (Project project_a1377344-25db-482a-97cc-ecfdb0fb495a), requested by /project_task_manager for the founder (the three follow-ups of 560 merged: FU-1 `read_file`, FU-2 spilled outputs, FU-3 the scripted-Antigravity flake; 562 merged in). Requirements approved by the Solution Designer within the direction; user informed. Design Ready; no independent architecture review (Medium / Low). SR-001.

Workspace: /Users/normy/autobyteus_org/autobyteus-worktrees/agy-journal-reads-and-e2e-flake, branch codex/agy-journal-reads-and-e2e-flake, base origin/personal @ a07767f4d0 (after the autobyteus-576 memory follow-ups; v1.5.14-beta.3 is an ancestor). Never commit untracked `*/dist/` folders. The server is built here.

What to build (design-spec "Intended Change"): D-1 `read_file` like `view_file`; D-2 the Claude-style marker for Antigravity's spilled-output result text; D-3 renderer revision 3 → 4; D-4 `startStudioE2eRuntimeServer` sets the 60 s hook timeout for every file that imports it; D-6 reproduce the discovery timeout deterministically first (a main-thread stall), then fix the cause or make the next recurrence self-explaining; no retry.
API/E2E: also edit TESTING.md (D-4). Private data: synthetic fixtures only; the founder's journals are not to be read or copied.

Cause of the flake (measured, not guessed): the in-process server's start and close block the event loop for seconds on a busy Mac (fseventsd busy, swap nearly full, load 40–90); the teardown reached 16.6 s against the 10 s default; the project's constant exists but 115 of 119 files do not use it. The discovery timeout is NOT reproduced yet (U-1).

Open risks: D-6 branch A changes a production probe helper; the machine stays loaded: run heavy checks one at a time. Release: only on the founder's word.

Ticket folder: /Users/normy/autobyteus_org/autobyteus-worktrees/agy-journal-reads-and-e2e-flake/tickets/in-progress/agy-journal-reads-and-e2e-flake
