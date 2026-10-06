# Solution Design Handoff — delegated-row-clean-style

- Result: `Architecture Design Complete`. Classification `task_size=Small`, `architectural_risk=Low`. Direct implementation route.
- Package: `delegated-row-clean-style`, `SR-001`. From `/solution_designer`, 2026-10-06.

## Request And Goal

The user split the approved delegated-row restyle out of `task-run-resources-workspace-cleanup` to ship it first. Delegated rows in the Workspaces tree should look like normal tree rows under Agent, Team and Org roots. The user then wants to return to the paused disappearing-rows ticket.

## Approval Basis

- Behavior: REQ-010 / AC-011 of the source ticket, approved as SD-AP-001 (2026-10-06).
- UI: Product UI/UX spec @ `a38bd6e`, user-confirmed ("perfect. i like the UI. now i confirm").
- Split: user instruction SD-AP-002.

## Artifacts (absolute paths)

- Requirements: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-row-clean-style/tickets/in-progress/delegated-row-clean-style/requirements-doc.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-row-clean-style/tickets/in-progress/delegated-row-clean-style/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-row-clean-style/tickets/in-progress/delegated-row-clean-style/design-spec.md`
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-row-clean-style/tickets/in-progress/delegated-row-clean-style/solution-revision-record.md`
- UI/UX spec (Product, read-only): `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/task-run-resources-workspace-cleanup/ui-ux-spec.md`; visual references `.../visual-references/VIS-001-*.png`, `VIS-008-*.png`
- Independent review artifacts: `N/A — not applicable` (Small/Low direct route).

## Workspace

- Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-row-clean-style`, branch `codex/delegated-row-clean-style`.
- Base `origin/personal@23d6c877ada66058453f3e466dd6c7d302972610`; finalization target `origin/personal`.

## Scope

Only `WorkspaceTransientExecutionRow.vue` and `WorkspaceAgentOrgHistoryCollection.vue` (plus tests). The exact classes are in the design spec. Do **not** bring over the leave motion (`TransitionGroup`, `useLeavingTreeRows`, `treeRowLeave.css`) or any closure code.

## Related Paused Package

- `task-run-resources-workspace-cleanup` is **paused by the user** until this ticket is delivered.
- Its worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/task-run-resources-workspace-cleanup` holds uncommitted in-progress implementation and must be preserved as is.
- REQ-010 is moved out of that package (its SR-007).

## Open Risks

- Branch-line alignment after removing the `inset: -1px` border offset.
- Merge overlap with the paused worktree, which has the same hunks.

## Expected Output

Implementation and implementation-scoped checks, then the normal downstream route.

## Route Applied

- `get_handoff_rules` (2026-10-06): the matching rule is Architecture Design Complete with Small/Low → `/implementation_engineer`.
- `send_message_to` `/implementation_engineer` → DELIVERED (run `implementation_engineer_a5c9992569034548aa2827deb389ed13`). The message also carried the user's pause of `task-run-resources-workspace-cleanup`.
