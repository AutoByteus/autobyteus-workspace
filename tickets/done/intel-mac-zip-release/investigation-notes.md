# Investigation Notes

- **Sources Consulted:**
  - `.github/workflows/release-desktop.yml`
  - `autobyteus-web/build/scripts/build.ts`
  - `autobyteus-web/package.json`
- **Key Findings:**
  - `autobyteus-web/build/scripts/build.ts` configures electron-builder. The `mac` target is universally configured as `target: ['dmg', 'zip']`. This implies `electron-builder` is already generating a `.zip` artifact for the `macos-x64` build.
  - The GitHub Actions workflow `.github/workflows/release-desktop.yml` has a `build-macos-x64` job. Its "Upload macOS Intel artifacts" step only lists `.dmg` and `.dmg.blockmap` files in its `path` parameter.
  - It completely misses `.zip` and `.zip.blockmap` files for the Intel mac build upload.
- **Constraints:**
  - None. It's a simple workflow update.
- **Implications:**
  - Scope is `Small`.
  - Fix involves modifying `.github/workflows/release-desktop.yml` to upload the missing `.zip` and `.zip.blockmap` files for `macos-x64`.
