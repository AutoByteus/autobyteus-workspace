# API / E2E Testing

- Ticket: `desktop-auto-update-restart-errors`
- Last Updated: `2026-03-04`

## Scenario Catalog

| Scenario ID | Source Type | Acceptance Criteria ID(s) | Expected Outcome | Execution Command | Result |
| --- | --- | --- | --- | --- | --- |
| SCN-001 | Requirement | AC-001 | Workflow includes x64 metadata file upload as publish input. | `rg -n "latest-mac.yml|macos-x64" .github/workflows/release-desktop.yml` | Passed |
| SCN-002 | Requirement | AC-002 | Local merged `latest-mac.yml` contains both arm64+x64 zip entries. | `scripts/merge_latest_mac_metadata.py --arm64 /tmp/ab-release-audit/latest-mac.yml --x64 autobyteus-web/electron-dist/latest-mac.yml --output /tmp/ab-release-audit/latest-mac-merged.yml` + `rg -n "macos-arm64.*\.zip|macos-x64.*\.zip" /tmp/ab-release-audit/latest-mac-merged.yml` | Passed |
| SCN-003 | Requirement | AC-003 | Merge/validation path fails when one arch metadata input is missing. | `scripts/merge_latest_mac_metadata.py --arm64 /tmp/ab-release-audit/latest-mac.yml --x64 /tmp/ab-release-audit/does-not-exist.yml --output /tmp/ab-release-audit/should-not-exist.yml` | Passed (Failed as Expected, exit=1) |
| SCN-004 | Requirement | AC-004, AC-005 | Updater install callback exception maps to `status=error`. | `pnpm -C autobyteus-web test:electron --run electron/updater/__tests__/appUpdater.spec.ts` | Passed |
| SCN-005 | Requirement | AC-005, AC-006 | Merge utility behavior is covered by automated tests (positive + negative). | `python3 -m unittest scripts/tests/test_merge_latest_mac_metadata.py` | Passed |

## Acceptance Criteria Closure Matrix

| Acceptance Criteria ID | Execution Status (`Unmapped`/`Not Run`/`Passed`/`Failed`/`Blocked`) | Mapped Scenarios | Notes |
| --- | --- | --- | --- |
| AC-001 | Passed | SCN-001 | x64 metadata upload path exists in workflow. |
| AC-002 | Passed | SCN-002 | merged output contains both mac zip architectures. |
| AC-003 | Passed | SCN-003 | missing x64 input causes deterministic failure. |
| AC-004 | Passed | SCN-004 | updater test suite includes install-error mapping assertion. |
| AC-005 | Passed | SCN-004, SCN-005 | updater + merge utility tests pass. |
| AC-006 | Passed | SCN-002, SCN-005 | local non-release verification achieved. |

## Test Failures & Escalations

- None.
