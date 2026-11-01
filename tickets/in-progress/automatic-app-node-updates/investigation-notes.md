# Investigation Notes — automatic-app-node-updates (autobyteus-356)

## Meta
- Task `autobyteus-356`, Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`, from `/project_task_manager` (run
  `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), 2026-11-01, at the user's word.
- Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/automatic-app-node-updates`, branch
  `codex/automatic-app-node-updates`, from `origin/personal` @ `3b9dc912a1` (beta.10 records) after `git fetch`.
  Target `personal`.
- Authorities read (this conversation): requirements gate, templates, `DESIGN.md` (rule 9), `TESTING.md`.

## Facts (`Read` at `3b9dc912a1`)
| ID | Finding |
| --- | --- |
| F-01 | The existing switches. One node setting per kind (`UPDATE_NOTIFICATION_KINDS = AGENT_PACKAGE, SKILL_SOURCE, AGENT_RUNTIME`, `update-notifications/domain/update-notification.ts:2`), read and written by `UpdateAutomationSettingsService` (`isAutomatic`, interval 15–1440 min). The node's `UpdatePass` (`update-pass.ts:64-68`) checks due sources, then applies automatic updates. The web shows `AutoUpdateSwitch.vue` through `updateAutomationStore.ts`. Outcomes are "Updated automatically to …" and an automatic failure ("Nothing was changed") (`autobyteus-web/docs/settings.md:411-458`, which says "never the app") |
| F-02 | The desktop app's updater (`autobyteus-web/electron/updater/appUpdater.ts`): a channel `stable`/`beta` persisted in `appUpdateChannelStore`; an automatic check schedule (`AppUpdateCheckSchedule`, launch then every interval; `startAutoCheck`); `autoDownload = false` (`:96`); the user's Download, then "Install update and restart" (`installUpdateAndRestart` → `prepareForInstall` → `quitAndInstall`, `:262-282`). The app row sits in the Notification Center's "Software update". The desktop's embedded server is part of the app and is always updated with it |
| F-03 | Docker nodes (autobyteus-305): the starter updates the server in place to a version or a track (`docker/starter/update-service.mjs:52-66`), verifies a signed package, and rolls back a failed trial. The desktop's Nodes page asks each node `GET /rest/node-update` and **offers this app's version as the target** (`autobyteus-web/stores/nodeServerUpdateStore.ts:52-53`); "Update to <version>" is the only request (`:143`) |
| F-04 | Same version rule: DESIGN rule 9 says the desktop and its nodes are built from one release. beta.10 renamed GraphQL fields (PTM), so a node a version apart breaks |
| F-05 | autobyteus-285 (merged, in beta.10): busy runs resume by themselves after an update into a version with the recorder; idle runs are untouched; a plain restart resumes nothing. 339: the update restart is reliable and installs after an incomplete stop when the server is gone |
| F-06 | Electron offers `powerMonitor.getSystemIdleTime()` (seconds since the last user input, system-wide) and `powerMonitor` suspend/resume events (Electron API docs; not run here) |
