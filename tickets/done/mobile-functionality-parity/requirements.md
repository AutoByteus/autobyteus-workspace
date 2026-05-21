# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Design-ready

## Goal / Problem Statement

The phone/mobile web experience must be a responsive version of the AutoByteus web product, not a reduced-function MVP that loses core capabilities. On the current mobile Home, when no run/context is active, the user cannot see selectable agents or agent teams in the Switch Work sheet and therefore cannot start a new run by choosing a target. The Files and Activity surfaces also introduce mobile-only complexity and unsupported-feature messaging that does not match the desktop/web information architecture. Mobile Chrome should have comparable access to desktop Chrome capabilities where the backend/browser technology already supports them, including Terminal and VNC.

## Investigation Findings

- The mobile entrypoint is `autobyteus-web/pages/mobile.vue` / `pages/index.vue`, both rendering `components/mobile/MobileRemoteAccessShell.vue` when in the mobile runtime.
- `MobileRemoteAccessShell.vue` owns paired phone Home/Work/Troubleshooting screens and feeds `MobileContextSwitcher.vue` from `useMobileWorkCatalog()`.
- `useMobileWorkCatalog.ts` already reads the desktop domain stores: `runHistoryStore.fetchTree(5)`, `agentDefinitionStore.fetchAllAgentDefinitions()`, `agentTeamDefinitionStore.fetchAllAgentTeamDefinitions()`, and `workspaceStore.fetchAllWorkspaces()`.
- `MobileContextSwitcher.vue` receives `agentItems` and `teamItems`, but it has no loading/error/retry state. A failed or not-yet-ready catalog load is indistinguishable from a truly empty catalog and renders `No matching agents` / `No matching teams`.
- Selecting an agent/team definition currently creates a `MobileWorkContext` and navigates to the Runs tab, but `MobileRuns.vue` leaves `MobileRunSetup.vue` hidden until the user presses `Start new`. This is a usability regression relative to the user's expected direct “choose an agent/team and start work” flow.
- `MobileWorkShell.vue` exposes only Chat, Runs, Files, and Activity. There is no mobile Tools surface.
- Desktop/right-panel tools already include Terminal and VNC (`components/layout/RightSideTabs.vue`, `components/workspace/tools/Terminal.vue`, `components/workspace/tools/VncViewer.vue`). Terminal already builds authenticated remote-access WebSocket URLs through `useTerminalSession.ts`; VNC uses server settings through the normal GraphQL client and noVNC.
- `components/layout/WorkspaceMobileLayout.vue`, the legacy `/workspace` responsive layout, already has a Tools tab that renders `RightSideTabs`, demonstrating that Terminal/VNC are not inherently impossible in a phone browser. The dedicated phone shell removed them as a mobile-MVP boundary, not because Chrome cannot render them.
- `utils/mobileFeatureGates.ts` defines a `terminal` feature id but does not mark it supported, has no `vnc` feature id, and `docs/remote_access.md` describes mobile capability gating as intentionally excluding desktop-only features.
- `MobileActivityDigest.vue` currently renders an explicit notice that interactive terminal, browser, and desktop tool panes are unsupported in the phone shell. This conflicts with the requested parity posture.
- `MobileFiles.vue` shows a default row of discovery chips (`Folder`, `Recent`, `Attached`, `Markdown/code`, `Deep search workspace`) that can be clipped/crowded on a phone viewport and creates a more complicated default surface than the desktop file explorer.
- Targeted test execution was attempted with `pnpm vitest ...` in the dedicated worktree, but this worktree has no installed `node_modules`; `pnpm` could not find the `vitest` binary. Downstream implementation should run `pnpm install` or use the project’s established dependency setup before validation.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Larger Requirement / Bug Fix / Behavior Change
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue plus Legacy Or Compatibility Pressure
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Likely Needed
- Evidence basis: Mobile-specific shell owns a reduced capability boundary; catalog failures are hidden as empty states; Terminal/VNC components exist and are already browser-based; old responsive layout had a Tools tab; docs and activity copy preserve a mobile-MVP unsupported posture.
- Requirement or scope impact: Implementation must strengthen the mobile shell as a parity-oriented responsive owner, not patch only one empty-state label.

## Recommendations

1. Treat mobile as a responsive first-class shell over the same domain stores and backend capability endpoints as desktop.
2. Make work catalog loading/error/empty state explicit so the mobile UI never displays a false `No matching agents` state after a failed or pending catalog fetch.
3. Make selecting an agent/team in the mobile work picker open the new-run setup directly with that target preselected.
4. Add a mobile Tools surface for Terminal and VNC using phone-sized wrappers around the existing browser-compatible tool components, rather than importing the desktop right panel wholesale.
5. Simplify default mobile Files and Activity screens to desktop-equivalent concepts; keep advanced filters available only behind secondary/overflow controls if retained.
6. Update capability gates, tests, and remote-access documentation to remove the obsolete “Terminal/VNC unsupported on phone” product rule.

## Scope Classification (`Small`/`Medium`/`Large`)

Medium

## In-Scope Use Cases

- UC-MOB-001: A paired phone with no current run opens Home, taps Start/Choose Work, sees available agents and teams, and can start a new run.
- UC-MOB-002: A paired phone with catalog loading or network/API errors gets a truthful loading/error/retry state instead of a false empty list.
- UC-MOB-003: A paired phone selects an agent or team definition and lands in a visible run setup with the selected target already chosen.
- UC-MOB-004: A paired phone can browse Files with a simpler default surface that does not horizontally clip controls.
- UC-MOB-005: A paired phone can open Terminal for the active workspace when the node supports terminal WebSockets and a workspace is selected.
- UC-MOB-006: A paired phone can open VNC Viewer when VNC hosts are configured, using a touch-friendly fit/fullscreen wrapper.
- UC-MOB-007: A paired phone sees Activity information without mobile-only unsupported-tool warnings or overly prominent extra filters that are not part of the desktop mental model.

## Out of Scope

- Native iOS/Android wrapper implementation.
- Electron-only local folder picker support on the phone.
- Desktop settings management and desktop app update controls from the phone.
- Application iframe/mobile application-host parity unless a separate application-mobile design is produced.
- Backend protocol changes unless implementation discovers that an existing endpoint incorrectly rejects authorized mobile credentials.
- Reworking the desktop `/workspace` layout beyond preserving current behavior.

## Functional Requirements

- REQ-MOB-001: Mobile work catalog parity. The mobile work picker must load and display recent runs, agent definitions, agent-team definitions, and workspaces from the same authoritative domain stores/APIs used by desktop. It must not hide catalog load failures as empty results.
- REQ-MOB-002: Startable work first. When no recent run is available, the mobile primary path must default to startable work (agents/teams and optionally workspaces), not an empty Recent tab.
- REQ-MOB-003: Direct start from selected agent/team. Selecting an agent or team definition in the mobile work picker must open the Runs/new-run setup path with that target preselected and the setup visible.
- REQ-MOB-004: Mobile run launch parity. Mobile run setup must keep desktop-equivalent launch semantics: target, workspace, runtime/model, team first-message target where applicable, first prompt, disabled launch until required choices are ready, and use of the existing launch configuration stores/coordinator.
- REQ-MOB-005: Simplified default Files. Mobile Files must expose the desktop-equivalent file-browse/open/preview/attach path with controls that fit a phone viewport. Secondary discovery filters may exist, but they must not crowd or clip the default header.
- REQ-MOB-006: Terminal on mobile. The phone shell must expose Terminal when a workspace is active and the bound node supports terminal access. It must use the existing terminal session owner and remote-access credential path.
- REQ-MOB-007: VNC on mobile. The phone shell must expose VNC Viewer when VNC hosts are configured/reachable. It must use the existing VNC viewer/session owner with mobile-safe layout affordances.
- REQ-MOB-008: Mobile feature gates reflect real unsupported constraints. Mobile feature gates and unsupported-feature messaging must not mark Terminal or VNC unsupported solely because they were outside the previous MVP.
- REQ-MOB-009: Activity simplification. Mobile Activity must remove the default unsupported-tool notice and avoid promoting mobile-only Errors/Approvals filter chips as first-class default navigation unless equivalent desktop UI is intentionally added.
- REQ-MOB-010: Desktop behavior preservation. Desktop routes/layouts, desktop right-panel tabs, and desktop settings/update behavior must remain unchanged by this mobile parity work.

## Acceptance Criteria

- AC-MOB-001: With stores/API seeded with at least one agent and one team and no recent runs, opening the mobile Switch Work sheet shows those agents/teams; it does not display `No matching agents` or `No matching teams`.
- AC-MOB-002: If agent/team/workspace catalog fetch fails, the affected mobile picker segment displays a retriable error/loading state and does not claim there are no matching items.
- AC-MOB-003: With no recent runs, tapping the Home primary action opens a startable-work view/segment rather than an empty Recent-only state.
- AC-MOB-004: Selecting an agent definition from the mobile picker opens the work shell Runs tab with `MobileRunSetup` visible and that agent selected.
- AC-MOB-005: Selecting a team definition from the mobile picker opens the work shell Runs tab with `MobileRunSetup` visible, that team selected, and a valid first-message target picker when the team has leaf agent members.
- AC-MOB-006: Mobile Files header controls remain visible and usable at a 390px-wide viewport; no default chip/control text is clipped offscreen as the only way to discover core file actions.
- AC-MOB-007: Mobile Files can still open folder children, preview supported text/code/Markdown files, and attach files to either active run context or next-run draft context.
- AC-MOB-008: Mobile bottom navigation includes a Tools entry, and the Tools surface can switch between Terminal and VNC without importing `RightSideTabs` or the desktop shell layout.
- AC-MOB-009: Terminal connects through `useTerminalSession` using the bound mobile node endpoint and remote-access credential, and reports a clear workspace-required state when no workspace is selected.
- AC-MOB-010: VNC displays configured hosts through `VncViewer`/`VncHostTile` and provides touch-usable fit/fullscreen controls or clear configuration guidance when no hosts exist.
- AC-MOB-011: `MobileActivityDigest` no longer states that interactive Terminal/VNC panes are unsupported in the phone shell.
- AC-MOB-012: Existing desktop tests and mobile tests pass after dependency setup; new/updated tests cover the empty-catalog regression, direct setup opening, mobile Tools navigation, and simplified Files controls.

## Constraints / Dependencies

- Must keep Phone Access authentication: REST/GraphQL use bearer headers; terminal WebSocket uses authenticated query token as already implemented by `useTerminalSession.ts`.
- Must not call Electron-only APIs from phone code paths.
- Must keep desktop `/workspace`, settings, and update routes intact.
- Must keep mobile components free of desktop layout imports like `RightSideTabs` and `WorkspaceDesktopLayout`; reuse lower-level domain/tool components where browser-compatible.
- Must respect backend/node capability checks where available; unsupported should mean technically unavailable/config-missing, not merely absent from the old MVP.

## Assumptions

- The reported desktop/web version already has at least one installed agent/team definition, so an empty mobile Agents/Teams list is not a true empty catalog.
- The paired phone can reach the node over the private IP shown in the screenshot.
- Browser Terminal and noVNC are acceptable on mobile Chrome with responsive sizing and touch affordances.
- Mobile should prefer parity over a separate simplified product unless a capability is truly unavailable or unsafe.

## Risks / Open Questions

- VNC host URLs configured for desktop may point to loopback addresses that are not reachable from the phone unless they are proxied or configured with a phone-reachable address. The UI should report this as configuration/reachability, not hide VNC entirely.
- Terminal usability on a software keyboard may need iterative touch/keyboard improvements after the first parity pass.
- Browser/application iframe parity remains out of scope and may need separate design.
- If backend health or GraphQL endpoints inconsistently enforce remote-access credentials, implementation may uncover a backend authorization bug.

## Requirement-To-Use-Case Coverage

| Requirement | Covered Use Cases |
| --- | --- |
| REQ-MOB-001 | UC-MOB-001, UC-MOB-002 |
| REQ-MOB-002 | UC-MOB-001 |
| REQ-MOB-003 | UC-MOB-001, UC-MOB-003 |
| REQ-MOB-004 | UC-MOB-003 |
| REQ-MOB-005 | UC-MOB-004 |
| REQ-MOB-006 | UC-MOB-005 |
| REQ-MOB-007 | UC-MOB-006 |
| REQ-MOB-008 | UC-MOB-005, UC-MOB-006 |
| REQ-MOB-009 | UC-MOB-007 |
| REQ-MOB-010 | All use cases |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criteria | Scenario Intent |
| --- | --- |
| AC-MOB-001 | Proves agent/team discovery works when there are no active/recent runs |
| AC-MOB-002 | Prevents false empty states from masking catalog failures |
| AC-MOB-003 | Makes the empty-recent Home path actionable |
| AC-MOB-004 | Verifies direct agent start intent |
| AC-MOB-005 | Verifies direct team start intent and team-specific launch requirements |
| AC-MOB-006 | Verifies default Files usability on phone width |
| AC-MOB-007 | Preserves existing mobile file functionality while simplifying the header |
| AC-MOB-008 | Establishes a first-class mobile Tools surface without desktop layout import |
| AC-MOB-009 | Proves Terminal uses the existing authenticated node boundary |
| AC-MOB-010 | Proves VNC is exposed when configured and reports configuration gaps clearly |
| AC-MOB-011 | Removes outdated mobile-MVP unsupported copy |
| AC-MOB-012 | Ensures regression coverage and desktop preservation |

## Approval Status

Derived from the user's explicit request to analyze and improve mobile functionality parity. Treat as design-ready unless the user narrows scope before implementation.
