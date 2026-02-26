# Aggregated Validation

- stage: 6
- overall-status: Passed (after Local Fix re-entry cycles)

## Scenario Results (Run 1: tag `v2026.02.26-personal-desktop-e2e.1`)
- run: `https://github.com/AutoByteus/autobyteus-workspace-superrepo/actions/runs/22432049600`
- `SCN-REL-005` result: Failed
- failure classification: Local Fix
- root error: `ModuleNotFoundError: No module named 'distutils'` in macOS node-gyp/electron-rebuild path.

## Scenario Results (Run 2: tag `v2026.02.26-personal-desktop-e2e.2`)
- run: `https://github.com/AutoByteus/autobyteus-workspace-superrepo/actions/runs/22432163196`
- `SCN-REL-005` result: Failed
- failure classification: Local Fix
- root error: `error: externally-managed-environment` (PEP 668) during setuptools install step.

## Scenario Results (Run 3: tag `v2026.02.26-personal-desktop-e2e.3`)
- run: `https://github.com/AutoByteus/autobyteus-workspace-superrepo/actions/runs/22432283391`
- `SCN-REL-001` (REQ-REL-002, UC-REL-001): Passed
  - evidence: mac build command `pnpm build:electron:mac -- --arm64` executed successfully.
- `SCN-REL-002` (REQ-REL-001, UC-REL-001): Passed
  - evidence: personal flavor artifacts published (`AutoByteus_personal_*`).
- `SCN-REL-003` (REQ-REL-004, UC-REL-003): Passed
  - evidence: publish job succeeded and uploaded both platform asset families.
- `SCN-REL-004` (REQ-REL-005, UC-REL-004): Passed
  - evidence: CI uses empty `APPLE_TEAM_ID`; mac build succeeded without notarization requirement.
- `SCN-REL-005` (REQ-REL-003, UC-REL-002/003): Passed
  - evidence: release created at `https://github.com/AutoByteus/autobyteus-workspace-superrepo/releases/tag/v2026.02.26-personal-desktop-e2e.3`
  - uploaded assets include:
    - `AutoByteus_personal_macos-arm64-1.1.8.dmg`
    - `AutoByteus_personal_linux-1.1.8.AppImage`
    - metadata/blockmap files (`latest-mac.yml`, `latest-linux.yml`, `.dmg.blockmap`)

## Escalation Decisions
- Runs 1 and 2 failures were classified as `Local Fix` and resolved through workflow-only re-entry cycles.
- Final run passed all critical aggregated scenarios.
