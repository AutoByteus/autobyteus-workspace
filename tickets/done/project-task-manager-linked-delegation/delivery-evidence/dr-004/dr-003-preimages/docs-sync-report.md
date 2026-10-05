# Docs Sync Report — DR-003

## Scope / Result
**Docs impact identified; sync Blocked, waiting for latest-base source integration.** Overall Delivery is **Blocked / Local Fix — source integration**.
Basis: REQ-BL-009 (SD-AP-003; it replaces REQ-BL-008 where they differ), SR-023/SR-024, ARCH-REV-010/011. Classification: **Large / High / Reviewed**, unchanged.
Candidate: IR-013 `b61b8452f` plus the API-REV-020 durable test delta (CRR-027 source Pass 9.3; API-REV-020 Pass 95.00%; CRR-029 test-code Pass). It supersedes the DR-002 candidate `ccb5fbe3`/`4b04d9097`, which must not be finalized.

DR-002 pre-image: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-linked-delegation/tickets/in-progress/project-task-manager-linked-delegation/delivery-evidence/dr-003/dr-002-preimages/docs-sync-report.md`.

## Why Docs Are Not Synced Yet
Docs sync must run on the integrated state. The latest-base merge (origin/personal `fc79fad14`) conflicts in `autobyteus-server-ts/src/agent-execution/domain/agent-run.ts`, and the conflict needs a source change. Details: `/Users/normy/autobyteus_org/autobyteus-worktrees/project-task-manager-linked-delegation/tickets/in-progress/project-task-manager-linked-delegation/delivery-evidence/dr-003/integration-attempt.md`.

The DR-002 edits to 8 long-lived docs describe the superseded lifetime/gate/stamp model. They are no longer in the working tree. They are stashed (`76b8fd003`) and backed up in `superseded-docs.tgz`, and they will not be committed.

## Resync Plan (to run on the integrated state)
These paths are affected: `TESTING.md`, `autobyteus-server-ts/docs/modules/{projects,agent_team_execution,agent_orgs,standalone_agent_run_root,agent_communication,run_history}.md`, `autobyteus-web/docs/projects.md`. They need to say:
- Execution trees carry no Task information.
- Each Task's `<projectId>/tasks/<taskId>/agent_run_resources.json` is the only record of its agent runs. Each entry holds role assigned/delegated/broughtIn, hostRoot, agentRun, start/startError and closedAt.
- No shutdown state is persisted. Repeating DONE re-requests the stop.
- Projects use per-Project/Task folders, created by the STARTUP_ONLY migration `20261005_projects_per_folder_v1`, which keeps `projects.pre-folders.json`. An existence-only `PROJECTS_MIGRATION_PENDING` gate affects only Projects.
- `list_project_tasks` returns current assignments, or `assignmentsUnavailable`.
- The single composition binding is `compositions/project-task-agent-resource-composition.ts`.
- CRR-027 future obligation: before any change to `ProjectsLayout`, `readProjectFile` or `readTaskFile`, repoint `projects-per-folder-v1` to frozen copies (data_migration_guideline §4).
- TESTING.md: the startup no-write e2e is replaced by `projects-startup-migration.e2e.test.ts`.

No long-lived docs were changed in DR-003.
