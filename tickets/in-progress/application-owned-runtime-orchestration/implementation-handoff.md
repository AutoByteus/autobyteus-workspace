# Implementation Handoff

## Upstream Artifact Package

- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/tickets/in-progress/application-owned-runtime-orchestration/requirements.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/tickets/in-progress/application-owned-runtime-orchestration/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/tickets/in-progress/application-owned-runtime-orchestration/design-spec.md`
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/tickets/in-progress/application-owned-runtime-orchestration/design-review-report.md`
- Implementation review report addressed in this update: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/tickets/in-progress/application-owned-runtime-orchestration/review-report.md`

## Current Status

Applied the implementation-review Local Fix updates and resolved the blocking findings called out in `review-report.md`:

- `AOR-LF-001` resolved: dispatch drain is now tail-safe when new execution events arrive during drain shutdown.
- `AOR-LF-002` resolved: `startRun(... initialInput ...)` now waits for the synthetic `RUN_STARTED` event append path before runtime input can publish artifacts.
- `AOR-LF-003` resolved: the oversized server/UI source files were split into smaller owner-aligned modules under the hard limit.
- `AOR-LF-004` resolved: dispatcher tail rechecks now preserve future-scheduled retry/backoff instead of canceling the retry timer and re-entering a hot retry loop.

This implementation is ready to return through code review before API/E2E starts.

## What Changed

The approved clean-cut move from platform-owned `applicationSession` / singular `runtimeTarget` launch ownership to application-owned runtime orchestration remains in place.

Additional Local Fix updates in this round:

- hardened `ApplicationExecutionEventDispatchService` so post-drain tail safety rechecks use the pending record state to either start immediate work or preserve a future retry timer without canceling backoff
- updated `ApplicationRunObserverService.attachBinding(...)` to await initial `ATTACHED -> RUN_STARTED` processing when requested, and kept `ApplicationOrchestrationHostService.startRun(...)` ordered behind that contract before posting `initialInput`
- extracted run-launch responsibilities out of `ApplicationOrchestrationHostService` into `ApplicationRunBindingLaunchService` so the host boundary stays focused on startup-gated query/control behavior
- split Brief Studio UI runtime/bootstrap/action logic from rendering into browser ESM modules (`brief-studio-runtime.js`, `brief-studio-renderer.js`) and kept the entrypoint `app.js` thin
- added focused orchestration regression coverage for the dispatch-tail race, future retry/backoff preservation, and the `RUN_STARTED` ordering guarantee
- regenerated Brief Studio runnable/importable package UI artifacts after the UI split

## Key Files Or Areas

- `autobyteus-server-ts/src/application-orchestration/services/application-execution-event-dispatch-service.ts`
- `autobyteus-server-ts/src/application-orchestration/services/application-run-observer-service.ts`
- `autobyteus-server-ts/src/application-orchestration/services/application-orchestration-host-service.ts`
- `autobyteus-server-ts/src/application-orchestration/services/application-run-binding-launch-service.ts`
- `autobyteus-server-ts/tests/unit/application-orchestration/application-execution-event-dispatch-service.test.ts`
- `autobyteus-server-ts/tests/unit/application-orchestration/application-orchestration-host-service.test.ts`
- `applications/brief-studio/ui/app.js`
- `applications/brief-studio/ui/brief-studio-runtime.js`
- `applications/brief-studio/ui/brief-studio-renderer.js`
- `applications/brief-studio/dist/importable-package/applications/brief-studio/ui/**`

## Important Assumptions

- This change intentionally keeps no compatibility wrapper for the removed `applicationSession` / `runtimeTarget` model.
- The explicit `ApplicationOrchestrationStartupGate` contract remains the governing owner for startup-sensitive live runtime-control and artifact-ingress traffic.
- Brief Studio’s teaching purpose is to show app-owned run creation from inside the app backend; it does not attempt to preserve the old host-owned launch modal / execution workspace model.

## Known Risks

- API/E2E validation is still required for restart recovery, live artifact ingress gating, and end-to-end runtime-control behavior across real runs.
- The web doc path `autobyteus-web/docs/application-bundle-iframe-contract-v1.md` was updated in place to describe the current v2 contract; the filename is now historical only.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead/obsolete code, obsolete files, unused helpers/tests/flags/adapters, and dormant replaced paths removed in scope: `Yes`
- Shared structures remain tight (no one-for-all base or overlapping parallel shapes introduced): `Yes`
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: `Yes`
- Changed source implementation files stayed within proactive size-pressure guardrails (`>500` avoided; `>220` assessed/acted on): `Yes`
- Notes:
  - `application-orchestration-host-service.ts` now sits at `235` effective non-empty lines after the launch split.
  - Brief Studio UI is now split across `app.js` (`7`), `brief-studio-runtime.js` (`354`), and `brief-studio-renderer.js` (`246`).

## Environment Or Dependency Notes

- No new third-party dependencies were introduced in this implementation slice.
- Brief Studio package output was regenerated after the UI module split so the runnable root and importable package stay aligned.

## Local Implementation Checks Run

### Latest rerun after the round-2 implementation-review Local Fix finding

- `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/autobyteus-server-ts build` ✅
- `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit` ✅
- `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/autobyteus-server-ts exec vitest run tests/unit/application-orchestration/application-execution-event-dispatch-service.test.ts tests/unit/application-orchestration/application-orchestration-host-service.test.ts` ✅
- `node --check /Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/applications/brief-studio/ui/app.js` ✅
- `node --check /Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/applications/brief-studio/ui/brief-studio-runtime.js` ✅
- `node --check /Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/applications/brief-studio/ui/brief-studio-renderer.js` ✅
- `pnpm --dir /Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/applications/brief-studio build` ✅

### Prior rerun after the round-1 Local Fix findings

- `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/autobyteus-server-ts build` ✅
- `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit` ✅
- `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/autobyteus-server-ts exec vitest run tests/unit/application-orchestration/application-execution-event-dispatch-service.test.ts tests/unit/application-orchestration/application-orchestration-host-service.test.ts` ✅
- `node --check /Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/applications/brief-studio/ui/app.js` ✅
- `node --check /Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/applications/brief-studio/ui/brief-studio-runtime.js` ✅
- `node --check /Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/applications/brief-studio/ui/brief-studio-renderer.js` ✅
- `pnpm --dir /Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/applications/brief-studio build` ✅

### Previously completed on the wider implementation slice and still relevant context

- `pnpm -C autobyteus-application-sdk-contracts build` ✅
- `pnpm -C autobyteus-application-backend-sdk build` ✅
- `pnpm -C autobyteus-application-frontend-sdk build` ✅
- `pnpm --dir applications/brief-studio typecheck:backend` ✅
- extracted inline script from `applications/socratic-math-teacher/ui/index.html` and ran `node --check` on it ✅
- `BACKEND_GRAPHQL_BASE_URL=<local generated SDL> pnpm -C autobyteus-web codegen` ✅
- `pnpm -C autobyteus-web exec vitest run stores/__tests__/applicationStore.spec.ts utils/application/__tests__/applicationAssetUrl.spec.ts` ✅
- `pnpm -C autobyteus-web build` ✅
- `rg -n "applicationSessionId|runtimeTarget|sessionStream|ApplicationSession|applicationSession|applicationSessionStore|applicationSessionTransport|ApplicationExecutionWorkspace" autobyteus-web/docs autobyteus-web/components autobyteus-web/stores autobyteus-web/utils autobyteus-web/types autobyteus-web/generated applications/brief-studio applications/socratic-math-teacher` ✅ (no remaining hits)

Record only implementation-scoped checks here, such as build, typecheck, unit tests, and narrow integration checks around the changed code.
Do not stand up API/E2E validation environments or treat that work as part of this section.
Do not report API, E2E, or broader executable validation as passed in this artifact.

## Downstream Validation Hints / Suggested Scenarios

- Launch `Applications -> Brief Studio`, verify the host only performs backend ensure-ready + iframe launch, then create a brief inside the app and verify a bundled team run is started from `createBrief`.
- Verify Brief Studio projects `RUN_STARTED`, `ARTIFACT`, `RUN_TERMINATED` / failure events into app-owned tables keyed by `executionRef = briefId`.
- Restart the server with live/nonterminal bound runs and verify startup recovery rebuilds bindings, reattaches observers, and only then admits live runtime-control / artifact-ingress traffic.
- Import the rebuilt Brief Studio package from `applications/brief-studio/dist/importable-package` and verify the packaged app matches the repo-local runnable root.
- Open Socratic Math Teacher and verify the v2 iframe bootstrap succeeds without any session/runtime bootstrap payload.
- Specifically exercise the timing-sensitive cases covered by the new unit tests: append an execution event during drain shutdown, verify a failed dispatch with future `nextAttemptAfter` honors backoff instead of hot-looping, and start a run with `initialInput` that immediately tries to publish an artifact.

## API / E2E / Executable Validation Still Required

- real runtime-control end-to-end validation for app-owned `startRun(...)` flows on agent-team resources
- restart/recovery validation for `ApplicationOrchestrationStartupGate`, recovered bindings, and orphan/failure handling
- live artifact-ingress gating validation while startup recovery is still in progress
- application backend notification streaming validation under real launches
- UI/E2E validation of the new Applications launch flow, Brief Studio create/review workflow, and packaged import path
