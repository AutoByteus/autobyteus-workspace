# UI/UX Specification — Approved Current-State Baseline

This is the canonical prototype-owned UI/UX supplement for package
`initial-prototype-baseline`. It defines the accepted current experience of
`autobyteus-web` at the pinned source revision. It does not introduce a
future-state design.

The final screenshots are normative visual implementation references: every
visible detail is requirements-defining unless this specification explicitly
identifies it as illustrative fixture content or permitted variation. For
complete route/state coverage beyond the selected final visual anchors, the
matched source-versus-prototype rows in `parity-inventory.md` remain the exact
current-state evidence.

## Status And User Confirmation

- Status: **Approved**
- Package: `initial-prototype-baseline`
- Related requirements revisions: `RER-002` established the approved UI/UX
  basis; `RER-004` and `RER-007` corrected repository placement without an
  observable delta; `RER-009` restored the pinned-source Agent Team launch and
  launched-member selection journey; and `RER-011` authorizes the final
  non-observable integration of that accepted package on `personal`.
- Product Prototyper acceptance references: `PPA-001` for the complete original
  baseline and `PPA-002` for the focused `RER-009` correction.
- Source application: `/home/autobyteus/workspace/.codex/worktrees/initial-prototype-baseline/autobyteus-web`
- Source authority: `origin/personal` pinned at bootstrap kickoff to
  `8ef282ba77705180d985e7000d801f0e0068cdc1`
- Runnable prototype root: `/home/autobyteus/workspace/autobyteus-workspace/autobyteus-web-prototype`
- Owning repository/branch:
  `/home/autobyteus/workspace/autobyteus-workspace` / `personal`
- Review URL: <http://127.0.0.1:3210>
- Explicit user-confirmation references: user message **“approved”** on
  `2026-08-22`, immediately following the Product Prototyper request to review
  the complete corrected current-state baseline; and user message
  **“done. i checked. thanks”** on `2026-08-24`, immediately following the
  explicit request to approve the corrected `RER-009` launch/member-selection
  journey at the review URL.
- Approval boundary: the complete current-state parity baseline only; no
  future-state delta, redesign, production architecture, or production
  engineering was approved.
- UI approval dates: `2026-08-22` and `2026-08-24`
- Repository-placement validation date: `2026-08-24`
- Final visual capture result: `17/17` without browser errors or external
  resources; the preserved `VIS-001`–`VIS-015` hashes remain exact and
  `VIS-016`–`VIS-017` anchor the user-confirmed `RER-009` states.
  The evidence clock is fixed to `2026-08-22T16:50:00.000Z` so illustrative
  relative timestamps reproduce deterministically. See
  `final-reference-screenshots/manifest.json`.

## Scope And Experience Goal

- User or actor: product reviewer; desktop owner using a trusted node;
  Electron/internal-node or Electron/external-node user; and a trusted paired
  mobile user.
- Context: isolated, deterministic review of the complete current
  `autobyteus-web` interface without production data, credentials, services,
  writes, Electron, native processes, or external integrations.
- Goal: inspect and exercise the exact current interface, including catalogs,
  setup and settings, agent/team workspaces, host-specific capabilities,
  responsive and localized presentations, mobile remote access, and all
  meaningful loading, empty, populated, error, permission and recovery states.
- Observable success: every stable inventory row has controlled source and
  prototype evidence, every recorded journey has matched post-action behavior,
  and no known perceptible or behaviorally meaningful discrepancy remains.
- In-scope surfaces and journeys: `ROUTE-001`–`ROUTE-041`, `CFG-001`–`CFG-011`,
  `STATE-001`–`STATE-013`, `HOST-001`–`HOST-008`, `WKS-001`–`WKS-023`,
  `MOB-001`–`MOB-014`, 239 locale/responsive matrix rows, `JRN-001`–`JRN-050`,
  and discovery groups `DISC-001`–`DISC-017`.
- Non-goals: redesign; new behavior; Android or iOS as independent client
  baselines; production backend/runtime fidelity; target architecture;
  deployment; migration; production-readiness proof; and silent tracking of a
  later moving branch head.

## Related Requirements And Acceptance Criteria

| Behavior / Requirement / AC ID | UI/UX obligation | Covered journey / surface / state |
| --- | --- | --- |
| `BEH-001`, `REQ-001`, `AC-001` | Identify the exact selected frontend and reproducible source revision. | All rows and references report the pinned commit; runtime exposes the same pin. |
| `BEH-002`, `REQ-002`, `AC-002` | Preserve every supported/discoverable route, surface, state, interaction, role, configuration and validated viewport. | Complete stable inventory listed above and in `parity-inventory.md`. |
| `REQ-003`, `AC-003` | Retain the Nuxt 3, Vue, TypeScript, pnpm, routing and design-language conventions of the source. | Runnable implementation plus 369/369 exact retained presentation files. |
| `BEH-003`, `REQ-004`, `AC-004` | Keep states and transitions real while replacing production boundaries with deterministic synthetic behavior. | `prototype-scenarios.md`, `mock-boundaries.md`, all state rows and journeys. |
| `REQ-005`, `AC-005` | Require controlled source-versus-prototype evidence and zero known observable discrepancies. | 110/110 rendered rows, 239/239 matrix rows and 50/50 journeys pass. |
| `REQ-006`, `AC-004` | Keep the prototype isolated, resettable and free of production credentials, data, writes and ordinary-review network dependencies. | Boundary validation, local Monaco assets, runtime capture manifest, reset action. |
| `REQ-007`, `AC-006` | Do not add future-state UI before discrepancy-free Product Prototyper acceptance. | `PPA-001`, `PPA-002`; intentional current-state deltas: none. |
| `AC-010` | Agent Teams catalog **Run** must create the exact valid Team draft and navigate to `/workspace` without browser error. | `JRN-050-A`–`JRN-050-B`; `VIS-016`. |
| `AC-011` | **Run Team** must create and select exactly one deterministic synthetic Team context under the chosen workspace, with the Team and configured members selectable. | `WKS-022`, `WKS-023`, `JRN-050-C`–`JRN-050-E`; `VIS-017`. |
| `AC-012` | Terminal validation must enforce the full controlled source-versus-prototype lifecycle rather than a pre-seeded state. | `JRN-050-A`–`JRN-050-E`, `validate:gap-010`, `validate:final-package`. |
| `AC-013` | The RER-009 correction and review remained isolated to the specified ticket worktree and branch until separately authorized integration. | Preserved task-branch history and pre-integration Git evidence. |
| `AC-014`, `AC-015` | Direct `personal` integration must preserve concurrent remote history and every approved artifact without merge/force push or observable change. | RER-011 rebase-preservation record, focused/final/build/HTTP validation, unchanged VIS-001–VIS-017 hashes, and final ref-equality proof. |
| `QR-001` | Preserve observable keyboard, focus, semantic and accessibility intent. | `JRN-002`, `JRN-004`, `JRN-009`, `JRN-013`, `JRN-022`, `JRN-030`, `JRN-045` and `DISC-011`. |
| `QR-002` | Reproduce the same result for the same scenario/context/action sequence. | Deterministic scenario catalog, screenshot/body hashes and resettable local state. |
| `QR-003` | Use no production credentials, production/customer data or service. | `mock-boundaries.md` and `validate:boundaries` pass. |

## Production-Quality Experience And Visual Specification

### Existing Product Language To Preserve

Preserve the source product’s restrained, information-dense utility language:
light neutral surfaces, compact controls, left-oriented navigation, blue
primary actions, status colors used semantically, thin borders, small-radius
cards, icon-plus-label navigation, and workspace panes that prioritize active
conversation and operational tools. Do not restyle this baseline into a
generic dashboard, increase density arbitrarily, or introduce decorative
imagery not present at the pin.

### Information Hierarchy

1. The global shell or mobile remote-access shell establishes product context.
2. Desktop navigation and workspace/run history occupy the left surface.
3. The selected route or active agent/team conversation is the primary center
   surface.
4. Workspace tools, files, activity, team members/messages, token usage,
   artifacts, terminal and host viewers occupy the optional right surface.
5. Settings use a dedicated back-to-workspace control, section navigation and
   one selected settings panel.
6. System gates, confirmation dialogs, drawers, toasts and errors appear above
   the current surface without silently changing its underlying context.

### Navigation And Orientation

- Desktop global navigation retains Agents, Agent Teams, Applications when
  enabled, Skills, Memory and Nodes, with Workspaces/history below and Settings
  anchored at the bottom.
- Route/query-state selection remains visible through the matching list,
  detail, create, edit, tab or settings-section presentation.
- Applications-disabled mode removes its navigation item and recovers a direct
  `/applications` visit to the Agents surface (`VIS-014`).
- Workspace context preserves the selected agent/team run and focused member;
  left/right collapse controls retain discoverability through 50 px strips.
- Narrow mode uses consuming strips plus transient accessible drawers rather
  than compressing docked panels into unreadable widths.
- Mobile work uses Home/work context, a Switch action, and tabbed Runs, Chat,
  Files, Artifacts and Activity navigation appropriate to the selected work.

### Grid, Dimensions, Layout, Spacing And Density

- Root layouts fill `100vh` and `100dvh`; overflow is owned by the relevant
  panel or content region rather than the page body.
- Validated reference viewports are desktop `1440×900` and narrow `390×844`.
- Workspace breakpoint: `<768 px` is narrow. Short-height mode applies at
  `≤480 px` height when not narrow.
- Left dock default/min/max: `320/260/520 px`; resize handle: `6 px`.
- Right dock default/min: `450/400 px`; resize handle: `4 px`; automatic center
  protection floor: `480 px`; user-resize compact center floor: `200 px`.
- Left and right collapsed strips are each `50 px`, remain in normal flow, and
  open/redock the corresponding surface without covering the opposite strip.
- The layout uses Tailwind’s 4 px spacing rhythm. Preserve the compact padding,
  gaps, line wrapping and row/card density shown in the final references and
  emitted by the retained components; do not globally normalize component
  spacing.

### Typography And Font Assets

- Primary typeface is the Tailwind `font-sans` system stack. Monospace content
  uses the platform UI monospace stack defined by the retained typography
  configuration.
- Preserve the source hierarchy of compact metadata and control text, normal
  body copy, semibold labels/card titles and larger page headings. The common
  emitted scale is approximately 10, 12, 14, 16, 20 and 24 px; each retained
  component’s exact class, line height, weight and wrapping behavior is
  normative.
- KaTeX and icon/font assets remain local. The Monaco editor/viewer assets are
  served from `/prototype-assets/monaco/vs`; no font/editor CDN may be required
  during ordinary review.
- English and Simplified Chinese must preserve their controlled line breaks,
  truncation, control sizing and narrow behavior; translated strings must not
  be replaced with machine-placeholder text.

### Color Values And Semantic Roles

- Primary page canvas: Tailwind blue-50 (`#eff6ff`) where used by the default
  shell; settings and panels use white (`#ffffff`).
- Custom neutral scale: gray-25 `#fafafa`, 50 `#f2f2f2`, 100 `#e6e6e6`, 200
  `#cccccc`, 300 `#b3b3b3`, 400 `#999999`, 500 `#808080`, 600 `#666666`, 700
  `#4d4d4d`, 800 `#333333`, 900 `#1a1a1a`, 925 `#0d0d0d`.
- Primary/selected actions use the source Tailwind blue palette; success/ready
  uses green, warning/recovery uses amber/yellow, error/destructive uses red,
  and inactive/disabled uses neutral gray.
- Status color is never the only information carrier: text, icon, label or
  structural feedback accompanies it.
- Exact component-specific color classes and opacity are governed by the
  retained source presentation and the mapped visual/evidence rows.

### Surfaces, Borders, Radii, Shadows And Elevation

- Panels and cards are predominantly white with thin neutral borders and small
  radii; selection uses a blue tint/border or active label treatment.
- Docked panels use subtle shadow/separator treatment. Transient drawers use a
  stronger shadow and a black 30% backdrop.
- Forms, settings groups, file trees, viewer panes and message panels remain
  visually separated without decorative elevation.
- Dialogs, system gates, toasts and error panels occupy the top interaction
  layer and must remain readable against the current route.

### Controls, Icons, Imagery And Media Assets

- Preserve the exact source labels, icon families, sizes, alignment and
  icon-only affordances. Local Font Awesome and Iconify collections supply the
  retained iconography.
- Primary buttons are blue; secondary buttons are neutral/outlined;
  destructive confirmations are red. Disabled buttons remain visibly
  unavailable and do not fire state changes.
- Inputs, selects, tabs, segmented controls, tool strips, file rows, run rows,
  switches and action menus preserve their exact source geometry and states.
- Media, application, workspace file and artifact content is synthetic in this
  prototype; the surrounding viewer controls, hierarchy and interaction are
  requirements-defining.

### Hover, Active, Focus, Validation And Feedback Treatment

- Hover and active states retain source gray/blue emphasis and cursor behavior.
- Keyboard focus remains visible. Drawers/dialogs trap focus while open,
  `Escape` closes applicable transient surfaces, and focus returns to the
  initiating control (`JRN-013`, `JRN-022`).
- Required-field validation remains adjacent to or structurally associated
  with the failing control and blocks success until corrected.
- Save, import, install, retry, interrupt, attach, delete and provider actions
  always produce the source-defined visible state, toast, dialog, route change,
  status or recovery affordance.
- Loading, streaming, ready, stopped, failed, denied and unavailable states use
  explicit copy/status presentation; no action relies on an invisible state
  mutation.

### Motion And Reduced Motion

- Preserve source transitions, including the 300 ms ease-in-out left-drawer
  transform and 200 ms panel-resize-handle color transition.
- Streaming/progress transitions expose incremental content/status while the
  synthetic timing stays deterministic.
- Respect reduced-motion preference. Final references were captured with
  reduced motion and animations/transitions disabled only for deterministic
  pixels; this does not authorize removing the source motion behavior.

## Journey Inventory

The existing stable `JRN-*` IDs are retained rather than replaced by a second
`UXJ-*` namespace. Every individual journey row, source/prototype screenshot,
post-action route, body/semantic result and focus/action record is defined in
`parity-inventory.md` and its linked JSON.

| Journey IDs | User / context | Starting state | Goal and completion state | Related IDs |
| --- | --- | --- | --- | --- |
| `JRN-001`–`JRN-018` | Desktop browser/external-node | Populated route or selected create/detail/setup state | Navigate global surfaces; search; validate/create; select details/tabs; recover application setup; enter run setup. | `ROUTE-001`–`ROUTE-041`, `REQ-002`, `AC-005` |
| `JRN-019`–`JRN-021` | Electron/internal node | Installed extension, available update, or embedded-server failure | Complete enable/disable/download feedback and server restart recovery. | `HOST-001`–`HOST-005`, `STATE-009`–`STATE-013` |
| `JRN-022`–`JRN-026` | Desktop/narrow active workspace | Active agent/team run | Exercise accessible drawers, team message/reference/delegation selection, and file actions. | `WKS-001`–`WKS-014`, `QR-001` |
| `JRN-027`–`JRN-030` | Trusted paired mobile | Selected agent/team work or paired home | Enter setup, attach a file, focus team messages/references and cancel unpair safely. | `MOB-001`–`MOB-014` |
| `JRN-031`–`JRN-041` | Desktop browser/Electron | Populated definition, tool, node, settings, package or media state | Complete edit/validation/save/import/provider/category actions and destructive confirmation paths. | `DISC-001`–`DISC-009`, `DISC-015` |
| `JRN-042`–`JRN-045` | Workspace and paired mobile | Historical run, resizable panel, troubleshooting or switcher | Confirm delete, resize, refresh recovery, search and restore focus. | `DISC-010`–`DISC-014`, `QR-001` |
| `JRN-046`–`JRN-049` | Active/error/history agent/team workspace | Running, error or reopened history state | Interrupt to stopped state, prepare error follow-up/recovery, and select reopened team history message. | `WKS-015`–`WKS-021`, `AC-005` |
| `JRN-050` | Desktop Agent Teams catalog and workspace | Empty pre-launch Team history with the Product Review Team card | Run the Team, choose the synthetic workspace, launch exactly one Team, expand/collapse it, and select writer/researcher with synchronized left-tree and center-workspace focus. | `WKS-022`, `WKS-023`, `AC-010`–`AC-012`, `VIS-016`, `VIS-017` |

## Journey Details

### Catalog, Definition And Settings Journeys (`JRN-001`–`JRN-018`, `JRN-031`–`JRN-041`)

- Entry: route or sidebar entry with a deterministic populated/empty/error
  scenario and the applicable browser/Electron context.
- Actions: navigate, search, select detail, open create/edit, choose tabs or
  settings sections, enter values, save/import/install, retry or request delete.
- Feedback: focus moves to the selected or invalid control; validation prevents
  incomplete mutation; confirmation appears for destructive work; successful
  changes display the exact source toast/status and route/detail state.
- Alternate paths: cancel keeps the current record; missing/empty/error states
  expose only valid recovery actions; Applications disabled redirects safely.
- Completion: exact source-equivalent route, visible content, feedback and next
  actions recorded by the individual `JRN-*` row.

### Electron Host Journeys (`JRN-019`–`JRN-021`)

- Entry: `electron_internal` or `electron_external` selected before page
  bootstrap; no actual Electron runtime is started.
- Actions: enable/disable extension, start update download, open server error
  details/advanced recovery, and restart the embedded server.
- Feedback: installed/update/server status changes visibly; internal-node
  windows expose monitor/log controls; external-node windows omit only the
  embedded-only controls.
- Completion: current/ready or restarted surface, with no native or production
  side effect. `VIS-003` and `VIS-004` are the final anchors.

### Agent/Team Workspace Journeys (`JRN-022`–`JRN-026`, `JRN-042`–`JRN-043`, `JRN-046`–`JRN-049`)

- Entry: a deterministic active, streaming, completed, interrupted, error or
  reopened-history agent/team run.
- Actions: focus member/message/delegated task; open files, terminal, activity,
  token, artifacts, VNC or Browser tools; create/attach a file; resize panels;
  interrupt; prepare follow-up; or reopen/delete history.
- Feedback: center conversation and right tool remain synchronized with the
  selected run/member; streaming/status is visible; interrupts stop the
  applicable run/member and enable the correct composer actions; errors expose
  recovery; dialogs and focus behave as recorded.
- Completion: active tool or selected historical/message state with the exact
  controls and next actions. `VIS-005`–`VIS-008` anchor these states.

### Agent Team Launch Journey (`JRN-050`)

- Entry: `/agent-teams?view=team-list` in deterministic `team_launch`, desktop,
  English context with no pre-existing Team run under Prototype Workspace.
- Actions: activate the Product Review Team card **Run**; on `/workspace`, keep
  the source-default AutoByteus runtime and `mock/gpt-prototype` global model;
  choose existing workspace `prototype-workspace` at
  `/synthetic/prototype-workspace`; activate **Run Team**; expand/collapse the
  created Team row; then select `writer` or coordinator `researcher`.
- Feedback and guards: the initial draft selects Product Review Team and blocks
  **Run Team** with “Workspace is required to run a team.” until a workspace is
  chosen. Workspace selection removes the validation message and enables the
  action. Launch removes the draft, selects exactly one Team context, and
  immediately projects the Team plus both configured members under Prototype
  Workspace. The active member row uses `aria-current="true"`, indigo selected
  treatment, and the center Team header/avatar changes to the same member.
- Completion: `team-run-created-fixture` is the single selected Team run;
  `/writer` maps to `team-member-writer-created` and `/researcher` maps to
  `team-member-researcher-created`. `VIS-016` and `VIS-017` are the normative
  final anchors; `JRN-050-A`–`JRN-050-E` are the exact controlled evidence.
- Simulation boundary: launch and focus are resettable local Pinia/fixture
  actions. No agent executes, and no backend, model, filesystem, credential,
  production data, production write, or external integration is invoked.

### Paired-Mobile Journeys (`JRN-027`–`JRN-030`, `JRN-044`–`JRN-045`)

- Entry: `/mobile` with an inert local paired-session fixture and selected
  agent/team work, or with permission denied/offline state.
- Actions: switch work, search, enter setup, change tabs, open file/artifact or
  team reference, attach context, refresh troubleshooting or request unpair.
- Feedback: mobile header and tab selection identify current work; reference
  viewer supports Back; denied/offline guidance exposes reconnect/recovery;
  unpair requires confirmation and cancel preserves the pairing fixture.
- Completion: the chosen work/tab/viewer or safely recovered home state.
  `VIS-011`–`VIS-013` anchor mobile presentation.

## Screen And Surface Specification

| Surface ID | Purpose | Entry conditions | Structure and hierarchy | Important states | Primary actions | Exit / next action | Visual IDs |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `UIS-001` | Agents | `/agents` or query view | Global nav; search/actions; list/cards or create/detail/edit | loading, empty, populated, error, validation | search, reload, create, view, edit, delete, run | detail/setup/workspace | `VIS-001`, `VIS-002`, `VIS-010`, `VIS-015` |
| `UIS-002` | Agent Teams | `/agent-teams` query view | Global nav; team list/create/detail/edit | empty, populated, checklist validation, confirmation | create, view, edit, delete, run | team setup/workspace | `VIS-016` plus parity rows |
| `UIS-003` | Applications | `/applications` or app detail | Optional nav item; catalog/detail/setup | enabled, disabled redirect, empty, setup error/retry | open, configure, retry | app surface or Agents recovery | `VIS-014` |
| `UIS-004` | Skills, Tools and MCP | `/skills`, `/tools` | Collections/list plus detail/editor/actions | populated, validation, delete confirmation | inspect, switch, add/edit/delete/import | selected detail/list | parity rows |
| `UIS-005` | Memory | `/memory` | Agent/team tabs, source lists and detail | empty/populated, agent/team source | select tab/source/detail | retained memory context | parity rows |
| `UIS-006` | Nodes and phone access | `/nodes` tabs | Manage, memory sync, phone setup, Docker guide | browser/Electron context, paired/unpaired | add/rename/select node, setup phone, switch tab | active node/mobile setup | parity rows |
| `UIS-007` | Agent workspace | `/workspace`, agent selected | Left nav/history; center conversation/composer; right tools | active, streaming, complete, error, interrupted, history | message, interrupt/follow up, choose tool/file, resize | updated run/history state | `VIS-005`, `VIS-006` |
| `UIS-008` | Team workspace | `/workspace`, team selected | Team conversation/member focus; messages/delegations; tool drawer | launch-ready, newly launched, active, streaming, complete, error, interrupted, history | run team, expand/collapse team, focus member/message/task, reference, interrupt, follow up | updated team/history state | `VIS-007`, `VIS-008`, `VIS-016`, `VIS-017` |
| `UIS-009` | Settings | `/settings?section=*` | Back control; section rail; selected settings panel | validation, save feedback, provider/binding, package/update/extension states | select, edit, save, import, enable/disable, update | retained section or workspace | `VIS-003`, `VIS-009` |
| `UIS-010` | Embedded server gates | Electron/internal before app ready or failure | Centered startup/error/shutdown gate with details/recovery | starting, ready, error, details, restarting, shutdown | details, advanced recovery, restart, health, reset | ready app or continued gate | `VIS-004` |
| `UIS-011` | Media | `/media` | Category navigation; collection/viewer; actions | populated, selected, delete confirmation/fullscreen | select category/media, open, delete/cancel | collection/viewer | parity rows |
| `UIS-012` | Mobile remote access | `/mobile` | Home/status/recent work; selected work shell and tabs | unpaired, paired, denied/offline, active agent/team | refresh, switch, select work, troubleshoot, unpair | work shell/home | `VIS-011`, `VIS-012`, `VIS-013` |
| `UIS-013` | Responsive shell and overlays | Any in-scope route | Docked panels, 50 px strips, drawers, backdrop, dialogs, toasts | desktop, narrow, short-height, collapsed/open | collapse/redock/open drawer, Escape, confirm/cancel | current route with restored focus | `VIS-010` plus all narrow evidence |

## Interaction And State Transitions

| Transition ID | Surface / from state | User action or system trigger | Immediate feedback | Resulting state | Relevant data or side effect | Next available actions |
| --- | --- | --- | --- | --- | --- | --- |
| `TR-001` | Global shell / route | Select nav item, record, tab or settings section | Active label/route updates | Selected list/detail/tab/section | Browser-local route only | Continue in selected surface |
| `TR-002` | Form / incomplete | Submit required action | Inline validation and focus | Form remains editable | No mutation | Correct or cancel |
| `TR-003` | Valid create/edit/save/import | Submit valid synthetic values | Toast/status and route/detail update | Locally updated success state | In-memory/local fixture only | Inspect, edit, run or return |
| `TR-004` | Existing record/history/media | Request destructive action | Confirmation dialog with focus trap | Pending confirmation | No mutation before confirm | Confirm or cancel |
| `TR-005` | Transient drawer/dialog | Press Escape or cancel | Surface closes | Underlying context preserved | None | Continue; focus returns to trigger |
| `TR-006` | Workspace running | Stream tick or interrupt | Progressive content/status or stopped feedback | Streaming or interrupted/completed | Scripted local state | Interrupt, follow up, inspect tools |
| `TR-007` | Workspace error | Prepare follow-up/retry | Recovery affordance/composer changes | Deterministically recoverable state | Scripted local state | Retry/follow up |
| `TR-008` | Workspace tool strip | Select file/team/terminal/activity/token/artifact/VNC/browser | Active tool/tab and panel content update | Selected right-side surface | Local view selection | Interact, resize or close |
| `TR-009` | Electron host lifecycle | Scripted start/error/restart/shutdown/update/extension action | Gate/status/progress/details | Target host-visible state | Browser-local host adapter only | Recover, install/enable or return |
| `TR-010` | Paired-mobile home/work | Select/switch work or tab | Header/tab/context changes | Selected agent/team sub-surface | Inert local session and view state | Chat, files, activity, reference |
| `TR-011` | Access error | Permission denied/offline condition | Explicit warning and guidance | Restricted/recovery state | No production request | Refresh, reconnect guidance, unpair |
| `TR-012` | Any scenario | Call prototype reset | Local state/storage cleared | Deterministic populated desktop baseline | Prototype browser state only | Select another scenario/context |
| `TR-013` | Agent Teams catalog / selected card | Activate **Run** | Route changes to `/workspace`; Product Review Team draft and configuration form appear | One valid Team draft; workspace still required | Browser-local draft only | Choose workspace, change allowed setup, or leave |
| `TR-014` | Team draft / no workspace | Choose `prototype-workspace` | Workspace path appears; required-workspace message clears; **Run Team** enables | Launch-ready draft | Browser-local workspace selection | Run Team or revise setup |
| `TR-015` | Launch-ready Team draft | Activate **Run Team** | Draft closes; exactly one active Team appears selected under Prototype Workspace | Newly launched Team focused on coordinator/researcher | Deterministic synthetic Team context only | Expand/collapse Team; select writer/researcher |
| `TR-016` | Newly launched Team / expanded | Activate writer or researcher member row | Selected row receives `aria-current`; center header/avatar follows the member | Same Team with selected member focus | Local focus/projection only | Select another member or inspect tools |

## State Behavior

| Surface / state | Trigger | Required presentation and message | Available actions | Recovery or exit | Visual ID |
| --- | --- | --- | --- | --- | --- |
| Catalog loading | `loading` | Source-equivalent delayed shell/catalog loading presentation | Wait | Deterministic populated result | parity evidence |
| Catalog empty | `empty` | Exact empty icon/copy and available creation action | Create/reload where source provides it | Create or change scenario | `VIS-015` |
| Catalog error | `error` | Red recoverable error panel with source-controlled message | Reload/retry | Deterministic populated result | `VIS-002` |
| Applications disabled | `apps_disabled` | Applications item omitted; direct route recovers to Agents | Continue in Agents | Enable only by scenario/config change | `VIS-014` |
| Embedded server starting/restarting | `electron_starting` / `electron_restarting` | Full app gate with explicit progress/state | Wait | Ready app | parity evidence |
| Embedded server failure/details | `electron_error` | Application Error, details/logs, restart/health/advanced recovery | Show details, restart, health, reset | Ready or continued error | `VIS-004` |
| Embedded shutdown | `electron_shutdown` | Source-equivalent shutdown surface | Source-defined exit/recovery only | Scenario reset | parity evidence |
| Agent/team streaming | workspace streaming scenario | Incremental response and running status, composer controls | Interrupt, inspect tools | Completed/interrupted/error | `VIS-006` |
| Agent/team completed/history | completed/history scenario | Stable transcript, stopped/idle status, selectable history | Follow up, inspect, archive/delete | New active run or list | `VIS-008` |
| Agent/team error/interrupted | error/interrupted scenario | Explicit failure/stopped state and valid recovery composer | Retry/follow up | Deterministic active/completed | parity evidence |
| Team launch-ready | `team_launch` after workspace selection | Product Review Team definition, AutoByteus runtime, model, selected workspace path, enabled **Run Team** | Run Team, change allowed setup | Newly launched Team or revised draft | `VIS-016` |
| Newly launched Team / writer focused | `workspace_team_launch` after `JRN-050-E` | Exactly one Team under Prototype Workspace; expanded researcher/writer rows; writer selected; center header `writer` | Collapse/expand Team; select researcher/writer; inspect workspace tabs | Same Team with synchronized selected member | `VIS-017` |
| Tool unavailable/empty/error | matching workspace scenario/state | Exact unavailable/empty/error copy in selected pane | Change tab/retry where present | Select supported pane or recover | parity evidence |
| Mobile paired active | inert paired session + mobile work scenario | Work header, current run and bottom tabs | Switch, chat, files, artifacts, activity | Home/work switch | `VIS-011`, `VIS-012` |
| Mobile permission denied/offline | `permission_denied` | Offline badge, connection warning and recovery guidance | Refresh, switch work, troubleshoot, unpair | Reconnect scenario or unpair | `VIS-013` |

## Responsive And Platform Behavior

- Browser/external trusted node, Electron/internal node, Electron/external node,
  unpaired mobile and paired mobile are separately selectable contexts.
- Host-specific controls appear only where the source exposes them. In
  particular, embedded server monitor/log actions are internal-node only;
  Electron/external retains Electron actions without embedded-only controls.
- Desktop preserves docked panels when width permits. Automatic responsive
  policy yields the right panel, then both panels, to 50 px strips while
  protecting the center; user resize intent can reduce the center floor to
  200 px.
- At `<768 px`, both strips remain in flow and open accessible drawers. The
  backdrop leaves the opposite workspace strip operable. No generic surface
  control is added.
- At `≤480 px` non-narrow height, short-height mode yields constrained surfaces
  instead of causing avoidable vertical clipping.
- The complete English/Simplified-Chinese desktop/narrow evidence matrix is
  authoritative: 123 route permutations and 116 correction permutations pass.
- No dark-theme behavior is claimed by this baseline; validated theme is light.

## Accessibility And Keyboard Behavior

- Preserve semantic navigation, main, dialog, form, button, list/tab and status
  roles and source-provided accessible names.
- A transient navigation drawer has `role="dialog"`, `aria-modal="true"` when
  topmost, an accessible navigation-drawer label, and receives focus.
- Dialogs and drawers trap focus where the source does; `Escape` closes them;
  focus returns to the initiating strip/control.
- Search, forms, tabs and confirmations remain keyboard-operable. Required
  validation is associated with the correct field and does not rely on color.
- Icon-only actions retain tooltips/accessible labels. Disabled controls are
  both visibly and behaviorally disabled.
- Preserve source contrast intent and readable hierarchy across white,
  blue-50, selected, status and error surfaces.
- Exact observable focus behavior is substantiated by `JRN-002`, `JRN-004`,
  `JRN-009`, `JRN-013`, `JRN-022`, `JRN-030`, `JRN-045` and `JRN-050-E`.

## Content, Labels, Validation And Feedback

- All navigation labels, headings, control labels, help text, validation,
  confirmation, error, recovery and feedback messages are exact current-source
  UI content for the applicable locale and context.
- Synthetic names, paths, timestamps, provider/model identifiers, usage/cost
  values, file contents and record descriptions are illustrative fixtures.
  Their formatting, location, truncation, hierarchy and state behavior remain
  requirements-defining.
- English and Simplified Chinese are the supported/validated prototype locales.
- Do not infer production copy improvements from fixture implementation; any
  intentional copy or policy change requires a future requirements revision
  and user approval.

## Data, Contract And Mock Boundaries

| Boundary / data | UI dependency | Prototype behavior | Production behavior required or still unknown |
| --- | --- | --- | --- |
| Catalogs/settings/API | Records, loading/empty/error, validation, retry/save | Deterministic snapshots and intercepted actions | Must provide the same observable contract; transport/architecture is downstream. |
| Authentication/access | Trusted desktop; paired/unpaired/denied mobile | Local context key and inert synthetic session | Real identity, token and authorization design is not proven here. |
| Node/Electron/window | Internal/external distinction, native controls, server gates | Local host registry and `window.electronAPI` adapter | Real Electron/preload/IPC/node lifecycle is absent and architecture is undecided. |
| Agent/team execution | Conversation, streaming, status, todo/activity, delegation, interrupt/recovery/history | Synthetic messages and scripted real UI transitions | Model/provider/scheduler/stream implementation is absent. |
| Persistence | Locale/layout/scenario continuity and mutations | Isolated localStorage/in-memory Pinia; resettable | Durable schema, conflict and retention behavior is not specified by the prototype. |
| Files/terminal/browser/VNC | Trees, viewers, dialogs, output and host panels | Synthetic nodes/content/output and local view state | No filesystem, PTY, automation host or VNC server exists. |
| Tools/MCP/models/providers | Lists, editors, validation and feedback | Synthetic records/local mutations | No credential, model or MCP process is invoked. |
| Messaging/applications/packages/updates/media | Exact setup/status/recovery/viewer UI | Scripted local fixtures and feedback | No gateway, app runtime, installer, downloader or media repository exists. |
| Assets/editor | Icons, fonts and Monaco-backed viewers | Checked-in source assets, local Iconify collections and local Monaco mirror | Production asset hosting may differ only if observable output remains exact. |
| Network boundary | UI must remain independently reviewable | External/API requests rejected; local scripted WebSocket; no ordinary-review dependency | Production connectivity/security/operations are outside this package. |

Full enforcement details are canonical in `mock-boundaries.md`.

## Final Visual Reference Inventory

Fixture names, record values, paths, timestamps, usage values and file content
listed below are illustrative. Unless so identified, layout, hierarchy,
dimensions, typography, styling, labels, controls, status presentation,
interaction affordances and responsive behavior are requirements-defining.

| Visual ID | Journey / surface / state | Viewport | Image path | Requirements-defining visible details | Explicitly illustrative fixture content or permitted variation |
| --- | --- | --- | --- | --- | --- |
| `VIS-001` | Agents populated, browser/external node | 1440×900 | `final-reference-screenshots/VIS-001-agents-desktop-en.png` | Desktop shell, left nav/history, search/action bar, card grid, metadata/actions, spacing and hierarchy | Agent names/descriptions/skills/counts |
| `VIS-002` | Agents recoverable error | 1440×900 | `final-reference-screenshots/VIS-002-agents-error-desktop-en.png` | Error placement, color, wording pattern, reload affordance and retained shell | Synthetic failure detail |
| `VIS-003` | Electron/internal Extensions | 1440×900 | `final-reference-screenshots/VIS-003-electron-extensions-desktop-en.png` | Settings rail, extension card, installed/enabled status, native-only actions, model/source controls | Extension/runtime/provider fixture values |
| `VIS-004` | Electron server failure and advanced recovery | 1440×900 | `final-reference-screenshots/VIS-004-electron-server-error-recovery-desktop-en.png` | Full gate, error icon/hierarchy, technical details, primary/secondary/destructive recovery actions | Synthetic error text/path |
| `VIS-005` | Active agent workspace Files viewer | 1440×900 | `final-reference-screenshots/VIS-005-agent-workspace-files-desktop-en.png` | Three-surface workspace, active run, conversation/composer, Files tabs/tree/viewer and tool strip | Run/name/content/path/token fixture values |
| `VIS-006` | Agent streaming | 1440×900 | `final-reference-screenshots/VIS-006-agent-workspace-streaming-desktop-en.png` | Running/streaming status, incremental conversation state and available controls | Message content and timing values |
| `VIS-007` | Active team workspace messages/delegation | 1440×900 | `final-reference-screenshots/VIS-007-team-workspace-messages-desktop-en.png` | Team/member/message panes, delegation row/detail, selected tool and composer relationships | Team/member/task/message values |
| `VIS-008` | Reopened team history | 1440×900 | `final-reference-screenshots/VIS-008-team-workspace-history-desktop-en.png` | Idle/history status, stable transcript and history/tool layout | Transcript and timestamp values |
| `VIS-009` | Managed Messaging settings | 1440×900 | `final-reference-screenshots/VIS-009-messaging-settings-desktop-en.png` | Settings hierarchy, status summary, action groups, warning/provider/binding panels | Provider/account/version/health fixture values |
| `VIS-010` | Agents narrow Simplified Chinese | 390×844 | `final-reference-screenshots/VIS-010-agents-narrow-zh.png` | 50 px strip, narrow catalog, localized controls, card stacking/truncation and no clipping | Agent records/counts |
| `VIS-011` | Paired-mobile agent Chat | 390×844 | `final-reference-screenshots/VIS-011-mobile-agent-chat-en.png` | Mobile work header, conversation, composer, bottom tabs and selected-state treatment | Agent/message/token values |
| `VIS-012` | Paired-mobile team reference viewer | 390×844 | `final-reference-screenshots/VIS-012-mobile-team-reference-en.png` | Back navigation, reference title/path metadata, viewer toolbar/content layout | File name/path/content |
| `VIS-013` | Mobile permission denied/offline | 390×844 | `final-reference-screenshots/VIS-013-mobile-permission-denied-en.png` | Product header, offline status, warning/recovery hierarchy, recent/choose-work cards and destructive unpair affordance | Loopback address, device/work values |
| `VIS-014` | Applications disabled recovery | 1440×900 | `final-reference-screenshots/VIS-014-applications-disabled-desktop-en.png` | Applications nav omission and recovery to unchanged Agents catalog | Agent fixtures |
| `VIS-015` | Agents empty | 1440×900 | `final-reference-screenshots/VIS-015-agents-empty-desktop-en.png` | Empty-state icon/copy, preserved create/reload actions and full-page spacing | Empty collection itself is scenario data |
| `VIS-016` | Agent Team launch-ready draft | 1440×900 | `final-reference-screenshots/VIS-016-team-launch-ready-desktop-en.png` | Team definition/setup hierarchy, runtime/model presentation, chosen workspace path, enabled Run Team action and three-surface workspace shell | Team/workspace/model identifiers and synthetic path |
| `VIS-017` | Newly launched Team with writer focused | 1440×900 | `final-reference-screenshots/VIS-017-team-launched-writer-focused-desktop-en.png` | Prototype Workspace hierarchy, exactly one expanded Team row, researcher/writer member rows, writer selection treatment, synchronized center Team header and workspace tool layout | Team/member IDs, relative timestamps and synthetic workspace path |

## Linked Prototype Evidence

- Runnable prototype: `/home/autobyteus/workspace/autobyteus-workspace/autobyteus-web-prototype`
- Production-build review URL: <http://127.0.0.1:3210>
- Run instructions: `prototype-runbook.md`
- Accepted baseline review: `product-prototyper-baseline-review.md` (`PPA-001`, `PPA-002`)
- Bootstrap report: `prototype-bootstrap-report.md`
- Complete inventory: `parity-inventory.md`
- Comparison results: `comparison-report.md`
- Evidence map: `evidence-index.md`
- Deterministic state catalog: `prototype-scenarios.md`
- Mock/isolation contract: `mock-boundaries.md`
- Final visual metadata and hashes: `final-reference-screenshots/manifest.json`
- Final validation: `evidence/validation/product-prototyper-final-validation.txt`
- Final reference capture: `evidence/validation/final-reference-capture.txt`
- RER-009 Product Prototyper browser review:
  `evidence/product-prototyper-review/rer-009-direct-review.txt`
- RER-009 exact correction: `pp-gap-010-correction.md` and
  `evidence/gap-010/gap-010-summary.json`
- RER-011 integration record: `personal-integration-record.md` and
  `evidence/integration/rer-011-rebase-preservation.json`
- Relevant stable IDs: `ROUTE-001`–`ROUTE-041`, `CFG-001`–`CFG-011`,
  `STATE-001`–`STATE-013`, `HOST-001`–`HOST-008`, `WKS-001`–`WKS-023`,
  `MOB-001`–`MOB-014`, `JRN-001`–`JRN-050`, `DISC-001`–`DISC-017`,
  `TR-001`–`TR-016`, and `VIS-001`–`VIS-017`.

## Implementation Fidelity Boundary

- Exact behavior and visible design implementation must preserve the pinned
  source’s observable hierarchy, geometry, layout, spacing, density,
  typography/assets, color, borders, radii, shadows, icons, labels, controls,
  responsive behavior, focus/keyboard semantics, feedback, motion, navigation,
  state transitions and journey outcomes for every stable inventory item.
- The retained presentation code and exact matched evidence are authoritative
  for component-level details not restated numerically in this supplement.
- Prototype-only state, fixture shapes, Pinia overlays, localStorage keys,
  compatibility objects, local WebSocket/EventTarget behavior, timing scripts,
  host adapter and local asset paths do **not** prescribe production
  architecture.
- Fixture content explicitly allowed to vary: synthetic agent/team/workspace
  names, descriptions, record identifiers, paths, timestamps, messages, task
  text, provider/model identifiers, usage/cost values, file/media/application
  content and loopback addresses. Their presentation rules do not vary.
- Permitted responsive/platform variation is limited to the exact controlled
  context and matrix behavior documented here; do not use platform variation
  to omit or redesign a supported observable state.
- Existing design-system constraint: reuse the source Tailwind/component/icon/
  localization conventions or reproduce their exact output. Prototype
  internals are not a target implementation template.

## Out Of Scope

- Any intentional future-state UI, copy, policy, journey or visual change.
- Android/iOS independent client baselines and production application-package
  authoring.
- Backend, identity, authorization, storage, filesystem, terminal, browser,
  VNC, Electron, native bridge, model, MCP, provider, messaging, update,
  download, application-runtime or operational architecture.
- Production deployment, migration, performance/SLO, threat model or proof of
  production readiness.
- Automatic reconciliation to a commit newer than the pinned source authority.

## Open Decisions And Risks

- Open product decisions: **none** for this current-state-only package.
- The baseline is a snapshot. A later source revision requires an explicit
  refresh/reconciliation request; it must not be followed silently.
- Two pinned-source presentation unit-harness tests fail unchanged when rerun
  alone. Their observable obligations pass exact controlled browser journeys
  `JRN-047` and `JRN-049`; this is recorded as source-test harness behavior, not
  a prototype discrepancy.
- Production build reports existing duplicate-auto-import and large-chunk
  warnings. They do not alter the accepted current UI/UX and are not evidence
  of production readiness or target architecture.
- Ordinary review is network-independent after dependency installation. The
  package includes a local Monaco asset mirror and its third-party notice.

## Final Consistency Check

- User confirmation is recorded: **Yes**
- Every in-scope journey is specified: **Yes**
- Every surface/state is mapped to a final visual anchor or complete exact
  parity evidence: **Yes**
- Prototype, screenshots and this specification agree: **Yes**
- Final visuals are production-quality and contain no unintended placeholders,
  generic starter styling, clipping, overlap or visual drift: **Yes**
- Every visible detail is requirements-defining unless an explicit
  illustrative/permitted-variation entry says otherwise: **Yes**
- Mocked boundaries and unresolved production behavior are explicit: **Yes**
- Final references captured after explicit confirmation: **Yes**
- Final reference browser errors/external resources: **0 / 0**
- RER-009 controlled journey checkpoints: **5/5**, zero source/prototype
  browser errors, exact semantics/state and byte-identical checkpoint images.
- Known failed, missing, unknown or unsubstantiated UI inventory IDs: **none**
