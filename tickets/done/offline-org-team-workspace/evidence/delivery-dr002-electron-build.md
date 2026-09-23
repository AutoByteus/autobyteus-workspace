# DR-002 Task-Branch Electron Verification Candidate

- Date: 2026-09-23 (Europe/Berlin)
- Source worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/offline-org-team-workspace`
- Source branch/revision: `codex/offline-org-team-workspace` / `7fde38709e44651698807a2366b9193106c3fa69`, plus uncommitted Delivery docs only
- README method: `autobyteus-web/README.md` → **macOS Build With Logs (No Notarization)**
- Command, from `autobyteus-web`:

```bash
NO_TIMESTAMP=1 APPLE_TEAM_ID= \
  DEBUG=electron-builder,electron-builder:* \
  DEBUG=app-builder-lib* DEBUG=builder-util* \
  pnpm build:electron:mac
```

## Result

- Build: **Pass**, exit 0.
- Flavor/version/architecture: `enterprise` / `1.4.74` / macOS `arm64`.
- Signing/publication: unsigned local candidate; no notarization, timestamp, release, upload, installation, or publication.
- Guard/build stages: web-boundary guard Pass; localization-boundary guard Pass; localization-literal audit Pass; integrated server build/bootstrap Pass; mobile and Electron Nuxt generation Pass; Electron main/preload compilation Pass; native dependency rebuild Pass; DMG and ZIP generation Pass.

## Candidate Artifacts

| Artifact | Bytes | SHA-256 |
| --- | ---: | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/offline-org-team-workspace/autobyteus-web/electron-dist/AutoByteus_enterprise_macos-arm64-1.4.74.dmg` | `468198198` | `0dde93847fd4a0c3736ecee54d96aa8dcc90ad82404986ef187e19f3009b0434` |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/offline-org-team-workspace/autobyteus-web/electron-dist/AutoByteus_enterprise_macos-arm64-1.4.74.zip` | `462775291` | `ddec0a6bb3df7cc5d2b6787a4230d34ce35a4b7b1dffb8c468cca53ba7e3970f` |

## Verification

- Packaged application executable: Mach-O 64-bit `arm64`.
- Staged terminal runtime: target and selected node-pty helpers present, executable, architecture-compatible; real spawn probe Pass.
- Final packaged terminal runtime: same checks and real spawn probe Pass.
- DMG: `hdiutil verify` reports valid checksum.
- ZIP: `unzip -t` reports no compressed-data errors.
- Exact logs: `delivery-dr002-electron-build.log`, `delivery-dr002-electron-verification.log`.

## Hygiene And Qualifications

- Build-generated untracked shared-SDK `dist` prerequisites were removed by exact path after packaging. Required ignored package outputs under `autobyteus-web/electron-dist` remain for user testing.
- Expected non-blocking build warnings included stale Browserslist data, large Nuxt chunks, pnpm peer/deprecation notices, and electron-builder dependency-resolution diagnostics. They did not fail the documented build.
- This local unsigned package is a user-verification candidate, not a released artifact. User behavior verification remains pending; repository finalization remains held.
