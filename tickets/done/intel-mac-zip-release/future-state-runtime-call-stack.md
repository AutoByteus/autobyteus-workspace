# Future-State Runtime Call Stack

## Version History

- **v1**: Initial version based on solution sketch.

## Use Case Coverage Status

| Use Case ID | Source Type | Primary Path Covered | Fallback Path Covered | Error Path Covered | Intentional N/A |
| --- | --- | --- | --- | --- | --- |
| UC-001 | Requirement | Yes | N/A | N/A | Fallback/Error |

## 1. [UC-001] Upload MacOS Intel Artifacts

- **Description:** GitHub actions generates the builds and uploads all produced artifacts.
- **Traceability:** Mapped to AC-001, AC-002
- **Preconditions:** Build step for MacOS Intel (`build-macos-x64`) has completed.

### 1.1 Primary Path: Upload `.dmg` and `.zip`

```text
.github/workflows/release-desktop.yml:build-macos-x64(...)
  ... previous steps ...
  -> name: Build Electron macOS Intel x64
     pnpm build:electron:mac -- --x64
     [electron-builder generates .dmg and .zip files for x64 architecture]
  -> name: Upload macOS Intel artifacts
     uses: actions/upload-artifact@v4
     with:
       name: macos-x64
       path: |
         autobyteus-web/electron-dist/*macos-x64*.dmg
         autobyteus-web/electron-dist/*macos-x64*.dmg.blockmap
         autobyteus-web/electron-dist/*macos-x64*.zip          <-- NEW ADDITION
         autobyteus-web/electron-dist/*macos-x64*.zip.blockmap <-- NEW ADDITION
     [GitHub Actions artifact backend receives the .dmg and .zip files]

.github/workflows/release-desktop.yml:publish-release(...)
  ...
  -> name: Publish release assets
     uses: softprops/action-gh-release@v2
     with:
       files: |
         release-artifacts/**/*.dmg
         release-artifacts/**/*.dmg.blockmap
         release-artifacts/**/*.zip
         release-artifacts/**/*.zip.blockmap
         ...
     [Both arm64 and x64 .dmg and .zip files are published to the release page]
```
