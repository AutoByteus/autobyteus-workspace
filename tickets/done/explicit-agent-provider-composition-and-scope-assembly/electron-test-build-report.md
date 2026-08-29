# Electron Test Build Report

## Scope

- Ticket: `explicit-agent-provider-composition-and-scope-assembly`
- Delivery revision: `DR-002`
- Source: delivery checkpoint `4fe758a5819662a180efbd1d17f299316c890b73` plus delivery-owned long-lived documentation only; reviewed production/test source is `2625f2b7d053e1b8e8009d21f5583b32fc55ba34`.
- Tracked base: `origin/personal=b52fe5aebdb962ce361529f9e797affeb30d719a`, already an ancestor through semantic merge `f6d3e52d0`.
- Build flavor/platform: `personal`, macOS arm64.
- Application version: `1.4.58`.

## Build

- Command: `CI=true NO_TIMESTAMP=1 APPLE_TEAM_ID= APPLE_SIGNING_IDENTITY= APPLE_ID= APPLE_APP_SPECIFIC_PASSWORD= CSC_IDENTITY_AUTO_DISCOVERY=false AUTOBYTEUS_BUILD_FLAVOR=personal pnpm -C autobyteus-web build:electron:mac --arm64`
- Result: `Pass` (`exit 0`).
- Build evidence: `/Users/normy/autobyteus_org/autobyteus-worktrees/explicit-agent-provider-composition-and-scope-assembly/tickets/done/explicit-agent-provider-composition-and-scope-assembly/evidence/delivery/dr-002-electron-macos-arm64-build.log`
- Build gates included: web-boundary guard, localization-boundary guard, localization-literal audit, shared/server builds, sanitized server bootstrap smoke, mobile and Electron Nuxt generation, Electron transpilation, native-module rebuild, packaged terminal permission normalization, macOS app/DMG/ZIP creation.
- Non-blocking build diagnostics: current Browserslist age, existing dependency deprecations/peer warnings, and expected no-sign configuration. No build step failed.

## Artifacts

| Artifact | Size | SHA-256 | Result |
| --- | ---: | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/explicit-agent-provider-composition-and-scope-assembly/autobyteus-web/electron-dist/mac-arm64/AutoByteus.app` | unpacked app | executable fingerprint `c0bf182389ea930585e3b0bf5c4f16529461e02bf3be751cb364d0e25f2257e0` | `Pass` |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/explicit-agent-provider-composition-and-scope-assembly/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.4.58.dmg` | `467170600` bytes | `608461bd87a08285c2a616f782f1a88284609bce080f9a2e216dd53551e6d846` | `Pass` |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/explicit-agent-provider-composition-and-scope-assembly/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.4.58.zip` | `461787345` bytes | `85391a0720520ddd91f4d7005bb1da902e1210ac3d4f311b3eb918381965c2b5` | `Pass` |

## Static Package Verification

- `Info.plist`: bundle `com.autobyteus.app`; short/build version `1.4.58`; minimum macOS `12.0`.
- Root executable: Mach-O arm64 and executable.
- Packaged `node-pty` and Prisma native components: Mach-O arm64.
- Terminal runtime guard: target and selected spawn helpers present, arm64, and mode `755`.
- Packaged-Electron `node-pty` spawn probe: `Pass` using the packaged executable with `ELECTRON_RUN_AS_NODE=1`.
- ZIP integrity: `Pass` (`unzip -tq`).
- DMG integrity: `Pass` (`hdiutil verify`).
- Verification evidence: `/Users/normy/autobyteus_org/autobyteus-worktrees/explicit-agent-provider-composition-and-scope-assembly/tickets/done/explicit-agent-provider-composition-and-scope-assembly/evidence/delivery/dr-002-electron-macos-arm64-verification.log`
- Signing: intentionally unsigned local test artifact; strict `codesign` exits `1`. This is expected for the no-identity local build and is not a release/notarization claim.

## Packaged Electron Isolation And Shell Verification

- Command: `pnpm -C autobyteus-web test:e2e:electron:isolation --skip-build --executable <packaged AutoByteus executable> --output-dir <DR-002 evidence directory>`
- Result: `Pass`; `E2E-PKG-001` through `E2E-PKG-005` all passed.
- Existing ordinary AutoByteus: listener PID `53536` on `29695` was healthy before, during, and after; exact process identity was preserved.
- Direct and Playwright launches used non-production ports and isolated data/user/session/log/crash/download roots.
- Renderer GraphQL returned `200`; WebSocket opened; provider settings rendered; selected endpoint traffic was observed and production-endpoint traffic was absent.
- Two simultaneous instances retained distinct ports, roots, user-data paths, and renderer state.
- Invalid/partial/production-profile cases failed closed; allocation-race foreign ownership survived.
- All owned process trees, ports, and temporary owned roots were cleaned; the caller-owned root and ordinary app remained intact.
- Isolation log: `/Users/normy/autobyteus_org/autobyteus-worktrees/explicit-agent-provider-composition-and-scope-assembly/tickets/done/explicit-agent-provider-composition-and-scope-assembly/evidence/delivery/dr-002-electron-isolation.log`
- Canonical structured evidence: `/Users/normy/autobyteus_org/autobyteus-worktrees/explicit-agent-provider-composition-and-scope-assembly/tickets/done/explicit-agent-provider-composition-and-scope-assembly/evidence/delivery/dr-002-electron-isolation/electron-launch-profile-evidence.json`
- Screenshot: `/Users/normy/autobyteus_org/autobyteus-worktrees/explicit-agent-provider-composition-and-scope-assembly/tickets/done/explicit-agent-provider-composition-and-scope-assembly/evidence/delivery/dr-002-electron-isolation/provider-settings.png`

## Persisted Data And Test Guidance

- Approved transition result: `Not Affected`; no database migration, data rewrite, destructive reset, or package-format transition is required.
- The packaged isolation probe used temporary data roots and did not touch the ordinary app's persisted root.
- The normal DMG app may be used for user testing against the existing Personal data under the already-established application version/migrations. Ordinary backup practice still applies before broad manual testing.

## Result

`Pass — unsigned macOS arm64 Personal Electron artifact is ready for explicit user verification; no release, notarization, push, merge, archive, or cleanup is claimed.`
