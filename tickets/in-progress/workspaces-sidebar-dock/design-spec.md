# Design Spec — Workspaces candidate-relative docking

## Solution And Approval Basis
- Package: workspaces-sidebar-dock; current solution **SR-003** (R2 acceptance-only revision); technical design remains SR-002 unchanged.
- Requirements: **Approved R2/SR-003**, user direct “continue” after source-only acceptance proposal2026-10-13, exact context in requirements-doc.md and evidence/solution-acceptance-r2.md. R1/SR-001 functional intent and SR-002 technical design preserved. Only installed-client/acceptance disposition changed; no source behavior or design algorithm delta.
- Design status: **Ready**.
- Canonical investigation: `/home/autobyteus/workspace/.codex/worktrees/workspaces-sidebar-dock/tickets/in-progress/workspaces-sidebar-dock/investigation-notes.md`.
- Authorities read fully: solution-designer SKILL.md; references/architecture-design.md and design-principles.md; design-spec-template.md; root `/home/autobyteus/workspace/.codex/worktrees/workspaces-sidebar-dock/DESIGN.md`, AGENTS.md, TESTING.md; autobyteus-web/AGENTS.md; docs/workspace_layout.md (2026-10-13). No closer DESIGN*.md. Design-examples: N/A, local shape explained here.
- Project/general design conflicts: None. Documentation's measured-capacity description must be updated for authoritative candidate allocation; no competing product specification.

## Current-State Read
INV-001,003–006 trace complete path. Workspaces follows left strip activation, not CSS breakpoint directly. Candidate fit keeps the current right effective width fixed when replacing a50px strip with320px dock. That width was clamped for old flow geometry; the next flow cannot update before click is classified. An inappropriate drawer follows and legitimately renders the30% scrim. Forced left visibility alone yields the right surface to strip. Correct geometry must be chosen prospectively, not by backdrop styling or post-click observer timing.

## Architecture Investigation Evidence
| Investigation reference | Design implication | Uncertainty |
| --- | --- | --- |
| INV-001 and baseline-policy-reproduction.json | Same candidate allocation must govern fit, strip activation and rendered right width | Baseline source reproduction only; rendered reproduction required downstream |
| INV-003 / architecture findings | Provider supplies retained raw preference; policy computes effective geometry without DOM feedback | Preserve measured drag/browser-resize uses of useRightPanel, not every measurement is obsolete |
| INV-004 / accessible drawer lifecycle | Existing conditional dock/drawer rendering and lifecycle should remove false scrim; retain actual constrained drawers | Validate no stale listeners/hit blockers through transitions |
| INV-002,009 | Renderer/platform/build cannot be inferred from connected backend or titlebar | Actual client/version unconfirmed and installed check deferred under user-approved R2; Delivery must not claim update |

## Intended Change
Use the existing responsive shell resolver as the single capacity authority. Fit the prospective complete layout with a bounded effective right width; preserve raw user preference. Dock Workspaces when existing minima can coexist; retain legitimate responsive strips/drawers.

## Relevant Behavior And Production-Path Map
| Behavior | Approved intent | Trigger / evidence | Target path and spine |
| --- | --- | --- | --- |
| BEH-001 | REQ-001,003 / AC-001–002 | Collapse, divider drag, Workspaces / INV-001–004 | LeftSidebarStrip activation→default redock→left preference→provider→candidate policy→flow-docked left/right; DS-001 |
| BEH-002 | REQ-002–003 / AC-002–004 | Drag/viewport resize / INV-003 | useRightPanel retains preference/intent→provider raw width and viewport→policy bounded candidates→WorkspaceToolShell effective rendered width; DS-002/003 |
| BEH-003 | REQ-003–004 / AC-004–005 | Real narrow/short drawer open/dismiss/recover / INV-004 | Policy activation→appLayout flag→default drawer→useAccessibleDrawer lifecycle→normal flow/focus; DS-004 |
| BEH-004 | REQ-004–005 / AC-006–007 | Navigation/delivery / request | Keep route/run/tab/data owners unchanged; realistic selection and isolated delivery proof outside geometry algorithm; DS-001/004 preservation |

## Task Design Health Assessment
- Posture: Bug Fix. Issue: **Missing Invariant**, locally within existing responsive policy: preferred size is bounded per prospective layout, not treated as an immutable dock requirement.
- Refactor needed now: **No subsystem/ownership refactor**. Correct the local geometry invariant and provider input in existing owners. No new registry, service, facade, breakpoint, route or persistence needed.
- Evidence: provider already owns composition, policy already owns candidate fit and presentation, layout already renders resolved right width. Existing observer is appropriate for drag limits/BrowserPanel, not for determining the prospective layout.
- Structural triggers ruled out: repeated policy across UI callers (all share resolver), file placement (current utils/layout + composables/layout fit responsibilities), ambiguous identity/API (none), mixed boundary (no new bypass). No broad file split justified.
- Intentional deferral: exact affected installed client and macOS rendering cannot be established in this Linux container; this is a delivery-evidence limit, not a reason to invent a new architecture or claim user runtime updated.

## Terminology
Raw preference: useRightPanel.preferredRightPanelWidth, retained across responsive constraints. Effective right width: right width that fits a particular prospective candidate. Current output field rightPanel.preferredWidth already serves rendered effective width (provider currently supplies measured clamp); preserve public output shape and document this distinction.

## Legacy Removal Policy
Clean-cut replacement of fixed-current-width candidate fit and measured-effective-as-preferred provider wiring. No parallel old/new option or compatibility wrapper. True narrow/short drawer is supported behavior, not obsolete code.

## Persisted Data / State Transition Decision
**Not Affected**. Touched owners use in-memory layout refs only. No model, serializer, storage or backend reader/writer change; no migration/reset/startup gate. REQ-004 / AC-006: preserve all conversations, Tasks, documents and active workers. Migration plan: N/A — no persisted transition.

## Data-Flow Spine Inventory And Primary Execution Spines
| Spine | Scope / behaviors | Start→end | Governing owner / why |
| --- | --- | --- | --- |
| DS-001 | Primary / BEH-001,004 | User Workspaces click→strip activation→default redock/left preference→responsive provider→candidate policy→docked sidebar/content/tools | Existing responsive shell; span includes meaningful visible result, not just edited helper |
| DS-002 | Primary / BEH-002 | User divider drag→useRightPanel preference/intent→responsive provider→candidate allocation→WorkspaceToolShell widths→usable conversation/tools | Existing policy capacity; measured drag owner retained |
| DS-003 | Return-Event / BEH-002–003 | Window resize→viewport ref→policy recalculation→DOM flow→ResizeObserver measurement→drag limit/browser resizing | Provider/policy for presentation; measurement cannot become preferred-size authority |
| DS-004 | Primary+local lifecycle / BEH-003–004 | User constrained open/dismiss→appLayout flag/policy→default modal→accessible drawer registry→focus return / clean flow | Existing drawer lifecycle; unchanged implementation unless proof finds owned local defect |

## Spine Narratives, Actors And Ownership Map
DS-001: Before click the policy already knows the layout that replacing the strip would produce. LeftSidebarStrip exposes redock-panel only for a fitting prospective candidate. default.vue sets left visible and clears menu. The same allocation resolves both docks after preference changes; visible content is displaced and no modal registers.
DS-002: useRightPanel owns visibility, preferred width, resize intent and measured drag clamping. useResponsiveWorkspaceShell composes these inputs and viewport, but makes no fit decision. Policy owns sanitized values, candidate geometry, presentation and activation. WorkspaceToolShell renders policy widths; default renders left surface. Preferred width must not be overwritten merely by opening navigation.
DS-003: Viewport changes recalculate prospectively independent of whether previous DOM was dock/strip. The resulting flow updates measurement for future drag bounds and BrowserPanel. This event return is observational, not an alternative policy path.
DS-004: Genuine insufficient capacity uses existing modal owner; Tab/Escape/backdrop/focus are preserved. When activation ceases to be open-drawer, the existing watcher closes menu and lifecycle deregisters modality.

## Off-Spine Concerns Around The Spine
| Concern | Serves | Responsibility / placement |
| --- | --- | --- |
| Strip activation utility | Policy / DS-001,004 | Choose null/redock/drawer from presentation, user source, narrow/short flags and candidate fits; reuse candidate-aware fit closure |
| Viewport observation | Provider / DS-003 | Existing window.innerWidth/innerHeight resize listener; no new screen or parent-width heuristic |
| Flow ResizeObserver | useRightPanel / DS-002–003 | Drag clamp and measured resize notifications; retain but do not feed effective width back as raw preference |
| Accessible drawer registry/focus resolver | default/tool drawers / DS-004 | Existing lifecycle and topmost modal keyboard ownership; no scrim CSS hiding |
| Route/selection/history/tab owners | Existing screens / BEH-004 | Preserve without taking layout responsibilities; no additional selection/refetch operations |

## Ownership Boundaries, Encapsulation And Dependency Rules
Authoritative API is resolveResponsiveWorkspaceShellState(input). It encapsulates internal candidate width/fit calculations. UI consumes supplied presentation/activation/width; no UI-specific breakpoint, force-dock, opacity hack or hidden bypass to resolver internals. Provider reads existing useLeftPanel/useRightPanel raw state and viewport. Drag remains useRightPanel; never reset preferred width as a side effect of layout. Thin facade provider only composes/reacts; it must not invent separate capacity policy.

## Interface Boundary Mapping And Check
| Interface | Subject / responsibility | Shape / check |
| --- | --- | --- |
| ResponsiveWorkspaceShellInput | Sanitized capacity and retained layout preferences | Existing named scalar dimensions/preferences; rightPanelPreferredWidth receives raw preference. No identity ambiguity |
| Internal candidate width/fit helper | Prospective shell geometry | Explicit candidate,left width,right preference,viewport,center floor; one meaning per argument; helper stays private |
| ResponsiveWorkspaceShellState | Rendered effective surfaces/activation | Existing output fields unchanged; rightPanel.preferredWidth carries effective dock width, raw preference remains in composable |
| setRightPanelWorkspaceWidth / initDragRightPanel | Observed flow / user's drag | Existing explicit width/mouse event; no new subject conflation |
Singular responsibilities: Yes. Selector ambiguity: Low. No external API or SDK contract change.

## Allocation Algorithm And Concrete Examples
1. Change provider to read `preferredRightPanelWidth` rather than `rightPanelWidth` as policy input. Leave measured effective width available for drag and BrowserPanel.
2. In the policy, compute right width for each **candidate** using that candidate's left consumed width and logical handles. For right dock:
   `maxRight = viewport - candidateLeftWidth - candidateLeftHandle - rightHandle - candidateCenterFloor`.
   `effectiveRight = max(RIGHT_PANEL_MIN_WIDTH_PX, min(sanitizedRightPreference, maxRight))`.
   If capacity is below the right minimum, the normal fit sum exceeds viewport and candidate fails; never claim fit by shrinking below400px. For right strip, keep50px reservation and existing drawer preferred-width behavior.
3. Use the same bounded width for candidate selection, prospective strip redock `fits`, and returned rendered width. Do not compute fits with one width and render another. Retain user source, narrow<768, short<=480, 480px automatic center and200px user-sized/responsive-yield floors, current candidate priority and consuming strip semantics.
4. Apply candidate bounding to **automatic as well as user-sized docks**. Current DOM measurement already bounds automatic right widths: switching provider to raw input without this would regress ordinary1210–1259px layouts (320+6+400+4+480=1210px). Preserve that bounded automatic behavior; do not extend compact post-drag floor to automatic docks.
5. Current-state allocation and prospective redock use each actual center-protection mode as today. No broad reorder of candidate priorities or material right-strip activation behavior.

Example1440×800,320px left,preferred right1186,user-sized: left hidden candidate has effective right1186 and200px center; prospective left dock has effective right910 (`1440−320−6−4−200`). It fits; click docks, scrim absent, preference1186 remains. Collapse recovers1186. Default full-dock minimum after drag930px; at929 there is no400px right dock beside320px nav+handles+200px center, so fallback remains. Non-default left520 makes minimum1130. Ordinary automatic default both-dock minimum1210 with480px center; preserve existing bounded width400 at that boundary. Logical handles conservatively account for known overlap; do not change visual handle margins to conceal violations.

## Existing Capability Reuse / Subsystem Allocation
Extend existing responsive-layout policy and existing provider only. Reuse strips, default shell, WorkspaceToolShell, useRightPanel and accessible drawer. No new capability area, module, persistence, cache, event registry or dependency.

## Draft / Final File Responsibilities And Target Mapping
Draft and final mapping are identical: no duplicated shared structure demands extraction. Existing SurfaceCandidate and scalar input/output interfaces suffice; avoid a new geometry DTO unless it materially reduces repeated internal calculations.
| Change / path under autobyteus-web | Responsibility / why here / must not contain |
| --- | --- |
| Modify utils/layout/responsiveLayoutPolicy.ts | Private candidate-relative effective right allocation used consistently in fit and state; existing policy owns geometry. No DOM/mutable state/backend |
| Modify composables/layout/useResponsiveWorkspaceShell.ts | Compose raw preference into resolver. No independent capacity decisions |
| Modify utils/layout/__tests__/responsiveLayoutPolicy.spec.ts | Exact/neighbor capacity boundaries, preferred-width reallocation and narrow/short/automatic preservation; replace obsolete oversize-means-strip assertion |
| Modify/add composables/layout/__tests__/useResponsiveWorkspaceShell.spec.ts | Real provider input and viewport changes; prove raw preference independent of stale measured effective width |
| Modify layouts/__tests__/default-drawer.spec.ts or add focused default docking spec | Real strip click/dock/no-backdrop plus resize drawer lifecycle; stub unrelated content only |
| Modify affected WorkspaceToolShell/WorkspaceAdaptiveLayout test helpers | Keep helper input representative of production raw preference; retain useRightPanel drag tests |
| Add tests/e2e/workspaces-sidebar-dock-probe.mjs with package script or extend an owned self-starting renderer probe | Durable shell pointer geometry/hit-test/selection journeys; own ports/data/processes and cleanup. Avoid requiring user's service |
| Update docs/workspace_layout.md at docs-sync | Explain retained preference vs policy effective candidate width and measured drag owner; remove obsolete immutable-width fallback description |
Code file/folder ownership clear: policy utils/layout, composition composables/layout, view layouts/components, colocated tests and e2e. Existing organization is clearer than new layers. Naming remains natural; no export/field rename required. Applied pattern: existing pure candidate policy, not new Strategy/Factory. Shared structures: no redundant new representation; existing output retained. Other source changes require evidence and Design Impact if material.

## Removal / Decommission Plan
| Item | Evidence / replacement | Scope |
| --- | --- | --- |
| Measured-effective-as-preferred provider wiring | INV-003; replace with raw retained preference | In change |
| Candidate fit's fixed current-right assumption | INV-001; replace with same bounded candidate allocation used to render | In change |
| Tests requiring strip solely because a preferred right width exceeds old capacity by1px | INV-006; replace with true minimum-capacity boundary and stable preferred-width restoration | In change |
| Dead code in touched modules | None proven. All returned useRightPanel state/methods have production or drag/browser callers; do not delete measurement API on speculative dead-code claim | N/A |
No compatibility wrappers, dual paths or legacy switches retained. Backward-compatibility rejection: a force-dock special case that leaves old fit logic authoritative is rejected; pure replacement above. Derived layering: N/A — no new layering needed.

## Change / Refactor Sequence
1. Capture rendered baseline on an isolated task-owned stack/current base before source edits; confirm CSS dimensions and real divider trigger, not injected state alone.
2. Update policy candidate allocation and raw preference wiring together; preserve automatic boundaries. Adjust test helpers/obsolete assertions, add regression coverage.
3. Run focused unit/component/drag/drawer tests and browser geometry/hit-test journeys. Use actual product shell owners with fully supplied fixture boundaries or isolated backend; fail on browser errors.
4. Validate realistic workspace/run selection in an isolated current Electron worktree build per TESTING.md; Linux root requires unprivileged identity and owned display, not --no-sandbox. If actual affected surface confirms desktop, browser proof is not native proof. macOS-specific final check may remain user-only, stated honestly.
5. API/E2E provides independent executable proof; Delivery syncs affected docs, verifies user-facing surface, applies RELEASE.md, finalizes/releases only as authorized, reports runtime and cleanup separately.

## Key Tradeoffs And Risks
Temporary effective resizing is preferable to dimming or hiding a usable right panel; retained preference restores user intent. Use existing minima rather than a screenshot-derived wide threshold. Constant-time policy; no history/backend work or scaling machinery.
Risks: inconsistent candidate fit/output; initial zero-dimension viewport; automatic1210px regression when raw input introduced; measured drag overlap tolerances; narrow→wide stale modality; singleton state leaks in tests. Cover them directly. Installed client's exact version remains unknown, not source-architecture uncertainty; rendered evidence may discover a different cause and must return Design Impact rather than broaden silently.

## Guidance For Implementation And Verification
AC-001–007 are completion authority. Capture Team and Activity before/after rects, viewport/dpr, resolved presentations and width preference/intent; at least3 cycles; intermediate and near-max divider positions before/after open; non-default left widths; wide/narrow/short/automatic boundary; keyboard/backdrop focus; route/run/tab invariants and real workspace/conversation selection. Assert elementFromPoint and click effects for conversation/right controls, center/right minimum widths, no overlapping sidebar or leftover modal listeners; screenshots supplement, not replace assertions. Preserve supplied input evidence, logs, exact commands, instance/build identity and cleanup receipts. Do not use or restart live8001 for tests; do not spend provider credits for this UI bug. R2 permits source-only finalization with installed identity/verification explicitly deferred. Do not block that disposition on reasking settled acceptance or repeat sufficient source tests. Any future publication/installed update/restart requires a separate direct request/approval and affected-client confirmation.

## Change Scope
UC-001–004: bounded responsive geometry/provider wiring, corresponding tests/probe and affected layout docs. Deliberately leave selection/history/runtime workers/backend/persistence/PDF/member-collapse/mobile/immersive and Electron main unchanged; they are preservation checks, not rewrite targets. Follow-ups: **None** currently requiring a separate Task. Material newly discovered out-of-scope issues go to task manager, not into this fix.

## Task Size And Architectural Risk
- `task_size`: **Medium** — two closely related production files within the existing frontend shell plus colocated tests and an owned rendered probe; no broad refactor.
- `architectural_risk`: **Low** — existing policy/provider/render/lifecycle boundaries absorb constant-time allocation; no new owner, external API, persistence/security/concurrency/deployment change. Full relevant paths/callers read; policy source reproduction establishes root cause. User's installed-client identity is a transparent delivery verification gap, not an unknown source integration.
- Payload inventory: screenshot/log/docs evidence; does not inflate classification. Structural delta: local policy width invariant and composition of existing raw preference; no new structural subsystem.
- Escalation: different rendered cause, new lifecycle/owner contract, Electron-main/platform change, backend update, storage/reset, material policy/breakpoint alteration, unsafe runtime update or service disruption → stop affected work and return Design Impact/Requirement Gap for reclassification/approval.
- Independent review artifacts: **N/A — not applicable** pending rule-selected route; no fictitious pass.

## SR-003 Acceptance-Only Alignment
R2 changes only BEH-004/SCN-004/REQ-005/AC-007/ASM-001 completion disposition, not geometry, preservation, files, lifecycle or architectural risk. Existing IR-001 and API-REV-001 evidence and DR-001 integrated checks remain applicable to unchanged AC-001–006. No independent review or implementation replay is triggered. Delivery must still refresh/check the effective integration state, finalize/archive/push and perform cleanup under RELEASE.md; installed verification remains Deferred—user-approved source-only, not Passed. This alignment is not Delivery Completed/Terminal.
