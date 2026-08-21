# Electron Test Build Report

## Scope

This report distinguishes two local, non-release macOS ARM64 packages:

1. `DR-002`: the ticket-worktree package the user manually verified; and
2. `DR-005`: the fresh package the user requested from the latest main
   repository `personal` branch after finalization.

Both use version `1.4.52`. Neither is a signed/notarized production release.

## Repository Instructions Followed

Delivery used:

- `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/README.md`;
- `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-web/README.md`;
- `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-web/AGENTS.md`;
- `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-web/docs/electron_packaging.md`.

The documented local macOS ARM64 personal-flavor/no-notarization path was used.

## DR-002 Historical User-Verified Package

- Source:
  `50a0f302313140947c2d12de7827b55428f8779a`.
- Checked base:
  `fc5ce18bc202012280dcbf5b4bcd6c5c52948ad6`.
- Build result: Pass.
- Historical DMG SHA-256:
  `342f08bf66ab96c3d497b254dd00ab5c693e5621f9bc2443703a6d08cf84737d`.
- Historical ZIP SHA-256:
  `15d44e85713784def406079224e13e53e7cdb63532888bf9cd2d853ddabe6c1c`.
- Verification: DMG/ZIP integrity, staged/final terminal spawn probes, and
  isolated Playwright health/first-window readiness passed.
- User result: `Working / accepted`.
- Lifecycle: these ignored outputs were retired with the dedicated ticket
  worktree during DR-004. They are retained here only as historical evidence.

Evidence:

- `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/event-monitor-history-transparency/delivery-evidence/dr-002-electron-build-macos-arm64.log`
- `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/event-monitor-history-transparency/delivery-evidence/dr-002-electron-package-integrity.log`
- `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/event-monitor-history-transparency/delivery-evidence/dr-002-isolated-electron-launch-smoke.log`

## DR-005 Latest Main-Personal Source

- Build date: `2026-08-21`.
- Main repository:
  `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo`.
- Branch: `personal`.
- Initial completed build source:
  `6c5e0777f60ade0583b3111ff61420bd9ee5850d`; superseded when `personal`
  advanced with product changes.
- Authoritative pre-build refresh:
  `HEAD = personal = origin/personal =
  3e946ba3fe61eac2af98fce2a27cfff84ea80328`.
- Authoritative post-build fetch:
  `HEAD = origin/personal =
  3e946ba3fe61eac2af98fce2a27cfff84ea80328`, divergence `0/0`.
- Product source freshness: `Pass`.
- The later archived-record commit is documentation/evidence only and does not
  change the product source used by this package.

Pre-build evidence:

`/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/event-monitor-history-transparency/delivery-evidence/dr-005-main-personal-prebuild-refresh.log`

## DR-005 Build

- Target: macOS ARM64, personal flavor.
- Version: `1.4.52`.
- Command:

  ```bash
  cd /Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-web
  NO_TIMESTAMP=1 \
  APPLE_TEAM_ID= \
  DEBUG='electron-builder,electron-builder:*' \
  pnpm build:electron:mac
  ```

- Result: `Pass / exit 0`.
- The guard, localization audit, embedded server preparation, Nuxt generation,
  Electron transpilation, packaging, terminal-native normalization, DMG, and ZIP
  steps completed.
- Build evidence:
  `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/event-monitor-history-transparency/delivery-evidence/dr-005-main-personal-electron-build.log`.

## DR-005 Artifacts

| Artifact | Size | SHA-256 |
| --- | ---: | --- |
| `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.4.52.dmg` | `463,806,443` bytes | `a829f505395c18ecde19af7337bc578b1e92314cda2c1a17a221636782e3647f` |
| `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.4.52.zip` | `457,792,151` bytes | `a7aaaeb8eb36881db9b145165127a6df7d67a90109d0634649ce628cbdb689f3` |

Unpacked bundle:

`/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-web/electron-dist/mac-arm64/AutoByteus.app`

The outputs are ignored build artifacts and are intentionally not committed.

## DR-005 Package Verification

- Bundle ID: `com.autobyteus.app`.
- Version/build: `1.4.52`.
- Main executable: Mach-O 64-bit ARM64.
- Signing state: ad-hoc/linker signature only; no team identifier, Developer ID
  signature, or notarization.
- Staged embedded-server terminal runtime:
  Darwin ARM64 helper checks and real `node-pty` spawn probe passed.
- Final app terminal runtime:
  Darwin ARM64 helper checks and real `node-pty` spawn probe passed.
- DMG: `hdiutil verify` passed with a valid checksum.
- ZIP: `unzip -tq` passed with no compressed-data errors.
- Evidence:
  `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/event-monitor-history-transparency/delivery-evidence/dr-005-main-personal-package-integrity.log`.

## DR-005 Isolated Launch Smoke

- Adapter: Playwright Electron adapter using the exact unpacked app executable.
- Isolation: temporary owned data root and non-production port `50960`.
- Final result: `Pass`.
- Readiness: REST health reached and Playwright obtained the first Electron
  window.
- Cleanup:
  - app process tree absent: Pass;
  - listener clear: Pass;
  - preparation-owned temporary root removed: Pass.

### Host-environment diagnostic

A scripted diagnostic on the earlier superseded build removed
`ELECTRON_RUN_AS_NODE` but still inherited the Codex host's
`RUST_LOG=warn`. That suppressed the informational readiness
output used by Prisma 5.22's schema-engine startup and yielded a
`DATABASE_MIGRATION_FAILED` diagnostic on an empty isolated database. Direct
diagnostics confirmed the package's schema engine and migrations succeed once
that host-only override is absent. No product or package change was made.

The final command therefore used a clean packaged-launch environment:

```bash
cd /Users/normy/autobyteus_org/autobyteus-workspace-superrepo/autobyteus-web
env -u ELECTRON_RUN_AS_NODE -u RUST_LOG pnpm test:e2e:electron \
  --skip-build \
  --adapter playwright \
  --executable electron-dist/mac-arm64/AutoByteus.app/Contents/MacOS/AutoByteus \
  --port 50960 \
  --hold-ms 3000
```

Evidence:

- `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/event-monitor-history-transparency/delivery-evidence/dr-005-main-personal-isolated-launch-smoke.log`
- `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/tickets/done/event-monitor-history-transparency/delivery-evidence/dr-005-main-personal-launch-diagnostic.log`

## Signing And Release Boundary

- Local ad-hoc/linker signature only.
- No Developer ID signature.
- No notarization.
- No version bump.
- No tag.
- No release, upload, publication, or deployment.
- Prefer the DMG for local inspection. Gatekeeper may require Control-click /
  right-click **Open** because this is intentionally not a notarized release.

## Current Result

`DR-005 Pass — latest main personal product source built and verified; local
artifact ready; repository release state unchanged.`
