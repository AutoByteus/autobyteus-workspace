# Electron Test Build Report

## Build Scope

- Ticket: `newest-glm-kimi-models`
- Purpose: Local macOS Electron application build for user verification before repository finalization.
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/newest-glm-kimi-models`
- Branch: `codex/newest-glm-kimi-models`
- Build date: `2026-06-17`
- Build command source: `autobyteus-web/README.md` Desktop Application Build and macOS no-notarization guidance.
- Package context: Code review Round 5 and API/E2E Round 3 are the latest authoritative package/evidence.

## Command

```bash
cd /Users/normy/autobyteus_org/autobyteus-worktrees/newest-glm-kimi-models/autobyteus-web
AUTOBYTEUS_BUILD_FLAVOR=personal NO_TIMESTAMP=1 APPLE_TEAM_ID= pnpm build:electron:mac
```

## Result

- Status: `Pass`
- Log: `/Users/normy/autobyteus_org/autobyteus-worktrees/newest-glm-kimi-models/tickets/done/newest-glm-kimi-models/electron-test-build.log`
- Started: `2026-06-17T09:38:54Z`
- Finished: `2026-06-17T09:45:09Z`
- Logged build exit status: `0`
- DMG verification: `Pass`; log: `/Users/normy/autobyteus_org/autobyteus-worktrees/newest-glm-kimi-models/tickets/done/newest-glm-kimi-models/electron-test-build-dmg-verify.log`
- Signing/notarization: Local unsigned build; code signing skipped because signing identity was explicitly null; no notarization was performed.
- Wrapper note: The PTY wrapper was manually interrupted after the build had already logged completion and all artifacts were written; artifact integrity was confirmed with `hdiutil verify`.

## Artifacts

| Artifact | Size | SHA-256 |
| --- | ---: | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/newest-glm-kimi-models/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.3.56.dmg` | 368M | `d026c4347db6f453aed50d6272c764c1c49cbe5102652379d8e3f228194a38f9` |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/newest-glm-kimi-models/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.3.56.zip` | 369M | `e7b0aca92d8a02c3404568e564e5dac05e9eb2f95883ab330d69c94082ae2b20` |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/newest-glm-kimi-models/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.3.56.dmg.blockmap` | 388K | `7843a8cc98d4a899cad35a7da83827fbb5daee98ed08f74aaba12ec0708bd1b9` |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/newest-glm-kimi-models/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.3.56.zip.blockmap` | 388K | `3c87d128d0175faa70c9847ad18288a6a5f36f41ceef990f96b64581591b9b3e` |

## User Testing Notes

- Preferred install/test artifact: the `.dmg` file.
- This build includes the integrated backend server and uses the embedded Electron node URL automatically.
- Because this is a local unsigned build, macOS Gatekeeper may require right-click/open or explicit approval in Privacy & Security.
- This build is for verification only; no release, tag, push, merge, or deployment was performed.
- Out of scope for this ticket: `kimi-k2.7-code-highspeed` and the deferred RPA media schema casing issue.
