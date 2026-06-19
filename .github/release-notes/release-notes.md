## What's New
- Added a macOS release signing gate that verifies signed ARM64 and Intel builds before release artifacts are uploaded.

## Improvements
- macOS desktop builds now use least-privilege signing for nested updater, framework, and native runtime components while keeping the main app and Electron helpers properly entitled.
- Release documentation now explains the one-time fixed-DMG recovery path for users whose installed app cannot apply updates because its existing updater helper is blocked by macOS.

## Fixes
- Fixed macOS auto-update failures caused by Squirrel and ShipIt carrying the top-level app entitlement payload.
- Prevented bundled server native modules and other non-app nested Mach-O binaries from inheriting app-only entitlement keys.
