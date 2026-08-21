# Electron Test Build Report

## Request And Source State

- User request: read the repository instructions and build Electron for local
  hands-on verification.
- Build date: `2026-08-20`.
- Ticket branch: `codex/event-monitor-history-transparency`.
- Source head: `50a0f302313140947c2d12de7827b55428f8779a`.
- Checked tracked base: `origin/personal` at
  `fc5ce18bc202012280dcbf5b4bcd6c5c52948ad6`.
- Refresh result immediately before packaging: base unchanged, branch `2` ahead
  / `0` behind, and the checked base remains an ancestor of the ticket head.
- Instructions used: root `README.md`, `autobyteus-web/README.md`,
  `autobyteus-web/AGENTS.md`, and
  `autobyteus-web/docs/electron_packaging.md`.

## Build

- Target: local macOS ARM64 personal-flavor package.
- Version: `1.4.52`.
- Command:

  ```bash
  NO_TIMESTAMP=1 \
  APPLE_TEAM_ID= \
  AUTOBYTEUS_BUILD_FLAVOR=personal \
  DEBUG='electron-builder,electron-builder:*' \
  DEBUG='app-builder-lib*' \
  DEBUG='builder-util*' \
  pnpm build:electron:mac
  ```

- Result: `Pass` (`exit 0`). The documented guard, localization audit, embedded
  server preparation, Electron Nuxt generation, Electron transpilation, and
  macOS package build completed.
- Build evidence:
  `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-history-transparency/tickets/done/event-monitor-history-transparency/delivery-evidence/dr-002-electron-build-macos-arm64.log`.

## Test Artifacts

| Artifact | Size | SHA-256 |
| --- | ---: | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-history-transparency/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.4.52.dmg` | `463,937,334` bytes | `342f08bf66ab96c3d497b254dd00ab5c693e5621f9bc2443703a6d08cf84737d` |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-history-transparency/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.4.52.zip` | `457,766,877` bytes | `15d44e85713784def406079224e13e53e7cdb63532888bf9cd2d853ddabe6c1c` |

The unpacked bundle is at
`/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-history-transparency/autobyteus-web/electron-dist/mac-arm64/AutoByteus.app`.
Generated package outputs are intentionally ignored build artifacts, not
release assets or committed source.

## Package Verification

- Bundle metadata: `com.autobyteus.app`, version/build `1.4.52`.
- Main executable: Mach-O 64-bit `arm64`.
- Staged embedded-server terminal runtime: `Pass`; Darwin ARM64 `node-pty`
  helpers were executable and the real spawn probe passed.
- Final `.app` terminal runtime: `Pass` with the same architecture/helper/spawn
  checks.
- DMG: `hdiutil verify` Pass; checksum valid.
- ZIP: `unzip -tq` Pass; no compressed-data errors.
- Package integrity evidence:
  `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-history-transparency/tickets/done/event-monitor-history-transparency/delivery-evidence/dr-002-electron-package-integrity.log`.

## Isolated Launch Smoke

- Adapter: documented Playwright Electron process adapter with `--skip-build`.
- Executable: the exact current-worktree packaged ARM64 binary.
- Isolation: temporary application root and non-default port `57715`.
- Result: `Pass`; the packaged app opened a first window, reached
  `http://127.0.0.1:57715/rest/health`, and exited cleanly.
- Cleanup: the isolated listener cleared and the preparation-owned temporary
  root was removed.
- The unrelated pre-existing AutoByteus listener (PID `78020`) on production
  port `29695` was observed before and after only and was not touched.
- Evidence:
  `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-history-transparency/tickets/done/event-monitor-history-transparency/delivery-evidence/dr-002-isolated-electron-launch-smoke.log`.
- Final package/handoff audit: `Pass`; no tracked build mutation, generated
  packages remain ignored, required artifacts and cross-links exist, the branch
  still contains the checked base at 2 ahead / 0 behind, and finalization is
  still held. Evidence:
  `/Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-history-transparency/tickets/done/event-monitor-history-transparency/delivery-evidence/dr-002-final-package-handoff-audit.log`.

## Signing Boundary And Local Test Guidance

- This is a local test build using the README's no-notarization path.
- The bundle has only an ad-hoc/linker signature. It has no Apple Developer ID
  signature and was not notarized, published, or deployed.
- Prefer the DMG above for manual testing. Open it, drag **AutoByteus** to
  **Applications**, and launch it. If Gatekeeper blocks this local build,
  Control-click/right-click the app and choose **Open**, then confirm.
- At handoff time another AutoByteus instance (PID `78020`) is listening on the
  normal packaged port `29695`. Quit that existing app before a normal DMG
  launch so this candidate cannot collide with or appear to reuse the other
  instance's server.
- For a disposable isolated hands-on window instead, use the README launcher
  and choose a suitable hold duration:

  ```bash
  cd /Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-history-transparency/autobyteus-web
  env -u ELECTRON_RUN_AS_NODE pnpm test:e2e:electron \
    --skip-build \
    --adapter playwright \
    --executable electron-dist/mac-arm64/AutoByteus.app/Contents/MacOS/AutoByteus \
    --hold-ms 900000
  ```

  That mode chooses a free non-production port and temporary data root, then
  stops and removes only its own resources after 15 minutes.
- Do not treat this artifact as a distributable production release.

## Delivery State

- Delivery revision: `DR-003`.
- User verification: `Pass` — on 2026-08-21 the user reported the candidate was
  working and authorized finalization.
- The accepted artifact was built from the DR-002 handoff source. The later
  target refresh added unrelated accepted token-usage work; contract, server,
  and web coexistence checks passed with no material System instructions UI
  change. The user requested no new version/release, so no replacement package
  is produced.
- Repository finalization is authorized and in progress. Version bump, tag,
  release, publication, and deployment remain out of scope.
