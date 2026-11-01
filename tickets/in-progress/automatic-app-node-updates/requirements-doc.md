# Requirements Document — automatic-app-node-updates (autobyteus-356)

## Document Status
- Status: **Ready for Approval**: DEC-001 (timing) needs the user; DEC-002 and DEC-003 decided within the direction (the user's Task comment: a plain switch, no questions). Current solution revision ID: `SR-001`.
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), Task
  `autobyteus-356`, 2026-11-01. The user's words: "I want to have this automatic update and restart feature for the
  app, the desktop application and the server itself as well … I enable this, just like runtime … when there's a new
  beta release, or agent server package, it automatically updates."
- Workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/automatic-app-node-updates`, branch
  `codex/automatic-app-node-updates`, base `origin/personal` @ `3b9dc912a1`.

## Problem And Desired Outcome
- **Problem:** the app and Docker nodes update only on a click. Agent packages, skill sources and runtimes already
  have an "Update automatically" switch; the app and the node server do not.
- **Desired outcome:**
  - with the switch on, a new release on the user's channel is installed and the app restarts by itself;
  - each Docker node with its switch on follows the desktop to the same version;
  - with the switch off, nothing changes;
  - busy agents continue after the restart (autobyteus-285).
- **Success:** on an isolated app and a real test Docker node, a new release appears; with the switches on, both end
  on the new version without a click, and the outcome rows say "Updated automatically to …"; with them off, nothing
  happens; a failed update leaves the old version running.

## Requirements (candidates)
| ID | Requirement | Feasibility | Source |
| --- | --- | --- | --- |
| REQ-001 | **App switch.** An "Update automatically" switch for the desktop app, **off by default**, beside the existing switches. Off: today's behavior (check, show the row, the user clicks) | N/A | Task; the user's standing rule |
| REQ-002 | **Automatic install.** With it on, when a check finds a newer release on the app's channel (DEC-002), the app downloads it, then installs it and restarts **when DEC-001 allows**, without a click. The embedded server is updated with it | Read: `appUpdater.ts` already downloads and installs on demand; `quitAndInstall` path (339) | Task |
| REQ-003 | **Node switch.** Each Docker node has an "Update automatically" switch, off by default. With it on, the node is updated **to the desktop's version** whenever it is older (DEC-003), through its in-place update (signed, verified, rolled back on failure) | Read: `nodeServerUpdateStore.ts` offers the app's version; 305's starter (proven live, DEL-14) | Task; DESIGN rule 9 |
| REQ-004 | **Failure.** A failed download, verification, install or trial leaves the old version running; the row shows "Automatic update failed. Nothing was changed." with the reason, and an automatic retry waits (the existing retry gap) | Read: electron-updater keeps the old app on failure; the starter rolls back | Existing outcomes |
| REQ-005 | **Outcomes.** After an automatic update, the kind's row says "Updated automatically to <version>" (unread until seen), as for packages | N/A | Existing outcomes |
| REQ-006 | **Nothing to agents.** No agent can turn the switches on or trigger an update | N/A | Task |

## Decisions
| ID | Question | Options | Recommendation | Owner | Status |
| --- | --- | --- | --- | --- | --- |
| DEC-001 | When may the app install and restart by itself? | (A) as soon as the download is done; (B) once you have not used the computer for 30 minutes (keyboard and mouse idle); (C) only at night (for example 1:00–5:00); (D) only when you quit the app | **B**: it covers the night case, never restarts the app under your hands, and does not wait for a time window if you are away in the day. Busy agents do not block it (they resume, 285) | User | Needs user |
| DEC-002 | Which releases count? | The app's existing channel setting (stable or beta) | **Reuse the existing channel**; nodes follow the desktop, so they need no channel of their own | Solution Designer (the user: "just a normal setting, no need to ask", Task comment 2026-11-01) | Decided |
| DEC-003 | How do Docker nodes stay on the desktop's version? | (A) the desktop updates each node whose switch is on to its own version once it runs a newer one; (B) each node updates itself from the channel | **A**: it meets the Task's constraint (same version, DESIGN rule 9) by construction; B lets a node move ahead of the desktop. Cost of A: a node updates only while a desktop is running | Solution Designer (within the Task's constraint) | Decided |
