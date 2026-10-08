# Handoff Summary — task-closed-status

## What Changed
A fourth Task status, **CANCELLED** ("Cancelled" / "已取消"), meaning the Task was dropped as not needed and was not completed.
- Agents set it with `create_or_update_task` (patch only). It closes and stops the Task's workers exactly as DONE does.
- Saved-ID delegation and reactivation are refused while a Task is Cancelled. Reopening to TODO or IN_PROGRESS starts nothing.
- `list_project_tasks` filters by CANCELLED.
- The app is display-only for status:
  - On the Project board, the right-panel board and the Temp tasks board, Cancelled Tasks are hidden behind a "Cancelled (N)" toggle beside Refresh.
  - The Task pages and right-panel detail show a muted "Cancelled" pill.
  - The open count is TODO + IN_PROGRESS.
- Existing data loads unchanged, with no migration.

## Classification And Route
- `task_size=Medium`, `architectural_risk=Low`, direct route.
- Architecture review, code review and test-code review: `Not Applicable`.

## Branch State For Verification
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-closed-status`
- Ticket branch: `codex/task-closed-status`. Recorded at verification (see `user-verification.md`); the local tip includes the delivery commit.
  - `17e4299a6` feat (implementation)
  - `ee78e1e19` API/E2E checkpoint (delivery-safety commit)
  - `19a85ba3c` merge of `origin/personal` @ `ace86bf1f`
  - `c387ce7b5` delivery docs sync and artifacts
  - `151a67f19` re-integration merge of `origin/personal` @ `b5e0da508`
  - a commit that records this re-integration in the delivery artifacts
- Integration method: two merges of the latest `origin/personal`:
  1. 13 commits (idle-shutdown-background-tasks and `v1.4.99-beta.1`).
  2. During delivery, 8 more commits (archived-open-run-disappears and `v1.4.99-beta.2`). This merge was clean.
- The branch is current with `origin/personal` @ `b5e0da508`, checked by a fetch after the re-integration checks.
- One conflict, in the collaboration prompt paragraph (source, `prompt_engineering.md` and the hash pin). It was resolved as a union of the base's background-task clause and the ticket's CANCELLED wording. Every assertion from both tickets passes unchanged, and only the pinned hash changed.
- Nothing has been pushed or merged into `personal`.

## Post-Integration Verification (on the merged state)
- Server build: pass.
- Server unit, full tree: 647 files pass. 15 files fail, and they are exactly the pre-existing failure set that also fails on the base ticket's own full-unit evidence (agent-memory, application-platform, file-explorer, logging and others; none touched here). The list is in `delivery-evidence/server-unit-full-preexisting-failures.txt`.
- Server integration (3 files, including mixed-team-run-backend from the base): 20/20 pass.
- `tests/e2e/projects` gated (scripted AGY): 9/10 files and 47 tests pass, 1 skipped (live Claude). This includes CLS-API-001 and CLS-E2E-001/002.
  - The base's new `task-copy-idle-lifetime` failed in the parallel suite run: model-list timeout and slow timings under load.
  - It passed 1/1 when rerun in isolation with the base ticket's recipe.
- Web Projects specs: 102 files / 981 tests pass. The localization literal audit and boundary guard pass.
- `check_licensing.py` and `check_repository_artifact_hygiene.py` pass.
- After the second merge (web chat/stores and server run-history tests only):
  - full web `test:nuxt`: 588 files / 3996 tests pass, 0 failed;
  - localization guards pass;
  - server `tests/unit/run-history` plus the collaboration contract test: 47 files / 233 tests pass.

## Docs Sync
- See `docs-sync-report.md`. Implementation docs were verified.
- Delivery corrected `agent_team_execution.md` (DONE or CANCELLED release) and the damaged-file paragraph in `projects.md`.
- Delivery also fixed the stale `ProjectCard.vue` comment.

## User Verification Requested
1. From the worktree: `pnpm --silent isolated-app start --build`.
2. In a Project with a delegated Task, ask an agent to close the Task (`create_or_update_task` status `CANCELLED`).
3. Check that:
   - the Task leaves the lanes;
   - "Cancelled (1)" appears beside Refresh and reveals a Cancelled lane;
   - the Task page says "Cancelled" (not Done green);
   - the worker shows Offline.
4. Ask the agent to reopen the Task to TODO. Check that it returns to To Do and that nothing starts.
5. Optionally, check that a Temp task closed by an agent behaves the same.

Also please decide on the release: finalize only, or finalize and publish a release (a new beta via `scripts/desktop-release.sh beta`, as for the previous ticket).

## Residual Risks (non-blocking)
- R-002: the external Project Task Manager skill (`autobyteus-agents` repo) does not know CANCELLED. Approved out of scope; follow-up candidate.
- `delegate_task {task_id}` on a terminal Task returns `{error:{code,message}}`, unlike the description's `target_agent_run_id: null` shape. This is pre-existing DONE behavior and unchanged here.
- Downgrade: an older app may not show Cancelled Tasks (approved non-goal).
- The packaged desktop app and a real model choosing CANCELLED are proven only by the user verification above.

## Artifacts
`/Users/normy/autobyteus_org/autobyteus-worktrees/task-closed-status/tickets/in-progress/task-closed-status/` contains:
- `requirements-doc.md`, `investigation-notes.md`, `solution-revision-record.md`, `design-spec.md`, `handoff-to-implementation.md`
- `implementation-handoff.md`, `implementation-revision-record.md`
- `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-revision-record.md`, `api-e2e-test-case-ledger.md`, `api-e2e-evidence/`
- `docs-sync-report.md`, `release-notes.md`, `release-deployment-report.md`, `delivery-revision-record.md`, `delivery-evidence/`
