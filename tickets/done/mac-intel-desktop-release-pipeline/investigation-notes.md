# Investigation Notes

- Date: 2026-02-26
- Ticket: `mac-intel-desktop-release-pipeline`

## Sources Consulted

- `/.github/workflows/release-desktop.yml`
- GitHub release `v1.1.10` assets query via `gh release view`.

## Key Findings

- Current workflow defines only `build-macos-arm64` and `build-linux` jobs.
- No mac Intel (`x64`) build job exists.
- Current published release `v1.1.10` includes only mac ARM64 DMG and no mac x64 DMG.

## Open Unknowns

- Whether `macos-14` can reliably cross-build x64 for this project.

## Implications

- Need dedicated Intel build lane (`macos-13` x64 runner) with explicit x64 build flag.
- Publish stage must depend on and include Intel build outputs.
- Validation must query GitHub Actions artifacts/release assets for x64 file presence.
