# Electron User-Test Build Report

## Scope

- Ticket: `agent-idle-status-lifecycle`
- User request: base the ticket branch on the latest `origin/personal` and rebuild Electron for local testing.
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-idle-status-lifecycle`
- Branch: `codex/agent-idle-status-lifecycle`
- Reviewed source head: `740bec4cd4f03a198e0cc7cd8e575351e607991f`
- Reviewed package checkpoint/build head: `7e4b78d314b867c57723cee95d0cdd24be33a3cf`
- Current/integrated base: `origin/personal@6caf809303294252c109420b238588f0c68aca6a`; merge base is identical and the branch is ahead 17 / behind 0.
- Build target: macOS ARM64, `personal` flavor, AutoByteus `1.4.28`, Electron `42.4.1`.

## Latest-Base Confirmation

- A delivery-safety checkpoint committed the complete reviewed API/E2E package at `7e4b78d314b867c57723cee95d0cdd24be33a3cf`.
- `git fetch origin personal --tags` before packaging confirmed that the reviewed package already contained the current remote base, so no additional merge/rebase or lifecycle rerun was required.
- A second fetch after packaging confirmed the same `origin/personal@6caf809303294252c109420b238588f0c68aca6a` relationship.
- Initial DR-001 evidence is `127`/`133`. The user-requested DR-002 rebuild reconfirmed the README and base in `136` and `140`.

## README Guidance And Build

`autobyteus-web/README.md` specifies `pnpm build:electron:mac`, output under `electron-dist`, and the local no-notarization environment. Run from `autobyteus-web`:

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

- Frozen workspace install: `Pass` (`pnpm install --frozen-lockfile`), current rebuild evidence `137`.
- Build: `Pass`, exit status `0`, current rebuild evidence `138`.
- Build-time web/localization guards, server/SDK build and sanitized bootstrap, mobile assets, Nuxt Electron generation, native rebuild, and DMG/ZIP packaging passed.
- Developer ID signing and notarization: intentionally not performed for this local test package. The root executable retains only its toolchain ad-hoc/linker signature with no TeamIdentifier.

## Current Artifacts

| Artifact | Size | SHA-256 |
| --- | ---: | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-idle-status-lifecycle/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.4.28.dmg` | 402,059,328 bytes | `bcf8f7f981b837c3250d32bfc7676ab054b46b35f489516495f36031aa277298` |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-idle-status-lifecycle/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.4.28.zip` | 397,917,526 bytes | `a36b85ece5b5f3deffaf3296e3b7ccac7ebc6f53cd46580c66dadf5e4d324081` |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-idle-status-lifecycle/autobyteus-web/electron-dist/mac-arm64/AutoByteus.app` | approximately 1.2 GiB | N/A |

Current DR-002 checksum/base evidence: `execution-evidence/140-dr002-post-build-base-and-checksums.log`.

## Verification

- ZIP integrity and DMG metadata: `Pass` (`CUDIFDiskImage` / `UDZO`).
- App metadata: `AutoByteus`, `com.autobyteus.app`, app/build `1.4.28`, Electron `42.4.1`, ARM64.
- Staged and packaged `node-pty` architecture, execute-bit, and real spawn probes: `Pass`.
- Packaged backend startup on an isolated random port and temporary SQLite database, including all 18 migrations and `/rest/health`: `Pass`; owned process/data cleaned.
- Canonical, generated renderer, unpacked app, ZIP, and DMG noVNC notice hashes: `Pass`.
- Package signing classification: local ad-hoc/linker signature only, no TeamIdentifier, no Developer ID, no notarization; expected for this local user-test build.
- The explicit DR-002 rebuild passed all verification stages in one authoritative run; prior DR-001 delivery-script expectation mistakes in evidence `130`/`131` remain history only and do not describe the current package.
- Authoritative current evidence: `execution-evidence/138-dr002-electron-build-v1428-macos-personal.log`, `139-dr002-electron-build-v1428-verification.log`, and `140-dr002-post-build-base-and-checksums.log`.

## How To Test

The currently installed AutoByteus application still owns embedded port `29695`; it was not stopped or modified. Quit that application before opening this build, then use either:

```bash
open /Users/normy/autobyteus_org/autobyteus-worktrees/agent-idle-status-lifecycle/autobyteus-web/electron-dist/mac-arm64/AutoByteus.app
```

or:

```bash
open /Users/normy/autobyteus_org/autobyteus-worktrees/agent-idle-status-lifecycle/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.4.28.dmg
```

Because this local package is not Developer-ID signed or notarized, macOS may require right-click **Open** or explicit local Gatekeeper confirmation.

## Delivery State

The explicitly rebuilt latest-base v1.4.28 package is ready for interactive user testing. The earlier DR-001 output was superseded and removed after the DR-002 package passed verification. Ticket archival, push/merge to `personal`, release/tag/publication/deployment, and cleanup remain on hold pending explicit user verification.
