# Implementation Plan

- Ticket: `desktop-auto-update-restart-errors`
- Scope Classification: `Small`
- Plan Version: `v2`
- Plan Status: `Finalized` (Stage 6 ready)

## Design Basis (Small-Scope Solution Sketch)

### Target Architecture Sketch

1. Release metadata assembly boundary (CI publish stage)
- Source inputs:
  - `release-artifacts/macos-arm64/latest-mac.yml`
  - `release-artifacts/macos-x64/latest-mac.yml`
- Orchestration step merges both `files` arrays into one canonical `release-artifacts/latest-mac.yml`.
- Validation step enforces presence of both mac zip architectures before publish.
- Publish step uploads only canonical merged `latest-mac.yml` (plus existing assets).

2. Updater install failure visibility boundary (Electron main process)
- `AppUpdater.installUpdateAndRestart()` keeps existing install trigger behavior.
- Install trigger callback adds synchronous error capture and transitions to updater `error` state with explicit message.
- Renderer already consumes error state via existing store/toast path; no new renderer layer required.

### Boundary/Layer Decisions

- Keep existing layers:
  - CI workflow remains orchestration boundary for release metadata.
  - Electron updater manager remains main-process boundary for updater state machine.
- Add one orchestration policy in CI:
  - explicit mac metadata merge + validation.
- Avoid adding compatibility wrappers or legacy feed paths.

## Change Inventory

| Change ID | Type | File | Summary |
| --- | --- | --- | --- |
| C-001 | Modify | `.github/workflows/release-desktop.yml` | Upload x64 mac metadata input, merge arm64+x64 metadata into canonical `latest-mac.yml`, validate dual-arch entries, publish canonical file. |
| C-002 | Modify | `autobyteus-web/electron/updater/appUpdater.ts` | Add install-callback error handling so synchronous `quitAndInstall` failure is mapped to updater error state. |
| C-003 | Add | `scripts/merge_latest_mac_metadata.py` | Implement deterministic mac metadata merge + validation utility used by publish workflow. |
| C-004 | Add | `scripts/tests/test_merge_latest_mac_metadata.py` | Unit-test merge utility for dual-arch closure and failure detection. |
| C-005 | Modify/Add | `autobyteus-web/electron/updater/__tests__/appUpdater.spec.ts` | Add regression test for install callback error mapping. |

## Requirement Traceability

- `R-001`, `R-002`, `R-003` -> `C-001`, `C-003`, `C-004`
- `R-004` -> `C-002`, `C-005`
- `R-005` -> `C-001`, `C-003`, `C-004`

## Execution Order

1. Implement merge utility and workflow integration (`C-001`, `C-003`).
2. Add merge utility tests (`C-004`).
3. Add/adjust updater install error handling (`C-002`) and updater regression test (`C-005`).
4. Run local verification commands for Stage 6/7 evidence.

## Verification Strategy (Planned)

- `SCN-001`: Static workflow check confirms x64 metadata input is available to publish stage.
- `SCN-002`: Local metadata merge check shows canonical `latest-mac.yml` contains both arm64/x64 zip entries.
- `SCN-003`: Negative test (missing arch input) fails validation.
- `SCN-004`: Updater install-callback throws -> state transitions to `error`.
- `SCN-005`: Local command set passes without creating/publishing a real release.

## Go / No-Go Decision

- Decision: `Go`
- Gate Basis: Stage 5 review reached `Go Confirmed` with two clean deep-review rounds and no blockers.

## Risks / Mitigations

- Risk: Duplicate `latest-mac.yml` upload conflict in release assets.
  - Mitigation: publish only canonical merged file and exclude duplicate per-arch metadata names from upload list.
- Risk: CI yaml merge logic becomes hard to maintain.
  - Mitigation: keep merge step short, deterministic, and testable.
