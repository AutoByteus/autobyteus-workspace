# Handoff: Design Revised (SR-004) — autobyteus-572 (chat-media-path-playback)

- Result: `Architecture Design Complete` (revision), SR-004, task_size `Medium`, architectural_risk `Low` (unchanged) → implementation.
- Trigger: API-REV-001 API-03 failed; failure-origin review CRR-001 = Design Impact (`code-review-report.md`).
- Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-media-path-playback/tickets/in-progress/chat-media-path-playback`; branch `codex/chat-media-path-playback` (see `git log -1`).
- Approval: requirements as approved by the user (DEC-001 = A); DEC-004 and AC-006's folder exception decided by the Solution Designer within the direction (REQ-005); user informed.

## Answers to CRR-001's four questions

1. Retry for every file the phone viewer opens (both routes, every type): one failure state (DEC-004).
2. Retry on a broken download (`failed`) and a missing file (`not-found`); no Retry for a folder. AC-006 keeps its outcome with that exception.
3. The owners reload: `useMobileNodeFile.reload()` (node files); the workspace mount re-opens with `explorer.openFileReadOnly(openPath)` (D-7).
4. Coverage: keep MSP-91's outside Retry assertion; add an outside-folder missing video (message + Retry; create the file; Retry opens and plays it) and an outside-folder folder path (message, no Retry); unit for `reload()` and the viewer's `retry`.

## Expected next action

Implement D-7, then API/E2E reruns API-03 and the new cases (server `test:integration` and `pnpm test:e2e` "Next Round" as API/E2E marked).
