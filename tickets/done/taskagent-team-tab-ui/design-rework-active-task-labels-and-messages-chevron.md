# Design Rework: Active Task Labels And Messages Chevron

## Trigger

Round 3 visual validation raised two UX clarifications:

1. Visible `Task Agent` / `Task Team` labels make Active Tasks feel more cluttered because target names, status, task body, references, and Focus controls already communicate the subject.
2. The Messages section header still needs the Activity-style left chevron; the previous Messages freeze was intended to protect message content/reference UX, not keep the old header chevron placement.

Gap source: `/Users/normy/autobyteus_org/autobyteus-worktrees/taskagent-team-tab-ui/tickets/done/taskagent-team-tab-ui/requirement-gap-active-task-labels-and-messages-chevron.md`

## Decisions

- Remove visible `Task Agent` / `Task Team` badges from Active Tasks left task rows and right detail headers.
- Keep task kind/type as internal data and optional collapsed `Technical details` / accessibility metadata only.
- Keep status visible only when useful and low-emphasis. Meaningful examples: `Running`, `Awaiting review`, `Waiting input`, `Waiting approval`. Avoid noisy generic status when it adds no information.
- Visible Focus button copy is generic `Focus`; accessible labels/tooltips may include the concrete target name.
- Messages and Active Tasks section headers both use Activity-style left chevrons with right-side counts.
- Messages list/detail/reference content remains frozen: rows, nested refs, selected states, detail pane, message body rendering, reference preview controls/layout/states, and errors/loading states must not change.

## Artifact Updates

- `requirements.md`: updated `REQ-001`, `REQ-006`, `REQ-008`, `REQ-010`, `REQ-020`, `REQ-022`, `REQ-023`, `REQ-024`, and ACs for both-section chevrons and task-kind label removal.
- `design-spec.md`: updated section-header ownership, Messages header exception, Active Tasks label-light identity rule, removal plan, concrete examples, migration sequence, and implementation guidance.
- UX artifacts: updated canonical UX, experience story, behavior matrix, and UI design notes to remove visible task-kind labels and keep Messages header left chevron.
- `investigation-notes.md`: recorded the clarification and the final decisions.

## Implementation Evidence Required

Implementation handoff must verify:

- Messages and Active Tasks headers both use left Activity-style chevrons and no trailing text chevrons after counts.
- Messages list/detail/reference content remains visually and behaviorally unchanged.
- Active Tasks left rows and right details contain no visible `Task Agent` / `Task Team` labels.
- Visible Focus button text is generic `Focus`; accessibility labels/tooltips may include target names.
- Status is low-emphasis and only useful.

## Still-Relevant Upstream Package

- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/taskagent-team-tab-ui/tickets/done/taskagent-team-tab-ui/requirements.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/taskagent-team-tab-ui/tickets/done/taskagent-team-tab-ui/investigation-notes.md`
- Revised design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/taskagent-team-tab-ui/tickets/done/taskagent-team-tab-ui/design-spec.md`
- Canonical UX/UI design: `/Users/normy/autobyteus_org/autobyteus-worktrees/taskagent-team-tab-ui/ui-prototypes/taskagent-team-tab-active-tasks/complete-ux-ui-design.md`
- UX journey: `/Users/normy/autobyteus_org/autobyteus-worktrees/taskagent-team-tab-ui/ui-prototypes/taskagent-team-tab-active-tasks/experience-story.md`
- UI behavior matrix: `/Users/normy/autobyteus_org/autobyteus-worktrees/taskagent-team-tab-ui/ui-prototypes/taskagent-team-tab-active-tasks/ui-behavior-test-matrix.md`
- UI implementation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/taskagent-team-tab-ui/ui-prototypes/taskagent-team-tab-active-tasks/ui-design-spec.md`
- Requirement-gap artifact: `/Users/normy/autobyteus_org/autobyteus-worktrees/taskagent-team-tab-ui/tickets/done/taskagent-team-tab-ui/requirement-gap-active-task-labels-and-messages-chevron.md`
- This rework summary: `/Users/normy/autobyteus_org/autobyteus-worktrees/taskagent-team-tab-ui/tickets/done/taskagent-team-tab-ui/design-rework-active-task-labels-and-messages-chevron.md`

## Recommended Reroute

Route the updated package back through `architecture_reviewer` before implementation resumes.
