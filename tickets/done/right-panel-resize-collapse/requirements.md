# Requirements — Right Panel Resize Collapse

## Status

`Design-ready`

## Goal / Problem Statement

Fix the desktop workspace responsive behavior so a user-sized right tools panel does not unexpectedly become a strip while the available window width can still support the docked panel with the approved compact center floor. The resulting strip currently opens a transient drawer because the system classifies it as a responsive strip. Explicit user collapse must remain distinct: a fitting user-hidden strip redocks the right panel when a tool is selected, while a genuinely constrained surface may still use a drawer.

## Current And Desired Behavior

| Behavior ID | Current Behavior | Desired Behavior | Preserved / Unchanged Behavior | Related Requirement / Acceptance-Criteria IDs |
| --- | --- | --- | --- | --- |
| BE-001 | Collapsing left navigation creates a user-owned strip and can leave right tools docked while the automatic 480px center candidate fits. | Left navigation remains a user-owned strip; this behavior is unchanged. | Left strip remains visible and consuming. | R-001, AC-001 |
| BE-002 | After a right separator drag records `user-sized`, the left-collapsed policy can reject the dock under the 480px automatic floor before evaluating the 200px user-sized floor, producing a right strip even though a compact dock fits. | A user-sized right panel stays docked whenever the current left presentation, right width, handle, and 200px center floor fit. | Dragging still updates preferred width and remains bounded by available geometry. | R-001, R-002, AC-001, AC-002 |
| BE-003 | A right strip with right visibility preference `visible` opens a transient drawer when a tool is clicked. | The reported resize path must not produce that strip while a compact dock fits; if a responsive strip is required at a truly insufficient width, it continues to open the drawer. | Responsive drawer behavior remains for genuinely constrained states. | R-003, AC-003, AC-005 |
| BE-004 | Explicit right collapse changes the preference to `hidden-by-user`; a fitting strip can redock, while a non-fitting strip can open a drawer. | Preserve the preference-driven distinction. A fitting explicit-collapse strip redocks the panel and does not open a drawer. | Explicit collapse remains the user action that creates a strip; no automatic reset of visibility or resize intent. | R-004, AC-004, AC-005 |
| BE-005 | Existing automatic, narrow, short-height, and left-adaptation policy paths are covered and currently pass. | Keep these outcomes unchanged. | Existing 47-test focused baseline remains green after the change. | R-005, AC-006 |
| BE-006 | Left and right transient drawers use dark scrims that make the underlying workspace difficult to see; the right drawer currently uses `bg-gray-900/50` and the left drawer uses `bg-opacity-75`. | Both drawer scrims remain clearly modal but use a lighter, consistent target opacity of approximately 30% black so the underlying workspace remains recognizable and provides context. | Drawer dismissal, focus trapping, z-order, and opposite-strip hit-target behavior remain unchanged. | R-006, AC-007 |

## Investigation Findings

The authoritative resolver in `autobyteus-web/utils/layout/responsiveLayoutPolicy.ts` handles the left user-hidden branch before the user-sized right-dock branch. In the reported sequence, the first branch requires the automatic 480px center floor; when that candidate fails, it chooses a right strip using the compact fallback without evaluating the user-sized dock. `responsiveStripActivation.ts` then correctly maps a visible-preference strip to `open-drawer`, which explains the second symptom. This is a policy ordering/invariant defect, not a drawer implementation defect.

Full evidence and production paths are recorded in `investigation-notes.md`.

## Relevant Supplemental Task Artifacts

| Artifact Path | Type / Purpose | Related Requirement IDs | Related Acceptance-Criteria IDs | Status / Approval | Relationship To Requirements |
| --- | --- | --- | --- | --- | --- |
| `tickets/done/right-panel-resize-collapse/ui-ux-spec.md` | UI/UX journey and state-transition contract | R-001–R-006 | AC-001–AC-007 | `Requirements-ready`; intended behavior based on user request | Defines docked/strip/drawer states, explicit collapse versus responsive yield, the reported interaction sequence, and contextual lighter scrims |

## Design Health Assessment

- Change posture: `Bug Fix` / `Behavior Change`
- Initial design issue signal: `Yes`
- Root cause classification: `Missing Invariant`
- Refactor posture: `Likely Not Needed`
- Evidence basis: The existing right-panel composable, responsive resolver, strip activation policy, and drawer owner have coherent boundaries. The missing invariant is that a recorded `user-sized` resize intent must take precedence over the opposite panel's automatic 480px capacity fallback when the compact dock still fits.
- Requirement or scope impact: Modify the existing responsive policy, standardize drawer scrim opacity, and add focused regression coverage; no new subsystem, API, persisted state, or broad refactor.

## Recommendations

1. Evaluate a user-sized right-docked candidate using the current left presentation before the manual-left-collapse automatic candidate.
2. Keep the compact 200px center floor for a deliberate user resize and keep the automatic 480px floor for non-user-sized responsive decisions.
3. Do not change strip activation or drawer ownership; preventing the incorrect responsive strip removes the unexpected drawer from the reported path.
4. Add pure policy coverage for left-collapsed + user-sized + compact-fit and compact-fail boundaries, plus a rendered shell regression for dock persistence and explicit right-collapse redock.
5. Update the durable workspace layout documentation to state this precedence explicitly.
6. Standardize both left and right transient drawer scrims around 30% black; do not change modal lifecycle or focus behavior.

## Scope Classification

`Small`

## In-Scope Use Cases

- UC-001: Collapse the left navigation, drag the right separator left, and retain the right panel docked while the user-sized compact floor fits.
- UC-002: Continue dragging the right separator in both directions; width remains bounded by the measured workspace and never changes presentation solely because of the drag while the compact dock fits.
- UC-003: Explicitly collapse the right panel; click a tool on a fitting right strip and redock the panel rather than opening a drawer.
- UC-004: At a width where the user-sized dock cannot fit even with the compact floor, preserve the responsive right strip/drawer fallback.
- UC-005: Preserve existing automatic, narrow-window, short-height, left-adaptation, tab, and drawer accessibility behavior.

## Out of Scope

- Changing panel width constants, left/right strip visual styling, or the tool catalog.
- Replacing the shared drawer lifecycle or adding a generic top-level Tools trigger.
- Backend/API changes, persisted preference storage, migrations, or Electron window management.
- Redesigning mobile `/mobile` behavior.

## Functional Requirements

- **R-001 — Preserve user-sized dock precedence:** When `rightPanelResizeIntent` is `user-sized` and right visibility is `visible`, the resolver must evaluate a right-docked candidate using the current left presentation and `USER_RESIZE_CENTER_MIN_WIDTH_PX` before automatic 480px fallback can yield the right panel to a strip.
- **R-002 — Preserve drag freedom within capacity:** While the user-sized candidate fits, changing the right separator updates the effective panel width without switching the right panel to strip or drawer presentation. Existing measured-width clamping and preferred-width restoration remain authoritative.
- **R-003 — Keep responsive fallback truthful:** If the user-sized dock does not fit with the compact center floor, the resolver may yield to the existing consuming right strip. A visible-preference responsive strip continues to open the existing transient drawer.
- **R-004 — Preserve explicit-collapse redock:** If the user explicitly hides the right panel and the right dock candidate fits, the strip activation remains `redock-panel`; selecting a tool restores the docked panel and does not open a drawer. If it cannot fit, existing drawer behavior remains allowed.
- **R-005 — Preserve unrelated responsive behavior:** Automatic 480px protection, narrow and short-height strips/drawers, left-panel adaptation, center mounting, and accessibility/focus behavior remain unchanged.
- **R-006 — Preserve context under transient drawers:** Left and right drawer backdrops must remain visibly modal while using a lighter consistent scrim, targeting approximately 30% black opacity (acceptable range 25–35%). Underlying workspace content must remain recognizable; drawer lifecycle, dismissal, focus trapping, and z-order are unchanged.

## Acceptance Criteria

- **AC-001 — Reported sequence remains docked:** Given a desktop-width workspace with the left panel user-collapsed and the right panel visible, after a right separator drag records `user-sized`, the right panel remains rendered as `[data-test="workspace-right-panel"]` whenever `left strip + right effective width + right handle + 200px center floor` fits; `[data-test="workspace-right-tool-strip"]` and the right drawer are absent.
- **AC-002 — Compact boundary is used, not automatic boundary:** A pure resolver test proves that the left-collapsed/user-sized candidate is docked at the exact compact-fit boundary and yields only when the same candidate exceeds available width; the test proves `centerProtectionMode` is `user-override` for the fit and `responsive-yield` for the fallback.
- **AC-003 — No drawer caused by a fitting resize:** In the rendered reported sequence, selecting any right tool does not open `[data-test="workspace-right-tool-drawer"]` because no responsive strip is created while the compact dock fits.
- **AC-004 — Explicit right collapse redocks:** Given a fitting desktop workspace after the left panel is collapsed, explicitly hiding the right panel produces a user-owned strip with `data-strip-activation="redock-panel"`; selecting a tool restores the docked right panel, leaves the drawer absent, and preserves the selected tab.
- **AC-005 — Genuine constraint still uses drawer:** At a width where the user-sized dock fails even with the 200px floor, the right strip remains visible with `data-strip-activation="open-drawer"`; selecting a tool opens the existing drawer and does not falsely redock an over-wide panel.
- **AC-006 — Regression suite remains green:** The focused responsive policy, right-panel composable, and adaptive workspace component suites pass, with coverage for automatic desktop, manual left collapse, user-sized resize, explicit collapse, narrow/short-height fallback, and drawer activation. No existing covered behavior regresses.
- **AC-007 — Drawer context remains visible:** In both left- and right-drawer states, the backdrop uses the shared lighter scrim target (approximately 30% black, within 25–35%); the underlying workspace remains visibly recognizable while the drawer remains the dominant surface. Existing close-on-backdrop, Escape, focus-trap, return-focus, and opposite-strip behavior remain intact.

## Constraints / Dependencies

- The policy resolver is the authoritative presentation boundary; layout components must not duplicate candidate ordering or infer drawer semantics.
- `USER_RESIZE_CENTER_MIN_WIDTH_PX` remains 200px; `WORKSPACE_CENTER_MIN_WIDTH_PX` remains 480px.
- Production shell measurement and actual width clamping remain owned by `useRightPanel` and `WorkspaceAdaptiveLayout`.
- The current strip activation contract is authoritative: visible-preference responsive strips open drawers; fitting hidden-by-user strips redock.

## Persisted Data Outcome

- Stored subject / location: None; panel state is session-memory refs.
- Required outcome: `Not Affected`.
- Existing data to preserve, discard/rebuild, transform, or quarantine: N/A.
- Unacceptable data loss or corruption: N/A.
- Relevant availability, maintenance-window, or rollout constraints: None.
- Related requirement and acceptance-criteria IDs: R-001–R-005; AC-001–AC-006.

## Assumptions

- “Enough screen size” means the compact 200px center floor plus both current side presentations and the right resize handle fit in the current workspace viewport/flow.
- The right panel remains user-visible after a resize; only the explicit right-side collapse action changes that visibility preference.
- A drawer remains an intentional response to truly insufficient capacity, not to an ordinary user resize that still fits.

## Risks / Open Questions

- Browser/Electron visual validation may require a running workspace fixture; pure policy and component checks are sufficient to prove the state transition if live setup is unavailable.
- The resolver test API uses a preferred-width field while production composition passes the effective width; implementation must preserve the production boundary and add tests that mirror both relevant capacity inputs.

## Requirement-To-Use-Case Coverage

| Requirement | Use Cases | Coverage |
| --- | --- | --- |
| R-001 | UC-001, UC-002 | AC-001, AC-002 |
| R-002 | UC-001, UC-002 | AC-001, AC-003 |
| R-003 | UC-004 | AC-005 |
| R-004 | UC-003, UC-004 | AC-004, AC-005 |
| R-005 | UC-005 | AC-006 |
| R-006 | UC-005 plus drawer interaction | AC-007 |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criteria | Scenario Intent | Test Level |
| --- | --- | --- |
| AC-001 | Left user-hidden + right user-sized compact-fit remains docked | Component/policy |
| AC-002 | Exact compact-fit and compact-fail boundary | Pure policy |
| AC-003 | No unexpected drawer after resize | Component |
| AC-004 | Explicit right collapse strip redocks | Component |
| AC-005 | True constraint opens drawer | Component/policy |
| AC-006 | Existing suites plus new regression scenarios | Focused executable validation |
| AC-007 | Left/right scrim opacity and preserved modal behavior | Component/source plus visual/browser validation |

## Approval Status

User-provided interaction intent, screenshots, and follow-up scrim preference are sufficiently specific for design investigation. This requirements basis is `Design-ready`; the linked UI/UX supplement is `Requirements-ready` and should be treated as approved intent unless the user corrects the compact-fit versus genuine-constraint or lighter-scrim distinction.
