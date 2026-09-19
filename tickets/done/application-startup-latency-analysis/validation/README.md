# Implementation Validation Evidence

This directory retains the approved baseline evidence plus implementation-scoped `IR-001` through `IR-005` evidence. Local checks are not API/E2E acceptance.

## IR-005 complete terminal-warning detail evidence

- `ir005-source-manifest.json` — base/current hashes for the cumulative production/test/doc candidate.
- `ir005-preservation.json` — exact hash proof for the 18 protected `IR-001`–`IR-004` source/test/doc entries and 37 retained prior evidence artifacts; only the coordinator and its durable test intentionally changed.
- `ir005-baseline-regression.log` — the exact pre-`IR-005` coordinator reports `failedCount=8` but fails after retaining only five warning identities/reasons.
- `ir005-focused-tests.log` — 88 repository, transition, coordinator, runner, locator, token/readiness and interruption tests pass, including all eight exact warning identities/reasons, unchanged sources and zero targets.
- `ir005-adjacent-tests.log` — 3 exact-reference and 501-member SQL batching/rollback integration tests pass.
- `ir005-prepare-shared.log` and `ir005-server-build.log` — declared workspace prerequisites, TypeScript build and sanitized built-in-Agent bootstrap pass (`BUILD_EXIT_CODE=0`).
- `ir005-server-build-initial-missing-shared.log` — retained first build attempt showing the generated shared SDK contract prerequisite was absent after prior cleanup; this is superseded by the prepared successful build, not hidden.
- `ir005-guards.log` — only the two existing terminal-warning dispositions bypass the five-detail cap, non-warning capping remains, source-size/delta guards pass, protected entries remain exact, and generated outputs are absent.

## IR-004 typed token-data warning boundary evidence

- `ir004-source-manifest.json` — base/current hashes for the cumulative production/test/doc candidate.
- `ir004-preservation.json` — exact hash proof for protected `IR-001`–`IR-003` source/tests and retained prior evidence.
- `ir004-baseline-regression.log` — the preserved pre-`IR-004` repository/transition/coordinator returns `FAILED` for malformed token identity instead of the approved warning.
- `ir004-focused-tests.log` — 87 repository, transition, coordinator, runner, locator, token/readiness and interruption tests pass. The real SQL fixture proves whole-root rollback, exact warning detail/count, the affected-root readiness guard and unrelated-root usability; injected SQL update failure remains fatal.
- `ir004-adjacent-tests.log` — 3 exact-reference and 501-member SQL batching/rollback integration tests pass.
- `ir004-server-build.log` — TypeScript build and sanitized built-in-Agent bootstrap pass (`BUILD_EXIT_CODE=0`).
- `ir004-guards.log` — four exact typed rejection sites, split transition maps, preserved shared runner/readiness guard/schema, bounded source files/deltas, clean diff and exact manifests pass.

## IR-003 narrow migration-outcome recovery evidence

- `ir003-source-manifest.json` — base/current hashes for the cumulative production/test/doc candidate.
- `ir003-preservation.json` — exact hash proof for all protected `IR-001`/`IR-002` source/tests plus retained prior evidence inventory; canonical docs are intentionally cumulative.
- `ir003-baseline-regression.log` — the exact pre-`IR-003` planner/coordinator fails the dedicated missing-tree warning/no-plan assertion.
- `ir003-focused-tests.log` — 67 migration planner/coordinator, runner, locator, token and history/interruption tests pass, including concurrent source-root loss remaining fatal.
- `ir003-adjacent-tests.log` — 3 exact-reference and 501-member token batching/rollback integration tests pass.
- `ir003-server-build.log` — TypeScript/build/bootstrap success.
- `ir003-guards.log` — clean diff, bounded source deltas/sizes, unchanged shared-runner production and prior implementation preservation.

## IR-002 recovery evidence

- `ir002-source-manifest.json` — base/current hashes for the cumulative production/test/doc candidate.
- `ir002-preservation.json` — hash proof that the reviewed `IR-001` startup, migration and AgentOrg implementation remains exact.
- `ir002-baseline-regression.log` — exact pre-correction Team resolver/route fails the new malformed-address contract (`500` instead of `400`).
- `ir002-focused-tests.log` — 27 readiness/migration/Org access/Team resolver passes plus 3 scoped Team route passes.
- `ir002-team-route-final.log` — final exact Team known-status/continuity and unexpected-fault cases pass.
- `ir002-adjacent-tests.log` — 18 context-file unit passes.
- `ir002-server-build.log` — repeated TypeScript/build/bootstrap success.
- `ir002-guards.log` — `IR-001` preservation, bounded Team catch scopes, source sizes and clean diff checks.

## IR-001 evidence

- `ir001-source-manifest.json` — base and candidate hashes for every implementation-owned source/test/doc delta.
- `ir001-preservation.json` — unchanged hashes for startup, migration, locator and exact context-file access owners.
- `ir001-baseline-regression.log` — current regression assertions run with the exact prior readiness implementation; expected nonzero exit with three behavior failures.
- `ir001-focused-tests.log` — 23 focused readiness/migration/Org access passes plus 2 scoped Team access passes.
- `ir001-adjacent-tests.log` — 35 adjacent unit passes.
- `ir001-server-build.log` — TypeScript/build/bootstrap success.
- `ir001-team-baseline.log` — exact base Team REST file reproduces the two unrelated current nested-Team fixture failures.
- `ir001-readiness-cold-readonly-probe.mjs` — validation-only compiled readiness instrumentation; it requests no writes and redacts the profile root.
- `ir001-readiness-run1.json` through `run3.json` — three independent fresh Node process observations.
- `ir001-readiness-summary.json` — aggregate: 625.989 ms / 397.915 ms / 407.378 ms and zero raw-trace reads in all three observations. This is not full Electron/process launch acceptance.
- `ir001-guards.log` — deleted-module/reference, raw-trace-coupling, size and diff checks.
- `ir001-install.log`, `ir001-prepare.log` — dependency preparation details.

## Preserved upstream baseline

- `electron-fresh-start-timing.json` — exact pre-change application startup timing.
- `readiness-cold-readonly-probe.mjs` / `.json` — exact pre-change packaged readiness attribution (5,695 trace reads / about 5.5 GiB / 29.524 s).

## API-REV-002 executable acceptance

`api-e2e-r2/` contains the current completed rerun. `p01-result.json` is the concise index. The first corrected startup transitioned the owned-clone record from `FAILED` attempts 27 to terminal `SUCCEEDED_WITH_WARNINGS` attempts 28 in 6425.083 ms, retained all eight root identities/reasons and `failedCount=8`, preserved those sources and created zero targets. `p01-db-logical-comparison.json` shows only the authorized migration-ledger table changed. Three later starts completed in 3210.487 / 2555.660 / 2562.309 ms with zero trace reads/fetches and exact ledger/profile stability. `token-warning-fatal-executable.log` records 5 files / 66 tests passing for typed rollback/local guard and fatal precedence. `browser-history-attachment-proof.json` plus screenshots record actual Chrome Team and AgentOrg history/attachment journeys; `browser-readonly-preservation.json` proves all tracked profile groups exact afterward. `cleanup-process-check.txt` records owned-process/port cleanup; the final browser tab list was empty.

The current API/E2E result is `API-REV-002` **Pass / 96.6% confidence**. The 10-second value remains a representative acceptance threshold, not a universal SLA. API/E2E changed no durable repository test.
