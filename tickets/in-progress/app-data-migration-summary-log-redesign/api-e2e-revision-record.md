# API/E2E Revision Record

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| `API-REV-001` | `/code_reviewer`; `code-review-report.md`; API/E2E round 1 | `SR-006`, `ARCH-REV-002`, `IR-001`, `CRR-001` | `N/A` | `Pass / 97.7%` |
| `API-REV-002` | Explicit user request; packaged Electron supplemental round 2 after `DR-001` | `API-REV-001`, `CRR-002`, `DR-001` | `Pass / 97.7%` | `Pass / 97.9%` |

## Revision Entries

### API-REV-001 — String-only summary contract baseline and released-upgrade proof

- Triggering role, report path, and round: `/code_reviewer`; `/Users/normy/autobyteus_org/autobyteus-worktrees/app-data-migration-summary-log-redesign/tickets/in-progress/app-data-migration-summary-log-redesign/code-review-report.md`; round 1.
- Triggering finding or scenario IDs: `CRR-001` implementation pass and explicit stale rich-summary coverage signal; `AE2E-001`, `AE2E-002`, `AE2E-003`, `AE2E-MIG-001`, `AE2E-BROWSER-001`.
- Related solution, architecture-review, implementation, code-review, or delivery revision IDs: `SR-006`, `ARCH-REV-002`, `IR-001`, `CRR-001`; delivery `N/A`.
- Why this baseline or coverage/execution revision was recorded: First completed API/E2E validation result. It establishes authoritative evidence that released `summary_json` data is transactionally migrated and current runtime/API/UI use only the canonical scalar summary while attempt logs retain diagnostics.
- Coverage decisions or durable test paths changed: Updated the TeamRun production-upgrade and custom-provider startup E2Es; removed no scenario or file. Replaced obsolete current API/database rich-summary assertions with scalar-summary/log-path assertions and corrected a stale post-consolidation token identity read.
- Scenarios added, changed, removed, or rechecked: Changed `AE2E-001`–`AE2E-003`; rechecked focused unit, seven-case real-Prisma migration, both actual-startup E2Es, focused web, builds, hygiene, and broad deterministic E2E; added temporary `AE2E-BROWSER-001`; removed none.
- Commands, environment, fixture, or broader-validation delta: Used test-owned released/current SQLite fixtures and built servers; browser probe used owned free ports because unrelated processes occupied documented fixed ports; no secrets or user profile. Required live browser validation passed after one temporary assertion correction.

#### Prior Failure Resolution

`None`; no prior completed API/E2E round exists. During this baseline, two bounded local issues were resolved before finalization:

| Prior Scenario / Failure Reference | Previous Classification | Current Resolution | Evidence |
| --- | --- | --- | --- |
| `AE2E-003` first run read consumed `TokenUsageLedgerEvent` | `Local Fix` — durable coverage | Assert current `TokenUsageRunRecord.latest*` identity; 4/4 pass | `api-e2e-evidence/04b-custom-provider-startup-e2e.log`, `04c-custom-provider-startup-e2e-rerun.log` |
| `AE2E-BROWSER-001` first attempt expected `Application Data Migrations` instead of catalog `App Data Migrations` | `Local Fix` — temporary probe | Corrected catalog literal; semantic live-browser journey passed with clean client evidence and cleanup | `api-e2e-evidence/09-settings-live-browser.log`, `09-settings-live-browser.json`, `09b-settings-live-browser-rerun.log` |

- Canonical artifacts and sections updated: `api-e2e-coverage-investigation.md` (coverage classifications, execution results, scorecards, browser evidence), `api-e2e-execution-coverage-report.md` (authoritative round result), and this revision record.
- Prior result and confidence: `N/A`
- Current result and confidence: `Pass / 97.7%`
- New or remaining failure IDs: No ticket failure ID. `AE2E-BROAD-BASELINE` remains an explicitly unrelated current-base broad-suite residual: four failing files outside the diff while the ticket E2Es pass.
- Recommended recipient: `/code_reviewer` for proportional review of changed durable E2E code.
- Remaining risks, blocked evidence, or untested scope: Attempt-log cardinality and no immediate SQLite file shrink are approved residuals; packaged Electron/external providers/user profile are correctly out of scope; four unrelated current-base broad-suite failures remain disclosed. Nothing is blocked.

### API-REV-002 — Integrated packaged Electron build and launch supplement

- Triggering role, report path, and round: Explicit user request on 2026-08-21 after delivery baseline `DR-001`; canonical execution report `/Users/normy/autobyteus_org/autobyteus-worktrees/app-data-migration-summary-log-redesign/tickets/in-progress/app-data-migration-summary-log-redesign/api-e2e-execution-coverage-report.md`; round 2.
- Triggering finding or scenario IDs: User requested the README-documented packaged check; `AE2E-ELECTRON-DEFAULT-ENTRY`, `AE2E-ELECTRON-001`.
- Related solution, architecture-review, implementation, code-review, or delivery revision IDs: `SR-006`, `ARCH-REV-002`, `IR-001`, `CRR-001`, `CRR-002`, `API-REV-001`, `DR-001`.
- Why this baseline or coverage/execution revision was recorded: Preserve the new packaged desktop evidence and the exact default-command failure without rewriting round-1 history.
- Coverage decisions or durable test paths changed: No durable coverage changed. The checked-in packaged launcher was used as temporary executable evidence; round-1 durable test paths remain unchanged and already reviewed.
- Scenarios added, changed, removed, or rechecked: Added `AE2E-ELECTRON-DEFAULT-ENTRY` and `AE2E-ELECTRON-001`; no prior ticket scenario was removed or rerun.
- Commands, environment, fixture, or broader-validation delta: On the integrated `DR-001` worktree, attempted `test:e2e:electron --adapter playwright`; then built Darwin/arm64 with `build:electron:mac` and ran `test:e2e:electron --skip-build --adapter playwright`. The E2E profile used a launcher-owned root, free port 49629, bundled server, and Playwright first-window observation.

#### Prior Failure Resolution

| Prior Scenario / Failure Reference | Previous Classification | Current Resolution | Evidence |
| --- | --- | --- | --- |
| `AE2E-ELECTRON-DEFAULT-ENTRY` / default build reaches `ALL` and rejects Linux packaging on Darwin | `Local Fix / existing packaging-launcher configuration mismatch` | Not fixed in repository. Safely bypassed with the explicit macOS build; exact produced artifact then passed the same isolated Playwright launcher. Residual remains open and disclosed. | `api-e2e-evidence/10-packaged-electron-playwright.log`, `10b-packaged-electron-mac-build.log`, `10c-packaged-electron-playwright-skip-build.log` |

- Canonical artifacts and sections updated: `api-e2e-coverage-investigation.md` round-2 supplemental investigation and final score; `api-e2e-execution-coverage-report.md` round-2 execution, desktop evidence, cleanup and result; this revision record.
- Prior result and confidence: `Pass / 97.7%` (`API-REV-001`).
- Current result and confidence: `Pass / 97.9%`.
- New or remaining failure IDs: `AE2E-ELECTRON-DEFAULT-ENTRY` remains an existing tooling residual; `AE2E-BROAD-BASELINE` remains the previously disclosed unrelated broad-suite residual. No ticket acceptance-criterion failure.
- Recommended recipient: `/code_reviewer` for round-2 intake and `Not Applicable` durable-test review, then `/delivery_engineer` to refresh the held user handoff with `API-REV-002` evidence.
- Remaining risks, blocked evidence, or untested scope: The default packaged command contradicts its host-native build promise until its build target is fixed. The packaged smoke proves readiness/first window, not Settings-route DOM; `AE2E-BROWSER-001` remains the direct ticket UI evidence. No validation is blocked.
