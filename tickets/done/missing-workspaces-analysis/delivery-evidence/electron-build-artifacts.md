# Electron Build Artifacts - macOS arm64 Local Test Build

## Build Request

- Requested by user: 2026-07-06, "please read the readme, and build the electron so i could test"
- Purpose: Local test package only; not a repository finalization, published release, notarized distribution, or deployment.
- README/docs read before build:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/missing-workspaces-analysis/README.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/missing-workspaces-analysis/autobyteus-web/README.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/missing-workspaces-analysis/autobyteus-web/docs/electron_packaging.md`

## Integrated Source State

- Ticket branch: `codex/missing-workspaces-analysis`
- Safety checkpoint commit before base refresh: `0c8c02c5d1b7` (`chore(delivery): checkpoint missing workspaces before base refresh`)
- Latest tracked remote base integrated: `origin/personal` at `4561ac89b1606791bd830623d629e411d192f64c`
- Integration method: merge `origin/personal` into ticket branch
- Build commit: `3a3a84402095d5aaca64aba741808388f144c484`
- Ahead/behind after merge: ahead 2 / behind 0 relative to `origin/personal`

## Host / Runtime

- Host: macOS arm64 (`Darwin MacBookPro 25.2.0 ... RELEASE_ARM64_T6000 arm64`)
- Node: `v22.23.1`
- pnpm: `10.28.2`
- Electron runtime in package: `42.4.1`

## Command

```bash
AUTOBYTEUS_BUILD_FLAVOR=personal \
NO_TIMESTAMP=1 \
APPLE_ID= \
APPLE_APP_SPECIFIC_PASSWORD= \
APPLE_TEAM_ID= \
APPLE_SIGNING_IDENTITY= \
pnpm -C autobyteus-web build:electron:mac
```

## Result

- Exit status: `0`
- Build type: unsigned, not notarized, macOS arm64 local test build
- Build log: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/missing-workspaces-analysis/delivery-evidence/electron-build-mac-arm64.log`
- Packaged app directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/missing-workspaces-analysis/autobyteus-web/electron-dist/mac-arm64/AutoByteus.app`

## Artifacts

| Artifact | Size | SHA-256 |
| --- | ---: | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/missing-workspaces-analysis/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.4.1.dmg` | 401150166 bytes | `7d130a3c26ef2a515015f18bec47a5b61976ffd3a1505bc7041c3c894b8bb46e` |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/missing-workspaces-analysis/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.4.1.zip` | 397134155 bytes | `dd11f167e8fa21b7987c733786600a6ddc4673ee8d8582da555de1d9c1b94130` |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/missing-workspaces-analysis/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.4.1.dmg.blockmap` | 417615 bytes | `9312037b1d9e32ea71dacadd7b4a16dc140d97bb1dc3cdbdea4495dca0b00edf` |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/missing-workspaces-analysis/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.4.1.zip.blockmap` | 408243 bytes | `392667fe470186833743f90bffbc1c46349aeff44ecf869c8f21b4b14090bd82` |

## Packaged Fix Presence Check

- Packaged server file present: `/Users/normy/autobyteus_org/autobyteus-worktrees/missing-workspaces-analysis/autobyteus-web/electron-dist/mac-arm64/AutoByteus.app/Contents/Resources/server/dist/workspaces/workspace-registry-file-persistence.js`
- Packaged server file present: `/Users/normy/autobyteus_org/autobyteus-worktrees/missing-workspaces-analysis/autobyteus-web/electron-dist/mac-arm64/AutoByteus.app/Contents/Resources/server/dist/workspaces/workspace-registry-store.js`
- String check found `Suspicious workspace registry shrink rejected.` in packaged workspace registry persistence code.

## Test Notes

- This local build intentionally disables Apple signing identity and notarization for fast local testing.
- macOS Gatekeeper behavior can differ from a signed/notarized release artifact. If macOS blocks opening this local build, use Finder right-click -> Open for local testing, or test the unpacked app directory directly.

## Post-Finalization Retention Note

The DMG/ZIP/unpacked app paths above were build-time paths inside the dedicated ticket worktree. After the user verified the local package and the ticket was merged to `personal`, delivery cleanup removed `/Users/normy/autobyteus_org/autobyteus-worktrees/missing-workspaces-analysis`, so those unsigned local package files are no longer retained. The durable retained evidence is this artifact and `electron-build-mac-arm64.log` under `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/missing-workspaces-analysis/delivery-evidence/`.
