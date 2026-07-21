# Electron User-Test Build Report

## Scope

- Ticket: `agent-idle-status-lifecycle`
- User request: refresh the ticket branch from the latest `origin/personal` and rebuild Electron for local testing.
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-idle-status-lifecycle`
- Branch/head: `codex/agent-idle-status-lifecycle` at `8052f9d777dcdb30443af068159760ed0c14ec7f`.
- Integrated base: `origin/personal@8c7e2c2aa591b174a3d5c90eb0d05584538bbf12`, release baseline `v1.4.19`; final fetch at `2026-07-20T04:31:46Z` confirmed ahead 13 / behind 0.
- Build target: macOS ARM64, `personal` flavor, version `1.4.19`, Electron `42.4.1`.
- Superseded build: the earlier `1.4.17` package and logs `50`-`52` are retained as historical evidence and are not the current user-test candidate.

## Latest-Base Integration

- The prior delivery state was protected at `a4f92249f59a9a24e00eb1ce2047eae7933a441f`.
- The base had advanced by 25 commits from the prior `v1.4.17` base (104 from bootstrap). The first refresh merged cleanly at `9cffe5dd36279df7736c77058b83930636fb0eb4`.
- During the first build attempt, `origin/personal` advanced again. That attempt was intentionally interrupted, recorded in logs `57`-`58`, and produced no delivery candidate.
- The evidence was checkpointed at `99fc83570c7863a8b27bf35ee35c04629f327105`, and the final base advance merged without conflicts at `8052f9d777dcdb30443af068159760ed0c14ec7f`.
- Frozen dependency installation passed (`execution-evidence/56-post-v1.4.19-frozen-install.log`).
- The final post-integration lifecycle smoke passed 6 files / 38 tests (`execution-evidence/59-post-latest-v1.4.19-lifecycle-smoke.log`).

## README Guidance And Build

The latest `autobyteus-web/README.md` specifies `pnpm build:electron:mac`, output under `electron-dist`, and the local no-notarization environment. The latest packaging guide also requires the staged/final `node-pty` checks and the new noVNC third-party notice projections.

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
- Build evidence: `execution-evidence/60-electron-build-macos-latest-v1.4.19-personal.log`.
- Signing/notarization: intentionally skipped for this local user-test build.

## Current Artifacts

| Artifact | Size | SHA-256 |
| --- | ---: | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-idle-status-lifecycle/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.4.19.dmg` | 401,785,626 bytes | `5efa3ac536db50a53ce7e8ad649e9346a6bd282ab3e3063f811ef45205e627b4` |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-idle-status-lifecycle/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.4.19.zip` | 397,456,444 bytes | `16643e30231f8b0d6c8a80916c16a916b18fbfc6b491ff316cb607e0fac31fbf` |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-idle-status-lifecycle/autobyteus-web/electron-dist/mac-arm64/AutoByteus.app` | approximately 1.2 GiB | N/A |

Checksum evidence: `execution-evidence/62-electron-build-latest-v1.4.19-artifacts.sha256`.

## Verification

- ZIP integrity and DMG metadata: `Pass` (`CUDIFDiskImage` / `UDZO`).
- App metadata: `AutoByteus`, bundle `com.autobyteus.app`, version/build `1.4.19`, ARM64, Electron `42.4.1`.
- Staged and packaged `node-pty` architecture/execute-bit checks and real spawn probes: `Pass`.
- Canonical, generated renderer, unpacked app, ZIP, and DMG noVNC third-party notice hashes all match: `Pass`.
- Corrected authoritative verification: `execution-evidence/63-electron-build-latest-v1.4.19-verification-rerun.log`, exit status `0`.
- Historical verifier attempt `61` stopped only because it queried the wrong Electron Framework plist version key; the corrected verifier used `CFBundleVersion`. This was not a product or build failure.

## How To Test

Quit the currently running AutoByteus instance first because it owns embedded backend port `29695`. Then use either:

```bash
open /Users/normy/autobyteus_org/autobyteus-worktrees/agent-idle-status-lifecycle/autobyteus-web/electron-dist/mac-arm64/AutoByteus.app
```

or:

```bash
open /Users/normy/autobyteus_org/autobyteus-worktrees/agent-idle-status-lifecycle/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.4.19.dmg
```

Because the package is unsigned and not notarized, macOS may require right-click **Open** or explicit local Gatekeeper confirmation.

## Delivery State

The latest-base package is ready for interactive user testing. Ticket archival, final push/merge to `personal`, release/deployment, and cleanup remain on hold pending explicit user verification.
