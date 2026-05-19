# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Refined — user feedback on 2026-05-18 exposed a mobile device-presentation design gap after implementation.

## Goal / Problem Statement

Determine whether AutoByteus Browser tooling currently supports Chrome DevTools-style mobile view/device emulation, across the server-side browser tool contract and the Electron Browser shell. If it does not, define the minimum verifiable requirements for adding it cleanly.

## Investigation Findings

- Current support status: **not supported as a first-class browser tool or Electron UI action**.
- Server browser tool contract currently exposes only `open_tab`, `navigate_to`, `close_tab`, `list_tabs`, `read_page`, `screenshot`, `dom_snapshot`, and `run_script`. None accepts viewport/device/mobile parameters.
- Electron bridge routes only map the same operations (`/browser/open`, `/browser/navigate`, `/browser/screenshot`, `/browser/list`, `/browser/read-page`, `/browser/javascript`, `/browser/dom-snapshot`, `/browser/close`). There is no route for device/mobile emulation.
- Electron Browser shell currently has tab strip, URL entry, new tab, refresh, close, and full-view/restore controls. There is no mobile toggle UI.
- Electron main tracks only physical/native view bounds in `BrowserTabRecord.viewportBounds`; those bounds are driven by the renderer host rectangle. This means manually narrowing the right panel can approximate a narrow responsive viewport, but it is not Chrome DevTools-style mobile emulation because there is no device profile, device scale factor, mobile screen position, mobile user agent policy, or durable per-tab emulation state.
- Feasibility: **supported by the installed Electron runtime**. Electron 38.8.2 type declarations include `webContents.enableDeviceEmulation(parameters)` and `webContents.disableDeviceEmulation()`, with parameters for `screenPosition`, `screenSize`, `viewPosition`, `deviceScaleFactor`, `viewSize`, and `scale`.
- Post-implementation user feedback: the current implementation successfully narrows the emulated mobile viewport, but visually leaves it left-aligned inside the full Browser host and lets the native Browser view occupy the full host height. This is not Chrome DevTools-style mobile presentation. The design must explicitly require a centered finite device viewport projection in mobile mode.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Feature
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Likely Needed
- Evidence basis: Mobile view spans the server tool schema, bridge route, Electron BrowserTabManager state, shell projection, renderer store, and BrowserPanel UI. Adding ad hoc width parameters only to `open_tab`, or a renderer-only CSS toggle, would bypass the Electron main Browser session owner.
- Requirement or scope impact: Add one authoritative Browser session emulation capability in Electron main and expose it through both the server browser tool boundary and Electron Browser shell UI.

## Recommendations

1. Add a new strict browser tool, recommended name: `set_device_emulation`.
2. Make Electron main (`BrowserTabManager` plus a focused device-emulation helper) the authoritative owner of per-tab emulation state and native `webContents` calls.
3. Add a Browser shell mobile/desktop toggle that calls the same BrowserTabManager owner through IPC; do not create a renderer-only mobile mode.
4. Start with a small fixed/default mobile profile plus explicit custom dimensions, not a full Chrome device catalog.
5. Keep desktop mode as the default and provide clean disable/return-to-desktop behavior.

## Scope Classification (`Small`/`Medium`/`Large`)

Medium.

## In-Scope Use Cases

- UC-001: Determine current mobile-view support.
- UC-002: Agent/server tool can enable mobile view for a tab.
- UC-003: Agent/server tool can restore desktop view for a tab.
- UC-004: Electron Browser shell user can toggle active tab between desktop and mobile view with a toolbar button.
- UC-005: Current Browser operations (`screenshot`, `dom_snapshot`, `run_script`, `read_page`, navigation) operate against the active tab's current emulation state.

## Out of Scope

- Full Chrome DevTools UI parity.
- Large named-device catalog.
- Network throttling, geolocation spoofing, sensor emulation, or comprehensive touch gesture automation.
- Replacing the current Browser session, popup, or shell-lease model.

## Functional Requirements

- REQ-001: The Browser tool surface must expose a strict `set_device_emulation` operation with canonical snake_case parameters only.
- REQ-002: `set_device_emulation` must accept a `tab_id` and a `mode` of `desktop` or `mobile`.
- REQ-003: In `mobile` mode, the operation must apply a mobile viewport/device profile immediately to the target Electron Browser tab using Electron main-owned browser session state.
- REQ-004: In `desktop` mode, the operation must disable mobile/device emulation and restore normal Browser host-bound projection.
- REQ-005: The active Browser shell must show an explicit mobile/desktop toggle for the active tab and reflect the tab's current emulation mode in the snapshot/store.
- REQ-006: `screenshot`, `dom_snapshot`, `run_script`, `read_page`, and navigation must not reset or silently lose the target tab's device emulation state.
- REQ-007: Mobile view must be per-tab state, not a global Browser shell state.
- REQ-008: Existing desktop behavior must remain the default for new tabs and existing Browser operations.
- REQ-009: In mobile mode, the Browser shell must project the active tab into a finite device viewport rectangle derived from the effective mobile profile instead of stretching the native view to the full Browser host.
- REQ-010: The mobile device viewport rectangle must be centered within the available Browser host area when it fits, and must preserve the profile aspect ratio with a fit scale when the available host is smaller than the profile.
- REQ-011: Mobile mode must keep device-emulation metrics (`viewSize`, `screenSize`, device scale factor) separate from presentation bounds, so host resizing/full-view changes do not overwrite the profile width/height.

## Acceptance Criteria

- AC-001: On the current codebase, before implementation, no current browser tool or BrowserPanel control supports mobile view; this is documented with code evidence.
- AC-002: After implementation, calling `set_device_emulation({ tab_id, mode: "mobile" })` returns a result containing `mode: "mobile"` and the active viewport profile.
- AC-003: After enabling mobile mode, `run_script({ tab_id, javascript: "window.innerWidth" })` returns a value matching the configured/emulated mobile viewport width within Chromium/Electron behavior.
- AC-004: After enabling mobile mode, `screenshot({ tab_id })` captures the mobile-emulated layout rather than the previous desktop-width layout.
- AC-005: Calling `set_device_emulation({ tab_id, mode: "desktop" })` disables emulation and returns the tab to host-bound desktop projection.
- AC-006: The BrowserPanel mobile toggle changes the active tab's emulation mode and updates tab/store state without creating or destroying the tab.
- AC-007: Switching between tabs preserves each tab's own emulation state.
- AC-008: Existing browser tool parser/manifest, Codex dynamic browser tool, Claude MCP browser tool, Electron Browser shell, and BrowserPanel tests remain green with added coverage for the new operation.
- AC-009: In a Browser host larger than the mobile profile, enabling mobile mode with profile `390 × 844` positions the native Browser view in a centered `390 × 844` rectangle rather than at host `x: 0` or full host height.
- AC-010: In a Browser host smaller than the mobile profile, enabling mobile mode scales the presentation rectangle down to fit while keeping the emulated CSS viewport/profile dimensions unchanged.
- AC-011: Switching mobile mode off returns the native Browser view to full host-bound desktop projection.

## Constraints / Dependencies

- Must preserve strict tool contracts: snake_case only, typed values only, no compatibility aliases.
- Must preserve Electron main as the authoritative owner of Browser session lifecycle and native webContents operations.
- Must not make renderer CSS state the source of truth for device emulation.
- Must fit the existing local/remote Browser bridge model.
- Must preserve no-backward-compatibility/clean-cut design practice for any in-scope new API.

## Assumptions

- “Mobile view” means a Chrome DevTools-like device emulation mode: smaller mobile viewport, mobile screen position, device scale factor, and optional mobile user-agent behavior where supported.
- The first implementation can provide one default mobile profile and optional custom dimensions instead of a full device list.
- User-agent-sensitive sites may require reload/navigation after a user-agent change; this can be documented rather than forcing unexpected reloads on every toggle.

## Risks / Open Questions

- Electron `enableDeviceEmulation` covers viewport/screen/device-scale behavior, but full Chrome DevTools parity may require additional CDP calls through `webContents.debugger`; that should be deferred unless validation proves it is required.
- Full-page screenshot logic currently mutates view bounds temporarily; implementation must ensure it preserves/restores emulation state correctly.
- If user-agent override is included in v1, we need an explicit policy for whether toggling mobile reloads the page or only affects future navigations.

## Requirement-To-Use-Case Coverage

- UC-001: AC-001
- UC-002: REQ-001, REQ-002, REQ-003, REQ-006; AC-002, AC-003, AC-004
- UC-003: REQ-004, REQ-008; AC-005
- UC-004: REQ-005; AC-006
- UC-005: REQ-006, REQ-007; AC-003, AC-004, AC-007, AC-008
- UC-006: REQ-009, REQ-010, REQ-011; AC-009, AC-010, AC-011

## Acceptance-Criteria-To-Scenario Intent

- AC-001 proves the current answer to the user's support question.
- AC-002 through AC-005 prove the server/tool capability.
- AC-006 and AC-007 prove the Electron UI/session-state behavior.
- AC-008 protects runtime integrations and existing Browser behavior.
- AC-009 through AC-011 protect the Chrome DevTools-like visual device presentation that was missing from the first implementation.

## Approval Status

Approved initially by user for downstream architecture review on 2026-05-18; refined on 2026-05-18 after user feedback identified the missing centered finite device viewport presentation.
