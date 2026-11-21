# Handoff — Architecture Design Complete (team-run-follows-definition)

- Package: `team-run-follows-definition`; Project Task `autobyteus-22` (Project `project_f34a9537-07d7-449a-b78f-16368f1aa619`), requested by `/project_task_manager` on the user's questions (2026-11-11, scope comment 2026-11-18).
- Result: `Architecture Design Complete`, revision `SR-007`. Classification: task_size `Large`, architectural_risk `High` (live membership mutation in a running root, persisted tree field read by history, shared member-context contract, recipient refusal).
- Route: independent architecture review.

## Request and approval

A running or reopened Team run (standalone or catalog copy) follows its Team definition: new members join (Offline, start on first message), removed members leave (busy ones finish their turn), coordinator and handoff rules follow, every remaining member gets one notice, the window shows current members, a message to a former member gets a clear refusal. Approved by the User on 2026-11-21 (requirements SR-005; quote in `requirements-doc.md`). Org-mounted Teams are a follow-up (FU-002).

## Key evidence

- Membership and rules are frozen at start in the run's tree and in three in-memory copies (investigation IF-01..IF-04, AF-01..AF-07); measured on the user's live Marketing Team run (IF-05).
- The SemFlow team is a catalog Team copy; no copies from Org runs exist in the user's data (AF-13).

## Artifacts (absolute paths)

- /home/autobyteus/workspace/.codex/worktrees/team-run-follows-definition/tickets/in-progress/team-run-follows-definition/requirements-doc.md
- /home/autobyteus/workspace/.codex/worktrees/team-run-follows-definition/tickets/in-progress/team-run-follows-definition/investigation-notes.md
- /home/autobyteus/workspace/.codex/worktrees/team-run-follows-definition/tickets/in-progress/team-run-follows-definition/design-spec.md
- /home/autobyteus/workspace/.codex/worktrees/team-run-follows-definition/tickets/in-progress/team-run-follows-definition/solution-revision-record.md
- /home/autobyteus/workspace/.codex/worktrees/team-run-follows-definition/tickets/in-progress/team-run-follows-definition/follow-ups.md (FU-001..FU-003)

## Workspace

- Worktree `/home/autobyteus/workspace/.codex/worktrees/team-run-follows-definition`, branch `codex/team-run-follows-definition`, base `origin/personal` `a07767f4d0`; finalization target `origin/personal`.
- Note for git here: the worktree's filesystem reports two unchanged tracked symlinks as modified; `git merge` then fails with `stash failed`. `git rebase` worked.

## Open risks

- Three files at or over the size limit gain small changes (`root-team-run.ts`, `agent-team-run-manager.ts` 495; `delegation-index.ts` 548): implementation keeps them within limits by moving a cohesive block out.
- Delivery racing a removal is ordered by the swap (design § Risks).
