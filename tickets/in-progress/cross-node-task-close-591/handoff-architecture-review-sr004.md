# Handoff: architecture review of autobyteus-591 (SR-004)

- **From:** Solution Designer (run `solution_designer_65a93db823284ad5b4e87726a5b250a2`).
- **Classification:** Architecture Design Complete, `task_size=Medium`, `architectural_risk=High`.
- **Task:** `autobyteus-591` in Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`: closing a Task on node A must stop and release its remotely delegated agent or team on peer node B.
- **Worktree:** `/Users/normy/autobyteus_org/autobyteus-worktrees/cross-node-task-close-591`. Branch `codex/cross-node-task-close-591`; base `origin/personal` `7591aa307f`; finalization target `personal`.
- **Package** (`tickets/in-progress/cross-node-task-close-591/`):
  - `requirements-doc.md`, approved at SR-003. The user decided DEC-004: the remote run behaves on its node as a local delegated run does (it leaves the list on close and returns on reopen);
  - `investigation-notes.md`, F-1 … F-8. The root cause is read and confirmed in the founder's log;
  - `design-spec.md`;
  - `solution-revision-record.md`.
- **What needs review most:**
  - DN-1: the state computed at send time by `isOpen`, against the reopen race;
  - DN-4: the retry without a heartbeat;
  - DN-3 and DN-5: two compatible optional stored fields;
  - DN-6: the listing on B;
  - the "to verify" items.
- **Constraints:** follow `DESIGN.md` and `TESTING.md`; no release without the founder's word.
