# Electron User-Test Build Report

## Scope

- Ticket: `agent-idle-status-lifecycle`
- User request: update the ticket branch from the latest `origin/personal`, reread the build guidance, and rebuild Electron for local testing.
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-idle-status-lifecycle`
- Branch/head: `codex/agent-idle-status-lifecycle` at merge commit `af78a9307611f58c383ea5b5c9d8dd727deeb918`.
- Integrated base: `origin/personal@dbc83fdb51c1e158b5707c219dd8574dc49fa493` (`v1.4.17`), fetched again at `2026-07-17T15:47:03Z`; branch relationship was ahead 9 / behind 0.
- Build target: macOS ARM64, `personal` flavor, version `1.4.17`.
- Superseded build: the earlier `1.4.14` package and evidence logs `46`-`48` are historical and no longer the user-test candidate.

## Integration And README Guidance

- A safety checkpoint preserved the reviewed package at `d88dd1e7345a70e0f923384e5f615011e5da3ad4`.
- The 79 new base commits were merged without conflicts; the resulting ticket head is `af78a9307611f58c383ea5b5c9d8dd727deeb918`.
- The six-file lifecycle smoke passed 38/38 after the merge (`execution-evidence/49-post-latest-base-lifecycle-smoke.log`).
- The latest `autobyteus-web/README.md` specifies `pnpm build:electron:mac`, output under `electron-dist`, and the local no-notarization environment. The workspace still pins Electron `42.4.1`.

## Build Command And Result

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
- Build evidence: `execution-evidence/50-electron-build-macos-latest-personal.log`.
- Signing/notarization: intentionally skipped for this local user-test build.

## Current Artifacts

| Artifact | Size | SHA-256 |
| --- | ---: | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-idle-status-lifecycle/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.4.17.dmg` | 401,399,454 bytes | `253ab921d61e8cf39f9b0a8c7ca4732de40e9d7978cd5fbb084443657e7a1b98` |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-idle-status-lifecycle/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.4.17.zip` | 397,281,028 bytes | `1a9be93f147f318a03e0ae743d5235a035ff6b3c83098f430d984f1fafc93d06` |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-idle-status-lifecycle/autobyteus-web/electron-dist/mac-arm64/AutoByteus.app` | approximately 1.2 GiB | N/A |

Checksum evidence: `execution-evidence/52-electron-build-latest-artifacts.sha256`.

## Verification

- ZIP integrity: `Pass`.
- DMG metadata: `CUDIFDiskImage` / `UDZO`, `Pass`.
- App metadata: `AutoByteus`, bundle `com.autobyteus.app`, version/build `1.4.17`.
- Architecture/runtime: ARM64, Electron `42.4.1`.
- Staged and packaged `node-pty` helper architecture and execute-bit checks: `Pass`.
- Staged and packaged real `node-pty` spawn probes: `Pass`.
- Generated output paths remain ignored and do not add tracked product-source changes.
- Verification evidence: `execution-evidence/51-electron-build-latest-verification.log` (`verification_result=pass`, exit status `0`).

## How To Test

Quit the currently running AutoByteus instance first because it owns embedded backend port `29695`. Then use either:

```bash
open /Users/normy/autobyteus_org/autobyteus-worktrees/agent-idle-status-lifecycle/autobyteus-web/electron-dist/mac-arm64/AutoByteus.app
```

or:

```bash
open /Users/normy/autobyteus_org/autobyteus-worktrees/agent-idle-status-lifecycle/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.4.17.dmg
```

Because the package is unsigned and not notarized, macOS may require right-click **Open** or explicit local Gatekeeper confirmation.

## Delivery State

The latest-base package is ready for interactive user testing. Ticket archival, final push/merge to `personal`, release/deployment, and cleanup remain on hold pending explicit user verification.
