# Validation Gate

## Scope Note

- This ticket does not add or change a user-facing runtime API route.
- The executable acceptance gate is the release-preparation and release-validation command path that caused the shipped 404 regression.

## Executable Scenario Log

| Scenario ID | Acceptance Criteria | Command | Result | Notes |
| --- | --- | --- | --- | --- |
| `AV-001` | `AC-002`, `AC-005` | `node autobyteus-message-gateway/scripts/build-runtime-package.mjs --sync-manifest-only --release-tag v1.2.30` | Passed | Checked-in manifest now points to the current release tag instead of stale `v1.2.26`. |
| `AV-002` | `AC-003`, `AC-004` | `node autobyteus-message-gateway/scripts/build-runtime-package.mjs --check-release-manifest --release-tag v1.2.30` | Passed | Drift guard accepts the synced manifest. |
| `AV-003` | `AC-003`, `AC-004` | `node autobyteus-message-gateway/scripts/build-runtime-package.mjs --check-release-manifest --release-tag v1.2.31` | Passed | Command fails with the expected drift error when the manifest tag and release tag differ. |
| `AV-004` | `AC-004` | `bash -n scripts/desktop-release.sh` and `ruby -e "require 'yaml'; YAML.load_file('.github/workflows/release-desktop.yml')"` | Passed | Release script/workflow syntax stays valid after the fix. |

## Acceptance Criteria Closure

| Acceptance Criteria | Status | Evidence |
| --- | --- | --- |
| `AC-001` | Passed | `investigation-notes.md` root-cause section |
| `AC-002` | Passed | `AV-001` |
| `AC-003` | Passed | `AV-002`, `AV-003` |
| `AC-004` | Passed | `AV-002`, `AV-003`, `AV-004` |
| `AC-005` | Passed | `AV-001` |

## Gate Decision

- Validation gate status: `Pass`
- Re-entry required: `No`
