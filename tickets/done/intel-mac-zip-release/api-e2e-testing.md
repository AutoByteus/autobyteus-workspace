# API / E2E Testing

## Scenario Catalog

| Scenario ID | Source Type | Acceptance Criteria ID(s) | Expected Outcome | Execution Command | Result |
| --- | --- | --- | --- | --- | --- |
| AV-001 | Requirement | AC-001, AC-002 | The GitHub Action run creates a `.zip` artifact under `macos-x64` | `gh workflow run "Desktop Release" --ref codex/intel-mac-zip-release` | Passed |

## Acceptance Criteria Closure Matrix

| Acceptance Criteria ID | Execution Status (`Unmapped`/`Not Run`/`Passed`/`Failed`/`Blocked`) | Mapped Scenarios | Notes |
| --- | --- | --- | --- |
| AC-001 | Passed | AV-001 | |
| AC-002 | Passed | AV-001 | |

## Test Failures & Escalations

*None.*
