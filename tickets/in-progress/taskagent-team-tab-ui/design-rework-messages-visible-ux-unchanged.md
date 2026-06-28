# Design Rework: Messages Content UX Must Remain Unchanged With Header Chevron Exception

## Trigger

Implementation paused because the user clarified that the existing Team tab Messages content/reference UX is excellent and must not change from the user's perspective. Internal reuse/refactoring for references is acceptable only when invisible to the user. The Messages section header chevron is explicitly exempt and should move to the Activity-style left position.

Requirement-gap source: `/Users/normy/autobyteus_org/autobyteus-worktrees/taskagent-team-tab-ui/tickets/in-progress/taskagent-team-tab-ui/requirement-gap-messages-visible-ux-unchanged.md`

## Decision

Messages content/reference UX is a frozen user-visible baseline, not a redesign target. The Messages section header chevron is intentionally updated to Activity-style left placement.

The following Messages surfaces must remain visually and behaviorally unchanged from the pre-task baseline/current approved UX:

- message list rows and spacing;
- nested message reference rows;
- selected, hover, and keyboard focus states;
- message detail pane and message body rendering;
- message reference preview controls, layout, spacing, loading, unavailable, forbidden, and error states.

Activity-style disclosure/header changes apply to both Messages and Active Tasks section headers.

## Internal Reuse Rule

Shared reference viewer/presentation extraction remains allowed only as an internal refactor. It may touch Messages content/reference code only if the visible Messages content/reference output remains exact. If exact preservation is uncertain, implementation must keep the Messages content component path stable and implement task-specific wrappers/helpers separately.

## Artifact Updates

Updated requirements:

- `REQ-001` now requires Activity-style leading disclosure for both Messages and Active Tasks section headers.
- Added/updated `REQ-022` for Messages content/reference no-change with the header chevron exception.
- Added `REQ-023` for shared extraction only under exact Messages preservation.
- `AC-001`, `AC-003`, `AC-018`, and `AC-020` now encode Messages content/reference no-change and evidence requirements.

Updated design spec:

- Added `Messages No-Visible-Change Invariant`.
- Reframed Activity comparator/header changes as Active Tasks only.
- Updated ownership, removal plan, dependency rules, migration sequence, risks, and implementation guidance.

Updated UX artifacts:

- Canonical UX, experience story, behavior matrix, and UI design notes now state that Messages is the approved baseline and is not visibly redesigned.

## Required Implementation Evidence

Implementation handoff must include:

- targeted Messages regression tests where relevant;
- Electron visual inspection of default Messages header/list/detail;
- Electron visual inspection of an existing message reference preview;
- if any Messages-affecting files changed, before/after screenshot evidence or an equivalent visual baseline comparison;
- confirmation that any internal reuse did not alter visible Messages content/reference rows, spacing, controls, or states, while confirming the header chevron moved left.

## Still-Relevant Upstream Package

- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/taskagent-team-tab-ui/tickets/in-progress/taskagent-team-tab-ui/requirements.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/taskagent-team-tab-ui/tickets/in-progress/taskagent-team-tab-ui/investigation-notes.md`
- Revised design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/taskagent-team-tab-ui/tickets/in-progress/taskagent-team-tab-ui/design-spec.md`
- Canonical UX/UI design: `/Users/normy/autobyteus_org/autobyteus-worktrees/taskagent-team-tab-ui/ui-prototypes/taskagent-team-tab-active-tasks/complete-ux-ui-design.md`
- UX journey: `/Users/normy/autobyteus_org/autobyteus-worktrees/taskagent-team-tab-ui/ui-prototypes/taskagent-team-tab-active-tasks/experience-story.md`
- UI behavior matrix: `/Users/normy/autobyteus_org/autobyteus-worktrees/taskagent-team-tab-ui/ui-prototypes/taskagent-team-tab-active-tasks/ui-behavior-test-matrix.md`
- UI implementation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/taskagent-team-tab-ui/ui-prototypes/taskagent-team-tab-active-tasks/ui-design-spec.md`
- Requirement-gap artifact: `/Users/normy/autobyteus_org/autobyteus-worktrees/taskagent-team-tab-ui/tickets/in-progress/taskagent-team-tab-ui/requirement-gap-messages-visible-ux-unchanged.md`
- This rework summary: `/Users/normy/autobyteus_org/autobyteus-worktrees/taskagent-team-tab-ui/tickets/in-progress/taskagent-team-tab-ui/design-rework-messages-visible-ux-unchanged.md`

## Recommended Reroute

Route the updated package back through `architecture_reviewer` before implementation resumes.
