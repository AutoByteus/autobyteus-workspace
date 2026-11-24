# Delivery evidence — autobyteus-628 (conversation-order-628), round DR-001 (blocked)

Checks the Delivery Engineer ran on the integrated tree (`origin/personal` `e5d878832b` merged as `54cee15c8e`), 2026-11-24. macOS,
Node v22.23.1, headless Chrome. API/E2E's evidence is in `../api-e2e/`, the implementation's in `../implementation/`.

| File / folder | Check | Command | What it shows |
| --- | --- | --- | --- |
| `DEL-01-server-typecheck.log`, `DEL-01-web-typecheck.log` | both typechecks | `pnpm -C autobyteus-server-ts typecheck`; `pnpm -C autobyteus-web typecheck` | at baseline (972 in 299 files; 86 in 36 files), `PASS` |
| `DEL-02-check-contract-dist.log` | the contract packages' tracked `dist/` | `pnpm check:contract-dist` | `PASS` |
| `DEL-BLOCK-contract-package-tests-*.log` | **Finding 1** the three contract packages' own suites | `pnpm -C <package> test` | 2, 4 and 2 failing tests, each naming `occurred_at` / `accepted_at` |
| `DEL-03-server-unit-ticket-files.log`, `DEL-03-web-unit-ticket-files.log` | the ticket's test files | `vitest run` | server 39 files / 459 tests; web 34 / 433, all pass |
| `DEL-04-server-integration-whole.log` | whole server integration | `test:integration` | `92 passed \| 21 skipped (113)`, `523 passed` |
| `DEL-04-web-whole-suite.log` | whole web suite | `NUXT_TEST=true pnpm -C autobyteus-web test:nuxt` | `803 passed`, `6124 passed` |
| `DEL-BLOCK-accumulator-distinct-event-times/` | **Finding 2** | the whole server unit run (`whole-server-unit-run-one-failure.log`: 1 failed of 9027); the accumulator's test with strictly increasing event times (`zz-distinct-times.test.ts.txt`, its run `distinct-times-run.log`: 7 of 25 fail); the file alone (`accumulator-file-alone.log`: 25 pass) | stored trace order depends on event times |
| `DEL-05-server-build.log`, `DEL-05-mobile-web-build.log` | rebuilds | `pnpm -C autobyteus-server-ts build`; `pnpm -C autobyteus-web build:mobile-web` | `build exit 0` |
| `DEL-05-phone-probe-merged-state/` | phone cases on the merged build | `test:e2e:mobile-shell --cases=MSP-66,MSP-75,MSP-76,MSP-77,MSP-99,MSP-105` | `"result": "Pass"`, six cases Pass, no unknown browser error |
