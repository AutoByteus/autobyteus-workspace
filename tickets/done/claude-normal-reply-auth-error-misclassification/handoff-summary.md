# Handoff Summary: claude-normal-reply-auth-error-misclassification

## Classification

- Task size: `Small`. Architectural risk: `Low`. Route: `Direct API/E2E`. Architecture review, code review and test-code review: `N/A — not applicable`.

## Branch State For Verification

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-normal-reply-auth-error-misclassification`
- Branch: `codex/claude-normal-reply-auth-error-misclassification`
- Integrated base: `origin/personal` @ `3514fe48e`. It was fetched at delivery start and the branch already contained it, so this is `Already current` and no merge was needed.
- Validated candidate: `fea048260`. The only delivery commit on top adds docs and delivery artifacts; it changes no code.
- Post-integration check: no new base commits, so the API/E2E results stand for this state. `scripts/check_licensing.py` and `scripts/check_repository_artifact_hygiene.py` both passed on the branch.

## What Changed

- The fix (`fc87231ba`) is in `autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session-output-events.ts`. A Claude `result` is now a turn error only when the SDK marks it as one (`is_error: true`, or an `error`/`code` field). Reply text that mentions "not logged in", "please run /login" or `authentication_failed` no longer turns a successful reply into a red `CLAUDE_RUNTIME_AUTHENTICATION_FAILED` card with the run set to Error. A real not-logged-in turn still reports `CLAUDE_RUNTIME_AUTHENTICATION_FAILED`.
- Tests:
  - New regression unit tests built from real SDK 0.3.280 frames.
  - New gated live E2E: `tests/e2e/runtime/claude-agent-auth-marker-reply.e2e.test.ts`.
  - A baseline fix for the live Claude E2E harness: the `ownSession` callback (`b786f2106`).
- Docs: one rule bullet in `autobyteus-server-ts/docs/modules/agent_execution.md`.

## Validation Evidence

| Check | Result |
| --- | --- |
| Claude backend unit tests | 240 of 240 passed |
| agent-execution and runtime-management unit tests | 1476 passed, 6 skipped |
| `typecheck` | Passed |
| Live E2E, real CLI and SDK (`RUN_CLAUDE_E2E=1`) | 4 of 4 passed: AC-001 and AC-002 on both the PATH CLI 2.1.295 and the bundled CLI |
| Red check | The old classifier reproduces the user's exact symptom over the websocket |

## User Verification Needed (AC-004)

Ask a Claude Agent SDK agent to reply with a sentence that contains "Not logged in · Please run /login" and "authentication_failed". For example: *Repeat exactly: "Not logged in · Please run /login (error code authentication_failed)."*

- Expected: the reply appears as a normal message, with no red error card, and the run returns to Idle without a red sidebar dot.
- Optional check: a Claude runtime that really is not logged in should still show the red `CLAUDE_RUNTIME_AUTHENTICATION_FAILED` error.

## Release Decision Needed

Per `RELEASE.md`, choose one:

- **Beta `v1.5.2-beta.3`**. This is the next unused beta. Desktop installs with "Receive beta updates" switched on get it.
- **Stable `v1.5.2`**. This becomes GitHub "Latest", with `release-notes.md` as the curated notes.
- **No release**. Finalize only.

## Residual Risks / Open Items

- RK-01 (accepted upstream): if a future SDK reports an auth failure without `is_error: true`, that failure would show as a normal reply instead of an auth error.
- Separate baseline item, not caused by this change: the ungated fake-CLI block in `tests/e2e/runtime/claude-agent-websocket-interrupt-resume.e2e.test.ts` (8 cases) fails on the base with "Claude opening and cleanup failed". It belongs to the owner of the Claude streaming-session lifecycle as its own item.
- Persisted data: not affected. Past runs that were wrongly marked as errors stay as stored.
