# Implementation Note: Transient Dot-Ring Visual Validation

## User Concern

The prior transient marker was still visually unclear: the dots did not read as forming a circle. The user also asked whether screenshots were being taken and inspected rather than relying on repeated user feedback.

## Cause Found

The prior SVG used a dashed stroke on a tiny circle. At `10-12px`, `stroke-dasharray` plus rounded line caps and anti-aliasing made the marker look like scattered dots rather than a dotted circle. The running-state pulse also made the already-small marker intermittently lighter.

## Implementation Change

- Replaced the dashed-stroke transient ring with an explicit eight-dot SVG ring in `autobyteus-web/components/workspace/common/StatusDot.vue`.
- Kept the marker in the leading status-dot slot.
- Kept the size close to the normal durable status dot: transient `h-2.5 w-2.5` (`10px`) versus durable `h-2 w-2` (`8px`).
- Removed transient status opacity pulsing; status meaning remains the darker status color.

## Visual Verification

- Started the frontend from `autobyteus-web` with `pnpm dev`, pointed at the Electron-started backend server at `http://127.0.0.1:29695`.
- Used `Nested Classroom Test Team` with `Codex App Server` and `GPT-5.5`.
- Sent a delegated task to `StudentStudyGroup` to create a real transient task-team row in the Workspaces tree.
- Inspected screenshot: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agents-workspace-tree-ux/tickets/in-progress/task-agents-workspace-tree-ux/transient-explicit-dot-ring-visual.png`
- Captured DOM metrics: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agents-workspace-tree-ux/tickets/in-progress/task-agents-workspace-tree-ux/transient-explicit-dot-ring-visual-metrics.json`

## Focused Checks

- `pnpm exec nuxi prepare`
- `pnpm test:nuxt run utils/__tests__/workspaceStatusDotPresentation.spec.ts components/workspace/history/__tests__/WorkspaceHistoryWorkspaceSection.spec.ts`
- `git diff --check`
- `pnpm guard:web-boundary`
- `pnpm guard:localization-boundary`
- `pnpm audit:localization-literals`
