# Handoff — Architecture Design Complete (SR-004…SR-008, adoption; targeted re-review after the implementer's DI-001)

- Package identifier: `link-existing-run-to-task` (Project Task `autobyteus-11`)
- Result classification: `Architecture Design Complete`
- Current SR entry: `SR-004` (SR-002 link-only design withdrawn before review; kept as `superseded-design-link-only.md`)
- Classification: `task_size=Large`, `architectural_risk=High` (design-spec §Task Size And Architectural Risk)
- Route (from `get_handoff_rules`): Large/High → `/software_engineering_team/architecture_reviewer`
- Sent by: `/software_engineering_team/solution_designer`, 2026-10-18

## Original Request

Project Task `autobyteus-11`. The user's real goal (SR-003): the PM gives a Task to a run the user started by hand
(e.g. one of 411 hand-started Software Engineering Team runs in the PM's workspace) with `delegate_task`, so that run
joins the Task's lifecycle as if the PM had delegated it: shown under the PM, stopped and gone from the sidebar when the
Task closes (no manual archiving). Runs in other workspaces stay where they are (not adoptable now).

## Goals / Expected Output From Review

1. The adoption branch in `assignToExistingCopy` and its eligibility order (DS-001).
2. The handover of an idle hand-started run from its own session to the delegator's root.
3. Crash-safe step order and resumption by retry (Persisted Data; DEC-109), against 8641c0ac L4–L6 and DESIGN.md rule 7.
4. History-index row removal and the empty standalone collaboration package removal.
5. The agent-facing texts. (SR-005: the list tool is removed by the user's decision.)

## Approval Basis

- Requirements `Approved` by the user, SR-003 (2026-10-18); DEC-107..109 by the Solution Designer within the direction,
  user informed.
- Supplements: None. Product Design: N/A.

## Artifacts (absolute paths)

- Requirements: `/Users/normy/autobyteus_org/autobyteus-worktrees/link-existing-run-to-task/tickets/in-progress/link-existing-run-to-task/requirements-doc.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/link-existing-run-to-task/tickets/in-progress/link-existing-run-to-task/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/link-existing-run-to-task/tickets/in-progress/link-existing-run-to-task/design-spec.md`
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/link-existing-run-to-task/tickets/in-progress/link-existing-run-to-task/solution-revision-record.md`
- This handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/link-existing-run-to-task/tickets/in-progress/link-existing-run-to-task/handoff-architecture-review.md`
- Prior review artifacts: `design-review-report.md`, `architecture-review-revision-record.md` (ARCH-REV-001). SR-006 answers ARCH-REV-001; SR-007 answers ARCH-REV-002 (ARCH-F-003); SR-008 answers the implementer's DI-001 (`implementation-design-impact.md`): design-spec Persisted Data "Step 3 keeps every fact and is exactly reversible", catalog address, archived runs, revert owner.

## Workspace / Base / Finalization

- Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/link-existing-run-to-task`, branch
  `codex/link-existing-run-to-task`; base `origin/personal` `2f211340ee`; finalization target `origin/personal`.

## Scope Summary

- In: UC-001..UC-003. Out / follow-ups: runs with their own delegated runs; other workspaces (6fb6e21b); team / org
  delegators; any visibility-only link.

## Open Risks

- R-1 releasing an open idle run; R-2 partial adoption shown `not_confirmed` until retried.

## Next Expected Action

Architecture reviewer reviews and applies its own handoff rules.
