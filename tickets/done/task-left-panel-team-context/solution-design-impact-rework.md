# Solution Design Impact Rework — Correct Active Task UI Container

## Meta

- Date: 2026-06-29
- Owner: solution_designer
- Trigger: API/E2E design-impact reroute plus direct user clarification that the implemented browser UI is not the intended task UI.
- Classification: Requirements correction and design correction.

## Root Cause

The previous design captured several row-level rules correctly:

- task summary is text-only;
- responsible agent/team row has the status dot;
- team root row is not indented;
- members are indented and have status dots;
- references stay as left-side file-name rows;
- technical details move to compact/collapsed left metadata.

However, the design made the wrong container decision. It interpreted “left side” as the global Workspaces/run-history tree and instructed implementation to render active-task context under expanded live team runs. That was incorrect.

The corrected interpretation is: “left side” means the left navigator column of the existing active task master/detail UI. The existing task UI should mostly stay in place; only the content/order of each task navigator item changes.

## Corrected Target Shape

```text
Task summary / short description        ← text only; click shows content on right

● Software Engineering Team             ← no indent; responsible agent/team row; status dot
  ● solution_designer                   ← member row; status dot
  ● architecture_reviewer               ← member row; status dot
  ● implementation_engineer             ← member row; status dot

  References                            ← file names stay on the left
    file-a.md                           ← click opens content/preview on right
    screenshot.png

  Technical details                     ← compact/collapsed metadata on the left
```

## Answers To API/E2E Reroute Questions

1. Was the intended design to place active-task navigation/context inside the global Workspaces tree?
   - Corrected answer: No. That was the design mistake. The global Workspaces tree must not host active-task summary blocks, references, or technical details.
2. Should the task UI be a dedicated left/right layout inside the Team tab or workspace center/right region?
   - Corrected answer: Yes. Use the existing active Tasks master/detail split inside the Team tab/task detail surface: left task navigator, right detail pane.
3. Should the center panel continue showing a focused subteam card/composer when an active task-team is selected?
   - Corrected answer: Not from task-summary or reference selection. Summary/reference clicks only select task/detail content. Explicit agent/team/member row clicks may reuse existing focus behavior.
4. Should the right Team tab retain Messages/Tasks accordion headers or become pure task/reference detail?
   - Corrected answer: Preserve the existing Team active-task shell unless implementation cleanup requires minor adjustment. The key correction is inside the Tasks section: left navigator rows follow the specified order and right pane shows selected content. Do not move the task UI into the global Workspaces tree.
5. Is this a design correction, requirements correction, or user misunderstanding?
   - Corrected answer: This is a requirements/design correction. Downstream implementation matched the earlier reviewed design, but that design was wrong.

## Implementation Direction Changes

- Remove active-task rendering from `WorkspaceAgentRunsTreePanel.vue`, `WorkspaceHistoryWorkspaceSection.vue`, and `workspaceHistorySectionContracts.ts`.
- Re-center the work in `TeamActiveTasksSection.vue` and its team-owned child components.
- Keep or reuse shared status-dot extraction if useful, but do not let the Workspaces tree become the active-task host.
- Restore/retain local active-task master/detail selection inside `TeamActiveTasksSection`; avoid broad cross-surface selection/activation stores unless a concrete in-section need remains.
- Left navigator item order is mandatory and should be covered by unit/component tests and browser smoke.

## Evidence

- API/E2E reroute: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-left-panel-team-context/tickets/in-progress/task-left-panel-team-context/api-e2e-design-impact-reroute.md`
- Browser evidence: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-left-panel-team-context/tickets/in-progress/task-left-panel-team-context/browser-evidence/design-impact-current-browser-ui.png`
- User clarification in chat on 2026-06-29 with the exact desired hierarchy.
