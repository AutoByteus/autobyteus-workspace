# Local Electron Build Artifacts — Google Gemini Media Model Support
- Build result: `Pass`
- Build started: `2026-07-03T14:06:50Z`
- Build finished: `2026-07-03T14:11:08Z`
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/google-gemini-media-model-support`
- Branch: `codex/google-gemini-media-model-support`
- Build HEAD: `6ae39bc298928f00cee75338032add3306532a67`
- Platform: macOS `26.2`, `arm64`
- Node: `v22.23.1`
- pnpm observed in build: `10.28.1`
- README guidance read: root `README.md` release workflow notes and `autobyteus-web/README.md` Desktop Application Build / macOS Build With Logs / Integrated Backend sections.
- Build log: `/Users/normy/autobyteus_org/autobyteus-worktrees/google-gemini-media-model-support/tickets/done/google-gemini-media-model-support/validation-evidence/local-electron-build-mac-20260703T140650Z.log`
- SHA-256 manifest: `/Users/normy/autobyteus_org/autobyteus-worktrees/google-gemini-media-model-support/tickets/done/google-gemini-media-model-support/local-electron-build-artifacts-20260703T141108Z.sha256`
- Signing/notarization: disabled for local user testing via `NO_TIMESTAMP=1`, empty Apple signing env, and `CSC_IDENTITY_AUTO_DISCOVERY=false`; electron-builder reported skipped macOS code signing.

## Command

```bash
cd /Users/normy/autobyteus_org/autobyteus-worktrees/google-gemini-media-model-support/autobyteus-web
CI=true NO_TIMESTAMP=1 APPLE_TEAM_ID= APPLE_ID= APPLE_APP_SPECIFIC_PASSWORD= APPLE_SIGNING_IDENTITY= CSC_IDENTITY_AUTO_DISCOVERY=false pnpm build:electron:mac
```

## Artifacts

| Artifact | Type | Size | Notes |
| --- | --- | ---: | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/google-gemini-media-model-support/autobyteus-web/electron-dist/mac-arm64/AutoByteus.app` | App bundle | directory | Primary app bundle for direct local launch |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/google-gemini-media-model-support/autobyteus-web/electron-dist/AutoByteus_enterprise_macos-arm64-1.3.97.dmg` | File | 382.53 MiB | Distribution/test artifact |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/google-gemini-media-model-support/autobyteus-web/electron-dist/AutoByteus_enterprise_macos-arm64-1.3.97.zip` | File | 378.69 MiB | Distribution/test artifact |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/google-gemini-media-model-support/autobyteus-web/electron-dist/AutoByteus_enterprise_macos-arm64-1.3.97.dmg.blockmap` | File | 408.58 KiB | Distribution/test artifact |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/google-gemini-media-model-support/autobyteus-web/electron-dist/AutoByteus_enterprise_macos-arm64-1.3.97.zip.blockmap` | File | 399.26 KiB | Distribution/test artifact |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/google-gemini-media-model-support/autobyteus-web/electron-dist/latest-mac.yml` | File | 561 B | Distribution/test artifact |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/google-gemini-media-model-support/autobyteus-web/electron-dist/builder-debug.yml` | File | 813 B | Distribution/test artifact |

## SHA-256

```text
16678fd2f88c05be55343c5d1571d2e87a81445ec52485b65165fe8119b7e845  /Users/normy/autobyteus_org/autobyteus-worktrees/google-gemini-media-model-support/autobyteus-web/electron-dist/AutoByteus_enterprise_macos-arm64-1.3.97.dmg
9c64f5d40282b4c0f21434aaef2c6083209a86800807fe4095f540df0d1a14c6  /Users/normy/autobyteus_org/autobyteus-worktrees/google-gemini-media-model-support/autobyteus-web/electron-dist/AutoByteus_enterprise_macos-arm64-1.3.97.zip
d8ff09e50a1d3aae3c6cff60ca957112bb8d4afc79e2c9c863b720c7bb2a8ab2  /Users/normy/autobyteus_org/autobyteus-worktrees/google-gemini-media-model-support/autobyteus-web/electron-dist/AutoByteus_enterprise_macos-arm64-1.3.97.dmg.blockmap
0dfd41ea26c9b901dc577802812f96d17b1d87143df36ee9117c032926e82315  /Users/normy/autobyteus_org/autobyteus-worktrees/google-gemini-media-model-support/autobyteus-web/electron-dist/AutoByteus_enterprise_macos-arm64-1.3.97.zip.blockmap
29a29441684e351cc15b7b8bd1fa1ca7825a4bb92e1c2f8afe7fd4f00d30e9f9  /Users/normy/autobyteus_org/autobyteus-worktrees/google-gemini-media-model-support/autobyteus-web/electron-dist/latest-mac.yml
ed385e8fd8a1f1805f2961879c48eed5566a9dd37ac549d14f4690f4df26af80  /Users/normy/autobyteus_org/autobyteus-worktrees/google-gemini-media-model-support/autobyteus-web/electron-dist/builder-debug.yml
```

## Notes For Testing

- This is an unsigned local macOS ARM64 build for user testing, not a signed/notarized release artifact.
- If macOS Gatekeeper blocks the app, launch the `.app` from Finder with right-click > Open or test from the generated DMG according to local security settings.
- The Electron app includes the bundled backend server as prepared by the documented `build:electron:mac` command.
