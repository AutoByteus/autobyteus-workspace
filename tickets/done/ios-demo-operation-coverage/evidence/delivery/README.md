# Delivery evidence — autobyteus-584 (ios-demo-operation-coverage)

Checks the Delivery Engineer ran on the integrated tree (`origin/personal` `726c5beaf9` merged into the ticket branch as
`44deff6562`), 2026-11-21. macOS, Node v22.23.1. The API/E2E evidence is in `../api-e2e/` and the implementation's in
`../implementation/`; neither is repeated here.

| File | Check | Command | What it shows |
| --- | --- | --- | --- |
| `DEL-01-spec-merged-state.log` | the one relevant check | `NUXT_TEST=true pnpm -C autobyteus-web exec vitest run scripts/__tests__/mobileBuildChecks.spec.ts` | `Test Files 1 passed`, `Tests 8 passed (8)` |
| `DEL-02-server-typecheck.log` | server typecheck | `pnpm -C autobyteus-server-ts typecheck` | `production errors: 0; test-file errors: 1006 in 315 files (baseline 1006 in 315 files)`, `PASS` |
| `DEL-02-web-typecheck-first-run-oom.log` | web typecheck with `autobyteus-web/dist-mobile-demo/` present | `pnpm -C autobyteus-web typecheck` | `SIGABRT (FATAL ERROR: Ineffective mark-compacts near heap limit … JavaScript heap out of memory)`: FU-001 |
| `DEL-02-web-typecheck.log` | the same after moving the folder aside | `pnpm -C autobyteus-web typecheck` | `production errors: 0; test-file errors: 86 in 36 files (baseline 86 in 36 files)`, `PASS` |
| `DEL-03-ios-build-only-run-read-by-delivery.txt` | the iOS build-only run, read from GitHub | `gh run view 44881140728 --json conclusion,headSha,jobs`; `git ls-remote origin refs/tags/v1.5.14-beta.5` | `conclusion: success`, head `929976f818`, build job success, publish jobs skipped; no tag |

Hygiene (`scripts/check_repository_artifact_hygiene.py`: passed, 102 236 tracked files), the frozen-lockfile consistency check
(`pnpm install --frozen-lockfile --lockfile-only`: consistent) and the Secret Gate (`scripts/check_secrets.sh`: `PASS`) are
recorded in `../../release-deployment-report.md`.
