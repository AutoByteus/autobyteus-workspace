# API, E2E, And Executable Validation Report

## Validation Round Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/tickets/in-progress/application-owned-runtime-orchestration/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/tickets/in-progress/application-owned-runtime-orchestration/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/tickets/in-progress/application-owned-runtime-orchestration/design-spec.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/tickets/in-progress/application-owned-runtime-orchestration/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/tickets/in-progress/application-owned-runtime-orchestration/implementation-handoff.md`
- Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/tickets/in-progress/application-owned-runtime-orchestration/review-report.md`
- Current Validation Round: `1`
- Trigger: `Implementation review passed on 2026-04-19 and moved to API/E2E for runtime launch, recovery/gating, artifact-ingress, and iframe-contract validation.`
- Prior Round Reviewed: `N/A`
- Latest Authoritative Round: `1`

Round rules:
- Reuse the same scenario IDs across reruns for the same scenarios.
- Create new scenario IDs only for newly discovered coverage.

## Round History

| Round | Trigger | Prior Unresolved Failures Rechecked | New Failures Found | Result | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Implementation review passed and requested API/E2E validation | N/A | 0 | Pass | Yes | Added boundary-local durable validation for imported-package launch, live execution ingress, recovery/reattachment, startup-gated artifact ingress, and iframe v2 host contract behavior. |

## Validation Basis

- Requirements focus areas exercised: `R-001` through `R-005`, `R-010`, `R-014`, `R-021` through `R-026`.
- Design focus areas exercised: `DS-001`, `DS-002`, `DS-003`, `DS-004`, `DS-007`.
- Implementation handoff signals rechecked in validation: no compatibility wrapper, startup-gated runtime control/artifact ingress, imported-package parity, Brief Studio app-owned `executionRef`, and restart recovery/observer reattachment responsibilities.
- Reviewer residual-risk list used as the explicit validation target set.

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Durable validation added or retained only for compatibility-only behavior: `No`
- If compatibility-related invalid scope was observed, reroute classification used: `N/A`
- Upstream recipient notified: `N/A`

## Validation Surfaces / Modes

- Server integration validation with real Fastify REST + websocket routes, real application worker launch, real app storage, real event journal/dispatch, and emulated team-run execution resources.
- Server unit validation for restart recovery / lookup rebuild / orphan classification.
- Server unit validation for startup-gated live `publish_artifact` ingress.
- Web component validation for iframe ready/bootstrap v2 contract and host-side launch ownership.
- Package build validation for Brief Studio runnable/importable parity regeneration.

## Platform / Runtime Targets

- Node.js local runtime on macOS host.
- `autobyteus-server-ts` worker-launched application backend.
- `applications/brief-studio/dist/importable-package` imported package root.
- `autobyteus-web` happy-dom component runtime for iframe host/launch-owner behavior.

## Lifecycle / Upgrade / Restart / Migration Checks

- Recovery owner reattached persisted nonterminal bindings and rebuilt global lookups in durable validation.
- Recovery owner marked unavailable bindings `ORPHANED` and appended the corresponding lifecycle event in durable validation.
- Startup gate blocked live `publish_artifact` ingress until recovery release in durable validation.
- Imported-package integration exercised live `RUN_STARTED`, artifact projection, and `RUN_TERMINATED` delivery against a real application worker.
- Brief Studio package rebuild reran successfully after validation updates.

## Coverage Matrix

| Scenario ID | Requirement / Design Anchor | Boundary | Method | Result | Notes |
| --- | --- | --- | --- | --- | --- |
| `AOR-E2E-001` | `R-001`, `R-021`, `DS-001` | Imported package discovery + host launch readiness | Server integration (`brief-studio-imported-package.integration.test.ts`) | Pass | Imported Brief Studio was discovered from `dist/importable-package`; backend status started as `stopped`; first query booted the worker without any session-owned launch payload. |
| `AOR-E2E-002` | `R-002`, `R-003`, `R-004`, `DS-002` | App-owned `createBrief` -> `runtimeControl.startRun(...)` | Server integration | Pass | Real app worker command created a brief, started a bound run via app-owned orchestration, and published `brief.created`. |
| `AOR-E2E-003` | `R-010`, `R-011`, `R-025`, `DS-003` | Live artifact ingress -> journal -> dispatch -> app projection | Server integration | Pass | Researcher/writer artifact publications entered through `ApplicationExecutionEventIngressService`, dispatched to Brief Studio event handlers, projected into app-owned tables, and emitted `brief.ready_for_review`. |
| `AOR-E2E-004` | `R-025`, `DS-004` | Bound run lifecycle delivery | Server integration | Pass | Emulated team lifecycle termination reached the real worker through the dispatch path and updated projected binding state to `TERMINATED`. |
| `AOR-E2E-005` | `R-014`, `DS-007` | Restart recovery / lookup rebuild / reattachment | Server unit (`application-orchestration-recovery-service.test.ts`) | Pass | Recovery rebuilt global `runId -> bindingId` lookups, reattached observers when available, and orphaned bindings when reattachment was unavailable. |
| `AOR-E2E-006` | `R-014`, `DS-007` | Startup-gated live artifact ingress | Server unit (`publish-artifact-tool.test.ts`) | Pass | `publish_artifact` remained blocked until `ApplicationOrchestrationStartupGate.runStartupRecovery(...)` released readiness. |
| `AOR-E2E-007` | `R-023`, `R-024`, `DS-001` | Iframe ready/bootstrap v2 contract | Web component (`ApplicationIframeHost.spec.ts`) | Pass | Host accepted only matching ready signals and posted the v2 bootstrap envelope with launch/request-context + backend transport URLs. |
| `AOR-E2E-008` | `R-023`, `R-024`, `DS-001` | Host-side launch ownership | Web component (`ApplicationSurface.spec.ts`) | Pass | ApplicationSurface owned the ready/bootstrap handshake, emitted only v2 payloads, and ignored stale ready signals. |

## Test Scope

- In scope:
  - imported-package Brief Studio launch and backend availability
  - app-owned run creation from inside the real Brief Studio backend worker
  - live artifact ingress into the real journal/dispatch/projection spine
  - lifecycle termination delivery through the same spine
  - recovery lookup rebuild / observer reattachment classification
  - startup gating for live artifact ingress
  - iframe v2 ready/bootstrap contract and host launch ownership
- Explicitly not broadened:
  - provider-backed real LLM/team execution backend behavior
  - full rendered Nuxt page + live Fastify server browser automation beyond the host-side component contract
  - unrelated legacy `application-sessions` historical test assets outside the changed boundary

## Validation Setup / Environment

- Temporary per-run app data roots under `/var/folders/.../autobyteus-brief-studio-*` and `/var/folders/.../autobyteus-aor-recovery-*`.
- Imported package source root: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/applications/brief-studio/dist/importable-package`.
- Real Fastify REST/websocket registration used the production route modules:
  - `src/api/rest/application-backends.ts`
  - `src/api/websocket/application-backend-notifications.ts`
- Real application worker launch used `ApplicationEngineHostService`.
- Execution-resource layer was intentionally emulated with a fake team runtime to isolate orchestration/app-boundary behavior from provider/runtime backends.

## Tests Implemented Or Updated

- Updated: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/autobyteus-server-ts/tests/integration/application-backend/brief-studio-imported-package.integration.test.ts`
- Added: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/autobyteus-server-ts/tests/unit/application-orchestration/application-orchestration-recovery-service.test.ts`
- Added: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/autobyteus-server-ts/tests/unit/application-orchestration/publish-artifact-tool.test.ts`
- Updated / restored for v2 contract: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/autobyteus-web/components/applications/__tests__/ApplicationIframeHost.spec.ts`
- Updated / restored for v2 contract: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/autobyteus-web/components/applications/__tests__/ApplicationSurface.spec.ts`

## Durable Validation Added To The Codebase

- Repository-resident durable validation added or updated this round: `Yes`
- Paths added or updated:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/autobyteus-server-ts/tests/integration/application-backend/brief-studio-imported-package.integration.test.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/autobyteus-server-ts/tests/unit/application-orchestration/application-orchestration-recovery-service.test.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/autobyteus-server-ts/tests/unit/application-orchestration/publish-artifact-tool.test.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/autobyteus-web/components/applications/__tests__/ApplicationIframeHost.spec.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/autobyteus-web/components/applications/__tests__/ApplicationSurface.spec.ts`
- If `Yes`, returned through `code_reviewer` before delivery: `Yes`
- Post-validation code review artifact: `Pending follow-up review by code_reviewer after this validation handoff.`

## Other Validation Artifacts

- Brief Studio package output regenerated at `/Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/applications/brief-studio/dist/importable-package` during validation.

## Temporary Validation Methods / Scaffolding

- None retained. Validation stayed inside durable repo-resident tests plus normal package build execution.

## Dependencies Mocked Or Emulated

- Emulated team runtime creation / lifecycle observation inside the imported-package integration test to keep the proof local to application-owned orchestration and backend projection boundaries.
- Real backend worker, real REST/websocket routes, real app storage, and real execution-event journal/dispatch path remained in use.

## Prior Failure Resolution Check (Mandatory On Round >1)

| Prior Round | Scenario / Failure Reference | Previous Classification | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| N/A | N/A | N/A | N/A | N/A | First validation round. |

## Scenarios Checked

- `AOR-E2E-001` through `AOR-E2E-008` in the coverage matrix above.

## Passed

- Imported-package Brief Studio discovery and worker-backed backend availability.
- App-owned `createBrief` orchestration and durable binding creation from inside the real worker.
- Live artifact ingress routing back to the correct `executionRef` with projected app-owned state updates.
- Lifecycle termination delivery through the execution-event dispatch spine.
- Recovery lookup rebuild / observer reattachment / orphan classification.
- Startup-gated live artifact ingress.
- Iframe host v2 ready/bootstrap contract behavior.
- ApplicationSurface launch-owner handshake behavior.
- Brief Studio package rebuild after validation changes.

## Failed

- None.

## Not Tested / Out Of Scope

- Full browser automation of the running Nuxt Applications page against a live server process.
- Provider-backed real agent/team execution runtime behavior behind the fake team-run layer used in the orchestration integration test.
- Raw `startConfiguredServer()` process restart with actual socket bind/listen timing; equivalent startup-gate/recovery owner behavior was validated at the service/tool boundary instead.

## Blocked

- None.

## Cleanup Performed

- Temporary app-data roots removed after each validation run.
- No temporary scripts or ad hoc probes were retained in the repo.

## Classification

- No blocking issue found in this validation round; reroute classification not applicable.

## Recommended Recipient

- `code_reviewer`

## Evidence / Notes

Executed successfully:

- `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit`
- `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/autobyteus-server-ts exec vitest run tests/integration/application-backend/brief-studio-imported-package.integration.test.ts tests/unit/application-orchestration/application-orchestration-recovery-service.test.ts tests/unit/application-orchestration/publish-artifact-tool.test.ts tests/unit/application-orchestration/application-orchestration-host-service.test.ts`
- `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/autobyteus-web exec vitest run components/applications/__tests__/ApplicationIframeHost.spec.ts components/applications/__tests__/ApplicationSurface.spec.ts`
- `pnpm --dir /Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/applications/brief-studio build`

Key observed outcomes:

- Imported Brief Studio worker booted on demand with no session-owned bootstrap identity.
- `createBrief` produced a real app-owned `briefId`, durable binding, run id, and websocket notification.
- Researcher/writer artifact ingress updated app-owned brief tables and review-readiness notification state.
- Lifecycle termination updated the bound projection state to `TERMINATED` without regressing brief review state.
- Recovery rebuilt lookups and handled unavailable reattachment via `RUN_ORPHANED`.
- `publish_artifact` stayed blocked until startup recovery released readiness.
- Host-side iframe tests confirmed the v2 envelope contains launch/request-context/transport data only and rejects stale ready signals.

## Latest Authoritative Result

- Result values: `Pass` / `Fail` / `Blocked`
- Result: `Pass`
- Notes: `Residual API/E2E risks called out by review were covered with durable validation and targeted executable runs. Because repository-resident validation changed after implementation review, the package should return to code_reviewer for validation-code re-review before delivery resumes.`
