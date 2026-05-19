# Design Impact Rework: Mobile Device Presentation

## Status

Design Impact — created 2026-05-18 after user feedback on delivered Electron build.

## User-Observed Problem

The `set_device_emulation` tool works enough to narrow the rendered mobile layout, but the visual result is left-aligned and appears to use the full Browser host height. The user expected Chrome DevTools-style mobile view: a finite device viewport, centered in the available Browser area, with height reflecting the selected phone/device profile.

## Code Evidence

- `autobyteus-web/electron/browser/browser-device-emulation.ts` lines 91-105 calls `webContents.enableDeviceEmulation(...)` with profile `screenSize`/`viewSize`, but hard-codes `viewPosition: { x: 0, y: 0 }` and `scale: 1`.
- `autobyteus-web/electron/browser/browser-shell-controller.ts` lines 335-347 always calls `browserSessionManager.updateSessionViewportBounds(activeSessionId, state.hostBounds)`, so the native `WebContentsView` remains full Browser-host sized even in mobile mode.
- `autobyteus-web/electron/browser/browser-tab-manager.ts` lines 241-244 applies those full host bounds and only reapplies mobile emulation afterward.
- Existing tests assert `viewSize`/state but do not assert centered finite native view bounds.

## Root Cause Classification

Design gap / boundary-owned projection gap. The original design separated device-emulation state from host bounds, but did not explicitly require a Chrome DevTools-like device presentation projection. Implementation therefore correctly added metrics but left shell projection as full-host desktop projection.

## Required Design Correction

Mobile mode must include two separate concerns:

1. **Device metrics**: CSS viewport/profile values passed to Electron `enableDeviceEmulation` (`viewSize`, `screenSize`, device scale factor).
2. **Device presentation**: finite native `WebContentsView` bounds computed from the active profile and available Browser host area.

For mobile tabs, the Browser shell/session owner must:

- compute `presentationScale = min(1, host.width / profile.width, host.height / profile.height)`;
- compute `presentationWidth = round(profile.width * presentationScale)`;
- compute `presentationHeight = round(profile.height * presentationScale)`;
- compute centered bounds: `x = host.x + floor((host.width - presentationWidth) / 2)`, `y = host.y + floor((host.height - presentationHeight) / 2)`;
- set the native `WebContentsView` bounds to those centered finite bounds;
- call/reapply `enableDeviceEmulation` with the original profile `viewSize`/`screenSize` and the computed `scale`;
- keep desktop mode using full host bounds.

## Acceptance Additions

- In a host larger than a `390 × 844` mobile profile, mobile mode sets native view bounds to a centered `390 × 844` rectangle, not `x: 0` and not full host height.
- In a host smaller than the profile, mobile mode fit-scales presentation bounds while keeping CSS/device profile dimensions unchanged.
- Switching back to desktop restores full-host native bounds.
- Tests must assert both `enableDeviceEmulation` parameters and `WebContentsView.setBounds` calls.

## Handoff Note

This is not an agent tool-call bug. The tool can keep calling `set_device_emulation`. The fix belongs in Electron Browser session/shell projection.
