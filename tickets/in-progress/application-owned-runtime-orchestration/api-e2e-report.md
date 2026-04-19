# API, E2E, And Executable Validation Report

## Validation Round Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/tickets/in-progress/application-owned-runtime-orchestration/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/tickets/in-progress/application-owned-runtime-orchestration/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/tickets/in-progress/application-owned-runtime-orchestration/design-spec.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/tickets/in-progress/application-owned-runtime-orchestration/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/tickets/in-progress/application-owned-runtime-orchestration/implementation-handoff.md`
- Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/tickets/in-progress/application-owned-runtime-orchestration/review-report.md`
- Current Validation Round: `2`
- Trigger: `Review round 6 passed on 2026-04-19 after AOR-LF-005 and AOR-LF-006 were fixed; API/E2E reran the cumulative package and rechecked the repaired backend-mount transport plus app-owned GraphQL contract paths alongside the earlier runtime/recovery/iframe scenarios.`
- Prior Round Reviewed: `1`
- Latest Authoritative Round: `2`

Round rules:
- Reuse the same scenario IDs across reruns for the same scenarios.
- Create new scenario IDs only for newly discovered coverage.

## Round History

| Round | Trigger | Prior Unresolved Failures Rechecked | New Failures Found | Result | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Implementation review passed and requested API/E2E validation | N/A | 0 | Pass | No | Added boundary-local durable validation for imported-package launch, live execution ingress, recovery/reattachment, startup-gated artifact ingress, and iframe v2 host contract behavior. |
| 2 | Review round 6 passed after AOR-LF-005 and AOR-LF-006 Local Fixes | 0 | 0 | Pass | Yes | Re-executed the prior runtime/recovery/iframe scenario set, added repaired backendBaseUrl route-transport and app-owned GraphQL contract checks to the coverage matrix, and required no new API/E2E-side repo validation changes. |

## Validation Basis

- Requirements focus areas exercised: `R-001` through `R-005`, `R-010` through `R-014`, `R-021` through `R-025`, `R-031`, `R-032`, `R-037`, `R-038`.
- Design focus areas exercised: `DS-001`, `DS-002`, `DS-003`, `DS-004`, `DS-007`, `DS-008`.
- Implementation handoff signals rechecked in validation: no compatibility wrapper, startup-gated runtime control/artifact ingress, imported-package parity, Brief Studio app-owned `executionRef`, authoritative `backendBaseUrl` transport, and app-owned GraphQL schema/client flow.
- Reviewer residual-risk list used as the explicit validation target set, including the round-6 repaired backend mount transport and app-owned GraphQL contract paths.

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Durable validation added or retained only for compatibility-only behavior: `No`
- If compatibility-related invalid scope was observed, reroute classification used: `N/A`
- Upstream recipient notified: `N/A`

## Validation Surfaces / Modes

- Server integration validation with real Fastify REST + websocket routes, real application worker launch, real app storage, real event journal/dispatch, and emulated team-run execution resources.
- Server integration validation for hosted backend-mount route transport semantics derived from `backendBaseUrl`.
- Server unit validation for restart recovery / lookup rebuild / orphan classification.
- Server unit validation for startup-gated live `publish_artifact` ingress.
- Server unit validation for app-owned GraphQL single-operation executor fallback across the teaching applications.
- Web component validation for iframe ready/bootstrap v2 contract and host-side launch ownership.
- Package build validation for `autobyteus-application-frontend-sdk` and Brief Studio runnable/importable parity regeneration.

## Platform / Runtime Targets

- Node.js local runtime on macOS host.
- `autobyteus-server-ts` worker-launched application backend.
- `applications/brief-studio/dist/importable-package` imported package root.
- `autobyteus-web` happy-dom component runtime for iframe host/launch-owner behavior.
- `autobyteus-application-frontend-sdk` TypeScript build output for the shared backend-mount transport helper.

## Lifecycle / Upgrade / Restart / Migration Checks

- Recovery owner reattached persisted nonterminal bindings and rebuilt global lookups in durable validation.
- Recovery owner marked unavailable bindings `ORPHANED` and appended the corresponding lifecycle event in durable validation.
- Startup gate blocked live `publish_artifact` ingress until recovery release in durable validation.
- Imported-package integration exercised live `RUN_STARTED`, artifact projection, and `RUN_TERMINATED` delivery against a real application worker.
- Hosted backend-mount route transport preserved application-owned JSON vs non-JSON request semantics under the shared `backendBaseUrl` descriptor.
- App-owned GraphQL executors for Brief Studio and Socratic Math Teacher accepted omitted-`operationName` single-operation requests.
- `autobyteus-application-frontend-sdk` and Brief Studio package rebuilds reran successfully against the cumulative package.

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
| `AOR-E2E-008` | `R-023`, `R-024`, `DS-001` | Host-side launch ownership | Web component (`ApplicationSurface.spec.ts`) | Pass | `ApplicationSurface` owned the ready/bootstrap handshake, emitted only v2 payloads, and ignored stale ready signals. |
| `AOR-E2E-009` | `R-012`, `R-032`, `R-037`, `DS-008` | Hosted backend-mount route transport semantics | Server integration (`application-backend-mount-route-transport.integration.test.ts`) | Pass | The shared transport derived route URLs from `backendBaseUrl` and preserved application-owned JSON vs `text/plain` body semantics under the hosted route mount. |
| `AOR-E2E-010` | `R-012`, `R-031`, `R-038`, `DS-008` | App-owned GraphQL single-operation dispatch contract | Server unit (`app-owned-graphql-executors.test.ts`) | Pass | Brief Studio and Socratic Math Teacher accepted omitted-`operationName` single-operation requests, matching the intended app-owned generated-client traffic shape. |

## Test Scope

- In scope:
  - imported-package Brief Studio launch and backend availability
  - app-owned run creation from inside the real Brief Studio backend worker
  - live artifact ingress into the real journal/dispatch/projection spine
  - lifecycle termination delivery through the same spine
  - recovery lookup rebuild / observer reattachment classification
  - startup gating for live artifact ingress
  - iframe v2 ready/bootstrap contract and host launch ownership
  - hosted backend-mount route invocation semantics from the shared `backendBaseUrl` descriptor
  - app-owned GraphQL single-operation request handling for the upgraded teaching apps
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
- Backend-mount route validation used the production `createApplicationBackendMountTransport(...)` helper against the hosted application backend mount.
- Execution-resource layer was intentionally emulated with a fake team runtime to isolate orchestration/app-boundary behavior from provider/runtime backends.

## Tests Implemented Or Updated

- No additional repository-resident tests were implemented or updated in validation round 2.
- Prior API/E2E-owned durable validation re-executed unchanged this round:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/autobyteus-server-ts/tests/integration/application-backend/brief-studio-imported-package.integration.test.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/autobyteus-server-ts/tests/unit/application-orchestration/application-orchestration-recovery-service.test.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/autobyteus-server-ts/tests/unit/application-orchestration/publish-artifact-tool.test.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/autobyteus-web/components/applications/__tests__/ApplicationIframeHost.spec.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/autobyteus-web/components/applications/__tests__/ApplicationSurface.spec.ts`
- Implementation-owned regression coverage executed as received in this round:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/autobyteus-server-ts/tests/integration/application-backend/application-backend-mount-route-transport.integration.test.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/autobyteus-server-ts/tests/unit/application-backend/app-owned-graphql-executors.test.ts`

## Durable Validation Added To The Codebase

- Repository-resident durable validation added or updated this round: `No`
- Prior API/E2E-added durable validation re-executed unchanged this round:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/autobyteus-server-ts/tests/integration/application-backend/brief-studio-imported-package.integration.test.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/autobyteus-server-ts/tests/unit/application-orchestration/application-orchestration-recovery-service.test.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/autobyteus-server-ts/tests/unit/application-orchestration/publish-artifact-tool.test.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/autobyteus-web/components/applications/__tests__/ApplicationIframeHost.spec.ts`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/autobyteus-web/components/applications/__tests__/ApplicationSurface.spec.ts`
- If `Yes`, returned through `code_reviewer` before delivery: `N/A`
- Post-validation code review artifact: `Not required in round 2 because API/E2E did not modify repository-resident validation.`

## Other Validation Artifacts

- Brief Studio package output regenerated at `/Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/applications/brief-studio/dist/importable-package` during validation.
- `autobyteus-application-frontend-sdk` build completed successfully at `/Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/autobyteus-application-frontend-sdk/dist` during validation.

## Temporary Validation Methods / Scaffolding

- None retained. Validation stayed inside existing durable repo-resident tests plus normal package/build execution.

## Dependencies Mocked Or Emulated

- Emulated team runtime creation / lifecycle observation inside the imported-package integration test to keep the proof local to application-owned orchestration and backend projection boundaries.
- Real backend worker, real REST/websocket routes, real app storage, real execution-event journal/dispatch path, and real backend-mount transport helper remained in use.

## Prior Failure Resolution Check (Mandatory On Round >1)

| Prior Round | Scenario / Failure Reference | Previous Classification | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | `No unresolved failures from round 1` | `Pass` | Maintained | `AOR-E2E-001` through `AOR-E2E-008` were re-executed by rerunning `brief-studio-imported-package.integration.test.ts`, `application-orchestration-recovery-service.test.ts`, `publish-artifact-tool.test.ts`, `ApplicationIframeHost.spec.ts`, and `ApplicationSurface.spec.ts` in round 2. | Round 1 had no open validation failures; the full previously passing scenario set was rerun before the new transport/GraphQL checks were included in the round-2 result. |

## Scenarios Checked

- `AOR-E2E-001` through `AOR-E2E-010` in the coverage matrix above.

## Passed

- Imported-package Brief Studio discovery and worker-backed backend availability.
- App-owned `createBrief` orchestration and durable binding creation from inside the real worker.
- Live artifact ingress routing back to the correct `executionRef` with projected app-owned state updates.
- Lifecycle termination delivery through the execution-event dispatch spine.
- Recovery lookup rebuild / observer reattachment / orphan classification.
- Startup-gated live artifact ingress.
- Iframe host v2 ready/bootstrap contract behavior.
- `ApplicationSurface` launch-owner handshake behavior.
- Hosted backend-mount route transport preserved raw non-JSON request bodies and structured JSON request bodies under the shared `backendBaseUrl` contract.
- App-owned GraphQL executors accepted omitted-`operationName` single-operation requests for both teaching apps.
- `autobyteus-application-frontend-sdk` and Brief Studio package builds completed successfully.

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

- `delivery_engineer`

## Evidence / Notes

Executed successfully:

- `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/autobyteus-application-frontend-sdk build`
- `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit`
- `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/autobyteus-server-ts exec vitest run tests/integration/application-backend/application-backend-mount-route-transport.integration.test.ts tests/unit/application-backend/app-owned-graphql-executors.test.ts tests/integration/application-backend/brief-studio-imported-package.integration.test.ts tests/unit/application-orchestration/application-orchestration-recovery-service.test.ts tests/unit/application-orchestration/publish-artifact-tool.test.ts tests/unit/application-orchestration/application-orchestration-host-service.test.ts`
- `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/autobyteus-web exec vitest run components/applications/__tests__/ApplicationIframeHost.spec.ts components/applications/__tests__/ApplicationSurface.spec.ts`
- `pnpm --dir /Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/applications/brief-studio build`

Key observed outcomes:

- Imported Brief Studio worker booted on demand with no session-owned bootstrap identity.
- `createBrief` produced a real app-owned `briefId`, durable binding, run id, and websocket notification.
- Researcher/writer artifact ingress updated app-owned brief tables and review-readiness notification state.
- Lifecycle termination updated the bound projection state to `TERMINATED` without regressing brief review state.
- Recovery rebuilt lookups and handled unavailable reattachment via `RUN_ORPHANED`.
- `publish_artifact` stayed blocked until startup recovery released readiness.
- The shared backend-mount transport preserved `text/plain` string bodies and JSON bodies with the correct hosted route semantics.
- App-owned GraphQL executors for Brief Studio and Socratic Math Teacher honored omitted-`operationName` single-operation requests.
- Host-side iframe tests confirmed the v2 envelope contains launch/request-context/transport data only and rejects stale ready signals.

## Latest Authoritative Result

- Result values: `Pass` / `Fail` / `Blocked`
- Result: `Pass`
- Notes: `The cumulative implementation package passes round-2 API/E2E validation. Prior API/E2E-added durable validation remained stable, no additional repository-resident validation changed in this round, and the repaired backend-mount transport plus app-owned GraphQL contract flows passed alongside the earlier runtime/recovery/iframe scenarios, so the package may proceed directly to delivery.`
