# Handoff Summary — task-closed-status (DR-002)

## What Changed
A fourth Task status, **CANCELLED** ("Cancelled" / "已取消"), meaning the Task was dropped as not needed and was not completed. SR-006 renamed it from the earlier working name CLOSED, with no alias: CLOSED and CANCELED are rejected.
- Agents set it with `create_or_update_task` (patch only). It stops the Task's workers exactly as DONE does.
- Saved-ID delegation and reactivation are refused while a Task is Cancelled, with messages that name CANCELLED. Reopening to TODO or IN_PROGRESS starts nothing; after that, the assigner can reactivate as after DONE.
- `list_project_tasks` filters by CANCELLED. Invalid-status errors list all four values.
- The app is display-only for status:
  - The Project board, right-panel board and Temp tasks board hide Cancelled Tasks behind a **Cancelled (N)** toggle beside Refresh. The toggle is absent at 0.
  - With the toggle on, Cancelled is the **last column, after Done** (SR-005): four equal columns, or three on the Temp board. Narrow widths and the right panel stack the columns, with Cancelled last.
  - The Task pages and right-panel detail show a muted "Cancelled" pill, distinct from Done's green.
  - The open count is TODO + IN_PROGRESS.
- Existing data loads unchanged, with no migration.

## Classification And Route
- `task_size=Medium`, `architectural_risk=Low`, direct route (unchanged through SR-005/SR-006).
- Architecture review, code review and test-code review: `Not Applicable`.

## Branch State For Verification
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-closed-status`. Branch `codex/task-closed-status`, local only; nothing pushed or merged.
- Commits since the base:
  - `17e4299a6` feat
  - `ee78e1e19` API/E2E r1 checkpoint
  - `19a85ba3c` and `151a67f19` merges of `origin/personal`
  - DR-001 delivery records
  - `814e41a26` SR-005 last column
  - `7f7b2c8fb` SR-006 CANCELLED rename
  - `2dc190601` API/E2E r2 checkpoint
  - the DR-002 delivery commit (docs sync and artifacts)
- Current with `origin/personal` @ `b5e0da508` (re-fetched at DR-002 start; 0 behind).
- DR-001 resolved one integration conflict, in the collaboration-prompt paragraph, as a union of both tickets' wording. See `release-deployment-report.md`.

## Verification Evidence
- API-REV-002 (95%) on `7f7b2c8fb`:
  - Server unit 71 files / 680 tests; integration 2/17.
  - Projects E2E: ungated 4/27; gated CLS-E2E-001/002 plus every DONE closure, reactivation and feed case.
  - Web Projects specs 103/990; full web `test:nuxt` 588/3996, 0 failed.
  - Browser probe PMU 001/002/005/009/015/017: 6/6. Measured: four 251px columns with Cancelled last; three 340px columns with the toggle off; stacked at 390px and in the right panel; the Temp board has three columns.
- DR-001 (integration): the full server unit tree fails only the 15 pre-existing files that also fail on the base. Integration 20/20, gated Projects E2E pass, licensing and hygiene pass.
- DR-002 delta: the contract and parity tests pass (2/8); licensing and hygiene pass.
- Known non-ticket flakiness, which does not block this ticket:
  - `task-copy-idle-lifetime`, from the idle-shutdown ticket, misses timing bounds under host load.
  - `ad-hoc-task-delegation` Org root has a `.tmp` readdir race in the parallel run.
  - Both pass alone or are unrelated to this ticket's code.

## Docs Sync
See `docs-sync-report.md`. Delivery corrected:
- `agent_team_execution.md`
- `projects.md` (damaged file)
- `agent_communication.md` (DONE or CANCELLED publish and re-publish)
- `prompt_engineering.md` (merge union)
- the `ProjectCard.vue` comment

The implementation's SR-005/SR-006 doc text was verified. The release notes were rewritten for "cancel" and the last-column layout.

## User Verification Requested
A fresh isolated desktop instance built from this branch is running:
- Instance: **`iso-51705-f244`** (backend `http://127.0.0.1:51706`; GraphQL status enum `TODO, IN_PROGRESS, DONE, CANCELLED`). It was built at `2dc190601`; later commits change docs only.
- The stale pre-rename instance `iso-54394-19b5` was already stopped, and its data root has been removed.

Steps:
1. In a Project, have an agent delegate a Task. Then ask the agent to cancel it (`create_or_update_task` status `CANCELLED`).
2. Check that:
   - the Task leaves To Do / In Progress / Done;
   - **Cancelled (1)** appears beside Refresh;
   - turning it on shows Cancelled as the **fourth column after Done**;
   - the Task page shows a muted "Cancelled" pill (not Done green);
   - the worker shows Offline.
3. Ask the agent to reopen the Task to TODO. Check that it moves back to To Do live and that nothing starts.
4. Optionally, check that a Temp task cancelled by an agent shows the same way (Open / Done / Cancelled).
5. When you are done: `pnpm --silent isolated-app stop iso-51705-f244`, or ask delivery to stop it.

Please also decide on the release: finalize only, or finalize and publish a new beta (`scripts/desktop-release.sh beta`, as for the previous tickets; the current beta is `v1.4.99-beta.2`).

## Residual Risks (non-blocking)
- R-002: the external Project Task Manager skill (`autobyteus-agents` repo) does not know CANCELLED. Approved out of scope; follow-up candidate.
- `delegate_task {task_id}` on a terminal Task returns `{error:{code,message}}`, unlike the description's `target_agent_run_id: null` shape. This is pre-existing DONE behavior and unchanged here.
- Downgrade: an older app may not show Cancelled Tasks (approved non-goal).
- The packaged app and a real model choosing CANCELLED are proven only by the user verification above.

## Artifacts
`/Users/normy/autobyteus_org/autobyteus-worktrees/task-closed-status/tickets/in-progress/task-closed-status/` contains:
- `requirements-doc.md`, `investigation-notes.md`, `solution-revision-record.md`, `design-spec.md`, `handoff-to-implementation.md`
- `implementation-handoff.md`, `implementation-revision-record.md`
- `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-revision-record.md`, `api-e2e-test-case-ledger.md`, `api-e2e-evidence/`
- `docs-sync-report.md`, `release-notes.md`, `release-deployment-report.md`, `delivery-revision-record.md`, `delivery-evidence/`
