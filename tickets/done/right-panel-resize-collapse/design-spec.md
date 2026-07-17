# Design Specification — Right Panel Resize Collapse

## Status

`Ready for Architecture Review`

## Upstream Solution Package

- Requirements: `requirements.md` (`Design-ready`)
- Investigation: `investigation-notes.md` (`Current; root cause identified`)
- UI/UX supplement: `ui-ux-spec.md` (`Requirements-ready`)

## Current-State Read

The standard workspace is rendered through `layouts/default.vue` and `components/layout/WorkspaceAdaptiveLayout.vue`. `useRightPanel.ts` is the state boundary for right visibility, preferred/effective width, and resize intent. `useResponsiveWorkspaceShell.ts` composes those values into `resolveResponsiveWorkspaceShellState()` in `utils/layout/responsiveLayoutPolicy.ts`.

The reported state is reachable through normal product actions. A right separator drag sets `rightPanelResizeIntent` to `user-sized`; collapsing the left panel sets the left preference to `hidden-by-user`. The resolver currently handles the left-hidden branch before the user-sized branch. It tests a left-strip/right-docked candidate with the automatic 480px center floor, then falls directly to a right strip when that candidate fails. It never tests the same left-strip/right-docked candidate with the user-sized 200px floor. Because right visibility remains `visible`, the resulting strip activation is `open-drawer`, so selecting a tool opens `WorkspaceRightToolDrawer`.

## Intended Change

Preserve a deliberate user-sized right dock whenever the current left presentation and right dock fit with `USER_RESIZE_CENTER_MIN_WIDTH_PX`. Evaluate that candidate before the opposite-panel manual-collapse automatic fallback. If the compact candidate does not fit, preserve the existing responsive strip/drawer behavior. Keep explicit right collapse preference-driven so a fitting user-hidden strip redocks instead of opening a drawer.

## Relevant Behavior And Production-Path Map

| Behavior ID | Kind | Approved Requirement / Intent And Acceptance-Criteria IDs | Approved Trigger Or Governing Contract | Relevant Existing Behavior And Evidence Reference | Approved Change Or Preserved Outcome | Target Production Path / Lifecycle And Spine ID(s) |
| --- | --- | --- | --- | --- | --- | --- |
| BE-001 | User | R-001; AC-001 | Left collapse button | Left store -> responsive shell -> default layout; left strip remains consuming | Preserve left user-owned strip | DS-001 |
| BE-002 | User | R-001, R-002; AC-001, AC-002 | Right separator drag | `initDragRightPanel()` records user-sized intent; policy can currently yield too early | Prefer compact user-sized dock for current left presentation | DS-001, DS-002 |
| BE-003 | System/User | R-003; AC-003, AC-005 | Responsive resolver returns right strip | Visible preference maps strip to `open-drawer` | Keep only for compact-capacity failure; no drawer for fitting user-sized dock | DS-001, DS-003 |
| BE-004 | User | R-004; AC-004 | Right-side collapse control | Hidden preference + fitting strip maps to `redock-panel` | Preserve explicit collapse/redock distinction | DS-001, DS-003 |
| BE-005 | User/System | R-005; AC-006 | Automatic/narrow/short-height transitions | Existing focused suites pass | Preserve unrelated responsive states and drawer lifecycle | DS-001, DS-003 |
| BE-006 | User/System | R-006; AC-007 | Left or right drawer opens | Left uses `bg-opacity-75`; right uses `bg-gray-900/50`; underlying content is too dark | Standardize both transient drawer scrims around 30% black while preserving modal behavior | DS-003 |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related Requirement / Acceptance-Criteria IDs | Relationship To This Design | Status / Approval Applicability |
| --- | --- | --- | --- | --- |
| `ui-ux-spec.md` | User journeys and state transitions for docked, strip, and drawer | R-001–R-006; AC-001–AC-007 | Defines the intended precedence, explicit-collapse distinction, and lighter contextual scrim | Requirements-ready; intended behavior based on user request |

## Task Design Health Assessment

- Change posture: `Bug Fix` / `Behavior Change`
- Current design issue found: `Yes`
- Root cause classification: `Missing Invariant` plus a bounded `Inconsistent Scrim Opacity` presentation defect
- Refactor needed now: `No`
- Evidence: The current state owner already records user-sized intent and the current policy already has compact-center support. Only candidate ordering omits the left-collapsed combination. Separately, `layouts/default.vue` uses `bg-opacity-75` while `WorkspaceRightToolDrawer.vue` uses `bg-gray-900/50`, making left/right transient surfaces inconsistent and too dark for the requested context-preserving UX. Strip activation and drawer ownership are correct for their inputs.
- Design response: Strengthen the existing resolver ordering and add boundary tests; standardize only the two existing drawer backdrop classes to approximately 30% black; do not add layout-local policy or drawer exceptions.
- Refactor rationale: Ownership, API shape, file placement, and state structures are healthy for this scope. A broader refactor would increase risk without addressing a second design defect.
- Intentional deferrals and residual risk: No new live Electron fixture is designed here. If browser execution is unavailable, focused policy/component evidence must still cover the full state transition.

## Terminology

- `Automatic center floor`: `WORKSPACE_CENTER_MIN_WIDTH_PX` (480px), used when no deliberate right resize overrides protection.
- `User-sized compact floor`: `USER_RESIZE_CENTER_MIN_WIDTH_PX` (200px), used after a right separator drag.
- `Fitting explicit-collapse strip`: a `hidden-by-user` right strip whose redock candidate fits the current capacity; it uses `redock-panel`.
- `Responsive strip`: a strip returned while the panel preference remains `visible` because the dock cannot fit; it uses `open-drawer`.

## Persisted Data / State Transition Decision

- Stored subject, location, representative shape, and approximate volume: None; all affected state is in-memory Vue refs for the current application session.
- Relevant code-model, serialization, semantic, or physical-store change: None.
- Normal reader/writer behavior and representative evidence: N/A.
- Required semantics and invariants under direct use: N/A.
- Physical-store, privacy/security, disposal/rebuild, and operational constraints: None.
- Decision: `Not Affected`.
- Decision rationale: No persisted shape changes and no migration boundary is needed.
- Acceptance criteria or design constraints supported: R-001–R-006; AC-001–AC-007.

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BE-001, BE-002, BE-003, BE-004 | User panel action / shell resize | Visible dock, strip, or drawer state | `resolveResponsiveWorkspaceShellState` | Captures the complete trigger-to-surface path and presentation precedence |
| DS-002 | Bounded Local | BE-002 | Right separator mousedown/mousemove | Preferred/effective width + `user-sized` intent | `useRightPanel` | Preserves the existing resize state invariant feeding the resolver |
| DS-003 | Return-Event | BE-003, BE-004, BE-006 | Strip activation and drawer presentation contract | Drawer open, redock completion, or backdrop presentation | `WorkspaceAdaptiveLayout` + `RightSidebarStrip` + left/right drawer owners | Proves why the incorrect strip becomes a drawer, why explicit collapse must redock, and why both drawers preserve workspace context |

## Primary Execution Spine(s)

`Left collapse / right separator drag -> useLeftPanel/useRightPanel state -> useResponsiveWorkspaceShell composition -> responsiveLayoutPolicy candidate selection -> WorkspaceAdaptiveLayout dock/strip rendering -> RightSidebarStrip redock/drawer action`

## Spine Narratives

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | User actions update panel preferences/intent; the shell composes current capacity; the policy chooses the surface; the layout renders the result; strip activation carries the chosen interaction mode | Panel state, shell composition, responsive policy, adaptive layout, strip/drawer action | Responsive policy boundary | Measurement, focus lifecycle, tool tab selection |
| DS-002 | Pointer drag starts from the rendered separator, records `user-sized`, and updates preferred width; the computed effective width is clamped against the measured flow | Right-panel resize state | `useRightPanel` | DOM listeners and ResizeObserver registration |
| DS-003 | The resolver's presentation and preference produce either `redock-panel` or `open-drawer`; the strip emits the matching event, the layout owns the final surface transition, and each drawer owner renders the shared lighter scrim | Strip activation, dock redock, transient drawer, contextual scrim | `resolveStripActivation` plus layout and drawer owners | Focus restoration, selected tab state, backdrop opacity and hit testing |

## Spine Actors / Main-Line Nodes

1. User-facing collapse/resize controls
2. `useLeftPanel` / `useRightPanel` state owners
3. `useResponsiveWorkspaceShell` composition boundary
4. `resolveResponsiveWorkspaceShellState` authoritative policy
5. `WorkspaceAdaptiveLayout` renderer and strip/drawer transition owner

## Ownership Map

- Panel controls initiate user actions but do not decide responsive presentation.
- `useRightPanel.ts` owns right visibility, preferred/effective width, and resize intent; it must not decide whether a strip opens a drawer.
- `useResponsiveWorkspaceShell.ts` owns composition of current store state into the policy input; it must not duplicate candidate ordering.
- `responsiveLayoutPolicy.ts` owns capacity candidates, center-protection mode, presentation source, and the distinction between user-sized override and responsive yield.
- `responsiveStripActivation.ts` owns the activation result for an already-selected strip presentation.
- `WorkspaceAdaptiveLayout.vue` owns DOM rendering, drawer lifecycle, and redock command handling; it must not infer a different fit rule.
- `layouts/default.vue` and `WorkspaceRightToolDrawer.vue` own the visual backdrop for their respective transient drawer surfaces; both must use the same lighter scrim contract and must not alter drawer lifecycle.

## Thin Entry Facades / Public Wrappers

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `useResponsiveWorkspaceShell()` | `resolveResponsiveWorkspaceShellState()` | Composes stores and exposes shared shell state | Candidate ordering or drawer semantics |
| `RightSidebarStrip` emits | `resolveStripActivation` + `WorkspaceAdaptiveLayout` | Converts activation contract into user action | Width/capacity policy |

## Removal / Decommission Plan

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope | Notes |
| --- | --- | --- | --- | --- |
| None | No duplicate or obsolete path is needed for this local invariant fix | Existing resolver and activation owners | In This Change | Do not retain a special drawer suppression flag or compatibility branch |

## Return Or Event Spine(s)

`Responsive resolver -> rightPanel.presentation/stripActivation -> RightSidebarStrip tool click -> request-redock or request-open -> WorkspaceAdaptiveLayout.redockRightPanel/openRightDrawer -> docked panel or WorkspaceRightToolDrawer`

The change only alters which presentation is selected at the compact-fit boundary. It does not alter the event contract.

## Bounded Local / Internal Spines

- Parent owner: `useRightPanel`
- Arrow chain: `mousedown -> user-sized intent -> mousemove delta -> preferred width clamp -> computed effective width -> mouseup cleanup`
- Why it matters: The resolver must consume the intent/effective width produced by this existing loop rather than reimplementing drag math.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Workspace flow measurement | DS-001, DS-002 | `useRightPanel` | Reports available center/right width via `ResizeObserver` | Left shell changes capacity without a right drag | Layout policy would become coupled to DOM measurement details |
| Focus/drawer lifecycle | DS-003 | `WorkspaceAdaptiveLayout` / drawer owner | Modal focus, Escape, backdrop, return focus | Only true drawer states need transient interaction | Policy would be polluted with accessibility mechanics |
| Drawer scrim presentation | DS-003 | Left/right drawer owners | Render the shared approximately 30% black backdrop while preserving modal layering | Keeps visual context without moving visual policy into the resolver | Capacity policy would become coupled to styling |
| Tool selection | DS-003 | `RightSidebarStrip` / `useRightSideTabs` | Select active tool before emitting activation | Keeps selected tab stable through redock/drawer | Width policy would own catalog behavior |

## Ownership Boundaries

The authoritative presentation boundary is `resolveResponsiveWorkspaceShellState`. All callers above it use its returned `rightPanel.presentation`, `effectiveCenterMinWidth`, and `stripActivation`; no layout code computes a second fit threshold. `useRightPanel` is the authoritative width/intent boundary, and the layout consumes its computed width. The strip activation function is authoritative only for selecting the action for the presentation already chosen by the resolver.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `resolveResponsiveWorkspaceShellState` | Candidate ordering, fit math, protection mode, source | `useResponsiveWorkspaceShell` and layout consumers | Layout-local `if (viewport < ...)` drawer/strip rules | Extend the resolver input/output, not the layout workaround |
| `useRightPanel` | Preferred/effective width and drag intent | Shell composition and width consumers | Consumer reading preferred width to replace effective width | Strengthen the composable return contract |
| `WorkspaceAdaptiveLayout` | Drawer open/close and redock commands | Strip event handlers | Strip directly mutating panel stores | Keep strip events declarative and route through layout |

## Dependency Rules

- `useRightPanel` may expose width and intent to the shell; it must not import layout components.
- `useResponsiveWorkspaceShell` may call the responsive policy; it must not call strip or drawer components.
- `WorkspaceAdaptiveLayout` may render and invoke the panel/strip/drawer owners; it must consume resolver output rather than recreate fit math.
- `responsiveStripActivation` may use candidate-fit input supplied by the policy; it must not mutate preferences or open a drawer.
- `RightSidebarStrip` may emit `request-open`/`request-redock`; it must not set visibility directly.
- No generic surface-control row or compatibility presentation path may be introduced.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `useRightPanel().initDragRightPanel(event)` | Right resize state | Record user intent and update preferred width | Pointer event | Existing interface; unchanged |
| `useResponsiveWorkspaceShell()` | Shell composition | Expose one resolved shell state | No selector; current route context | Existing interface; unchanged |
| `resolveResponsiveWorkspaceShellState(input)` | Responsive presentation policy | Select candidate and protection mode | Explicit left/right preferences, widths, intent, viewport dimensions | Modify ordering only |
| `resolveStripActivation(input)` | Strip action | Select redock versus drawer action | Explicit side, preference, candidate, fit function | Existing interface; unchanged |
| `WorkspaceAdaptiveLayout.redockRightPanel()` | Right surface lifecycle | Restore user-visible dock and close transient drawer | No identity | Existing local command; unchanged |

## Interface Boundary Check

| Interface | Responsibility Is Singular? | Identity Shape Is Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `resolveResponsiveWorkspaceShellState` | Yes | Yes | Low | Keep one policy boundary |
| `resolveStripActivation` | Yes | Yes | Low | Keep action separate from presentation |
| `useRightPanel` width API | Yes | Yes | Low | Preserve actual/effective width semantics |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Right panel resize intent | `rightPanelResizeIntent` | Yes | Low | Keep explicit name |
| Responsive right surface | `rightPanel.presentation` | Yes | Low | Keep docked/strip vocabulary |
| Compact center floor | `USER_RESIZE_CENTER_MIN_WIDTH_PX` | Yes | Low | Keep constant and document semantics |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Capacity candidate ordering | Responsive workspace layout policy | `Extend` | Existing resolver already owns this invariant | N/A |
| Right tool activation | Strip activation / workspace layout | `Reuse` | Existing contract already distinguishes redock and drawer | N/A |
| Regression tests | Existing layout/composable test suites | `Extend` | Tests are colocated with policy and rendering owners | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| Responsive workspace shell | Candidate fit, protection mode, presentation source | DS-001 | `responsiveLayoutPolicy.ts` | `Extend` | Single policy change |
| Right panel layout state | Width, visibility, resize intent | DS-002 | `useRightPanel.ts` | `Reuse` | No state model change |
| Workspace interaction surfaces | Strip/drawer/redock rendering | DS-003 | `WorkspaceAdaptiveLayout.vue` | `Reuse` | Add regression coverage only |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/utils/layout/responsiveLayoutPolicy.ts` | Responsive workspace shell | Presentation policy | Evaluate compact user-sized dock before manual-left automatic fallback | One resolver owns candidate ordering | `SurfaceCandidate`, constants |
| `autobyteus-web/utils/layout/__tests__/responsiveLayoutPolicy.spec.ts` | Responsive workspace shell | Policy tests | Fit/fail boundary and protection-mode assertions | Colocated pure policy coverage | Existing resolver input shape |
| `autobyteus-web/components/layout/__tests__/WorkspaceAdaptiveLayout.spec.ts` | Workspace interaction surfaces | Rendered shell tests | Reported journey and explicit collapse redock | Colocated component behavior coverage | Existing stubs and stores |
| `autobyteus-web/layouts/default.vue` | Workspace interaction surfaces | Left drawer owner | Reduce left backdrop darkness to the shared target | Existing left drawer presentation owner | Existing drawer lifecycle |
| `autobyteus-web/components/layout/WorkspaceRightToolDrawer.vue` | Workspace interaction surfaces | Right drawer owner | Reduce right backdrop darkness to the shared target | Existing right drawer presentation owner | Existing drawer lifecycle |
| `autobyteus-web/docs/workspace_layout.md` | Durable project docs | Layout contract | Document precedence and fallback | One durable behavior record | Existing terminology |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? | Overlapping Representations Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Candidate shape and fit math | Existing `responsiveLayoutPolicy.ts` / `responsiveStripActivation.ts` | Responsive workspace shell | Already shared by presentation and activation decisions | Yes | Yes | A second layout-local candidate type |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Parallel / Overlapping Representation Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `ResponsiveWorkspaceShellInput` | Yes | Yes | Low | Keep explicit preference, width, intent fields |
| `SurfaceCandidate` | Yes | Yes | Low | Use current left/right presentation and strip behavior only |
| `ResponsiveRightPanelState` | Yes | Yes | Low | Do not add a second “forced dock” flag |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/utils/layout/responsiveLayoutPolicy.ts` | Responsive workspace shell | Authoritative policy | Reorder user-sized compact candidate before automatic manual-left fallback | All presentation fit policy remains centralized | Existing constants/types |
| `autobyteus-web/utils/layout/__tests__/responsiveLayoutPolicy.spec.ts` | Responsive workspace shell | Pure policy tests | Boundary and fallback regression cases | Keeps mathematical contract local | Existing policy input |
| `autobyteus-web/components/layout/__tests__/WorkspaceAdaptiveLayout.spec.ts` | Workspace interaction surfaces | Adaptive layout | No unexpected strip/drawer and explicit redock journey | Proves DOM outcome and event mapping | Existing test stubs |
| `autobyteus-web/layouts/default.vue` | Workspace interaction surfaces | Left drawer | Apply approximately 30% scrim | Existing left drawer owner | Existing drawer lifecycle |
| `autobyteus-web/components/layout/WorkspaceRightToolDrawer.vue` | Workspace interaction surfaces | Right drawer | Apply approximately 30% scrim | Existing right drawer owner | Existing drawer lifecycle |
| `autobyteus-web/docs/workspace_layout.md` | Durable docs | Layout contract | Explain user-sized precedence | Keeps long-lived behavior discoverable | Existing docs |

## Applied Patterns

- Existing candidate-first responsive policy: candidate fit is decided centrally, then state is created.
- Existing explicit activation contract: `redock-panel` and `open-drawer` are outputs, not inferred by controls.
- Existing preferred/effective width split: user intent is retained while actual geometry is constrained.

## Target Subsystem / Folder / File Mapping

| Path | Kind | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/utils/layout/responsiveLayoutPolicy.ts` | File | Responsive policy | Add/reorder compact user-sized candidate selection | Existing authoritative fit boundary | Drawer or DOM logic |
| `autobyteus-web/utils/layout/__tests__/responsiveLayoutPolicy.spec.ts` | File | Policy tests | Add compact-fit, compact-fail, and explicit-hidden cases | Colocated pure behavior | Implementation branches |
| `autobyteus-web/components/layout/__tests__/WorkspaceAdaptiveLayout.spec.ts` | File | Layout tests | Add rendered sequence checks | Colocated UI owner | Resolver math duplication |
| `autobyteus-web/layouts/default.vue` | File | Left drawer owner | Use lighter shared backdrop opacity | Keeps left drawer presentation local | Right drawer implementation |
| `autobyteus-web/components/layout/WorkspaceRightToolDrawer.vue` | File | Right drawer owner | Use lighter shared backdrop opacity | Keeps right drawer presentation local | Left drawer implementation |
| `autobyteus-web/docs/workspace_layout.md` | File | Docs | Record updated behavior | Existing layout contract | Test-only details |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth | Ownership Boundary Is Clear? | Mixed-Layer Or Over-Split Risk | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `autobyteus-web/utils/layout` | Main-line policy | Yes | Low | Existing policy subsystem |
| `autobyteus-web/components/layout` | Main-line UI surface | Yes | Low | Existing adaptive layout owner |
| `autobyteus-web/docs` | Off-spine durable contract | Yes | Low | Documentation only |

## Concrete Examples / Shape Guidance

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Candidate order after left collapse | `left strip + right dock + 200px center` is tested before `left strip + right dock + 480px center`, then strip fallback | `left strip + right dock + 480px` fails -> immediately choose strip -> later user-sized branch is unreachable | Shows the exact missing invariant |
| Drawer classification | Responsive visible strip -> `open-drawer`; fitting explicit hidden strip -> `redock-panel` | Strip click always opens drawer, or control decides based on viewport independently | Keeps preference and presentation semantics separate |

## Backward-Compatibility Rejection Log

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Layout-local “never open drawer after drag” flag | Could mask the reported drawer symptom | `Rejected` | Fix resolver classification; preserve activation contract |
| Duplicate forced-dock state in `WorkspaceAdaptiveLayout` | Could bypass policy ordering | `Rejected` | Resolver returns the correct docked state |
| Legacy alternate candidate path retained beside new path | Could preserve old ordering | `Rejected` | Reorder the single authoritative candidate path and remove no-op branch if introduced |

## Derived Layering

Not used as a separate architecture boundary. The existing policy -> composition -> rendering relationship is sufficient; adding layers would obscure the small state-ordering correction.

## Change / Refactor Sequence

1. Add the missing policy regression cases first: left preference hidden, right preference visible, user-sized intent, compact-fit boundary; assert docked/user-override.
2. Add a compact-fail case; assert right strip/responsive-yield/open-drawer semantics remain unchanged.
3. Modify `resolveResponsiveWorkspaceShellState()` so the user-sized candidate uses the current left presentation (`strip` when left is user-hidden) and is evaluated before the manual-left-collapse automatic branch. Preserve the existing narrow/short-height guards and right-hidden behavior.
4. Add/adjust the adaptive layout journey test to prove dock persistence, absence of strip/drawer, and explicit right-collapse redock.
5. Run focused tests and, if available, the browser responsive probe; inspect the diff for no duplicate policy.
6. Update `autobyteus-web/docs/workspace_layout.md` to record the precedence and genuine-constraint fallback.
7. Change both left and right drawer backdrops to the shared approximately 30% black target; verify drawer lifecycle and opposite-strip hit testing remain unchanged.

No temporary compatibility seam is required. No obsolete code path should remain after the reorder.

## Key Tradeoffs

- Evaluating user-sized intent earlier gives explicit user resizing precedence over automatic protection, which matches the existing `user-override` concept.
- The compact floor remains a hard capacity boundary; the design does not force an over-wide dock into a viewport that cannot support it.
- Keeping activation unchanged avoids coupling width policy to drawer accessibility behavior.
- A lighter shared scrim improves context without changing modality; separate backdrop owners remain responsible for rendering their own scrim.

## Risks

- A resolver test that passes a preferred width instead of production effective width could assert a slightly different threshold. Add tests at both a compact-fit numeric boundary and a compact-fail boundary, and preserve the production composition input.
- A full browser probe may not be available without a running workspace fixture. Focused executable coverage must not be skipped.
- Updating documentation without clearly distinguishing explicit collapse from responsive yield could reintroduce the ambiguity; use the terminology in this spec.
- A CSS opacity change can be visually subtle across themes; verify both drawer owners use the same target value and perform browser or screenshot validation when available.

## Guidance For Implementation

- Prefer a small helper or candidate selection expression that makes “current left presentation + user-sized right dock” obvious; do not introduce a new `forceDock` boolean.
- Ensure `createState()` receives `centerProtectionMode='user-override'` and `effectiveCenterMinWidth=USER_RESIZE_CENTER_MIN_WIDTH_PX` for the compact-fit candidate.
- Keep the `isNarrow` and `isShortHeight` gates intact.
- If the user-sized candidate fails, fall through to the existing left-hidden and responsive candidates so the existing drawer behavior remains available.
- Add explicit assertions for `rightPanel.presentationSource`, `stripActivation`, and drawer absence/presence where relevant.
- No persisted-data migration, API change, or UI restyle is required.
- For scrims, use approximately 30% black (acceptable 25–35%) in both `layouts/default.vue` and `WorkspaceRightToolDrawer.vue`; do not change backdrop ownership, z-index, focus, or dismissal behavior.
