# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/node-phone-setup-tab-revoked-cleanup/requirements.md`
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/node-phone-setup-tab-revoked-cleanup/investigation-notes.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/node-phone-setup-tab-revoked-cleanup/design-spec.md`
- Current Review Round: 6
- Trigger: Correction to the previous auto-detection proposal. User clarified that AutoByteus must not run Tailscale commands, even read-only status commands; Phone Setup remains instruction/copy-command driven and the user manually pastes the Tailscale Serve HTTPS MagicDNS `/mobile` URL into Phone Access.
- Prior Review Round Reviewed: Round 5 in this same canonical report path.
- Latest Authoritative Round: 6
- Current-State Evidence Basis:
  - Updated requirements, investigation notes, and design spec.
  - Prior round 1-5 review history in this report.
  - Artifact search confirmed the proposed auto-detection requirements/design artifacts were removed from requirements/design: no `REQ-008D`, `AC-009E`, `AC-009F`, `DS-006`, `TailscaleServeUrlDetector`, or `tailscale_serve_https` target remains in the authoritative requirements/design spec.
  - The design now explicitly keeps `GET /remote-access/address-candidates` on the existing candidate service and states it must not execute Tailscale commands or inspect local Tailscale state.
  - The round 5 implementation gap still applies: `phoneAccessStore`/`PhoneAccessCard` must not auto-select HTTP-only local/Tailscale-IP candidates as QR targets under HTTPS-required pairing.

Round rules:
- Round 1 finding IDs were rechecked and remain resolved.
- No new finding IDs were created in round 6.

## Round History

| Round | Trigger | Prior Unresolved Findings Rechecked | New Findings Found | Review Decision | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Initial design review | N/A | AR-001, AR-002 | Fail | No | Core active/revoked boundary was sound, but URL identity and HTTP exception ownership were under-specified. |
| 2 | Design Impact rework | AR-001, AR-002 | None | Pass | No | Revised design resolved base-vs-mobile URL identity and chose full HTTP blocking for new desktop-created pairing sessions. |
| 3 | macOS/Tailscale guide addendum | AR-001, AR-002 | None | Pass | No | Addendum added macOS CLI enablement and MagicDNS-vs-IP guidance. |
| 4 | macOS app-first command addendum | AR-001, AR-002 | None | Pass | No | Updated guide target made direct Tailscale.app executable commands the primary macOS Serve path. |
| 5 | HTTP-candidate auto-selection addendum | AR-001, AR-002 | None | Pass | No | Updated target makes the manual Serve HTTPS URL field the primary QR target and forbids auto-selecting HTTP-only local/Tailscale-IP candidates. |
| 6 | Manual-only Tailscale correction | AR-001, AR-002 | None | Pass | Yes | Auto-detection/process-inspection proposal is removed. AutoByteus shows instructions and validates user-provided HTTPS URL only; it must not run or inspect Tailscale state. |

## Reviewed Design Spec

The round 6 correction is architecturally sound. It removes an unnecessary and security-sensitive local-process boundary (`TailscaleServeUrlDetector` / `tailscale_serve_https`) before implementation, and it keeps the product flow inside existing owners: `PhoneSetupGuideCard` teaches the user-controlled Tailscale Serve/status steps, `PhoneAccessCard` presents the manual HTTPS URL field as the primary QR target input, `phoneAccessStore` normalizes and validates the user-provided URL before POST, and `RemoteAccessPairingService` remains the backend HTTPS defense-in-depth owner.

The correction also preserves the valid round 5 design change: interface-derived candidates such as `http://100.x.y.z:29695` or `http://192.168.x.x:29695` are diagnostics/advanced context only and must not be auto-selected as the QR target when HTTPS pairing is required. The address-candidate endpoint can continue reporting reachable addresses, but it must not execute Tailscale commands, inspect local Tailscale state, or try to infer the Serve HTTPS origin.

## Task Design Health Assessment Verdict

| Assessment Area | Result (`Pass`/`Fail`) | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Design still declares Bug Fix + Feature + UX Cleanup and records the user-controlled Tailscale setup correction. | None. |
| Root-cause classification is explicit and evidence-backed | Pass | Original classifications remain valid. Round 6 is a product/security/UX boundary correction: AutoByteus should not cross from instruction UI into local Tailscale process inspection. | None. |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | Correction removes the proposed new detector subsystem and uses existing guide/store/UI/pairing owners. | None. |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | File mapping, ownership boundaries, migration steps, and guidance explicitly keep address candidates passive and manual HTTPS entry primary. | None. |

## Prior Findings Resolution Check (Mandatory On Round >1)

| Prior Round | Finding ID | Previous Severity | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | AR-001 | High | Still resolved | Canonical `serverBaseUrl` vs derived `mobileUrl` remains intact; user-pasted `https://.../mobile` is normalized through existing web/server URL boundaries. | No reopened issue. |
| 1 | AR-002 | Medium | Still resolved | HTTP QR creation remains blocked in frontend/store and backend; HTTP candidate auto-selection remains forbidden. | No reopened issue. |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? (`Pass`/`Fail`) | Narrative Is Clear? (`Pass`/`Fail`) | Facade Vs Governing Owner Is Clear? (`Pass`/`Fail`/`N/A`) | Main Domain Subject Naming Is Clear? (`Pass`/`Fail`) | Ownership Is Clear? (`Pass`/`Fail`) | Off-Spine Concerns Stay Off Main Line? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Active paired-device list | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 | Revoke refresh return path | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 | Node settings tab composition | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-004 | HTTPS setup and URL identity, including manual Serve HTTPS URL as primary QR target | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-005 | Active/revoked sub-view | Pass | Pass | N/A | Pass | Pass | Pass | Pass |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? (`Pass`/`Fail`) | Reuse / Extend / Create-New Decision Is Sound? (`Pass`/`Fail`) | Supports The Right Spine Owners? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Server remote access | Pass | Pass | Pass | Pass | No Tailscale process detector is introduced; pairing service keeps HTTPS/base-mobile contracts and candidate service remains passive. |
| Web phone access store | Pass | Pass | Pass | Pass | `phoneAccessStore` remains the owner for default target selection, URL normalization, HTTPS filtering, and no-POST validation. |
| Web phone access UI | Pass | Pass | Pass | Pass | `PhoneAccessCard` remains the owner for manual field primacy, warnings, QR creation controls, and diagnostic treatment of HTTP candidates. |
| Web phone setup guide | Pass | Pass | Pass | Pass | `PhoneSetupGuideCard` shows user-run commands and instructions, not app-run command automation. |
| Web URL utilities | Pass | Pass | Pass | Pass | Existing normalizer owns `/mobile` stripping and canonical base identity. |
| Localization/docs/tests | Pass | Pass | Pass | Pass | Addendum can be implemented through copy/tests without a new backend process-integration subsystem. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? (`Pass`/`Fail`) | Shared File Choice Is Sound? (`Pass`/`Fail`/`N/A`) | Ownership Of Shared Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Candidate default-selection policy | Pass | Pass | Pass | Pass | Belongs in `phoneAccessStore`, not scattered through components or backend address discovery. |
| HTTPS URL validation/error state | Pass | Pass | Pass | Pass | Store validation and card warning display remain the correct split. |
| Base vs mobile URL conversion | Pass | Pass | Pass | Pass | Manual Serve HTTPS URL continues through web/server normalizers. |
| Phone setup command/link metadata | Pass | Pass | Pass | Pass | Keeps user-run command text testable without executing commands. |
| Device state filtering | Pass | Pass | Pass | Pass | Unchanged; active/revoked semantics belong in `PairedDeviceService`. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Pass`/`Fail`) | Redundant Attributes Removed? (`Pass`/`Fail`) | Overlapping Representation Risk Is Controlled? (`Pass`/`Fail`) | Shared Core Vs Specialized Variant / Composition Decision Is Sound? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `RemoteAccessUrlCandidate.serverBaseUrl` | Pass | Pass | Pass | N/A | Pass | Candidate URL remains an observed/discovered address, not a proven Tailscale Serve HTTPS origin or recommended QR target. |
| `phoneAccessStore.selectedServerBaseUrl` | Pass | Pass | Pass | N/A | Pass | Should default only to HTTPS candidates or stay empty for manual entry. |
| `RemoteAccessPairingPayload.serverBaseUrl` | Pass | Pass | Pass | Pass | Pass | Canonical internal API base only; no `/mobile`. |
| `CreatePairingSessionResult.mobileUrl` | Pass | Pass | Pass | Pass | Pass | Derived mobile shell URL only. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? (`Pass`/`Fail`) | Replacement Owner / Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Removal / Decommission Scope Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Auto-detection proposal (`REQ-008D`, `AC-009E/F`, `DS-006`) | Pass | Pass | Pass | Pass | Removed from authoritative requirements/design. User-controlled manual flow is the replacement. |
| `TailscaleServeUrlDetector` / `tailscale_serve_https` candidate | Pass | Pass | Pass | Pass | Must not be implemented; address candidates remain passive and do not run/inspect Tailscale. |
| HTTP candidate auto-selection as QR target | Pass | Pass | Pass | Pass | Replaced by HTTPS-only default selection or empty manual-required state. |
| HTTP local/Tailscale-IP candidates as recommended next step | Pass | Pass | Pass | Pass | Replaced by manual Serve HTTPS URL instruction; HTTP candidates are diagnostics only. |
| Active list showing revoked rows | Pass | Pass | Pass | Pass | Unchanged. |
| `/mobile` preserved in `serverBaseUrl` | Pass | Pass | Pass | Pass | Unchanged. |
| HTTP QR/pairing-session creation | Pass | Pass | Pass | Pass | Unchanged; no acknowledgement escape hatch. |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? (`Pass`/`Fail`) | Responsibility Matches The Intended Owner/Boundary? (`Pass`/`Fail`) | Responsibilities Were Re-Tightened After Shared-Structure Extraction? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/remote-access/services/address-candidate-service.ts` | Pass | Pass | Pass | Pass | Returns passive address candidates only; must not execute or inspect Tailscale. |
| `autobyteus-server-ts/src/remote-access/services/remote-access-pairing-service.ts` | Pass | Pass | Pass | Pass | Owns HTTPS defense-in-depth and base/mobile pairing URL contract. |
| `autobyteus-web/stores/phoneAccessStore.ts` | Pass | Pass | Pass | Pass | Owns HTTPS-only default target selection and no-POST validation. |
| `autobyteus-web/components/settings/PhoneAccessCard.vue` | Pass | Pass | Pass | Pass | Owns manual field primacy, warning text, and de-emphasized diagnostic candidates. |
| `autobyteus-web/components/settings/PhoneSetupGuideCard.vue` | Pass | Pass | Pass | Pass | Owns user-run Tailscale instructions and post-Serve “paste HTTPS URL plus `/mobile`” guidance. |
| `autobyteus-web/utils/phoneSetupGuideCommands.ts` | Pass | Pass | Pass | Pass | Owns command text as display/copy metadata only; not command execution. |
| `autobyteus-web/localization/messages/en/settings.ts` / `zh-CN/settings.ts` | Pass | Pass | N/A | Pass | Own new user-facing manual-only/candidate copy. |
| `autobyteus-web/docs/remote_access.md` / `settings.md` | Pass | Pass | N/A | Pass | Own durable docs for user-controlled Serve setup and HTTPS URL entry. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? (`Pass`/`Fail`) | Forbidden Shortcuts Are Explicit? (`Pass`/`Fail`) | Direction Is Coherent With Ownership? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `PhoneSetupGuideCard` | Pass | Pass | Pass | Pass | May display/copy commands; must not execute Tailscale commands. |
| `AddressCandidateService` / address-candidates endpoint | Pass | Pass | Pass | Pass | Must not execute Tailscale commands, parse local Tailscale status, or emit a fabricated Serve HTTPS candidate. |
| `phoneAccessStore` | Pass | Pass | Pass | Pass | May inspect candidate protocol and selected/manual URL; must not treat all discovered candidates as valid recommended QR targets. |
| `PhoneAccessCard` | Pass | Pass | Pass | Pass | Component displays selection guidance and uses store validation; it does not bypass store validation. |
| `RemoteAccessPairingService` | Pass | Pass | Pass | Pass | Backend remains HTTPS defense-in-depth and does not depend on local Tailscale state. |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? (`Pass`/`Fail`) | Internal Owned Mechanisms Stay Internal? (`Pass`/`Fail`) | Caller Bypass Risk Is Controlled? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `PhoneSetupGuideCard` command metadata | Pass | Pass | Pass | Pass | User-facing copy/copy-buttons only; no hidden process execution path. |
| `GET /remote-access/address-candidates` | Pass | Pass | Pass | Pass | Passive candidate endpoint; no Tailscale command integration boundary. |
| `phoneAccessStore.selectDefaultCandidate` / equivalent selection path | Pass | Pass | Pass | Pass | Must prefer HTTPS candidates only or leave selection empty. |
| `phoneAccessStore.selectedUrlValidation` / `createPairingSession()` | Pass | Pass | Pass | Pass | Enforces HTTPS before API POST. |
| `PhoneAccessCard` manual URL field | Pass | Pass | Pass | Pass | Primary QR target input after Serve. |
| Web/server `normalizeNodeBaseUrl()` | Pass | Pass | Pass | Pass | Manual `https://.../mobile` remains normalized through existing boundary. |
| `RemoteAccessPairingService.createPairingSession()` | Pass | Pass | Pass | Pass | HTTPS enforcement remains service-owned. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? (`Pass`/`Fail`) | Responsibility Is Singular? (`Pass`/`Fail`) | Identity Shape Is Explicit? (`Pass`/`Fail`) | Generic Boundary Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- |
| `GET /remote-access/address-candidates` | Pass | Pass | Pass | Low | Pass |
| `phoneAccessStore` default target selection | Pass | Pass | Pass | Low | Pass |
| Manual Serve HTTPS URL field | Pass | Pass | Pass | Low | Pass |
| Selected URL validation / `createPairingSession()` | Pass | Pass | Pass | Low | Pass |
| Round 2 active/revoked and pairing interfaces | Pass | Pass | Pass | Low | Pass |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? (`Pass`/`Fail`) | Folder Matches Owning Boundary? (`Pass`/`Fail`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| No `TailscaleServeUrlDetector` path | Pass | Pass | Low | Pass | Correctly absent under the manual-only product decision. |
| `autobyteus-server-ts/src/remote-access/services/address-candidate-service.ts` | Pass | Pass | Low | Pass | Correct passive candidate owner. |
| `autobyteus-web/stores/phoneAccessStore.ts` | Pass | Pass | Low | Pass | Correct owner for default candidate policy. |
| `autobyteus-web/components/settings/PhoneAccessCard.vue` | Pass | Pass | Low | Pass | Correct owner for QR-target UI guidance. |
| `autobyteus-web/components/settings/PhoneSetupGuideCard.vue` | Pass | Pass | Low | Pass | Correct owner for post-Serve guide instructions. |
| Localization/docs/tests | Pass | Pass | Low | Pass | Correct durable text and validation locations. |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? (`Pass`/`Fail`) | Reuse / Extension Decision Is Sound? (`Pass`/`Fail`) | New Support Piece Is Justified? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| User-controlled Tailscale setup instructions | Pass | Pass | N/A | Pass | Uses `PhoneSetupGuideCard` and command metadata; no process automation. |
| HTTP-only candidate default prevention | Pass | Pass | N/A | Pass | Extends `phoneAccessStore` rather than changing address discovery. |
| Manual Serve HTTPS QR target path | Pass | Pass | N/A | Pass | Extends `PhoneAccessCard` and guide copy. |
| Existing active/revoked and URL-contract design | Pass | Pass | N/A | Pass | Unchanged. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? (`Yes`/`No`) | Clean-Cut Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- |
| Auto-detecting Tailscale Serve HTTPS by running status commands | No | Pass | Pass | Cleanly rejected before implementation. |
| Auto-selecting HTTP-only candidates as QR target | No | Pass | Pass | Cleanly rejected under HTTPS-required setup. |
| HTTP new QR/pairing-session creation | No | Pass | Pass | Unchanged. |
| Active list showing revoked rows | No | Pass | Pass | Unchanged. |

## Migration / Refactor Safety Verdict

| Area | Sequence Is Realistic? (`Pass`/`Fail`) | Temporary Seams Are Explicit? (`Pass`/`Fail`) | Cleanup / Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- |
| Remove/avoid any auto-detection implementation | Pass | Pass | Pass | Pass |
| Store default selection update | Pass | Pass | Pass | Pass |
| Manual URL primary UI update | Pass | Pass | Pass | Pass |
| Candidate diagnostic labeling | Pass | Pass | Pass | Pass |
| Tests for no Tailscale process execution, HTTP-only candidates, and manual HTTPS | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? (`Yes`/`No`) | Example Is Present And Clear? (`Pass`/`Fail`/`N/A`) | Bad / Avoided Shape Is Explained When Helpful? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Manual-only Tailscale flow | Yes | Pass | Pass | Pass | Requirements/design state AutoByteus shows instructions; user runs commands and pastes `https://<MagicDNS>/mobile`. |
| HTTP-only candidates not auto-selected | Yes | Pass | Pass | Pass | Requirements include `http://100.127.30.107:29695` and `http://192.168.x.x:29695` examples. |
| 100.x Tailscale private IP vs Serve HTTPS origin | Yes | Pass | Pass | Pass | Design explicitly distinguishes private IP diagnostics from HTTPS Serve origin. |
| Base vs mobile URL | Yes | Pass | Pass | Pass | Still clear. |
| HTTPS pairing validation | Yes | Pass | Pass | Pass | Still clear. |

## Missing Use Cases / Open Unknowns

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| User asks AutoByteus to infer Serve HTTPS URL | Would require local Tailscale command execution/inspection, which user rejected. | Keep the flow manual/user-controlled; do not add detector service or process calls. | Resolved in design. |
| Only HTTP local/Tailscale-IP candidates are available | Current draft can select a misleading HTTP QR target by default. | Store must leave QR target empty and instruct manual Serve HTTPS paste. | Resolved in design. |
| User sees `http://100.x.y.z:29695` after Serve is running | This is the Tailscale private IPv4 address, not Serve HTTPS origin. | UI/docs must label it diagnostic/advanced and direct user to Serve status/MagicDNS HTTPS URL. | Resolved in design. |
| Serve status prints HTTPS host without `/mobile` | User needs to know to append `/mobile` for AutoByteus phone shell. | Guide/card copy must say paste the HTTPS URL plus `/mobile`; normalizer accepts `/mobile` input. | Resolved in design. |

## Review Decision

- `Pass`: the corrected design package is ready for implementation/continuation.

## Findings

None.

## Classification

N/A — no open design-review findings.

## Recommended Recipient

`implementation_engineer`

## Residual Risks

- If any implementation work already started from the discarded auto-detection proposal, remove it before code review. Do not add a Tailscale process runner, `TailscaleServeUrlDetector`, `tailscale_serve_https` candidate, or `status --json` inspection path.
- Existing draft code previously had a `selectDefaultCandidate()` shape that preferred non-loopback candidates without checking HTTPS; implementation must update that path to satisfy the round 5/6 target.
- If an HTTPS candidate is genuinely available without local Tailscale inspection, selecting it by default is acceptable; otherwise the selection should remain empty and the manual Serve HTTPS field should drive QR creation.
- Keep HTTP address candidates available only as diagnostics/advanced context if retained; do not let them look like the recommended path.
- The UI should be explicit that `:29695` belongs to local HTTP/interface diagnostics, while the Serve HTTPS URL from MagicDNS/status is the QR target and should usually be `https://<machine>.<tailnet>.ts.net/mobile` without `:29695`.

## Latest Authoritative Result

- Review Decision: Pass
- Notes: Round 6 correction is ready. Hand off the updated cumulative package to `implementation_engineer`. Implementation should follow the manual-only Tailscale setup flow, avoid any Tailscale command execution/inspection by AutoByteus, and retain the HTTPS-required/manual URL/candidate-selection fixes from prior approved rounds.
