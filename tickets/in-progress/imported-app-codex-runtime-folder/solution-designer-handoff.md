# Solution Designer Handoff: autobyteus-238 (imported-app-codex-runtime-folder)

- Result: `Architecture Design Complete`, `task_size=Small`, `architectural_risk=Low` → direct implementation route
- Package: `imported-app-codex-runtime-folder`, Project Task `autobyteus-238`, SR-001
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`) for the user
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/imported-app-codex-runtime-folder`, branch `fix/imported-app-codex-runtime-folder`, base `origin/personal` @ `1138e8fbef`; finalization target `origin/personal`; no release unless the user asks
- Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/imported-app-codex-runtime-folder/tickets/in-progress/imported-app-codex-runtime-folder/`
- Approval: requirements approved by the Solution Designer within the Task's direction; user informed (2026-10-24)

## Original request (summary)

An application imported while the server runs, with Codex as its launch runtime, is quarantined until the server restarts. Prepare an imported application's runtime folder before its readiness check (or let readiness handle a missing folder), and add an import-then-launch end-to-end test for a Codex-default application. Done when such an application starts without a restart, the e2e passes, and the work is finalized on personal. Reproduce first.

## Finding

- Reproduced on base (`evidence/SD-01-repro-base.log`). The import's catalog transition runs launch readiness, which spawns Codex in `<data>/applications/<app>/runtime`. That folder does not exist yet, so the spawn fails with `ENOENT` and the application is quarantined ("Application setup is required after catalog transition.").
- Startup prepares the folder before readiness (`application-platform-lifecycle.ts:51-58`); the catalog transition (`application-catalog-transition-service.ts:118-156`) does not.
- Control: creating the folders before readiness makes the imported application runnable and launchable (`evidence/SD-02-control-runtime-folder-prepared.log`; temporary diagnostic, reverted).

## Design (see design-spec.md)

`ApplicationCatalogTransitionService` gets `storageLifecycleService` (a `Pick` with `ensureRuntimeDirectoryPrepared`). In `commitAndRecover`, after the catalog commit and before readiness, it prepares each current application's runtime folder. Wire it in `build-application-platform-runtime.ts`, update the transition unit test, and add the import-then-launch E2E from the reproduction (with a signed-out case, AC-002). FU-004 (Antigravity/Grok readiness) stays separate.

## Validation expectations

New E2E (AC-001, AC-002); the transition unit test (AC-003); the existing lifecycle tests, `agent-runtimes-running-agents.e2e`, server typecheck and the architecture boundary test (AC-004).

## Follow-ups

None.

## Route

Handoff rule "Architecture Design Complete with task_size=Small or Medium and architectural_risk=Low" → `/software_engineering_team/implementation_engineer` (2026-10-24).
