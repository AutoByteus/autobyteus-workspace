# macOS Electron Build Report

## Result

`Pass — local macOS ARM64 test package built and structurally verified.`

This is a local, unsigned, non-notarized verification build for hands-on user testing. It is not a published release artifact and does not satisfy the signed-release policy.

## Integrated Source State

- Ticket branch: `codex/api-key-management-panel-performance`
- Latest tracked base fetched before the build: `origin/personal@a00f0d07d00450785c424b6ab79d2ca8fe828869`
- Delivery checkpoint protecting the prior reviewed/docs-synchronized handoff: `aca022c465c3bd2e6b787fc64c4ad3debc76e2bc`
- Current integration merge: `80308fb50884f67cdc29b30eabad1213a9a15f2e`
- Base relationship after a second fetch: current branch is five commits ahead and zero behind `origin/personal`.
- Incoming base change: five finalized `nested-team-history-restart-hydration` commits were merged without conflict before building. No ticket-specific source or documentation edit was required to reconcile that unrelated feature.

## README-Guided Build

The following instructions were read before building:

- repository `README.md` setup, build examples, and packaged Electron guidance;
- `autobyteus-web/README.md` Desktop Application Build and macOS Build With Logs sections;
- `autobyteus-web/docs/electron_packaging.md` build, integrated-server, native-runtime, and macOS signing policy sections;
- `autobyteus-web/AGENTS.md` repository rules.

Executed from `autobyteus-web` on Darwin ARM64 with Node `v22.23.1` and pnpm `10.28.1`:

```bash
NO_TIMESTAMP=1 APPLE_TEAM_ID= DEBUG=electron-builder,electron-builder:* DEBUG=app-builder-lib* DEBUG=builder-util* pnpm build:electron:mac
```

Build result: exit `0`. The build passed the web/localization guards and audit, rebuilt the server and SDK dependencies, generated Prisma clients and mobile/desktop renderers, rebuilt `node-pty` for Electron `42.4.1`, bundled the integrated server, and emitted macOS ARM64 DMG/ZIP artifacts.

## Testable Artifacts

| Artifact | Size | SHA-256 |
| --- | ---: | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/api-key-management-panel-performance/autobyteus-web/electron-dist/AutoByteus_enterprise_macos-arm64-1.4.55.dmg` | 443 MB | `ff490658657b2198b1063d7bbe707b3765cac0ce8fce00b0fbe3c782e626cfeb` |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/api-key-management-panel-performance/autobyteus-web/electron-dist/AutoByteus_enterprise_macos-arm64-1.4.55.zip` | 437 MB | `90969f9e42d780efed0390c9699fb82ddc5e2394ec99f49448817dd60ea51843` |

Updater-side blockmaps and `latest-mac.yml` were also emitted locally. They are not published or deployed.

## Artifact Verification

- `hdiutil verify`: Pass; DMG checksum is valid.
- `unzip -tq`: Pass; no ZIP data errors.
- Bundle identity/version: `com.autobyteus.app`, `1.4.55`.
- Main executable: Mach-O 64-bit ARM64.
- Required resources: `app.asar`, bundled `server/dist/app.js`, Prisma schema/engines, and the pinned noVNC third-party notice are present.
- Packaged terminal runtime: Darwin ARM64 target and selected `node-pty` helpers are executable and architecture-compatible; the real spawn probe passed.
- Signing: electron-builder explicitly skipped macOS signing because this README-guided local build cleared `APPLE_TEAM_ID`; strict code-signature verification therefore does not pass. This is expected for the requested local no-notarization build and must not be represented as release signing proof.

## Focused Post-Integration Validation

The latest integrated state was also rechecked after the base advanced:

- SDK model/catalog: 3 files / 15 tests passed.
- Actual-schema provider-secret and Qwen lifecycle: 2 files / 7 tests passed.
- Frontend API Key surface: 5 files / 29 tests passed.

The frontend run retained previously recorded non-failing KaTeX and mocked-prop warnings; the same warnings were present in the earlier integrated evidence and did not change the result.

## User Test Guidance

1. Open the DMG and copy `AutoByteus.app` to Applications, or unpack the ZIP.
2. Because this is a local unsigned/non-notarized build, macOS may require **Control-click -> Open** on first launch.
3. In **Settings -> API Keys**, verify provider navigation and credentials render promptly, static providers have no Reload action, dynamic providers use provider-local Reload/Retry, endpoint changes do not retain old rows, and credential saves are not reversed by discovery failure.
4. Report acceptance or the exact observed failure before delivery performs repository finalization.

## Scope And Residual Signals

- Packaging and packaged terminal-native resources were verified; Electron GUI launch, IPC, window lifecycle, and updater behavior were not automation-run. They are part of the requested hands-on user test.
- `BASELINE-E2E-001` through `BASELINE-E2E-004` remain broader unchanged-file failures; the whole server E2E suite is not green.
- Optional real-provider success remains capability-dependent and was not run where credentials/capabilities were unavailable.
- No version, tag, release, publication, deployment, archive, push, target merge, or cleanup occurred.

## Evidence

- `validation-evidence/delivery-electron-build-dr003.log`
- `validation-evidence/delivery-electron-artifact-verification-dr003.log`
- `validation-evidence/delivery-focused-post-integration-dr003.log`
- `validation-evidence/delivery-handoff-readiness-dr003.log`
