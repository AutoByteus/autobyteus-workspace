# Implementation Handoff

Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/imported-app-codex-runtime-folder/tickets/in-progress/imported-app-codex-runtime-folder/` (paths below are relative to it unless absolute).
Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/imported-app-codex-runtime-folder`, branch `fix/imported-app-codex-runtime-folder`, base `origin/personal` @ `1138e8fbef`. Code commit `1d49973440`. Untracked SDK/Brief Studio `dist/` folders are build outputs (not committed).

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: Architecture Design Complete, `Small` + `Low` → direct implementation (no architecture review), per `solution-designer-handoff.md`
- Requirements doc: `requirements-doc.md` (SR-001, Approved)
- Investigation notes: `investigation-notes.md`
- Solution revision record: `solution-revision-record.md`
- Design spec (required on every route): `design-spec.md` (SR-001, Ready)
- Supplemental task artifacts: `evidence/repro-imported-app-codex-launch.e2e.test.ts`, `evidence/SD-01-repro-base.log`, `evidence/SD-02-control-runtime-folder-prepared.log`
- Design review report: `N/A — not applicable`
- Architecture review revision record: `N/A — not applicable`
- Triggering rework report, revision record, or evidence, when applicable: N/A (initial)

## Current Implementation Summary

`ApplicationCatalogTransitionService` takes `storageLifecycleService: Pick<ApplicationStorageLifecycleService, "ensureRuntimeDirectoryPrepared">` (same `Pick` as the startup lifecycle's contract). In `commitAndRecover`, after `commitPreparedCatalogSlice`/`commitPreparedDelta` and before the committed snapshot, reconciliation and `definitionReadiness.prepare()`, it awaits `ensureRuntimeDirectoryPrepared` for each `transitionPlan.currentApplicationIds` entry. `build-application-platform-runtime.ts` passes the existing `storageLifecycleService`. Import, reload, remove (empty current set → no step) and `reloadAndReenter` all get it through `commitAndRecover`; their callers are unchanged.

- Implementation cycle: `Initial`
- Implementation revision record: `implementation-revision-record.md`
- Current implementation revision ID: `IR-001`
- Related solution revision IDs: `SR-001`
- Related architecture-review / code-review / API/E2E / delivery revision IDs: `N/A`
- Triggering finding IDs: `N/A`

## Routing Classification (Mandatory)

- Task size: `Small`
- Architecture risk: `Low`
- Design classification section / evidence reference: `design-spec.md` "Task Size And Architectural Risk"
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale: one dependency and one loop in one service, one wiring line, test updates, one new E2E. No contract, persistence-shape, security, concurrency or deployment change; the folder is the path startup already creates, through the same owner.
- Selected route: `Direct API/E2E`
- Lightweight implementation self-review completed for the direct route: `Yes` (below)
- New design impact or escalation trigger: `None` (readiness passes once the folder exists: IC-01)

### Lightweight self-review

- The transition calls only the storage owner's public method; no path building or `fs` in orchestration (design's forbidden bypass avoided). Dependency direction `application-orchestration` → `application-storage` is a type-only import, as allowed (E-08).
- `ensureRuntimeDirectoryPrepared` requires the bundle in the catalog; it runs after the in-memory commits, so every current application is present.
- A folder-creation failure throws inside `commitAndRecover` → the existing rollback path (design Key Tradeoffs). Not exercised by a test; matches startup, which also fails on it.
- Removed applications are not in `currentApplicationIds`, so remove creates nothing (the first existing order test still passes unchanged).
- Sequential `await` per application, like startup.

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 | Import: runtime folder before readiness → ACTIVE, RUNNABLE, launches | DS-001: GraphQL `importApplicationPackage` → `ApplicationPackageCommandService` → `ApplicationCatalogTransitionService.runPackageTransition` → `commitAndRecover`: commits → **`storageLifecycleService.ensureRuntimeDirectoryPrepared` (each current app)** → snapshot → reconcile → `definitionReadiness.prepare()` → `recoverParticipants` | IC-01 passes (failed on base, IMP-00); IC-02: signed out gives today's reason |
| BEH-002 | Startup unchanged | `application-platform-lifecycle.ts` untouched | IMP-02 lifecycle tests, IMP-03 pass |
| BEH-003 | Reload: same step | `reloadAndReenter` → `commitAndRecover` | Unit "prepares the reloaded application's runtime folder before readiness" passes; journal-recovery reload test passes with the real storage service |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Key Files Or Areas

- `autobyteus-server-ts/src/application-orchestration/services/application-catalog-transition-service.ts` (dependency + step)
- `autobyteus-server-ts/src/application-platform/runtime/build-application-platform-runtime.ts` (wiring)
- `autobyteus-server-ts/tests/unit/application-orchestration/application-catalog-transition-service.test.ts` (harness dependency; two order tests: import with two apps, reload)
- `autobyteus-server-ts/tests/unit/application-orchestration/application-execution-event-journal-recovery.test.ts` (passes the test's real `ApplicationStorageLifecycleService` to the transition it builds; required by the new dependency)
- `autobyteus-server-ts/tests/e2e/runtime/application-import-codex-launch.e2e.test.ts` (new; from the reproduction; IC-01 AC-001, IC-02 AC-002)

## Important Assumptions

- None beyond the design.

## Known Risks

- **AC-002 verification shape.** AC-002 reads "Same [as AC-001], Codex signed out → readiness `HOST_REQUIREMENT_MISSING` with 'Codex authentication is unavailable: no logged-in account.'". If Codex is signed out *at import*, the transition finds the app not ready and quarantines it with the generic "Application setup is required after catalog transition." Its launch settings then return 503, so the readiness reason can't be read through REST. Startup quarantines a signed-out app too, with diagnostics in the detail. So IC-02 proves REQ-003 on the imported application after import: sign out, and the launch view shows `HOST_REQUIREMENT_MISSING` with the exact text for `/`, `/researcher` and `/writer`. Sign back in and it shows `RUNNABLE`. A missing folder would give a spawn-error text instead. The generic quarantine detail on transition is recorded as FU-002 (out of scope: readiness/quarantine texts).
- FU-001: the architecture boundary test is already red on base (see IMP-05). It is not caused by this change.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: `Bug Fix`
- Reviewed root-cause classification: `Missing Invariant`
- Reviewed refactor decision: `No Refactor Needed`
- Implementation matched the reviewed assessment: `Yes`
- If challenged, routed as `Design Impact`: `N/A`
- Evidence / notes: as design shape guidance.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead code in the touched files and modules removed: `Yes` (none found)
- Dead code found elsewhere, added to `follow-ups.md`: None
- Shared structures remain tight: `Yes`
- Canonical shared design guidance was reapplied: `Yes`
- Changed source files within size guardrails: `Yes` (transition service ~190 lines; build file +1 line, not grown meaningfully)
- Notes: —

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Not Affected`
- Design-spec decision reference: "Persisted Data / State Transition Decision"
- Implementation follows it: `Yes` (an empty folder at the path startup creates)
- Deviation: `None`

## Environment Or Dependency Notes

- Worktree installed, prebuilt and `test:integration:prepare` done by the Solution Designer (Brief Studio importable package present). E2E runs use a resolved temp HOME (`env -i …`), per TESTING.md.

## Checks Run

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-00 | Reproduction as `tests/e2e/runtime/application-import-codex-launch.e2e.test.ts` before the fix | `88272b822e` | macOS, Node | import → transition → readiness | AC-001 | Fail as expected | `evidence/IMP-00-repro-on-base.log` | `currently quarantined: Application setup is required after catalog transition.` / `expected 503 to be 200` |
| IMP-01 | `env -i PATH="$PATH" HOME="$(cd "$(mktemp -d)" && pwd -P)" TMPDIR="$TMPDIR" pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/application-import-codex-launch.e2e.test.ts --no-watch` | `1d49973440` | macOS, Node, scripted CLIs | real studio server: import GraphQL, catalog transition, readiness, launch-settings REST, Brief Studio backend launch, Codex thread | AC-001, AC-002, REQ-001…003 | Pass | `evidence/IMP-01-e2e-application-import-codex-launch.log` | `Tests  2 passed (2)` |
| IMP-02 | same `env -i …` prefix, `vitest run tests/unit/application-orchestration/application-catalog-transition-service.test.ts tests/unit/application-orchestration/application-execution-event-journal-recovery.test.ts tests/unit/application-platform/application-platform-lifecycle.test.ts tests/unit/application-platform/application-platform-runtime-isolation.test.ts --reporter=verbose` | `1d49973440` | macOS, Node | transition service order, reload/reentry with real storage, startup lifecycle, runtime assembly | AC-003, AC-004 | Pass | `evidence/IMP-02-unit-transition-lifecycle.log` | `Test Files  4 passed (4)`, `Tests  20 passed (20)` |
| IMP-03 | same prefix, `vitest run tests/e2e/runtime/agent-runtimes-running-agents.e2e.test.ts` | `1d49973440` | macOS, Node, scripted CLIs | startup-imported Brief Studio readiness and runs | AC-004, BEH-002 | Pass | `evidence/IMP-03-e2e-agent-runtimes-running-agents.log` | `Tests  4 passed (4)` |
| IMP-04 | `pnpm -C autobyteus-server-ts typecheck` | `1d49973440` | macOS, Node | server `src` | AC-004 | Pass | `evidence/IMP-04-server-typecheck.log` | `exit=0` |
| IMP-05 | same prefix, `vitest run tests/architecture/application-framework-boundaries.test.ts` | `1d49973440` | macOS, Node | source-text architecture guards | AC-004 | Fail (1 of 20), pre-existing on base; cause found, not caused by this change | `evidence/IMP-05-architecture-boundaries.log` | `+   "autobyteus-server-ts/src/agent-memory/services/agent-memory-explorer-service.ts"`; `Tests  1 failed \| 19 passed (20)` |

- IMP-05 cause (TESTING Rule 9): base commit `3e3a7b08cc` added `AgentDefinitionService.getInstance()` at `agent-memory-explorer-service.ts:53`, but the guard's exact list (from `2d76ea493a`) was not updated. This ticket touches neither file, and the other 19 guards pass, including the application-framework dependency rules that cover the changed files. It is not fixed here: the right fix (inject the definition service or extend the list) belongs to the memory service's owner. Recorded as FU-001 (urgent: the guard is red on personal).
- Not run, and why: full server `test:unit`/`test:integration` (heavy; TESTING "one heavy run at a time"; the changed paths are covered by IMP-01…05). AC-005, a real-app judgement, is API/E2E's call.

## Frontend Rendered-Result Check (When Applicable)

`Not Applicable`: server-only change.

## Downstream Coverage Hints / Suggested Scenarios

- AC-005: an isolated worktree build (`pnpm --silent isolated-app start --build`). Import a Codex-default application while it runs, then launch it without a restart.
- Optional: reload the imported package (GraphQL reload), then confirm the application stays ACTIVE and launchable (BEH-003 end-to-end).
- Optional: import while Codex is signed out. The application is quarantined with the generic detail (FU-002). That is current behavior, not a regression.

## API / E2E / Executable Coverage Investigation And Execution Still Required

- Independent validation of AC-001…AC-004 (reuse IMP-01…IMP-04 where the code is unchanged), AC-005 judgement, and the disposition of IMP-05/FU-001.
