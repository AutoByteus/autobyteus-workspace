# Delivery evidence — autobyteus-590 (phone-activity-details)

Checks the Delivery Engineer ran on the integrated tree (`origin/personal` `20b627960c` merged into the ticket branch as
`e08e5c1939`), 2026-11-22. macOS, Node v22.23.1, headless Chrome. The API/E2E evidence is in `../api-e2e/` and is not repeated
here.

| File / folder | Check | Command | What it shows |
| --- | --- | --- | --- |
| `DEL-01-server-typecheck.log` | server typecheck | `pnpm -C autobyteus-server-ts typecheck` | `production errors: 0; test-file errors: 1000 in 313 files (baseline 1000 in 313 files)`, `PASS` |
| `DEL-01-web-typecheck-with-dist-mobile-demo.log` | web typecheck with `autobyteus-web/dist-mobile-demo/` (13 MB) present: AC-007 on the merged tree | `pnpm -C autobyteus-web typecheck` | `production errors: 0; test-file errors: 86 in 36 files (baseline 86 in 36 files)`, `PASS` |
| `DEL-02-server-build.log`, `DEL-02-mobile-web-build.log` | server and phone bundle rebuilt after the merge | `pnpm -C autobyteus-server-ts build`; `pnpm -C autobyteus-web build:mobile-web` | `build exit 0` |
| `DEL-02-phone-probe-merged-state/` | the one relevant real-stack check | `pnpm -C autobyteus-web test:e2e:mobile-shell --cases=MSP-94,MSP-95,MSP-96,MSP-97 --output-dir <dir>` | `mobile-shell-probe.json` `"result": "Pass"`, four cases Pass, no duplicate-ID entry, no unknown browser error, cleanup `serversLeft: 0`; `command.log`; 3 screenshots (`MSP-94-activity-rows`, `MSP-94-failed-details`, `MSP-97-native-tool-rows`) |
| `DEL-03-web-unit.log` | the ticket's web specs, with the demo coverage spec | `NUXT_TEST=true vitest run components/mobile components/progress components/conversation services/runHydration … scripts/__tests__/mobileBuildChecks.spec.ts` | `Test Files 58 passed`, `Tests 560 passed` |

The build-only Desktop Release run (45029500186, on `648a8e0299`) was read directly from GitHub (`gh run view`): `success`, the
five build jobs `success`, signing and publish `skipped`. Hygiene (`scripts/check_repository_artifact_hygiene.py`: passed, 103 366
tracked files), the frozen-lockfile consistency check (consistent) and the Secret Gate (`PASS`) are recorded in
`../../release-deployment-report.md`.
