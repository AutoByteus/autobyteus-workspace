# Handoff — `baseline-e2e-probe-repair` SR-003: Architecture Design Complete (revised)

- From: Solution Designer, 2026-10-17
- To: Implementation Engineer (`/software_engineering_team/implementation_engineer`), direct route
- Classification: `Architecture Design Complete`, `task_size=Medium`, `architectural_risk=Low` (unchanged)
- Responds to: IR-001 (`implementation-handoff.md`), Requirement Gap on UC-006 and the REQ-011 classification of the UC-004 warning case.

## Original Request

Project Task `6834441c` from `/project_task_manager`: fix 8 server e2e files and 3 web probes that also fail on the base. Each either passes or is removed with a stated reason, each fix is its own baseline-fix commit, then merge. No release unless the user asks.

## Decisions In This Round

1. **UC-006 / REQ-006 / AC-006 withdrawn (DEC-009).** `nested-team-history-restart.e2e.test.ts` was deleted upstream by remove-nested-task-team (merge `8a8d322144`). The user stated no install holds the retired nested shape (that ticket's DEC-008; REQ-003; AC-001 forbids nested fixtures outside migrations). That is "removed with a stated reason", which the Task's done-criteria allow. The supported parts stay covered by:
   - UC-004 (one-level continuity through the full chain and restart);
   - `tests/unit/app-data-migrations/team-agent-memory-layout-app-data-migration.test.ts` (layout migration);
   - `tests/e2e/app-data-migrations/remove-built-in-project-task-manager-startup.e2e.test.ts` (`runAppDataMigration` manual retry).
   SCN-007 is now `Technically Possible but Unsupported`. No replacement suite. Keep your backup branch's `ab4c1dd2bc` out of the branch.
2. **UC-004 warning case accepted as not a product defect (DEC-010).** Your evidence shows no released writer produced a non-array `team_run_history_index.json`, and the flat-Orgs design fails closed on an unreadable required structure. The updated assertions (fail closed, V2 package byte-identical, no Org, index bytes kept, new work admitted, restart retries) match the contract. RSK-001 is closed.
3. Follow-ups recorded in design-spec Change Scope for `/project_task_manager` at delivery receipt: FU-1 (`codex-interrupted-compaction`, 0c7efc37), FU-2 (opaque `executeGraphql` errors), FU-4 (an unreadable derived history index fails every history list), FU-5 (fixture README drift). FU-3 withdrawn.

## Approval Basis

Requirements re-approved at SR-003 by the Solution Designer within the Task's direction. The removal itself was the user's decision upstream. User informed in the Solution Designer conversation, 2026-10-17. Product behavior requirements are unchanged.

## Workspace

- Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/baseline-e2e-probe-repair`, branch `codex/baseline-e2e-probe-repair` (your IR-001 HEAD `989503dcfa` plus this SR-003 docs commit), base `origin/personal` `516e592d7b`; finalization target `origin/personal`, no release.
- Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/baseline-e2e-probe-repair/tickets/in-progress/baseline-e2e-probe-repair/`

## Expected Output

No code change is needed for this round. Update `implementation-handoff.md` / `implementation-revision-record.md` to the SR-003 basis (UC-006 withdrawn, not a gap), then take your configured route toward API/E2E.

## Route Record

- `get_handoff_rules` (2026-10-17): Architecture Design Complete, Medium / Low → `/software_engineering_team/implementation_engineer`.
