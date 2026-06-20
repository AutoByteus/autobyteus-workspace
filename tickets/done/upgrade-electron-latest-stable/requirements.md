# Requirements — Upgrade Electron To Latest Stable

- Status: `Refined`
- Ticket: `upgrade-electron-latest-stable`
- Date: `2026-06-19`
- Scope classification: `Medium`
- Investigation basis: `tickets/in-progress/upgrade-electron-latest-stable/investigation-notes.md`

## Goal / Problem Statement

Upgrade the desktop application’s Electron runtime from the current Electron 38 line to the verified latest stable Electron release (`42.4.1` as of 2026-06-19), while preserving desktop package/build/updater behavior and avoiding any hidden coupling with prior macOS signing-policy work.

This ticket exists because the ShipIt/macOS update-loop fix is present in Electron 40.9.3, 41.3.0, and later, but the project should take the latest stable Electron rather than the minimum fixed patch. Electron 38 -> 42 is a major runtime upgrade and must validate Chromium, Node/V8, native module rebuild, package generation, updater metadata behavior, signing-adjacent smoke, and focused Electron tests.

## Requirements

| requirement_id | Requirement | Expected Outcome |
| --- | --- | --- |
| `REQ-001` | Verify and target the latest stable Electron version from authoritative sources before changing dependency metadata. | Target version is recorded as `42.4.1` unless the authoritative latest stable source changes during the ticket; evidence is recorded in investigation and validation artifacts. |
| `REQ-002` | Update desktop package dependency metadata so the Electron runtime resolves to the verified latest stable release. | `autobyteus-web/package.json` and canonical lock metadata resolve Electron to `42.4.1`; package-manager metadata does not continue to resolve Electron 38. |
| `REQ-003` | Keep native module rebuild compatible with Electron 42’s Node/V8 ABI. | The `electron-rebuild` CLI used by `prepare-server` resolves through a package that understands Electron 42 ABI, expected by replacing deprecated direct `electron-rebuild` with `@electron/rebuild`. |
| `REQ-004` | Keep package-manager metadata consistent after the dependency change without retaining stale local lock artifacts. | Root `pnpm-lock.yaml` is updated as the canonical workspace lock; stale package-local lock metadata is removed when regenerating it would produce inconsistent pseudo-workspace churn. |
| `REQ-005` | Preserve existing signing-policy implementation and treat signing-adjacent behavior as validation scope only. | No signing policy/source changes are made unless the Electron runtime upgrade strictly requires them; local unsigned validation records signing limitations separately. |
| `REQ-006` | Validate the major Electron upgrade through focused test and package/build smoke coverage. | Stage 7 records passing or explicitly blocked evidence for dependency resolution, Electron unit tests, native rebuild/package generation, artifact existence, and relevant Electron 42 breaking-change risks. |
| `REQ-007` | Document Electron 42 upgrade risk and durable operational expectations. | Durable project docs or explicit no-impact rationale record the new Electron baseline, native rebuild owner, and any updated build/validation expectations. |

## In-Scope Use Cases

| use_case_id | Source Requirement(s) | Use Case | Primary Expected Outcome | Fallback/Error Expected Outcome |
| --- | --- | --- | --- | --- |
| `UC-001` | `REQ-001` | Verify latest stable Electron target from official Electron release data and npm dist-tags. | Target version is `42.4.1`; target runtime stack is known. | If latest changed, update requirements/design before implementation. |
| `UC-002` | `REQ-002`, `REQ-004` | Update Electron package metadata and lock metadata. | Electron dependency and canonical root lock resolve to `42.4.1`; stale package-local lockfile is removed rather than kept inconsistent. | If lock metadata cannot be made consistent, record blocker/rationale before validation. |
| `UC-003` | `REQ-003` | Upgrade native rebuild dependency path for Electron 42 ABI. | `pnpm exec electron-rebuild` resolves through `@electron/rebuild`, supports Electron 42 ABI, and the build uses the direct dependency without package-manager fallback. | If rebuild tooling fails, re-enter design/implementation and update native rebuild plan. |
| `UC-004` | `REQ-005` | Preserve signing implementation while validating signing-adjacent packaged output. | Signing source files remain unchanged; build emits expected local unsigned/skipped-signing behavior when signing env is absent. | If Electron 42 requires signing-script change, classify design impact before editing. |
| `UC-005` | `REQ-006` | Run focused Electron tests and package smoke after upgrade. | `test:electron` and local mac ARM64 package build pass or infeasibility is documented. | If tests/build fail, classify and re-enter Stage 6/requirements/design as appropriate. |
| `UC-006` | `REQ-007` | Synchronize durable docs for new Electron runtime baseline and validation expectations. | Docs mention Electron 42 baseline and native rebuild/update considerations where useful. | If no durable docs impact remains, record explicit no-impact rationale. |

## Acceptance Criteria

| acceptance_criteria_id | Requirement(s) | Criterion | Measurable Expected Outcome |
| --- | --- | --- | --- |
| `AC-001` | `REQ-001`, `REQ-002` | Electron latest stable target is verified and used. | Investigation and Stage 7 evidence show official/npm latest stable `electron@42.4.1`; package metadata/lock resolve to `42.4.1`. |
| `AC-002` | `REQ-002`, `REQ-004` | Dependency metadata consistency is maintained. | `autobyteus-web/package.json` and root `pnpm-lock.yaml` are consistent with the target version and native rebuild dependency update; no stale Electron-recording package-local lockfile remains. |
| `AC-003` | `REQ-003` | Native module rebuild toolchain supports Electron 42 ABI. | `pnpm -C autobyteus-web exec electron-rebuild --help` resolves through `@electron/rebuild`, metadata shows `node-abi` supports Electron 42 ABI, and the native rebuild/package command reaches the `node-pty` rebuild step without an unknown Electron 42 ABI error or package-manager fallback. |
| `AC-004` | `REQ-006` | Focused Electron tests pass after dependency upgrade. | `pnpm -C autobyteus-web test:electron` passes, or any failure is classified and handled through workflow re-entry. |
| `AC-005` | `REQ-006` | Local macOS ARM64 package smoke passes or is explicitly blocked with evidence. | `CI=true AUTOBYTEUS_BUILD_FLAVOR=personal NO_TIMESTAMP=1 APPLE_TEAM_ID= DEBUG=electron-builder,electron-builder:* DEBUG=app-builder-lib* DEBUG=builder-util* pnpm -C autobyteus-web build:electron:mac -- --arm64` passes and emits expected artifacts, or the exact blocker/compensating evidence/residual risk is recorded. |
| `AC-006` | `REQ-005` | Existing signing-policy implementation remains unmodified by this ticket unless explicitly justified. | `git diff` shows no signing source/config change except dependency metadata/lock/doc/ticket artifacts, or any required signing-adjacent change has a recorded design-impact rationale. |
| `AC-007` | `REQ-006` | Electron 42 breaking-change risk screen has validation evidence. | Stage 7 records checks for Electron binary resolution/on-demand download, no known removed API usage from investigation, native ABI rebuild, updater package/test behavior, and package artifact generation. |
| `AC-008` | `REQ-007` | Durable docs are synchronized or explicitly judged no-impact. | Stage 9 records updated docs or no-impact rationale in `docs-sync.md`. |

## Constraints / Dependencies

- Workflow code-edit permission is locked until Stage 6 gate unlocks source/package edits.
- Use authoritative current Electron sources; because latest stable changes over time, any later re-entry must re-check latest stable if materially delayed.
- `autobyteus-web` is the desktop package and Electron runtime owner.
- Root `pnpm-lock.yaml` is canonical workspace lock metadata; the stale `autobyteus-web/pnpm-lock.yaml` package-local lockfile is removed because clean regeneration produced inconsistent pseudo-workspace churn rather than a truthful package-local lock.
- Local validation runs on macOS ARM64 with Node `v22.21.1` and pnpm `10.28.2`.
- Local mac package validation may be unsigned/not notarized if Apple signing credentials are absent; this does not invalidate Electron runtime packaging smoke but must not be represented as signed release validation.
- Do not broaden the ticket into full electron-builder/electron-updater latest upgrades unless validation shows the Electron 42 runtime upgrade requires them.
- No backward-compatibility or legacy fallback paths should be added.

## Assumptions

- Electron `42.4.1` contains the ShipIt fix because PR `#51191` was merged to `42-x-y` and the fix appears in related 40/41 release notes as also in 42.
- `@electron/rebuild@4.0.4` is the right native rebuild package replacement because it provides the same `electron-rebuild` CLI and uses modern `node-abi` support.
- Existing prepare-server ownership remains; its rebuild invocation should call the direct project `electron-rebuild` binary supplied by `@electron/rebuild` without a package-manager fallback to the deprecated package.
- Existing Electron API usage does not need source changes based on the Stage 1 breaking-change search; validation remains required.

## Open Questions / Risks

1. Will `electron-builder@25.1.8` package Electron `42.4.1` cleanly? Validation will decide; do not preemptively upgrade builder.
2. Will Electron 42’s on-demand binary download require an explicit `install-electron`/version command in CI before packaging? Validation will decide.
3. Resolved: `autobyteus-web/pnpm-lock.yaml` is retired in this ticket because it was stale and clean regeneration produced inconsistent pseudo-workspace churn; root `pnpm-lock.yaml` remains canonical.
4. Will local package smoke complete within the current environment and available signing credentials? If not, Stage 7 must document blocker and compensating evidence.

## Requirement Coverage Map To Call-Stack Use Cases

| requirement_id | Mapped use_case_id(s) | Coverage Notes |
| --- | --- | --- |
| `REQ-001` | `UC-001` | Latest target verification. |
| `REQ-002` | `UC-002` | Electron metadata and lock update. |
| `REQ-003` | `UC-003` | Native rebuild compatibility. |
| `REQ-004` | `UC-002`, `UC-003` | Lock and rebuild dependency consistency. |
| `REQ-005` | `UC-004` | Signing preservation. |
| `REQ-006` | `UC-003`, `UC-004`, `UC-005` | Rebuild, package, tests, runtime risk validation. |
| `REQ-007` | `UC-006` | Durable documentation. |

## Acceptance-Criteria Coverage Map To Stage 7 Scenario Intent

| acceptance_criteria_id | Planned Stage 7 scenario_id(s) | Validation Intent |
| --- | --- | --- |
| `AC-001` | `SCN-001` | Verify installed/resolved Electron version is `42.4.1`. |
| `AC-002` | `SCN-002` | Verify lockfile/package metadata consistency after install/update. |
| `AC-003` | `SCN-003`, `SCN-005` | Verify `electron-rebuild` binary resolution through `@electron/rebuild`, Electron 42 ABI metadata, no fallback usage, and native rebuild through package smoke. |
| `AC-004` | `SCN-004` | Run focused Electron test suite. |
| `AC-005` | `SCN-005` | Run local macOS ARM64 package build and artifact checks. |
| `AC-006` | `SCN-006` | Diff check confirms signing implementation not modified. |
| `AC-007` | `SCN-001`, `SCN-003`, `SCN-004`, `SCN-005`, `SCN-007` | Record Electron 42 breaking-change risk validation. |
| `AC-008` | `SCN-008` | Verify docs-sync result. |
