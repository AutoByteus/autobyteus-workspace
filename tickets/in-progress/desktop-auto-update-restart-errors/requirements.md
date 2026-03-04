# Requirements

- Status: `Design-ready`
- Ticket: `desktop-auto-update-restart-errors`
- Last Updated: `2026-03-04`
- Scope Triage: `Small`
- Triage Rationale: The likely defect is concentrated in release-feed metadata assembly and updater install error surfacing; implementation is expected in a limited file set.

## Goal / Problem Statement

Desktop auto-update intermittently fails for users during the update flow (`check -> download -> restart/install`). Current behavior lacks deterministic architecture-correct mac feed metadata in GitHub Releases and provides limited install-step diagnostics in app runtime, making failures hard to reproduce and debug.

## In-Scope Use Cases

- `UC-001` (Requirement): Release pipeline produces mac ARM64 and mac x64 artifacts for same tag.
  - Expected outcome: Both architecture artifacts are published and referenced by update metadata.
- `UC-002` (Requirement): Published `latest-mac.yml` contains both ARM64 and x64 mac file entries.
  - Expected outcome: Update metadata is architecture-complete for mac clients.
- `UC-003` (Requirement): mac updater running on x64 can resolve an x64 zip file from release metadata.
  - Expected outcome: x64 client does not fail due to missing compatible zip entry.
- `UC-004` (Requirement): mac updater running on arm64 can resolve an arm64 zip file from release metadata.
  - Expected outcome: arm64 client receives arm64 update path.
- `UC-005` (Requirement): When restart/install invocation throws synchronously, user-visible updater state includes actionable error details.
  - Expected outcome: UI transitions to `error` state with specific message rather than silent failure.
- `UC-006` (Requirement): Team can verify updater feed correctness locally without publishing a real release.
  - Expected outcome: A local verification method proves merged metadata completeness and arch selection compatibility.

## Requirements

- `R-001`: Release workflow must ingest both mac architecture metadata inputs (`latest-mac.yml` from ARM64 and x64 build lanes) before publishing release assets.
  - Expected outcome: publish job has both source metadata files available.
- `R-002`: Publish workflow must emit one canonical `latest-mac.yml` that includes both arm64 and x64 `files` entries.
  - Expected outcome: the released mac metadata is dual-arch compatible.
- `R-003`: Publish workflow must fail when canonical `latest-mac.yml` is missing either arm64 zip or x64 zip entry.
  - Expected outcome: broken metadata is blocked before release publication.
- `R-004`: Updater install action must handle synchronous `quitAndInstall` errors and map them into updater error state.
  - Expected outcome: failure becomes visible in updater state/toast path for diagnosis.
- `R-005`: Local verification must be possible without a real tag release by running deterministic checks on generated/merged metadata.
  - Expected outcome: developers can validate fix in local CI-like flow.

## Acceptance Criteria

- `AC-001`: Workflow definition uploads x64 mac metadata artifact in addition to x64 dmg/zip artifacts.
- `AC-002`: Workflow publish stage generates merged `latest-mac.yml` containing both `...macos-arm64-...zip` and `...macos-x64-...zip` entries under `files`.
- `AC-003`: Workflow includes a validation command that fails if merged metadata lacks either mac architecture zip entry.
- `AC-004`: App updater install path catches synchronous install invocation errors and sets state `status=error` with a specific fallback message.
- `AC-005`: Automated tests validate install-error state mapping and merged-metadata assembly/validation logic.
- `AC-006`: Local non-release verification commands are documented in ticket artifacts and executed successfully.

## Constraints / Dependencies

- GitHub Actions artifact naming and release upload conventions must remain compatible with existing release automation.
- `electron-updater` behavior is fixed by library internals; solution must adapt feed metadata to its architecture filter logic.
- mac metadata file name in release assets remains `latest-mac.yml`.

## Assumptions

- User-reported failures include at least one mac update failure mode.
- Existing release workflow remains canonical path for production desktop artifacts.
- No backward-compatibility dual-feed legacy path should be introduced.

## Open Questions / Risks

- User platform distribution for reported failures is still unknown (x64 vs arm64 vs other OS).
- Some restart/install failures may have additional causes beyond metadata mismatch; diagnostics improvement reduces residual uncertainty.
- If release asset upload tooling rejects duplicate metadata names, merge step must ensure only one canonical mac metadata file is published.

## Requirement Coverage Map

- `R-001` -> `UC-001`
- `R-002` -> `UC-002`, `UC-003`, `UC-004`
- `R-003` -> `UC-003`, `UC-004`
- `R-004` -> `UC-005`
- `R-005` -> `UC-006`

## Acceptance Criteria Coverage Map (Stage 7 Scenario Mapping)

- `AC-001` -> `SCN-001`
- `AC-002` -> `SCN-002`
- `AC-003` -> `SCN-003`
- `AC-004` -> `SCN-004`
- `AC-005` -> `SCN-004`, `SCN-005`
- `AC-006` -> `SCN-003`, `SCN-005`

Where Stage 7 scenarios are:

- `SCN-001`: CI artifact audit confirms x64 mac metadata file is uploaded as input to publish stage.
- `SCN-002`: Publish-stage merged `latest-mac.yml` contains both arm64/x64 zip entries.
- `SCN-003`: Validation command exits non-zero when either architecture entry is missing.
- `SCN-004`: Updater install invocation error path transitions to `status=error` with diagnostic message.
- `SCN-005`: Local dry-run verification script/commands pass without creating a real release.
