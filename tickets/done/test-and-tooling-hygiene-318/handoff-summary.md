# Handoff Summary: test-and-tooling-hygiene-318 (autobyteus-318)

- **Status:** verified from the evidence and finalized into `personal`. No release (none requested).
- **Classification:** `Large` / `Low`, reviewed route.
  - Architecture review.
  - Source review: CRR-001, then CRR-003 for the Local Fix.
  - API/E2E: API-REV-001 at 95.8%, then API-REV-002 at 96.5%.
  - Test-code review: CRR-002 and CRR-004, both Not Applicable.
- **Delivery:** DR-001 (Blocked: FU-004), then DR-002.

## What Changed

The second round of test and tooling hygiene: 12 older Tasks and comment items, each fixed or dropped with evidence (the execution report's per-T-ID dispositions, AC-015).

- **Type gates:**
  - the server `typecheck` now also checks `tests/` and `../test-support/` against a shrink-only baseline (1,200 errors in 370 files), so a test that calls a removed or renamed API fails it;
  - the web gate type-checks the three cross-package tests under their own config;
  - the web test baseline was cut to at most 102 errors, none in `components/`, `services/` or `stores/`.
- **Removed:** the dead transcription server URL across web, Electron, config, env, README and probes, and the unused `@nuxtjs/apollo`.
- **Fresh clones:** the Electron binary installs once before the test workers start, so a fresh clone's first `test:electron` passes.
- **Tests and probes:**
  - gated suites that called removed APIs were repaired;
  - stale expectations and timing tests fixed (T-28, T-47 and the others in the report);
  - the named tests clean their temp folders;
  - six browser probes refuse a non-empty `--output-dir`.
- **FU-004, fixed in this branch** (TESTING.md Rule 9, after delivery's DR-001):
  - `de3d284b14`: the agent-run-service activation double now has `cancelPreparedRun`;
  - `f3950965c3`: the Team callbacks expectation includes `projectRunRoot`, with one assertion added.

## Integration

- `origin/personal` `3b9dc912a1` is already contained (merge `32b8f5a763`). No non-ticket file changed after API-08's fresh clone at `1e9bab6d4b`, so its run is on the final software content.

## Verification From Evidence

- Every AC is proven. AC-016, delivery's criterion, rests on two clean clones:
  - API-02 (`7c04283722`): install, prebuild, build, `test:integration:prepare`, both type checks, `test:electron`, server `test:unit` (912 files), `test:nuxt` (682 files);
  - API-08 (`1e9bab6d4b`): the server gate `[typecheck] PASS`, `production errors: 0; test-file errors: 1200 in 370 files (baseline 1200 in 370 files)`; full `test:integration` `Test Files  87 passed | 20 skipped (107)`, `Tests  499 passed | 69 skipped (568)`, exit 0.
- The FU-004 baseline-fix diffs only add what the product now does (`cancelPreparedRun`, `projectRunRoot`) and one assertion.
- No user check was needed.

## Residual Risks

- The paid live suites were ported but not run (DEC-011).
- After later merges, both gates may refuse growth from newly merged tests (R-02); fix those at the cause.

## Follow-ups

- FU-001..FU-003 are open; FU-004 is resolved in the branch.
