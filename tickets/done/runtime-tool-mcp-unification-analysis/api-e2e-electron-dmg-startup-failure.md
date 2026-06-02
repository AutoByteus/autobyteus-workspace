# API/E2E Focused Electron DMG Startup Failure Triage

## Context

User reported that the delivery-built macOS DMG could not be started:

- DMG: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis/autobyteus-web/electron-dist/AutoByteus_enterprise_macos-arm64-1.3.39.dmg`

The user's currently running installed Electron app is healthy and already uses the embedded backend port `29695`, so concurrent second-instance launch is not a clean startup test. I therefore inspected the packaged app artifact and compared it with the currently installed `/Applications/AutoByteus.app`.

## Findings

The delivery-built DMG app is not a valid signed/notarized macOS application bundle.

### DMG / build output app

Paths checked:

- `/Volumes/AutoByteus 1.3.39-arm64/AutoByteus.app`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis/autobyteus-web/electron-dist/mac-arm64/AutoByteus.app`
- ditto copy from the mounted DMG to `/tmp/autobyteus-electron-artifact-compare-20260601-150557/AutoByteus.app`

All failed with:

```text
code has no resources but signature indicates they must be present
```

Detailed signing metadata for the DMG/build app:

```text
Identifier=Electron
Signature=adhoc
Info.plist=not bound
TeamIdentifier=not set
Sealed Resources=none
```

The bundle also lacks:

```text
Contents/_CodeSignature/CodeResources
```

`spctl --assess --type execute --verbose=4` fails with the same signing/resource error.

### Currently installed `/Applications/AutoByteus.app`

The currently running app is a different, valid signed/notarized app even though it has the same visible version `1.3.39`.

```text
/Applications/AutoByteus.app: valid on disk
/Applications/AutoByteus.app: satisfies its Designated Requirement
/Applications/AutoByteus.app: accepted
source=Notarized Developer ID
Identifier=com.autobyteus.app
Authority=Developer ID Application: YU ZHENG (7Y86YBQ7B4)
Notarization Ticket=stapled
Sealed Resources version=2 rules=13 files=31421
```

It contains:

```text
/Applications/AutoByteus.app/Contents/_CodeSignature/CodeResources
```

Hash comparison also shows the DMG app is not identical to the installed app:

```text
DMG/build app.asar:          6b58f256fb79a19f66ae2a4f2a877c40e8663bd8a7b08c66197572a6667016ec
/Applications app.asar:     b84297695d5a9d01655fb2b3b04d92b8be01aa3742dffff24c0596ccdd606cfc
server/dist/app.js both:    dbc56cb18343ae625ad7136a1b6d6dc4b9b9a23b6f2c8bd71cc41b2e5e13c1f4
```

## Port / second-instance note

The packaged Electron app currently hardcodes the embedded backend port in:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis/autobyteus-web/shared/embeddedServerConfig.ts`

```ts
export const INTERNAL_SERVER_PORT = 29695;
```

I did not find a supported runtime CLI/env override for the packaged app to start a clean second Electron instance with a different embedded backend port and isolated user data. Therefore, testing a second copy while the user's current app is running is not reliable. However, the signing/notarization failure above is independent and sufficient to explain why the delivery DMG app cannot be started by macOS Gatekeeper.

## Classification

`Fail / Delivery Local Fix`

This is a packaging/signing/notarization artifact failure in the delivery-built DMG, not a task-delegation implementation or browser/API behavior failure.

## Required Fix

Rebuild/sign/notarize/staple the macOS arm64 DMG so the app inside the DMG satisfies:

```bash
codesign --verify --deep --strict --verbose=2 /path/to/AutoByteus.app
spctl --assess --type execute --verbose=4 /path/to/AutoByteus.app
```

Expected app metadata should resemble the currently valid installed app:

```text
Identifier=com.autobyteus.app
TeamIdentifier=7Y86YBQ7B4
Authority=Developer ID Application: YU ZHENG (7Y86YBQ7B4)
Notarization Ticket=stapled
Sealed Resources version=2
```

Do not ship or ask the user to install the current DMG artifact until the app inside it is signed/notarized correctly.

## Evidence Artifact Directory

- `/tmp/autobyteus-electron-artifact-compare-20260601-150557`

## Delivery Resolution

Resolved by delivery on 2026-06-01.

Delivery rebuilt from the README macOS Electron command with Developer ID signing and Apple notarization credentials, then notarized/stapled the DMG itself and verified both the app bundle and the app inside the mounted DMG.

Final artifact:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis/autobyteus-web/electron-dist/AutoByteus_enterprise_macos-arm64-1.3.39.dmg`

Verification evidence:

- Final summary: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis/tickets/done/runtime-tool-mcp-unification-analysis/delivery-evidence/round-26/electron-build-final-summary.md`
- Build log: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis/tickets/done/runtime-tool-mcp-unification-analysis/delivery-evidence/round-26/electron-rebuild-signed-notarized-from-readme.log`
- App verification: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis/tickets/done/runtime-tool-mcp-unification-analysis/delivery-evidence/round-26/electron-signing-notarization-verification.log`
- DMG notarize/staple: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis/tickets/done/runtime-tool-mcp-unification-analysis/delivery-evidence/round-26/electron-dmg-notarize-staple-python-env.log`
- Mounted DMG verification: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis/tickets/done/runtime-tool-mcp-unification-analysis/delivery-evidence/round-26/electron-dmg-mounted-final-verification.log`

Pass conditions now met:

- `codesign --verify --deep --strict --verbose=2` passed for the built app and the app inside the mounted DMG.
- `spctl --assess --type execute --verbose=4` accepted the built app and the app inside the mounted DMG as `Notarized Developer ID`.
- `xcrun stapler validate` passed for the app and DMG.
- `spctl --assess --type open --context context:primary-signature --verbose=4` accepted the DMG as `Notarized Developer ID`.

## Post-Latest-Base Delivery Rebuild (1.3.40)

After delivery refreshed the ticket branch to latest `origin/personal` on 2026-06-02, the package version moved to `1.3.40`. Delivery reran the README macOS Electron build and repeated the signing/notarization/stapling verification for the new artifact.

Final current artifact:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis/autobyteus-web/electron-dist/AutoByteus_enterprise_macos-arm64-1.3.40.dmg`

Verification evidence:

- Final summary: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis/tickets/done/runtime-tool-mcp-unification-analysis/delivery-evidence/round-28/electron-build-final-summary-1.3.40.md`
- Build log: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis/tickets/done/runtime-tool-mcp-unification-analysis/delivery-evidence/round-28/electron-rebuild-signed-notarized-after-origin-personal-1678dc82.log`
- App verification: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis/tickets/done/runtime-tool-mcp-unification-analysis/delivery-evidence/round-28/electron-signing-notarization-verification-1.3.40.log`
- DMG notarize/staple: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis/tickets/done/runtime-tool-mcp-unification-analysis/delivery-evidence/round-28/electron-dmg-notarize-staple-1.3.40.log`
- Mounted DMG verification: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis/tickets/done/runtime-tool-mcp-unification-analysis/delivery-evidence/round-28/electron-dmg-mounted-final-verification-1.3.40.log`
- SHA-256 manifest: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis/tickets/done/runtime-tool-mcp-unification-analysis/delivery-evidence/round-28/electron-build-artifacts-1.3.40.sha256`

Pass conditions met for the current 1.3.40 artifact:

- `codesign --verify --deep --strict --verbose=2` passed for the built app and the app inside the mounted DMG.
- `spctl --assess --type execute --verbose=4` accepted the built app and the app inside the mounted DMG as `Notarized Developer ID`.
- `xcrun stapler validate` passed for the app and DMG.
- `spctl --assess --type open --context context:primary-signature --verbose=4` accepted the DMG as `Notarized Developer ID`.

## Post-Latest-Base Delivery Rebuild (1.3.41)

After the user requested another remote-base check and Electron rebuild on 2026-06-02, delivery found `origin/personal` had advanced to release version `1.3.41`, merged the latest base into the ticket branch, reran the README macOS Electron build, notarized/stapled the DMG, and verified the built app and app inside the mounted DMG.

Final current artifact:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis/autobyteus-web/electron-dist/AutoByteus_enterprise_macos-arm64-1.3.41.dmg`

Pass conditions met for the current 1.3.41 artifact:

- `codesign --verify --deep --strict --verbose=2` passed for the built app and the app inside the mounted DMG.
- `spctl --assess --type execute --verbose=4` accepted the built app and the app inside the mounted DMG as `Notarized Developer ID`.
- `xcrun stapler validate` passed for the app and DMG.
- `spctl --assess --type open --context context:primary-signature --verbose=4` accepted the DMG as `Notarized Developer ID`.

Evidence:

- Final summary: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis/tickets/done/runtime-tool-mcp-unification-analysis/delivery-evidence/round-29/electron-build-final-summary-1.3.41.md`
- Successful build retry: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis/tickets/done/runtime-tool-mcp-unification-analysis/delivery-evidence/round-29/electron-rebuild-retry-after-hdiutil-cleanup-1.3.41.log`
- DMG notarize/staple: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis/tickets/done/runtime-tool-mcp-unification-analysis/delivery-evidence/round-29/electron-dmg-notarize-staple-1.3.41.log`
- Built app verification: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis/tickets/done/runtime-tool-mcp-unification-analysis/delivery-evidence/round-29/electron-signing-notarization-verification-final-1.3.41.log`
- Mounted DMG verification: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis/tickets/done/runtime-tool-mcp-unification-analysis/delivery-evidence/round-29/electron-dmg-mounted-final-verification-1.3.41.log`

## Post-Latest-Base Delivery Rebuild (Round 30 / 1.3.41)

After the user requested another remote-base check and Electron rebuild, delivery found `origin/personal` had advanced to `ade1afdec18fd8c0ae322517439b51c9769c2d80`, merged latest base into the ticket branch, reran the README macOS Electron build, notarized/stapled the DMG, and verified the built app and app inside the mounted DMG.

Final current artifact:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis/autobyteus-web/electron-dist/AutoByteus_enterprise_macos-arm64-1.3.41.dmg`

Pass conditions met for the current Round 30 1.3.41 artifact:

- `codesign --verify --deep --strict --verbose=2` passed for the built app and the app inside the mounted DMG.
- `spctl --assess --type execute --verbose=4` accepted the built app and the app inside the mounted DMG as `Notarized Developer ID`.
- `xcrun stapler validate` passed for the app and DMG.
- `spctl --assess --type open --context context:primary-signature --verbose=4` accepted the DMG as `Notarized Developer ID`.

Evidence:

- Final summary: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis/tickets/done/runtime-tool-mcp-unification-analysis/delivery-evidence/round-30/electron-build-final-summary-1.3.41-after-origin-personal-ade1afde.md`
- Build log: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis/tickets/done/runtime-tool-mcp-unification-analysis/delivery-evidence/round-30/electron-rebuild-after-origin-personal-ade1afde.log`
- DMG notarize/staple: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis/tickets/done/runtime-tool-mcp-unification-analysis/delivery-evidence/round-30/electron-dmg-notarize-staple-1.3.41-after-origin-personal-ade1afde.log`
- Built app verification: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis/tickets/done/runtime-tool-mcp-unification-analysis/delivery-evidence/round-30/electron-signing-notarization-verification-1.3.41-after-origin-personal-ade1afde.log`
- Mounted DMG verification: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-tool-mcp-unification-analysis/tickets/done/runtime-tool-mcp-unification-analysis/delivery-evidence/round-30/electron-dmg-mounted-final-verification-1.3.41-after-origin-personal-ade1afde.log`
