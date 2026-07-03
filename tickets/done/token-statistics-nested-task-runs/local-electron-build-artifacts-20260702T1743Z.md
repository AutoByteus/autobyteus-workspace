# Local Electron Build Artifacts — 2026-07-02

## Command

Read from `autobyteus-web/README.md` and executed from `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-nested-task-runs/autobyteus-web`:

```bash
CI=true \
NO_TIMESTAMP=1 \
APPLE_TEAM_ID= \
APPLE_ID= \
APPLE_APP_SPECIFIC_PASSWORD= \
APPLE_SIGNING_IDENTITY= \
CSC_IDENTITY_AUTO_DISCOVERY=false \
pnpm build:electron:mac
```

## Result

- Result: `Pass`
- Build started: `2026-07-02T17:43:19Z`
- Build finished: `2026-07-02T17:46:59Z`
- Build log: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-nested-task-runs/tickets/done/token-statistics-nested-task-runs/local-electron-build-mac-20260702T1743Z.log`
- SHA-256 manifest: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-nested-task-runs/tickets/done/token-statistics-nested-task-runs/local-electron-build-artifacts-20260702T1743Z.sha256`

## Testable Artifacts

- App bundle: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-nested-task-runs/autobyteus-web/electron-dist/mac-arm64/AutoByteus.app`
- DMG: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-nested-task-runs/autobyteus-web/electron-dist/AutoByteus_enterprise_macos-arm64-1.3.93.dmg`
- ZIP: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-nested-task-runs/autobyteus-web/electron-dist/AutoByteus_enterprise_macos-arm64-1.3.93.zip`
- Updater metadata: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-statistics-nested-task-runs/autobyteus-web/electron-dist/latest-mac.yml`

## Notes

- This is a local unsigned macOS ARM64 build for user testing. The build intentionally disabled Apple signing/notarization (`APPLE_SIGNING_IDENTITY=` and `CSC_IDENTITY_AUTO_DISCOVERY=false`), so it is not release-policy proof.
- Electron Builder resolved flavor as `enterprise` from the current git context fallback/branch inference.
- The packaged server was prepared and native modules were rebuilt for Electron `42.4.1`; `node-pty` spawn-helper execute bits were normalized during the build.
