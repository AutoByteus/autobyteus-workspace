# Handoff: Architecture Design Complete, revised (autobyteus-609, SR-002)

- Result: `Architecture Design Complete` (revised after ARCH-REV-001), task_size `Large`, architectural_risk `High`. The route is architecture review of SR-002.
- Package, worktree, branch, base and constraints: unchanged from `handoff-architecture-design-complete.md`.

## What changed (SR-002)

- AR-001 (blocking):
  - D-I no longer reads anything. When the panel view sees the run go from live to Offline (a `false→true` change of `runStopped`; the initial value never counts), it asks `agentBackgroundTaskStore.endRunningTasksForRunEnd(runId)` to end every row still shown running as `stopped`/`run_ended`.
  - While the run is stopped, no 2 s re-read is scheduled. It reads once when the run is live again.
  - ASM-1 is corrected: every streaming runtime ends its tasks with `run_ended` at run end (Claude `:249`, native reporter `:15-23`, Antigravity `stopAll` `:82-88`). The web already zeroes the running count on Offline (`agentRuntimeStatusState.ts:66,74`).
  - `Error` is not "stopped": a recoverable-block run can be Error with its tasks alive.
  - Codex (snapshot runtime) is out of scope (DEC-007).
- N-1: a relative link uses the workspace metadata root when `workspaceRootPath` is empty, as the absolute flow does.
- E consumers: the server e2e `recent-run-projection-graphql.e2e.test.ts:77,915` is rewritten to the JSON field; the web fixture `codex-command-failure-detail.page.vue:179` is kept (still valid).
- Requirements SR-002: REQ-I's runtime scope, QR-1 (no new read; no polling while stopped), ASM-1, DEC-007. The outcome is unchanged. Approved by the Solution Designer within the direction, with the user informed.
- Design case: added to `docs/design-cases.md` Case 5.

## Documents

- `requirements-doc.md`, `investigation-notes.md` (SR-002 evidence section), `design-spec.md`, `solution-revision-record.md` (SR-002), `follow-ups.md`
- The reviewer's `design-review-report.md` and `architecture-review-revision-record.md` are unchanged by me.

## Next expected action

Architecture review of SR-002.
