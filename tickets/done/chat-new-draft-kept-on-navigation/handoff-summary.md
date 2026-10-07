# Handoff Summary — chat-new-draft-kept-on-navigation

## Status

- Delivery state: **Delivery Completed (DR-002).** The user verified on 2026-10-07 ("finalize and release a new beta."); see `user-verification-record.md`.
  - Merged into `personal` as `55d6db0c1` and pushed.
  - Beta `v1.4.96-beta.2` (release commit `154bedc84`) is published:
    - all 4 workflows succeeded;
    - the GitHub prerelease, the updater metadata and the Docker `:1.4.96-beta.2`/`:beta` tags are verified.
  - The worktree and the local and remote branches are cleaned up.
  - The sections below record the pre-verification state and are kept for history. The worktree paths in them no longer exist; the archive is `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/chat-new-draft-kept-on-navigation/`.
- Classification (unchanged): `task_size=Medium`, `architectural_risk=Low`, direct low-risk route. Architecture, source and test-code review: `Not Applicable — direct low-risk route`.

| Stage | Revision | Result |
| --- | --- | --- |
| Requirements | SR-003 content + DEC-002 = A (SR-004) | User-approved 2026-10-07 |
| Product UI/UX | ui-ux-spec + VIS-001..008 | User-confirmed 2026-10-07 |
| Design | SR-005 | Ready |
| Implementation | IR-001 `eef9633f5`, IR-002 `9e902002d` | Done |
| Code review | CRR-001 | Failure-origin review of F-001 only → Local Fix |
| API/E2E | API-REV-002 (round 2) | Pass, 95% confidence; live run 15/15 |
| Docs sync | DR-001 | Updated: `chat.md`, `workspace_layout.md`, `TESTING.md` |

| Item | Value |
| --- | --- |
| Worktree | `/Users/normy/autobyteus_org/autobyteus-worktrees/chat-composer-draft-persistence` |
| Ticket branch | `codex/chat-composer-draft-persistence` (local, not pushed) |
| Finalization target | `origin/personal` (bootstrap) |
| Validated candidate | `9e902002d` plus the local delivery checkpoint `8ba19cc85` (live probe, `package.json` script, review/validation artifacts and evidence) |
| Integrated base | `origin/personal@7d130309e`. It had advanced 6 commits past `cfeda548b` (reactivate-done-task-runs, beta `1.4.96-beta.1`), all server/collaboration/task files and docs. It was merged into the ticket branch as `ec4c73929` with no conflicts and no overlap with the changed web files. |
| Post-integration check | The focused web suites on `ec4c73929` pass: 17 files / 126 tests (store, launch, useRunStart, AppLeftPanel, `components/chat`, chat page, workspace-history-draft-send, shell catalog) and 15 files / 38 tests (localization). |
| Uncommitted (until finalization) | Docs-sync edits and delivery artifacts |
| Never committed | `autobyteus-application-backend-sdk/dist/`, `autobyteus-application-sdk-contracts/dist/` (build output) |

## What Changed (for you)

1. A New chat with typed text is kept as a **Draft**. A one-line row with its text appears directly under **Chat**, newest first.
2. Clicking the row reopens the draft exactly as left: text, attachments, `/` skills, `@` mentions, target agent/team, workspace, model and settings, Auto-approve and member overrides. The row is selected, and Chat is not.
3. Chat, the pencil, Run, **+** and the workspace-tree **+** open a fresh New chat. Earlier drafts with text are kept, and a textless New chat is simply dropped.
4. **×** discards a draft without confirmation. A draft being sent cannot be discarded.
5. Clearing an open draft's text shows "Empty draft" while it is open. Once you leave it, it is gone.
6. A successful send removes the row. The row keeps the sent text until the run opens.
   - A send that fails before the run exists keeps the draft.
   - A failure inside the new run shows in that run, as today.
7. Drafts are session-only. A reload shows none.

## Verification Evidence

- A live browser run on the real stack (headless Chrome, Nuxt dev, server `dist` built from the worktree, real Codex) passed all 15 cases, D00–D14. Evidence: `api-e2e-evidence/live-run-4/`.
  - Scenarios: SCN-001..005 and AC-001..010.
  - Visuals: VIS-001..008 geometry, tokens, motion and reduced motion.
  - Layout and input: the narrow drawer with touch, keyboard and focus.
  - Reload and zh-CN.
  - Real Agent and Team sends with a real upload.
  - The REQ-006 failure mapping.
- F-001 (the sent row read "Empty draft" during an agent send) was fixed by IR-002 and rechecked in D00, D07 and D09.
- Full web suite (round 2): 3783 tests pass. The 10 failing files / 34 failing tests are the base `cfeda548b` failures, none in the changed files.

## Suggested Checks For You

1. Start a New chat, pick a Team, attach an image and type some text. Open any other run, then click the row under **Chat**. Everything should be back.
2. Click **Chat** (or the pencil) and type a second draft. Both rows are listed, newest first.
3. Click **×** on one row; it disappears. Send the other one; its row goes away when the run opens.

## Residual Risks / Non-goals

- The packaged Electron shell was not run. It is unchanged, and the renderer is web-equivalent.
- In D06/D08 the failures were injected as GraphQL error responses, so the server-side causes were not reproduced.
- Server-side draft uploads of discarded or dropped drafts are left in place, as before (out of scope).
- Out-of-scope observation: at an 800 px viewport the New chat model menu's runtime flyout opens under the left panel. This is not caused by this change.

## Pending After Your Verification

1. Archive the ticket to `tickets/done/`.
2. Commit the docs and delivery artifacts, push the ticket branch, merge into `origin/personal` and push.
3. Run a release only if you ask for one (for example "release a new beta"). `release-notes.md` is ready.
4. Clean up the worktree and the branch.
