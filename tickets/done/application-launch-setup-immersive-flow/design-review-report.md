# Design Review Report

Write this artifact to a canonical file path in the assigned task workspace before any handoff message.

Keep one canonical design-review report path across reruns.
Do not create versioned copies by default.
On round `>1`, recheck prior unresolved findings first, update the prior-findings resolution section, and then record the new round result.
The latest round is authoritative; earlier rounds remain history.

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-launch-setup-immersive-flow/tickets/in-progress/application-launch-setup-immersive-flow/requirements.md`
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-launch-setup-immersive-flow/tickets/in-progress/application-launch-setup-immersive-flow/investigation-notes.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-launch-setup-immersive-flow/tickets/in-progress/application-launch-setup-immersive-flow/design-spec.md`
- Current Review Round: `3`
- Trigger: Rerun after live local validation exposed a new lifecycle/reveal design gap: hosted apps could still visibly show pre-bootstrap placeholder copy after `Enter application`.
- Prior Review Round Reviewed: `2`
- Latest Authoritative Round: `3`
- Current-State Evidence Basis: `ApplicationShell.vue`, `ApplicationSurface.vue`, `ApplicationIframeHost.vue`, `applicationHostStore.ts`, `appLayoutStore.ts`, `layouts/default.vue`, `applications/brief-studio/frontend-src/index.html`, `applications/brief-studio/frontend-src/brief-studio-runtime.js`, prior review report, and revised investigation/design artifacts in the dedicated worktree.

Round rules:
- Reuse the same finding IDs across reruns for the same unresolved design-review issues.
- Create new finding IDs only for newly discovered issues.

## Round History

| Round | Trigger | Prior Unresolved Findings Rechecked | New Findings Found | Review Decision | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Initial design review | N/A | 1 | Fail | No | Core structure was sound, but the host-launch reuse/invalidation contract was ambiguous. |
| 2 | Revised design spec after `AR-LAUNCH-IMM-001` | 1 | 0 | Pass | No | Revised spec defined a deterministic route-visit-scoped, setup-agnostic host-launch lifetime contract. |
| 3 | Rerun after live validation exposed visible pre-bootstrap homepage copy | 0 | 0 | Pass | Yes | Revised spec now adds a deterministic shell/surface reveal contract without redesigning the iframe/bootstrap protocol. |

## Reviewed Design Spec

The revised design cleanly absorbs the new live-validation gap into the existing ownership model instead of scattering lifecycle logic across layers. `ApplicationShell.vue` remains the governing route owner for setup vs immersive phase and for the pre-`launchInstanceId` immersive loading/failure state. `ApplicationSurface.vue` remains the authoritative iframe/bootstrap owner after a `launchInstanceId` exists, and it now explicitly owns the hidden-until-bootstrapped reveal gate. The design also correctly preserves the previously reviewed contract that host bootstrap completes at bootstrap-envelope delivery; it does not invent a new app-ready protocol. This gives one deterministic visible lifecycle: `setup -> immersive launch/bootstrap transition -> immersive app-ready view`, while keeping bootstrap failures inside the transition state rather than leaking them into the homepage.

## Prior Findings Resolution Check (Mandatory On Round >1)

| Prior Round | Finding ID | Previous Severity | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | `AR-LAUNCH-IMM-001` | High | Still resolved | `design-spec.md:102-148` still preserves the mandatory route-visit-scoped host-launch contract, and `applicationHostStore.ts:9-17`, `70-87`, `115-165` still match that setup-agnostic store boundary. | No regression on the earlier host-launch finding. |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? (`Pass`/`Fail`) | Narrative Is Clear? (`Pass`/`Fail`) | Facade Vs Governing Owner Is Clear? (`Pass`/`Fail`/`N/A`) | Main Domain Subject Naming Is Clear? (`Pass`/`Fail`) | Ownership Is Clear? (`Pass`/`Fail`) | Off-Spine Concerns Stay Off Main Line? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `DS-LAUNCH-IMM-001` | Setup-first route entry | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| `DS-LAUNCH-IMM-002` | Enter -> immersive transition -> reveal gate -> app-ready canvas | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| `DS-LAUNCH-IMM-003` | Immersive trigger -> control panel interaction | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| `DS-LAUNCH-IMM-004` | Setup readiness loop | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| `DS-LAUNCH-IMM-005` | Hidden iframe bootstrap -> reveal-or-fail loop | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| `DS-LAUNCH-IMM-006` | Control-panel local interaction loop | Pass | Pass | N/A | Pass | Pass | Pass | Pass |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? (`Pass`/`Fail`) | Reuse / Extend / Create-New Decision Is Sound? (`Pass`/`Fail`) | Supports The Right Spine Owners? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `components/applications` | Pass | Pass | Pass | Pass | `ApplicationShell.vue`, `ApplicationImmersiveControlPanel.vue`, `ApplicationLaunchSetupPanel.vue`, and `ApplicationSurface.vue` now divide route, setup, panel, and reveal responsibilities coherently. |
| `stores` + `layouts` (`applicationHostStore.ts`, `appLayoutStore.ts`, `layouts/default.vue`) | Pass | Pass | Pass | Pass | Existing authoritative boundaries are reused rather than bypassed or redefined. |
| Existing iframe/bootstrap contract (`ApplicationIframeHost.vue` + contracts/types) | Pass | Pass | Pass | Pass | The design intentionally reuses the existing reviewed bootstrap boundary instead of creating a new readiness protocol. |
| `localization/messages` + `docs` | Pass | Pass | Pass | Pass | Touched copy and docs remain correctly scoped as supporting work. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? (`Pass`/`Fail`) | Shared File Choice Is Sound? (`Pass`/`Fail`/`N/A`) | Ownership Of Shared Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Route phase keys and immersive panel disclosure state | Pass | N/A | N/A | Pass | These remain correctly local to their focused owners. |
| `ApplicationHostLaunchState` compatibility metadata | Pass | Pass | Pass | Pass | The revised reveal work does not regress into mixed launch+setup compatibility state. |
| New post-bootstrap app-ready protocol | Pass | Pass | Pass | Pass | Correctly rejected from this ticket; reveal gating is layered around the existing bootstrap contract instead. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Pass`/`Fail`) | Redundant Attributes Removed? (`Pass`/`Fail`) | Overlapping Representation Risk Is Controlled? (`Pass`/`Fail`) | Shared Core Vs Specialized Variant / Composition Decision Is Sound? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `ApplicationHostLaunchState` as setup-agnostic host-launch state | Pass | Pass | Pass | N/A | Pass | Still correctly scoped to backend readiness + launch identity + teardown. |
| Existing iframe/bootstrap contract as the reveal boundary | Pass | Pass | Pass | N/A | Pass | The design keeps one boundary: bootstrap delivery ends host bootstrap; later app-local loading stays app-owned. |
| `ApplicationLaunchSetupPanel.presentation` (`'page' | 'panel'`) | Pass | Pass | Pass | Pass | Pass | Presentation-only variant remains tight. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? (`Pass`/`Fail`) | Replacement Owner / Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Removal / Decommission Scope Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Mixed post-entry stacked route layout in `ApplicationShell.vue` | Pass | Pass | Pass | Pass | Clean-cut removal remains explicit. |
| Default page-level `Reload` / `Details` chrome after entry | Pass | Pass | Pass | Pass | Correctly remains secondary immersive chrome. |
| User-visible pre-bootstrap homepage exposure such as `Waiting for the host bootstrap payload…` | Pass | Pass | Pass | Pass | The design explicitly names this leak for removal via the `ApplicationSurface.vue` reveal gate, with touched sample-app cleanup only when needed. |
| Stale removed-flow localization keys | Pass | N/A | Pass | Pass | Still non-blocking, but touched copy should be cleaned intentionally during implementation. |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? (`Pass`/`Fail`) | Responsibility Matches The Intended Owner/Boundary? (`Pass`/`Fail`) | Responsibilities Were Re-Tightened After Shared-Structure Extraction? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/applications/ApplicationShell.vue` | Pass | Pass | N/A | Pass | Correct owner for route phase, host-launch loading/failure before `launchInstanceId`, route actions, and layout synchronization. |
| `autobyteus-web/components/applications/ApplicationImmersiveControlPanel.vue` | Pass | Pass | N/A | Pass | Correct focused owner for trigger/panel/disclosure/resize interaction. |
| `autobyteus-web/components/applications/ApplicationLaunchSetupPanel.vue` | Pass | Pass | N/A | Pass | Correct authoritative setup owner in both `page` and `panel` presentations. |
| `autobyteus-web/components/applications/ApplicationSurface.vue` | Pass | Pass | N/A | Pass | Correct authoritative owner for hidden-while-pending bootstrap, reveal gating, retry/failure, and post-success canvas reveal. |
| `autobyteus-web/components/applications/__tests__/ApplicationSurface.spec.ts` | Pass | Pass | N/A | Pass | Correct direct test home for the new reveal contract. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? (`Pass`/`Fail`) | Forbidden Shortcuts Are Explicit? (`Pass`/`Fail`) | Direction Is Coherent With Ownership? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `ApplicationShell.vue` -> presenters / stores | Pass | Pass | Pass | Pass | Route-owner dependency direction remains explicit and coherent. |
| `ApplicationImmersiveControlPanel.vue` emitter-only boundary | Pass | Pass | Pass | Pass | No direct routing/store bypass is normalized. |
| `ApplicationShell.vue` -> `ApplicationSurface.vue` | Pass | Pass | Pass | Pass | The shell stops at `launchInstanceId` handoff and does not absorb iframe/reveal internals. |
| `ApplicationSurface.vue` -> existing iframe/bootstrap contract | Pass | Pass | Pass | Pass | The surface reuses the existing ready/bootstrap handshake without redefining the protocol. |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? (`Pass`/`Fail`) | Internal Owned Mechanisms Stay Internal? (`Pass`/`Fail`) | Caller Bypass Risk Is Controlled? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `ApplicationShell.vue` | Pass | Pass | Pass | Pass | Good route-level authority. |
| `ApplicationLaunchSetupPanel.vue` | Pass | Pass | Pass | Pass | Good setup boundary reuse. |
| `appLayoutStore.ts` -> `layouts/default.vue` | Pass | Pass | Pass | Pass | Good authoritative immersive suppression boundary. |
| `ApplicationSurface.vue` | Pass | Pass | Pass | Pass | Good iframe/bootstrap encapsulation, with reveal gating kept inside the same owner. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? (`Pass`/`Fail`) | Responsibility Is Singular? (`Pass`/`Fail`) | Identity Shape Is Explicit? (`Pass`/`Fail`) | Generic Boundary Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- |
| `ApplicationLaunchSetupPanel.presentation` | Pass | Pass | Pass | Low | Pass |
| `applicationHostStore.startLaunch(applicationId)` | Pass | Pass | Pass | Low | Pass |
| `applicationHostStore.clearLaunchState(applicationId)` | Pass | Pass | Pass | Low | Pass |
| `ApplicationImmersiveControlPanel` emitted intents | Pass | Pass | Pass | Low | Pass |
| `appLayoutStore.setHostShellPresentation(...)` | Pass | Pass | Pass | Low | Pass |
| `ApplicationSurface.vue` reveal gate over the existing `bootstrapDelivered` boundary | Pass | Pass | Pass | Low | Pass |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? (`Pass`/`Fail`) | Folder Matches Owning Boundary? (`Pass`/`Fail`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/applications/ApplicationImmersiveControlPanel.vue` | Pass | Pass | Low | Pass | Correct route-local presenter placement. |
| `autobyteus-web/components/applications/ApplicationShell.vue` | Pass | Pass | Low | Pass | Existing route-owner placement remains correct. |
| `autobyteus-web/components/applications/ApplicationSurface.vue` | Pass | Pass | Low | Pass | Reveal gate belongs with the existing surface owner rather than in shell/layout/sample app code. |
| `autobyteus-web/localization/messages/*/applications.ts` and `autobyteus-web/docs/applications.md` | Pass | Pass | Low | Pass | Correct off-spine placement. |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? (`Pass`/`Fail`) | Reuse / Extension Decision Is Sound? (`Pass`/`Fail`) | New Support Piece Is Justified? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Reuse setup owner | Pass | Pass | N/A | Pass | `ApplicationLaunchSetupPanel.vue` remains the authoritative setup owner. |
| Reuse immersive layout boundary | Pass | Pass | N/A | Pass | `appLayoutStore.ts` + `layouts/default.vue` remain the authoritative outer shell boundary. |
| Reuse existing iframe/bootstrap protocol | Pass | Pass | N/A | Pass | Correctly retained; no protocol redesign is introduced in this UX ticket. |
| Extend `ApplicationSurface.vue` with reveal gating | Pass | Pass | N/A | Pass | Correct owner extension; no new competing lifecycle owner is introduced. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? (`Yes`/`No`) | Clean-Cut Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- |
| Current mixed route layout | No | Pass | Pass | Correctly rejected as a long-lived fallback. |
| Visible pre-bootstrap homepage placeholder as normal immersive state | No | Pass | Pass | Correctly rejected as acceptable hosted UX. |
| Obsolete localization/session wording | Yes | Pass | Pass | Residual cleanup exists, but no blocking legacy runtime path remains in the design. |

## Migration / Refactor Safety Verdict

| Area | Sequence Is Realistic? (`Pass`/`Fail`) | Temporary Seams Are Explicit? (`Pass`/`Fail`) | Cleanup / Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- |
| Setup-phase -> immersive-phase route refactor | Pass | Pass | Pass | Pass |
| Visit-scoped host-launch cleanup contract | Pass | Pass | Pass | Pass |
| `ApplicationSurface.vue` reveal-gate extension | Pass | Pass | Pass | Pass |
| Immersive layout reset on exit / route unmount | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? (`Yes`/`No`) | Example Is Present And Clear? (`Pass`/`Fail`/`N/A`) | Bad / Avoided Shape Is Explained When Helpful? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Immersive post-entry control behavior | Yes | Pass | Pass | Pass | Good interaction example remains intact. |
| Authoritative layout boundary reuse | Yes | Pass | Pass | Pass | Good boundary example remains intact. |
| Ready-launch lifetime contract | Yes | Pass | Pass | Pass | Previously added contract remains clear and non-regressed. |
| Bootstrap reveal gating | Yes | Pass | Pass | Pass | The new example clearly distinguishes hidden bootstrap transition vs visible homepage leak. |

## Missing Use Cases / Open Unknowns

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| None | N/A | N/A | Closed |

## Review Decision

- `Pass`: the design is ready for implementation.
- `Fail`: the design needs upstream rework before implementation should proceed.
- `Blocked`: the review cannot finish because required input, evidence, or clarification is missing.

**Review Decision: `Pass`**

## Findings

None.

## Classification

None — no actionable design-review findings remain.

## Recommended Recipient

`implementation_engineer`

## Residual Risks

- The reveal gate depends on being intentionally opaque; if implementation keeps a translucent overlay, pre-bootstrap business DOM can still bleed through visually.
- The host-side reveal gate is the authoritative prevention mechanism for this ticket. If a touched sample app still ships misleading host-bootstrap placeholder copy after reveal, that is app-local cleanup work, not a reason to move lifecycle ownership out of `ApplicationSurface.vue`.
- Fresh launch on every route visit still increases backend `ensure-ready` calls compared with speculative reuse, but that remains an intentional tradeoff for deterministic ownership in this scope.
- Touched localization should still be cleaned intentionally during implementation so removed-flow wording does not leak into the shipped UX.

## Latest Authoritative Result

- Review Decision: `Pass`
- Notes: The revised design resolves the live-validation lifecycle/reveal gap while preserving the reviewed host-launch and iframe/bootstrap boundaries.
