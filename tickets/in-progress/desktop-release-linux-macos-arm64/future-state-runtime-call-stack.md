# Future-State Runtime Call Stack

- version: v1
- source-design: `implementation-plan.md` (Small scope solution sketch)

## Use Case Coverage
- `UC-REL-001` macOS ARM64 build
- `UC-REL-002` Linux x64 build
- `UC-REL-003` release asset publish
- `UC-REL-004` no-team-id non-notarized path

## UC-REL-001: Build macOS ARM64 Personal Artifact
1. GitHub tag push `v*` triggers `.github/workflows/release-desktop.yml`.
2. Job `build-macos-arm64` starts on `macos-14`.
3. Workflow sets build env:
- `NO_TIMESTAMP=1`
- `APPLE_TEAM_ID=""`
- `AUTOBYTEUS_BUILD_FLAVOR=personal`
4. Command `pnpm build:electron:mac -- --arm64` runs in `autobyteus-web`.
5. `package.json` script executes build pipeline and invokes `node build/dist/build.js --mac --arm64`.
6. `build.ts` resolves:
- platform = MAC
- arch preference = arm64
- flavor = personal (from explicit env)
7. electron-builder runs target map `Platform.MAC -> Arch.arm64 -> dmg`.
8. Output written under `autobyteus-web/electron-dist/` (DMG + metadata).
9. Upload-artifact step stores mac release files as artifact `macos-arm64`.

## UC-REL-002: Build Linux x64 Personal Artifact
1. Same workflow trigger starts job `build-linux` on `ubuntu-22.04`.
2. Workflow installs Linux dependencies and sets `AUTOBYTEUS_BUILD_FLAVOR=personal`.
3. Command `pnpm build:electron:linux` runs.
4. `build.ts` resolves platform LINUX and flavor personal.
5. electron-builder runs `Platform.LINUX -> Arch.x64 -> AppImage`.
6. Output written under `autobyteus-web/electron-dist/` (AppImage + metadata).
7. Upload-artifact step stores linux files as artifact `linux-x64`.

## UC-REL-003: Publish Release Assets
1. `publish-release` waits for both build jobs.
2. `actions/download-artifact` downloads artifacts into `release-artifacts/`.
3. `softprops/action-gh-release` uploads matched files:
- `release-artifacts/**/*.dmg`
- `release-artifacts/**/*.dmg.blockmap`
- `release-artifacts/**/*.AppImage`
- `release-artifacts/**/*.AppImage.blockmap`
- `release-artifacts/**/latest-*.yml`
4. Release assets become visible under the tag release page.

## UC-REL-004: Missing Team ID Path
1. mac build receives empty `APPLE_TEAM_ID`.
2. `build.ts` evaluates `notarize: !!process.env.APPLE_TEAM_ID` -> `false`.
3. Build proceeds without notarization requirement.
4. Release artifacts still produced and uploaded.

## Requirement Mapping
- `REQ-REL-001` -> UC-REL-001 + UC-REL-002 (explicit flavor path)
- `REQ-REL-002` -> UC-REL-001 (explicit arm64 target)
- `REQ-REL-003` -> UC-REL-002
- `REQ-REL-004` -> UC-REL-003
- `REQ-REL-005` -> UC-REL-004
