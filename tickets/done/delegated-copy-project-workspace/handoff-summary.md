# Handoff Summary — delegated-copy-project-workspace (autobyteus-97: a delegated copy runs in its Task's Project folder)

## Ticket

- Package: `delegated-copy-project-workspace`; Project Task `autobyteus-97`.
- Classification: `task_size=Medium`, `architectural_risk=High`; route: reviewed. Architecture review (records in the ticket); CRR-001 source Pass (no findings); API/E2E API-REV-001 Pass (95.9%); CRR-002 test-code Pass (no findings).
- Archived ticket folder: `tickets/done/delegated-copy-project-workspace/` on `personal`

## What Changed

- A new **local** copy of a Task whose Project has a linked folder runs in the Project's **first** linked folder (`projectFolderForNewCopy`): saved-Task delegation and sub-work, from Agent, Team and Org roots, catalog copies and Org configured placements; a Team copy's default and every member. The delegating run keeps its folder.
- No link, or a Task with no Project: the copy inherits the top-level run's folder, as before.
- A first link that is not an existing folder on this node refuses the delegation with `TASK_PROJECT_FOLDER_UNAVAILABLE` ("Project "<name>" has the linked folder "<path>", which is not an existing folder on this node. Fix the Project's link, or link another folder, then delegate again. Nothing was started."); no Task link, no copy, no fallback.
- `delegate_task` has no new parameter; existing copies (follow-up Tasks, restarts) keep their folder; remote copies unchanged.
- No UI code change: the copy stays nested under its delegating run; Files and Terminal follow the focused agent's folder.
- Docs: server `projects.md` (§ Folder of a new copy; Workspace Registration Boundary), `collaboration_model.md` (CM-6 sentence and status row), web `agent_orgs.md` (configured placements).

## For The User

- **A new Workspaces row:** a Project folder not yet in the Workspaces list appears there as a new row after the first delegation into it. The design accepted this; the requirements say "no UI change" (no UI code changed), so it is stated here (API/E2E API-04 `newRowForProjectFolder: true`).
- **Expected, not a defect:** a manager started under Project O that delegates a Task of Project P is listed only under O, with the copy nested there; P shows "No runs yet" (autobyteus-353: a Project lists only runs started under it).

## Integration

- The branch was current with `origin/personal` `c952758a81` at delivery start (0 behind); nothing integrated, no rerun needed. Delivery commits: the reviewers' records (`bbb7907d7f`) and docs/delivery artifacts.

## Verification

- Judged from the evidence; no user check needed. Every critical acceptance criterion is directly proven: real tool path on Agent, Team and Org roots (DCF-01…08, with a real built-server restart), real Codex and Claude copies writing their own `pwd` into F, the refusal text, and the packaged app in both modes including a Team member, with the manager as control. Details: `release-deployment-report.md` § Verification.

## Release

- `No release`: release only on the user's word (bootstrap), and the user did not ask. `release-notes.md` is ready for the next release.

## For The Solution Designer

- FU-001 (the existing-copy race behind `EXC-E2E-004`) points to `tickets/done/projects-left-navigation/follow-ups.md` FU-007, whose Sent column is empty: send one Task for both, not two.
- Not tested: a folder-scoped model catalog on a configured placement (only Codex reads its catalog per folder; AC-008 proven at unit level).
- The Claude live case (DCF-L2) added one conversation to the user's Claude history (signed-in CLI).
