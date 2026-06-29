# API/E2E Design Impact Reroute — Browser UX Mismatch

## Reroute Meta

- Date: 2026-06-29
- Reporter: api_e2e_engineer
- Classification: Design Impact / Requirement Gap clarification needed
- Trigger: User reviewed the live browser smoke screenshot and stated the implementation appears to have misunderstood the intended left/right task UI requirement.

## Upstream Artifacts

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-left-panel-team-context/tickets/in-progress/task-left-panel-team-context/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-left-panel-team-context/tickets/in-progress/task-left-panel-team-context/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-left-panel-team-context/tickets/in-progress/task-left-panel-team-context/design-spec.md`
- Supporting Product Analysis: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-left-panel-team-context/tickets/in-progress/task-left-panel-team-context/analysis-recommendation.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-left-panel-team-context/tickets/in-progress/task-left-panel-team-context/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-left-panel-team-context/tickets/in-progress/task-left-panel-team-context/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-left-panel-team-context/tickets/in-progress/task-left-panel-team-context/code-review-report.md`
- API/E2E Coverage Investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-left-panel-team-context/tickets/in-progress/task-left-panel-team-context/api-e2e-coverage-investigation.md`
- API/E2E Execution Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-left-panel-team-context/tickets/in-progress/task-left-panel-team-context/api-e2e-execution-coverage-report.md`

## Browser Evidence

- User supplied screenshot: `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_05adf8f38e4b4ed1802251c8b346d606/api_e2e_engineer_dc84655931e542e683240d5c817ea164/context_files/ctx_6d1f64063a16__image.png`
- API/E2E captured screenshot: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-left-panel-team-context/tickets/in-progress/task-left-panel-team-context/browser-evidence/design-impact-current-browser-ui.png`

## Observed UI State

A real browser smoke was run against the running frontend (`http://127.0.0.1:3010/workspace`) bound to backend port `29695`, using the shared `Nested Classroom Test Team` fixture.

The live UI shows:

1. The compact active-task context is rendered under the left workspace/run-history tree, nested below the expanded team run.
2. The right Team tab still renders a collapsible `Messages`/`Tasks` section layout, with `Tasks` collapsed or expanded depending on section state.
3. The selected task detail appears on the right Team tab as `StudentStudyGroup`, status, `Focus`, and the task body.
4. The center/team workspace panel also shows the currently focused task team/subteam card and reply composer.

The user explicitly rejected this shape as likely not matching the intended product requirement, asking whether the solution designer really intended the UI to become like this.

## Why This Is Rerouted

The implemented/reviewed design interpreted "left/right layout" as:

- left = global workspace run-history tree with compact task context under expanded live team runs;
- right = Team tab detail pane for selected task/reference.

The user appears to have expected a different left/right active-task layout, likely not the current combination of:

- active task navigation embedded deep inside the global workspace tree,
- center focused subteam card/composer,
- right Team tab collapsible `Messages`/`Tasks` detail section.

This is not safely classifiable as a bounded implementation bug from API/E2E because the current implementation matches the reviewed design artifacts as they were interpreted. The user feedback indicates a possible requirement/design mismatch requiring the solution designer to re-clarify the intended UI composition.

## Questions For Solution Designer

1. Was the intended design really to place the active task navigation/context inside the left workspace/run-history tree, below the expanded team run, while keeping the right Team tab as a collapsible `Messages`/`Tasks` detail surface?
2. Should the task UI instead be a dedicated left/right layout inside the Team tab or workspace center/right region, rather than embedded in the global left workspace tree?
3. Should the center panel still show a focused subteam card/composer when an active task-team is selected, or should the active-task detail own that presentation?
4. Should the right Team tab retain the visible `Messages`/`Tasks` accordion headers, or should it become pure task/reference detail when task context is selected?
5. Please decide whether this is a design correction, requirements correction, or user misunderstanding before implementation continues.

## API/E2E Recommendation

Pause delivery and route back to `solution_designer` for design clarification/rework. Do not treat the browser-observed UI mismatch as pass/fail implementation evidence until the intended left/right layout is re-established.
