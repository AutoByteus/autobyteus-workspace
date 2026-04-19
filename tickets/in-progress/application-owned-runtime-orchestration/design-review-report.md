# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/tickets/in-progress/application-owned-runtime-orchestration/requirements.md`
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/tickets/in-progress/application-owned-runtime-orchestration/investigation-notes.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-owned-runtime-orchestration/tickets/in-progress/application-owned-runtime-orchestration/design-spec.md`
- Current Review Round: `4`
- Trigger: `User requested follow-up architecture review on 2026-04-19 after expanding the design package for app-owned backend mount, schema/codegen ownership, and teaching-app upgrades`
- Prior Review Round Reviewed: `3`
- Latest Authoritative Round: `4`
- Current-State Evidence Basis: `requirements.md`, `investigation-notes.md`, `design-spec.md`, `design-review-report.md`, `autobyteus-server-ts/src/api/rest/application-backends.ts`, `autobyteus-web/types/application/ApplicationIframeContract.ts`, repo layout under `applications/brief-studio` and `applications/socratic-math-teacher`

## Round History

| Round | Trigger | Prior Unresolved Findings Rechecked | New Findings Found | Review Decision | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | User requested architecture review on 2026-04-19 | N/A | 3 | Fail | No | Requirements basis was sufficient, but restart recovery, lifecycle observation, and publication-boundary authority were underdesigned. |
| 2 | User requested follow-up review after design rework on 2026-04-19 | 3 | 1 | Fail | No | Round-1 blockers were resolved. One startup-recovery/live-traffic serialization gap remained. |
| 3 | User requested follow-up review after startup-coordination rework on 2026-04-19 | 1 | 0 | Pass | No | The explicit startup gate, gated live paths, and fatal failure contract resolved the remaining blocker from round 2. |
| 4 | User requested follow-up review after deepening the authoritative app-API design on 2026-04-19 | 0 | 0 | Pass | Yes | The hosted backend-mount/base-url boundary, app-vs-platform schema ownership split, and sample-app teaching direction are now concrete enough for implementation. |

## Reviewed Design Spec

The revised design remains implementation-ready after the deeper app-API expansion. The requirements basis is still sufficiently complete and now more explicit through `R-037`, `R-038`, `AC-021`, and `AC-022`.

The newly deepened areas are concrete enough for implementation:
- the design now names one authoritative hosted backend namespace under `applicationId` and one authoritative iframe/bootstrap transport hint, `backendBaseUrl`, for app-owned frontend clients,
- `ApplicationBackendGatewayService` cleanly owns transport hosting/normalization while leaving app business schema and generated-client ownership with each application,
- platform contracts/SDKs stay schema-agnostic while app-local schema artifacts and generated clients stay app-owned, and
- the two in-repo teaching apps now have concrete target shapes that teach distinct app-owned orchestration patterns instead of historical session/bootstrap mechanics.

No new boundary or ownership gaps were found in this review round.

## Prior Findings Resolution Check (Mandatory On Round >1)

| Prior Round | Finding ID | Previous Severity | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | `AOR-DI-001` | High | Resolved | `Architecture Review Rework Coverage`, `DS-007`, `Restart Recovery / Resume Contract`, `Migration / Refactor Sequence` | Recovery has an explicit owner, spine, algorithm, and startup ordering relative to dispatch resume. |
| 1 | `AOR-DI-002` | High | Resolved | `Architecture Review Rework Coverage`, `Lifecycle Observation Contract`, `ApplicationBoundRunLifecycleGateway`, service/manager file mappings | Lifecycle observation is designed as subject-owned service boundaries plus one orchestration-facing adapter. |
| 1 | `AOR-DI-003` | Medium | Resolved | `Architecture Review Rework Coverage`, `Execution Event Ingress Authority`, `Boundary Encapsulation Map`, `Dependency Rules` | Journal append authority is centralized behind `ApplicationExecutionEventIngressService`. |
| 2 | `AOR-DI-004` | High | Resolved | `Architecture Review Rework Coverage`, `DS-007`, `Startup Coordination / Traffic Admission Contract`, `Boundary Encapsulation Map`, `Dependency Rules`, `Migration / Refactor Sequence` | Startup readiness has one explicit owner plus concrete enforcement points for live runtime-control and live artifact ingress. |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? (`Pass`/`Fail`) | Narrative Is Clear? (`Pass`/`Fail`) | Facade Vs Governing Owner Is Clear? (`Pass`/`Fail`/`N/A`) | Main Domain Subject Naming Is Clear? (`Pass`/`Fail`) | Ownership Is Clear? (`Pass`/`Fail`) | Off-Spine Concerns Stay Off Main Line? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `DS-001` | Engine-first application launch with backend mount descriptor | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| `DS-002` | App-owned run creation and durable binding | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| `DS-003` | Runtime artifact ingress and delivery | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| `DS-004` | Observed lifecycle change -> app backend lifecycle event delivery | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| `DS-005` | Ordered execution-event dispatch loop | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| `DS-006` | Worker `runtimeControl` bridge | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| `DS-007` | Startup recovery and observer reattachment | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| `DS-008` | Hosted business API call over the app-scoped backend mount | Pass | Pass | Pass | Pass | Pass | Pass | Pass |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? (`Pass`/`Fail`) | Reuse / Extend / Create-New Decision Is Sound? (`Pass`/`Fail`) | Supports The Right Spine Owners? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `application-orchestration` | Pass | Pass | Pass | Pass | Recovery, ingress, observer, startup gate, and runtime-control ownership remain coherent. |
| `application-backend-gateway` | Pass | Pass | Pass | Pass | The gateway now has a clear transport-hosting role for the virtual backend mount without absorbing app business schema ownership. |
| `application-engine` | Pass | Pass | Pass | Pass | Reuse remains sound as the worker lifecycle owner. |
| `application-sdk-contracts` + frontend/backend SDKs | Pass | Pass | Pass | Pass | Keeping platform SDKs schema-agnostic while exposing transport/runtime infrastructure is the right split. |
| `applications/<app>/api` + `frontend-src/generated` | Pass | Pass | Pass | Pass | App-local schema artifacts and generated clients now have a clear owner and location. |
| Sample app upgrades (`brief-studio`, `socratic-math-teacher`) | Pass | Pass | Pass | Pass | Treating the teaching apps as authoritative examples is now structurally coherent rather than an optional afterthought. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? (`Pass`/`Fail`) | Shared File Choice Is Sound? (`Pass`/`Fail`/`N/A`) | Ownership Of Shared Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Resource reference model | Pass | Pass | Pass | Pass | Good shared cross-package extraction. |
| Binding summary / event envelope | Pass | Pass | Pass | Pass | Good clean-cut replacement of session identity. |
| Shared observed lifecycle event | Pass | Pass | Pass | Pass | Good narrow orchestration-facing internal shape. |
| Iframe bootstrap transport descriptor | Pass | Pass | Pass | Pass | Good shared host/iframe transport shape with one authoritative `backendBaseUrl`. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Pass`/`Fail`) | Redundant Attributes Removed? (`Pass`/`Fail`) | Overlapping Representation Risk Is Controlled? (`Pass`/`Fail`) | Shared Core Vs Specialized Variant / Composition Decision Is Sound? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `ApplicationRuntimeResourceRef` | Pass | Pass | Pass | Pass | Pass | Good domain-neutral selector. |
| `ApplicationRunBindingSummary` | Pass | Pass | Pass | Pass | Pass | Good business/runtime split. |
| `ApplicationExecutionEventEnvelope` | Pass | Pass | Pass | Pass | Pass | Good immutable event model. |
| `ObservedRunLifecycleEvent` | Pass | Pass | Pass | Pass | Pass | Good narrow orchestration-facing shape. |
| `ApplicationRequestContext` v2 | Pass | Pass | Pass | Pass | Pass | Correctly reduced to request-source identity rather than session/business identity. |
| `ApplicationIframeBootstrapV2.transport.backendBaseUrl` | Pass | Pass | Pass | Pass | Pass | One authoritative backend-mount base URL is the right non-duplicated transport shape. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? (`Pass`/`Fail`) | Replacement Owner / Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Removal / Decommission Scope Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `application-sessions` subsystem | Pass | Pass | Pass | Pass | Explicit clean-cut replacement remains clear. |
| `runtimeTarget` bundle/catalog requirement | Pass | Pass | Pass | Pass | Explicit manifest removal remains clear. |
| Host launch modal / retained execution workspace / session stream | Pass | Pass | Pass | Pass | Removal remains explicit and structurally coherent. |
| Session-owned iframe/bootstrap/request-context shapes | Pass | Pass | Pass | Pass | The design now explicitly replaces them with backend-mount-centric transport descriptors. |
| Sample-app old teaching flows | Pass | Pass | Pass | Pass | Brief Studio and Socratic Math Teacher are explicitly upgraded rather than left teaching the old model. |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? (`Pass`/`Fail`) | Responsibility Matches The Intended Owner/Boundary? (`Pass`/`Fail`) | Responsibilities Were Re-Tightened After Shared-Structure Extraction? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/application-orchestration/services/application-execution-event-ingress-service.ts` | Pass | Pass | N/A | Pass | Single authoritative ingress owner is clear. |
| `autobyteus-server-ts/src/application-orchestration/services/application-orchestration-startup-gate.ts` | Pass | Pass | N/A | Pass | Single startup-coordination owner is clear and does not absorb recovery logic. |
| `autobyteus-server-ts/src/application-orchestration/services/application-orchestration-recovery-service.ts` | Pass | Pass | N/A | Pass | Startup-resume owner is clear. |
| `autobyteus-server-ts/src/application-backend-gateway/services/application-backend-gateway-service.ts` | Pass | Pass | N/A | Pass | The gateway has a coherent transport-hosting role for GraphQL/routes/query/command entry without owning app business schema meaning. |
| `autobyteus-web/types/application/ApplicationIframeContract.ts` | Pass | Pass | N/A | Pass | The v2 contract is the correct owner for bootstrap transport descriptors such as `backendBaseUrl`. |
| `autobyteus-application-frontend-sdk/src/create-application-backend-mount-transport.ts` | Pass | Pass | N/A | Pass | Generic transport helper ownership is clear and stays intentionally schema-agnostic. |
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
| `ApplicationBackendGatewayService` | Pass | Pass | Pass | Pass | The gateway owns transport hosting without depending on app-specific business schema interpretation or orchestration stores. |
| Platform SDKs vs app-owned schema/codegen artifacts | Pass | Pass | Pass | Pass | The dependency split clearly prevents platform packages from becoming a universal business-schema layer. |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? (`Pass`/`Fail`) | Internal Owned Mechanisms Stay Internal? (`Pass`/`Fail`) | Caller Bypass Risk Is Controlled? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `ApplicationExecutionEventIngressService` | Pass | Pass | Pass | Pass | Good authoritative ingress boundary. |
| `ApplicationBoundRunLifecycleGateway` | Pass | Pass | Pass | Pass | Good authoritative lifecycle adapter. |
| `ApplicationOrchestrationRecoveryService` | Pass | Pass | Pass | Pass | Good recovery-owner boundary. |
| `ApplicationOrchestrationStartupGate` | Pass | Pass | Pass | Pass | Startup readiness still has one authoritative boundary with explicit waiting callers and failure semantics. |
| `ApplicationBackendGatewayService` | Pass | Pass | Pass | Pass | The backend mount is a clear authoritative transport boundary rather than a mixed business-schema owner. |
| App-owned schema/codegen boundary | Pass | Pass | Pass | Pass | Business schema artifacts and generated clients stay on the application side of the ownership line. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? (`Pass`/`Fail`) | Responsibility Is Singular? (`Pass`/`Fail`) | Identity Shape Is Explicit? (`Pass`/`Fail`) | Generic Boundary Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- |
| `ApplicationIframeBootstrapV2.transport.backendBaseUrl` | Pass | Pass | Pass | Low | Pass |
| `POST /rest/applications/:applicationId/backend/graphql` | Pass | Pass | Pass | Low | Pass |
| `ANY /rest/applications/:applicationId/backend/routes/*` | Pass | Pass | Pass | Low | Pass |
| `runtimeControl.startRun(input)` | Pass | Pass | Pass | Low | Pass |
| `publish_artifact(...)` | Pass | Pass | Pass | Low | Pass |
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
| `autobyteus-application-sdk-contracts/src/` | Pass | Pass | Medium | Pass | Split-by-subject contract layout is now clearly justified, and app business schemas are kept out. |
| `applications/<app>/api/` + `frontend-src/generated/` | Pass | Pass | Low | Pass | Correct app-local homes for schema artifacts and generated clients. |
| `applications/brief-studio/` and `applications/socratic-math-teacher/` | Pass | Pass | Low | Pass | The upgraded example-app ownership story is concrete and actionable in the current repo layout. |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? (`Pass`/`Fail`) | Reuse / Extension Decision Is Sound? (`Pass`/`Fail`) | New Support Piece Is Justified? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| App backend worker lifecycle | Pass | Pass | N/A | Pass | Reuse of `application-engine` remains sound. |
| Application-scoped backend transport host | Pass | Pass | N/A | Pass | Reusing `application-backend-gateway` and formalizing the hosted mount is the right move. |
| Agent/team lifecycle observation | Pass | Pass | N/A | Pass | The extension strategy remains sound. |
| Startup recovery / resume | Pass | Pass | Pass | Pass | Explicit recovery owner remains justified. |
| Startup traffic/readiness coordination | Pass | Pass | Pass | Pass | The dedicated startup gate remains justified. |
| App-owned schema/codegen and generated clients | Pass | Pass | Pass | Pass | Keeping these app-local rather than extending platform packages is the correct ownership decision. |
| Sample app teaching upgrades | Pass | Pass | N/A | Pass | Treating the two in-repo apps as teaching artifacts is the right reuse/upgrade move. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? (`Yes`/`No`) | Clean-Cut Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- |
| Session-owned launch/orchestration | No | Pass | Pass | Strong clean-cut removal stance remains intact. |
| Manifest/runtimeTarget simple-path retention | No | Pass | Pass | Correctly rejected. |
| Session-bound iframe/request-context retention | No | Pass | Pass | Correctly rejected. |
| Platform-owned universal business schema layer | No | Pass | Pass | Correctly rejected in favor of app-owned schema/codegen. |

## Migration / Refactor Safety Verdict

| Area | Sequence Is Realistic? (`Pass`/`Fail`) | Temporary Seams Are Explicit? (`Pass`/`Fail`) | Cleanup / Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- |
| Contracts -> backend mount -> orchestration core -> sample migration | Pass | Pass | Pass | Pass |
| Recovery owner, lifecycle gateway, ingress owner introduction | Pass | Pass | Pass | Pass |
| Startup integration in `server-runtime.ts` | Pass | Pass | Pass | Pass |
| App-owned API/schema authoring path and SDK boundary split | Pass | Pass | Pass | Pass |
| Teaching-app upgrades | Pass | Pass | Pass | Pass |

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
- The sample-app upgrades are now part of the authoritative design package, so incomplete migration would leave the repo teaching the wrong model.
- The startup gate must still be wired exactly as designed into both public runtime-control entrypoints and live `publish_artifact` ingress.

## Latest Authoritative Result

- Review Decision: `Pass`
- Notes: `The deeper app-API design is concrete enough for implementation. The hosted backend-mount/base-url boundary, app-owned schema/codegen ownership split, and upgraded teaching-app direction do not introduce new architecture blockers.`
