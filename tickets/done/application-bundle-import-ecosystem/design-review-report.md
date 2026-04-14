# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-import-ecosystem/tickets/in-progress/application-bundle-import-ecosystem/requirements.md`
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-import-ecosystem/tickets/in-progress/application-bundle-import-ecosystem/investigation-notes.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-import-ecosystem/tickets/in-progress/application-bundle-import-ecosystem/design-spec.md`
- Current Review Round: `7`
- Trigger: `Round-6 FAIL follow-up revision addressing DAR-005 with clean-cut backend capability initialization`
- Prior Review Round Reviewed: `6`
- Latest Authoritative Round: `7`
- Current-State Evidence Basis:
  - design principles + review template from `.codex/skills/autobyteus-architect-reviewer-e69b/`
  - prior authoritative design review report in the same ticket workspace
  - revised requirements, investigation notes, and design spec updated after round-6 fail
  - new rollout requirements `REQ-068`–`REQ-070` and acceptance criteria `AC-045`–`AC-047`
  - current `ApplicationBundleService` cache/refresh behavior in `autobyteus-server-ts/src/application-bundles/services/application-bundle-service.ts`

## Round History

| Round | Trigger | Prior Unresolved Findings Rechecked | New Findings Found | Review Decision | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Upstream package ready for design review | N/A | 2 | Fail | No | DAR-001 and DAR-002 blocked implementation readiness. |
| 2 | Upstream package revised for design review | Yes | 0 | Pass | No | DAR-001 and DAR-002 were resolved and the design became implementation-ready. |
| 3 | Validation-driven topology revision after packaged Electron mismatch | Yes | 0 | Pass | No | The revised topology cleanly reconciled packaged `file://` host delivery with backend-served bundle assets and the iframe contract. |
| 4 | User-approved product-model expansion on 2026-04-13 | Yes | 2 | Fail | No | DAR-003 and DAR-004 blocked implementation readiness. |
| 5 | Revision addressing DAR-003 and DAR-004 | Yes | 0 | Pass | No | Backend route/session binding and family-tight retained projections became implementation-ready. |
| 6 | Revision adding runtime Applications capability | Yes | 1 | Fail | No | DAR-005 blocked implementation readiness. |
| 7 | Revision addressing DAR-005 with backend-owned initialization | Yes | 0 | Pass | Yes | Runtime Applications capability now has clean-cut rollout semantics that preserve approved migration behavior. |

## Reviewed Design Spec

Round 7 closes the round-6 blocker at the correct boundary.

What changed in the right direction:

- `ApplicationCapabilityService` now explicitly owns one-time `ensureInitialized()` behavior when `ENABLE_APPLICATIONS` is absent.
- The cutover rule is now backend-owned and clean-cut: it seeds the missing persisted setting from current backend application discovery, writes the explicit result once, and then stops inferring.
- The design explicitly rejects legacy/frontend fallback and repeated dual-authority inference.
- Requirements and acceptance coverage now make the rollout behavior executable (`UC-029`, `REQ-068`–`REQ-070`, `AC-045`–`AC-047`).
- The dependency rule is now tight: `ApplicationCapabilityService` may touch `ApplicationBundleService` only for one-time missing-setting initialization, and callers above the capability boundary must not reproduce that logic.

This is the right fix shape for `DAR-005`. It preserves the approved migration behavior for already-discoverable applications, keeps the capability rollout backend-owned, and avoids reintroducing legacy frontend authority.

The prior round-5 session-binding, publication/projection, Application-vs-Execution, SDK, reference-app, and packaged Electron topology work all remain structurally sound.

## Prior Findings Resolution Check (Mandatory On Round >1)

| Prior Round | Finding ID | Previous Severity | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | `DAR-001` | High | Resolved | Same-bundle team integrity remains backend-owned in the revised design | Still resolved. |
| 1 | `DAR-002` | Medium | Resolved | The explicit iframe contract remains documented and topology-aware | Still resolved. |
| 4 | `DAR-003` | High | Resolved | `applicationSessionBinding(applicationId, requestedSessionId?)`, `activeSessionIdByApplicationId`, and route-binding requirements/acceptance remain in place | Still resolved. |
| 4 | `DAR-004` | High | Resolved | Family-specific input union, no free-form metadata, and family-tight retained projections remain in place | Still resolved. |
| 6 | `DAR-005` | High | Resolved | `ensureInitialized()` one-time discovery-seeded write, `REQ-068`–`REQ-070`, `AC-045`–`AC-047`, and explicit no-legacy cutover language | Round-7 revision correctly closes the rollout/migration gap behind the runtime Applications capability. |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? (`Pass`/`Fail`) | Narrative Is Clear? (`Pass`/`Fail`) | Facade Vs Governing Owner Is Clear? (`Pass`/`Fail`/`N/A`) | Main Domain Subject Naming Is Clear? (`Pass`/`Fail`) | Ownership Is Clear? (`Pass`/`Fail`) | Off-Spine Concerns Stay Off Main Line? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `DS-001` | package import/remove | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| `DS-002` | applications catalog/detail + asset paths | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| `DS-003` | application route/session binding | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| `DS-004` | application launch + active-session index | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| `DS-005` | publication -> retained projection -> UI | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| `DS-006` | Application vs Execution mode split | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| `DS-007` | iframe ready/bootstrap + SDK handoff | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| `DS-008` | runtime-details drill-down | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| `DS-009` | native edit of app-owned definitions | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| `DS-010` | runtime Applications capability + clean-cut cutover | Pass | Pass | Pass | Pass | Pass | Pass | Pass |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? (`Pass`/`Fail`) | Reuse / Extend / Create-New Decision Is Sound? (`Pass`/`Fail`) | Supports The Right Spine Owners? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/application-capability` | Pass | Pass | Pass | Pass | Correct owner for runtime/node-owned Applications availability plus one-time initialization. |
| `ApplicationsCapabilityStore` | Pass | Pass | Pass | Pass | Correct single frontend authority for nav/route/catalog capability consumption. |
| `autobyteus-server-ts/src/application-sessions` | Pass | Pass | Pass | Pass | Prior round-5 session authority remains sound. |
| `Application SDK` in `autobyteus-ts` | Pass | Pass | Pass | Pass | Remains correctly scoped. |
| reference app scope | Pass | Pass | Pass | Pass | Still right-sized. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? (`Pass`/`Fail`) | Shared File Choice Is Sound? (`Pass`/`Fail`/`N/A`) | Ownership Of Shared Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| runtime Applications capability transport/domain shape | Pass | Pass | Pass | Pass | Correctly centralized behind the dedicated capability subsystem. |
| capability initialization/cutover rule | Pass | Pass | Pass | Pass | Correctly centralized inside `ApplicationCapabilityService` instead of leaking into frontend or generic settings consumers. |
| backend active-session index + route-binding contract | Pass | Pass | Pass | Pass | Still correctly centralized behind `ApplicationSessionService`. |
| family-aware retained member/application projection shapes | Pass | Pass | Pass | Pass | Still correctly centralized behind backend models/projector. |
| iframe bootstrap constants / SDK wrapper | Pass | Pass | Pass | Pass | Still clean. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Pass`/`Fail`) | Redundant Attributes Removed? (`Pass`/`Fail`) | Overlapping Representation Risk Is Controlled? (`Pass`/`Fail`) | Shared Core Vs Specialized Variant / Composition Decision Is Sound? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `ApplicationsCapability` | Pass | Pass | Pass | Pass | Pass | The `source` variants now clearly distinguish persisted vs one-time initialization outcomes. |
| `ApplicationSessionBinding` | Pass | Pass | Pass | Pass | Pass | Still clear. |
| `PublishApplicationEventInputV1` discriminated union | Pass | Pass | Pass | Pass | Pass | Still clear. |
| `ApplicationMemberProjection` / `ApplicationDeliveryProjection` | Pass | Pass | Pass | Pass | Pass | Still clear. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? (`Pass`/`Fail`) | Replacement Owner / Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Removal / Decommission Scope Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| frontend-generated `applicationSessionId` + direct run launch | Pass | Pass | Pass | Pass | Prior removal direction remains explicit. |
| frontend-owned active-session lookup | Pass | Pass | Pass | Pass | Still correctly replaced by backend binding. |
| `runtimeConfig.public.enableApplications` packaged runtime gate | Pass | Pass | Pass | Pass | Now paired with an explicit clean-cut backend initialization rule that preserves migration behavior. |
| any legacy/frontend cutover fallback for Applications visibility | Pass | Pass | Pass | Pass | Correctly removed/rejected in favor of backend initialization. |
| collapsed `latestPublication` / `latestStatus` projection idea | Pass | Pass | Pass | Pass | Still correctly removed. |
| free-form metadata on publication payload v1 | Pass | Pass | Pass | Pass | Still correctly removed. |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? (`Pass`/`Fail`) | Responsibility Matches The Intended Owner/Boundary? (`Pass`/`Fail`) | Responsibilities Were Re-Tightened After Shared-Structure Extraction? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/application-capability/services/application-capability-service.ts` | Pass | Pass | N/A | Pass | Correct backend authority for runtime Applications capability and cutover initialization. |
| `autobyteus-server-ts/src/application-bundles/services/application-bundle-service.ts` | Pass | Pass | N/A | Pass | Correctly reused only for lightweight discovery summary during missing-setting initialization. |
| `autobyteus-server-ts/src/api/graphql/types/application-capability.ts` | Pass | Pass | N/A | Pass | Correct typed transport boundary. |
| `autobyteus-web/stores/applicationsCapabilityStore.ts` | Pass | Pass | Pass | Pass | Correct cache/consumer boundary for the bound window. |
| `autobyteus-web/stores/applicationSessionStore.ts` | Pass | Pass | Pass | Pass | Prior round-5 tightening remains intact. |
| `autobyteus-web/stores/applicationStore.ts` | Pass | Pass | Pass | Pass | Correctly gated by runtime capability instead of build-time config. |
| `autobyteus-web/components/settings/ApplicationsFeatureToggleCard.vue` | Pass | Pass | N/A | Pass | First-class settings control remains correctly called out. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? (`Pass`/`Fail`) | Forbidden Shortcuts Are Explicit? (`Pass`/`Fail`) | Direction Is Coherent With Ownership? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| shell/nav/route/catalog vs runtime Applications capability | Pass | Pass | Pass | Pass | Correctly depends on `ApplicationsCapabilityStore`, not `runtimeConfig` or generic settings rows. |
| `ApplicationsCapabilityStore` vs backend capability boundary | Pass | Pass | Pass | Pass | Correctly depends on `ApplicationCapabilityResolver` and node binding context. |
| `ApplicationCapabilityService` vs `ApplicationBundleService` | Pass | Pass | Pass | Pass | The one-time initialization dependency is now explicitly bounded and does not leak upward. |
| `ApplicationShell` / `ApplicationSessionStore` vs backend application-session boundary | Pass | Pass | Pass | Pass | Still correct. |
| SDK vs raw iframe contract | Pass | Pass | Pass | Pass | Still correct. |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? (`Pass`/`Fail`) | Internal Owned Mechanisms Stay Internal? (`Pass`/`Fail`) | Caller Bypass Risk Is Controlled? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `ApplicationCapabilityService` | Pass | Pass | Pass | Pass | Now owns both steady-state capability reads/writes and the one-time cutover initialization. |
| `ApplicationsCapabilityStore` | Pass | Pass | Pass | Pass | Correct single frontend runtime-capability owner. |
| `ApplicationSessionService` | Pass | Pass | Pass | Pass | Prior round-5 session-binding authority remains complete. |
| `ApplicationPublicationProjector` + retained state | Pass | Pass | Pass | Pass | Prior round-5 projection boundary remains complete. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? (`Pass`/`Fail`) | Responsibility Is Singular? (`Pass`/`Fail`) | Identity Shape Is Explicit? (`Pass`/`Fail`) | Generic Boundary Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- |
| `applicationsCapability()` | Pass | Pass | Pass | Low | Pass |
| `setApplicationsEnabled(enabled)` | Pass | Pass | Pass | Low | Pass |
| `applicationSessionBinding(applicationId, requestedSessionId?)` | Pass | Pass | Pass | Low | Pass |
| `publish_application_event` v1 discriminated union | Pass | Pass | Pass | Low | Pass |
| `bootstrapApplication()` SDK boundary | Pass | Pass | Pass | Low | Pass |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? (`Pass`/`Fail`) | Folder Matches Owning Boundary? (`Pass`/`Fail`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/application-capability` | Pass | Pass | Low | Pass | Correct dedicated backend placement. |
| `autobyteus-web/stores/applicationsCapabilityStore.ts` | Pass | Pass | Low | Pass | Correct runtime-capability cache placement. |
| `autobyteus-server-ts/src/application-sessions` | Pass | Pass | Low | Pass | Prior placement remains good. |
| `autobyteus-ts/src/application-sdk/*` | Pass | Pass | Low | Pass | Prior placement remains good. |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? (`Pass`/`Fail`) | Reuse / Extension Decision Is Sound? (`Pass`/`Fail`) | New Support Piece Is Justified? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| server settings as persistence/control substrate | Pass | Pass | N/A | Pass | Correctly reused through a typed capability boundary instead of direct shell coupling. |
| application bundle discovery for clean-cut cutover | Pass | Pass | N/A | Pass | Current `ApplicationBundleService` already has authoritative cache/refresh semantics that can support the lightweight discovery summary safely. |
| underlying agent/team run launch | Pass | Pass | N/A | Pass | Still correctly reused beneath application sessions. |
| existing runtime/workspace inspection UI | Pass | Pass | N/A | Pass | Still correctly reused. |
| new application capability subsystem | Pass | Pass | Pass | Pass | Justified by per-node runtime enablement. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? (`Yes`/`No`) | Clean-Cut Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- |
| frontend-only application session model | No | Pass | Pass | Prior clean-cut removal remains explicit. |
| raw iframe postMessage authoring surface | No | Pass | Pass | Prior clean-cut removal remains explicit. |
| build-time Applications enablement -> runtime Applications capability | No | Pass | Pass | The rollout is now clean-cut and backend-owned after the initialization write. |

## Migration / Refactor Safety Verdict

| Area | Sequence Is Realistic? (`Pass`/`Fail`) | Temporary Seams Are Explicit? (`Pass`/`Fail`) | Cleanup / Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- |
| runtime Applications capability rollout | Pass | Pass | Pass | Pass |
| backend session-boundary + route-binding rollout | Pass | Pass | Pass | Pass |
| publication/projection rollout | Pass | Pass | Pass | Pass |
| host-shell/Application-vs-Execution rollout | Pass | Pass | Pass | Pass |
| SDK + reference-app rollout | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? (`Yes`/`No`) | Example Is Present And Clear? (`Pass`/`Fail`/`N/A`) | Bad / Avoided Shape Is Explained When Helpful? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| per-window runtime Applications visibility | Yes | Pass | Pass | Pass | Good steady-state example. |
| clean-cut capability cutover for already-discoverable applications | Yes | Pass | Pass | Pass | The new initialization example clearly shows absent setting -> discovery check -> persisted true -> steady-state persisted authority. |
| application session reattachment after page refresh | Yes | Pass | Pass | Pass | Still clear. |
| publication flow including member artifact + progress coexistence | Yes | Pass | Pass | Pass | Still clear. |

## Missing Use Cases / Open Unknowns

None.

## Review Decision

- `Pass`: the design is ready for implementation.

## Findings

None.

## Classification

- `None`

## Recommended Recipient

- `implementation_engineer`

## Residual Risks

- Downstream validation should explicitly cover both initialization outcomes: discovered-applications -> seeded true, and empty-catalog -> seeded false.
- Downstream validation should still cover node switch, disabled/error startup states, and stale catalog clearing across bound-node changes.
- Preserve the prior packaged Electron topology fix while layering runtime capability gating over Applications routes and asset fetch behavior.
- Keep route/query naming consistent for application-session reattachment, and validate `requested_live`, `application_active`, and `none` outcomes.
- Keep artifact + progress coexistence covered in validation so the round-5 projection contract does not regress during implementation.

## Latest Authoritative Result

- Review Decision: `Pass`
- Notes:
  - DAR-005 is resolved.
  - The runtime Applications capability now has clean-cut backend-owned rollout semantics that preserve approved migration behavior.
  - Prior DAR-003 and DAR-004 remain resolved.
  - No new blocking design issues were found in this round.
