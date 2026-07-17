# Electron User-Test Build Report

## Scope

- Ticket: `agent-idle-status-lifecycle`
- User request: Read the repository build guidance and produce an Electron build for local testing.
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-idle-status-lifecycle`
- Branch: `codex/agent-idle-status-lifecycle`
- Candidate checkpoint: `4b434659d9a9c12058e62055a1b98244a3b71795`, plus the reviewed round-5 test-only update and delivery working-tree documentation/reports.
- Build target: macOS ARM64, `personal` flavor, version `1.4.14`.
- Latest base check after build: `origin/personal` remained `fbd7b6764bd43751956d69ffe22b943d06188444` at `2026-07-16T09:08:53Z`; ticket branch remained ahead 7 / behind 0 and contained the latest base.

## README Guidance Used

- Root `README.md` documents the workspace build and release baseline, including the exact Electron runtime pin and mandatory native-module/package validation for desktop builds.
- `autobyteus-web/README.md`, **Desktop Application Build**, specifies `pnpm build:electron:mac`, output under `electron-dist`, and the local macOS no-notarization/logging environment.
- `autobyteus-web/README.md`, **Desktop Application with Integrated Backend**, states that the standard Electron build prepares and bundles the backend server on embedded port `29695`.
- `autobyteus-web/docs/electron_packaging.md` documents `AUTOBYTEUS_BUILD_FLAVOR=personal`, the `AutoByteus_personal` artifact name, and the reviewed `electron@42.4.1` runtime baseline.

## Command

Run from `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-idle-status-lifecycle/autobyteus-web`:

```bash
AUTOBYTEUS_BUILD_FLAVOR=personal \
NO_TIMESTAMP=1 \
APPLE_TEAM_ID= \
APPLE_SIGNING_IDENTITY= \
DEBUG=electron-builder,electron-builder:* \
DEBUG=app-builder-lib* \
DEBUG=builder-util* \
pnpm build:electron:mac
```

- Build result: `Pass`, exit status `0`.
- Build log: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-idle-status-lifecycle/tickets/in-progress/agent-idle-status-lifecycle/execution-evidence/46-electron-build-macos.log`
- Signing/notarization: intentionally skipped for this local user-test build. Electron Builder recorded `identity explicitly is set to null`.

## Produced Artifacts

| Artifact | Size | SHA-256 |
| --- | ---: | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-idle-status-lifecycle/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.4.14.dmg` | 401,412,185 bytes (382.8 MiB) | `3eb36dfc46358346c3ddeebf8cffeb35db39d4f032c9fb42474205770c5bca70` |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-idle-status-lifecycle/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.4.14.zip` | 397,259,436 bytes (378.9 MiB) | `d58760bf9f6f8842507efd9e68396fca03c0066da7dc74a0630c9a0cbfd30b10` |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-idle-status-lifecycle/autobyteus-web/electron-dist/mac-arm64/AutoByteus.app` | 1.2 GiB unpacked app bundle | N/A |

Checksum file: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-idle-status-lifecycle/tickets/in-progress/agent-idle-status-lifecycle/execution-evidence/48-electron-build-artifacts.sha256`

## Verification

- ZIP integrity: `Pass`; `unzip -tq` reported no errors.
- DMG inspection: `Pass`; `hdiutil imageinfo` reported `CUDIFDiskImage` / `UDZO`.
- App metadata: `CFBundleName=AutoByteus`, version/build `1.4.14`, bundle identifier `com.autobyteus.app`.
- Architecture: app executable is Mach-O ARM64.
- Electron runtime: packaged framework and installed package both report `42.4.1`.
- Staged embedded server terminal runtime: target/selected `node-pty` helpers passed architecture and execute-bit checks; real spawn probe passed.
- Packaged embedded server terminal runtime: target/selected `node-pty` helpers passed architecture and execute-bit checks; real spawn probe passed.
- Build outputs (`electron-dist`, `resources`, `dist`, `.nuxt`) are ignored generated paths and did not add tracked source changes.
- Verification evidence: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-idle-status-lifecycle/tickets/in-progress/agent-idle-status-lifecycle/execution-evidence/47-electron-build-verification.log`

## How To Test

The unpacked app is the fastest local path:

```bash
open /Users/normy/autobyteus_org/autobyteus-worktrees/agent-idle-status-lifecycle/autobyteus-web/electron-dist/mac-arm64/AutoByteus.app
```

Or open the installer image:

```bash
open /Users/normy/autobyteus_org/autobyteus-worktrees/agent-idle-status-lifecycle/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.4.14.dmg
```

Before launching this build, quit the currently running AutoByteus instance. A user-owned AutoByteus process is currently listening on embedded backend port `29695`, and two desktop instances cannot own that port simultaneously. Because this build is intentionally unsigned and not notarized, macOS may require right-click **Open** or an explicit local Gatekeeper confirmation.

## Limits And Delivery State

- The app was packaged and its artifacts/native terminal runtime were verified, but delivery did not launch it because the user's existing AutoByteus instance owns port `29695`.
- This is a local user-test build, not a signed/notarized release.
- Ticket archival, final commit/push, merge to `personal`, release/deployment, and cleanup remain on hold pending explicit user verification and release intent.
