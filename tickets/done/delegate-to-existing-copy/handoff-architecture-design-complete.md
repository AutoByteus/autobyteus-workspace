# Handoff — Architecture Design Complete

- Package identifier: `delegate-to-existing-copy`
- Result classification: `Architecture Design Complete`
- Current solution revision: `SR-005` (revision after ARCH-REV-001 round 1; requirements baseline `SR-003`, approved by the user 2026-10-09, clarified in SR-005 without an intended-behavior change)
- task_size: `Large` · architectural_risk: `High` (rationale in design-spec → Task Size And Architectural Risk)
- Applied handoff rule: "task_size=Large or architectural_risk=High … ready for independent architecture review" → `/software_engineering_team/architecture_reviewer`
- Original requester: Project Task Manager (`/project_task_manager`, run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`) on behalf of the user

## Original Request (summary)

Let a delegator give a follow-up Task to the **same** delegated copy (Agent or Team) that did earlier work, by that copy's ID. `delegate_task` must return explicit IDs (team run ID and coordinator agent run ID for a Team copy). Ownership rule, messaging decision, worker sub-work decision, tool texts, docs and tests included. Done when: the Manager delegates Task A to a team, later gives Task B to that same copy by its team run ID; the copy resumes with its conversation; the board shows B assigned to it; finishing A doesn't stop the copy while B is open; covered by tests; verified by the user.

## Approved Decisions (SR-003)

- DEC-001: one current Task per copy; a new Task only after the current one is DONE/CANCELLED; the earlier Task is never reopened.
- DEC-002: only the copy's most recent assigner may assign it a new Task.
- DEC-003: `delegate_task(target_team_run_id | target_agent_run_id, task_id)`; results `{delegated, target_kind, target_agent_run_id}` or `{delegated, target_kind, target_team_run_id, target_team_coordinator_agent_run_id}`.
- DEC-004: `send_message_to` stays agent-only (team run ID refused with the coordinator ID in the message).
- DEC-005: `list_project_tasks` explicit IDs + `closedAssignments`.
- DEC-006: worker sub-work: description note only; child Tasks are a separate ticket.
- DEC-008: clean break, no alias.
- DEC-009: internal names must reflect reality; refactor where misleading.

## Artifacts (absolute paths)

- Requirements (Approved, SR-003): `/Users/normy/autobyteus_org/autobyteus-worktrees/delegate-to-existing-copy/tickets/in-progress/delegate-to-existing-copy/requirements-doc.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegate-to-existing-copy/tickets/in-progress/delegate-to-existing-copy/investigation-notes.md`
- Design spec (Ready, SR-004): `/Users/normy/autobyteus_org/autobyteus-worktrees/delegate-to-existing-copy/tickets/in-progress/delegate-to-existing-copy/design-spec.md`
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegate-to-existing-copy/tickets/in-progress/delegate-to-existing-copy/solution-revision-record.md`
- Supplements: none. Product design: N/A — not applicable. Prior architecture review artifacts: N/A — not applicable (first review).

## Workspace

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegate-to-existing-copy`, branch `codex/delegate-to-existing-copy`
- Base: `origin/personal` @ `048ea6cecb3f1999d4201be5b995157a8007d8e7`; finalization target `origin/personal`
- Cross-repo: Project Task Manager skill in `~/autobyteus_org/autobyteus-agents` (`AutoByteus/autobyteus-agents`, `main`) — design step S7

## Design Summary

- Task side owns a derived **current entry** per copy (open entry, else latest `linkedAt`); ownership, release, visibility and status marks read it. Persisted shape unchanged (`Directly Usable — No Migration`).
- New DS-002: tool → capability `assignToExistingCopy` → root → `RootTaskExecutionLifecycle.assignToExistingCopy` → adapter lookup → Task-side eligibility → shared resume queue step (also used by reactivation) → commit B entry → reopened event → root exact delivery of B's work → `markStarted`.
- DONE releases only copies whose current Task is the closing Task.
- Explicit-ID tool results and assignment views; mechanical rename of the "agent run resource" vocabulary to "task execution resource" (persisted names mapped only in the schema module; error codes kept).
- Change sequence S1 (pure rename) … S8 (tests).

## Open Risks For Review

- Repeated-DONE-of-A vs. assignment-of-B race (mitigation and residual window in design-spec → Risks).
- Lock order execution key → Task ID for reopen and assign-existing.
- `ownerOf` innermost-wins replaces the cross-Task conflict check.
- Breadth of S1 rename; cross-repo skill coordination.

## Scenario Basis

SCN-001..008 (requirements-doc). SCN-001 is the user's motivating flow (reviewer-proposed follow-up Task to the same team).

## Next Expected Action

Independent architecture review of the design against the approved requirements. On Pass, the reviewer routes to implementation per its rules; findings return to the Solution Designer.

## SR-005 — Round 1 Resolutions (for review round 2)

- Review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegate-to-existing-copy/tickets/in-progress/delegate-to-existing-copy/design-review-report.md` (ARCH-REV-001 round 1).
- AR-001: supported (option a). design-spec → Guidance For Implementation ("Assign-existing eligibility", "Re-link entry semantics", "AC-010 hint"), file table (`relinkExistingTaskExecution`), Interface table, Examples (A → B → A, AC-010 hint). Requirements: REQ-003 wording clarified; AC-018 added (no approval change: REQ-004 already allowed the case).
- AR-002: `assignedBy` kept (name map, example).
- AR-003: `ActiveCollaborationRootDirectory.findTeamCoordinator` over all active roots before the live-only fallback (file table, DS-005 narrative, Interface table).
- AR-004: `assertAllReadable` in `assertAssignable` and the commit (eligibility item 1; project-task-service row).
- R-1: Risks text and tests (both orders). R-2: "ever started" (eligibility item 5).
- Section "Architecture Review Round 1 Resolutions (SR-005)" at the end of design-spec summarizes this.

## SR-006 — Round 2 Resolutions (for review round 3)

- Review report: ARCH-REV-002 in `/Users/normy/autobyteus_org/autobyteus-worktrees/delegate-to-existing-copy/tickets/in-progress/delegate-to-existing-copy/design-review-report.md`.
- AR-001: option (a). design-spec → Persisted Data decision (relaxed per-file rule, no entry-meaning change, downgrade note), file table (domain `linkExistingTaskExecution` + last-entry lookups; schema rule; service per-Task latest entry), Interface table (port commit appends), Examples (A → B → A keeps the 10:00 entry), Guidance → "Entry rule for a copy returning to a Task". `closedAssignments` lists every closed period. Approved REQ-003 text restored; AC-018 kept as verification only.
- AR-005: S3 now points to the single eligibility list and entry rule in Guidance.
