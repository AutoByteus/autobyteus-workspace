# Solution Handoff — background-task-shell-command

- Result: `Architecture Design Complete`
- Package identifier: `background-task-shell-command`
- Current solution revision: `SR-002`
- Classification: `task_size=Medium`, `architectural_risk=Low` (rationale in design-spec §Task Size And Architectural Risk)
- Route: Direct implementation (handoff rule: Medium + Low → `/implementation_engineer`). Independent architecture review: `N/A — not applicable` for this classification.

## Original Request

The user's screenshot shows the right panel → Activity → Background Tasks. A running Claude background shell task shows only "Wait for release workflows to complete" / "Shell". The user asked us to investigate and experiment whether the shell command can be obtained and, if so, to show it in the frontend.

## Goals

Show `Shell · <command>` in the Background Tasks row when the command is known, with the approved display: monospace, single truncated line, full command on hover, click to expand/collapse (REQ-005, DEC-001 = A). Keep everything else unchanged.

## Approval Basis

- Requirements baseline SR-001 approved by the user on 2026-10-05 ("agreed. approve"), including DEC-001 = A.
- No behavior-defining supplements. Product Design: N/A.

## Key Evidence

- Live probes (Claude CLI 2.1.283, SDK 0.3.280): the assistant `tool_use` (`Bash`/`Monitor`, `input.command`) arrives, then `background_tasks_changed`, then `task_started` with `tool_use_id` equal to the tool_use `id`, then the tool_result. Logs are in `evidence/`.
- AGY already knows `commandLine` (used as the description today).
- Background-task snapshots are live-only, so no persisted data is affected.

## Workspace

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/background-task-shell-command`
- Branch: `codex/background-task-shell-command`
- Base: `origin/personal` @ `4dee901d6163ca7053916fa1edc295afbfd7a6da`
- Finalization target: `origin/personal`
- Note: the worktree has no `node_modules` installed yet.

## Artifacts (absolute paths)

- Requirements (Approved): `/Users/normy/autobyteus_org/autobyteus-worktrees/background-task-shell-command/tickets/in-progress/background-task-shell-command/requirements-doc.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/background-task-shell-command/tickets/in-progress/background-task-shell-command/investigation-notes.md`
- Design spec (Ready): `/Users/normy/autobyteus_org/autobyteus-worktrees/background-task-shell-command/tickets/in-progress/background-task-shell-command/design-spec.md`
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/background-task-shell-command/tickets/in-progress/background-task-shell-command/solution-revision-record.md`
- Evidence (not behavior-defining): `.../evidence/probe-bash-bg.log`, `.../evidence/probe-monitor.log`, `.../evidence/probes/claude-bg-command-probe.mjs`
- Architecture review report: `N/A — not applicable` (Medium/Low direct route)

## Constraints

- Clean-cut: `command` is a required nullable key across contract, domain, projectors and web. There is no optional/legacy variant.
- The registry must not depend on `ClaudeSessionToolUseCoordinator`. Record tool commands before the `interruptRequested` early return. Release pending entries on tool_result. Clear everything in `clear()`.
- `autobyteus-agent-presentation-contracts/dist` is tracked: rebuild it.
- Follow `DESIGN.md` and `TESTING.md`.

## Open Risks

- RSK-001: the Claude frames are undocumented. If `tool_use_id` is dropped, the command is null and the row looks as it does today.
- Escalation triggers are listed in the design spec. Return `Design Impact` to `/solution_designer` if they occur.

## Expected Output

Implementation per design-spec §Change / Refactor Sequence, implementation-scoped checks, and `implementation-handoff.md`.

## Routing Record

- `get_handoff_rules` applied 2026-10-05. Matching rule: Medium/Low → `/implementation_engineer`.
