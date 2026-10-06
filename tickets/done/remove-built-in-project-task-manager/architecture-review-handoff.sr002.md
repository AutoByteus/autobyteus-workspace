# Architecture Review Handoff — SR-002 (remove-built-in-project-task-manager)

- Result: `Architecture Design Complete`
- task_size: `Medium`; architectural_risk: `High`
- Route applied: the handoff rule for Large or High → `/software_engineering_team/architecture_reviewer` (via `get_handoff_rules`, 2026-10-06)
- Package identifier: `remove-built-in-project-task-manager`
- Current solution revision: SR-002 (design). The requirements basis is SR-001, approved by the user on 2026-10-06.

## Original request

Remove the built-in "Project Task Manager" (`autobyteus-project-task-manager`, template `autobyteus-server-ts/src/built-in-agents/templates/project-task-manager/`) from the AutoByteus server, along with everything that depends on it. It duplicates the agent-repository agent `project-task-manager`, which has its own `project-task-management` skill. Keep the Projects feature and its tools unchanged. Follow DESIGN.md/TESTING.md and the Data Migration Guideline for copies already installed in users' app data.

## Approval basis

- The user approved SR-001: "aprpove. i thin its simple right? just remove the internal built in project task manager?"
- Recorded as: DEC-001 = A (delete `<appData>/agents/autobyteus-project-task-manager/` once, without backup). DEC-002 accepted: old conversations stay readable but can't be continued, and user-built Teams/Orgs that include the built-in need that member replaced.
- ASM-001 (the agent repository is configured where wanted) was not explicitly confirmed. The removal doesn't depend on it.

## Workspace

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-built-in-project-task-manager`
- Branch: `codex/remove-built-in-project-task-manager`
- Base: `origin/personal` @ `1aa91829811866d391bb61d011109aa1a4ea7683`
- Finalization target: `origin/personal`
- No source changes have been made yet. Only ticket artifacts exist (uncommitted).

## Artifacts (absolute paths)

- Requirements (Approved): `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-built-in-project-task-manager/tickets/in-progress/remove-built-in-project-task-manager/requirements-doc.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-built-in-project-task-manager/tickets/in-progress/remove-built-in-project-task-manager/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-built-in-project-task-manager/tickets/in-progress/remove-built-in-project-task-manager/design-spec.md`
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-built-in-project-task-manager/tickets/in-progress/remove-built-in-project-task-manager/solution-revision-record.md`
- SR-001 approval request (history): `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-built-in-project-task-manager/tickets/in-progress/remove-built-in-project-task-manager/approval-request.sr001.md`
- Supplements: None. Product Design: N/A (not applicable). Prior review artifacts: N/A (first review).

## Design summary

1. Delete the registry constant and row, and the template folder.
2. Add the required startup migration `20261006_remove_built_in_project_task_manager`. It removes exactly `<agentsDir>/autobyteus-project-task-manager`, following the `remove-external-messaging-data-migration.ts` pattern: SKIPPED if missing, FAILED and retried on next start, never blocks startup. It runs before the built-in bootstrap and catalog refresh.
3. Remove the ID from the web built-in mirror, from tests and probes, and from the smoke script (which now asserts dist absence). Make the node-locality E2E stop depending on a shipped manager.
4. Update docs: Projects docs, the server README migration list, and TESTING.md.

## Points for the reviewer's attention

- Data Migration Guideline §2 checklist answers are in design-spec → Persisted Data / State Transition Decision.
- The Memory Compactor precedent (leave the retired folder inert) was deliberately not followed. That folder caused no user-visible duplicate; this one does.
- Rejected: a catalog filter or alias for the old ID, a backup copy, deletion logic inside the bootstrapper, and rewriting history or Team references.
- PREM-001: a user agent named exactly "AutoByteus Project Task Manager" on an install that never had the built-in. Classified Technically Possible but Unsupported/Contrived, so no guard.

## Open risks

- UNK-001: the outward UI when continuing an old built-in run. Expected to be the existing "not found" failure; to be confirmed in API/E2E validation (AC-008).
- SCN-007: downgrade-then-upgrade is unsupported.

## Expected output

An architecture review result (Pass, Fail or Blocked) on the SR-002 design against the SR-001 requirements. On Pass, the configured route continues to implementation.
