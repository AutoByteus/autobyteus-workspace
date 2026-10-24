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

## SR-002 (2026-10-24): decision on code review CRR-001

- Code review CRR-001 found a pre-existing reentry defect (C-01). Reload or repair of a previously ACTIVE Brief Studio ends QUARANTINED because `recoverParticipants` starts the worker while the app is REENTERING. Identical on base. It made AC-003 as first written ("the application stays usable" after a reload) fail in API-06.
- Decision (DEC-004): option 3, narrow AC-003 to this ticket's change: on a reload, each current application's runtime folder is prepared after the catalog commit and before readiness. API-02 already proves this. C-01 is not a prerequisite, because the Task's goal (import, then start without a restart) is proven by AC-001/AC-002. It is recorded as follow-up FU-003 with its evidence and suggested Task, and it is sent when this ticket leaves the team.
- AC-005 clarified: the desktop journey is import then launch with the real `codex`, with no reload or repair. It can run now.
- No code change: implementation `1d49973440` stands; design unchanged; `Small` / `Low` unchanged.
- Next: API/E2E resumes. Record AC-003 against API-02 and API-06 as FU-003 evidence (not a case of this ticket); run API-07 (AC-005).
- Route: handoff rule "Architecture Design Complete with task_size=Small or Medium and architectural_risk=Low" → `/software_engineering_team/implementation_engineer`, who forwards to API/E2E with no code change.

## Route

Handoff rule "Architecture Design Complete with task_size=Small or Medium and architectural_risk=Low" → `/software_engineering_team/implementation_engineer` (2026-10-24).
