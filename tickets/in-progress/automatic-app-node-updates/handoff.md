# Handoff — automatic-app-node-updates (autobyteus-356) → architecture review

- From: Solution Designer, 2026-11-01. Task `autobyteus-356`, Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`,
  requested by `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`).
- Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/automatic-app-node-updates`, branch
  `codex/automatic-app-node-updates`, base `origin/personal` @ `3b9dc912a1`. Target `personal`.
- Package (all in `tickets/in-progress/automatic-app-node-updates/`): `requirements-doc.md` (Approved, SR-002; DEC-001
  by the user), `investigation-notes.md` (F-01..F-12), `design-spec.md` (Ready), `solution-revision-record.md`,
  `follow-ups.md`.
- Classification: Medium / **High** (unattended app restart; unattended remote node updates; two desktop records
  extended).
- Please check especially:
  1. the gates against loops: `blocksAutomatic` (one automatic install per version) and one node attempt per version;
  2. the start-time reconcile that detects an operating-system install failure (DS-002);
  3. no downgrade, from the `relation === 'newer'` check and `allowDowngrade = false`;
  4. that REQ-006 holds: both switches are desktop-only;
  5. the persisted-data decision (`Directly Usable — No Migration`).
- Constraints for later stages: off by default; test data only; live Codex tests use `gpt-6.1-terra` (effort medium);
  prove from a clean clone; no "the user has verified" in Done-when; release only on the user's word.
