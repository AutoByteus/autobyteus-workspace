# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete
- Current Status: Investigation complete; requirements and design ready for architecture review.
- Investigation Goal: Identify the frontend task/message Team tab UI code paths, compare task and message split/file-preview behavior, and design a task UI update that reuses the message pattern.
- Scope Classification (`Small`/`Medium`/`Large`): Medium
- Scope Classification Rationale: UI-only behavior change, but requires touching both existing message resize ownership and task reference preview cleanup to avoid duplicated drag policy and obsolete navigation paths.
- Scope Summary: Add message-like vertical resize behavior for task details and remove task-specific `Back to task` file-preview affordance.
- Primary Questions To Resolve:
  - Which components own Team tab messages/tasks rendering? Resolved: `TeamCommunicationPanel.vue` and `TeamActiveTasksSection.vue` under `autobyteus-web/components/workspace/team/`.
  - Which component/composable implements the message vertical slider? Resolved: message resize is local logic in `TeamCommunicationPanel.vue`, not a shared composable.
  - How does the task reference file preview state differ from message file preview state? Resolved: task path passes a `backLabel`/`back` event through `TeamTaskReferenceViewer.vue` and `TeamReferenceFileViewer.vue`; message path directly renders `TeamCommunicationReferenceViewer.vue` without back control.
  - Can the task behavior reuse an existing shared split-pane owner cleanly? Resolved: no existing fit; create a small horizontal split resize composable and migrate message/task to it.

## Request Context

User requested frontend Team tab task UI improvements based on screenshots. The task section should replicate the message implementation for the vertical left/right slider. Opening a task reference file should directly show file content like message reference files, without a redundant `Back to task` button; users can click the task again to see task content.

Reference screenshots:

- `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_56f2d20f77654cff85962ea87cf1f0e8/solution_designer_688242aadb6f47679b69cd5b8687195d/context_files/ctx_7e1b3d3298f6__image.png`
- `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_56f2d20f77654cff85962ea87cf1f0e8/solution_designer_688242aadb6f47679b69cd5b8687195d/context_files/ctx_bd2443515abb__image.png`

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-panel-message-style-slider`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-panel-message-style-slider/tickets/done/task-panel-message-style-slider`
- Current Branch: `codex/task-panel-message-style-slider`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-panel-message-style-slider`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin personal --prune` succeeded on 2026-06-28.
- Task Branch: `codex/task-panel-message-style-slider`
- Expected Base Branch (if known): `origin/personal`
- Expected Finalization Target (if known): `personal`
- Bootstrap Blockers: None.
- Notes For Downstream Agents: Original user checkout `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` is on shared branch `personal`; authoritative ticket work is isolated in the task worktree above.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-06-28 | Command | `pwd; git rev-parse --show-toplevel; git status --short --branch; git remote -v; git branch --show-current` in `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` | Bootstrap environment discovery | Shared checkout is git repo on branch `personal`, tracking `origin/personal`, with unrelated untracked files. | No |
| 2026-06-28 | Command | `git remote show origin` | Resolve base branch | Remote HEAD branch is `personal`. | No |
| 2026-06-28 | Command | `git fetch origin personal --prune` | Refresh tracked remote base before creating worktree | Fetch succeeded. | No |
| 2026-06-28 | Command | `git worktree add -b codex/task-panel-message-style-slider /Users/normy/autobyteus_org/autobyteus-worktrees/task-panel-message-style-slider origin/personal` | Create dedicated task worktree/branch | Worktree created at commit `0a332ab6`; branch tracks `origin/personal`. | No |
| 2026-06-28 | Data | User-provided screenshots listed in Request Context | Understand reported behavior | Task pane lacks message-like resize affordance; task file preview shows redundant `Back to task`. | No |
| 2026-06-28 | Command | `rg -n "Back to task|back to task|Tasks|Messages|reference file|referenceFile|Reference" autobyteus-web/components autobyteus-web/composables autobyteus-web/pages autobyteus-web/stores autobyteus-web/__tests__` | Find affected frontend paths | Located Team tab components and task/message reference viewer tests. | No |
| 2026-06-28 | Code | `autobyteus-web/components/workspace/team/TeamOverviewPanel.vue` | Identify parent owner for Team tab sections | Parent toggles `messages` and `activeTasks`, passes team context to task section and focused-member identity to message panel. | No |
| 2026-06-28 | Code | `autobyteus-web/components/workspace/team/TeamCommunicationPanel.vue` | Inspect message behavior the user wants copied | Message panel has master/detail split, `leftPaneWidth = ref(232)`, resize handle, clamp min `168`, max `360`, and direct reference rendering with no back button. | Use as target pattern. |
| 2026-06-28 | Code | `autobyteus-web/components/workspace/team/TeamActiveTasksSection.vue` | Inspect current task behavior | Task split uses hard-coded `w-[15.5rem]` left navigator; no resize handle. Task reference preview uses `TeamTaskReferenceViewer` and handles `@back` by clearing `selectedReferenceId`. | Modify. |
| 2026-06-28 | Code | `autobyteus-web/components/workspace/team/TeamTaskReferenceViewer.vue` | Inspect task reference wrapper | Wrapper computes task-owned content URL but passes `back-label` and emits `back` to parent. | Remove back API from wrapper. |
| 2026-06-28 | Code | `autobyteus-web/components/workspace/team/TeamReferenceFileViewer.vue` | Inspect generic task reference content viewer | Viewer renders `data-test="team-reference-viewer-back"` when `backLabel` prop is set; back prop/event only used by task wrapper. | Remove back prop/event/rendering. |
| 2026-06-28 | Code | `autobyteus-web/components/workspace/team/TeamCommunicationReferenceViewer.vue` | Compare message reference preview | Header shows file name/path and controls only for raw/preview/maximize; no back button. Content URL is message-owned. | Preserve behavior. |
| 2026-06-28 | Command | `rg -n "cursor-col-resize|col-resize|resize-handle|startResize|leftPaneWidth|useVerticalResize|usePanelResize|role=\"separator\"" autobyteus-web/components autobyteus-web/composables` | Find reusable resize facilities | Existing generic composables are not an exact fit. Message resize is local. Other resizers are area-specific. | Add shared horizontal split resize composable. |
| 2026-06-28 | Code | `autobyteus-web/composables/useVerticalResize.ts`, `autobyteus-web/composables/usePanelResize.ts`, `autobyteus-web/composables/useAppLeftPanelSectionResize.ts` | Evaluate reuse options | `useVerticalResize` is height/row resize; `usePanelResize` is old file/content widths with container assumptions; `useAppLeftPanelSectionResize` is left-nav vertical section height. None cleanly owns Team tab horizontal split behavior. | No |
| 2026-06-28 | Code | `autobyteus-web/components/workspace/team/__tests__/TeamCommunicationPanel.spec.ts` | Identify durable coverage for message split/reference behavior | Existing tests cover message resize clamp and direct reference opening. | Keep passing; likely adjust no behavior. |
| 2026-06-28 | Code | `autobyteus-web/components/workspace/team/__tests__/TeamActiveTasksSection.spec.ts` | Identify durable task coverage to update | Existing test asserts reference preview returns via stubbed back button; should be changed to no back button and return by clicking task row. | Update. |
| 2026-06-28 | Code | `autobyteus-web/components/workspace/team/__tests__/TeamTaskReferenceViewer.spec.ts` | Identify durable task reference coverage | Existing test expects `team-reference-viewer-back` and emitted `back`; should be updated to assert route fetching and absence of back control. | Update. |
| 2026-06-28 | Command | `rg -n "TeamReferenceFileViewer|backLabel|back-label|team-reference-viewer-back|@back=|\\(e: 'back'" autobyteus-web/components autobyteus-web/__tests__ autobyteus-web/localization` | Check usage of task back API | Only production task path uses `TeamReferenceFileViewer` back API; tests/localization reference it. | Remove cleanly. |
| 2026-06-28 | Code | `autobyteus-web/localization/messages/en/workspace.ts`, `autobyteus-web/localization/messages/zh-CN/workspace.ts` | Locate task back label localization | Both locales define `TeamActiveTasksSection.back_to_task`. | Remove if production references disappear. |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary: Team tab right-side panel in `TeamOverviewPanel.vue`.
- Current execution flow:
  - Messages: `TeamOverviewPanel.vue -> TeamCommunicationPanel.vue -> TeamCommunicationReferenceViewer.vue` when a message reference is selected.
  - Tasks: `TeamOverviewPanel.vue -> TeamActiveTasksSection.vue -> TeamTaskReferenceViewer.vue -> TeamReferenceFileViewer.vue` when a task reference is selected.
- Ownership or boundary observations:
  - `TeamOverviewPanel.vue` owns top-level section expansion/collapse only; it should not own task/message split internals.
  - `TeamCommunicationPanel.vue` owns message selection, reference selection, and message split rendering.
  - `TeamActiveTasksSection.vue` owns task selection, reference selection, task focus actions, and task split rendering.
  - The horizontal split resize policy is currently embedded in message panel; adding the same behavior to tasks should not create a second local policy owner.
  - The task reference viewer wrapper owns task content URL construction; the lower file viewer should not own task navigation semantics.
- Current behavior summary:
  - Messages: resizable list/detail pane and direct file preview without back navigation.
  - Tasks: fixed-width navigator/detail pane and task reference preview with redundant `Back to task` button.

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Behavior Change / UI consistency improvement
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Duplicated Policy Or Coordination
- Refactor posture evidence summary: The current message resize policy is local, and task needs the same policy. A small extraction avoids copying drag listener/clamp behavior. The back button path is a stale task-specific navigation mechanism that should be removed rather than preserved.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| `TeamCommunicationPanel.vue` | Local `leftPaneWidth`, `startResize`, clamp bounds `168..360`, handle styling and ARIA already exist. | Message has correct behavior but no reusable owner for task parity. | Extract shared horizontal split composable. |
| `TeamActiveTasksSection.vue` | Left navigator uses fixed `w-[15.5rem]`; no handle. | UI parity gap is local to task split surface. | Add handle and width state. |
| `TeamTaskReferenceViewer.vue` | Passes `back-label` and emits `back`. | Creates redundant navigation path opposed to message behavior. | Remove. |
| `TeamReferenceFileViewer.vue` | Renders back button only when `backLabel` prop is present; prop/event usage is task-only. | Back API can be decommissioned cleanly. | Remove prop/event/button. |
| `TeamCommunicationReferenceViewer.vue` | No back control; file content is shown directly. | Desired behavior already exists for messages. | Preserve. |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-web/components/workspace/team/TeamOverviewPanel.vue` | Top-level Team tab Messages/Tasks section composition and expansion state. | Delegates message and task section internals to child components. | No changes needed unless tests require stubs. |
| `autobyteus-web/components/workspace/team/TeamCommunicationPanel.vue` | Message list/detail split, message/reference selection, message detail rendering. | Correct resize pattern is local here. | Replace local resize code with shared composable while preserving behavior/tests. |
| `autobyteus-web/components/workspace/team/TeamActiveTasksSection.vue` | Task list/detail split, task/reference selection, task detail rendering, focus events. | Needs same split resize affordance; currently handles task back event. | Add split resize; remove back event wiring. |
| `autobyteus-web/components/workspace/team/TeamActiveTaskRow.vue` | Task row and inline reference file row controls. | Clicking task row already emits `select-task`, which clears selected reference. | This is the correct return-to-task path; no change likely needed. |
| `autobyteus-web/components/workspace/team/TeamTaskReferenceViewer.vue` | Task reference content URL adapter. | Should only adapt task reference identity to content URL, not own back navigation. | Remove back label/event. |
| `autobyteus-web/components/workspace/team/TeamReferenceFileViewer.vue` | Generic task reference content display. | Back prop/event/button are task-specific and unused elsewhere. | Remove back API from this component. |
| `autobyteus-web/components/workspace/team/TeamCommunicationReferenceViewer.vue` | Message reference content display and content URL construction. | Behavior is the file-preview target: direct display, no back. | No behavior change. |
| `autobyteus-web/localization/messages/en/workspace.ts` | English localization keys. | Contains obsolete `back_to_task` once back UI is removed. | Remove key. |
| `autobyteus-web/localization/messages/zh-CN/workspace.ts` | Chinese localization keys. | Contains obsolete `back_to_task` once back UI is removed. | Remove key. |
| `autobyteus-web/components/workspace/team/__tests__/TeamCommunicationPanel.spec.ts` | Message panel component coverage. | Covers resize clamp and reference opening. | Keep passing; add no behavior change. |
| `autobyteus-web/components/workspace/team/__tests__/TeamActiveTasksSection.spec.ts` | Task section component coverage. | Currently tests back-button return path. | Update to task-row return path and task resize handle. |
| `autobyteus-web/components/workspace/team/__tests__/TeamTaskReferenceViewer.spec.ts` | Task reference wrapper coverage. | Currently expects back event/control. | Update to absence of back control while preserving content URL assertion. |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-06-28 | Visual review | `view_image` of user screenshots | Confirmed reported UI shape: task detail split visible; task reference preview header includes `Back to task`. | Code investigation focused on task split and file-preview navigation. |
| 2026-06-28 | Static probe | `rg` commands in Source Log | Located all production usage of task back API and resize logic. | Scope can be cleanly bounded. |

## External / Public Source Findings

No external sources consulted; this is an internal frontend UI change.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: Existing Vue component tests can cover most behavior. Browser/manual review may be useful after implementation for visual drag feel.
- Required config, feature flags, env vars, or accounts: None identified for component tests.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: Dedicated git worktree creation command recorded above.
- Cleanup notes for temporary investigation-only setup: None.

## Findings From Code / Docs / Data / Logs

- `TeamCommunicationPanel.vue` already has the exact user-requested interaction shape:
  - list/detail flex split
  - left pane width style bound to `leftPaneWidth`
  - separator with `role="separator"`, `aria-orientation="vertical"`, `cursor-col-resize`
  - mousedown-driven drag with clamp to `168..360` px.
- `TeamActiveTasksSection.vue` has a structurally similar split but lacks the dynamic width and separator. Its fixed `w-[15.5rem]` navigator explains why the user cannot resize individual task view.
- Task return from reference preview does not need a dedicated button because `selectTask()` already clears `selectedReferenceId`; clicking the task row returns to task detail just like clicking a message row returns to message detail.
- `TeamReferenceFileViewer.vue` is not broadly shared outside task reference preview. Removing its back prop/event is safe for current production usage and avoids preserving stale UI affordance.

## Constraints / Dependencies / Compatibility Facts

- The target task behavior intentionally replaces the existing task-specific back button. Do not preserve a hidden compatibility path for it.
- Task and message reference content routes differ and should remain owned by their wrappers/viewers.
- Message reference behavior should remain unchanged while its resize logic moves into a shared composable.

## Open Unknowns / Risks

- Task initial navigator width: current fixed width is `15.5rem` (`248px` at default root font size). Use that as the initial width unless product explicitly prefers the message default `232px`.
- Broader duplication exists between task/message reference file presentation/viewer code. This task can defer full unification because it would affect more file type/loading behavior than needed for the requested UI fix.

## Notes For Architect Reviewer

The recommended implementation is a bounded refactor plus UI behavior change:

1. Add `autobyteus-web/composables/useHorizontalSplitResize.ts` for horizontal list/detail split drag state and clamp policy.
2. Migrate `TeamCommunicationPanel.vue` to use it with default `232`, min `168`, max `360`.
3. Update `TeamActiveTasksSection.vue` to use it with initial width around current `248`, min `168`, max `360`; render a message-style separator.
4. Remove the task back path from `TeamActiveTasksSection.vue`, `TeamTaskReferenceViewer.vue`, `TeamReferenceFileViewer.vue`, tests, and locale keys.
5. Run targeted component tests for Team communication/tasks/reference viewers.
