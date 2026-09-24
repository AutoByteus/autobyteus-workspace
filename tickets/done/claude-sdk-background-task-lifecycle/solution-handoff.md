# Solution Handoff — claude-sdk-background-task-lifecycle

- Result classification: `Architecture Design Complete`
- Package identifier: `claude-sdk-background-task-lifecycle`
- Current solution revision: `SR-004`
- Task size / architectural risk: `Small` / `Low` (evidence in `design-spec.md` → "Task Size And Architectural Risk")
- Approval state: requirements `Approved` by the user on 2026-09-24, including DEC-003 (30 min ceiling). Quotes are in `requirements-doc.md` → Document Status.

## Workspace

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-background-task-lifecycle`
- Branch: `codex/claude-sdk-background-task-lifecycle`
- Base: `origin/personal` @ `9267d11c8`
- Finalization target: `origin/personal`
- Note: the worktree has no `node_modules` yet; run `pnpm install` before tests.

## Original Request

The user reported that Claude-runtime agents' background Bash commands never finish. The delivery engineer's Electron build was killed three times, and the agent kept promising to report back. The user asked us to investigate whether our Claude Agent SDK integration is at fault.

## Findings (summary)

- Root cause: AutoByteus runs one SDK `query({prompt: string})` per turn and closes it on `result`, so the Claude CLI exits each turn and kills its background tasks. The CLI also auto-backgrounds foreground Bash calls that exceed their timeout, and those are killed the same way.
- Our SDK usage is valid "single message input" mode. The SDK docs recommend streaming input mode for long-lived hosted sessions; that is the approved follow-up ticket.
- Evidence: `investigation-notes.md` and `probe-evidence/probe-results.md` (probes A-D against the real API).

## Approved Scope (temporary fix)

For every Claude turn query, force these CLI env vars at the `ClaudeSdkClient` boundary:
- `CLAUDE_CODE_DISABLE_BACKGROUND_TASKS=1`
- `BASH_MAX_TIMEOUT_MS=1800000`

Add unit tests and a docs paragraph. No session/turn lifecycle changes. Details are in `design-spec.md` → File Responsibilities / Change Sequence.

Acceptance criteria: AC-001..AC-006 in `requirements-doc.md`. Live validation: AC-002 (background request ends up in the foreground and completes, marker exists) and AC-006 (30-min ceiling is advertised or accepted; don't wait 30 min), with both the PATH CLI and the SDK-bundled CLI.

## Out Of Scope / Follow-Up

- Migrating the Claude backend to SDK streaming input mode is the next, separate ticket, confirmed by the user. That ticket removes this policy env.
- `BASH_DEFAULT_TIMEOUT_MS` is unchanged.
- The in-flight `claude-sdk-builtin-tool-restriction` branch is untouched.

## Open Risks

- A user-level `~/.claude/settings.json` `env` block could override the spawn env (to document, not engineer around).
- A single command is capped at 30 min.
- The model must request a long `timeout`; otherwise the 2-min default applies and the command fails visibly.

## Artifacts (absolute paths)

- `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-background-task-lifecycle/tickets/in-progress/claude-sdk-background-task-lifecycle/requirements-doc.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-background-task-lifecycle/tickets/in-progress/claude-sdk-background-task-lifecycle/investigation-notes.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-background-task-lifecycle/tickets/in-progress/claude-sdk-background-task-lifecycle/design-spec.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-background-task-lifecycle/tickets/in-progress/claude-sdk-background-task-lifecycle/solution-revision-record.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-background-task-lifecycle/tickets/in-progress/claude-sdk-background-task-lifecycle/probe-evidence/probe-results.md` (and `probe.mjs`, `probeD.mjs`)
- Architecture review artifacts: N/A — not applicable (direct route: Small / Low)

## Routing

- Handoff rule outcome: matched the rule "Architecture Design Complete with task_size=Small or Medium and architectural_risk=Low" → `/implementation_engineer` (direct implementation route; independent architecture review skipped per the rule. Implementation self-checks and executable validation still apply).
