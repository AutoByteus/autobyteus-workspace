# IR-001 Validation Evidence

Implementation-scoped evidence for `ORG-HISTORY-UNIFIED-ROW-20260921-001`.

## Passing Candidate Checks

- `focused-tests.log` — real unified-row component and real sidebar/Pinia publication boundary: 2 files / 17 tests passed.
- `adjacent-passing-tests.log` — focused and adjacent workspace-history coverage: 10 files / 87 tests passed.
- `web-build.log` — Nuxt production build and 16-route prerender passed (`BUILD_EXIT_CODE=0`).
- `guards.log` — diff, scope, size, obsolete-path, and generated-output guards.
- `rendered-self-check.md` — rendered structure/interaction and visual-comparator inspection.
- `ir001-source-manifest.json` — exact base and candidate hashes for the three changed source/test files.

## Regression Proof

- `baseline-regression.log` — the current unified-row regression against the exact pre-change component fails 6 of 8 tests, proving it detects the obsolete two-control structure.

## Broad Adjacent Qualification

- `adjacent-tests.log` — broad existing workspace-history selection: 18 failures / 141 passes / 16 unhandled errors.
- `adjacent-baseline.log` — the same three failing files against the exact pre-change component: the same 18 failures / 54 passes / 16 unhandled errors.
- `adjacent-baseline-comparison.json` — confirms identical failure names and error count. These pre-existing fixture/lifecycle failures are outside the unified-row delta.

## Setup Notes

- `install.log` — frozen workspace install completed without lockfile changes; warnings concern absent prebuilt devkit CLI targets in sample applications.
- `nuxt-prepare.log` — generated the local Nuxt test/build workspace.
- `prepare-web-contracts.log` — built required workspace contract packages before the web build; generated outputs were removed/restored so none remain in the candidate diff.

These are local implementation checks, not downstream API/E2E acceptance.

## API/E2E Acceptance

- Final result: `Pass / 96.9%` (`API-REV-001`).
- Canonical report: `../api-e2e-execution-coverage-report.md`.
- Case ledger: `../api-e2e-test-case-ledger.md` (`R01`, `B01`–`B04`, `C01` all Pass).
- `api-e2e/browser-results.json` — normal Chrome DOM, pointer, native keyboard, ARIA, Stop isolation, sibling/content retention and Team comparator observations.
- `api-e2e/b01-unified-expanded.png`, `b03-stop-isolation.png`, `b04-team-comparator.png` — supporting screenshots.
- `api-e2e/repository-tests.log`, `server-build.log`, `manifest-check.json` — independent repository execution and candidate identity.
- `api-e2e/persistence-comparison.json`, `backend-boundary-check.txt` — exact isolated clone data preservation and no-inference corroboration.
- `api-e2e/setup-isolation-correction.json` — mandatory setup incident/correction qualification; all acceptance actions were run only after explicit process-level isolated datasource and memory overrides.
- `api-e2e/process-cleanup-check.txt` — owned tab/process/profile/generated-output cleanup and closed-port evidence.

