# Electron Test Build Report

## Scope

- Ticket: `logical-application-agent-addressing-and-role-simplification`.
- Delivery revision: `DR-002`.
- Reviewed production/test source: `31c674d0c31181c96d2198ed2b2f7a9996f2f4cb`.
- Delivery handoff checkpoint before rebuild: `4bd09395d792db17531a7f6c288f74d17132e60b`; it adds delivery docs/evidence only and no production/test source.
- Tracked base: `origin/personal=4108786f4058ca83fd036df84666a2c846fd6401`, already the branch merge base/ancestor.
- Build flavor/platform/version: `personal`, macOS arm64, `1.4.58`.

## Build

- Command: `CI=true NO_TIMESTAMP=1 APPLE_TEAM_ID= APPLE_SIGNING_IDENTITY= APPLE_ID= APPLE_APP_SPECIFIC_PASSWORD= CSC_IDENTITY_AUTO_DISCOVERY=false AUTOBYTEUS_BUILD_FLAVOR=personal pnpm -C autobyteus-web build:electron:mac --arm64`.
- Result: `Pass` (`exit 0`).
- Evidence: `/Users/normy/autobyteus_org/autobyteus-worktrees/logical-application-agent-addressing-and-role-simplification/tickets/in-progress/logical-application-agent-addressing-and-role-simplification/evidence/delivery/dr-002-electron-macos-arm64-build.log`.
- Included gates: web/localization guards, localization-literal audit, shared/server builds, sanitized server bootstrap smoke, mobile and Electron generation, Electron transpilation, native-module rebuild, terminal permission normalization, and app/DMG/ZIP packaging.
- Non-blocking diagnostics: current Browserslist-age, dependency deprecation/peer warnings, and the expected explicitly disabled signing identity. No build step failed.

## Artifacts

| Artifact | Size | SHA-256 | Result |
| --- | ---: | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/logical-application-agent-addressing-and-role-simplification/autobyteus-web/electron-dist/mac-arm64/AutoByteus.app` | unpacked app | executable fingerprint `c0bf182389ea930585e3b0bf5c4f16529461e02bf3be751cb364d0e25f2257e0` | `Pass` |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/logical-application-agent-addressing-and-role-simplification/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.4.58.dmg` | `467155008` bytes | `2f96dde1b75d62afca9466bda6634f2902decfc19f1821ce730198807d337587` | `Pass` |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/logical-application-agent-addressing-and-role-simplification/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.4.58.zip` | `461817657` bytes | `d4bea21d8206143111f572d0a42b8aa7ea10b31f7c32ad927c27c379a3fa167d` | `Pass` |

## Package Verification

- `Info.plist`: bundle `com.autobyteus.app`; short/build version `1.4.58`; minimum macOS `12.0`.
- Root executable: Mach-O arm64 and executable.
- Packaged terminal helpers: target/selected helpers present, arm64 where selected, and mode `755`.
- Actual packaged-Electron `node-pty` spawn probe: `Pass` using `ELECTRON_RUN_AS_NODE=1`.
- ZIP integrity: `Pass` (`unzip -tq`).
- DMG integrity: `Pass` (`hdiutil verify`).
- Signing: strict `codesign --verify` exited `1`, as expected for this intentionally unsigned local test build; no release-signing or notarization claim is made.
- Evidence: `/Users/normy/autobyteus_org/autobyteus-worktrees/logical-application-agent-addressing-and-role-simplification/tickets/in-progress/logical-application-agent-addressing-and-role-simplification/evidence/delivery/dr-002-electron-macos-arm64-verification.log`.

## Packaged Electron Isolation

- Command: `env -u ELECTRON_RUN_AS_NODE pnpm -C autobyteus-web test:e2e:electron:isolation --skip-build --executable <packaged executable> --output-dir <DR-002 evidence directory>`.
- Result: `Pass`; `E2E-PKG-001` through `E2E-PKG-005` all passed with no recorded failure.
- Existing ordinary AutoByteus PID `94487` on port `29695` retained the same listener before and after the probe.
- Direct/Playwright and parallel sessions used isolated endpoints, ports, data roots, Electron state paths, and owned process trees.
- Renderer GraphQL/WebSocket/provider-settings checks passed; selected-endpoint traffic did not fall back to production and updater activity remained suppressed.
- Invalid/partial/production-profile cases failed closed; allocation-race foreign ownership survived; all owned processes/listeners/temporary roots were cleaned.
- Evidence log: `/Users/normy/autobyteus_org/autobyteus-worktrees/logical-application-agent-addressing-and-role-simplification/tickets/in-progress/logical-application-agent-addressing-and-role-simplification/evidence/delivery/dr-002-electron-isolation.log`.
- Structured evidence: `/Users/normy/autobyteus_org/autobyteus-worktrees/logical-application-agent-addressing-and-role-simplification/tickets/in-progress/logical-application-agent-addressing-and-role-simplification/evidence/delivery/dr-002-electron-isolation/electron-launch-profile-evidence.json`.

## Persisted Data And Test Guidance

- Approved outcome: `Directly Usable — No Migration`.
- The public target/producer JSON contraction uses current-schema projection; SQLite schema and physical member storage remain unchanged.
- API-REV-002 passed same-data standalone and Studio recovery. The packaged isolation probe used temporary roots and did not touch the ordinary app's persisted root.

## Result

`Pass — the integrated unsigned macOS arm64 Personal Electron package is ready for explicit user verification; no push, target merge, archive, release, deployment, or cleanup is claimed.`
