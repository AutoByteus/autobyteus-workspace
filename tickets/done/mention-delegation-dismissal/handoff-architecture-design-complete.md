# Handoff — Architecture Design Complete

- Result classification: `Architecture Design Complete`
- Package identifier: `mention-delegation-dismissal`
- Current solution revision: `SR-005` (design revision for ARCH-REV-001) on approved requirements `SR-003`
- task_size: `Large`; architectural_risk: `High` (rationale in design-spec.md § Task Size And Architectural Risk)
- Applied route: `get_handoff_rules` matched "Architecture Design Complete with task_size=Large or architectural_risk=High" → `/architecture_reviewer`

## Original request (summary)

The user found that `@` in a live run permanently adds a collaborator that can never be dismissed, whereas delegated copies of
Project Tasks disappear when the Task is set to DONE. The user's direction (rounds 1–10, 2026-10-06): `@` should make the agent
use `delegate_task`; every described delegation by an unowned sender creates an ad-hoc Task (no Project, text only) and
returns `task_id`; the delegator (or the user, by asking the agent) closes it with `create_or_update_task({task_id, status: DONE})`;
`create_or_update_task` update mode takes `task_id` only; ad-hoc Tasks live under `<appData>/ad-hoc-tasks/`.

## Approval basis

- Requirements: `Approved` — SR-003 (REQ-001..013, AC-001..015, SCN-001..007, BEH-001..009), user approval 2026-10-06
  ("Okay, understand. I think the requirement is clear now, right? Now I go ahead with the designing.").
- Behavior-defining supplements: None. Product design: N/A — not applicable.

## Artifacts (absolute paths)

- Requirements: `/Users/normy/autobyteus_org/autobyteus-worktrees/mention-delegation-dismissal/tickets/in-progress/mention-delegation-dismissal/requirements-doc.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/mention-delegation-dismissal/tickets/in-progress/mention-delegation-dismissal/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/mention-delegation-dismissal/tickets/in-progress/mention-delegation-dismissal/design-spec.md`
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/mention-delegation-dismissal/tickets/in-progress/mention-delegation-dismissal/solution-revision-record.md`
- Prior review artifacts: N/A — not applicable (first review)

## Workspace

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/mention-delegation-dismissal`
- Branch: `codex/mention-delegation-dismissal`
- Base: `origin/personal` @ `3c8e49ad5`; finalization target `origin/personal`
- No source code changed yet; only ticket artifacts.

## Scope

In: `@` resolution without admission (3 roots), ad-hoc Task creation in described `delegate_task`, `task_id` in result,
ad-hoc storage, two-mode `create_or_update_task`, automatic `create_or_update_task` exposure, ad-hoc cleanup on run delete,
docs. Out: Dismiss button, agent-initiated collaborator bring-in, temp Project, existing collaborators, Projects UI.

## Points for review attention

1. Ad-hoc creation inside `TaskAgentResourcePort.linkAgentRun` (assigned variant with `adHocTask`) — keeps runtime free of Task facts.
2. `ProjectTaskService.updateTaskById` vs. existing `updateTask` (identity split) and the shared DONE closure.
3. Ad-hoc lookup bypasses the Projects migration gate (REQ-012) via direct path read.
4. New dependency: run-history / org delete owners → `ProjectTaskService.deleteAdHocTasksHostedBy` (in-memory view, best effort).
5. Design interpretations in SR-004 (ineligible `@` error code kept; runnability at delegation; mid-dispatch failure semantics; linked mode returns `task_id`).

## Open risks

- Breaking update-mode contract for the agent-repository Project Task Manager skill (separate repo; coordinated update).
- Delegated copies become Task-owned → cross-Task copy-to-copy messaging fails (approved).
- Orphan ad-hoc `task.json` after a crash between create and link (interrupted execution; out of scope).

## Expected next action

Independent architecture review of the cumulative package. Findings on requirements/design return to Solution Designer.

## Revision SR-005 (response to ARCH-REV-001 round 1)

- AR-001 resolved with the reviewer's preferred fix: linked `delegate_task` unchanged (`resolveAssignment` Project-only; ad-hoc ID → `TASK_NOT_FOUND`; linked result stays `{target_agent_run_id}`); `task_id` returned only when the link created an ad-hoc Task; LLM wording "a description-only delegation that creates a Task returns its `task_id`"; DS-006 single-host-root invariant stated.
- R-1 adopted: note guidance conditional ("If it also returns a task_id, ...").
- R-2 adopted: DS-001 names the standalone `AgentRunCommandCoordinator.post → StandaloneAgentRunRoot.postUserMessage → StandaloneRootMessageDelivery.postToHost` entry.
- Requirements unchanged (SR-003 approval still applies). Classification unchanged: Large / High.
- Re-review scope: AR-001, R-1, R-2. Review report: design-review-report.md; review record: architecture-review-revision-record.md (same folder).
- Pending user decision outside this revision: agent-initiated collaborator bring-in (may become a later requirements revision).
- Applied route: `get_handoff_rules` → revised Large/High package → `/architecture_reviewer`.
