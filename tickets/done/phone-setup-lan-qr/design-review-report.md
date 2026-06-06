# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-setup-lan-qr/tickets/in-progress/phone-setup-lan-qr/requirements.md`
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-setup-lan-qr/tickets/in-progress/phone-setup-lan-qr/investigation-notes.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-setup-lan-qr/tickets/in-progress/phone-setup-lan-qr/design-spec.md`
- Current Review Round: 1
- Trigger: Initial architecture review requested by `solution_designer` after user-approved requirements/design for restoring Local LAN/private HTTP QR support.
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: 1
- Current-State Evidence Basis: Reviewed the three upstream artifacts plus current code in `remote-access-pairing-service.ts`, `url-normalization.ts`, `domain/models.ts`, `api/rest/remote-access.ts`, `remote-access-route-policy.ts`, `address-candidate-service.ts`, `phoneAccessRemoteNode.ts`, `phoneAccessStore.ts`, `PhoneAccessCard.vue`, and current HTTPS-only test references.

## Round History

| Round | Trigger | Prior Unresolved Findings Rechecked | New Findings Found | Review Decision | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Initial review after approved design | N/A | None | Pass | Yes | Design is actionable and maintains backend pairing-service authority while restoring trusted Local LAN/private HTTP with acknowledgement. |

## Reviewed Design Spec

The design proposes a spine-led correction of the current HTTPS-only Phone Setup behavior. It keeps Tailscale/private HTTPS as the recommended path, restores deterministic trusted private HTTP QR creation with explicit acknowledgement, rejects public HTTP and phone-unreachable local-only hosts, preserves canonical `serverBaseUrl` normalization and `/mobile` derivation, and keeps remote-node same-`serverInstanceId` verification before QR creation.

The design is ready for implementation.

## Task Design Health Assessment Verdict

| Assessment Area | Result (`Pass`/`Fail`) | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Design classifies the task as Bug Fix + Behavior Change. | None |
| Root-cause classification is explicit and evidence-backed | Pass | Classifies Boundary Or Ownership Issue + Duplicated Policy Or Coordination, backed by evidence across component, store, frontend utility, backend service, docs/localization, tests, and Android behavior. | None |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | States a small targeted refactor is needed. | None |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | Backend and frontend pairing URL policy extraction, removal plan, file mapping, dependency rules, and migration sequence all reflect the refactor decision. | None |

## Prior Findings Resolution Check (Mandatory On Round >1)

| Prior Round | Finding ID | Previous Severity | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| N/A | N/A | N/A | N/A | First review round. | N/A |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? (`Pass`/`Fail`) | Narrative Is Clear? (`Pass`/`Fail`) | Facade Vs Governing Owner Is Clear? (`Pass`/`Fail`/`N/A`) | Main Domain Subject Naming Is Clear? (`Pass`/`Fail`) | Ownership Is Clear? (`Pass`/`Fail`) | Off-Spine Concerns Stay Off Main Line? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Embedded-node QR | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 | Backend QR authority | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 | Remote-node QR | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-004 | Mobile scan/open return path | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-005 | Selected URL change bounded local state flow | Pass | Pass | N/A | Pass | Pass | Pass | Pass |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? (`Pass`/`Fail`) | Reuse / Extend / Create-New Decision Is Sound? (`Pass`/`Fail`) | Supports The Right Spine Owners? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Backend Remote Access | Pass | Pass | Pass | Pass | Correctly extends `RemoteAccessPairingService` with an owned backend policy instead of moving authority to REST/frontend. |
| Frontend Phone Access Settings | Pass | Pass | Pass | Pass | Store remains the sequencing owner; component remains presentational. |
| URL Utilities | Pass | Pass | Pass | Pass | Existing canonical normalizers remain reused. |
| Android Mobile Shell | Pass | Pass | Pass | Pass | Existing HTTP acknowledgement consumer is reused; QR payload contract remains unchanged. |
| Documentation / Localization | Pass | Pass | Pass | Pass | Copy/docs are treated as durable product-surface changes, not afterthoughts. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? (`Pass`/`Fail`) | Shared File Choice Is Sound? (`Pass`/`Fail`/`N/A`) | Ownership Of Shared Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Frontend URL classification/eligibility | Pass | Pass | Pass | Pass | `phoneAccessPairingUrlPolicy.ts` is narrowly scoped to Phone Access. |
| Backend pairing URL classification | Pass | Pass | Pass | Pass | `pairing-url-policy.ts` is in the backend Remote Access service boundary. |
| Cross-runtime private host classification | Pass | Pass | Pass | Pass | Separate runtime implementations are acceptable with aligned fixtures/tests. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Pass`/`Fail`) | Redundant Attributes Removed? (`Pass`/`Fail`) | Overlapping Representation Risk Is Controlled? (`Pass`/`Fail`) | Shared Core Vs Specialized Variant / Composition Decision Is Sound? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Backend policy decision/result | Pass | Pass | Pass | N/A | Pass | `normalizedBaseUrl`, `transportSecurity`, and acknowledgement requirement have distinct meanings. |
| Frontend validation decision | Pass | Pass | Pass | N/A | Pass | The design avoids using `isHttps` as eligibility and separates warning/message/ack state. |
| Create pairing request | Pass | Pass | Pass | N/A | Pass | `trustedPrivateHttpAcknowledged?: boolean` is explicit and does not make candidate kind authoritative. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? (`Pass`/`Fail`) | Replacement Owner / Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Removal / Decommission Scope Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Categorical backend HTTPS assertion | Pass | Pass | Pass | Pass | Replaced by backend pairing URL policy. |
| Frontend `isHttps`-only eligibility | Pass | Pass | Pass | Pass | Replaced by policy decision plus acknowledgement state. |
| HTTPS-only default candidate selection | Pass | Pass | Pass | Pass | Replaced by HTTPS-first, private-HTTP-next policy. |
| Diagnostic-only Local LAN copy/docs | Pass | Pass | Pass | Pass | Replaced by supported-mode warning/acknowledgement copy. |
| Tests asserting universal HTTP rejection | Pass | Pass | Pass | Pass | Replaced by private HTTP success and public/local-only rejection tests. |
| `REMOTE_ACCESS_HTTPS_REQUIRED` active use in pairing flow | Pass | Pass | Pass | Pass | Design requires specific policy failures and no exposure of stale HTTPS-only error for this flow. |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? (`Pass`/`Fail`) | Responsibility Matches The Intended Owner/Boundary? (`Pass`/`Fail`) | Responsibilities Were Re-Tightened After Shared-Structure Extraction? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/remote-access/services/pairing-url-policy.ts` | Pass | Pass | Pass | Pass | Backend URL acceptance policy only. |
| `remote-access-pairing-service.ts` | Pass | Pass | Pass | Pass | Pairing lifecycle remains here; host regexes move out. |
| `domain/models.ts` | Pass | Pass | N/A | Pass | Error vocabulary belongs in domain model. |
| `api/rest/remote-access.ts` | Pass | Pass | N/A | Pass | Thin request mapping/delegation only. |
| `autobyteus-web/utils/phoneAccessPairingUrlPolicy.ts` | Pass | Pass | Pass | Pass | UI mirror of policy only; no store/API mutation. |
| `autobyteus-web/utils/phoneAccessRemoteNode.ts` | Pass | Pass | Pass | Pass | Narrowed to status fetch/error formatting. |
| `autobyteus-web/stores/phoneAccessStore.ts` | Pass | Pass | Pass | Pass | Selection, acknowledgement, remote verification, API request sequencing. |
| `PhoneAccessCard.vue` | Pass | Pass | Pass | Pass | Presentation only. |
| Localization/docs/tests | Pass | Pass | N/A | Pass | Correct durable owners for copy, docs, and validation. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? (`Pass`/`Fail`) | Forbidden Shortcuts Are Explicit? (`Pass`/`Fail`) | Direction Is Coherent With Ownership? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `PhoneAccessCard` | Pass | Pass | Pass | Pass | Must not compute final URL authority from scheme. |
| `phoneAccessStore` | Pass | Pass | Pass | Pass | May use frontend policy and remote-node helper; owns sequencing. |
| Frontend policy utility | Pass | Pass | Pass | Pass | No API/store side effects. |
| `RemoteAccessPairingService` | Pass | Pass | Pass | Pass | Calls backend policy and remains authoritative. |
| Backend policy utility | Pass | Pass | Pass | Pass | No REST/Fastify/UI dependencies. |
| Android mobile shell | Pass | Pass | Pass | Pass | Compatibility only through payload/URL contract. |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? (`Pass`/`Fail`) | Internal Owned Mechanisms Stay Internal? (`Pass`/`Fail`) | Caller Bypass Risk Is Controlled? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `RemoteAccessPairingService.createPairingSession` | Pass | Pass | Pass | Pass | REST route delegates; backend policy is internal to service flow. |
| `phoneAccessStore` | Pass | Pass | Pass | Pass | Component reads store state/actions instead of ad hoc URL-policy checks. |
| Backend `pairing-url-policy.ts` | Pass | Pass | Pass | Pass | Tests may target it, but route should not bypass service authority. |
| Frontend `phoneAccessPairingUrlPolicy.ts` | Pass | Pass | Pass | Pass | It is a UX mirror, not backend authority. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? (`Pass`/`Fail`) | Responsibility Is Singular? (`Pass`/`Fail`) | Identity Shape Is Explicit? (`Pass`/`Fail`) | Generic Boundary Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- |
| `POST /rest/remote-access/pairing-sessions` | Pass | Pass | Pass | Low | Pass |
| `RemoteAccessPairingService.createPairingSession(input)` | Pass | Pass | Pass | Low | Pass |
| `evaluatePhoneAccessPairingUrl(rawUrl)` | Pass | Pass | Pass | Low | Pass |
| `validatePairingServerBaseUrl(rawUrl, options)` | Pass | Pass | Pass | Low | Pass |
| `fetchRemoteAccessStatusFromBaseUrl(baseUrl)` | Pass | Pass | Pass | Low | Pass |
| `AddressCandidateService.listCandidates` | Pass | Pass | Pass | Medium | Pass |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? (`Pass`/`Fail`) | Folder Matches Owning Boundary? (`Pass`/`Fail`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/remote-access/services` | Pass | Pass | Low | Pass | Service-owned policy placement is appropriate. |
| `autobyteus-web/utils` | Pass | Pass | Medium | Pass | Medium utility-folder sprawl risk is controlled by narrow file name/scope. |
| `autobyteus-web/stores` | Pass | Pass | Low | Pass | Existing Pinia orchestration location. |
| `autobyteus-web/components/settings` | Pass | Pass | Low | Pass | Existing presentation location. |
| Docs/localization paths | Pass | Pass | Low | Pass | Existing durable copy/doc locations. |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? (`Pass`/`Fail`) | Reuse / Extension Decision Is Sound? (`Pass`/`Fail`) | New Support Piece Is Justified? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Pairing lifecycle | Pass | Pass | N/A | Pass | Extends current service. |
| URL normalization | Pass | Pass | N/A | Pass | Reuses normalizers. |
| Pairing URL policy | Pass | Pass | Pass | Pass | New files are justified because policy is currently scattered. |
| Candidate discovery | Pass | Pass | N/A | Pass | Discovery remains discovery-only. |
| QR rendering | Pass | Pass | N/A | Pass | No changes needed. |
| Android HTTP acknowledgement | Pass | Pass | N/A | Pass | No native design change required unless later validation finds a defect. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? (`Yes`/`No`) | Clean-Cut Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- |
| Frontend-only enablement workaround | No | Pass | Pass | Explicitly rejected. |
| Fake/local frontend QR creation bypass | No | Pass | Pass | Explicitly rejected. |
| Allow-all-HTTP compatibility | No | Pass | Pass | Explicitly rejected. |
| Diagnostic-only LAN retention | No | Pass | Pass | Explicitly rejected. |
| HTTPS-only backend fallback | No | Pass | Pass | Explicitly rejected. |

## Migration / Refactor Safety Verdict

| Area | Sequence Is Realistic? (`Pass`/`Fail`) | Temporary Seams Are Explicit? (`Pass`/`Fail`) | Cleanup / Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- |
| Backend policy extraction | Pass | Pass | Pass | Pass |
| Backend service/API update | Pass | Pass | Pass | Pass |
| Frontend policy extraction | Pass | Pass | Pass | Pass |
| Frontend store/component update | Pass | Pass | Pass | Pass |
| Tests/docs/localization | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? (`Yes`/`No`) | Example Is Present And Clear? (`Pass`/`Fail`/`N/A`) | Bad / Avoided Shape Is Explained When Helpful? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Embedded Local LAN | Yes | Pass | Pass | Pass | Shows expected warning/ack/QR behavior. |
| Tailscale HTTPS | Yes | Pass | Pass | Pass | Guards current supported path. |
| Public HTTP rejection | Yes | Pass | Pass | Pass | Prevents unsafe over-expansion. |
| Loopback rejection | Yes | Pass | Pass | Pass | Protects phone-facing reachability. |
| Backend authority | Yes | Pass | Pass | Pass | Prevents frontend-only bypass. |

## Missing Use Cases / Open Unknowns

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| Public-looking private DNS HTTP hostnames | Backend/frontend cannot determine private routing without DNS resolution; allowing them now would risk public HTTP. | Defer to future explicit advanced override if users need it. | Acceptable residual risk. |
| Remote-node HTTP verification in browser/Electron | Browser CORS/mixed-content behavior may affect direct `/rest/remote-access/status` probes over HTTP. | API/E2E validation should exercise or mock a reachable private HTTP advertised URL and classify any failure. | Acceptable residual risk. |
| Active QR after selected URL changes | A QR created for an old URL can confuse users if left visible after the selection changes. | During implementation, follow DS-005 by clearing the old active pairing or making it visibly tied to its original URL. | Covered by design; implementation attention needed. |
| Cross-runtime policy drift | Frontend/backend must maintain aligned URL host classifications. | Add focused policy fixtures/tests in both runtimes. | Covered by design. |

## Review Decision

Pass: the design is ready for implementation.

## Findings

None.

## Classification

N/A — no blocking or reroute findings.

## Recommended Recipient

`implementation_engineer`

## Residual Risks

- Deterministic private/local HTTP host classification intentionally excludes some advanced private DNS setups that look public. This is acceptable for the current user-approved scope.
- Remote-node HTTP status verification may surface runtime CORS/mixed-content constraints; validation should confirm behavior in the target Electron/browser context.
- Implementation must keep backend pairing policy authoritative and must not use candidate kind as authority.
- Implementation must invalidate or clearly bind any active QR to its original URL when selection changes.

## Latest Authoritative Result

- Review Decision: Pass
- Notes: Design has sufficient spine coverage, ownership clarity, boundary encapsulation, removal planning, API shape, migration sequencing, and validation scope for implementation.
