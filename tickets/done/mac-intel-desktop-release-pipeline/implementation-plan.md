# Implementation Plan

- Ticket: `mac-intel-desktop-release-pipeline`
- Scope: `Small`
- Plan Version: `v1`

## Solution Sketch (Design Basis)

- Add new workflow job `build-macos-x64` on `macos-13`.
- Reuse current mac build setup steps and run `pnpm build:electron:mac -- --x64`.
- Upload Intel artifacts as `macos-x64`.
- Add `build-macos-x64` to `publish-release.needs` so release waits for Intel artifact.

## Change Inventory

| Change ID | Type | File | Summary |
| --- | --- | --- | --- |
| C-001 | Modify | `.github/workflows/release-desktop.yml` | Add mac Intel build job + publish dependency. |

## Verification Strategy

- `SCN-001`: workflow_dispatch on branch; query artifacts for `macos-x64` + x64 dmg name.
- `SCN-002`: tag run query release assets includes `macos-x64` dmg.
