# Electron Test Build Report

> **Superseded for current verification by DR-009.** This report preserves the
> validated pre-refresh v1.4.35 package. `origin/personal` has advanced to
> `54890a07f74e941a7a12b6daaa26364f4c927b72` (v1.4.50), and its merge is
> unresolved. Do not treat the package below as the current integrated build.
> No replacement Electron build will run until solution analysis and integration
> complete.

## Purpose

Produce a fresh local macOS ARM64 Electron package from the current integrated, reviewed Universal Application Dual-Host Foundation candidate so the user can manually verify it before ticket archival and repository finalization.

DR-008 was triggered by the user reporting that `origin/personal` advanced. Delivery protected DR-007, merged the new v1.4.35 tracked base, passed the integrated server/application checks, and reran the complete documented Electron pipeline. This v1.4.35 package supersedes every prior v1.4.31–v1.4.33 verification artifact.

## Documentation Followed

- Repository root `README.md`: pinned Electron baseline, native-module/package smoke expectations, artifact hygiene, terminal-runtime validation, and local-versus-release boundary.
- `autobyteus-web/README.md`: **Desktop Application Build**, macOS `pnpm build:electron:mac`, local no-notarization settings, output location, and integrated-backend packaging.
- `autobyteus-web/docs/electron_packaging.md`: bundled server architecture, personal build flavor, ARM64 packaging, native `node-pty` preparation, and packaged runtime validation.

## Build Context

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis`
- Branch: `codex/universal-application-framework-proposal-analysis`
- Integrated candidate: `9987c2c10fdc74416b55baa8bd123ab31afe3285`
- Reviewed handoff anchor: `5071b429672e0bf3108f45c30d6747a2ae6331b6` (`CRR-038`)
- Reviewed implementation: `IR-019`–`IR-021` on `SR-016` / `ARCH-REV-014`; production runtime retained from `IR-017` / `IR-018`
- Latest tracked base included: `origin/personal@8b8ae4c304928b391bdd5466b2262f87d43cf272`
- Host: macOS Darwin ARM64
- Node.js: `v22.23.1`
- pnpm: `10.28.2`
- Electron: `42.4.1`
- Desktop package version: `1.4.35`
- Build flavor: `personal`
- Signing/notarization: disabled for this local test package. The app bundle has no complete verifiable application signature or Team ID; the inherited Electron main executable remains linker-signed/ad hoc.

## Build Command

Run from the worktree root:

```bash
CI=true \
NO_TIMESTAMP=1 \
APPLE_TEAM_ID= \
APPLE_SIGNING_IDENTITY= \
APPLE_ID= \
APPLE_APP_SPECIFIC_PASSWORD= \
CSC_IDENTITY_AUTO_DISCOVERY=false \
AUTOBYTEUS_BUILD_FLAVOR=personal \
pnpm -C autobyteus-web build:electron:mac -- --arm64
```

## Build Result

**Pass.**

The integrated documented pipeline completed the web/localization guards, shared/server builds, Prisma generation, bootstrap smoke, mobile-web generation, Electron resource deployment, Electron-ABI `node-pty` rebuild, helper permission normalization, Nuxt/Electron builds, and ARM64 app/DMG/ZIP packaging.

Non-blocking output included existing large Nuxt chunk, deprecated dependency, peer dependency, module-type, electron-builder dependency, and pnpm legacy-deploy warnings. No warning failed the package build.

Build evidence:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/evidence/delivery/dr-008-electron-macos-arm64-build.log`

## Current Test Artifacts

| Artifact | Exact Size | SHA-256 |
| --- | ---: | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.4.35.dmg` | `405388039` bytes | `9bf086cf85f2c5a4b2c6887d6d4378a9a1b1d0a3020cbbaaafa25ea4384031ce` |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/autobyteus-web/electron-dist/AutoByteus_personal_macos-arm64-1.4.35.zip` | `401509654` bytes | `cfd14eb5287290a5ed2349bcd0eff520ceeb2089e07f8781e838a099f897e1c7` |

Unpacked current application:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/autobyteus-web/electron-dist/mac-arm64/AutoByteus.app`

The output directory also contains current DMG/ZIP blockmaps and `latest-mac.yml`. Earlier v1.4.31–v1.4.33 archives must not be used to verify the current package.

## Package Validation

- App metadata: **Pass** — executable `AutoByteus`, identifier `com.autobyteus.app`, version/build `1.4.35`, minimum macOS `12.0`.
- App executable: **Pass** — Mach-O 64-bit ARM64.
- Embedded current framework: **Pass** — Studio and standalone builders, four-projection application runtime contract, engine controller, and engine launcher are present; retired broad engine host and bind-once implementations are absent.
- Packaged latest-base runtime: **Pass** — current memory location classification and both native-v5/external-runtime snapshot migration owners are present.
- Packaged terminal runtime: **Pass** — ARM64 `pty.node` and spawn helpers verified; the real packaged `node-pty` spawn probe passed.
- DMG integrity: **Pass** — `hdiutil verify` reports a valid checksum.
- ZIP integrity: **Pass** — `unzip -tq` reports no compressed-data errors.
- Repository hygiene: **Pass** — Electron output and staged server resources are ignored; packaging introduced no tracked source change.
- Process/mount hygiene: **Pass** — the build did not launch AutoByteus and left no test DMG mounted.
- Signing posture: **Informational** — signing/notarization was intentionally disabled; strict deep verification fails as expected and is not release-signing evidence.

Validation evidence:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/universal-application-framework-proposal-analysis/tickets/in-progress/universal-application-framework-proposal-analysis/evidence/delivery/dr-008-electron-macos-arm64-verification.log`
- Initial verifier-path attempt retained at `evidence/delivery/dr-008-electron-macos-arm64-verification-attempt-1.log`; it referenced a nonexistent expected migration path. The corrected check used the packaged `app-data-migrations/migrations/*` paths and passed, so this was a local validation-script error, not a package failure.

## Manual Verification Guidance

1. Quit any existing AutoByteus desktop instance so the embedded server port and local data directory are not contested.
2. Open the **v1.4.35 DMG** above, then open `AutoByteus`. For this unsigned local package, macOS may require **Control-click → Open** on first launch.
3. The app uses the normal `~/.autobyteus/server-data` location. Back it up first if testing must not modify current local state.
4. In Studio, load a maintained package and confirm package defaults, selection preview/save/reset, application launch, real artifact publication, recipient-name writer handoff, and explicit **Reload application** after a rebuild.
5. Exercise worker recovery if practical: run an application, stop/reload its worker or application, then confirm subsequent publication and projection continue.
6. Quit while more than one application-owned run is active, reopen with the same data, and confirm clean shutdown plus expected recovery.
7. Reply with explicit approval/completion or a concrete issue so delivery can either finalize or route rework.

## Release Boundary

This package is for local user verification only. It is unsigned, not notarized, not published, not tagged, and not release-policy evidence. The v1.4.35 release in the integrated base is independently completed history; this ticket did not create or deploy that release. The ticket remains in progress, and no final repository, release, deployment, archival, or cleanup action was performed.
