# Solution Handoff — `left-panel-follow-ups`

- Result: **Architecture Design Complete** (SR-001), `task_size=Small`, `architectural_risk=Low`.
- Origin: Project Task `autobyteus-388`, from `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), 2026-11-06.

## Decisions

- **FU-001 and FU-005: keep GraphQL `createAgentRun`.**
  - It is the documented one-call creation API, used by 90 server test files and 18 probes.
  - Only the web's unused `CreateAgentRun` document goes.
- **FU-003: rename** `WorkspaceAgentRunsTreePanel` to `RunSectionPanel`, with its specs, localization keys and docs.
- **FU-004: the open Projects view follows runs started or removed elsewhere within one poll.**
  - It compares the run history poll's set of root runs and re-reads the loaded Projects when it changes.
  - No new feed event: one at `recordStart` would race with the run's own records.

## Approval

Within the direction; the user is informed. The Task allows "done, or explain why not".

## Classification

Small / Low:
- no contract or data change;
- a mechanical rename;
- one web store trigger.

## Artifacts

All in `/Users/normy/autobyteus_org/autobyteus-worktrees/left-panel-follow-ups/tickets/in-progress/left-panel-follow-ups/`:
- `requirements-doc.md`
- `investigation-notes.md`
- `design-spec.md`
- `solution-revision-record.md`

## Workspace

- Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/left-panel-follow-ups`, branch `codex/left-panel-follow-ups`.
- Base and target: `origin/personal`, base at `d6bcff577b`.
- Dependencies are installed. The docs are uncommitted.

## Route Applied

`get_handoff_rules` (2026-11-06): Small or Medium with Low risk → `/software_engineering_team/implementation_engineer`. Release only on the user's word.
