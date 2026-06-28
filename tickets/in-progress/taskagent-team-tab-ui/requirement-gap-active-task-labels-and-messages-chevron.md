# Requirement / Design Gap: Active Task Kind Labels and Messages Chevron Direction

## Status

Routed back to `solution_designer` from `implementation_engineer` on 2026-06-28 after Round 3 visual validation feedback.

## Trigger

During Round 3 live UI validation, the user reviewed the Active Tasks master/detail screenshot and gave two new/clarifying UX comments:

1. Active Tasks may be cleaner without visible `Task Agent` / `Task Team` labels in the left task rows and right task detail header, because the target names (`Student`, `Study Group`) and Focus action already communicate the subject well enough.
2. The Messages header chevron/disclosure location may need clarification. The Round 3 implementation restored the frozen Messages baseline, which keeps the existing right-side text chevron near the message count. The user asked why Messages does not have the left-side Activity-style chevron and noted that an earlier requirement said Messages and Active Tasks both needed chevrons similar to Activity.

## Why This Needs Upstream Rework

These comments conflict with the current authoritative Round 3 requirements/design:

- `REQ-006` currently says Active task rows must include a small `Task Agent` / `Task Team` badge.
- `REQ-008` currently says the right task detail must show a compact header with a task-kind cue.
- Round 3 explicitly superseded earlier Messages header wording and made Messages a hard user-visible frozen baseline.
- Before this gap was resolved, `REQ-001` / `AC-001` said the Activity-style leading disclosure applied only to Active Tasks, while Messages remained visually unchanged from the pre-task baseline. The latest user clarification supersedes that header-specific wording: both Messages and Active Tasks headers should use the Activity-style left chevron, while Messages content/reference UX remains frozen.

Implementation should not decide locally whether to remove task-kind labels or visually move/change the Messages disclosure affordance.

## Clarification Needed

Please update requirements/design/prototypes to answer:

1. Should Active Tasks remove visible `Task Agent` / `Task Team` badges from:
   - the left task navigator rows,
   - the right task detail header,
   - or both?
2. If task-kind badges are removed, should status chips (`Active`, `Awaiting review`) remain visible?
3. Should Focus button copy stay explicit as `Focus agent` / `Focus team`, or become a generic `Focus`?
4. Should Messages continue to be a frozen visible baseline with its existing right-side chevron after the count?
5. Or should Messages intentionally change to the Activity-style leading chevron too, superseding the Round 3 frozen-baseline decision?
6. If Messages does change, what baseline/evidence should implementation use to validate the new expected behavior?

## Implementation Hold

Implementation should pause on these UI details until the requirements/design are updated and reviewed. The current code has restored the Round 3 Messages baseline and shows Active Tasks with the labels required by current `REQ-006` / `REQ-008`.

## Affected Artifacts To Update

- `/Users/normy/autobyteus_org/autobyteus-worktrees/taskagent-team-tab-ui/tickets/in-progress/taskagent-team-tab-ui/requirements.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/taskagent-team-tab-ui/tickets/in-progress/taskagent-team-tab-ui/design-spec.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/taskagent-team-tab-ui/tickets/in-progress/taskagent-team-tab-ui/design-review-report.md` after review
- `/Users/normy/autobyteus_org/autobyteus-worktrees/taskagent-team-tab-ui/ui-prototypes/taskagent-team-tab-active-tasks/complete-ux-ui-design.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/taskagent-team-tab-ui/ui-prototypes/taskagent-team-tab-active-tasks/ui-design-spec.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/taskagent-team-tab-ui/ui-prototypes/taskagent-team-tab-active-tasks/ui-behavior-test-matrix.md`

## Resolution

Resolved in the reworked upstream artifacts:

1. Remove visible `Task Agent` / `Task Team` badges from both left task navigator rows and right task detail headers. Task kind/type remains internal data and may appear only in collapsed `Technical details` or accessibility metadata when useful.
2. Keep status visible only when useful and low-emphasis. Omit or de-emphasize redundant generic `Active`; keep meaningful states such as `Running`, `Awaiting review`, `Waiting input`, or `Waiting approval`.
3. Use generic visible `Focus` button text for target and member focus controls. Accessible labels/tooltips may include the concrete target name.
4. Messages continues to use the Activity-style left chevron in its section header. The earlier both-section chevron requirement remains valid for section headers.
5. The Messages frozen-baseline rule applies to Messages content/reference UX, not to the section header chevron. Message list rows, nested reference rows, selected states, detail pane, and reference preview controls/layout/states remain unchanged.
6. Implementation validation must verify both section headers have left chevrons, Active Tasks has no visible task-kind badges, visible Focus copy is generic, and Messages content/reference UX remains unchanged.
