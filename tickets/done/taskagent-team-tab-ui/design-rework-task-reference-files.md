# Design Rework: Delegated Task Reference Files, Arguments, And Message-Like Reference UX

## Trigger

During implementation/live UI feedback, the user asked whether delegated tasks account for task-level reference files and task arguments. The user also emphasized that the existing Messages UI handles reference files extremely well: references are clean rows, clickable, and previewable in the right pane. This exposed a gap in the reviewed design: Active Tasks had visual polish work, but the task data path still dropped delegated-task reference files and task arguments, and the UX needed to be redesigned around the Messages mental model.

Requirement-gap source: `/Users/normy/autobyteus_org/autobyteus-worktrees/taskagent-team-tab-ui/tickets/done/taskagent-team-tab-ui/requirement-gap-task-reference-files.md`

Canonical UX source: `/Users/normy/autobyteus_org/autobyteus-worktrees/taskagent-team-tab-ui/ui-prototypes/taskagent-team-tab-active-tasks/complete-ux-ui-design.md`

## Final UX Decision

Keep delegated work modeled as a **task**, not as a generic message.

Use Messages as the interaction model, not as the data owner:

- Left side owns task navigation and reference-file selection.
- Reference files appear as nested rows under the selected task in the left navigator.
- The selected task's right detail focuses on the task body, compact status/focus header, and TaskTeam member focus rows when applicable.
- Reference files are **not duplicated in the right task detail by default**.
- Clicking a reference filename in the left navigator switches the whole right pane to read-only file preview, like Messages.
- `Technical details` is collapsed secondary ID/provenance/debug information only; reference access must not be hidden there.

UI wording should avoid noisy visible labels such as `Description`, `Task brief`, or `Reference files` when the content/rows are self-evident. `Task brief` can remain an internal component/data concept. The underlying model should remain task-oriented (`taskDescription`, `taskReferenceFiles`, `taskArguments`).

## Authoritative Source / Contract

Authoritative task metadata source: backend `TaskDelegationRecord` / normalized delegate-task input, emitted through `TASK_DELEGATION_EVENT`.

Rejected sources:

- Team communication messages: excellent UX model, wrong metadata owner.
- Raw tool lifecycle events in the frontend: brittle and bypasses task projection ownership.
- Ad hoc row-component parsing: too late in the data path and hard to test.

Required data path:

`TaskDelegationRecord` -> `TASK_DELEGATION_EVENT` -> `TaskDelegationProjectionDetails` -> `TeamMemberNodeBase` -> `ActiveTaskEntry` -> `TeamActiveTasksSection` / task navigator and detail components.

## Design Changes Made

Updated requirements doc:

- Status remains `Refined`.
- Reworked final UX requirements around a Messages-like master/detail layout.
- Added in-scope use cases for task reference files, task arguments, left-navigator task references, whole-right-pane reference preview, TaskTeam member focus, calm waiting statuses, and Electron visual iteration.
- Added explicit requirements/acceptance criteria that references appear under the selected task in the left navigator and are not duplicated in the right task detail by default.
- Added explicit separation from approvals: Active Tasks may show status, but Activity owns Approve/Deny actions.
- Superseded the earlier “no backend changes” assumption because backend task events currently omit reference files.

Updated investigation notes:

- Added evidence from backend task delegation record/input/event publisher files.
- Added evidence from Messages reference UI, reference viewer, store normalization, and content route.
- Recorded that backend records already store `referenceFiles`, but event payloads and frontend projections drop them.
- Recorded that current `delegate_task` input is strict (`target`, `description`, `reference_files`), so `taskArguments` should be a normalized input snapshot rather than raw frontend tool-event scraping.
- Recorded the final user-approved UX: left nested references, right task body or file preview, no duplicate right reference block.

Updated design spec:

- Reframed Active Tasks as a master/detail UI with section-level controlled state.
- Added task metadata and task reference-preview spines.
- Added backend event payload contract recommendations for task reference entries and `taskArguments`.
- Added a task-owned reference content route design: `GET /team-runs/:teamRunId/task-delegations/:taskId/references/:referenceId/content`.
- Added shared/generic frontend reference viewer/presentation extraction so Messages and Active Tasks can share preview behavior while keeping route wrappers owner-specific.
- Added a clear rejection of right-detail reference duplication by default.
- Updated file responsibility mappings, dependency rules, migration sequence, tests, risks, and implementation guidance.

Updated UI artifacts:

- `complete-ux-ui-design.md`: canonical pure-text visible UX contract.
- `experience-story.md`: story-first user journey and transitions.
- `ui-behavior-test-matrix.md`: behavior matrix and visual validation expectations.
- `ui-design-spec.md`: implementation-facing UI notes aligned to the canonical UX.

## Still-Relevant Upstream Package

- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/taskagent-team-tab-ui/tickets/done/taskagent-team-tab-ui/requirements.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/taskagent-team-tab-ui/tickets/done/taskagent-team-tab-ui/investigation-notes.md`
- Revised design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/taskagent-team-tab-ui/tickets/done/taskagent-team-tab-ui/design-spec.md`
- Canonical UX/UI design: `/Users/normy/autobyteus_org/autobyteus-worktrees/taskagent-team-tab-ui/ui-prototypes/taskagent-team-tab-active-tasks/complete-ux-ui-design.md`
- UX journey: `/Users/normy/autobyteus_org/autobyteus-worktrees/taskagent-team-tab-ui/ui-prototypes/taskagent-team-tab-active-tasks/experience-story.md`
- UI behavior matrix: `/Users/normy/autobyteus_org/autobyteus-worktrees/taskagent-team-tab-ui/ui-prototypes/taskagent-team-tab-active-tasks/ui-behavior-test-matrix.md`
- UI implementation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/taskagent-team-tab-ui/ui-prototypes/taskagent-team-tab-active-tasks/ui-design-spec.md`
- Original design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/taskagent-team-tab-ui/tickets/done/taskagent-team-tab-ui/design-review-report.md`
- Current implementation handoff before this gap: `/Users/normy/autobyteus_org/autobyteus-worktrees/taskagent-team-tab-ui/tickets/done/taskagent-team-tab-ui/implementation-handoff.md`
- Requirement-gap artifact: `/Users/normy/autobyteus_org/autobyteus-worktrees/taskagent-team-tab-ui/tickets/done/taskagent-team-tab-ui/requirement-gap-task-reference-files.md`
- This rework summary: `/Users/normy/autobyteus_org/autobyteus-worktrees/taskagent-team-tab-ui/tickets/done/taskagent-team-tab-ui/design-rework-task-reference-files.md`

## Additional Rework: Messages Frozen Baseline

A second implementation gap clarified that the existing Messages UX is already approved and must not change from the user's perspective. The updated requirements/design now state:

- Activity-style visible header/disclosure changes apply only to Active Tasks.
- Messages remains open by default and keeps its existing header, list, nested reference rows, selected states, detail pane, and reference preview controls/layout/states.
- Internal reference-file reuse/refactoring is allowed only when Messages remains visually and behaviorally identical.
- If exact Messages preservation is uncertain, the implementation should leave Messages-visible code stable and build task-specific wrappers/helpers separately.
- Implementation handoff must include Messages no-visible-change evidence from targeted tests and Electron visual inspection; if Messages-affecting files changed, include before/after screenshot evidence or equivalent baseline comparison.

## Recommended Reroute

Send the updated package back through `architecture_reviewer` because requirements and design scope changed after the initial review. After approval, route back to `implementation_engineer` for rework on top of the existing pre-gap UI polish implementation.
