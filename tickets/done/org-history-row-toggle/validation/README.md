# IR-001 Validation Evidence

This directory contains implementation-scoped evidence for `ORG-HISTORY-ROW-TOGGLE-20260920-001`.

## Passing Candidate Checks

- `focused-tests.log` — real Vue component plus real history-tree state: 1 file / 8 tests passed.
- `adjacent-passing-tests.log` — focused and adjacent workspace-history coverage: 10 files / 87 tests passed.
- `web-build.log` — Nuxt production build and 16-route prerender passed (`BUILD_EXIT_CODE=0`).
- `guards.log` — diff, scope, size, and generated-output guard results.
- `rendered-self-check.md` — implementation rendered-state/interaction inspection.
- `ir001-source-manifest.json` — exact base and candidate hashes for the two changed source/test files.

## Regression Proof

- `baseline-regression.log` — the IR-001 focused test run against the exact pre-change component fails as expected (2 row-toggle cases), proving the regression detects the original behavior.

## Broad Adjacent Qualification

- `adjacent-tests.log` — broad existing workspace-history selection produced 18 failures / 141 passes with 16 unhandled errors.
- `adjacent-baseline.log` — the same three failing files against the exact pre-change component produced the same 18 failures / 54 passes with 16 unhandled errors.
- `adjacent-baseline-comparison.json` — records the identical failure names. These failures are pre-existing test-fixture drift outside the AgentOrg row-toggle delta. A clean adjacent subset still passed 87 tests.

## Setup Notes

- `install.log` — frozen workspace dependency installation; warnings concern missing built devkit CLI targets in sample applications and did not change the lockfile.
- `nuxt-prepare.log` — generated the local Nuxt test/build workspace.
- `web-build-initial-missing-contracts.log` — initial build prerequisite failure because workspace contract package outputs were absent in the fresh worktree.
- `prepare-web-contracts.log` — built the required workspace contract packages before the successful web build. Tracked contract outputs were restored to the base revision afterward; no generated source remains in the candidate diff.

These are local implementation checks, not downstream API/E2E acceptance.
