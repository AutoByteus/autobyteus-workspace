# DEL-01 post-integration checks (delivery, 2026-11-19)

State: `codex/journal-omit-agy-schema-reads` @ `2cda872679`. `origin/personal` @ `69e89271fb` had no commits beyond the ticket's base (`git rev-list --count HEAD..origin/personal` is 0), so no merge was needed and the checks below are on the integrated state.

| Check | Command | Result |
| --- | --- | --- |
| Install, generated packages | `pnpm install --frozen-lockfile`; `pnpm -C autobyteus-server-ts prebuild` | done |
| Server typecheck | `pnpm exec tsc --noEmit -p tsconfig.build.json` | exit 0 |
| Journal and memory-search unit suites | `env -i … pnpm exec vitest run tests/unit/memory-search tests/agent-work-journal --no-watch` | `Test Files  19 passed \| 1 skipped (20)`, `Tests  263 passed \| 2 skipped (265)` |
| Server build | `pnpm build` | exit 0, bootstrap smoke passed |
| Built-server cases, combined run 1 | `env -i … RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<abs>/agy-failure-cli.mjs pnpm exec vitest run tests/e2e/runtime/work-journal-agy-schema-reads-scripted-agy.e2e.test.ts …/work-journal-neutral-vocabulary-scripted-agy.e2e.test.ts …/work-journal-restore-transport.e2e.test.ts tests/e2e/memory --no-watch` | `Test Files  15 passed \| 1 skipped (16)`, `Tests  41 passed \| 3 skipped (44)` |
| The same, combined run 2 | same command | `Test Files  2 failed \| 13 passed`, `Tests  3 failed \| 38 passed`: EC-03, EC-05, EC-06 of `episodic-catalog.e2e.test.ts` and the schema-reads file (a hook timeout). See below |
| `episodic-catalog.e2e.test.ts` alone | same env | `Test Files  1 passed (1)`, `Tests  7 passed (7)` (EC-01..07; 285 s) |
| New file alone, four runs | same env, `work-journal-agy-schema-reads-scripted-agy.e2e.test.ts` | pass, pass, pass; and one run where the test passed but the 10 s `afterAll` hook timed out, one where the run hit `AgyDiscoveryError: Antigravity model discovery timed out` |
| Existing `work-journal-neutral-vocabulary-scripted-agy.e2e.test.ts` alone, four runs | same env | 3 pass; 1 fails with the same `AgyDiscoveryError` |
| Fresh-start build (TESTING.md) | not required | no build input changed (server `src/`, tests, one fixture line, docs) |

## Why the failures are not this change
- The machine's load average during these runs was above 210 (`uptime`: `load averages: 211.46 244.52 242.58`, many other agents' test runs).
- Every failure is a timeout in the scripted Antigravity startup (`AGY_MODEL_DISCOVERY_TIMEOUT`, `Hook timed out in 10000ms`, or the episodic-catalog waits that wait on scripted AGY runs), never an assertion about the journal; the existing neutral-vocabulary file, which this change does not touch, fails the same way at a similar rate.
- The episodic-catalog file passes alone, and API/E2E recorded the same pattern (EC-03 and the restore-transport hook under parallel load, EC-05..07 when `dist/` was missing).
- Whenever the new file's test ran to its end, all its assertions passed (JS-01 omitted line and raw records kept, JS-02 outside path kept, JS-03 old-revision journal re-rendered).
- Not proven benign by a repeat on a quiet machine (TESTING.md Rule 9): recorded as FU-3.
