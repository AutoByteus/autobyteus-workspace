# Electron User-Test Build Report

## Scope

- Ticket: `agent-idle-status-lifecycle`
- User request: refresh the ticket branch from the latest `origin/personal` and rebuild Electron for local testing.
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-idle-status-lifecycle`
- Branch/head: `codex/agent-idle-status-lifecycle` at `1ae7ad7f5f69dc31536ac0970d54d164ea405c91`.
- Integrated base: `origin/personal@9b4e038a40e0b6358fe53ca101406e0f6446e790`, release baseline `v1.4.23`; final fetch at `2026-07-21T13:17:27Z` confirmed ahead 15 / behind 0.
- Build target: macOS ARM64, `personal` flavor, version `1.4.23`, Electron `42.4.1`.
- Superseded build: the earlier `1.4.19` package and logs `66` and below are historical and are not the current user-test candidate.

## Latest-Base Integration

- The prior delivery package was protected at checkpoint `88313d23c4703a811db1f437798e0d5ac3b7400f`.
- The base advanced by 44 commits from the prior integration (148 from bootstrap), including separately delivered application-framework, local-file URI, Mermaid viewer/error-layout, and nested diagram-overlay work.
- `origin/personal@9b4e038a40e0b6358fe53ca101406e0f6446e790` merged without conflicts at `1ae7ad7f5f69dc31536ac0970d54d164ea405c91`.
- Frozen dependency installation passed (`execution-evidence/67-post-v1.4.23-frozen-install.log`).
- The post-integration lifecycle smoke passed 6 files / 38 tests (`execution-evidence/66-post-latest-v1.4.23-lifecycle-smoke.log`).

## README Guidance And Build

The latest `autobyteus-web/README.md` specifies `pnpm build:electron:mac`, output under `electron-dist`, and the local no-notarization environment. The current packaging guide additionally requires staged/final `node-pty` validation and consistent noVNC third-party notice projections.

Run from `autobyteus-web`:

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

- Result: `Pass`, exit status `0`.
- Build evidence: `execution-evidence/68-electron-build-macos-latest-v1.4.23-personal.log`.
- Build-time web boundary, localization boundary, localization literal audit, server build/bootstrap, Nuxt generation, native rebuild, and packaging stages passed.
- Signing/notarization: intentionally skipped for this local user-test build.

## Current Artifacts

| Artifact | Size | SHA-256 |
| --- | ---: | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-idle-status-lifecycle/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.4.23.dmg` | 401,892,373 bytes | `2297e4dc013aec51f660c6785235bf9fc273a5863d227bf924fcb5afdf4e24f9` |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-idle-status-lifecycle/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.4.23.zip` | 397,474,740 bytes | `68a25d3dadf3afa08bcd53f5dca2044148a04310c332a0c35be5dedb531bc4fa` |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-idle-status-lifecycle/autobyteus-web/electron-dist/mac-arm64/AutoByteus.app` | approximately 1.2 GiB | N/A |

Checksum evidence: `execution-evidence/70-electron-build-latest-v1.4.23-artifacts.sha256`.

## Verification

- ZIP integrity and DMG metadata: `Pass` (`CUDIFDiskImage` / `UDZO`).
- App metadata: `AutoByteus`, bundle `com.autobyteus.app`, version/build `1.4.23`, ARM64, Electron `42.4.1`.
- Staged and packaged `node-pty` architecture/execute-bit checks and real spawn probes: `Pass`.
- Canonical, generated renderer, unpacked app, ZIP, and DMG noVNC third-party notice hashes all match: `Pass`.
- Authoritative verification: `execution-evidence/69-electron-build-latest-v1.4.23-verification.log`, exit status `0`.

## How To Test

Quit the currently running AutoByteus instance first because it owns embedded backend port `29695`. Then use either:

```bash
open /Users/normy/autobyteus_org/autobyteus-worktrees/agent-idle-status-lifecycle/autobyteus-web/electron-dist/mac-arm64/AutoByteus.app
```

or:

```bash
open /Users/normy/autobyteus_org/autobyteus-worktrees/agent-idle-status-lifecycle/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.4.23.dmg
```

Because the package is unsigned and not notarized, macOS may require right-click **Open** or explicit local Gatekeeper confirmation.

## Delivery State

The latest-base package is ready for interactive user testing. Ticket archival, final push/merge to `personal`, release/deployment, and cleanup remain on hold pending explicit user verification.
