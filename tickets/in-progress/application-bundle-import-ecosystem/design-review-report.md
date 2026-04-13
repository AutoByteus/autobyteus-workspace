# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-import-ecosystem/tickets/in-progress/application-bundle-import-ecosystem/requirements.md`
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-import-ecosystem/tickets/in-progress/application-bundle-import-ecosystem/investigation-notes.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-bundle-import-ecosystem/tickets/in-progress/application-bundle-import-ecosystem/design-spec.md`
- Current Review Round: `5`
- Trigger: `Round-4 FAIL follow-up revision addressing DAR-003 and DAR-004`
- Prior Review Round Reviewed: `4`
- Latest Authoritative Round: `5`
- Current-State Evidence Basis:
  - design principles + review template from `.codex/skills/autobyteus-architect-reviewer-e69b/`
  - prior authoritative design review report in the same ticket workspace
  - revised requirements, investigation notes, and design spec updated after round-4 fail
  - new requirements/acceptance coverage for route binding and family-tight projection (`REQ-055`–`REQ-060`, `AC-036`–`AC-039`)

## Round History

| Round | Trigger | Prior Unresolved Findings Rechecked | New Findings Found | Review Decision | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Upstream package ready for design review | N/A | 2 | Fail | No | DAR-001 and DAR-002 blocked implementation readiness. |
| 2 | Upstream package revised for design review | Yes | 0 | Pass | No | DAR-001 and DAR-002 were resolved and the design became implementation-ready. |
| 3 | Validation-driven topology revision after packaged Electron mismatch | Yes | 0 | Pass | No | The revised topology cleanly reconciled packaged `file://` host delivery with backend-served bundle assets and the iframe contract. |
| 4 | User-approved product-model expansion on 2026-04-13 | Yes | 2 | Fail | No | DAR-003 and DAR-004 blocked implementation readiness. |
| 5 | Revision addressing DAR-003 and DAR-004 | Yes | 0 | Pass | Yes | Backend route/session binding and family-tight retained projections are now explicit and implementation-ready. |

## Reviewed Design Spec

Round 5 closes the two round-4 blockers at the correct boundaries.

What changed in the right direction:

- `ApplicationSessionService` now explicitly owns route/session reattachment for `/applications/[id]` through `applicationSessionBinding(applicationId, requestedSessionId?)` plus `activeSessionIdByApplicationId`.
- `ApplicationSessionStore` is now clearly reduced to transport/cache/stream responsibilities and is no longer described as the owner of active-session truth.
- The publication contract is now a family-specific discriminated union for `MEMBER_ARTIFACT`, `DELIVERY_STATE`, and `PROGRESS`.
- V1 free-form `metadata` is removed entirely.
- Member retained state is now family-tight via `artifactsByKey` + `primaryArtifactKey` and `progressByKey` + `primaryProgressKey`, while application-level delivery lives separately in `delivery.current`.
- Upsert/overwrite rules are now explicit per family, and the reference app is required to exercise artifact + progress coexistence.

This is the right fix shape. The backend binding shape now closes the route-level reattachment gap cleanly, the family-tight retained projection model is explicit enough for both SDK and native Execution consumers, and no new host-shell/store bypass of backend session authority remains in the revised design.

## Prior Findings Resolution Check (Mandatory On Round >1)

| Prior Round | Finding ID | Previous Severity | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | `DAR-001` | High | Resolved | Same-bundle team integrity remains backend-owned in the revised design | Still resolved. |
| 1 | `DAR-002` | Medium | Resolved | The explicit iframe contract remains documented and topology-aware | Still resolved. |
| 4 | `DAR-003` | High | Resolved | `applicationSessionBinding(applicationId, requestedSessionId?)`, `activeSessionIdByApplicationId`, explicit route-binding flow, and `REQ-055`/`REQ-056` + `AC-036`/`AC-037` | Round-5 revision correctly pulls reattachment authority under `ApplicationSessionService`. |
| 4 | `DAR-004` | High | Resolved | Family-specific input union, removal of free-form metadata, family-tight retained projection shapes/rules, and `REQ-057`–`REQ-060` + `AC-038`/`AC-039` | Round-5 revision correctly replaces the collapsed member/publication model. |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? (`Pass`/`Fail`) | Narrative Is Clear? (`Pass`/`Fail`) | Facade Vs Governing Owner Is Clear? (`Pass`/`Fail`/`N/A`) | Main Domain Subject Naming Is Clear? (`Pass`/`Fail`) | Ownership Is Clear? (`Pass`/`Fail`) | Off-Spine Concerns Stay Off Main Line? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `DS-001` | package import/remove | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| `DS-002` | applications catalog/detail + asset paths | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| `DS-003` | application launch + route/session binding | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| `DS-004` | publication -> projection -> UI | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| `DS-005` | Application vs Execution mode split | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| `DS-006` | iframe ready/bootstrap + SDK handoff | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| `DS-007` | runtime-details drill-down | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| `DS-008` | native edit of app-owned definitions | Pass | Pass | Pass | Pass | Pass | Pass | Pass |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? (`Pass`/`Fail`) | Reuse / Extend / Create-New Decision Is Sound? (`Pass`/`Fail`) | Supports The Right Spine Owners? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/application-sessions` | Pass | Pass | Pass | Pass | Now fully owns active-session index, route binding, launch/termination, and publication projection authority. |
| `ApplicationPageStore` + host shell split | Pass | Pass | Pass | Pass | The `Application` vs `Execution` split remains well allocated. |
| `Application SDK` in `autobyteus-ts` | Pass | Pass | Pass | Pass | Correct author-facing boundary above the iframe contract. |
| `ApplicationPublicationProjector` under application sessions | Pass | Pass | Pass | Pass | Family-tight projection ownership is now explicit. |
| reference app scope | Pass | Pass | Pass | Pass | Right-sized proof target and now exercises coexistence, not just the happy path. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? (`Pass`/`Fail`) | Shared File Choice Is Sound? (`Pass`/`Fail`/`N/A`) | Ownership Of Shared Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| backend active-session index + route-binding contract | Pass | Pass | Pass | Pass | Correctly centralized behind `ApplicationSessionService` and `applicationSessionBinding(...)`. |
| family-aware retained member/application projection shapes | Pass | Pass | Pass | Pass | Correctly centralized behind backend session models/projector rather than left to frontend interpretation. |
| iframe bootstrap constants / SDK wrapper | Pass | Pass | Pass | Pass | The SDK layering remains clean. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Pass`/`Fail`) | Redundant Attributes Removed? (`Pass`/`Fail`) | Overlapping Representation Risk Is Controlled? (`Pass`/`Fail`) | Shared Core Vs Specialized Variant / Composition Decision Is Sound? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `ApplicationSessionBinding` | Pass | Pass | Pass | Pass | Pass | Clear backend-owned route-binding shape for refresh/reconnect. |
| `PublishApplicationEventInputV1` discriminated union | Pass | Pass | Pass | Pass | Pass | Family-specific required/forbidden fields are now explicit. |
| `ApplicationMemberProjection` | Pass | Pass | Pass | Pass | Pass | Artifact and progress retention now coexist without overlap. |
| `ApplicationDeliveryProjection` | Pass | Pass | Pass | Pass | Pass | Delivery retention is now clearly separate from member artifact/progress state. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? (`Pass`/`Fail`) | Replacement Owner / Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Removal / Decommission Scope Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| frontend-generated `applicationSessionId` + direct run launch | Pass | Pass | Pass | Pass | Correct removal direction remains explicit. |
| frontend-owned active-session lookup | Pass | Pass | Pass | Pass | Correctly replaced by backend `applicationSessionBinding(...)`. |
| collapsed `latestPublication` / `latestStatus` projection idea | Pass | Pass | Pass | Pass | Correctly removed in favor of family-tight retained fields. |
| free-form metadata on publication payload v1 | Pass | Pass | Pass | Pass | Correctly removed. |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? (`Pass`/`Fail`) | Responsibility Matches The Intended Owner/Boundary? (`Pass`/`Fail`) | Responsibilities Were Re-Tightened After Shared-Structure Extraction? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/application-sessions/services/application-session-service.ts` | Pass | Pass | N/A | Pass | Now correctly owns lifecycle, active-session index, and route binding. |
| `autobyteus-server-ts/src/application-sessions/services/application-publication-projector.ts` | Pass | Pass | Pass | Pass | Now clearly owns family-tight retained projection updates. |
| `autobyteus-server-ts/src/api/graphql/types/application-session.ts` | Pass | Pass | N/A | Pass | `create/query/bind/terminate/send-input` is now the correct transport surface. |
| `autobyteus-web/stores/applicationSessionStore.ts` | Pass | Pass | Pass | Pass | Now clearly reduced to transport/cache/stream responsibilities. |
| `autobyteus-web/components/applications/ApplicationShell.vue` | Pass | Pass | N/A | Pass | Correct host-shell owner for route/session binding usage and layout. |
| `autobyteus-ts/src/application-sdk/*` | Pass | Pass | Pass | Pass | Correct author-facing boundary and shared type owner. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? (`Pass`/`Fail`) | Forbidden Shortcuts Are Explicit? (`Pass`/`Fail`) | Direction Is Coherent With Ownership? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `ApplicationShell` / `ApplicationSessionStore` vs backend application-session boundary | Pass | Pass | Pass | Pass | Route/session reattachment now depends on backend binding instead of frontend memory. |
| `Application page shell` vs runtime stores | Pass | Pass | Pass | Pass | The host shell stays above runtime-detail systems cleanly. |
| `publish_application_event` -> `ApplicationSessionService` | Pass | Pass | Pass | Pass | The publication entry boundary remains correct. |
| `ApplicationSessionService` vs raw run services | Pass | Pass | Pass | Pass | The no-bypass rule remains explicit for application sessions. |
| SDK vs raw iframe contract | Pass | Pass | Pass | Pass | Correctly encapsulated. |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? (`Pass`/`Fail`) | Internal Owned Mechanisms Stay Internal? (`Pass`/`Fail`) | Caller Bypass Risk Is Controlled? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `ApplicationSessionService` | Pass | Pass | Pass | Pass | Route/session binding authority is now explicit and complete. |
| `ApplicationPublicationProjector` + projected retained state | Pass | Pass | Pass | Pass | SDK/native-shell consumers now receive one tight promoted contract. |
| `ApplicationPageStore` | Pass | Pass | Pass | Pass | Correctly narrowed to route-local UI state. |
| `Application SDK` | Pass | Pass | Pass | Pass | Remains the author-facing boundary above bootstrap transport internals. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? (`Pass`/`Fail`) | Responsibility Is Singular? (`Pass`/`Fail`) | Identity Shape Is Explicit? (`Pass`/`Fail`) | Generic Boundary Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- |
| `applicationSessionBinding(applicationId, requestedSessionId?)` | Pass | Pass | Pass | Low | Pass |
| `createApplicationSession(input)` | Pass | Pass | Pass | Low | Pass |
| `publish_application_event` v1 discriminated union | Pass | Pass | Pass | Low | Pass |
| `bootstrapApplication()` SDK boundary | Pass | Pass | Pass | Low | Pass |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? (`Pass`/`Fail`) | Folder Matches Owning Boundary? (`Pass`/`Fail`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/application-sessions` | Pass | Pass | Low | Pass | Good backend owner for lifecycle, binding, and projection. |
| `autobyteus-web/components/applications/execution/*` | Pass | Pass | Low | Pass | Native execution area remains well scoped. |
| `autobyteus-web/stores/applicationSessionStore.ts` | Pass | Pass | Low | Pass | Correct client-side cache/transport placement. |
| `autobyteus-ts/src/application-sdk/*` | Pass | Pass | Low | Pass | Good external-consumption placement. |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? (`Pass`/`Fail`) | Reuse / Extension Decision Is Sound? (`Pass`/`Fail`) | New Support Piece Is Justified? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| underlying agent/team run launch | Pass | Pass | N/A | Pass | Correct reuse beneath the application-session boundary. |
| existing runtime/workspace inspection UI | Pass | Pass | N/A | Pass | Correctly reused as the deepest inspection layer. |
| new SDK package | Pass | Pass | Pass | Pass | Still justified and correctly scoped. |
| new application-session binding query | Pass | Pass | Pass | Pass | Justified by the route-level reattachment requirement. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? (`Yes`/`No`) | Clean-Cut Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- |
| frontend-only application session model | No | Pass | Pass | Clean-cut removal remains explicit. |
| raw iframe postMessage authoring surface | No | Pass | Pass | Correctly replaced by the SDK boundary. |
| collapsed latest-publication member state | No | Pass | Pass | Correctly replaced by family-tight retained state. |

## Migration / Refactor Safety Verdict

| Area | Sequence Is Realistic? (`Pass`/`Fail`) | Temporary Seams Are Explicit? (`Pass`/`Fail`) | Cleanup / Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- |
| backend session-boundary + route-binding rollout | Pass | Pass | Pass | Pass |
| publication/projection rollout | Pass | Pass | Pass | Pass |
| host-shell/Application-vs-Execution rollout | Pass | Pass | Pass | Pass |
| SDK + reference-app rollout | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? (`Yes`/`No`) | Example Is Present And Clear? (`Pass`/`Fail`/`N/A`) | Bad / Avoided Shape Is Explained When Helpful? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| application session reattachment after page refresh | Yes | Pass | Pass | Pass | The route-binding example now shows the authoritative backend resolution path clearly. |
| publication flow including member artifact + progress coexistence | Yes | Pass | Pass | Pass | The examples now show separate retention of progress and artifact families. |
| Application vs Execution mode split | Yes | Pass | Pass | Pass | Clear and well scoped. |
| reference app target | Yes | Pass | N/A | Pass | The proof target is clear and appropriately narrow. |

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

- Keep route/query naming consistent between the binding example, route canonicalization, and implementation so reattachment/debugging does not drift into two parameter names.
- Downstream validation should explicitly cover `requested_live`, `application_active`, and `none` binding outcomes.
- Downstream validation should explicitly cover artifact + progress coexistence so the new family-tight contract does not regress during implementation.

## Latest Authoritative Result

- Review Decision: `Pass`
- Notes:
  - DAR-003 and DAR-004 are resolved.
  - The backend binding shape now closes the route-level reattachment gap cleanly.
  - The family-tight retained projection contract is now explicit enough for both SDK and native Execution consumers.
  - No new blocking boundary bypasses were found in this round.
