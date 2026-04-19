# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/tickets/in-progress/application-owned-runtime-orchestration/requirements.md`
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/tickets/in-progress/application-owned-runtime-orchestration/investigation-notes.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/tickets/in-progress/application-owned-runtime-orchestration/design-spec.md`
- Current Review Round: `6`
- Trigger: `User requested follow-up architecture review on 2026-04-19 after reworking AOR-DI-005 with pending binding intent plus bindingIntentId reconciliation`
- Prior Review Round Reviewed: `5`
- Latest Authoritative Round: `6`
- Current-State Evidence Basis: `requirements.md`, `investigation-notes.md`, `design-spec.md`, `design-review-report.md`, `autobyteus-server-ts/src/api/rest/application-backends.ts`, `autobyteus-web/types/application/ApplicationIframeContract.ts`

## Round History

| Round | Trigger | Prior Unresolved Findings Rechecked | New Findings Found | Review Decision | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | User requested architecture review on 2026-04-19 | N/A | 3 | Fail | No | Requirements basis was sufficient, but restart recovery, lifecycle observation, and publication-boundary authority were underdesigned. |
| 2 | User requested follow-up review after design rework on 2026-04-19 | 3 | 1 | Fail | No | Round-1 blockers were resolved. One startup-recovery/live-traffic serialization gap remained. |
| 3 | User requested follow-up review after startup-coordination rework on 2026-04-19 | 1 | 0 | Pass | No | The explicit startup gate, gated live paths, and fatal failure contract resolved the remaining blocker from round 2. |
| 4 | User requested follow-up review after deepening the authoritative app-API design on 2026-04-19 | 0 | 0 | Pass | No | The hosted backend-mount/base-url boundary, app-vs-platform schema ownership split, and sample-app teaching direction became concrete enough for implementation. |
| 5 | User requested follow-up review after switching to binding-centric cross-boundary correlation on 2026-04-19 | 0 | 1 | Fail | No | The ownership intent was cleaner, but the direct `startRun(...)` correlation-establishment contract was still underdesigned. |
| 6 | User requested follow-up review after adding pending-intent plus `bindingIntentId` reconciliation on 2026-04-19 | 1 | 0 | Pass | Yes | The direct-start handoff is now explicit, restart-safe, and coherent with binding-centric correlation. |

## Reviewed Design Spec

The revised package is now implementation-ready again. The requirements basis remains sufficiently complete and now explicitly covers the direct-start handoff through `UC-020`, `R-040`, `R-041`, `R-042`, `R-043`, `AC-024`, `AC-025`, and `AC-026`.

The `AOR-DI-005` rework resolves the prior blocker because the design now names one concrete cross-boundary contract for direct `startRun(...)` flows:
- the application persists one app-owned pending binding intent before the direct start,
- `bindingIntentId` is an opaque app-supplied token, not a platform-owned business-reference field,
- `runtimeControl.startRun(...)` requires and echoes `bindingIntentId`,
- the platform persists `bindingIntentId` on the authoritative binding row before journaling explicit `runStarted` events,
- event envelopes also echo `bindingIntentId`,
- the platform exposes `getRunBindingByIntentId(...)` as the authoritative reconciliation lookup, and
- the design explicitly chooses retry-safe reconciliation instead of platform-side event deferral.

That gives the design one actionable, restart-safe, race-safe handoff while preserving the intended ownership split: platform owns durable routing/recovery by binding identity; the application owns business-record meaning and final mapping.

No new blocking design gaps were found in this round.

## Prior Findings Resolution Check (Mandatory On Round >1)

| Prior Round | Finding ID | Previous Severity | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | `AOR-DI-001` | High | Resolved | `Architecture Review Rework Coverage`, `DS-007`, `Restart Recovery / Resume Contract`, `Migration / Refactor Sequence` | Recovery has an explicit owner, spine, algorithm, and startup ordering relative to dispatch resume. |
| 1 | `AOR-DI-002` | High | Resolved | `Architecture Review Rework Coverage`, `Lifecycle Observation Contract`, `ApplicationBoundRunLifecycleGateway`, service/manager file mappings | Lifecycle observation is designed as subject-owned service boundaries plus one orchestration-facing adapter. |
| 1 | `AOR-DI-003` | Medium | Resolved | `Architecture Review Rework Coverage`, `Execution Event Ingress Authority`, `Boundary Encapsulation Map`, `Dependency Rules` | Journal append authority is centralized behind `ApplicationExecutionEventIngressService`. |
| 2 | `AOR-DI-004` | High | Resolved | `Architecture Review Rework Coverage`, `DS-007`, `Startup Coordination / Traffic Admission Contract`, `Boundary Encapsulation Map`, `Dependency Rules`, `Migration / Refactor Sequence` | Startup readiness has one explicit owner plus concrete enforcement points for live runtime-control and live artifact ingress. |
| 5 | `AOR-DI-005` | High | Resolved | `Architecture Review Rework Coverage`, `Binding-Centric Correlation Principle`, `Direct startRun(...) Correlation Establishment Contract`, `DS-002`, `Execution Event Ingress Authority`, `Interface Boundary Mapping`, `Example App Implementation Shape`, `Migration / Refactor Sequence`, `Guidance For Implementation` | The direct-start handoff now has one explicit pending-intent plus reconciliation contract with clear crash/race semantics. |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? (`Pass`/`Fail`) | Narrative Is Clear? (`Pass`/`Fail`) | Facade Vs Governing Owner Is Clear? (`Pass`/`Fail`/`N/A`) | Main Domain Subject Naming Is Clear? (`Pass`/`Fail`) | Ownership Is Clear? (`Pass`/`Fail`) | Off-Spine Concerns Stay Off Main Line? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `DS-001` | Engine-first application launch with backend mount descriptor | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| `DS-002` | Pending-intent-backed app-owned run creation and durable binding establishment | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| `DS-003` | Runtime artifact ingress and delivery | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| `DS-004` | Observed lifecycle change -> app backend lifecycle event delivery | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| `DS-005` | Ordered execution-event dispatch loop | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| `DS-006` | Worker `runtimeControl` bridge | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| `DS-007` | Startup recovery and observer reattachment | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| `DS-008` | Hosted business API call over the app-scoped backend mount | Pass | Pass | Pass | Pass | Pass | Pass | Pass |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? (`Pass`/`Fail`) | Reuse / Extend / Create-New Decision Is Sound? (`Pass`/`Fail`) | Supports The Right Spine Owners? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `application-orchestration` | Pass | Pass | Pass | Pass | Recovery, ingress, observer, startup gate, runtime-control, and binding-intent persistence on bindings are allocated coherently. |
| `application-backend-gateway` | Pass | Pass | Pass | Pass | The gateway continues to have a clear transport-hosting role for the virtual backend mount. |
| `application-engine` | Pass | Pass | Pass | Pass | Reuse remains sound as the worker lifecycle owner. |
| `application-sdk-contracts` + frontend/backend SDKs | Pass | Pass | Pass | Pass | Keeping platform SDKs schema-agnostic while exposing transport/runtime infrastructure remains the right split. |
| `applications/<app>/api` + `frontend-src/generated` | Pass | Pass | Pass | Pass | App-local schema artifacts and generated clients remain correctly owned. |
| App-owned pending-intent/correlation services | Pass | Pass | Pass | Pass | The new app-owned correlation owner cleanly carries business-record meaning and reconciliation responsibility without pushing that meaning into the platform. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? (`Pass`/`Fail`) | Shared File Choice Is Sound? (`Pass`/`Fail`/`N/A`) | Ownership Of Shared Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Resource reference model | Pass | Pass | Pass | Pass | Good shared cross-package extraction. |
| Binding summary / event envelope | Pass | Pass | Pass | Pass | The binding-centric shared structures remain semantically tight and now include the opaque reconciliation token cleanly. |
| Shared observed lifecycle event | Pass | Pass | Pass | Pass | Good narrow orchestration-facing internal shape. |
| Iframe bootstrap transport descriptor | Pass | Pass | Pass | Pass | Good shared host/iframe transport shape with one authoritative `backendBaseUrl`. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Pass`/`Fail`) | Redundant Attributes Removed? (`Pass`/`Fail`) | Overlapping Representation Risk Is Controlled? (`Pass`/`Fail`) | Shared Core Vs Specialized Variant / Composition Decision Is Sound? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `ApplicationRuntimeResourceRef` | Pass | Pass | Pass | Pass | Pass | Good domain-neutral selector. |
| `ApplicationRunBindingSummary` | Pass | Pass | Pass | Pass | Pass | Good binding-centric summary shape with opaque `bindingIntentId`. |
| `ApplicationExecutionEventEnvelope` | Pass | Pass | Pass | Pass | Pass | Good immutable event model; echoing `bindingIntentId` now makes early-event reconciliation explicit rather than implicit. |
| `ObservedRunLifecycleEvent` | Pass | Pass | Pass | Pass | Pass | Good narrow orchestration-facing shape. |
| `ApplicationRequestContext` v2 | Pass | Pass | Pass | Pass | Pass | Correctly reduced to request-source identity rather than session/business identity. |
| `ApplicationIframeBootstrapV2.transport.backendBaseUrl` | Pass | Pass | Pass | Pass | Pass | One authoritative backend-mount base URL remains the right transport shape. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? (`Pass`/`Fail`) | Replacement Owner / Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Removal / Decommission Scope Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `application-sessions` subsystem | Pass | Pass | Pass | Pass | Explicit clean-cut replacement remains clear. |
| `runtimeTarget` bundle/catalog requirement | Pass | Pass | Pass | Pass | Explicit manifest removal remains clear. |
| Host launch modal / retained execution workspace / session stream | Pass | Pass | Pass | Pass | Removal remains explicit and structurally coherent. |
| Session-owned iframe/bootstrap/request-context shapes | Pass | Pass | Pass | Pass | The design continues to replace them with backend-mount-centric transport descriptors. |
| Sample-app old teaching flows | Pass | Pass | Pass | Pass | Brief Studio and Socratic Math Teacher are still explicitly upgraded rather than left teaching the old model. |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? (`Pass`/`Fail`) | Responsibility Matches The Intended Owner/Boundary? (`Pass`/`Fail`) | Responsibilities Were Re-Tightened After Shared-Structure Extraction? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/application-orchestration/services/application-execution-event-ingress-service.ts` | Pass | Pass | N/A | Pass | Single authoritative ingress owner is clear and now explicitly copies persisted `bindingIntentId` into envelopes for direct-start bindings. |
| `autobyteus-server-ts/src/application-orchestration/services/application-orchestration-startup-gate.ts` | Pass | Pass | N/A | Pass | Single startup-coordination owner remains clear and does not absorb recovery logic. |
| `autobyteus-server-ts/src/application-orchestration/services/application-orchestration-recovery-service.ts` | Pass | Pass | N/A | Pass | Startup-resume owner remains clear. |
| `autobyteus-server-ts/src/application-orchestration/services/application-orchestration-host-service.ts` | Pass | Pass | N/A | Pass | The service now has a clear authoritative contract for persisting `bindingIntentId` on created bindings before explicit start events are journaled. |
| `autobyteus-server-ts/src/application-backend-gateway/services/application-backend-gateway-service.ts` | Pass | Pass | N/A | Pass | The gateway continues to have a coherent transport-hosting role. |
| `autobyteus-web/types/application/ApplicationIframeContract.ts` | Pass | Pass | N/A | Pass | The v2 contract remains the correct owner for bootstrap transport descriptors such as `backendBaseUrl`. |
| `autobyteus-application-frontend-sdk/src/create-application-backend-mount-transport.ts` | Pass | Pass | N/A | Pass | Generic transport-helper ownership remains clear and schema-agnostic. |
| `applications/<app>/backend-src/services/run-binding-correlation-service.ts` | Pass | Pass | N/A | Pass | Good app-owned correlation owner for pending intent persistence, mapping finalization, and reconciliation. |
| `applications/<app>/backend-src/repositories/pending-binding-intent-repository.ts` | Pass | Pass | N/A | Pass | Good app-owned persistence boundary for pending-intent state. |
| `applications/<app>/api/graphql/schema.graphql` | Pass | Pass | N/A | Pass | Correct app-owned home for business schema artifacts. |
| `applications/<app>/frontend-src/generated/graphql-client.ts` | Pass | Pass | N/A | Pass | Correct app-owned home for generated clients. |
| `autobyteus-server-ts/src/server-runtime.ts` | Pass | Pass | N/A | Pass | The file remains limited to startup-hook integration into the gate. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? (`Pass`/`Fail`) | Forbidden Shortcuts Are Explicit? (`Pass`/`Fail`) | Direction Is Coherent With Ownership? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `ApplicationExecutionEventIngressService` | Pass | Pass | Pass | Pass | Single ingress boundary is coherent. |
| `ApplicationBoundRunLifecycleGateway` | Pass | Pass | Pass | Pass | Clear adapter relationship. |
| `ApplicationOrchestrationRecoveryService` | Pass | Pass | Pass | Pass | Recovery-owner dependencies are coherent. |
| `ApplicationOrchestrationStartupGate` | Pass | Pass | Pass | Pass | The gate remains the authoritative readiness boundary. |
| `ApplicationBackendGatewayService` | Pass | Pass | Pass | Pass | The gateway still owns transport hosting without app-specific business-schema interpretation. |
| Platform SDKs vs app-owned schema/codegen artifacts | Pass | Pass | Pass | Pass | The dependency split still prevents platform packages from becoming a universal business-schema layer. |
| Pending intent -> binding creation -> app-owned mapping finalization -> event reconciliation | Pass | Pass | Pass | Pass | The design now names one authoritative sequencing/reconciliation rule for this cross-boundary handoff. |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? (`Pass`/`Fail`) | Internal Owned Mechanisms Stay Internal? (`Pass`/`Fail`) | Caller Bypass Risk Is Controlled? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `ApplicationExecutionEventIngressService` | Pass | Pass | Pass | Pass | Good authoritative ingress boundary. |
| `ApplicationBoundRunLifecycleGateway` | Pass | Pass | Pass | Pass | Good authoritative lifecycle adapter. |
| `ApplicationOrchestrationRecoveryService` | Pass | Pass | Pass | Pass | Good recovery-owner boundary. |
| `ApplicationOrchestrationStartupGate` | Pass | Pass | Pass | Pass | Startup readiness still has one authoritative boundary with explicit waiting callers and failure semantics. |
| `ApplicationBackendGatewayService` | Pass | Pass | Pass | Pass | The backend mount remains a clear authoritative transport boundary rather than a mixed business-schema owner. |
| App-owned schema/codegen boundary | Pass | Pass | Pass | Pass | Business schema artifacts and generated clients still stay on the application side of the ownership line. |
| `runtimeControl.startRun(...)` -> app-owned binding mapping handoff | Pass | Pass | Pass | Pass | The handoff is now explicit through pending intent, echoed `bindingIntentId`, and authoritative reconciliation lookup. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? (`Pass`/`Fail`) | Responsibility Is Singular? (`Pass`/`Fail`) | Identity Shape Is Explicit? (`Pass`/`Fail`) | Generic Boundary Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- |
| `ApplicationIframeBootstrapV2.transport.backendBaseUrl` | Pass | Pass | Pass | Low | Pass |
| `POST /rest/applications/:applicationId/backend/graphql` | Pass | Pass | Pass | Low | Pass |
| `ANY /rest/applications/:applicationId/backend/routes/*` | Pass | Pass | Pass | Low | Pass |
| `runtimeControl.startRun(input)` | Pass | Pass | Pass | Low | Pass |
| `runtimeControl.getRunBinding(bindingId)` | Pass | Pass | Pass | Low | Pass |
| `runtimeControl.getRunBindingByIntentId(bindingIntentId)` | Pass | Pass | Pass | Low | Pass |
| `runtimeControl.listRunBindings(filter)` | Pass | Pass | Pass | Low | Pass |
| `publish_artifact(...)` | Pass | Pass | Pass | Low | Pass |
| App backend runtime event handlers (`runStarted`, `runTerminated`, `runFailed`, `runOrphaned`, `artifact`) | Pass | Pass | Pass | Low | Pass |
| `AgentRunService.observeAgentRunLifecycle(...)` | Pass | Pass | Pass | Low | Pass |
| `TeamRunService.observeTeamRunLifecycle(...)` | Pass | Pass | Pass | Low | Pass |
| `ApplicationOrchestrationStartupGate.runStartupRecovery(...)` | Pass | Pass | Pass | Low | Pass |
| `ApplicationOrchestrationStartupGate.awaitReady()` | Pass | Pass | Pass | Low | Pass |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? (`Pass`/`Fail`) | Folder Matches Owning Boundary? (`Pass`/`Fail`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/application-orchestration/` | Pass | Pass | Low | Pass | Correct subsystem location for the orchestration ownership model. |
| `autobyteus-server-ts/src/application-backend-gateway/` | Pass | Pass | Low | Pass | Correct home for the virtual backend mount transport owner. |
| `autobyteus-web/types/application/ApplicationIframeContract.ts` | Pass | Pass | Low | Pass | Correct shared browser type home for bootstrap transport descriptors. |
| `autobyteus-application-sdk-contracts/src/` | Pass | Pass | Medium | Pass | Split-by-subject contract layout remains justified, and app business schemas remain out. |
| `applications/<app>/api/` + `frontend-src/generated/` | Pass | Pass | Low | Pass | Correct app-local homes for schema artifacts and generated clients. |
| `applications/<app>/backend-src/services/run-binding-correlation-service.ts` + `repositories/pending-binding-intent-repository.ts` | Pass | Pass | Low | Pass | Correct app-local homes for the correlation-establishment owner and its persistence boundary. |
| `applications/brief-studio/` and `applications/socratic-math-teacher/` | Pass | Pass | Low | Pass | The upgraded example-app ownership story remains concrete and actionable in the current repo layout. |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? (`Pass`/`Fail`) | Reuse / Extension Decision Is Sound? (`Pass`/`Fail`) | New Support Piece Is Justified? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| App backend worker lifecycle | Pass | Pass | N/A | Pass | Reuse of `application-engine` remains sound. |
| Application-scoped backend transport host | Pass | Pass | N/A | Pass | Reusing `application-backend-gateway` and formalizing the hosted mount remains the right move. |
| Agent/team lifecycle observation | Pass | Pass | N/A | Pass | The extension strategy remains sound. |
| Startup recovery / resume | Pass | Pass | Pass | Pass | Explicit recovery owner remains justified. |
| Startup traffic/readiness coordination | Pass | Pass | Pass | Pass | The dedicated startup gate remains justified. |
| App-owned schema/codegen and generated clients | Pass | Pass | Pass | Pass | Keeping these app-local rather than extending platform packages remains the correct ownership decision. |
| Pending-intent-based direct-start correlation establishment | Pass | Pass | Pass | Pass | The design now adds the necessary explicit contract instead of leaving the handoff implicit. |
| Sample app teaching upgrades | Pass | Pass | N/A | Pass | Treating the two in-repo apps as teaching artifacts remains the right reuse/upgrade move. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? (`Yes`/`No`) | Clean-Cut Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- |
| Session-owned launch/orchestration | No | Pass | Pass | Strong clean-cut removal stance remains intact. |
| Manifest/runtimeTarget simple-path retention | No | Pass | Pass | Correctly rejected. |
| Session-bound iframe/request-context retention | No | Pass | Pass | Correctly rejected. |
| Platform-owned universal business schema layer | No | Pass | Pass | Correctly rejected in favor of app-owned schema/codegen. |
| Platform-owned generic business-reference field | No | Pass | Pass | Correctly rejected and now replaced by a concrete pending-intent reconciliation contract rather than an implicit gap. |

## Migration / Refactor Safety Verdict

| Area | Sequence Is Realistic? (`Pass`/`Fail`) | Temporary Seams Are Explicit? (`Pass`/`Fail`) | Cleanup / Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- |
| Contracts -> backend mount -> orchestration core -> sample migration | Pass | Pass | Pass | Pass |
| Recovery owner, lifecycle gateway, ingress owner introduction | Pass | Pass | Pass | Pass |
| Startup integration in `server-runtime.ts` | Pass | Pass | Pass | Pass |
| App-owned API/schema authoring path and SDK boundary split | Pass | Pass | Pass | Pass |
| Teaching-app upgrades | Pass | Pass | Pass | Pass |
| Pending-intent-based startRun -> mapping finalization -> event reconciliation | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? (`Yes`/`No`) | Example Is Present And Clear? (`Pass`/`Fail`/`N/A`) | Bad / Avoided Shape Is Explained When Helpful? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Launch model correction | Yes | Pass | Pass | Pass | Good example section. |
| Hosted virtual backend mount | Yes | Pass | Pass | Pass | Good concrete example for the app-scoped mount boundary. |
| App-owned GraphQL codegen | Yes | Pass | Pass | Pass | Good example showing how schema/codegen ownership stays app-local. |
| Brief Studio target teaching shape | Yes | Pass | Pass | Pass | Good concrete example for “many runs over one business record.” |
| Socratic Math Teacher target teaching shape | Yes | Pass | Pass | Pass | Good concrete example for “one long-lived conversational binding.” |
| Recovery / resume spine | Yes | Pass | Pass | Pass | Good explicit recovery example. |
| Event ingress authority | Yes | Pass | Pass | Pass | Good authoritative-boundary example. |
| Startup traffic/readiness coordination | Yes | Pass | Pass | Pass | The startup gate example remains concrete and sufficient. |
| Pending-intent direct-start correlation establishment | Yes | Pass | Pass | Pass | The design now includes one explicit good/bad shape for the crash/race-safe handoff that replaced the removed generic business-reference field. |

## Missing Use Cases / Open Unknowns

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| Shared-platform resource authorization policy | Still a real product concern, but the requirements/design already mark it out of scope and the current design does not incorrectly absorb it. | Keep out of this implementation unless separately scoped. | Non-blocking |
| Optional packaging story for app-owned schema artifacts | Tooling ergonomics may improve later, but the design correctly keeps that subordinate to app ownership and away from platform business-schema centralization. | Treat as follow-up tooling only if needed. | Non-blocking |
| Generic host-native retained execution UI | Product may later want richer host-native views again, but the current design correctly leaves that outside the governing owner model. | Keep as product follow-up, not architectural backdoor in this implementation. | Non-blocking |

## Review Decision

- `Pass`: the design is ready for implementation.
- `Fail`: the design needs upstream rework before implementation should proceed.
- `Blocked`: the review cannot finish because required input, evidence, or clarification is missing.

**Decision: `Pass`**

## Findings

None.

## Classification

`None`

## Recommended Recipient

`implementation_engineer`

## Residual Risks

- The worker->host orchestration bridge still needs disciplined implementation so it does not become a generic service locator.
- Execution-owner lifecycle extensions still need to land consistently across agent and team paths.
- Platform SDKs must remain schema-agnostic even while transport helpers become more ergonomic around `backendBaseUrl`.
- The sample-app upgrades remain part of the authoritative design package, so incomplete migration would leave the repo teaching the wrong model.
- The startup gate must still be wired exactly as designed into both public runtime-control entrypoints and live `publish_artifact` ingress.
- The app-owned pending-intent/correlation services must be implemented consistently across example apps so the repo actually teaches the intended direct-start handoff pattern.

## Latest Authoritative Result

- Review Decision: `Pass`
- Notes: `The pending-intent plus bindingIntentId reconciliation contract resolves AOR-DI-005. The design is now implementation-ready again.`
