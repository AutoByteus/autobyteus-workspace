# macOS Electron Test Build Report

## Request

- User request: Read the README and build the Electron application for user testing.
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/markdown-preview-relative-images`
- Branch: `codex/markdown-preview-relative-images`
- Build head: `6b127afb87a70cf07d6e31873cad6f658706e5a2`
- Implementation commit included: `ec190fbb42207bcc3bdf9b01593a7708453a199b`

## Documentation Consulted

- `/Users/normy/autobyteus_org/autobyteus-worktrees/markdown-preview-relative-images/autobyteus-web/README.md`
- Relevant guidance: `Desktop Application Build`, `macOS Build With Logs (No Notarization)`, and `Desktop Application with Integrated Backend`.
- Documented command: `pnpm build:electron:mac`
- Documented output location: `autobyteus-web/electron-dist`

## Preparation

- The dedicated worktree initially had no installed dependencies.
- Command: `pnpm install --frozen-lockfile`
- Result: `Pass` — lockfile was already current; workspace dependencies installed without modifying the tracked lockfile.

## Build

- Command: `NO_TIMESTAMP=1 APPLE_TEAM_ID= pnpm -C autobyteus-web build:electron:mac`
- Result: `Pass`
- Package version: `1.4.9`
- Platform / architecture: `macOS arm64`
- Electron runtime: `42.4.1`
- Integrated backend: included by the documented `prepare-server` boundary.
- Guards: web boundary passed; localization boundary passed; localization literal audit passed with zero unresolved findings.
- Native packaging: Electron native dependencies rebuilt; packaged `node-pty` helper execute bits normalized.
- Signing/notarization: intentionally skipped for this local test build (`APPLE_TEAM_ID=` and `NO_TIMESTAMP=1`).
- Full build log: `/Users/normy/autobyteus_org/autobyteus-worktrees/markdown-preview-relative-images/tickets/done/markdown-preview-relative-images/delivery-evidence/electron-build-mac.log`

## Testable Outputs

- Direct app bundle: `/Users/normy/autobyteus_org/autobyteus-worktrees/markdown-preview-relative-images/autobyteus-web/electron-dist/mac-arm64/AutoByteus.app`
  - Size: approximately `1.2 GB`
  - Executable: Mach-O 64-bit `arm64`
  - Bundle version: `1.4.9`
- DMG: `/Users/normy/autobyteus_org/autobyteus-worktrees/markdown-preview-relative-images/autobyteus-web/electron-dist/AutoByteus_enterprise_macos-arm64-1.4.9.dmg`
  - Size: approximately `383 MB`
  - SHA-256: `ddaabdac9275d663fbabbe0aa298edad361d51f95387c29267c7e2ac4ddeb931`
- ZIP: `/Users/normy/autobyteus_org/autobyteus-worktrees/markdown-preview-relative-images/autobyteus-web/electron-dist/AutoByteus_enterprise_macos-arm64-1.4.9.zip`
  - Size: approximately `379 MB`
  - SHA-256: `cbd671a81af20b03941c403a41f69a91d374f5022db2eaeb1fc8e798a86125b4`

## User Test Guidance

- Launch the direct worktree build:
  - `open "/Users/normy/autobyteus_org/autobyteus-worktrees/markdown-preview-relative-images/autobyteus-web/electron-dist/mac-arm64/AutoByteus.app"`
- Or mount the DMG:
  - `open "/Users/normy/autobyteus_org/autobyteus-worktrees/markdown-preview-relative-images/autobyteus-web/electron-dist/AutoByteus_enterprise_macos-arm64-1.4.9.dmg"`
- Because this is an unsigned, non-notarized local build, macOS may require right-clicking the app and selecting **Open**.
- Representative feature check: open a workspace Markdown/README file containing a relative image such as `![Diagram](assets/diagram.png)` and confirm the image renders while surrounding Markdown remains intact.

## Repository Impact

- Generated dependency, Nuxt, mobile, server-resource, app, DMG, ZIP, and blockmap outputs are ignored build artifacts.
- No tracked source or lockfile changed as a result of dependency installation or packaging.
- The user subsequently declared the task complete and authorized finalization plus a new release. This build remains the local verification artifact for the pre-release `1.4.9` handoff state; repository release `1.4.10` is handled separately by the documented release flow.
- The dedicated worktree and its ignored local package outputs were removed after successful `v1.4.10` publication. Official release artifacts are available from `https://github.com/AutoByteus/autobyteus-workspace/releases/tag/v1.4.10`.
