# Implementation Handoff

Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-reentry-worker-stopped/tickets/in-progress/application-reentry-worker-stopped/` (paths below are relative to it unless absolute).
Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-reentry-worker-stopped`, branch `codex/application-reentry-worker-stopped`, base `origin/personal` @ `ddd6fdcdf6`. Code commit `6950a24e1b`. Untracked SDK/Brief Studio `dist/` folders are build outputs (not committed).

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: Architecture Design Complete, `Medium` / `High` → architecture review. ARCH-REV-001 failed (AR-001, AR-002), SR-002 revised the design, and ARCH-REV-002 passed it → implementation → source review.
- Requirements doc: `requirements-doc.md` (SR-001, unchanged by SR-002)
- Investigation notes: `investigation-notes.md` (E-08 corrected in SR-002)
- Solution revision record: `solution-revision-record.md`
- Design spec: `design-spec.md` (SR-002, Ready)
- Supplemental task artifacts: `evidence/repro-application-reentry.e2e.test.ts`, `evidence/SD-01-repro-base.log`, `evidence/SD-02-control-reentry-order.log`, `application-framework-design-findings.md` (report; findings 1–3 fixed here)
- Design review report: `design-review-report.md` (ARCH-REV-002, Pass)
- Architecture review revision record: `architecture-review-revision-record.md`
- Triggering rework report: N/A (initial)

## Current Implementation Summary

- **Reentry** (`application-reentry-service.ts`): for a ready participant, `recoverParticipants` now does `recoveryService.resumeApplication` → `availabilityService.activateApplication` → `eventDispatchService.resumePendingEventsForApplication` → `applicationAgentToolCallLifecycle.open`. It no longer calls `ensureReady`, and the launcher dependency is `Pick<…, "stop">`. The third parameter is `setupRequiredDetails: ReadonlyMap<string, string>`; it replaces `recoverableApplicationIds`, is required, and has no default. A current application with a detail is quarantined with that detail and its tools are closed. The generic "after catalog transition" text is gone. These are unchanged: preparation, `quarantineParticipants`, the removed/persisted-only branch, the `recoverPreviouslyInactive` policy, the not-a-participant (new import) branch, and the failure path (stop, close tools, quarantine with the message).
- **Transition** (`application-catalog-transition-service.ts`): after readiness, it builds the map from `transitionPlan.currentApplicationIds` with `definitionReadiness.getSetupRequiredDetail` and passes it to reentry.
- **Readiness** (`application-definition-runtime-readiness.ts`): a module-local `setupRequiredDetail(diagnostics)` builds "Application setup is required: <diagnostics joined by '; '>". `ApplicationSetupRequiredError` uses it for its message. The new `getSetupRequiredDetail(applicationId): string | null` uses it for one application. `getDiagnosticsByApplicationId` is removed.
- **Startup** (`application-platform-lifecycle.ts`): for each selected catalog application (`snapshot.applications` filtered by `isSelected`), it quarantines the application with a non-null `getSetupRequiredDetail`. The inline text is removed.
- **Engine stop** (`application-engine-controller.ts`, `application-engine-launcher.ts`): `stopAttachedEngine` is renamed `stopEngine`. Without an attached handle it now sets the base `stopped` status instead of returning early, so a crashed `failed` worker is reset. With a handle the behavior is unchanged. The launcher's `stop` calls `stopEngine`.
- **Architecture guard**: the anchor moves to `"  async stopEngine("`; the assertion (the stop sends `APPLICATION_ENGINE_METHOD_STOP`) is unchanged.
- **Docs**: `docs/modules/application_orchestration.md` (repair section) and `docs/modules/applications.md` (reentry bullet) now describe the order. They also say reentry never starts a worker, a crashed worker is reset to stopped, the worker starts on demand, and a not-ready application's quarantine names its readiness diagnostics, as at startup.

- Implementation cycle: `Initial`
- Implementation revision record: `implementation-revision-record.md`
- Current implementation revision ID: `IR-001`
- Related solution revision IDs: `SR-001`, `SR-002`
- Related architecture-review revision IDs: `ARCH-REV-001`, `ARCH-REV-002`
- Related code-review / API/E2E / delivery revision IDs: `N/A`
- Triggering finding IDs: `N/A`

## Routing Classification (Mandatory)

- Task size: `Medium`
- Architecture risk: `High`
- Design classification section / evidence reference: `design-spec.md` "Task Size And Architectural Risk"
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale: 6 source files across `application-orchestration`, `application-platform/runtime` and `application-engine`. The change alters the lifecycle order of the shared reentry path and the transition→reentry contract, as the design classified. No API, persistence, security or deployment change.
- Selected route: `Code Review`
- Lightweight implementation self-review completed for the direct route: `Not Applicable` (Medium/High goes to independent review; implementation notes below)
- New design impact or escalation trigger: `None`. No worker-dependent step was found that must run before ACTIVE. Tools open after dispatch resume, and the tool catalog comes from the bundle, not the worker.

### Implementation notes for the reviewer

- The not-a-participant branch (an application new in the catalog, as on import) still only activates and opens tools, with no dispatch resume. That is unchanged and outside the design's DS-003. A newly imported application has no journal yet.
- In the ready path, dispatch resume runs after `activateApplication`. If it throws, the existing catch stops the worker, closes tools and quarantines with the message. The app is briefly ACTIVE before that, which is the accepted residual risk.
- `stopEngine` without a handle writes the base status even for an application that never started. That is harmless: the status getter already defaults to the base status. `launcher.stop` awaits an in-flight start first, so a "starting" state cannot be overwritten mid-start.
- Startup still filters by `isSelected` explicitly. Readiness's checked set (`activeApplicationIds`) is the same `selectedApplicationIds` (`create-application-orchestration-services.ts:241`), so the quarantined set is unchanged.
- File sizes: every changed source file stays under 250 lines. The largest delta is the reentry service (+~10 net).

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 | Reload/repair → ACTIVE, worker stopped, starts on demand | DS-001: GraphQL `reloadApplicationPackage` / REST repair → `ApplicationCatalogTransitionService.commitAndRecover` → `ApplicationReentryService.recoverParticipants` (recover → ACTIVE → dispatch → tools open; no `ensureReady`) | e2e RE-01, RE-02 pass (fail on base); reentry unit order |
| BEH-002 | Dispatch resumes after ACTIVE | `resumePendingEventsForApplication` after `activateApplication` | reentry unit order; journal-recovery reload test asserts the pending event is handled after activation |
| BEH-003 | Not-ready app quarantined with the readiness reason; one text owner | `ApplicationDefinitionRuntimeReadiness.getSetupRequiredDetail` → transition map → reentry quarantine; startup lifecycle uses the same method | e2e RE-03 (503, "Application setup is required:", "Codex authentication is unavailable"); transition, lifecycle and readiness units |
| BEH-004 | Repair after sign-in → ACTIVE, no restart | same as BEH-001 | e2e RE-03 second half |
| MP-001 (SR-002) | Crashed worker reset by stop, starts on demand | `ApplicationEngineLauncher.stop` → `ApplicationEngineController.stopEngine` (no handle → base `stopped`) → invoker `ensureReady` | controller unit and invoker unit (real controller and launcher; only `startApplicationEngine` faked); both fail with the reset removed (IMP-00 c) |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Key Files Or Areas

Source: `src/application-orchestration/services/application-reentry-service.ts`, `…/application-catalog-transition-service.ts`, `src/application-platform/runtime/application-definition-runtime-readiness.ts`, `…/application-platform-lifecycle.ts`, `src/application-engine/services/application-engine-controller.ts`, `…/application-engine-launcher.ts`.
Tests: `tests/e2e/runtime/application-reload-repair.e2e.test.ts` (new), `tests/unit/application-agent-tools/application-agent-tool-worker-invoker.test.ts` (new), and updated `application-reentry-service.test.ts`, `application-catalog-transition-service.test.ts`, `application-execution-event-journal-recovery.test.ts`, `application-platform-lifecycle.test.ts`, `application-definition-runtime-readiness.test.ts`, `application-engine-controller.test.ts`, `tests/architecture/application-framework-boundaries.test.ts` (anchor).
Docs: `docs/modules/application_orchestration.md`, `docs/modules/applications.md`.

## Important Assumptions

- None beyond the design.

## Known Risks

- The residual risks accepted by the design and architecture review:
  - a stop clears `lastFailure`;
  - a short ACTIVE window before tools open;
  - a worker start failure surfaces on the first on-demand request.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: `Bug Fix`
- Reviewed root-cause classification: `Missing Invariant` + `Duplicated Policy Or Coordination`
- Reviewed refactor decision: `Refactor Needed Now` (small): done (one owner for the setup text; reasons passed instead of IDs)
- Implementation matched the reviewed assessment: `Yes`
- If challenged, routed as `Design Impact`: `N/A`

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead code in the touched files removed: `Yes`. Removed: reentry `ensureReady` and its `Pick` member; `recoverableApplicationIds`; the generic text; the inline lifecycle text; `getDiagnosticsByApplicationId` and its two test stubs; the early return without a status change. A grep finds no references to the old names in `src`, `tests` or `docs`.
- Dead code found elsewhere, added to `follow-ups.md`: None
- Shared structures remain tight: `Yes`. The map carries one meaning: application → setup-required detail.
- Canonical shared design guidance was reapplied: `Yes`
- Changed source files within size guardrails: `Yes`

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Not Affected` (in-memory availability and worker lifecycle); followed; no deviation.

## Environment Or Dependency Notes

- The worktree was installed and built, and Brief Studio's importable package is present (`test:integration:prepare`). E2E and integration runs use a resolved temp HOME (`env -i …`), per TESTING.md, one heavy run at a time.

## Checks Run

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-00 | (a) new e2e on base sources; (b) engine units against base controller/launcher; (c) engine units with only the handle-less reset removed | base `ddd6fdcdf6` / mutation of the fix | macOS, Node 22 | reentry path; controller stop | AC-001…004, MP-001 | (a) 3/3 fail as expected; (b) fails on the rename; (c) the two new cases fail | `evidence/IMP-00-base-and-mutation.log` | (a) `currently reentering`, `QUARANTINED`, `to contain 'Application setup is required:'`; (c) `Tests  2 failed \| 3 passed (5)` |
| IMP-01 | `env -i PATH="$PATH" HOME="$(cd "$(mktemp -d)" && pwd -P)" TMPDIR="$TMPDIR" pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/application-reload-repair.e2e.test.ts --no-watch` | `6950a24e1b` | macOS, Node 22, scripted CLIs | real studio server: import, package reload, repair, readiness, Brief Studio worker | AC-001…AC-004 | Pass | `evidence/IMP-01-e2e-application-reload-repair.log` | `Tests  3 passed (3)` |
| IMP-02 | same prefix, `vitest run tests/unit/application-* tests/unit/standalone-application-host tests/architecture` (+ changed/new unit files verbose) | `6950a24e1b` | macOS, Node 22 | all application units, architecture guards | AC-005, AC-006, AC-007 | Pass | `evidence/IMP-02-unit-application-and-architecture.log` | `Test Files  74 passed (74)`, `Tests  433 passed (433)`; verbose `Tests  29 passed (29)` |
| IMP-03 | same prefix, `vitest run tests/e2e/runtime/application-import-codex-launch.e2e.test.ts`, then `tests/e2e/runtime/agent-runtimes-running-agents.e2e.test.ts` | `6950a24e1b` | macOS, Node 22, scripted CLIs | 238 import→launch; Brief Studio runs and readiness | AC-007 | Pass | `evidence/IMP-03-e2e-regressions.log` | `Tests  2 passed (2)`, `Tests  4 passed (4)` |
| IMP-04 | same prefix, `vitest run tests/integration/application-backend` | `6950a24e1b` | macOS, Node 22 | real launcher/controller with Brief Studio | AC-007 | Pass | `evidence/IMP-04-integration-application-backend.log` | `Test Files  14 passed (14)`, `Tests  34 passed (34)` |
| IMP-05 | `pnpm -C autobyteus-server-ts typecheck` | `6950a24e1b` | macOS, Node 22 | server `src` | AC-007 | Pass | `evidence/IMP-05-server-typecheck.log` | `exit=0` |

- Not run, and why: the full server `test:unit` and `test:integration` (heavy; the changed paths are covered by the application folders and architecture guards). A test-file typecheck is not available: no project tsconfig includes `tests`, since `tsconfig.json` has `rootDir: src`, and that's a discrepancy with nothing to run. A desktop-app look at repair or reload is not run either: the web app has no repair/reload action (finding #4, FU-004), so the REST/GraphQL e2e is the user-equivalent surface.

## Frontend Rendered-Result Check (When Applicable)

`Not Applicable`: server-only change.

## Downstream Coverage Hints / Suggested Scenarios

- The durable e2e (IMP-01) covers AC-001…004. Optional real-stack checks on an isolated worktree build:
  - a package reload via the devkit while the Brief Studio UI is open;
  - a repair after a worker crash (kill the worker process, then `POST …/backend/reload`, then use the app);
  - a pending event recorded while REENTERING and dispatched after ACTIVE.
- AC-008 is a review of the two docs; AC-009 is the Solution Designer's report.

## API / E2E / Executable Coverage Investigation And Execution Still Required

- After code review: API/E2E validation of AC-001…AC-008 (reuse IMP-01…05 where the code is unchanged).
