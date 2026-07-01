# Implementation Rework Note: Clean Right Team Tasks Summary Rows

Date: 2026-07-01
Owner: implementation_engineer
Classification: Local Fix

## Trigger

User reviewed the right Team -> Tasks panel after the transient execution rows moved to the left Workspaces tree. The panel still showed a leading blue status dot and a visible uppercase status label such as `ACTIVE` at the start of each task summary row.

The user clarified that this makes the task content area feel visually noisy and redundant because live execution state is already obvious in the left Workspaces tree through the transient dotted-ring rows.

## Decision

This is an implementation-local cleanup, not a design reroute:

- Existing requirements/design already say the left Workspaces tree owns execution identity/hierarchy/focus.
- Existing requirements/design already say right Team -> Tasks owns task detail/content in a message-style layout.
- A leading status dot in the right task summary made the detail panel look like a second execution-status surface.

## Final Behavior

Right Team -> Tasks task list/selector rows now:

- show the task summary text directly;
- do not render a leading status dot before the task summary;
- do not render a visible uppercase status label (`ACTIVE`, `RUNNING`, etc.) inside the summary row;
- keep references in a message-style reference list below the summary;
- do not show the extra `References` heading, matching the existing Team Messages reference-row style more closely;
- continue to keep technical details collapsed under the existing technical-details disclosure;
- continue to avoid actor/member execution hierarchy rows and focus emits on the right side.

The left Workspaces tree remains the visual execution-awareness surface, including the explicit eight-dot transient status ring added in the prior rework.

## Changed Files

- `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agents-workspace-tree-ux/autobyteus-web/components/workspace/team/TeamActiveTaskNavigator.vue`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agents-workspace-tree-ux/autobyteus-web/components/workspace/team/__tests__/TeamActiveTaskNavigator.spec.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/task-agents-workspace-tree-ux/autobyteus-web/components/workspace/team/__tests__/TeamActiveTasksSection.spec.ts`

## Validation

Focused implementation checks were run after this rework:

- `pnpm exec nuxi prepare`
- `pnpm test:nuxt run components/workspace/team/__tests__/TeamActiveTaskNavigator.spec.ts components/workspace/team/__tests__/TeamActiveTasksSection.spec.ts`
- `git diff --check`
- `pnpm guard:web-boundary`
- `pnpm guard:localization-boundary`
- `pnpm audit:localization-literals`

The focused tests assert the task summary row no longer contains the visible status label and the right task list remains free of actor/member execution hierarchy rows.

## Review Routing

Because this changes source/test behavior after code review/API-E2E, it must go back through code review and then downstream API/E2E before delivery resumes.
