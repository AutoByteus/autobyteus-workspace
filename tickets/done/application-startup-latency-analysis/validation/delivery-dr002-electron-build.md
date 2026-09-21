# DR-002 Electron Build Verification

- Ticket: `APP-STARTUP-LATENCY-20260918-001`
- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/application-startup-latency-analysis`
- Branch: `codex/application-startup-latency-analysis`
- Date: `2026-09-19`
- README command: `pnpm build:electron:mac`
- Working directory: `autobyteus-web`
- Build result: `Pass` (`exit 0`)
- Package: `AutoByteus enterprise 1.4.69`, macOS Apple Silicon (`arm64`)
- Signing: skipped intentionally by the local builder (`identity=null`); this is not a published release.

## Artifacts

| Artifact | Size | SHA-256 |
| --- | ---: | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/application-startup-latency-analysis/autobyteus-web/electron-dist/AutoByteus_enterprise_macos-arm64-1.4.69.dmg` | approximately `446 MiB` | `8ec49141a8e05e1a27dafb4222f6192ac303c88e350e8f83c08af4dd2b703842` |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/application-startup-latency-analysis/autobyteus-web/electron-dist/AutoByteus_enterprise_macos-arm64-1.4.69.zip` | approximately `441 MiB` | `ed2eeb17e9e0800e27c9aee6d9b6ae1d53667bb398f62467338e122e34519ea7` |

## Verification

- Frontend web/localization guards: Pass.
- Production server build and sanitized built-in-agent bootstrap smoke performed by `prepare-server`: Pass.
- Electron renderer/main/preload generation: Pass.
- Packaged terminal runtime check: Pass for target and selected arm64 `node-pty` helper.
- Packaged terminal real spawn probe: Pass.
- DMG `hdiutil verify`: checksum valid.
- ZIP `unzip -tq`: no errors detected.
- Post-build `IR-005` candidate source integrity: `20/20` manifest entries exact.

## Qualifications

- Non-blocking toolchain warnings included stale Browserslist data, deprecated subdependencies, Nuxt peer-version notices, and large chunk-size warnings; the documented build completed successfully.
- This is an unsigned local verification build only. Nothing was installed, tagged, published, or deployed.
- User launch and behavior verification remain pending; packaging success is not substituted for user acceptance.
- Generated shared-SDK source-tree outputs created as build prerequisites were removed after packaging; they are not authorized source additions. The Electron artifacts and packaged app remain available under `autobyteus-web/electron-dist`.
