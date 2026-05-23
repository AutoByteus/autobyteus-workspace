# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/android-pairing-security-hardening/tickets/in-progress/android-pairing-security-hardening/requirements.md`
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/android-pairing-security-hardening/tickets/in-progress/android-pairing-security-hardening/investigation-notes.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/android-pairing-security-hardening/tickets/in-progress/android-pairing-security-hardening/design-spec.md`
- Supporting Future Phase Two Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/android-pairing-security-hardening/docs/future-tickets/mobile-backend-authorization-hardening.md`
- Current Review Round: 2
- Trigger: Rework after round 1 design-impact findings for Phase One Android pairing with a mobile-safe Docker node.
- Prior Review Round Reviewed: 1
- Latest Authoritative Round: 2
- Current-State Evidence Basis: reviewed the revised Phase One requirements, investigation notes, design spec, future Phase Two doc, and relevant current code surfaces named by the design: Docker launcher scripts, `NodeManager.vue`, `PhoneAccessCard.vue`, `phoneAccessStore.ts`, Electron node/window context, current `remote-access` routes/route policy, current address candidate behavior, and current mobile Tools/Terminal/VNC surfaces and tests.

## Round History

| Round | Trigger | Prior Unresolved Findings Rechecked | New Findings Found | Review Decision | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Initial review of narrowed Phase One package | N/A | AR-P1-001, AR-P1-002, AR-P1-003 | Fail | No | Direction accepted in principle; central claim/origin/UI-removal boundaries were underspecified. |
| 2 | Rework after round 1 findings | AR-P1-001, AR-P1-002, AR-P1-003 | None blocking | Pass | Yes | Rework concretely defines node-admin claim, advertised-origin verification, and terminal/Tools removal mapping. |

## Reviewed Design Spec

Reviewed `/Users/normy/autobyteus_org/autobyteus-worktrees/android-pairing-security-hardening/tickets/in-progress/android-pairing-security-hardening/design-spec.md` as the authoritative round 2 Phase One design.

The broad backend mobile authorization/token hardening scope is explicitly deferred and captured in `/Users/normy/autobyteus_org/autobyteus-worktrees/android-pairing-security-hardening/docs/future-tickets/mobile-backend-authorization-hardening.md`.

## Task Design Health Assessment Verdict

| Assessment Area | Result (`Pass`/`Fail`) | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Design classifies this as Feature + Security Hardening, Phase One. | None. |
| Root-cause classification is explicit and evidence-backed | Pass | Design identifies a Boundary Or Ownership Issue: remote-node windows exist, but Phone Access management is embedded/local-only by loopback. | None. |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | Design bounds current refactor to Docker node Phone Access management, Docker launcher profiles, advertised-origin validation, and mobile Tools/Terminal/VNC UI removal; Phase Two is explicitly deferred. | None. |
| Refactor decision is supported by concrete design sections or residual-risk rationale | Pass | Concrete Node-Admin Claim Contract, Docker Advertised-Origin Contract, and Mobile Terminal/Tools Removal Mapping support the refactor scope. | None. |

## Prior Findings Resolution Check (Mandatory On Round >1)

| Prior Round | Finding ID | Previous Severity | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | AR-P1-001 | High | Resolved | Design now defines claim issuer, `claimId`, raw secret, hash, fixed scope, hash-only container env, launcher/Electron custody, headers, `PHONE_ACCESS_OWNER` route class, route-limited validation, target binding, redaction, and launcher-owned rotation/recreate. | Implementation must keep raw claim out of renderer storage and server/container env. |
| 1 | AR-P1-002 | High | Resolved | Design now distinguishes `managementBaseUrl` from `mobileAdvertisedBaseUrl`, requires manual HTTPS advertised URL in remote Docker mode, rejects loopback/container-local/HTTP URLs, and validates matching `serverInstanceId` before QR creation. | This is implementation-ready and testable. |
| 1 | AR-P1-003 | Medium | Resolved | Design now names `MobileWorkShell.vue`, `MobileTools.vue`, `MobileTaskTab`, `mobileWorkStore.ts`, `mobileFeatureGates.ts`, `MobileRemoteAccessShell.vue`, and affected mobile tests; the Tools/VNC page is removed entirely for Phase One. | No remaining design gap. |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | Ownership Is Clear? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-P1-001 | Mobile-safe Docker node/profile/claim creation | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-P1-002 | Remote Docker Phone Access owner management | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-P1-003 | Advertised URL same-node verification | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-P1-004 | Docker-node QR and Android pairing | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-P1-005 | Mobile-started work executes against Docker node | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-P1-006 | Mobile Tools/Terminal/VNC absent | Pass | Pass | Pass | Pass | Pass | Pass | Pass |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Docker Launcher | Pass | Pass | Pass | Pass | Owns mobile-safe profile, no privileged defaults, no automatic shared host mounts, and launcher claim generation/rotation. |
| Electron Node Management | Pass | Pass | Pass | Pass | Correct owner for raw local claim custody outside renderer-localStorage/node snapshots. |
| Server Remote Access | Pass | Pass | Pass | Pass | Correct owner for claim validation, status identity, pairing/settings/devices on target Docker node. |
| Desktop Settings UI | Pass | Pass | Pass | Pass | `PhoneAccessCard` remote mode and store own management/adverstised URL UX, not backend policy. |
| Android/Mobile Shell | Pass | Pass | Pass | Pass | Reuses existing pairing exchange once QR origin is verified. |
| Mobile UI Feature Policy | Pass | Pass | Pass | Pass | Clean-cut removal of mobile Tools/Terminal/VNC is now mapped. |
| Docs / Future Ticket | Pass | Pass | Pass | Pass | Phase Two scope is preserved without blocking Phase One. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? | Shared File Choice Is Sound? | Ownership Of Shared Structure Is Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Docker profile spec | Pass | Pass | Pass | Pass | Shell/PowerShell parity is explicitly required. |
| Node admin claim metadata | Pass | Pass | Pass | Pass | Claim semantics are split correctly between launcher, Electron custody, and server validation. |
| Server instance status identity | Pass | Pass | Pass | Pass | Stable `serverInstanceId` is the right verification primitive; display names/URLs are not used as identity. |
| Phone Access URL context | Pass | Pass | Pass | Pass | `managementBaseUrl` and `mobileAdvertisedBaseUrl` are distinct. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Risk Is Controlled? | Shared Core Vs Specialized Variant / Composition Decision Is Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `DockerSecurityProfile` | Pass | Pass | Pass | Pass | Pass | Fields include ports, privileged flags, seccomp, mounts, and claim hash injection. |
| `RemoteNodeAdminClaim` | Pass | Pass | Pass | Pass | Pass | Raw secret lives only in local owner stores; server receives hash/ID/scope. |
| `RemoteAccessStatus` / `serverInstanceId` | Pass | Pass | Pass | Pass | Pass | Stable server identity is explicitly separate from mutable display name. |
| `PhoneAccessUrlContext` | Pass | Pass | Pass | Pass | Pass | Management and Android-facing URLs are not conflated. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? | Replacement Owner / Structure Is Clear? | Removal / Decommission Scope Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Remote-node Phone Setup unavailable steady state | Pass | Pass | Pass | Pass | Replaced by claim/register state and remote `PhoneAccessCard`. |
| Automatic shared host mounts in mobile-safe profile | Pass | Pass | Pass | Pass | Explicit creation-time mounts only. |
| `SYS_ADMIN` / `seccomp=unconfined` in mobile-safe profile | Pass | Pass | Pass | Pass | Compatibility can be separate, not mobile-safe default. |
| Raw node-admin claim in container env/server state | Pass | Pass | Pass | Pass | Rejected; only hash/ID/scope in container. |
| Trusting manual QR URL without same-node proof | Pass | Pass | Pass | Pass | Replaced by `serverInstanceId` comparison. |
| Mobile Tools/Terminal/VNC surfaces | Pass | Pass | Pass | Pass | Tools page removed entirely from Phase One mobile UI. |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? | Responsibility Matches The Intended Owner/Boundary? | Responsibilities Were Re-Tightened After Shared-Structure Extraction? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `scripts/public/docker/autobyteus-docker.sh` / `.ps1` | Pass | Pass | Pass | Pass | Mobile-safe profile and launcher claim owner. |
| `autobyteus-web/electron/nodeAdminClaimStore.ts` | Pass | Pass | Pass | Pass | Correct local privileged boundary for raw claim custody. |
| `autobyteus-web/electron/main.ts` / `preload.ts` | Pass | Pass | Pass | Pass | Correct IPC boundary for registration/redacted state/request support. |
| `remote-node-admin-service.ts` | Pass | Pass | Pass | Pass | Narrow claim validator for Phone Access owner routes. |
| `server-instance-identity-service.ts` | Pass | Pass | Pass | Pass | Correct owner for persisted per-server identity. |
| `api/rest/remote-access.ts` | Pass | Pass | Pass | Pass | Status identity and Phone Access management route handling. |
| `remote-access-route-policy.ts` | Pass | Pass | Pass | Pass | Thin classification/authorization facade for `PHONE_ACCESS_OWNER`; no Docker bridge loopback shortcut. |
| Redaction/logging files | Pass | Pass | Pass | Pass | Claim headers/keys are explicitly included. |
| `phoneAccessStore.ts` / `PhoneAccessCard.vue` | Pass | Pass | Pass | Pass | Correct owners for remote claim state and advertised-origin UX. |
| `NodeManager.vue` | Pass | Pass | Pass | Pass | Correct owner for replacing remote unavailable state. |
| Mobile UI files/tests | Pass | Pass | Pass | Pass | Concrete Tools/Terminal/VNC removal map is complete. |
| Docs / future ticket doc | Pass | Pass | N/A | Pass | Correct phase visibility. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| RemoteNodeAdminService | Pass | Pass | Pass | Pass | Route policy/Phone Access routes may call it; it must not authorize non-Phone-Access routes. |
| Electron claim store | Pass | Pass | Pass | Pass | Renderer sees redacted state only in normal snapshots; raw claim stays out of localStorage. |
| Docker profile resolver | Pass | Pass | Pass | Pass | Single source for Docker run defaults and claim hash injection. |
| Server instance identity service | Pass | Pass | Pass | Pass | Used by status/adverstised URL validation; not a UI display name. |
| MobileWorkShell/tab model | Pass | Pass | Pass | Pass | Tools/Terminal/VNC removal is clean-cut, not CSS-hidden. |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| RemoteNodeAdminService | Pass | Pass | Pass | Pass | Claim ID/hash/scope validation is encapsulated. |
| Electron claim store | Pass | Pass | Pass | Pass | Raw claim custody is not mixed into node registry snapshots. |
| Docker mobile-safe profile resolver | Pass | Pass | Pass | Pass | Good. |
| Docker node Remote Access services | Pass | Pass | Pass | Pass | Target Docker node owns its own Phone Access data. |
| Server instance identity service | Pass | Pass | Pass | Pass | Good. |
| Mobile UI feature policy / work shell | Pass | Pass | Pass | Pass | Hardcoded terminal surfaces are explicitly removed. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-docker new-container --profile mobile-safe` or equivalent | Pass | Pass | Pass | Low | Pass |
| `autobyteus-docker admin-claim show/rotate --name <node>` or equivalent | Pass | Pass | Pass | Low | Pass |
| `RemoteNodeAdminService.validateClaim(...)` | Pass | Pass | Pass | Low | Pass |
| Phone Access owner routes | Pass | Pass | Pass | Low | Pass |
| `/rest/remote-access/status` with `serverInstanceId` | Pass | Pass | Pass | Low | Pass |
| `PhoneAccessCard` remote mode | Pass | Pass | Pass | Low | Pass |
| `MobileWorkShell` tabs | Pass | Pass | Pass | Low | Pass |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? | Folder Matches Owning Boundary? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `scripts/public/docker/` | Pass | Pass | Medium | Pass | Keep sh/ps1 aligned. |
| `autobyteus-web/electron/` | Pass | Pass | Medium | Pass | Correct local desktop secret boundary. |
| `autobyteus-server-ts/src/remote-access/` | Pass | Pass | Medium | Pass | Correct domain/service owner. |
| `autobyteus-web/components/settings/` | Pass | Pass | Low | Pass | Correct owner UI location. |
| `autobyteus-web/components/mobile/` | Pass | Pass | Low | Pass | Correct place for UI removal. |
| `docs/future-tickets/` | Pass | Pass | Low | Pass | Good phase split. |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Node-bound Electron windows | Pass | Pass | N/A | Pass | Existing flow is reused. |
| Phone Access pairing | Pass | Pass | N/A | Pass | Existing service runs on target Docker node. |
| Docker launcher | Pass | Pass | N/A | Pass | Existing launcher owns run args/profile. |
| Remote-node owner proof | Pass | Pass | Pass | Pass | New claim service is justified. |
| Advertised-origin same-node proof | Pass | Pass | Pass | Pass | New server identity is justified. |
| Mobile terminal UI removal | Pass | Pass | N/A | Pass | Existing files/tests are mapped. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Mobile-safe Docker privileges/mounts | No for mobile-safe path | Pass | Pass | Separate compatibility profiles may remain. |
| Docker bridge treated as loopback | No | Pass | Pass | Explicitly rejected. |
| Raw claim in container env/server state | No | Pass | Pass | Explicitly rejected. |
| Unverified advertised URL | No | Pass | Pass | Same-node proof required. |
| Mobile Tools/Terminal/VNC visible but disabled | No | Pass | Pass | Removed entirely for Phase One. |
| Broad mobile backend authorization | Yes, deferred | N/A | Pass | Acceptable for Phase One because Phase Two doc captures the deferred hardening. |

## Migration / Refactor Safety Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Docker launcher profile and claim generation | Pass | Pass | Pass | Pass |
| Server claim validation/status identity | Pass | Pass | Pass | Pass |
| Electron claim custody | Pass | Pass | Pass | Pass |
| Remote PhoneAccessCard and advertised-origin validation | Pass | Pass | Pass | Pass |
| Android pairing to Docker node | Pass | Pass | N/A | Pass |
| Mobile work executes in Docker node | Pass | Pass | N/A | Pass |
| Mobile Tools/Terminal/VNC removal | Pass | Pass | Pass | Pass |
| Docs/future ticket | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? | Example Is Present And Clear? | Bad / Avoided Shape Is Explained When Helpful? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| User flow | Yes | Pass | Pass | Pass | Clear. |
| Docker management auth | Yes | Pass | Pass | Pass | Header shape and route scope are clear. |
| Claim storage | Yes | Pass | Pass | Pass | Raw/hash split is clear. |
| Docker advertised URL | Yes | Pass | Pass | Pass | Management vs Android URL example is clear. |
| Docker profile | Yes | Pass | Pass | Pass | Clear. |
| Mobile terminal removal | Yes | Pass | Pass | Pass | Clear. |

## Missing Use Cases / Open Unknowns

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| Exact claim show/rotate command names | Implementation detail, not architecture-defining. | Finalize during implementation while preserving launcher-owned claim generation/rotation contract. | Non-blocking. |
| UI copy for claim registration and advertised URL errors | Implementation detail. | Finalize during implementation with docs/tests. | Non-blocking. |
| Backend direct terminal/API hardening | Important long-term security. | Keep in Phase Two future ticket unless a small safe direct deny is included opportunistically. | Explicitly deferred / non-blocking for Phase One. |

## Review Decision

Pass: the round 2 design is ready for implementation.

The design now provides an actionable Phase One architecture: mobile-safe Docker profile with explicit claim generation, claim-backed remote Phone Access management without weakening loopback trust, target Docker node ownership of Phone Access pairing/device records, verified Android-facing advertised URL, Android pairing against the Docker node, mobile work validation against Docker runtime, and clean-cut mobile Tools/Terminal/VNC removal. The Phase Two doc preserves the broader backend authorization/token/session hardening work without bloating this ticket.

## Findings

None.

## Classification

N/A — no blocking findings.

## Recommended Recipient

`implementation_engineer`

## Residual Risks

- Phase One still leaves broad mobile backend authorization and token/session hardening to Phase Two. This is documented and acceptable for this phase, but must not be treated as final maximum-security posture.
- Docker isolation reduces blast radius but is not a formal sandbox. Explicit host mounts, local model hosts, and compatibility profiles can re-expand risk and must be documented.
- Node-admin claims are sensitive local-owner secrets. Implementation must preserve the design's route limits, redaction, hash-only server/container custody, and Electron main-process storage boundary.
- Android reachability through private HTTPS/tunnel/Serve depends on user/network setup; validation must fail closed when same-node status proof fails.

## Latest Authoritative Result

- Review Decision: Pass
- Notes: Ready for implementation. Route cumulative package to `implementation_engineer`.
