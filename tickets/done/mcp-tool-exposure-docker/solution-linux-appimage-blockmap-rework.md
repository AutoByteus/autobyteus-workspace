# Solution Rework: Linux AppImage Embedded Blockmap Artifact Contract

## Trigger

Implementation rerouted API/E2E Round 3 `LF-002` on 2026-06-19 after a fresh `pnpm -C autobyteus-web build:electron:linux:arm64` produced the ARM64 AppImage, `latest-linux-arm64.yml`, and `linux-arm64-unpacked`, but no standalone `*.AppImage.blockmap` file while the requirements/design/docs/workflow still expected Linux AppImage blockmap artifacts.

## Classification

- Classification: `Requirement Gap` with `Design Impact`.
- Root cause area: the Linux release asset contract incorrectly copied macOS/ZIP-style standalone `.blockmap` expectations onto Linux AppImage outputs.
- Correct owner: release workflow + docs must align with the installed electron-builder/electron-updater AppImage contract.

## Evidence

- `app-builder-lib@25.1.8` AppImage target writes update info from AppImage creation and does not emit a separate `${AppImage}.blockmap` artifact.
- `electron-updater@6.8.3` `AppImageUpdater` uses `FileWithEmbeddedBlockMapDifferentialDownloader`, which reads blockmap data from the AppImage tail using `blockMapSize` from `latest-linux*.yml`.
- Local ARM64 metadata `autobyteus-web/electron-dist/latest-linux-arm64.yml` includes `blockMapSize: 335143` for `AutoByteus_enterprise_linux-arm64-1.3.60.AppImage`.
- The Round 3 evidence log confirms no `*.AppImage.blockmap` was produced and existing workflow upload globs would fail with `if-no-files-found: error`.

## Decision

Linux release artifacts are:

- x64: `*linux-x64*.AppImage` plus `latest-linux.yml`
- ARM64: `*linux-arm64*.AppImage` plus `latest-linux-arm64.yml`

The Linux metadata entries must include numeric `blockMapSize` to prove embedded blockmap information is present. Standalone Linux `*.AppImage.blockmap` files are not required and should not be uploaded, published, documented, or tested as release assets. macOS standalone `.dmg.blockmap` and `.zip.blockmap` assets remain valid and unaffected.

## Artifact Updates

Updated:

- `requirements.md`: corrected UC-011, REQ-023/025/026, AC-020/021/022/023, constraints, risks, and approval status to require Linux AppImage + metadata with embedded blockmaps instead of standalone `.AppImage.blockmap` assets.
- `investigation-notes.md`: added the `LF-002` reroute, installed package source inspection, metadata evidence, and current-state finding that Linux AppImage blockmaps are embedded.
- `design-spec.md`: corrected DS-007, release workflow file responsibilities, validation contract, pipeline shape, dependency rules, and updater metadata interface contract.

## Downstream Implementation Requirements

- Remove Linux `*.AppImage.blockmap` paths from `.github/workflows/release-desktop.yml` upload-artifact steps and release publish globs.
- Keep macOS `.dmg.blockmap` and `.zip.blockmap` paths.
- Add or update workflow/static validation so both `latest-linux.yml` and `latest-linux-arm64.yml` reference the matching architecture AppImage and include numeric `blockMapSize`.
- Update durable docs/README entries so Linux says AppImage + metadata with embedded blockmap, not AppImage + standalone blockmap.
- Re-run API/E2E release artifact validation after implementation rework.

## Superseded Text

Any earlier requirement, design, review note, docs paragraph, or workflow path that says Linux must upload/publish `*.AppImage.blockmap` is superseded by this rework.
