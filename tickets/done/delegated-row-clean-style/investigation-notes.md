# Investigation Notes — delegated-row-clean-style

## Investigation Meta

- Package: `delegated-row-clean-style`
- Workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-row-clean-style`. Git branch `codex/delegated-row-clean-style`.
- Base: `origin/personal@23d6c877ada66058453f3e466dd6c7d302972610` (fetched 2026-10-06). Finalization target `origin/personal`.
- Bootstrap: `git worktree add -b codex/delegated-row-clean-style … origin/personal`. No blocker.
- Current SR: `SR-001`.
- Source package: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-run-resources-workspace-cleanup/tickets/in-progress/task-run-resources-workspace-cleanup/`. REQ-010 was split from there; that ticket is paused by the user.

## Source Log

| Date | Source | Finding |
| --- | --- | --- |
| 2026-10-06 | User | Split the restyle into its own ticket and do it first; pause the disappearing-rows ticket. |
| 2026-10-06 | `autobyteus-web/components/workspace/history/WorkspaceTransientExecutionRow.vue` @ base | Dashed `border-indigo-200 bg-indigo-50/40`, `hover:bg-indigo-50`, `focus-visible:ring-1 ring-indigo-300`; Team bolt 12 px in a dashed `border-indigo-400` white box, `text-indigo-600`; `.transient-execution-row > .hierarchy-branches { inset: -1px }` compensates for the 1px border. Used by `AgentRunTaskRows.vue` (Agent root) and `WorkspaceTeamExecutionTree.vue` (Team root). |
| 2026-10-06 | `autobyteus-web/components/workspace/history/WorkspaceAgentOrgHistoryCollection.vue` @ base | Org delegated rows are inline buttons: already gray-600/gray-50 with no border; no `focus-visible` ring; delegated Team icon `heroicons:user-group-20-solid` 14 px `text-indigo-600`; name regular weight. |
| 2026-10-06 | `git diff origin/personal 88851166f` on both files | No change between the source ticket base and the current base. |
| 2026-10-06 | Paused worktree `task-run-resources-workspace-cleanup`, `git diff` on both files | The implementation engineer has already written exactly this restyle there, mixed with the Org `TransitionGroup`, leave hooks and `treeRowLeave.css`, which are out of scope here. The style-only hunks are listed in the design spec. |
| 2026-10-06 | `grep` web tests for old style markers | Only `WorkspaceHistoryWorkspaceSection.spec.ts` checks `user-group` icons, and those are configured Team header rows (unaffected). No test asserts the dashed classes. |
| 2026-10-06 | Product UI/UX spec @ `a38bd6e`, "Visual Language" and "Hover, focus, selected" | Normative values; the selected style is identical to member rows (`is-selected`, unchanged). |

## Supplemental Artifact Inventory

| Artifact | Owner | Purpose | Status |
| --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/task-run-resources-workspace-cleanup/ui-ux-spec.md` (+ VIS-001, VIS-008) | Product Team | Approved row style | Approved, behavior-defining (style sections only) |
| Source ticket requirements `.../task-run-resources-workspace-cleanup/requirements-doc.md` REQ-010 | Solution Designer | Origin of the approved requirement | Approved SD-AP-001 |

## Architecture Investigation Findings

- Guideline: `DESIGN.md`, `TESTING.md`. No conflicts.
- Presentation only: no store, service, contract or server surface is involved.
