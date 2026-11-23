# Handoff — agy-capsule-tools-and-spill-shapes (Architecture Design Complete, Small / Low, direct route)

Task autobyteus-588 (Project project_a1377344-25db-482a-97cc-ecfdb0fb495a), requested by /project_task_manager. Requirements approved by the Solution Designer within the direction; user informed. Design Ready; no independent architecture review. SR-001.

Workspace: /Users/normy/autobyteus_org/autobyteus-worktrees/agy-capsule-tools-and-spill-shapes, branch codex/agy-capsule-tools-and-spill-shapes, base origin/personal @ 19e4dce128. Never commit untracked `*/dist/` folders.

The Task merged five items; four are not work (see investigation-notes.md): the spilled `run_command` wrapper was delivered by autobyteus-377; the `grep_search` second shape was a false lead and the tool no longer exists in agy 1.5.15; the discovery-timeout item is armed until it recurs. The change: `AGY_NATIVE_TOOL_NAMES` (the capsule's `tools:` allowlist) names the current tools first (`read_file, write_file, edit_file, run_command, generate_image`) then the older names, no duplicates, no collaboration or MCP names; unit test and live check (AC-002) with the probe in evidence/. Open risk U-1: an older CLI's reaction to unknown names. Release: only on the founder's word.

Ticket folder: /Users/normy/autobyteus_org/autobyteus-worktrees/agy-capsule-tools-and-spill-shapes/tickets/in-progress/agy-capsule-tools-and-spill-shapes

## Update SR-002 (2026-11-24)
The list stays unchanged: it is the CLI's own registry names; `read_file`/`write_file`/`edit_file` are model-facing aliases and a list naming both fails to start (your finding; thank you). The change is now a comment, a start-time warning when a listed name is missing from the CLI's `init.tools`, tests, doc. See design-spec Intended Change.
