# Requirement / Design Gap: Messages User-Visible UX Must Remain Unchanged

## Status

Routed back to `solution_designer` from `implementation_engineer` on 2026-06-28.

## Trigger

During implementation rework, the user clarified that the existing Team tab Messages UI is already considered correct and must not change from the user's perspective:

- Messages user-visible UI should remain like the previous/current product behavior.
- Internal refactors for reusable reference-file code are acceptable only if the user-visible Messages experience is unchanged.
- If this is not a hard requirement in the requirements/design, the task should be routed back to update the requirements and design specification before implementation continues.

## Why This Needs Upstream Rework

The current Round 2 requirements/design protect existing Messages behavior, but they do not unambiguously state a pixel/user-visible no-change constraint for Messages. Some wording also appears to broaden visible header changes to both Messages and Active Tasks:

- `requirements.md` includes `AC-018`: existing Messages reference behavior remains unchanged after shared viewer/presentation extraction.
- `design-spec.md` says `TeamCommunicationPanel.vue` is the Messages list/detail/reference owner and UX comparator to preserve.
- However, `requirements.md` `REQ-001` states that Team tab Messages and Active Tasks section headers must use an Activity-style leading disclosure icon and remove the trailing chevron after the count. That is user-visible Messages UI scope.

Given the user's clarification, implementation should not decide locally whether Messages headers/reference viewer/list/detail may change visually. This is a requirement/design decision.

## Clarification Needed

Please update the requirements/design to explicitly answer:

1. Is the entire user-visible Messages section (header, list, nested reference rows, detail pane, reference preview controls/layout/states) required to remain visually unchanged from the pre-task baseline?
2. If yes, should the Activity-style leading disclosure/header change apply only to Active Tasks, not Messages?
3. Is shared reference viewer/presentation extraction still in scope for Messages only when it preserves the exact visible Messages UI, including header structure/classes/spacing/control placement?
4. What regression/visual validation evidence should implementation provide for Messages: targeted tests only, or before/after screenshot comparison as well?

## Implementation Hold

Implementation should continue only after the requirements/design explicitly encode this user-visible Messages invariant and resolve any conflict with the prior Round 2 header requirement.

## Affected Artifacts To Update

- `/Users/normy/autobyteus_org/autobyteus-worktrees/taskagent-team-tab-ui/tickets/done/taskagent-team-tab-ui/requirements.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/taskagent-team-tab-ui/tickets/done/taskagent-team-tab-ui/design-spec.md`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/taskagent-team-tab-ui/tickets/done/taskagent-team-tab-ui/design-review-report.md` after review
- UI prototype behavior docs if they currently imply visible Messages header changes

## Resolution

Resolved in the reworked upstream artifacts. The answer to the clarification questions is:

1. Superseded/clarified. Messages content/reference UX is a frozen baseline: list rows, nested reference rows, selected states, detail pane, reference preview controls/layout/states, loading, unavailable, forbidden, and error states must remain unchanged from the pre-task baseline/current approved UX. The Messages section header chevron is explicitly exempt.
2. Superseded/clarified. Activity-style leading disclosure/header changes apply to both Messages and Active Tasks section headers.
3. Yes, with the header exception. Shared reference viewer/presentation extraction is in scope only as an internal refactor that preserves exact visible Messages content/reference UI, including row structure/classes/spacing/control placement and preview controls/layout/states. If exact preservation is uncertain, leave the Messages content/reference component path stable and build task-specific wrappers/helpers separately.
4. Implementation must provide targeted Messages regression coverage plus Electron visual evidence. If any Messages content/reference file is changed, provide before/after screenshot evidence or equivalent visual baseline comparison for the default Messages list/detail and message reference preview. It must also show the Messages header left chevron.
