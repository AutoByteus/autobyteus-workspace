# Design Review Report

Write this artifact to a canonical file path in the assigned task workspace before any handoff message.

Keep one canonical design-review report path across reruns.
Do not create versioned copies by default.
On round `>1`, recheck prior unresolved findings first, update the prior-findings resolution section, and then record the new round result.
The latest round is authoritative; earlier rounds remain history.

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-immersive-mode-refactor/tickets/in-progress/application-immersive-mode-refactor/requirements.md`
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-immersive-mode-refactor/tickets/in-progress/application-immersive-mode-refactor/investigation-notes.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-immersive-mode-refactor/tickets/in-progress/application-immersive-mode-refactor/design-spec.md`
- Current Review Round: `1`
- Trigger: Initial architecture review after user-approved immersive-mode requirements handoff on 2026-04-18.
- Prior Review Round Reviewed: `N/A`
- Latest Authoritative Round: `1`
- Current-State Evidence Basis: upstream artifacts plus direct code inspection of `/Users/normy/autobyteus_org/autobyteus-worktrees/application-immersive-mode-refactor/autobyteus-web/components/applications/ApplicationShell.vue`, `/Users/normy/autobyteus_org/autobyteus-worktrees/application-immersive-mode-refactor/autobyteus-web/components/applications/ApplicationSurface.vue`, `/Users/normy/autobyteus_org/autobyteus-worktrees/application-immersive-mode-refactor/autobyteus-web/layouts/default.vue`, `/Users/normy/autobyteus_org/autobyteus-worktrees/application-immersive-mode-refactor/autobyteus-web/stores/appLayoutStore.ts`, `/Users/normy/autobyteus_org/autobyteus-worktrees/application-immersive-mode-refactor/autobyteus-web/composables/useLeftPanel.ts`, `/Users/normy/autobyteus_org/autobyteus-worktrees/application-immersive-mode-refactor/autobyteus-web/stores/applicationPageStore.ts`, and associated tests/docs. Review used the user handoff as authoritative for requirements approval state even though the requirements artifact approval line still needs sync.

Round rules:
- Reuse the same finding IDs across reruns for the same unresolved design-review issues.
- Create new finding IDs only for newly discovered issues.

## Round History

| Round | Trigger | Prior Unresolved Findings Rechecked | New Findings Found | Review Decision | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `1` | Initial architecture review | `N/A` | `0` | `Pass` | `Yes` | Design is actionable and ownership boundaries are explicit. |

## Reviewed Design Spec

The design is ready for implementation.

The strongest parts of the package are:
- it keeps `ApplicationShell.vue`, `ApplicationSurface.vue`, `default.vue`, and `appLayoutStore.ts` aligned with the current codebase’s real ownership boundaries;
- it explicitly rejects the two main boundary bypasses that would have made the refactor unsafe: preserving the heavy host card and having `ApplicationShell.vue` call `useLeftPanel()` directly;
- it keeps iframe bootstrap/ready/failure behavior inside `ApplicationSurface.vue` instead of letting immersive presentation concerns pull launch state upward; and
- it names coordinated removal/update work across layout, surface sizing, tests, and docs rather than hiding the cutover behind a visual-only description.

The remaining concerns are implementation-time validation risks, not design gaps.

## Prior Findings Resolution Check (Mandatory On Round >1)

`N/A - round 1`

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? (`Pass`/`Fail`) | Narrative Is Clear? (`Pass`/`Fail`) | Facade Vs Governing Owner Is Clear? (`Pass`/`Fail`/`N/A`) | Main Domain Subject Naming Is Clear? (`Pass`/`Fail`) | Ownership Is Clear? (`Pass`/`Fail`) | Off-Spine Concerns Stay Off Main Line? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `DS-IMM-001` | Live immersive Application-mode flow | `Pass` | `Pass` | `Pass` | `Pass` | `Pass` | `Pass` | `Pass` |
| `DS-IMM-002` | Escape / mode-switch / session-action flow | `Pass` | `Pass` | `Pass` | `Pass` | `Pass` | `Pass` | `Pass` |
| `DS-IMM-003` | Bounded local iframe launch/bootstrap flow | `Pass` | `Pass` | `N/A` | `Pass` | `Pass` | `Pass` | `Pass` |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? (`Pass`/`Fail`) | Reuse / Extend / Create-New Decision Is Sound? (`Pass`/`Fail`) | Supports The Right Spine Owners? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `components/applications` | `Pass` | `Pass` | `Pass` | `Pass` | Correctly keeps page-shell, overlay presenter, and iframe surface responsibilities together but distinct. |
| `stores` | `Pass` | `Pass` | `Pass` | `Pass` | `appLayoutStore.ts` is the right shared boundary for outer-shell suppression state. |
| `layouts` | `Pass` | `Pass` | `Pass` | `Pass` | `default.vue` remains the only owner that renders or suppresses host chrome. |
| `types/application` | `Pass` | `Pass` | `Pass` | `Pass` | The shared presentation union is narrow and scoped correctly. |
| `docs` | `Pass` | `Pass` | `Pass` | `Pass` | Docs update scope is explicit and aligned with implementation. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? (`Pass`/`Fail`) | Shared File Choice Is Sound? (`Pass`/`Fail`/`N/A`) | Ownership Of Shared Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Application surface presentation union | `Pass` | `Pass` | `Pass` | `Pass` | Good narrow shared contract across shell/surface/overlay. |
| Host-shell suppression state | `Pass` | `Pass` | `Pass` | `Pass` | Correctly centralized in `appLayoutStore.ts` instead of leaking into page or composable internals. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Pass`/`Fail`) | Redundant Attributes Removed? (`Pass`/`Fail`) | Overlapping Representation Risk Is Controlled? (`Pass`/`Fail`) | Shared Core Vs Specialized Variant / Composition Decision Is Sound? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `ApplicationSurfacePresentation` | `Pass` | `Pass` | `Pass` | `Pass` | `Pass` | Tight two-value union with no layout or execution leakage. |
| `hostShellPresentation` in `appLayoutStore.ts` | `Pass` | `Pass` | `Pass` | `Pass` | `Pass` | Correctly separated from Application-mode presentation state. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? (`Pass`/`Fail`) | Replacement Owner / Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Removal / Decommission Scope Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Heavy live-session host card | `Pass` | `Pass` | `Pass` | `Pass` | Explicitly removed, not hidden behind a feature flag. |
| Fixed dashboard-height application surface sizing | `Pass` | `Pass` | `Pass` | `Pass` | Explicitly replaced by parent-height-driven rendering. |
| Direct page-to-`useLeftPanel()` layout manipulation | `Pass` | `Pass` | `Pass` | `Pass` | Explicitly rejected in favor of store-mediated layout state. |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? (`Pass`/`Fail`) | Responsibility Matches The Intended Owner/Boundary? (`Pass`/`Fail`) | Responsibilities Were Re-Tightened After Shared-Structure Extraction? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/applications/ApplicationShell.vue` | `Pass` | `Pass` | `Pass` | `Pass` | Correct governing owner for live-session composition and local Application-mode presentation. |
| `autobyteus-web/components/applications/ApplicationImmersiveControls.vue` | `Pass` | `Pass` | `Pass` | `Pass` | Good emitter-only presenter split. |
| `autobyteus-web/components/applications/ApplicationSurface.vue` | `Pass` | `Pass` | `Pass` | `Pass` | Keeps iframe launch/bootstrap boundary intact. |
| `autobyteus-web/stores/appLayoutStore.ts` | `Pass` | `Pass` | `N/A` | `Pass` | Correct shared layout-state owner. |
| `autobyteus-web/layouts/default.vue` | `Pass` | `Pass` | `N/A` | `Pass` | Correct outer-shell renderer. |
| `autobyteus-web/types/application/ApplicationSurfacePresentation.ts` | `Pass` | `Pass` | `N/A` | `Pass` | Appropriately narrow shared type. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? (`Pass`/`Fail`) | Forbidden Shortcuts Are Explicit? (`Pass`/`Fail`) | Direction Is Coherent With Ownership? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `ApplicationShell.vue` | `Pass` | `Pass` | `Pass` | `Pass` | The explicit ban on direct `useLeftPanel()` access is the key dependency safeguard. |
| `default.vue` | `Pass` | `Pass` | `Pass` | `Pass` | Correctly depends on both `appLayoutStore` and `useLeftPanel()` as the layout owner. |
| `ApplicationSurface.vue` | `Pass` | `Pass` | `Pass` | `Pass` | Presentation prop remains narrow and styling-only. |
| `ApplicationImmersiveControls.vue` | `Pass` | `Pass` | `Pass` | `Pass` | Emitter-only boundary is explicit and coherent. |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? (`Pass`/`Fail`) | Internal Owned Mechanisms Stay Internal? (`Pass`/`Fail`) | Caller Bypass Risk Is Controlled? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `ApplicationShell.vue` | `Pass` | `Pass` | `Pass` | `Pass` | Overlay controls and route entry remain downstream of the page shell. |
| `appLayoutStore.ts` | `Pass` | `Pass` | `Pass` | `Pass` | Correct adapter-like boundary between page shell and outer layout. |
| `ApplicationSurface.vue` | `Pass` | `Pass` | `Pass` | `Pass` | Launch/bootstrap state stays local to the surface owner. |
| `default.vue` | `Pass` | `Pass` | `Pass` | `Pass` | Layout remains the only place that renders or hides shell chrome. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? (`Pass`/`Fail`) | Responsibility Is Singular? (`Pass`/`Fail`) | Identity Shape Is Explicit? (`Pass`/`Fail`) | Generic Boundary Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- |
| `appLayoutStore.setHostShellPresentation(presentation)` | `Pass` | `Pass` | `Pass` | `Low` | `Pass` |
| `appLayoutStore.resetHostShellPresentation()` | `Pass` | `Pass` | `Pass` | `Low` | `Pass` |
| `ApplicationSurface` prop `presentation` | `Pass` | `Pass` | `Pass` | `Low` | `Pass` |
| `ApplicationImmersiveControls` emits | `Pass` | `Pass` | `Pass` | `Low` | `Pass` |
| `applicationPageStore.setMode(applicationId, mode)` | `Pass` | `Pass` | `Pass` | `Low` | `Pass` |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? (`Pass`/`Fail`) | Folder Matches Owning Boundary? (`Pass`/`Fail`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/applications` | `Pass` | `Pass` | `Low` | `Pass` | Existing feature-oriented folder remains clear for this scope. |
| `autobyteus-web/stores` | `Pass` | `Pass` | `Low` | `Pass` | Correct location for shared layout state. |
| `autobyteus-web/layouts` | `Pass` | `Pass` | `Low` | `Pass` | Correct location for outer-shell renderer changes. |
| `autobyteus-web/types/application` | `Pass` | `Pass` | `Low` | `Pass` | Narrow shared type belongs here. |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? (`Pass`/`Fail`) | Reuse / Extension Decision Is Sound? (`Pass`/`Fail`) | New Support Piece Is Justified? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Live application page composition | `Pass` | `Pass` | `N/A` | `Pass` | Good reuse of `ApplicationShell.vue`. |
| Host-shell suppression state | `Pass` | `Pass` | `N/A` | `Pass` | Good reuse/extension of `appLayoutStore.ts`. |
| Left-panel visibility internals | `Pass` | `Pass` | `N/A` | `Pass` | Correctly reused only inside layout ownership. |
| Immersive overlay presenter | `Pass` | `Pass` | `Pass` | `Pass` | New component is justified and narrowly scoped. |
| Shared presentation type | `Pass` | `Pass` | `Pass` | `Pass` | New type is justified and tight. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? (`Yes`/`No`) | Clean-Cut Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- |
| Live-session host layout | `No` | `Pass` | `Pass` | Old heavy live-session page is explicitly removed. |
| Surface height behavior | `No` | `Pass` | `Pass` | Old fixed-height calculation is explicitly removed. |
| Layout suppression behavior | `No` | `Pass` | `Pass` | No fallback path through direct composable manipulation. |

## Migration / Refactor Safety Verdict

| Area | Sequence Is Realistic? (`Pass`/`Fail`) | Temporary Seams Are Explicit? (`Pass`/`Fail`) | Cleanup / Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- |
| `appLayoutStore.ts` / `default.vue` shell suppression cutover | `Pass` | `Pass` | `Pass` | `Pass` |
| `ApplicationSurface.vue` parent-height refactor | `Pass` | `Pass` | `Pass` | `Pass` |
| `ApplicationShell.vue` immersive default refactor | `Pass` | `Pass` | `Pass` | `Pass` |
| Tests/docs update | `Pass` | `Pass` | `Pass` | `Pass` |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? (`Yes`/`No`) | Example Is Present And Clear? (`Pass`/`Fail`/`N/A`) | Bad / Avoided Shape Is Explained When Helpful? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Layout suppression boundary | `Yes` | `Pass` | `Pass` | `Pass` | Clear authoritative-boundary example. |
| Surface ownership | `Yes` | `Pass` | `Pass` | `Pass` | Clear non-leakage example for iframe bootstrap ownership. |
| Immersive escape path | `Yes` | `Pass` | `Pass` | `Pass` | Clear orchestration-boundary example. |

## Missing Use Cases / Open Unknowns

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| CSS / viewport-height behavior across desktop vs mobile | The design is structurally sound, but visual layout validation is still needed because `100dvh` / `h-full` behavior can vary by device/browser. | Cover in implementation validation and visual/manual QA. | `Known implementation risk` |
| Overlay pointer-events / z-index around iframe | The overlay must stay discoverable without materially blocking the app surface. | Cover in component tests and manual validation. | `Known implementation risk` |
| Test/doc drift from hierarchy change | The refactor changes a large visual branch and will invalidate current assertions/screenshots. | Update tests/docs in the same change as required by the migration plan. | `Known implementation risk` |

## Review Decision

- `Pass`: the design is ready for implementation.
- `Fail`: the design needs upstream rework before implementation should proceed.
- `Blocked`: the review cannot finish because required input, evidence, or clarification is missing.

**Decision: `Pass`**

## Findings

None.

## Classification

None.

## Recommended Recipient

`implementation_engineer`

## Residual Risks

- Visual correctness across desktop/mobile viewport behavior still needs implementation-time validation.
- The immersive overlay must be tested carefully for pointer-events, z-index, and keyboard/focus discoverability so the minimal host chrome does not interfere with the iframe.
- Tests/docs need coordinated updates because the dominant visual hierarchy is intentionally changing.

## Latest Authoritative Result

- Review Decision: `Pass`
- Notes: The design is actionable in the current codebase and keeps the right boundaries authoritative while making the immersive cutover explicit.
