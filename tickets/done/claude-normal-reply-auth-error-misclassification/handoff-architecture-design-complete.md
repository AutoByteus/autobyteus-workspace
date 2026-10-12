# Handoff — Architecture Design Complete (direct implementation route)

- Package identifier: `claude-normal-reply-auth-error-misclassification`
- Project Task: `project_task_74fdb459-5ea9-4507-9e05-2aa29130a39e` (delegated by `/project_task_manager`, run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`)
- Current SR: `SR-001`
- Result: `Architecture Design Complete`, `task_size: Small`, `architectural_risk: Low` → direct implementation route (no independent architecture review)
- Priority: **URGENT**. The user wants a fix and a release promptly. The Task's done-conditions include delivery in a release and the user checking it in the app.

## Original Request And Goals

The user (2026-10-12): "we need to fix this problem immediately… find out why this error is introduced, and then fix that. In the past we do not have such issues." Claude Agent SDK runs show a red "An Error Occurred – CLAUDE_RUNTIME_AUTHENTICATION_FAILED" card whose text is the agent's own normal reply, and the run's sidebar dot turns red.

Done conditions (from the Task):
1. Cause and introducing change identified with evidence. **Done** (below).
2. A normal reply mentioning login/auth is shown as a normal message, with no error card and no error status.
3. Real "Not logged in" / auth failures still reported.
4. Regression test with realistic SDK result payloads (both cases).
5. Delivered in a release; the user checks it in the app.

## Root Cause (evidence: investigation-notes S-01..S-07, R-01..R-04)

- `resolveClaudeTurnTerminalError` (`autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session-output-events.ts`) treats a result as an error when its text contains "authentication_failed", "not logged in" or "please run /login", even when `is_error` is false. On a successful turn, `result` is the agent's final reply.
- **Introduced by f5866908a (2026-06-29, "checkpoint: claude agent sdk startup fix").** 29c1fa66b (2026-10-03) did not change this logic; it only added redaction and the `errors[]` fallback. The Project Task Manager's correction is confirmed. The September streaming-input rewrite kept the same behavior (the old path also failed the turn).
- **Why the user didn't see it before:** it's a latent bug triggered by what the agent writes. A scan of all local run history (last reply of each turn) found 17 replies containing a marker. Every one before 2026-09-29 came from a Codex run, which doesn't use this check. The first Claude SDK case is 2026-09-29, then 6 on 2026-10-12, when Claude agents were working on runtime login topics ("installed but not logged in", UNK-001). No frontend or status change made it newly visible.
- Full effect on a misclassified turn: red error card, run status ERROR (red dot), no `TURN_COMPLETED`, reply not added to the session message cache, `hasCompletedTurn` not set, result frame not projected. The reply itself is still in memory traces. Tool results are not affected. Delegated copies are affected the same way as any run, and the fix covers them through the same single path.

## Fix (design-spec.md)

Change only the error predicate: `isErrorResult = payload.is_error === true || Boolean(errorCode)`. Then, only for error results, the markers choose `CLAUDE_RUNTIME_AUTHENTICATION_FAILED` over `CLAUDE_RUNTIME_RESULT_ERROR`. Keep message precedence, the `errors[]` fallback and redaction unchanged. Don't touch the tracker, session or frontend.

Regression tests (REQ-004), using real SDK 0.3.280 frame shapes from `probe-evidence/`:
- classifier: a success result (`is_error:false`, `terminal_reason:"completed"`) whose `result` contains all markers → `null`; the real failure result → auth failure.
- session level (`claude-session.test.ts`): a success turn with a marker reply → `TURN_COMPLETED`, status IDLE, reply cached, no ERROR. Real failure frames (synthetic assistant `error:"authentication_failed"` + result `is_error:true`, `terminal_reason:"api_error"`) → ERROR `CLAUDE_RUNTIME_AUTHENTICATION_FAILED: Not logged in · Please run /login`, status ERROR.
- Checks: `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-execution/backends/claude --no-watch`, `pnpm -C autobyteus-server-ts typecheck`.

## Approval Basis

Requirements approved by the Solution Designer within the Task's direction. There were no `Needs user` decisions (DEC-001 predicate choice, DEC-002 no history repair). The user is informed through this result.

## Workspace

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-normal-reply-auth-error-misclassification`
- Branch: `codex/claude-normal-reply-auth-error-misclassification`
- Base: `origin/personal` @ `3514fe48eabedc5b0a33522110aa30665e3af17c`; finalization target `origin/personal`

## Artifacts (absolute paths; folder `…/tickets/in-progress/claude-normal-reply-auth-error-misclassification/`)

- requirements: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-normal-reply-auth-error-misclassification/tickets/in-progress/claude-normal-reply-auth-error-misclassification/requirements-doc.md`
- investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-normal-reply-auth-error-misclassification/tickets/in-progress/claude-normal-reply-auth-error-misclassification/investigation-notes.md`
- design: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-normal-reply-auth-error-misclassification/tickets/in-progress/claude-normal-reply-auth-error-misclassification/design-spec.md`
- solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-normal-reply-auth-error-misclassification/tickets/in-progress/claude-normal-reply-auth-error-misclassification/solution-revision-record.md`
- supplements: `…/probe-evidence/sdk-0.3.280-not-logged-in.frames.jsonl`, `…/probe-evidence/sdk-0.3.280-normal-reply-mentioning-login.frames.jsonl`, `…/probe-evidence/turn-final-marker-scan.txt`, `…/probe-evidence/scan-turn-final-replies.py`
- architecture review artifacts: `N/A — not applicable` (Small/Low direct route)
- screenshots: `/Users/normy/.autobyteus/server-data/projects/project_a1377344-25db-482a-97cc-ecfdb0fb495a/tasks/project_task_74fdb459-5ea9-4507-9e05-2aa29130a39e/context/ctx_1e62525832ce__32.png`, `…/ctx_4da2c4742b22__33.png`

## Open Risks

- RK-01: a future SDK reporting auth failure without `is_error:true`. Accepted; escalation trigger in design-spec.

## Route Applied

`get_handoff_rules` → rule "Architecture Design Complete with task_size=Small or Medium and architectural_risk=Low" → `/software_engineering_team/implementation_engineer`.

## Next Expected Action

Implementation Engineer implements, self-checks, and routes onward per its rules. Delivery returns `Delivery Completed` to the Solution Designer after the release and the user's in-app check (AC-004).
