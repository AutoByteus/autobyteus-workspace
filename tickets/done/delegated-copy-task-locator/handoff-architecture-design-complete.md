# Handoff — Architecture Design Complete (delegated-copy-task-locator, SR-002)

- Result: `Architecture Design Complete`
- Classification: `task_size=Large`, `architectural_risk=High`. Evidence is in `design-spec.md` → Task Size And
  Architectural Risk.
- Route (from `get_handoff_rules`): Large or High → `/software_engineering_team/architecture_reviewer` (independent
  architecture review).
- From: `/software_engineering_team/solution_designer`
- Original requester: `/project_task_manager` (AgentRun `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`),
  Project Task `project_task_b541c02a-587d-4ebf-b315-15648cce9d4d`.

## Original request and goal

Implement the approved UI/UX design "Navigate from a delegated agent/team copy back to its Task" (Product ticket
`delegated-copy-task-locator`). The design is fixed input:
- each Task-worker row shows the Task summary under its name;
- the summary locates the Task on its board in the right panel's Projects tab, edge cases included, in en and zh-CN;
- the lookup uses server data and stays live;
- the work is covered by tests and verified by the user in the desktop app.

## Approval basis

- **UI/UX:** approved by the user 2026-10-11 ("I like the summary version… Let's do it"). Product spec
  `ui-ux-spec.md` + VIS-001..014, design repo `/Users/normy/autobyteus_org/autobyteus-web-design` `personal` @ `b08ddf6`.
- **Engineering requirements:** `Approved` at SR-002, 2026-10-11. The user directed the Solution Designer to resolve
  the open details by reasoning, and `/project_task_manager` confirmed it. The decisions:
  - DEC-001 (b): Agent-run and Team-run hosts; Org runs out of scope.
  - DEC-002 (a): on a page without a right panel, open the row's run, then locate.

## Workspace

- Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-task-locator`, branch
  `codex/delegated-copy-task-locator`.
- Base `origin/personal` @ `359d2c0efd08a2725c1aa994e69c2d04c56aea46`.
- Finalization target `origin/personal`.

## Artifacts (absolute paths)

- Requirements: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-task-locator/tickets/in-progress/delegated-copy-task-locator/requirements-doc.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-task-locator/tickets/in-progress/delegated-copy-task-locator/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-task-locator/tickets/in-progress/delegated-copy-task-locator/design-spec.md`
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-task-locator/tickets/in-progress/delegated-copy-task-locator/solution-revision-record.md`
- Earlier approval request (historical): `.../approval-request.md`
- Product supplements (externally owned, read only):
  - `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/delegated-copy-task-locator/ui-ux-spec.md`
  - `.../product-ticket.md`
  - `.../visual-references/`
- Prior review artifacts: `N/A — not applicable` (first review).

## Design summary

- **Server.** `ProjectTaskService.currentTasksOfTaskWorkers` answers from `TaskExecutionResourceService.rootTaskLocationOf`
  and one Task read per worker. It is exposed through an additive GraphQL query
  `taskWorkerTasks(agentRunIds, teamRunIds)`. No persistence or feed schema change.
- **Client data.** `taskWorkerTaskStore` holds:
  - ref-counted interest from the rows the tree lists;
  - a batched read;
  - invalidation from `/ws/projects`: `connected`, `task_upserted` when the root or the cached `taskId` matches, and
    `task_removed`;
  - feed retention while there is interest, and clearing on node rebinding.

  `useTaskWorkerTasks` ties it to the host trees.
- **Locate.** `taskLocatorStore` runs one request through explicit steps: shell reveal (docked, drawer or start tools)
  → panel board → board makes the Task visible (search, Cancelled, Show all) → card scrolls, focuses and gets the
  located highlight (2.4 s, latest only). Requests expire after 10 s. The shell registers its presence; with no shell,
  the host opens its run first (`onSelectRun` / new `onOpenTeamRun`).
- **Rows.**
  - The shared `WorkspaceTransientExecutionRow` gets a `TaskWorkerTaskSummary` button under the name.
  - `WorkspaceHierarchyBranches` gets a name-line elbow anchor.
  - The row-structure constraints from the overlapping teams are kept (QR-003).
- **Other.** en and zh-CN strings; Tailwind `content` gains `utils/` (the Cancelled pill's `ring-slate-300`).

## Constraints and coordination

- **Landing order.** `codex/delegated-team-aggregate-status` (Task 7a42fa46) lands first. The tree-row changes (step 5
  of the change sequence) are written after it merges and this branch is rebased; `/project_task_manager` will
  notify. Server, data and Projects-surface steps (1–3) don't depend on it.
- **Reveal constraints** from the collapsed-left-panel work (already on the base): `aria-current` / `aria-selected`
  stay only on the outer row; the row stays focusable; PMU-018 / PMU-019 and the reveal specs must keep passing.

## Open risks

- RSK-001: the overlapping branch on the same row files.
- Scroll/focus timing in drawer and tab-mount cases; browser validation is planned.
- Follow-up candidate (not in scope): Org-run Task workers.

## Expected next action

Independent architecture review of `design-spec.md` against the approved requirements. Findings that concern
requirements or design return to the Solution Designer.
