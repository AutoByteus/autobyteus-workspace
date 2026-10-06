# Design Spec — delegated-row-clean-style

## Solution And Approval Basis

- Package: `delegated-row-clean-style`, `SR-001`.
- Approved requirements: `requirements-doc.md`, REQ-001 / AC-001–002 (SD-AP-001 behavior; SD-AP-002 split).
- Supplement: UI/UX spec @ `a38bd6e` (style sections only).
- Evidence: `investigation-notes.md`.

## Current-State Read

Two presentation owners draw delegated rows:
- `WorkspaceTransientExecutionRow.vue`: the shared row for Agent and Team roots, used by `AgentRunTaskRows.vue` and `WorkspaceTeamExecutionTree.vue`.
- `WorkspaceAgentOrgHistoryCollection.vue`: draws the Org root's own inline task rows.

Only the CSS classes and the Team icon differ from the approved style.

## Task Size And Architectural Risk (Mandatory)

- `task_size`: **Small**: two Vue files, presentation classes and one icon.
- `architectural_risk`: **Low**: no contract, store, persistence, server, security, concurrency or ownership change.
- Escalation trigger: any change outside these two components (other than tests) → return a Design Impact.

## Relevant Behavior And Production-Path Map

| BEH / REQ | Path |
| --- | --- |
| BEH-001 / REQ-001 (Agent, Team roots) | `AgentRunTaskRows.vue` / `WorkspaceTeamExecutionTree.vue` → `WorkspaceTransientExecutionRow.vue` classes |
| BEH-001 / REQ-001 (Org root) | `WorkspaceAgentOrgHistoryCollection.vue` task-agent and task-team buttons |

## Task Design Health Assessment (Mandatory)

- Posture: UI change. Root cause: `No Design Issue Found`.
- Refactor: no.
- The Org rows not sharing the row component is pre-existing duplication. Consolidation is deferred (non-goal). Residual risk: future style drift between the two owners.

## Legacy Removal Policy / Removal Plan

In `WorkspaceTransientExecutionRow.vue`, remove:
- the root classes `border border-dashed border-indigo-200 bg-indigo-50/40 hover:bg-indigo-50 focus-visible:ring-1 focus-visible:ring-indigo-300`;
- the Team icon wrapper classes `rounded-[0.2rem] border border-dashed border-indigo-400 bg-white text-indigo-600`;
- the scoped rule `.transient-execution-row > .hierarchy-branches { inset: -1px; }` and its comment. It existed only to offset the removed 1px border.

In `WorkspaceAgentOrgHistoryCollection.vue`, remove the task-team `heroicons:user-group-20-solid` `text-indigo-600` icon.

## Persisted Data

Not affected.

## Exact Target Changes

`WorkspaceTransientExecutionRow.vue`:
- Root `div` static classes: `transient-execution-row relative flex min-h-7 w-full cursor-pointer items-center rounded-md text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500`.
- `rowClasses`: `{ 'is-selected text-indigo-900': isSelected, 'text-gray-600 hover:bg-gray-50': !isSelected }`.
- Team icon wrapper: `inline-flex h-4 w-4 items-center justify-center text-slate-500` (keep `data-team-icon="temporary-task-team"`), with `<Icon icon="heroicons:bolt-20-solid" class="h-4 w-4" />`.
- Agent avatar, status dot, disclosure, inspection lines, tooltip and `.is-selected` styling: unchanged.

`WorkspaceAgentOrgHistoryCollection.vue`:
- Task-agent button and task-team button: append `focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500` to their static classes.
- Task-team icon: `<Icon icon="heroicons:bolt-20-solid" class="mr-1.5 h-4 w-4 flex-none text-slate-500" data-team-icon="temporary-task-team" />`.
- Task-team name: `class="truncate font-semibold"`.

Explicitly **not** part of this ticket:
- `TransitionGroup`, `useLeavingTreeRows`, `treeRowLeave.css` and any closure logic.
- These are already written in the paused worktree `task-run-resources-workspace-cleanup` and stay there.
- The style-only hunks from that worktree's diff of these two files may be reused verbatim; every other hunk must be left out.

## Dependency Rules / Interfaces / File Mapping

| Change | File | Responsibility |
| --- | --- | --- |
| Modify | `autobyteus-web/components/workspace/history/WorkspaceTransientExecutionRow.vue` | Clean delegated-row style (Agent and Team roots) |
| Modify | `autobyteus-web/components/workspace/history/WorkspaceAgentOrgHistoryCollection.vue` | Clean delegated-row style (Org root) |
| Add/Modify | Colocated `__tests__` for these components | Style assertions |

## Backward-Compatibility Rejection Log

No toggle and no old style kept.

## Change Sequence

1. `WorkspaceTransientExecutionRow.vue`.
2. Org collection.
3. Tests.
4. Browser check.

## Risks

- Branch lines must still align after removing the `inset: -1px` offset. Verify visually against VIS-001 (the Product reference made the same removal).
- Merge order with the paused ticket: that worktree contains the same hunks. When it resumes, rebasing onto this change should drop or merge them cleanly.

## Guidance For Implementation / Verification

Follow `TESTING.md`:
- `pnpm -C autobyteus-web test:nuxt` for the affected component tests. Add assertions:
  - no `border-dashed` or `bg-indigo-50/40` on delegated rows;
  - a delegated Team shows `heroicons:bolt-20-solid` with `text-slate-500` under the Agent/Team row and the Org row;
  - the Org task rows carry the `focus-visible:ring-2 focus-visible:ring-indigo-500` classes.
- Existing interaction tests must pass (AC-002).
- Browser visual check of the Agent root and the Org root tree against the delegated-row appearance in VIS-001/VIS-008, desktop and 390 px.
