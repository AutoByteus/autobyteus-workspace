# Handoff Summary - desktop-invalid-package-agent-definitions

## What Was Fixed
- Fixed built-in bundled application source-root resolution so macOS case-insensitive lookup can no longer mistake system `/Applications` for AutoByteus bundled `applications`.
- Added focused regression coverage for:
  - exact bundled `applications` detection
  - rejection of differently cased `Applications`

## Why Users Were Broken
- Packaged desktop startup copied host-installed macOS app bundles into:
  - `~/.autobyteus/server-data/application-packages/platform/applications`
- Catalog loading later hit `Visual Studio Code.app/.../node_modules.asar` and failed `agentDefinitions` / `agentTeamDefinitions`.

## Validation
- Focused unit tests passed: `2` files, `5` tests.
- Manual resolver check on the affected machine confirms the packaged server root now resolves to itself, not to system `/Applications`, even though both `/applications` and `/Applications` exist.
- Local macOS Electron build completed and produced installable artifacts:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/desktop-invalid-package-agent-definitions/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.2.78.dmg`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/desktop-invalid-package-agent-definitions/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.2.78.zip`

## User Verification Needed
- Install the patched build and restart AutoByteus.
- Confirm:
  - Agents page loads
  - Agent Teams page loads
  - `~/.autobyteus/server-data/application-packages/platform/applications` is not repopulated with host editor app bundles

## Release Notes Requirement
- Required for the patched desktop release.
- Suggested user-facing note:
  - Fixed a macOS desktop startup issue where the app could mistakenly treat the system Applications folder as built-in AutoByteus application packages, which prevented agent catalogs from loading.
