# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/iframe-launch-id-contract-refactor/tickets/in-progress/iframe-launch-id-contract-refactor/requirements.md`
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/iframe-launch-id-contract-refactor/tickets/in-progress/iframe-launch-id-contract-refactor/investigation-notes.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/iframe-launch-id-contract-refactor/tickets/in-progress/iframe-launch-id-contract-refactor/design-spec.md`
- Current Review Round: 1
- Trigger: Initial architecture review request from `solution_designer` for ticket `iframe-launch-id-contract-refactor`.
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: 1
- Current-State Evidence Basis: Reviewed the upstream artifacts, the shared architecture-review design principles, and representative current source in `autobyteus-application-sdk-contracts`, `autobyteus-application-frontend-sdk`, `autobyteus-web`, `autobyteus-server-ts`, and sample app/docs surfaces. Ran source inventory reads only; no package tests were run during architecture review.

## Round History

| Round | Trigger | Prior Unresolved Findings Rechecked | New Findings Found | Review Decision | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Initial architecture review | N/A | No | Pass | Yes | Design is concrete, spine-led, and implementation-ready. |

## Reviewed Design Spec

Reviewed `/Users/normy/autobyteus_org/autobyteus-worktrees/iframe-launch-id-contract-refactor/tickets/in-progress/iframe-launch-id-contract-refactor/design-spec.md` for the clean-cut hosted-iframe contract refactor from `launchInstanceId` to `iframeLaunchId`, request-context narrowing to `{ applicationId }`, iframe contract v3 / frontend SDK compatibility v3 gating, backend transport cleanup, sample regeneration, docs updates, and stale iframe protection.

## Prior Findings Resolution Check (Mandatory On Round >1)

| Prior Round | Finding ID | Previous Severity | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| N/A | N/A | N/A | N/A | First review round. | No prior architecture-review findings. |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? (`Pass`/`Fail`) | Narrative Is Clear? (`Pass`/`Fail`) | Facade Vs Governing Owner Is Clear? (`Pass`/`Fail`/`N/A`) | Main Domain Subject Naming Is Clear? (`Pass`/`Fail`) | Ownership Is Clear? (`Pass`/`Fail`) | Off-Spine Concerns Stay Off Main Line? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Hosted iframe bootstrap | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 | Backend app invocation context | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 | Manifest compatibility admission | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-004 | Ready/bootstrap return-event safety | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-005 | Sample generated artifact refresh | Pass | Pass | N/A | Pass | Pass | Pass | Pass |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? (`Pass`/`Fail`) | Reuse / Extend / Create-New Decision Is Sound? (`Pass`/`Fail`) | Supports The Right Spine Owners? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Application SDK contracts | Pass | Pass | Pass | Pass | Correct owner for v3 iframe contract, request context, manifest compatibility types/constants. |
| Frontend SDK | Pass | Pass | Pass | Pass | Correct owner for child startup validation, app client context, and route transport cleanup. |
| Web host application UI/store/utils | Pass | Pass | Pass | Pass | Keeps `ApplicationSurface.vue` as lifecycle owner and `ApplicationIframeHost.vue` as bridge. |
| Server backend gateway/engine | Pass | Pass | Pass | Pass | Correctly removes iframe launch identity from REST/gateway/worker contexts while preserving route `applicationId` authority. |
| Application package manifests | Pass | Pass | Pass | Pass | v3 compatibility gate is the right admission boundary for clean-cut replacement. |
| Built-in samples/generated outputs | Pass | Pass | Pass | Pass | Generated refresh is explicitly scoped and separated as a review risk. |
| Docs/terminology | Pass | Pass | Pass | Pass | Broad docs cleanup is scoped; final legacy scan should catch omitted doc-path details. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? (`Pass`/`Fail`) | Shared File Choice Is Sound? (`Pass`/`Fail`/`N/A`) | Ownership Of Shared Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Iframe launch id query/ready/bootstrap fields | Pass | Pass | Pass | Pass | Centralizing in `application-iframe-contract.ts` avoids ad hoc string/shape drift. |
| Application request context | Pass | Pass | Pass | Pass | Narrowing the exported `ApplicationRequestContext` prevents mixed iframe/backend identity. |
| Generated sample vendored SDK copies | Pass | N/A | Pass | Pass | Treated as generated outputs owned by sample build scripts, not hand-authored alternate contracts. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Pass`/`Fail`) | Redundant Attributes Removed? (`Pass`/`Fail`) | Overlapping Representation Risk Is Controlled? (`Pass`/`Fail`) | Shared Core Vs Specialized Variant / Composition Decision Is Sound? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `ApplicationBootstrapPayloadV3` | Pass | Pass | Pass | Pass | Pass | Top-level `iframeLaunchId` plus `requestContext: { applicationId }` is tight and avoids a one-field nested object. |
| `ApplicationRequestContext` | Pass | Pass | Pass | N/A | Pass | `{ applicationId }` has one durable business-context meaning. |
| `ApplicationIframeLaunchHints` | Pass | Pass | Pass | N/A | Pass | Query name `autobyteusIframeLaunchId` matches field semantics. |
| `ApplicationHostLaunchState` | Pass | Pass | Pass | N/A | Pass | State may remain host-launch scoped, but the id field must be iframe-specific. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? (`Pass`/`Fail`) | Replacement Owner / Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Removal / Decommission Scope Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| v2 iframe contract public usage | Pass | Pass | Pass | Pass | Clean-cut v3 replacement is explicit. |
| `autobyteusLaunchInstanceId` query name | Pass | Pass | Pass | Pass | Old query must not be accepted as a valid v3 path. |
| Bootstrap `launch { launchInstanceId }` object | Pass | Pass | Pass | Pass | Removal supports a single representation of the iframe correlation id. |
| `requestContext.launchInstanceId` | Pass | Pass | Pass | Pass | Removal spans shared type, frontend client, REST/gateway, worker, docs, tests. |
| `x-autobyteus-launch-instance-id` and backend query/body normalization | Pass | N/A | Pass | Pass | No replacement is intentionally specified. |
| Host UI launch-instance technical detail/localization | Pass | N/A | Pass | Pass | Prevents misleading user-facing app-instance/session semantics. |
| Sample vendors/dist built from v2 SDK | Pass | Pass | Pass | Pass | Refresh via build/regeneration; handoff should separate generated vs hand-authored changes. |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? (`Pass`/`Fail`) | Responsibility Matches The Intended Owner/Boundary? (`Pass`/`Fail`) | Responsibilities Were Re-Tightened After Shared-Structure Extraction? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-application-sdk-contracts/src/application-iframe-contract.ts` | Pass | Pass | Pass | Pass | Canonical v3 iframe contract owner. |
| `autobyteus-application-sdk-contracts/src/index.ts` | Pass | Pass | Pass | Pass | Public SDK contract owner for request context and version constants. |
| `autobyteus-application-sdk-contracts/src/manifests.ts` | Pass | Pass | Pass | Pass | Manifest type owner for frontend SDK v3 compatibility. |
| Frontend SDK startup/client/transport files | Pass | Pass | Pass | Pass | Startup owns bootstrap trust checks; client/transport own app API context behavior. |
| Web host store/descriptor/URL utilities | Pass | Pass | Pass | Pass | Descriptor and URL helpers keep query construction outside components and use shared constants. |
| `ApplicationSurface.vue` | Pass | Pass | Pass | Pass | Authoritative host bootstrap lifecycle owner. |
| `ApplicationIframeHost.vue` | Pass | Pass | Pass | Pass | Bridge remains internal and does not absorb lifecycle policy. |
| Server REST/gateway/worker files | Pass | Pass | Pass | Pass | Correctly separated transport adaptation, gateway validation, and handler context creation. |
| Sample app source/manifests/scripts/generated outputs | Pass | Pass | N/A | Pass | Broad but appropriately owned by sample package/build surfaces. |
| Docs/README files | Pass | Pass | N/A | Pass | Specific enough for implementation with final search enforcement. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? (`Pass`/`Fail`) | Forbidden Shortcuts Are Explicit? (`Pass`/`Fail`) | Direction Is Coherent With Ownership? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Shared iframe contract | Pass | Pass | Pass | Pass | Consumers should import shared constants/helpers rather than duplicating query names/validators. |
| Web host lifecycle | Pass | Pass | Pass | Pass | Shell should depend on Surface/store boundaries, not construct bootstrap payloads directly. |
| Frontend app client/backend transport | Pass | Pass | Pass | Pass | Transport carries durable app context only and no iframe identity. |
| Server backend gateway | Pass | Pass | Pass | Pass | REST/gateway/worker must not accept or propagate iframe launch ids as platform context. |
| Manifest compatibility parsers | Pass | Pass | Pass | Pass | Rejects old v2 packages before runtime iframe flow. |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? (`Pass`/`Fail`) | Internal Owned Mechanisms Stay Internal? (`Pass`/`Fail`) | Caller Bypass Risk Is Controlled? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `application-iframe-contract.ts` | Pass | Pass | Pass | Pass | Canonical field names, versions, validators, and constructors are centralized. |
| `ApplicationSurface.vue` | Pass | Pass | Pass | Pass | The design explicitly prevents `ApplicationIframeHost.vue` from becoming lifecycle owner. |
| `startHostedApplication(...)` | Pass | Pass | Pass | Pass | Child startup validates source/origin/version/app/id before app handoff. |
| `ApplicationBackendGatewayService` | Pass | Pass | Pass | Pass | App-id validation remains authoritative; iframe internals stay out. |
| Manifest parsers | Pass | Pass | Pass | Pass | Compatibility gate prevents runtime bypass for old packages. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? (`Pass`/`Fail`) | Responsibility Is Singular? (`Pass`/`Fail`) | Identity Shape Is Explicit? (`Pass`/`Fail`) | Generic Boundary Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- |
| `readApplicationIframeLaunchHints(search)` | Pass | Pass | Pass | Low | Pass |
| `createApplicationUiReadyEnvelopeV3(payload)` | Pass | Pass | Pass | Low | Pass |
| `createApplicationHostBootstrapEnvelopeV3(payload)` | Pass | Pass | Pass | Low | Pass |
| `ApplicationRequestContext` | Pass | Pass | Pass | Low | Pass |
| REST backend routes | Pass | Pass | Pass | Low | Pass |
| Manifest parser compatibility checks | Pass | Pass | Pass | Low | Pass |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? (`Pass`/`Fail`) | Folder Matches Owning Boundary? (`Pass`/`Fail`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-application-sdk-contracts/src` | Pass | Pass | Low | Pass | Shared contract package is the right place for public contract shapes. |
| `autobyteus-application-frontend-sdk/src` | Pass | Pass | Low | Pass | Existing startup/client/transport split remains appropriate. |
| `autobyteus-web/components/applications` | Pass | Pass | Medium | Pass | Medium risk is acknowledged and controlled by the Surface-vs-IframeHost rule. |
| `autobyteus-server-ts/src/api/rest` | Pass | Pass | Low | Pass | REST remains a transport adapter. |
| `autobyteus-server-ts/src/application-backend-gateway` | Pass | Pass | Low | Pass | Gateway owns backend admission/validation. |
| `autobyteus-server-ts/src/application-engine` | Pass | Pass | Low | Pass | Worker/runtime contexts stay app-owned. |
| `applications/*/ui/vendor` and `applications/*/dist/importable-package` | Pass | Pass | Medium | Pass | Generated diff risk is expected and not an architecture blocker. |
| Docs files | Pass | Pass | Low | Pass | Broad docs update plus legacy scan is adequate. |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? (`Pass`/`Fail`) | Reuse / Extension Decision Is Sound? (`Pass`/`Fail`) | New Support Piece Is Justified? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Canonical iframe payload/query definitions | Pass | Pass | N/A | Pass | Extend existing contract file. |
| Durable app request context type | Pass | Pass | N/A | Pass | Extend existing SDK public contract type. |
| Bundle startup validation | Pass | Pass | N/A | Pass | Extend existing frontend SDK startup owner. |
| Host iframe lifecycle | Pass | Pass | N/A | Pass | Extend existing web host components/store. |
| Backend route context normalization | Pass | Pass | N/A | Pass | Extend existing REST/gateway boundaries. |
| Compatibility gate | Pass | Pass | N/A | Pass | Extend existing manifest parsers; no new runtime shim. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? (`Yes`/`No`) | Clean-Cut Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- |
| Iframe URL query parsing | No | Pass | Pass | v3 accepts `autobyteusIframeLaunchId` only. |
| Ready/bootstrap payloads | No | Pass | Pass | v2/`launchInstanceId` aliases are rejected. |
| Backend request context/header/query | No | Pass | Pass | The header/query/body launch-id normalization is removed, not renamed. |
| Manifest compatibility | No | Pass | Pass | v2 frontend packages are intentionally rejected. |
| Docs/samples/generated outputs | No | Pass | Pass | Final scan enforces cleanup of public/live references. |

## Migration / Refactor Safety Verdict

| Area | Sequence Is Realistic? (`Pass`/`Fail`) | Temporary Seams Are Explicit? (`Pass`/`Fail`) | Cleanup / Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- |
| SDK contracts first | Pass | Pass | Pass | Pass |
| Frontend SDK second | Pass | Pass | Pass | Pass |
| Web host third | Pass | Pass | Pass | Pass |
| Server/backend fourth | Pass | Pass | Pass | Pass |
| Samples/generated outputs fifth | Pass | Pass | Pass | Pass |
| Docs and final legacy scan | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? (`Yes`/`No`) | Example Is Present And Clear? (`Pass`/`Fail`/`N/A`) | Bad / Avoided Shape Is Explained When Helpful? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Bootstrap payload | Yes | Pass | Pass | Pass | Shows the top-level `iframeLaunchId` target and old duplicated shape. |
| Backend context | Yes | Pass | Pass | Pass | Makes boundary separation concrete. |
| URL hints | Yes | Pass | Pass | Pass | Shows the public query contract. |
| Compatibility gate | Yes | Pass | Pass | Pass | Explains early parser rejection versus runtime failure. |

## Missing Use Cases / Open Unknowns

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| Dependency setup absent in worktree | Validation may not run until dependencies are installed/restored. | Implementation/validation should set up dependencies before running targeted checks. | Residual risk, not design blocker. |
| Large generated sample/vendor/dist diff | Reviewers may struggle to separate generated artifacts from hand-authored changes. | Implementation handoff should group source changes separately from generated refresh. | Residual risk, not design blocker. |
| External packages built for frontend SDK v2 | Clean-cut replacement intentionally rejects old packages. | Note in docs/handoff; no compatibility wrapper. | Accepted by requirements. |
| Broad docs/test surface | Some paths may not be enumerated exhaustively in the design. | Use the prescribed final `rg` scan and update any live public stale references found. | Controlled by acceptance criteria. |

## Review Decision

Pass: the design is ready for implementation.

## Findings

None.

## Classification

No blocking findings. Classification: N/A.

## Recommended Recipient

`implementation_engineer`

## Residual Risks

- Dependency installation/build setup may be required before implementation can run the targeted validation commands.
- Generated sample/vendor/dist outputs will likely create a large diff; implementation should separate generated and hand-authored file groups in the handoff.
- Final legacy scan is important because the live docs/tests/generated surface is broad.
- External v2 frontend packages will be rejected by design; this is accepted under the clean-cut requirement and should be documented clearly.

## Latest Authoritative Result

- Review Decision: Pass
- Notes: The top-level `iframeLaunchId` bootstrap shape is approved; a nested `iframe: { launchId }` wrapper would add indirection without current value. The frontend SDK compatibility bump to `"3"` is approved because this is a public breaking iframe bootstrap contract replacement and the requirements explicitly reject dual-path compatibility.
