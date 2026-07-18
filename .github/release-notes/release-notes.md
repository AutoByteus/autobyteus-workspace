# Release Notes — Official noVNC Package Integration

## Improvements

- Replaced the copied noVNC implementation tree with the official package-root `@novnc/novnc` provider, pinned to an exact upstream build for reproducible behavior.
- Preserved VNC authentication, connection lifecycle, View Only/Interactive modes, maximize/Escape behavior, remote resize, and automatic bidirectional clipboard support.
- Added focused package, session-lifecycle, and real VNC/browser regression coverage.

## Licensing and Packaging

- Added a canonical noVNC third-party notice with exact package/source provenance, MPL-2.0 terms, and embedded-component attribution.
- Included the notice in normal web output, Electron renderer output, the packaged desktop application, ZIP, and DMG.
- Added build preflight and durable contract coverage to prevent provider version, clipboard behavior, notice, or packaging-path drift.

## Validation

- Authoritative API/E2E validation passed at 96.9% confidence, including retained real Chrome/TigerVNC/websockify coverage.
- A complete unsigned macOS Electron build passed, and the exact notice bytes/hash were verified in the generated renderer, app bundle, ZIP, and DMG.
- User verification completed before repository finalization and release.
